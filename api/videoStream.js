const { parse } = require('url');
const https = require('https');

module.exports = async (req, res) => {
    try {
        const parsedUrl = parse(req.url, true);
        const videoSrc = parsedUrl.query.videoSrc;

        if (!videoSrc) {
            return res.status(400).send('Missing videoSrc query parameter');
        }

        const range = req.headers.range;
        if (!range) {
            // If no range header, fetch the entire video
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
        } else {
            // Parse the range header to determine the start and end bytes
            const positions = range.replace(/bytes=/, "").split("-");
            const start = parseInt(positions[0], 10);
            const end = positions[1] ? parseInt(positions[1], 10) : undefined;

            https.get(videoSrc, { headers: { Range: `bytes=${start}-${end}` } }, (cdnRes) => {
                if (cdnRes.statusCode !== 206) {
                    return res.status(cdnRes.statusCode).send(`Error: ${cdnRes.statusCode}`);
                }

                res.setHeader('Content-Range', cdnRes.headers['content-range']);
                res.setHeader('Content-Length', cdnRes.headers['content-length']);
                res.setHeader('Content-Type', 'video/mp4');
                res.setHeader('Accept-Ranges', 'bytes');

                cdnRes.pipe(res);
            }).on('error', (err) => {
                console.error('Error fetching video from CDN:', err);
                res.status(500).send('Internal Server Error');
            });
        }
    } catch (error) {
        console.error('Error in processing request:', error);
        res.status(500).send('Internal Server Error');
    }
};
