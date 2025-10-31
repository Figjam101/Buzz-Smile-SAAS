const mongoose = require('mongoose');
const User = require('./models/User');

(async () => {
  try {
    const email = process.env.NEW_USER_EMAIL || process.argv[2];
    const password = process.env.NEW_USER_PASSWORD || process.argv[3] || 'temppass123';
    const name = process.env.NEW_USER_NAME || 'Admin User';
    const role = process.env.NEW_USER_ROLE || 'admin';

    if (!email) {
      console.error('❌ Missing email. Set NEW_USER_EMAIL env or pass as first arg.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');
    console.log('✅ Connected to MongoDB');

    let user = await User.findOne({ email });
    if (user) {
      // Update password and role if user exists
      user.password = password; // Will be hashed by pre-save middleware
      user.role = role;
      if (name) user.name = name;
      await user.save();
      console.log(`\n🎉 Existing user updated!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`🧭 Role: ${role}`);
    } else {
      // Create new user
      user = new User({
        email,
        password, // Will be hashed by pre-save middleware
        name,
        role,
        onboardingCompleted: true,
      });
      await user.save();
      console.log(`\n✅ New user created successfully!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`🧭 Role: ${role}`);
      console.log(`🆔 User ID: ${user._id}`);
    }
  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
})();