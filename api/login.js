const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/studentModel');
const Teacher = require('../models/teacherModel');
const db = require('./database');  

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const { email, password } = req.body;

        try {
            // Ensure the database is connected before making queries
            await db.connectToDatabase();

            // Log the mongoose connection state for debugging
            console.log("Mongoose connection state:", db.connection.readyState);  // Should be 1 (connected)
            // Log the incoming email and password
            console.log("Login attempt, email:", email, "Password:", password);

            // Find user (either student or teacher) with case-insensitive email search
            console.log("Querying student by email...");
            const studentUser = await Student.findOne({ email: new RegExp('^' + email + '$', 'i') });
            console.log("Query completed for student. User found:", studentUser);

            const teacherUser = await Teacher.findOne({ email: new RegExp('^' + email + '$', 'i') });
            console.log("Query completed for teacher. User found:", teacherUser);

            const user = studentUser || teacherUser;
            console.log("Query completed. User found:", user);

            if (!user) {
                console.log("User not found for email:", email);
                return res.status(404).json({ message: 'User not found' });
            }

            // Compare the password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log("Password mismatch for user:", user);
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            console.log("Password match:", isMatch);

            // Ensure JWT_SECRET is defined
            if (!process.env.JWT_SECRET) {
                console.log("JWT_SECRET not set in environment.");
                return res.status(500).json({ message: 'Internal server error: JWT_SECRET not set' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user._id, role: user instanceof Student ? 'student' : 'teacher' },
                process.env.JWT_SECRET,
                { expiresIn: '3h' }
            );

            // Store token in localStorage and redirect appropriately
            res.json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user instanceof Student ? 'student' : 'teacher'
                },
                redirectUrl: user instanceof Student ? '/api/general_page' : '/api/teacher_dashboard'
            });

        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({ message: 'Server error' });
        }
    } else {
        // Handle other methods or send a 405 Method Not Allowed
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};
