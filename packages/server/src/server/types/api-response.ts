/**
 * API Response Types and Utilities
 *
 * Provides consistent response formatting for the REST API.
 * Requirements: 15.1, 15.2
 */

/**
 * Response metadata included with successful API responses
 */
export interface ApiResponseMetadata {
  /** Processing time in milliseconds */
  processingTime: number;
  /** Unique request identifier for tracing */
  requestId: string;
  /** ISO 8601 timestamp of the response */
  timestamp: string;
}

/**
 * Success response format
 * Requirements: 15.1 - JSON response with success flag, data object, and optional metadata
 */
export interface ApiSuccessResponse<T> {
  /** Always true for success responses */
  success: true;
  /** Response data payload */
  data: T;
  /** Optional response metadata */
  metadata?: ApiResponseMetadata;
}

/**
 * Error response format
 * Requirements: 15.2 - JSON response with success flag false, error message, error code, and suggestion
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  success: false;
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code */
  code: string;
  /** Optional suggestion for resolving the error */
  suggestion?: string;
  /** Optional additional error details (e.g., validation errors per field) */
  details?: Record<string, unknown>;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standard error codes used across the REST API
 */
export const ErrorCodes = {
  /** Invalid request parameters - HTTP 400 */
  VALIDATION_ERROR: "VALIDATION_ERROR",
  /** Missing or invalid authentication - HTTP 401 */
  UNAUTHORIZED: "UNAUTHORIZED",
  /** User lacks permission for resource - HTTP 403 */
  FORBIDDEN: "FORBIDDEN",
  /** Resource does not exist - HTTP 404 */
  NOT_FOUND: "NOT_FOUND",
  /** Resource state conflict - HTTP 409 */
  CONFLICT: "CONFLICT",
  /** Too many requests - HTTP 429 */
  RATE_LIMITED: "RATE_LIMITED",
  /** Server error - HTTP 500 */
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Dependency unavailable - HTTP 503 */
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  /** Request timeout - HTTP 408 */
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  /** Upstream service timeout - HTTP 504 */
  GATEWAY_TIMEOUT: "GATEWAY_TIMEOUT",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Maps error codes to HTTP status codes
 */
export const ErrorCodeToHttpStatus: Record<ErrorCode, number> = {
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.CONFLICT]: 409,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.REQUEST_TIMEOUT]: 408,
  [ErrorCodes.GATEWAY_TIMEOUT]: 504,
};

/**
 * Generates a unique request ID for tracing
 * Format: req-{timestamp}-{random}
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `req-${timestamp}-${random}`;
}

/**
 * Options for building a success response
 */
export interface SuccessResponseOptions {
  /** Request ID for tracing */
  requestId?: string;
  /** Start time for calculating processing time */
  startTime?: number;
  /** Whether to include metadata in the response */
  includeMetadata?: boolean;
}

/**
 * Builds a success response with consistent formatting
 * Requirements: 15.1
 *
 * @param data - The response data payload
 * @param options - Optional configuration for the response
 * @returns Formatted success response
 */
export function buildSuccessResponse<T>(
  data: T,
  options: SuccessResponseOptions = {}
): ApiSuccessResponse<T> {
  const { requestId, startTime, includeMetadata = true } = options;

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (includeMetadata) {
    response.metadata = {
      processingTime: startTime ? Date.now() - startTime : 0,
      requestId: requestId ?? generateRequestId(),
      timestamp: new Date().toISOString(),
    };
  }

  return response;
}

/**
 * Options for building an error response
 */
export interface ErrorResponseOptions {
  /** Suggestion for resolving the error */
  suggestion?: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}

/**
 * Builds an error response with consistent formatting
 * Requirements: 15.2
 *
 * @param error - Human-readable error message
 * @param code - Machine-readable error code
 * @param options - Optional configuration for the response
 * @returns Formatted error response
 */
export function buildErrorResponse(
  error: string,
  code: ErrorCode,
  options: ErrorResponseOptions = {}
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error,
    code,
  };

  if (options.suggestion) {
    response.suggestion = options.suggestion;
  }

  if (options.details) {
    response.details = options.details;
  }

  return response;
}

/**
 * Builds a validation error response with field-level details
 * Requirements: 15.3
 *
 * @param fieldErrors - Map of field names to error messages
 * @returns Formatted validation error response
 */
export function buildValidationErrorResponse(
  fieldErrors: Record<string, string>
): ApiErrorResponse {
  return buildErrorResponse("Invalid request parameters", ErrorCodes.VALIDATION_ERROR, {
    suggestion: "Check that all required fields are provided with valid values",
    details: fieldErrors,
  });
}

/**
 * Builds a not found error response with resource identifier
 * Requirements: 15.5
 *
 * @param resourceType - Type of resource (e.g., "Memory", "Session")
 * @param resourceId - Identifier of the missing resource
 * @returns Formatted not found error response
 */
export function buildNotFoundResponse(resourceType: string, resourceId: string): ApiErrorResponse {
  return buildErrorResponse(`${resourceType} not found`, ErrorCodes.NOT_FOUND, {
    suggestion: `Verify the ${resourceType.toLowerCase()} ID is correct and belongs to the specified user`,
    details: { [`${resourceType.toLowerCase()}Id`]: resourceId },
  });
}

/**
 * Type guard to check if a response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Gets the HTTP status code for an error code
 */
export function getHttpStatusForErrorCode(code: ErrorCode): number {
  return ErrorCodeToHttpStatus[code] ?? 500;
}
