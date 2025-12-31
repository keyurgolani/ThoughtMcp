/**
 * Built-in Validators Unit Tests
 *
 * Tests for built-in validators:
 * - Email validation
 * - URL validation
 * - UUID validation
 * - ISO date validation
 * - JSON validation
 *
 * Requirements: 3.6
 */

import { describe, expect, it } from "vitest";
import {
  BUILT_IN_VALIDATORS,
  BuiltInValidators,
  CustomValidatorRegistry,
  createBuiltInValidators,
  validateEmail,
  validateISODate,
  validateJSON,
  validateURL,
  validateUUID,
} from "../../../validation/index.js";

describe("validateEmail", () => {
  describe("valid emails", () => {
    it("should accept simple email", () => {
      const result = validateEmail("user@example.com");
      expect(result.valid).toBe(true);
      expect(result.localPart).toBe("user");
      expect(result.domain).toBe("example.com");
    });

    it("should accept email with dots in local part", () => {
      const result = validateEmail("first.last@example.com");
      expect(result.valid).toBe(true);
      expect(result.localPart).toBe("first.last");
    });

    it("should accept email with plus addressing", () => {
      const result = validateEmail("user+tag@example.com");
      expect(result.valid).toBe(true);
      expect(result.localPart).toBe("user+tag");
    });

    it("should accept email with hyphens and underscores", () => {
      const result = validateEmail("user-name_test@example.com");
      expect(result.valid).toBe(true);
    });

    it("should accept email with subdomain", () => {
      const result = validateEmail("user@mail.example.com");
      expect(result.valid).toBe(true);
      expect(result.domain).toBe("mail.example.com");
    });

    it("should accept email with numeric local part", () => {
      const result = validateEmail("12345@example.com");
      expect(result.valid).toBe(true);
    });

    it("should accept email with IP domain when allowed", () => {
      const result = validateEmail("user@[192.168.1.1]", { allowIPDomain: true });
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid emails", () => {
    it("should reject non-string value", () => {
      const result = validateEmail(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("must be a string");
    });

    it("should reject empty string", () => {
      const result = validateEmail("");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("cannot be empty");
    });

    it("should reject email without @", () => {
      const result = validateEmail("userexample.com");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("@ symbol");
    });

    it("should reject email with empty local part", () => {
      const result = validateEmail("@example.com");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("local part");
    });

    it("should reject email with empty domain", () => {
      const result = validateEmail("user@");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("domain");
    });

    it("should reject email with leading dot in local part", () => {
      const result = validateEmail(".user@example.com");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("dot");
    });

    it("should reject email with trailing dot in local part", () => {
      const result = validateEmail("user.@example.com");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("dot");
    });

    it("should reject email with consecutive dots", () => {
      const result = validateEmail("user..name@example.com");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("consecutive dots");
    });

    it("should reject email exceeding max length", () => {
      const longEmail = `${"a".repeat(250)}@example.com`;
      const result = validateEmail(longEmail);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("maximum length");
    });

    it("should reject email with local part exceeding 64 characters", () => {
      const longLocal = `${"a".repeat(65)}@example.com`;
      const result = validateEmail(longLocal);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("64 characters");
    });

    it("should reject email without TLD", () => {
      const result = validateEmail("user@localhost");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("top-level domain");
    });

    it("should reject email with single-char TLD", () => {
      const result = validateEmail("user@example.c");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("at least 2 characters");
    });

    it("should reject IP domain when not allowed", () => {
      const result = validateEmail("user@[192.168.1.1]", { allowIPDomain: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("IP address domains");
    });

    it("should reject plus addressing when not allowed", () => {
      const result = validateEmail("user+tag@example.com", { allowPlusAddressing: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("invalid characters");
    });
  });
});

describe("validateURL", () => {
  describe("valid URLs", () => {
    it("should accept https URL", () => {
      const result = validateURL("https://example.com");
      expect(result.valid).toBe(true);
      expect(result.protocol).toBe("https");
      expect(result.hostname).toBe("example.com");
    });

    it("should accept http URL", () => {
      const result = validateURL("http://example.com");
      expect(result.valid).toBe(true);
      expect(result.protocol).toBe("http");
    });

    it("should accept URL with path", () => {
      const result = validateURL("https://example.com/path/to/resource");
      expect(result.valid).toBe(true);
      expect(result.pathname).toBe("/path/to/resource");
    });

    it("should accept URL with port", () => {
      const result = validateURL("https://example.com:8080");
      expect(result.valid).toBe(true);
      expect(result.port).toBe("8080");
    });

    it("should accept localhost URL", () => {
      const result = validateURL("http://localhost:3000");
      expect(result.valid).toBe(true);
      expect(result.hostname).toBe("localhost");
    });

    it("should accept IP address URL", () => {
      const result = validateURL("http://192.168.1.1:8080");
      expect(result.valid).toBe(true);
      expect(result.hostname).toBe("192.168.1.1");
    });

    it("should accept URL without protocol when not required", () => {
      const result = validateURL("example.com", { requireProtocol: false });
      expect(result.valid).toBe(true);
      expect(result.hostname).toBe("example.com");
    });
  });

  describe("invalid URLs", () => {
    it("should reject non-string value", () => {
      const result = validateURL(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("must be a string");
    });

    it("should reject empty string", () => {
      const result = validateURL("");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("cannot be empty");
    });

    it("should reject invalid URL format", () => {
      const result = validateURL("not a url");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid URL");
    });

    it("should reject disallowed protocol", () => {
      const result = validateURL("ftp://example.com");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("not allowed");
    });

    it("should reject localhost when not allowed", () => {
      const result = validateURL("http://localhost", { allowLocalhost: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Localhost");
    });

    it("should reject IP address when not allowed", () => {
      const result = validateURL("http://192.168.1.1", { allowIPAddress: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("IP address");
    });
  });

  describe("configuration", () => {
    it("should allow custom protocols", () => {
      const result = validateURL("ftp://example.com", { allowedProtocols: ["ftp", "sftp"] });
      expect(result.valid).toBe(true);
      expect(result.protocol).toBe("ftp");
    });
  });
});

describe("validateUUID", () => {
  describe("valid UUIDs", () => {
    it("should accept valid v4 UUID", () => {
      const result = validateUUID("550e8400-e29b-41d4-a716-446655440000");
      expect(result.valid).toBe(true);
      expect(result.version).toBe(4);
    });

    it("should accept valid v1 UUID", () => {
      const result = validateUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
      expect(result.valid).toBe(true);
      expect(result.version).toBe(1);
    });

    it("should accept uppercase UUID", () => {
      const result = validateUUID("550E8400-E29B-41D4-A716-446655440000");
      expect(result.valid).toBe(true);
    });

    it("should accept nil UUID when allowed", () => {
      const result = validateUUID("00000000-0000-0000-0000-000000000000");
      expect(result.valid).toBe(true);
      expect(result.version).toBe(0);
    });

    it("should accept v3 UUID", () => {
      const result = validateUUID("a3bb189e-8bf9-3888-9912-ace4e6543002");
      expect(result.valid).toBe(true);
      expect(result.version).toBe(3);
    });

    it("should accept v5 UUID", () => {
      const result = validateUUID("886313e1-3b8a-5372-9b90-0c9aee199e5d");
      expect(result.valid).toBe(true);
      expect(result.version).toBe(5);
    });
  });

  describe("invalid UUIDs", () => {
    it("should reject non-string value", () => {
      const result = validateUUID(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("must be a string");
    });

    it("should reject empty string", () => {
      const result = validateUUID("");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("cannot be empty");
    });

    it("should reject invalid format", () => {
      const result = validateUUID("not-a-uuid");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid UUID");
    });

    it("should reject UUID without hyphens", () => {
      const result = validateUUID("550e8400e29b41d4a716446655440000");
      expect(result.valid).toBe(false);
    });

    it("should reject UUID with wrong length", () => {
      const result = validateUUID("550e8400-e29b-41d4-a716-44665544000");
      expect(result.valid).toBe(false);
    });

    it("should reject nil UUID when not allowed", () => {
      const result = validateUUID("00000000-0000-0000-0000-000000000000", { allowNil: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Nil UUID");
    });

    it("should reject disallowed version", () => {
      const result = validateUUID("550e8400-e29b-41d4-a716-446655440000", { allowedVersions: [1] });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("version 4");
    });
  });
});

describe("validateISODate", () => {
  describe("valid dates", () => {
    it("should accept date only format", () => {
      const result = validateISODate("2024-01-15");
      expect(result.valid).toBe(true);
      expect(result.parsedDate).toBeInstanceOf(Date);
    });

    it("should accept date and time format", () => {
      const result = validateISODate("2024-01-15T10:30:00");
      expect(result.valid).toBe(true);
    });

    it("should accept date, time, and Z timezone", () => {
      const result = validateISODate("2024-01-15T10:30:00Z");
      expect(result.valid).toBe(true);
    });

    it("should accept date, time, and offset timezone", () => {
      const result = validateISODate("2024-01-15T10:30:00+05:30");
      expect(result.valid).toBe(true);
    });

    it("should accept date with milliseconds", () => {
      const result = validateISODate("2024-01-15T10:30:00.123Z");
      expect(result.valid).toBe(true);
    });

    it("should accept negative timezone offset", () => {
      const result = validateISODate("2024-01-15T10:30:00-08:00");
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid dates", () => {
    it("should reject non-string value", () => {
      const result = validateISODate(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("must be a string");
    });

    it("should reject empty string", () => {
      const result = validateISODate("");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("cannot be empty");
    });

    it("should reject invalid format", () => {
      const result = validateISODate("01/15/2024");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid ISO");
    });

    it("should reject invalid month", () => {
      const result = validateISODate("2024-13-15");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid month");
    });

    it("should reject invalid day", () => {
      const result = validateISODate("2024-02-30");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid day");
    });

    it("should reject date without time when time required", () => {
      const result = validateISODate("2024-01-15", { requireTime: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("time component");
    });

    it("should reject date without timezone when timezone required", () => {
      const result = validateISODate("2024-01-15T10:30:00", { requireTimezone: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("timezone");
    });

    it("should reject date before minDate", () => {
      const result = validateISODate("2024-01-01", { minDate: new Date("2024-06-01") });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("before minimum");
    });

    it("should reject date after maxDate", () => {
      const result = validateISODate("2024-12-31", { maxDate: new Date("2024-06-01") });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("after maximum");
    });
  });
});

describe("validateJSON", () => {
  describe("valid JSON", () => {
    it("should accept empty object", () => {
      const result = validateJSON("{}");
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toEqual({});
    });

    it("should accept empty array", () => {
      const result = validateJSON("[]");
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toEqual([]);
    });

    it("should accept object with properties", () => {
      const result = validateJSON('{"name": "test", "value": 123}');
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toEqual({ name: "test", value: 123 });
    });

    it("should accept nested objects", () => {
      const result = validateJSON('{"outer": {"inner": "value"}}');
      expect(result.valid).toBe(true);
    });

    it("should accept array with items", () => {
      const result = validateJSON("[1, 2, 3]");
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toEqual([1, 2, 3]);
    });

    it("should accept null", () => {
      const result = validateJSON("null");
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toBeNull();
    });

    it("should accept boolean", () => {
      const result = validateJSON("true");
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toBe(true);
    });

    it("should accept number", () => {
      const result = validateJSON("42");
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toBe(42);
    });

    it("should accept string", () => {
      const result = validateJSON('"hello"');
      expect(result.valid).toBe(true);
      expect(result.parsedValue).toBe("hello");
    });
  });

  describe("invalid JSON", () => {
    it("should reject non-string value", () => {
      const result = validateJSON(123);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("must be a string");
    });

    it("should reject empty string", () => {
      const result = validateJSON("");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("cannot be empty");
    });

    it("should reject invalid JSON syntax", () => {
      const result = validateJSON("{invalid}");
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Invalid JSON");
    });

    it("should reject trailing comma", () => {
      const result = validateJSON('{"a": 1,}');
      expect(result.valid).toBe(false);
    });

    it("should reject single quotes", () => {
      const result = validateJSON("{'a': 1}");
      expect(result.valid).toBe(false);
    });

    it("should reject unquoted keys", () => {
      const result = validateJSON("{a: 1}");
      expect(result.valid).toBe(false);
    });

    it("should reject JSON exceeding max length", () => {
      const longJson = `{"data": "${"a".repeat(1000)}"}`;
      const result = validateJSON(longJson, { maxLength: 100 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("maximum length");
    });

    it("should reject JSON exceeding max depth", () => {
      // Create deeply nested JSON
      let json = '{"a":';
      for (let i = 0; i < 10; i++) {
        json += '{"b":';
      }
      json += "1";
      for (let i = 0; i < 10; i++) {
        json += "}";
      }
      json += "}";

      const result = validateJSON(json, { maxDepth: 5 });
      expect(result.valid).toBe(false);
      expect(result.message).toContain("nesting depth");
    });
  });
});

describe("BuiltInValidators", () => {
  describe("registerAll", () => {
    it("should register all built-in validators", () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();

      builtIn.registerAll(registry);

      expect(registry.has(BUILT_IN_VALIDATORS.EMAIL)).toBe(true);
      expect(registry.has(BUILT_IN_VALIDATORS.URL)).toBe(true);
      expect(registry.has(BUILT_IN_VALIDATORS.UUID)).toBe(true);
      expect(registry.has(BUILT_IN_VALIDATORS.ISO_DATE)).toBe(true);
      expect(registry.has(BUILT_IN_VALIDATORS.JSON)).toBe(true);
    });

    it("should register validators with correct descriptions", () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();

      builtIn.registerAll(registry);

      const emailConfig = registry.get(BUILT_IN_VALIDATORS.EMAIL);
      expect(emailConfig?.description).toContain("email");

      const urlConfig = registry.get(BUILT_IN_VALIDATORS.URL);
      expect(urlConfig?.description).toContain("URL");

      const uuidConfig = registry.get(BUILT_IN_VALIDATORS.UUID);
      expect(uuidConfig?.description).toContain("UUID");

      const dateConfig = registry.get(BUILT_IN_VALIDATORS.ISO_DATE);
      expect(dateConfig?.description).toContain("ISO");

      const jsonConfig = registry.get(BUILT_IN_VALIDATORS.JSON);
      expect(jsonConfig?.description).toContain("JSON");
    });
  });

  describe("individual registration", () => {
    it("should register email validator individually", () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();

      builtIn.registerEmail(registry);

      expect(registry.has(BUILT_IN_VALIDATORS.EMAIL)).toBe(true);
      expect(registry.has(BUILT_IN_VALIDATORS.URL)).toBe(false);
    });

    it("should register URL validator individually", () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();

      builtIn.registerURL(registry);

      expect(registry.has(BUILT_IN_VALIDATORS.URL)).toBe(true);
      expect(registry.has(BUILT_IN_VALIDATORS.EMAIL)).toBe(false);
    });

    it("should register UUID validator individually", () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();

      builtIn.registerUUID(registry);

      expect(registry.has(BUILT_IN_VALIDATORS.UUID)).toBe(true);
    });

    it("should register ISO date validator individually", () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();

      builtIn.registerISODate(registry);

      expect(registry.has(BUILT_IN_VALIDATORS.ISO_DATE)).toBe(true);
    });

    it("should register JSON validator individually", () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();

      builtIn.registerJSON(registry);

      expect(registry.has(BUILT_IN_VALIDATORS.JSON)).toBe(true);
    });
  });

  describe("configuration", () => {
    it("should use custom email configuration", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators({
        email: { allowPlusAddressing: false },
      });

      builtIn.registerEmail(registry);

      const result = await registry.execute(BUILT_IN_VALIDATORS.EMAIL, {
        input: {},
        fieldValue: "user+tag@example.com",
        fieldPath: "email",
        metadata: {},
      });

      expect(result.valid).toBe(false);
    });

    it("should use custom URL configuration", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators({
        url: { allowLocalhost: false },
      });

      builtIn.registerURL(registry);

      const result = await registry.execute(BUILT_IN_VALIDATORS.URL, {
        input: {},
        fieldValue: "http://localhost:3000",
        fieldPath: "url",
        metadata: {},
      });

      expect(result.valid).toBe(false);
    });

    it("should use custom UUID configuration", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators({
        uuid: { allowedVersions: [4] },
      });

      builtIn.registerUUID(registry);

      const result = await registry.execute(BUILT_IN_VALIDATORS.UUID, {
        input: {},
        fieldValue: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", // v1 UUID
        fieldPath: "id",
        metadata: {},
      });

      expect(result.valid).toBe(false);
    });

    it("should use custom ISO date configuration", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators({
        isoDate: { requireTimezone: true },
      });

      builtIn.registerISODate(registry);

      const result = await registry.execute(BUILT_IN_VALIDATORS.ISO_DATE, {
        input: {},
        fieldValue: "2024-01-15T10:30:00",
        fieldPath: "date",
        metadata: {},
      });

      expect(result.valid).toBe(false);
    });

    it("should use custom JSON configuration", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators({
        json: { maxDepth: 2 },
      });

      builtIn.registerJSON(registry);

      const result = await registry.execute(BUILT_IN_VALIDATORS.JSON, {
        input: {},
        fieldValue: '{"a": {"b": {"c": 1}}}',
        fieldPath: "data",
        metadata: {},
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("execution through registry", () => {
    it("should validate email through registry", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();
      builtIn.registerAll(registry);

      const validResult = await registry.execute(BUILT_IN_VALIDATORS.EMAIL, {
        input: {},
        fieldValue: "user@example.com",
        fieldPath: "email",
        metadata: {},
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = await registry.execute(BUILT_IN_VALIDATORS.EMAIL, {
        input: {},
        fieldValue: "invalid-email",
        fieldPath: "email",
        metadata: {},
      });
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate URL through registry", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();
      builtIn.registerAll(registry);

      const validResult = await registry.execute(BUILT_IN_VALIDATORS.URL, {
        input: {},
        fieldValue: "https://example.com",
        fieldPath: "url",
        metadata: {},
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = await registry.execute(BUILT_IN_VALIDATORS.URL, {
        input: {},
        fieldValue: "not-a-url",
        fieldPath: "url",
        metadata: {},
      });
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate UUID through registry", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();
      builtIn.registerAll(registry);

      const validResult = await registry.execute(BUILT_IN_VALIDATORS.UUID, {
        input: {},
        fieldValue: "550e8400-e29b-41d4-a716-446655440000",
        fieldPath: "id",
        metadata: {},
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = await registry.execute(BUILT_IN_VALIDATORS.UUID, {
        input: {},
        fieldValue: "not-a-uuid",
        fieldPath: "id",
        metadata: {},
      });
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate ISO date through registry", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();
      builtIn.registerAll(registry);

      const validResult = await registry.execute(BUILT_IN_VALIDATORS.ISO_DATE, {
        input: {},
        fieldValue: "2024-01-15T10:30:00Z",
        fieldPath: "date",
        metadata: {},
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = await registry.execute(BUILT_IN_VALIDATORS.ISO_DATE, {
        input: {},
        fieldValue: "01/15/2024",
        fieldPath: "date",
        metadata: {},
      });
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate JSON through registry", async () => {
      const registry = new CustomValidatorRegistry();
      const builtIn = new BuiltInValidators();
      builtIn.registerAll(registry);

      const validResult = await registry.execute(BUILT_IN_VALIDATORS.JSON, {
        input: {},
        fieldValue: '{"key": "value"}',
        fieldPath: "data",
        metadata: {},
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = await registry.execute(BUILT_IN_VALIDATORS.JSON, {
        input: {},
        fieldValue: "{invalid}",
        fieldPath: "data",
        metadata: {},
      });
      expect(invalidResult.valid).toBe(false);
    });
  });
});

describe("createBuiltInValidators", () => {
  it("should create BuiltInValidators instance", () => {
    const builtIn = createBuiltInValidators();
    expect(builtIn).toBeInstanceOf(BuiltInValidators);
  });

  it("should create BuiltInValidators with custom config", () => {
    const builtIn = createBuiltInValidators({
      email: { allowPlusAddressing: false },
      url: { allowLocalhost: false },
    });
    expect(builtIn).toBeInstanceOf(BuiltInValidators);
  });
});

describe("BUILT_IN_VALIDATORS constants", () => {
  it("should have correct validator names", () => {
    expect(BUILT_IN_VALIDATORS.EMAIL).toBe("builtIn:email");
    expect(BUILT_IN_VALIDATORS.URL).toBe("builtIn:url");
    expect(BUILT_IN_VALIDATORS.UUID).toBe("builtIn:uuid");
    expect(BUILT_IN_VALIDATORS.ISO_DATE).toBe("builtIn:isoDate");
    expect(BUILT_IN_VALIDATORS.JSON).toBe("builtIn:json");
  });
});
