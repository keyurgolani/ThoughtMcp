/**
 * Rate Limiting Middleware
 *
 * Implements HTTP rate limiting for the REST API using the existing RateLimiter.
 * Adds rate limit headers to responses and returns 429 when limit exceeded.
 *
 * Requirements: 18.2
 */

import type { NextFunction, Request, Response } from "express";
import { RateLimiter } from "../../security/rate-limiter.js";

/** Rate limit middleware configuration */
export interface RateLimitMiddlewareConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  maxRequests: number;
  /** Custom key generator function */
  keyGenerator?: (req: Request) => string;
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean;
  /** Custom handler for rate limit exceeded */
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  /** Include rate limit headers in response */
  headers?: boolean;
  /** Skip failed requests from counting */
  skipFailedRequests?: boolean;
  /** Skip successful requests from counting */
  skipSuccessfulRequests?: boolean;
}

/** Default rate limit configuration */
const DEFAULT_CONFIG: Required<RateLimitMiddlewareConfig> = {
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if behind proxy, otherwise use IP
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? "unknown";
  },
  skip: () => false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: "Rate limit exceeded",
      code: "RATE_LIMITED",
      suggestion: "Please wait before making more requests",
    });
  },
  headers: true,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
};

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(config: Partial<RateLimitMiddlewareConfig> = {}) {
  const rateLimitConfig: Required<RateLimitMiddlewareConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const limiter = new RateLimiter({
    windowMs: rateLimitConfig.windowMs,
    maxRequests: rateLimitConfig.maxRequests,
    keyGenerator: (ctx) => ctx.ip ?? "unknown",
    skipFailedRequests: rateLimitConfig.skipFailedRequests,
    skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if request should be skipped
    if (rateLimitConfig.skip(req)) {
      next();
      return;
    }

    const key = rateLimitConfig.keyGenerator(req);
    const result = limiter.check({ ip: key });

    // Add rate limit headers if enabled
    if (rateLimitConfig.headers) {
      res.setHeader("X-RateLimit-Limit", rateLimitConfig.maxRequests.toString());
      res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
      res.setHeader("X-RateLimit-Reset", result.resetTime.toISOString());
    }

    // Check if rate limit exceeded
    if (!result.allowed) {
      if (rateLimitConfig.headers && result.retryAfter !== undefined) {
        res.setHeader("Retry-After", result.retryAfter.toString());
      }
      rateLimitConfig.handler(req, res, next);
      return;
    }

    // Record the request after response is sent
    res.on("finish", () => {
      const success = res.statusCode < 400;
      limiter.record({ ip: key }, success);
    });

    next();
  };
}

/**
 * Create a rate limiter instance for manual control
 * Useful for testing or custom rate limiting scenarios
 */
export function createRateLimiterInstance(
  config: Partial<RateLimitMiddlewareConfig> = {}
): RateLimiter {
  const rateLimitConfig = { ...DEFAULT_CONFIG, ...config };
  return new RateLimiter({
    windowMs: rateLimitConfig.windowMs,
    maxRequests: rateLimitConfig.maxRequests,
    skipFailedRequests: rateLimitConfig.skipFailedRequests,
    skipSuccessfulRequests: rateLimitConfig.skipSuccessfulRequests,
  });
}
