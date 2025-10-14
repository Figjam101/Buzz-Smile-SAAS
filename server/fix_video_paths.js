const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Video = require('./models/Video');

async function fixVideoPaths() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/fresh-video-saas');
    console.log('Connected to MongoDB');

    // Get all videos
    const videos = await Video.find({});
    console.log(`Found ${videos.length} videos in database`);

    const currentUploadsDir = path.join(__dirname, 'uploads', 'videos');
    console.log(`Current uploads directory: ${currentUploadsDir}`);

    for (const video of videos) {
      console.log(`\n--- Video: ${video.title || video.filename} ---`);
      console.log(`ID: ${video._id}`);
      console.log(`Current file path: ${video.filePath}`);
      console.log(`Filename: ${video.filename}`);
      
      // Check if current path exists
      const currentPathExists = video.filePath && fs.existsSync(video.filePath);
      console.log(`Current path exists: ${currentPathExists ? '✅' : '❌'}`);
      
      if (!currentPathExists && video.filename) {
        // Try to find the file in the current uploads directory
        const newPath = path.join(currentUploadsDir, video.filename);
        const newPathExists = fs.existsSync(newPath);
        console.log(`Checking new path: ${newPath}`);
        console.log(`New path exists: ${newPathExists ? '✅' : '❌'}`);
        
        if (newPathExists) {
          // Update the video with the correct path
          await Video.findByIdAndUpdate(video._id, { filePath: newPath });
          console.log(`✅ Updated file path for video ${video._id}`);
        } else {
          console.log(`❌ File not found in current uploads directory`);
        }
      } else if (currentPathExists) {
        console.log(`✅ File path is correct`);
      }
    }
    
    console.log('\n✅ Video path fixing complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixVideoPaths();