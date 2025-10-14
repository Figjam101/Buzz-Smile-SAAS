const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Video = require('./models/Video');
const User = require('./models/User');
const thumbnailService = require('./services/thumbnailService');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');

async function checkAllVideos() {
  try {
    console.log('🔍 Checking all videos in database...');
    
    // Get all videos
    const videos = await Video.find({}).populate('owner', 'name email');
    
    console.log(`\n📹 Found ${videos.length} total videos:`);
    
    for (const video of videos) {
      console.log(`\n--- Video: ${video.title} ---`);
      console.log(`ID: ${video._id}`);
      console.log(`Owner: ${video.owner ? video.owner.name || video.owner.email : 'Unknown'} (${video.owner ? video.owner._id : 'No owner'})`);
      console.log(`File Path: ${video.filePath}`);
      console.log(`Thumbnail Path: ${video.thumbnailPath || 'Not set'}`);
      console.log(`Status: ${video.status}`);
      
      // Check if video file exists
      const videoExists = fs.existsSync(video.filePath);
      console.log(`Video file exists: ${videoExists ? '✅' : '❌'}`);
      
      if (!videoExists) {
        console.log(`❌ Video file missing: ${video.filePath}`);
        continue;
      }
      
      // Check if thumbnail exists and generate if needed
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
    
    console.log('\n✅ All videos checked!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllVideos();
