const { parse } = require('url');
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
function calculateScore(studentAnswers, correctAnswers) {
    let score = 0;
    for (let i = 0; i < studentAnswers.length; i++) {
        if (studentAnswers[i] && studentAnswers[i].response === correctAnswers[i]) {
            score++;
        }
    }
    const scorePercentage = (score / correctAnswers.length) * 100;
    const passed = scorePercentage >= 80;

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

        // Determine next action based on pass/fail status
        if (scoreData.passed) {
            res.status(200).json({
                action: 'returnToPreviousVideo',
                scoreData
            });
        } else {
            res.status(200).json({
                action: 'showHelpVideo',
                scoreData
            });
        }
    } catch (error) {
        console.error('Error fetching page data or calculating score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};