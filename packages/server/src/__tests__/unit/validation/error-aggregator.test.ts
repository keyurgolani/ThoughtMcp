/**
 * ErrorAggregator Unit Tests
 *
 * Tests for error aggregation functionality including:
 * - Error collection without short-circuiting
 * - ValidationResult building with timing
 * - Error retrieval and clearing
 *
 * Requirements: 1.2, 9.5
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createErrorAggregator, ErrorAggregator } from "../../../validation/error-aggregator.js";
import type { FieldError, ValidationContext } from "../../../validation/types.js";

describe("ErrorAggregator", () => {
  let aggregator: ErrorAggregator;

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
  const createContext = (): ValidationContext => ({
    endpoint: "/api/test",
    operation: "create",
    requestId: "test-request-123",
    timestamp: new Date(),
  });

  beforeEach(() => {
    aggregator = new ErrorAggregator();
  });

  describe("addError()", () => {
    it("should add a single error", () => {
      const error = createFieldError("name", "Name is required");
      aggregator.addError(error);

      expect(aggregator.getErrors()).toHaveLength(1);
      expect(aggregator.getErrors()[0]).toEqual(error);
    });

    it("should add multiple errors without short-circuiting", () => {
      const error1 = createFieldError("name", "Name is required");
      const error2 = createFieldError("email", "Email is required");
      const error3 = createFieldError("age", "Age is required");

      aggregator.addError(error1);
      aggregator.addError(error2);
      aggregator.addError(error3);

      expect(aggregator.getErrors()).toHaveLength(3);
    });

    it("should preserve error order", () => {
      const error1 = createFieldError("first", "First error");
      const error2 = createFieldError("second", "Second error");
      const error3 = createFieldError("third", "Third error");

      aggregator.addError(error1);
      aggregator.addError(error2);
      aggregator.addError(error3);

      const errors = aggregator.getErrors();
      expect(errors[0].path).toBe("first");
      expect(errors[1].path).toBe("second");
      expect(errors[2].path).toBe("third");
    });

    it("should allow duplicate errors for same path", () => {
      const error1 = createFieldError("name", "Name is required");
      const error2: FieldError = {
        code: "STRING_TOO_SHORT",
        message: "Name is too short",
        path: "name",
        constraint: "minLength",
        actualValue: "a",
        expected: { type: "minLength", minLength: 3 },
        suggestion: "Name must be at least 3 characters",
      };

      aggregator.addError(error1);
      aggregator.addError(error2);

      expect(aggregator.getErrors()).toHaveLength(2);
    });
  });

  describe("getErrors()", () => {
    it("should return empty array when no errors", () => {
      expect(aggregator.getErrors()).toEqual([]);
    });

    it("should return a copy of errors array", () => {
      const error = createFieldError("name", "Name is required");
      aggregator.addError(error);

      const errors1 = aggregator.getErrors();
      const errors2 = aggregator.getErrors();

      expect(errors1).not.toBe(errors2);
      expect(errors1).toEqual(errors2);
    });

    it("should not allow external modification of internal errors", () => {
      const error = createFieldError("name", "Name is required");
      aggregator.addError(error);

      const errors = aggregator.getErrors();
      errors.push(createFieldError("extra", "Extra error"));

      expect(aggregator.getErrors()).toHaveLength(1);
    });
  });

  describe("hasErrors()", () => {
    it("should return false when no errors", () => {
      expect(aggregator.hasErrors()).toBe(false);
    });

    it("should return true when errors exist", () => {
      aggregator.addError(createFieldError("name", "Name is required"));
      expect(aggregator.hasErrors()).toBe(true);
    });

    it("should return true with multiple errors", () => {
      aggregator.addError(createFieldError("name", "Name is required"));
      aggregator.addError(createFieldError("email", "Email is required"));
      expect(aggregator.hasErrors()).toBe(true);
    });
  });

  describe("clear()", () => {
    it("should remove all errors", () => {
      aggregator.addError(createFieldError("name", "Name is required"));
      aggregator.addError(createFieldError("email", "Email is required"));

      expect(aggregator.hasErrors()).toBe(true);

      aggregator.clear();

      expect(aggregator.hasErrors()).toBe(false);
      expect(aggregator.getErrors()).toEqual([]);
    });

    it("should allow adding errors after clear", () => {
      aggregator.addError(createFieldError("name", "Name is required"));
      aggregator.clear();
      aggregator.addError(createFieldError("email", "Email is required"));

      expect(aggregator.getErrors()).toHaveLength(1);
      expect(aggregator.getErrors()[0].path).toBe("email");
    });
  });

  describe("buildResult()", () => {
    it("should build valid result when no errors", () => {
      const context = createContext();
      const startTime = performance.now();

      const result = aggregator.buildResult(context, startTime);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.context).toEqual(context);
      expect(result.validationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should build invalid result when errors exist", () => {
      const context = createContext();
      const startTime = performance.now();

      aggregator.addError(createFieldError("name", "Name is required"));

      const result = aggregator.buildResult(context, startTime);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("should include all errors in result", () => {
      const context = createContext();
      const startTime = performance.now();

      aggregator.addError(createFieldError("name", "Name is required"));
      aggregator.addError(createFieldError("email", "Email is required"));
      aggregator.addError(createFieldError("age", "Age is required"));

      const result = aggregator.buildResult(context, startTime);

      expect(result.errors).toHaveLength(3);
    });

    it("should calculate validation time", () => {
      const context = createContext();
      const startTime = performance.now();

      // Small delay to ensure measurable time
      const delay = 5;
      const endTime = startTime + delay;

      // Mock performance.now to return predictable values
      vi.spyOn(performance, "now").mockReturnValue(endTime);

      const result = aggregator.buildResult(context, startTime);

      expect(result.validationTimeMs).toBeCloseTo(delay, 1);

      vi.restoreAllMocks();
    });

    it("should preserve context in result", () => {
      const context: ValidationContext = {
        endpoint: "/api/users",
        operation: "update",
        userId: "user-456",
        requestId: "req-789",
        timestamp: new Date("2024-01-15T10:30:00Z"),
      };
      const startTime = performance.now();

      const result = aggregator.buildResult(context, startTime);

      expect(result.context.endpoint).toBe("/api/users");
      expect(result.context.operation).toBe("update");
      expect(result.context.userId).toBe("user-456");
      expect(result.context.requestId).toBe("req-789");
      expect(result.context.timestamp).toEqual(new Date("2024-01-15T10:30:00Z"));
    });

    it("should return copy of errors in result", () => {
      const context = createContext();
      const startTime = performance.now();

      aggregator.addError(createFieldError("name", "Name is required"));

      const result = aggregator.buildResult(context, startTime);

      // Modify result errors
      result.errors.push(createFieldError("extra", "Extra error"));

      // Original aggregator should be unchanged
      expect(aggregator.getErrors()).toHaveLength(1);
    });
  });

  describe("createErrorAggregator()", () => {
    it("should create a new ErrorAggregator instance", () => {
      const newAggregator = createErrorAggregator();

      expect(newAggregator).toBeInstanceOf(ErrorAggregator);
      expect(newAggregator.hasErrors()).toBe(false);
    });

    it("should create independent instances", () => {
      const aggregator1 = createErrorAggregator();
      const aggregator2 = createErrorAggregator();

      aggregator1.addError(createFieldError("name", "Name is required"));

      expect(aggregator1.hasErrors()).toBe(true);
      expect(aggregator2.hasErrors()).toBe(false);
    });
  });

  describe("error collection completeness (Requirement 1.2, 9.5)", () => {
    it("should collect all errors for input with multiple invalid fields", () => {
      // Simulate validation of an input with 5 invalid fields
      const errors = [
        createFieldError("name", "Name is required"),
        createFieldError("email", "Email is required"),
        createFieldError("age", "Age must be a number"),
        createFieldError("address.city", "City is required"),
        createFieldError("tags[0]", "Tag cannot be empty"),
      ];

      errors.forEach((error) => aggregator.addError(error));

      // Verify all 5 errors are collected (no short-circuiting)
      expect(aggregator.getErrors()).toHaveLength(5);
    });

    it("should handle large number of errors", () => {
      // Add 100 errors to verify no short-circuiting
      for (let i = 0; i < 100; i++) {
        aggregator.addError(createFieldError(`field${i}`, `Field ${i} is invalid`));
      }

      expect(aggregator.getErrors()).toHaveLength(100);
    });
  });
});
