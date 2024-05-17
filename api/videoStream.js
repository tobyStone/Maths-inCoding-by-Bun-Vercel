const { parse } = require('url');
const https = require('https');

module.exports = async (req, res) => {
    try {
        const parsedUrl = parse(req.url, true);
        const videoSrc = parsedUrl.query.videoSrc;

        if (!videoSrc) {
            return res.status(400).send('Missing videoSrc query parameter');
        }

        https.get(videoSrc, (cdnRes) => {
            if (cdnRes.statusCode !== 200) {
                return res.status(cdnRes.statusCode).send(`Error: ${cdnRes.statusCode}`);
            }

            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Length', cdnRes.headers['content-length']);
            res.setHeader('Accept-Ranges', 'bytes');

            cdnRes.pipe(res);
        }).on('error', (err) => {
            console.error('Error fetching video from CDN:', err);
            res.status(500).send('Internal Server Error');
        });
    } catch (error) {
        console.error('Error in processing request:', error);
        res.status(500).send('Internal Server Error');
    }
};
