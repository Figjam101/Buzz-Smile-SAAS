const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const secret = process.env.JWT_SECRET || (nodeEnv !== 'production' ? 'dev-secret' : null);
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in production environment');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password, name, businessName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      businessName: businessName || ''
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        plan: user.plan,
        videoCount: user.videoCount,
        maxVideos: user.maxVideos,
        role: user.role,
        profilePicture: user.profilePicture,
        socialMedia: user.socialMedia,
        linkedSocialAccounts: user.linkedSocialAccounts || []
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Development-only login bypass when DB is unavailable
    const mongoose = require('mongoose');
    const dbUnavailable = mongoose.connection.readyState !== 1 && process.env.ALLOW_SERVER_WITHOUT_DB === 'true';
    if (dbUnavailable) {
      if (email === 'test@example.com' && password === 'testpassword123') {
        const devUser = {
          _id: 'dev-test-user',
          email: 'test@example.com',
          name: 'Test User',
          businessName: 'Test Business',
          plan: 'free',
          videoCount: 0,
          maxVideos: 10,
          role: 'user',
          profilePicture: null,
          socialMedia: {},
          linkedSocialAccounts: []
        };
        const token = jwt.sign(
          { userId: devUser._id, devUser: true, user: devUser },
          process.env.JWT_SECRET || 'dev-secret',
          { expiresIn: '7d' }
        );
        return res.json({
          message: 'Login successful (dev mode)',
          token,
          user: {
            id: devUser._id,
            email: devUser.email,
            name: devUser.name,
            businessName: devUser.businessName,
            plan: devUser.plan,
            videoCount: devUser.videoCount,
            maxVideos: devUser.maxVideos,
            role: devUser.role,
            profilePicture: devUser.profilePicture,
            socialMedia: devUser.socialMedia,
            linkedSocialAccounts: devUser.linkedSocialAccounts
          }
        });
      }
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        plan: user.plan,
        videoCount: user.videoCount,
        maxVideos: user.maxVideos,
        lastLogin: user.lastLogin,
        role: user.role,
        profilePicture: user.profilePicture,
        socialMedia: user.socialMedia,
        linkedSocialAccounts: user.linkedSocialAccounts || []
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      businessName: req.user.businessName,
      plan: req.user.plan,
      videoCount: req.user.videoCount,
      maxVideos: req.user.maxVideos,
      lastLogin: req.user.lastLogin,
      role: req.user.role,
      profilePicture: req.user.profilePicture,
      socialMedia: req.user.socialMedia,
      linkedSocialAccounts: req.user.linkedSocialAccounts || []
    }
  });
});

// Update profile
router.put('/profile', auth, [
  body('name').optional().trim().isLength({ min: 1, max: 50 }),
  body('businessName').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, businessName } = req.body;
    const user = req.user;

    if (name) user.name = name;
    if (businessName !== undefined) user.businessName = businessName;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        plan: user.plan,
        videoCount: user.videoCount,
        maxVideos: user.maxVideos,
        role: user.role,
        profilePicture: user.profilePicture,
        socialMedia: user.socialMedia,
        linkedSocialAccounts: user.linkedSocialAccounts || []
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// Development-only password reset endpoint
if ((process.env.NODE_ENV || 'development') !== 'production') {
  router.post('/dev/reset-password', [
    body('email').isEmail().normalizeEmail(),
    body('newPassword').isLength({ min: 6 })
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, newPassword } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.password = newPassword; // Will be hashed by pre-save middleware
      await user.save();

      return res.json({ message: 'Password reset successfully', email });
    } catch (error) {
      console.error('Dev reset password error:', error);
      return res.status(500).json({ message: 'Server error during dev reset' });
    }
  });
}

module.exports = router;