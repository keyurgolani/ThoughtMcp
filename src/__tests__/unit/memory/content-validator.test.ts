/**
 * Content Validator - Unit Tests
 *
 * Tests for ContentValidator class following TDD principles.
 * These tests validate specific examples and edge cases for content length validation.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { beforeEach, describe, expect, it } from "vitest";

import { ContentValidator, createContentValidator } from "../../../memory/content-validator";

describe("ContentValidator - Unit Tests", () => {
  let validator: ContentValidator;

  const MIN_LENGTH = 10;
  const MAX_LENGTH = 100_000;

  beforeEach(() => {
    validator = new ContentValidator();
  });

  describe("Minimum length rejection (Requirement 8.1)", () => {
    it("should reject empty content", () => {
      const result = validator.validate("");

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("CONTENT_TOO_SHORT");
      expect(result.error?.details.actualLength).toBe(0);
    });

    it("should reject single character content", () => {
      const result = validator.validate("a");

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("CONTENT_TOO_SHORT");
      expect(result.error?.details.actualLength).toBe(1);
    });

    it("should reject content with 9 characters", () => {
      const result = validator.validate("123456789");

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("CONTENT_TOO_SHORT");
      expect(result.error?.details.actualLength).toBe(9);
    });

    it("should reject whitespace-only content below minimum", () => {
      const result = validator.validate("   ");

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("CONTENT_TOO_SHORT");
      expect(result.error?.details.actualLength).toBe(3);
    });
  });

  describe("Maximum length rejection (Requirement 8.2)", () => {
    it("should reject content exceeding 100,000 characters", () => {
      const content = "a".repeat(100_001);
      const result = validator.validate(content);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("CONTENT_TOO_LONG");
      expect(result.error?.details.actualLength).toBe(100_001);
    });

    it("should reject content significantly exceeding maximum", () => {
      const content = "x".repeat(150_000);
      const result = validator.validate(content);

      expect(result.valid).toBe(false);
      expect(result.error?.code).toBe("CONTENT_TOO_LONG");
      expect(result.error?.details.actualLength).toBe(150_000);
    });
  });

  describe("Boundary values acceptance (Requirement 8.4)", () => {
    it("should accept content with exactly 10 characters", () => {
      const result = validator.validate("1234567890");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept content with exactly 100,000 characters", () => {
      const content = "a".repeat(100_000);
      const result = validator.validate(content);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept content with 11 characters (just above minimum)", () => {
      const result = validator.validate("12345678901");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept content with 99,999 characters (just below maximum)", () => {
      const content = "b".repeat(99_999);
      const result = validator.validate(content);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Error message with allowed range (Requirement 8.3)", () => {
    it("should include allowed range in error message for too short content", () => {
      const result = validator.validate("short");

      expect(result.error?.message).toContain("Allowed range:");
      expect(result.error?.message).toContain(`${MIN_LENGTH}-${MAX_LENGTH} characters`);
    });

    it("should include allowed range in error message for too long content", () => {
      const content = "x".repeat(100_001);
      const result = validator.validate(content);

      expect(result.error?.message).toContain("Allowed range:");
      expect(result.error?.message).toContain(`${MIN_LENGTH}-${MAX_LENGTH} characters`);
    });

    it("should include actual length in error details", () => {
      const result = validator.validate("abc");

      expect(result.error?.details.actualLength).toBe(3);
      expect(result.error?.details.minLength).toBe(MIN_LENGTH);
      expect(result.error?.details.maxLength).toBe(MAX_LENGTH);
      expect(result.error?.details.allowedRange).toBe(`${MIN_LENGTH}-${MAX_LENGTH} characters`);
    });
  });

  describe("Valid content acceptance", () => {
    it("should accept typical memory content", () => {
      const result = validator.validate("This is a typical memory content that should be valid.");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept content with special characters", () => {
      const result = validator.validate("Content with émojis 🎉 and spëcial çharacters!");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept content with newlines", () => {
      const result = validator.validate("Line 1\nLine 2\nLine 3");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept content with unicode characters", () => {
      const result = validator.validate("日本語テキスト with mixed content");

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Accessor methods", () => {
    it("should return correct minimum length", () => {
      expect(validator.getMinLength()).toBe(MIN_LENGTH);
    });

    it("should return correct maximum length", () => {
      expect(validator.getMaxLength()).toBe(MAX_LENGTH);
    });

    it("should return formatted allowed range", () => {
      expect(validator.getAllowedRange()).toBe(`${MIN_LENGTH}-${MAX_LENGTH} characters`);
    });
  });

  describe("Custom configuration", () => {
    it("should accept custom minimum length", () => {
      const customValidator = new ContentValidator({ minLength: 5 });

      expect(customValidator.getMinLength()).toBe(5);
      expect(customValidator.validate("12345").valid).toBe(true);
      expect(customValidator.validate("1234").valid).toBe(false);
    });

    it("should accept custom maximum length", () => {
      const customValidator = new ContentValidator({ maxLength: 50 });

      expect(customValidator.getMaxLength()).toBe(50);
      expect(customValidator.validate("a".repeat(50)).valid).toBe(true);
      expect(customValidator.validate("a".repeat(51)).valid).toBe(false);
    });

    it("should accept both custom min and max length", () => {
      const customValidator = new ContentValidator({ minLength: 5, maxLength: 20 });

      expect(customValidator.getMinLength()).toBe(5);
      expect(customValidator.getMaxLength()).toBe(20);
      expect(customValidator.getAllowedRange()).toBe("5-20 characters");
    });
  });

  describe("Factory function", () => {
    it("should create validator with default options", () => {
      const factoryValidator = createContentValidator();

      expect(factoryValidator.getMinLength()).toBe(MIN_LENGTH);
      expect(factoryValidator.getMaxLength()).toBe(MAX_LENGTH);
    });

    it("should create validator with custom options", () => {
      const factoryValidator = createContentValidator({ minLength: 15, maxLength: 500 });

      expect(factoryValidator.getMinLength()).toBe(15);
      expect(factoryValidator.getMaxLength()).toBe(500);
    });
  });
});
