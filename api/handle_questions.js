const db = require('./database');
const QuestionModel = require('../models/mathQuestionsModel');
const math = require('mathjs');
require('dotenv').config();

/**
 * Handle multiple-choice and standard questions, and return a score and pass/fail result.
 *
 * @param {Array} studentAnswers - An array of student responses.
 * @param {Array} correctAnswers - An array of correct answers from the database.
 * @returns {Object} - An object containing score, scorePercentage, and pass/fail status.
 */
function checkTypedAnswer(studentAnswer, correctAnswer) {
    // Normalize both answers
    studentAnswer = studentAnswer.trim().toLowerCase();
    correctAnswer = correctAnswer.trim().toLowerCase();

    try {
        // Compare both expressions using mathjs
        return math.equal(math.simplify(studentAnswer), math.simplify(correctAnswer));
    } catch (err) {
        // If parsing fails, fall back to basic string comparison
        return studentAnswer === correctAnswer;
    }
}

function calculateScore(studentAnswers, correctAnswers, passPercentage) {
    let score = 0;

    // Log the incoming student answers and the correct answers from the DB
    console.log('Student Answers:', studentAnswers);
    console.log('Correct Answers from DB:', correctAnswers);

    for (let i = 0; i < studentAnswers.length; i++) {
        const studentAnswer = studentAnswers[i]?.response;
        const correctAnswer = correctAnswers[i];
        const questionType = studentAnswers[i]?.questionType;  // Get the question type from the POST

        // Log individual comparison for debugging
        console.log(`Comparing student answer "${studentAnswer}" with correct answer "${correctAnswer}"`);

        // Check if it's a standard (typed) question or multiple-choice
        if (questionType === "standard") {
            if (checkTypedAnswer(studentAnswer, correctAnswer)) {
                score++;
            }
        } else if (questionType === "multiple-choice") {
            // For multiple-choice, compare directly
            if (studentAnswer === correctAnswer) {
                score++;
            }
        }
    }

    const scorePercentage = (score / correctAnswers.length) * 100;
    const passed = scorePercentage >= passPercentage;  // Use the dynamic pass percentage

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
        // Log the incoming request body
        console.log('Incoming request body:', req.body);

        // Use pageUrl from the request body to find the correct page in the database
        const query = { 'page.url_stub': pageUrl };
        const pageData = await QuestionModel.findOne(query).exec();

        if (!pageData || !pageData.page || !pageData.page.questionData) {
            res.status(404).json({ error: 'Page not found' });
            return;
        }

        const correctAnswers = pageData.page.questionData.map(q => q.answer);
        console.log('Correct Answers fetched from the DB:', correctAnswers);

        // Extract pass percentage from the description (default to 80% if not found)
        let passPercentage = 80;
        const description = pageData.page.description;
        const passPercentageMatch = description.match(/pass percentage:\s*(\d+)/i);
        if (passPercentageMatch) {
            passPercentage = parseInt(passPercentageMatch[1], 10);
        }

        console.log('Pass Percentage extracted:', passPercentage);

        // Calculate the score and pass/fail result using the extracted pass percentage
        const scoreData = calculateScore(studentAnswers, correctAnswers, passPercentage);

        // Log the final score and pass/fail result
        console.log('Final Score Data:', scoreData);

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
