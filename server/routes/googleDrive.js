const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { getAuthUrl, createOAuthClient, listFiles, uploadFile } = require('../services/googleDriveService');

const router = express.Router();

// Start Google Drive OAuth flow
router.get('/auth', auth, async (req, res) => {
  try {
    // Pass JWT in state so callback can identify user without header auth
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token || '';
    const url = getAuthUrl(token ? Buffer.from(JSON.stringify({ token })).toString('base64') : undefined);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: 'Google Drive auth not configured', error: err.message });
  }
});

// OAuth callback to store tokens
router.get('/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).json({ message: 'Missing code' });

    // Recover token from state if present
    const state = req.query.state;
    let user = null;
    if (state) {
      try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(parsed.token, process.env.JWT_SECRET);
        user = await User.findById(decoded.userId);
      } catch (e) {}
    }

    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!user && req.user?._id) {
      user = await User.findById(req.user._id);
    }
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    user.integrations = user.integrations || {};
    user.integrations.googleDrive = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || user?.integrations?.googleDrive?.refreshToken || '',
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      folderId: user?.integrations?.googleDrive?.folderId || ''
    };
    await user.save();

    res.redirect((process.env.CLIENT_URL || 'http://localhost:3000') + '/integrations/google-drive/connected');
  } catch (err) {
    console.error('Google Drive callback error:', err);
    res.status(500).json({ message: 'Failed to connect Google Drive', error: err.message });
  }
});

// List files in Drive
router.get('/files', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const files = await listFiles(user, Number(req.query.pageSize) || 10);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list files', error: err.message });
  }
});

// Upload a file to Drive
const upload = multer({ dest: path.join(__dirname, '../uploads') });
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const user = await User.findById(req.user._id);
    const result = await uploadFile(user, req.file.path, req.file.originalname, req.file.mimetype);

    // cleanup temp file
    fs.unlink(req.file.path, () => {});

    res.json({ file: result });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

module.exports = router;