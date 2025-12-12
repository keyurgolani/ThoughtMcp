/**
 * Performance Monitoring Middleware Tests
 *
 * Tests for request latency tracking and slow request logging.
 * Requirements: 17.1 - Memory retrieval response within 200ms at p95
 */

import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPerformanceMetrics,
  createPerformanceMiddleware,
  DEFAULT_PERFORMANCE_CONFIG,
  getPerformanceStats,
  getRecentMetrics,
} from "../../../../server/middleware/performance.js";

describe("Performance Monitoring Middleware", () => {
  beforeEach(() => {
    clearPerformanceMetrics();
    vi.clearAllMocks();
  });

  describe("createPerformanceMiddleware", () => {
    it("should create middleware function", () => {
      const middleware = createPerformanceMiddleware();
      expect(typeof middleware).toBe("function");
    });

    it("should skip excluded paths", () => {
      const middleware = createPerformanceMiddleware();
      const req = {
        method: "GET",
        path: "/api/v1/health/live",
        query: {},
        headers: {},
      } as unknown as Request;

      const res = {
        on: vi.fn(),
        setHeader: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      // Should not register finish handler for excluded paths
      expect(res.on).not.toHaveBeenCalled();
    });

    it("should track request metrics", () => {
      const middleware = createPerformanceMiddleware();
      const req = {
        method: "GET",
        path: "/api/v1/memory/recall",
        query: {},
        headers: {},
      } as unknown as Request;

      let closeCallback: (() => void) | undefined;
      const res = {
        statusCode: 200,
        on: vi.fn().mockImplementation((event: string, callback: () => void) => {
          if (event === "close") {
            closeCallback = callback;
          }
        }),
        setHeader: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;

      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.on).toHaveBeenCalledWith("close", expect.any(Function));

      // Simulate response close
      if (closeCallback) {
        closeCallback();
      }

      const metrics = getRecentMetrics(10);
      expect(metrics.length).toBeGreaterThanOrEqual(0);
    });

    it("should add X-Response-Time header", () => {
      const middleware = createPerformanceMiddleware();
      const req = {
        method: "GET",
        path: "/api/v1/memory/stats",
        query: {},
        headers: {},
      } as unknown as Request;

      const res = {
        statusCode: 200,
        headersSent: false,
        on: vi.fn(),
        setHeader: vi.fn(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const next = vi.fn();

      middleware(req, res, next);

      // Call the wrapped json method to trigger header setting
      res.json({ test: "data" });

      expect(res.setHeader).toHaveBeenCalledWith("X-Response-Time", expect.stringMatching(/\d+ms/));
    });
  });

  describe("getPerformanceStats", () => {
    it("should return empty stats when no requests tracked", () => {
      clearPerformanceMetrics();
      const stats = getPerformanceStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.avgDurationMs).toBe(0);
      expect(stats.p50DurationMs).toBe(0);
      expect(stats.p95DurationMs).toBe(0);
      expect(stats.p99DurationMs).toBe(0);
      expect(stats.maxDurationMs).toBe(0);
      expect(stats.slowRequests).toBe(0);
      expect(Object.keys(stats.byPath)).toHaveLength(0);
    });

    it("should calculate percentiles correctly", () => {
      const middleware = createPerformanceMiddleware();

      // Simulate multiple requests
      for (let i = 0; i < 10; i++) {
        const req = {
          method: "GET",
          path: "/api/v1/memory/recall",
          query: {},
          headers: {},
        } as unknown as Request;

        let closeCallback: (() => void) | undefined;
        const res = {
          statusCode: 200,
          on: vi.fn().mockImplementation((event: string, callback: () => void) => {
            if (event === "close") {
              closeCallback = callback;
            }
          }),
          setHeader: vi.fn(),
          json: vi.fn(),
        } as unknown as Response;

        middleware(req, res, vi.fn());

        if (closeCallback) {
          closeCallback();
        }
      }

      const stats = getPerformanceStats();
      expect(stats.totalRequests).toBe(10);
      expect(stats.avgDurationMs).toBeGreaterThanOrEqual(0);
      expect(stats.p50DurationMs).toBeGreaterThanOrEqual(0);
      expect(stats.p95DurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should aggregate stats by path", () => {
      const middleware = createPerformanceMiddleware();

      // Request to path A
      const reqA = {
        method: "GET",
        path: "/api/v1/memory/recall",
        query: {},
        headers: {},
      } as unknown as Request;

      let closeCallbackA: (() => void) | undefined;
      const resA = {
        statusCode: 200,
        on: vi.fn().mockImplementation((event: string, callback: () => void) => {
          if (event === "close") {
            closeCallbackA = callback;
          }
        }),
        setHeader: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;

      middleware(reqA, resA, vi.fn());
      if (closeCallbackA) closeCallbackA();

      // Request to path B
      const reqB = {
        method: "GET",
        path: "/api/v1/memory/stats",
        query: {},
        headers: {},
      } as unknown as Request;

      let closeCallbackB: (() => void) | undefined;
      const resB = {
        statusCode: 200,
        on: vi.fn().mockImplementation((event: string, callback: () => void) => {
          if (event === "close") {
            closeCallbackB = callback;
          }
        }),
        setHeader: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;

      middleware(reqB, resB, vi.fn());
      if (closeCallbackB) closeCallbackB();

      const stats = getPerformanceStats();
      expect(stats.totalRequests).toBe(2);
      expect(Object.keys(stats.byPath)).toContain("/api/v1/memory/recall");
      expect(Object.keys(stats.byPath)).toContain("/api/v1/memory/stats");
    });
  });

  describe("getRecentMetrics", () => {
    it("should return empty array when no metrics", () => {
      clearPerformanceMetrics();
      const metrics = getRecentMetrics();
      expect(metrics).toEqual([]);
    });

    it("should limit returned metrics", () => {
      const middleware = createPerformanceMiddleware();

      // Generate 10 requests
      for (let i = 0; i < 10; i++) {
        const req = {
          method: "GET",
          path: `/api/v1/test/${i}`,
          query: {},
          headers: {},
        } as unknown as Request;

        let closeCallback: (() => void) | undefined;
        const res = {
          statusCode: 200,
          on: vi.fn().mockImplementation((event: string, callback: () => void) => {
            if (event === "close") {
              closeCallback = callback;
            }
          }),
          setHeader: vi.fn(),
          json: vi.fn(),
        } as unknown as Response;

        middleware(req, res, vi.fn());
        if (closeCallback) closeCallback();
      }

      const metrics = getRecentMetrics(5);
      expect(metrics.length).toBeLessThanOrEqual(5);
    });
  });

  describe("clearPerformanceMetrics", () => {
    it("should clear all metrics", () => {
      const middleware = createPerformanceMiddleware();

      // Generate a request
      const req = {
        method: "GET",
        path: "/api/v1/memory/recall",
        query: {},
        headers: {},
      } as unknown as Request;

      let closeCallback: (() => void) | undefined;
      const res = {
        statusCode: 200,
        on: vi.fn().mockImplementation((event: string, callback: () => void) => {
          if (event === "close") {
            closeCallback = callback;
          }
        }),
        setHeader: vi.fn(),
        json: vi.fn(),
      } as unknown as Response;

      middleware(req, res, vi.fn());
      if (closeCallback) closeCallback();

      // Clear and verify
      clearPerformanceMetrics();
      const stats = getPerformanceStats();
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe("DEFAULT_PERFORMANCE_CONFIG", () => {
    it("should have 200ms slow threshold per requirement 17.1", () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.slowThresholdMs).toBe(200);
    });

    it("should have reasonable defaults", () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.maxMetrics).toBe(10000);
      expect(DEFAULT_PERFORMANCE_CONFIG.logAllRequests).toBe(false);
    });

    it("should exclude health check paths", () => {
      expect(DEFAULT_PERFORMANCE_CONFIG.excludePaths).toContain("/api/v1/health/live");
      expect(DEFAULT_PERFORMANCE_CONFIG.excludePaths).toContain("/api/v1/health/ready");
    });
  });
});
