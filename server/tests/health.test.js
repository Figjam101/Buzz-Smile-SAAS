const request = require('supertest');
const mongoose = require('mongoose');

// Mock the app without starting the server
const app = require('../index');

describe('Health Check Endpoints', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    }
  });

  afterAll(async () => {
    // Clean up database connection
    await mongoose.connection.close();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should include database status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('database');
      expect(response.body.database).toHaveProperty('status');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Server Startup', () => {
    it('should start without errors', () => {
      expect(app).toBeDefined();
    });

    it('should have required middleware', () => {
      // Test that the app has the basic middleware stack
      expect(app._router).toBeDefined();
    });
  });
});