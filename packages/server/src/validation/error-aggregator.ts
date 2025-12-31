/**
 * Error Aggregator
 *
 * Collects and processes validation errors without short-circuiting.
 * Builds ValidationResult with timing information.
 *
 * Requirements: 1.2, 9.5
 */

import type { FieldError, ValidationContext, ValidationResult } from "./types.js";

/**
 * ErrorAggregator class
 *
 * Provides methods to collect validation errors and build results:
 * - Collects all field errors without short-circuiting on first error
 * - Builds ValidationResult with timing information
 * - Supports clearing and reusing the aggregator
 *
 * Requirements: 1.2, 9.5
 */
export class ErrorAggregator {
  private errors: FieldError[] = [];

  /**
   * Add a field error to the collection
   *
   * Errors are collected without short-circuiting, allowing all validation
   * errors to be reported in a single response.
   *
   * @param error - The field error to add
   *
   * Requirements: 1.2, 9.5
   */
  addError(error: FieldError): void {
    this.errors.push(error);
  }

  /**
   * Get all collected errors
   *
   * Returns a copy of the errors array to prevent external modification.
   *
   * @returns Array of FieldErrors
   *
   * Requirements: 1.2
   */
  getErrors(): FieldError[] {
    return [...this.errors];
  }

  /**
   * Check if any errors were collected
   *
   * @returns true if errors exist
   *
   * Requirements: 1.2
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Clear all collected errors
   *
   * Resets the aggregator for reuse.
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Build the final ValidationResult
   *
   * Creates a complete ValidationResult with:
   * - valid: false if any errors, true otherwise
   * - errors: all collected field errors
   * - context: the provided validation context
   * - validationTimeMs: calculated from startTime
   *
   * @param context - Validation context
   * @param startTime - Validation start time (from performance.now() or Date.now())
   * @returns Complete ValidationResult
   *
   * Requirements: 1.2, 9.5
   */
  buildResult(context: ValidationContext, startTime: number): ValidationResult {
    const endTime = performance.now();
    const validationTimeMs = endTime - startTime;

    return {
      valid: !this.hasErrors(),
      errors: this.getErrors(),
      context,
      validationTimeMs,
    };
  }
}

/**
 * Create an ErrorAggregator instance
 *
 * @returns New ErrorAggregator instance
 */
export function createErrorAggregator(): ErrorAggregator {
  return new ErrorAggregator();
}
