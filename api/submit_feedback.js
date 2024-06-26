const mongoose = require('mongoose');
const escapeHtml = require('escape-html');

// Define the MongoDB URI
const mongoURI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define a Mongoose model for Feedback
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
          <link rel="icon" type="image/png" href="/public/images/linux_site_logo.PNG" sizes="32x32">
          <link href="/public/style.css" rel="stylesheet">
      </head>
      <body>
          <header class="SiteHeader">
              <h1>Maths inCoding<img style="float: right;" width="120" height="120" src="/public/images/linux_site_logo.PNG" alt="Pi with numbers"></h1>
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
