const mongoose = require('mongoose');

const { Schema } = mongoose;

const videoSchema = new Schema({
    video: String,
    time_stop_1: String,
    time_stop_2: String,
    time_stop_3: String,
    time_stop_4: String,
    time_stop_5: String,
    time_stop_6: String,
    time_stop_7: String,
    poster: String,
    imgSrc: String,
    imgAlt: String,
    link_questions_1: String,
    link_questions_2: String,
    link_questions_3: String,
    link_questions_4: String,
    link_questions_5: String,
    link_questions_6: String,
    link_questions_7: String,
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





