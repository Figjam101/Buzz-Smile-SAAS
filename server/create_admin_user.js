const mongoose = require('mongoose');
const User = require('./models/User');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const createAdminUser = async () => {
  try {
    await connectDB();
    
    // Admin user details
    const adminData = {
      email: 'npkalyx@gmail.com',
      password: 'NpkTemp!2025#Sm1le',
      name: 'Admin User',
      role: 'admin',
      
      // GOD MODE subscription
      subscription: {
        plan: 'god',
        videosProcessed: 0,
        monthlyLimit: 999999 // Unlimited videos
      },
      
      // Legacy fields for backward compatibility
      plan: 'god',
      videoCount: 0,
      maxVideos: 999999,
      
      // 2GB storage limit
      storageLimit: 2 * 1024 * 1024 * 1024, // 2GB in bytes
      storageUsed: 0,
      
      // Credits
      credits: {
        balance: 999999, // Unlimited credits
        used: 0,
        lastReset: new Date()
      },
      
      isActive: true,
      isPreLaunch: false
    };
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${existingAdmin.email}`);
      
      // Update existing admin with GOD MODE privileges
      const updates = {
        role: 'admin',
        'subscription.plan': 'god',
        'subscription.monthlyLimit': 999999,
        plan: 'god',
        maxVideos: 999999,
        storageLimit: 2 * 1024 * 1024 * 1024,
        'credits.balance': 999999
      };
      
      const updatedUser = await User.findByIdAndUpdate(
        existingAdmin._id,
        { $set: updates },
        { new: true }
      );
      
      console.log('\n🎉 Existing admin user updated with GOD MODE privileges!');
      console.log(`✅ Email: ${updatedUser.email}`);
      console.log(`✅ Role: ${updatedUser.role}`);
      console.log(`✅ Plan: ${updatedUser.subscription.plan}`);
      console.log(`✅ Video Limit: UNLIMITED`);
      console.log(`✅ Storage Limit: 2.00 GB`);
      console.log(`✅ GOD MODE: ACTIVATED 🔥`);
      
    } else {
      // Create new admin user
      const newAdmin = new User(adminData);
      await newAdmin.save();
      
      console.log('\n🎉 New admin user created with GOD MODE privileges!');
      console.log(`✅ Email: ${newAdmin.email}`);
      console.log(`✅ Password: NpkTemp!2025#Sm1le`);
      console.log(`✅ Role: ${newAdmin.role}`);
      console.log(`✅ Plan: ${newAdmin.subscription.plan}`);
      console.log(`✅ Video Limit: UNLIMITED`);
      console.log(`✅ Storage Limit: 2.00 GB`);
      console.log(`✅ GOD MODE: ACTIVATED 🔥`);
    }
    
  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
};

// Run the script
createAdminUser();