const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');
    console.log('Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Test user already exists!');
      console.log('Email: test@example.com');
      console.log('Password: testpassword123');
      console.log('User ID:', existingUser._id);
      return;
    }

    // Create test user
    const testUser = new User({
      email: 'test@example.com',
      password: 'testpassword123',
      name: 'Test User',
      businessName: 'Test Business',
      businessDescription: 'A test business for development',
      onboardingCompleted: true
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: testpassword123');
    console.log('🆔 User ID:', testUser._id);
    console.log('');
    console.log('You can now use these credentials to log in to your application.');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    if (error.code === 11000) {
      console.log('User with this email already exists.');
    } else if (error.name === 'ValidationError') {
      console.log('Validation error:', error.message);
    } else {
      console.log('Full error:', error);
    }
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

createTestUser();