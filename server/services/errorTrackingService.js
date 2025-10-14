const Sentry = require('@sentry/node');
const { Integrations } = require('@sentry/tracing');
const { loggingService } = require('./loggingService');

class ErrorTrackingService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  init() {
    try {
      // Initialize Sentry only if DSN is provided
      if (process.env.SENTRY_DSN) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'development',
          release: process.env.npm_package_version || '1.0.0',
          
          // Performance monitoring
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          
          // Integrations
          integrations: [
            new Integrations.BrowserTracing(),
            new Sentry.Integrations.Http({ tracing: true }),
            new Sentry.Integrations.Express({ app: null }), // Will be set later
          ],

          // Error filtering
          beforeSend(event, hint) {
            // Filter out certain errors in development
            if (process.env.NODE_ENV === 'development') {
              const error = hint.originalException;
              if (error && error.code === 'ECONNREFUSED') {
                return null; // Don't send connection errors in dev
              }
            }
            return event;
          },

          // Additional context
          initialScope: {
            tags: {
              component: 'buzz-smile-saas-server'
            }
          }
        });

        this.initialized = true;
        loggingService.info('Sentry error tracking initialized');
      } else {
        loggingService.warn('Sentry DSN not provided, error tracking disabled');
      }
    } catch (error) {
      loggingService.error('Failed to initialize Sentry', error);
    }
  }

  // Set user context for error tracking
  setUser(user) {
    if (!this.initialized) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    });
  }

  // Clear user context
  clearUser() {
    if (!this.initialized) return;
    Sentry.setUser(null);
  }

  // Set additional context
  setContext(key, context) {
    if (!this.initialized) return;
    Sentry.setContext(key, context);
  }

  // Add breadcrumb for debugging
  addBreadcrumb(message, category = 'default', level = 'info', data = {}) {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000
    });

    // Also log to our logging service
    loggingService.debug(`Breadcrumb: ${message}`, { category, data });
  }

  // Capture exception
  captureException(error, context = {}) {
    // Always log to our logging service
    loggingService.logCriticalError(error, context);

    if (!this.initialized) return null;

    return Sentry.withScope((scope) => {
      // Add context to scope
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });

      // Set severity based on error type
      if (error.name === 'ValidationError') {
        scope.setLevel('warning');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        scope.setLevel('error');
      } else {
        scope.setLevel('fatal');
      }

      return Sentry.captureException(error);
    });
  }

  // Capture message
  captureMessage(message, level = 'info', context = {}) {
    loggingService.info(message, context);

    if (!this.initialized) return null;

    return Sentry.withScope((scope) => {
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
      
      return Sentry.captureMessage(message, level);
    });
  }

  // Track user action
  trackUserAction(userId, action, details = {}) {
    this.addBreadcrumb(
      `User action: ${action}`,
      'user_action',
      'info',
      { userId, ...details }
    );

    // Set user context if not already set
    if (userId) {
      this.setContext('user_action', {
        userId,
        action,
        timestamp: new Date().toISOString(),
        details
      });
    }
  }

  // Track API request
  trackAPIRequest(req, res, responseTime) {
    const breadcrumbData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id
    };

    this.addBreadcrumb(
      `API ${req.method} ${req.originalUrl} - ${res.statusCode}`,
      'http',
      res.statusCode >= 400 ? 'error' : 'info',
      breadcrumbData
    );

    // Track slow requests
    if (responseTime > 5000) {
      this.captureMessage(
        `Slow API request detected: ${req.method} ${req.originalUrl}`,
        'warning',
        { request: breadcrumbData }
      );
    }
  }

  // Track database operations
  trackDatabaseOperation(operation, collection, duration, success = true, error = null) {
    const breadcrumbData = {
      operation,
      collection,
      duration: `${duration}ms`,
      success
    };

    this.addBreadcrumb(
      `DB ${operation} on ${collection} - ${success ? 'success' : 'failed'}`,
      'database',
      success ? 'info' : 'error',
      breadcrumbData
    );

    if (!success && error) {
      this.captureException(error, {
        database_operation: breadcrumbData
      });
    }

    // Track slow queries
    if (duration > 1000) {
      this.captureMessage(
        `Slow database query: ${operation} on ${collection}`,
        'warning',
        { database_operation: breadcrumbData }
      );
    }
  }

  // Track video processing
  trackVideoProcessing(videoId, operation, status, details = {}) {
    const breadcrumbData = {
      videoId,
      operation,
      status,
      ...details
    };

    this.addBreadcrumb(
      `Video ${operation} for ${videoId} - ${status}`,
      'video_processing',
      status === 'error' ? 'error' : 'info',
      breadcrumbData
    );

    if (status === 'error') {
      this.captureMessage(
        `Video processing failed: ${operation} for video ${videoId}`,
        'error',
        { video_processing: breadcrumbData }
      );
    }
  }

  // Track authentication events
  trackAuthEvent(event, userId = null, success = true, details = {}) {
    const breadcrumbData = {
      event,
      userId,
      success,
      ...details
    };

    this.addBreadcrumb(
      `Auth ${event} - ${success ? 'success' : 'failed'}`,
      'authentication',
      success ? 'info' : 'warning',
      breadcrumbData
    );

    // Track failed authentication attempts
    if (!success) {
      this.captureMessage(
        `Authentication failed: ${event}`,
        'warning',
        { authentication: breadcrumbData }
      );
    }
  }

  // Performance monitoring
  startTransaction(name, operation = 'http') {
    if (!this.initialized) return null;

    return Sentry.startTransaction({
      name,
      op: operation
    });
  }

  // Express middleware for request tracking
  getRequestHandler() {
    if (!this.initialized) {
      return (req, res, next) => next();
    }
    return Sentry.Handlers.requestHandler();
  }

  // Express middleware for error handling
  getErrorHandler() {
    if (!this.initialized) {
      return (error, req, res, next) => next(error);
    }
    return Sentry.Handlers.errorHandler();
  }

  // Express middleware for tracing
  getTracingHandler() {
    if (!this.initialized) {
      return (req, res, next) => next();
    }
    return Sentry.Handlers.tracingHandler();
  }

  // Custom error boundary for async operations
  async withErrorBoundary(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.captureException(error, context);
      throw error; // Re-throw to maintain normal error flow
    }
  }

  // Get error statistics
  getErrorStats() {
    // This would typically come from Sentry API in production
    return {
      enabled: this.initialized,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',
      dsn_configured: !!process.env.SENTRY_DSN
    };
  }

  // Flush pending events (useful for serverless)
  async flush(timeout = 2000) {
    if (!this.initialized) return true;
    
    try {
      return await Sentry.flush(timeout);
    } catch (error) {
      loggingService.error('Failed to flush Sentry events', error);
      return false;
    }
  }

  // Close Sentry client
  async close(timeout = 2000) {
    if (!this.initialized) return true;
    
    try {
      return await Sentry.close(timeout);
    } catch (error) {
      loggingService.error('Failed to close Sentry client', error);
      return false;
    }
  }
}

// Create singleton instance
const errorTrackingService = new ErrorTrackingService();

// Express middleware factory
const createErrorTrackingMiddleware = () => {
  return {
    requestHandler: errorTrackingService.getRequestHandler(),
    tracingHandler: errorTrackingService.getTracingHandler(),
    errorHandler: errorTrackingService.getErrorHandler(),
    
    // Custom middleware for additional tracking
    trackingMiddleware: (req, res, next) => {
      const start = Date.now();
      
      // Set user context if available
      if (req.user) {
        errorTrackingService.setUser(req.user);
      }
      
      // Add request breadcrumb
      errorTrackingService.addBreadcrumb(
        `${req.method} ${req.originalUrl}`,
        'http',
        'info',
        {
          method: req.method,
          url: req.originalUrl,
          userAgent: req.get('User-Agent'),
          ip: req.ip
        }
      );
      
      res.on('finish', () => {
        const responseTime = Date.now() - start;
        errorTrackingService.trackAPIRequest(req, res, responseTime);
      });
      
      next();
    }
  };
};

module.exports = {
  errorTrackingService,
  createErrorTrackingMiddleware,
  Sentry // Export Sentry for direct use if needed
};