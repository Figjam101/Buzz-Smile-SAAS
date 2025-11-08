const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Dev/offline mode flag: allow server to operate without DB in non-production
const OFFLINE_MODE = (process.env.ALLOW_SERVER_WITHOUT_DB === 'true') && ((process.env.NODE_ENV || 'development') !== 'production');

// Simple in-memory cache for user data
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache cleanup interval
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      userCache.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

const auth = async (req, res, next) => {
  try {
    const tokenHeader = req.header('Authorization')?.replace('Bearer ', '');
    const tokenQuery = req.query?.token;
    const tokenCookie = req.cookies ? req.cookies.token : null;
    const token = tokenHeader || tokenQuery || tokenCookie;
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const userId = decoded.userId;
    
    // Development fallback: if DB is unavailable, provide a safe offline user
    if (OFFLINE_MODE) {
      const offlineUser = {
        _id: userId,
        id: userId,
        email: decoded.email || 'dev@offline.local',
        name: decoded.name || 'Offline User',
        businessName: decoded.businessName || '',
        plan: decoded.plan || 'free',
        videoCount: decoded.videoCount || 0,
        maxVideos: decoded.maxVideos || 5,
        lastLogin: new Date(),
        role: decoded.role || 'user',
        profilePicture: null,
        socialMedia: {},
        linkedSocialAccounts: []
      };
      req.user = offlineUser;
      return next();
    }
    
    // Check cache first
    const cached = userCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      req.user = cached.user;
      return next();
    }
    
    // If not in cache or expired, fetch from database
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    // Cache the user data
    userCache.set(userId, {
      user: user,
      timestamp: Date.now()
    });

    req.user = user;
    next();
  } catch (error) {
    // If DB is offline in dev, still allow with offline user
    if (OFFLINE_MODE) {
      try {
        const tokenHeader = req.header('Authorization')?.replace('Bearer ', '');
        const tokenQuery = req.query?.token;
        const tokenCookie = req.cookies ? req.cookies.token : null;
        const token = tokenHeader || tokenQuery || tokenCookie;
        const decoded = token ? jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') : null;
        const userId = decoded?.userId || 'offline-user';
        req.user = {
          _id: userId,
          id: userId,
          email: decoded?.email || 'dev@offline.local',
          name: decoded?.name || 'Offline User',
          businessName: decoded?.businessName || '',
          plan: decoded?.plan || 'free',
          videoCount: decoded?.videoCount || 0,
          maxVideos: decoded?.maxVideos || 5,
          lastLogin: new Date(),
          role: decoded?.role || 'user',
          profilePicture: null,
          socialMedia: {},
          linkedSocialAccounts: []
        };
        return next();
      } catch (_) {
        // fall through to error handling below
      }
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const tokenHeader = req.header('Authorization')?.replace('Bearer ', '');
    const tokenQuery = req.query?.token;
    const tokenCookie = req.cookies ? req.cookies.token : null;
    const token = tokenHeader || tokenQuery || tokenCookie;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      const userId = decoded.userId;
      
      // In offline mode, supply a safe user and skip DB lookups
      if (OFFLINE_MODE) {
        req.user = {
          _id: userId,
          id: userId,
          email: decoded.email || 'dev@offline.local',
          name: decoded.name || 'Offline User',
          businessName: decoded.businessName || '',
          plan: decoded.plan || 'free',
          videoCount: decoded.videoCount || 0,
          maxVideos: decoded.maxVideos || 5,
          lastLogin: new Date(),
          role: decoded.role || 'user',
          profilePicture: null,
          socialMedia: {},
          linkedSocialAccounts: []
        };
        return next();
      }
      
      // Check cache first
      const cached = userCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        req.user = cached.user;
        return next();
      }
      
      // If not in cache, fetch from database
      const user = await User.findById(userId).select('-password');
      if (user && user.isActive) {
        // Cache the user data
        userCache.set(userId, {
          user: user,
          timestamp: Date.now()
        });
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Function to invalidate user cache (useful for user updates)
const invalidateUserCache = (userId) => {
  userCache.delete(userId);
};

module.exports = { auth, optionalAuth, invalidateUserCache };