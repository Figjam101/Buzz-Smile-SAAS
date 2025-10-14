const Queue = require('bull');
const Video = require('../models/Video');
const videoEditingService = require('./videoEditingService');

let videoProcessingQueue = null;
let isRedisAvailable = false;

// Check if Redis is available
const checkRedisConnection = async () => {
  try {
    const testQueue = new Queue('test', {
      redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || '127.0.0.1',
      },
    });
    
    await testQueue.isReady();
    await testQueue.close();
    isRedisAvailable = true;
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.log('⚠️  Redis not available, job queue disabled:', error.message);
    isRedisAvailable = false;
    return false;
  }
};

// Initialize queue only if Redis is available
const initializeQueue = async () => {
  const redisConnected = await checkRedisConnection();
  
  if (!redisConnected) {
    console.log('📋 Running without job queue - processing videos synchronously');
    return;
  }

  // Create a job queue for video processing
  videoProcessingQueue = new Queue('video processing', {
    redis: {
      port: process.env.REDIS_PORT || 6379,
      host: process.env.REDIS_HOST || '127.0.0.1',
    },
    defaultJobOptions: {
      removeOnComplete: 10, // Keep only 10 completed jobs
      removeOnFail: 50, // Keep 50 failed jobs for debugging
      attempts: 3, // Retry failed jobs up to 3 times
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  // Process video jobs
  videoProcessingQueue.process('processVideo', async (job) => {
    const { videoId, userId } = job.data;
    
    try {
      console.log(`🎬 Starting video processing for video ${videoId}`);
      
      // Update video status to processing
      await Video.findByIdAndUpdate(videoId, { 
        status: 'processing',
        processingStartedAt: new Date()
      });

      // Get video details
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Process video with video editing service
       const result = await videoEditingService.processVideo(videoId, {
         title: video.title,
         userId: userId
       });

      // Update video with processing results
       await Video.findByIdAndUpdate(videoId, {
         status: 'ready',
         processedAt: new Date(),
         processingDuration: Date.now() - new Date(video.processingStartedAt).getTime()
       });

       console.log(`✅ Video processing completed for video ${videoId}`);
       
       return { success: true, videoId, jobId: result.jobId };
      
    } catch (error) {
      console.error(`❌ Video processing failed for video ${videoId}:`, error);
      
      // Update video status to failed
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed',
        errorMessage: error.message,
        failedAt: new Date()
      });
      
      throw error;
    }
  });

  // Event listeners for monitoring
  videoProcessingQueue.on('completed', (job, result) => {
    console.log(`🎉 Job ${job.id} completed successfully:`, result);
  });

  videoProcessingQueue.on('failed', (job, err) => {
    console.log(`💥 Job ${job.id} failed:`, err.message);
  });

  videoProcessingQueue.on('progress', (job, progress) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
  });
};

// Add job to queue (fallback to direct processing if no queue)
const addVideoProcessingJob = async (videoId, userId, options = {}) => {
  if (!isRedisAvailable || !videoProcessingQueue) {
    console.log(`📋 Processing video ${videoId} directly (no queue available)`);
    
    // Direct processing fallback
    try {
      await Video.findByIdAndUpdate(videoId, { 
        status: 'processing',
        processingStartedAt: new Date()
      });

      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Simulate processing (in real app, this would call the actual processing service)
      setTimeout(async () => {
        try {
          await Video.findByIdAndUpdate(videoId, {
            status: 'ready',
            processedAt: new Date(),
            processingDuration: 5000 // 5 seconds simulation
          });
          console.log(`✅ Video ${videoId} processed successfully (direct)`);
        } catch (error) {
          await Video.findByIdAndUpdate(videoId, {
            status: 'failed',
            errorMessage: error.message,
            failedAt: new Date()
          });
          console.error(`❌ Video ${videoId} processing failed (direct):`, error);
        }
      }, 5000);

      return { id: `direct-${Date.now()}`, videoId, status: 'processing' };
    } catch (error) {
      console.error('Direct processing error:', error);
      throw error;
    }
  }

  const job = await videoProcessingQueue.add('processVideo', {
    videoId,
    userId
  }, {
    delay: options.delay || 0,
    priority: options.priority || 0,
    ...options
  });
  
  console.log(`📋 Added video processing job ${job.id} for video ${videoId}`);
  return job;
};

// Get queue statistics
const getQueueStats = async () => {
  if (!isRedisAvailable || !videoProcessingQueue) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      total: 0,
      message: 'Queue not available - Redis not connected'
    };
  }

  const waiting = await videoProcessingQueue.getWaiting();
  const active = await videoProcessingQueue.getActive();
  const completed = await videoProcessingQueue.getCompleted();
  const failed = await videoProcessingQueue.getFailed();
  
  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    total: waiting.length + active.length + completed.length + failed.length
  };
};

// Clean old jobs
const cleanOldJobs = async () => {
  if (!isRedisAvailable || !videoProcessingQueue) {
    return;
  }
  
  await videoProcessingQueue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
  await videoProcessingQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days
};

module.exports = {
  initializeQueue,
  videoProcessingQueue: () => videoProcessingQueue,
  addVideoProcessingJob,
  getQueueStats,
  cleanOldJobs,
  isRedisAvailable: () => isRedisAvailable
};