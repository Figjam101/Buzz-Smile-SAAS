const mongoose = require('mongoose');

async function checkDatabase() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB and wait for connection
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fresh-video-saas');
    
    const db = mongoose.connection.db;
    console.log(`✅ Connected to database: ${db.databaseName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Found ${collections.length} collections:`);
    
    for (const collection of collections) {
      console.log(`- ${collection.name}`);
      
      // Count documents in each collection
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  Documents: ${count}`);
      
      if (count > 0 && (collection.name.includes('video') || collection.name.includes('user'))) {
        // Show sample documents
        const samples = await db.collection(collection.name).find({}).limit(2).toArray();
        console.log(`  Sample documents:`);
        samples.forEach((doc, index) => {
          console.log(`    ${index + 1}: ID=${doc._id}, ${JSON.stringify(doc).substring(0, 150)}...`);
        });
      }
    }
    
    console.log('\n✅ Database check complete!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDatabase();
