const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const uri = 'mongodb://localhost:27017/buzz-smile-saas';

async function createAdminUser() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  // Check if user already exists
  const existingUser = await db.collection('users').findOne({ email: 'npkalyx@gmail.com' });
  if (existingUser) {
    console.log('Admin user already exists:', existingUser._id);
    await client.close();
    return;
  }
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = {
    email: 'npkalyx@gmail.com',
    password: hashedPassword,
    name: 'Admin User',
    businessName: 'Buzz Smile Media',
    plan: 'enterprise',
    role: 'admin',
    videoCount: 0,
    maxVideos: 1000,
    credits: 10000,
    createdAt: new Date(),
    lastLogin: new Date(),
    profilePicture: null,
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: '',
      youtube: '',
      linkedin: '',
      tiktok: ''
    }
  };
  
  const result = await db.collection('users').insertOne(adminUser);
  console.log('Created admin user with ID:', result.insertedId);
  
  // Update all videos to belong to this admin user
  const videoUpdate = await db.collection('videos').updateMany(
    {},
    { $set: { owner: result.insertedId } }
  );
  
  console.log('Updated', videoUpdate.modifiedCount, 'videos to belong to admin');
  
  await client.close();
}

createAdminUser().catch(console.error);