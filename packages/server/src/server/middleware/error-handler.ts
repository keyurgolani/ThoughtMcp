/**
 * Error Handling Middleware
 *
 * Provides centralized error handling for the REST API with consistent
 * error response formatting, HTTP status code mapping, and field-level
 * validation error details.
 *
 * Requirements: 15.3, 15.4, 15.5
 */

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  CognitiveError,
  DatabaseError,
  EmbeddingError,
  ReasoningError,
  ErrorCodes as UtilErrorCodes,
  ValidationError as UtilValidationError,
} from "../../utils/errors.js";
import { Logger } from "../../utils/logger.js";
import {
  buildErrorResponse,
  buildValidationErrorResponse,
  ErrorCodes,
  getHttpStatusForErrorCode,
  type ErrorCode,
} from "../types/api-response.js";

/**
 * Custom API error class for REST API specific errors
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly suggestion?: string;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode,
    options?: { details?: Record<string, unknown>; suggestion?: string }
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = options?.details;
    this.suggestion = options?.suggestion;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Not found error for missing resources
 * Requirements: 15.5
 */
export class NotFoundError extends ApiError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found`, 404, ErrorCodes.NOT_FOUND, {
      details: { [`${resourceType.toLowerCase()}Id`]: resourceId },
      suggestion: `Verify the ${resourceType.toLowerCase()} ID is correct and belongs to the specified user`,
    });
    this.name = "NotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Validation error for invalid request parameters
 * Requirements: 15.3
 */
export class ValidationApiError extends ApiError {
  public readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super("Invalid request parameters", 400, ErrorCodes.VALIDATION_ERROR, {
      details: fieldErrors,
      suggestion: "Check that all required fields are provided with valid values",
    });
    this.name = "ValidationApiError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Unauthorized error for authentication failures
 * Requirements: 15.4
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(message, 401, ErrorCodes.UNAUTHORIZED, {
      suggestion: "Provide valid authentication credentials",
    });
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden error for authorization failures
 */
export class ForbiddenError extends ApiError {
  constructor(message = "Access denied") {
    super(message, 403, ErrorCodes.FORBIDDEN, {
      suggestion: "You do not have permission to access this resource",
    });
    this.name = "ForbiddenError";
  }
}

/**
 * Conflict error for resource state conflicts
 */
export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, ErrorCodes.CONFLICT, {
      details,
      suggestion: "The resource state has changed. Please refresh and try again",
    });
    this.name = "ConflictError";
  }
}

/**
 * Gateway timeout error for upstream service timeouts
 * Requirements: 15.4
 */
export class GatewayTimeoutError extends ApiError {
  constructor(
    message = "Upstream service timed out",
    options?: { details?: Record<string, unknown>; suggestion?: string }
  ) {
    super(message, 504, ErrorCodes.GATEWAY_TIMEOUT, {
      details: options?.details,
      suggestion:
        options?.suggestion ??
        "The reasoning service took too long to respond. Try a simpler query or try again later",
    });
    this.name = "GatewayTimeoutError";
  }
}

/**
 * Maps internal error codes to REST API error codes
 */
function mapUtilErrorCodeToApiErrorCode(code: string): ErrorCode {
  switch (code) {
    case UtilErrorCodes.VALIDATION_FAILED:
    case UtilErrorCodes.INVALID_INPUT:
    case UtilErrorCodes.CONSTRAINT_VIOLATION:
      return ErrorCodes.VALIDATION_ERROR;
    case UtilErrorCodes.DB_CONNECTION_FAILED:
    case UtilErrorCodes.DB_QUERY_TIMEOUT:
      return ErrorCodes.SERVICE_UNAVAILABLE;
    case UtilErrorCodes.DB_TRANSACTION_FAILED:
    case UtilErrorCodes.DB_QUERY_FAILED:
      return ErrorCodes.INTERNAL_ERROR;
    case UtilErrorCodes.EMBEDDING_TIMEOUT:
    case UtilErrorCodes.EMBEDDING_MODEL_UNAVAILABLE:
    case UtilErrorCodes.EMBEDDING_GENERATION_FAILED:
      return ErrorCodes.SERVICE_UNAVAILABLE;
    case UtilErrorCodes.REASONING_FRAMEWORK_FAILED:
    case UtilErrorCodes.REASONING_STREAM_TIMEOUT:
    case UtilErrorCodes.REASONING_SYNTHESIS_FAILED:
      return ErrorCodes.INTERNAL_ERROR;
    default:
      return ErrorCodes.INTERNAL_ERROR;
  }
}

/**
 * Formats Zod validation errors into field-level error messages
 * Requirements: 15.3
 */
export function formatZodErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    const field = path || "request";
    fieldErrors[field] = issue.message;
  }

  return fieldErrors;
}

/**
 * Error handler middleware for Express
 * Converts various error types to consistent API error responses
 *
 * Requirements: 15.3, 15.4, 15.5
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Log the error for debugging
  Logger.error("API Error", err);

  // Handle ApiError and its subclasses
  if (err instanceof ApiError) {
    const response = buildErrorResponse(err.message, err.code, {
      suggestion: err.suggestion,
      details: err.details,
    });
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  // Requirements: 15.3
  if (err instanceof ZodError) {
    const fieldErrors = formatZodErrors(err);
    const response = buildValidationErrorResponse(fieldErrors);
    res.status(400).json(response);
    return;
  }

  // Handle utility ValidationError
  // Requirements: 15.3
  if (err instanceof UtilValidationError) {
    const fieldErrors: Record<string, string> = {
      [err.field]: err.constraint,
    };
    const response = buildValidationErrorResponse(fieldErrors);
    res.status(400).json(response);
    return;
  }

  // Handle CognitiveError and subclasses
  if (err instanceof CognitiveError) {
    const apiCode = mapUtilErrorCodeToApiErrorCode(err.code);
    const statusCode = getHttpStatusForErrorCode(apiCode);
    const response = buildErrorResponse(err.getUserMessage(), apiCode, {
      suggestion: "If this error persists, please try again later",
      details: err.context.metadata,
    });
    res.status(statusCode).json(response);
    return;
  }

  // Handle DatabaseError specifically for better messages
  if (err instanceof DatabaseError) {
    const apiCode = mapUtilErrorCodeToApiErrorCode(err.code);
    const statusCode = getHttpStatusForErrorCode(apiCode);
    const response = buildErrorResponse(err.getUserMessage(), apiCode, {
      suggestion: "Please try again in a moment",
    });
    res.status(statusCode).json(response);
    return;
  }

  // Handle EmbeddingError specifically
  if (err instanceof EmbeddingError) {
    const response = buildErrorResponse(err.getUserMessage(), ErrorCodes.SERVICE_UNAVAILABLE, {
      suggestion: "The embedding service is temporarily unavailable",
    });
    res.status(503).json(response);
    return;
  }

  // Handle ReasoningError specifically
  if (err instanceof ReasoningError) {
    const response = buildErrorResponse(err.getUserMessage(), ErrorCodes.INTERNAL_ERROR, {
      suggestion: "Please try a simpler query or try again later",
    });
    res.status(500).json(response);
    return;
  }

  // Handle generic errors with common patterns
  const errorMessage = err.message || "Internal server error";

  // Check for common error patterns
  if (errorMessage.toLowerCase().includes("not found")) {
    const response = buildErrorResponse(errorMessage, ErrorCodes.NOT_FOUND, {
      suggestion: "Verify the resource exists and you have access to it",
    });
    res.status(404).json(response);
    return;
  }

  if (
    errorMessage.toLowerCase().includes("unauthorized") ||
    errorMessage.toLowerCase().includes("authentication")
  ) {
    const response = buildErrorResponse(errorMessage, ErrorCodes.UNAUTHORIZED, {
      suggestion: "Provide valid authentication credentials",
    });
    res.status(401).json(response);
    return;
  }

  if (
    errorMessage.toLowerCase().includes("forbidden") ||
    errorMessage.toLowerCase().includes("permission")
  ) {
    const response = buildErrorResponse(errorMessage, ErrorCodes.FORBIDDEN, {
      suggestion: "You do not have permission to perform this action",
    });
    res.status(403).json(response);
    return;
  }

  // Default to internal server error
  const response = buildErrorResponse("Internal server error", ErrorCodes.INTERNAL_ERROR, {
    suggestion: "If this error persists, please contact support",
  });
  res.status(500).json(response);
}

/**
 * Not found handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const response = buildErrorResponse(
    `Route not found: ${req.method} ${req.path}`,
    ErrorCodes.NOT_FOUND,
    {
      suggestion: "Check the API documentation at /api/v1/docs",
      details: { method: req.method, path: req.path },
    }
  );
  res.status(404).json(response);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
