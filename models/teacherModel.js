const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' } // Reference to School
});

module.exports = mongoose.model('Teacher', TeacherSchema);
