const db = require('./database');
const escapeHtml = require('escape-html');
const mongoose = require('mongoose');

// Define the Mongoose model for Feedback (this should only be done once)
const feedbackSchema = new mongoose.Schema({
    feedbackName: String,
    emailAddress: String,
    feedback: String
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// The serverless function handler
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        // Connect to the database if not already connected
        await db.connectToDatabase();  // Reuse the connection

        // Sanitize the input to prevent injection attacks
        const feedbackName = escapeHtml(req.body.feedbackName);
        const emailAddress = escapeHtml(req.body.emailAddress);
        const feedback = escapeHtml(req.body.feedback);

        // Create and save the sanitized feedback document
        await Feedback.create({
            feedbackName: feedbackName,
            emailAddress: emailAddress,
            feedback: feedback
        });

        console.log("Feedback submitted:", { feedbackName, emailAddress, feedback });

        // Send a thank you response
        res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thank You!</title>
            <link rel="icon" type="image/png" href="/images/linux_site_logo.webp" sizes="32x32">
            <link href="/style.css" rel="stylesheet">
       </head>
        <body>
        <header class="SiteHeader">
            <h1>Maths inCoding
                <img style="float: right;" width="120" height="120" src="/images/linux_site_logo.webp"
                     alt="Pi with numbers">
            </h1>
            <h3>... learning maths through coding computer games</h3>
        </header>
            <main class="thank-you-container">
                <h1>Thank you for your feedback, ${feedbackName}!</h1>
                <a href="/" class="myButton">Return to the Landing Page</a>
            </main>
        </body>
        </html>
        `);
    } catch (err) {
        console.error("Error submitting feedback:", err);
        res.status(500).send('Error submitting feedback');
    }
};
