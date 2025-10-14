const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/buzz-smile-saas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkUserIds() {
  try {
    // Check videos and their owners
    const Video = require('./models/Video');
    const videos = await Video.find({}).select('title owner').limit(3);
    
    console.log('=== Videos and their owners ===');
    videos.forEach(video => {
      console.log(`Video: ${video.title}`);
      console.log(`Owner ID: ${video.owner}`);
      console.log(`Owner ID type: ${typeof video.owner}`);
      console.log(`Owner ID toString: ${video.owner.toString()}`);
      console.log('---');
    });
    
    // Check users
    const User = require('./models/User');
    const users = await User.find({}).select('_id name email').limit(3);
    
    console.log('=== Users ===');
    users.forEach(user => {
      console.log(`User: ${user.name} (${user.email})`);
      console.log(`User ID: ${user._id}`);
      console.log(`User ID type: ${typeof user._id}`);
      console.log(`User ID toString: ${user._id.toString()}`);
      console.log('---');
    });
    
    // Decode the token to see what user ID it contains
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGRiNjg1Y2JmNmI0MTc1NGQ3NzUzZjgiLCJpYXQiOjE3NTk4MjAzNTgsImV4cCI6MTc2MDQyNTE1OH0.H9GU-F29BTgpNdAte_jjbxwfz8TeiFvaFxRJyY3wMdw';
    const decoded = jwt.decode(token);
    
    console.log('=== Token Info ===');
    console.log('Token userId:', decoded.userId);
    console.log('Token userId type:', typeof decoded.userId);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUserIds();
