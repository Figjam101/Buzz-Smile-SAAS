const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/buzz-smile-saas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const JWT_SECRET = process.env.JWT_SECRET;

async function simpleCacheTest() {
  try {
    console.log('=== SIMPLE CACHE TEST ===');
    
    // Create a test user with unique email
    const uniqueEmail = `cache-test-${Date.now()}@example.com`;
    const testUser = new User({
      email: uniqueEmail,
      password: 'password123',
      name: 'Cache Test User',
      role: 'user',
      isActive: true,
      subscription: {
        plan: 'free',
        videosProcessed: 0,
        monthlyLimit: 5
      },
      credits: {
        balance: 45,
        used: 0,
        lastReset: new Date()
      }
    });
    
    await testUser.save();
    console.log(`Created test user: ${testUser._id}`);
    
    // Create a test video
    const testVideo = new Video({
      filename: 'cache-test-video.mp4',
      title: 'Cache Test Video',
      originalName: 'cache-test-video.mp4',
      filePath: '/fake/path/cache-test-video.mp4',
      fileSize: 1000000,
      format: 'mp4',
      duration: 60,
      owner: testUser._id,
      status: 'ready'
    });
    
    await testVideo.save();
    console.log(`Created test video: ${testVideo._id}`);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: testUser._id.toString() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Generated JWT token');
    
    // Step 1: Get videos list (this should cache the result)
    console.log('\n--- Step 1: Getting videos list (caching) ---');
    const getResponse1 = await axios.get('http://localhost:5000/api/videos', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Found ${getResponse1.data.videos.length} videos in first request`);
    const videoExists = getResponse1.data.videos.find(v => v._id === testVideo._id.toString());
    console.log(`Test video exists in list: ${!!videoExists}`);
    
    // Step 2: Delete the video
    console.log('\n--- Step 2: Deleting video ---');
    try {
      const deleteResponse = await axios.delete(`http://localhost:5000/api/videos/${testVideo._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Delete response:', deleteResponse.data);
    } catch (deleteError) {
      console.log('Delete error:', deleteError.response?.data || deleteError.message);
    }
    
    // Step 3: Get videos list again (should not be cached, should reflect deletion)
    console.log('\n--- Step 3: Getting videos list after deletion ---');
    const getResponse2 = await axios.get('http://localhost:5000/api/videos', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Found ${getResponse2.data.videos.length} videos in second request`);
    const videoStillExists = getResponse2.data.videos.find(v => v._id === testVideo._id.toString());
    console.log(`Test video still exists in list: ${!!videoStillExists}`);
    
    // Step 4: Verify in database
    console.log('\n--- Step 4: Verifying in database ---');
    const videoInDb = await Video.findById(testVideo._id);
    console.log(`Video exists in database: ${!!videoInDb}`);
    
    // Results
    console.log('\n=== TEST RESULTS ===');
    console.log(`Cache invalidation working: ${!videoStillExists && !videoInDb ? 'YES' : 'NO'}`);
    
    if (videoStillExists) {
      console.log('❌ FAIL: Video still appears in cached list after deletion');
    } else {
      console.log('✅ PASS: Video no longer appears in list after deletion');
    }
    
    if (videoInDb) {
      console.log('❌ FAIL: Video still exists in database');
      // Clean up
      await Video.findByIdAndDelete(testVideo._id);
      console.log('Cleaned up test video from database');
    } else {
      console.log('✅ PASS: Video successfully deleted from database');
    }
    
    // Clean up test user
    await User.findByIdAndDelete(testUser._id);
    console.log('Cleaned up test user');
    
  } catch (error) {
    console.error('Test error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    mongoose.connection.close();
  }
}

simpleCacheTest();