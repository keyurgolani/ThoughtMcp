/**
 * ValidationResult Serialization Unit Tests
 *
 * Tests for JSON serialization and deserialization of ValidationResult objects.
 * Verifies full round-trip capability with no data loss.
 *
 * Requirements: 6.1, 6.4, 6.5
 */

import { describe, expect, it } from "vitest";
import {
  parseValidationResult,
  stringifyValidationResult,
  validationResultFromJSON,
  validationResultToJSON,
} from "../../../validation/serialization.js";
import type { FieldError, ValidationContext, ValidationResult } from "../../../validation/types.js";

describe("ValidationResult Serialization", () => {
  // Helper to create a valid FieldError
  const createFieldError = (path: string, message: string): FieldError => ({
    code: "FIELD_REQUIRED",
    message,
    path,
    constraint: "required",
    actualValue: undefined,
    expected: { type: "required" },
    suggestion: `Please provide a value for ${path}`,
  });

  // Helper to create a ValidationContext
  const createContext = (overrides?: Partial<ValidationContext>): ValidationContext => ({
    endpoint: "/api/test",
    operation: "create",
    requestId: "test-request-123",
    timestamp: new Date("2024-01-15T10:30:00.000Z"),
    ...overrides,
  });

  // Helper to create a ValidationResult
  const createValidationResult = (
    valid: boolean,
    errors: FieldError[] = [],
    contextOverrides?: Partial<ValidationContext>
  ): ValidationResult => ({
    valid,
    errors,
    context: createContext(contextOverrides),
    validationTimeMs: 5.5,
  });

  describe("validationResultToJSON()", () => {
    it("should serialize a valid ValidationResult with no errors", () => {
      const result = createValidationResult(true);
      const serialized = validationResultToJSON(result);

      expect(serialized.valid).toBe(true);
      expect(serialized.errors).toEqual([]);
      expect(serialized.validationTimeMs).toBe(5.5);
    });

    it("should serialize timestamp as ISO 8601 string", () => {
      const result = createValidationResult(true);
      const serialized = validationResultToJSON(result);

      expect(serialized.context.timestamp).toBe("2024-01-15T10:30:00.000Z");
      expect(serialized.timestamp).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should include requestId at top level (Requirement 6.4)", () => {
      const result = createValidationResult(true, [], { requestId: "req-456" });
      const serialized = validationResultToJSON(result);

      expect(serialized.requestId).toBe("req-456");
      expect(serialized.context.requestId).toBe("req-456");
    });

    it("should include timestamp at top level (Requirement 6.4)", () => {
      const result = createValidationResult(true);
      const serialized = validationResultToJSON(result);

      expect(serialized.timestamp).toBe(serialized.context.timestamp);
    });

    it("should serialize field errors with all properties", () => {
      const error: FieldError = {
        code: "STRING_TOO_SHORT",
        message: "Name is too short",
        path: "user.name",
        constraint: "minLength",
        actualValue: "ab",
        expected: { type: "minLength", minLength: 3 },
        suggestion: "Name must be at least 3 characters",
      };
      const result = createValidationResult(false, [error]);
      const serialized = validationResultToJSON(result);

      expect(serialized.errors).toHaveLength(1);
      expect(serialized.errors[0]).toEqual({
        code: "STRING_TOO_SHORT",
        message: "Name is too short",
        path: "user.name",
        constraint: "minLength",
        actualValue: "ab",
        expected: { type: "minLength", minLength: 3 },
        suggestion: "Name must be at least 3 characters",
      });
    });

    it("should serialize multiple errors", () => {
      const errors = [
        createFieldError("name", "Name is required"),
        createFieldError("email", "Email is required"),
        createFieldError("age", "Age is required"),
      ];
      const result = createValidationResult(false, errors);
      const serialized = validationResultToJSON(result);

      expect(serialized.errors).toHaveLength(3);
    });

    it("should include userId when present", () => {
      const result = createValidationResult(true, [], { userId: "user-789" });
      const serialized = validationResultToJSON(result);

      expect(serialized.context.userId).toBe("user-789");
    });

    it("should not include userId when not present", () => {
      const result = createValidationResult(true);
      const serialized = validationResultToJSON(result);

      expect(serialized.context.userId).toBeUndefined();
    });

    it("should serialize actualValue with various types", () => {
      const errors: FieldError[] = [
        { ...createFieldError("field1", "Error"), actualValue: null },
        { ...createFieldError("field2", "Error"), actualValue: 42 },
        { ...createFieldError("field3", "Error"), actualValue: "string" },
        { ...createFieldError("field4", "Error"), actualValue: { nested: true } },
        { ...createFieldError("field5", "Error"), actualValue: [1, 2, 3] },
      ];
      const result = createValidationResult(false, errors);
      const serialized = validationResultToJSON(result);

      expect(serialized.errors[0].actualValue).toBeNull();
      expect(serialized.errors[1].actualValue).toBe(42);
      expect(serialized.errors[2].actualValue).toBe("string");
      expect(serialized.errors[3].actualValue).toEqual({ nested: true });
      expect(serialized.errors[4].actualValue).toEqual([1, 2, 3]);
    });

    it("should serialize different expected constraint types", () => {
      const errors: FieldError[] = [
        {
          ...createFieldError("f1", "E"),
          expected: { type: "minLength", minLength: 5 },
          constraint: "minLength",
        },
        {
          ...createFieldError("f2", "E"),
          expected: { type: "maxLength", maxLength: 100 },
          constraint: "maxLength",
        },
        {
          ...createFieldError("f3", "E"),
          expected: { type: "range", minValue: 0, maxValue: 100 },
          constraint: "minValue",
        },
        {
          ...createFieldError("f4", "E"),
          expected: { type: "pattern", pattern: "^[a-z]+$", example: "abc" },
          constraint: "pattern",
        },
        {
          ...createFieldError("f5", "E"),
          expected: { type: "enum", validValues: ["a", "b", "c"], closestMatch: "a" },
          constraint: "enum",
        },
      ];
      const result = createValidationResult(false, errors);
      const serialized = validationResultToJSON(result);

      expect(serialized.errors[0].expected).toEqual({ type: "minLength", minLength: 5 });
      expect(serialized.errors[1].expected).toEqual({ type: "maxLength", maxLength: 100 });
      expect(serialized.errors[2].expected).toEqual({ type: "range", minValue: 0, maxValue: 100 });
      expect(serialized.errors[3].expected).toEqual({
        type: "pattern",
        pattern: "^[a-z]+$",
        example: "abc",
      });
      expect(serialized.errors[4].expected).toEqual({
        type: "enum",
        validValues: ["a", "b", "c"],
        closestMatch: "a",
      });
    });
  });

  describe("validationResultFromJSON()", () => {
    it("should deserialize a valid result with no errors", () => {
      const serialized = {
        valid: true,
        errors: [],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      const result = validationResultFromJSON(serialized);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.validationTimeMs).toBe(5.5);
    });

    it("should convert timestamp string to Date object", () => {
      const serialized = {
        valid: true,
        errors: [],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      const result = validationResultFromJSON(serialized);

      expect(result.context.timestamp).toBeInstanceOf(Date);
      expect(result.context.timestamp.toISOString()).toBe("2024-01-15T10:30:00.000Z");
    });

    it("should deserialize field errors", () => {
      const serialized = {
        valid: false,
        errors: [
          {
            code: "STRING_TOO_SHORT" as const,
            message: "Name is too short",
            path: "user.name",
            constraint: "minLength" as const,
            actualValue: "ab",
            expected: { type: "minLength" as const, minLength: 3 },
            suggestion: "Name must be at least 3 characters",
          },
        ],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      const result = validationResultFromJSON(serialized);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("STRING_TOO_SHORT");
      expect(result.errors[0].path).toBe("user.name");
      expect(result.errors[0].actualValue).toBe("ab");
    });

    it("should include userId when present", () => {
      const serialized = {
        valid: true,
        errors: [],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
          userId: "user-456",
        },
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      const result = validationResultFromJSON(serialized);

      expect(result.context.userId).toBe("user-456");
    });

    it("should throw error for invalid 'valid' field", () => {
      const serialized = {
        valid: "true", // Should be boolean
        errors: [],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      expect(() => validationResultFromJSON(serialized as never)).toThrow(
        "Invalid serialized ValidationResult: 'valid' must be a boolean"
      );
    });

    it("should throw error for invalid 'errors' field", () => {
      const serialized = {
        valid: true,
        errors: "not an array",
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      expect(() => validationResultFromJSON(serialized as never)).toThrow(
        "Invalid serialized ValidationResult: 'errors' must be an array"
      );
    });

    it("should throw error for invalid 'context' field", () => {
      const serialized = {
        valid: true,
        errors: [],
        context: null,
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      expect(() => validationResultFromJSON(serialized as never)).toThrow(
        "Invalid serialized ValidationResult: 'context' must be an object"
      );
    });

    it("should throw error for invalid 'validationTimeMs' field", () => {
      const serialized = {
        valid: true,
        errors: [],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
        validationTimeMs: "5.5",
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      expect(() => validationResultFromJSON(serialized as never)).toThrow(
        "Invalid serialized ValidationResult: 'validationTimeMs' must be a number"
      );
    });

    it("should throw error for invalid timestamp", () => {
      const serialized = {
        valid: true,
        errors: [],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "not-a-date",
        },
        validationTimeMs: 5.5,
        timestamp: "not-a-date",
        requestId: "test-123",
      };

      expect(() => validationResultFromJSON(serialized)).toThrow(
        "Invalid serialized ValidationResult: 'context.timestamp' is not a valid date"
      );
    });

    it("should throw error for invalid field error structure", () => {
      const serialized = {
        valid: false,
        errors: [
          {
            code: 123, // Should be string
            message: "Error",
            path: "field",
            constraint: "required",
            actualValue: null,
            expected: { type: "required" },
            suggestion: "Fix it",
          },
        ],
        context: {
          endpoint: "/api/test",
          operation: "create",
          requestId: "test-123",
          timestamp: "2024-01-15T10:30:00.000Z",
        },
        validationTimeMs: 5.5,
        timestamp: "2024-01-15T10:30:00.000Z",
        requestId: "test-123",
      };

      expect(() => validationResultFromJSON(serialized as never)).toThrow(
        "Invalid serialized FieldError at index 0: 'code' must be a string"
      );
    });
  });

  describe("Round-trip serialization (Requirement 6.1, 6.5)", () => {
    it("should preserve all data through round-trip", () => {
      const original = createValidationResult(false, [
        {
          code: "STRING_TOO_SHORT",
          message: "Name is too short",
          path: "user.name",
          constraint: "minLength",
          actualValue: "ab",
          expected: { type: "minLength", minLength: 3 },
          suggestion: "Name must be at least 3 characters",
        },
        {
          code: "INVALID_ENUM_VALUE",
          message: "Invalid status",
          path: "status",
          constraint: "enum",
          actualValue: "unknown",
          expected: { type: "enum", validValues: ["active", "inactive"], closestMatch: "active" },
          suggestion: "Did you mean 'active'?",
        },
      ]);

      const serialized = validationResultToJSON(original);
      const deserialized = validationResultFromJSON(serialized);

      expect(deserialized.valid).toBe(original.valid);
      expect(deserialized.validationTimeMs).toBe(original.validationTimeMs);
      expect(deserialized.context.endpoint).toBe(original.context.endpoint);
      expect(deserialized.context.operation).toBe(original.context.operation);
      expect(deserialized.context.requestId).toBe(original.context.requestId);
      expect(deserialized.context.timestamp.toISOString()).toBe(
        original.context.timestamp.toISOString()
      );
      expect(deserialized.errors).toHaveLength(original.errors.length);
      expect(deserialized.errors).toEqual(original.errors);
    });

    it("should preserve userId through round-trip", () => {
      const original = createValidationResult(true, [], { userId: "user-123" });

      const serialized = validationResultToJSON(original);
      const deserialized = validationResultFromJSON(serialized);

      expect(deserialized.context.userId).toBe("user-123");
    });

    it("should preserve complex actualValue through round-trip", () => {
      const complexValue = {
        nested: {
          array: [1, 2, { deep: true }],
          string: "test",
          number: 42.5,
          boolean: false,
          null: null,
        },
      };

      const original = createValidationResult(false, [
        { ...createFieldError("field", "Error"), actualValue: complexValue },
      ]);

      const serialized = validationResultToJSON(original);
      const deserialized = validationResultFromJSON(serialized);

      expect(deserialized.errors[0].actualValue).toEqual(complexValue);
    });
  });

  describe("stringifyValidationResult()", () => {
    it("should return valid JSON string", () => {
      const result = createValidationResult(true);
      const jsonString = stringifyValidationResult(result);

      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    it("should return compact JSON by default", () => {
      const result = createValidationResult(true);
      const jsonString = stringifyValidationResult(result);

      expect(jsonString).not.toContain("\n");
    });

    it("should return pretty JSON when requested", () => {
      const result = createValidationResult(true);
      const jsonString = stringifyValidationResult(result, true);

      expect(jsonString).toContain("\n");
      expect(jsonString).toContain("  ");
    });
  });

  describe("parseValidationResult()", () => {
    it("should parse valid JSON string", () => {
      const original = createValidationResult(true);
      const jsonString = stringifyValidationResult(original);
      const parsed = parseValidationResult(jsonString);

      expect(parsed.valid).toBe(true);
      expect(parsed.context.timestamp).toBeInstanceOf(Date);
    });

    it("should throw error for invalid JSON", () => {
      expect(() => parseValidationResult("not valid json")).toThrow();
    });

    it("should complete round-trip through string serialization", () => {
      const original = createValidationResult(false, [
        createFieldError("name", "Name is required"),
      ]);

      const jsonString = stringifyValidationResult(original);
      const parsed = parseValidationResult(jsonString);

      expect(parsed.valid).toBe(original.valid);
      expect(parsed.errors).toHaveLength(1);
      expect(parsed.errors[0].path).toBe("name");
    });
  });
});
