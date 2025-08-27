require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('../models/videoModel');

// Replace with your CDN domain after setting up Cloud CDN
const CDN_DOMAIN = 'https://your-cdn-domain.com'; // Update this!
const OLD_DOMAIN = 'https://storage.googleapis.com/maths_incoding';

async function updateVideoUrlsForCDN() {
    const mongoUri = `mongodb+srv://${process.env.uname}:${process.env.pwd}@cluster0.ntuqn.mongodb.net/maths_through_coding?retryWrites=true&w=majority`;
    
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Find all video entries
        const videos = await Video.find({});
        console.log(`Found ${videos.length} video entries to update`);

        let updatedCount = 0;

        for (const video of videos) {
            let hasUpdates = false;

            if (video.page && video.page.videoData) {
                for (const videoData of video.page.videoData) {
                    if (videoData.video && videoData.video.startsWith(OLD_DOMAIN)) {
                        // Update video URL to use CDN
                        videoData.video = videoData.video.replace(OLD_DOMAIN, CDN_DOMAIN);
                        hasUpdates = true;
                        console.log(`Updated video URL: ${videoData.video}`);
                    }
                }
            }

            if (hasUpdates) {
                await video.save();
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} video entries`);
    } catch (error) {
        console.error('Error updating video URLs:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Performance monitoring function
async function analyzeVideoPerformance() {
    console.log('\n=== Video Performance Analysis ===');
    
    const mongoUri = `mongodb+srv://${process.env.uname}:${process.env.pwd}@cluster0.ntuqn.mongodb.net/maths_through_coding?retryWrites=true&w=majority`;
    
    try {
        await mongoose.connect(mongoUri);
        
        const videos = await Video.find({});
        const videoUrls = [];
        
        videos.forEach(video => {
            if (video.page && video.page.videoData) {
                video.page.videoData.forEach(vd => {
                    if (vd.video) {
                        videoUrls.push(vd.video);
                    }
                });
            }
        });

        const uniqueUrls = [...new Set(videoUrls)];
        console.log(`Total unique video URLs: ${uniqueUrls.length}`);
        
        const cdnUrls = uniqueUrls.filter(url => !url.includes('storage.googleapis.com'));
        const directUrls = uniqueUrls.filter(url => url.includes('storage.googleapis.com'));
        
        console.log(`URLs using CDN: ${cdnUrls.length}`);
        console.log(`URLs using direct storage: ${directUrls.length}`);
        
        if (directUrls.length > 0) {
            console.log('\nDirect storage URLs (should be migrated to CDN):');
            directUrls.forEach(url => console.log(`  - ${url}`));
        }
        
    } catch (error) {
        console.error('Error analyzing performance:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Run the appropriate function based on command line argument
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'analyze') {
        analyzeVideoPerformance();
    } else if (command === 'update') {
        if (CDN_DOMAIN === 'https://your-cdn-domain.com') {
            console.error('Please update the CDN_DOMAIN variable with your actual CDN domain before running this script!');
            process.exit(1);
        }
        updateVideoUrlsForCDN();
    } else {
        console.log('Usage:');
        console.log('  node scripts/updateVideoUrlsForCDN.js analyze  - Analyze current video URL performance');
        console.log('  node scripts/updateVideoUrlsForCDN.js update   - Update URLs to use CDN (update CDN_DOMAIN first!)');
    }
}

module.exports = { updateVideoUrlsForCDN, analyzeVideoPerformance };
