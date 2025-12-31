/**
 * MCPFormatter Unit Tests
 *
 * Tests for MCP tool error formatting functionality including:
 * - ValidationResult to MCPValidationErrorResponse transformation
 * - Field error mapping to fieldErrors array
 * - Preservation of path, message, code, expected, suggestion
 *
 * Requirements: 4.2, 4.4, 4.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  createMCPFormatter,
  MCPFormatter,
} from "../../../../validation/formatters/mcp-formatter.js";
import type {
  FieldError,
  ValidationContext,
  ValidationResult,
} from "../../../../validation/types.js";

describe("MCPFormatter", () => {
  let formatter: MCPFormatter;

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
    formatter = new MCPFormatter();
  });

  describe("format()", () => {
    it("should format a validation result with no errors", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.success).toBe(false);
      expect(response.error).toBe("Invalid request parameters");
      expect(response.code).toBe("VALIDATION_ERROR");
      expect(response.fieldErrors).toEqual([]);
    });

    it("should format a validation result with a single error", () => {
      const error = createFieldError("name", "Name is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.success).toBe(false);
      expect(response.code).toBe("VALIDATION_ERROR");
      expect(response.fieldErrors).toHaveLength(1);
      expect(response.fieldErrors[0].path).toBe("name");
      expect(response.fieldErrors[0].message).toBe("Name is required");
      expect(response.fieldErrors[0].code).toBe("FIELD_REQUIRED");
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

      expect(response.fieldErrors).toHaveLength(3);
      expect(response.fieldErrors[0].path).toBe("name");
      expect(response.fieldErrors[1].path).toBe("email");
      expect(response.fieldErrors[2].path).toBe("age");
    });

    it("should include all required field error properties", () => {
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

      const fieldError = response.fieldErrors[0];
      expect(fieldError.path).toBe("name");
      expect(fieldError.message).toBe("Name must be at least 3 characters");
      expect(fieldError.code).toBe("STRING_TOO_SHORT");
      expect(fieldError.expected).toEqual({ type: "minLength", minLength: 3 });
      expect(fieldError.suggestion).toBe("Provide a name with at least 3 characters");
    });

    it("should handle nested field paths", () => {
      const errors = [
        createFieldError("address.city", "City is required"),
        createFieldError("address.zipCode", "Zip code is required"),
        createFieldError("contacts[0].email", "Contact email is required"),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.fieldErrors[0].path).toBe("address.city");
      expect(response.fieldErrors[1].path).toBe("address.zipCode");
      expect(response.fieldErrors[2].path).toBe("contacts[0].email");
    });
  });

  describe("MCP response structure (Requirements 4.2)", () => {
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

    it("should include fieldErrors array", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(Array.isArray(response.fieldErrors)).toBe(true);
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

  describe("createMCPFormatter()", () => {
    it("should create a new MCPFormatter instance", () => {
      const newFormatter = createMCPFormatter();

      expect(newFormatter).toBeInstanceOf(MCPFormatter);
    });

    it("should create independent instances", () => {
      const formatter1 = createMCPFormatter();
      const formatter2 = createMCPFormatter();

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
      expect(response.fieldErrors).toHaveLength(4);

      // Verify each error type is properly formatted
      expect(response.fieldErrors[0].code).toBe("FIELD_REQUIRED");
      expect(response.fieldErrors[1].code).toBe("STRING_TOO_SHORT");
      expect(response.fieldErrors[2].code).toBe("NUMBER_TOO_LARGE");
      expect(response.fieldErrors[3].code).toBe("INVALID_ENUM_VALUE");

      // Verify expected constraints are preserved
      expect(response.fieldErrors[1].expected).toEqual({
        type: "minLength",
        minLength: 5,
      });
      expect(response.fieldErrors[3].expected).toEqual({
        type: "enum",
        validValues: ["a", "b", "c"],
        closestMatch: "a",
      });
    });

    it("should preserve field order from input errors", () => {
      const errors = [
        createFieldError("z_field", "Z field error"),
        createFieldError("a_field", "A field error"),
        createFieldError("m_field", "M field error"),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.fieldErrors[0].path).toBe("z_field");
      expect(response.fieldErrors[1].path).toBe("a_field");
      expect(response.fieldErrors[2].path).toBe("m_field");
    });
  });
});
