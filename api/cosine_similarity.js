const natural = require('natural');

/**
 * Calculate the cosine similarity between two strings.
 * @param {string} text1 - The first text to compare.
 * @param {string} text2 - The second text to compare.
 * @returns {number} - The cosine similarity score between 0 and 1.
 */
function cosineSimilarity(text1, text2) {
    const tokenizer = new natural.WordTokenizer();
    const tokens1 = tokenizer.tokenize(text1.toLowerCase());
    const tokens2 = tokenizer.tokenize(text2.toLowerCase());

    const allTokens = Array.from(new Set([...tokens1, ...tokens2]));

    const vector1 = allTokens.map(token => tokens1.includes(token) ? 1 : 0);
    const vector2 = allTokens.map(token => tokens2.includes(token) ? 1 : 0);

    const dotProduct = vector1.reduce((sum, value, index) => sum + value * vector2[index], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + value * value, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + value * value, 0));

    return magnitude1 === 0 || magnitude2 === 0 ? 0 : dotProduct / (magnitude1 * magnitude2);
}

export default async function handler(req, res) {
    if (req.method === 'POST') {

        console.log('Received POST request body:', req.body);


        const { studentResponse, aiAnswer } = req.body;

        // Ensure the student response and AI answer exist
        if (!studentResponse || !aiAnswer) {
            return res.status(400).json({ error: 'Missing student response or AI answer.' });
        }

        const similarityScore = cosineSimilarity(studentResponse, aiAnswer);
        console.log(`Cosine similarity between student and AI: ${similarityScore}`);

        // Return whether the student answer passed (70% or more similarity)
        const passed = similarityScore >= 0.7;

        res.status(200).json({
            similarityScore: similarityScore.toFixed(2),
            passed: passed
        });
    } else {
        res.status(405).json({ message: 'Method Not Allowed' });
    }
}
