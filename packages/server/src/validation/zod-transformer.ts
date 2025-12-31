/**
 * Zod Error Transformer
 *
 * Transforms Zod validation errors into the standardized FieldError format.
 * Preserves path information, extracts constraint details, and generates suggestions.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import type { ZodError, ZodIssue, ZodIssueCode } from "zod";
import { SuggestionGenerator } from "./suggestion-generator.js";
import type {
  ConstraintType,
  ExpectedConstraint,
  FieldError,
  ValidationErrorCode,
} from "./types.js";
import { ValueSanitizer } from "./value-sanitizer.js";

/**
 * Configuration options for ZodErrorTransformer
 */
export interface ZodErrorTransformerConfig {
  /** SuggestionGenerator instance for generating suggestions */
  suggestionGenerator?: SuggestionGenerator;

  /** ValueSanitizer instance for sanitizing values */
  valueSanitizer?: ValueSanitizer;
}

/**
 * Mapping from Zod issue codes to ValidationErrorCode
 *
 * Requirements: 7.1
 */
const ZOD_CODE_TO_VALIDATION_CODE: Record<ZodIssueCode, ValidationErrorCode> = {
  invalid_type: "TYPE_MISMATCH",
  invalid_literal: "TYPE_MISMATCH",
  custom: "CUSTOM_VALIDATION_FAILED",
  invalid_union: "TYPE_MISMATCH",
  invalid_union_discriminator: "TYPE_MISMATCH",
  invalid_enum_value: "INVALID_ENUM_VALUE",
  unrecognized_keys: "CUSTOM_VALIDATION_FAILED",
  invalid_arguments: "TYPE_MISMATCH",
  invalid_return_type: "TYPE_MISMATCH",
  invalid_date: "INVALID_FORMAT",
  invalid_string: "PATTERN_MISMATCH",
  too_small: "STRING_TOO_SHORT",
  too_big: "STRING_TOO_LONG",
  invalid_intersection_types: "TYPE_MISMATCH",
  not_multiple_of: "CUSTOM_VALIDATION_FAILED",
  not_finite: "TYPE_MISMATCH",
};

/**
 * Mapping from Zod issue codes to ConstraintType
 */
const ZOD_CODE_TO_CONSTRAINT: Record<ZodIssueCode, ConstraintType> = {
  invalid_type: "type",
  invalid_literal: "type",
  custom: "custom",
  invalid_union: "type",
  invalid_union_discriminator: "type",
  invalid_enum_value: "enum",
  unrecognized_keys: "custom",
  invalid_arguments: "type",
  invalid_return_type: "type",
  invalid_date: "format",
  invalid_string: "pattern",
  too_small: "minLength",
  too_big: "maxLength",
  invalid_intersection_types: "type",
  not_multiple_of: "custom",
  not_finite: "type",
};

