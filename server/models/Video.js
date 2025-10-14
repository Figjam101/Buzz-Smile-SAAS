const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  format: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['uploading', 'queued', 'processing', 'editing', 'ready', 'failed', 'error'],
    default: 'uploading'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  thumbnailPath: {
    type: String
  },
  processedVersions: [{
    quality: String, // '720p', '1080p', etc.
    filePath: String,
    fileSize: Number
  }],
  editingJob: {
    jobId: String,
    startedAt: Date,
    completedAt: Date,
    errorMessage: String,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // Job queue related fields
  queuedAt: Date,
  processingStartedAt: Date,
  processedAt: Date,
  failedAt: Date,
  processingDuration: Number, // in milliseconds
  processedUrl: String, // URL to download processed video
  processedFilePath: {
    type: String // Path to the edited/processed video
  },
  metadata: {
    width: Number,
    height: Number,
    bitrate: Number,
    fps: Number
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  // Editing preferences from wizard
  editingPreferences: {
    videoName: String,
    videoDescription: String,
    videoType: String,
    targetAudience: String,
    editingStyle: String,
    duration: String,
    specialRequests: String
  },
  // OpenCut processing fields
  opencutProcessing: {
    enabled: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['not_started', 'processing', 'completed', 'failed'],
      default: 'not_started'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    processingId: String,
    startedAt: Date,
    completedAt: Date,
    outputPath: String,
    error: String,
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  // Multiple file support
  isMultipleFiles: {
    type: Boolean,
    default: false
  },
  sourceFiles: [{
    filename: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    format: String
  }],
  sourceFileCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Add comprehensive indexes for better query performance
videoSchema.index({ owner: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ owner: 1, status: 1 });
videoSchema.index({ owner: 1, isPublic: 1 });
videoSchema.index({ 'editingJob.jobId': 1 }, { sparse: true });
videoSchema.index({ queuedAt: -1 }, { sparse: true });
videoSchema.index({ processedAt: -1 }, { sparse: true });
videoSchema.index({ 'opencutProcessing.processingId': 1 }, { sparse: true });

module.exports = mongoose.model('Video', videoSchema);