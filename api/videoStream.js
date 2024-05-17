const { parse } = require('url');
const Video = require('../models/videoModel');

module.exports = async (req, res) => {
    try {
        const parsedUrl = parse(req.url, true);
        const urlPath = parsedUrl.pathname; // Adjust path as needed
        const query = { 'page.url_stub': urlPath };

        const videoEntry = await Video.findOne(query).exec();
        if (!videoEntry || !videoEntry.page || !videoEntry.page.videoData || videoEntry.page.videoData.length === 0) {
            console.error("Video data not found for URL:", urlPath);
            return res.status(404).send('Video not found');
        }

        const video = videoEntry.page.videoData[0];
        const videoSrc = video.video;  // Use the video URL directly from the database

        res.redirect(videoSrc);

    } catch (error) {
        console.error('Error in processing request:', error);
        res.status(500).send('Internal Server Error');
    }
};
