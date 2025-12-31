/**
 * Error Formatter Types
 *
 * Defines interfaces and types for interface-specific error formatters.
 * Provides consistent error formatting across REST, MCP, and UI interfaces.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.3, 8.4
 */

import type {
  ConstraintType,
  ExpectedConstraint,
  ValidationErrorCode,
  ValidationResult,
} from "../types.js";

/**
 * Base formatter interface for transforming ValidationResult to interface-specific formats
 *
 * Requirements: 4.4, 4.5
 */
export interface ErrorFormatter<T> {
  /**
   * Format a ValidationResult for the specific interface
   * @param result - The validation result to format
   * @returns Interface-specific error response
   */
  format(result: ValidationResult): T;
}

/**
 * Field error details for REST API response
 *
 * Requirements: 4.1, 4.4, 4.5
 */
export interface RESTFieldErrorDetails {
  /** Human-readable error message */
  message: string;
  /** Unique error code identifying the validation failure type */
  code: ValidationErrorCode;
  /** The constraint that was violated */
  constraint: ConstraintType;
  /** Details about the expected format or constraint */
  expected: ExpectedConstraint;
  /** Actionable suggestion for fixing the error */
  suggestion: string;
}

/**
 * REST API validation error response format
 *
 * Maintains backward compatibility with existing error structure while
 * providing enhanced field-level details.
 *
 * Requirements: 4.1, 4.4, 4.5, 8.1, 8.3, 8.4
 */
export interface RESTValidationErrorResponse {
  /** Always false for error responses - backward compatible */
  success: false;
  /** Human-readable error message - backward compatible */
  error: string;
  /** Machine-readable error code - backward compatible */
  code: "VALIDATION_ERROR";
  /** Actionable suggestion for fixing errors - backward compatible */
  suggestion: string;
  /** Enhanced field-level error details */
  details: {
    /** Map of field paths to their error details */
    fields: Record<string, RESTFieldErrorDetails>;
    /** Total number of validation errors */
    totalErrors: number;
  };
  /** Response metadata for tracing and debugging */
  metadata: {
    /** Unique request identifier for tracing */
    requestId: string;
    /** ISO 8601 timestamp of the response */
    timestamp: string;
    /** Validation processing time in milliseconds */
    validationTimeMs: number;
  };
}

/**
 * MCP tool validation error response format
 *
 * Requirements: 4.2, 4.4, 4.5
 */
export interface MCPValidationErrorResponse {
  /** Always false for error responses */
  success: false;
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code */
  code: "VALIDATION_ERROR";
  /** Actionable suggestion for fixing errors */
  suggestion: string;
  /** Array of field-level errors */
  fieldErrors: Array<{
    /** Dot-notation path to the field */
    path: string;
    /** Human-readable error message */
    message: string;
    /** Unique error code identifying the validation failure type */
    code: ValidationErrorCode;
    /** Details about the expected format or constraint */
    expected: ExpectedConstraint;
    /** Actionable suggestion for fixing the error */
    suggestion: string;
  }>;
}

/**
 * UI validation error response format
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */
export interface UIValidationErrorResponse {
  /** Always false for validation errors */
  valid: false;
  /** Array of field-level errors for form display */
  errors: Array<{
    /** Form field identifier for highlighting */
    fieldId: string;
    /** Dot-notation path to the field */
    path: string;
    /** Human-readable error message */
    message: string;
    /** Actionable suggestion for fixing the error */
    suggestion: string;
    /** Error severity for display styling */
    severity: "error" | "warning";
  }>;
  /** Summary message for display */
  summary: string;
}
