const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/buzz-smile-saas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkUser() {
  try {
    const userId = '68e1d9b7ac9f2ce657353d60';
    const user = await User.findById(userId);
    
    if (user) {
      console.log('User found:');
      console.log('ID:', user._id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
    } else {
      console.log('User not found with ID:', userId);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkUser();
