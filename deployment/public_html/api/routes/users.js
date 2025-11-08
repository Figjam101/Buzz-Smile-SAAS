const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Update user profile (protected)
router.put('/profile', auth, [
  body('businessName').optional().trim().isLength({ max: 100 }),
  body('businessDescription').optional().trim().isLength({ max: 500 }),
  body('socialMedia.instagram').optional().trim(),
  body('socialMedia.tiktok').optional().trim(),
  body('socialMedia.youtube').optional().trim(),
  body('socialMedia.twitter').optional().trim(),
  body('socialMedia.facebook').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const {
      businessName,
      businessDescription,
      socialMedia
    } = req.body;

    // Find and update user
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (businessName !== undefined) user.businessName = businessName;
    if (businessDescription !== undefined) user.businessDescription = businessDescription;
    
    if (socialMedia) {
      if (socialMedia.instagram !== undefined) user.socialMedia.instagram = socialMedia.instagram;
      if (socialMedia.tiktok !== undefined) user.socialMedia.tiktok = socialMedia.tiktok;
      if (socialMedia.youtube !== undefined) user.socialMedia.youtube = socialMedia.youtube;
      if (socialMedia.twitter !== undefined) user.socialMedia.twitter = socialMedia.twitter;
      if (socialMedia.facebook !== undefined) user.socialMedia.facebook = socialMedia.facebook;
    }

    await user.save();

    // Return updated user data (without password)
    const userData = {
      id: user._id,
      email: user.email,
      businessName: user.businessName,
      businessDescription: user.businessDescription,
      socialMedia: user.socialMedia,
      preferences: user.preferences,
      subscription: user.subscription
    };

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      message: 'Server error during profile update'
    });
  }
});

// Update user preferences (protected)
router.put('/preferences', auth, [
  body('videoQuality').optional().isIn(['720p', '1080p', '4K']),
  body('defaultFormat').optional().isIn(['mp4', 'mov', 'avi'])
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { videoQuality, defaultFormat } = req.body;

    // Find and update user
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update preferences if provided
    if (videoQuality !== undefined) user.preferences.videoQuality = videoQuality;
    if (defaultFormat !== undefined) user.preferences.defaultFormat = defaultFormat;

    await user.save();

    // Return updated user data (without password)
    const userData = {
      id: user._id,
      email: user.email,
      businessName: user.businessName,
      businessDescription: user.businessDescription,
      socialMedia: user.socialMedia,
      preferences: user.preferences,
      subscription: user.subscription
    };

    res.json({
      message: 'Preferences updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({
      message: 'Server error during preferences update'
    });
  }
});

// Get user statistics (protected)
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Calculate remaining videos for the month
    const remainingVideos = user.subscription.monthlyLimit - user.subscription.videosProcessed;

    const stats = {
      subscription: {
        plan: user.subscription.plan,
        videosProcessed: user.subscription.videosProcessed,
        monthlyLimit: user.subscription.monthlyLimit,
        remainingVideos: Math.max(0, remainingVideos)
      },
      accountCreated: user.createdAt
    };

    res.json({
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

module.exports = router;