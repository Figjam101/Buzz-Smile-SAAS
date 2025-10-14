const mongoose = require('mongoose');
const Video = require('./models/Video');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/buzz-smile-saas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestVideos() {
  try {
    // Use the existing user ID from the database
    const correctUserId = '68e1d9b7ac9f2ce657353d60';
    
    const testVideos = [
      {
        title: 'Test Video with Duration 1',
        description: 'Test video for duration display testing',
        filename: 'test-video-1.mp4',
        originalName: 'test-video-1.mp4',
        filePath: '/uploads/videos/test-video-1.mp4',
        format: 'mp4',
        fileSize: 1024000,
        duration: 45, // 45 seconds
        status: 'ready',
        owner: new mongoose.Types.ObjectId(correctUserId),
        isPublic: false,
        thumbnailPath: null,
        editingPreferences: {
          editingStyle: 'professional',
          targetAudience: 'business',
          duration: 'short'
        }
      },
      {
        title: 'Test Video with Duration 2',
        description: 'Another test video for duration display testing',
        filename: 'test-video-2.mp4',
        originalName: 'test-video-2.mp4',
        filePath: '/uploads/videos/test-video-2.mp4',
        format: 'mp4',
        fileSize: 2048000,
        duration: 120, // 2 minutes
        status: 'ready',
        owner: new mongoose.Types.ObjectId(correctUserId),
        isPublic: false,
        thumbnailPath: null,
        editingPreferences: {
          editingStyle: 'casual',
          targetAudience: 'general',
          duration: 'medium'
        }
      },
      {
        title: 'Test Video with Duration 3',
        description: 'Third test video for duration display testing',
        filename: 'test-video-3.mp4',
        originalName: 'test-video-3.mp4',
        filePath: '/uploads/videos/test-video-3.mp4',
        format: 'mp4',
        fileSize: 3072000,
        duration: 180, // 3 minutes
        status: 'ready',
        owner: new mongoose.Types.ObjectId(correctUserId),
        isPublic: false,
        thumbnailPath: null,
        editingPreferences: {
          editingStyle: 'creative',
          targetAudience: 'social',
          duration: 'long'
        }
      }
    ];

    console.log('Creating test videos with correct user ownership...');
    console.log('User ID:', correctUserId);
    
    const createdVideos = await Video.insertMany(testVideos);
    
    console.log(`Successfully created ${createdVideos.length} test videos:`);
    createdVideos.forEach(video => {
      console.log(`- ${video.title}: ${video.duration} seconds (ID: ${video._id})`);
    });
    
  } catch (error) {
    console.error('Error creating test videos:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestVideos();