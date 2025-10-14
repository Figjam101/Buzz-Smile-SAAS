const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Video = require('./models/Video');
const User = require('./models/User');
const thumbnailService = require('./services/thumbnailService');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');

async function checkJackRyanVideos() {
  try {
    console.log('🔍 Finding Jack Ryan user...');
    
    // Find Jack Ryan user
    const jackRyan = await User.findOne({ email: 'npkalyx@gmail.com' });
    
    if (!jackRyan) {
      console.log('❌ Jack Ryan user not found!');
      process.exit(1);
    }
    
    console.log(`✅ Found Jack Ryan: ${jackRyan.name} (${jackRyan.email})`);
    console.log(`User ID: ${jackRyan._id}`);
    
    // Find Jack Ryan's videos
    const videos = await Video.find({ owner: jackRyan._id });
    
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

checkJackRyanVideos();
