const mongoose = require('mongoose');
const config = require('../config'); // Adjust the path as needed

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
