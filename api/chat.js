const axios = require('axios');
require('dotenv').config();

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;

    console.log('Received prompt:', prompt); // Log the received prompt

    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: 'gpt-3.5', // Use a valid model name
            prompt: prompt,
            max_tokens: 150,
            n: 1,
            stop: null,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });

        console.log('OpenAI response:', response.data); // Log the OpenAI response
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error interacting with OpenAI API:', error.response ? error.response.data : error.message);

        if (error.response && error.response.status === 429) {
            res.status(429).send('Quota exceeded. Please check your OpenAI plan and billing details.');
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
};
