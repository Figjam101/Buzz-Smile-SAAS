const express = require('express');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const googleDriveService = require('../services/googleDriveService');

const router = express.Router();

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all videos with Google Drive backup information
router.get('/videos', auth, adminAuth, async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate('userId', 'email username')
      .sort({ createdAt: -1 });

    const videosWithBackupInfo = videos.map(video => ({
      _id: video._id,
      user: video.userId,
      originalFileName: video.originalFileName,
      status: video.status,
      createdAt: video.createdAt,
      hasRawBackup: !!video.googleDriveRawFileId,
      hasProcessedBackup: !!video.googleDriveProcessedFileId,
      googleDriveRawFileId: video.googleDriveRawFileId,
      googleDriveProcessedFileId: video.googleDriveProcessedFileId
    }));

    res.json(videosWithBackupInfo);
  } catch (error) {
    console.error('Admin videos fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch videos' });
  }
});

// Download raw video from Google Drive
router.get('/videos/:videoId/download-raw', auth, adminAuth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (!video.googleDriveRawFileId) {
      return res.status(404).json({ message: 'Raw video backup not found' });
    }

    await googleDriveService.initialize();
    const downloadStream = await googleDriveService.downloadFile(video.googleDriveRawFileId);
    
    res.setHeader('Content-Disposition', `attachment; filename="${video.originalFileName}"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Admin raw video download error:', error);
    res.status(500).json({ message: 'Failed to download raw video' });
  }
});

// Download processed video from Google Drive
router.get('/videos/:videoId/download-processed', auth, adminAuth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (!video.googleDriveProcessedFileId) {
      return res.status(404).json({ message: 'Processed video backup not found' });
    }

    await googleDriveService.initialize();
    const downloadStream = await googleDriveService.downloadFile(video.googleDriveProcessedFileId);
    
    res.setHeader('Content-Disposition', `attachment; filename="processed_${video.originalFileName}"`);
    res.setHeader('Content-Type', 'video/mp4');
    
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Admin processed video download error:', error);
    res.status(500).json({ message: 'Failed to download processed video' });
  }
});

// Get Google Drive storage statistics
router.get('/storage-stats', auth, adminAuth, async (req, res) => {
  try {
    const driveService = await googleDriveService.initialize();
    const driveInfo = await googleDriveService.getDriveInfo(driveService);
    
    // Get video counts from database
    const totalVideos = await Video.countDocuments();
    const videosWithRawBackup = await Video.countDocuments({ googleDriveRawFileId: { $exists: true, $ne: null } });
    const videosWithProcessedBackup = await Video.countDocuments({ googleDriveProcessedFileId: { $exists: true, $ne: null } });
    
    res.json({
      drive: driveInfo,
      videos: {
        total: totalVideos,
        rawBackups: videosWithRawBackup,
        processedBackups: videosWithProcessedBackup
      }
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    res.status(500).json({ message: 'Failed to fetch storage statistics' });
  }
});

// Get user-specific Google Drive dashboard stats
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user's video statistics
    const userVideos = await Video.find({ userId });
    const totalUserVideos = userVideos.length;
    const userVideosWithRawBackup = userVideos.filter(v => v.googleDriveRawFileId).length;
    const userVideosWithProcessedBackup = userVideos.filter(v => v.googleDriveProcessedFileId).length;
    
    // Get user info
    const user = await User.findById(userId);
    
    // Calculate storage usage (approximate)
    let totalStorageUsed = 0;
    userVideos.forEach(video => {
      if (video.metadata && video.metadata.size) {
        totalStorageUsed += video.metadata.size;
      }
    });
    
    // Get recent videos
    const recentVideos = await Video.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('originalFileName status createdAt googleDriveRawFileId googleDriveProcessedFileId');
    
    res.json({
      user: {
        email: user.email,
        plan: user.subscription.plan,
        videosProcessed: user.subscription.videosProcessed,
        monthlyLimit: user.subscription.monthlyLimit
      },
      videos: {
        total: totalUserVideos,
        rawBackups: userVideosWithRawBackup,
        processedBackups: userVideosWithProcessedBackup,
        storageUsed: totalStorageUsed,
        recent: recentVideos
      },
      googleDrive: {
        connected: !!user.googleDriveFolders?.userFolderId,
        folderId: user.googleDriveFolders?.userFolderId
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;