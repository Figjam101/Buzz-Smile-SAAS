const { videoProcessingQueue, cleanOldJobs } = require('./jobQueue');

class QueueMonitor {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  // Start monitoring the queue
  start() {
    if (this.isRunning) {
      console.log('Queue monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log('🔍 Starting queue monitor...');

    // Set up event listeners
    this.setupEventListeners();

    // Start cleanup job (runs every hour)
    this.cleanupInterval = setInterval(async () => {
      try {
        await cleanOldJobs();
        console.log('🧹 Cleaned up old jobs');
      } catch (error) {
        console.error('Error cleaning up jobs:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    console.log('✅ Queue monitor started successfully');
  }

  // Stop monitoring
  stop() {
    if (!this.isRunning) {
      console.log('Queue monitor is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    console.log('🛑 Queue monitor stopped');
  }

  // Set up event listeners for queue monitoring
  setupEventListeners() {
    videoProcessingQueue.on('waiting', (jobId) => {
      console.log(`⏳ Job ${jobId} is waiting in queue`);
    });

    videoProcessingQueue.on('active', (job, jobPromise) => {
      console.log(`🚀 Job ${job.id} started processing video ${job.data.videoId}`);
    });

    videoProcessingQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed successfully for video ${job.data.videoId}`);
      console.log(`   Processing time: ${job.finishedOn - job.processedOn}ms`);
    });

    videoProcessingQueue.on('failed', (job, err) => {
      console.log(`❌ Job ${job.id} failed for video ${job.data.videoId}`);
      console.log(`   Error: ${err.message}`);
      console.log(`   Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
    });

    videoProcessingQueue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}% (video ${job.data.videoId})`);
    });

    videoProcessingQueue.on('stalled', (job) => {
      console.log(`⚠️  Job ${job.id} stalled (video ${job.data.videoId})`);
    });

    videoProcessingQueue.on('removed', (job) => {
      console.log(`🗑️  Job ${job.id} removed from queue`);
    });
  }

  // Get detailed queue information
  async getDetailedStats() {
    try {
      const waiting = await videoProcessingQueue.getWaiting();
      const active = await videoProcessingQueue.getActive();
      const completed = await videoProcessingQueue.getCompleted();
      const failed = await videoProcessingQueue.getFailed();
      const delayed = await videoProcessingQueue.getDelayed();

      return {
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          total: waiting.length + active.length + completed.length + failed.length + delayed.length
        },
        jobs: {
          waiting: waiting.slice(0, 10).map(job => ({
            id: job.id,
            videoId: job.data.videoId,
            userId: job.data.userId,
            createdAt: new Date(job.timestamp),
            priority: job.opts.priority
          })),
          active: active.slice(0, 10).map(job => ({
            id: job.id,
            videoId: job.data.videoId,
            userId: job.data.userId,
            startedAt: new Date(job.processedOn),
            progress: job.progress || 0
          })),
          failed: failed.slice(0, 10).map(job => ({
            id: job.id,
            videoId: job.data.videoId,
            userId: job.data.userId,
            failedAt: new Date(job.failedOn),
            error: job.failedReason,
            attempts: job.attemptsMade
          }))
        },
        performance: {
          avgProcessingTime: this.calculateAverageProcessingTime(completed),
          successRate: this.calculateSuccessRate(completed, failed),
          throughput: this.calculateThroughput(completed)
        }
      };
    } catch (error) {
      console.error('Error getting detailed stats:', error);
      throw error;
    }
  }

  // Calculate average processing time
  calculateAverageProcessingTime(completedJobs) {
    if (completedJobs.length === 0) return 0;
    
    const totalTime = completedJobs.reduce((sum, job) => {
      return sum + (job.finishedOn - job.processedOn);
    }, 0);
    
    return Math.round(totalTime / completedJobs.length);
  }

  // Calculate success rate
  calculateSuccessRate(completedJobs, failedJobs) {
    const total = completedJobs.length + failedJobs.length;
    if (total === 0) return 100;
    
    return Math.round((completedJobs.length / total) * 100);
  }

  // Calculate throughput (jobs per hour)
  calculateThroughput(completedJobs) {
    if (completedJobs.length === 0) return 0;
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentJobs = completedJobs.filter(job => job.finishedOn > oneHourAgo);
    return recentJobs.length;
  }
}

module.exports = new QueueMonitor();