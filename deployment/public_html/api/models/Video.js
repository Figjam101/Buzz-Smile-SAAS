const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  originalFilePath: {
    type: String,
    required: true
  },
  processedFilePath: {
    type: String
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'completed', 'failed'],
    default: 'uploaded'
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  editingOptions: {
    trim: {
      startTime: Number,
      endTime: Number
    },
    filters: [{
      type: String,
      intensity: Number
    }],
    transitions: [{
      type: String,
      duration: Number
    }],
    music: {
      track: String,
      volume: Number
    }
  },
  metadata: {
    duration: Number,
    resolution: String,
    fileSize: Number,
    format: String
  },
  capCutJobId: {
    type: String
  },
  downloadUrl: {
    type: String
  },
  googleDriveRawFileId: {
    type: String
  },
  googleDriveProcessedFileId: {
    type: String
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, {
  timestamps: true
});

// Index for efficient queries
videoSchema.index({ userId: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Video', videoSchema);