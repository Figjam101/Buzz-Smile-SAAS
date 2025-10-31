const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const SocialAccount = require('../models/SocialAccount');
const ScheduledPost = require('../models/ScheduledPost');

// Get connected social media accounts
router.get('/accounts', auth, async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ userId: req.user.id });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
});

// Connect social media account
router.post('/connect/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    
    // Generate OAuth URL based on platform
    let authUrl;
    switch (platform) {
      case 'instagram':
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
        break;
      case 'facebook':
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&scope=pages_manage_posts,pages_read_engagement&response_type=code`;
        break;
      case 'twitter':
        authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${process.env.TWITTER_REDIRECT_URI}&scope=tweet.read%20tweet.write%20users.read&state=${req.user.id}`;
        break;
      case 'youtube':
        authUrl = `https://accounts.google.com/oauth2/auth?client_id=${process.env.YOUTUBE_CLIENT_ID}&redirect_uri=${process.env.YOUTUBE_REDIRECT_URI}&scope=https://www.googleapis.com/auth/youtube.upload&response_type=code&access_type=offline`;
        break;
      default:
        return res.status(400).json({ error: 'Unsupported platform' });
    }
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Handle OAuth callback
router.post('/callback/:platform', auth, async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, username } = req.body;
    
    // Exchange code for access token (implementation depends on platform)
    // This is a simplified version - in production, you'd implement proper OAuth flow
    
    const socialAccount = new SocialAccount({
      userId: req.user.id,
      platform,
      username: username || `${platform}_user`,
      accessToken: 'dummy_token', // In production, exchange code for real token
      refreshToken: 'dummy_refresh_token',
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
    });
    
    await socialAccount.save();
    res.json({ success: true, account: socialAccount });
  } catch (error) {
    console.error('Error saving social account:', error);
    res.status(500).json({ error: 'Failed to connect account' });
  }
});

// Disconnect social media account
router.delete('/accounts/:accountId', auth, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await SocialAccount.findOne({
      _id: accountId,
      userId: req.user.id
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    await SocialAccount.findByIdAndDelete(accountId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

// Schedule a post
router.post('/schedule', auth, async (req, res) => {
  try {
    const { videoId, platforms, scheduledAt, caption, video } = req.body;
    
    // Validate that user has connected accounts for selected platforms
    const connectedAccounts = await SocialAccount.find({
      userId: req.user.id,
      platform: { $in: platforms }
    });
    
    const connectedPlatforms = connectedAccounts.map(acc => acc.platform);
    const missingPlatforms = platforms.filter(p => !connectedPlatforms.includes(p));
    
    if (missingPlatforms.length > 0) {
      return res.status(400).json({ 
        error: `Please connect accounts for: ${missingPlatforms.join(', ')}` 
      });
    }
    
    const scheduledPost = new ScheduledPost({
      userId: req.user.id,
      videoId,
      platforms,
      scheduledAt: new Date(scheduledAt),
      caption,
      video,
      status: 'scheduled'
    });
    
    await scheduledPost.save();
    
    // In production, you'd set up a job queue to post at the scheduled time
    console.log('Post scheduled:', scheduledPost);
    
    res.json({ success: true, post: scheduledPost });
  } catch (error) {
    console.error('Error scheduling post:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Get scheduled posts
router.get('/scheduled', auth, async (req, res) => {
  try {
    const { start, end } = req.query;
    
    const query = { userId: req.user.id };
    if (start && end) {
      query.scheduledAt = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }
    
    const posts = await ScheduledPost.find(query).sort({ scheduledAt: 1 });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled posts' });
  }
});

// Delete scheduled post
router.delete('/scheduled/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await ScheduledPost.findOne({
      _id: postId,
      userId: req.user.id
    });
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    await ScheduledPost.findByIdAndDelete(postId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Update scheduled post
router.put('/scheduled/:postId', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const updates = req.body;
    
    const post = await ScheduledPost.findOneAndUpdate(
      { _id: postId, userId: req.user.id },
      updates,
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ success: true, post });
  } catch (error) {
    console.error('Error updating scheduled post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

module.exports = router;