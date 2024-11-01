const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacherModel');
const Student = require('../models/studentModel');
const QuizResults = require('../models/quizResultModel');
const db = require('./database'); // Your database connection logic
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to authenticate and authorize teachers.
 * Verifies the JWT token and checks if the user is a teacher.
 */
const authenticateTeacher = async (req, res) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    try {
        // Verify the token and decode it
        const decoded = jwt.verify(token, JWT_SECRET);

        // Ensure the role is 'teacher'
        if (decoded.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to access this route' });
        }

        // Fetch the teacher using the decoded ID
        const teacher = await Teacher.findById(decoded.id);
        if (!teacher) {
            console.log('Teacher not found');
            return res.status(404).json({ message: 'Teacher not found' });
        }
        console.log('Teacher authenticated:', teacher.name);  // Log successful authentication
        // Return the teacher object if authorized
        return teacher;
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};


const getFormattedDate = (date, country) => {
    const parsedDate = new Date(date);  // Ensure we parse the date string

    // Check if the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
        return 'Invalid Date';  // Return a fallback if the date is invalid
    }

    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    };

    if (country === 'GB') {
        // UK Format: DD/MM/YYYY
        return parsedDate.toLocaleDateString('en-GB', options);
    } else {
        // Default to US format: MM/DD/YYYY
        return parsedDate.toLocaleDateString('en-US', options);
    }
};


// Serverless function handler for teacher dashboard.

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Ensure the database is connected
        await db.connectToDatabase();

        // Authenticate the teacher
        const teacher = await authenticateTeacher(req, res);
        if (!teacher) {
            return; // Authentication failed, response already sent
        }

        // Fetch students associated with the authenticated teacher
        const students = await Student.find({ teacher: teacher._id }).lean();

        if (!students || students.length === 0) {
            return res.status(404).send('<h2>No students found for this teacher.</h2>');
        }

        // Collect all student IDs to query their quiz results
        const studentIds = students.map(student => student._id);

        // Fetch quiz results for all students associated with the teacher
        const quizResults = await QuizResults.find({ student: { $in: studentIds } }).populate('student', 'name email');

        // Get the country from the header
        const country = req.headers['x-vercel-ip-country'] || 'US'; // Default to US if the header is missing

        const resultsByStudent = quizResults.reduce((acc, result) => {
            if (!acc[result.student._id]) {
                acc[result.student._id] = {
                    studentName: result.student.name,
                    email: result.student.email,
                    scores: {},
                    passedResults: []
                };
            }
            if (result.passed) {
                acc[result.student._id].passedResults.push({
                    quizId: result.quizId,
                    score: result.score,
                    date: getFormattedDate(result.date, country)
                });
            } else {
                if (!acc[result.student._id].scores[result.quizId]) {
                    acc[result.student._id].scores[result.quizId] = { count: 0, dates: [] };
                }
                acc[result.student._id].scores[result.quizId].count += 1;
                acc[result.student._id].scores[result.quizId].dates.push(getFormattedDate(result.date, country));
            }
            return acc;
        }, {});


        // Generate HTML for the dashboard content (only the results section)
        const html = `
            <h1>Welcome ${teacher.name}, here are your students' quiz results:</h1>
            ${Object.values(resultsByStudent).map(student => `
                <div class="student-container">
                    <div class="student-details">
                        <strong>${student.studentName} (${student.email})</strong>
                    </div>
                    <div class="quiz-results">
                         ${Object.entries(student.scores).map(([quizId, result]) => `
                            <div class="quiz-result ${result.count >= 3 ? 'red' : result.count === 2 ? 'orange' : 'yellow'}">
                                Quiz: ${quizId} - ${result.count} ${result.count === 1 ? 'failure' : 'failures'} - Last Date: ${result.dates[result.dates.length - 1]}
                            </div>
                        `).join('')}
                        ${student.passedResults.map(passed => `
                            <div class="quiz-result">
                                Quiz: ${passed.quizId} - Score: ${passed.score}% - 
                                <span class="passed">Passed</span> - Date: ${passed.date}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        // Return the HTML content to be embedded in `teacher_dashboard.html`
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);

    } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
        return res.status(500).send('<h2>Internal server error. Please try again later.</h2>');
    }
};
