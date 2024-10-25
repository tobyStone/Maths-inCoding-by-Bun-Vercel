const db = require('./database');
const natural = require('natural');
const jwt = require('jsonwebtoken');
const QuestionModel = require('../models/mathQuestionsModel');
const QuizResults = require('../models/quizResultModel');
require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Calculate the cosine similarity between two strings.
 * @param {string} text1 - The first text to compare.
 * @param {string} text2 - The second text to compare.
 * @returns {number} - The cosine similarity score between 0 and 1.
 */
function cosineSimilarity(text1, text2) {
    if (typeof text1 !== 'string' || typeof text2 !== 'string') {
        console.error('Both text1 and text2 must be strings.');
        return 0;
    }

    text1 = text1.toLowerCase();
    text2 = text2.toLowerCase();

    const tokenizer = new natural.WordTokenizer();
    const tokens1 = tokenizer.tokenize(text1);
    const tokens2 = tokenizer.tokenize(text2);

    const allTokens = Array.from(new Set([...tokens1, ...tokens2]));

    const vector1 = allTokens.map(token => tokens1.includes(token) ? 1 : 0);
    const vector2 = allTokens.map(token => tokens2.includes(token) ? 1 : 0);

    const dotProduct = vector1.reduce((sum, value, index) => sum + value * vector2[index], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + value * value, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + value * value, 0));

    return magnitude1 === 0 || magnitude2 === 0 ? 0 : dotProduct / (magnitude1 * magnitude2);
}

// Serverless function handler
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    await db.connectToDatabase();

    const { studentResponse, aiAnswer, pageUrl } = req.body;


    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    let studentId = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            studentId = decoded.id;
        } catch (error) {
            console.log('Invalid token, results will not be saved.');
        }
    }


    try {
 
        // Log to confirm received data
        console.log('Received student response:', studentResponse);
        console.log('Received AI answer:', aiAnswer);

        // Check if both are strings
        if (typeof studentResponse !== 'string' || typeof aiAnswer !== 'string') {
            res.status(400).json({ error: 'Both studentResponse and aiAnswer must be strings.' });
            return;
        }

        const similarityScore = cosineSimilarity(studentResponse, aiAnswer);
        const passed = similarityScore >= 0.27;

        // Log the result of the cosine similarity check
        console.log('Cosine Similarity Score:', similarityScore);
        console.log('Passed:', passed);


        // Use pageUrl from the request body to find the correct page in the database
        const query = { 'page.url_stub': pageUrl };
        const pageData = await QuestionModel.findOne(query).exec();
        console.log("PAGEDATA:", pageData)


        if (studentId) {
            const quizResult = new QuizResults({
                student: studentId,
                quizId: pageData.page.description,
                score: similarityScore * 100, // Assuming percentage from 0-1
                passed: passed,
                date: new Date(),
            });
            await quizResult.save();
            console.log(`Free-form quiz result saved for student ID: ${studentId}`);
        }

        res.status(200).json({ similarityScore, passed });
    } catch (error) {
        console.error('Error calculating cosine similarity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
