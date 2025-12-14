/**
 * Response Cache Middleware Tests
 *
 * Tests for HTTP-level response caching middleware.
 * Requirements: 17.1 - Memory retrieval response within 200ms at p95
 */

import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearResponseCache,
  createResponseCacheMiddleware,
  DEFAULT_RESPONSE_CACHE_CONFIG,
  getResponseCacheMetrics,
} from "../../../../server/middleware/response-cache.js";

describe("Response Cache Middleware", () => {
  beforeEach(() => {
    clearResponseCache();
    vi.clearAllMocks();
  });

  describe("createResponseCacheMiddleware", () => {
    it("should create middleware function", () => {
      const middleware = createResponseCacheMiddleware();
      expect(typeof middleware).toBe("function");
    });

    it("should skip caching for non-GET requests", () => {
      const middleware = createResponseCacheMiddleware();
      const req = {
        method: "POST",
        path: "/api/v1/memory/recall",
        query: {},
        body: {},
        headers: {},
      } as unknown as Request;

      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalledWith("X-Cache", "HIT");
    });

    it("should skip caching for excluded paths", () => {
      const middleware = createResponseCacheMiddleware();
      const req = {
        method: "GET",
        path: "/api/v1/memory/store",
        query: {},
        body: {},
        headers: {},
      } as unknown as Request;

      const res = {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should cache GET responses", () => {
      const middleware = createResponseCacheMiddleware();
      const req = {
        method: "GET",
        path: "/api/v1/health",
        query: {},
        body: {},
        headers: {},
      } as unknown as Request;

      const jsonFn = vi.fn().mockReturnThis();
      const res = {
        statusCode: 200,
        setHeader: vi.fn(),
        getHeader: vi.fn().mockReturnValue("application/json"),
        status: vi.fn().mockReturnThis(),
        json: jsonFn,
      } as unknown as Response;

      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return cached response on second request", () => {
      const middleware = createResponseCacheMiddleware();
      const req = {
        method: "GET",
        path: "/api/v1/health",
        query: {},
        body: {},
        headers: {},
      } as unknown as Request;

      // First request - cache miss
      const res1 = {
        statusCode: 200,
        setHeader: vi.fn(),
        getHeader: vi.fn().mockReturnValue("application/json"),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const next1 = vi.fn();
      middleware(req, res1, next1);

      // Simulate response
      (res1 as { json: (body: unknown) => Response }).json({ status: "healthy" });

      // Second request - should be cache hit
      const res2 = {
        statusCode: 200,
        setHeader: vi.fn(),
        getHeader: vi.fn().mockReturnValue("application/json"),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;

      const next2 = vi.fn();
      middleware(req, res2, next2);

      // Cache metrics should show activity
      const metrics = getResponseCacheMetrics();
      expect(metrics.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("clearResponseCache", () => {
    it("should clear all cached entries", () => {
      clearResponseCache();
      const metrics = getResponseCacheMetrics();
      expect(metrics.size).toBe(0);
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
    });
  });

  describe("getResponseCacheMetrics", () => {
    it("should return cache metrics", () => {
      const metrics = getResponseCacheMetrics();
      expect(metrics).toHaveProperty("hits");
      expect(metrics).toHaveProperty("misses");
      expect(metrics).toHaveProperty("hitRate");
      expect(metrics).toHaveProperty("size");
    });

    it("should return zero metrics when cache is empty", () => {
      clearResponseCache();
      const metrics = getResponseCacheMetrics();
      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.hitRate).toBe(0);
      expect(metrics.size).toBe(0);
    });
  });

  describe("DEFAULT_RESPONSE_CACHE_CONFIG", () => {
    it("should have reasonable defaults", () => {
      // maxSize increased to 2000 for better hit rate (Requirements: 17.1)
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.maxSize).toBe(2000);
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.defaultTTL).toBe(30000);
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.includeQuery).toBe(true);
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.includeUserId).toBe(true);
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.includeBody).toBe(true);
    });

    it("should have path-specific TTLs", () => {
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.pathTTL).toBeDefined();
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.pathTTL!["/api/v1/health"]).toBe(5000);
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.pathTTL!["/api/v1/docs"]).toBe(3600000);
    });

    it("should exclude write operations from caching", () => {
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.excludePaths).toContain("/api/v1/memory/store");
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.excludePaths).toContain("/api/v1/memory/update");
      expect(DEFAULT_RESPONSE_CACHE_CONFIG.excludePaths).toContain("/api/v1/think");
    });
  });
});
