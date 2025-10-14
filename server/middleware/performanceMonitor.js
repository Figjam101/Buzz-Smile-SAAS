const debugLogger = require('./debugLogger');
const mongoose = require('mongoose');

class PerformanceMonitor {
  constructor() {
    this.queryTimes = new Map();
    this.apiTimes = new Map();
    this.setupDatabaseMonitoring();
  }

  setupDatabaseMonitoring() {
    // Monitor MongoDB queries
    if (mongoose.connection.readyState === 1) {
      this.attachDatabaseListeners();
    } else {
      mongoose.connection.on('connected', () => {
        this.attachDatabaseListeners();
      });
    }
  }

  attachDatabaseListeners() {
    const db = mongoose.connection.db;
    
    // Override the collection methods to monitor queries
    const originalCollection = db.collection;
    db.collection = function(name) {
      const collection = originalCollection.call(this, name);
      return new Proxy(collection, {
        get(target, prop) {
          const original = target[prop];
          
          // Monitor common database operations
          if (typeof original === 'function' && 
              ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 
               'updateMany', 'deleteOne', 'deleteMany', 'aggregate'].includes(prop)) {
            
            return function(...args) {
              const startTime = Date.now();
              const queryId = `${name}.${prop}_${Date.now()}_${Math.random()}`;
              
              try {
                const result = original.apply(this, args);
                
                // Handle promises
                if (result && typeof result.then === 'function') {
                  return result.then(res => {
                    const duration = Date.now() - startTime;
                    debugLogger.logDatabase(
                      `${name}.${prop}(${JSON.stringify(args[0] || {}).substring(0, 100)})`,
                      duration,
                      res
                    );
                    debugLogger.logPerformance(`db.${name}.${prop}`, duration, {
                      collection: name,
                      operation: prop,
                      queryId
                    });
                    return res;
                  }).catch(err => {
                    const duration = Date.now() - startTime;
                    debugLogger.logDatabase(
                      `${name}.${prop}(${JSON.stringify(args[0] || {}).substring(0, 100)})`,
                      duration,
                      null,
                      err
                    );
                    throw err;
                  });
                } else {
                  // Handle synchronous operations
                  const duration = Date.now() - startTime;
                  debugLogger.logDatabase(
                    `${name}.${prop}(${JSON.stringify(args[0] || {}).substring(0, 100)})`,
                    duration,
                    result
                  );
                  debugLogger.logPerformance(`db.${name}.${prop}`, duration, {
                    collection: name,
                    operation: prop,
                    queryId
                  });
                  return result;
                }
              } catch (error) {
                const duration = Date.now() - startTime;
                debugLogger.logDatabase(
                  `${name}.${prop}(${JSON.stringify(args[0] || {}).substring(0, 100)})`,
                  duration,
                  null,
                  error
                );
                throw error;
              }
            };
          }
          
          return original;
        }
      });
    };
  }

  // Middleware to monitor API performance
  apiMonitoringMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Override response methods to capture timing
      res.send = function(data) {
        const duration = Date.now() - startTime;
        debugLogger.logPerformance(`api.${req.method}.${req.route?.path || req.path}`, duration, {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          contentLength: Buffer.byteLength(data || '', 'utf8'),
          requestId: req.requestId
        });
        
        return originalSend.call(this, data);
      };
      
      res.json = function(data) {
        const duration = Date.now() - startTime;
        debugLogger.logPerformance(`api.${req.method}.${req.route?.path || req.path}`, duration, {
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          contentLength: Buffer.byteLength(JSON.stringify(data || {}), 'utf8'),
          requestId: req.requestId
        });
        
        return originalJson.call(this, data);
      };
      
      next();
    };
  }

  // Monitor custom operations
  monitorOperation(operationName, operation) {
    return async (...args) => {
      const startTime = Date.now();
      const operationId = `${operationName}_${Date.now()}_${Math.random()}`;
      
      try {
        debugLogger.logSystem('info', `Operation started: ${operationName}`, {
          operationId,
          args: args.length
        });
        
        const result = await operation(...args);
        const duration = Date.now() - startTime;
        
        debugLogger.logPerformance(operationName, duration, {
          operationId,
          success: true,
          resultType: typeof result
        });
        
        debugLogger.logSystem('info', `Operation completed: ${operationName}`, {
          operationId,
          duration: `${duration}ms`
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        debugLogger.logPerformance(operationName, duration, {
          operationId,
          success: false,
          error: error.message
        });
        
        debugLogger.logError(error, null, operationId);
        throw error;
      }
    };
  }

  // Memory monitoring
  startMemoryMonitoring(intervalMs = 30000) {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const systemMem = {
        total: require('os').totalmem(),
        free: require('os').freemem()
      };
      
      debugLogger.logPerformance('memory.usage', 0, {
        process: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
          heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        system: {
          total: `${Math.round(systemMem.total / 1024 / 1024)}MB`,
          free: `${Math.round(systemMem.free / 1024 / 1024)}MB`,
          used: `${Math.round((systemMem.total - systemMem.free) / 1024 / 1024)}MB`,
          usagePercent: Math.round(((systemMem.total - systemMem.free) / systemMem.total) * 100)
        }
      });
      
      // Log warning if memory usage is high
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      if (heapUsagePercent > 85) {
        debugLogger.logSystem('warning', 'High memory usage detected', {
          heapUsagePercent: `${Math.round(heapUsagePercent)}%`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        });
      }
    }, intervalMs);
  }

  // CPU monitoring
  startCpuMonitoring(intervalMs = 30000) {
    let lastCpuUsage = process.cpuUsage();
    
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const cpuPercent = (currentCpuUsage.user + currentCpuUsage.system) / 1000000 / (intervalMs / 1000) * 100;
      
      debugLogger.logPerformance('cpu.usage', 0, {
        user: currentCpuUsage.user,
        system: currentCpuUsage.system,
        percent: Math.round(cpuPercent * 100) / 100,
        loadAverage: require('os').loadavg()
      });
      
      // Log warning if CPU usage is high
      if (cpuPercent > 80) {
        debugLogger.logSystem('warning', 'High CPU usage detected', {
          cpuPercent: `${Math.round(cpuPercent)}%`,
          loadAverage: require('os').loadavg()
        });
      }
      
      lastCpuUsage = process.cpuUsage();
    }, intervalMs);
  }

  // Get performance summary
  getPerformanceSummary() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: `${Math.round(process.uptime())}s`,
      activeHandles: process._getActiveHandles().length,
      activeRequests: process._getActiveRequests().length
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;