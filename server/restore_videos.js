const mongoose = require('mongoose');
require('dotenv').config();

async function restoreVideoOwnership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Video = require('./models/Video');
    const User = require('./models/User');
    
    // Find the original user
    const originalUser = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!originalUser) {
      console.log('Original user not found');
      process.exit(1);
    }
    
    console.log('Original user found:', originalUser.name, originalUser.email);
    
    // Update all videos to belong to the original user
    const result = await Video.updateMany({}, { owner: originalUser._id });
    console.log('Restored videos to original owner:', result.modifiedCount);
    
    // Verify the change
    const videoCount = await Video.countDocuments({ owner: originalUser._id });
    console.log('Videos now owned by', originalUser.email + ':', videoCount);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreVideoOwnership();