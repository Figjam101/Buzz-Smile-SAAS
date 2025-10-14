const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function createTestToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    
    // Find or create a test user
    let user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      user = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        credits: 100
      });
      await user.save();
    }
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('Test token:', token);
    console.log('User ID:', user._id);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestToken();