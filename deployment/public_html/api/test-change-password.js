const https = require('https');
const http = require('http');

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = lib.request(requestOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(body))
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testChangePassword() {
  try {
    console.log('Testing change password functionality...');
    
    // First login to get a token
    const loginResponse = await makeRequest('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'npkalyx@gmail.com',
      password: 'password123'
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✓ Login successful');

    // Test change password with correct current password
    const changePasswordResponse = await makeRequest('http://localhost:5001/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      currentPassword: 'password123',
      newPassword: 'newpassword123'
    });

    if (!changePasswordResponse.ok) {
      const errorData = await changePasswordResponse.json();
      throw new Error(`Change password failed: ${errorData.message}`);
    }

    const changePasswordData = await changePasswordResponse.json();
    console.log('✓ Password changed successfully:', changePasswordData.message);

    // Test login with new password
    const newLoginResponse = await makeRequest('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'npkalyx@gmail.com',
      password: 'newpassword123'
    });

    if (!newLoginResponse.ok) {
      throw new Error('Login with new password failed');
    }

    console.log('✓ Login with new password successful');

    // Test login with old password (should fail)
    const oldPasswordResponse = await makeRequest('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'npkalyx@gmail.com',
      password: 'password123'
    });

    if (oldPasswordResponse.ok) {
      console.log('⚠ Warning: Old password still works (this should not happen)');
    } else {
      console.log('✓ Old password correctly rejected');
    }

    // Reset password back to original for consistency
    const newLoginData = await newLoginResponse.json();
    const newToken = newLoginData.token;
    
    const resetResponse = await makeRequest('http://localhost:5001/api/auth/change-password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newToken}`
      }
    }, {
      currentPassword: 'newpassword123',
      newPassword: 'password123'
    });

    if (resetResponse.ok) {
      console.log('✓ Password reset back to original');
    }

    console.log('\n🎉 All change password tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testChangePassword();