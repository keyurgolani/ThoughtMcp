/**
 * Value Sanitizer
 *
 * Sanitizes values for safe inclusion in validation error responses.
 * Handles sensitive data redaction and value truncation.
 *
 * Requirements: 6.2, 6.3
 */

/**
 * Configuration options for ValueSanitizer
 */
export interface ValueSanitizerConfig {
  /** Maximum value length before truncation (default: 100) */
  maxValueLength: number;

  /** Patterns to match sensitive field paths */
  sensitivePatterns: RegExp[];
}

/**
 * Default sensitive field patterns
 * Matches common sensitive field names: password, token, secret, key, auth
 */
const DEFAULT_SENSITIVE_PATTERNS: RegExp[] = [
  /password/i,
  /token/i,
  /secret/i,
  /\bkey\b/i,
  /auth/i,
  /credential/i,
  /apikey/i,
  /api_key/i,
  /private/i,
];

/**
 * Default configuration for ValueSanitizer
 */
const DEFAULT_CONFIG: ValueSanitizerConfig = {
  maxValueLength: 100,
  sensitivePatterns: DEFAULT_SENSITIVE_PATTERNS,
};

/**
 * Redaction placeholder for sensitive values
 */
const REDACTED_PLACEHOLDER = "[REDACTED]";

/**
 * Truncation indicator suffix
 */
const TRUNCATED_INDICATOR = "[truncated]";

/**
 * ValueSanitizer class
 *
 * Provides methods to sanitize values for safe inclusion in error responses:
 * - Redacts sensitive values (passwords, tokens, secrets, keys, auth fields)
 * - Truncates long values with "[truncated]" indicator
 * - Preserves type information for non-sensitive values
 *
 * Requirements: 6.2, 6.3
 */
export class ValueSanitizer {
  private readonly config: ValueSanitizerConfig;

  constructor(config: Partial<ValueSanitizerConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      sensitivePatterns: config.sensitivePatterns ?? DEFAULT_SENSITIVE_PATTERNS,
    };
  }

  /**
   * Sanitize a value for safe inclusion in error responses
   *
   * - Redacts sensitive values based on field path
   * - Truncates long values
   * - Preserves type information for non-sensitive values
   *
   * @param value - The value to sanitize
   * @param path - The field path (for sensitive pattern matching)
   * @returns Sanitized value
   *
   * Requirements: 6.2, 6.3
   */
  sanitize(value: unknown, path: string): unknown {
    // Check if the field is sensitive
    if (this.isSensitive(path)) {
      return REDACTED_PLACEHOLDER;
    }

    // Truncate if needed
    return this.truncate(value, this.config.maxValueLength);
  }

  /**
   * Check if a field path matches sensitive patterns
   *
   * @param path - The field path to check
   * @returns true if the path matches any sensitive pattern
   *
   * Requirements: 6.2
   */
  isSensitive(path: string): boolean {
    return this.config.sensitivePatterns.some((pattern) => pattern.test(path));
  }

  /**
   * Truncate a value if it exceeds max length
   *
   * - Strings are truncated with "[truncated]" indicator
   * - Arrays show first few items with count indicator
   * - Objects show truncated JSON representation
   * - Primitives (numbers, booleans, null) are returned as-is
   *
   * @param value - The value to truncate
   * @param maxLength - Maximum length for string representation
   * @returns Truncated value with indicator if truncated
   *
   * Requirements: 6.3
   */
  truncate(value: unknown, maxLength: number): unknown {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives that don't need truncation
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }

    // Handle strings
    if (typeof value === "string") {
      return this.truncateString(value, maxLength);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return this.truncateArray(value, maxLength);
    }

    // Handle objects
    if (typeof value === "object") {
      return this.truncateObject(value, maxLength);
    }

    // For other types (functions, symbols), return type description
    return `[${typeof value}]`;
  }

  /**
   * Truncate a string value
   */
  private truncateString(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    // Calculate how much space we have for the actual content
    // We need to leave room for the truncated indicator
    const contentLength = maxLength - TRUNCATED_INDICATOR.length;

    if (contentLength <= 0) {
      return TRUNCATED_INDICATOR;
    }

    return value.slice(0, contentLength) + TRUNCATED_INDICATOR;
  }

  /**
   * Truncate an array value
   */
  private truncateArray(value: unknown[], maxLength: number): string {
    const totalItems = value.length;

    if (totalItems === 0) {
      return "[]";
    }

    // Try to show first few items
    const preview: string[] = [];
    let currentLength = 2; // Account for "[]"

    for (let i = 0; i < value.length && i < 3; i++) {
      const itemStr = this.valueToString(value[i]);
      const itemLength = itemStr.length + (preview.length > 0 ? 2 : 0); // ", " separator

      if (currentLength + itemLength > maxLength - 20) {
        // Leave room for "... (N more)"
        break;
      }

      preview.push(itemStr);
      currentLength += itemLength;
    }

    if (preview.length === 0) {
      return `[... (${totalItems} items)]`;
    }

    const remaining = totalItems - preview.length;
    if (remaining > 0) {
      return `[${preview.join(", ")}, ... (${remaining} more)]`;
    }

    return `[${preview.join(", ")}]`;
  }

  /**
   * Truncate an object value
   */
  private truncateObject(value: object, maxLength: number): string {
    try {
      const jsonStr = JSON.stringify(value);

      if (jsonStr.length <= maxLength) {
        return jsonStr;
      }

      // Truncate the JSON string
      const contentLength = maxLength - TRUNCATED_INDICATOR.length;

      if (contentLength <= 0) {
        return TRUNCATED_INDICATOR;
      }

      return jsonStr.slice(0, contentLength) + TRUNCATED_INDICATOR;
    } catch {
      // Handle circular references or other JSON.stringify errors
      return `[object ${value.constructor?.name ?? "Object"}]`;
    }
  }

  /**
   * Convert a value to a short string representation
   */
  private valueToString(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string")
      return `"${value.slice(0, 20)}${value.length > 20 ? "..." : ""}"`;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (typeof value === "object") return `{...}`;
    return `[${typeof value}]`;
  }
}

/**
 * Create a ValueSanitizer with custom configuration
 *
 * @param config - Partial configuration to override defaults
 * @returns Configured ValueSanitizer instance
 */
export function createValueSanitizer(config: Partial<ValueSanitizerConfig> = {}): ValueSanitizer {
  return new ValueSanitizer(config);
}
