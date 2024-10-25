const mongoose = require('mongoose');

const SchoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: String,
    contactNumber: String
});

module.exports = mongoose.model('School', SchoolSchema, 'schools');
