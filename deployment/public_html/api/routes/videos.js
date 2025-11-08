const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const capCutService = require('../services/capcut');
const googleDriveService = require('../services/googleDriveService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/videos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept video files only
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  }
});

// Upload video route (protected) - supports multiple files
router.post('/upload', auth, upload.array('video', 10), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: 'No video files uploaded'
      });
    }

    // Check user's subscription limits
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Check subscription limits for multiple uploads
    const totalFilesToUpload = req.files.length;
    if (user.subscription.videosProcessed + totalFilesToUpload > user.subscription.monthlyLimit) {
      // Delete uploaded files since we can't process them
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      return res.status(403).json({
        message: `Upload would exceed your subscription limit. You can upload ${user.subscription.monthlyLimit - user.subscription.videosProcessed} more video(s).`
      });
    }

    const uploadResults = [];
    const failedUploads = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Validate video file
        const validation = capCutService.validateVideo(file.path);
        if (!validation.valid) {
          failedUploads.push({
            filename: file.originalname,
            error: validation.error
          });
          // Clean up the invalid file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          continue;
        }

        // Parse editing options
        let editingOptions = {};
        if (req.body.editingOptions) {
          try {
            editingOptions = JSON.parse(req.body.editingOptions);
          } catch (error) {
            console.error('Error parsing editing options:', error);
          }
        }

        // Create video record
        const video = new Video({
          userId: req.userId,
          originalFileName: file.originalname,
          originalFilePath: file.path,
          editingOptions,
          metadata: {
            fileSize: file.size,
            format: path.extname(file.originalname).substring(1),
            uploadedAt: new Date()
          }
        });

        await video.save();

        // Backup raw video to Google Drive
        try {
          await googleDriveService.initialize();
          const driveFileId = await googleDriveService.uploadRawVideo(
            file.path, 
            req.userId, 
            file.originalname
          );
          
          // Store Google Drive file ID in video record
          video.googleDriveRawFileId = driveFileId;
          await video.save();
          
          console.log(`Raw video backed up to Google Drive: ${driveFileId}`);
        } catch (driveError) {
          console.error('Failed to backup raw video to Google Drive:', driveError);
          // Continue processing even if backup fails
        }

        // Increment user's processed videos count
        user.subscription.videosProcessed += 1;
        await user.save();

        // Start processing with CapCut
        try {
          let processingResult;
          
          // Use simulation in development, real API in production
          if (process.env.NODE_ENV === 'development' || !process.env.CAPCUT_API_KEY) {
            processingResult = await capCutService.simulateProcessing(file.path, editingOptions);
          } else {
            processingResult = await capCutService.applyEffects(file.path, editingOptions);
          }

          if (processingResult.success) {
            video.status = 'processing';
            video.capCutTaskId = processingResult.taskId;
            video.processingProgress = 0;
            await video.save();

            // Start monitoring the processing status
            monitorProcessing(video._id, processingResult.taskId);

            uploadResults.push({
              id: video._id,
              filename: file.originalname,
              status: video.status,
              taskId: processingResult.taskId,
              message: 'Upload successful'
            });
          } else {
            video.status = 'failed';
            video.error = processingResult.error;
            await video.save();

            failedUploads.push({
              filename: file.originalname,
              error: processingResult.error
            });
          }
        } catch (processingError) {
          console.error('Processing error:', processingError);
          video.status = 'failed';
          video.error = processingError.message;
          await video.save();

          failedUploads.push({
            filename: file.originalname,
            error: processingError.message
          });
        }

      } catch (error) {
        console.error('Error processing file:', file.originalname, error);
        failedUploads.push({
          filename: file.originalname,
          error: 'Processing failed'
        });
        
        // Clean up the file if processing failed
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      }
    }

    // Return results
    const response = {
      message: `Processed ${uploadResults.length} of ${req.files.length} files`,
      successful: uploadResults,
      failed: failedUploads,
      totalUploaded: uploadResults.length,
      totalFailed: failedUploads.length
    };

    // Return appropriate status code
    if (uploadResults.length === 0) {
      return res.status(400).json(response);
    } else if (failedUploads.length > 0) {
      return res.status(207).json(response); // Multi-status
    } else {
      return res.status(201).json(response);
    }

  } catch (error) {
    console.error('Video upload error:', error);
    
    // Clean up uploaded files if there was an error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 1GB.'
      });
    }
    
    res.status(500).json({
      message: 'Server error during video upload'
    });
  }
});

// Get user's videos (protected)
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const videos = await Video.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-originalFilePath -processedFilePath');

    const total = await Video.countDocuments({ userId: req.userId });

    res.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// Get video status (protected)
router.get('/:videoId/status', auth, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.videoId,
      userId: req.userId
    }).select('-originalFilePath -processedFilePath');

    if (!video) {
      return res.status(404).json({
        message: 'Video not found'
      });
    }

    res.json({
      video: {
        id: video._id,
        originalFileName: video.originalFileName,
        status: video.status,
        processingProgress: video.processingProgress,
        downloadUrl: video.downloadUrl,
        createdAt: video.createdAt,
        metadata: video.metadata
      }
    });

  } catch (error) {
    console.error('Get video status error:', error);
    res.status(500).json({
      message: 'Server error'
    });
  }
});

