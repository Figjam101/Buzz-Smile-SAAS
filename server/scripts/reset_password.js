const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');

async function main() {
  try {
    const args = process.argv.slice(2);
    const emailArg = args.find(a => a.startsWith('--email='));
    const passArg = args.find(a => a.startsWith('--password='));
    const email = emailArg ? emailArg.split('=')[1] : null;
    const newPassword = passArg ? passArg.split('=')[1] : crypto.randomBytes(9).toString('base64');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not set in environment');
    }
    if (!email) {
      throw new Error('Provide --email=<address>');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.findOne({ email });
    if (!user) {
      console.log('NOT_FOUND');
      process.exit(1);
    }

    user.password = newPassword;
    user.provider = 'local';
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(JSON.stringify({ status: 'RESET_OK', email, tempPassword: newPassword }));
    process.exit(0);
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch {}
  }
}

main();