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

        // Updated logic to handle both free-form and multiple-choice questions
        let questionsHtml;
        questionsHtml = pageData.page.questionData.map((question, i) => {
            if (question.answer === "free-form") {
                return `
                    <div class="question-block" data-question-index="${i}">
                        <img src="${question.imgSrc}" alt="${question.imgAlt}" width="525" height="350" />
                        <p>${question.questionText}</p>
                        <textarea id="student-response-${i}" name="response${i}" rows="4" cols="50"></textarea>
                    </div>
                `;
            } else {
                const choicesHtml = question.choices.map((choice, j) =>
                    `<input type="radio" name="answer${i}" id="choice${i}-${j}" value="${choice}">
                    <label for="choice${i}-${j}">${choice}</label>`
                ).join('');

                return `
                    <div class="question-block" data-question-index="${i}">
                        <img src="${question.imgSrc}" alt="${question.imgAlt}" width="525" height="350" />
                        <p>${question.questionText}</p>
                        <div class="choices">${choicesHtml}</div>
                    </div>
                `;
            }
        }).join('');

        const videoSrc_temp = pageData.page.helpVideo.videoSrc;
        const videoSrc = videoSrc_temp.replace('public/', '/');
        const videoDescription = pageData.page.description;

        const predefinedQuestions = await generateQuestions(videoDescription);

        const predefinedQuestionsHtml = predefinedQuestions.map((question, i) => `
            <button class="question-button" onclick="handleQuestionButtonClick('${question.replace(/'/g, "\\'")}')">${question}</button>
        `).join('');

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

                // Fetch call to the AI API through your server
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ question })
                });

                if (response.ok) {
                    const result = await response.json();
                    document.getElementById('ai-tutor-response').innerText = result.answer;
                } else {
                    throw new Error('Failed to fetch AI response');
                }
            } catch (error) {
                console.error('Error fetching AI response:', error);
            }
        }


            function markQuestionsAsAnswered(index) {
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

            document.getElementById('question-form').addEventListener('submit', function(event) {
                event.preventDefault();
                let responses = [];
                let score = 0;

                // Iterate over the questions to gather the responses
                pageData.page.questionData.forEach((question, i) => {
                    if (question.answer === "free-form") {
                        const response = document.getElementById('student-response-' + i).value;
                        responses.push({ question: question.questionText, response });
                    } else {
                        const selectedChoice = document.querySelector('input[name="answer' + i + '"]:checked');
                        if (selectedChoice) {
                            responses.push({ question: question.questionText, response: selectedChoice.value });
                            // Check if the answer is correct (for multiple-choice questions)
                            if (correctAnswers[i] === selectedChoice.value) {
                                score++;
                            }
                        }
                    }
                });

                console.log('Responses:', responses);

                // Calculate the percentage score based on total questions and correct answers
                const scorePercentage = (score / totalQuestions) * 100;

                // Determine the current question set by finding the closest .question-block and its data-question-index
                const questionIndex = parseInt(getQueryParameter('index'), 10);

                if (scorePercentage <= 80) {
                    if (helpVideoExists) {
                        showHelpVideo();
                    } else {
                        alert("Not found video");
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
                        <form id="question-form">
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


