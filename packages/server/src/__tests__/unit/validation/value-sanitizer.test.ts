/**
 * ValueSanitizer Unit Tests
 *
 * Tests for value sanitization functionality including:
 * - Sensitive data redaction (passwords, tokens, secrets, keys, auth fields)
 * - Value truncation with "[truncated]" indicator
 * - Type-safe sanitization preserving value type information
 *
 * Requirements: 6.2, 6.3
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createValueSanitizer, ValueSanitizer } from "../../../validation/value-sanitizer.js";

describe("ValueSanitizer", () => {
  let sanitizer: ValueSanitizer;

  beforeEach(() => {
    sanitizer = new ValueSanitizer();
  });

  describe("isSensitive()", () => {
    it("should detect password fields as sensitive", () => {
      expect(sanitizer.isSensitive("password")).toBe(true);
      expect(sanitizer.isSensitive("userPassword")).toBe(true);
      expect(sanitizer.isSensitive("PASSWORD")).toBe(true);
      expect(sanitizer.isSensitive("user.password")).toBe(true);
    });

    it("should detect token fields as sensitive", () => {
      expect(sanitizer.isSensitive("token")).toBe(true);
      expect(sanitizer.isSensitive("accessToken")).toBe(true);
      expect(sanitizer.isSensitive("refreshToken")).toBe(true);
      expect(sanitizer.isSensitive("auth.token")).toBe(true);
    });

    it("should detect secret fields as sensitive", () => {
      expect(sanitizer.isSensitive("secret")).toBe(true);
      expect(sanitizer.isSensitive("clientSecret")).toBe(true);
      expect(sanitizer.isSensitive("SECRET_KEY")).toBe(true);
    });

    it("should detect key fields as sensitive", () => {
      expect(sanitizer.isSensitive("apiKey")).toBe(true);
      expect(sanitizer.isSensitive("api_key")).toBe(true);
      expect(sanitizer.isSensitive("privateKey")).toBe(true);
      expect(sanitizer.isSensitive("key")).toBe(true);
    });

    it("should detect auth fields as sensitive", () => {
      expect(sanitizer.isSensitive("auth")).toBe(true);
      expect(sanitizer.isSensitive("authorization")).toBe(true);
      expect(sanitizer.isSensitive("authHeader")).toBe(true);
    });

    it("should detect credential fields as sensitive", () => {
      expect(sanitizer.isSensitive("credential")).toBe(true);
      expect(sanitizer.isSensitive("credentials")).toBe(true);
      expect(sanitizer.isSensitive("userCredentials")).toBe(true);
    });

    it("should detect private fields as sensitive", () => {
      expect(sanitizer.isSensitive("private")).toBe(true);
      expect(sanitizer.isSensitive("privateData")).toBe(true);
    });

    it("should not detect non-sensitive fields", () => {
      expect(sanitizer.isSensitive("username")).toBe(false);
      expect(sanitizer.isSensitive("email")).toBe(false);
      expect(sanitizer.isSensitive("name")).toBe(false);
      expect(sanitizer.isSensitive("keyboard")).toBe(false); // Contains "key" but not as word boundary
      expect(sanitizer.isSensitive("monkey")).toBe(false); // Contains "key" but not as word boundary
    });

    it("should handle nested paths", () => {
      expect(sanitizer.isSensitive("user.password")).toBe(true);
      expect(sanitizer.isSensitive("config.apiKey")).toBe(true);
      expect(sanitizer.isSensitive("auth.token.value")).toBe(true);
      expect(sanitizer.isSensitive("user.name")).toBe(false);
    });

    it("should handle array paths", () => {
      expect(sanitizer.isSensitive("tokens[0]")).toBe(true);
      expect(sanitizer.isSensitive("users[0].password")).toBe(true);
      expect(sanitizer.isSensitive("items[0].name")).toBe(false);
    });
  });

  describe("truncate()", () => {
    describe("string values", () => {
      it("should not truncate strings within limit", () => {
        const value = "short string";
        const result = sanitizer.truncate(value, 100);
        expect(result).toBe("short string");
      });

      it("should truncate strings exceeding limit", () => {
        const value = "a".repeat(150);
        const result = sanitizer.truncate(value, 100);
        expect(typeof result).toBe("string");
        expect((result as string).length).toBeLessThanOrEqual(100);
        expect((result as string).endsWith("[truncated]")).toBe(true);
      });

      it("should handle exact limit length", () => {
        const value = "a".repeat(100);
        const result = sanitizer.truncate(value, 100);
        expect(result).toBe(value);
      });

      it("should handle very small max length", () => {
        const value = "hello world";
        const result = sanitizer.truncate(value, 5);
        expect(result).toBe("[truncated]");
      });

      it("should handle empty strings", () => {
        const result = sanitizer.truncate("", 100);
        expect(result).toBe("");
      });
    });

    describe("primitive values", () => {
      it("should return numbers as-is", () => {
        expect(sanitizer.truncate(42, 10)).toBe(42);
        expect(sanitizer.truncate(3.14159, 10)).toBe(3.14159);
        expect(sanitizer.truncate(-100, 10)).toBe(-100);
      });

      it("should return booleans as-is", () => {
        expect(sanitizer.truncate(true, 10)).toBe(true);
        expect(sanitizer.truncate(false, 10)).toBe(false);
      });

      it("should return null as-is", () => {
        expect(sanitizer.truncate(null, 10)).toBe(null);
      });

      it("should return undefined as-is", () => {
        expect(sanitizer.truncate(undefined, 10)).toBe(undefined);
      });
    });

    describe("array values", () => {
      it("should handle empty arrays", () => {
        const result = sanitizer.truncate([], 100);
        expect(result).toBe("[]");
      });

      it("should show array items for small arrays", () => {
        const result = sanitizer.truncate([1, 2, 3], 100);
        expect(result).toBe("[1, 2, 3]");
      });

      it("should truncate large arrays with count indicator", () => {
        const value = Array.from({ length: 100 }, (_, i) => i);
        const result = sanitizer.truncate(value, 50);
        expect(typeof result).toBe("string");
        expect((result as string).includes("more")).toBe(true);
      });

      it("should handle arrays with string items", () => {
        const result = sanitizer.truncate(["a", "b", "c"], 100);
        expect(result).toContain('"a"');
        expect(result).toContain('"b"');
        expect(result).toContain('"c"');
      });
    });

    describe("object values", () => {
      it("should handle small objects", () => {
        const value = { a: 1, b: 2 };
        const result = sanitizer.truncate(value, 100);
        expect(result).toBe('{"a":1,"b":2}');
      });

      it("should truncate large objects", () => {
        const value = {
          longKey1: "a".repeat(50),
          longKey2: "b".repeat(50),
          longKey3: "c".repeat(50),
        };
        const result = sanitizer.truncate(value, 50);
        expect(typeof result).toBe("string");
        expect((result as string).endsWith("[truncated]")).toBe(true);
      });

      it("should handle nested objects", () => {
        const value = { outer: { inner: { deep: "value" } } };
        const result = sanitizer.truncate(value, 100);
        expect(result).toBe('{"outer":{"inner":{"deep":"value"}}}');
      });

      it("should handle objects with circular references gracefully", () => {
        const value: Record<string, unknown> = { a: 1 };
        value.self = value; // Create circular reference
        const result = sanitizer.truncate(value, 100);
        expect(typeof result).toBe("string");
        expect(result).toContain("object");
      });
    });

    describe("special values", () => {
      it("should handle functions", () => {
        const value = () => {};
        const result = sanitizer.truncate(value, 100);
        expect(result).toBe("[function]");
      });

      it("should handle symbols", () => {
        const value = Symbol("test");
        const result = sanitizer.truncate(value, 100);
        expect(result).toBe("[symbol]");
      });
    });
  });

  describe("sanitize()", () => {
    it("should redact sensitive values", () => {
      expect(sanitizer.sanitize("mySecretPassword123", "password")).toBe("[REDACTED]");
      expect(sanitizer.sanitize("abc123token", "accessToken")).toBe("[REDACTED]");
      expect(sanitizer.sanitize("secret-key-value", "apiKey")).toBe("[REDACTED]");
    });

    it("should not redact non-sensitive values", () => {
      expect(sanitizer.sanitize("john@example.com", "email")).toBe("john@example.com");
      expect(sanitizer.sanitize("John Doe", "name")).toBe("John Doe");
      expect(sanitizer.sanitize(42, "age")).toBe(42);
    });

    it("should truncate long non-sensitive values", () => {
      const longValue = "a".repeat(150);
      const result = sanitizer.sanitize(longValue, "description");
      expect(typeof result).toBe("string");
      expect((result as string).length).toBeLessThanOrEqual(100);
      expect((result as string).endsWith("[truncated]")).toBe(true);
    });

    it("should redact sensitive values regardless of length", () => {
      const shortPassword = "abc";
      const longPassword = "a".repeat(200);
      expect(sanitizer.sanitize(shortPassword, "password")).toBe("[REDACTED]");
      expect(sanitizer.sanitize(longPassword, "password")).toBe("[REDACTED]");
    });

    it("should handle nested sensitive paths", () => {
      expect(sanitizer.sanitize("secret123", "user.password")).toBe("[REDACTED]");
      expect(sanitizer.sanitize("token456", "auth.accessToken")).toBe("[REDACTED]");
    });

    it("should preserve type for non-sensitive primitives", () => {
      expect(sanitizer.sanitize(42, "count")).toBe(42);
      expect(sanitizer.sanitize(true, "active")).toBe(true);
      expect(sanitizer.sanitize(null, "optional")).toBe(null);
    });
  });

  describe("createValueSanitizer()", () => {
    it("should create sanitizer with default config", () => {
      const customSanitizer = createValueSanitizer();
      expect(customSanitizer.isSensitive("password")).toBe(true);
    });

    it("should create sanitizer with custom max length", () => {
      const customSanitizer = createValueSanitizer({ maxValueLength: 20 });
      const longValue = "a".repeat(50);
      const result = customSanitizer.sanitize(longValue, "description");
      expect((result as string).length).toBeLessThanOrEqual(20);
    });

    it("should create sanitizer with custom sensitive patterns", () => {
      const customSanitizer = createValueSanitizer({
        sensitivePatterns: [/custom/i, /special/i],
      });
      expect(customSanitizer.isSensitive("customField")).toBe(true);
      expect(customSanitizer.isSensitive("specialData")).toBe(true);
      expect(customSanitizer.isSensitive("password")).toBe(false); // Default patterns not included
    });
  });

  describe("edge cases", () => {
    it("should handle empty path", () => {
      expect(sanitizer.isSensitive("")).toBe(false);
      expect(sanitizer.sanitize("value", "")).toBe("value");
    });

    it("should handle whitespace in values", () => {
      expect(sanitizer.sanitize("  spaced  ", "field")).toBe("  spaced  ");
    });

    it("should handle unicode characters", () => {
      const unicodeValue = "Hello 世界 🌍";
      expect(sanitizer.sanitize(unicodeValue, "greeting")).toBe(unicodeValue);
    });

    it("should handle special characters in paths", () => {
      expect(sanitizer.isSensitive("user[0].password")).toBe(true);
      expect(sanitizer.isSensitive("data.api-key")).toBe(true); // hyphen is a word boundary, so "key" matches
      expect(sanitizer.isSensitive("data.apikey")).toBe(true);
    });
  });
});
