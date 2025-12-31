/**
 * UI Error Formatter
 *
 * Transforms ValidationResult into UI-specific error responses.
 * Provides field-level error details suitable for form field highlighting
 * and inline error messages.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */

import type { FieldError, ValidationResult } from "../types.js";
import type { ErrorFormatter, UIValidationErrorResponse } from "./types.js";

/**
 * UIFormatter transforms ValidationResult to UIValidationErrorResponse
 *
 * Features:
 * - Formats errors for UI form display
 * - Includes fieldId mapping for form field highlighting
 * - Includes summary message for display
 * - Provides actionable suggestions for each field
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */
export class UIFormatter implements ErrorFormatter<UIValidationErrorResponse> {
  /**
   * Format a ValidationResult for UI response
   *
   * @param result - The validation result to format
   * @returns UI-specific validation error response
   *
   * Requirements: 4.3, 4.4, 4.5, 4.6
   */
  format(result: ValidationResult): UIValidationErrorResponse {
    const errors = this.buildUIErrors(result.errors);
    const summary = this.buildSummary(result.errors);

    return {
      valid: false,
      errors,
      summary,
    };
  }

  /**
   * Build the UI errors array from field errors
   *
   * @param errors - Array of field errors
   * @returns Array of UI error objects
   *
   * Requirements: 4.3, 4.4, 4.5, 4.6
   */
  private buildUIErrors(errors: FieldError[]): UIValidationErrorResponse["errors"] {
    return errors.map((error) => ({
      fieldId: this.pathToFieldId(error.path),
      path: error.path,
      message: error.message,
      suggestion: error.suggestion,
      severity: "error" as const,
    }));
  }

  /**
   * Convert a dot-notation path to a form field ID
   *
   * Transforms paths like "metadata.tags[0]" to "metadata-tags-0"
   * for use as HTML element IDs.
   *
   * @param path - Dot-notation field path
   * @returns Form field ID suitable for HTML element identification
   *
   * Requirements: 4.6
   */
  private pathToFieldId(path: string): string {
    return path
      .replace(/\./g, "-") // Replace dots with dashes
      .replace(/\[/g, "-") // Replace opening brackets with dashes
      .replace(/\]/g, ""); // Remove closing brackets
  }

  /**
   * Build a summary message from field errors
   *
   * @param errors - Array of field errors
   * @returns Summary message string
   *
   * Requirements: 4.3
   */
  private buildSummary(errors: FieldError[]): string {
    if (errors.length === 0) {
      return "Please check your input and try again";
    }

    if (errors.length === 1) {
      return `Please fix the error in the ${this.formatFieldName(errors[0].path)} field`;
    }

    return `Please fix ${errors.length} validation errors before submitting`;
  }

  /**
   * Format a field path into a human-readable field name
   *
   * @param path - Dot-notation field path
   * @returns Human-readable field name
   */
  private formatFieldName(path: string): string {
    // Get the last segment of the path
    const segments = path.split(".");
    const lastSegment = segments[segments.length - 1];

    // Remove array indices and convert to readable format
    return lastSegment
      .replace(/\[\d+\]/g, "") // Remove array indices
      .replace(/([A-Z])/g, " $1") // Add space before capitals
      .replace(/[_-]/g, " ") // Replace underscores/dashes with spaces
      .trim()
      .toLowerCase();
  }
}

/**
 * Factory function to create a UIFormatter instance
 *
 * @returns New UIFormatter instance
 */
export function createUIFormatter(): UIFormatter {
  return new UIFormatter();
}
