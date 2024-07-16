const axios = require('axios');
require('dotenv').config();

/**
 * Function to interact with OpenAI API
 *
 * @param {string} prompt - The prompt/question to send to OpenAI API.
 * @returns {Promise<string>} - A promise that resolves to the message content.
 */
async function getAIResponse(prompt) {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });

        // Log prompt and token usage
        const usage = response.data.usage;
        console.log(`Prompt: ${prompt}`);
        console.log(`Prompt tokens: ${usage.prompt_tokens}, Completion tokens: ${usage.completion_tokens}, Total tokens: ${usage.total_tokens}`);

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Error interacting with OpenAI API:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = { getAIResponse };
