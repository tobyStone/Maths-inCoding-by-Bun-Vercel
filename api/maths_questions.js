const { parse } = require('url');
const db = require('./database');
const QuestionModel = require('../models/mathQuestionsModel');
const { getAIResponse } = require('./chat');
require('dotenv').config();

/**
 * Generate predefined questions based on the video description.
 *
 * @param {string} description - The description of the video.
 * @returns {Promise<string[]>} - A promise that resolves to an array of questions.
 */
async function generateQuestions(description) {
    const prompt = `Generate a list of seven questions - and only the questions themselves - 
                    a child could ask about the topic based on the following video description: 
                    "${description}"`;

    const response = await getAIResponse(prompt);

    return response
        .split('\n')
        .filter(q => q); // Assuming each question is on a new line
}

/**
 * Generate AI Answer for the free-form question
 *
 * @param {string} questionText - The free-form question text.
 * @returns {Promise<string>} - A promise that resolves to the AI-generated answer.
 */
async function getAIFreeFormAnswer(questionText) {
    const prompt = `Answer the following question in simple terms for a 12-year-old student: "${questionText}"`;
    const aiAnswer = await getAIResponse(prompt); // This calls the AI with the specific question
    console.log(`AI Response for question "${questionText}": ${aiAnswer}`);  // Log the AI response for clarity


    return aiAnswer;
}



