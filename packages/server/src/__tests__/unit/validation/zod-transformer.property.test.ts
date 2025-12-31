/**
 * ZodErrorTransformer Property-Based Tests
 *
 * Property tests for Zod error transformation functionality using fast-check.
 * Tests universal properties that should hold for all valid inputs.
 *
 * Property 16: Zod Error Transformation
 * For any ZodError with N issues, the transformation SHALL produce N FieldErrors
 * with preserved path information and extracted constraint details.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { ValidationErrorCode } from "../../../validation/types.js";
import { ZodErrorTransformer } from "../../../validation/zod-transformer.js";

describe("ZodErrorTransformer Property Tests", () => {
  const transformer = new ZodErrorTransformer();

  /**
   * Property 16: Zod Error Transformation
   *
   * For any ZodError with N issues, the transformation SHALL produce N FieldErrors
   * with preserved path information and extracted constraint details.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
   */
  describe("Property 16: Zod Error Transformation", () => {
    // Valid error codes that should be produced
    const validErrorCodes: ValidationErrorCode[] = [
      "FIELD_REQUIRED",
      "STRING_TOO_SHORT",
      "STRING_TOO_LONG",
      "NUMBER_TOO_SMALL",
      "NUMBER_TOO_LARGE",
      "PATTERN_MISMATCH",
      "TYPE_MISMATCH",
      "INVALID_ENUM_VALUE",
      "INVALID_FORMAT",
      "ARRAY_ITEM_INVALID",
      "CUSTOM_VALIDATION_FAILED",
    ];

    // Reserved property names that can cause issues with object handling
    const reservedPropertyNames = [
      "valueOf",
      "toString",
      "hasOwnProperty",
      "constructor",
      "prototype",
      "__proto__",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
    ];

    /**
     * Property: For any schema with N validation failures, transform produces exactly N FieldErrors
     * Requirements: 7.1, 7.2
     */
    it("should produce exactly N FieldErrors for N Zod issues", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          (minLength, fieldNames) => {
            // Create unique field names, filtering out reserved property names
            const uniqueFields = [...new Set(fieldNames)]
              .filter(
                (f) =>
                  f.trim().length > 0 &&
                  !reservedPropertyNames.includes(f) &&
                  !reservedPropertyNames.includes(f.toLowerCase())
              )
              .slice(0, 5);
            if (uniqueFields.length === 0) return true;

            // Build schema with minLength constraint for each field
            const schemaShape: Record<string, z.ZodString> = {};
            const input: Record<string, string> = {};

            for (const field of uniqueFields) {
              schemaShape[field] = z.string().min(minLength + 5); // Ensure failure
              input[field] = "a"; // Too short
            }

            const schema = z.object(schemaShape);
            const result = schema.safeParse(input);

            if (!result.success) {
              const errors = transformer.transform(result.error, input);
              // Should have exactly as many errors as fields
              expect(errors.length).toBe(uniqueFields.length);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: All transformed errors have complete structure
     * Requirements: 7.1
     */
    it("should produce FieldErrors with all required fields", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.integer({ min: 5, max: 20 }),
          (fieldName, minLength) => {
            // Filter to valid identifier
            const validField = fieldName.replace(/[^a-zA-Z0-9]/g, "");
            if (validField.length === 0 || !/^[a-zA-Z]/.test(validField)) return true;

            const schema = z.object({
              [validField]: z.string().min(minLength),
            });

            const input = { [validField]: "a" }; // Too short
            const result = schema.safeParse(input);

            if (!result.success) {
              const errors = transformer.transform(result.error, input);

              for (const error of errors) {
                // Check all required fields exist
                expect(error).toHaveProperty("code");
                expect(error).toHaveProperty("message");
                expect(error).toHaveProperty("path");
                expect(error).toHaveProperty("constraint");
                expect(error).toHaveProperty("actualValue");
                expect(error).toHaveProperty("expected");
                expect(error).toHaveProperty("suggestion");

                // Check code is valid
                expect(validErrorCodes).toContain(error.code);

                // Check message is non-empty string
                expect(typeof error.message).toBe("string");
                expect(error.message.length).toBeGreaterThan(0);

                // Check path is string
                expect(typeof error.path).toBe("string");

                // Check suggestion is non-empty string
                expect(typeof error.suggestion).toBe("string");
                expect(error.suggestion.length).toBeGreaterThan(0);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Path information is preserved from Zod issues
     * Requirements: 7.3
     */
    it("should preserve path information for nested fields", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
          (pathSegments) => {
            // Filter to valid identifiers
            const validSegments = pathSegments
              .map((s) => s.replace(/[^a-zA-Z0-9]/g, ""))
              .filter((s) => s.length > 0 && /^[a-zA-Z]/.test(s));

            if (validSegments.length === 0) return true;

            // Build nested schema
            let schema: z.ZodTypeAny = z.string().min(100); // Will fail
            for (let i = validSegments.length - 1; i >= 0; i--) {
              schema = z.object({ [validSegments[i]]: schema });
            }

            // Build nested input
            let input: unknown = "a"; // Too short
            for (let i = validSegments.length - 1; i >= 0; i--) {
              input = { [validSegments[i]]: input };
            }

            const result = (schema as z.ZodObject<z.ZodRawShape>).safeParse(input);

            if (!result.success) {
              const errors = transformer.transform(result.error, input);
              expect(errors.length).toBeGreaterThan(0);

              // Path should contain all segments with dot notation
              const expectedPath = validSegments.join(".");
              expect(errors[0].path).toBe(expectedPath);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Array index paths use bracket notation
     * Requirements: 7.3
     */
    it("should format array index paths with bracket notation", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10 }), (arrayIndex) => {
          const schema = z.object({
            items: z.array(z.string().min(100)), // Will fail
          });

          // Create array with valid strings, except one at the specified index
          const validString = "a".repeat(150); // Long enough to pass
          const items = Array(arrayIndex + 1).fill(validString);
          items[arrayIndex] = "a"; // Too short - only this one fails

          const input = { items };
          const result = schema.safeParse(input);

          if (!result.success) {
            const errors = transformer.transform(result.error, input);
            expect(errors.length).toBe(1);

            // Path should use bracket notation for array index
            expect(errors[0].path).toBe(`items[${arrayIndex}]`);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Constraint details are extracted correctly for minLength
     * Requirements: 7.4
     */
    it("should extract minLength constraint details correctly", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (minLength) => {
          const schema = z.string().min(minLength);
          const result = schema.safeParse(""); // Empty string, always too short

          if (!result.success) {
            const errors = transformer.transform(result.error, "");
            expect(errors.length).toBe(1);
            expect(errors[0].expected.type).toBe("minLength");

            if (errors[0].expected.type === "minLength") {
              expect(errors[0].expected.minLength).toBe(minLength);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Constraint details are extracted correctly for maxLength
     * Requirements: 7.4
     */
    it("should extract maxLength constraint details correctly", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 50 }), (maxLength) => {
          const schema = z.string().max(maxLength);
          const longString = "a".repeat(maxLength + 10); // Always too long
          const result = schema.safeParse(longString);

          if (!result.success) {
            const errors = transformer.transform(result.error, longString);
            expect(errors.length).toBe(1);
            expect(errors[0].expected.type).toBe("maxLength");

            if (errors[0].expected.type === "maxLength") {
              expect(errors[0].expected.maxLength).toBe(maxLength);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Constraint details are extracted correctly for minValue
     * Requirements: 7.4
     */
    it("should extract minValue constraint details correctly", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (minValue) => {
          const schema = z.number().min(minValue);
          const result = schema.safeParse(minValue - 1); // Just below minimum

          if (!result.success) {
            const errors = transformer.transform(result.error, minValue - 1);
            expect(errors.length).toBe(1);
            expect(errors[0].expected.type).toBe("minValue");

            if (errors[0].expected.type === "minValue") {
              expect(errors[0].expected.minValue).toBe(minValue);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Constraint details are extracted correctly for maxValue
     * Requirements: 7.4
     */
    it("should extract maxValue constraint details correctly", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1000 }), (maxValue) => {
          const schema = z.number().max(maxValue);
          const result = schema.safeParse(maxValue + 1); // Just above maximum

          if (!result.success) {
            const errors = transformer.transform(result.error, maxValue + 1);
            expect(errors.length).toBe(1);
            expect(errors[0].expected.type).toBe("maxValue");

            if (errors[0].expected.type === "maxValue") {
              expect(errors[0].expected.maxValue).toBe(maxValue);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Enum constraint includes all valid values
     * Requirements: 7.4
     */
    it("should extract enum constraint with all valid values", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
          (enumValues) => {
            // Filter to unique, valid enum values
            const uniqueValues = [...new Set(enumValues)].filter((v) => v.length > 0);
            if (uniqueValues.length < 2) return true;

            const schema = z.enum(uniqueValues as [string, ...string[]]);
            const invalidValue = `definitely_not_in_enum_${Date.now()}`;
            const result = schema.safeParse(invalidValue);

            if (!result.success) {
              const errors = transformer.transform(result.error, invalidValue);
              expect(errors.length).toBe(1);
              expect(errors[0].expected.type).toBe("enum");

              if (errors[0].expected.type === "enum") {
                // All valid values should be included
                for (const value of uniqueValues) {
                  expect(errors[0].expected.validValues).toContain(value);
                }
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Type mismatch errors include expected and actual types
     * Requirements: 7.4
     */
    it("should extract type constraint with expected and actual types", () => {
      const typeSchemas = [
        { schema: z.string(), invalidValue: 123, expectedType: "string", actualType: "number" },
        { schema: z.number(), invalidValue: "abc", expectedType: "number", actualType: "string" },
        {
          schema: z.boolean(),
          invalidValue: "true",
          expectedType: "boolean",
          actualType: "string",
        },
        {
          schema: z.array(z.string()),
          invalidValue: "not array",
          expectedType: "array",
          actualType: "string",
        },
      ];

      fc.assert(
        fc.property(fc.integer({ min: 0, max: typeSchemas.length - 1 }), (index) => {
          const { schema, invalidValue, expectedType, actualType } = typeSchemas[index];
          const result = schema.safeParse(invalidValue);

          if (!result.success) {
            const errors = transformer.transform(result.error, invalidValue);
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("TYPE_MISMATCH");
            expect(errors[0].expected.type).toBe("type");

            if (errors[0].expected.type === "type") {
              expect(errors[0].expected.expectedType).toBe(expectedType);
              expect(errors[0].expected.actualType).toBe(actualType);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Required field errors are correctly identified
     * Requirements: 7.4
     */
    it("should identify required field errors correctly", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 5 }),
          (fieldNames) => {
            // Filter to valid identifiers and exclude reserved names
            const validFields = [...new Set(fieldNames)]
              .map((s) => s.replace(/[^a-zA-Z0-9]/g, ""))
              .filter(
                (s) =>
                  s.length > 0 &&
                  /^[a-zA-Z]/.test(s) &&
                  !reservedPropertyNames.includes(s) &&
                  !reservedPropertyNames.includes(s.toLowerCase())
              );

            if (validFields.length === 0) return true;

            // Build schema with required fields
            const schemaShape: Record<string, z.ZodString> = {};
            for (const field of validFields) {
              schemaShape[field] = z.string();
            }

            const schema = z.object(schemaShape);
            const result = schema.safeParse({}); // Empty object, all fields missing

            if (!result.success) {
              const errors = transformer.transform(result.error, {});

              // All errors should be FIELD_REQUIRED
              for (const error of errors) {
                expect(error.code).toBe("FIELD_REQUIRED");
                expect(error.constraint).toBe("required");
                expect(error.expected.type).toBe("required");
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Custom refinement errors are handled
     * Requirements: 7.5
     */
    it("should handle custom Zod refinements", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 50 }), (customMessage) => {
          const schema = z.string().refine(() => false, { message: customMessage });
          const result = schema.safeParse("any value");

          if (!result.success) {
            const errors = transformer.transform(result.error, "any value");
            expect(errors.length).toBe(1);
            expect(errors[0].code).toBe("CUSTOM_VALIDATION_FAILED");
            expect(errors[0].constraint).toBe("custom");
            expect(errors[0].message).toBe(customMessage);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