// Download processed video (protected)
router.get('/:videoId/download', auth, async (req, res) => {
  try {
    const video = await Video.findOne({
      _id: req.params.videoId,
      userId: req.userId
    });

    if (!video) {
      return res.status(404).json({
        message: 'Video not found'
      });
    }

    if (video.status !== 'completed') {
      return res.status(400).json({
        message: 'Video processing not completed yet'
      });
    }

    // Check if download URL has expired
    if (video.downloadExpiresAt && new Date(video.downloadExpiresAt) < new Date()) {
      return res.status(410).json({ message: 'Download link has expired' });
    }

    // If we have a CapCut download URL, proxy the download
    if (video.downloadUrl && video.downloadUrl.startsWith('http')) {
      try {
        const downloadResult = await capCutService.downloadVideo(
          video.downloadUrl, 
          path.join(__dirname, '../temp', `processed_${video._id}.mp4`)
        );

        if (downloadResult.success) {
          res.download(downloadResult.filePath, `processed_${video.originalFileName}`, (err) => {
            if (err) {
              console.error('Download error:', err);
            }
            // Clean up temp file
            fs.unlink(downloadResult.filePath, (unlinkErr) => {
              if (unlinkErr) console.error('Temp file cleanup error:', unlinkErr);
            });
          });
        } else {
          return res.status(500).json({ message: 'Failed to download processed video' });
        }
      } catch (downloadError) {
        console.error('Download proxy error:', downloadError);
        return res.status(500).json({ message: 'Download service error' });
      }
    } else {
      // Fallback to local file if no processed version available
      if (!video.processedFilePath || !fs.existsSync(video.processedFilePath)) {
        return res.status(404).json({
          message: 'Processed video file not found'
        });
      }

      // Set appropriate headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${video.originalFileName}"`);
      res.setHeader('Content-Type', 'video/mp4');

      // Stream the file
      const fileStream = fs.createReadStream(video.processedFilePath);
      fileStream.pipe(res);
    }

  } catch (error) {
    console.error('Download video error:', error);
    res.status(500).json({
      message: 'Server error during download'
    });
  }
});

// Monitor processing status
async function monitorProcessing(videoId, taskId) {
  try {
    const video = await Video.findById(videoId);
    if (!video) return;

    // Check processing status periodically
    const statusInterval = setInterval(async () => {
      try {
        const currentVideo = await Video.findById(videoId);
        if (!currentVideo || currentVideo.status === 'completed' || currentVideo.status === 'failed') {
          clearInterval(statusInterval);
          return;
        }

        let statusResult;
        
        // Use simulation in development, real API in production
        if (process.env.NODE_ENV === 'development' || !process.env.CAPCUT_API_KEY) {
          statusResult = await capCutService.simulateTaskStatus(taskId);
        } else {
          statusResult = await capCutService.getTaskStatus(taskId);
        }

        if (statusResult.success) {
          currentVideo.processingProgress = statusResult.progress;
          
          if (statusResult.status === 'completed') {
            currentVideo.status = 'completed';
            currentVideo.downloadUrl = statusResult.downloadUrl;
            currentVideo.downloadExpiresAt = statusResult.expiresAt;
            clearInterval(statusInterval);
          } else if (statusResult.status === 'failed') {
            currentVideo.status = 'failed';
            currentVideo.error = statusResult.error;
            clearInterval(statusInterval);
          }

          await currentVideo.save();
        }
      } catch (statusError) {
        console.error('Status check error:', statusError);
      }
    }, 5000); // Check every 5 seconds

  } catch (error) {
    console.error('Monitor processing error:', error);
    
    // Update video status to failed
    try {
      await Video.findByIdAndUpdate(videoId, { 
        status: 'failed',
        processingProgress: 0,
        error: error.message
      });
    } catch (updateError) {
      console.error('Failed to update video status:', updateError);
    }
  }
}

// Simulate video processing (this would integrate with CapCut API)
async function processVideo(videoId) {
  try {
    const video = await Video.findById(videoId);
    if (!video) return;

    // Update status to processing
    video.status = 'processing';
    video.processingProgress = 0;
    await video.save();

    // Simulate processing progress
    const progressInterval = setInterval(async () => {
      const currentVideo = await Video.findById(videoId);
      if (!currentVideo || currentVideo.status !== 'processing') {
        clearInterval(progressInterval);
        return;
      }

      currentVideo.processingProgress += 20;
      
      if (currentVideo.processingProgress >= 100) {
        currentVideo.status = 'completed';
        currentVideo.processingProgress = 100;
        currentVideo.processedFilePath = currentVideo.originalFilePath; // In real implementation, this would be the processed file
        currentVideo.downloadUrl = `/api/videos/${videoId}/download`;
        
        // Backup processed video to Google Drive
        try {
          await googleDriveService.initialize();
          const processedDriveFileId = await googleDriveService.uploadProcessedVideo(
            currentVideo.processedFilePath, 
            currentVideo.userId, 
            currentVideo.originalFileName
          );
          
          // Store Google Drive processed file ID
          currentVideo.googleDriveProcessedFileId = processedDriveFileId;
          console.log(`Processed video backed up to Google Drive: ${processedDriveFileId}`);
        } catch (driveError) {
          console.error('Failed to backup processed video to Google Drive:', driveError);
          // Continue even if backup fails
        }
        
        clearInterval(progressInterval);
      }

      await currentVideo.save();
    }, 2000); // Update every 2 seconds

  } catch (error) {
    console.error('Process video error:', error);
    
    // Update video status to failed
    try {
      await Video.findByIdAndUpdate(videoId, { 
        status: 'failed',
        processingProgress: 0 
      });
    } catch (updateError) {
      console.error('Failed to update video status:', updateError);
    }
  }
}

module.exports = router;