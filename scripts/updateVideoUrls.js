require('dotenv').config(); // Load environment variables from .env
const mongoose = require('mongoose');
const Video = require('../models/videoModel'); // Ensure the path is correct

const videoBlobUrls = {
    "3Dgameengine.mp4": "https://arovpkdsqzukklqx.public.blob.vercel-storage.com/3Dgameengine-FsMeyOa7OlaRUs1eNdukjMUNDLP7IP.mp4",
    "ratioWithDifferences.mp4": "https://arovpkdsqzukklqx.public.blob.vercel-storage.com/ratioWithDifferences-pdPv0c.mp4"
};

async function updateVideoUrls() {
    const mongoUri = `mongodb+srv://${process.env.uname}:${process.env.pwd}@cluster0.ntuqn.mongodb.net/maths_through_coding?retryWrites=true&w=majority`;

    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB.');

        for (const [fileName, url] of Object.entries(videoBlobUrls)) {
            console.log(`Updating URLs for file: ${fileName}`);

            // Update the URLs within the nested array
            const result = await Video.updateMany(
                { "page.videoData.video": new RegExp(fileName) },
                { $set: { "page.videoData.$[elem].video": url } },
                { arrayFilters: [{ "elem.video": new RegExp(fileName) }] }
            );
            console.log(`Updated ${result.modifiedCount} documents for ${fileName}`);
        }

        console.log('Video URLs updated successfully.');
    } catch (error) {
        console.error('Error updating video URLs:', error);
    } finally {
        mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

updateVideoUrls().catch(err => {
    console.error('Error updating video URLs:', err);
    process.exit(1);
});
