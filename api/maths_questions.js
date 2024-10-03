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

        // Handle both free-form and multiple-choice questions
        let questionsHtml = await Promise.all(pageData.page.questionData.map(async (question, i) => {
            if (question.answer === "free-form") {
                // AI-generated answer for the free-form question
                const aiAnswer = await getAIFreeFormAnswer(question.questionText);

                // Display the free-form answer box for the student
                let freeFormHtml =
                    '<div class="question-block" data-question-index="' + i + '">' +
                    '<img src="' + question.imgSrc + '" alt="' + question.imgAlt + '" width="525" height="350" />' +
                    '<p>' + question.questionText + '</p>' +
                    '<textarea id="student-response-' + i + '" name="response' + i + '" rows="4" cols="50"></textarea>' +
                    '<div id="result-' + i + '"></div>' +
                    '</div>';

                console.log('Request method:', req.method);
                console.log('Request body:', req.body);


                return freeFormHtml;

            } else {
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

            const correctAnswers = ${JSON.stringify(pageData.page.questionData.map(q => q.answer))};
            const totalQuestions = ${pageData.page.questionData.length};
            const helpVideoExists = ${helpVideoExists};

            document.getElementById('question-form').addEventListener('submit', async function(event) {
                event.preventDefault();
                let responses = [];
                let score = 0;
                const questionIndex = parseInt(getQueryParameter('index'), 10);



                // Iterate over the questions to gather responses
                for (let i = 0; i < pageData.page.questionData.length; i++) {
                    const question = pageData.page.questionData[i];

                    if (question.answer === "free-form") {
                        // Handle the free-form response
                        const studentResponse = document.querySelector('#student-response-' + i).value;

                        if (!studentResponse) {
                            console.log('No answer provided for free-form question at index ' + i);
                            continue; // Skip to the next question if no answer is provided
                        }

                        try {
                            // Call the cosine similarity API for free-form answers
                            const response = await axios.post('/api/cosine_similarity.js', {
                                studentResponse: studentResponse,
                                aiAnswer: question.aiAnswer // Assuming aiAnswer is pre-fetched and available in the question object
                            });

                            const { similarityScore, passed } = response.data;
                            document.querySelector('#result-' + i).innerHTML = passed
                                ? '<p>Great job! Cosine Similarity: ' + similarityScore + '</p>'
                                : '<p>Score below threshold. Cosine Similarity: ' + similarityScore + '</p>';

                            // If the cosine similarity passes the threshold, mark the question as answered
                            if (passed) {
                                markQuestionsAsAnswered(questionIndex);
                                redirectToPreviousVideo();

                        }

                        } catch (error) {
                            console.error('Error submitting answer for free - form question at index ' + i, error);
                            alert('Error processing your free-form answer. Please try again.');
                        }

                    } else {
                        // Handle multiple-choice responses
                      const selectedChoice = document.querySelector('input[name="answer' + i + '"]:checked');
                      if (selectedChoice) {
                            responses.push({ question: question.questionText, response: selectedChoice.value });

                            // Check if the answer is correct (for multiple-choice questions)
                            if (question.answer === selectedChoice.value) {
                                score++;
                            }
                        } else {
                            console.log('No answer selected for multiple-choice question at index ' + i);
                        }
                    }
                }

                console.log('Collected Responses:', responses);

                // Calculate score percentage and determine the next steps
                const scorePercentage = (score / pageData.page.questionData.length) * 100;

                if (scorePercentage <= 80) {
                    if (helpVideoExists) {
                        showHelpVideo();
                    } else {
                        alert("No help video found");
                        window.location.href = 'https://corbettmaths.com/2013/05/03/sine-rule-missing-sides/';
                    }
                } else {
                    markQuestionsAsAnswered(questionIndex);
                    redirectToPreviousVideo();
                }
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


