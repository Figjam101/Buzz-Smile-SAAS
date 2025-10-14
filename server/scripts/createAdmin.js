const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      email: 'admin@buzzsmile.com',
      password: 'admin123456', // Change this to a secure password
      name: 'Admin User',
      businessName: 'Buzz Smile Admin',
      role: 'admin',
      plan: 'enterprise',
      maxVideos: 999999
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@buzzsmile.com');
    console.log('Password: admin123456');
    console.log('Please change the password after first login!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdminUser();