const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const ffmpeg = require('fluent-ffmpeg');

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
    // Use system FFmpeg in production (Railway/Heroku)
    ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
    ffmpeg.setFfprobePath('/usr/bin/ffprobe');
    console.log('Using system FFmpeg for production');
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

// Initialize queue monitor
const { initializeQueue } = require('./services/jobQueue');

const app = express();
const PORT = process.env.PORT || 5000;

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

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

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
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Backend API available at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});