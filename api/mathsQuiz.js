const { parse } = require('url');

/**
 * Serverless function to serve the Maths Quiz page
 *
 * @param {Object} req - The HTTP request object
 * @param {Object} res - The HTTP response object
 */
module.exports = async (req, res) => {
    try {
        const parsedUrl = parse(req.url, true);
        const urlPath = parsedUrl.pathname;

        // Example protocol handling (use HTTPS in production)
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const baseUrl =
            protocol === 'https'
                ? 'https://mathsincoding.co.uk'
                : 'http://localhost:3000';

        // JavaScript logic to be injected into the HTML
        const script = `
      (function() {
        let topic = "arithmetic_integers";
        let difficulty = [1, 5];
        let questions = [];
        let quizState = {
          currentQuestion: 0,
          score: 0,
          answers: [],
          completed: false,
        };

        function formatTopicName(topic) {
          return topic.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }

        function generateQuestions(topic, minDifficulty, maxDifficulty) {
          return Array.from({ length: 16 }, (_, i) => ({
            question: \`Question \${i + 1} in \${topic}\`,
            answer: \`Answer \${i + 1}\`,
          }));
        }

        function startQuiz() {
          questions = generateQuestions(topic, difficulty[0], difficulty[1]);
          quizState = {
            currentQuestion: 0,
            score: 0,
            answers: [],
            completed: false,
          };
          renderQuestions();
        }

        function resetQuiz() {
          questions = [];
          renderSetup();
        }

        function renderSetup() {
          const quizContent = document.getElementById("quiz-content");
          quizContent.innerHTML = \`
            <div class="text-center">
              <h2 class="text-2xl font-semibold text-white mb-6">Choose Your Quiz</h2>
              <label for="topic">Topic:</label>
              <select id="topic-select">
                <option value="arithmetic_integers">Arithmetic (Integers)</option>
                <option value="arithmetic_fractions">Arithmetic (Fractions)</option>
              </select>
              <label for="difficulty">Difficulty:</label>
              <input id="difficulty-min" type="number" value="\${difficulty[0]}" min="1" max="10">
              <input id="difficulty-max" type="number" value="\${difficulty[1]}" min="1" max="10">
              <button id="start-quiz" class="btn btn-primary">Start Quiz</button>
            </div>
          \`;

          document.getElementById("start-quiz").addEventListener("click", () => {
            topic = document.getElementById("topic-select").value;
            difficulty = [
              parseInt(document.getElementById("difficulty-min").value, 10),
              parseInt(document.getElementById("difficulty-max").value, 10),
            ];
            startQuiz();
          });
        }

        function renderQuestions() {
          const quizContent = document.getElementById("quiz-content");
          quizContent.innerHTML = \`
            <h2 class="text-2xl font-semibold text-white mb-6 text-center">
              \${formatTopicName(topic)}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              \${questions
                .map(
                  (question, index) => \`
                <div class="question-panel">
                  <p><strong>Question \${index + 1}:</strong> \${question.question}</p>
                  <input type="text" id="answer-\${index}" placeholder="Your Answer">
                </div>
              \`
                )
                .join("")}
            </div>
            <div class="text-center space-y-4">
              <button id="new-practice" class="btn btn-purple">New Practice</button>
              <button id="reset-quiz" class="btn btn-blue">Back to Menu</button>
            </div>
          \`;

          document.getElementById("new-practice").addEventListener("click", startQuiz);
          document.getElementById("reset-quiz").addEventListener("click", resetQuiz);
        }

        renderSetup();
      })();
    `;

        // HTML structure with the script injected at the bottom
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Starter quizes on range of maths topics">
    <title>Maths inCoding</title>
    <link rel="icon" type="image/png" href="/images/linux_site_logo.webp" sizes="32x32">
    <link href="/style.css" rel="stylesheet">
</head>
<body>
  <div id="math-quiz" class="min-h-screen bg-blue-600 py-8">
    <div class="container max-w-7xl mx-auto px-4">
      <h1 class="text-5xl font-bold text-center mb-12 text-white">Maths Starter</h1>
      <div id="quiz-content">
        <!-- Quiz setup or question panels will be dynamically inserted here -->
      </div>
    </div>
  </div>
  <script>
    ${script}
  </script>
</body>
</html>
    `;

        // Send the generated HTML
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error serving Maths Quiz page:', error);
        res.status(500).send('Internal Server Error');
    }
};
