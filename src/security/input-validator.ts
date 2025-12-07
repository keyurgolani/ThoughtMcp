/**
 * Input Validator
 *
 * Validates and sanitizes user inputs to prevent injection attacks,
 * XSS, and other security vulnerabilities.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type { ValidationOptions, ValidationResult } from "./types.js";

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: Required<ValidationOptions> = {
  maxLength: 100000, // 100KB max
  minLength: 0,
  allowHtml: false,
  allowSpecialChars: true,
  trimWhitespace: true,
  normalizeUnicode: true,
  stripNullBytes: true,
};

/**
 * Input Validator class
 *
 * Provides comprehensive input validation and sanitization
 */
export class InputValidator {
  private options: Required<ValidationOptions>;

  // Patterns for dangerous content (control characters for security validation)
  private static readonly NULL_BYTE_PATTERN = /\x00/g;
  private static readonly CONTROL_CHARS_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  private static readonly HTML_TAG_PATTERN = /<[^>]*>/g;
  private static readonly SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
    /(--)|(\/*)|(\*\/)/g,
    /(;|\||&)/g,
  ];
  private static readonly PATH_TRAVERSAL_PATTERN = /\.\.[/\\]/g;

  constructor(options: ValidationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate and sanitize a string input
   */
  validate(input: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Type check
    if (input === null || input === undefined) {
      return {
        valid: false,
        sanitized: "",
        errors: ["Input cannot be null or undefined"],
        warnings: [],
      };
    }

    if (typeof input !== "string") {
      return {
        valid: false,
        sanitized: "",
        errors: [`Input must be a string, got ${typeof input}`],
        warnings: [],
      };
    }

    let sanitized = input;

    // Strip null bytes first (always)
    if (this.options.stripNullBytes) {
      const hadNullBytes = InputValidator.NULL_BYTE_PATTERN.test(sanitized);
      sanitized = sanitized.replace(InputValidator.NULL_BYTE_PATTERN, "");
      if (hadNullBytes) {
        warnings.push("Null bytes were removed from input");
      }
    }

    // Remove control characters
    const hadControlChars = InputValidator.CONTROL_CHARS_PATTERN.test(sanitized);
    sanitized = sanitized.replace(InputValidator.CONTROL_CHARS_PATTERN, "");
    if (hadControlChars) {
      warnings.push("Control characters were removed from input");
    }

    // Trim whitespace
    if (this.options.trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Normalize unicode
    if (this.options.normalizeUnicode) {
      sanitized = sanitized.normalize("NFC");
    }

    // Check length constraints
    if (sanitized.length < this.options.minLength) {
      errors.push(`Input length ${sanitized.length} is below minimum ${this.options.minLength}`);
    }

    if (sanitized.length > this.options.maxLength) {
      errors.push(`Input length ${sanitized.length} exceeds maximum ${this.options.maxLength}`);
      sanitized = sanitized.substring(0, this.options.maxLength);
      warnings.push(`Input was truncated to ${this.options.maxLength} characters`);
    }

    // Strip HTML if not allowed
    if (!this.options.allowHtml) {
      // Remove script tags first (more aggressive)
      const hadScripts = InputValidator.SCRIPT_PATTERN.test(sanitized);
      sanitized = sanitized.replace(InputValidator.SCRIPT_PATTERN, "");
      if (hadScripts) {
        warnings.push("Script tags were removed from input");
      }

      // Remove other HTML tags
      const hadHtml = InputValidator.HTML_TAG_PATTERN.test(sanitized);
      sanitized = sanitized.replace(InputValidator.HTML_TAG_PATTERN, "");
      if (hadHtml) {
        warnings.push("HTML tags were removed from input");
      }
    }

    // Check for path traversal attempts
    if (InputValidator.PATH_TRAVERSAL_PATTERN.test(sanitized)) {
      warnings.push("Potential path traversal pattern detected");
    }

    return {
      valid: errors.length === 0,
      sanitized,
      errors,
      warnings,
    };
  }

  /**
   * Validate a memory content string
   */
  validateMemoryContent(content: unknown): ValidationResult {
    const result = this.validate(content);

    if (!result.valid) {
      return result;
    }

    // Additional checks for memory content
    if (result.sanitized.length === 0) {
      result.errors.push("Memory content cannot be empty");
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate a user ID
   */
  validateUserId(userId: unknown): ValidationResult {
    const result = this.validate(userId);

    if (!result.valid) {
      return result;
    }

    // User ID specific validation
    if (result.sanitized.length === 0) {
      result.errors.push("User ID cannot be empty");
      result.valid = false;
    }

    if (result.sanitized.length > 255) {
      result.errors.push("User ID cannot exceed 255 characters");
      result.valid = false;
    }

    // Check for valid characters (alphanumeric, dash, underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(result.sanitized)) {
      result.errors.push(
        "User ID can only contain alphanumeric characters, dashes, and underscores"
      );
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate a session ID
   */
  validateSessionId(sessionId: unknown): ValidationResult {
    const result = this.validate(sessionId);

    if (!result.valid) {
      return result;
    }

    // Session ID specific validation
    if (result.sanitized.length === 0) {
      result.errors.push("Session ID cannot be empty");
      result.valid = false;
    }

    if (result.sanitized.length > 255) {
      result.errors.push("Session ID cannot exceed 255 characters");
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate a search query
   */
  validateSearchQuery(query: unknown): ValidationResult {
    const result = this.validate(query);

    if (!result.valid) {
      return result;
    }

    // Check for SQL injection patterns
    for (const pattern of InputValidator.SQL_INJECTION_PATTERNS) {
      if (pattern.test(result.sanitized)) {
        result.warnings.push("Potential SQL injection pattern detected and will be escaped");
      }
    }

    return result;
  }

  /**
   * Validate numeric input
   */
  validateNumber(
    input: unknown,
    options: { min?: number; max?: number; integer?: boolean } = {}
  ): { valid: boolean; value: number | null; error?: string } {
    if (input === null || input === undefined) {
      return { valid: false, value: null, error: "Input cannot be null or undefined" };
    }

    const num = typeof input === "number" ? input : parseFloat(String(input));

    if (isNaN(num)) {
      return { valid: false, value: null, error: "Input must be a valid number" };
    }

    if (!isFinite(num)) {
      return { valid: false, value: null, error: "Input must be a finite number" };
    }

    if (options.integer && !Number.isInteger(num)) {
      return { valid: false, value: null, error: "Input must be an integer" };
    }

    if (options.min !== undefined && num < options.min) {
      return { valid: false, value: null, error: `Input must be at least ${options.min}` };
    }

    if (options.max !== undefined && num > options.max) {
      return { valid: false, value: null, error: `Input must be at most ${options.max}` };
    }

    return { valid: true, value: num };
  }

  /**
   * Validate an array of strings
   */
  validateStringArray(
    input: unknown,
    options: { maxItems?: number; maxItemLength?: number } = {}
  ): { valid: boolean; sanitized: string[]; errors: string[] } {
    const errors: string[] = [];
    const sanitized: string[] = [];

    if (!Array.isArray(input)) {
      return { valid: false, sanitized: [], errors: ["Input must be an array"] };
    }

    const maxItems = options.maxItems ?? 1000;
    const maxItemLength = options.maxItemLength ?? 1000;

    if (input.length > maxItems) {
      errors.push(`Array exceeds maximum of ${maxItems} items`);
      return { valid: false, sanitized: [], errors };
    }

    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      if (typeof item !== "string") {
        errors.push(`Item at index ${i} must be a string`);
        continue;
      }

      const result = this.validate(item);
      if (!result.valid) {
        errors.push(`Item at index ${i}: ${result.errors.join(", ")}`);
        continue;
      }

      if (result.sanitized.length > maxItemLength) {
        errors.push(`Item at index ${i} exceeds maximum length of ${maxItemLength}`);
        continue;
      }

      sanitized.push(result.sanitized);
    }

    return { valid: errors.length === 0, sanitized, errors };
  }

  /**
   * Escape HTML entities
   */
  static escapeHtml(input: string): string {
    const htmlEntities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };

    return input.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
  }

  /**
   * Escape for SQL LIKE queries
   */
  static escapeSqlLike(input: string): string {
    return input.replace(/[%_\\]/g, "\\$&");
  }
}

/**
 * Create a default input validator instance
 */
export function createInputValidator(options?: ValidationOptions): InputValidator {
  return new InputValidator(options);
}
