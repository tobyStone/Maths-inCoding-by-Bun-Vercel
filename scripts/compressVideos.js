// scripts/compressVideos.js
// This script helps compress videos for better web performance
// You'll need to install ffmpeg and run this locally before uploading

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const inputDir = './public/videos';
const outputDir = './public/videos/compressed';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Compression settings for different quality levels
const compressionSettings = {
    high: '-crf 18 -preset slow -movflags +faststart',
    medium: '-crf 23 -preset medium -movflags +faststart',
    low: '-crf 28 -preset fast -movflags +faststart'
};

async function compressVideo(inputFile, outputFile, quality = 'medium') {
    return new Promise((resolve, reject) => {
        const settings = compressionSettings[quality];
        const command = `ffmpeg -i "${inputFile}" ${settings} "${outputFile}"`;
        
        console.log(`Compressing ${inputFile} with ${quality} quality...`);
        
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error compressing ${inputFile}:`, error);
                reject(error);
            } else {
                console.log(`Successfully compressed ${inputFile}`);
                resolve(outputFile);
            }
        });
    });
}

async function compressAllVideos() {
    try {
        const files = fs.readdirSync(inputDir);
        const videoFiles = files.filter(file => file.endsWith('.mp4'));
        
        for (const file of videoFiles) {
            const inputPath = path.join(inputDir, file);
            const baseName = path.basename(file, '.mp4');
            
            // Create multiple quality versions
            const qualities = ['high', 'medium', 'low'];
            
            for (const quality of qualities) {
                const outputPath = path.join(outputDir, `${baseName}_${quality}.mp4`);
                
                if (!fs.existsSync(outputPath)) {
                    await compressVideo(inputPath, outputPath, quality);
                } else {
                    console.log(`${outputPath} already exists, skipping...`);
                }
            }
        }
        
        console.log('All videos compressed successfully!');
    } catch (error) {
        console.error('Error compressing videos:', error);
    }
}

// Run the compression
if (require.main === module) {
    compressAllVideos();
}

module.exports = { compressVideo, compressAllVideos };
