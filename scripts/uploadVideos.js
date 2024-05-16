// scripts/uploadVideos.js
require('dotenv').config();
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

async function uploadVideo(fileName, filePath) {
    try {
        const fileData = fs.readFileSync(filePath);
        const result = await put(fileName, fileData, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN // Use the token from the environment variable
        });
        console.log('Uploaded video URL:', result.url);
        return result.url;
    } catch (error) {
        console.error(`Failed to upload ${fileName}:`, error);
        throw error;
    }
}

async function main() {
    try {
        const videosDirectory = path.join(__dirname, '..', 'public', 'videos');
        const videoFiles = fs.readdirSync(videosDirectory);

        for (const file of videoFiles) {
            const filePath = path.join(videosDirectory, file);
            if (fs.lstatSync(filePath).isFile()) {
                const url = await uploadVideo(file, filePath);
                console.log(`Uploaded ${file} to ${url}`);
            } else {
                console.log(`Skipped ${filePath} (not a file)`);
            }
        }
    } catch (error) {
        console.error('Error processing video directory:', error);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Error uploading videos:', err);
    process.exit(1);
});
