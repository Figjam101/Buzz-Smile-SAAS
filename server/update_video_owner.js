const mongoose = require('mongoose');
require('dotenv').config();

async function updateVideoOwner() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Video = require('./models/Video');
    const User = require('./models/User');
    
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found');
      process.exit(1);
    }
    
    const result = await Video.updateMany({}, { owner: user._id });
    console.log('Updated videos:', result.modifiedCount);
    
    const videos = await Video.find().select('_id title owner');
    console.log('Videos with owner:');
    videos.forEach(v => console.log('ID:', v._id, 'Title:', v.title, 'Owner:', v.owner));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateVideoOwner();