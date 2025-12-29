/**
 * REST API Middleware
 *
 * Exports all middleware components for the REST API server.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 15.3, 15.4, 15.5, 17.1, 18.1, 18.2
 */

// CORS middleware
export { createCorsMiddleware, parseCorsOrigins, type CorsConfig } from "./cors.js";

// Rate limiting middleware
export {
  createRateLimitMiddleware,
  createRateLimiterInstance,
  type RateLimitMiddlewareConfig,
} from "./rate-limit.js";

// Error handling middleware
export {
  ApiError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationApiError,
  asyncHandler,
  errorHandler,
  formatZodErrors,
  notFoundHandler,
} from "./error-handler.js";

// Performance monitoring middleware - Requirements: 17.1
export {
  DEFAULT_PERFORMANCE_CONFIG,
  clearPerformanceMetrics,
  createPerformanceMiddleware,
  getPerformanceStats,
  getRecentMetrics,
  type PathStats,
  type PerformanceConfig,
  type PerformanceStats,
  type RequestMetrics,
} from "./performance.js";

// Response caching middleware - Requirements: 17.1, 2.1, 2.2, 2.3
export {
  DEFAULT_RESPONSE_CACHE_CONFIG,
  clearResponseCache,
  createResponseCacheMiddleware,
  getResponseCacheMetrics,
  invalidateAllMemoryCache,
  invalidateMemoryCache,
  invalidateUserCache,
  type ResponseCacheConfig,
} from "./response-cache.js";

// Compression middleware - Requirements: 10.1, 10.2, 10.3, 10.4
export {
  DEFAULT_COMPRESSION_CONFIG,
  compressData,
  createCompressionMiddleware,
  parseAcceptEncoding,
  type CompressionConfig,
} from "./compression.js";
