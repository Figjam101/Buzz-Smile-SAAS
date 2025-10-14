const mongoose = require('mongoose');
const thumbnailService = require('./services/thumbnailService');
require('dotenv').config();

async function fixExistingVideoDurations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Video = require('./models/Video');
    
    console.log('🔍 Finding videos with missing or zero duration...');
    
    // Find videos with duration 0 or missing duration
    const videosNeedingDuration = await Video.find({
      $or: [
        { duration: 0 },
        { duration: { $exists: false } }
      ]
    }).select('_id title filename filePath duration fileSize');
    
    console.log(`Found ${videosNeedingDuration.length} videos needing duration update`);
    
    if (videosNeedingDuration.length === 0) {
      console.log('✅ All videos already have duration set');
      process.exit(0);
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const video of videosNeedingDuration) {
      try {
        console.log(`\n📹 Processing: ${video.title}`);
        console.log(`   File: ${video.filename}`);
        console.log(`   Path: ${video.filePath}`);
        
        // Check if file exists
        const fs = require('fs');
        if (!fs.existsSync(video.filePath)) {
          console.log(`   ❌ File not found: ${video.filePath}`);
          errorCount++;
          continue;
        }
        
        // Extract duration using ThumbnailService
        const duration = await thumbnailService.getVideoDuration(video.filePath);
        
        // Update video with duration
        await Video.findByIdAndUpdate(video._id, { duration: duration });
        
        console.log(`   ✅ Duration updated: ${duration} seconds`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Error processing ${video.title}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Successfully updated: ${successCount} videos`);
    console.log(`❌ Failed to update: ${errorCount} videos`);
    console.log(`📊 Total processed: ${videosNeedingDuration.length} videos`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixExistingVideoDurations();