const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateUserRole = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find and update the user
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('Current user role:', user.role);
    
    // Update role to admin
    user.role = 'admin';
    await user.save();

    console.log('User role updated to admin successfully!');
    console.log('Email:', user.email);
    console.log('New role:', user.role);

  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

updateUserRole();