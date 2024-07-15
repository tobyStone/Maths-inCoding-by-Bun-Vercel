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
    const prompt = `Generate a list of questions based on the following video description: "${description}"`;
    const data = await getAIResponse(prompt);
    return data.choices.map(choice => choice.message.content.trim());
}

/**
 * Handles incoming requests, fetches question data from the database, and generates HTML content.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */
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

        const questionsHtml = pageData.page.questionData.map((question, i) => {
            const imagePath = question.imgSrc.startsWith('/maths_questions/public/')
                ? question.imgSrc.replace('/maths_questions/public/', '/')
                : question.imgSrc;

            const choicesHtml = question.choices.map((choice, j) =>
                `<input type="radio" name="answer${i}" id="choice${i}-${j}" value="${choice}">
                <label for="choice${i}-${j}">${choice}</label>`
            ).join('');

            return `
                <div class="question-block">
                    <img src="${imagePath}" alt="${question.imgAlt}" width="525" height="350" />
                    <div class="choices">${choicesHtml}</div>
                </div>
            `;
        }).join('');

        const videoSrc_temp = pageData.page.helpVideo.videoSrc;
        const videoSrc = videoSrc_temp.replace('public/', '/');
        const videoDescription = pageData.page.description;

        const predefinedQuestions = await generateQuestions(videoDescription);

        const predefinedQuestionsHtml = predefinedQuestions.map((question, i) => `
            <button onclick="sendToAITutor('${question.replace(/'/g, "\\'")}')">${question}</button>
        `).join('');

        const helpVideoExists = !!pageData.page.helpVideo;
        console.log("HELPVIDEO: ", pageData.page.helpVideo, "VIDEOSRC: ", videoSrc, "HELPVIDEOEXISTS: ", helpVideoExists);

        const videoHtml = pageData.page.helpVideo ? `
            <div id="help-video-container" class="video-container" style="display:none;">
                <video id="help-video" controls>
                    <source src="${videoSrc}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="video-controls">
                    <!-- Example: Custom control buttons -->
                </div>
            </div>
        ` : '';

        const script = `
            async function sendToAITutor(question) {
                const responseDiv = document.getElementById('ai-tutor-response');
                const askButtons = document.querySelectorAll('#predefined-questions button');

                askButtons.forEach(button => button.disabled = true);

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ prompt: question })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch the response from AI Tutor');
                    }

                    const data = await response.json();
                    const reply = data.choices[0].message.content; // Correctly access the message content
                    responseDiv.innerHTML = \`<p><strong>AI Tutor:</strong> \${reply}</p>\`;
                } catch (error) {
                    responseDiv.innerHTML = \`<p><strong>Error:</strong> Could not retrieve response from AI Tutor</p>\`;
                } finally {
                    askButtons.forEach(button => button.disabled = false);
                }
            }

            function showHelpVideo() {
                const videoContainer = document.getElementById('help-video-container');
                const questionsContainer = document.getElementById('questions-container');
                const aiTutorContainer = document.getElementById('ai-tutor-container');

                if (videoContainer) {
                    questionsContainer.style.display = 'none';
                    aiTutorContainer.style.display = 'block'; // Show AI tutor when video starts
                    videoContainer.style.display = 'block';
                    const video = document.getElementById('help-video');
                    video.play();
                    video.addEventListener('ended', function() {
                        videoContainer.style.display = 'none';
                        questionsContainer.style.display = 'block';
                        aiTutorContainer.style.display = 'none'; // Hide AI tutor after video ends
                    });
                }
            }

            function redirectToPreviousVideo() {
                const previousVideoURL = localStorage.getItem('previousVideoURL');
                const previousVideoTimestamp = localStorage.getItem('previousVideoTimestamp');
                console.log("PREVIOUS VIDEO: ", previousVideoURL, "TIMESTAMP: ", previousVideoTimestamp);
                window.location.href = previousVideoURL + '?t=' + previousVideoTimestamp;
            }

            const correctAnswers = ${JSON.stringify(pageData.page.questionData.map(q => q.answer))};
            const totalQuestions = correctAnswers.length;
            const helpVideoExists = ${helpVideoExists};

            document.getElementById('question-form').addEventListener('submit', function(event) {
                event.preventDefault();
                const inputs = document.querySelectorAll('input[type="radio"]:checked');
                let score = 0;

                inputs.forEach((input, index) => {
                    if (correctAnswers[index] === input.value) {
                        score++;
                    }
                });

                const scorePercentage = (score / totalQuestions) * 100;

                if (scorePercentage <= 80) {
                    if (helpVideoExists) {
                        showHelpVideo();
                    } else {
                        alert("Not found video");
                        window.location.href = 'https://corbettmaths.com/2013/05/03/sine-rule-missing-sides/';
                    }
                } else {
                    localStorage.setItem('questionsAnswered', 'true');
                    redirectToPreviousVideo();
                }
            });
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
                            <div class="question-block">
                                <div class="choices">
                                    ${questionsHtml}
                                </div>
                                <button type="submit" class="myButton">Send answer</button>
                            </div>
                        </form>
                    </div>
                    ${videoHtml}
                    <div id="ai-tutor-container" style="display: none;">
                        <h2>Ask the AI Tutor</h2>
                        <div id="predefined-questions">
                            ${predefinedQuestionsHtml}
                        </div>
                        <div id="ai-tutor-response"></div>
                    </div>
                </main>
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
