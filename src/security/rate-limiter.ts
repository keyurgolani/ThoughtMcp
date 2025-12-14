/**
 * Rate Limiter
 *
 * Implements rate limiting to prevent abuse and ensure fair resource usage.
 * Uses a sliding window algorithm for accurate rate limiting.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type {
  RateLimitConfig,
  RateLimitContext,
  RateLimitEntry,
  RateLimitResult,
} from "./types.js";

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyGenerator: (ctx) => ctx.userId ?? ctx.ip ?? "anonymous",
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
};

/**
 * Rate Limiter class
 *
 * Implements sliding window rate limiting with configurable options
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private entries: Map<string, RateLimitEntry>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.entries = new Map();

    // Start cleanup interval to prevent memory leaks
    this.startCleanup();
  }

  /**
   * Check if a request is allowed under rate limits
   */
  check(context: RateLimitContext): RateLimitResult {
    const key = this.config.keyGenerator(context);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.entries.get(key);

    // If no entry or entry is from a previous window, create new entry
    if (!entry || entry.windowStart < windowStart) {
      entry = {
        count: 0,
        windowStart: now,
        lastRequest: now,
      };
    }

    // Calculate remaining requests
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const resetTime = new Date(entry.windowStart + this.config.windowMs);

    // Check if rate limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.windowStart + this.config.windowMs - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    return {
      allowed: true,
      remaining: remaining - 1, // Account for this request
      resetTime,
    };
  }

  /**
   * Record a request (increment counter)
   */
  record(context: RateLimitContext, success: boolean = true): void {
    // Skip recording based on configuration
    if (this.config.skipFailedRequests && !success) {
      return;
    }
    if (this.config.skipSuccessfulRequests && success) {
      return;
    }

    const key = this.config.keyGenerator(context);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.entries.get(key);

    // If no entry or entry is from a previous window, create new entry
    if (!entry || entry.windowStart < windowStart) {
      entry = {
        count: 1,
        windowStart: now,
        lastRequest: now,
      };
    } else {
      entry.count++;
      entry.lastRequest = now;
    }

    this.entries.set(key, entry);
  }

  /**
   * Check and record in one operation
   */
  consume(context: RateLimitContext): RateLimitResult {
    const result = this.check(context);

    if (result.allowed) {
      this.record(context);
    }

    return result;
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(context: RateLimitContext): void {
    const key = this.config.keyGenerator(context);
    this.entries.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.entries.clear();
  }

  /**
   * Get current stats for a key
   */
  getStats(context: RateLimitContext): {
    count: number;
    remaining: number;
    resetTime: Date;
  } | null {
    const key = this.config.keyGenerator(context);
    const entry = this.entries.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Check if entry is still valid
    if (entry.windowStart < windowStart) {
      return null;
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: new Date(entry.windowStart + this.config.windowMs),
    };
  }

  /**
   * Get total number of tracked keys
   */
  getTrackedCount(): number {
    return this.entries.size;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);

    // Prevent interval from keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, entry] of this.entries) {
      if (entry.windowStart < windowStart) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Stop the rate limiter and cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }
}

/**
 * Create a rate limiter with default configuration
 */
export function createRateLimiter(config?: RateLimitConfig): RateLimiter {
  return new RateLimiter(config);
}

/**
 * Create a rate limiter for MCP tools
 * Default: 100 requests per minute per user
 */
export function createToolRateLimiter(maxRequestsPerMinute: number = 100): RateLimiter {
  return new RateLimiter({
    windowMs: 60000,
    maxRequests: maxRequestsPerMinute,
    keyGenerator: (ctx) => `tool:${ctx.userId ?? "anonymous"}:${ctx.toolName ?? "default"}`,
  });
}

/**
 * Create a rate limiter for memory operations
 * Default: 50 requests per minute per user
 */
export function createMemoryRateLimiter(maxRequestsPerMinute: number = 50): RateLimiter {
  return new RateLimiter({
    windowMs: 60000,
    maxRequests: maxRequestsPerMinute,
    keyGenerator: (ctx) => `memory:${ctx.userId ?? "anonymous"}`,
  });
}
