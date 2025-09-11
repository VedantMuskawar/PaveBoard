// Enhanced Cache Manager for Scheduled Orders Dashboard
class CacheManager {
  constructor() {
    this.CACHE_PREFIX = 'paveboard_scheduled_orders_';
    this.CACHE_VERSION = '1.0';
    this.DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
    this.MAX_CACHE_SIZE = 50; // Maximum number of cached items
  }

  // Generate cache key with versioning
  getCacheKey(key) {
    return `${this.CACHE_PREFIX}${this.CACHE_VERSION}_${key}`;
  }

  // Safe JSON parse with fallback
  safeJsonParse(str, fallback = null) {
    try {
      return JSON.parse(str);
    } catch (error) {
      console.warn('Cache parse error:', error);
      return fallback;
    }
  }

  // Safe JSON stringify with fallback
  safeJsonStringify(obj, fallback = '{}') {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      console.warn('Cache stringify error:', error);
      return fallback;
    }
  }

  // Check if cache entry is valid
  isValidCacheEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    if (!entry.timestamp || !entry.data) return false;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < (entry.ttl || this.DEFAULT_TTL);
  }

  // Get cached data
  get(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const entry = this.safeJsonParse(cached);
      
      if (this.isValidCacheEntry(entry)) {
        return entry.data;
      } else {
        // Remove expired cache
        this.remove(key);
        return null;
      }
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  // Set cached data
  set(key, data, ttl = this.DEFAULT_TTL) {
    try {
      const cacheKey = this.getCacheKey(key);
      const entry = {
        data,
        timestamp: Date.now(),
        ttl,
        version: this.CACHE_VERSION
      };
      
      const serialized = this.safeJsonStringify(entry);
      
      // Check cache size and clean up if needed
      this.cleanupCache();
      
      localStorage.setItem(cacheKey, serialized);
      return true;
    } catch (error) {
      console.warn('Cache set error:', error);
      // If storage is full, try to clean up and retry once
      if (error.name === 'QuotaExceededError') {
        this.clearAll();
        try {
          localStorage.setItem(this.getCacheKey(key), this.safeJsonStringify({
            data,
            timestamp: Date.now(),
            ttl,
            version: this.CACHE_VERSION
          }));
          return true;
        } catch (retryError) {
          console.warn('Cache retry failed:', retryError);
          return false;
        }
      }
      return false;
    }
  }

  // Remove specific cache entry
  remove(key) {
    try {
      const cacheKey = this.getCacheKey(key);
      localStorage.removeItem(cacheKey);
      return true;
    } catch (error) {
      console.warn('Cache remove error:', error);
      return false;
    }
  }

  // Clean up expired and old cache entries
  cleanupCache() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length <= this.MAX_CACHE_SIZE) return;
      
      // Sort by timestamp and remove oldest entries
      const entries = cacheKeys.map(key => {
        try {
          const data = localStorage.getItem(key);
          const entry = this.safeJsonParse(data);
          return { key, timestamp: entry?.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(({ key }) => localStorage.removeItem(key));
      
    } catch (error) {
      console.warn('Cache cleanup error:', error);
    }
  }

  // Clear all cache entries
  clearAll() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      cacheKeys.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('Cache clear error:', error);
      return false;
    }
  }

  // Get cache statistics
  getStats() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      let totalSize = 0;
      let validEntries = 0;
      let expiredEntries = 0;
      
      cacheKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          totalSize += data.length;
          
          const entry = this.safeJsonParse(data);
          if (this.isValidCacheEntry(entry)) {
            validEntries++;
          } else {
            expiredEntries++;
          }
        } catch {
          expiredEntries++;
        }
      });
      
      return {
        totalEntries: cacheKeys.length,
        validEntries,
        expiredEntries,
        totalSizeKB: Math.round(totalSize / 1024 * 100) / 100
      };
    } catch (error) {
      console.warn('Cache stats error:', error);
      return { totalEntries: 0, validEntries: 0, expiredEntries: 0, totalSizeKB: 0 };
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

export default cacheManager;