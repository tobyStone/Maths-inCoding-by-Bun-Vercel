const { parse } = require('url');
const db = require('./database');
const Layout = require('../models/linkedPage'); 

/**
 * Handles incoming requests, fetches data from the database, and generates HTML content.
 *
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 */

module.exports = async (req, res) => {
//    await db.connectToDatabase(); // Ensures a single connection
    const parsedUrl = parse(req.url, true);
    const urlPath = parsedUrl.pathname; // Gets the path part of the URL
    const query = { 'page.url_stub': urlPath };

    try {
        const sections = await Layout.findOne(query).exec();

        if (!sections || !sections.page || !sections.page.sections) {
            console.error("No sections found for URL:", urlPath, "with query:", query);
            return res.status(404).send('Page not found');
        }

        // If the request is made via HTTPS, ensure assets are loaded via HTTPS
        const protocol = req.headers['x-forwarded-proto'] || 'http'; // Use 'x-forwarded-proto' for determining the protocol
        const baseUrl = protocol === 'https'
            ? 'https://maths-in-coding-by-bun-vercel.vercel.app'
            : 'http://localhost:3000/';

        // Manually read the geolocation headers
        const country = req.headers['x-vercel-ip-country'];
        const city = req.headers['x-vercel-ip-city'];

        console.log(`Geolocation - Country: ${country}, City: ${city}`);

        const sectionElements = sections.page.sections.map(section => {
            if (!section || !section.title || !section.imgSrc) {
                return '';
            }


            if (!section.imgSrc.startsWith('http')) {
                section.imgSrc = `${baseUrl}${section.imgSrc}`;
            }

            const locality = (country === 'GB') ? 'UK' : 'US';
            const yearGroup = locality === 'UK' ? section.UK_yearGroup : section.US_yearGroup;
            const title = yearGroup ? section.title.replace(/Age \d{2}-\d{2}/, yearGroup) : section.title;

            return `
                <div class="container">
                    <section class="math-section" id="${section.id}">
                        <h1>${title}</h1>
                        <div class="imgWrap">
                            <a href="${section.link || '#'}">
                                <img id="${section.id}_img" class="imgToHover" src="${section.imgSrc}" 
                                     alt="${section.imgAlt || 'Image'}" loading="lazy">
                            </a>
                        </div>
                    </section>
                </div>
            `;
        }).join('');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${sections.page.description}">
    <title>Maths inCoding</title>
    <link rel="icon" type="image/png" href="/images/linux_site_logo.webp" sizes="32x32">
    <link href="/style.css" rel="stylesheet">
</head>
<body>
    <main>
        <header class="SiteHeader">
            <h1>Maths inCoding
                <img style="float: right;" width="120" height="120" src="/images/linux_site_logo.webp" 
                     alt="Pi with numbers">
            </h1>
            <h3>... learning maths through coding computer games</h3>
            <nav class="header-bottom">
                <a href="/how_it_works.html" class="how-it-works-link">How it Works</a>
                <a href="/about_us.html" class="about-us-link">About Us</a>
            </nav>
        </header>

        <div class="content-container">
            ${sectionElements}
        </div>
    </main>

    <footer id="FatFooter">
        <div class="wordWrapper">
            <h4>How to set up</h4>
        </div>
        <div>
            <a href="https://www.youtube.com/watch?v=F1LzrEUtcHI" target="_blank">
                <div class="footerImgOne">
                    <img width="150" src="/images/scratch.webp" alt="Scratch" loading="lazy">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=PcEbSoSGioY&t" target="_blank">
                <div class="footerImgTwo">
                    <img width="195" height="125" src="/images/roblox.webp" alt="Roblox" loading="lazy">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=NU-tSBCMfZw" target="_blank">
                <div class="footerImgThree">
                    <img width="175" height="125" src="/images/minecraft_java.webp" alt="Unreal Engine" loading="lazy">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=nCut7t2oNwA" target="_blank">
                <div class="footerImgFour">
                    <img width="175" height="125" src="/images/visual_studio.webp" alt="Visual Studio" loading="lazy">
                </div>
            </a>
            <a href="https://www.youtube.com/watch?v=S5J2VnKiKP4" target="_blank">
                <div class="footerImgOne">
                    <img width="150" src="/images/cave_engine.webp" alt="Scratch" loading="lazy">
                </div>
            </a>
        </div>
        <a href="/feedback_form.html" class="feedback-link">
            <div class="wordWrapper2">
                <h4>If you have any queries about the information presented here, please click this link</h4>
            </div>
        </a>
    </footer>

    <script>
        localStorage.removeItem('questionsAnswered');
    </script>
</body>
</html>
        `;
        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
    } catch (error) {
        console.error('Error fetching page data:', error);
        res.status(500).send('Internal Server Error');
    }
};
