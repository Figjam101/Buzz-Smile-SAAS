const User = require('../models/User');
const Video = require('../models/Video');
const OFFLINE_MODE = process.env.ALLOW_SERVER_WITHOUT_DB === 'true' && process.env.NODE_ENV !== 'production';

// Middleware to check if user has enough credits
const checkCredits = async (req, res, next) => {
  try {
    if (OFFLINE_MODE) {
      return next();
    }
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Skip credit check for god plan users or pre-launch users
    if (user.subscription?.plan === 'god' || user.isPreLaunch) {
      return next();
    }

    // Compute required credits based on uploaded files and editing options
    let baseCredits = 1;
    try {
      const multipleFilesFlag = req.body?.multipleFiles === 'true' || req.body?.multipleFiles === true;
      if (Array.isArray(req.files) && req.files.length > 0) {
        baseCredits = multipleFilesFlag ? 1 : req.files.length;
      }
    } catch (_) {}

    let extraCredits = 0;
    try {
      // Prefer parsing from request body if present
      const raw = req.body?.editingData;
      let parsed = {};
      if (raw) {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
      }
      // If not available on body (e.g., /:id/process), read from video.editingPreferences
      if ((!parsed || Object.keys(parsed).length === 0) && req.params?.id) {
        const video = await Video.findById(req.params.id);
        if (video && video.editingPreferences) {
          parsed = video.editingPreferences;
        }
      }

      const isStory = Boolean(parsed?.storyMode || parsed?.isStory);
      const estExtra = typeof parsed?.estimatedExtraCredits === 'number' ? parsed.estimatedExtraCredits : (isStory ? 1 : 0);
      extraCredits = isStory ? estExtra : 0;
    } catch (_) {}

    const requiredCredits = baseCredits + extraCredits;

    if (user.credits.balance < requiredCredits) {
      // If files were already uploaded, clean them up
      if (Array.isArray(req.files)) {
        try {
          for (const f of req.files) {
            if (f?.path) {
              const fs = require('fs');
              if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
            }
          }
        } catch (cleanupErr) {
          console.error('Credit check cleanup error:', cleanupErr);
        }
      }
      return res.status(403).json({
        error: 'Insufficient credits',
        message: `You need ${requiredCredits} credits for this operation, but have ${user.credits.balance}. Please purchase more credits or upgrade your plan.`,
        required: requiredCredits,
        balance: user.credits.balance
      });
    }

    next();
  } catch (error) {
    console.error('Credit check error:', error);
    res.status(500).json({ error: 'Internal server error during credit check' });
  }
};

// Middleware to deduct credits after successful video processing
const deductCredits = async (req, res, next) => {
  try {
    if (OFFLINE_MODE) {
      return next();
    }
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Skip credit deduction for god plan users or pre-launch users
    if (user.subscription?.plan === 'god' || user.isPreLaunch) {
      return next();
    }

    // Compute deduction based on processing request (base 1) and editing options
    let baseCredits = 1;
    try {
      const multipleFilesFlag = req.body?.multipleFiles === 'true' || req.body?.multipleFiles === true;
      if (Array.isArray(req.files) && req.files.length > 0) {
        baseCredits = multipleFilesFlag ? 1 : req.files.length;
      }
    } catch (_) {}

    let extraCredits = 0;
    try {
      const raw = req.body?.editingData;
      let parsed = {};
      if (raw) {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
      }
      if ((!parsed || Object.keys(parsed).length === 0) && req.params?.id) {
        const video = await Video.findById(req.params.id);
        if (video && video.editingPreferences) {
          parsed = video.editingPreferences;
        }
      }
      const isStory = Boolean(parsed?.storyMode || parsed?.isStory);
      const estExtra = typeof parsed?.estimatedExtraCredits === 'number' ? parsed.estimatedExtraCredits : (isStory ? 1 : 0);
      extraCredits = isStory ? estExtra : 0;
    } catch (_) {}

    const totalDeduction = baseCredits + extraCredits;

    await User.findByIdAndUpdate(userId, {
      $inc: {
        'credits.balance': -totalDeduction,
        'credits.used': totalDeduction
      }
    });

    console.log(`Deducted ${totalDeduction} credits from user ${user.email}`);
    next();
  } catch (error) {
    console.error('Credit deduction error:', error);
    // Don't fail the request if credit deduction fails, just log it
    next();
  }
};

// Function to set user to post-launch and assign initial credits
const setPostLaunch = async (userId, initialCredits = 45) => {
  try {
    await User.findByIdAndUpdate(userId, {
      isPreLaunch: false,
      'credits.balance': initialCredits,
      'credits.lastReset': new Date()
    });
    console.log(`User ${userId} set to post-launch with ${initialCredits} credits`);
  } catch (error) {
    console.error('Error setting post-launch status:', error);
    throw error;
  }
};

// Function to add credits to a user
const addCredits = async (userId, amount) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $inc: { 'credits.balance': amount }
    });
    console.log(`Added ${amount} credits to user ${userId}`);
  } catch (error) {
    console.error('Error adding credits:', error);
    throw error;
  }
};

module.exports = {
  checkCredits,
  deductCredits,
  setPostLaunch,
  addCredits
};