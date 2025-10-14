const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function createSimpleBackup() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create backup directory
    const backupDir = path.join(__dirname, 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(backupDir, backupName);
    await fs.mkdir(backupPath, { recursive: true });

    console.log(`📦 Creating backup: ${backupName}`);

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};

    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`📄 Exporting collection: ${collectionName}`);
      
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      backupData[collectionName] = data;
    }

    // Write database backup
    const dbBackupFile = path.join(backupPath, 'database-backup.json');
    await fs.writeFile(dbBackupFile, JSON.stringify(backupData, null, 2));

    // Create backup manifest
    const manifest = {
      version: '1.0.0',
      type: 'database-backup',
      created: new Date().toISOString(),
      collections: Object.keys(backupData),
      totalRecords: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0)
    };

    const manifestFile = path.join(backupPath, 'backup-manifest.json');
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));

    console.log(`✅ Backup created successfully: ${backupName}`);
    console.log(`📁 Location: ${backupPath}`);
    console.log(`📊 Collections: ${manifest.collections.length}`);
    console.log(`📈 Total records: ${manifest.totalRecords}`);

    await mongoose.disconnect();
    return { success: true, backupName, path: backupPath };

  } catch (error) {
    console.error('❌ Backup failed:', error);
    await mongoose.disconnect();
    return { success: false, error: error.message };
  }
}

// Run the backup
createSimpleBackup().then(result => {
  if (result.success) {
    console.log('🎉 Backup completed successfully!');
  } else {
    console.log('💥 Backup failed:', result.error);
  }
  process.exit(0);
});