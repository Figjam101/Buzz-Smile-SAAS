const mongoose = require('mongoose');
const User = require('./models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/buzz-smile-saas', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkUsers = async () => {
  try {
    await connectDB();
    
    // Find all users
    const users = await User.find({}, 'email name role subscription plan maxVideos').sort({ createdAt: -1 });
    
    console.log(`📋 Found ${users.length} users in database:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No Name'}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Role: ${user.role || 'user'}`);
      console.log(`   📦 Plan: ${user.subscription?.plan || user.plan || 'free'}`);
      console.log(`   🎬 Max Videos: ${user.subscription?.monthlyLimit || user.maxVideos || 5}`);
      console.log('');
    });
    
    // Look for admin users
    const adminUsers = await User.find({ role: 'admin' });
    if (adminUsers.length > 0) {
      console.log('🔑 Admin users found:');
      adminUsers.forEach(admin => {
        console.log(`   - ${admin.name} (${admin.email})`);
      });
    } else {
      console.log('⚠️  No admin users found');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
};

// Run the script
checkUsers();