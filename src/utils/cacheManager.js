// Cache Manager Utility
// Provides intelligent caching with expiration and cleanup

const CACHE_CONFIG = {
  ORDERS_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  ORGANIZATION_CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
  USER_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
};

class CacheManager {
  constructor() {
    this.cachePrefix = 'paveboard_cache_';
    this.cleanupInterval = null;
    this.startCleanupInterval();
  }

  // Generate cache key
  generateKey(type, identifier) {
    return `${this.cachePrefix}${type}_${identifier}`;
  }

  // Set data in cache with expiration
  setCache(type, identifier, data, customExpiration = null) {
    try {
      const expiration = customExpiration || this.getDefaultExpiration(type);
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiration,
        type,
        identifier
      };

      const key = this.generateKey(type, identifier);
      localStorage.setItem(key, JSON.stringify(cacheData));
      
      console.log(`✅ Cached ${type} data for ${identifier}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cache data:', error);
      return false;
    }
  }

  // Get data from cache
  getCache(type, identifier) {
    try {
      const key = this.generateKey(type, identifier);
      const cached = localStorage.getItem(key);
      
      if (!cached) {
        return null;
      }

      const cacheData = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - cacheData.timestamp > cacheData.expiration) {
        this.removeCache(type, identifier);
        console.log(`⏰ Cache expired for ${type}_${identifier}`);
        return null;
      }

      console.log(`📦 Retrieved ${type} data from cache for ${identifier}`);
      return cacheData.data;
    } catch (error) {
      console.error('❌ Failed to retrieve cache:', error);
      return null;
    }
  }

  // Remove specific cache entry
  removeCache(type, identifier) {
    try {
      const key = this.generateKey(type, identifier);
      localStorage.removeItem(key);
      console.log(`🗑️ Removed cache for ${type}_${identifier}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to remove cache:', error);
      return false;
    }
  }

  // Clear all cache entries
  clearAllCache() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log(`🧹 Cleared ${cacheKeys.length} cache entries`);
      return true;
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      return false;
    }
  }

  // Get cache statistics
  getCacheStats() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      
      let totalSize = 0;
      let validEntries = 0;
      let expiredEntries = 0;

      cacheKeys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          totalSize += cached.length;
          const cacheData = JSON.parse(cached);
          
          if (Date.now() - cacheData.timestamp > cacheData.expiration) {
            expiredEntries++;
          } else {
            validEntries++;
          }
        }
      });

      return {
        totalEntries: cacheKeys.length,
        validEntries,
        expiredEntries,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        maxSize: `${(CACHE_CONFIG.MAX_CACHE_SIZE / 1024 / 1024).toFixed(2)} MB`
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return null;
    }
  }

  // Get default expiration time for cache type
  getDefaultExpiration(type) {
    switch (type) {
      case 'orders':
        return CACHE_CONFIG.ORDERS_CACHE_DURATION;
      case 'organization':
        return CACHE_CONFIG.ORGANIZATION_CACHE_DURATION;
      case 'user':
        return CACHE_CONFIG.USER_CACHE_DURATION;
      default:
        return 5 * 60 * 1000; // 5 minutes default
    }
  }

  // Cleanup expired cache entries
  cleanupExpiredCache() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      let cleanedCount = 0;

      cacheKeys.forEach(key => {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp > cacheData.expiration) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          } catch (error) {
            // Remove corrupted cache entries
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      });

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
      }
      return cleanedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup cache:', error);
      return 0;
    }
  }

  // Start automatic cleanup interval
  startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 10 * 60 * 1000);
  }

  // Stop cleanup interval
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Smart fetch with cache-first strategy
  async smartFetch(type, identifier, fetchFunction, customExpiration = null) {
    // Try to get from cache first
    const cachedData = this.getCache(type, identifier);
    if (cachedData) {
      return {
        data: cachedData,
        fromCache: true,
        timestamp: Date.now()
      };
    }

    // If not in cache, fetch fresh data
    try {
      console.log(`🔄 Fetching fresh ${type} data for ${identifier}`);
      const freshData = await fetchFunction();
      
      // Cache the fresh data
      this.setCache(type, identifier, freshData, customExpiration);
      
      return {
        data: freshData,
        fromCache: false,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`❌ Failed to fetch ${type} data:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Export utility functions
export const cacheUtils = {
  // Orders caching
  cacheOrders: (orgID, orders) => cacheManager.setCache('orders', orgID, orders),
  getCachedOrders: (orgID) => cacheManager.getCache('orders', orgID),
  clearOrdersCache: (orgID) => cacheManager.removeCache('orders', orgID),

  // Organization caching
  cacheOrganization: (orgID, orgData) => cacheManager.setCache('organization', orgID, orgData),
  getCachedOrganization: (orgID) => cacheManager.getCache('organization', orgID),
  clearOrganizationCache: (orgID) => cacheManager.removeCache('organization', orgID),

  // User caching
  cacheUser: (userID, userData) => cacheManager.setCache('user', userID, userData),
  getCachedUser: (userID) => cacheManager.getCache('user', userID),
  clearUserCache: (userID) => cacheManager.removeCache('user', userID),

  // General utilities
  clearAllCache: () => cacheManager.clearAllCache(),
  getCacheStats: () => cacheManager.getCacheStats(),
  cleanupExpiredCache: () => cacheManager.cleanupExpiredCache(),

  // Smart fetch
  smartFetchOrders: (orgID, fetchFunction) => 
    cacheManager.smartFetch('orders', orgID, fetchFunction),
  smartFetchOrganization: (orgID, fetchFunction) => 
    cacheManager.smartFetch('organization', orgID, fetchFunction),
  smartFetchUser: (userID, fetchFunction) => 
    cacheManager.smartFetch('user', userID, fetchFunction)
};

export default cacheManager;
