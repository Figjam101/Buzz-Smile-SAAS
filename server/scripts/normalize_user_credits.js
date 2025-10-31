const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './.env' });

async function normalizeUserCredits() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/buzz-smile-saas';
  console.log(`Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);
  try {
    const users = await User.find({});
    let fixedCount = 0;

    for (const user of users) {
      let changed = false;

      // Ensure credits object exists
      if (!user.credits || typeof user.credits !== 'object') {
        user.credits = { balance: 45, used: 0, lastReset: new Date() };
        changed = true;
      } else {
        // Normalize balance
        if (typeof user.credits.balance !== 'number' || !Number.isFinite(user.credits.balance)) {
          user.credits.balance = 45;
          changed = true;
        }
        // Normalize used
        if (typeof user.credits.used !== 'number' || !Number.isFinite(user.credits.used)) {
          user.credits.used = 0;
          changed = true;
        }
        // Normalize lastReset to Date
        const lr = user.credits.lastReset;
        if (!(lr instanceof Date)) {
          // If it's a number or string, try casting
          if (typeof lr === 'number') {
            // Interpret as ms since epoch if large, otherwise treat as now
            user.credits.lastReset = lr > 100000000 ? new Date(lr) : new Date();
          } else if (typeof lr === 'string') {
            const parsed = new Date(lr);
            user.credits.lastReset = isNaN(parsed.getTime()) ? new Date() : parsed;
          } else {
            user.credits.lastReset = new Date();
          }
          changed = true;
        }
      }

      // Ensure subscription exists with defaults to avoid downstream errors
      if (!user.subscription || typeof user.subscription !== 'object') {
        user.subscription = { plan: user.plan || 'free', videosProcessed: user.videoCount || 0, monthlyLimit: user.maxVideos || 5 };
        changed = true;
      } else {
        if (!['free', 'basic', 'premium', 'god'].includes(user.subscription.plan)) {
          user.subscription.plan = user.plan || 'free';
          changed = true;
        }
        if (typeof user.subscription.videosProcessed !== 'number') {
          user.subscription.videosProcessed = user.videoCount || 0;
          changed = true;
        }
        if (typeof user.subscription.monthlyLimit !== 'number') {
          user.subscription.monthlyLimit = user.maxVideos || 5;
          changed = true;
        }
      }

      if (changed) {
        await user.save();
        fixedCount++;
        console.log(`✔ Normalized credits/subscription for user ${user.email}`);
      }
    }

    console.log(`Done. Fixed ${fixedCount} user records.`);
  } catch (err) {
    console.error('Normalization error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

normalizeUserCredits();