module.exports = async (req, res) => {
    await db.connectToDatabase();
    const parsedUrl = parse(req.url, true);
    const urlPath = parsedUrl.pathname;
    const query = { 'page.url_stub': urlPath };

    try {
        const pageData = await QuestionModel.findOne(query).exec();
        if (!pageData || !pageData.page || !pageData.page.questionData) {
            res.status(404).send('Page not found');
            return;
        }

        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://maths-in-coding-by-bun-vercel.vercel.app'
            : 'http://localhost:3000/';

        // Get the first word of the description to determine question type
        const questionType = pageData.page.description.split(' ')[0].toLowerCase();

        // Handle both free-form and multiple-choice questions
        let questionsHtml = await Promise.all(pageData.page.questionData.map(async (question, i) => {
            if (questionType === "free-form") {
                // AI-generated answer for the free-form question
                const aiAnswer = await getAIFreeFormAnswer(question.questionText);

                // Display the free-form answer box for the student
                let freeFormHtml = '<div class="question-block" data-question-index="' + i + '">' +
                    '<img src="' + question.imgSrc + '" alt="' + question.imgAlt + '" width="525" height="350" />' +
                    '<p>' + question.questionText + '</p>' +
                    '<textarea id="student-response-' + i + '" name="response' + i + '" rows="4" cols="50"></textarea>' +
                    '<input type="hidden" id="ai-answer-' + i + '" value="' + aiAnswer + '" />' +
                    '<div id="result-' + i + '"></div>' +
                    '</div>';

  
                return freeFormHtml;

            } else if (questionType === 'multiple-choice') {
                // Render multiple-choice questions
                const choicesHtml = question.choices.map(function (choice, j) {
                    return '<input type="radio" name="answer' + i + '" id="choice' + i + '-' + j + '" value="' + choice + '">' +
                        '<label for="choice' + i + '-' + j + '">' + choice + '</label>';
                }).join('');

                return `
                    <div class="question-block" data-question-index="${i}">
                        <img src="${question.imgSrc}" alt="${question.imgAlt}" width="525" height="350" />
                        <p>${question.questionText}</p>
                        <div class="choices">${choicesHtml}</div>
                    </div>
                `;
            } else if (questionType === 'standard') {
                // Render standard typed-answer questions
                return `
                    <div class="question-block" data-question-index="${i}">
                        <p>${question.questionText}</p>
                        <input type="text" id="student-response-${i}" name="response${i}" />
                        <input type="hidden" id="correct-answer-${i}" value="${question.answer}" />
                        <div id="result-${i}"></div>
                    </div>
                `;
            }
        }));

        questionsHtml = questionsHtml.join(''); // Join all question blocks to form the full HTML


        const videoSrc_temp = pageData.page.helpVideo.videoSrc;
        const videoSrc = videoSrc_temp.replace('public/', '/');
        const videoDescription = pageData.page.description;

        const predefinedQuestions = await generateQuestions(videoDescription);

        const predefinedQuestionsHtml = predefinedQuestions.map(function (question, i) {
            return '<button class="question-button" onclick="handleQuestionButtonClick(\'' + question.replace(/'/g, "\\'") + '\')">' + question + '</button>';
        }).join('');


        const helpVideoExists = !!pageData.page.helpVideo;

        const videoHtml = pageData.page.helpVideo ? `
            <div id="help-video-container" class="video-container" style="display:none;">
                <video id="help-video" controls>
                    <source src="${videoSrc}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        ` : '';

        const script = `
            const pageData = ${JSON.stringify(pageData)};


            async function handleQuestionButtonClick(question) {
                try {
                    console.log('Button pressed, question:', question); 
                    const response = await getAIResponse(question); 
                    document.getElementById('ai-tutor-response').innerText = response;
                } catch (error) {
                    console.error('Error fetching AI response:', error);
                }
            }

            async function getAIResponse(prompt) {
                try {
                    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'system', content: 'You are a helpful assistant that explains things in simple terms a child can understand and keeps the explanation to 100 words.' },
                                   { role: 'user', content: prompt }
                    ],
                        max_tokens: 150,
                        temperature: 0.7
                    }, {
                        headers: {
                            'Authorization': \`Bearer ${process.env.OPENAI_API_KEY}\`
                        }
                    });

                    const data = response.data.choices[0].message.content.trim();
                    return data;
                } catch (error) {
                    console.error('Error interacting with OpenAI API:', error.response ? error.response.data : error.message);
                    throw error;
                }
            }

 
            function markQuestionsAsAnswered(index) {
                console.log("INDEX IN markQuestions function: ", index)
                let questionsAnswered = JSON.parse(localStorage.getItem('questionsAnswered')) || new Array(totalQuestions).fill(false);
                console.log('Before updating, questionsAnswered:', questionsAnswered); 

                questionsAnswered[index] = true; 
                localStorage.setItem('questionsAnswered', JSON.stringify(questionsAnswered));
                console.log('Questions answered updated:', questionsAnswered);
            }

            function showHelpVideo() {
                const videoContainer = document.getElementById('help-video-container');
                const questionsContainer = document.getElementById('questions-container');
                const aiTutorContainer = document.getElementById('ai-tutor-container');

                if (videoContainer) {
                    questionsContainer.style.display = 'none';
                    aiTutorContainer.style.display = 'block'; 
                    videoContainer.style.display = 'block';
                    const video = document.getElementById('help-video');
                    video.play();
                    video.addEventListener('ended', function() {
                        videoContainer.style.display = 'none';
                        questionsContainer.style.display = 'block';
                        aiTutorContainer.style.display = 'none';
                    });
                }
            }

            function redirectToPreviousVideo() {
                const previousVideoURL = localStorage.getItem('previousVideoURL');
                const previousVideoTimestamp = localStorage.getItem('previousVideoTimestamp');
                console.log("PREVIOUS VIDEO: ", previousVideoURL, "TIMESTAMP: ", previousVideoTimestamp);
                setTimeout(() => {
                    window.location.href = previousVideoURL + '?t=' + previousVideoTimestamp;
                }, 500);
            }

            function getQueryParameter(name) {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get(name);
            }

            const totalQuestions = ${pageData.page.questionData.length};
            const helpVideoExists = ${helpVideoExists};

        document.addEventListener('DOMContentLoaded', function () {
            document.getElementById('question-form').addEventListener('submit', async function(event) {
                event.preventDefault();
                let responses = [];
                const pageUrl = window.location.pathname; // Capture the original page URL
                try {
                    console.log("Window location object:", window.location);
                    console.log("Page URL:", pageUrl);
                } catch (error) {
                    console.error("Error logging page URL and window loaction:", error);
                }

                let score = 0;
                const questionIndex = parseInt(getQueryParameter('index'), 10);

                // Iterate over the questions to gather responses
                for (let i = 0; i < pageData.page.questionData.length; i++) {
                    const question = pageData.page.questionData[i];

                    if (question.answer === "free-form") {
                        try {
                            // Handle the free-form response
                            const studentResponse = document.querySelector('#student-response-0').value;

                            if (!studentResponse) {
                                console.log('No answer provided for free-form question at index 0');
                                continue; // Skip to the next question if no answer is provided
                            }

                            const aiAnswer = document.querySelector('#ai-answer-0').value;

                            // Log to confirm if the aiAnswer element is properly found
                            console.log("AI Answer:", aiAnswer);

                            if (!studentResponse) {
                                console.log('No answer provided by the student.');
                                return;
                            }

                            if (!aiAnswer) {
                                console.error('Hidden AI answer not found.');
                                return;
                            }

                            // Log the request data to verify before sending the request
                            console.log('Request body:', {
                                studentResponse: studentResponse,
                                aiAnswer: aiAnswer
                            });

                            // Correcting the URL and data being sent to the API
                            const response = await axios.post('/api/cosine_similarity', {
                                studentResponse: studentResponse,
                                aiAnswer: aiAnswer
                            }, {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const { similarityScore, passed } = response.data;
                            document.querySelector('#result-' + i).innerHTML = passed
                                ? '<p>Great job! Cosine Similarity: ' + similarityScore + '</p>'
                                : '<p>Score below threshold. Cosine Similarity: ' + similarityScore + '</p>';

                            // Handle redirection based on cosine similarity result
                            if (passed) {
                                markQuestionsAsAnswered(questionIndex);
                                redirectToPreviousVideo();
                                return; // Exit here since freeform was passed successfully
                            } else {
                                // If failed, show the help video immediately
                                if (helpVideoExists) {
                                    showHelpVideo();
                                } else {
                                    alert("No help video found");
                                    window.location.href = 'https://corbettmaths.com/2013/05/03/sine-rule-missing-sides/';
                                }
                                return; // Exit here since help video is being shown
                            }
                        } catch (error) {
                            console.error('Error submitting answer for free-form question at index ' + i, error);
                            alert('Error processing your free-form answer. Please try again.');
                        }

                    } else {
                        // Handle multiple-choice responses
                        const selectedChoice = document.querySelector('input[name="answer' + i + '"]:checked');
                        if (selectedChoice) {
                            responses.push({ question: question.questionText, response: selectedChoice.value });
                        } else {
                            console.log('No answer selected for multiple-choice question at index ' + i);
                        }
                    }
                }

                try {
                    // Send multiple-choice answers to the server
                    const response = await axios.post('/api/handle_questions', {
                        studentAnswers: responses,
                        pageUrl: pageUrl
                    }, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    const { passed, scorePercentage } = response.data;

                    // Handle redirection based on the server response
                    if (passed) {
                        markQuestionsAsAnswered(questionIndex);
                        redirectToPreviousVideo();
                    } else {
                        if (helpVideoExists) {
                            showHelpVideo();
                        } else {
                            alert("No help video found");
                            window.location.href = 'https://corbettmaths.com/2013/05/03/sine-rule-missing-sides/';
                        }
                    }
                } catch (error) {
                    console.error('Error submitting multiple-choice answers:', error);
                    alert('Error processing your answers. Please try again.');
                }
            });
        });

            window.handleQuestionButtonClick = handleQuestionButtonClick;
        `;

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="description" content="${pageData.page.description}">
                <title>Maths inCoding</title>
                <link rel="icon" type="image/png" href="/images/linux_site_logo.webp" sizes="32x32">
                <link href="/style.css" rel="stylesheet">
            </head>
            <body>
                <main>
                    <header>
                        <header class="SiteHeader">
                            <h1>Maths inCoding<img style="float: right;" width="120" height="120" 
                                   src="/images/linux_site_logo.webp" alt="Pi with numbers"></h1>
                            <h3>... learning maths through coding computer games</h3>
                        </header>
                    </header>
                    <div id="questions-container" class="video-container">
                            <form id="question-form" action="/submit-answer" method="POST" enctype="application/x-www-form-urlencoded">
                             ${questionsHtml}
                            <button type="submit" class="myButton">Send answer</button>
                        </form>
                    </div>
                    ${videoHtml}
                    <div id="ai-tutor-container" style="display: none;">
                        <h3>Ask the AI Tutor</h3>
                        <div id="predefined-questions">${predefinedQuestionsHtml}</div>
                        <div id="ai-tutor-response"></div>
                    </div>
               </main>
                <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
                <script>${script}</script>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error fetching page data:', error);
        res.status(500).send('Internal Server Error');
    }
};


