/**
 * Content Validator
 *
 * Validates memory content length to ensure it meets minimum and maximum requirements.
 * Provides detailed error messages with allowed range information.
 * Also provides content truncation utilities for display purposes.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 4.1, 4.2, 4.3
 */

import type { TruncationResult } from "./types.js";

/**
 * Content validation result
 */
export interface ContentValidationResult {
  valid: boolean;
  error?: ContentValidationError;
}

/**
 * Content validation error with detailed information
 */
export interface ContentValidationError {
  code: "CONTENT_TOO_SHORT" | "CONTENT_TOO_LONG";
  message: string;
  details: {
    actualLength: number;
    minLength: number;
    maxLength: number;
    allowedRange: string;
  };
}

/**
 * Content validation options
 */
export interface ContentValidatorOptions {
  minLength?: number;
  maxLength?: number;
}

/**
 * Default content length constraints
 */
const DEFAULT_MIN_LENGTH = 10;
const DEFAULT_MAX_LENGTH = 100_000;

/**
 * ContentValidator class
 *
 * Validates memory content length with configurable min/max constraints.
 * Returns detailed error information including the allowed range.
 */
export class ContentValidator {
  private readonly minLength: number;
  private readonly maxLength: number;

  constructor(options: ContentValidatorOptions = {}) {
    this.minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
    this.maxLength = options.maxLength ?? DEFAULT_MAX_LENGTH;
  }

  /**
   * Validate content length
   *
   * @param content - The content string to validate
   * @returns Validation result with error details if invalid
   *
   * Requirements:
   * - 8.1: Reject content shorter than 10 characters
   * - 8.2: Reject content exceeding 100,000 characters
   * - 8.3: Error message specifies allowed range
   * - 8.4: Accept content at boundary values (10 or 100,000 characters)
   */
  validate(content: string): ContentValidationResult {
    const actualLength = content.length;
    const allowedRange = `${this.minLength}-${this.maxLength} characters`;

    // Check minimum length (Requirement 8.1)
    if (actualLength < this.minLength) {
      return {
        valid: false,
        error: {
          code: "CONTENT_TOO_SHORT",
          message: `Content length ${actualLength} is below minimum. Allowed range: ${allowedRange}`,
          details: {
            actualLength,
            minLength: this.minLength,
            maxLength: this.maxLength,
            allowedRange,
          },
        },
      };
    }

    // Check maximum length (Requirement 8.2)
    if (actualLength > this.maxLength) {
      return {
        valid: false,
        error: {
          code: "CONTENT_TOO_LONG",
          message: `Content length ${actualLength} exceeds maximum. Allowed range: ${allowedRange}`,
          details: {
            actualLength,
            minLength: this.minLength,
            maxLength: this.maxLength,
            allowedRange,
          },
        },
      };
    }

    // Content is valid (including boundary values - Requirement 8.4)
    return { valid: true };
  }

  /**
   * Get the minimum allowed content length
   */
  getMinLength(): number {
    return this.minLength;
  }

  /**
   * Get the maximum allowed content length
   */
  getMaxLength(): number {
    return this.maxLength;
  }

  /**
   * Get the allowed range as a formatted string
   */
  getAllowedRange(): string {
    return `${this.minLength}-${this.maxLength} characters`;
  }
}

/**
 * Create a default content validator instance
 */
export function createContentValidator(options?: ContentValidatorOptions): ContentValidator {
  return new ContentValidator(options);
}

/**
 * Truncation indicator appended to truncated content
 */
const TRUNCATION_INDICATOR = "[truncated]";

/**
 * Default maximum length for content truncation
 */
const DEFAULT_TRUNCATION_MAX_LENGTH = 500;

/**
 * Default minimum preserved content length
 */
const DEFAULT_MIN_PRESERVED = 200;

/**
 * Truncate content for display purposes
 *
 * @param content - The content string to truncate
 * @param maxLength - Maximum length before truncation (default 500)
 * @param minPreserved - Minimum characters to preserve (default 200)
 * @returns TruncationResult with content, isTruncated flag, and originalLength
 *
 * Requirements:
 * - 4.1: Append "[truncated]" indicator when content exceeds display limits
 * - 4.2: Display complete content without truncation indicators when within limits
 * - 4.3: Preserve at least 200 characters of meaningful content before truncating
 */
export function truncateContent(
  content: string,
  maxLength: number = DEFAULT_TRUNCATION_MAX_LENGTH,
  minPreserved: number = DEFAULT_MIN_PRESERVED
): TruncationResult {
  const originalLength = content.length;

  // If content is within limits, return as-is (Requirement 4.2)
  if (originalLength <= maxLength) {
    return {
      content,
      isTruncated: false,
      originalLength,
    };
  }

  // Calculate truncation point ensuring minPreserved is respected (Requirement 4.3)
  // Account for the truncation indicator length
  const indicatorLength = TRUNCATION_INDICATOR.length;
  const availableSpace = maxLength - indicatorLength;

  // Ensure we preserve at least minPreserved characters
  const truncationPoint = Math.max(minPreserved, availableSpace);

  // Truncate and append indicator (Requirement 4.1)
  const truncatedContent = content.slice(0, truncationPoint) + TRUNCATION_INDICATOR;

  return {
    content: truncatedContent,
    isTruncated: true,
    originalLength,
  };
}
