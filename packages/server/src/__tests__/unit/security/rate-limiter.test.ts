/**
 * Rate Limiter Tests
 *
 * Tests for rate limiting functionality.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RateLimiter,
  createMemoryRateLimiter,
  createRateLimiter,
  createToolRateLimiter,
} from "../../../security/rate-limiter.js";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 10,
    });
  });

  afterEach(() => {
    limiter.stop();
    vi.useRealTimers();
  });

  describe("check()", () => {
    it("should allow requests under the limit", () => {
      const context = { userId: "user1" };
      const result = limiter.check(context);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // 10 - 1 for this request
    });

    it("should track remaining requests correctly", () => {
      const context = { userId: "user1" };

      // Record 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.record(context);
      }

      const result = limiter.check(context);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 5 - 1 for this check
    });

    it("should deny requests over the limit", () => {
      const context = { userId: "user1" };

      // Record 10 requests (max)
      for (let i = 0; i < 10; i++) {
        limiter.record(context);
      }

      const result = limiter.check(context);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should track different users separately", () => {
      const user1 = { userId: "user1" };
      const user2 = { userId: "user2" };

      // Max out user1
      for (let i = 0; i < 10; i++) {
        limiter.record(user1);
      }

      // User1 should be denied
      expect(limiter.check(user1).allowed).toBe(false);

      // User2 should still be allowed
      expect(limiter.check(user2).allowed).toBe(true);
    });

    it("should reset after window expires", () => {
      const context = { userId: "user1" };

      // Max out requests
      for (let i = 0; i < 10; i++) {
        limiter.record(context);
      }

      expect(limiter.check(context).allowed).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      expect(limiter.check(context).allowed).toBe(true);
    });
  });

  describe("record()", () => {
    it("should increment the counter", () => {
      const context = { userId: "user1" };

      limiter.record(context);
      const stats = limiter.getStats(context);

      expect(stats?.count).toBe(1);
    });

    it("should skip failed requests when configured", () => {
      const skipLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        skipFailedRequests: true,
      });

      const context = { userId: "user1" };

      skipLimiter.record(context, false); // Failed request
      const stats = skipLimiter.getStats(context);

      expect(stats).toBeNull(); // No entry created

      skipLimiter.stop();
    });

    it("should skip successful requests when configured", () => {
      const skipLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: true,
      });

      const context = { userId: "user1" };

      skipLimiter.record(context, true); // Successful request
      const stats = skipLimiter.getStats(context);

      expect(stats).toBeNull(); // No entry created

      skipLimiter.stop();
    });
  });

  describe("consume()", () => {
    it("should check and record in one operation", () => {
      const context = { userId: "user1" };

      const result = limiter.consume(context);

      expect(result.allowed).toBe(true);
      expect(limiter.getStats(context)?.count).toBe(1);
    });

    it("should not record when denied", () => {
      const context = { userId: "user1" };

      // Max out requests
      for (let i = 0; i < 10; i++) {
        limiter.record(context);
      }

      const result = limiter.consume(context);

      expect(result.allowed).toBe(false);
      expect(limiter.getStats(context)?.count).toBe(10); // Still 10, not 11
    });
  });

  describe("reset()", () => {
    it("should reset rate limit for a specific key", () => {
      const context = { userId: "user1" };

      // Record some requests
      for (let i = 0; i < 5; i++) {
        limiter.record(context);
      }

      expect(limiter.getStats(context)?.count).toBe(5);

      limiter.reset(context);

      expect(limiter.getStats(context)).toBeNull();
    });
  });

  describe("resetAll()", () => {
    it("should reset all rate limits", () => {
      const user1 = { userId: "user1" };
      const user2 = { userId: "user2" };

      limiter.record(user1);
      limiter.record(user2);

      expect(limiter.getTrackedCount()).toBe(2);

      limiter.resetAll();

      expect(limiter.getTrackedCount()).toBe(0);
    });
  });

  describe("getStats()", () => {
    it("should return null for unknown key", () => {
      const context = { userId: "unknown" };
      expect(limiter.getStats(context)).toBeNull();
    });

    it("should return stats for tracked key", () => {
      const context = { userId: "user1" };
      limiter.record(context);

      const stats = limiter.getStats(context);

      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
      expect(stats?.remaining).toBe(9);
      expect(stats?.resetTime).toBeInstanceOf(Date);
    });

    it("should return null for expired entries", () => {
      const context = { userId: "user1" };
      limiter.record(context);

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      expect(limiter.getStats(context)).toBeNull();
    });
  });

  describe("custom key generator", () => {
    it("should use custom key generator", () => {
      const customLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: (ctx) => `${ctx.userId}:${ctx.toolName}`,
      });

      const context1 = { userId: "user1", toolName: "tool1" };
      const context2 = { userId: "user1", toolName: "tool2" };

      // Record for tool1
      for (let i = 0; i < 10; i++) {
        customLimiter.record(context1);
      }

      // Tool1 should be denied
      expect(customLimiter.check(context1).allowed).toBe(false);

      // Tool2 should still be allowed (different key)
      expect(customLimiter.check(context2).allowed).toBe(true);

      customLimiter.stop();
    });
  });

  describe("factory functions", () => {
    it("should create a default rate limiter", () => {
      const defaultLimiter = createRateLimiter();
      expect(defaultLimiter).toBeInstanceOf(RateLimiter);
      defaultLimiter.stop();
    });

    it("should create a tool rate limiter", () => {
      const toolLimiter = createToolRateLimiter(50);
      const context = { userId: "user1", toolName: "test" };

      // Should use tool-specific key
      toolLimiter.record(context);
      expect(toolLimiter.getTrackedCount()).toBe(1);

      toolLimiter.stop();
    });

    it("should create a memory rate limiter", () => {
      const memoryLimiter = createMemoryRateLimiter(25);
      const context = { userId: "user1" };

      // Should use memory-specific key
      memoryLimiter.record(context);
      expect(memoryLimiter.getTrackedCount()).toBe(1);

      memoryLimiter.stop();
    });
  });

  describe("cleanup", () => {
    it("should clean up expired entries", () => {
      const context = { userId: "user1" };
      limiter.record(context);

      expect(limiter.getTrackedCount()).toBe(1);

      // Advance time past the window plus cleanup interval
      vi.advanceTimersByTime(120000);

      // Trigger cleanup by advancing timers
      vi.runOnlyPendingTimers();

      expect(limiter.getTrackedCount()).toBe(0);
    });
  });
});
