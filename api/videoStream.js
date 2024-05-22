const { parse } = require('url');
const fs = require('fs');
const path = require('path');

/**
 * Handles incoming requests for video streaming.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */
module.exports = async (req, res) => {
    try {
        console.log('Received request for video stream');

        const parsedUrl = parse(req.url, true);
        const videoSrc = parsedUrl.query.videoSrc;

        if (!videoSrc) {
            console.log('Missing videoSrc query parameter');
            return res.status(400).send('Missing videoSrc query parameter');
        }

        const videoPath = path.join(__dirname, '..', 'public', 'videos', videoSrc);
        const range = req.headers.range;
        console.log('Range header:', range);

        if (!range) {
            return res.status(416).send('Range not satisfiable');
        }

        const videoSize = fs.statSync(videoPath).size;
        const CHUNK_SIZE = 10 ** 6; // 1MB
        const start = Number(range.replace(/\D/g, ""));
        const end = Math.min(start + CHUNK_SIZE, videoSize - 1);
        const contentLength = end - start + 1;

        const headers = {
            'Content-Range': `bytes ${start}-${end}/${videoSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': contentLength,
            'Content-Type': 'video/mp4',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache'
        };

        res.writeHead(206, headers);

        const videoStream = fs.createReadStream(videoPath, { start, end });
        videoStream.pipe(res);

        videoStream.on('end', () => {
            console.log('Streamed video successfully');
        });

    } catch (error) {
        console.error('Error in processing request:', error);
        res.status(500).send('Internal Server Error');
    }
};
 //   }
//};
