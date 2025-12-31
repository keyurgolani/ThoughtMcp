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
