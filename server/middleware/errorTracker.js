const debugLogger = require('./debugLogger');
const fs = require('fs');
const path = require('path');

class ErrorTracker {
  constructor() {
    this.errorCounts = new Map();
    this.errorPatterns = new Map();
    this.criticalErrors = [];
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.trackCriticalError('uncaughtException', error);
      debugLogger.logError(error, null, 'global_uncaught');
      debugLogger.logSystem('critical', 'Uncaught Exception detected', {
        error: error.message,
        stack: error.stack,
        pid: process.pid
      });
      
      // Don't exit immediately, log the error first
      setTimeout(() => {
        console.error('Uncaught Exception - Server shutting down');
        process.exit(1);
      }, 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.trackCriticalError('unhandledRejection', error);
      debugLogger.logError(error, null, 'global_unhandled_promise');
      debugLogger.logSystem('critical', 'Unhandled Promise Rejection detected', {
        reason: String(reason),
        promise: promise.toString(),
        pid: process.pid
      });
    });

    // Handle warnings
    process.on('warning', (warning) => {
      debugLogger.logSystem('warning', 'Node.js Warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });
  }

  trackCriticalError(type, error) {
    const criticalError = {
      type,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    this.criticalErrors.push(criticalError);
    
    // Keep only last 50 critical errors
    if (this.criticalErrors.length > 50) {
      this.criticalErrors.shift();
    }
  }

  // Enhanced error tracking middleware
  trackingMiddleware() {
    return (error, req, res, next) => {
      const errorInfo = this.analyzeError(error, req);
      
      // Track error patterns
      this.trackErrorPattern(errorInfo);
      
      // Log detailed error information
      debugLogger.logError(error, req, req.requestId);
      
      // Log system impact
      debugLogger.logSystem('error', 'Request error occurred', {
        requestId: req.requestId,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user ? req.user.id : 'anonymous',
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      });

      // Send appropriate response
      if (!res.headersSent) {
        const statusCode = error.status || error.statusCode || 500;
        const response = {
          error: true,
          message: this.getPublicErrorMessage(error),
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        };

        // Include stack trace in development
        if (process.env.NODE_ENV === 'development') {
          response.stack = error.stack;
          response.details = error.message;
        }

        res.status(statusCode).json(response);
      }

      next();
    };
  }

  analyzeError(error, req = null) {
    const analysis = {
      type: error.name || 'UnknownError',
      message: error.message,
      severity: this.getErrorSeverity(error),
      category: this.categorizeError(error),
      statusCode: error.status || error.statusCode || 500,
      timestamp: new Date().toISOString(),
      context: {
        url: req ? req.originalUrl : null,
        method: req ? req.method : null,
        userId: req && req.user ? req.user.id : null,
        requestId: req ? req.requestId : null
      }
    };

    return analysis;
  }

  getErrorSeverity(error) {
    // Critical errors
    if (error.name === 'MongoNetworkError' || 
        error.name === 'MongoServerError' ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')) {
      return 'critical';
    }

    // High severity errors
    if (error.status >= 500 || 
        error.name === 'TypeError' ||
        error.name === 'ReferenceError' ||
        error.name === 'SyntaxError') {
      return 'high';
    }

    // Medium severity errors
    if (error.status >= 400 || 
        error.name === 'ValidationError' ||
        error.name === 'CastError') {
      return 'medium';
    }

    // Low severity errors
    return 'low';
  }

  categorizeError(error) {
    if (error.name.includes('Mongo') || error.name.includes('Database')) {
      return 'database';
    }
    
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return 'validation';
    }
    
    if (error.status === 401 || error.status === 403 || error.name.includes('Auth')) {
      return 'authentication';
    }
    
    if (error.status === 404) {
      return 'not_found';
    }
    
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'programming';
    }
    
    if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
      return 'timeout';
    }
    
    if (error.message.includes('network') || error.code === 'ECONNREFUSED') {
      return 'network';
    }
    
    return 'general';
  }

