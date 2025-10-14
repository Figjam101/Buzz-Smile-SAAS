const mongoose = require('mongoose');
const Video = require('./models/Video');
const thumbnailService = require('./services/thumbnailService');
const fs = require('fs');
const path = require('path');

async function fixThumbnails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');
    console.log('Connected to MongoDB');
    
    const videos = await Video.find({}).populate('owner', 'email');
    console.log(`Found ${videos.length} videos in database`);
    
    for (const video of videos) {
      console.log(`\n--- Video: ${video.title || video.filename} ---`);
      console.log(`ID: ${video._id}`);
      console.log(`File Path: ${video.filePath}`);
      console.log(`Thumbnail Path: ${video.thumbnailPath || 'Not set'}`);
      
      // Check if video file exists
      const videoExists = video.filePath && fs.existsSync(video.filePath);
      console.log(`Video file exists: ${videoExists ? '✅' : '❌'}`);
      
      if (videoExists) {
        // Generate thumbnail if it doesn't exist
        if (!video.thumbnailPath || !fs.existsSync(video.thumbnailPath)) {
          console.log('🔧 Generating thumbnail...');
          try {
            const thumbnailPath = await thumbnailService.generateOptimalThumbnail(video.filePath, video._id);
            await Video.findByIdAndUpdate(video._id, { thumbnailPath });
            console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
          } catch (error) {
            console.log(`❌ Failed to generate thumbnail: ${error.message}`);
          }
        } else {
          console.log('✅ Thumbnail already exists');
        }
      }
    }
    
    console.log('\n✅ Thumbnail generation complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixThumbnails();