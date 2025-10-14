const mongoose = require('mongoose');
const Video = require('./models/Video');

mongoose.connect('mongodb://localhost:27017/videosaas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  
  const videos = await Video.find({ owner: '68e1d9b7ac9f2ce657353d60' }).limit(3);
  console.log('Video objects structure:');
  videos.forEach((video, index) => {
    console.log(`Video ${index + 1}:`);
    console.log('- _id:', video._id);
    console.log('- filename:', video.filename);
    console.log('- duration:', video.duration);
    console.log('- metadata:', video.metadata);
    console.log('- fileSize:', video.fileSize);
    console.log('- All keys:', Object.keys(video.toObject()));
    console.log('---');
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});