/**
 * ZodErrorTransformer class
 *
 * Transforms Zod validation errors into standardized FieldError format.
 * Handles all Zod issue types and extracts constraint details.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export class ZodErrorTransformer {
  private readonly suggestionGenerator: SuggestionGenerator;
  private readonly valueSanitizer: ValueSanitizer;

  constructor(config: ZodErrorTransformerConfig = {}) {
    this.suggestionGenerator = config.suggestionGenerator ?? new SuggestionGenerator();
    this.valueSanitizer = config.valueSanitizer ?? new ValueSanitizer();
  }

  /**
   * Transform a ZodError into an array of FieldErrors
   *
   * @param error - The Zod error to transform
   * @param input - The original input for value extraction
   * @returns Array of FieldErrors
   *
   * Requirements: 7.1, 7.2, 7.3
   */
  transform(error: ZodError, input: unknown): FieldError[] {
    return error.issues.map((issue) => this.transformIssue(issue, input));
  }

  /**
   * Transform a single ZodIssue into a FieldError
   *
   * @param issue - The Zod issue to transform
   * @param input - The original input for value extraction
   * @returns FieldError
   */
  private transformIssue(issue: ZodIssue, input: unknown): FieldError {
    const path = this.formatPath(issue.path);
    const code = this.mapIssueCodeToValidationCode(issue);
    const constraint = this.mapIssueCodeToConstraint(issue);
    const actualValue = this.extractActualValue(issue.path, input);
    const sanitizedValue = this.valueSanitizer.sanitize(actualValue, path);
    const expected = this.extractConstraint(issue);

    const errorWithoutSuggestion = {
      code,
      message: issue.message,
      path,
      constraint,
      actualValue: sanitizedValue,
      expected,
    };

    const suggestion = this.generateSuggestion(issue, expected);

    return {
      ...errorWithoutSuggestion,
      suggestion,
    };
  }

  /**
   * Format Zod path array into dot-notation string
   *
   * Handles both object keys and array indices.
   * Example: ["user", "addresses", 0, "city"] -> "user.addresses[0].city"
   *
   * @param path - Zod path array
   * @returns Dot-notation path string
   *
   * Requirements: 7.3
   */
  private formatPath(path: (string | number)[]): string {
    if (path.length === 0) {
      return "request";
    }

    let result = "";

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];

      if (typeof segment === "number") {
        // Array index - use bracket notation
        result += `[${segment}]`;
      } else {
        // Object key - use dot notation (except for first segment)
        if (result.length > 0 && !result.endsWith("]")) {
          result += ".";
        } else if (result.endsWith("]")) {
          result += ".";
        }
        result += segment;
      }
    }

    return result;
  }

  /**
   * Map Zod issue code to ValidationErrorCode
   *
   * Handles special cases like too_small/too_big which can apply to
   * strings, numbers, arrays, etc.
   *
   * @param issue - The Zod issue
   * @returns ValidationErrorCode
   *
   * Requirements: 7.1
   */
  private mapIssueCodeToValidationCode(issue: ZodIssue): ValidationErrorCode {
    // Handle special cases for too_small and too_big
    if (issue.code === "too_small" || issue.code === "too_big") {
      const typedIssue = issue as ZodIssue & { type?: string };
      if (typedIssue.type === "number") {
        return issue.code === "too_small" ? "NUMBER_TOO_SMALL" : "NUMBER_TOO_LARGE";
      }
      if (typedIssue.type === "array") {
        return "ARRAY_ITEM_INVALID";
      }
      // Default to string length errors
      return issue.code === "too_small" ? "STRING_TOO_SHORT" : "STRING_TOO_LONG";
    }

    // Handle invalid_type with "undefined" received as required field
    if (issue.code === "invalid_type") {
      const typedIssue = issue as ZodIssue & { received?: string };
      if (typedIssue.received === "undefined") {
        return "FIELD_REQUIRED";
      }
    }

    // Handle invalid_string with specific validations
    if (issue.code === "invalid_string") {
      const typedIssue = issue as ZodIssue & { validation?: string | { includes?: string } };
      if (
        typedIssue.validation === "email" ||
        typedIssue.validation === "url" ||
        typedIssue.validation === "uuid" ||
        typedIssue.validation === "datetime"
      ) {
        return "INVALID_FORMAT";
      }
    }

    return ZOD_CODE_TO_VALIDATION_CODE[issue.code] ?? "CUSTOM_VALIDATION_FAILED";
  }

  /**
   * Map Zod issue code to ConstraintType
   *
   * @param issue - The Zod issue
   * @returns ConstraintType
   */
  private mapIssueCodeToConstraint(issue: ZodIssue): ConstraintType {
    // Handle special cases for too_small and too_big
    if (issue.code === "too_small" || issue.code === "too_big") {
      const typedIssue = issue as ZodIssue & { type?: string };
      if (typedIssue.type === "number") {
        return issue.code === "too_small" ? "minValue" : "maxValue";
      }
      return issue.code === "too_small" ? "minLength" : "maxLength";
    }

    // Handle invalid_type with "undefined" received as required field
    if (issue.code === "invalid_type") {
      const typedIssue = issue as ZodIssue & { received?: string };
      if (typedIssue.received === "undefined") {
        return "required";
      }
    }

    // Handle invalid_string with specific validations
    if (issue.code === "invalid_string") {
      const typedIssue = issue as ZodIssue & { validation?: string | { includes?: string } };
      if (
        typedIssue.validation === "email" ||
        typedIssue.validation === "url" ||
        typedIssue.validation === "uuid" ||
        typedIssue.validation === "datetime"
      ) {
        return "format";
      }
    }

    return ZOD_CODE_TO_CONSTRAINT[issue.code] ?? "custom";
  }

  /**
   * Extract constraint details from a Zod issue
   *
   * @param issue - The Zod issue
   * @returns ExpectedConstraint details
   *
   * Requirements: 7.4
   */
  extractConstraint(issue: ZodIssue): ExpectedConstraint {
    switch (issue.code) {
      case "invalid_type":
        return this.extractInvalidTypeConstraint(issue);
      case "too_small":
        return this.extractTooSmallConstraint(issue);
      case "too_big":
        return this.extractTooBigConstraint(issue);
      case "invalid_enum_value":
        return this.extractEnumConstraint(issue);
      case "invalid_string":
        return this.extractStringConstraint(issue);
      case "invalid_date":
        return { type: "format", format: "date", example: "2024-01-15T10:30:00Z" };
      case "custom":
        return this.extractCustomConstraint(issue);
      case "invalid_literal":
        return this.extractLiteralConstraint(issue);
      case "invalid_union":
      case "invalid_union_discriminator":
      case "invalid_intersection_types":
        return {
          type: "type",
          expectedType: "one of the valid union types",
          actualType: "invalid type",
        };
      case "unrecognized_keys":
        return this.extractUnrecognizedKeysConstraint(issue);
      case "not_multiple_of":
        return this.extractMultipleOfConstraint(issue);
      case "not_finite":
        return { type: "type", expectedType: "finite number", actualType: "infinite or NaN" };
      default:
        return { type: "custom", description: issue.message };
    }
  }

  /**
   * Extract constraint for invalid_type issues
   */
  private extractInvalidTypeConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { expected: string; received: string };
    if (typedIssue.received === "undefined") {
      return { type: "required" };
    }
    return { type: "type", expectedType: typedIssue.expected, actualType: typedIssue.received };
  }

  /**
   * Extract constraint for too_small issues
   */
  private extractTooSmallConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { type: string; minimum: number; inclusive: boolean };
    const minValue = typedIssue.inclusive ? typedIssue.minimum : typedIssue.minimum + 1;
    if (typedIssue.type === "number") {
      return { type: "minValue", minValue };
    }
    return { type: "minLength", minLength: minValue };
  }

  /**
   * Extract constraint for too_big issues
   */
  private extractTooBigConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { type: string; maximum: number; inclusive: boolean };
    const maxValue = typedIssue.inclusive ? typedIssue.maximum : typedIssue.maximum - 1;
    if (typedIssue.type === "number") {
      return { type: "maxValue", maxValue };
    }
    return { type: "maxLength", maxLength: maxValue };
  }

  /**
   * Extract constraint for invalid_enum_value issues
   */
  private extractEnumConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { options: string[]; received: string };
    const closestMatch = this.suggestionGenerator.findClosestEnumValue(
      String(typedIssue.received),
      typedIssue.options.map(String)
    );
    return { type: "enum", validValues: typedIssue.options.map(String), closestMatch };
  }

  /**
   * Extract constraint for invalid_string issues
   */
  private extractStringConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & {
      validation?: string | { includes?: string; startsWith?: string; endsWith?: string };
    };

    if (typeof typedIssue.validation === "string") {
      return this.getFormatConstraint(typedIssue.validation);
    }

    if (typeof typedIssue.validation === "object") {
      return this.extractObjectValidationConstraint(typedIssue.validation);
    }

    return { type: "pattern", pattern: "invalid string format", example: "valid string" };
  }

  /**
   * Extract constraint for object-based string validation
   */
  private extractObjectValidationConstraint(validation: {
    includes?: string;
    startsWith?: string;
    endsWith?: string;
  }): ExpectedConstraint {
    if (validation.includes) {
      return {
        type: "pattern",
        pattern: `must include "${validation.includes}"`,
        example: `text containing "${validation.includes}"`,
      };
    }
    if (validation.startsWith) {
      return {
        type: "pattern",
        pattern: `must start with "${validation.startsWith}"`,
        example: `${validation.startsWith}example`,
      };
    }
    if (validation.endsWith) {
      return {
        type: "pattern",
        pattern: `must end with "${validation.endsWith}"`,
        example: `example${validation.endsWith}`,
      };
    }
    return { type: "pattern", pattern: "invalid string format", example: "valid string" };
  }

  /**
   * Extract constraint for custom issues
   */
  private extractCustomConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { params?: { message?: string } };
    return { type: "custom", description: typedIssue.params?.message ?? issue.message };
  }

  /**
   * Extract constraint for invalid_literal issues
   */
  private extractLiteralConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { expected: unknown; received: unknown };
    return {
      type: "type",
      expectedType: String(typedIssue.expected),
      actualType: String(typedIssue.received),
    };
  }

  /**
   * Extract constraint for unrecognized_keys issues
   */
  private extractUnrecognizedKeysConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { keys: string[] };
    return { type: "custom", description: `Unrecognized keys: ${typedIssue.keys.join(", ")}` };
  }

  /**
   * Extract constraint for not_multiple_of issues
   */
  private extractMultipleOfConstraint(issue: ZodIssue): ExpectedConstraint {
    const typedIssue = issue as ZodIssue & { multipleOf: number };
    return { type: "custom", description: `Value must be a multiple of ${typedIssue.multipleOf}` };
  }

  /**
   * Get format constraint for string validation types
   */
  private getFormatConstraint(validation: string): ExpectedConstraint {
    switch (validation) {
      case "email":
        return {
          type: "format",
          format: "email",
          example: "user@example.com",
        };
      case "url":
        return {
          type: "format",
          format: "URL",
          example: "https://example.com",
        };
      case "uuid":
        return {
          type: "format",
          format: "UUID",
          example: "550e8400-e29b-41d4-a716-446655440000",
        };
      case "datetime":
        return {
          type: "format",
          format: "ISO datetime",
          example: "2024-01-15T10:30:00Z",
        };
      case "regex":
        return {
          type: "pattern",
          pattern: "regex pattern",
          example: "matching string",
        };
      case "cuid":
        return {
          type: "format",
          format: "CUID",
          example: "cjld2cjxh0000qzrmn831i7rn",
        };
      case "cuid2":
        return {
          type: "format",
          format: "CUID2",
          example: "tz4a98xxat96iws9zmbrgj3a",
        };
      case "ulid":
        return {
          type: "format",
          format: "ULID",
          example: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
        };
      case "ip":
        return {
          type: "format",
          format: "IP address",
          example: "192.168.1.1 or 2001:db8::1",
        };
      case "emoji":
        return {
          type: "format",
          format: "emoji",
          example: "😀",
        };
      default:
        return {
          type: "pattern",
          pattern: validation,
          example: `valid ${validation}`,
        };
    }
  }

  /**
   * Generate a suggestion for a Zod issue
   *
   * @param issue - The Zod issue
   * @param constraint - The extracted constraint
   * @returns Actionable suggestion string
   *
   * Requirements: 7.4
   */
  generateSuggestion(issue: ZodIssue, constraint: ExpectedConstraint): string {
    // Use the SuggestionGenerator for consistent suggestions
    const path = this.formatPath(issue.path);
    const code = this.mapIssueCodeToValidationCode(issue);
    const constraintType = this.mapIssueCodeToConstraint(issue);

    return this.suggestionGenerator.generate({
      code,
      message: issue.message,
      path,
      constraint: constraintType,
      actualValue: undefined, // We don't have the actual value here
      expected: constraint,
    });
  }

  /**
   * Extract the actual value from input using the path
   *
   * @param path - Zod path array
   * @param input - The original input
   * @returns The value at the path, or undefined if not found
   */
  private extractActualValue(path: (string | number)[], input: unknown): unknown {
    if (path.length === 0) {
      return input;
    }

    let current: unknown = input;

    for (const segment of path) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current !== "object") {
        return undefined;
      }

      if (Array.isArray(current) && typeof segment === "number") {
        current = current[segment];
      } else if (typeof segment === "string" && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }

    return current;
  }
}

/**
 * Create a ZodErrorTransformer with custom configuration
 *
 * @param config - Configuration options
 * @returns Configured ZodErrorTransformer instance
 */
export function createZodErrorTransformer(
  config: ZodErrorTransformerConfig = {}
): ZodErrorTransformer {
  return new ZodErrorTransformer(config);
}
