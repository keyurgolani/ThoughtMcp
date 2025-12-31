/**
 * RESTFormatter Unit Tests
 *
 * Tests for REST API error formatting functionality including:
 * - ValidationResult to RESTValidationErrorResponse transformation
 * - Field error mapping to details.fields
 * - Metadata inclusion (requestId, timestamp, validationTimeMs)
 * - Backward compatibility with existing error structure
 *
 * Requirements: 4.1, 4.4, 4.5, 8.1, 8.3, 8.4
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  createRESTFormatter,
  RESTFormatter,
} from "../../../../validation/formatters/rest-formatter.js";
import type {
  FieldError,
  ValidationContext,
  ValidationResult,
} from "../../../../validation/types.js";

describe("RESTFormatter", () => {
  let formatter: RESTFormatter;

  // Helper to create a valid FieldError
  const createFieldError = (
    path: string,
    message: string,
    options?: Partial<FieldError>
  ): FieldError => ({
    code: "FIELD_REQUIRED",
    message,
    path,
    constraint: "required",
    actualValue: undefined,
    expected: { type: "required" },
    suggestion: `Please provide a value for ${path}`,
    ...options,
  });

  // Helper to create a ValidationContext
  const createContext = (overrides?: Partial<ValidationContext>): ValidationContext => ({
    endpoint: "/api/test",
    operation: "create",
    requestId: "test-request-123",
    timestamp: new Date("2024-01-15T10:30:00Z"),
    ...overrides,
  });

  // Helper to create a ValidationResult
  const createValidationResult = (
    errors: FieldError[],
    contextOverrides?: Partial<ValidationContext>
  ): ValidationResult => ({
    valid: errors.length === 0,
    errors,
    context: createContext(contextOverrides),
    validationTimeMs: 5.5,
  });

  beforeEach(() => {
    formatter = new RESTFormatter();
  });

  describe("format()", () => {
    it("should format a validation result with no errors", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.success).toBe(false);
      expect(response.error).toBe("Invalid request parameters");
      expect(response.code).toBe("VALIDATION_ERROR");
      expect(response.details.fields).toEqual({});
      expect(response.details.totalErrors).toBe(0);
    });

    it("should format a validation result with a single error", () => {
      const error = createFieldError("name", "Name is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.success).toBe(false);
      expect(response.code).toBe("VALIDATION_ERROR");
      expect(response.details.totalErrors).toBe(1);
      expect(response.details.fields["name"]).toBeDefined();
      expect(response.details.fields["name"].message).toBe("Name is required");
      expect(response.details.fields["name"].code).toBe("FIELD_REQUIRED");
      expect(response.details.fields["name"].constraint).toBe("required");
    });

    it("should format a validation result with multiple errors", () => {
      const errors = [
        createFieldError("name", "Name is required"),
        createFieldError("email", "Email is required"),
        createFieldError("age", "Age must be a number", {
          code: "TYPE_MISMATCH",
          constraint: "type",
          expected: { type: "type", expectedType: "number", actualType: "string" },
        }),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.details.totalErrors).toBe(3);
      expect(Object.keys(response.details.fields)).toHaveLength(3);
      expect(response.details.fields["name"]).toBeDefined();
      expect(response.details.fields["email"]).toBeDefined();
      expect(response.details.fields["age"]).toBeDefined();
    });

    it("should include all field error details", () => {
      const error: FieldError = {
        code: "STRING_TOO_SHORT",
        message: "Name must be at least 3 characters",
        path: "name",
        constraint: "minLength",
        actualValue: "ab",
        expected: { type: "minLength", minLength: 3 },
        suggestion: "Provide a name with at least 3 characters",
      };
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      const fieldDetails = response.details.fields["name"];
      expect(fieldDetails.message).toBe("Name must be at least 3 characters");
      expect(fieldDetails.code).toBe("STRING_TOO_SHORT");
      expect(fieldDetails.constraint).toBe("minLength");
      expect(fieldDetails.expected).toEqual({ type: "minLength", minLength: 3 });
      expect(fieldDetails.suggestion).toBe("Provide a name with at least 3 characters");
    });

    it("should handle nested field paths", () => {
      const errors = [
        createFieldError("address.city", "City is required"),
        createFieldError("address.zipCode", "Zip code is required"),
        createFieldError("contacts[0].email", "Contact email is required"),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.details.fields["address.city"]).toBeDefined();
      expect(response.details.fields["address.zipCode"]).toBeDefined();
      expect(response.details.fields["contacts[0].email"]).toBeDefined();
    });
  });

  describe("metadata inclusion", () => {
    it("should include requestId from context", () => {
      const result = createValidationResult([], { requestId: "req-abc-123" });

      const response = formatter.format(result);

      expect(response.metadata.requestId).toBe("req-abc-123");
    });

    it("should include timestamp as ISO string", () => {
      const timestamp = new Date("2024-06-15T14:30:00Z");
      const result = createValidationResult([], { timestamp });

      const response = formatter.format(result);

      expect(response.metadata.timestamp).toBe("2024-06-15T14:30:00.000Z");
    });

    it("should include validationTimeMs", () => {
      const result: ValidationResult = {
        valid: true,
        errors: [],
        context: createContext(),
        validationTimeMs: 12.345,
      };

      const response = formatter.format(result);

      expect(response.metadata.validationTimeMs).toBe(12.345);
    });
  });

  describe("backward compatibility (Requirements 8.1, 8.3, 8.4)", () => {
    it("should always include success: false", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.success).toBe(false);
    });

    it("should always include error message", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.error).toBe("Invalid request parameters");
    });

    it("should always include code: VALIDATION_ERROR", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.code).toBe("VALIDATION_ERROR");
    });

    it("should include suggestion field", () => {
      const error = createFieldError("name", "Name is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.suggestion).toBeDefined();
      expect(typeof response.suggestion).toBe("string");
    });
  });

  describe("suggestion generation", () => {
    it("should use field suggestion for single error", () => {
      const error = createFieldError("name", "Name is required");
      error.suggestion = "Please provide your full name";
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.suggestion).toBe("Please provide your full name");
    });

    it("should generate summary suggestion for multiple errors", () => {
      const errors = [
        createFieldError("name", "Name is required"),
        createFieldError("email", "Email is required"),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.suggestion).toContain("name");
      expect(response.suggestion).toContain("email");
    });

    it("should provide default suggestion for no errors", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.suggestion).toBe(
        "Check that all required fields are provided with valid values"
      );
    });
  });

  describe("createRESTFormatter()", () => {
    it("should create a new RESTFormatter instance", () => {
      const newFormatter = createRESTFormatter();

      expect(newFormatter).toBeInstanceOf(RESTFormatter);
    });

    it("should create independent instances", () => {
      const formatter1 = createRESTFormatter();
      const formatter2 = createRESTFormatter();

      expect(formatter1).not.toBe(formatter2);
    });
  });

  describe("field error preservation (Requirements 4.4, 4.5)", () => {
    it("should preserve all field error details regardless of error type", () => {
      const errors: FieldError[] = [
        {
          code: "FIELD_REQUIRED",
          message: "Field is required",
          path: "required_field",
          constraint: "required",
          actualValue: undefined,
          expected: { type: "required" },
          suggestion: "Provide a value",
        },
        {
          code: "STRING_TOO_SHORT",
          message: "Too short",
          path: "short_field",
          constraint: "minLength",
          actualValue: "ab",
          expected: { type: "minLength", minLength: 5 },
          suggestion: "Use at least 5 characters",
        },
        {
          code: "NUMBER_TOO_LARGE",
          message: "Too large",
          path: "large_field",
          constraint: "maxValue",
          actualValue: 150,
          expected: { type: "maxValue", maxValue: 100 },
          suggestion: "Use a value <= 100",
        },
        {
          code: "INVALID_ENUM_VALUE",
          message: "Invalid enum",
          path: "enum_field",
          constraint: "enum",
          actualValue: "invalid",
          expected: { type: "enum", validValues: ["a", "b", "c"], closestMatch: "a" },
          suggestion: "Use one of: a, b, c",
        },
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      // Verify all errors are preserved
      expect(response.details.totalErrors).toBe(4);

      // Verify each error type is properly formatted
      expect(response.details.fields["required_field"].code).toBe("FIELD_REQUIRED");
      expect(response.details.fields["short_field"].code).toBe("STRING_TOO_SHORT");
      expect(response.details.fields["large_field"].code).toBe("NUMBER_TOO_LARGE");
      expect(response.details.fields["enum_field"].code).toBe("INVALID_ENUM_VALUE");

      // Verify expected constraints are preserved
      expect(response.details.fields["short_field"].expected).toEqual({
        type: "minLength",
        minLength: 5,
      });
      expect(response.details.fields["enum_field"].expected).toEqual({
        type: "enum",
        validValues: ["a", "b", "c"],
        closestMatch: "a",
      });
    });
  });
});
