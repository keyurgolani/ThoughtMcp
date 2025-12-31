/**
 * RESTFormatter Property-Based Tests
 *
 * Property tests for REST API error formatting functionality using fast-check.
 * Tests universal properties that should hold for all valid inputs.
 *
 * Property 10: Interface Format Consistency (REST)
 * Property 17: Backward Compatibility
 *
 * Requirements: 4.1, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { RESTFormatter } from "../../../../validation/formatters/rest-formatter.js";
import type {
  ConstraintType,
  ExpectedConstraint,
  FieldError,
  ValidationContext,
  ValidationErrorCode,
  ValidationResult,
} from "../../../../validation/types.js";

// Arbitraries for generating test data
const validationErrorCodeArb: fc.Arbitrary<ValidationErrorCode> = fc.constantFrom(
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
  "CUSTOM_VALIDATION_FAILED"
);

const constraintTypeArb: fc.Arbitrary<ConstraintType> = fc.constantFrom(
  "required",
  "minLength",
  "maxLength",
  "minValue",
  "maxValue",
  "pattern",
  "type",
  "enum",
  "format",
  "custom"
);

const expectedConstraintArb: fc.Arbitrary<ExpectedConstraint> = fc.oneof(
  fc.constant({ type: "required" as const }),
  fc.record({
    type: fc.constant("minLength" as const),
    minLength: fc.integer({ min: 1, max: 1000 }),
  }),
  fc.record({
    type: fc.constant("maxLength" as const),
    maxLength: fc.integer({ min: 1, max: 1000 }),
  }),
  fc.record({
    type: fc.constant("minValue" as const),
    minValue: fc.integer({ min: -1000, max: 1000 }),
  }),
  fc.record({
    type: fc.constant("maxValue" as const),
    maxValue: fc.integer({ min: -1000, max: 1000 }),
  }),
  fc.record({
    type: fc.constant("range" as const),
    minValue: fc.integer({ min: -1000, max: 0 }),
    maxValue: fc.integer({ min: 1, max: 1000 }),
  }),
  fc.record({
    type: fc.constant("pattern" as const),
    pattern: fc.string({ minLength: 1, maxLength: 50 }),
    example: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  fc.record({
    type: fc.constant("type" as const),
    expectedType: fc.constantFrom("string", "number", "boolean", "object", "array"),
    actualType: fc.constantFrom("string", "number", "boolean", "object", "array", "undefined"),
  }),
  fc.record({
    type: fc.constant("enum" as const),
    validValues: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
      minLength: 1,
      maxLength: 5,
    }),
    closestMatch: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  }),
  fc.record({
    type: fc.constant("format" as const),
    format: fc.constantFrom("email", "url", "uuid", "date", "json"),
    example: fc.string({ minLength: 1, maxLength: 50 }),
  }),
  fc.record({
    type: fc.constant("custom" as const),
    description: fc.string({ minLength: 1, maxLength: 100 }),
  })
);

const validationContextArb: fc.Arbitrary<ValidationContext> = fc.record({
  endpoint: fc.string({ minLength: 1, maxLength: 50 }),
  operation: fc.constantFrom("create", "update", "delete", "read", "validate"),
  userId: fc.option(fc.uuid(), { nil: undefined }),
  requestId: fc.uuid(),
  // Use integer timestamps to avoid invalid dates
  timestamp: fc
    .integer({ min: new Date("2020-01-01").getTime(), max: new Date("2030-01-01").getTime() })
    .map((ts) => new Date(ts)),
});

// Generate unique field errors (no duplicate paths)
const uniqueFieldErrorsArb = (count: number): fc.Arbitrary<FieldError[]> => {
  if (count === 0) return fc.constant([]);

  return fc
    .array(
      fc.record({
        code: validationErrorCodeArb,
        message: fc.string({ minLength: 1, maxLength: 200 }),
        constraint: constraintTypeArb,
        actualValue: fc.oneof(
          fc.string({ maxLength: 100 }),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined)
        ),
        expected: expectedConstraintArb,
        suggestion: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      { minLength: count, maxLength: count }
    )
    .map((errors) =>
      // Assign unique paths to each error
      errors.map((error, index) => ({
        ...error,
        path: `field${index}`,
      }))
    );
};

const validationResultArb: fc.Arbitrary<ValidationResult> = fc
  .tuple(
    fc.integer({ min: 0, max: 10 }),
    validationContextArb,
    fc.double({ min: 0, max: 100, noNaN: true })
  )
  .chain(([errorCount, context, validationTimeMs]) =>
    uniqueFieldErrorsArb(errorCount).map((errors) => ({
      valid: errors.length === 0,
      errors,
      context,
      validationTimeMs,
    }))
  );

describe("RESTFormatter Property Tests", () => {
  const formatter = new RESTFormatter();

  describe("Property 10: Interface Format Consistency (REST)", () => {
    /**
     * Property 10: Interface Format Consistency
     * For any ValidationResult, formatting for REST interface SHALL preserve
     * all field error details while adapting the structure to interface conventions.
     *
     * Validates: Requirements 4.1, 4.4, 4.5
     */
    it("should preserve all field error details in REST format", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Verify all errors are preserved
          expect(response.details.totalErrors).toBe(result.errors.length);

          // Verify each field error is preserved with all details
          for (const error of result.errors) {
            const fieldDetails = response.details.fields[error.path];
            expect(fieldDetails).toBeDefined();
            expect(fieldDetails.message).toBe(error.message);
            expect(fieldDetails.code).toBe(error.code);
            expect(fieldDetails.constraint).toBe(error.constraint);
            expect(fieldDetails.expected).toEqual(error.expected);
            expect(fieldDetails.suggestion).toBe(error.suggestion);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should include all required response fields", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Verify required top-level fields
          expect(response).toHaveProperty("success");
          expect(response).toHaveProperty("error");
          expect(response).toHaveProperty("code");
          expect(response).toHaveProperty("suggestion");
          expect(response).toHaveProperty("details");
          expect(response).toHaveProperty("metadata");

          // Verify details structure
          expect(response.details).toHaveProperty("fields");
          expect(response.details).toHaveProperty("totalErrors");

          // Verify metadata structure
          expect(response.metadata).toHaveProperty("requestId");
          expect(response.metadata).toHaveProperty("timestamp");
          expect(response.metadata).toHaveProperty("validationTimeMs");
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve metadata from validation context", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Verify metadata is preserved
          expect(response.metadata.requestId).toBe(result.context.requestId);
          expect(response.metadata.timestamp).toBe(result.context.timestamp.toISOString());
          expect(response.metadata.validationTimeMs).toBe(result.validationTimeMs);
        }),
        { numRuns: 100 }
      );
    });

    it("should map field paths correctly to fields object keys", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Verify field paths are used as keys
          const expectedPaths = result.errors.map((e) => e.path);
          const actualPaths = Object.keys(response.details.fields);

          expect(actualPaths.sort()).toEqual(expectedPaths.sort());
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Property 17: Backward Compatibility", () => {
    /**
     * Property 17: Backward Compatibility
     * For any validation error, the response SHALL include the existing error
     * structure (success: false, error: string, code: "VALIDATION_ERROR")
     * alongside enhanced details, and HTTP status SHALL remain 400.
     *
     * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
     */
    it("should always include success: false for backward compatibility", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Requirement 8.1: Continue to return existing error response structure
          expect(response.success).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("should always include error message string for backward compatibility", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Requirement 8.1, 8.5: Preserve existing error messages
          expect(typeof response.error).toBe("string");
          expect(response.error.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should always include code: VALIDATION_ERROR for backward compatibility", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Requirement 8.4: Not change existing error code values
          expect(response.code).toBe("VALIDATION_ERROR");
        }),
        { numRuns: 100 }
      );
    });

    it("should always include suggestion field for backward compatibility", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Requirement 8.1: Continue to return existing error response structure
          expect(typeof response.suggestion).toBe("string");
          expect(response.suggestion.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should include enhanced details alongside basic error structure", () => {
      fc.assert(
        fc.property(validationResultArb, (result) => {
          const response = formatter.format(result);

          // Requirement 8.2: When details field is requested, include enhanced details
          // The details field provides enhanced information while maintaining backward compatibility
          expect(response.details).toBeDefined();
          expect(typeof response.details.totalErrors).toBe("number");
          expect(typeof response.details.fields).toBe("object");
        }),
        { numRuns: 100 }
      );
    });

    it("should maintain consistent response structure regardless of error count", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          validationContextArb,
          (errorCount, context) => {
            // Generate specific number of errors
            const errors: FieldError[] = [];
            for (let i = 0; i < errorCount; i++) {
              errors.push({
                code: "FIELD_REQUIRED",
                message: `Field ${i} is required`,
                path: `field${i}`,
                constraint: "required",
                actualValue: undefined,
                expected: { type: "required" },
                suggestion: `Provide a value for field${i}`,
              });
            }

            const result: ValidationResult = {
              valid: errors.length === 0,
              errors,
              context,
              validationTimeMs: 5.0,
            };

            const response = formatter.format(result);

            // Structure should be consistent regardless of error count
            expect(response.success).toBe(false);
            expect(response.code).toBe("VALIDATION_ERROR");
            expect(typeof response.error).toBe("string");
            expect(typeof response.suggestion).toBe("string");
            expect(response.details.totalErrors).toBe(errorCount);
            expect(Object.keys(response.details.fields).length).toBe(errorCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
