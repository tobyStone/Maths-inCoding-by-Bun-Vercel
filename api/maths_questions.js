const { parse } = require('url');
const db = require('./database');
const QuestionModel = require('../models/mathQuestionsModel');
require('dotenv').config();

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
            async function sendToAITutor() {
                const input = document.getElementById('ai-tutor-input').value;
                const responseDiv = document.getElementById('ai-tutor-response');

                try {
                    const response = await fetch('./chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ prompt: input })
                    });
                    const data = await response.json();
                    const reply = data.choices[0].text;
                    responseDiv.innerHTML = \`<p><strong>AI Tutor:</strong> \${reply}</p>\`;
                } catch (error) {
                    responseDiv.innerHTML = \`<p><strong>Error:</strong> Could not retrieve response from AI Tutor</p>\`;
                }
            }

            function showHelpVideo() {
                const videoContainer = document.getElementById('help-video-container');
                const questionsContainer = document.getElementById('questions-container');
                if (videoContainer) {
                    questionsContainer.style.display = 'none';
                    videoContainer.style.display = 'block';
                    const video = document.getElementById('help-video');
                    video.play();
                    video.addEventListener('ended', function() {
                        videoContainer.style.display = 'none';
                        questionsContainer.style.display = 'block';
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
                    <div id="ai-tutor-container">
                        <h2>Ask the AI Tutor</h2>
                        <textarea id="ai-tutor-input" rows="4" cols="50" placeholder="Type your question here..."></textarea>
                        <button onclick="sendToAITutor()">Ask</button>
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
