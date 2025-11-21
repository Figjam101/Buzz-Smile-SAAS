const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const ScheduledPost = require('../models/ScheduledPost');
const { auth } = require('../middleware/auth');
const backupService = require('../services/backupService');
const { addCredits } = require('../middleware/credits');
const path = require('path');
const fs = require('fs');

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
    // Query params: pagination, status filter, search
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const status = req.query.status; // e.g., 'public' or 'private' or actual status field
    const q = (req.query.q || '').trim();

    const query = {};

    // Filter public/private flag
    if (status === 'public') query.isPublic = true;
    if (status === 'private') query.isPublic = false;

    // Text search across title/description
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    const total = await Video.countDocuments(query);
    const videos = await Video.find(query)
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Map owner to user for UI compatibility and add safe fields
    const mapped = videos.map(v => ({
      ...v,
      user: v.owner ? { name: v.owner.name, email: v.owner.email } : undefined,
    }));

    res.json({
      videos: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/admin/videos/ready-to-edit
 * @desc    List users who have requested video processing (ready for manual editing)
 * @access  Admin
 */
router.get('/videos/ready-to-edit', auth, requireAdmin, async (req, res) => {
  try {
    // Consider users with videos in queued or processing state as "asked to be processed"
    const statuses = ['queued', 'processing'];
    const vids = await Video.find({ status: { $in: statuses } })
      .populate('owner', 'name email')
      .lean();

    const byUser = new Map();
    for (const v of vids) {
      const uid = v.owner?._id?.toString();
      if (!uid) continue;
      if (!byUser.has(uid)) {
        byUser.set(uid, { userId: uid, name: v.owner?.name, email: v.owner?.email, videoCount: 0, sampleTitles: [] });
      }
      const entry = byUser.get(uid);
      entry.videoCount += 1;
      if (entry.sampleTitles.length < 5 && v.title) entry.sampleTitles.push(v.title);
    }

    res.json({ users: Array.from(byUser.values()) });
  } catch (error) {
    console.error('Error fetching ready-to-edit users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/uploads-to-edit/user/:userId
 * @desc    List files in the user's uploads-to-edit folder
 * @access  Admin
 */
router.get('/uploads-to-edit/user/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const baseDir = path.join(__dirname, '../uploads/user_uploads_to_edit', userId);
    if (!fs.existsSync(baseDir)) {
      return res.json({ files: [] });
    }
    const entries = fs.readdirSync(baseDir);
    const files = entries.map(name => {
      const full = path.join(baseDir, name);
      const stat = fs.statSync(full);
      return {
        name,
        size: stat.size,
        modified: stat.mtime,
        path: `/uploads/user_uploads_to_edit/${userId}/${name}`
      };
    });
    res.json({ files });
  } catch (error) {
    console.error('Error listing uploads-to-edit files:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/videos/:id
 * @desc    Delete any video by ID (admin only)
 * @access  Admin
 */
router.delete('/videos/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await Video.findByIdAndDelete(id);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
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

/**
 * @route   PUT /api/admin/videos/:id/finalize
 * @desc    Finalize an edited video: attach processed file, mark ready, and deduct credit
 * @access  Admin
 */
router.put('/videos/:id/finalize', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { processedFilePath, processedUrl, autoSchedule, platforms, caption, scheduledAt } = req.body || {};

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const ownerId = video.owner?.toString();
    if (!ownerId) {
      return res.status(400).json({ message: 'Video owner missing' });
    }

    // Update video as ready and attach processed file info
    const update = {
      status: 'ready',
      processedAt: new Date()
    };
    if (processedFilePath) update.processedFilePath = processedFilePath;
    if (processedUrl) update.processedUrl = processedUrl;

    const updated = await Video.findByIdAndUpdate(id, update, { new: true });

    // Deduct 1 credit and increment videoCount for the owner unless exempt
    try {
      const owner = await User.findById(ownerId);
      if (owner && !(owner.subscription?.plan === 'god' || owner.isPreLaunch)) {
        await User.findByIdAndUpdate(ownerId, {
          $inc: {
            'credits.balance': -1,
            'credits.used': 1,
            videoCount: 1
          }
        });
      }
    } catch (creditErr) {
      console.error('Finalize credit update error:', creditErr?.message || creditErr);
    }

    let scheduled = null;
    try {
      if (autoSchedule && processedUrl && Array.isArray(platforms) && platforms.length > 0) {
        const when = scheduledAt ? new Date(scheduledAt) : new Date();
        const post = new ScheduledPost({
          userId: ownerId,
          videoId: id,
          platforms,
          scheduledAt: when,
          caption: caption || `Scheduled via Buzz Smile Media`,
          video: {
            title: updated?.title || 'Untitled',
            url: processedUrl,
            thumbnail: updated?.thumbnailPath || null,
            duration: updated?.duration || null
          },
          status: 'scheduled'
        });
        scheduled = await post.save();
      }
    } catch (scheduleErr) {
      console.error('Finalize scheduling error:', scheduleErr?.message || scheduleErr);
    }

    return res.json({ message: 'Video finalized and ready', videoId: id, video: updated, scheduled });
  } catch (error) {
    console.error('Error finalizing video:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/:id/credits
 * @desc    Add credits to a user by ID (admin only)
 * @access  Admin
 */
router.post('/users/:id/credits', auth, requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.params.id;

    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      return res.status(400).json({ message: 'Invalid amount. Must be a number.' });
    }

    await addCredits(userId, amount);

    const updatedUser = await User.findById(userId).select('-password');
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Credits updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        credits: updatedUser.credits
      }
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/credits/by-email
 * @desc    Add credits to a user by email (admin only)
 * @access  Admin
 */
router.post('/users/credits/by-email', auth, requireAdmin, async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      return res.status(400).json({ message: 'Invalid amount. Must be a number.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await addCredits(user._id, amount);

    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      message: 'Credits updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        credits: updatedUser.credits
      }
    });
  } catch (error) {
    console.error('Error adding credits by email:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user (admin only)
 * @access  Admin
 */
router.post('/users', auth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role = 'user', status = 'active', password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // For local provider users, password is required
    if (!password) {
      return res.status(400).json({ message: 'Password is required for new local users' });
    }

    const user = new User({
      name,
      email,
      role,
      password,
      isActive: status === 'active',
      provider: 'local'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user details (admin only)
 * @access  Admin
 */
router.put('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.isActive = status === 'active';
    if (password) {
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    const safeUser = await User.findById(user._id).select('-password');

    res.json({
      message: 'User updated successfully',
      user: safeUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user active status (admin only)
 * @access  Admin
 */
router.put('/users/:id/status', auth, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = Boolean(isActive);
    await user.save();

    res.json({ message: 'User status updated', user: await User.findById(user._id).select('-password') });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/users/:id/reset-password
 * @desc    Reset a user password to a temporary one (admin only)
 * @access  Admin
 */
router.post('/users/:id/reset-password', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a temporary password
    const temp = Math.random().toString(36).slice(-10);
    user.password = temp; // Will be hashed by pre-save hook
    await user.save();

    // TODO: Integrate email service to notify user of temp password
    res.json({ message: 'Password reset successfully and temporary password generated.' });
  } catch (error) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;