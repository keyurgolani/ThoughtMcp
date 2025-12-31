/**
 * SuggestionGenerator Unit Tests
 *
 * Tests for suggestion generation functionality including:
 * - Levenshtein distance calculation
 * - String similarity calculation
 * - Constraint-specific suggestion generation
 * - Enum value matching with 70% similarity threshold
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  createSuggestionGenerator,
  SuggestionGenerator,
  SuggestionInput,
} from "../../../validation/suggestion-generator.js";

describe("SuggestionGenerator", () => {
  let generator: SuggestionGenerator;

  beforeEach(() => {
    generator = new SuggestionGenerator();
  });

  describe("levenshteinDistance()", () => {
    it("should return 0 for identical strings", () => {
      expect(generator.levenshteinDistance("hello", "hello")).toBe(0);
      expect(generator.levenshteinDistance("", "")).toBe(0);
    });

    it("should return length of other string when one is empty", () => {
      expect(generator.levenshteinDistance("", "hello")).toBe(5);
      expect(generator.levenshteinDistance("hello", "")).toBe(5);
    });

    it("should calculate correct distance for single character changes", () => {
      expect(generator.levenshteinDistance("cat", "bat")).toBe(1); // substitution
      expect(generator.levenshteinDistance("cat", "cats")).toBe(1); // insertion
      expect(generator.levenshteinDistance("cats", "cat")).toBe(1); // deletion
    });

    it("should calculate correct distance for multiple changes", () => {
      expect(generator.levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(generator.levenshteinDistance("saturday", "sunday")).toBe(3);
    });

    it("should handle case sensitivity", () => {
      expect(generator.levenshteinDistance("Hello", "hello")).toBe(1);
      expect(generator.levenshteinDistance("HELLO", "hello")).toBe(5);
    });
  });

  describe("calculateSimilarity()", () => {
    it("should return 1 for identical strings", () => {
      expect(generator.calculateSimilarity("hello", "hello")).toBe(1);
    });

    it("should return 0 when one string is empty", () => {
      expect(generator.calculateSimilarity("", "hello")).toBe(0);
      expect(generator.calculateSimilarity("hello", "")).toBe(0);
    });

    it("should return high similarity for similar strings", () => {
      const similarity = generator.calculateSimilarity("episodic", "episodec");
      expect(similarity).toBeGreaterThan(0.8);
    });

    it("should return low similarity for different strings", () => {
      const similarity = generator.calculateSimilarity("hello", "world");
      expect(similarity).toBeLessThan(0.5);
    });

    it("should be case-sensitive", () => {
      const similarity = generator.calculateSimilarity("Hello", "hello");
      expect(similarity).toBeLessThan(1);
    });
  });

  describe("findClosestEnumValue()", () => {
    const validValues = ["episodic", "semantic", "procedural", "emotional", "reflective"];

    it("should find exact match", () => {
      expect(generator.findClosestEnumValue("episodic", validValues)).toBe("episodic");
    });

    it("should find close match above threshold", () => {
      // "episodec" is very similar to "episodic" (1 character difference)
      expect(generator.findClosestEnumValue("episodec", validValues)).toBe("episodic");
    });

    it("should find match with case differences", () => {
      // Case-insensitive matching
      expect(generator.findClosestEnumValue("EPISODIC", validValues)).toBe("episodic");
      expect(generator.findClosestEnumValue("Semantic", validValues)).toBe("semantic");
    });

    it("should return undefined for values below threshold", () => {
      // "xyz" is very different from all valid values
      expect(generator.findClosestEnumValue("xyz", validValues)).toBeUndefined();
    });

    it("should return undefined for empty value", () => {
      expect(generator.findClosestEnumValue("", validValues)).toBeUndefined();
    });

    it("should return undefined for empty valid values array", () => {
      expect(generator.findClosestEnumValue("test", [])).toBeUndefined();
    });

    it("should respect custom threshold", () => {
      // With high threshold, only very close matches should work
      expect(generator.findClosestEnumValue("episodec", validValues, 0.95)).toBeUndefined();
      // With low threshold, more matches should work
      expect(generator.findClosestEnumValue("episo", validValues, 0.5)).toBe("episodic");
    });

    it("should find best match among multiple similar values", () => {
      const values = ["test", "testing", "tested", "tester"];
      expect(generator.findClosestEnumValue("tests", values)).toBe("test");
    });
  });

  describe("generate()", () => {
    describe("required constraint", () => {
      it("should generate suggestion for required field", () => {
        const error: SuggestionInput = {
          code: "FIELD_REQUIRED",
          message: "Field is required",
          path: "username",
          constraint: "required",
          actualValue: undefined,
          expected: { type: "required" },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("username");
        expect(suggestion).toContain("required");
      });

      it("should extract field name from nested path", () => {
        const error: SuggestionInput = {
          code: "FIELD_REQUIRED",
          message: "Field is required",
          path: "user.profile.email",
          constraint: "required",
          actualValue: undefined,
          expected: { type: "required" },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("email");
      });

      it("should handle array paths", () => {
        const error: SuggestionInput = {
          code: "FIELD_REQUIRED",
          message: "Field is required",
          path: "items[0].name",
          constraint: "required",
          actualValue: undefined,
          expected: { type: "required" },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("name");
      });
    });

    describe("minLength constraint", () => {
      it("should generate suggestion with character count needed", () => {
        const error: SuggestionInput = {
          code: "STRING_TOO_SHORT",
          message: "String too short",
          path: "password",
          constraint: "minLength",
          actualValue: "abc",
          expected: { type: "minLength", minLength: 8 },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("8");
        expect(suggestion).toContain("5"); // 8 - 3 = 5 more needed
      });

      it("should handle singular character", () => {
        const error: SuggestionInput = {
          code: "STRING_TOO_SHORT",
          message: "String too short",
          path: "code",
          constraint: "minLength",
          actualValue: "ab",
          expected: { type: "minLength", minLength: 3 },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("1 more character.");
      });
    });

    describe("maxLength constraint", () => {
      it("should generate suggestion with excess character count", () => {
        const error: SuggestionInput = {
          code: "STRING_TOO_LONG",
          message: "String too long",
          path: "title",
          constraint: "maxLength",
          actualValue: "a".repeat(150),
          expected: { type: "maxLength", maxLength: 100 },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("100");
        expect(suggestion).toContain("50"); // 150 - 100 = 50 excess
      });
    });

    describe("minValue constraint", () => {
      it("should generate suggestion with value difference", () => {
        const error: SuggestionInput = {
          code: "NUMBER_TOO_SMALL",
          message: "Number too small",
          path: "age",
          constraint: "minValue",
          actualValue: 15,
          expected: { type: "minValue", minValue: 18 },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("18");
        expect(suggestion).toContain("15");
        expect(suggestion).toContain("3"); // 18 - 15 = 3 below
      });
    });

    describe("maxValue constraint", () => {
      it("should generate suggestion with excess amount", () => {
        const error: SuggestionInput = {
          code: "NUMBER_TOO_LARGE",
          message: "Number too large",
          path: "quantity",
          constraint: "maxValue",
          actualValue: 150,
          expected: { type: "maxValue", maxValue: 100 },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("100");
        expect(suggestion).toContain("150");
        expect(suggestion).toContain("50"); // 150 - 100 = 50 above
      });
    });

    describe("range constraint", () => {
      it("should generate suggestion with valid range", () => {
        const error: SuggestionInput = {
          code: "NUMBER_TOO_SMALL",
          message: "Number out of range",
          path: "score",
          constraint: "minValue",
          actualValue: -5,
          expected: { type: "range", minValue: 0, maxValue: 100 },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("0");
        expect(suggestion).toContain("100");
      });
    });

    describe("pattern constraint", () => {
      it("should generate suggestion with pattern and example", () => {
        const error: SuggestionInput = {
          code: "PATTERN_MISMATCH",
          message: "Pattern mismatch",
          path: "email",
          constraint: "pattern",
          actualValue: "invalid",
          expected: {
            type: "pattern",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
            example: "user@example.com",
          },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("pattern");
        expect(suggestion).toContain("user@example.com");
      });
    });

    describe("type constraint", () => {
      it("should generate suggestion with expected and actual types", () => {
        const error: SuggestionInput = {
          code: "TYPE_MISMATCH",
          message: "Type mismatch",
          path: "count",
          constraint: "type",
          actualValue: "not a number",
          expected: { type: "type", expectedType: "number", actualType: "string" },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("number");
        expect(suggestion).toContain("string");
      });
    });

    describe("enum constraint", () => {
      it("should generate suggestion with valid values", () => {
        const error: SuggestionInput = {
          code: "INVALID_ENUM_VALUE",
          message: "Invalid enum value",
          path: "status",
          constraint: "enum",
          actualValue: "invalid",
          expected: {
            type: "enum",
            validValues: ["active", "inactive", "pending"],
          },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("active");
        expect(suggestion).toContain("inactive");
        expect(suggestion).toContain("pending");
      });

      it("should suggest closest match when available", () => {
        const error: SuggestionInput = {
          code: "INVALID_ENUM_VALUE",
          message: "Invalid enum value",
          path: "sector",
          constraint: "enum",
          actualValue: "episodec", // typo
          expected: {
            type: "enum",
            validValues: ["episodic", "semantic", "procedural"],
          },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("episodic");
        expect(suggestion).toContain("Did you mean");
      });

      it("should use provided closestMatch", () => {
        const error: SuggestionInput = {
          code: "INVALID_ENUM_VALUE",
          message: "Invalid enum value",
          path: "sector",
          constraint: "enum",
          actualValue: "xyz",
          expected: {
            type: "enum",
            validValues: ["episodic", "semantic", "procedural"],
            closestMatch: "episodic",
          },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("episodic");
        expect(suggestion).toContain("Did you mean");
      });

      it("should truncate long enum lists", () => {
        const error: SuggestionInput = {
          code: "INVALID_ENUM_VALUE",
          message: "Invalid enum value",
          path: "country",
          constraint: "enum",
          actualValue: "invalid",
          expected: {
            type: "enum",
            validValues: ["US", "UK", "CA", "AU", "DE", "FR", "JP", "CN"],
          },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("more");
      });
    });

    describe("format constraint", () => {
      it("should generate suggestion with format and example", () => {
        const error: SuggestionInput = {
          code: "INVALID_FORMAT",
          message: "Invalid format",
          path: "date",
          constraint: "format",
          actualValue: "not-a-date",
          expected: {
            type: "format",
            format: "ISO 8601 date",
            example: "2024-01-15T10:30:00Z",
          },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toContain("ISO 8601 date");
        expect(suggestion).toContain("2024-01-15T10:30:00Z");
      });
    });

    describe("custom constraint", () => {
      it("should return custom description as suggestion", () => {
        const error: SuggestionInput = {
          code: "CUSTOM_VALIDATION_FAILED",
          message: "Custom validation failed",
          path: "data",
          constraint: "custom",
          actualValue: "invalid",
          expected: {
            type: "custom",
            description: "Value must be a valid JSON object with 'id' and 'name' fields.",
          },
        };

        const suggestion = generator.generate(error);
        expect(suggestion).toBe("Value must be a valid JSON object with 'id' and 'name' fields.");
      });
    });
  });

  describe("createSuggestionGenerator()", () => {
    it("should create generator with default threshold", () => {
      const customGenerator = createSuggestionGenerator();
      const validValues = ["episodic", "semantic"];
      // "episodec" should match with default 0.7 threshold
      expect(customGenerator.findClosestEnumValue("episodec", validValues)).toBe("episodic");
    });

    it("should create generator with custom threshold", () => {
      const strictGenerator = createSuggestionGenerator(0.95);
      const validValues = ["episodic", "semantic"];
      // "episodec" should NOT match with 0.95 threshold
      expect(strictGenerator.findClosestEnumValue("episodec", validValues)).toBeUndefined();
    });
  });
});
