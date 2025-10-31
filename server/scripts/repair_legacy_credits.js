const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function repairLegacyCredits() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/buzz-smile-saas';
  console.log(`Connecting to MongoDB: ${uri}`);
  await mongoose.connect(uri);
  try {
    const usersCol = mongoose.connection.collection('users');

    // Fix records where credits is a number (legacy)
    const numberTypes = ['int', 'long', 'double', 'decimal'];
    let fixed = 0;

    // Unfortunately $type with string aliases varies by server version; do multiple passes
    const typeCodes = [1, 16, 18, 19]; // double, int, long, decimal
    for (const code of typeCodes) {
      const res = await usersCol.updateMany(
        { credits: { $type: code } },
        { $set: { credits: { balance: 45, used: 0, lastReset: new Date() } } }
      );
      if (res.modifiedCount) {
        fixed += res.modifiedCount;
        console.log(`✔ Converted ${res.modifiedCount} users with credits type code ${code} to object`);
      }
    }

    // Fix records where credits is missing entirely
    const resMissing = await usersCol.updateMany(
      { $or: [{ credits: { $exists: false } }, { credits: null }] },
      { $set: { credits: { balance: 45, used: 0, lastReset: new Date() } } }
    );
    if (resMissing.modifiedCount) {
      fixed += resMissing.modifiedCount;
      console.log(`✔ Added credits object to ${resMissing.modifiedCount} users missing credits`);
    }

    console.log(`Done. Updated ${fixed} users.`);
  } catch (err) {
    console.error('Repair error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

repairLegacyCredits();