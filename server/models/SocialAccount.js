const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['instagram', 'facebook', 'twitter', 'youtube', 'tiktok']
  },
  username: {
    type: String,
    required: true
  },
  displayName: {
    type: String
  },
  profilePicture: {
    type: String
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  expiresAt: {
    type: Date
  },
  platformUserId: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one account per platform per user
socialAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('SocialAccount', socialAccountSchema);