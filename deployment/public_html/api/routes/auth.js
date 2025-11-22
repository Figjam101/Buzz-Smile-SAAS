const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const router = express.Router();

// Development-only reset password endpoint used by dev-auto-login.html
router.post('/dev/reset-password', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and newPassword required' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, password: newPassword });
      await user.save();
      return res.json({ message: 'User created' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.json({ message: 'Password reset' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
});

// Register route
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Login validation failed:', {
        email: req.body.email,
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      email,
      password
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    const userData = {
      id: user._id,
      email: user.email,
      businessName: user.businessName,
      businessDescription: user.businessDescription,
      website: user.website,
      socialMedia: user.socialMedia,
      preferences: user.preferences,
      subscription: user.subscription,
      onboardingCompleted: user.onboardingCompleted
    };

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration'
    });
  }
});

// Login route
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Profile update validation failed:', {
        userId: req.userId,
        errors: errors.array(),
        requestBody: req.body,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error('Login failed - User not found:', {
        email: email,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.error('Login failed - Invalid password:', {
        email: email,
        userId: user._id,
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress
      });
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    const userData = {
      id: user._id,
      email: user.email,
      businessName: user.businessName,
      businessDescription: user.businessDescription,
      website: user.website,
      socialMedia: user.socialMedia,
      preferences: user.preferences,
      subscription: user.subscription,
      onboardingCompleted: user.onboardingCompleted
    };

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login server error:', {
      error: error.message,
      stack: error.stack,
      email: req.body?.email,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    });
    res.status(500).json({
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get current user route (protected)
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const userData = {
      id: user._id,
      email: user.email,
      businessName: user.businessName,
      businessDescription: user.businessDescription,
      website: user.website,
      socialMedia: user.socialMedia,
      preferences: user.preferences,
      subscription: user.subscription,
      onboardingCompleted: user.onboardingCompleted
    };

    res.json({
      user: userData
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// Update user profile route (protected)
router.put('/profile', [
  body('businessName').optional().isLength({ min: 1 }).trim(),
  body('businessDescription').optional().isLength({ min: 1 }).trim(),
  body('onboardingCompleted').optional().isBoolean(),
  body('socialMedia.facebook').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return /^https?:\/\/.+/.test(value);
  }),
  body('socialMedia.instagram').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return /^https?:\/\/.+/.test(value);
  }),
  body('socialMedia.twitter').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return /^https?:\/\/.+/.test(value);
  }),
  body('website').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return /^https?:\/\/.+/.test(value);
  })
], auth, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { businessName, businessDescription, socialMedia, website, onboardingCompleted } = req.body;

    // Find and update user
    const user = await User.findById(req.userId);
    
    if (!user) {
      console.error('Profile update failed - User not found:', {
        userId: req.userId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (businessName !== undefined) user.businessName = businessName;
    if (businessDescription !== undefined) user.businessDescription = businessDescription;
    if (website !== undefined) user.website = website;
    if (req.body.logo !== undefined) user.logo = req.body.logo;
    if (socialMedia) {
      if (socialMedia.facebook !== undefined) user.socialMedia.facebook = socialMedia.facebook;
      if (socialMedia.instagram !== undefined) user.socialMedia.instagram = socialMedia.instagram;
      if (socialMedia.twitter !== undefined) user.socialMedia.twitter = socialMedia.twitter;
      if (socialMedia.tiktok !== undefined) user.socialMedia.tiktok = socialMedia.tiktok;
      if (socialMedia.youtube !== undefined) user.socialMedia.youtube = socialMedia.youtube;
    }

    // Handle onboarding completion
    if (onboardingCompleted !== undefined) {
      user.onboardingCompleted = onboardingCompleted;
    } else if (businessName && businessDescription && 
        (socialMedia?.facebook || socialMedia?.instagram || socialMedia?.twitter)) {
      // Auto-complete onboarding if all required fields are provided
      user.onboardingCompleted = true;
    }

    await user.save();

    // Return updated user data (without password)
    const userData = {
      id: user._id,
      email: user.email,
      businessName: user.businessName,
      businessDescription: user.businessDescription,
      website: user.website,
      logo: user.logo,
      socialMedia: user.socialMedia,
      preferences: user.preferences,
      subscription: user.subscription,
      onboardingCompleted: user.onboardingCompleted
    };

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Profile update error:', error);
    console.error('Request body:', req.body);
    console.error('User ID:', req.userId);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Profile update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Change password route
router.put('/change-password', [
  body('currentPassword').exists().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], auth, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Find the user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Password change failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Forgot password route
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Please provide a valid email address',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        message: 'If an account with that email exists, we have sent a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token and expiry (1 hour from now)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    
    await user.save();

    // Send email
    const emailSent = await sendPasswordResetEmail(email, resetToken);
    
    if (!emailSent) {
      console.error('Failed to send password reset email to:', email);
      return res.status(500).json({
        message: 'Error sending password reset email. Please try again later.'
      });
    }

    console.log('Password reset email sent to:', email);
    res.status(200).json({
      message: 'If an account with that email exists, we have sent a password reset link.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      message: 'Server error. Please try again later.'
    });
  }
});

// Reset password route
router.post('/reset-password', [
  body('token').exists().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid input data',
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    console.log('Password reset successful for user:', user.email);
    res.status(200).json({
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Server error. Please try again later.'
    });
  }
});

module.exports = router;