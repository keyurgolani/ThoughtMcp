/**
 * CORS Middleware Tests
 *
 * Tests for CORS middleware functionality.
 *
 * Requirements: 18.1
 */

import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCorsMiddleware, parseCorsOrigins } from "../../../../server/middleware/cors.js";

describe("CORS Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let headers: Record<string, string>;

  beforeEach(() => {
    headers = {};
    mockReq = {
      headers: {},
      method: "GET",
    };
    mockRes = {
      setHeader: vi.fn((key: string, value: string) => {
        headers[key] = value;
        return mockRes as Response;
      }),
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe("createCorsMiddleware", () => {
    it("should set Access-Control-Allow-Origin for allowed origin", () => {
      const middleware = createCorsMiddleware({ origins: ["http://localhost:5173"] });
      mockReq.headers = { origin: "http://localhost:5173" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://localhost:5173"
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should not set Access-Control-Allow-Origin for disallowed origin", () => {
      const middleware = createCorsMiddleware({ origins: ["http://localhost:5173"] });
      mockReq.headers = { origin: "http://evil.com" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle wildcard origin", () => {
      const middleware = createCorsMiddleware({ origins: ["*"] });
      mockReq.headers = { origin: "http://any-origin.com" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://any-origin.com"
      );
    });

    it("should handle wildcard subdomain pattern", () => {
      const middleware = createCorsMiddleware({ origins: ["*.example.com"] });
      mockReq.headers = { origin: "http://sub.example.com" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://sub.example.com"
      );
    });

    it("should set Access-Control-Allow-Credentials when enabled", () => {
      const middleware = createCorsMiddleware({
        origins: ["http://localhost:5173"],
        credentials: true,
      });
      mockReq.headers = { origin: "http://localhost:5173" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Credentials", "true");
    });

    it("should set Access-Control-Expose-Headers", () => {
      const middleware = createCorsMiddleware({
        origins: ["http://localhost:5173"],
        exposedHeaders: ["X-Custom-Header"],
      });
      mockReq.headers = { origin: "http://localhost:5173" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Expose-Headers",
        "X-Custom-Header"
      );
    });

    it("should handle preflight OPTIONS request", () => {
      const middleware = createCorsMiddleware({ origins: ["http://localhost:5173"] });
      mockReq.method = "OPTIONS";
      mockReq.headers = { origin: "http://localhost:5173" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Methods",
        expect.any(String)
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Headers",
        expect.any(String)
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith("Access-Control-Max-Age", expect.any(String));
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should use default configuration when no options provided", () => {
      const middleware = createCorsMiddleware();
      mockReq.headers = { origin: "http://localhost:5173" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://localhost:5173"
      );
    });

    it("should handle request without origin header", () => {
      const middleware = createCorsMiddleware({ origins: ["http://localhost:5173"] });
      mockReq.headers = {};

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(headers["Access-Control-Allow-Origin"]).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should support multiple allowed origins", () => {
      const middleware = createCorsMiddleware({
        origins: ["http://localhost:5173", "http://localhost:3000"],
      });

      mockReq.headers = { origin: "http://localhost:3000" };
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://localhost:3000"
      );
    });
  });

  describe("parseCorsOrigins", () => {
    it("should parse comma-separated origins", () => {
      const result = parseCorsOrigins("http://localhost:5173,http://localhost:3000");
      expect(result).toEqual(["http://localhost:5173", "http://localhost:3000"]);
    });

    it("should trim whitespace from origins", () => {
      const result = parseCorsOrigins("  http://localhost:5173 , http://localhost:3000  ");
      expect(result).toEqual(["http://localhost:5173", "http://localhost:3000"]);
    });

    it("should filter empty strings", () => {
      const result = parseCorsOrigins("http://localhost:5173,,http://localhost:3000,");
      expect(result).toEqual(["http://localhost:5173", "http://localhost:3000"]);
    });

    it("should return default origins for undefined input", () => {
      const result = parseCorsOrigins(undefined);
      expect(result).toEqual(["http://localhost:5173"]);
    });

    it("should return default origins for empty string", () => {
      const result = parseCorsOrigins("");
      expect(result).toEqual(["http://localhost:5173"]);
    });

    it("should handle single origin", () => {
      const result = parseCorsOrigins("http://example.com");
      expect(result).toEqual(["http://example.com"]);
    });
  });
});
