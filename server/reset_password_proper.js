const mongoose = require('mongoose');
const User = require('./models/User');

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/fresh-video-saas');
    console.log('Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('Found user:', user.name, user.email);

    // Set new password (this will trigger the pre-save middleware to hash it)
    user.password = 'temppass123';
    await user.save();

    console.log('Password reset successfully for', user.email);
    console.log('New password: temppass123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

resetPassword();