const mongoose = require('mongoose');
const Layout = require('../models/linkedPage');
const Videos = require('../models/videoModel');
const Questions = require('../models/mathQuestionsModel');
const { getDbConnectionString } = require('../config/index');
const layoutData = require('../seeds/layoutData.json');
const videoData = require('../seeds/videoData.json');
const mathsQuestionsData = require('../seeds/mathsQuestionData.json');

console.log('Script execution started'); // Very first logging statement
console.log('Modules imported successfully'); // Logging after imports

// Connect to the database and update data
async function connectAndUpdate() {
    console.log('In connectAndUpdate function...'); // Early logging inside function

    const connectionString = getDbConnectionString();
    console.log('Connection string obtained:', connectionString); // Log connection string

    try {
        if (mongoose.connection.readyState === 0) {
            console.log('Attempting to connect to MongoDB...'); // Log before connection
            await mongoose.connect(connectionString, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('Connected to MongoDB');
        } else {
            console.log('Already connected to MongoDB');
        }

        console.log('Updating database...');

        // Update Layout data
        for (let layout of layoutData) {
            console.log('Processing Layout:', layout); // Log layout data being processed
            try {
                const result = await Layout.updateOne(
                    { "page.url_stub": layout.page.url_stub }, // Matching criteria
                    layout,
                    { upsert: true }
                );
                console.log(`Updated Layout: ${layout.page.url_stub}, Matched: ${result.n}, Modified: ${result.nModified}`);
            } catch (error) {
                console.error(`Error updating Layout: ${layout.page.url_stub}`, error);
            }
        }

        // Update Video data
        for (let video of videoData) {
            console.log('Processing Video:', video); // Log video data being processed
            try {
                const result = await Videos.updateOne({ _id: video._id }, video, { upsert: true });
                console.log(`Updated Video: ${video._id}, Matched: ${result.n}, Modified: ${result.nModified}`);
            } catch (error) {
                console.error(`Error updating Video: ${video._id}`, error);
            }
        }

        // Update Math Questions data
        for (let question of mathsQuestionsData) {
            console.log('Processing Question:', question); // Log question data being processed
            try {
                const result = await Questions.updateOne({ _id: question._id }, question, { upsert: true });
                console.log(`Updated Question: ${question._id}, Matched: ${result.n}, Modified: ${result.nModified}`);
            } catch (error) {
                console.error(`Error updating Question: ${question._id}`, error);
            }
        }

        console.log('Data update completed.');

        return mongoose.connection;
    } catch (error) {
        const errorMessage = 'Connection failed.'; // Use a fixed error message
        console.error(`${errorMessage} Error during database update:`, error);
        throw new Error(errorMessage); // Throw a new Error with the fixed message
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

exports.updateDatabase = connectAndUpdate;

exports.init = async function (app) {
    console.log('Initializing updateDatabase script...'); // Logging at init
    try {
        await connectAndUpdate();
    } catch (error) {
        const errorMessage = 'Connection failed.'; // Use a fixed error message
        console.error(`${errorMessage} Error during database update:`, error);
        throw new Error(errorMessage); // Throw a new Error with the fixed message
    }
};

console.log('Calling updateDatabase.init()...'); // Log before init call
exports.init();
