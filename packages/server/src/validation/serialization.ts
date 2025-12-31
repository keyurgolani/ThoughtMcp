/**
 * ValidationResult Serialization Utilities
 *
 * Provides JSON serialization and deserialization for ValidationResult objects.
 * Ensures full round-trip capability with no data loss.
 *
 * Requirements: 6.1, 6.4, 6.5
 */

import type {
  ConstraintType,
  ExpectedConstraint,
  FieldError,
  ValidationContext,
  ValidationErrorCode,
  ValidationResult,
} from "./types.js";

/**
 * Serialized representation of ValidationResult for JSON output
 *
 * Requirements: 6.1, 6.4
 */
export interface SerializedValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Array of field errors (empty if valid) */
  errors: SerializedFieldError[];

  /** Validation context with serialized timestamp */
  context: SerializedValidationContext;

  /** Total validation time in milliseconds */
  validationTimeMs: number;

  /** ISO 8601 timestamp from context (duplicated for easy access) */
  timestamp: string;

  /** Request ID from context (duplicated for easy access) */
  requestId: string;
}

/**
 * Serialized representation of FieldError
 */
export interface SerializedFieldError {
  code: ValidationErrorCode;
  message: string;
  path: string;
  constraint: ConstraintType;
  actualValue: unknown;
  expected: ExpectedConstraint;
  suggestion: string;
}

/**
 * Serialized representation of ValidationContext
 */
export interface SerializedValidationContext {
  endpoint: string;
  operation: string;
  userId?: string;
  requestId: string;
  /** ISO 8601 timestamp string */
  timestamp: string;
}

/**
 * Serializes a ValidationResult to a JSON-compatible object
 *
 * Converts Date objects to ISO 8601 strings and includes
 * timestamp and requestId at the top level for easy access.
 *
 * Requirements: 6.1, 6.4
 *
 * @param result - The ValidationResult to serialize
 * @returns SerializedValidationResult ready for JSON.stringify
 */
export function validationResultToJSON(result: ValidationResult): SerializedValidationResult {
  const serializedContext: SerializedValidationContext = {
    endpoint: result.context.endpoint,
    operation: result.context.operation,
    requestId: result.context.requestId,
    timestamp: result.context.timestamp.toISOString(),
  };

  // Include userId only if present
  if (result.context.userId !== undefined) {
    serializedContext.userId = result.context.userId;
  }

  const serializedErrors: SerializedFieldError[] = result.errors.map((error) => ({
    code: error.code,
    message: error.message,
    path: error.path,
    constraint: error.constraint,
    actualValue: error.actualValue,
    expected: error.expected,
    suggestion: error.suggestion,
  }));

  return {
    valid: result.valid,
    errors: serializedErrors,
    context: serializedContext,
    validationTimeMs: result.validationTimeMs,
    // Duplicate timestamp and requestId at top level for easy access (Requirement 6.4)
    timestamp: serializedContext.timestamp,
    requestId: result.context.requestId,
  };
}

/**
 * Deserializes a JSON object back to a ValidationResult
 *
 * Converts ISO 8601 timestamp strings back to Date objects.
 * Validates the structure to ensure data integrity.
 *
 * Requirements: 6.5
 *
 * @param json - The serialized ValidationResult object
 * @returns ValidationResult with proper Date objects
 * @throws Error if the JSON structure is invalid
 */
export function validationResultFromJSON(json: SerializedValidationResult): ValidationResult {
  // Validate required fields
  if (typeof json.valid !== "boolean") {
    throw new Error("Invalid serialized ValidationResult: 'valid' must be a boolean");
  }

  if (!Array.isArray(json.errors)) {
    throw new Error("Invalid serialized ValidationResult: 'errors' must be an array");
  }

  if (!json.context || typeof json.context !== "object") {
    throw new Error("Invalid serialized ValidationResult: 'context' must be an object");
  }

  if (typeof json.validationTimeMs !== "number") {
    throw new Error("Invalid serialized ValidationResult: 'validationTimeMs' must be a number");
  }

  // Parse timestamp from context
  const timestamp = new Date(json.context.timestamp);
  if (isNaN(timestamp.getTime())) {
    throw new Error("Invalid serialized ValidationResult: 'context.timestamp' is not a valid date");
  }

  // Reconstruct ValidationContext
  const context: ValidationContext = {
    endpoint: json.context.endpoint,
    operation: json.context.operation,
    requestId: json.context.requestId,
    timestamp,
  };

  // Include userId only if present
  if (json.context.userId !== undefined) {
    context.userId = json.context.userId;
  }

  // Reconstruct FieldErrors
  const errors: FieldError[] = json.errors.map((error, index) => {
    validateFieldError(error, index);
    return {
      code: error.code,
      message: error.message,
      path: error.path,
      constraint: error.constraint,
      actualValue: error.actualValue,
      expected: error.expected,
      suggestion: error.suggestion,
    };
  });

  return {
    valid: json.valid,
    errors,
    context,
    validationTimeMs: json.validationTimeMs,
  };
}

/**
 * Validates a serialized FieldError structure
 *
 * @param error - The serialized field error to validate
 * @param index - The index in the errors array (for error messages)
 * @throws Error if the structure is invalid
 */
function validateFieldError(error: SerializedFieldError, index: number): void {
  if (typeof error.code !== "string") {
    throw new Error(`Invalid serialized FieldError at index ${index}: 'code' must be a string`);
  }

  if (typeof error.message !== "string") {
    throw new Error(`Invalid serialized FieldError at index ${index}: 'message' must be a string`);
  }

  if (typeof error.path !== "string") {
    throw new Error(`Invalid serialized FieldError at index ${index}: 'path' must be a string`);
  }

  if (typeof error.constraint !== "string") {
    throw new Error(
      `Invalid serialized FieldError at index ${index}: 'constraint' must be a string`
    );
  }

  if (!error.expected || typeof error.expected !== "object") {
    throw new Error(
      `Invalid serialized FieldError at index ${index}: 'expected' must be an object`
    );
  }

  if (typeof error.suggestion !== "string") {
    throw new Error(
      `Invalid serialized FieldError at index ${index}: 'suggestion' must be a string`
    );
  }
}

/**
 * Convenience function to serialize ValidationResult directly to JSON string
 *
 * @param result - The ValidationResult to serialize
 * @param pretty - Whether to format with indentation (default: false)
 * @returns JSON string representation
 */
export function stringifyValidationResult(result: ValidationResult, pretty = false): string {
  const serialized = validationResultToJSON(result);
  return pretty ? JSON.stringify(serialized, null, 2) : JSON.stringify(serialized);
}

/**
 * Convenience function to parse JSON string directly to ValidationResult
 *
 * @param jsonString - The JSON string to parse
 * @returns ValidationResult with proper Date objects
 * @throws Error if parsing fails or structure is invalid
 */
export function parseValidationResult(jsonString: string): ValidationResult {
  const parsed = JSON.parse(jsonString) as SerializedValidationResult;
  return validationResultFromJSON(parsed);
}
