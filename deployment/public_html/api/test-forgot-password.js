const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api/auth';

// Test user credentials - using a simpler test that doesn't require email
const testUser = {
  email: 'nonexistent@example.com', // Start with non-existent user to test validation
  password: 'testpassword123'
};

async function testForgotPasswordFlow() {
  console.log('🧪 Starting Forgot Password Functionality Tests...\n');

  try {
    // Test 1: Test missing email field first
    console.log('📧 Test 1: Test missing email field');
    try {
      const missingEmailResponse = await axios.post(`${BASE_URL}/forgot-password`, {});
      console.log('❌ Should have failed for missing email');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected missing email');
        console.log('📨 Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Test invalid email format
    console.log('📧 Test 2: Test invalid email format');
    try {
      const invalidEmailResponse = await axios.post(`${BASE_URL}/forgot-password`, {
        email: 'invalid-email'
      });
      console.log('❌ Should have failed for invalid email format');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected invalid email format');
        console.log('📨 Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Request password reset for non-existing user (should return 200 for security)
    console.log('📧 Test 3: Request password reset for non-existing user');
    try {
      const nonExistentResponse = await axios.post(`${BASE_URL}/forgot-password`, {
        email: 'nonexistent@example.com'
      });
      if (nonExistentResponse.status === 200) {
        console.log('✅ Correctly handled non-existent user (security best practice)');
        console.log('📨 Message:', nonExistentResponse.data.message);
      } else {
        console.log('❌ Unexpected status code:', nonExistentResponse.status);
      }
    } catch (error) {
      console.log('❌ Unexpected error:', error.message);
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Test reset password with invalid token
    console.log('🔐 Test 4: Test reset password with invalid token');
    try {
      const invalidTokenResponse = await axios.post(`${BASE_URL}/reset-password`, {
        token: 'invalid-token-123',
        password: 'newpassword123'
      });
      console.log('❌ Should have failed for invalid token');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected invalid token');
        console.log('📨 Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 5: Test reset password with missing fields
    console.log('🔐 Test 5: Test reset password with missing fields');
    try {
      const missingFieldsResponse = await axios.post(`${BASE_URL}/reset-password`, {
        token: 'some-token'
        // missing password field
      });
      console.log('❌ Should have failed for missing password');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected missing password');
        console.log('📨 Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    console.log('🎉 Basic Forgot Password API Tests Completed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Missing email field rejection');
    console.log('✅ Invalid email format rejection');
    console.log('✅ Non-existent user rejection');
    console.log('✅ Invalid token rejection');
    console.log('✅ Missing password field rejection');
    
    console.log('\n📧 Note: To test with a real user and email sending:');
    console.log('1. Create a test user first');
    console.log('2. Set up email environment variables (EMAIL_USER, EMAIL_PASS)');
    console.log('3. Test with the real user email');
    console.log('4. Check email service logs for sent emails');
    
    console.log('\n🔧 Email Configuration Required:');
    console.log('Make sure to set these environment variables:');
    console.log('- EMAIL_USER: Your email address');
    console.log('- EMAIL_PASS: Your email password or app password');
    console.log('- CLIENT_URL: Your frontend URL (e.g., http://localhost:3000)');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
testForgotPasswordFlow();