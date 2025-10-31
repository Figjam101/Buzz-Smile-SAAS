const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const router = express.Router();
const execAsync = promisify(exec);

// Health check configuration
const HEALTH_CONFIG = {
  timeout: 5000, // 5 seconds timeout for each check
  criticalServices: ['database', 'filesystem', 'memory'],
  optionalServices: ['ffmpeg', 'disk_space', 'external_apis']
};

// Health status levels
const STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

/**
 * Database health check
 */
async function checkDatabase() {
  try {
    const start = Date.now();
    
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      return {
        status: STATUS.UNHEALTHY,
        message: 'Database not connected',
        details: { readyState: mongoose.connection.readyState }
      };
    }

    // Test query performance
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - start;

    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    return {
      status: responseTime < 1000 ? STATUS.HEALTHY : STATUS.DEGRADED,
      message: responseTime < 1000 ? 'Database responsive' : 'Database slow response',
      details: {
        responseTime: `${responseTime}ms`,
        collections: collections.length,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name
      }
    };
  } catch (error) {
    return {
      status: STATUS.UNHEALTHY,
      message: 'Database check failed',
      error: error.message
    };
  }
}

/**
 * Filesystem health check
 */
async function checkFilesystem() {
  try {
    // Resolve directories relative to server root and ensure they exist
    const rootDir = path.resolve(__dirname, '..');
    const uploadsDir = path.join(rootDir, 'uploads');
    const tempDir = path.join(rootDir, 'temp');

    // Proactively create directories if missing to avoid false "unhealthy" status
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch {}
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch {}
    
    // Check if directories exist and are writable
    const checks = [];
    
    for (const dir of [uploadsDir, tempDir]) {
      try {
        await fs.access(dir, fs.constants.F_OK | fs.constants.W_OK);
        const stats = await fs.stat(dir);
        checks.push({
          path: dir,
          exists: true,
          writable: true,
          size: stats.size,
          modified: stats.mtime
        });
      } catch (error) {
        checks.push({
          path: dir,
          exists: false,
          writable: false,
          error: error.message
        });
      }
    }

    const allHealthy = checks.every(check => check.exists && check.writable);
    
    return {
      status: allHealthy ? STATUS.HEALTHY : STATUS.DEGRADED,
      message: allHealthy ? 'Filesystem accessible' : 'Created missing directories or permissions limited',
      details: { directories: checks }
    };
  } catch (error) {
    return {
      status: STATUS.UNHEALTHY,
      message: 'Filesystem check failed',
      error: error.message
    };
  }
}

/**
 * Memory health check
 */
async function checkMemory() {
  try {
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    // Convert to MB
    const processMemMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    const systemMemMB = {
      total: Math.round(systemMem.total / 1024 / 1024),
      free: Math.round(systemMem.free / 1024 / 1024),
      used: Math.round(systemMem.used / 1024 / 1024)
    };

    // Check if memory usage is concerning
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const systemUsagePercent = (systemMem.used / systemMem.total) * 100;

    let status = STATUS.HEALTHY;
    let message = 'Memory usage normal';

    if (heapUsagePercent > 90 || systemUsagePercent > 95) {
      status = STATUS.UNHEALTHY;
      message = 'Critical memory usage';
    } else if (heapUsagePercent > 75 || systemUsagePercent > 85) {
      status = STATUS.DEGRADED;
      message = 'High memory usage';
    }

    return {
      status,
      message,
      details: {
        process: processMemMB,
        system: systemMemMB,
        usage: {
          heapPercent: Math.round(heapUsagePercent),
          systemPercent: Math.round(systemUsagePercent)
        }
      }
    };
  } catch (error) {
    return {
      status: STATUS.UNHEALTHY,
      message: 'Memory check failed',
      error: error.message
    };
  }
}

/**
 * FFmpeg health check
 */
async function checkFFmpeg() {
  try {
    // Resolve ffmpeg path with environment and installer fallbacks
    const envFfmpeg = process.env.FFMPEG_PATH;
    let ffmpegPathToUse = envFfmpeg || null;

    if (!ffmpegPathToUse) {
      try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        ffmpegPathToUse = installer.path;
      } catch (_) {
        ffmpegPathToUse = 'ffmpeg';
      }
    }

    const { stdout } = await execAsync(`"${ffmpegPathToUse}" -version`);
    const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return {
      status: STATUS.HEALTHY,
      message: 'FFmpeg available',
      details: {
        version,
        path: ffmpegPathToUse
      }
    };
  } catch (error) {
    return {
      status: STATUS.UNHEALTHY,
      message: 'FFmpeg not available',
      error: error.message
    };
  }
}

