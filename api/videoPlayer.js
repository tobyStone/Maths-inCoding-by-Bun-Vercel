const { parse } = require('url');
const db = require('./database');
const Video = require('../models/videoModel');

/**
 * Handles incoming requests, fetches video data from the database, and generates HTML content.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */
module.exports = async (req, res) => {
    try {
        await db.connectToDatabase(); // Ensures a single connection
        const parsedUrl = parse(req.url, true);
        const urlPath = parsedUrl.pathname; // Gets the path part of the URL
        const query = { 'page.url_stub': urlPath };

        const videoEntry = await Video.findOne(query).exec();
        if (!videoEntry || !videoEntry.page || !videoEntry.page.videoData ||
            videoEntry.page.videoData.length === 0) {
            console.error("Video data not found for URL:", urlPath);
            return res.status(404).send('Video not found');
        }

        const video = videoEntry.page.videoData[0];
        const description = videoEntry.page.description || '';
        const videoSrc = video.video;  // Use the video URL directly
        const timeStops = [video.time_stop_1, video.time_stop_2, video.time_stop_3].filter(ts => ts !== null); // Handle multiple time stops
        const questionLinks = [video.link_questions_1, video.link_questions_2, video.link_questions_3].filter(ql => ql !== null);
        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://maths-in-coding-by-bun-vercel.vercel.app'
            : 'http://localhost:3000/';
        const posterSrc = baseUrl + video.imgSrc;

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">
    <title>Maths inCoding</title>
    <link rel="icon" type="image/png" href="/images/linux_site_logo.webp" sizes="32x32">
    <link href="/style.css" rel="stylesheet">
    <link href="/VideoPlayer.css" rel="stylesheet">
</head>
<body>
    <main>
        <header class="SiteHeader">
            <h1>Maths inCoding<img style="float: right;" width="120" height="120" 
                                   src="/images/linux_site_logo.webp" alt="Pi with numbers"></h1>
            <h3>... learning maths through coding computer games</h3>
        </header>

        <div class="video-container">
           <video id="videoPlayer" controls preload="auto" poster="${posterSrc}">
                <source src="${videoSrc}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>

        <section class="description-container">
            <h3>${description}</h3>
        </section>

        <!-- Additional interactive elements based on time stops and question links -->
    </main>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const videoPlayer = document.getElementById('videoPlayer');
            const videoData = {
                time_stops: ${JSON.stringify(timeStops)}, // Array of time stops
                question_links: ${JSON.stringify(questionLinks)} // Array of question links

            };

            // Example to handle URL parameters to start video at specific time
            const params = new URLSearchParams(window.location.search);
            const startTime = params.get('t');
            if (startTime) {
                videoPlayer.currentTime = parseFloat(startTime);
            }

            // Listen for time updates to handle time stops
            videoPlayer.addEventListener('timeupdate', function() {
                const currentTime = videoPlayer.currentTime;
                let questionsAnswered = JSON.parse(localStorage.getItem('questionsAnswered')) || new Array(videoData.time_stops.length).fill(false);


                // Iterate through each time stop to check if the video should pause
                videoData.time_stops.forEach((stop, index) => {

                    // Log the current time and questionsAnswered state
                    console.log('Checking time stop:', stop, 'Current time:', currentTime, 'Question answered:', questionsAnswered[index]);

                    // If the current time passes a stop and the corresponding question set hasn't been answered
                    if (currentTime >= stop && !questionsAnswered[index]) {
                        videoPlayer.pause();
                        console.log(\`Video paused at time stop: \${stop} seconds.\`);
                        // Storing video information in localStorage
                        localStorage.setItem("previousVideoURL", window.location.pathname);
                        localStorage.setItem("previousVideoTimestamp", currentTime.toString());


                        // Redirect to the corresponding question link
                        window.location.href = videoData.question_links[index];
                    }
                });

            });

       });

        // Additional video controls
        const playButton = document.getElementById('play-pause-btn');
        const volumeControl = document.getElementById('volume-control');
        const seekBar = document.getElementById('seek-bar');
        const currentTimeDisplay = document.getElementById('current-time');
        const totalDurationDisplay = document.getElementById('total-duration');

        if (playButton) {
            playButton.addEventListener('click', function() {
                if (videoPlayer.paused || videoPlayer.ended) {
                    videoPlayer.play();
                    playButton.textContent = 'Pause';
                } else {
                    videoPlayer.pause();
                    playButton.textContent = 'Play';
                }
            });
        }

        if (volumeControl) {
            volumeControl.addEventListener('input', function() {
                videoPlayer.volume = volumeControl.value;
            });
        }

        if (seekBar) {
            seekBar.addEventListener('input', function() {
                videoPlayer.currentTime = (seekBar.value / 100) * videoPlayer.duration;
            });

            videoPlayer.addEventListener('loadedmetadata', function() {
                seekBar.max = videoPlayer.duration;
                totalDurationDisplay.textContent = formatTime(videoPlayer.duration);
            });

            videoPlayer.addEventListener('timeupdate', function() {
                seekBar.value = (videoPlayer.currentTime / videoPlayer.duration) * 100;
                currentTimeDisplay.textContent = formatTime(videoPlayer.currentTime);
            });
        }

        /**
         * Formats time in seconds to minutes and seconds.
         *
         * @param {number} seconds - The time in seconds.
         * @returns {string} The formatted time string.
         */
        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return \`\${minutes}:\${remainingSeconds < 10 ? '0' : ''}\${remainingSeconds}\`;
        }
    </script>
    <footer id="FatFooter">
        <div class="wordWrapper">
            <h4>How to set up</h4>
        </div>
        <div>
            <a href="https://www.youtube.com/watch?v=F1LzrEUtcHI" target="_blank">
                <div class="footerImgOne">
                    <img width="150" src="/images/scratch.webp" alt="Scratch">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=PcEbSoSGioY&t" target="_blank">
                <div class="footerImgTwo">
                    <img width="195" height="125" src="/images/roblox.webp" alt="Roblox">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=NU-tSBCMfZw" target="_blank">
                <div class="footerImgThree">
                    <img width="175" height="125" src="/images/minecraft_java.webp" alt="Unreal Engine">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=nCut7t2oNwA" target="_blank">
                <div class="footerImgFour">
                    <img width="175" height="125" src="/images/visual_studio.webp" alt="Visual Studio">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=S5J2VnKiKP4" target="_blank">
                <div class="footerImgOne">
                    <img width="150" src="/images/cave_engine.webp" alt="Scratch">
                </div>
            </a>
        </div>
    </footer>
</body>
</html>
        `;
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error in processing request:', error);
        res.status(500).send('Internal Server Error');
    }
};


