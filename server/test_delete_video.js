const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

async function testDeleteVideo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    const Video = require('./models/Video');
    
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    // Get a video to test deletion
    const video = await Video.findOne({ owner: user._id });
    if (!video) {
      console.log('No videos found for user');
      process.exit(1);
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('=== DELETE TEST ===');
    console.log('Testing delete for video:', video._id);
    console.log('Video title:', video.title);
    console.log('Video file path:', video.filePath);
    console.log('');
    
    // Test the delete API
    try {
      const response = await axios.delete(`http://localhost:5000/api/videos/${video._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ DELETE SUCCESS');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
    } catch (error) {
      console.log('❌ DELETE FAILED');
      console.log('Error status:', error.response?.status);
      console.log('Error message:', error.response?.data?.message || error.message);
      console.log('Full error response:', error.response?.data);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Script error:', error);
    process.exit(1);
  }
}

testDeleteVideo();