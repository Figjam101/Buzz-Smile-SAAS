const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const ffmpeg = require('fluent-ffmpeg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Import enterprise services
const { loggingService, requestLogger, errorLogger } = require('./services/loggingService');
const { monitoringService, monitoringMiddleware } = require('./services/monitoringService');
const { errorTrackingService, createErrorTrackingMiddleware } = require('./services/errorTrackingService');

// Initialize error tracking first
const errorTrackingMiddleware = createErrorTrackingMiddleware();

// Import debugging middleware
const debugLogger = require('./middleware/debugLogger');
const performanceMonitor = require('./middleware/performanceMonitor');
const errorTracker = require('./middleware/errorTracker');

// Configure ffmpeg path
try {
  // Check if we're in production environment
  if (process.env.NODE_ENV === 'production') {
    // Prefer env-configured paths; fallback to @ffmpeg-installer, then PATH-resolved binaries
    const envFfmpeg = process.env.FFMPEG_PATH;
    const envFfprobe = process.env.FFPROBE_PATH;

    if (envFfmpeg) {
      ffmpeg.setFfmpegPath(envFfmpeg);
      ffmpeg.setFfprobePath(envFfprobe || 'ffprobe');
      console.log('Using FFmpeg for production (env):', envFfmpeg);
    } else {
      try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        ffmpeg.setFfmpegPath(installer.path);
        const derivedProbe = installer.path.replace('ffmpeg', 'ffprobe');
        if (require('fs').existsSync(derivedProbe)) {
          ffmpeg.setFfprobePath(derivedProbe);
          console.log('Using FFprobe from installer:', derivedProbe);
        } else {
          ffmpeg.setFfprobePath(envFfprobe || 'ffprobe');
        }
        console.log('Using FFmpeg for production (@ffmpeg-installer):', installer.path);
      } catch (e) {
        ffmpeg.setFfmpegPath('ffmpeg');
        ffmpeg.setFfprobePath(envFfprobe || 'ffprobe');
        console.log('Using FFmpeg for production (PATH fallback): ffmpeg');
      }
    }
  } else {
    // Use @ffmpeg-installer for development
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
    console.log('FFmpeg path set to:', ffmpegPath);
  }
} catch (error) {
  console.warn('FFmpeg installer not found, using system ffmpeg');
  // Fallback to system ffmpeg or local binary
  const fallbackPath = path.join(__dirname, '../ffmpeg-bin/ffmpeg');
  if (require('fs').existsSync(fallbackPath)) {
    ffmpeg.setFfmpegPath(fallbackPath);
    console.log('Fallback FFmpeg path set to:', fallbackPath);
  } else {
    ffmpeg.setFfmpegPath('ffmpeg');
    console.log('Using system FFmpeg as final fallback');
  }
}

// Helper to resolve FFmpeg/FFprobe paths and log versions
async function logFFmpegDiagnostics() {
  try {
    // Determine ffmpeg path
    let ffmpegPathToUse = process.env.FFMPEG_PATH || null;
    if (!ffmpegPathToUse) {
      try {
        const installer = require('@ffmpeg-installer/ffmpeg');
        ffmpegPathToUse = installer.path;
      } catch (_) {
        ffmpegPathToUse = 'ffmpeg';
      }
    }

    // Determine ffprobe path
    let ffprobePathToUse = process.env.FFPROBE_PATH || null;
    if (!ffprobePathToUse && ffmpegPathToUse && ffmpegPathToUse.includes('ffmpeg')) {
      const derived = ffmpegPathToUse.replace('ffmpeg', 'ffprobe');
      if (fs.existsSync(derived)) ffprobePathToUse = derived;
    }
    if (!ffprobePathToUse) ffprobePathToUse = 'ffprobe';

    const { stdout: ffOut } = await execAsync(`"${ffmpegPathToUse}" -version`);
    const ffVersion = (ffOut.match(/ffmpeg version ([^\s]+)/) || [null, 'unknown'])[1];

    let probeVersion = 'unknown';
    try {
      const { stdout: fpOut } = await execAsync(`"${ffprobePathToUse}" -version`);
      probeVersion = (fpOut.match(/ffprobe version ([^\s]+)/) || [null, 'unknown'])[1];
    } catch (e) {
      // ignore if ffprobe missing
    }

    console.log('🎬 FFmpeg diagnostics:', {
      ffmpegPath: ffmpegPathToUse,
      ffmpegVersion: ffVersion,
      ffprobePath: ffprobePathToUse,
      ffprobeVersion: probeVersion
    });
  } catch (e) {
    console.warn('FFmpeg diagnostics failed:', e.message);
  }
}

