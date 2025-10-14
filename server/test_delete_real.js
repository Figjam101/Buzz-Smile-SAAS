const axios = require('axios');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

async function testDeleteWithRealUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    const Video = require('./models/Video');
    
    // Find the real user
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    // Find a video to delete
    const video = await Video.findOne({ owner: user._id });
    if (!video) {
      console.log('No videos found for user');
      process.exit(1);
    }
    
    // Generate proper token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('=== DELETE TEST ===');
    console.log('Attempting to delete video:', video._id);
    console.log('Video title:', video.title);
    console.log('Video file path:', video.filePath);
    console.log('');
    
    // Try to delete the video
    const response = await axios.delete(`http://localhost:5000/api/videos/${video._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ DELETE SUCCESS');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ DELETE FAILED');
    console.log('Error Status:', error.response?.status);
    console.log('Error Message:', error.response?.data?.message);
    console.log('Full Error Response:', error.response?.data);
    console.log('Network Error:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('Server is not running on port 5000');
    }
  } finally {
    process.exit(0);
  }
}

testDeleteWithRealUser();