  trackErrorPattern(errorInfo) {
    const patternKey = `${errorInfo.type}_${errorInfo.category}_${errorInfo.context.url}`;
    
    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        count: 0,
        firstSeen: errorInfo.timestamp,
        lastSeen: errorInfo.timestamp,
        severity: errorInfo.severity,
        examples: []
      });
    }

    const pattern = this.errorPatterns.get(patternKey);
    pattern.count++;
    pattern.lastSeen = errorInfo.timestamp;
    
    // Keep last 3 examples
    pattern.examples.push({
      message: errorInfo.message,
      timestamp: errorInfo.timestamp,
      requestId: errorInfo.context.requestId
    });
    
    if (pattern.examples.length > 3) {
      pattern.examples.shift();
    }

    // Alert on error spikes
    if (pattern.count > 10 && pattern.count % 10 === 0) {
      debugLogger.logSystem('warning', 'Error pattern spike detected', {
        pattern: patternKey,
        count: pattern.count,
        severity: pattern.severity,
        timespan: `${new Date(pattern.firstSeen).toISOString()} - ${new Date(pattern.lastSeen).toISOString()}`
      });
    }
  }

  getPublicErrorMessage(error) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      switch (error.status || error.statusCode) {
        case 400:
          return 'Bad Request';
        case 401:
          return 'Unauthorized';
        case 403:
          return 'Forbidden';
        case 404:
          return 'Not Found';
        case 429:
          return 'Too Many Requests';
        case 500:
        default:
          return 'Internal Server Error';
      }
    }
    
    return error.message;
  }

  // Get error statistics
  getErrorStats(timeRange = 24) {
    const cutoffTime = new Date(Date.now() - (timeRange * 60 * 60 * 1000));
    const recentErrors = debugLogger.getRecentLogs('errors', 1000)
      .filter(log => new Date(log.timestamp) > cutoffTime);

    const stats = {
      timeRange: `Last ${timeRange} hours`,
      totalErrors: recentErrors.length,
      criticalErrors: this.criticalErrors.filter(e => new Date(e.timestamp) > cutoffTime).length,
      errorsByCategory: {},
      errorsBySeverity: {},
      errorsByEndpoint: {},
      topErrorPatterns: [],
      errorTrends: this.calculateErrorTrends(recentErrors)
    };

    // Analyze recent errors
    recentErrors.forEach(error => {
      const category = this.categorizeError(error);
      const severity = error.severity || this.getErrorSeverity(error);
      
      stats.errorsByCategory[category] = (stats.errorsByCategory[category] || 0) + 1;
      stats.errorsBySeverity[severity] = (stats.errorsBySeverity[severity] || 0) + 1;
      
      if (error.url && error.url !== 'unknown') {
        stats.errorsByEndpoint[error.url] = (stats.errorsByEndpoint[error.url] || 0) + 1;
      }
    });

    // Get top error patterns
    const sortedPatterns = Array.from(this.errorPatterns.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    stats.topErrorPatterns = sortedPatterns.map(([pattern, data]) => ({
      pattern,
      count: data.count,
      severity: data.severity,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen
    }));

    return stats;
  }

  calculateErrorTrends(errors) {
    const hourlyBuckets = {};
    const now = new Date();
    
    // Initialize buckets for last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const key = hour.getHours();
      hourlyBuckets[key] = 0;
    }

    // Count errors by hour
    errors.forEach(error => {
      const errorHour = new Date(error.timestamp).getHours();
      hourlyBuckets[errorHour]++;
    });

    return Object.entries(hourlyBuckets).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    }));
  }

  // Clear error tracking data
  clearErrorData() {
    this.errorCounts.clear();
    this.errorPatterns.clear();
    this.criticalErrors.length = 0;
    
    debugLogger.logSystem('info', 'Error tracking data cleared', {
      timestamp: new Date().toISOString()
    });
  }

  // Get critical errors
  getCriticalErrors() {
    return this.criticalErrors.slice(-20); // Return last 20 critical errors
  }

  // Export error data for analysis
  exportErrorData() {
    const exportData = {
      timestamp: new Date().toISOString(),
      errorPatterns: Object.fromEntries(this.errorPatterns),
      criticalErrors: this.criticalErrors,
      stats: this.getErrorStats()
    };

    const exportPath = path.join(__dirname, '../logs', `error_export_${Date.now()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    debugLogger.logSystem('info', 'Error data exported', {
      exportPath,
      patternsCount: this.errorPatterns.size,
      criticalErrorsCount: this.criticalErrors.length
    });

    return exportPath;
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

module.exports = errorTracker;