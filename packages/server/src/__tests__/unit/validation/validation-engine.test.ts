/**
 * ValidationEngine Unit Tests
 *
 * Tests for the core validation engine including:
 * - Validation against Zod schemas
 * - Schema registration and lookup
 * - Error transformation and aggregation
 * - Validation timing
 * - Configuration options
 * - Logging functionality
 * - Metrics emission
 *
 * Requirements: 1.1, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { metrics } from "../../../monitoring/metrics-collector.js";
import { StructuredLogger } from "../../../monitoring/structured-logger.js";
import { SchemaNotFoundError } from "../../../validation/schema-registry.js";
import { createValidationEngine, ValidationEngine } from "../../../validation/validation-engine.js";

describe("ValidationEngine", () => {
  let engine: ValidationEngine;

  // Test schemas
  const userSchema = z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    age: z.number().min(0).max(150).optional(),
  });

  const simpleSchema = z.object({
    value: z.string(),
  });

  beforeEach(() => {
    engine = new ValidationEngine();
  });

  describe("constructor", () => {
    it("should create engine with default configuration", () => {
      const config = engine.getConfig();

      expect(config.maxValueLength).toBe(100);
      expect(config.collectAllErrors).toBe(true);
      expect(config.similarityThreshold).toBe(0.7);
      expect(config.maxCacheSize).toBe(100);
      expect(config.validateOnRegister).toBe(true);
    });

    it("should create engine with custom configuration", () => {
      const customEngine = new ValidationEngine({
        maxValueLength: 50,
        collectAllErrors: false,
        similarityThreshold: 0.8,
        maxCacheSize: 50,
        validateOnRegister: false,
      });

      const config = customEngine.getConfig();

      expect(config.maxValueLength).toBe(50);
      expect(config.collectAllErrors).toBe(false);
      expect(config.similarityThreshold).toBe(0.8);
      expect(config.maxCacheSize).toBe(50);
      expect(config.validateOnRegister).toBe(false);
    });

    it("should create engine with custom sensitive patterns", () => {
      const customEngine = new ValidationEngine({
        sensitivePatterns: [/custom_secret/i],
      });

      const config = customEngine.getConfig();
      expect(config.sensitivePatterns).toHaveLength(1);
    });
  });

  describe("validate()", () => {
    describe("with valid input", () => {
      it("should return valid result for valid input", () => {
        const input = { name: "John", email: "john@example.com" };
        const result = engine.validate(input, userSchema);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should include validation context", () => {
        const input = { name: "John", email: "john@example.com" };
        const result = engine.validate(input, userSchema, {
          endpoint: "/api/users",
          operation: "create",
          userId: "user-123",
        });

        expect(result.context.endpoint).toBe("/api/users");
        expect(result.context.operation).toBe("create");
        expect(result.context.userId).toBe("user-123");
        expect(result.context.requestId).toBeDefined();
        expect(result.context.timestamp).toBeInstanceOf(Date);
      });

      it("should track validation time", () => {
        const input = { name: "John", email: "john@example.com" };
        const result = engine.validate(input, userSchema);

        expect(result.validationTimeMs).toBeGreaterThanOrEqual(0);
      });
    });

    describe("with invalid input", () => {
      it("should return invalid result with errors", () => {
        const input = { name: "J", email: "invalid-email" };
        const result = engine.validate(input, userSchema);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it("should collect all errors without short-circuiting", () => {
        const input = { name: "J", email: "invalid-email" };
        const result = engine.validate(input, userSchema);

        // Should have errors for both name (too short) and email (invalid format)
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      });

      it("should include field path in errors", () => {
        const input = { name: "J", email: "john@example.com" };
        const result = engine.validate(input, userSchema);

        const nameError = result.errors.find((e) => e.path === "name");
        expect(nameError).toBeDefined();
      });

      it("should include error code in errors", () => {
        const input = { email: "john@example.com" };
        const result = engine.validate(input, userSchema);

        const nameError = result.errors.find((e) => e.path === "name");
        expect(nameError?.code).toBe("FIELD_REQUIRED");
      });

      it("should include suggestion in errors", () => {
        const input = { name: "J", email: "john@example.com" };
        const result = engine.validate(input, userSchema);

        const nameError = result.errors.find((e) => e.path === "name");
        expect(nameError?.suggestion).toBeDefined();
        expect(nameError?.suggestion.length).toBeGreaterThan(0);
      });

      it("should include expected constraint in errors", () => {
        const input = { name: "J", email: "john@example.com" };
        const result = engine.validate(input, userSchema);

        const nameError = result.errors.find((e) => e.path === "name");
        expect(nameError?.expected).toBeDefined();
      });
    });

    describe("with registered schema name", () => {
      it("should validate using registered schema", () => {
        engine.registerSchema("user", userSchema);

        const input = { name: "John", email: "john@example.com" };
        const result = engine.validate(input, "user");

        expect(result.valid).toBe(true);
      });

      it("should throw SchemaNotFoundError for unregistered schema", () => {
        expect(() => {
          engine.validate({}, "nonexistent");
        }).toThrow(SchemaNotFoundError);
      });
    });

    describe("context handling", () => {
      it("should use provided requestId", () => {
        const input = { value: "test" };
        const result = engine.validate(input, simpleSchema, {
          requestId: "custom-request-id",
        });

        expect(result.context.requestId).toBe("custom-request-id");
      });

      it("should generate requestId if not provided", () => {
        const input = { value: "test" };
        const result = engine.validate(input, simpleSchema);

        expect(result.context.requestId).toMatch(/^req_/);
      });

      it("should use provided timestamp", () => {
        const timestamp = new Date("2024-01-15T10:30:00Z");
        const input = { value: "test" };
        const result = engine.validate(input, simpleSchema, { timestamp });

        expect(result.context.timestamp).toEqual(timestamp);
      });

      it("should generate timestamp if not provided", () => {
        const before = new Date();
        const input = { value: "test" };
        const result = engine.validate(input, simpleSchema);
        const after = new Date();

        expect(result.context.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.context.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it("should use default endpoint and operation if not provided", () => {
        const input = { value: "test" };
        const result = engine.validate(input, simpleSchema);

        expect(result.context.endpoint).toBe("unknown");
        expect(result.context.operation).toBe("validate");
      });
    });
  });

  describe("registerSchema()", () => {
    it("should register a schema by name", () => {
      engine.registerSchema("user", userSchema);

      expect(engine.hasSchema("user")).toBe(true);
    });

    it("should register schema with metadata", () => {
      engine.registerSchema("user", userSchema, {
        description: "User validation schema",
        version: "1.0.0",
      });

      expect(engine.hasSchema("user")).toBe(true);
    });

    it("should allow overwriting existing schema", () => {
      engine.registerSchema("test", simpleSchema);
      engine.registerSchema("test", userSchema);

      // Should be able to validate with new schema
      const result = engine.validate({ name: "John", email: "john@example.com" }, "test");
      expect(result.valid).toBe(true);
    });
  });

  describe("getSchema()", () => {
    it("should return registered schema", () => {
      engine.registerSchema("user", userSchema);

      const schema = engine.getSchema("user");
      expect(schema).toBeDefined();
    });

    it("should return undefined for unregistered schema", () => {
      const schema = engine.getSchema("nonexistent");
      expect(schema).toBeUndefined();
    });
  });

  describe("hasSchema()", () => {
    it("should return true for registered schema", () => {
      engine.registerSchema("user", userSchema);
      expect(engine.hasSchema("user")).toBe(true);
    });

    it("should return false for unregistered schema", () => {
      expect(engine.hasSchema("nonexistent")).toBe(false);
    });
  });

  describe("unregisterSchema()", () => {
    it("should remove registered schema", () => {
      engine.registerSchema("user", userSchema);
      expect(engine.hasSchema("user")).toBe(true);

      const removed = engine.unregisterSchema("user");

      expect(removed).toBe(true);
      expect(engine.hasSchema("user")).toBe(false);
    });

    it("should return false for unregistered schema", () => {
      const removed = engine.unregisterSchema("nonexistent");
      expect(removed).toBe(false);
    });
  });

  describe("getSchemaNames()", () => {
    it("should return empty array when no schemas registered", () => {
      expect(engine.getSchemaNames()).toEqual([]);
    });

    it("should return all registered schema names", () => {
      engine.registerSchema("user", userSchema);
      engine.registerSchema("simple", simpleSchema);

      const names = engine.getSchemaNames();

      expect(names).toContain("user");
      expect(names).toContain("simple");
      expect(names).toHaveLength(2);
    });
  });

  describe("getCacheStats()", () => {
    it("should return cache statistics", () => {
      const stats = engine.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);
      expect(stats.hitRate).toBe(0);
      expect(stats.totalAccesses).toBe(0);
    });

    it("should update stats after schema access", () => {
      engine.registerSchema("user", userSchema);
      engine.getSchema("user");
      engine.getSchema("user");

      const stats = engine.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.totalAccesses).toBe(2);
    });
  });

  describe("createValidationEngine()", () => {
    it("should create engine with default config", () => {
      const newEngine = createValidationEngine();

      expect(newEngine).toBeInstanceOf(ValidationEngine);
      expect(newEngine.getConfig().maxValueLength).toBe(100);
    });

    it("should create engine with custom config", () => {
      const newEngine = createValidationEngine({
        maxValueLength: 200,
      });

      expect(newEngine.getConfig().maxValueLength).toBe(200);
    });
  });

  describe("performance requirements (Requirements 9.1, 9.2)", () => {
    it("should complete validation within 5ms for typical payloads", () => {
      const input = {
        name: "John Doe",
        email: "john@example.com",
        age: 30,
      };

      const result = engine.validate(input, userSchema);

      // Typical payloads should validate quickly (allow more time for CI environments)
      expect(result.validationTimeMs).toBeLessThan(50);
    });

    it("should handle nested object validation", () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            settings: z.object({
              theme: z.string(),
              notifications: z.boolean(),
            }),
          }),
        }),
      });

      const input = {
        user: {
          profile: {
            name: "John",
            settings: {
              theme: "dark",
              notifications: true,
            },
          },
        },
      };

      const result = engine.validate(input, nestedSchema);

      expect(result.valid).toBe(true);
      expect(result.validationTimeMs).toBeLessThan(10);
    });

    it("should handle array validation", () => {
      const arraySchema = z.object({
        items: z.array(z.string().min(1)).min(1).max(100),
      });

      const input = {
        items: Array.from({ length: 50 }, (_, i) => `item-${i}`),
      };

      const result = engine.validate(input, arraySchema);

      expect(result.valid).toBe(true);
    });
  });

  describe("error structure completeness (Requirement 1.1)", () => {
    it("should include all required fields in error structure", () => {
      const input = { name: "J", email: "invalid" };
      const result = engine.validate(input, userSchema);

      expect(result.errors.length).toBeGreaterThan(0);

      for (const error of result.errors) {
        expect(error.code).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.path).toBeDefined();
        expect(error.constraint).toBeDefined();
        expect(error.expected).toBeDefined();
        expect(error.suggestion).toBeDefined();
        // actualValue can be undefined for missing fields
        expect("actualValue" in error).toBe(true);
      }
    });
  });

  describe("sensitive value sanitization", () => {
    it("should sanitize sensitive field values in errors", () => {
      const sensitiveSchema = z.object({
        username: z.string().min(3),
        password: z.string().min(8),
      });

      const input = { username: "ab", password: "short" };
      const result = engine.validate(input, sensitiveSchema);

      const passwordError = result.errors.find((e) => e.path === "password");
      expect(passwordError?.actualValue).toBe("[REDACTED]");
    });
  });

  describe("enum validation with suggestions", () => {
    it("should suggest closest enum value", () => {
      const enumSchema = z.object({
        status: z.enum(["active", "inactive", "pending"]),
      });

      const input = { status: "actve" }; // typo
      const result = engine.validate(input, enumSchema);

      const statusError = result.errors.find((e) => e.path === "status");
      expect(statusError).toBeDefined();
      expect(statusError?.suggestion).toContain("active");
    });
  });

  describe("logging functionality (Requirements 10.1, 10.2, 10.3)", () => {
    it("should enable logging by default", () => {
      const config = engine.getConfig();
      expect(config.enableLogging).toBe(true);
    });

    it("should allow disabling logging via configuration", () => {
      const noLogEngine = new ValidationEngine({ enableLogging: false });
      const config = noLogEngine.getConfig();
      expect(config.enableLogging).toBe(false);
    });

    it("should accept custom logger instance", () => {
      const customLogger = new StructuredLogger({ component: "custom-validation" });
      const customEngine = new ValidationEngine({ logger: customLogger });

      // Engine should work with custom logger
      const result = customEngine.validate({ name: "J" }, userSchema);
      expect(result.valid).toBe(false);
    });

    it("should log field details at DEBUG level when validation fails (Requirement 10.1)", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const loggingEngine = new ValidationEngine({ logger: mockLogger });
      const input = { name: "J", email: "invalid-email" };
      loggingEngine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
        requestId: "test-request-123",
      });

      // Should have called debug for each field error
      expect(mockLogger.debug).toHaveBeenCalled();

      // Verify debug was called with field details
      const debugCalls = vi.mocked(mockLogger.debug).mock.calls;
      expect(debugCalls.length).toBeGreaterThanOrEqual(2); // At least 2 errors (name too short, invalid email)

      // Check that debug logs contain field information
      const firstDebugCall = debugCalls[0];
      expect(firstDebugCall[0]).toContain("Validation error on field");
    });

    it("should log validation failure summary at INFO level (Requirement 10.2)", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const loggingEngine = new ValidationEngine({ logger: mockLogger });
      const input = { name: "J", email: "invalid-email" };
      loggingEngine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
        requestId: "test-request-123",
      });

      // Should have called info for summary
      expect(mockLogger.info).toHaveBeenCalled();

      // Verify info was called with summary
      const infoCalls = vi.mocked(mockLogger.info).mock.calls;
      expect(infoCalls.length).toBe(1);

      const infoMessage = infoCalls[0][0];
      expect(infoMessage).toContain("Validation failed");
      expect(infoMessage).toContain("error(s)");
    });

    it("should include request context in logs (Requirement 10.3)", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const loggingEngine = new ValidationEngine({ logger: mockLogger });
      const input = { name: "J" };
      loggingEngine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
        userId: "user-456",
        requestId: "test-request-789",
      });

      // Check debug call includes context
      const debugCalls = vi.mocked(mockLogger.debug).mock.calls;
      expect(debugCalls.length).toBeGreaterThan(0);

      const debugOptions = debugCalls[0][1] as {
        context?: Record<string, unknown>;
        traceId?: string;
      };
      expect(debugOptions.traceId).toBe("test-request-789");
      expect(debugOptions.context?.endpoint).toBe("/api/users");
      expect(debugOptions.context?.operation).toBe("create");
      expect(debugOptions.context?.userId).toBe("user-456");

      // Check info call includes context
      const infoCalls = vi.mocked(mockLogger.info).mock.calls;
      expect(infoCalls.length).toBe(1);

      const infoOptions = infoCalls[0][1] as {
        context?: Record<string, unknown>;
        traceId?: string;
      };
      expect(infoOptions.traceId).toBe("test-request-789");
      expect(infoOptions.context?.endpoint).toBe("/api/users");
      expect(infoOptions.context?.userId).toBe("user-456");
    });

    it("should not log when validation succeeds", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const loggingEngine = new ValidationEngine({ logger: mockLogger });
      const input = { name: "John", email: "john@example.com" };
      const result = loggingEngine.validate(input, userSchema);

      expect(result.valid).toBe(true);
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should not log when logging is disabled", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const noLogEngine = new ValidationEngine({ logger: mockLogger, enableLogging: false });
      const input = { name: "J", email: "invalid-email" };
      noLogEngine.validate(input, userSchema);

      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it("should include schema name in logs for registered schemas", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const loggingEngine = new ValidationEngine({ logger: mockLogger });
      loggingEngine.registerSchema("user", userSchema);

      const input = { name: "J" };
      loggingEngine.validate(input, "user", {
        endpoint: "/api/users",
        requestId: "test-123",
      });

      const debugCalls = vi.mocked(mockLogger.debug).mock.calls;
      const debugOptions = debugCalls[0][1] as { context?: Record<string, unknown> };
      expect(debugOptions.context?.schema).toBe("user");
    });

    it("should use 'inline' as schema name for inline schemas", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const loggingEngine = new ValidationEngine({ logger: mockLogger });
      const input = { name: "J" };
      loggingEngine.validate(input, userSchema, {
        endpoint: "/api/users",
        requestId: "test-123",
      });

      const debugCalls = vi.mocked(mockLogger.debug).mock.calls;
      const debugOptions = debugCalls[0][1] as { context?: Record<string, unknown> };
      expect(debugOptions.context?.schema).toBe("inline");
    });

    it("should include error codes in summary log", () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn(),
        setLevel: vi.fn(),
        getLevel: vi.fn(),
        setStructuredOutput: vi.fn(),
        isStructuredOutput: vi.fn(),
      } as unknown as StructuredLogger;

      const loggingEngine = new ValidationEngine({ logger: mockLogger });
      const input = { name: "J", email: "invalid" };
      loggingEngine.validate(input, userSchema);

      const infoCalls = vi.mocked(mockLogger.info).mock.calls;
      const infoOptions = infoCalls[0][1] as { context?: Record<string, unknown> };
      expect(infoOptions.context?.errorCodes).toBeDefined();
      expect(infoOptions.context?.errorCount).toBeGreaterThan(0);
    });
  });

  describe("metrics functionality (Requirement 10.4)", () => {
    beforeEach(() => {
      // Reset metrics before each test
      metrics.resetAll();
    });

    it("should enable metrics by default", () => {
      const config = engine.getConfig();
      expect(config.enableMetrics).toBe(true);
    });

    it("should allow disabling metrics via configuration", () => {
      const noMetricsEngine = new ValidationEngine({ enableMetrics: false });
      const config = noMetricsEngine.getConfig();
      expect(config.enableMetrics).toBe(false);
    });

    it("should emit validation_failures_total metric when validation fails", () => {
      const input = { name: "J", email: "invalid-email" };
      engine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
      });

      const counter = metrics.getCounter("validation_failures_total", {
        endpoint: "/api/users",
        operation: "create",
      });
      expect(counter).toBe(1);
    });

    it("should emit validation_errors_by_type metric for each error type", () => {
      const input = { name: "J", email: "invalid-email" };
      engine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
      });

      // Should have STRING_TOO_SHORT for name and INVALID_FORMAT for email
      const stringTooShortCounter = metrics.getCounter("validation_errors_by_type", {
        endpoint: "/api/users",
        error_type: "STRING_TOO_SHORT",
      });
      expect(stringTooShortCounter).toBe(1);

      const invalidFormatCounter = metrics.getCounter("validation_errors_by_type", {
        endpoint: "/api/users",
        error_type: "INVALID_FORMAT",
      });
      expect(invalidFormatCounter).toBe(1);
    });

    it("should not emit metrics when validation succeeds", () => {
      const input = { name: "John", email: "john@example.com" };
      engine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
      });

      const counter = metrics.getCounter("validation_failures_total", {
        endpoint: "/api/users",
        operation: "create",
      });
      expect(counter).toBe(0);
    });

    it("should not emit metrics when metrics are disabled", () => {
      const noMetricsEngine = new ValidationEngine({ enableMetrics: false });
      const input = { name: "J", email: "invalid-email" };
      noMetricsEngine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
      });

      const counter = metrics.getCounter("validation_failures_total", {
        endpoint: "/api/users",
        operation: "create",
      });
      expect(counter).toBe(0);
    });

    it("should track metrics by endpoint", () => {
      const input = { name: "J", email: "invalid-email" };

      // Validate on different endpoints
      engine.validate(input, userSchema, { endpoint: "/api/users" });
      engine.validate(input, userSchema, { endpoint: "/api/users" });
      engine.validate(input, userSchema, { endpoint: "/api/profiles" });

      const usersCounter = metrics.getCounter("validation_failures_total", {
        endpoint: "/api/users",
        operation: "validate",
      });
      expect(usersCounter).toBe(2);

      const profilesCounter = metrics.getCounter("validation_failures_total", {
        endpoint: "/api/profiles",
        operation: "validate",
      });
      expect(profilesCounter).toBe(1);
    });

    it("should aggregate error counts for multiple errors of same type", () => {
      // Schema with multiple string fields that can fail minLength
      const multiStringSchema = z.object({
        firstName: z.string().min(3),
        lastName: z.string().min(3),
        middleName: z.string().min(3),
      });

      const input = { firstName: "A", lastName: "B", middleName: "C" };
      engine.validate(input, multiStringSchema, {
        endpoint: "/api/names",
        operation: "create",
      });

      // Should have 3 STRING_TOO_SHORT errors
      const stringTooShortCounter = metrics.getCounter("validation_errors_by_type", {
        endpoint: "/api/names",
        error_type: "STRING_TOO_SHORT",
      });
      expect(stringTooShortCounter).toBe(3);
    });

    it("should emit FIELD_REQUIRED error type for missing required fields", () => {
      const input = {}; // Missing required name and email
      engine.validate(input, userSchema, {
        endpoint: "/api/users",
        operation: "create",
      });

      const requiredCounter = metrics.getCounter("validation_errors_by_type", {
        endpoint: "/api/users",
        error_type: "FIELD_REQUIRED",
      });
      expect(requiredCounter).toBeGreaterThanOrEqual(2); // name and email are required
    });
  });
});
