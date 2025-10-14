const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './.env' });

async function createTestVideo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');
    console.log('Connected to MongoDB');

    // Find the test user
    const testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      console.error('Test user not found! Please run create_test_user.js first');
      process.exit(1);
    }

    console.log('Found test user:', testUser.email);

    // Create a simple test video file
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const testVideoPath = path.join(uploadsDir, 'test-video.mp4');
    
    // Create a dummy video file (just for testing - in production this would be a real video)
    if (!fs.existsSync(testVideoPath)) {
      fs.writeFileSync(testVideoPath, 'dummy video content for testing');
      console.log('Created dummy test video file');
    }

    // Create test video record
    const testVideo = new Video({
      title: 'Test Video',
      description: 'A test video for development',
      filename: 'test-video.mp4',
      originalName: 'test-video.mp4',
      filePath: testVideoPath,
      fileSize: 1024000,
      duration: 30,
      format: 'mp4',
      status: 'ready',
      owner: testUser._id,
      thumbnailPath: null,
      downloadUrl: '/uploads/test-video.mp4'
    });

    await testVideo.save();
    console.log('Test video created successfully!');
    console.log('Video ID:', testVideo._id);
    console.log('User ID:', testUser._id);

    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating test video:', error);
    process.exit(1);
  }
}

createTestVideo();