/**
 * Suggestion Generator
 *
 * Generates actionable suggestions for validation errors.
 * Uses Levenshtein distance for string similarity matching.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import type { ConstraintType, ExpectedConstraint, ValidationErrorCode } from "./types.js";

/**
 * Input for suggestion generation (FieldError without suggestion field)
 */
export interface SuggestionInput {
  /** Unique error code identifying the validation failure type */
  code: ValidationErrorCode;

  /** Human-readable error message */
  message: string;

  /** Dot-notation path to the field */
  path: string;

  /** The constraint that was violated */
  constraint: ConstraintType;

  /** The actual value that failed validation (sanitized) */
  actualValue: unknown;

  /** Details about the expected format or constraint */
  expected: ExpectedConstraint;
}

/**
 * Default similarity threshold for enum suggestions (70%)
 */
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

/**
 * SuggestionGenerator class
 *
 * Generates actionable suggestions for validation errors based on constraint type.
 * Uses Levenshtein distance algorithm for finding similar enum values.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export class SuggestionGenerator {
  private readonly similarityThreshold: number;

  constructor(similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD) {
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Generate a suggestion for a field error
   *
   * @param error - The field error without suggestion
   * @returns Actionable suggestion string
   *
   * Requirements: 5.1
   */
  generate(error: SuggestionInput): string {
    switch (error.expected.type) {
      case "required":
        return this.generateRequiredSuggestion(error.path);

      case "minLength":
        return this.generateMinLengthSuggestion(error.expected.minLength, error.actualValue);

      case "maxLength":
        return this.generateMaxLengthSuggestion(error.expected.maxLength, error.actualValue);

      case "minValue":
        return this.generateMinValueSuggestion(error.expected.minValue, error.actualValue);

      case "maxValue":
        return this.generateMaxValueSuggestion(error.expected.maxValue, error.actualValue);

      case "range":
        return this.generateRangeSuggestion(
          error.expected.minValue,
          error.expected.maxValue,
          error.actualValue
        );

      case "pattern":
        return this.generatePatternSuggestion(error.expected.pattern, error.expected.example);

      case "type":
        return this.generateTypeSuggestion(error.expected.expectedType, error.expected.actualType);

      case "enum":
        return this.generateEnumSuggestion(
          error.expected.validValues,
          error.actualValue,
          error.expected.closestMatch
        );

      case "format":
        return this.generateFormatSuggestion(error.expected.format, error.expected.example);

      case "custom":
        return this.generateCustomSuggestion(error.expected.description);

      default:
        return "Please check the field value and try again.";
    }
  }

  /**
   * Find the closest enum value using string similarity
   *
   * Uses Levenshtein distance to calculate similarity between strings.
   * Returns the closest match if similarity is above the threshold.
   *
   * @param value - The invalid value
   * @param validValues - Array of valid enum values
   * @param threshold - Minimum similarity threshold (0-1), defaults to 0.7
   * @returns Closest match or undefined if no match above threshold
   *
   * Requirements: 5.4
   */
  findClosestEnumValue(
    value: string,
    validValues: string[],
    threshold: number = this.similarityThreshold
  ): string | undefined {
    if (!value || validValues.length === 0) {
      return undefined;
    }

    const normalizedValue = value.toLowerCase();
    let bestMatch: string | undefined;
    let bestSimilarity = 0;

    for (const validValue of validValues) {
      const normalizedValid = validValue.toLowerCase();
      const similarity = this.calculateSimilarity(normalizedValue, normalizedValid);

      if (similarity > bestSimilarity && similarity >= threshold) {
        bestSimilarity = similarity;
        bestMatch = validValue;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   *
   * @param a - First string
   * @param b - Second string
   * @returns The edit distance between the strings
   */
  levenshteinDistance(a: string, b: string): number {
    // Handle edge cases
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    // Create distance matrix
    const matrix: number[][] = [];

    // Initialize first column
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    // Initialize first row
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[a.length][b.length];
  }

  /**
   * Calculate similarity between two strings (0-1)
   *
   * @param a - First string
   * @param b - Second string
   * @returns Similarity score between 0 and 1
   */
  calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);

    return 1 - distance / maxLength;
  }

  /**
   * Generate suggestion for required field error
   * Requirements: 5.5
   */
  private generateRequiredSuggestion(path: string): string {
    const fieldName = this.extractFieldName(path);
    return `Provide a value for the required field "${fieldName}".`;
  }

  /**
   * Generate suggestion for minimum length error
   * Requirements: 5.2
   */
  private generateMinLengthSuggestion(minLength: number, actualValue: unknown): string {
    const currentLength = typeof actualValue === "string" ? actualValue.length : 0;
    const needed = minLength - currentLength;
    return `Value must be at least ${minLength} characters. Add ${needed} more character${needed === 1 ? "" : "s"}.`;
  }

  /**
   * Generate suggestion for maximum length error
   * Requirements: 5.2
   */
  private generateMaxLengthSuggestion(maxLength: number, actualValue: unknown): string {
    const currentLength = typeof actualValue === "string" ? actualValue.length : 0;
    const excess = currentLength - maxLength;
    return `Value must be at most ${maxLength} characters. Remove ${excess} character${excess === 1 ? "" : "s"}.`;
  }

  /**
   * Generate suggestion for minimum value error
   * Requirements: 5.3
   */
  private generateMinValueSuggestion(minValue: number, actualValue: unknown): string {
    const current = typeof actualValue === "number" ? actualValue : 0;
    return `Value must be at least ${minValue}. Current value ${current} is ${minValue - current} below minimum.`;
  }

  /**
   * Generate suggestion for maximum value error
   * Requirements: 5.3
   */
  private generateMaxValueSuggestion(maxValue: number, actualValue: unknown): string {
    const current = typeof actualValue === "number" ? actualValue : 0;
    return `Value must be at most ${maxValue}. Current value ${current} is ${current - maxValue} above maximum.`;
  }

  /**
   * Generate suggestion for range error
   * Requirements: 5.3
   */
  private generateRangeSuggestion(
    minValue: number,
    maxValue: number,
    _actualValue: unknown
  ): string {
    return `Value must be between ${minValue} and ${maxValue}. Provide a number within this range.`;
  }

  /**
   * Generate suggestion for pattern mismatch error
   * Requirements: 5.6
   */
  private generatePatternSuggestion(pattern: string, example: string): string {
    return `Value must match the pattern "${pattern}". Example: "${example}".`;
  }

  /**
   * Generate suggestion for type mismatch error
   */
  private generateTypeSuggestion(expectedType: string, actualType: string): string {
    return `Expected ${expectedType} but received ${actualType}. Provide a value of type ${expectedType}.`;
  }

  /**
   * Generate suggestion for invalid enum value
   * Requirements: 5.4
   */
  private generateEnumSuggestion(
    validValues: string[],
    actualValue: unknown,
    closestMatch?: string
  ): string {
    // Try to find closest match if not provided
    let suggestion = closestMatch;
    if (!suggestion && typeof actualValue === "string") {
      suggestion = this.findClosestEnumValue(actualValue, validValues);
    }

    const validList = validValues.slice(0, 5).join(", ");
    const moreCount = validValues.length - 5;
    const validValuesStr = moreCount > 0 ? `${validList}, ... (${moreCount} more)` : validList;

    if (suggestion) {
      return `Invalid value. Did you mean "${suggestion}"? Valid values: ${validValuesStr}.`;
    }

    return `Invalid value. Valid values: ${validValuesStr}.`;
  }

  /**
   * Generate suggestion for format error
   * Requirements: 5.6
   */
  private generateFormatSuggestion(format: string, example: string): string {
    return `Value must be a valid ${format}. Example: "${example}".`;
  }

  /**
   * Generate suggestion for custom validation error
   */
  private generateCustomSuggestion(description: string): string {
    return description;
  }

  /**
   * Extract field name from dot-notation path
   */
  private extractFieldName(path: string): string {
    // Handle array notation: "items[0].name" -> "name"
    // Handle dot notation: "user.profile.name" -> "name"
    const parts = path.split(/[.[\]]+/).filter(Boolean);
    return parts[parts.length - 1] || path;
  }
}

/**
 * Create a SuggestionGenerator with custom similarity threshold
 *
 * @param similarityThreshold - Minimum similarity for enum suggestions (0-1)
 * @returns Configured SuggestionGenerator instance
 */
export function createSuggestionGenerator(
  similarityThreshold: number = DEFAULT_SIMILARITY_THRESHOLD
): SuggestionGenerator {
  return new SuggestionGenerator(similarityThreshold);
}
