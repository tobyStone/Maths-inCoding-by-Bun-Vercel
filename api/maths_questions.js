const { parse } = require('url');
const db = require('./database');
const QuestionModel = require('../models/mathQuestionsModel'); // Adjust model path and name as necessary

module.exports = async (req, res) => {
    await db.connectToDatabase(); // Ensures a single connection
    const parsedUrl = parse(req.url, true);
    const urlPath = parsedUrl.pathname; // Gets the path part of the URL
    const query = { 'page.url_stub': urlPath };

    try {
        const pageData = await QuestionModel.findOne(query).exec();
        if (!pageData || !pageData.page || !pageData.page.questionData) {
            res.status(404).send('Page not found');
            return;
        }

        const baseUrl = process.env.NODE_ENV === 'production' ? 'https://maths-in-coding-by-bun-vercel.vercel.app' : 'http://localhost:3000/';

        const questionsHtml = pageData.page.questionData.map((question, i) => {
            const imagePath_temp = question.imgSrc.startsWith('/maths_questions/public/') ? question.imgSrc.replace('/maths_questions/public/', '/') : question.imgSrc;
            const imagePath = imagePath_temp.replace('public/', '/')
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

        //update path
        const videoSrc_temp = pageData.page.helpVideo.videoSrc; // Directly use the Blob URL
        const videoSrc = videoSrc_temp.replace('public/', '/')
 
        // Define helpVideoExists based on whether the video HTML is generated
        const helpVideoExists = !!pageData.page.helpVideo;
        console.log("HELPVIDEO: ", pageData.page.helpVideo, "VIDEOSRC: ", videoSrc, "HELPVIDEOEXISTS: ", helpVideoExists)

        const videoHtml = pageData.page.helpVideo ? `
            <div id="help-video-container" class="video-container" style="display:none;">
                <video id="help-video" controls>
                    <source src="${baseUrl}${videoSrc}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="video-controls">
                    <!-- Example: Custom control buttons -->
                </div>
            </div>
        ` : '';

        // JavaScript functions to handle the video visibility and controls
        const script = `
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
                        questionsContainer.style.display = 'block';  // This line will show the questions again
                    });
                }
            }

            function redirectToPreviousVideo() {
                const previousVideoURL = localStorage.getItem('previousVideoURL');
                const previousVideoTimestamp = localStorage.getItem('previousVideoTimestamp');
                console.log("PREVIOUS VIDEO: ", previousVideoURL, "TIMESTAMP: ", previousVideoTimestamp)
                window.location.href = previousVideoURL + '?t=' + previousVideoTimestamp;
            }

            const correctAnswers = ${JSON.stringify(pageData.page.questionData.map(q => q.answer))};
            const totalQuestions = correctAnswers.length;
            const helpVideoExists = ${helpVideoExists}; // Pass this from server-side to client-side

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
                        alert("Not found video")
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
                            <h1>Maths inCoding<img style="float: right;" width="120" height="120" src="/images/linux_site_logo.webp" alt="Pi with numbers"></h1>
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