/**
 * Disk space health check
 */
async function checkDiskSpace() {
  try {
    const { stdout } = await execAsync('df -h .');
    const lines = stdout.split('\n');
    const dataLine = lines[1];
    const parts = dataLine.split(/\s+/);
    
    const usage = {
      filesystem: parts[0],
      size: parts[1],
      used: parts[2],
      available: parts[3],
      usePercent: parts[4],
      mountPoint: parts[5]
    };

    const usagePercent = parseInt(usage.usePercent.replace('%', ''));
    
    let status = STATUS.HEALTHY;
    let message = 'Disk space sufficient';

    if (usagePercent > 95) {
      status = STATUS.UNHEALTHY;
      message = 'Critical disk space';
    } else if (usagePercent > 85) {
      status = STATUS.DEGRADED;
      message = 'Low disk space';
    }

    return {
      status,
      message,
      details: usage
    };
  } catch (error) {
    return {
      status: STATUS.UNKNOWN,
      message: 'Disk space check failed',
      error: error.message
    };
  }
}

/**
 * CPU health check
 */
async function checkCPU() {
  try {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // Get CPU usage over 1 second interval
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const endUsage = process.cpuUsage(startUsage);
    
    const cpuPercent = ((endUsage.user + endUsage.system) / 1000000) * 100;
    
    let status = STATUS.HEALTHY;
    let message = 'CPU usage normal';
    
    if (cpuPercent > 90 || loadAvg[0] > cpus.length * 2) {
      status = STATUS.UNHEALTHY;
      message = 'High CPU usage';
    } else if (cpuPercent > 70 || loadAvg[0] > cpus.length) {
      status = STATUS.DEGRADED;
      message = 'Elevated CPU usage';
    }

    return {
      status,
      message,
      details: {
        cores: cpus.length,
        model: cpus[0].model,
        usage: Math.round(cpuPercent),
        loadAverage: loadAvg.map(avg => Math.round(avg * 100) / 100)
      }
    };
  } catch (error) {
    return {
      status: STATUS.UNKNOWN,
      message: 'CPU check failed',
      error: error.message
    };
  }
}

/**
 * External APIs health check (placeholder)
 */
async function checkExternalAPIs() {
  // This would check external services your app depends on
  // For now, we'll return a placeholder
  return {
    status: STATUS.HEALTHY,
    message: 'No external APIs configured',
    details: {
      apis: []
    }
  };
}

/**
 * Run all health checks
 */
