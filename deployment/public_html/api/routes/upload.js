const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/logos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const logoFileFilter = (req, file, cb) => {
  // Accept image files only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for logos!'), false);
  }
};

const logoUpload = multer({
  storage: logoStorage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for logos
  }
});

// Upload logo route (protected)
router.post('/logo', auth, logoUpload.single('logo'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: 'No logo file uploaded'
      });
    }

    // Find user and update logo field
    const user = await User.findById(req.userId);
    
    if (!user) {
      // Clean up uploaded file if user not found
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Delete old logo file if it exists
    if (user.logo) {
      const oldLogoPath = path.join(__dirname, '..', user.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Update user with new logo path (relative to server root)
    const logoPath = `uploads/logos/${req.file.filename}`;
    user.logo = logoPath;
    await user.save();

    res.json({
      message: 'Logo uploaded successfully',
      logoUrl: `/api/uploads/logos/${req.file.filename}`,
      logoPath: logoPath
    });

  } catch (error) {
    console.error('Logo upload error:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'Logo file too large. Maximum size is 5MB.'
      });
    }

    res.status(500).json({
      message: 'Server error during logo upload'
    });
  }
});

// Serve uploaded logo files
router.get('/logos/:filename', (req, res) => {
  const filename = req.params.filename;
  const logoPath = path.join(__dirname, '..', 'uploads', 'logos', filename);
  
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    res.status(404).json({
      message: 'Logo file not found'
    });
  }
});

module.exports = router;