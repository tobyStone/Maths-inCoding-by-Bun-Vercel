const { parse } = require('url');
const mongoose = require('mongoose');
const Videos = require('../models/videoModel'); // Ensure path is correct

// MongoDB connection (reusing a global connection)
const mongoURI = process.env.MONGODB_URI;
let db;

function connectDB() {
    if (db) {
        return Promise.resolve(db);
    }
    return mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true }).then((connectedDb) => {
        db = connectedDb;
        return db;
    });
}
module.exports = async (req, res) => {
    await connectDB();

    const { query } = parse(req.url, true);
    const { slug } = query; // 'slug' should match the path segment for specific video

    // Connect slug to your database schema
    const fullPath = `/videoPlayer/${slug}`;

    try {
        const videoData = await Videos.findOne({
            'page.url_stub': fullPath
        }).exec();

        if (videoData && videoData.page && videoData.page.videoData && videoData.page.videoData.length > 0) {
            const video = videoData.page.videoData[0]; // assuming first item is what you want to display
            const description = videoData.page.description || '';
            const videoSrc = video.video;
            const imageSrc = video.imgSrc;
            const timeStop = video.time_stop_1; // ensure your model includes this
            const questionLink = video.link_questions_1; // link to questions

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <title>Maths inCoding</title>
    <link rel="icon" type="image/png" href="/public/images/linux_site_logo.webp" sizes="32x32">
    <link href="/public/style.css" rel="stylesheet">
    <link href="/public/VideoPlayer.css" rel="stylesheet">
</head>
<body>
    <main>
        <header class="SiteHeader">
            <h1>Maths inCoding<img style="float: right;" width="120" height="120" src="/public/images/linux_site_logo.webp" alt="Pi with numbers"></h1>
            <div id="missionStatement">
                <h3>... learning maths through coding computer games</h3>
            </div>
        </header>

        <div class="video-container" id="video-container">
            <!-- Video Player Content -->
            <video controls class="video" id="video" preload="auto" poster="${imageSrc}">
                <source src="${videoSrc}" type="video/mp4">
            </video>
            <div class="video-controls" id="video-controls">
                <button id="play-pause-btn">Play</button>
                <input type="range" id="volume-control" min="0" max="1" step="0.1">
                <input type="range" id="seek-bar" min="0" value="0">
                <span id="current-time">00:00</span> / <span id="total-duration">00:00</span>
            </div>
        </div>

        <section class="description-container">
            <h3>${description}</h3>
        </section>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const video = document.getElementById('video');
            const playButton = document.getElementById('play-pause-btn');
            const volumeControl = document.getElementById('volume-control');
            const seekBar = document.getElementById('seek-bar');
            const currentTimeDisplay = document.getElementById('current-time');
            const totalDurationDisplay = document.getElementById('total-duration');


       // Listen to the video's time updates
        video.addEventListener('timeupdate', () => {
            seekBar.value = video.currentTime;
            currentTimeDisplay.textContent = formatTime(video.currentTime);

            const questionsAnswered = localStorage.getItem('questionsAnswered'); // Check if questions have been answered
            // Assuming time_stop_1 is a property on the first videoData object
            if (video.currentTime >= ${timeStop} && !questionsAnswered) {
                video.pause();
                window.location.href = '${questionLink}'; // Redirects to the questions page
                localStorage.setItem("previousVideoURL", window.location.pathname); // Store the current URL
                localStorage.setItem("previousVideoTimestamp", video.currentTime); // Store the current time
            }
        });

        // This handles the scenario where the user returns to the video after answering questions
        const params = new URLSearchParams(window.location.search);
        const startTime = params.get('t');
        if (startTime) {
            video.currentTime = parseFloat(startTime); // Set the video time to the returned time
        }


            playButton.addEventListener('click', () => {
                if (video.paused || video.ended) {
                    video.play();
                    playButton.textContent = 'Pause';
                } else {
                    video.pause();
                    playButton.textContent = 'Play';
                }
            });

            volumeControl.addEventListener('input', () => {
                video.volume = volumeControl.value;
            });

            seekBar.addEventListener('input', () => {
                video.currentTime = (seekBar.value / 100) * video.duration;
            });

            video.addEventListener('loadedmetadata', () => {
                seekBar.max = video.duration;
                totalDurationDisplay.textContent = formatTime(video.duration);
            });

            video.addEventListener('timeupdate', () => {
                seekBar.value = video.currentTime;
                currentTimeDisplay.textContent = formatTime(video.currentTime);

                const questionsAnswered = localStorage.getItem('questionsAnswered');
                if (video.currentTime >= ${timeStop} && !questionsAnswered) {
                    video.pause();
                    window.location.href = '${questionLink}';
                }
            });

            function formatTime(seconds) {
                const minutes = Math.floor(seconds / 60);
                seconds = Math.floor(seconds % 60);
                return \`\${minutes}:\${seconds < 10 ? '0' : ''}\${seconds}\`;
            }
        });
    </script>

    <footer id="FatFooter">
        <!-- Footer content -->
    </footer>
</body>
</html>
            `;
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(html);
        } else {
            res.status(404).send('Video not found');
        }
    } catch (error) {
        console.error('Error fetching video:', error);
        res.status(500).send('Internal Server Error');
    }
};
