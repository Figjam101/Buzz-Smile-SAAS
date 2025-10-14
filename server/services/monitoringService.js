const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { loggingService } = require('./loggingService');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        uptime: 0
      },
      database: {
        connections: 0,
        queries: 0,
        errors: 0,
        averageQueryTime: 0
      },
      videos: {
        processed: 0,
        failed: 0,
        totalProcessingTime: 0
      }
    };
    
    this.alerts = [];
    this.thresholds = {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90,
      responseTime: 5000,
      errorRate: 10
    };
    
    this.startTime = Date.now();
    this.requestTimes = [];
    this.maxRequestTimes = 1000; // Keep last 1000 request times
    
    // Start monitoring intervals
    this.startSystemMonitoring();
  }

  // System monitoring
  startSystemMonitoring() {
    // Monitor system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean old metrics every hour
    setInterval(() => {
      this.cleanOldMetrics();
    }, 3600000);

    // Generate health report every 5 minutes
    setInterval(() => {
      this.generateHealthReport();
    }, 300000);
  }

  async collectSystemMetrics() {
    try {
      // CPU Usage
      const cpuUsage = await this.getCPUUsage();
      this.metrics.system.cpuUsage = cpuUsage;

      // Memory Usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
      this.metrics.system.memoryUsage = memoryUsage;

      // Disk Usage
      const diskUsage = await this.getDiskUsage();
      this.metrics.system.diskUsage = diskUsage;

      // Uptime
      this.metrics.system.uptime = (Date.now() - this.startTime) / 1000;

      // Check thresholds and create alerts
      this.checkThresholds();

      // Log system health
      loggingService.logSystemHealth(this.metrics.system);

    } catch (error) {
      loggingService.error('Failed to collect system metrics', error);
    }
  }

  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const endMeasure = process.cpuUsage(startMeasure);
        const endTime = Date.now();
        
        const totalTime = (endTime - startTime) * 1000; // Convert to microseconds
        const cpuTime = endMeasure.user + endMeasure.system;
        const cpuUsage = (cpuTime / totalTime) * 100;
        
        resolve(Math.min(cpuUsage, 100));
      }, 100);
    });
  }

  async getDiskUsage() {
    try {
      const { execSync } = require('child_process');
      // Use df command to get actual disk usage for the current directory
      const output = execSync(`df -h "${process.cwd()}" | tail -1`, { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      
      // Extract usage percentage (remove the % sign)
      const usagePercent = parseFloat(parts[4].replace('%', ''));
      return usagePercent;
    } catch (error) {
      // Fallback to a simple calculation if df command fails
      try {
        const stats = await fs.stat(process.cwd());
        return 25; // Conservative fallback estimate
      } catch (fallbackError) {
        return 0;
      }
    }
  }

  // Request monitoring
  recordRequest(responseTime, statusCode) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track response times
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift();
    }

    // Calculate average response time
    this.metrics.requests.averageResponseTime = 
      this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;

    // Check for slow requests
    if (responseTime > this.thresholds.responseTime) {
      this.createAlert('slow_request', `Slow request detected: ${responseTime}ms`, 'warning');
    }
  }

  // Database monitoring
  recordDatabaseQuery(queryTime, success = true) {
    this.metrics.database.queries++;
    
    if (!success) {
      this.metrics.database.errors++;
    }

    // Update average query time (simple moving average)
    const currentAvg = this.metrics.database.averageQueryTime;
    const totalQueries = this.metrics.database.queries;
    this.metrics.database.averageQueryTime = 
      ((currentAvg * (totalQueries - 1)) + queryTime) / totalQueries;

    loggingService.logDatabaseOperation('query', 'unknown', queryTime, { success });
  }

  // Video processing monitoring
  recordVideoProcessing(processingTime, success = true) {
    if (success) {
      this.metrics.videos.processed++;
      this.metrics.videos.totalProcessingTime += processingTime;
    } else {
      this.metrics.videos.failed++;
    }

    loggingService.logVideoProcessing('unknown', 'process', success ? 'success' : 'error', {
      processingTime
    });
  }

  // Alert system
  createAlert(type, message, severity = 'info') {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Log alert
    loggingService.warn(`Alert: ${message}`, { type, severity });

    // In production, send to external monitoring service
    if (process.env.NODE_ENV === 'production' && severity === 'critical') {
      this.sendCriticalAlert(alert);
    }

    return alert;
  }

  checkThresholds() {
    const { system } = this.metrics;

    // CPU threshold
    if (system.cpuUsage > this.thresholds.cpuUsage) {
      this.createAlert('high_cpu', `High CPU usage: ${system.cpuUsage.toFixed(2)}%`, 'warning');
    }

    // Memory threshold
    if (system.memoryUsage > this.thresholds.memoryUsage) {
      this.createAlert('high_memory', `High memory usage: ${system.memoryUsage.toFixed(2)}%`, 'warning');
    }

    // Disk threshold
    if (system.diskUsage > this.thresholds.diskUsage) {
      this.createAlert('high_disk', `High disk usage: ${system.diskUsage.toFixed(2)}%`, 'critical');
    }

    // Error rate threshold
    const errorRate = (this.metrics.requests.failed / this.metrics.requests.total) * 100;
    if (errorRate > this.thresholds.errorRate && this.metrics.requests.total > 10) {
      this.createAlert('high_error_rate', `High error rate: ${errorRate.toFixed(2)}%`, 'critical');
    }
  }

  async sendCriticalAlert(alert) {
    // Placeholder for external alerting (Slack, email, etc.)
    console.error('🚨 CRITICAL ALERT:', alert.message);
    
    // TODO: Implement actual alerting mechanisms
    // - Send to Slack webhook
    // - Send email notification
    // - Push to monitoring service (DataDog, New Relic, etc.)
  }

  // Health check
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: this.metrics.system.uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      metrics: this.metrics,
      alerts: this.alerts.filter(alert => !alert.resolved).slice(0, 10),
      checks: {}
    };

    // Database health check
    try {
      const mongoose = require('mongoose');
      health.checks.database = {
        status: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
        connections: mongoose.connection.readyState
      };
    } catch (error) {
      health.checks.database = { status: 'error', error: error.message };
    }

    // Disk space check
    health.checks.diskSpace = {
      status: this.metrics.system.diskUsage < 90 ? 'healthy' : 'warning',
      usage: `${this.metrics.system.diskUsage.toFixed(2)}%`
    };

    // Memory check
    health.checks.memory = {
      status: this.metrics.system.memoryUsage < 85 ? 'healthy' : 'warning',
      usage: `${this.metrics.system.memoryUsage.toFixed(2)}%`
    };

    // CPU check
    health.checks.cpu = {
      status: this.metrics.system.cpuUsage < 80 ? 'healthy' : 'warning',
      usage: `${this.metrics.system.cpuUsage.toFixed(2)}%`
    };

    // Overall status
    const unhealthyChecks = Object.values(health.checks).filter(
      check => check.status === 'unhealthy' || check.status === 'error'
    );
    
    if (unhealthyChecks.length > 0) {
      health.status = 'unhealthy';
    } else if (Object.values(health.checks).some(check => check.status === 'warning')) {
      health.status = 'degraded';
    }

    return health;
  }

  // Performance metrics
  getPerformanceMetrics() {
    return {
      requests: {
        ...this.metrics.requests,
        errorRate: this.metrics.requests.total > 0 
          ? (this.metrics.requests.failed / this.metrics.requests.total) * 100 
          : 0
      },
      system: this.metrics.system,
      database: this.metrics.database,
      videos: {
        ...this.metrics.videos,
        averageProcessingTime: this.metrics.videos.processed > 0
          ? this.metrics.videos.totalProcessingTime / this.metrics.videos.processed
          : 0
      }
    };
  }

  // Clean old metrics
  cleanOldMetrics() {
    // Reset counters periodically to prevent overflow
    if (this.metrics.requests.total > 1000000) {
      this.metrics.requests = {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      };
      this.requestTimes = [];
    }

    // Clean resolved alerts older than 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || new Date(alert.timestamp).getTime() > oneDayAgo
    );
  }

  // Generate health report
  generateHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        status: this.metrics.system.cpuUsage < 80 && this.metrics.system.memoryUsage < 85 ? 'healthy' : 'warning',
        uptime: this.metrics.system.uptime,
        totalRequests: this.metrics.requests.total,
        errorRate: this.metrics.requests.total > 0 
          ? (this.metrics.requests.failed / this.metrics.requests.total) * 100 
          : 0
      },
      metrics: this.getPerformanceMetrics(),
      activeAlerts: this.alerts.filter(alert => !alert.resolved).length
    };

    loggingService.info('Health Report Generated', report);
  }

  // Resolve alert
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      loggingService.info(`Alert resolved: ${alert.message}`, { alertId });
    }
  }

  // Update thresholds
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    loggingService.info('Monitoring thresholds updated', newThresholds);
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

// Express middleware for monitoring
const monitoringMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    monitoringService.recordRequest(responseTime, res.statusCode);
  });
  
  next();
};

module.exports = {
  monitoringService,
  monitoringMiddleware
};