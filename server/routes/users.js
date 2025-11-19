const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { auth, invalidateUserCache } = require('../middleware/auth');
const User = require('../models/User');
const Video = require('../models/Video');

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
    fileSize: 20 * 1024 * 1024 // 20MB limit
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

// Middleware wrapper to surface multer errors as user-friendly responses
const uploadProfilePicture = (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (!err) return next();
    // Handle Multer-specific errors
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Image too large. Max size is 20MB.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    }
    // Handle general errors (e.g., wrong file type)
    return res.status(400).json({ message: err.message || 'Invalid file upload' });
  });
};

// Get user stats
router.get('/stats', auth, async (req, res) => {
  try {
    const user = req.user;
    const allowOffline = process.env.ALLOW_SERVER_WITHOUT_DB === 'true' && process.env.NODE_ENV !== 'production';
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let storageUsed = 0;
    if (dbConnected) {
      try {
        const videos = await Video.find({ owner: user._id }).select('fileSize');
        storageUsed = videos.reduce((sum, v) => sum + (v.fileSize || 0), 0);
      } catch (e) {
        if (!allowOffline) throw e;
        storageUsed = 0;
      }
    } else if (!dbConnected && allowOffline) {
      storageUsed = 0;
    } else {
      return res.status(500).json({ message: 'Database not connected' });
    }

    const isGodModeAdmin = user.role === 'admin' && (user.subscription?.plan === 'god' || user.plan === 'god');
    const plan = user.subscription?.plan || user.plan || 'free';
    const GB = 1024 * 1024 * 1024;
    let storageLimit = GB * 2; // default 2GB if unspecified
    if (isGodModeAdmin) storageLimit = Number.POSITIVE_INFINITY;
    else if (plan === 'free' || plan === 'basic') storageLimit = GB * 1; // 1GB cap
    else if (plan === 'premium' || plan === 'pro' || plan === 'enterprise') storageLimit = GB * 10;

    res.json({
      stats: {
        videoCount: user.videoCount,
        maxVideos: user.maxVideos,
        remainingVideos: Math.max(0, user.maxVideos - user.videoCount),
        plan: user.plan,
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        credits: user.credits || { balance: 0, used: 0 },
        subscription: user.subscription || { plan: user.plan, videosProcessed: user.videoCount, monthlyLimit: user.maxVideos },
        role: user.role || 'user',
        isPreLaunch: user.isPreLaunch || false,
        storageUsed,
        storageLimit
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
router.put('/profile', auth, uploadProfilePicture, async (req, res) => {
  try {
    const user = req.user;
    const { socialMedia, logo } = req.body;
    
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
      let parsedSocialMedia = socialMedia;
      if (typeof socialMedia === 'string') {
        try {
          parsedSocialMedia = JSON.parse(socialMedia);
        } catch (e) {
          return res.status(400).json({ message: 'Invalid socialMedia format. Expecting JSON.' });
        }
      }
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

    // Persist logo URL if provided (relative path expected)
    if (logo && typeof logo === 'string') {
      user.logo = logo;
    }

    await user.save();
    try {
      // Invalidate auth middleware cache so /api/auth/me reflects the change immediately
      const uid = (user._id && user._id.toString) ? user._id.toString() : user._id;
      invalidateUserCache(uid);
    } catch (cacheErr) {
      // Non-fatal: proceed even if cache invalidation fails
      console.warn('User cache invalidation failed:', cacheErr);
    }
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        logo: user.logo,
        socialMedia: user.socialMedia,
        linkedSocialAccounts: user.linkedSocialAccounts || []
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Update social media and linked accounts (without file upload)
router.put('/social-media', auth, async (req, res) => {
  try {
    const user = req.user;
    const { socialMedia, linkedSocialAccounts } = req.body;

    if (socialMedia) {
      // Replace social media fields selectively
      user.socialMedia = {
        facebook: socialMedia.facebook || user.socialMedia.facebook || '',
        twitter: socialMedia.twitter || user.socialMedia.twitter || '',
        instagram: socialMedia.instagram || user.socialMedia.instagram || '',
        youtube: socialMedia.youtube || user.socialMedia.youtube || '',
        linkedin: socialMedia.linkedin || user.socialMedia.linkedin || '',
        tiktok: socialMedia.tiktok || user.socialMedia.tiktok || ''
      };
    }

    if (Array.isArray(linkedSocialAccounts)) {
      // Store the set of linked platforms
      user.linkedSocialAccounts = linkedSocialAccounts;
    }

    await user.save();

    res.json({
      message: 'Social media updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        socialMedia: user.socialMedia,
        linkedSocialAccounts: user.linkedSocialAccounts || []
      }
    });
  } catch (error) {
    console.error('Social media update error:', error);
    res.status(500).json({ message: 'Server error updating social media' });
  }
});
// Move/copy all user uploads to the "uploads/user_uploads_to_edit/<userId>" folder
// This is triggered when the user confirms processing in the dashboard.
router.post('/uploads-to-edit', auth, async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id.toString();

    // Find all videos owned by the user. We include both single-file and multi-file sources.
    const videos = await Video.find({ owner: user._id }).lean();

    if (!videos || videos.length === 0) {
      return res.status(404).json({ message: 'No uploaded videos found for this user' });
    }

    // Ensure destination directory
    const baseDestDir = path.join(__dirname, '../uploads/user_uploads_to_edit', userId);
    if (!fs.existsSync(baseDestDir)) {
      fs.mkdirSync(baseDestDir, { recursive: true });
    }

    let copiedCount = 0;
    const copiedFiles = [];

    const copySafely = (srcPath, destPath) => {
      try {
        // Skip if source is missing
        if (!srcPath || !fs.existsSync(srcPath)) return false;

        // Ensure dest parent exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(srcPath, destPath);
        return true;
      } catch (e) {
        console.warn('Copy failed', { srcPath, destPath, error: e.message });
        return false;
      }
    };

    for (const v of videos) {
      // Copy the primary uploaded file
      if (v.filePath) {
        const destMain = path.join(baseDestDir, path.basename(v.filePath));
        const ok = copySafely(v.filePath, destMain);
        if (ok) {
          copiedCount += 1;
          copiedFiles.push({ type: 'primary', filename: path.basename(v.filePath) });
        }
      }

      // Copy any multi-file source entries
      if (Array.isArray(v.sourceFiles)) {
        for (const src of v.sourceFiles) {
          if (!src?.filePath) continue;
          const destSrc = path.join(baseDestDir, path.basename(src.filePath));
          const ok = copySafely(src.filePath, destSrc);
          if (ok) {
            copiedCount += 1;
            copiedFiles.push({ type: 'source', filename: path.basename(src.filePath) });
          }
        }
      }
    }

    // Optionally upload to Google Drive using the user's integration folder (if configured)
    // Note: central admin folder upload support can be added later if needed.
    const uploadedToDrive = [];
    try {
      const hasDrive = user?.integrations?.googleDrive?.accessToken && user?.integrations?.googleDrive?.folderId;
      if (hasDrive) {
        const { uploadFile } = require('../services/googleDriveService');
        for (const f of copiedFiles) {
          const localPath = path.join(baseDestDir, f.filename);
          if (fs.existsSync(localPath)) {
            const mimeType = 'video/*';
            const resDrive = await uploadFile(user, localPath, f.filename, mimeType);
            uploadedToDrive.push({ id: resDrive?.id, name: resDrive?.name });
          }
        }
      }
    } catch (driveErr) {
      console.warn('Google Drive upload skipped or failed:', driveErr.message);
    }

    return res.json({
      message: 'User uploads copied to edit folder',
      userId,
      destination: `/uploads/user_uploads_to_edit/${userId}/`,
      copiedCount,
      copiedFiles,
      uploadedToDrive
    });
  } catch (error) {
    console.error('uploads-to-edit error:', error);
    return res.status(500).json({ message: 'Server error moving uploads to edit folder' });
  }
});

module.exports = router;