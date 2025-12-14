/**
 * Property Test: Content Truncation Behavior
 *
 * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
 *
 * This property test validates that the truncateContent function correctly
 * truncates content exceeding maxLength while preserving at least minPreserved
 * characters and appending the "[truncated]" indicator.
 *
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * - Requirement 4.1: WHEN memory content exceeds display limits THEN the Memory
 *   Repository SHALL append "[truncated]" indicator to the content
 * - Requirement 4.2: WHEN memory content is fully displayed THEN the Memory
 *   Repository SHALL display the complete content without truncation indicators
 * - Requirement 4.3: WHEN truncation occurs THEN the Memory Repository SHALL
 *   preserve at least 200 characters of meaningful content before truncating
 *
 * @module __tests__/property/memory/content-truncation.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { truncateContent } from "../../../memory/content-validator";

describe("Property 8: Content truncation behavior", () => {
  const DEFAULT_MAX_LENGTH = 500;
  const DEFAULT_MIN_PRESERVED = 200;
  const TRUNCATION_INDICATOR = "[truncated]";

  /**
   * Arbitrary for generating content within display limits.
   */
  const contentWithinLimitsArb = fc.string({ minLength: 0, maxLength: DEFAULT_MAX_LENGTH });

  /**
   * Arbitrary for generating content exceeding display limits.
   */
  const contentExceedingLimitsArb = fc
    .integer({ min: DEFAULT_MAX_LENGTH + 1, max: DEFAULT_MAX_LENGTH + 1000 })
    .chain((length) => fc.string({ minLength: length, maxLength: length }));

  /**
   * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
   * **Validates: Requirements 4.2**
   *
   * For any content within maxLength, the content SHALL be returned as-is
   * without truncation indicator.
   */
  describe("Content within limits", () => {
    it("should return complete content without truncation indicator", () => {
      fc.assert(
        fc.property(contentWithinLimitsArb, (content) => {
          const result = truncateContent(content);

          // Property: Content within limits SHALL NOT be truncated
          expect(result.isTruncated).toBe(false);

          // Property: Content SHALL be returned as-is
          expect(result.content).toBe(content);

          // Property: Original length SHALL be recorded
          expect(result.originalLength).toBe(content.length);

          // Property: Content SHALL NOT contain truncation indicator
          expect(result.content).not.toContain(TRUNCATION_INDICATOR);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
   * **Validates: Requirements 4.1**
   *
   * For any content exceeding maxLength, the content SHALL be truncated
   * and "[truncated]" indicator SHALL be appended.
   */
  describe("Content exceeding limits", () => {
    it("should truncate and append indicator", () => {
      fc.assert(
        fc.property(contentExceedingLimitsArb, (content) => {
          const result = truncateContent(content);

          // Property: Content exceeding limits SHALL be truncated
          expect(result.isTruncated).toBe(true);

          // Property: Truncated content SHALL end with indicator (Requirement 4.1)
          expect(result.content).toMatch(/\[truncated\]$/);

          // Property: Original length SHALL be recorded
          expect(result.originalLength).toBe(content.length);

          // Property: Truncated content SHALL be shorter than original
          expect(result.content.length).toBeLessThan(content.length);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
   * **Validates: Requirements 4.3**
   *
   * When truncation occurs, at least minPreserved (200) characters of
   * meaningful content SHALL be preserved before the truncation indicator.
   */
  describe("Minimum preserved content", () => {
    it("should preserve at least minPreserved characters", () => {
      fc.assert(
        fc.property(contentExceedingLimitsArb, (content) => {
          const result = truncateContent(content);

          // Property: When truncated, preserved content SHALL be >= minPreserved
          if (result.isTruncated) {
            const preservedContent = result.content.replace(TRUNCATION_INDICATOR, "");
            expect(preservedContent.length).toBeGreaterThanOrEqual(DEFAULT_MIN_PRESERVED);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve minPreserved even with custom maxLength smaller than minPreserved", () => {
      // Test edge case: maxLength < minPreserved
      const smallMaxLength = 100;
      const content = "x".repeat(300);

      const result = truncateContent(content, smallMaxLength, DEFAULT_MIN_PRESERVED);

      // Property: minPreserved SHALL take precedence over maxLength
      if (result.isTruncated) {
        const preservedContent = result.content.replace(TRUNCATION_INDICATOR, "");
        expect(preservedContent.length).toBeGreaterThanOrEqual(DEFAULT_MIN_PRESERVED);
      }
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * Boundary value testing: content at exactly maxLength should not be truncated.
   */
  describe("Boundary values", () => {
    it("should not truncate content at exactly maxLength", () => {
      const content = "x".repeat(DEFAULT_MAX_LENGTH);
      const result = truncateContent(content);

      // Property: Content at exactly maxLength SHALL NOT be truncated
      expect(result.isTruncated).toBe(false);
      expect(result.content).toBe(content);
      expect(result.content).not.toContain(TRUNCATION_INDICATOR);
    });

    it("should truncate content at maxLength + 1", () => {
      const content = "x".repeat(DEFAULT_MAX_LENGTH + 1);
      const result = truncateContent(content);

      // Property: Content at maxLength + 1 SHALL be truncated
      expect(result.isTruncated).toBe(true);
      expect(result.content).toContain(TRUNCATION_INDICATOR);
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * Custom parameters should be respected.
   */
  describe("Custom parameters", () => {
    it("should respect custom maxLength", () => {
      const customMaxLength = 100;

      fc.assert(
        fc.property(
          fc
            .integer({ min: customMaxLength + 1, max: customMaxLength + 500 })
            .chain((length) => fc.string({ minLength: length, maxLength: length })),
          (content) => {
            const result = truncateContent(content, customMaxLength);

            // Property: Content exceeding custom maxLength SHALL be truncated
            expect(result.isTruncated).toBe(true);
            expect(result.content).toContain(TRUNCATION_INDICATOR);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should respect custom minPreserved", () => {
      const customMinPreserved = 50;
      const customMaxLength = 100;
      const content = "x".repeat(200);

      const result = truncateContent(content, customMaxLength, customMinPreserved);

      // Property: Custom minPreserved SHALL be respected
      if (result.isTruncated) {
        const preservedContent = result.content.replace(TRUNCATION_INDICATOR, "");
        expect(preservedContent.length).toBeGreaterThanOrEqual(customMinPreserved);
      }
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * Invariant: truncation result SHALL be deterministic.
   */
  describe("Deterministic behavior", () => {
    it("should produce consistent results for same input", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (content) => {
          const result1 = truncateContent(content);
          const result2 = truncateContent(content);

          // Property: Same input SHALL produce same isTruncated status
          expect(result1.isTruncated).toBe(result2.isTruncated);

          // Property: Same input SHALL produce same content
          expect(result1.content).toBe(result2.content);

          // Property: Same input SHALL produce same originalLength
          expect(result1.originalLength).toBe(result2.originalLength);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 8: Content truncation behavior**
   * **Validates: Requirements 4.1, 4.2, 4.3**
   *
   * Invariant: For any content length L and maxLength M:
   * - If L <= M: return as-is without indicator
   * - If L > M: truncate and append indicator, preserving >= minPreserved
   */
  describe("Length-based truncation invariant", () => {
    it("should correctly classify content based on length", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 100, max: 600 }),
          (length, maxLength) => {
            const content = "x".repeat(length);
            const result = truncateContent(content, maxLength);

            if (length <= maxLength) {
              // Property: Content within limits SHALL NOT be truncated
              expect(result.isTruncated).toBe(false);
              expect(result.content).toBe(content);
              expect(result.content).not.toContain(TRUNCATION_INDICATOR);
            } else {
              // Property: Content exceeding limits SHALL be truncated
              expect(result.isTruncated).toBe(true);
              expect(result.content).toContain(TRUNCATION_INDICATOR);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
