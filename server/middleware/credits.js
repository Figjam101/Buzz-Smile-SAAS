const User = require('../models/User');

// Middleware to check if user has enough credits
const checkCredits = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Skip credit check for god plan users or pre-launch users
    if (user.subscription?.plan === 'god' || user.isPreLaunch) {
      return next();
    }

    // Check if user has credits
    if (user.credits.balance <= 0) {
      return res.status(403).json({ 
        error: 'Insufficient credits',
        message: 'You need more credits to process videos. Please purchase more credits or upgrade your plan.'
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
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Skip credit deduction for god plan users or pre-launch users
    if (user.subscription?.plan === 'god' || user.isPreLaunch) {
      return next();
    }

    // Deduct 1 credit per video processed
    const videosProcessed = req.files ? req.files.length : 1;
    
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'credits.balance': -videosProcessed,
        'credits.used': videosProcessed
      }
    });

    console.log(`Deducted ${videosProcessed} credits from user ${user.email}`);
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