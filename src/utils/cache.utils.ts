import { FastifyRequest, FastifyReply } from "fastify";
import { OutputType, print } from "../helpers/print";

interface CacheEntry {
  data: any;
  expiry: number;
  created: number;
}

interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize: number;
  prefix?: string;
}

/**
 * In-memory cache implementation with TTL and size limits
 */
export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = {
      ...{
        ttl: 300, // 5 minutes default
        maxSize: 1000,
        prefix: "app_cache",
      },
      ...config,
    };

    // Cleanup expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Set cache entry
   */
  set(key: string, data: any, customTtl?: number): void {
    const ttl = customTtl || this.config.ttl;
    const prefixedKey = this.getPrefixedKey(key);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(prefixedKey, {
      data,
      expiry: Date.now() + ttl * 1000,
      created: Date.now(),
    });
  }

  /**
   * Get cache entry
   */
  get<T = any>(key: string): T | null {
    const prefixedKey = this.getPrefixedKey(key);
    const entry = this.cache.get(prefixedKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(prefixedKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    const prefixedKey = this.getPrefixedKey(key);
    return this.cache.delete(prefixedKey);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): object {
    let expiredCount = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache) {
      if (Date.now() > entry.expiry) {
        expiredCount++;
      }
      totalSize += JSON.stringify(entry).length;
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      expired: expiredCount,
      totalSizeBytes: totalSize,
      hitRate: this.getHitRate(),
    };
  }

  private getPrefixedKey(key: string): string {
    return `${this.config.prefix}:${key}`;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      print(
        `Cache cleanup: removed ${cleanedCount} expired entries`,
        OutputType.SUCCESS
      );
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.created < oldestTime) {
        oldestTime = entry.created;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private hitRate: number = 0;
  private hits: number = 0;
  private misses: number = 0;

  private getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }
}

/**
 * Cache middleware for Fastify routes
 */
export class CacheMiddleware {
  private cache: MemoryCache;

  constructor(cacheConfig?: Partial<CacheConfig>) {
    this.cache = new MemoryCache({
      ttl: parseInt(process.env.CACHE_TTL || "300"),
      maxSize: 1000,
      ...cacheConfig,
    });
  }

  /**
   * Cache middleware for GET requests
   */
  middleware(ttl?: number) {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      // Only cache GET requests
      if (req.method !== "GET") {
        return;
      }

      const cacheKey = this.generateCacheKey(req);
      const cachedResponse = this.cache.get(cacheKey);

      if (cachedResponse) {
        reply.header("X-Cache", "HIT");
        reply.send(cachedResponse);
        return;
      }

      // Store original send method
      const originalSend = reply.send.bind(reply);

      // Override send method to cache response
      const self = this;
      reply.send = function (payload: any) {
        if (reply.statusCode === 200) {
          self.cache.set(cacheKey, payload, ttl);
        }
        reply.header("X-Cache", "MISS");
        return originalSend(payload);
      };
    };
  }

  /**
   * Invalidate cache for specific pattern
   */
  invalidate(pattern: string): number {
    let invalidated = 0;
    const prefixedPattern = `${this.cache["config"].prefix}:${pattern}`;

    for (const key of this.cache["cache"].keys()) {
      if (key.includes(prefixedPattern)) {
        this.cache["cache"].delete(key);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      print(
        `Cache invalidated: ${invalidated} entries for pattern '${pattern}'`,
        OutputType.SUCCESS
      );
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): object {
    return this.cache.getStats();
  }

  private generateCacheKey(req: FastifyRequest): string {
    const url = req.url;
    const query = JSON.stringify(req.query);
    const user = (req as any).user?.userId || "anonymous";

    return `${req.method}:${url}:${query}:${user}`;
  }
}

/**
 * Database query result caching
 */
export class QueryCache {
  private static cache = new MemoryCache({
    ttl: 600, // 10 minutes for database queries
    maxSize: 500,
    prefix: "query_cache",
  });

  /**
   * Cache database query result
   */
  static async cacheQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.cache.get<T>(queryKey);

    if (cached !== null) {
      print(`Query cache HIT: ${queryKey}`, OutputType.SUCCESS);
      return cached;
    }

    print(`Query cache MISS: ${queryKey}`, OutputType.WARNING);
    const result = await queryFn();

    if (result) {
      this.cache.set(queryKey, result, ttl);
    }

    return result;
  }

  /**
   * Invalidate query cache
   */
  static invalidateQuery(pattern: string): void {
    // Clear entries matching pattern
    for (const key of this.cache["cache"].keys()) {
      if (key.includes(pattern)) {
        this.cache["cache"].delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  static getStats(): object {
    return this.cache.getStats();
  }
}

// Global cache instances
export const appCache = new MemoryCache({
  ttl: parseInt(process.env.CACHE_TTL || "300"),
  maxSize: 1000,
  prefix: "app",
});

export const cacheMiddleware = new CacheMiddleware();
