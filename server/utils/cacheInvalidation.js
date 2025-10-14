const { invalidateUserCache } = require('../middleware/auth');

class CacheManager {
  constructor() {
    this.videoListCache = null; // Will be set by routes that use it
  }

  // Set video list cache reference
  setVideoListCache(cache) {
    this.videoListCache = cache;
  }

  // Invalidate user-related caches
  invalidateUserCaches(userId) {
    // Invalidate auth cache
    invalidateUserCache(userId);
    
    // Invalidate video list cache for this user
    if (this.videoListCache) {
      const keysToDelete = [];
      for (const [key] of this.videoListCache.entries()) {
        if (key.startsWith(userId.toString())) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.videoListCache.delete(key));
    }
  }

  // Invalidate video-related caches for a user
  invalidateVideoCaches(userId) {
    if (this.videoListCache) {
      const keysToDelete = [];
      for (const [key] of this.videoListCache.entries()) {
        if (key.startsWith(userId.toString())) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.videoListCache.delete(key));
    }
  }

  // Clear all caches
  clearAllCaches() {
    if (this.videoListCache) {
      this.videoListCache.clear();
    }
    // Note: User cache is cleared by its own cleanup interval
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;