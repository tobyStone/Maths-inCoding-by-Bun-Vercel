const mongoose = require('mongoose');
const config = require('../config'); // Adjust the path as needed
const express = require('express');
const app = express();
const path = require('path');
const geoip = require('geoip-lite');


const geoDBPath = path.join(__dirname, '../data/geoip/GeoLite2-City.mmdb');
geoip.startWatchingDataUpdate({
    database: geoDBPath,
    watchForUpdates: true // Optional: set to true if you want auto-updates
});

console.log(process.cwd())

// Serve static files from the 'public' directory
app.use(express.static('public'));




const db = {
    connection: null,

    connectToDatabase: async function () {
        if (this.connection) {
            return this.connection;
        }
        const dbUri = config.getDbConnectionString(); // Ensure this returns the correct string
        this.connection = await mongoose.connect(dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected successfully.");
        return this.connection;
    }
};

module.exports = db;
