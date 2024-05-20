const mongoose = require('mongoose');
const config = require('../config'); // Adjust the path as needed
const express = require('express');
const app = express();

console.log(process.cwd());

// Serve static files from the 'public' directory
app.use(express.static('public'));

const db = {
    connection: null,

    /**
     * Connects to the database if not already connected.
     *
     * @returns {Promise<Connection>} The MongoDB connection.
     */
    connectToDatabase: async function () {
        if (this.connection) {
            return this.connection;
        }
        const dbUri = config.getDbConnectionString();
        this.connection = await mongoose.connect(dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected successfully.");
        return this.connection;
    },
};

module.exports = db;
