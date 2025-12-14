/**
 * CORS Middleware
 *
 * Configures Cross-Origin Resource Sharing (CORS) for the REST API.
 * Allows requests from configured origins and handles preflight requests.
 *
 * Requirements: 18.1
 */

import type { NextFunction, Request, Response } from "express";

/** CORS configuration options */
export interface CorsConfig {
  /** Allowed origins (supports wildcards like '*') */
  origins: string[];
  /** Allowed HTTP methods */
  methods?: string[];
  /** Allowed headers */
  allowedHeaders?: string[];
  /** Headers exposed to the client */
  exposedHeaders?: string[];
  /** Allow credentials (cookies, authorization headers) */
  credentials?: boolean;
  /** Max age for preflight cache in seconds */
  maxAge?: number;
}

/** Default CORS configuration */
const DEFAULT_CORS_CONFIG: Required<CorsConfig> = {
  origins: ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "X-Session-Id"],
  exposedHeaders: [
    "X-Request-Id",
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "Retry-After",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Check if an origin is allowed based on the configured origins
 */
function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes("*")) return true;
  return allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    // Support wildcard subdomains (e.g., *.example.com)
    if (allowed.startsWith("*.")) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) && origin.includes("://");
    }
    return false;
  });
}

/**
 * Create CORS middleware with the given configuration
 */
export function createCorsMiddleware(config: Partial<CorsConfig> = {}) {
  const corsConfig: Required<CorsConfig> = { ...DEFAULT_CORS_CONFIG, ...config };

  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && isOriginAllowed(origin, corsConfig.origins)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (corsConfig.origins.includes("*")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    // Set credentials header if enabled
    if (corsConfig.credentials && origin && isOriginAllowed(origin, corsConfig.origins)) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    // Set exposed headers
    if (corsConfig.exposedHeaders.length > 0) {
      res.setHeader("Access-Control-Expose-Headers", corsConfig.exposedHeaders.join(", "));
    }

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Methods", corsConfig.methods.join(", "));
      res.setHeader("Access-Control-Allow-Headers", corsConfig.allowedHeaders.join(", "));
      res.setHeader("Access-Control-Max-Age", corsConfig.maxAge.toString());
      res.status(204).end();
      return;
    }

    next();
  };
}

/**
 * Parse CORS origins from environment variable
 * Supports comma-separated list of origins
 */
export function parseCorsOrigins(envValue: string | undefined): string[] {
  if (!envValue) return DEFAULT_CORS_CONFIG.origins;
  return envValue
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}
