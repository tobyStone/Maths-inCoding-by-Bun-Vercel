const mongoose = require('mongoose');

const QuizResultSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    quizId: { type: String, required: true }, // For example: "angles_1"
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizResult', QuizResultSchema);
