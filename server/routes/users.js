const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with user ID and timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Get user stats
router.get('/stats', auth, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      stats: {
        videoCount: user.videoCount,
        maxVideos: user.maxVideos,
        remainingVideos: Math.max(0, user.maxVideos - user.videoCount),
        plan: user.plan,
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        // New credit system fields
        credits: user.credits || { balance: 0, used: 0 },
        subscription: user.subscription || { plan: user.plan, videosProcessed: user.videoCount, monthlyLimit: user.maxVideos },
        role: user.role || 'user',
        isPreLaunch: user.isPreLaunch || false
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats' });
  }
});

// Upgrade plan (placeholder for future implementation)
router.post('/upgrade', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    // This would integrate with payment processing
    // For now, just update the plan
    const user = req.user;
    user.plan = plan;
    
    // Update limits based on plan
    switch (plan) {
      case 'pro':
        user.maxVideos = 50;
        break;
      case 'enterprise':
        user.maxVideos = 500;
        break;
    }
    
    await user.save();

    res.json({
      message: `Successfully upgraded to ${plan} plan`,
      user: {
        id: user._id,
        plan: user.plan,
        maxVideos: user.maxVideos,
        videoCount: user.videoCount
      }
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({ message: 'Server error during plan upgrade' });
  }
});

// Update user profile (profile picture and social media)
router.put('/profile', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = req.user;
    const { socialMedia } = req.body;
    
    // Handle profile picture upload
    if (req.file) {
      // Delete old profile picture if it exists
      if (user.profilePicture) {
        const oldImagePath = path.join(__dirname, '../uploads/profiles', path.basename(user.profilePicture));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      
      // Set new profile picture URL (absolute for production compatibility)
      const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
      user.profilePicture = `${baseUrl}/uploads/profiles/${req.file.filename}`;
    }
    
    // Handle social media data
    if (socialMedia) {
      const parsedSocialMedia = typeof socialMedia === 'string' ? JSON.parse(socialMedia) : socialMedia;
      
      // Update social media fields
      user.socialMedia = {
        facebook: parsedSocialMedia.facebook || '',
        twitter: parsedSocialMedia.twitter || '',
        instagram: parsedSocialMedia.instagram || '',
        youtube: parsedSocialMedia.youtube || '',
        linkedin: parsedSocialMedia.linkedin || '',
        tiktok: parsedSocialMedia.tiktok || ''
      };
    }
    
    await user.save();
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        socialMedia: user.socialMedia
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

module.exports = router;