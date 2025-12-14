/**
 * Property Test: Content Length Validation
 *
 * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
 *
 * This property test validates that the ContentValidator correctly accepts
 * content within the valid range (10-100,000 characters) and rejects content
 * outside this range with appropriate error messages.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
 *
 * - Requirement 8.1: WHEN content is shorter than 10 characters THEN the store_memory
 *   tool SHALL reject with a minimum length error
 * - Requirement 8.2: WHEN content exceeds 100,000 characters THEN the store_memory
 *   tool SHALL reject with a maximum length error
 * - Requirement 8.3: WHEN content length is invalid THEN the error message SHALL
 *   specify the allowed range
 * - Requirement 8.4: WHEN content is at boundary values (10 or 100,000 characters)
 *   THEN the store_memory tool SHALL accept the content
 *
 * @module __tests__/property/memory/content-length-validation.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { ContentValidator } from "../../../memory/content-validator";

describe("Property 9: Content Length Validation", () => {
  let validator: ContentValidator;

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 100_000;

  beforeEach(() => {
    validator = new ContentValidator();
  });

  /**
   * Arbitrary for generating content strings of a specific length.
   */
  const contentOfLength = (length: number): fc.Arbitrary<string> =>
    fc.string({ minLength: length, maxLength: length });

  /**
   * Arbitrary for generating valid content (within bounds).
   * Uses a reasonable max for performance while still testing the property.
   */
  const validContentArb = fc.string({ minLength: MIN_LENGTH, maxLength: 1000 });

  /**
   * Arbitrary for generating content that is too short (< 10 characters).
   */
  const tooShortContentArb = fc.string({ minLength: 0, maxLength: MIN_LENGTH - 1 });

  /**
   * Arbitrary for generating content that is too long (> 100,000 characters).
   * We use a smaller range for performance but still test the property.
   */
  const tooLongContentArb = fc
    .integer({ min: MAX_LENGTH + 1, max: MAX_LENGTH + 1000 })
    .chain((length) => fc.string({ minLength: length, maxLength: length }));

  /**
   * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
   * **Validates: Requirements 8.1, 8.3**
   *
   * For any content shorter than 10 characters, validation SHALL fail
   * with CONTENT_TOO_SHORT error and include the allowed range.
   */
  describe("Minimum length rejection", () => {
    it("should reject content shorter than minimum length", () => {
      fc.assert(
        fc.property(tooShortContentArb, (content) => {
          const result = validator.validate(content);

          // Property: Content below minimum SHALL be rejected
          expect(result.valid).toBe(false);

          // Property: Error code SHALL be CONTENT_TOO_SHORT
          expect(result.error?.code).toBe("CONTENT_TOO_SHORT");

          // Property: Error SHALL include actual length
          expect(result.error?.details.actualLength).toBe(content.length);

          // Property: Error SHALL include allowed range (Requirement 8.3)
          expect(result.error?.details.allowedRange).toBe(`${MIN_LENGTH}-${MAX_LENGTH} characters`);

          // Property: Error message SHALL specify allowed range (Requirement 8.3)
          expect(result.error?.message).toContain("Allowed range:");

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
   * **Validates: Requirements 8.2, 8.3**
   *
   * For any content exceeding 100,000 characters, validation SHALL fail
   * with CONTENT_TOO_LONG error and include the allowed range.
   */
  describe("Maximum length rejection", () => {
    it("should reject content exceeding maximum length", () => {
      fc.assert(
        fc.property(tooLongContentArb, (content) => {
          const result = validator.validate(content);

          // Property: Content above maximum SHALL be rejected
          expect(result.valid).toBe(false);

          // Property: Error code SHALL be CONTENT_TOO_LONG
          expect(result.error?.code).toBe("CONTENT_TOO_LONG");

          // Property: Error SHALL include actual length
          expect(result.error?.details.actualLength).toBe(content.length);

          // Property: Error SHALL include allowed range (Requirement 8.3)
          expect(result.error?.details.allowedRange).toBe(`${MIN_LENGTH}-${MAX_LENGTH} characters`);

          // Property: Error message SHALL specify allowed range (Requirement 8.3)
          expect(result.error?.message).toContain("Allowed range:");

          return true;
        }),
        { numRuns: 50 } // Fewer runs due to large string generation
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
   * **Validates: Requirements 8.4**
   *
   * For any content within the valid range (10-100,000), validation SHALL pass.
   */
  describe("Valid content acceptance", () => {
    it("should accept content within valid range", () => {
      fc.assert(
        fc.property(validContentArb, (content) => {
          const result = validator.validate(content);

          // Property: Content within range SHALL be accepted
          expect(result.valid).toBe(true);

          // Property: No error SHALL be present for valid content
          expect(result.error).toBeUndefined();

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
   * **Validates: Requirements 8.4**
   *
   * Boundary values (exactly 10 and exactly 100,000 characters) SHALL be accepted.
   */
  describe("Boundary value acceptance", () => {
    it("should accept content at minimum boundary (10 characters)", () => {
      fc.assert(
        fc.property(contentOfLength(MIN_LENGTH), (content) => {
          const result = validator.validate(content);

          // Property: Content at minimum boundary SHALL be accepted
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should accept content at maximum boundary (100,000 characters)", () => {
      // Generate a single test case for max boundary due to performance
      const maxContent = "a".repeat(MAX_LENGTH);
      const result = validator.validate(maxContent);

      // Property: Content at maximum boundary SHALL be accepted
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject content just below minimum boundary", () => {
      fc.assert(
        fc.property(contentOfLength(MIN_LENGTH - 1), (content) => {
          const result = validator.validate(content);

          // Property: Content just below minimum SHALL be rejected
          expect(result.valid).toBe(false);
          expect(result.error?.code).toBe("CONTENT_TOO_SHORT");

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should reject content just above maximum boundary", () => {
      // Generate a single test case for max+1 boundary due to performance
      const overMaxContent = "a".repeat(MAX_LENGTH + 1);
      const result = validator.validate(overMaxContent);

      // Property: Content just above maximum SHALL be rejected
      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("CONTENT_TOO_LONG");
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   *
   * Invariant: For any content length L:
   * - If L < 10: reject with CONTENT_TOO_SHORT
   * - If L > 100,000: reject with CONTENT_TOO_LONG
   * - If 10 <= L <= 100,000: accept
   */
  describe("Length-based validation invariant", () => {
    it("should correctly classify content based on length", () => {
      // Test with various lengths across the spectrum
      const lengthArb = fc.integer({ min: 0, max: 200 });

      fc.assert(
        fc.property(lengthArb, (length) => {
          const content = "x".repeat(length);
          const result = validator.validate(content);

          if (length < MIN_LENGTH) {
            // Property: Below minimum SHALL be rejected with CONTENT_TOO_SHORT
            expect(result.valid).toBe(false);
            expect(result.error?.code).toBe("CONTENT_TOO_SHORT");
          } else {
            // Property: At or above minimum (and below max) SHALL be accepted
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
   * **Validates: Requirements 8.3**
   *
   * Error details SHALL always include correct min/max length values.
   */
  describe("Error details completeness", () => {
    it("should include correct min/max in error details", () => {
      fc.assert(
        fc.property(tooShortContentArb, (content) => {
          const result = validator.validate(content);

          // Property: Error details SHALL include correct minLength
          expect(result.error?.details.minLength).toBe(MIN_LENGTH);

          // Property: Error details SHALL include correct maxLength
          expect(result.error?.details.maxLength).toBe(MAX_LENGTH);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 9: Content Length Validation**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4**
   *
   * Validation result SHALL be deterministic - same input always produces same output.
   */
  describe("Deterministic validation", () => {
    it("should produce consistent results for same input", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 100 }), (content) => {
          const result1 = validator.validate(content);
          const result2 = validator.validate(content);

          // Property: Same input SHALL produce same valid status
          expect(result1.valid).toBe(result2.valid);

          // Property: Same input SHALL produce same error code (if any)
          expect(result1.error?.code).toBe(result2.error?.code);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
