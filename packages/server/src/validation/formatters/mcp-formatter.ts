/**
 * MCP Tool Error Formatter
 *
 * Transforms ValidationResult into MCP tool-specific error responses.
 * Provides structured field-level error details for MCP tool calls.
 *
 * Requirements: 4.2, 4.4, 4.5
 */

import type { FieldError, ValidationResult } from "../types.js";
import type { ErrorFormatter, MCPValidationErrorResponse } from "./types.js";

/**
 * MCPFormatter transforms ValidationResult to MCPValidationErrorResponse
 *
 * Features:
 * - Formats errors for MCP tool response format
 * - Includes fieldErrors array with path, message, code, expected, suggestion
 * - Provides actionable suggestions for fixing errors
 *
 * Requirements: 4.2, 4.4, 4.5
 */
export class MCPFormatter implements ErrorFormatter<MCPValidationErrorResponse> {
  /**
   * Format a ValidationResult for MCP tool response
   *
   * @param result - The validation result to format
   * @returns MCP tool-specific validation error response
   *
   * Requirements: 4.2, 4.4, 4.5
   */
  format(result: ValidationResult): MCPValidationErrorResponse {
    const fieldErrors = this.buildFieldErrors(result.errors);
    const suggestion = this.buildSuggestion(result.errors);

    return {
      success: false,
      error: "Invalid request parameters",
      code: "VALIDATION_ERROR",
      suggestion,
      fieldErrors,
    };
  }

  /**
   * Build the fieldErrors array from field errors
   *
   * @param errors - Array of field errors
   * @returns Array of MCP field error objects
   *
   * Requirements: 4.2, 4.4, 4.5
   */
  private buildFieldErrors(errors: FieldError[]): MCPValidationErrorResponse["fieldErrors"] {
    return errors.map((error) => ({
      path: error.path,
      message: error.message,
      code: error.code,
      expected: error.expected,
      suggestion: error.suggestion,
    }));
  }

  /**
   * Build a summary suggestion from field errors
   *
   * @param errors - Array of field errors
   * @returns Summary suggestion string
   *
   * Requirements: 4.2
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
 * Factory function to create an MCPFormatter instance
 *
 * @returns New MCPFormatter instance
 */
export function createMCPFormatter(): MCPFormatter {
  return new MCPFormatter();
}
