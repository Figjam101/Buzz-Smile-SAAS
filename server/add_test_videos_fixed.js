const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');

async function addTestVideos() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');
    
    // Find Jack Ryan user
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email} (${user._id})`);
    
    // Create test videos that match the console log titles
    const testVideos = [
      {
        title: 'kjknkj',
        filename: 'kjknkj.mp4',
        originalName: 'kjknkj.mp4',
        filePath: '/uploads/kjknkj.mp4',
        owner: user._id,
        status: 'ready',
        fileSize: 1024000,
        duration: 30,
        format: 'mp4',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'ljdsc',
        filename: 'ljdsc.mp4',
        originalName: 'ljdsc.mp4',
        filePath: '/uploads/ljdsc.mp4',
        owner: user._id,
        status: 'ready',
        fileSize: 2048000,
        duration: 45,
        format: 'mp4',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'test123',
        filename: 'test123.mp4',
        originalName: 'test123.mp4',
        filePath: '/uploads/test123.mp4',
        owner: user._id,
        status: 'ready',
        fileSize: 1536000,
        duration: 60,
        format: 'mp4',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'jdekjdekdje',
        filename: 'jdekjdekdje.mp4',
        originalName: 'jdekjdekdje.mp4',
        filePath: '/uploads/jdekjdekdje.mp4',
        owner: user._id,
        status: 'ready',
        fileSize: 3072000,
        duration: 90,
        format: 'mp4',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Testing - Edited for a test',
        filename: 'testing-edited.mp4',
        originalName: 'testing-edited.mp4',
        filePath: '/uploads/testing-edited.mp4',
        owner: user._id,
        status: 'ready',
        fileSize: 4096000,
        duration: 120,
        format: 'mp4',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert test videos
    console.log('📹 Adding test videos...');
    const insertedVideos = await Video.insertMany(testVideos);
    
    console.log(`✅ Added ${insertedVideos.length} test videos:`);
    insertedVideos.forEach(video => {
      console.log(`  - ${video.title} (${video._id})`);
    });
    
    console.log('\n✅ Test videos added successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addTestVideos();
