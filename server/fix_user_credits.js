const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: './.env' });

async function fixUserCredits() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');
    console.log('Connected to MongoDB');

    // Find the test user
    const user = await User.findOne({ email: 'test@example.com' });
    if (!user) {
      console.log('Test user not found!');
      return;
    }

    console.log('Current user credits:', user.credits);

    // Update user credits and set as pre-launch for unlimited uploads
    await User.findByIdAndUpdate(user._id, {
      'credits.balance': 100,
      'credits.used': 0,
      'credits.lastReset': new Date(),
      isPreLaunch: true, // This bypasses credit checks
      'subscription.plan': 'god' // God plan also bypasses credit checks
    });

    console.log('✅ User credits fixed successfully!');
    console.log('📧 Email: test@example.com');
    console.log('💰 Credits: 100');
    console.log('🚀 Pre-launch status: true (unlimited uploads)');
    console.log('👑 Plan: god (unlimited uploads)');

    // Verify the update
    const updatedUser = await User.findById(user._id);
    console.log('Updated user credits:', updatedUser.credits);
    console.log('Pre-launch status:', updatedUser.isPreLaunch);
    console.log('Subscription plan:', updatedUser.subscription?.plan);

  } catch (error) {
    console.error('❌ Error fixing user credits:', error.message);
    console.log('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

fixUserCredits();