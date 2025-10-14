const { MongoClient, ObjectId } = require('mongodb');
const uri = 'mongodb://localhost:27017/buzz-smile-saas';

async function fixVideoOwnership() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  
  // Find Jack Ryan user
  const jackUser = await db.collection('users').findOne({ email: 'jack@buzzsmile.com' });
  if (!jackUser) {
    console.log('Jack user not found');
    return;
  }
  
  console.log('Jack user ID:', jackUser._id);
  
  // Update all videos to belong to Jack
  const result = await db.collection('videos').updateMany(
    {},
    { $set: { owner: jackUser._id } }
  );
  
  console.log('Updated videos:', result.modifiedCount);
  
  // Verify the update
  const videos = await db.collection('videos').find({}).toArray();
  console.log('All videos now:');
  videos.forEach(video => {
    console.log({
      id: video._id,
      title: video.title,
      owner: video.owner
    });
  });
  
  await client.close();
}

fixVideoOwnership().catch(console.error);