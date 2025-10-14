const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/buzz-smile-saas', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const updateAdminPrivileges = async () => {
  try {
    await connectDB();
    
    // Find user by Jack Ryan's email (the current logged-in user)
    const adminEmail = 'npkalyx@gmail.com';
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log(`❌ User with email ${adminEmail} not found`);
      console.log('Available users:');
      const allUsers = await User.find({}, 'email name');
      allUsers.forEach(user => {
        console.log(`  - ${user.name} (${user.email})`);
      });
      process.exit(1);
    }
    
    console.log(`📋 Found user: ${adminUser.name} (${adminUser.email})`);
    console.log(`📊 Current plan: ${adminUser.subscription?.plan || adminUser.plan}`);
    console.log(`📊 Current video limit: ${adminUser.subscription?.monthlyLimit || adminUser.maxVideos}`);
    console.log(`📊 Current role: ${adminUser.role || 'user'}`);
    
    // Update admin privileges
    const updates = {
      // Set role to admin
      role: 'admin',
      
      // Update subscription plan to 'god'
      'subscription.plan': 'god',
      'subscription.monthlyLimit': 999999, // Unlimited videos
      
      // Legacy fields for backward compatibility
      plan: 'god',
      maxVideos: 999999,
      
      // Set storage limit to 2GB (in bytes)
      storageLimit: 2 * 1024 * 1024 * 1024, // 2GB in bytes
      storageUsed: adminUser.storageUsed || 0
    };
    
    const updatedUser = await User.findByIdAndUpdate(
      adminUser._id,
      { $set: updates },
      { new: true }
    );
    
    console.log('\n🎉 Admin privileges updated successfully!');
    console.log(`✅ Role: ${updatedUser.role}`);
    console.log(`✅ Plan: ${updatedUser.subscription.plan}`);
    console.log(`✅ Video Limit: ${updatedUser.subscription.monthlyLimit === 999999 ? 'UNLIMITED' : updatedUser.subscription.monthlyLimit}`);
    console.log(`✅ Storage Limit: ${(updatedUser.storageLimit / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    console.log(`✅ GOD MODE: ACTIVATED 🔥`);
    
  } catch (error) {
    console.error('❌ Error updating admin privileges:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
};

// Run the script
updateAdminPrivileges();