const mongoose = require('mongoose');
const User = require('./models/User');

async function addSocialMediaToGodUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/saas-website');
    console.log('✅ Connected to MongoDB');

    // Find the GOD user
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('📋 Current user data:');
    console.log('Email:', user.email);
    console.log('Plan:', user.subscription.plan);
    console.log('Current social media:', user.socialMedia);

    // Add test social media URLs
    user.socialMedia = {
      instagram: 'https://instagram.com/buzzsmile',
      twitter: 'https://x.com/buzzsmile',
      youtube: 'https://youtube.com/@buzzsmile',
      tiktok: 'https://tiktok.com/@buzzsmile',
      facebook: 'https://facebook.com/buzzsmile'
    };

    await user.save();
    
    console.log('✅ Social media URLs added successfully!');
    console.log('📱 New social media data:', user.socialMedia);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

addSocialMediaToGodUser();