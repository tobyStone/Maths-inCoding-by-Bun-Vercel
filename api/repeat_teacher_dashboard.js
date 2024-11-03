const Student = require('../models/studentModel');
const QuizResults = require('../models/quizResultModel');
const db = require('./database'); // Your database connection logic
require('dotenv').config();

const getFormattedDate = (date, country) => {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return 'Invalid Date';
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return parsedDate.toLocaleDateString(country === 'GB' ? 'en-GB' : 'en-US', options);
};

// Serverless function handler for periodic updates
module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        await db.connectToDatabase();

        // Fetch students and quiz results (assuming teacher ID or relevant criteria are available)
        const teacherId = "YOUR_TEACHER_ID_HERE";  // Use a static teacher ID or another approach to select students
        const students = await Student.find({ teacher: teacherId }).lean();

        if (!students || students.length === 0) {
            return res.status(404).json({ message: 'No students found for this teacher.' });
        }

        const studentIds = students.map(student => student._id);
        const quizResults = await QuizResults.find({ student: { $in: studentIds } }).populate('student', 'name email');

        const country = req.headers['x-vercel-ip-country'] || 'US';

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

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(resultsByStudent);

    } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
        return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
};
