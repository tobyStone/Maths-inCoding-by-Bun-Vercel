const db = require('./database');
const QuestionModel = require('../models/mathQuestionsModel');
require('dotenv').config();

/**
 * Handle multiple-choice questions and return a score and pass/fail result.
 *
 * @param {Array} studentAnswers - An array of student responses.
 * @param {Array} correctAnswers - An array of correct answers from the database.
 * @returns {Object} - An object containing score, scorePercentage, and pass/fail status.
 */
function checkTypedAnswer(studentAnswer, correctAnswer) {
    // Trim both answers to avoid whitespace issues
    studentAnswer = studentAnswer.trim();
    correctAnswer = correctAnswer.trim();

    // If both are numbers, compare numerically
    if (!isNaN(parseFloat(studentAnswer)) && !isNaN(parseFloat(correctAnswer))) {
        return parseFloat(studentAnswer) === parseFloat(correctAnswer);
    }

    // Otherwise, compare strings (for symbolic answers or radio button values)
    return studentAnswer === correctAnswer;
}

function calculateScore(studentAnswers, correctAnswers) {
    let score = 0;

    for (let i = 0; i < studentAnswers.length; i++) {
        const studentAnswer = studentAnswers[i]?.response;  
        const correctAnswer = correctAnswers[i];  

        // Call checkTypedAnswer, which handles trimming
        if (checkTypedAnswer(studentAnswer, correctAnswer)) {
            score++;
        }
    }

    const scorePercentage = (score / correctAnswers.length) * 100;
    const passed = scorePercentage >= 80;  // Pass mark set to 80%

    return { score, scorePercentage, passed };
}



// Serverless function handler
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    await db.connectToDatabase();

    const { studentAnswers, pageUrl } = req.body;

    if (!Array.isArray(studentAnswers) || typeof pageUrl !== 'string') {
        res.status(400).json({ error: 'Invalid request format.' });
        return;
    }

    try {
        // Use pageUrl from the request body to find the correct page in the database
        const query = { 'page.url_stub': pageUrl };
        const pageData = await QuestionModel.findOne(query).exec();

        if (!pageData || !pageData.page || !pageData.page.questionData) {
            res.status(404).json({ error: 'Page not found' });
            return;
        }

        const correctAnswers = pageData.page.questionData.map(q => q.answer);
        const scoreData = calculateScore(studentAnswers, correctAnswers);

        // Return only pass/fail and score percentage
        res.status(200).json({
            passed: scoreData.passed,
            scorePercentage: scoreData.scorePercentage
        });
    } catch (error) {
        console.error('Error fetching page data or calculating score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