// Initialize queue monitor
const { initializeQueue } = require('./services/jobQueue');
const backupService = require('./services/backupService');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for correct IPs and secure cookies behind Railway/Vercel
app.set('trust proxy', 1);

// Ensure critical directories exist
try {
  const uploadsDir = path.join(__dirname, 'uploads');
  const tempDir = path.join(__dirname, 'temp');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('Ensured directories:', { uploadsDir, tempDir });
} catch (e) {
  console.warn('Failed to ensure uploads/temp directories:', e.message);
}

// Middleware
// Enhanced CORS to support multiple dev origins and previews
const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (like curl) with no origin
    if (!origin) return callback(null, true);

    // Direct match against configured allowed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Permit common local dev hosts and Trae preview domains
    if (/^http:\/\/localhost:\d+/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+/.test(origin) || /trae\./.test(origin)) {
      return callback(null, true);
    }

    // Allow Vercel production and preview subdomains for this project
    try {
      const { hostname } = new URL(origin);
      if (
        hostname === 'buzz-smile-saas.vercel.app' ||
        (hostname.endsWith('.vercel.app') && hostname.startsWith('buzz-smile-saas')) ||
        // Also allow the frontend app and its preview deployments
        (hostname.endsWith('.vercel.app') && hostname.startsWith('buzz-smile-saas-frontend'))
      ) {
        return callback(null, true);
      }
    } catch (_) {}

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // keep minimal to avoid blocking existing flows
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'no-referrer' }
}));

// Global rate limiting (env configurable)
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
app.use(globalLimiter);

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Enterprise middleware stack
app.use(errorTrackingMiddleware.requestHandler);
app.use(errorTrackingMiddleware.tracingHandler);
app.use(requestLogger);
app.use(monitoringMiddleware);
app.use(errorTrackingMiddleware.trackingMiddleware);

// Debug middleware (must be early in the middleware stack)
app.use(debugLogger.middleware());
app.use(performanceMonitor.apiMonitoringMiddleware());
app.use(errorTracker.trackingMiddleware());

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Static file serving for video uploads (no auth required for thumbnails)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

connectDB();

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/auth', require('./routes/oauth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/backup-simple', require('./routes/backup-simple'));
app.use('/api/monitoring', require('./routes/monitoring'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/debug', require('./routes/debug'));
app.use('/api/health', require('./routes/health'));
app.use('/api/google-drive', require('./routes/googleDrive'));
app.use('/api/social', require('./routes/social'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorTrackingMiddleware.errorHandler);
app.use(errorLogger);
app.use(debugLogger.errorMiddleware());
app.use(errorTracker.trackingMiddleware());
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  loggingService.logCriticalError(err, {
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id
  });
  res.status(500).json({ message: 'Internal server error' });
});

// Connect to database and start server
connectDB().then(async () => {
  // Initialize job queue system
  await initializeQueue();
  // Optionally enable scheduled backups if explicitly configured
  try {
    const enableSchedule = (process.env.ENABLE_BACKUPS_SCHEDULE === 'true') || (
      process.env.BACKUP_INTERVAL && process.env.BACKUP_INTERVAL !== '0' && process.env.BACKUP_INTERVAL !== 'false'
    );
    if (enableSchedule) {
      backupService.scheduleBackups();
      console.log('🗓️ Backup scheduling enabled');
    } else {
      console.log('🛑 Backup scheduling disabled (set ENABLE_BACKUPS_SCHEDULE=true or BACKUP_INTERVAL>0 to enable)');
    }
  } catch (e) {
    console.warn('⚠️ Failed to start backup scheduler:', e.message);
  }
  
  // Log FFmpeg diagnostics post-init
  logFFmpegDiagnostics();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Backend API available at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});