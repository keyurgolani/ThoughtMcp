/**
 * Input Validator Tests
 *
 * Tests for input validation and sanitization functionality.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { InputValidator, createInputValidator } from "../../../security/input-validator.js";

describe("InputValidator", () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe("validate()", () => {
    it("should validate a simple string", () => {
      const result = validator.validate("Hello, World!");
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("Hello, World!");
      expect(result.errors).toHaveLength(0);
    });

    it("should reject null input", () => {
      const result = validator.validate(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Input cannot be null or undefined");
    });

    it("should reject undefined input", () => {
      const result = validator.validate(undefined);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Input cannot be null or undefined");
    });

    it("should reject non-string input", () => {
      const result = validator.validate(123);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Input must be a string, got number");
    });

    it("should strip null bytes", () => {
      const result = validator.validate("Hello\x00World");
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("HelloWorld");
      expect(result.warnings).toContain("Null bytes were removed from input");
    });

    it("should remove control characters", () => {
      const result = validator.validate("Hello\x01\x02World");
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("HelloWorld");
      expect(result.warnings).toContain("Control characters were removed from input");
    });

    it("should trim whitespace by default", () => {
      const result = validator.validate("  Hello World  ");
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("Hello World");
    });

    it("should enforce maximum length", () => {
      const longString = "a".repeat(200000);
      const result = validator.validate(longString);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(true);
      expect(result.sanitized.length).toBe(100000);
    });

    it("should strip HTML tags by default", () => {
      const result = validator.validate("Hello <b>World</b>");
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("Hello World");
      expect(result.warnings).toContain("HTML tags were removed from input");
    });

    it("should strip script tags", () => {
      const result = validator.validate('Hello <script>alert("xss")</script>World');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("Hello World");
      expect(result.warnings).toContain("Script tags were removed from input");
    });

    it("should detect path traversal patterns", () => {
      const result = validator.validate("../../../etc/passwd");
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain("Potential path traversal pattern detected");
    });

    it("should normalize unicode", () => {
      // é can be represented as single char or e + combining accent
      const composed = "\u00e9"; // é as single character
      const decomposed = "e\u0301"; // e + combining acute accent

      const result1 = validator.validate(composed);
      const result2 = validator.validate(decomposed);

      expect(result1.sanitized).toBe(result2.sanitized);
    });
  });

  describe("validateMemoryContent()", () => {
    it("should validate non-empty content", () => {
      const result = validator.validateMemoryContent("This is a memory");
      expect(result.valid).toBe(true);
    });

    it("should reject empty content", () => {
      const result = validator.validateMemoryContent("");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Memory content cannot be empty");
    });

    it("should reject whitespace-only content", () => {
      const result = validator.validateMemoryContent("   ");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Memory content cannot be empty");
    });
  });

  describe("validateUserId()", () => {
    it("should validate a valid user ID", () => {
      const result = validator.validateUserId("user123");
      expect(result.valid).toBe(true);
    });

    it("should validate user ID with dashes and underscores", () => {
      const result = validator.validateUserId("user-123_abc");
      expect(result.valid).toBe(true);
    });

    it("should reject empty user ID", () => {
      const result = validator.validateUserId("");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("User ID cannot be empty");
    });

    it("should reject user ID with special characters", () => {
      const result = validator.validateUserId("user@123");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "User ID can only contain alphanumeric characters, dashes, and underscores"
      );
    });

    it("should reject user ID exceeding max length", () => {
      const result = validator.validateUserId("a".repeat(300));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("User ID cannot exceed 255 characters");
    });
  });

  describe("validateSessionId()", () => {
    it("should validate a valid session ID", () => {
      const result = validator.validateSessionId("session-abc-123");
      expect(result.valid).toBe(true);
    });

    it("should reject empty session ID", () => {
      const result = validator.validateSessionId("");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Session ID cannot be empty");
    });

    it("should reject session ID exceeding max length", () => {
      const result = validator.validateSessionId("a".repeat(300));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Session ID cannot exceed 255 characters");
    });
  });

  describe("validateSearchQuery()", () => {
    it("should validate a simple search query", () => {
      const result = validator.validateSearchQuery("find memories about coding");
      expect(result.valid).toBe(true);
    });

    it("should warn about SQL injection patterns", () => {
      const result = validator.validateSearchQuery("SELECT * FROM memories");
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("SQL injection"))).toBe(true);
    });
  });

  describe("validateNumber()", () => {
    it("should validate a valid number", () => {
      const result = validator.validateNumber(42);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(42);
    });

    it("should validate a string number", () => {
      const result = validator.validateNumber("42.5");
      expect(result.valid).toBe(true);
      expect(result.value).toBe(42.5);
    });

    it("should reject NaN", () => {
      const result = validator.validateNumber("not a number");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Input must be a valid number");
    });

    it("should reject Infinity", () => {
      const result = validator.validateNumber(Infinity);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Input must be a finite number");
    });

    it("should enforce minimum value", () => {
      const result = validator.validateNumber(5, { min: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Input must be at least 10");
    });

    it("should enforce maximum value", () => {
      const result = validator.validateNumber(15, { max: 10 });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Input must be at most 10");
    });

    it("should enforce integer constraint", () => {
      const result = validator.validateNumber(5.5, { integer: true });
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Input must be an integer");
    });
  });

  describe("validateStringArray()", () => {
    it("should validate a valid string array", () => {
      const result = validator.validateStringArray(["a", "b", "c"]);
      expect(result.valid).toBe(true);
      expect(result.sanitized).toEqual(["a", "b", "c"]);
    });

    it("should reject non-array input", () => {
      const result = validator.validateStringArray("not an array");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Input must be an array");
    });

    it("should reject array with non-string items", () => {
      const result = validator.validateStringArray(["a", 123, "c"]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("must be a string"))).toBe(true);
    });

    it("should enforce max items", () => {
      const result = validator.validateStringArray(["a", "b", "c"], { maxItems: 2 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds maximum"))).toBe(true);
    });

    it("should enforce max item length", () => {
      const result = validator.validateStringArray(["short", "verylongstring"], {
        maxItemLength: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exceeds maximum length"))).toBe(true);
    });
  });

  describe("static methods", () => {
    it("should escape HTML entities", () => {
      const escaped = InputValidator.escapeHtml('<script>alert("xss")</script>');
      expect(escaped).toBe("&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;");
    });

    it("should escape SQL LIKE wildcards", () => {
      const escaped = InputValidator.escapeSqlLike("100% match_test");
      expect(escaped).toBe("100\\% match\\_test");
    });
  });

  describe("createInputValidator()", () => {
    it("should create a validator with custom options", () => {
      const customValidator = createInputValidator({ maxLength: 100 });
      const result = customValidator.validate("a".repeat(150));
      expect(result.valid).toBe(false);
    });

    it("should allow HTML when configured", () => {
      const customValidator = createInputValidator({ allowHtml: true });
      const result = customValidator.validate("<b>Bold</b>");
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe("<b>Bold</b>");
    });
  });
});
