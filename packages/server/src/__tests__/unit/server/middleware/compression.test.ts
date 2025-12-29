/**
 * Compression Middleware Tests
 *
 * Tests for compression middleware functionality.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import type { NextFunction, Request, Response } from "express";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compressData,
  createCompressionMiddleware,
  DEFAULT_COMPRESSION_CONFIG,
  parseAcceptEncoding,
} from "../../../../server/middleware/compression.js";

describe("Compression Middleware", () => {
  let mockReq: Partial<Request> & { path: string };
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let headers: Record<string, string | number>;
  let responseBody: Buffer | null;

  beforeEach(() => {
    headers = {};
    responseBody = null;
    mockReq = {
      headers: {},
      path: "/api/v1/test",
    };
    mockRes = {
      setHeader: vi.fn((key: string, value: string | number) => {
        headers[key] = value;
        return mockRes as Response;
      }),
      getHeader: vi.fn((key: string) => headers[key]),
      end: vi.fn((data?: Buffer | string) => {
        if (data instanceof Buffer) {
          responseBody = data;
        }
        return mockRes as Response;
      }) as unknown as Response["end"],
      json: vi.fn((body: unknown) => {
        responseBody = Buffer.from(JSON.stringify(body));
        return mockRes as Response;
      }),
    };
    mockNext = vi.fn();
  });

  describe("parseAcceptEncoding", () => {
    it("should return identity for undefined Accept-Encoding", () => {
      expect(parseAcceptEncoding(undefined)).toBe("identity");
    });

    it("should return identity for empty Accept-Encoding", () => {
      expect(parseAcceptEncoding("")).toBe("identity");
    });

    it("should prefer brotli when available", () => {
      expect(parseAcceptEncoding("gzip, br")).toBe("br");
    });

    it("should return gzip when brotli not available", () => {
      expect(parseAcceptEncoding("gzip, deflate")).toBe("gzip");
    });

    it("should respect quality values", () => {
      expect(parseAcceptEncoding("gzip;q=1.0, br;q=0.5")).toBe("gzip");
    });

    it("should ignore encodings with q=0", () => {
      expect(parseAcceptEncoding("br;q=0, gzip")).toBe("gzip");
    });

    it("should handle complex Accept-Encoding headers", () => {
      expect(parseAcceptEncoding("gzip, deflate, br;q=1.0, identity;q=0.5")).toBe("br");
    });

    it("should return identity when only unsupported encodings", () => {
      expect(parseAcceptEncoding("deflate, compress")).toBe("identity");
    });

    it("should handle whitespace in header", () => {
      expect(parseAcceptEncoding("  gzip  ,  br  ")).toBe("br");
    });
  });

  describe("compressData", () => {
    // Use larger test data that will actually compress well
    const testData = Buffer.from(
      "Hello, World! This is test data for compression. ".repeat(20) +
        "The quick brown fox jumps over the lazy dog. ".repeat(20)
    );

    it("should compress data with gzip", () => {
      const compressed = compressData(testData, "gzip", DEFAULT_COMPRESSION_CONFIG);
      expect(compressed.length).toBeLessThan(testData.length);

      // Verify decompression works
      const decompressed = gunzipSync(compressed);
      expect(decompressed.toString()).toBe(testData.toString());
    });

    it("should compress data with brotli", () => {
      const compressed = compressData(testData, "br", DEFAULT_COMPRESSION_CONFIG);
      expect(compressed.length).toBeLessThan(testData.length);

      // Verify decompression works
      const decompressed = brotliDecompressSync(compressed);
      expect(decompressed.toString()).toBe(testData.toString());
    });

    it("should return original data for identity encoding", () => {
      const result = compressData(testData, "identity", DEFAULT_COMPRESSION_CONFIG);
      expect(result).toBe(testData);
    });
  });

  describe("createCompressionMiddleware", () => {
    it("should skip compression when Accept-Encoding not present", () => {
      const middleware = createCompressionMiddleware();
      mockReq.headers = {};

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Original json should not be modified
      expect(mockRes.json).toBeDefined();
    });

    it("should skip compression for excluded paths", () => {
      const middleware = createCompressionMiddleware({
        excludePaths: ["/api/v1/excluded"],
      });
      mockReq.headers = { "accept-encoding": "gzip, br" };
      (mockReq as { path: string }).path = "/api/v1/excluded/test";

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should skip compression when only identity encoding accepted", () => {
      const middleware = createCompressionMiddleware();
      mockReq.headers = { "accept-encoding": "identity" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it("should compress response larger than threshold with gzip", () => {
      const middleware = createCompressionMiddleware({ threshold: 100 });
      mockReq.headers = { "accept-encoding": "gzip" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Call the overridden json method with large data
      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Content-Encoding"]).toBe("gzip");
      expect(headers["Vary"]).toBe("Accept-Encoding");
      expect(responseBody).not.toBeNull();

      // Verify the response is valid gzip
      const decompressed = gunzipSync(responseBody!);
      expect(JSON.parse(decompressed.toString())).toEqual(largeData);
    });

    it("should compress response larger than threshold with brotli", () => {
      const middleware = createCompressionMiddleware({ threshold: 100 });
      mockReq.headers = { "accept-encoding": "br" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Call the overridden json method with large data
      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Content-Encoding"]).toBe("br");
      expect(headers["Vary"]).toBe("Accept-Encoding");
      expect(responseBody).not.toBeNull();

      // Verify the response is valid brotli
      const decompressed = brotliDecompressSync(responseBody!);
      expect(JSON.parse(decompressed.toString())).toEqual(largeData);
    });

    it("should NOT compress response smaller than threshold", () => {
      const middleware = createCompressionMiddleware({ threshold: 1024 });
      mockReq.headers = { "accept-encoding": "gzip, br" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Call the overridden json method with small data
      const smallData = { data: "small" };
      (mockRes.json as ReturnType<typeof vi.fn>)(smallData);

      // Should not set Content-Encoding for small responses
      expect(headers["Content-Encoding"]).toBeUndefined();
    });

    it("should use default 1KB threshold", () => {
      const middleware = createCompressionMiddleware();
      mockReq.headers = { "accept-encoding": "gzip" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Data just under 1KB should not be compressed
      const smallData = { data: "x".repeat(900) };
      (mockRes.json as ReturnType<typeof vi.fn>)(smallData);

      expect(headers["Content-Encoding"]).toBeUndefined();
    });

    it("should compress data at exactly 1KB threshold", () => {
      const middleware = createCompressionMiddleware();
      mockReq.headers = { "accept-encoding": "gzip" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Data at exactly 1KB should be compressed
      // Account for JSON overhead: {"data":"..."} = 10 chars + content
      const largeData = { data: "x".repeat(1020) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Content-Encoding"]).toBe("gzip");
    });

    it("should append to existing Vary header", () => {
      const middleware = createCompressionMiddleware({ threshold: 100 });
      mockReq.headers = { "accept-encoding": "gzip" };
      headers["Vary"] = "Origin";

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Vary"]).toBe("Origin, Accept-Encoding");
    });

    it("should not duplicate Accept-Encoding in Vary header", () => {
      const middleware = createCompressionMiddleware({ threshold: 100 });
      mockReq.headers = { "accept-encoding": "gzip" };
      headers["Vary"] = "Accept-Encoding";

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Vary"]).toBe("Accept-Encoding");
    });

    it("should set Content-Length header for compressed response", () => {
      const middleware = createCompressionMiddleware({ threshold: 100 });
      mockReq.headers = { "accept-encoding": "gzip" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Content-Length"]).toBeDefined();
      expect(typeof headers["Content-Length"]).toBe("number");
      expect(headers["Content-Length"]).toBe(responseBody!.length);
    });

    it("should set Content-Type header for compressed response", () => {
      const middleware = createCompressionMiddleware({ threshold: 100 });
      mockReq.headers = { "accept-encoding": "gzip" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Content-Type"]).toBe("application/json; charset=utf-8");
    });

    it("should prefer brotli over gzip when both accepted", () => {
      const middleware = createCompressionMiddleware({ threshold: 100 });
      mockReq.headers = { "accept-encoding": "gzip, br" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      expect(headers["Content-Encoding"]).toBe("br");
    });

    it("should use custom compression levels", () => {
      const middleware = createCompressionMiddleware({
        threshold: 100,
        gzipLevel: 9,
        brotliLevel: 11,
      });
      mockReq.headers = { "accept-encoding": "gzip" };

      middleware(mockReq as Request, mockRes as Response, mockNext);

      const largeData = { data: "x".repeat(200) };
      (mockRes.json as ReturnType<typeof vi.fn>)(largeData);

      // Should still work with custom levels
      expect(headers["Content-Encoding"]).toBe("gzip");
      expect(responseBody).not.toBeNull();

      const decompressed = gunzipSync(responseBody!);
      expect(JSON.parse(decompressed.toString())).toEqual(largeData);
    });
  });

  describe("DEFAULT_COMPRESSION_CONFIG", () => {
    it("should have 1KB threshold", () => {
      expect(DEFAULT_COMPRESSION_CONFIG.threshold).toBe(1024);
    });

    it("should have reasonable gzip level", () => {
      expect(DEFAULT_COMPRESSION_CONFIG.gzipLevel).toBeGreaterThanOrEqual(1);
      expect(DEFAULT_COMPRESSION_CONFIG.gzipLevel).toBeLessThanOrEqual(9);
    });

    it("should have reasonable brotli level", () => {
      expect(DEFAULT_COMPRESSION_CONFIG.brotliLevel).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_COMPRESSION_CONFIG.brotliLevel).toBeLessThanOrEqual(11);
    });

    it("should include application/json in compressible types", () => {
      expect(DEFAULT_COMPRESSION_CONFIG.compressibleTypes).toContain("application/json");
    });
  });
});
