const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to:', mongoose.connection.db.databaseName);

    const user = await User.findOne({ email: 'npkalyx@gmail.com' });
    if (!user) {
      console.log('NOT_FOUND');
      process.exit(1);
    }

    const ok = await bcrypt.compare('temppass123', user.password);
    console.log('COMPARE_RESULT:', ok);
    console.log('IS_ACTIVE:', user.isActive);
    console.log('PROVIDER:', user.provider);
    process.exit(0);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
})();