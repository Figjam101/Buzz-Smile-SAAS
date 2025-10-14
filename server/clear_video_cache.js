const axios = require('axios');
const jwt = require('jsonwebtoken');

async function clearVideoCache() {
  try {
    console.log('🧹 Clearing video cache...');
    
    // Generate a fresh admin token
    const token = jwt.sign(
      { 
        userId: '68e581aa97ba6e6136a0552c',
        email: 'npkalyx@gmail.com',
        role: 'admin' 
      },
      'your_super_secret_jwt_key_change_in_production',
      { expiresIn: '24h' }
    );
    
    // Call the clear cache endpoint
    const response = await axios.post('http://localhost:5000/api/videos/clear-cache', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Cache cleared successfully:', response.data);
    
  } catch (error) {
    console.error('❌ Error clearing cache:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

clearVideoCache();