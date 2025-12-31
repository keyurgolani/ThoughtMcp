/**
 * ValueSanitizer Property-Based Tests
 *
 * Property tests for value sanitization functionality using fast-check.
 * Tests universal properties that should hold for all valid inputs.
 *
 * Requirements: 6.2, 6.3
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ValueSanitizer } from "../../../validation/value-sanitizer.js";

describe("ValueSanitizer Property Tests", () => {
  const sanitizer = new ValueSanitizer();

  /**
   * Property 13: Sensitive Data Sanitization
   *
   * For any field matching sensitive patterns (password, token, secret, key, auth),
   * the actualValue in the error SHALL be sanitized to "[REDACTED]".
   *
   * **Validates: Requirements 6.2**
   */
  describe("Property 13: Sensitive Data Sanitization", () => {
    // Sensitive field names that will definitely match the patterns
    // Note: "key" requires word boundary (\bkey\b), so we use patterns that match
    const sensitiveFieldNames = [
      "password",
      "userPassword",
      "token",
      "accessToken",
      "secret",
      "clientSecret",
      "key", // standalone "key" matches \bkey\b
      "apiKey", // matches /apikey/i
      "api_key", // matches /api_key/i
      "auth",
      "authorization",
      "credential",
      "credentials",
      "private",
      "privateData",
    ];

    // Arbitrary for generating sensitive field paths
    const sensitivePath = fc.oneof(
      // Simple sensitive field names
      fc.constantFrom(...sensitiveFieldNames),
      // Nested paths with sensitive fields
      fc
        .tuple(
          fc.stringMatching(/^[a-z][a-zA-Z0-9]{0,10}$/),
          fc.constantFrom(...sensitiveFieldNames)
        )
        .map(([prefix, sensitive]) => `${prefix}.${sensitive}`),
      // Array paths with sensitive fields
      fc
        .tuple(fc.constantFrom(...sensitiveFieldNames), fc.nat({ max: 10 }))
        .map(([sensitive, idx]) => `${sensitive}[${idx}]`)
    );

    // Arbitrary for generating any value
    const anyValue = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.double(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.string()),
      fc.dictionary(fc.string(), fc.string())
    );

    it("should always redact values for sensitive field paths", () => {
      fc.assert(
        fc.property(sensitivePath, anyValue, (path, value) => {
          const result = sanitizer.sanitize(value, path);
          expect(result).toBe("[REDACTED]");
        }),
        { numRuns: 100 }
      );
    });

    it("should redact regardless of value type for sensitive paths", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("password", "token", "secret", "apiKey", "auth"),
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 1000 }),
            fc.integer(),
            fc.double(),
            fc.boolean(),
            fc.constant(null),
            fc.array(fc.integer(), { maxLength: 10 }),
            fc.dictionary(fc.string(), fc.integer())
          ),
          (path, value) => {
            const result = sanitizer.sanitize(value, path);
            expect(result).toBe("[REDACTED]");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be case-insensitive for sensitive pattern matching", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("password", "PASSWORD", "Password", "pAsSwOrD"),
          fc.string(),
          (path, value) => {
            const result = sanitizer.sanitize(value, path);
            expect(result).toBe("[REDACTED]");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Value Truncation
   *
   * For any actualValue exceeding the configured maxValueLength,
   * the value SHALL be truncated with a "[truncated]" indicator.
   *
   * **Validates: Requirements 6.3**
   */
  describe("Property 14: Value Truncation", () => {
    const maxLength = 100; // Default max length
    const customSanitizer = new ValueSanitizer({ maxValueLength: maxLength });

    it("should truncate strings exceeding maxValueLength with [truncated] indicator", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: maxLength + 1, maxLength: 500 }),
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/), // Non-sensitive path
          (longString, path) => {
            const result = customSanitizer.sanitize(longString, path);
            expect(typeof result).toBe("string");
            expect((result as string).length).toBeLessThanOrEqual(maxLength);
            expect((result as string).endsWith("[truncated]")).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not truncate strings within maxValueLength", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: maxLength }),
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/), // Non-sensitive path
          (shortString, path) => {
            const result = customSanitizer.sanitize(shortString, path);
            expect(result).toBe(shortString);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve primitive types (numbers, booleans) without truncation", () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.integer(), fc.double({ noNaN: true, noDefaultInfinity: true }), fc.boolean()),
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/), // Non-sensitive path
          (primitive, path) => {
            const result = customSanitizer.sanitize(primitive, path);
            expect(result).toBe(primitive);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve null and undefined without truncation", () => {
      fc.assert(
        fc.property(fc.constant(null), fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/), (value, path) => {
          const result = customSanitizer.sanitize(value, path);
          expect(result).toBe(null);
        }),
        { numRuns: 100 }
      );

      fc.assert(
        fc.property(
          fc.constant(undefined),
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
          (value, path) => {
            const result = customSanitizer.sanitize(value, path);
            expect(result).toBe(undefined);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should truncate large objects with [truncated] indicator", () => {
      fc.assert(
        fc.property(
          // Generate objects that will exceed maxLength when stringified
          fc.dictionary(
            fc.string({ minLength: 5, maxLength: 20 }),
            fc.string({ minLength: 20, maxLength: 50 }),
            { minKeys: 5, maxKeys: 10 }
          ),
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
          (obj, path) => {
            const jsonLength = JSON.stringify(obj).length;
            if (jsonLength > maxLength) {
              const result = customSanitizer.sanitize(obj, path);
              expect(typeof result).toBe("string");
              expect((result as string).length).toBeLessThanOrEqual(maxLength);
              expect((result as string).endsWith("[truncated]")).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should truncate large arrays with count indicator", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 50, maxLength: 100 }),
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
          (arr, path) => {
            const result = customSanitizer.sanitize(arr, path);
            expect(typeof result).toBe("string");
            // Should contain "more" indicator for truncated arrays
            expect(
              (result as string).includes("more") || (result as string).includes("items")
            ).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should respect custom maxValueLength configuration", () => {
      const customMaxLength = 50;
      const customSanitizerSmall = new ValueSanitizer({ maxValueLength: customMaxLength });

      fc.assert(
        fc.property(
          fc.string({ minLength: customMaxLength + 1, maxLength: 200 }),
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
          (longString, path) => {
            const result = customSanitizerSmall.sanitize(longString, path);
            expect(typeof result).toBe("string");
            expect((result as string).length).toBeLessThanOrEqual(customMaxLength);
            expect((result as string).endsWith("[truncated]")).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined Property: Sensitive paths take precedence over truncation
   *
   * For any sensitive field path, the value should be redacted regardless
   * of its length or type, and truncation should not apply.
   */
  describe("Combined: Sensitive paths take precedence", () => {
    it("should redact sensitive values without truncation logic", () => {
      fc.assert(
        fc.property(
          fc.constantFrom("password", "token", "secret", "apiKey", "auth"),
          fc.string({ minLength: 200, maxLength: 500 }), // Very long string
          (path, longValue) => {
            const result = sanitizer.sanitize(longValue, path);
            // Should be redacted, not truncated
            expect(result).toBe("[REDACTED]");
            expect(result).not.toContain("[truncated]");
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
