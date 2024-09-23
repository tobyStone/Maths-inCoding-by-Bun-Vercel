const natural = require('natural'); // You'll need the 'natural' package for tokenization

/**
 * Calculate the cosine similarity between two strings.
 *
 * @param {string} text1 - The first text to compare.
 * @param {string} text2 - The second text to compare.
 * @returns {number} - The cosine similarity score between 0 and 1.
 */
function cosineSimilarity(text1, text2) {
    // Tokenizer to split words into tokens
    const tokenizer = new natural.WordTokenizer();
    const tokens1 = tokenizer.tokenize(text1.toLowerCase());
    const tokens2 = tokenizer.tokenize(text2.toLowerCase());

    // Create a combined word set (vocabulary) from both texts
    const allTokens = Array.from(new Set([...tokens1, ...tokens2]));

    // Create vectors for both texts based on the combined vocabulary
    const vector1 = allTokens.map(token => tokens1.includes(token) ? 1 : 0);
    const vector2 = allTokens.map(token => tokens2.includes(token) ? 1 : 0);

    // Compute dot product of the vectors
    const dotProduct = vector1.reduce((sum, value, index) => sum + value * vector2[index], 0);

    // Compute magnitudes of both vectors
    const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + value * value, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + value * value, 0));

    // Calculate cosine similarity
    if (magnitude1 === 0 || magnitude2 === 0) return 0; // Prevent division by zero
    return dotProduct / (magnitude1 * magnitude2);
}

module.exports = cosineSimilarity;
