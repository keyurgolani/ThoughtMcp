/**
 * ZodErrorTransformer Unit Tests
 *
 * Tests for the ZodErrorTransformer class that transforms Zod validation errors
 * into the standardized FieldError format.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ZodErrorTransformer,
  createZodErrorTransformer,
} from "../../../validation/zod-transformer.js";

describe("ZodErrorTransformer", () => {
  let transformer: ZodErrorTransformer;

  beforeEach(() => {
    transformer = new ZodErrorTransformer();
  });

  describe("transform", () => {
    it("should transform a single Zod error into FieldError array", () => {
      const schema = z.object({
        name: z.string().min(3),
      });

      const result = schema.safeParse({ name: "ab" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { name: "ab" });
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("name");
        expect(errors[0].code).toBe("STRING_TOO_SHORT");
        expect(errors[0].constraint).toBe("minLength");
      }
    });

    it("should transform multiple Zod errors into FieldError array", () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().min(18),
      });

      const result = schema.safeParse({ name: "ab", age: 10 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { name: "ab", age: 10 });
        expect(errors).toHaveLength(2);
        expect(errors.map((e) => e.path)).toContain("name");
        expect(errors.map((e) => e.path)).toContain("age");
      }
    });

    it("should handle required field errors", () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = schema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, {});
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("FIELD_REQUIRED");
        expect(errors[0].constraint).toBe("required");
        expect(errors[0].expected.type).toBe("required");
      }
    });

    it("should handle type mismatch errors", () => {
      const schema = z.object({
        age: z.number(),
      });

      const result = schema.safeParse({ age: "not a number" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { age: "not a number" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("TYPE_MISMATCH");
        expect(errors[0].constraint).toBe("type");
        expect(errors[0].expected.type).toBe("type");
      }
    });

    it("should handle enum errors", () => {
      const schema = z.object({
        status: z.enum(["active", "inactive", "pending"]),
      });

      const result = schema.safeParse({ status: "actve" }); // typo
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { status: "actve" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_ENUM_VALUE");
        expect(errors[0].constraint).toBe("enum");
        expect(errors[0].expected.type).toBe("enum");
        if (errors[0].expected.type === "enum") {
          expect(errors[0].expected.validValues).toContain("active");
          expect(errors[0].expected.closestMatch).toBe("active");
        }
      }
    });

    it("should handle email format errors", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { email: "not-an-email" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_FORMAT");
        expect(errors[0].constraint).toBe("format");
      }
    });

    it("should handle URL format errors", () => {
      const schema = z.object({
        website: z.string().url(),
      });

      const result = schema.safeParse({ website: "not-a-url" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { website: "not-a-url" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_FORMAT");
        expect(errors[0].constraint).toBe("format");
      }
    });

    it("should handle UUID format errors", () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      const result = schema.safeParse({ id: "not-a-uuid" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { id: "not-a-uuid" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_FORMAT");
        expect(errors[0].constraint).toBe("format");
      }
    });

    it("should handle number too small errors", () => {
      const schema = z.object({
        age: z.number().min(18),
      });

      const result = schema.safeParse({ age: 10 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { age: 10 });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("NUMBER_TOO_SMALL");
        expect(errors[0].constraint).toBe("minValue");
        expect(errors[0].expected.type).toBe("minValue");
      }
    });

    it("should handle number too large errors", () => {
      const schema = z.object({
        age: z.number().max(100),
      });

      const result = schema.safeParse({ age: 150 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { age: 150 });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("NUMBER_TOO_LARGE");
        expect(errors[0].constraint).toBe("maxValue");
        expect(errors[0].expected.type).toBe("maxValue");
      }
    });

    it("should handle string too long errors", () => {
      const schema = z.object({
        name: z.string().max(10),
      });

      const result = schema.safeParse({ name: "this is a very long name" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { name: "this is a very long name" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("STRING_TOO_LONG");
        expect(errors[0].constraint).toBe("maxLength");
        expect(errors[0].expected.type).toBe("maxLength");
      }
    });

    it("should handle custom validation errors", () => {
      const schema = z.object({
        password: z.string().refine((val) => val.includes("@"), {
          message: "Password must contain @",
        }),
      });

      const result = schema.safeParse({ password: "noatsign" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { password: "noatsign" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("CUSTOM_VALIDATION_FAILED");
        expect(errors[0].constraint).toBe("custom");
      }
    });
  });

  describe("path formatting", () => {
    it("should format nested object paths with dot notation", () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(3),
          }),
        }),
      });

      const result = schema.safeParse({ user: { profile: { name: "ab" } } });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { user: { profile: { name: "ab" } } });
        expect(errors[0].path).toBe("user.profile.name");
      }
    });

    it("should format array index paths with bracket notation", () => {
      const schema = z.object({
        items: z.array(z.string().min(3)),
      });

      const result = schema.safeParse({ items: ["abc", "ab", "abcd"] });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { items: ["abc", "ab", "abcd"] });
        expect(errors[0].path).toBe("items[1]");
      }
    });

    it("should format mixed object and array paths correctly", () => {
      const schema = z.object({
        users: z.array(
          z.object({
            addresses: z.array(
              z.object({
                city: z.string().min(3),
              })
            ),
          })
        ),
      });

      const input = {
        users: [
          {
            addresses: [{ city: "ab" }],
          },
        ],
      };

      const result = schema.safeParse(input);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, input);
        expect(errors[0].path).toBe("users[0].addresses[0].city");
      }
    });

    it("should return 'request' for root-level errors", () => {
      const schema = z.string().min(3);

      const result = schema.safeParse("ab");
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, "ab");
        expect(errors[0].path).toBe("request");
      }
    });
  });

  describe("extractConstraint", () => {
    it("should extract minLength constraint", () => {
      const schema = z.string().min(5);
      const result = schema.safeParse("ab");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("minLength");
        if (constraint.type === "minLength") {
          expect(constraint.minLength).toBe(5);
        }
      }
    });

    it("should extract maxLength constraint", () => {
      const schema = z.string().max(5);
      const result = schema.safeParse("abcdefgh");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("maxLength");
        if (constraint.type === "maxLength") {
          expect(constraint.maxLength).toBe(5);
        }
      }
    });

    it("should extract minValue constraint", () => {
      const schema = z.number().min(10);
      const result = schema.safeParse(5);

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("minValue");
        if (constraint.type === "minValue") {
          expect(constraint.minValue).toBe(10);
        }
      }
    });

    it("should extract maxValue constraint", () => {
      const schema = z.number().max(10);
      const result = schema.safeParse(15);

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("maxValue");
        if (constraint.type === "maxValue") {
          expect(constraint.maxValue).toBe(10);
        }
      }
    });

    it("should extract enum constraint with valid values", () => {
      const schema = z.enum(["a", "b", "c"]);
      const result = schema.safeParse("d");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("enum");
        if (constraint.type === "enum") {
          expect(constraint.validValues).toEqual(["a", "b", "c"]);
        }
      }
    });

    it("should extract type constraint", () => {
      const schema = z.number();
      const result = schema.safeParse("not a number");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("type");
        if (constraint.type === "type") {
          expect(constraint.expectedType).toBe("number");
          expect(constraint.actualType).toBe("string");
        }
      }
    });

    it("should extract format constraint for email", () => {
      const schema = z.string().email();
      const result = schema.safeParse("not-email");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("format");
        if (constraint.type === "format") {
          expect(constraint.format).toBe("email");
          expect(constraint.example).toBe("user@example.com");
        }
      }
    });

    it("should extract format constraint for URL", () => {
      const schema = z.string().url();
      const result = schema.safeParse("not-url");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("format");
        if (constraint.type === "format") {
          expect(constraint.format).toBe("URL");
          expect(constraint.example).toBe("https://example.com");
        }
      }
    });

    it("should extract format constraint for UUID", () => {
      const schema = z.string().uuid();
      const result = schema.safeParse("not-uuid");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        expect(constraint.type).toBe("format");
        if (constraint.type === "format") {
          expect(constraint.format).toBe("UUID");
        }
      }
    });
  });

  describe("generateSuggestion", () => {
    it("should generate suggestion for required field", () => {
      const schema = z.object({ name: z.string() });
      const result = schema.safeParse({});

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        const suggestion = transformer.generateSuggestion(result.error.issues[0], constraint);
        expect(suggestion).toContain("name");
        expect(suggestion).toContain("required");
      }
    });

    it("should generate suggestion for minLength", () => {
      const schema = z.string().min(10);
      const result = schema.safeParse("short");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        const suggestion = transformer.generateSuggestion(result.error.issues[0], constraint);
        expect(suggestion).toContain("10");
        expect(suggestion).toContain("character");
      }
    });

    it("should generate suggestion for enum with closest match", () => {
      const schema = z.enum(["active", "inactive", "pending"]);
      const result = schema.safeParse("actve");

      if (!result.success) {
        const constraint = transformer.extractConstraint(result.error.issues[0]);
        const suggestion = transformer.generateSuggestion(result.error.issues[0], constraint);
        expect(suggestion).toContain("active");
      }
    });
  });

  describe("value extraction", () => {
    it("should extract actual value from input", () => {
      const schema = z.object({
        name: z.string().min(10),
      });

      const input = { name: "short" };
      const result = schema.safeParse(input);

      if (!result.success) {
        const errors = transformer.transform(result.error, input);
        expect(errors[0].actualValue).toBe("short");
      }
    });

    it("should extract nested value from input", () => {
      const schema = z.object({
        user: z.object({
          age: z.number().min(18),
        }),
      });

      const input = { user: { age: 10 } };
      const result = schema.safeParse(input);

      if (!result.success) {
        const errors = transformer.transform(result.error, input);
        expect(errors[0].actualValue).toBe(10);
      }
    });

    it("should extract array item value from input", () => {
      const schema = z.object({
        items: z.array(z.number().min(5)),
      });

      const input = { items: [10, 3, 8] };
      const result = schema.safeParse(input);

      if (!result.success) {
        const errors = transformer.transform(result.error, input);
        expect(errors[0].actualValue).toBe(3);
      }
    });

    it("should sanitize sensitive values", () => {
      const schema = z.object({
        password: z.string().min(10),
      });

      const input = { password: "short" };
      const result = schema.safeParse(input);

      if (!result.success) {
        const errors = transformer.transform(result.error, input);
        expect(errors[0].actualValue).toBe("[REDACTED]");
      }
    });
  });

  describe("createZodErrorTransformer", () => {
    it("should create a transformer with default config", () => {
      const transformer = createZodErrorTransformer();
      expect(transformer).toBeInstanceOf(ZodErrorTransformer);
    });

    it("should create a transformer with custom config", () => {
      const transformer = createZodErrorTransformer({});
      expect(transformer).toBeInstanceOf(ZodErrorTransformer);
    });
  });
});

/**
 * Field-Specific Error Details Tests
 *
 * Comprehensive tests for field-specific error details as specified in Requirements 2.1-2.7.
 * These tests verify that each error type includes all required details.
 */
