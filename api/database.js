const mongoose = require('mongoose');
const config = require('../config');
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

        const dbUri = 'mongodb+srv://tstone4:criminalseagull@cluster0.ntuqn.mongodb.net/maths_through_coding?retryWrites=true&w=majority';

        console.log(`Using full DB URI: ${dbUri}`);

        const serverSelectionTimeoutMS = 30000;
        const socketTimeoutMS = 30000;

        this.connection = await mongoose.connect(dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: serverSelectionTimeoutMS,
            socketTimeoutMS: socketTimeoutMS,
            connectTimeoutMS: 30000
        });

        console.log("Database connected successfully.");
        return this.connection;
    },
};

module.exports = db;
