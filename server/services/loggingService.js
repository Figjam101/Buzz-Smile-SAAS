const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'buzz-smile-saas',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Security logs
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Performance logs
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Enhanced logging methods
class LoggingService {
  constructor() {
    this.logger = logger;
  }

  // Standard logging methods
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      })
    };
    this.logger.error(message, errorMeta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Specialized logging methods
  logUserAction(userId, action, details = {}) {
    this.logger.info('User Action', {
      category: 'user_action',
      userId,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logSecurityEvent(event, severity = 'medium', details = {}) {
    this.logger.warn('Security Event', {
      category: 'security',
      event,
      severity,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown'
    });
  }

  logAPIRequest(req, res, responseTime) {
    const logData = {
      category: 'api_request',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      this.logger.error('API Request Failed', logData);
    } else {
      this.logger.info('API Request', logData);
    }
  }

  logPerformance(operation, duration, details = {}) {
    this.logger.info('Performance Metric', {
      category: 'performance',
      operation,
      duration: `${duration}ms`,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logDatabaseOperation(operation, collection, duration, details = {}) {
    this.logger.info('Database Operation', {
      category: 'database',
      operation,
      collection,
      duration: `${duration}ms`,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logFileOperation(operation, filename, size = null, details = {}) {
    this.logger.info('File Operation', {
      category: 'file_operation',
      operation,
      filename,
      size: size ? `${size} bytes` : null,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logVideoProcessing(videoId, operation, status, details = {}) {
    const logLevel = status === 'error' ? 'error' : 'info';
    this.logger[logLevel]('Video Processing', {
      category: 'video_processing',
      videoId,
      operation,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  logAuthEvent(event, userId = null, details = {}) {
    this.logger.info('Authentication Event', {
      category: 'authentication',
      event,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // System health logging
  logSystemHealth(metrics) {
    this.logger.info('System Health Check', {
      category: 'system_health',
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  // Error aggregation for monitoring
  logCriticalError(error, context = {}) {
    this.logger.error('CRITICAL ERROR', {
      category: 'critical_error',
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: new Date().toISOString(),
      severity: 'critical'
    });

    // In production, this could trigger alerts
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with alerting system (Slack, email, etc.)
      console.error('🚨 CRITICAL ERROR DETECTED:', error.message);
    }
  }

  // Get log statistics
  async getLogStats() {
    try {
      const stats = {};
      const logFiles = ['error.log', 'combined.log', 'security.log', 'performance.log'];
      
      for (const file of logFiles) {
        const filePath = path.join(logsDir, file);
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          stats[file] = {
            size: stat.size,
            modified: stat.mtime,
            sizeFormatted: this.formatBytes(stat.size)
          };
        }
      }
      
      return stats;
    } catch (error) {
      this.error('Failed to get log statistics', error);
      return {};
    }
  }

  // Utility method to format bytes
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  // Clean old logs
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const files = fs.readdirSync(logsDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      }
      
      this.info(`Cleaned ${cleanedCount} old log files`);
      return cleanedCount;
    } catch (error) {
      this.error('Failed to clean old logs', error);
      return 0;
    }
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Express middleware for request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    loggingService.logAPIRequest(req, res, duration);
  });
  
  next();
};

// Error handling middleware
const errorLogger = (error, req, res, next) => {
  loggingService.logCriticalError(error, {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip
  });
  
  next(error);
};

module.exports = {
  loggingService,
  requestLogger,
  errorLogger,
  logger
};