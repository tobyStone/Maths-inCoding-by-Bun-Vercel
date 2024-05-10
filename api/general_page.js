const { parse } = require('url');
const db = require('./database');
const Layout = require('../models/linkedPage'); // Ensure path is correct
const geoip = require('geoip-lite'); // GeoIP for location-based content

module.exports = async (req, res) => {
    await db.connectToDatabase(); // Ensures a single connection
    const parsedUrl = parse(req.url, true);
    const urlPath = parsedUrl.pathname; // Gets the path part of the URL
    const query = { 'page.url_stub': urlPath };

    try {
        const sections = await Layout.findOne(query).exec();

        if (!sections || !sections.page || !sections.page.sections) {
            console.error("No sections found for URL:", urlPath, "with query:", query);
            return res.status(404).send('Page not found');
        }

        const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000/';//providing a root in production

        const sectionElements = sections.page.sections.map(section => {
            if (!section || !section.title || !section.imgSrc) {

                // If essential properties are missing, skip this section
                return '';
            }

            section.imgSrc = section.imgSrc.replace('public/', '/');

            // Assuming the image source may not be complete or needs modification
            if (!section.imgSrc.startsWith('http')) {
                // Prepend base URL only if it's not a complete URL
                section.imgSrc = `${baseUrl}${section.imgSrc}`;
            }

            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const geo = geoip.lookup(ip);
            let locality = (geo && geo.country === 'GB') ? 'UK' : 'US';

            let yearGroup = locality === 'UK' ? section.UK_yearGroup : section.US_yearGroup;
            let title = yearGroup ? section.title.replace(/Age \d{2}-\d{2}/, yearGroup) : section.title;

            return `
                <div class="container">
                    <section class="math-section" id="${section.id}">
                        <h1>${title}</h1>
                        <div class="imgWrap">
                            <a href="${section.link || '#'}">
                                <img id="${section.id}_img" class="imgToHover" src="${section.imgSrc}" alt="${section.imgAlt || 'Image'}">
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
            <h1>Maths inCoding<img style="float: right;" width="120" height="120" src="/images/linux_site_logo.webp" alt="Pi with numbers"></h1>
            <h3>... learning maths through coding computer games</h3>
            <nav class="header-bottom">
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
