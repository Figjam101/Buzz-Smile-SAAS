// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-secret';
process.env.SESSION_SECRET = 'test-session-secret';

// Suppress console logs during testing unless explicitly needed
if (process.env.VERBOSE_TESTS !== 'true') {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Global test timeout
jest.setTimeout(30000);