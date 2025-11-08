const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  businessName: {
    type: String,
    trim: true
  },
  businessDescription: {
    type: String,
    trim: true
  },
  socialMedia: {
    instagram: {
      type: String,
      trim: true
    },
    facebook: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    tiktok: {
      type: String,
      trim: true
    },
    youtube: {
      type: String,
      trim: true
    }
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String,
    trim: true
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  googleDriveFolders: {
    userFolderId: String,
    rawFolderId: String,
    processedFolderId: String
  },
  preferences: {
    videoQuality: {
      type: String,
      enum: ['720p', '1080p', '4K'],
      default: '1080p'
    },
    defaultFormat: {
      type: String,
      enum: ['mp4', 'mov', 'avi'],
      default: 'mp4'
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'god'],
      default: 'free'
    },
    videosProcessed: {
      type: Number,
      default: 0
    },
    monthlyLimit: {
      type: Number,
      default: 5
    }
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);