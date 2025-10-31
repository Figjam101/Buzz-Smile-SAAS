const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');
const Video = require('../models/Video');
const { auth } = require('../middleware/auth');
const { checkCredits, deductCredits } = require('../middleware/credits');
const OpenCutService = require('../services/opencutService');
const thumbnailService = require('../services/thumbnailService');
const backupService = require('../services/backupService');

const router = express.Router();
const opencutService = new OpenCutService();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedFormats = process.env.ALLOWED_VIDEO_FORMATS?.split(',') || ['mp4', 'mov', 'avi', 'mkv'];
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedFormats.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file format. Allowed formats: ${allowedFormats.join(', ')}`), false);
  }
};

// Create dynamic multer configuration based on user role
const createUploadMiddleware = (req, res, next) => {
  const user = req.user;
  const isGodModeAdmin = user && user.role === 'admin' && (user.subscription?.plan === 'god' || user.plan === 'god');
  
  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: isGodModeAdmin ? 2 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024, // 2GB for admin, 1GB for others
      fieldSize: 10 * 1024 * 1024, // 10MB field size limit
      fieldNameSize: 100, // Field name size limit
      headerPairs: 2000, // Maximum number of header key=>value pairs
      files: 10 // Maximum number of files
    }
  });
  
  return upload.array('video', 10)(req, res, next);
};

// Upload video(s) - supports both single and multiple files
router.post('/upload', auth, checkCredits, createUploadMiddleware, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No video files provided' });
    }

    const user = req.user;
    const files = req.files;
    const isMultipleFiles = files.length > 1;
    
    // Check if user has reached video limit (count all files) - Skip for admin users with god plan
    const isGodModeAdmin = user.role === 'admin' && (user.subscription?.plan === 'god' || user.plan === 'god');
    if (!isGodModeAdmin && user.videoCount + files.length > user.maxVideos) {
      // Delete uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(403).json({ 
        message: `Video limit would be exceeded. You can upload ${user.maxVideos - user.videoCount} more videos.`,
        currentCount: user.videoCount,
        maxVideos: user.maxVideos,
        attemptedUpload: files.length
      });
    }

    const { title, description, editingData, fileCount, fileNames, multipleFiles } = req.body;
    
    // Parse editing data from wizard if provided
    let parsedEditingData = null;
    if (editingData) {
      try {
        parsedEditingData = JSON.parse(editingData);
        // Add multiple file info to editing data
        if (isMultipleFiles) {
          parsedEditingData.multipleFiles = true;
          parsedEditingData.fileCount = files.length;
          parsedEditingData.fileNames = files.map(f => f.originalname);
        }
      } catch (error) {
        console.error('Error parsing editing data:', error);
      }
    }

    let video;
    
    if (isMultipleFiles && parsedEditingData) {
      // For multiple files, create a single video record that will contain the merged result
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const combinedTitle = title || `Combined Video - ${files.map(f => f.originalname).join(', ')}`;
      
      video = new Video({
        title: combinedTitle,
        description: description || '',
        filename: `merged-${Date.now()}.mp4`, // Will be updated after merging
        originalName: files.map(f => f.originalname).join(', '),
        filePath: files[0].path, // Use first file path temporarily, will be updated after merging
        fileSize: totalSize,
        format: 'mp4',
        owner: user._id,
        status: 'processing', // Always processing for multiple files
        editingPreferences: parsedEditingData,
        sourceFiles: files.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          format: path.extname(file.originalname).toLowerCase().slice(1)
        }))
      });
    } else {
      // Single file handling (existing logic)
      const file = files[0];
      video = new Video({
        title: title || file.originalname,
        description: description || '',
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        format: path.extname(file.originalname).toLowerCase().slice(1),
        owner: user._id,
        status: parsedEditingData ? 'processing' : 'ready',
        editingPreferences: parsedEditingData
      });
    }

    await video.save();

    // Backup uploaded video files to admin-only folder
    try {
      if (isMultipleFiles) {
        // Backup each source file for multiple file uploads
        for (const file of files) {
          await backupService.backupVideo(file.path, user._id, video._id, file.originalname);
        }
        console.log(`Backed up ${files.length} source files for video ${video._id}`);
      } else {
        // Backup single file
        const file = files[0];
        await backupService.backupVideo(file.path, user._id, video._id, file.originalname);
        console.log(`Backed up video file for video ${video._id}`);
      }
    } catch (error) {
      console.error('Error backing up video files:', error);
      // Don't fail the upload if backup fails - log the error and continue
    }

    // Generate thumbnail and extract duration for single file uploads (not for multiple files during processing)
    if (!isMultipleFiles || !parsedEditingData) {
      try {
        const videoPath = isMultipleFiles ? files[0].path : video.filePath;
        
        // Generate thumbnail
        const thumbnailPath = await thumbnailService.generateOptimalThumbnail(videoPath, video._id);
        
        // Extract video duration
        const duration = await thumbnailService.getVideoDuration(videoPath);
        
        // Update video with thumbnail path and duration
        await Video.findByIdAndUpdate(video._id, {
          thumbnailPath: thumbnailPath,
          duration: duration
        });
        
        console.log(`Thumbnail generated for video ${video._id}: ${thumbnailPath}`);
        console.log(`Duration extracted for video ${video._id}: ${duration} seconds`);
      } catch (error) {
        console.error('Error generating thumbnail or extracting duration:', error);
        // Don't fail the upload if thumbnail generation or duration extraction fails
      }
    }

    // If editing data is provided, start automatic processing
    if (parsedEditingData) {
      // Start background processing with the editing preferences
      processVideoWithPreferences(video._id, parsedEditingData).catch(error => {
        console.error('Error in background video processing:', error);
      });
    }

    // Update user video count (count as 1 video regardless of source files)
    user.videoCount += 1;
    await user.save();

    // Clear video list cache for this user to ensure fresh data on next fetch
    const userId = user._id.toString();
    const allKeys = videoListCache.keys();
    const userKeys = allKeys.filter(key => key.includes(userId));
    
    if (userKeys.length > 0) {
      videoListCache.del(userKeys);
      console.log(`Cleared ${userKeys.length} video cache entries for user ${userId} after upload:`, userKeys);
    } else {
      console.log(`No cache entries found for user ${userId} after upload`);
    }

    res.status(201).json({
      message: parsedEditingData ? 
        (isMultipleFiles ? `${files.length} videos uploaded and merging started` : 'Video uploaded and processing started') :
        (isMultipleFiles ? `${files.length} videos uploaded successfully` : 'Video uploaded successfully'),
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        originalName: video.originalName,
        fileSize: video.fileSize,
        format: video.format,
        status: video.status,
        createdAt: video.createdAt,
        isMultipleFiles: isMultipleFiles,
        sourceFileCount: files.length
      }
    });

    // Deduct credits after successful upload
    await deductCredits(req, res, () => {});
  } catch (error) {
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during video upload' });
  }
});

// Get video thumbnail
router.get('/:id/thumbnail', auth, async (req, res) => {
  try {
    // Allow admins to access any video; regular users only their own
    let video;
    if (req.user && req.user.role === 'admin') {
      video = await Video.findById(req.params.id);
    } else {
      video = await Video.findOne({
        _id: req.params.id,
        owner: req.user._id
      });
    }

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Check if thumbnail exists; attempt regeneration if missing
    if (!video.thumbnailPath || !fs.existsSync(video.thumbnailPath)) {
      try {
        const thumbnailPath = await thumbnailService.generateOptimalThumbnail(video.filePath, video._id);
        await Video.findByIdAndUpdate(video._id, { thumbnailPath });
        video.thumbnailPath = thumbnailPath;
      } catch (error) {
        console.error('Error generating thumbnail on demand:', error);
        return res.status(404).json({ message: 'Thumbnail not available' });
      }
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Stream the thumbnail file
    const thumbnailStream = fs.createReadStream(video.thumbnailPath);
    thumbnailStream.pipe(res);

    thumbnailStream.on('error', (error) => {
      console.error('Thumbnail stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error serving thumbnail' });
      }
    });
  } catch (error) {
    console.error('Get thumbnail error:', error);
    res.status(500).json({ message: 'Server error getting thumbnail' });
  }
});

// Get user's videos
// Initialize NodeCache with 2 minute TTL and check period of 60 seconds
const videoListCache = new NodeCache({ 
  stdTTL: 120, // 2 minutes in seconds
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Don't clone objects for better performance
});

// Add route to manually clear cache for debugging
router.post('/clear-cache', auth, async (req, res) => {
  videoListCache.flushAll();
  res.json({ message: 'Video cache cleared successfully' });
});

// Get all videos for authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Cap at 50
    const skip = (page - 1) * limit;
    const userId = req.user._id.toString();
    
    // Debug logging
    console.log('=== DEBUG: Videos API Route ===');
    console.log('User ID from token:', userId);
    console.log('User object:', req.user);
    console.log('Query params - page:', page, 'limit:', limit, 'skip:', skip);
    
    // Create cache key
    const cacheKey = `${userId}_${page}_${limit}`;
    const cached = videoListCache.get(cacheKey);
    
    if (cached) {
      console.log('Returning cached result');
      return res.json(cached);
    }

    console.log('Querying database with owner:', req.user._id);
    
    // Optimized query with lean() for better performance
    const [videos, total] = await Promise.all([
      Video.find({ owner: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title description filename status duration format thumbnailPath createdAt updatedAt fileSize isPublic')
        .lean(), // Use lean() for better performance
      Video.countDocuments({ owner: req.user._id })
    ]);

    console.log('Query results - videos found:', videos.length, 'total count:', total);
    console.log('Sample videos:', videos.slice(0, 2));

    // Add thumbnail URLs to each video
    const videosWithThumbnails = videos.map(video => ({
      ...video,
      thumbnailUrl: `${req.protocol}://${req.get('host')}/api/videos/${video._id}/thumbnail`
    }));

    const result = {
      videos: videosWithThumbnails,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
    
    console.log('Final result:', result);
    
    // Cache the result with NodeCache (TTL is handled automatically)
    videoListCache.set(cacheKey, result);

    // Set cache-control headers to prevent browser caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json(result);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ message: 'Server error fetching videos' });
  }
});

