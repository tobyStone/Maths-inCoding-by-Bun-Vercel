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
        console.log('Range header:', range);

        // Fetch the video's metadata first to get the content length
        https.get(videoSrc, { method: 'HEAD' }, (metaRes) => {
            if (metaRes.statusCode !== 200) {
                return res.status(metaRes.statusCode).send(`Error: ${metaRes.statusCode}`);
            }

            const contentLength = parseInt(metaRes.headers['content-length'], 10);
            console.log('Content-Length:', contentLength);

            let start = 0;
            let end = contentLength - 1;

            if (range) {
                const positions = range.replace(/bytes=/, "").split("-");
                start = parseInt(positions[0], 10);
                end = positions[1] ? parseInt(positions[1], 10) : end;

                if (start >= contentLength || end >= contentLength) {
                    return res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + contentLength);
                }
            }

            const chunksize = (end - start) + 1;
            console.log('Start:', start, 'End:', end, 'Chunksize:', chunksize);

            const options = {
                headers: {
                    'Range': `bytes=${start}-${end}`
                }
            };

            https.get(videoSrc, options, (cdnRes) => {
                if (cdnRes.statusCode !== 206 && cdnRes.statusCode !== 200) {
                    return res.status(cdnRes.statusCode).send(`Error: ${cdnRes.statusCode}`);
                }

                console.log('Content-Range:', cdnRes.headers['content-range']);
                console.log('Content-Length:', cdnRes.headers['content-length']);

                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${contentLength}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4'
                });

                cdnRes.pipe(res);
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
