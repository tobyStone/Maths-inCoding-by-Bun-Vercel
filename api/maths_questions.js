const { parse } = require('url');
const mongoose = require('mongoose');
const QuestionModel = require('../models/QuestionModel'); // Adjust model path and name as necessary
const geoip = require('geoip-lite');

const mongoURI = process.env.MONGODB_URI;
let db;

function connectDB() {
    if (db) {
        return Promise.resolve(db);
    }
    return mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true }).then(connectedDb => {
        db = connectedDb;
        return db;
    });
}

module.exports = async (req, res) => {
    await connectDB();

    const { query } = parse(req.url, true);
    const { path } = query;

    try {
        const pageData = await QuestionModel.findOne({ 'page.url_stub': path }).exec();
        if (!pageData) {
            res.status(404).send('Page not found');
            return;
        }

        // Assuming pageData contains questions and optionally a help video
        const questionsHtml = pageData.questions.map((question, i) => {
            const choicesHtml = question.choices.map((choice, j) =>
                `<input type="radio" name="answer${i}" id="choice${i}-${j}" value="${j}">
                 <label for="choice${i}-${j}">${choice}</label>`
            ).join('');

            return `
            <div class="question-block">
                <img src="${question.imgSrc}" alt="${question.imgAlt}" width="525" height="350" />
                <div class="choices">${choicesHtml}</div>
            </div>
            `;
        }).join('');

        const videoHtml = pageData.helpVideo ? `
            <div id="help-video-container" class="video-container" style="display:none;">
                <video id="help-video" controls>
                    <source src="${pageData.helpVideo.videoSrc}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        ` : '';

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maths Questions</title>
    <link href="/public/style.css" rel="stylesheet">
</head>
<body>
    <main>
        <header>
            <h1>Maths Questions</h1>
        </header>
        <form id="question-form">
            ${questionsHtml}
            <button type="submit">Submit Answers</button>
        </form>
        ${videoHtml}
    </main>
    <script>
        const correctAnswers = ${JSON.stringify(pageData.questions.map(q => q.correctAnswer))};
        const totalQuestions = correctAnswers.length;

        document.getElementById('question-form').addEventListener('submit', function(event) {
            event.preventDefault();
            const inputs = document.querySelectorAll('input[type="radio"]:checked');
            let score = 0;

            inputs.forEach((input, index) => {
                if (correctAnswers[index] === parseInt(input.value)) {
                    score++;
                }
            });

            const scorePercentage = (score / totalQuestions) * 100;
            alert('Your score: ' + score + '/' + totalQuestions + ' (' + scorePercentage.toFixed(2) + '%)');

            if (scorePercentage >= 80) {
                localStorage.setItem('questionsAnswered', 'true');
                alert('Congratulations! You scored over 80%.');
            } else {
                localStorage.setItem('questionsAnswered', 'false');
                alert('Try again! Score more than 80% to pass.');
            }
        });
    </script>
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
