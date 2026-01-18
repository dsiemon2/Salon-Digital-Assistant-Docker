import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!_redis && process.env.REDIS_URL) {
    try {
      _redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
      _redis.on('error', () => {
        // Silently ignore Redis errors for local dev
      });
    } catch {
      return null;
    }
  }
  return _redis;
}

// For backwards compatibility - but won't auto-connect
export const redis = {
  get client() {
    return getRedis();
  }
} as unknown as Redis;