// Get ready downloads count for notification badge
router.get('/ready-count', auth, async (req, res) => {
  try {
    const count = await Video.countDocuments({ 
      owner: new mongoose.Types.ObjectId(req.user._id), 
      status: 'ready' 
    });
    
    res.json({ count });
  } catch (error) {
    console.error('Get ready count error:', error);
    res.status(500).json({ message: 'Server error getting ready count' });
  }
});

// Get single video
router.get('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    }).select('-filePath');

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json({ video });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ message: 'Server error fetching video' });
  }
});

// Update video
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, isPublic } = req.body;
    
    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (isPublic !== undefined) video.isPublic = isPublic;

    await video.save();

    res.json({
      message: 'Video updated successfully',
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        isPublic: video.isPublic,
        status: video.status,
        updatedAt: video.updatedAt
      }
    });
  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({ message: 'Server error updating video' });
  }
});

// Delete video
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log(`=== DELETE VIDEO REQUEST ===`);
    console.log(`Video ID: ${req.params.id}`);
    console.log(`User ID: ${req.user._id}`);
    console.log(`User object:`, req.user);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log(`Invalid video ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid video ID format' });
    }

    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });

    if (!video) {
      console.log(`Video not found for ID: ${req.params.id}, User: ${req.user._id}`);
      return res.status(404).json({ message: 'Video not found' });
    }

    console.log(`Found video: ${video.title || video.filename || 'Untitled'}`);

    // Clear all cache entries for this user to ensure immediate UI update
    console.log(`Clearing all cache entries for user: ${req.user._id}`);
    
    // Get all cache keys and filter for this user
    const allKeys = videoListCache.keys();
    const userKeys = allKeys.filter(key => key.includes(req.user._id.toString()));
    
    if (userKeys.length > 0) {
      videoListCache.del(userKeys);
      console.log(`Cleared ${userKeys.length} cache entries:`, userKeys);
    } else {
      console.log('No cache entries found for this user');
    }

    // Delete file from filesystem (non-blocking)
    if (video.filePath && fs.existsSync(video.filePath)) {
      try {
        fs.unlinkSync(video.filePath);
        console.log(`Successfully deleted file: ${video.filePath}`);
      } catch (fileError) {
        console.error(`Error deleting file: ${video.filePath}`, fileError.message);
      }
    } else {
      console.log(`File not found or already deleted: ${video.filePath}`);
    }

    // Delete thumbnail if it exists (non-blocking)
    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      try {
        fs.unlinkSync(video.thumbnailPath);
        console.log(`Successfully deleted thumbnail: ${video.thumbnailPath}`);
      } catch (thumbError) {
        console.error(`Error deleting thumbnail: ${video.thumbnailPath}`, thumbError.message);
      }
    } else {
      console.log(`Thumbnail not found or already deleted: ${video.thumbnailPath}`);
    }

    // Delete processed video files if they exist
    if (video.processedPath && fs.existsSync(video.processedPath)) {
      try {
        fs.unlinkSync(video.processedPath);
        console.log(`Successfully deleted processed file: ${video.processedPath}`);
      } catch (processedError) {
        console.error(`Error deleting processed file: ${video.processedPath}`, processedError.message);
      }
    }

    // Delete video record from database
    console.log(`Deleting video record from database...`);
    const deletedVideo = await Video.findByIdAndDelete(video._id);
    if (!deletedVideo) {
      console.error(`Failed to delete video record from database`);
      return res.status(500).json({ message: 'Failed to delete video from database' });
    }
    console.log(`Successfully deleted video record from database`);

    // Update user video count using findByIdAndUpdate to avoid potential issues
    console.log(`Updating user video count...`);
    const User = require('../models/User');
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, 
      { $inc: { videoCount: -1 } },
      { new: true }
    );
    
    if (updatedUser) {
      console.log(`Updated user video count to: ${updatedUser.videoCount}`);
    } else {
      console.error(`Failed to update user video count`);
    }

    // Clear all possible cache variations one more time
    console.log(`Final cache clearing...`);
    videoListCache.flushAll(); // Clear entire cache to be safe
    console.log(`Cleared entire video cache`);

    console.log(`=== DELETE VIDEO SUCCESS ===`);
    res.json({ 
      message: 'Video deleted successfully',
      videoId: req.params.id,
      success: true
    });
  } catch (error) {
    console.error('=== DELETE VIDEO ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Clear cache on error to prevent stale data
    const allKeys = videoListCache.keys();
    const userKeys = allKeys.filter(key => key.includes(req.user._id.toString()));
    if (userKeys.length > 0) {
      videoListCache.del(userKeys);
    }
    
    res.status(500).json({ 
      message: 'Error deleting video',
      error: error.message
    });
  }
});

// Process video for editing
router.post('/:id/process', auth, async (req, res) => {
  try {
    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.status === 'processing') {
      return res.status(400).json({ message: 'Video is already being processed' });
    }

    // Add video processing job to queue
    const editingOptions = req.body.editingOptions || {};
    const job = await addVideoProcessingJob(video._id, req.user._id, {
      priority: editingOptions.priority || 0,
      delay: editingOptions.delay || 0
    });

    // Update video status to queued
    await Video.findByIdAndUpdate(video._id, { 
      status: 'queued',
      queuedAt: new Date(),
      jobId: job.id
    });

    res.json({ 
      message: 'Video processing job added to queue',
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Process video error:', error);
    res.status(500).json({ message: 'Server error processing video' });
  }
});

// Get processing status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const status = await videoEditingService.getProcessingStatus(video._id);
    res.json(status);
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({ message: 'Server error getting status' });
  }
});

// Stream original video for client-side thumbnail generation
router.get('/:id/stream', auth, async (req, res) => {
  try {
    // Allow admins to stream any video; regular users only their own
    let video;
    if (req.user && req.user.role === 'admin') {
      video = await Video.findById(req.params.id);
    } else {
      video = await Video.findOne({
        _id: req.params.id,
        owner: req.user._id
      });
    }

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Try multiple possible file paths
    const uploadsDir = path.join(__dirname, '../uploads/videos');
    let videoPath = null;
    
    // First try the stored filePath
    if (video.filePath && fs.existsSync(video.filePath)) {
      videoPath = video.filePath;
    } 
    // Then try filename in uploads directory
    else if (video.filename) {
      const filenameInUploads = path.join(uploadsDir, video.filename);
      if (fs.existsSync(filenameInUploads)) {
        videoPath = filenameInUploads;
      }
    }
    
    // If still not found, try to find any video file that might match
    if (!videoPath) {
      try {
        const files = fs.readdirSync(uploadsDir);
        // Look for files that might belong to this video (by timestamp proximity)
        const videoCreatedTime = new Date(video.createdAt).getTime();
        const matchingFiles = files.filter(file => {
          if (!file.startsWith('video-')) return false;
          const fileTimestamp = parseInt(file.split('-')[1]);
          // Allow 5 minute difference
          return Math.abs(fileTimestamp - videoCreatedTime) < 300000;
        });
        
        if (matchingFiles.length > 0) {
          videoPath = path.join(uploadsDir, matchingFiles[0]);
        }
      } catch (err) {
        console.error('Error searching for video file:', err);
      }
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      console.log(`Video file not found for ${video._id}. Tried paths:`, {
        storedPath: video.filePath,
        filename: video.filename,
        finalPath: videoPath
      });
      return res.status(404).json({ message: 'Video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Determine correct MIME type based on file extension
    const fileExtension = path.extname(videoPath).toLowerCase();
    let contentType = 'video/mp4'; // default
    
    switch (fileExtension) {
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.mov':
        contentType = 'video/quicktime';
        break;
      case '.avi':
        contentType = 'video/x-msvideo';
        break;
      case '.mkv':
        contentType = 'video/x-matroska';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
      default:
        contentType = 'video/mp4';
    }

    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Video stream error:', error);
    res.status(500).json({ message: 'Server error streaming video' });
  }
});

router.get('/:id/download-processed', auth, async (req, res) => {
  try {
    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (!video.opencutProcessing?.outputPath) {
      return res.status(400).json({ message: 'No processed video available' });
    }

    // Check if processed file exists
    try {
      await fsPromises.access(video.opencutProcessing.outputPath);
    } catch (error) {
      return res.status(404).json({ message: 'Processed video file not found' });
    }

    // Increment download count
    video.downloadCount += 1;
    await video.save();

    // Set headers for download
    const filename = path.basename(video.opencutProcessing.outputPath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');

    // Stream the file
    const fileStream = require('fs').createReadStream(video.opencutProcessing.outputPath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Download stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error downloading file' });
      }
    });

    console.log(`Video downloaded: ${filename} by user ${req.user._id}`);
  } catch (error) {
    console.error('Download processed video error:', error);
    res.status(500).json({ message: 'Server error downloading video' });
  }
});

// Get all videos with OpenCut processing status
router.get('/processed', auth, async (req, res) => {
  try {
    const videos = await Video.find({ 
      owner: new mongoose.Types.ObjectId(req.user._id),
      'opencutProcessing.enabled': true
    })
    .select('-filePath')
    .sort({ createdAt: -1 });

    res.json({ videos });
  } catch (error) {
    console.error('Get processed videos error:', error);
    res.status(500).json({ message: 'Server error fetching processed videos' });
  }
});

// Public share endpoint - get video for sharing (no auth required)
router.get('/share/:id', async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid video ID format' });
    }

    const video = await Video.findOne({ 
      _id: req.params.id, 
      isPublic: true 
    }).populate('owner', 'name');

    if (!video) {
      return res.status(404).json({ message: 'Video not found or not public' });
    }

    // Return video info without sensitive data
    const publicVideoData = {
      _id: video._id,
      title: video.title,
      filename: video.filename,
      size: video.size,
      duration: video.duration,
      status: video.status,
      createdAt: video.createdAt,
      owner: {
        name: video.owner?.name || 'Anonymous'
      }
    };

    res.json(publicVideoData);
  } catch (error) {
    console.error('Get public video error:', error);
    res.status(500).json({ message: 'Server error getting video' });
  }
});

// Get queue statistics (admin/monitoring endpoint)
router.get('/queue/stats', auth, async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({ message: 'Server error getting queue statistics' });
  }
});

// Start OpenCut processing for a video
router.post('/:id/process-opencut', auth, async (req, res) => {
  try {
    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.status !== 'ready') {
      return res.status(400).json({ message: 'Video must be ready before OpenCut processing' });
    }

    // Initialize OpenCut service if not already done
    try {
      await opencutService.initialize();
    } catch (error) {
      console.error('OpenCut initialization failed:', error);
      return res.status(500).json({ message: 'OpenCut service unavailable' });
    }

    // Update video status to editing
    video.status = 'editing';
    video.opencutProcessing = {
      enabled: true,
      status: 'processing',
      processingId: Date.now().toString(),
      progress: 0,
      settings: {
        outputFormat: req.body.outputFormat || 'mp4',
        quality: req.body.quality || 'high',
        includeAudio: req.body.includeAudio !== false
      },
      startedAt: new Date()
    };
    await video.save();

    // Start background processing
    processVideoWithOpenCut(video._id, video.filePath, video.opencutProcessing.settings)
      .catch(error => {
        console.error('Background OpenCut processing failed:', error);
        // Update video status to failed
        Video.findByIdAndUpdate(video._id, {
          status: 'failed',
          'opencutProcessing.status': 'failed',
          'opencutProcessing.error': error.message
        }).catch(console.error);
      });

    res.json({ 
      message: 'OpenCut processing started',
      processingId: video.opencutProcessing.processingId
    });
  } catch (error) {
    console.error('Start OpenCut processing error:', error);
    res.status(500).json({ message: 'Server error starting OpenCut processing' });
  }
});

// Get OpenCut processing status
router.get('/:id/opencut-status', auth, async (req, res) => {
  try {
    const video = await Video.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    }).select('opencutProcessing status');

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json({ 
      status: video.status,
      opencutProcessing: video.opencutProcessing || {
        enabled: false,
        status: 'not_started',
        progress: 0
      }
    });
  } catch (error) {
    console.error('Get OpenCut status error:', error);
    res.status(500).json({ message: 'Server error getting OpenCut status' });
  }
});

// Background processing function
async function processVideoWithOpenCut(videoId, videoPath, settings) {
  try {
    console.log(`Starting OpenCut processing for video ${videoId}`);
    
    // Update progress to 10%
    await Video.findByIdAndUpdate(videoId, {
      'opencutProcessing.progress': 10
    });

    // Ensure temp directory exists
    await fsPromises.mkdir(path.dirname(videoPath), { recursive: true });

    // Update progress to 30%
    await Video.findByIdAndUpdate(videoId, {
      'opencutProcessing.progress': 30
    });

    // Process video with OpenCut
    const result = await opencutService.processVideo(videoPath, settings, async (progress) => {
      // Progress callback to update database during processing
      await Video.findByIdAndUpdate(videoId, {
        'opencutProcessing.progress': Math.min(30 + (progress * 0.6), 90) // 30% to 90%
      });
    });

    // Update progress to 95%
    await Video.findByIdAndUpdate(videoId, {
      'opencutProcessing.progress': 95
    });

    if (result.success) {
      // Update video with completion status
      await Video.findByIdAndUpdate(videoId, {
        status: 'ready',
        'opencutProcessing.status': 'completed',
        'opencutProcessing.progress': 100,
        'opencutProcessing.outputPath': result.outputPath,
        'opencutProcessing.completedAt': new Date()
      });

      console.log(`OpenCut processing completed for video ${videoId}`);
    } else {
      throw new Error('OpenCut processing failed');
    }
  } catch (error) {
    console.error(`OpenCut processing failed for video ${videoId}:`, error);
    
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      'opencutProcessing.status': 'failed',
      'opencutProcessing.error': error.message
    });
  }
}

// Process video with editing preferences from wizard
async function processVideoWithPreferences(videoId, editingData) {
  try {
    console.log(`Starting automatic video processing for ${videoId} with preferences:`, editingData);
    
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    // Check if this is a multiple file video that needs merging
    let videoPath = video.filePath;
    if (video.sourceFiles && video.sourceFiles.length > 1) {
      console.log(`Merging ${video.sourceFiles.length} files for video ${videoId}`);
      
      // Update progress to 5% for merging
      await Video.findByIdAndUpdate(videoId, {
        status: 'processing',
        'opencutProcessing.status': 'processing',
        'opencutProcessing.progress': 5,
        'opencutProcessing.startedAt': new Date()
      });

      // Merge multiple files into one
      const mergedPath = await mergeVideoFiles(video.sourceFiles, videoId);
      videoPath = mergedPath;
      
      // Update the video record with the merged file path
      await Video.findByIdAndUpdate(videoId, {
        filePath: mergedPath,
        'opencutProcessing.progress': 15
      });
    } else {
      // Update status to processing for single file
      await Video.findByIdAndUpdate(videoId, {
        status: 'processing',
        'opencutProcessing.status': 'processing',
        'opencutProcessing.progress': 0,
        'opencutProcessing.startedAt': new Date()
      });
    }

    // Create processing settings based on wizard data
    const settings = {
      videoName: editingData.videoName,
      videoType: editingData.videoType,
      targetAudience: editingData.targetAudience,
      editingStyle: editingData.editingStyle,
      duration: editingData.duration,
      specialRequests: editingData.specialRequests,
      // Map editing style to technical settings
      quality: getQualityFromStyle(editingData.editingStyle),
      effects: getEffectsFromStyle(editingData.editingStyle),
      transitions: getTransitionsFromStyle(editingData.editingStyle),
      music: getMusicFromAudience(editingData.targetAudience),
      pacing: getPacingFromDuration(editingData.duration)
    };

    console.log('Processing settings:', settings);

    // Update progress to 20% (or 10% if no merging was needed)
    const baseProgress = video.sourceFiles && video.sourceFiles.length > 1 ? 20 : 10;
    await Video.findByIdAndUpdate(videoId, {
      'opencutProcessing.progress': baseProgress
    });

    // Start OpenCut processing with the generated settings
    const result = await opencutService.processVideo(videoPath, settings, async (progress) => {
      // Progress callback to update database during processing
      const adjustedProgress = baseProgress + (progress * (90 - baseProgress) / 100);
      await Video.findByIdAndUpdate(videoId, {
        'opencutProcessing.progress': Math.min(adjustedProgress, 90)
      });
    });

    // Update progress to 95%
    await Video.findByIdAndUpdate(videoId, {
      'opencutProcessing.progress': 95
    });

    if (result.success) {
      // Update video with completion status
      await Video.findByIdAndUpdate(videoId, {
        status: 'ready',
        'opencutProcessing.status': 'completed',
        'opencutProcessing.progress': 100,
        'opencutProcessing.outputPath': result.outputPath,
        'opencutProcessing.completedAt': new Date()
      });

      console.log(`Automatic video processing completed for ${videoId}`);
    } else {
      throw new Error('Automatic video processing failed');
    }
  } catch (error) {
    console.error(`Automatic video processing failed for ${videoId}:`, error);
    
    await Video.findByIdAndUpdate(videoId, {
      status: 'failed',
      'opencutProcessing.status': 'failed',
      'opencutProcessing.error': error.message
    });
  }
}

// Helper functions to map wizard choices to technical settings
function getQualityFromStyle(style) {
  const qualityMap = {
    'Dynamic & Energetic': 'high',
    'Smooth & Professional': 'ultra',
    'Cinematic': 'ultra',
    'Social Media Ready': 'medium',
    'Documentary Style': 'high',
    'Minimal & Clean': 'high'
  };
  return qualityMap[style] || 'medium';
}

function getEffectsFromStyle(style) {
  const effectsMap = {
    'Dynamic & Energetic': ['color_boost', 'motion_blur', 'quick_cuts'],
    'Smooth & Professional': ['color_correction', 'stabilization'],
    'Cinematic': ['film_grain', 'color_grading', 'letterbox'],
    'Social Media Ready': ['auto_crop', 'captions', 'trending_effects'],
    'Documentary Style': ['natural_color', 'stabilization'],
    'Minimal & Clean': ['color_correction', 'noise_reduction']
  };
  return effectsMap[style] || ['color_correction'];
}

function getTransitionsFromStyle(style) {
  const transitionsMap = {
    'Dynamic & Energetic': 'fast_cuts',
    'Smooth & Professional': 'smooth_fade',
    'Cinematic': 'cinematic_wipe',
    'Social Media Ready': 'trendy_transitions',
    'Documentary Style': 'simple_cut',
    'Minimal & Clean': 'fade'
  };
  return transitionsMap[style] || 'fade';
}

function getMusicFromAudience(audience) {
  const musicMap = {
    'Young Adults (18-30)': 'upbeat_modern',
    'Adults (30-50)': 'contemporary_professional',
    'Seniors (50+)': 'classic_gentle',
    'Families': 'family_friendly',
    'Professionals': 'corporate_ambient',
    'Students': 'energetic_focus',
    'General Public': 'universal_appeal',
    'Specific Niche': 'custom_match'
  };
  return musicMap[audience] || 'universal_appeal';
}

function getPacingFromDuration(duration) {
  const pacingMap = {
    '15-30 seconds': 'very_fast',
    '30-60 seconds': 'fast',
    '1-2 minutes': 'medium_fast',
    '2-5 minutes': 'medium',
    '5-10 minutes': 'slow',
    '10+ minutes': 'very_slow',
    'Keep original': 'original',
    'Let AI decide': 'auto'
  };
  return pacingMap[duration] || 'medium';
}

// Merge multiple video files into one
async function mergeVideoFiles(sourceFiles, videoId) {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = path.join(__dirname, '../uploads/merged');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, `merged-${videoId}-${Date.now()}.mp4`);
      const command = ffmpeg();

      // Add all source files to the command
      sourceFiles.forEach(file => {
        command.input(file.filePath);
      });

      // Configure output settings
      command
        .outputOptions([
          '-filter_complex',
          `concat=n=${sourceFiles.length}:v=1:a=1[outv][outa]`,
          '-map', '[outv]',
          '-map', '[outa]',
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-preset', 'medium',
          '-crf', '23'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log(`Starting video merge for ${videoId}: ${commandLine}`);
        })
        .on('progress', (progress) => {
          console.log(`Merge progress for ${videoId}: ${progress.percent}%`);
        })
        .on('end', () => {
          console.log(`Video merge completed for ${videoId}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error(`Video merge failed for ${videoId}:`, error);
          reject(error);
        })
        .run();
    } catch (error) {
      console.error(`Error setting up video merge for ${videoId}:`, error);
      reject(error);
    }
  });
}

module.exports = router;