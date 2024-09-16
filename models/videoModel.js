const mongoose = require('mongoose');

const { Schema } = mongoose;

const videoSchema = new Schema({
    video: String,
    time_stops: {
        type: [String], // Array of time stops
        default: [] // Default to an empty array if not provided
    },
    poster: String,
    imgSrc: String,
    imgAlt: String,
    question_links: {
        type: [String], // Array of question links
        default: [] // Default to an empty array if not provided
    }
});


const pageSchema = new Schema({
    url_stub: String,
    description: String,
    videoData: [videoSchema], // Embed the video schema as an array
});

const layoutSchema = new Schema({
    page: pageSchema,
});

// Change the export name to 'videoData' instead of 'Layout'
const videoData = mongoose.model('videoData', layoutSchema, 'maths_through_coding');

module.exports = videoData; 





