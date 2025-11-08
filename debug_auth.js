// Simple Node.js script to test the auth endpoint
const axios = require('axios');

async function testAuth() {
  try {
    // Test without token
    console.log('Testing without token...');
    const response1 = await axios.get('http://localhost:5001/api/auth/me');
    console.log('Response:', response1.data);
  } catch (error) {
    console.log('Expected error without token:', error.response?.data);
  }

  try {
    // Test login first
    console.log('\nTesting login...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('Login response:', loginResponse.data);
    
    const token = loginResponse.data.token;
    
    // Test with token
    console.log('\nTesting with token...');
    const response2 = await axios.get('http://localhost:5001/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Auth response:', response2.data);
    
  } catch (error) {
    console.log('Login/Auth error:', error.response?.data || error.message);
  }
}

testAuth();
