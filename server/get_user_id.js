const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/fresh-video-saas')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('User ID:', user._id.toString());
    console.log('User email:', user.email);
    console.log('User video count:', user.videoCount);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });