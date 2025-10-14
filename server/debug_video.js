const mongoose = require('mongoose');
const Video = require('./models/Video');
const User = require('./models/User');

async function debugVideo() {
  try {
    await mongoose.connect('mongodb://localhost:27017/buzz-smile-saas');
    console.log('Connected to MongoDB');

    const videoId = '68e7428eaeb3bdd96f980ed4';
    const userId = '68e581aa97ba6e6136a0552c';

    console.log(`\nLooking for video ID: ${videoId}`);
    console.log(`User ID: ${userId}`);

    // Check if video exists at all
    const video = await Video.findById(videoId);
    if (video) {
      console.log('\nVideo found in database:');
      console.log(`- ID: ${video._id}`);
      console.log(`- Title: ${video.title}`);
      console.log(`- Owner: ${video.owner}`);
      console.log(`- Owner matches user: ${video.owner.toString() === userId}`);
    } else {
      console.log('\nVideo NOT found in database');
    }

    // Check if video exists with the specific user
    const userVideo = await Video.findOne({ _id: videoId, owner: userId });
    if (userVideo) {
      console.log('\nVideo found for this user');
    } else {
      console.log('\nVideo NOT found for this user');
    }

    // List all videos for this user
    const userVideos = await Video.find({ owner: userId });
    console.log(`\nAll videos for user ${userId}:`);
    userVideos.forEach(v => {
      console.log(`- ID: ${v._id}, Title: ${v.title}, Owner: ${v.owner}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugVideo();
