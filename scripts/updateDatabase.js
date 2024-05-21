const mongoose = require('mongoose');
const Layout = require('../models/linkedPage');
const Videos = require('../models/videoModel');
const Questions = require('../models/mathQuestionsModel');
const { getDbConnectionString } = require('../config/index');
const layoutData = require('../seeds/layoutData.json');
const videoData = require('../seeds/videoData.json');
const mathsQuestionsData = require('../seeds/mathsQuestionData.json');

console.log('Script execution started');
console.log('Modules imported successfully');

// Connect to the database and update data
async function connectAndUpdate() {
    console.log('In connectAndUpdate function...');
    const connectionString = getDbConnectionString();
    console.log('Connection string obtained:', connectionString);

    try {
        if (mongoose.connection.readyState === 0) {
            console.log('Attempting to connect to MongoDB...');
            await mongoose.connect(connectionString, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('Connected to MongoDB');
        } else {
            console.log('Already connected to MongoDB');
        }

        console.log('Clearing existing data from collections...');

        // Clear existing data
        await Layout.deleteMany({});
        await Videos.deleteMany({});
        await Questions.deleteMany({});

        console.log('Existing data cleared.');

        console.log('Updating database...');

        // Insert Layout data
        for (let layout of layoutData) {
            console.log('Processing Layout:', layout);
            try {
                const result = await Layout.updateOne(
                    { "page.url_stub": layout.page.url_stub },
                    { $set: layout },
                    { upsert: true }
                );
                console.log(`Updated Layout: ${layout.page.url_stub}, Matched: ${result.n}, Modified: ${result.nModified}`);
            } catch (error) {
                console.error(`Error updating Layout: ${layout.page.url_stub}`, error);
            }
        }

        // Insert Video data
        for (let video of videoData) {
            console.log('Processing Video:', video);
            try {
                const result = await Videos.updateOne(
                    { _id: video._id || new mongoose.Types.ObjectId() },
                    { $set: video },
                    { upsert: true }
                );
                console.log(`Updated Video: ${video._id}, Matched: ${result.n}, Modified: ${result.nModified}`);
            } catch (error) {
                console.error(`Error updating Video: ${video._id}`, error);
            }
        }

        // Insert Math Questions data
        for (let question of mathsQuestionsData) {
            console.log('Processing Question:', question);
            try {
                const result = await Questions.updateOne(
                    { _id: question._id || new mongoose.Types.ObjectId() },
                    { $set: question },
                    { upsert: true }
                );
                console.log(`Updated Question: ${question._id}, Matched: ${result.n}, Modified: ${result.nModified}`);
            } catch (error) {
                console.error(`Error updating Question: ${question._id}`, error);
            }
        }

        console.log('Data update completed.');
        return mongoose.connection;
    } catch (error) {
        const errorMessage = 'Connection failed. Error during database update:';
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

exports.updateDatabase = connectAndUpdate;

exports.init = async function (app) {
    console.log('Initializing updateDatabase script...');
    try {
        await connectAndUpdate();
    } catch (error) {
        const errorMessage = 'Connection failed. Error during database update:';
        console.error(errorMessage, error);
        throw new Error(errorMessage);
    }
};

console.log('Calling updateDatabase.init()...');
exports.init();
