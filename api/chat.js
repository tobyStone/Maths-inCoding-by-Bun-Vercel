const axios = require('axios');
require('dotenv').config();

/**
 * Function to interact with OpenAI API
 *
 * @param {string} prompt - The prompt/question to send to OpenAI API.
 * @returns {Promise<string>} - A promise that resolves to the message content.
 */


async function getAIResponse(prompt, systemMessage = 'You are a helpful assistant that explains things simply.') {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemMessage },  // System message
                { role: 'user', content: prompt }  // User prompt
            ],
            max_tokens: 150,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });

        const data = response.data.choices[0].message.content.trim();
        return data;
    } catch (error) {
        console.error('Error interacting with OpenAI API:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getAIResponse };



module.exports = { getAIResponse };
