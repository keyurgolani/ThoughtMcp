/**
 * Utilities Module
 *
 * Shared utility functions and helpers
 */

export { Logger } from "./logger.js";

// Error classes
export {
  CognitiveError,
  DatabaseError,
  EmbeddingError,
  ErrorCodes,
  ReasoningError,
  ValidationError,
  createConnectionError,
  createEmbeddingTimeoutError,
  createFrameworkFailureError,
  createModelUnavailableError,
  createQueryTimeoutError,
  createStreamTimeoutError,
  createTransactionError,
  createValidationError,
} from "./errors.js";

export type { ErrorCode, ErrorContext } from "./errors.js";

// Error handler
export { CognitiveErrorHandler } from "./error-handler.js";
export type { ErrorHandlingResult } from "./error-handler.js";

// Performance monitoring
export {
  PerformanceMonitor,
  globalPerformanceMonitor,
  measureAsync,
  measureSync,
} from "./performance-monitor.js";
export type {
  PercentileStats,
  PerformanceMetric,
  PerformanceReport,
} from "./performance-monitor.js";

// Cursor utilities for pagination
export { CursorDecodeError, decodeCursor, encodeCursor, isValidCursor } from "./cursor.js";
export type { Cursor } from "./cursor.js";
