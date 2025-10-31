const mongoose = require('mongoose');

const scheduledPostSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  platforms: [{
    type: String,
    enum: ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok'],
    required: true
  }],
  scheduledAt: {
    type: Date,
    required: true
  },
  caption: {
    type: String,
    required: true
  },
  video: {
    title: String,
    url: String,
    thumbnail: String,
    duration: Number
  },
  status: {
    type: String,
    enum: ['scheduled', 'posting', 'posted', 'failed'],
    default: 'scheduled'
  },
  postResults: [{
    platform: String,
    success: Boolean,
    postId: String,
    postUrl: String,
    error: String,
    postedAt: Date
  }],
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: {
    type: Date
  },
  nextRetry: {
    type: Date
  },
  tags: [String],
  location: {
    name: String,
    latitude: Number,
    longitude: Number
  },
  mediaFiles: [{
    type: String, // URLs to media files
    platform: String // Platform-specific media
  }]
}, {
  timestamps: true
});

// Index for efficient querying
scheduledPostSchema.index({ userId: 1, scheduledAt: 1 });
scheduledPostSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('ScheduledPost', scheduledPostSchema);