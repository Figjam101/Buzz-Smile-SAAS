const fs = require('fs');
const path = require('path');
const util = require('util');

class DebugLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
    this.logFiles = {
      requests: path.join(this.logDir, 'requests.log'),
      errors: path.join(this.logDir, 'errors.log'),
      performance: path.join(this.logDir, 'performance.log'),
      database: path.join(this.logDir, 'database.log'),
      system: path.join(this.logDir, 'system.log')
    };
    this.requestCounter = 0;
    this.activeRequests = new Map();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  generateRequestId() {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  writeToFile(filename, data) {
    const timestamp = this.formatTimestamp();
    const logEntry = `[${timestamp}] ${data}\n`;
    
    try {
      fs.appendFileSync(filename, logEntry);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  logRequest(req, res, requestId, startTime) {
    const duration = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0,
      userId: req.user ? req.user.id : 'anonymous',
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      body: this.sanitizeBody(req.body),
      timestamp: this.formatTimestamp()
    };

    this.writeToFile(this.logFiles.requests, JSON.stringify(logData, null, 2));
  }

  logError(error, req = null, requestId = null) {
    const errorData = {
      requestId: requestId || 'unknown',
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      url: req ? req.originalUrl : 'unknown',
      method: req ? req.method : 'unknown',
      userId: req && req.user ? req.user.id : 'anonymous',
      timestamp: this.formatTimestamp(),
      severity: this.getErrorSeverity(error)
    };

    this.writeToFile(this.logFiles.errors, JSON.stringify(errorData, null, 2));
    
    // Also log to console for immediate visibility
    console.error(`[ERROR] ${errorData.requestId}:`, error);
  }

  logPerformance(operation, duration, metadata = {}) {
    const perfData = {
      operation,
      duration: `${duration}ms`,
      metadata,
      timestamp: this.formatTimestamp(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    this.writeToFile(this.logFiles.performance, JSON.stringify(perfData, null, 2));
  }

  logDatabase(query, duration, result = null, error = null) {
    const dbData = {
      query: this.sanitizeQuery(query),
      duration: `${duration}ms`,
      success: !error,
      error: error ? error.message : null,
      resultCount: result && result.length ? result.length : 0,
      timestamp: this.formatTimestamp()
    };

    this.writeToFile(this.logFiles.database, JSON.stringify(dbData, null, 2));
  }

  logSystem(level, message, metadata = {}) {
    const systemData = {
      level,
      message,
      metadata,
      timestamp: this.formatTimestamp(),
      pid: process.pid,
      memoryUsage: process.memoryUsage()
    };

    this.writeToFile(this.logFiles.system, JSON.stringify(systemData, null, 2));
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    // Remove sensitive headers
    delete sanitized.authorization;
    delete sanitized.cookie;
    delete sanitized['x-api-key'];
    return sanitized;
  }

  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;
    
    return sanitized;
  }

  sanitizeQuery(query) {
    if (typeof query === 'string') {
      // Remove potential sensitive data from query strings
      return query.replace(/password=[\w\d]+/gi, 'password=***')
                  .replace(/token=[\w\d]+/gi, 'token=***');
    }
    return query;
  }

  getErrorSeverity(error) {
    if (error.name === 'ValidationError') return 'warning';
    if (error.name === 'CastError') return 'warning';
    if (error.status && error.status < 500) return 'warning';
    return 'error';
  }

  // Middleware function for Express
  middleware() {
    return (req, res, next) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();
      
      // Add request ID to request object for use in other parts of the app
      req.requestId = requestId;
      req.debugLogger = this;
      
      // Store request start time
      this.activeRequests.set(requestId, { startTime, req, res });
      
      // Log request start
      this.logSystem('info', `Request started: ${req.method} ${req.originalUrl}`, {
        requestId,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = (...args) => {
        // Log the completed request
        this.logRequest(req, res, requestId, startTime);
        
        // Clean up active requests
        this.activeRequests.delete(requestId);
        
        // Log request completion
        this.logSystem('info', `Request completed: ${req.method} ${req.originalUrl}`, {
          requestId,
          statusCode: res.statusCode,
          duration: `${Date.now() - startTime}ms`
        });
        
        // Call original end method
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Error handling middleware
  errorMiddleware() {
    return (error, req, res, next) => {
      this.logError(error, req, req.requestId);
      next(error);
    };
  }

  // Get current system stats
  getSystemStats() {
    return {
      timestamp: this.formatTimestamp(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      activeRequests: this.activeRequests.size,
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    };
  }

  // Get recent logs
  getRecentLogs(type = 'requests', lines = 100) {
    const logFile = this.logFiles[type];
    if (!fs.existsSync(logFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      return logLines.map(line => {
        try {
          return JSON.parse(line.substring(line.indexOf('] ') + 2));
        } catch {
          return { raw: line };
        }
      });
    } catch (error) {
      console.error('Error reading log file:', error);
      return [];
    }
  }

  // Clear logs
  clearLogs(type = null) {
    if (type && this.logFiles[type]) {
      fs.writeFileSync(this.logFiles[type], '');
    } else {
      // Clear all logs
      Object.values(this.logFiles).forEach(file => {
        fs.writeFileSync(file, '');
      });
    }
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

module.exports = debugLogger;