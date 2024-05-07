// database.js
const mongoose = require('mongoose');
const config = require('../config'); // Ensure this path is correct based on your project structure

const connectToDatabase = async () => {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(config.dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected successfully.");
    }
}

module.exports = connectToDatabase;
