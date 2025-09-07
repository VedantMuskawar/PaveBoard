import { useState, useEffect } from 'react';
import { cacheUtils } from '../utils/cacheManager';
import { Card, Button, Badge } from './ui';

const CacheStatus = ({ orgID }) => {
  const [cacheStats, setCacheStats] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    updateCacheStats();
  }, [orgID]);

  const updateCacheStats = () => {
    const stats = cacheUtils.getCacheStats();
    setCacheStats(stats);
  };

  const handleClearAllCache = () => {
    cacheUtils.clearAllCache();
    updateCacheStats();
  };

  const handleCleanupExpired = () => {
    const cleanedCount = cacheUtils.cleanupExpiredCache();
    updateCacheStats();
    return cleanedCount;
  };

  if (!cacheStats) return null;

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-lg">💾</span>
            <span className="font-semibold text-white">Cache Status</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="success" className="text-sm">
              {cacheStats.validEntries} Active
            </Badge>
            {cacheStats.expiredEntries > 0 && (
              <Badge variant="warning" className="text-sm">
                {cacheStats.expiredEntries} Expired
              </Badge>
            )}
            <Badge variant="info" className="text-sm">
              {cacheStats.totalSize}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const cleaned = handleCleanupExpired();
              if (cleaned > 0) {
                console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
              }
            }}
            title="Remove expired cache entries"
          >
            🧹 Cleanup
          </Button>
          
          <Button
            variant="danger"
            size="sm"
            onClick={handleClearAllCache}
            title="Clear all cached data"
          >
            🗑️ Clear All
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Total Entries</div>
              <div className="text-white font-semibold">{cacheStats.totalEntries}</div>
            </div>
            <div>
              <div className="text-slate-400">Valid Entries</div>
              <div className="text-green-400 font-semibold">{cacheStats.validEntries}</div>
            </div>
            <div>
              <div className="text-slate-400">Expired Entries</div>
              <div className="text-yellow-400 font-semibold">{cacheStats.expiredEntries}</div>
            </div>
            <div>
              <div className="text-slate-400">Cache Size</div>
              <div className="text-blue-400 font-semibold">{cacheStats.totalSize}</div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-slate-500">
            <div>📦 Orders cache: 5 minutes</div>
            <div>🏢 Organization cache: 30 minutes</div>
            <div>👤 User cache: 24 hours</div>
            <div>🔄 Auto cleanup: Every 10 minutes</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CacheStatus;
