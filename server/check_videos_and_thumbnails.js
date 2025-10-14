const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Video = require('./models/Video');
const thumbnailService = require('./services/thumbnailService');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');

async function checkVideosAndThumbnails() {
  try {
    console.log('🔍 Checking videos and thumbnails for Jack Ryan...');
    
    // Find Jack Ryan's videos
    const videos = await Video.find({ owner: new mongoose.Types.ObjectId('676b8b8b8b8b8b8b8b8b8b8b') });
    
    console.log(`\n📹 Found ${videos.length} videos for Jack Ryan:`);
    
    for (const video of videos) {
      console.log(`\n--- Video: ${video.title} ---`);
      console.log(`ID: ${video._id}`);
      console.log(`File Path: ${video.filePath}`);
      console.log(`Thumbnail Path: ${video.thumbnailPath || 'Not set'}`);
      
      // Check if video file exists
      const videoExists = fs.existsSync(video.filePath);
      console.log(`Video file exists: ${videoExists ? '✅' : '❌'}`);
      
      if (!videoExists) {
        console.log(`❌ Video file missing: ${video.filePath}`);
        continue;
      }
      
      // Check if thumbnail exists
      if (video.thumbnailPath) {
        const thumbnailExists = fs.existsSync(video.thumbnailPath);
        console.log(`Thumbnail exists: ${thumbnailExists ? '✅' : '❌'}`);
        
        if (!thumbnailExists) {
          console.log(`🔧 Attempting to regenerate thumbnail...`);
          try {
            const newThumbnailPath = await thumbnailService.generateOptimalThumbnail(video.filePath, video._id);
            await Video.findByIdAndUpdate(video._id, { thumbnailPath: newThumbnailPath });
            console.log(`✅ Thumbnail regenerated: ${newThumbnailPath}`);
          } catch (error) {
            console.log(`❌ Failed to regenerate thumbnail: ${error.message}`);
          }
        }
      } else {
        console.log(`🔧 No thumbnail path set, generating...`);
        try {
          const newThumbnailPath = await thumbnailService.generateOptimalThumbnail(video.filePath, video._id);
          await Video.findByIdAndUpdate(video._id, { thumbnailPath: newThumbnailPath });
          console.log(`✅ Thumbnail generated: ${newThumbnailPath}`);
        } catch (error) {
          console.log(`❌ Failed to generate thumbnail: ${error.message}`);
        }
      }
    }
    
    console.log('\n✅ Video and thumbnail check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkVideosAndThumbnails();
