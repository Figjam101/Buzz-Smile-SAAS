const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');
require('dotenv').config();

async function checkRecentVideos() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/buzzsmile');
        console.log('Connected to MongoDB');

        // Find the admin user
        const adminUser = await User.findOne({ email: 'npkalyx@gmail.com' });
        console.log('Admin user:', {
            name: adminUser?.name,
            email: adminUser?.email,
            role: adminUser?.role,
            plan: adminUser?.plan,
            id: adminUser?._id
        });

        // Get all videos sorted by creation date (newest first)
        const allVideos = await Video.find({})
            .sort({ createdAt: -1 })
            .populate('owner', 'name email')
            .limit(10);

        console.log(`\nFound ${allVideos.length} videos in database:`);
        allVideos.forEach((video, index) => {
            console.log(`${index + 1}. "${video.title}" by ${video.owner?.name || 'Unknown'} (${video.owner?.email || 'No email'})`);
            console.log(`   - ID: ${video._id}`);
            console.log(`   - Owner ID: ${video.owner?._id}`);
            console.log(`   - Created: ${video.createdAt}`);
            console.log(`   - Status: ${video.status}`);
            console.log(`   - File Path: ${video.filePath}`);
            console.log(`   - Thumbnail: ${video.thumbnailPath || 'None'}`);
            console.log('');
        });

        // Check videos specifically for the admin user
        const adminVideos = await Video.find({ owner: adminUser._id })
            .sort({ createdAt: -1 });

        console.log(`\nVideos for admin user (${adminUser.email}):`);
        if (adminVideos.length === 0) {
            console.log('No videos found for admin user');
        } else {
            adminVideos.forEach((video, index) => {
                console.log(`${index + 1}. "${video.title}"`);
                console.log(`   - Created: ${video.createdAt}`);
                console.log(`   - Status: ${video.status}`);
                console.log('');
            });
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkRecentVideos();