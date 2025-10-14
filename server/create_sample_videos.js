const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');

async function createSampleVideos() {
  try {
    await mongoose.connect('mongodb://localhost:27017/buzz-smile-saas');
    console.log('Connected to MongoDB');

    // Find or create a test user
    let user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Creating test user...');
      user = new User({
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
        credits: 1000
      });
      await user.save();
    }

    // Get existing video files
    const uploadsDir = path.join(__dirname, 'uploads/videos');
    const videoFiles = fs.readdirSync(uploadsDir).filter(file => 
      file.endsWith('.mp4') || file.endsWith('.mov')
    );

    console.log(`Found ${videoFiles.length} video files`);

    // Create database records for the first few video files
    const sampleFiles = videoFiles.slice(0, 3);
    
    for (let i = 0; i < sampleFiles.length; i++) {
      const filename = sampleFiles[i];
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      // Check if video record already exists
      const existingVideo = await Video.findOne({ filename });
      if (existingVideo) {
        console.log(`Video record already exists for ${filename}`);
        continue;
      }

      const video = new Video({
        title: `Sample Video ${i + 1}`,
        description: `This is a sample video for testing purposes`,
        filename: filename,
        originalName: filename,
        filePath: filePath,
        fileSize: stats.size,
        format: path.extname(filename).substring(1),
        status: 'ready',
        owner: user._id,
        duration: 30, // Default duration
        createdAt: stats.birthtime
      });

      await video.save();
      console.log(`Created video record for ${filename}`);
    }

    console.log('Sample videos created successfully');
    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating sample videos:', error);
    process.exit(1);
  }
}

createSampleVideos();