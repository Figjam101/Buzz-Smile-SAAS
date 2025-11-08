const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads/logos directory exists
const logosDir = path.join(__dirname, '../uploads/logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Multer storage for logos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, logosDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${safeBase}-${Date.now()}${ext}`);
  }
});

// File filter for images
const fileFilter = function (req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type. Only JPEG, PNG, GIF, or WebP are allowed.'));
};

const uploadLogo = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter
}).single('logo');

// POST /api/uploads/logo
router.post('/logo', auth, (req, res) => {
  uploadLogo(req, res, (err) => {
    if (err) {
      const msg = err.message || 'Upload error';
      if (msg.includes('File too large')) {
        return res.status(400).json({ message: 'Logo file size must be less than 20MB' });
      }
      return res.status(400).json({ message: msg });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No logo file provided' });
    }

    // Return relative path; client will prefix with API base URL
    const relativePath = `/uploads/logos/${req.file.filename}`;
    res.json({
      message: 'Logo uploaded successfully',
      logoUrl: relativePath
    });
  });
});

module.exports = router;