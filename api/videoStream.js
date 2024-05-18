const { parse } = require('url');
const https = require('https');

module.exports = async (req, res) => {
    try {
        console.log('Received request for video stream');

        const parsedUrl = parse(req.url, true);
        const videoSrc = parsedUrl.query.videoSrc;

        if (!videoSrc) {
            console.log('Missing videoSrc query parameter');
            return res.status(400).send('Missing videoSrc query parameter');
        }

        console.log('Video source:', videoSrc);

        const range = req.headers.range;
        console.log('Range header:', range);

        // Fetch the video's metadata first to get the content length
        https.get(videoSrc, { method: 'HEAD' }, (metaRes) => {
            if (metaRes.statusCode !== 200) {
                console.log('Error fetching video metadata:', metaRes.statusCode);
                return res.status(metaRes.statusCode).send(`Error: ${metaRes.statusCode}`);
            }

            const contentLength = parseInt(metaRes.headers['content-length'], 10);
            console.log('Content length:', contentLength);

            let start = 0;
            let end = contentLength - 1;

            if (range) {
                const positions = range.replace(/bytes=/, "").split("-");
                start = parseInt(positions[0], 10);
                end = positions[1] ? parseInt(positions[1], 10) : end;

                if (start >= contentLength || end >= contentLength) {
                    console.log('Requested range not satisfiable:', start, '>=', contentLength);
                    return res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + contentLength);
                }
            }

            const chunksize = (end - start) + 1;
            console.log('Start:', start, 'End:', end, 'Chunk size:', chunksize);

            const options = {
                headers: {
                    'Range': `bytes=${start}-${end}`
                }
            };

            https.get(videoSrc, options, (cdnRes) => {
                if (cdnRes.statusCode !== 206 && cdnRes.statusCode !== 200) {
                    console.log('Error fetching video:', cdnRes.statusCode);
                    return res.status(cdnRes.statusCode).send(`Error: ${cdnRes.statusCode}`);
                }

                console.log('Fetched video content, status code:', cdnRes.statusCode);
                console.log('Response headers:', cdnRes.headers);

                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${contentLength}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                    'Pragma': 'no-cache'
                });

                cdnRes.pipe(res).on('finish', () => {
                    console.log('Streamed video successfully');
                });

            }).on('error', (err) => {
                console.error('Error fetching video from CDN:', err);
                res.status(500).send('Internal Server Error');
            });

        }).on('error', (err) => {
            console.error('Error fetching video metadata from CDN:', err);
            res.status(500).send('Internal Server Error');
        });

    } catch (error) {
        console.error('Error in processing request:', error);
        res.status(500).send('Internal Server Error');
    }
};
