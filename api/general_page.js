const { parse } = require('url');
const mongoose = require('mongoose');
const Layout = require('../models/linkedPage'); // Ensure path is correct
const geoip = require('geoip-lite'); // GeoIP for location-based content


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
    const { path } = query;
    try {
        const sections = await Layout.findOne({ 'page.url_stub': path }).exec();
        if (sections) {
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            const geo = geoip.lookup(ip);
            let locality = (geo && geo.country === 'GB') ? 'UK' : 'US';

            const sectionElements = sections.page.sections.map(section => {
                let yearGroup = locality === 'UK' ? section.UK_yearGroup : section.US_yearGroup;
                let title = yearGroup ? section.title.replace(/Age \d{2}-\d{2}/, yearGroup) : section.title;

                return `
                <div class="container">
                    <section class="math-section" id="${section.id}">
                        <h1>${title}</h1>
                        <div class="imgWrap">
                            <a href="${section.link}">
                                <img id="${section.id}_img" class="imgToHover" src="${section.imgSrc}" alt="${section.imgAlt}">
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
    <link rel="icon" type="image/png" href="/public/images/linux_site_logo.webp" sizes="32x32">
    <link href="/public/style.css" rel="stylesheet">    
</head>
<body>
    <main>
        <header class="SiteHeader">
            <h1>Maths inCoding<img style="float: right;" width="120" height="120" src="/public/images/linux_site_logo.webp" alt="Pi with numbers"></h1>
            <h3>... learning maths through coding computer games</h3>
            <nav class="header-bottom">
                <a href="/public/about_us.html" class="about-us-link">About Us</a>
            </nav>
        </header>

        <div class="content-container">
            ${sectionElements}
        </div>
    </main>

    <footer id="FatFooter">
        <!-- Footer content similar to the EJS template -->
    </footer>

    <script>
        localStorage.removeItem('questionsAnswered');
    </script>
</body>
</html>
            `;
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(html);
        } else {
            res.status(404).send('Page not found');
        }
    } catch (error) {
        console.error('Error fetching page data:', error);
        res.status(500).send('Internal Server Error');
    }
};