async function runHealthChecks() {
  const checks = {
    database: checkDatabase(),
    filesystem: checkFilesystem(),
    memory: checkMemory(),
    ffmpeg: checkFFmpeg(),
    disk_space: checkDiskSpace(),
    cpu: checkCPU(),
    external_apis: checkExternalAPIs()
  };

  const results = {};
  const promises = Object.entries(checks).map(async ([name, checkPromise]) => {
    try {
      const result = await Promise.race([
        checkPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CONFIG.timeout)
        )
      ]);
      results[name] = result;
    } catch (error) {
      results[name] = {
        status: STATUS.UNKNOWN,
        message: 'Health check failed',
        error: error.message
      };
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Calculate overall health status
 */
function calculateOverallHealth(checks) {
  const statuses = Object.values(checks).map(check => check.status);
  
  // If any critical service is unhealthy, overall is unhealthy
  const criticalChecks = HEALTH_CONFIG.criticalServices.map(service => checks[service]?.status);
  if (criticalChecks.includes(STATUS.UNHEALTHY)) {
    return STATUS.UNHEALTHY;
  }
  
  // If any service is unhealthy or any critical service is degraded, overall is degraded
  if (statuses.includes(STATUS.UNHEALTHY) || criticalChecks.includes(STATUS.DEGRADED)) {
    return STATUS.DEGRADED;
  }
  
  // If any service is degraded, overall is degraded
  if (statuses.includes(STATUS.DEGRADED)) {
    return STATUS.DEGRADED;
  }
  
  // If all checks are healthy, overall is healthy
  if (statuses.every(status => status === STATUS.HEALTHY)) {
    return STATUS.HEALTHY;
  }
  
  return STATUS.UNKNOWN;
}

// Routes

/**
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    
    // Quick checks only
    const quickChecks = {
      database: await checkDatabase(),
      memory: await checkMemory()
    };
    
    const overallStatus = calculateOverallHealth(quickChecks);
    
    res.status(overallStatus === STATUS.HEALTHY ? 200 : 503).json({
      status: overallStatus,
      timestamp,
      uptime: Math.round(uptime),
      version: process.env.npm_package_version || '1.0.0',
      checks: quickChecks
    });
  } catch (error) {
    res.status(503).json({
      status: STATUS.UNHEALTHY,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Detailed health check endpoint
 */
router.get('/detailed', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    const checks = await runHealthChecks();
    const overallStatus = calculateOverallHealth(checks);
    
    res.status(overallStatus === STATUS.HEALTHY ? 200 : 503).json({
      status: overallStatus,
      timestamp,
      uptime: Math.round(uptime),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary: {
        total: Object.keys(checks).length,
        healthy: Object.values(checks).filter(c => c.status === STATUS.HEALTHY).length,
        degraded: Object.values(checks).filter(c => c.status === STATUS.DEGRADED).length,
        unhealthy: Object.values(checks).filter(c => c.status === STATUS.UNHEALTHY).length,
        unknown: Object.values(checks).filter(c => c.status === STATUS.UNKNOWN).length
      }
    });
  } catch (error) {
    res.status(503).json({
      status: STATUS.UNHEALTHY,
      message: 'Detailed health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Readiness probe endpoint
 */
router.get('/ready', async (req, res) => {
  try {
    // Allow ignoring certain critical checks via env (comma-separated)
    const ignoreList = (process.env.HEALTH_READY_IGNORE || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Check only critical services for readiness
    const criticalChecks = {};
    for (const service of HEALTH_CONFIG.criticalServices) {
      if (ignoreList.includes(service)) continue;
      switch (service) {
        case 'database':
          criticalChecks.database = await checkDatabase();
          break;
        case 'filesystem':
          criticalChecks.filesystem = await checkFilesystem();
          break;
        case 'memory':
          criticalChecks.memory = await checkMemory();
          break;
      }
    }
    
    const isReady = Object.values(criticalChecks).every(
      check => check.status === STATUS.HEALTHY || check.status === STATUS.DEGRADED
    );
    
    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: criticalChecks,
      ignored: ignoreList
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      message: 'Readiness check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe endpoint
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if the server can respond, it's alive
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    pid: process.pid
  });
});

router.get('/ffmpeg', async (req, res) => {
  try {
    const result = await checkFFmpeg();
    res.status(result.status === STATUS.HEALTHY ? 200 : 503).json(result);
  } catch (e) {
    res.status(500).json({ status: STATUS.UNHEALTHY, message: 'FFmpeg route failed', error: e.message });
  }
});

router.get('/memory', async (req, res) => {
  try {
    const result = await checkMemory();
    res.status(result.status === STATUS.HEALTHY ? 200 : 503).json(result);
  } catch (e) {
    res.status(500).json({ status: STATUS.UNHEALTHY, message: 'Memory route failed', error: e.message });
  }
});

router.get('/memory/diagnostics', async (req, res) => {
  try {
    const v8 = require('v8');
    const { monitorEventLoopDelay } = require('perf_hooks');

    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();
    const heapSpaceStats = v8.getHeapSpaceStatistics();
    const ru = typeof process.resourceUsage === 'function' ? process.resourceUsage() : null;

    const monitor = monitorEventLoopDelay({ resolution: 10 });
    monitor.enable();
    setTimeout(() => {
      monitor.disable();
      const payload = {
        status: STATUS.HEALTHY,
        message: 'Memory diagnostics collected',
        details: {
          process: {
            rssMB: Math.round(memUsage.rss / 1024 / 1024),
            heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
            heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
            externalMB: Math.round(memUsage.external / 1024 / 1024)
          },
          heapStats,
          heapSpaces: heapSpaceStats,
          resourceUsage: ru,
          eventLoopDelay: {
            meanMs: Number((monitor.mean / 1e6).toFixed(2)),
            maxMs: Number((monitor.max / 1e6).toFixed(2)),
            stddevMs: Number((monitor.stddev / 1e6).toFixed(2))
          }
        }
      };
      res.json(payload);
    }, 200);
  } catch (e) {
    res.status(500).json({ status: STATUS.UNHEALTHY, message: 'Memory diagnostics failed', error: e.message });
  }
});

module.exports = router;