const express = require('express');
const router = express.Router();
const debugLogger = require('../middleware/debugLogger');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Middleware to check if debug routes are enabled and user has admin privileges
const requireAdmin = (req, res, next) => {
  // Only allow debug routes in development environment or when explicitly enabled
  const isProduction = process.env.NODE_ENV === 'production';
  const debugEnabled = process.env.ENABLE_DEBUG_ROUTES === 'true';
  
  if (isProduction && !debugEnabled) {
    return res.status(404).json({ 
      error: 'Not Found',
      message: 'Debug routes are disabled in production' 
    });
  }
  
  // Check for valid API key
  const apiKey = req.headers['x-debug-key'] || req.query.debugKey;
  const validKey = process.env.DEBUG_API_KEY;
  
  if (!validKey) {
    return res.status(503).json({ 
      error: 'Service Unavailable', 
      message: 'Debug API key not configured' 
    });
  }
  
  if (apiKey !== validKey) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Valid debug API key required' 
    });
  }
  
  next();
};

// Apply admin middleware to all debug routes
router.use(requireAdmin);

// System Status Endpoint
router.get('/status', (req, res) => {
  try {
    const systemStats = debugLogger.getSystemStats();
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const status = {
      server: {
        status: 'running',
        ...systemStats,
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: dbStates[dbStatus] || 'unknown',
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        collections: Object.keys(mongoose.connection.collections)
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
        loadAverage: os.loadavg(),
        uptime: `${Math.round(os.uptime())} seconds`
      }
    };

    res.json(status);
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({ error: 'Failed to get system status', details: error.message });
  }
});

// Get Logs Endpoint
router.get('/logs/:type?', (req, res) => {
  try {
    const { type = 'requests' } = req.params;
    const { lines = 100, format = 'json' } = req.query;
    
    const validTypes = ['requests', 'errors', 'performance', 'database', 'system'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid log type', 
        validTypes 
      });
    }

    const logs = debugLogger.getRecentLogs(type, parseInt(lines));
    
    if (format === 'raw') {
      const rawLogs = logs.map(log => 
        typeof log === 'object' ? JSON.stringify(log) : log
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(rawLogs);
    } else {
      res.json({
        type,
        count: logs.length,
        logs
      });
    }
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({ error: 'Failed to retrieve logs', details: error.message });
  }
});

// Clear Logs Endpoint
router.delete('/logs/:type?', (req, res) => {
  try {
    const { type } = req.params;
    debugLogger.clearLogs(type);
    
    res.json({ 
      message: type ? `${type} logs cleared` : 'All logs cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({ error: 'Failed to clear logs', details: error.message });
  }
});

// Real-time System Metrics
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        activeHandles: process._getActiveHandles().length,
        activeRequests: process._getActiveRequests().length
      },
      system: {
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        cpus: os.cpus().length
      },
      database: {
        readyState: mongoose.connection.readyState,
        collections: Object.keys(mongoose.connection.collections).length
      }
    };

    res.json(metrics);
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({ error: 'Failed to get metrics', details: error.message });
  }
});

