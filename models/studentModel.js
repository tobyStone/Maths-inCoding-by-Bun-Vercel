const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For hashing passwords

const StudentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed password for login
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }, // Reference to School
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' } // Reference to Teacher
});

// Pre-save middleware to hash password before saving
StudentSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next(); // Only hash if the password has been modified
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt); // Hashing the password
    next();
});

module.exports = mongoose.model('Student', StudentSchema, 'students');