describe("Field-Specific Error Details (Requirements 2.1-2.7)", () => {
  let transformer: ZodErrorTransformer;

  beforeEach(() => {
    transformer = new ZodErrorTransformer();
  });

  /**
   * Requirement 2.1: Required field errors
   * WHEN a required field is missing, THE Validation_System SHALL report
   * the field path and indicate it is required
   */
  describe("Requirement 2.1: Required field errors", () => {
    it("should report field path for missing required field", () => {
      const schema = z.object({
        username: z.string(),
      });

      const result = schema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, {});
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("username");
        expect(errors[0].code).toBe("FIELD_REQUIRED");
        expect(errors[0].constraint).toBe("required");
        expect(errors[0].expected.type).toBe("required");
        expect(errors[0].suggestion).toContain("required");
      }
    });

    it("should report nested field path for missing required field", () => {
      const schema = z.object({
        user: z.object({
          email: z.string(),
        }),
      });

      const result = schema.safeParse({ user: {} });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { user: {} });
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("user.email");
        expect(errors[0].code).toBe("FIELD_REQUIRED");
      }
    });

    it("should report multiple missing required fields", () => {
      const schema = z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string(),
      });

      const result = schema.safeParse({});
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, {});
        expect(errors).toHaveLength(3);
        expect(errors.every((e) => e.code === "FIELD_REQUIRED")).toBe(true);
        expect(errors.map((e) => e.path)).toContain("firstName");
        expect(errors.map((e) => e.path)).toContain("lastName");
        expect(errors.map((e) => e.path)).toContain("email");
      }
    });
  });

  /**
   * Requirement 2.2: Minimum value errors
   * WHEN a field value is below minimum, THE Validation_System SHALL report
   * the actual value, minimum allowed, and the difference
   */
  describe("Requirement 2.2: Minimum value errors", () => {
    it("should report actual value and minimum for number too small", () => {
      const schema = z.object({
        age: z.number().min(18),
      });

      const result = schema.safeParse({ age: 15 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { age: 15 });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("NUMBER_TOO_SMALL");
        expect(errors[0].actualValue).toBe(15);
        expect(errors[0].expected.type).toBe("minValue");
        if (errors[0].expected.type === "minValue") {
          expect(errors[0].expected.minValue).toBe(18);
        }
      }
    });

    it("should report actual length and minimum for string too short", () => {
      const schema = z.object({
        name: z.string().min(5),
      });

      const result = schema.safeParse({ name: "ab" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { name: "ab" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("STRING_TOO_SHORT");
        expect(errors[0].actualValue).toBe("ab");
        expect(errors[0].expected.type).toBe("minLength");
        if (errors[0].expected.type === "minLength") {
          expect(errors[0].expected.minLength).toBe(5);
        }
      }
    });

    it("should handle exclusive minimum (gt instead of gte)", () => {
      const schema = z.object({
        score: z.number().gt(0),
      });

      const result = schema.safeParse({ score: 0 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { score: 0 });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("NUMBER_TOO_SMALL");
        expect(errors[0].expected.type).toBe("minValue");
      }
    });
  });

  /**
   * Requirement 2.3: Maximum value errors
   * WHEN a field value exceeds maximum, THE Validation_System SHALL report
   * the actual value, maximum allowed, and the excess amount
   */
  describe("Requirement 2.3: Maximum value errors", () => {
    it("should report actual value and maximum for number too large", () => {
      const schema = z.object({
        percentage: z.number().max(100),
      });

      const result = schema.safeParse({ percentage: 150 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { percentage: 150 });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("NUMBER_TOO_LARGE");
        expect(errors[0].actualValue).toBe(150);
        expect(errors[0].expected.type).toBe("maxValue");
        if (errors[0].expected.type === "maxValue") {
          expect(errors[0].expected.maxValue).toBe(100);
        }
      }
    });

    it("should report actual length and maximum for string too long", () => {
      const schema = z.object({
        code: z.string().max(4),
      });

      const result = schema.safeParse({ code: "ABCDEFGH" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { code: "ABCDEFGH" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("STRING_TOO_LONG");
        expect(errors[0].actualValue).toBe("ABCDEFGH");
        expect(errors[0].expected.type).toBe("maxLength");
        if (errors[0].expected.type === "maxLength") {
          expect(errors[0].expected.maxLength).toBe(4);
        }
      }
    });

    it("should handle exclusive maximum (lt instead of lte)", () => {
      const schema = z.object({
        value: z.number().lt(100),
      });

      const result = schema.safeParse({ value: 100 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { value: 100 });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("NUMBER_TOO_LARGE");
        expect(errors[0].expected.type).toBe("maxValue");
      }
    });
  });

  /**
   * Requirement 2.4: Pattern mismatch errors
   * WHEN a field value does not match a pattern, THE Validation_System SHALL report
   * the expected pattern and provide an example of valid input
   */
  describe("Requirement 2.4: Pattern mismatch errors", () => {
    it("should report pattern for regex mismatch", () => {
      const schema = z.object({
        zipCode: z.string().regex(/^\d{5}$/),
      });

      const result = schema.safeParse({ zipCode: "1234" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { zipCode: "1234" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("PATTERN_MISMATCH");
        expect(errors[0].constraint).toBe("pattern");
        expect(errors[0].expected.type).toBe("pattern");
      }
    });

    it("should report format and example for email validation", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      const result = schema.safeParse({ email: "invalid-email" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { email: "invalid-email" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_FORMAT");
        expect(errors[0].constraint).toBe("format");
        expect(errors[0].expected.type).toBe("format");
        if (errors[0].expected.type === "format") {
          expect(errors[0].expected.format).toBe("email");
          expect(errors[0].expected.example).toBe("user@example.com");
        }
      }
    });

    it("should report format and example for URL validation", () => {
      const schema = z.object({
        website: z.string().url(),
      });

      const result = schema.safeParse({ website: "not-a-url" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { website: "not-a-url" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_FORMAT");
        expect(errors[0].expected.type).toBe("format");
        if (errors[0].expected.type === "format") {
          expect(errors[0].expected.format).toBe("URL");
          expect(errors[0].expected.example).toBe("https://example.com");
        }
      }
    });

    it("should report format and example for UUID validation", () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      const result = schema.safeParse({ id: "not-a-uuid" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { id: "not-a-uuid" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_FORMAT");
        expect(errors[0].expected.type).toBe("format");
        if (errors[0].expected.type === "format") {
          expect(errors[0].expected.format).toBe("UUID");
          expect(errors[0].expected.example).toBe("550e8400-e29b-41d4-a716-446655440000");
        }
      }
    });

    it("should report format and example for datetime validation", () => {
      const schema = z.object({
        timestamp: z.string().datetime(),
      });

      const result = schema.safeParse({ timestamp: "not-a-datetime" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { timestamp: "not-a-datetime" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_FORMAT");
        expect(errors[0].expected.type).toBe("format");
        if (errors[0].expected.type === "format") {
          expect(errors[0].expected.format).toBe("ISO datetime");
          expect(errors[0].expected.example).toBe("2024-01-15T10:30:00Z");
        }
      }
    });

    it("should handle string includes validation", () => {
      const schema = z.object({
        domain: z.string().includes("@"),
      });

      const result = schema.safeParse({ domain: "nodomain" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { domain: "nodomain" });
        expect(errors).toHaveLength(1);
        expect(errors[0].expected.type).toBe("pattern");
      }
    });

    it("should handle string startsWith validation", () => {
      const schema = z.object({
        protocol: z.string().startsWith("https://"),
      });

      const result = schema.safeParse({ protocol: "http://example.com" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { protocol: "http://example.com" });
        expect(errors).toHaveLength(1);
        expect(errors[0].expected.type).toBe("pattern");
      }
    });

    it("should handle string endsWith validation", () => {
      const schema = z.object({
        filename: z.string().endsWith(".json"),
      });

      const result = schema.safeParse({ filename: "config.yaml" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { filename: "config.yaml" });
        expect(errors).toHaveLength(1);
        expect(errors[0].expected.type).toBe("pattern");
      }
    });
  });

  /**
   * Requirement 2.5: Type mismatch errors
   * WHEN a field value is of wrong type, THE Validation_System SHALL report
   * the expected type and the actual type received
   */
  describe("Requirement 2.5: Type mismatch errors", () => {
    it("should report expected and actual type for string expected, number received", () => {
      const schema = z.object({
        name: z.string(),
      });

      const result = schema.safeParse({ name: 123 });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { name: 123 });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("TYPE_MISMATCH");
        expect(errors[0].constraint).toBe("type");
        expect(errors[0].expected.type).toBe("type");
        if (errors[0].expected.type === "type") {
          expect(errors[0].expected.expectedType).toBe("string");
          expect(errors[0].expected.actualType).toBe("number");
        }
      }
    });

    it("should report expected and actual type for number expected, string received", () => {
      const schema = z.object({
        age: z.number(),
      });

      const result = schema.safeParse({ age: "twenty" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { age: "twenty" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("TYPE_MISMATCH");
        expect(errors[0].expected.type).toBe("type");
        if (errors[0].expected.type === "type") {
          expect(errors[0].expected.expectedType).toBe("number");
          expect(errors[0].expected.actualType).toBe("string");
        }
      }
    });

    it("should report expected and actual type for boolean expected, string received", () => {
      const schema = z.object({
        active: z.boolean(),
      });

      const result = schema.safeParse({ active: "true" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { active: "true" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("TYPE_MISMATCH");
        expect(errors[0].expected.type).toBe("type");
        if (errors[0].expected.type === "type") {
          expect(errors[0].expected.expectedType).toBe("boolean");
          expect(errors[0].expected.actualType).toBe("string");
        }
      }
    });

    it("should report expected and actual type for array expected, object received", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const result = schema.safeParse({ items: { key: "value" } });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { items: { key: "value" } });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("TYPE_MISMATCH");
        expect(errors[0].expected.type).toBe("type");
        if (errors[0].expected.type === "type") {
          expect(errors[0].expected.expectedType).toBe("array");
          expect(errors[0].expected.actualType).toBe("object");
        }
      }
    });

    it("should report expected and actual type for object expected, array received", () => {
      const schema = z.object({
        config: z.object({ key: z.string() }),
      });

      const result = schema.safeParse({ config: ["value"] });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { config: ["value"] });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("TYPE_MISMATCH");
        expect(errors[0].expected.type).toBe("type");
        if (errors[0].expected.type === "type") {
          expect(errors[0].expected.expectedType).toBe("object");
          expect(errors[0].expected.actualType).toBe("array");
        }
      }
    });

    it("should report expected and actual type for null received", () => {
      const schema = z.object({
        value: z.string(),
      });

      const result = schema.safeParse({ value: null });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { value: null });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("TYPE_MISMATCH");
        expect(errors[0].expected.type).toBe("type");
        if (errors[0].expected.type === "type") {
          expect(errors[0].expected.expectedType).toBe("string");
          expect(errors[0].expected.actualType).toBe("null");
        }
      }
    });
  });

  /**
   * Requirement 2.6: Enum errors
   * WHEN an enum field has an invalid value, THE Validation_System SHALL list
   * all valid enum values
   */
  describe("Requirement 2.6: Enum errors", () => {
    it("should list all valid enum values", () => {
      const schema = z.object({
        status: z.enum(["pending", "active", "completed", "cancelled"]),
      });

      const result = schema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { status: "invalid" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_ENUM_VALUE");
        expect(errors[0].constraint).toBe("enum");
        expect(errors[0].expected.type).toBe("enum");
        if (errors[0].expected.type === "enum") {
          expect(errors[0].expected.validValues).toEqual([
            "pending",
            "active",
            "completed",
            "cancelled",
          ]);
        }
      }
    });

    it("should suggest closest match for typos", () => {
      const schema = z.object({
        priority: z.enum(["low", "medium", "high", "critical"]),
      });

      const result = schema.safeParse({ priority: "hig" }); // typo for "high" - missing 1 char
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { priority: "hig" });
        expect(errors).toHaveLength(1);
        expect(errors[0].expected.type).toBe("enum");
        if (errors[0].expected.type === "enum") {
          expect(errors[0].expected.closestMatch).toBe("high");
        }
      }
    });

    it("should handle native enum", () => {
      enum Color {
        Red = "red",
        Green = "green",
        Blue = "blue",
      }

      const schema = z.object({
        color: z.nativeEnum(Color),
      });

      const result = schema.safeParse({ color: "yellow" });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { color: "yellow" });
        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe("INVALID_ENUM_VALUE");
      }
    });
  });

  /**
   * Requirement 2.7: Array item errors
   * WHEN an array field has invalid items, THE Validation_System SHALL report
   * the index of each invalid item with its specific error
   */
  describe("Requirement 2.7: Array item errors", () => {
    it("should report index of invalid array item", () => {
      const schema = z.object({
        scores: z.array(z.number().min(0).max(100)),
      });

      const result = schema.safeParse({ scores: [85, 150, 90] }); // 150 is invalid
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { scores: [85, 150, 90] });
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("scores[1]");
        expect(errors[0].code).toBe("NUMBER_TOO_LARGE");
        expect(errors[0].actualValue).toBe(150);
      }
    });

    it("should report multiple invalid array items", () => {
      const schema = z.object({
        values: z.array(z.number().positive()),
      });

      const result = schema.safeParse({ values: [1, -2, 3, -4, 5] });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { values: [1, -2, 3, -4, 5] });
        expect(errors).toHaveLength(2);
        expect(errors.map((e) => e.path)).toContain("values[1]");
        expect(errors.map((e) => e.path)).toContain("values[3]");
      }
    });

    it("should report type errors in array items", () => {
      const schema = z.object({
        names: z.array(z.string()),
      });

      const result = schema.safeParse({ names: ["Alice", 123, "Bob"] });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { names: ["Alice", 123, "Bob"] });
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("names[1]");
        expect(errors[0].code).toBe("TYPE_MISMATCH");
      }
    });

    it("should report nested object errors in array items", () => {
      const schema = z.object({
        users: z.array(
          z.object({
            name: z.string(),
            age: z.number().min(0),
          })
        ),
      });

      const result = schema.safeParse({
        users: [
          { name: "Alice", age: 25 },
          { name: "Bob", age: -5 }, // invalid age
          { name: "Charlie", age: 30 },
        ],
      });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, {
          users: [
            { name: "Alice", age: 25 },
            { name: "Bob", age: -5 },
            { name: "Charlie", age: 30 },
          ],
        });
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("users[1].age");
        expect(errors[0].code).toBe("NUMBER_TOO_SMALL");
      }
    });

    it("should report array length errors (too few items)", () => {
      const schema = z.object({
        tags: z.array(z.string()).min(3),
      });

      const result = schema.safeParse({ tags: ["one", "two"] });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { tags: ["one", "two"] });
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("tags");
      }
    });

    it("should report array length errors (too many items)", () => {
      const schema = z.object({
        options: z.array(z.string()).max(3),
      });

      const result = schema.safeParse({ options: ["a", "b", "c", "d", "e"] });
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = transformer.transform(result.error, { options: ["a", "b", "c", "d", "e"] });
        expect(errors).toHaveLength(1);
        expect(errors[0].path).toBe("options");
      }
    });
  });
});
