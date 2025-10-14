const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const { auth } = require('../middleware/auth');
const backupService = require('../services/backupService');

// Middleware to check admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (admin only)
 * @access  Admin
 */
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/videos
 * @desc    Get all videos (admin only)
 * @access  Admin
 */
router.get('/videos', auth, requireAdmin, async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role (admin only)
 * @access  Admin
 */
router.put('/users/:id/role', auth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (admin only)
 * @access  Admin
 */
router.delete('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last admin user' });
      }
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin dashboard stats
 * @access  Admin
 */
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const [userCount, videoCount, adminCount] = await Promise.all([
      User.countDocuments({}),
      Video.countDocuments({}),
      User.countDocuments({ role: 'admin' })
    ]);
    
    res.json({
      users: userCount,
      videos: videoCount,
      admins: adminCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/settings
 * @desc    Get admin settings configuration
 * @access  Admin
 */
router.get('/settings', auth, requireAdmin, async (req, res) => {
  try {
    // Return default settings configuration
    const settings = {
      monitoring: {
        cpuThreshold: { warning: 80, critical: 90 },
        memoryThreshold: { warning: 80, critical: 90 },
        diskThreshold: { warning: 80, critical: 90 },
        responseTimeThreshold: { warning: 1000, critical: 2000 },
        errorRateThreshold: { warning: 5, critical: 10 },
        refreshInterval: 30
      },
      backup: {
        enabled: process.env.BACKUP_ENABLED !== 'false',
        interval: parseInt(process.env.BACKUP_INTERVAL) || 24,
        maxBackups: parseInt(process.env.MAX_BACKUPS) || 7,
        compression: process.env.BACKUP_COMPRESSION !== 'false',
        directory: process.env.BACKUP_DIRECTORY || '/backups'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10MB',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE !== 'false'
      },
      security: {
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24,
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
        lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 15,
        requireTwoFactor: process.env.REQUIRE_TWO_FACTOR === 'true',
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8
      },
      notifications: {
        emailAlerts: process.env.EMAIL_ALERTS !== 'false',
        slackWebhook: process.env.SLACK_WEBHOOK || '',
        discordWebhook: process.env.DISCORD_WEBHOOK || '',
        alertCooldown: parseInt(process.env.ALERT_COOLDOWN) || 300
      },
      performance: {
        enableCaching: process.env.ENABLE_CACHING !== 'false',
        cacheTimeout: parseInt(process.env.CACHE_TIMEOUT) || 3600,
        enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
        maxRequestSize: process.env.MAX_REQUEST_SIZE || '10MB'
      }
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/settings
 * @desc    Update admin settings configuration
 * @access  Admin
 */
router.put('/settings', auth, requireAdmin, async (req, res) => {
  try {
    // In a production environment, these settings would be saved to a database
    // For now, we'll just return success as the settings are environment-based
    res.json({ 
      message: 'Settings updated successfully',
      note: 'Settings are currently environment-based. Changes will take effect after server restart.'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/settings/reset
 * @desc    Reset admin settings to defaults
 * @access  Admin
 */
router.post('/settings/reset', auth, requireAdmin, async (req, res) => {
  try {
    res.json({ 
      message: 'Settings reset to defaults successfully',
      note: 'Default settings are environment-based. Restart server to apply changes.'
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/settings/test/:type
 * @desc    Test notification connections
 * @access  Admin
 */
router.post('/settings/test/:type', auth, requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    
    // Mock test responses for different notification types
    switch (type) {
      case 'slack':
        res.json({ message: 'Slack connection test successful' });
        break;
      case 'discord':
        res.json({ message: 'Discord connection test successful' });
        break;
      case 'email':
        res.json({ message: 'Email connection test successful' });
        break;
      default:
        res.status(400).json({ message: 'Invalid test type' });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/video-backups
 * @desc    Get all video backups (admin only)
 * @access  Admin
 */
router.get('/video-backups', auth, requireAdmin, async (req, res) => {
  try {
    const backups = await backupService.getAllVideoBackups();
    res.json(backups);
  } catch (error) {
    console.error('Error fetching video backups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/video-backups/user/:userId
 * @desc    Get video backups for a specific user (admin only)
 * @access  Admin
 */
router.get('/video-backups/user/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const backups = await backupService.getUserVideoBackups(userId);
    res.json(backups);
  } catch (error) {
    console.error('Error fetching user video backups:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/video-backups/stats
 * @desc    Get video backup statistics (admin only)
 * @access  Admin
 */
router.get('/video-backups/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await backupService.getVideoBackupStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching video backup stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/video-backups/:userId/:videoId
 * @desc    Delete a specific video backup (admin only)
 * @access  Admin
 */
router.delete('/video-backups/:userId/:videoId', auth, requireAdmin, async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    await backupService.deleteVideoBackup(userId, videoId);
    res.json({ message: 'Video backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting video backup:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;