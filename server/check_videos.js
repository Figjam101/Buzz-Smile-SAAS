const mongoose = require('mongoose');
const Video = require('./models/Video');

mongoose.connect('mongodb://localhost:27017/fresh-video-saas')
  .then(async () => {
    console.log('Connected to MongoDB');
    const videos = await Video.find({}).select('title filename duration isMultipleFiles editingPreferences createdAt');
    console.log('Videos in database:');
    videos.forEach(video => {
      console.log({
        id: video._id,
        title: video.title,
        filename: video.filename,
        duration: video.duration,
        isMultipleFiles: video.isMultipleFiles,
        hasEditingPreferences: !!video.editingPreferences,
        createdAt: video.createdAt
      });
    });
    process.exit(0);
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });