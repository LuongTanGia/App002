import { FastifyRequest, FastifyReply } from "fastify";
import { SecurityConfig } from "../config/security.config";
import HttpStatusCode from "../errors/HttpStatusCode";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    });
  }

  private getKey(request: FastifyRequest): string {
    // Use IP address as the key, but could be enhanced with user ID, etc.
    const forwarded = request.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.toString().split(",")[0] : request.ip;
    return `ratelimit:${ip}`;
  }

  async isAllowed(
    request: FastifyRequest
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(request);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    if (!this.store[key] || this.store[key].resetTime <= now) {
      // First request or window expired
      this.store[key] = {
        count: 1,
        resetTime,
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
      };
    }

    const entry = this.store[key];

    if (entry.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  middleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await this.isAllowed(request);

      // Set rate limit headers
      reply.header("X-RateLimit-Limit", this.config.maxRequests);
      reply.header("X-RateLimit-Remaining", result.remaining);
      reply.header(
        "X-RateLimit-Reset",
        new Date(result.resetTime).toISOString()
      );

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        reply.header("Retry-After", retryAfter);

        reply.status(HttpStatusCode.TOO_MANY_REQUESTS).send({
          error: this.config.message || "Too many requests",
          retryAfter,
        });
      }
    };
  }
}

// Pre-configured rate limiters
export const globalRateLimiter = new RateLimiter({
  windowMs: SecurityConfig.RATE_LIMIT.GLOBAL.WINDOW_MS,
  maxRequests: SecurityConfig.RATE_LIMIT.GLOBAL.MAX_REQUESTS,
  message: "Too many requests from this IP, please try again later",
});

export const authRateLimiter = new RateLimiter({
  windowMs: SecurityConfig.RATE_LIMIT.AUTH.WINDOW_MS,
  maxRequests: SecurityConfig.RATE_LIMIT.AUTH.MAX_REQUESTS,
  message: "Too many authentication attempts, please try again later",
});

export const apiRateLimiter = new RateLimiter({
  windowMs: SecurityConfig.RATE_LIMIT.API.WINDOW_MS,
  maxRequests: SecurityConfig.RATE_LIMIT.API.MAX_REQUESTS,
  message: "API rate limit exceeded, please try again later",
});
