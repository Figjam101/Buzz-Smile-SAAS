const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    
    // Development fallback: if DB is unavailable and token carries embedded user
    if (decoded.devUser && process.env.ALLOW_SERVER_WITHOUT_DB === 'true') {
      req.user = decoded.user;
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      
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