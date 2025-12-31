/**
 * REST API Error Formatter
 *
 * Transforms ValidationResult into REST API-specific error responses.
 * Maintains backward compatibility with existing error structure while
 * providing enhanced field-level details.
 *
 * Requirements: 4.1, 4.4, 4.5, 8.1, 8.3, 8.4
 */

import type { FieldError, ValidationResult } from "../types.js";
import type {
  ErrorFormatter,
  RESTFieldErrorDetails,
  RESTValidationErrorResponse,
} from "./types.js";

/**
 * RESTFormatter transforms ValidationResult to RESTValidationErrorResponse
 *
 * Features:
 * - Preserves backward compatibility with existing error structure
 * - Includes all field errors in details.fields
 * - Includes metadata with requestId, timestamp, validationTimeMs
 * - Maintains HTTP 400 status code convention (handled by caller)
 *
 * Requirements: 4.1, 4.4, 4.5, 8.1, 8.3, 8.4
 */
export class RESTFormatter implements ErrorFormatter<RESTValidationErrorResponse> {
  /**
   * Format a ValidationResult for REST API response
   *
   * @param result - The validation result to format
   * @returns REST API-specific validation error response
   *
   * Requirements: 4.1, 4.4, 4.5, 8.1, 8.3, 8.4
   */
  format(result: ValidationResult): RESTValidationErrorResponse {
    const fields = this.buildFieldsMap(result.errors);
    const suggestion = this.buildSuggestion(result.errors);

    return {
      success: false,
      error: "Invalid request parameters",
      code: "VALIDATION_ERROR",
      suggestion,
      details: {
        fields,
        totalErrors: result.errors.length,
      },
      metadata: {
        requestId: result.context.requestId,
        timestamp: result.context.timestamp.toISOString(),
        validationTimeMs: result.validationTimeMs,
      },
    };
  }

  /**
   * Build the fields map from field errors
   *
   * @param errors - Array of field errors
   * @returns Map of field paths to their error details
   *
   * Requirements: 4.1, 4.4, 4.5
   */
  private buildFieldsMap(errors: FieldError[]): Record<string, RESTFieldErrorDetails> {
    const fields: Record<string, RESTFieldErrorDetails> = {};

    for (const error of errors) {
      fields[error.path] = {
        message: error.message,
        code: error.code,
        constraint: error.constraint,
        expected: error.expected,
        suggestion: error.suggestion,
      };
    }

    return fields;
  }

  /**
   * Build a summary suggestion from field errors
   *
   * @param errors - Array of field errors
   * @returns Summary suggestion string
   *
   * Requirements: 8.1
   */
  private buildSuggestion(errors: FieldError[]): string {
    if (errors.length === 0) {
      return "Check that all required fields are provided with valid values";
    }

    if (errors.length === 1) {
      return errors[0].suggestion;
    }

    // For multiple errors, provide a summary
    const fieldNames = errors.map((e) => e.path).join(", ");
    return `Fix validation errors in the following fields: ${fieldNames}`;
  }
}

/**
 * Factory function to create a RESTFormatter instance
 *
 * @returns New RESTFormatter instance
 */
export function createRESTFormatter(): RESTFormatter {
  return new RESTFormatter();
}
