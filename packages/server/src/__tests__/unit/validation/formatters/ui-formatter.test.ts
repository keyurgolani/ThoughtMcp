/**
 * UIFormatter Unit Tests
 *
 * Tests for UI error formatting functionality including:
 * - ValidationResult to UIValidationErrorResponse transformation
 * - Field ID mapping for form field highlighting
 * - Summary message generation
 * - Preservation of path, message, suggestion
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createUIFormatter, UIFormatter } from "../../../../validation/formatters/ui-formatter.js";
import type {
  FieldError,
  ValidationContext,
  ValidationResult,
} from "../../../../validation/types.js";

describe("UIFormatter", () => {
  let formatter: UIFormatter;

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
    formatter = new UIFormatter();
  });

  describe("format()", () => {
    it("should format a validation result with no errors", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.valid).toBe(false);
      expect(response.errors).toEqual([]);
      expect(response.summary).toBeDefined();
    });

    it("should format a validation result with a single error", () => {
      const error = createFieldError("name", "Name is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.valid).toBe(false);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].path).toBe("name");
      expect(response.errors[0].message).toBe("Name is required");
      expect(response.errors[0].fieldId).toBe("name");
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

      expect(response.errors).toHaveLength(3);
      expect(response.errors[0].path).toBe("name");
      expect(response.errors[1].path).toBe("email");
      expect(response.errors[2].path).toBe("age");
    });

    it("should include all required UI error properties", () => {
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

      const uiError = response.errors[0];
      expect(uiError.fieldId).toBe("name");
      expect(uiError.path).toBe("name");
      expect(uiError.message).toBe("Name must be at least 3 characters");
      expect(uiError.suggestion).toBe("Provide a name with at least 3 characters");
      expect(uiError.severity).toBe("error");
    });
  });

  describe("fieldId mapping (Requirements 4.6)", () => {
    it("should convert simple field path to fieldId", () => {
      const error = createFieldError("username", "Username is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.errors[0].fieldId).toBe("username");
    });

    it("should convert nested field path to fieldId with dashes", () => {
      const error = createFieldError("address.city", "City is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.errors[0].fieldId).toBe("address-city");
    });

    it("should convert deeply nested field path to fieldId", () => {
      const error = createFieldError("user.profile.settings.theme", "Theme is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.errors[0].fieldId).toBe("user-profile-settings-theme");
    });

    it("should convert array index path to fieldId", () => {
      const error = createFieldError("tags[0]", "Tag is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.errors[0].fieldId).toBe("tags-0");
    });

    it("should convert nested array path to fieldId", () => {
      const error = createFieldError("contacts[0].email", "Contact email is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.errors[0].fieldId).toBe("contacts-0-email");
    });

    it("should convert complex nested array path to fieldId", () => {
      const error = createFieldError("metadata.tags[2].value", "Tag value is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.errors[0].fieldId).toBe("metadata-tags-2-value");
    });

    it("should handle multiple array indices in path", () => {
      const error = createFieldError("matrix[0][1]", "Matrix value is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.errors[0].fieldId).toBe("matrix-0-1");
    });
  });

  describe("summary message generation (Requirements 4.3)", () => {
    it("should generate default summary for no errors", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.summary).toBe("Please check your input and try again");
    });

    it("should generate field-specific summary for single error", () => {
      const error = createFieldError("email", "Email is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.summary).toContain("email");
      expect(response.summary).toContain("field");
    });

    it("should generate count-based summary for multiple errors", () => {
      const errors = [
        createFieldError("name", "Name is required"),
        createFieldError("email", "Email is required"),
        createFieldError("age", "Age is required"),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.summary).toContain("3");
      expect(response.summary).toContain("validation errors");
    });

    it("should format camelCase field names in summary", () => {
      const error = createFieldError("firstName", "First name is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.summary).toContain("first name");
    });

    it("should format nested field names in summary", () => {
      const error = createFieldError("address.zipCode", "Zip code is required");
      const result = createValidationResult([error]);

      const response = formatter.format(result);

      expect(response.summary).toContain("zip code");
    });
  });

  describe("UI response structure (Requirements 4.3)", () => {
    it("should always include valid: false", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(response.valid).toBe(false);
    });

    it("should always include errors array", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(Array.isArray(response.errors)).toBe(true);
    });

    it("should always include summary string", () => {
      const result = createValidationResult([]);

      const response = formatter.format(result);

      expect(typeof response.summary).toBe("string");
      expect(response.summary.length).toBeGreaterThan(0);
    });

    it("should set severity to error for all validation errors", () => {
      const errors = [
        createFieldError("name", "Name is required"),
        createFieldError("email", "Email is invalid", {
          code: "PATTERN_MISMATCH",
          constraint: "pattern",
        }),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.errors[0].severity).toBe("error");
      expect(response.errors[1].severity).toBe("error");
    });
  });

  describe("createUIFormatter()", () => {
    it("should create a new UIFormatter instance", () => {
      const newFormatter = createUIFormatter();

      expect(newFormatter).toBeInstanceOf(UIFormatter);
    });

    it("should create independent instances", () => {
      const formatter1 = createUIFormatter();
      const formatter2 = createUIFormatter();

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
      expect(response.errors).toHaveLength(4);

      // Verify paths are preserved
      expect(response.errors[0].path).toBe("required_field");
      expect(response.errors[1].path).toBe("short_field");
      expect(response.errors[2].path).toBe("large_field");
      expect(response.errors[3].path).toBe("enum_field");

      // Verify messages are preserved
      expect(response.errors[0].message).toBe("Field is required");
      expect(response.errors[1].message).toBe("Too short");
      expect(response.errors[2].message).toBe("Too large");
      expect(response.errors[3].message).toBe("Invalid enum");

      // Verify suggestions are preserved
      expect(response.errors[0].suggestion).toBe("Provide a value");
      expect(response.errors[1].suggestion).toBe("Use at least 5 characters");
      expect(response.errors[2].suggestion).toBe("Use a value <= 100");
      expect(response.errors[3].suggestion).toBe("Use one of: a, b, c");
    });

    it("should preserve field order from input errors", () => {
      const errors = [
        createFieldError("z_field", "Z field error"),
        createFieldError("a_field", "A field error"),
        createFieldError("m_field", "M field error"),
      ];
      const result = createValidationResult(errors);

      const response = formatter.format(result);

      expect(response.errors[0].path).toBe("z_field");
      expect(response.errors[1].path).toBe("a_field");
      expect(response.errors[2].path).toBe("m_field");
    });
  });
});