// Database Query Analyzer
router.get('/database/analyze', async (req, res) => {
  try {
    const collections = mongoose.connection.db.collections();
    const analysis = {};

    for await (const collection of collections) {
      const stats = await collection.stats();
      analysis[collection.collectionName] = {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        indexes: stats.nindexes,
        totalIndexSize: stats.totalIndexSize
      };
    }

    res.json({
      database: mongoose.connection.name,
      collections: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({ error: 'Failed to analyze database', details: error.message });
  }
});

// Error Summary
router.get('/errors/summary', (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const errorLogs = debugLogger.getRecentLogs('errors', 1000);
    
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const recentErrors = errorLogs.filter(log => 
      new Date(log.timestamp) > cutoffTime
    );

    const summary = {
      totalErrors: recentErrors.length,
      timeRange: `Last ${hours} hours`,
      errorsByType: {},
      errorsByEndpoint: {},
      errorsBySeverity: {},
      mostRecentErrors: recentErrors.slice(-10)
    };

    recentErrors.forEach(error => {
      // Group by error name/type
      summary.errorsByType[error.name] = (summary.errorsByType[error.name] || 0) + 1;
      
      // Group by endpoint
      if (error.url && error.url !== 'unknown') {
        summary.errorsByEndpoint[error.url] = (summary.errorsByEndpoint[error.url] || 0) + 1;
      }
      
      // Group by severity
      summary.errorsBySeverity[error.severity] = (summary.errorsBySeverity[error.severity] || 0) + 1;
    });

    res.json(summary);
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({ error: 'Failed to generate error summary', details: error.message });
  }
});

// Performance Analysis
router.get('/performance/analysis', (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const perfLogs = debugLogger.getRecentLogs('performance', 1000);
    
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const recentPerf = perfLogs.filter(log => 
      new Date(log.timestamp) > cutoffTime
    );

    const analysis = {
      timeRange: `Last ${hours} hours`,
      totalOperations: recentPerf.length,
      operationsByType: {},
      averageDurations: {},
      slowestOperations: []
    };

    recentPerf.forEach(perf => {
      const operation = perf.operation;
      const duration = parseInt(perf.duration.replace('ms', ''));
      
      if (!analysis.operationsByType[operation]) {
        analysis.operationsByType[operation] = 0;
        analysis.averageDurations[operation] = [];
      }
      
      analysis.operationsByType[operation]++;
      analysis.averageDurations[operation].push(duration);
      
      analysis.slowestOperations.push({
        operation,
        duration: perf.duration,
        timestamp: perf.timestamp,
        metadata: perf.metadata
      });
    });

    // Calculate averages
    Object.keys(analysis.averageDurations).forEach(operation => {
      const durations = analysis.averageDurations[operation];
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      analysis.averageDurations[operation] = `${Math.round(avg)}ms`;
    });

    // Sort slowest operations
    analysis.slowestOperations.sort((a, b) => 
      parseInt(b.duration.replace('ms', '')) - parseInt(a.duration.replace('ms', ''))
    );
    analysis.slowestOperations = analysis.slowestOperations.slice(0, 10);

    res.json(analysis);
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({ error: 'Failed to analyze performance', details: error.message });
  }
});

// Test Error Endpoint (for testing error logging)
router.post('/test/error', (req, res) => {
  const { type = 'generic', message = 'Test error' } = req.body;
  
  let error;
  switch (type) {
    case 'validation':
      error = new Error(message);
      error.name = 'ValidationError';
      error.status = 400;
      break;
    case 'database':
      error = new Error(message);
      error.name = 'MongoError';
      error.code = 11000;
      break;
    case 'auth':
      error = new Error(message);
      error.name = 'UnauthorizedError';
      error.status = 401;
      break;
    default:
      error = new Error(message);
  }
  
  debugLogger.logError(error, req, req.requestId);
  res.status(error.status || 500).json({ 
    message: 'Test error logged successfully',
    error: {
      name: error.name,
      message: error.message,
      status: error.status
    }
  });
});

// Health Check with Detailed Information
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // Database health
    if (mongoose.connection.readyState === 1) {
      health.checks.database = { status: 'healthy', message: 'Connected' };
    } else {
      health.checks.database = { status: 'unhealthy', message: 'Not connected' };
      health.status = 'unhealthy';
    }

    // Memory health
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memUsagePercent < 90) {
      health.checks.memory = { 
        status: 'healthy', 
        usage: `${Math.round(memUsagePercent)}%`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
      };
    } else {
      health.checks.memory = { 
        status: 'warning', 
        usage: `${Math.round(memUsagePercent)}%`,
        message: 'High memory usage'
      };
    }

    // Disk space health (logs directory)
    const logDir = path.join(__dirname, '../logs');
    if (fs.existsSync(logDir)) {
      const stats = fs.statSync(logDir);
      health.checks.logs = { 
        status: 'healthy', 
        message: 'Log directory accessible',
        size: `${Math.round(stats.size / 1024)}KB`
      };
    } else {
      health.checks.logs = { status: 'warning', message: 'Log directory not found' };
    }

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    debugLogger.logError(error, req, req.requestId);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

module.exports = router;