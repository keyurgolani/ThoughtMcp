/**
 * Compression Middleware
 *
 * Provides gzip and brotli compression for API responses to reduce
 * bandwidth usage and improve load times for clients on slow networks.
 *
 * Requirements:
 * - 10.1: Support gzip and brotli compression for API responses
 * - 10.2: Compress based on Accept-Encoding header
 * - 10.3: Only compress responses larger than 1KB
 * - 10.4: Set appropriate Content-Encoding headers
 */

import type { NextFunction, Request, Response } from "express";
import { brotliCompressSync, gzipSync } from "node:zlib";

/**
 * Compression configuration options
 */
export interface CompressionConfig {
  /** Minimum response size in bytes to trigger compression (default: 1024 = 1KB) */
  threshold: number;
  /** Compression level for gzip (1-9, default: 6) */
  gzipLevel: number;
  /** Compression level for brotli (0-11, default: 4) */
  brotliLevel: number;
  /** Paths to exclude from compression */
  excludePaths?: string[];
  /** Content types to compress (default: application/json, text/*) */
  compressibleTypes?: string[];
}

/**
 * Default compression configuration
 *
 * Requirements: 10.3 - Only compress responses larger than 1KB
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  threshold: 1024, // 1KB minimum
  gzipLevel: 6,
  brotliLevel: 4,
  excludePaths: [],
  compressibleTypes: [
    "application/json",
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/xml",
    "text/xml",
  ],
};

/**
 * Supported compression encodings in order of preference
 */
type CompressionEncoding = "br" | "gzip" | "identity";

/**
 * Parse Accept-Encoding header and return the best supported encoding
 *
 * Requirements: 10.2 - Compress based on Accept-Encoding header
 *
 * Preference order (when quality values are equal): brotli > gzip > identity
 * Brotli is preferred because it typically achieves better compression ratios.
 *
 * @param acceptEncoding - The Accept-Encoding header value
 * @returns The best supported encoding
 */
export function parseAcceptEncoding(acceptEncoding: string | undefined): CompressionEncoding {
  if (!acceptEncoding) {
    return "identity";
  }

  // Parse quality values from Accept-Encoding header
  // Format: "gzip, deflate, br;q=1.0, identity;q=0.5"
  const encodings = acceptEncoding.split(",").map((part) => {
    const [encoding, ...params] = part.trim().split(";");
    let quality = 1.0;

    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q" && value) {
        quality = parseFloat(value);
      }
    }

    return { encoding: encoding.trim().toLowerCase(), quality };
  });

  // Find the best quality for each supported encoding
  let brQuality = -1;
  let gzipQuality = -1;

  for (const { encoding, quality } of encodings) {
    if (quality === 0) continue;

    if (encoding === "br" && quality > brQuality) {
      brQuality = quality;
    } else if (encoding === "gzip" && quality > gzipQuality) {
      gzipQuality = quality;
    }
  }

  // Return the best supported encoding
  // Prefer brotli when quality values are equal (better compression)
  if (brQuality >= 0 && brQuality >= gzipQuality) {
    return "br";
  }
  if (gzipQuality >= 0) {
    return "gzip";
  }

  return "identity";
}

/**
 * Check if a content type is compressible
 *
 * @param contentType - The Content-Type header value
 * @param compressibleTypes - List of compressible content types
 * @returns Whether the content type is compressible
 */
function isCompressible(contentType: string | undefined, compressibleTypes: string[]): boolean {
  if (!contentType) {
    return false;
  }

  // Extract the media type (ignore charset and other parameters)
  const mediaType = contentType.split(";")[0].trim().toLowerCase();

  return compressibleTypes.some((type) => {
    if (type.endsWith("/*")) {
      // Wildcard match (e.g., "text/*")
      const prefix = type.slice(0, -1);
      return mediaType.startsWith(prefix);
    }
    return mediaType === type;
  });
}

/**
 * Compress data using the specified encoding
 *
 * Requirements:
 * - 10.1: Support gzip and brotli compression
 *
 * @param data - The data to compress
 * @param encoding - The compression encoding to use
 * @param config - Compression configuration
 * @returns Compressed data as Buffer
 */
export function compressData(
  data: Buffer,
  encoding: CompressionEncoding,
  config: CompressionConfig
): Buffer {
  switch (encoding) {
    case "br":
      return brotliCompressSync(data, {
        params: {
          // BROTLI_PARAM_QUALITY
          [0]: config.brotliLevel,
        },
      });
    case "gzip":
      return gzipSync(data, { level: config.gzipLevel });
    default:
      return data;
  }
}

/**
 * Check if path should be excluded from compression
 *
 * @param path - Request path
 * @param excludePaths - Paths to exclude
 * @returns Whether the path should be excluded
 */
function shouldExclude(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((excludePath) => path.startsWith(excludePath));
}

/**
 * Create compression middleware
 *
 * Compresses responses based on Accept-Encoding header and response size.
 * Only compresses responses larger than the configured threshold.
 *
 * Requirements:
 * - 10.1: Support gzip and brotli compression
 * - 10.2: Compress based on Accept-Encoding header
 * - 10.3: Only compress responses larger than 1KB
 * - 10.4: Set appropriate Content-Encoding headers
 *
 * @param config - Compression configuration
 * @returns Express middleware function
 */
export function createCompressionMiddleware(
  config: Partial<CompressionConfig> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const finalConfig: CompressionConfig = { ...DEFAULT_COMPRESSION_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip compression for excluded paths
    if (finalConfig.excludePaths && shouldExclude(req.path, finalConfig.excludePaths)) {
      next();
      return;
    }

    // Determine the best encoding based on Accept-Encoding header
    const acceptEncoding = req.headers["accept-encoding"];
    const encoding = parseAcceptEncoding(
      typeof acceptEncoding === "string" ? acceptEncoding : undefined
    );

    // If no compression is supported/requested, skip
    if (encoding === "identity") {
      next();
      return;
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to compress response
    res.json = (body: unknown): Response => {
      // Serialize the body to JSON
      const jsonString = JSON.stringify(body);
      const bodyBuffer = Buffer.from(jsonString, "utf-8");

      // Check if response is large enough to compress
      // Requirements: 10.3 - Only compress responses larger than 1KB
      if (bodyBuffer.length < finalConfig.threshold) {
        // Response too small, send uncompressed
        return originalJson(body);
      }

      // Check if content type is compressible
      const contentType = res.getHeader("Content-Type") as string | undefined;
      // Default to application/json for json() responses
      const effectiveContentType = contentType ?? "application/json";

      if (!isCompressible(effectiveContentType, finalConfig.compressibleTypes ?? [])) {
        return originalJson(body);
      }

      try {
        // Compress the data
        const compressed = compressData(bodyBuffer, encoding, finalConfig);

        // Set compression headers
        // Requirements: 10.4 - Set appropriate Content-Encoding headers
        res.setHeader("Content-Encoding", encoding);
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Length", compressed.length);

        // Add Vary header to indicate response varies by Accept-Encoding
        const existingVary = res.getHeader("Vary") as string | undefined;
        if (existingVary) {
          if (!existingVary.toLowerCase().includes("accept-encoding")) {
            res.setHeader("Vary", `${existingVary}, Accept-Encoding`);
          }
        } else {
          res.setHeader("Vary", "Accept-Encoding");
        }

        // Send compressed response
        res.end(compressed);
        return res;
      } catch {
        // On compression error, fall back to uncompressed response
        return originalJson(body);
      }
    };

    next();
  };
}

export default createCompressionMiddleware;
