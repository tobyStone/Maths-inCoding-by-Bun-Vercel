const mongoose = require('mongoose');
const config = require('../config'); // Adjust path as needed

const db = {
    connection: null,

    connectToDatabase: async function () {
        if (this.connection) {
            return this.connection;
        }
        this.connection = await mongoose.connect(config.dbUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected successfully.");
        return this.connection;
    }
};

module.exports = db;
