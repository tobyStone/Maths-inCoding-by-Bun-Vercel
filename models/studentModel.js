const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }, // Reference to School
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' } // Reference to Teacher
});

module.exports = mongoose.model('Student', StudentSchema);
