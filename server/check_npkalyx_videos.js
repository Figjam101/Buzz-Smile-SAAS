const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Video = require('./models/Video');
const thumbnailService = require('./services/thumbnailService');

async function checkNpkalyxVideos() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/fresh-video-saas');
    console.log('Connected to MongoDB');

    // Find npkalyx@gmail.com user ID
    const User = require('./models/User');
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User npkalyx@gmail.com not found');
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`User ID: ${user._id}`);

    // Find videos for this user
    const videos = await Video.find({ owner: user._id });
    console.log(`\nFound ${videos.length} videos for ${user.email}:`);

    for (const video of videos) {
      console.log(`\n--- Video: ${video.title || video.filename} ---`);
      console.log(`ID: ${video._id}`);
      console.log(`File Path: ${video.filePath}`);
      console.log(`Thumbnail Path: ${video.thumbnailPath || 'Not set'}`);
      console.log(`Status: ${video.status}`);
      
      // Check if video file exists
      const videoExists = video.filePath && fs.existsSync(video.filePath);
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
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

checkNpkalyxVideos();