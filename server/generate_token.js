const jwt = require('jsonwebtoken');

// Use the correct user ID that owns the test videos
const userId = '68e1d9b7ac9f2ce657353d60';
const secret = 'your_super_secret_jwt_key_change_in_production';

const token = jwt.sign(
  { userId: userId },
  secret,
  { expiresIn: '7d' }
);

console.log('Generated JWT token:');
console.log(token);