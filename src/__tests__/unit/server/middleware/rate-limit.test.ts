/**
 * Rate Limit Middleware Tests
 *
 * Tests for rate limiting middleware functionality.
 *
 * Requirements: 18.2
 */

import type { NextFunction, Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRateLimitMiddleware,
  createRateLimiterInstance,
} from "../../../../server/middleware/rate-limit.js";

describe("Rate Limit Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let headers: Record<string, string>;
  let statusCode: number;
  let responseBody: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    headers = {};
    statusCode = 200;
    responseBody = null;

    mockReq = {
      headers: {},
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" } as any,
    };
    mockRes = {
      setHeader: vi.fn((key: string, value: string) => {
        headers[key] = value;
        return mockRes as Response;
      }),
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockRes as Response;
      }),
      json: vi.fn((body: unknown) => {
        responseBody = body;
        return mockRes as Response;
      }),
      on: vi.fn(),
      statusCode: 200,
    };
    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createRateLimitMiddleware", () => {
    it("should allow requests within rate limit", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 10,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBeDefined();
    });

    it("should set rate limit headers", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 100,
        headers: true,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(headers["X-RateLimit-Limit"]).toBe("100");
      expect(headers["X-RateLimit-Remaining"]).toBeDefined();
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
    });

    it("should not set headers when disabled", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 100,
        headers: false,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(headers["X-RateLimit-Limit"]).toBeUndefined();
      expect(headers["X-RateLimit-Remaining"]).toBeUndefined();
    });

    it("should block requests exceeding rate limit", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 2,
      });

      // First two requests should pass
      middleware(mockReq as Request, mockRes as Response, mockNext);
      // Simulate the finish event to record the request
      const finishCallback = (mockRes.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === "finish"
      )?.[1];
      if (finishCallback) finishCallback();

      middleware(mockReq as Request, mockRes as Response, mockNext);
      if (finishCallback) finishCallback();

      // Third request should be blocked
      const mockNext2 = vi.fn();
      middleware(mockReq as Request, mockRes as Response, mockNext2);

      expect(statusCode).toBe(429);
      expect(responseBody).toMatchObject({
        success: false,
        code: "RATE_LIMITED",
      });
    });

    it("should return 429 with Retry-After header when rate limited", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 1,
      });

      // First request
      middleware(mockReq as Request, mockRes as Response, mockNext);
      const finishCallback = (mockRes.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === "finish"
      )?.[1];
      if (finishCallback) finishCallback();

      // Second request should be rate limited
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusCode).toBe(429);
      expect(headers["Retry-After"]).toBeDefined();
    });

    it("should use custom key generator", () => {
      const keyGenerator = vi.fn().mockReturnValue("custom-key");
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(keyGenerator).toHaveBeenCalledWith(mockReq);
    });

    it("should skip requests when skip function returns true", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 1,
        skip: () => true,
      });

      // Multiple requests should all pass because skip returns true
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it("should use X-Forwarded-For header when present", () => {
      const keyGenerator = vi.fn().mockImplementation((req: Request) => {
        const forwarded = req.headers["x-forwarded-for"];
        if (typeof forwarded === "string") {
          return forwarded.split(",")[0].trim();
        }
        return req.ip ?? "unknown";
      });

      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator,
      });

      mockReq.headers = { "x-forwarded-for": "192.168.1.1, 10.0.0.1" };
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(keyGenerator).toHaveBeenCalled();
    });

    it("should use custom handler when rate limited", () => {
      const customHandler = vi.fn();
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 1,
        handler: customHandler,
      });

      // First request
      middleware(mockReq as Request, mockRes as Response, mockNext);
      const finishCallback = (mockRes.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === "finish"
      )?.[1];
      if (finishCallback) finishCallback();

      // Second request should trigger custom handler
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(customHandler).toHaveBeenCalled();
    });

    it("should reset rate limit after window expires", () => {
      const middleware = createRateLimitMiddleware({
        windowMs: 60000,
        maxRequests: 1,
      });

      // First request
      middleware(mockReq as Request, mockRes as Response, mockNext);
      const finishCallback = (mockRes.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call) => call[0] === "finish"
      )?.[1];
      if (finishCallback) finishCallback();

      // Second request should be blocked
      const mockNext2 = vi.fn();
      middleware(mockReq as Request, mockRes as Response, mockNext2);
      expect(statusCode).toBe(429);

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Third request should pass (new window)
      const mockNext3 = vi.fn();
      statusCode = 200;
      middleware(mockReq as Request, mockRes as Response, mockNext3);
      expect(mockNext3).toHaveBeenCalled();
    });
  });

  describe("createRateLimiterInstance", () => {
    it("should create a rate limiter instance", () => {
      const limiter = createRateLimiterInstance({
        windowMs: 60000,
        maxRequests: 100,
      });

      expect(limiter).toBeDefined();
      expect(limiter.check).toBeDefined();
      expect(limiter.record).toBeDefined();
      expect(limiter.consume).toBeDefined();
    });

    it("should use default configuration", () => {
      const limiter = createRateLimiterInstance();

      const result = limiter.check({ ip: "127.0.0.1" });
      expect(result.allowed).toBe(true);
    });
  });
});
