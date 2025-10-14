const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

async function generateAdminToken() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/buzzsmile');
        console.log('Connected to MongoDB');

        // Find the admin user
        const adminUser = await User.findOne({ email: 'npkalyx@gmail.com' });
        
        if (!adminUser) {
            console.log('Admin user not found!');
            return;
        }

        console.log('Found admin user:', {
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
            plan: adminUser.plan,
            id: adminUser._id
        });

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: adminUser._id,
                email: adminUser.email,
                role: adminUser.role,
                plan: adminUser.plan
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        console.log('\n=== LOGIN INSTRUCTIONS ===');
        console.log('1. Open browser developer tools (F12)');
        console.log('2. Go to Application/Storage tab');
        console.log('3. Find "Local Storage" for localhost:3000');
        console.log('4. Set the following key-value pair:');
        console.log('   Key: token');
        console.log('   Value:', token);
        console.log('5. Refresh the page');
        console.log('\nOR use these login credentials:');
        console.log('Email: npkalyx@gmail.com');
        console.log('Password: (you may need to reset this)');
        
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

generateAdminToken();