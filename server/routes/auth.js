const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes, createHash } = require('crypto');
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

const buildClientBase = () => {
  const raw = process.env.CLIENT_URLS || process.env.CLIENT_URL || '';
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return list[0] || 'http://localhost:3000';
};

// Request password reset
router.post('/forgot', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link was sent' });
    }
    const rawToken = randomBytes(32).toString('hex');
    const hashed = createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    // Do NOT expose token in response on production
    return res.json({ message: 'If the email exists, a reset link was sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// Perform password reset
router.post('/reset', [
  body('token').isString().isLength({ min: 10 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { token, password } = req.body;
    const hashed = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    user.password = password;
    user.provider = 'local';
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.lastLogin = new Date();
    await user.save();
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-secret' : null);
    if (!secret && process.env.NODE_ENV === 'production') {
      console.warn('JWT_SECRET not set; returning success without token');
      return res.json({ message: 'Password reset successful' });
    }
    const tokenJwt = require('jsonwebtoken').sign({ userId: user._id }, secret, { expiresIn: '7d' });
    return res.json({ message: 'Password reset successful', token: tokenJwt });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
});
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

router.post('/forgot', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    const clientBase = buildClientBase();
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link was sent' });
    }
    const rawToken = randomBytes(32).toString('hex');
    const hashed = createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const resetUrl = `${clientBase.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    return res.json({ message: 'Reset link sent', resetUrl, token: rawToken });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Server error during password reset request' });
  }
});

router.post('/reset', [
  body('token').isString().isLength({ min: 10 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { token, password } = req.body;
    const hashed = createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    user.password = password;
    user.provider = 'local';
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.lastLogin = new Date();
    await user.save();
    const tokenJwt = generateToken(user._id);
    return res.json({ message: 'Password reset successful', token: tokenJwt });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Server error during password reset' });
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
      let devUser = null;
      if (email === 'test@example.com' && password === 'testpassword123') {
        devUser = {
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
      } else if (email === 'admin@example.com' && password === 'adminpassword123') {
        devUser = {
          _id: 'dev-admin-user',
          email: 'admin@example.com',
          name: 'Dev Admin',
          businessName: 'Admin Biz',
          plan: 'pro',
          videoCount: 0,
          maxVideos: 100,
          role: 'admin',
          profilePicture: null,
          socialMedia: {},
          linkedSocialAccounts: []
        };
      }

      if (devUser) {
        const payload = {
          userId: devUser._id,
          email: devUser.email,
          name: devUser.name,
          businessName: devUser.businessName,
          plan: devUser.plan,
          videoCount: devUser.videoCount,
          maxVideos: devUser.maxVideos,
          role: devUser.role,
          devUser: true
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
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

      // Allow owner admin login in dev when DB is unavailable
      if (email === 'npkalyx@gmail.com' && password === 'BuzzSmile!2025') {
        const devUserOwner = {
          _id: 'dev-owner-admin',
          email: 'npkalyx@gmail.com',
          name: 'Owner Admin',
          businessName: 'Buzz Smile Media',
          plan: 'pro',
          videoCount: 0,
          maxVideos: 100,
          role: 'admin',
          profilePicture: null,
          socialMedia: {},
          linkedSocialAccounts: []
        };
        const payload = {
          userId: devUserOwner._id,
          email: devUserOwner.email,
          name: devUserOwner.name,
          businessName: devUserOwner.businessName,
          plan: devUserOwner.plan,
          videoCount: devUserOwner.videoCount,
          maxVideos: devUserOwner.maxVideos,
          role: devUserOwner.role,
          devUser: true
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
        return res.json({
          message: 'Login successful (dev mode)',
          token,
          user: {
            id: devUserOwner._id,
            email: devUserOwner.email,
            name: devUserOwner.name,
            businessName: devUserOwner.businessName,
            plan: devUserOwner.plan,
            videoCount: devUserOwner.videoCount,
            maxVideos: devUserOwner.maxVideos,
            role: devUserOwner.role,
            profilePicture: devUserOwner.profilePicture,
            socialMedia: devUserOwner.socialMedia,
            linkedSocialAccounts: devUserOwner.linkedSocialAccounts
          }
        });
      }

      return res.status(503).json({ 
        message: 'Database unavailable in development. Use dev credentials (test@example.com/testpassword123 or admin@example.com/adminpassword123).' 
      });
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

router.post('/forgot', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    const clientBase = buildClientBase();
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link was sent' });
    }
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const resetUrl = `${clientBase.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    return res.json({ message: 'Reset link sent', resetUrl, token: rawToken });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Server error during password reset request' });
  }
});

router.post('/reset', [
  body('token').isString().isLength({ min: 10 }),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { token, password } = req.body;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    user.password = password;
    user.provider = 'local';
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.lastLogin = new Date();
    await user.save();
    const tokenJwt = generateToken(user._id);
    return res.json({ message: 'Password reset successful', token: tokenJwt });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Server error during password reset' });
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

// Development-only admin login when database is unavailable
if ((process.env.NODE_ENV || 'development') !== 'production') {
  router.post('/dev/admin-login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
  ], async (req, res) => {
    try {
      const mongoose = require('mongoose');
      const dbUnavailable = mongoose.connection.readyState !== 1 && process.env.ALLOW_SERVER_WITHOUT_DB === 'true';
      const { email, password } = req.body;

      if (!dbUnavailable) {
        return res.status(400).json({ message: 'Use normal /login when database is connected' });
      }

      if (email === 'npkalyx@gmail.com' && password === 'NpkTemp!2025#Sm1le') {
        const devUser = {
          _id: 'dev-admin-user',
          email: 'npkalyx@gmail.com',
          name: 'Admin User',
          businessName: 'Buzz Smile Media',
          plan: 'free',
          videoCount: 0,
          maxVideos: 10,
          role: 'admin',
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
          message: 'Login successful (dev admin)',
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

      return res.status(400).json({ message: 'Invalid dev admin credentials' });
    } catch (error) {
      return res.status(500).json({ message: 'Server error during dev admin login' });
    }
  });
}

module.exports = router;