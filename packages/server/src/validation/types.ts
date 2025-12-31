/**
 * Validation System Type Definitions
 *
 * Core types and interfaces for the Enhanced Validation Error Reporting System.
 * Provides standardized error structures across all interfaces (MCP, REST API, UI).
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */

/**
 * Constraint types that can be violated during validation
 *
 * Requirements: 1.6
 */
export type ConstraintType =
  | "required"
  | "minLength"
  | "maxLength"
  | "minValue"
  | "maxValue"
  | "pattern"
  | "type"
  | "enum"
  | "format"
  | "custom";

/**
 * Error codes for different validation failure types
 *
 * Requirements: 1.3
 */
export type ValidationErrorCode =
  | "FIELD_REQUIRED"
  | "STRING_TOO_SHORT"
  | "STRING_TOO_LONG"
  | "NUMBER_TOO_SMALL"
  | "NUMBER_TOO_LARGE"
  | "PATTERN_MISMATCH"
  | "TYPE_MISMATCH"
  | "INVALID_ENUM_VALUE"
  | "INVALID_FORMAT"
  | "ARRAY_ITEM_INVALID"
  | "CUSTOM_VALIDATION_FAILED";

/**
 * Expected constraint details based on constraint type
 *
 * Requirements: 1.8
 */
export type ExpectedConstraint =
  | { type: "required" }
  | { type: "minLength"; minLength: number }
  | { type: "maxLength"; maxLength: number }
  | { type: "minValue"; minValue: number }
  | { type: "maxValue"; maxValue: number }
  | { type: "range"; minValue: number; maxValue: number }
  | { type: "pattern"; pattern: string; example: string }
  | { type: "type"; expectedType: string; actualType: string }
  | { type: "enum"; validValues: string[]; closestMatch?: string }
  | { type: "format"; format: string; example: string }
  | { type: "custom"; description: string };

/**
 * A single field validation error with complete details
 *
 * Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
export interface FieldError {
  /** Unique error code identifying the validation failure type */
  code: ValidationErrorCode;

  /** Human-readable error message */
  message: string;

  /** Dot-notation path to the field (e.g., "metadata.tags[0]") */
  path: string;

  /** The constraint that was violated */
  constraint: ConstraintType;

  /** The actual value that failed validation (sanitized) */
  actualValue: unknown;

  /** Details about the expected format or constraint */
  expected: ExpectedConstraint;

  /** Actionable suggestion for fixing the error */
  suggestion: string;
}

/**
 * Validation context for logging and debugging
 *
 * Requirements: 10.3
 */
export interface ValidationContext {
  /** The endpoint or tool being validated */
  endpoint: string;

  /** The operation being performed */
  operation: string;

  /** User ID if available */
  userId?: string;

  /** Request ID for tracing */
  requestId: string;

  /** Timestamp of validation */
  timestamp: Date;
}

/**
 * Complete validation result with all errors
 *
 * Requirements: 1.1, 1.2
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Array of field errors (empty if valid) */
  errors: FieldError[];

  /** Validation context */
  context: ValidationContext;

  /** Total validation time in milliseconds */
  validationTimeMs: number;
}
