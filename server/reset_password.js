const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to:', mongoose.connection.db.databaseName);
    
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    // Set a known password (let the pre-save hook handle hashing)
    const newPassword = 'temppass123';
    user.password = newPassword;
    await user.save();
    
    console.log('Password reset for npkalyx@gmail.com');
    console.log('New password: temppass123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();