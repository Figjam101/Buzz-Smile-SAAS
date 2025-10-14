const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// MongoDB connection
const MONGODB_URI = 'mongodb://127.0.0.1:27017/fresh-video-saas';

async function testVideosAPI() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import models
    const User = require('./models/User');
    
    // Find the admin user
    const adminUser = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('👤 Admin user found:', {
      id: adminUser._id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role,
      plan: adminUser.plan
    });

    // Generate a JWT token for the admin user
    const token = jwt.sign(
      { 
        userId: adminUser._id,
        email: adminUser.email,
        role: adminUser.role 
      },
      'your_super_secret_jwt_key_change_in_production',
      { expiresIn: '24h' }
    );

    console.log('🔑 Generated JWT token for API test');

    // Test the /api/videos endpoint
    console.log('\n🔍 Testing /api/videos endpoint...');
    
    try {
      const response = await axios.get('http://localhost:5000/api/videos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ API Response Status:', response.status);
      console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
      
      if (response.data.videos) {
        console.log(`\n📹 Found ${response.data.videos.length} videos:`);
        response.data.videos.forEach((video, index) => {
          console.log(`  ${index + 1}. ${video.title || video.filename} (${video.status}) - Created: ${video.createdAt}`);
        });
      }
      
    } catch (apiError) {
      console.error('❌ API Error:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        message: apiError.message
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testVideosAPI();