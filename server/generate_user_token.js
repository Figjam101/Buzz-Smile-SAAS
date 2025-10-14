const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

async function generateUserToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('./models/User');
    
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    console.log('=== USER TOKEN FOR BROWSER ===');
    console.log('User:', user.name, '(' + user.email + ')');
    console.log('User ID:', user._id);
    console.log('Token:', token);
    console.log('');
    console.log('Copy this token and paste it in browser console:');
    console.log('localStorage.setItem("token", "' + token + '")');
    console.log('Then refresh the page.');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateUserToken();