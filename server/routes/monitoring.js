const express = require('express');
const router = express.Router();
const { monitoringService } = require('../services/monitoringService');
const { loggingService } = require('../services/loggingService');
const { errorTrackingService } = require('../services/errorTrackingService');
const { auth } = require('../middleware/auth');

// Middleware to check admin privileges
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * @route   GET /api/monitoring/health
 * @desc    Get comprehensive health status
 * @access  Admin only
 */
router.get('/health', auth, requireAdmin, async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    res.json(health);
  } catch (error) {
    loggingService.error('Health check failed', error);
    res.status(500).json({ message: 'Health check failed' });
  }
});

/**
 * @route   GET /api/monitoring/metrics
 * @desc    Get performance metrics
 * @access  Admin only
 */
router.get('/metrics', auth, requireAdmin, async (req, res) => {
  try {
    const metrics = monitoringService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    loggingService.error('Failed to get metrics', error);
    res.status(500).json({ message: 'Failed to get metrics' });
  }
});

/**
 * @route   GET /api/monitoring/alerts
 * @desc    Get active alerts
 * @access  Admin only
 */
router.get('/alerts', auth, requireAdmin, async (req, res) => {
  try {
    const { resolved } = req.query;
    let alerts = monitoringService.alerts;
    
    if (resolved === 'false') {
      alerts = alerts.filter(alert => !alert.resolved);
    } else if (resolved === 'true') {
      alerts = alerts.filter(alert => alert.resolved);
    }
    
    res.json({
      alerts: alerts.slice(0, 50), // Limit to 50 alerts
      total: alerts.length
    });
  } catch (error) {
    loggingService.error('Failed to get alerts', error);
    res.status(500).json({ message: 'Failed to get alerts' });
  }
});

/**
 * @route   POST /api/monitoring/alerts/:alertId/resolve
 * @desc    Resolve an alert
 * @access  Admin only
 */
router.post('/alerts/:alertId/resolve', auth, requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    monitoringService.resolveAlert(alertId);
    
    loggingService.info(`Alert ${alertId} resolved by admin ${req.user.email}`);
    
    res.json({ message: 'Alert resolved successfully' });
  } catch (error) {
    loggingService.error('Failed to resolve alert', error);
    res.status(500).json({ message: 'Failed to resolve alert' });
  }
});

/**
 * @route   GET /api/monitoring/logs/stats
 * @desc    Get log file statistics
 * @access  Admin only
 */
router.get('/logs/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = await loggingService.getLogStats();
    res.json(stats);
  } catch (error) {
    loggingService.error('Failed to get log stats', error);
    res.status(500).json({ message: 'Failed to get log stats' });
  }
});

/**
 * @route   POST /api/monitoring/logs/clean
 * @desc    Clean old log files
 * @access  Admin only
 */
router.post('/logs/clean', auth, requireAdmin, async (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;
    
    if (daysToKeep < 1 || daysToKeep > 365) {
      return res.status(400).json({
        message: 'daysToKeep must be between 1 and 365'
      });
    }
    
    const cleanedCount = await loggingService.cleanOldLogs(daysToKeep);
    
    loggingService.info(`Admin ${req.user.email} cleaned ${cleanedCount} old log files`);
    
    res.json({
      message: `Cleaned ${cleanedCount} old log files`,
      cleanedCount,
      daysToKeep
    });
  } catch (error) {
    loggingService.error('Failed to clean logs', error);
    res.status(500).json({ message: 'Failed to clean logs' });
  }
});

/**
 * @route   GET /api/monitoring/error-tracking/stats
 * @desc    Get error tracking statistics
 * @access  Admin only
 */
router.get('/error-tracking/stats', auth, requireAdmin, async (req, res) => {
  try {
    const stats = errorTrackingService.getErrorStats();
    res.json(stats);
  } catch (error) {
    loggingService.error('Failed to get error tracking stats', error);
    res.status(500).json({ message: 'Failed to get error tracking stats' });
  }
});

/**
 * @route   PUT /api/monitoring/thresholds
 * @desc    Update monitoring thresholds
 * @access  Admin only
 */
router.put('/thresholds', auth, requireAdmin, async (req, res) => {
  try {
    const { cpuUsage, memoryUsage, diskUsage, responseTime, errorRate } = req.body;
    
    const newThresholds = {};
    
    // Validate and set thresholds
    if (cpuUsage !== undefined) {
      if (cpuUsage < 50 || cpuUsage > 95) {
        return res.status(400).json({ message: 'CPU threshold must be between 50 and 95' });
      }
      newThresholds.cpuUsage = cpuUsage;
    }
    
    if (memoryUsage !== undefined) {
      if (memoryUsage < 50 || memoryUsage > 95) {
        return res.status(400).json({ message: 'Memory threshold must be between 50 and 95' });
      }
      newThresholds.memoryUsage = memoryUsage;
    }
    
    if (diskUsage !== undefined) {
      if (diskUsage < 70 || diskUsage > 98) {
        return res.status(400).json({ message: 'Disk threshold must be between 70 and 98' });
      }
      newThresholds.diskUsage = diskUsage;
    }
    
    if (responseTime !== undefined) {
      if (responseTime < 1000 || responseTime > 30000) {
        return res.status(400).json({ message: 'Response time threshold must be between 1000 and 30000ms' });
      }
      newThresholds.responseTime = responseTime;
    }
    
    if (errorRate !== undefined) {
      if (errorRate < 1 || errorRate > 50) {
        return res.status(400).json({ message: 'Error rate threshold must be between 1 and 50%' });
      }
      newThresholds.errorRate = errorRate;
    }
    
    monitoringService.updateThresholds(newThresholds);
    
    loggingService.info(`Admin ${req.user.email} updated monitoring thresholds`, newThresholds);
    
    res.json({
      message: 'Thresholds updated successfully',
      thresholds: monitoringService.thresholds
    });
  } catch (error) {
    loggingService.error('Failed to update thresholds', error);
    res.status(500).json({ message: 'Failed to update thresholds' });
  }
});

/**
 * @route   GET /api/monitoring/system/info
 * @desc    Get system information
 * @access  Admin only
 */
router.get('/system/info', auth, requireAdmin, async (req, res) => {
  try {
    const os = require('os');
    const process = require('process');
    
    const systemInfo = {
      server: {
        platform: os.platform(),
        architecture: os.arch(),
        nodeVersion: process.version,
        uptime: process.uptime(),
        pid: process.pid
      },
      system: {
        hostname: os.hostname(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg()
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    res.json(systemInfo);
  } catch (error) {
    loggingService.error('Failed to get system info', error);
    res.status(500).json({ message: 'Failed to get system info' });
  }
});

/**
 * @route   POST /api/monitoring/test-alert
 * @desc    Create a test alert (for testing purposes)
 * @access  Admin only
 */
router.post('/test-alert', auth, requireAdmin, async (req, res) => {
  try {
    const { type = 'test', message = 'Test alert', severity = 'info' } = req.body;
    
    const alert = monitoringService.createAlert(type, message, severity);
    
    loggingService.info(`Admin ${req.user.email} created test alert`, { alert });
    
    res.json({
      message: 'Test alert created successfully',
      alert
    });
  } catch (error) {
    loggingService.error('Failed to create test alert', error);
    res.status(500).json({ message: 'Failed to create test alert' });
  }
});

/**
 * @route   GET /api/monitoring/dashboard
 * @desc    Get dashboard data with all key metrics
 * @access  Admin only
 */
router.get('/dashboard', auth, requireAdmin, async (req, res) => {
  try {
    const [health, metrics, logStats] = await Promise.all([
      monitoringService.getHealthStatus(),
      monitoringService.getPerformanceMetrics(),
      loggingService.getLogStats()
    ]);
    
    const activeAlerts = monitoringService.alerts.filter(alert => !alert.resolved);
    const errorTrackingStats = errorTrackingService.getErrorStats();
    
    const dashboard = {
      timestamp: new Date().toISOString(),
      health,
      metrics,
      alerts: {
        active: activeAlerts.length,
        total: monitoringService.alerts.length,
        recent: activeAlerts.slice(0, 5)
      },
      logs: logStats,
      errorTracking: errorTrackingStats,
      summary: {
        status: health.status,
        uptime: health.uptime,
        totalRequests: metrics.requests.total,
        errorRate: metrics.requests.errorRate,
        averageResponseTime: metrics.requests.averageResponseTime
      }
    };
    
    res.json(dashboard);
  } catch (error) {
    loggingService.error('Failed to get dashboard data', error);
    res.status(500).json({ message: 'Failed to get dashboard data' });
  }
});

module.exports = router;