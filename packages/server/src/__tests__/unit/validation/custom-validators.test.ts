/**
 * Custom Validators Unit Tests
 *
 * Tests for custom validation function registration and execution:
 * - CustomValidatorRegistry registration and retrieval
 * - CustomValidationBuilder schema building
 * - Full input context access in validators
 * - Error handling and edge cases
 *
 * Requirements: 3.5
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CustomValidationBuilder,
  CustomValidatorNotFoundError,
  CustomValidatorRegistrationError,
  CustomValidatorRegistry,
  createCustomValidation,
  createCustomValidatorRegistry,
  customResultToFieldError,
  type CustomValidatorContext,
  type CustomValidatorResult,
} from "../../../validation/index.js";

describe("CustomValidatorRegistry", () => {
  describe("register()", () => {
    it("should register a valid custom validator", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "passwordStrength",
        description: "Password must contain uppercase, lowercase, and numbers",
        validate: (ctx) => ({
          valid:
            typeof ctx.fieldValue === "string" &&
            /[A-Z]/.test(ctx.fieldValue) &&
            /[a-z]/.test(ctx.fieldValue) &&
            /[0-9]/.test(ctx.fieldValue),
          message: "Password is too weak",
        }),
      });

      expect(registry.has("passwordStrength")).toBe(true);
    });

    it("should throw error for empty validator name", () => {
      const registry = new CustomValidatorRegistry();

      expect(() =>
        registry.register({
          name: "",
          description: "Test validator",
          validate: () => ({ valid: true }),
        })
      ).toThrow(CustomValidatorRegistrationError);
    });

    it("should throw error for validator name with whitespace", () => {
      const registry = new CustomValidatorRegistry();

      expect(() =>
        registry.register({
          name: " spacedName ",
          description: "Test validator",
          validate: () => ({ valid: true }),
        })
      ).toThrow(CustomValidatorRegistrationError);
    });

    it("should throw error for non-function validate", () => {
      const registry = new CustomValidatorRegistry();

      expect(() =>
        registry.register({
          name: "invalid",
          description: "Test validator",
          validate: "not a function" as unknown as () => CustomValidatorResult,
        })
      ).toThrow(CustomValidatorRegistrationError);
    });

    it("should throw error for missing description", () => {
      const registry = new CustomValidatorRegistry();

      expect(() =>
        registry.register({
          name: "noDescription",
          description: "",
          validate: () => ({ valid: true }),
        })
      ).toThrow(CustomValidatorRegistrationError);
    });

    it("should allowriting existing validator", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "test",
        description: "Original",
        validate: () => ({ valid: true }),
      });

      registry.register({
        name: "test",
        description: "Updated",
        validate: () => ({ valid: false }),
      });

      const config = registry.get("test");
      expect(config?.description).toBe("Updated");
    });
  });

  describe("get()", () => {
    it("should return registered validator config", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "test",
        description: "Test validator",
        validate: () => ({ valid: true }),
      });

      const config = registry.get("test");
      expect(config).toBeDefined();
      expect(config?.name).toBe("test");
      expect(config?.description).toBe("Test validator");
    });

    it("should return undefined for non-existent validator", () => {
      const registry = new CustomValidatorRegistry();

      expect(registry.get("nonexistent")).toBeUndefined();
    });
  });

  describe("has()", () => {
    it("should return true for registered validator", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "test",
        description: "Test",
        validate: () => ({ valid: true }),
      });

      expect(registry.has("test")).toBe(true);
    });

    it("should return false for non-existent validator", () => {
      const registry = new CustomValidatorRegistry();

      expect(registry.has("nonexistent")).toBe(false);
    });
  });

  describe("unregister()", () => {
    it("should remove registered validator", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "test",
        description: "Test",
        validate: () => ({ valid: true }),
      });

      expect(registry.unregister("test")).toBe(true);
      expect(registry.has("test")).toBe(false);
    });

    it("should return false for non-existent validator", () => {
      const registry = new CustomValidatorRegistry();

      expect(registry.unregister("nonexistent")).toBe(false);
    });
  });

  describe("getValidatorNames()", () => {
    it("should return all registered validator names", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "validator1",
        description: "First",
        validate: () => ({ valid: true }),
      });

      registry.register({
        name: "validator2",
        description: "Second",
        validate: () => ({ valid: true }),
      });

      const names = registry.getValidatorNames();
      expect(names).toContain("validator1");
      expect(names).toContain("validator2");
      expect(names).toHaveLength(2);
    });

    it("should return empty array when no validators registered", () => {
      const registry = new CustomValidatorRegistry();

      expect(registry.getValidatorNames()).toEqual([]);
    });
  });

  describe("getValidatorCount()", () => {
    it("should return correct count", () => {
      const registry = new CustomValidatorRegistry();

      expect(registry.getValidatorCount()).toBe(0);

      registry.register({
        name: "test",
        description: "Test",
        validate: () => ({ valid: true }),
      });

      expect(registry.getValidatorCount()).toBe(1);
    });
  });

  describe("clear()", () => {
    it("should remove all validators", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "test1",
        description: "Test 1",
        validate: () => ({ valid: true }),
      });

      registry.register({
        name: "test2",
        description: "Test 2",
        validate: () => ({ valid: true }),
      });

      registry.clear();

      expect(registry.getValidatorCount()).toBe(0);
    });
  });

  describe("execute()", () => {
    it("should execute validator and return result", async () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "isPositive",
        description: "Value must be positive",
        validate: (ctx) => ({
          valid: typeof ctx.fieldValue === "number" && ctx.fieldValue > 0,
          message: "Value must be positive",
        }),
      });

      const context: CustomValidatorContext = {
        input: { amount: 10 },
        fieldValue: 10,
        fieldPath: "amount",
        metadata: {},
      };

      const result = await registry.execute("isPositive", context);
      expect(result.valid).toBe(true);
    });

    it("should return failure result with defaults", async () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "isPositive",
        description: "Value must be positive",
        defaultMessage: "Default failure message",
        defaultSuggestion: "Use a positive number",
        validate: (ctx) => ({
          valid: typeof ctx.fieldValue === "number" && ctx.fieldValue > 0,
        }),
      });

      const context: CustomValidatorContext = {
        input: { amount: -5 },
        fieldValue: -5,
        fieldPath: "amount",
        metadata: {},
      };

      const result = await registry.execute("isPositive", context);
      expect(result.valid).toBe(false);
      expect(result.message).toBe("Default failure message");
      expect(result.suggestion).toBe("Use a positive number");
    });

    it("should throw error for non-existent validator", async () => {
      const registry = new CustomValidatorRegistry();

      const context: CustomValidatorContext = {
        input: {},
        fieldValue: null,
        fieldPath: "test",
        metadata: {},
      };

      await expect(registry.execute("nonexistent", context)).rejects.toThrow(
        CustomValidatorNotFoundError
      );
    });

    it("should handle validator that throws error", async () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "throwingValidator",
        description: "This validator throws",
        validate: () => {
          throw new Error("Validator error");
        },
      });

      const context: CustomValidatorContext = {
        input: {},
        fieldValue: null,
        fieldPath: "test",
        metadata: {},
      };

      const result = await registry.execute("throwingValidator", context);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("threw an error");
      expect(result.message).toContain("Validator error");
    });

    it("should handle async validators", async () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "asyncValidator",
        description: "Async validation",
        validate: async (ctx) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return {
            valid: ctx.fieldValue === "valid",
            message: "Value must be 'valid'",
          };
        },
      });

      const context: CustomValidatorContext = {
        input: { field: "valid" },
        fieldValue: "valid",
        fieldPath: "field",
        metadata: {},
      };

      const result = await registry.execute("asyncValidator", context);
      expect(result.valid).toBe(true);
    });

    it("should provide full input context to validator", async () => {
      const registry = new CustomValidatorRegistry();
      const capturedContexts: CustomValidatorContext[] = [];

      registry.register({
        name: "contextCapture",
        description: "Captures context",
        validate: (ctx) => {
          capturedContexts.push(ctx);
          return { valid: true };
        },
      });

      const context: CustomValidatorContext = {
        input: { field1: "value1", field2: "value2" },
        fieldValue: "value1",
        fieldPath: "field1",
        metadata: {
          schemaName: "testSchema",
          endpoint: "/api/test",
          operation: "create",
        },
      };

      await registry.execute("contextCapture", context);

      expect(capturedContexts).toHaveLength(1);
      const receivedContext = capturedContexts[0];
      expect(receivedContext.input).toEqual({ field1: "value1", field2: "value2" });
      expect(receivedContext.fieldValue).toBe("value1");
      expect(receivedContext.fieldPath).toBe("field1");
      expect(receivedContext.metadata.schemaName).toBe("testSchema");
      expect(receivedContext.metadata.endpoint).toBe("/api/test");
    });
  });
});

describe("CustomValidationBuilder", () => {
  const baseSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    confirmPassword: z.string().min(1),
    age: z.number().optional(),
  });

  describe("addValidator()", () => {
    it("should add a registered validator to a field", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "passwordStrength",
        description: "Password strength check",
        validate: () => ({ valid: true }),
      });

      const builder = new CustomValidationBuilder(baseSchema, registry);
      builder.addValidator("password", "passwordStrength");

      // Should not throw
      expect(() => builder.build()).not.toThrow();
    });

    it("should throw error for non-existent validator", () => {
      const registry = new CustomValidatorRegistry();
      const builder = new CustomValidationBuilder(baseSchema, registry);

      expect(() => builder.addValidator("password", "nonexistent")).toThrow(
        CustomValidatorNotFoundError
      );
    });

    it("should support chaining", () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "validator1",
        description: "First",
        validate: () => ({ valid: true }),
      });

      registry.register({
        name: "validator2",
        description: "Second",
        validate: () => ({ valid: true }),
      });

      const builder = new CustomValidationBuilder(baseSchema, registry);
      const result = builder
        .addValidator("password", "validator1")
        .addValidator("username", "validator2");

      expect(result).toBe(builder);
    });
  });

  describe("addInlineValidator()", () => {
    it("should add an inline validator to a field", () => {
      const registry = new CustomValidatorRegistry();
      const builder = new CustomValidationBuilder(baseSchema, registry);

      builder.addInlineValidator("password", (ctx) => ({
        valid: typeof ctx.fieldValue === "string" && ctx.fieldValue.length >= 8,
        message: "Password must be at least 8 characters",
      }));

      // Should not throw
      expect(() => builder.build()).not.toThrow();
    });

    it("should support chaining", () => {
      const registry = new CustomValidatorRegistry();
      const builder = new CustomValidationBuilder(baseSchema, registry);

      const result = builder
        .addInlineValidator("password", () => ({ valid: true }))
        .addInlineValidator("username", () => ({ valid: true }));

      expect(result).toBe(builder);
    });
  });

  describe("build()", () => {
    it("should return a valid Zod schema", () => {
      const registry = new CustomValidatorRegistry();
      const builder = new CustomValidationBuilder(baseSchema, registry);
      const schema = builder.build();

      expect(schema).toBeDefined();
      expect(typeof schema.safeParse).toBe("function");
      expect(typeof schema.parse).toBe("function");
    });

    it("should preserve base schema validation", async () => {
      const registry = new CustomValidatorRegistry();
      const builder = new CustomValidationBuilder(baseSchema, registry);
      const schema = builder.build();

      // Base schema validation should still work
      const result = await schema.safeParseAsync({
        username: "",
        password: "test",
        confirmPassword: "test",
      });

      expect(result.success).toBe(false);
    });

    it("should apply registered validators", async () => {
      const registry = new CustomValidatorRegistry();

      registry.register({
        name: "passwordMatch",
        description: "Passwords must match",
        validate: (ctx) => {
          const input = ctx.input as { password: string; confirmPassword: string };
          return {
            valid: input.password === input.confirmPassword,
            message: "Passwords do not match",
          };
        },
      });

      const schema = new CustomValidationBuilder(baseSchema, registry)
        .addValidator("confirmPassword", "passwordMatch")
        .build();

      // Mismatched passwords should fail
      const invalidResult = await schema.safeParseAsync({
        username: "john",
        password: "secret123",
        confirmPassword: "different",
      });

      expect(invalidResult.success).toBe(false);

      // Matching passwords should pass
      const validResult = await schema.safeParseAsync({
        username: "john",
        password: "secret123",
        confirmPassword: "secret123",
      });

      expect(validResult.success).toBe(true);
    });

    it("should apply inline validators", async () => {
      const registry = new CustomValidatorRegistry();

      const schema = new CustomValidationBuilder(baseSchema, registry)
        .addInlineValidator("password", (ctx) => ({
          valid: typeof ctx.fieldValue === "string" && ctx.fieldValue.length >= 8,
          message: "Password must be at least 8 characters",
        }))
        .build();

      // Short password should fail
      const invalidResult = await schema.safeParseAsync({
        username: "john",
        password: "short",
        confirmPassword: "short",
      });

      expect(invalidResult.success).toBe(false);

      // Long password should pass
      const validResult = await schema.safeParseAsync({
        username: "john",
        password: "longenough",
        confirmPassword: "longenough",
      });

      expect(validResult.success).toBe(true);
    });

    it("should provide full input context to validators", async () => {
      const registry = new CustomValidatorRegistry();
      const capturedContexts: CustomValidatorContext[] = [];

      registry.register({
        name: "contextCapture",
        description: "Captures context",
        validate: (ctx) => {
          capturedContexts.push(ctx);
          return { valid: true };
        },
      });

      const schema = new CustomValidationBuilder(baseSchema, registry)
        .addValidator("password", "contextCapture")
        .build();

      await schema.safeParseAsync({
        username: "john",
        password: "secret123",
        confirmPassword: "secret123",
        age: 25,
      });

      expect(capturedContexts).toHaveLength(1);
      const capturedContext = capturedContexts[0];
      expect(capturedContext.input).toEqual({
        username: "john",
        password: "secret123",
        confirmPassword: "secret123",
        age: 25,
      });
      expect(capturedContext.fieldValue).toBe("secret123");
      expect(capturedContext.fieldPath).toBe("password");
    });

    it("should handle nested field paths", async () => {
      const nestedSchema = z.object({
        user: z.object({
          profile: z.object({
            email: z.string(),
          }),
        }),
      });

      const registry = new CustomValidatorRegistry();
      let capturedValue: unknown = null;

      registry.register({
        name: "emailValidator",
        description: "Email validation",
        validate: (ctx) => {
          capturedValue = ctx.fieldValue;
          return { valid: true };
        },
      });

      const schema = new CustomValidationBuilder(nestedSchema, registry)
        .addValidator("user.profile.email", "emailValidator")
        .build();

      await schema.safeParseAsync({
        user: {
          profile: {
            email: "test@example.com",
          },
        },
      });

      expect(capturedValue).toBe("test@example.com");
    });

    it("should apply multiple validators to same field", async () => {
      const registry = new CustomValidatorRegistry();
      const validatorsCalled: string[] = [];

      registry.register({
        name: "validator1",
        description: "First validator",
        validate: () => {
          validatorsCalled.push("validator1");
          return { valid: true };
        },
      });

      registry.register({
        name: "validator2",
        description: "Second validator",
        validate: () => {
          validatorsCalled.push("validator2");
          return { valid: true };
        },
      });

      const schema = new CustomValidationBuilder(baseSchema, registry)
        .addValidator("password", "validator1")
        .addValidator("password", "validator2")
        .build();

      await schema.safeParseAsync({
        username: "john",
        password: "secret123",
        confirmPassword: "secret123",
      });

      expect(validatorsCalled).toContain("validator1");
      expect(validatorsCalled).toContain("validator2");
    });
  });
});

describe("createCustomValidatorRegistry()", () => {
  it("should create a CustomValidatorRegistry instance", () => {
    const registry = createCustomValidatorRegistry();
    expect(registry).toBeInstanceOf(CustomValidatorRegistry);
  });
});

describe("createCustomValidation()", () => {
  it("should create a CustomValidationBuilder instance", () => {
    const baseSchema = z.object({ name: z.string() });
    const registry = new CustomValidatorRegistry();
    const builder = createCustomValidation(baseSchema, registry);

    expect(builder).toBeInstanceOf(CustomValidationBuilder);
  });
});

describe("customResultToFieldError()", () => {
  it("should convert CustomValidatorResult to FieldError", () => {
    const result: CustomValidatorResult = {
      valid: false,
      message: "Custom validation failed",
      expectedDescription: "Value must be positive",
      suggestion: "Use a positive number",
    };

    const fieldError = customResultToFieldError(result, "amount", -5);

    expect(fieldError.code).toBe("CUSTOM_VALIDATION_FAILED");
    expect(fieldError.message).toBe("Custom validation failed");
    expect(fieldError.path).toBe("amount");
    expect(fieldError.constraint).toBe("custom");
    expect(fieldError.actualValue).toBe(-5);
    expect(fieldError.expected).toEqual({
      type: "custom",
      description: "Value must be positive",
    });
    expect(fieldError.suggestion).toBe("Use a positive number");
  });

  it("should use defaults for missing fields", () => {
    const result: CustomValidatorResult = {
      valid: false,
    };

    const fieldError = customResultToFieldError(result, "field", "value");

    expect(fieldError.message).toBe("Custom validation failed");
    expect(fieldError.expected).toEqual({
      type: "custom",
      description: "Custom validation requirement",
    });
    expect(fieldError.suggestion).toBe("Check the input value");
  });
});

describe("Cross-Field Validation Scenarios", () => {
  it("should validate password confirmation matches password", async () => {
    const schema = z.object({
      password: z.string().min(8),
      confirmPassword: z.string(),
    });

    const registry = new CustomValidatorRegistry();

    registry.register({
      name: "passwordMatch",
      description: "Confirm password must match password",
      validate: (ctx) => {
        const input = ctx.input as { password: string; confirmPassword: string };
        return {
          valid: input.password === input.confirmPassword,
          message: "Passwords do not match",
          suggestion: "Ensure both password fields contain the same value",
        };
      },
    });

    const validatedSchema = new CustomValidationBuilder(schema, registry)
      .addValidator("confirmPassword", "passwordMatch")
      .build();

    // Mismatched passwords
    const mismatchResult = await validatedSchema.safeParseAsync({
      password: "secretpassword",
      confirmPassword: "differentpassword",
    });
    expect(mismatchResult.success).toBe(false);

    // Matching passwords
    const matchResult = await validatedSchema.safeParseAsync({
      password: "secretpassword",
      confirmPassword: "secretpassword",
    });
    expect(matchResult.success).toBe(true);
  });

  it("should validate end date is after start date", async () => {
    const schema = z.object({
      startDate: z.string(),
      endDate: z.string(),
    });

    const registry = new CustomValidatorRegistry();

    registry.register({
      name: "dateRange",
      description: "End date must be after start date",
      validate: (ctx) => {
        const input = ctx.input as { startDate: string; endDate: string };
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        return {
          valid: end > start,
          message: "End date must be after start date",
          suggestion: "Choose an end date that comes after the start date",
        };
      },
    });

    const validatedSchema = new CustomValidationBuilder(schema, registry)
      .addValidator("endDate", "dateRange")
      .build();

    // Invalid date range
    const invalidResult = await validatedSchema.safeParseAsync({
      startDate: "2024-12-31",
      endDate: "2024-01-01",
    });
    expect(invalidResult.success).toBe(false);

    // Valid date range
    const validResult = await validatedSchema.safeParseAsync({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    expect(validResult.success).toBe(true);
  });

  it("should validate dependent field requirements", async () => {
    const schema = z.object({
      paymentMethod: z.enum(["card", "bank"]),
      cardNumber: z.string().optional(),
      bankAccount: z.string().optional(),
    });

    const registry = new CustomValidatorRegistry();

    registry.register({
      name: "paymentDetails",
      description: "Payment details required based on method",
      validate: (ctx) => {
        const input = ctx.input as {
          paymentMethod: string;
          cardNumber?: string;
          bankAccount?: string;
        };

        if (input.paymentMethod === "card" && !input.cardNumber) {
          return {
            valid: false,
            message: "Card number is required for card payments",
            suggestion: "Provide a valid card number",
          };
        }

        if (input.paymentMethod === "bank" && !input.bankAccount) {
          return {
            valid: false,
            message: "Bank account is required for bank payments",
            suggestion: "Provide a valid bank account number",
          };
        }

        return { valid: true };
      },
    });

    const validatedSchema = new CustomValidationBuilder(schema, registry)
      .addValidator("paymentMethod", "paymentDetails")
      .build();

    // Card payment without card number
    const noCardResult = await validatedSchema.safeParseAsync({
      paymentMethod: "card",
    });
    expect(noCardResult.success).toBe(false);

    // Card payment with card number
    const withCardResult = await validatedSchema.safeParseAsync({
      paymentMethod: "card",
      cardNumber: "1234567890123456",
    });
    expect(withCardResult.success).toBe(true);

    // Bank payment without bank account
    const noBankResult = await validatedSchema.safeParseAsync({
      paymentMethod: "bank",
    });
    expect(noBankResult.success).toBe(false);

    // Bank payment with bank account
    const withBankResult = await validatedSchema.safeParseAsync({
      paymentMethod: "bank",
      bankAccount: "123456789",
    });
    expect(withBankResult.success).toBe(true);
  });
});
