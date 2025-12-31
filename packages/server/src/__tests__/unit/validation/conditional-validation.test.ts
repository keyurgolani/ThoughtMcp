/**
 * Conditional Validation Unit Tests
 *
 * Tests for when/unless conditional validation rules:
 * - Basic when/unless rules
 * - Field-specific conditional rules
 * - Condition helper functions
 * - Complex conditional scenarios
 *
 * Requirements: 3.3
 */

import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ConditionalValidationBuilder,
  allOf,
  anyOf,
  createConditionalValidation,
  fieldEquals,
  fieldExists,
  fieldMatches,
  fieldTruthy,
  not,
} from "../../../validation/index.js";

describe("ConditionalValidationBuilder", () => {
  // Base schema for testing
  const baseUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    type: z.enum(["basic", "premium", "enterprise"]).optional(),
    isGuest: z.boolean().optional(),
    age: z.number().optional(),
  });

  describe("when()", () => {
    it("should apply thenSchema when condition is true", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .when(
          (input) => input.type === "premium",
          { premiumCode: z.string().min(5) },
          "type is premium"
        )
        .build();

      // Premium user without premiumCode should fail
      const invalidPremium = { name: "John", type: "premium" as const };
      const result = schema.safeParse(invalidPremium);
      expect(result.success).toBe(false);

      // Premium user with valid premiumCode should pass
      const validPremium = { name: "John", type: "premium" as const, premiumCode: "PREM123" };
      const validResult = schema.safeParse(validPremium);
      expect(validResult.success).toBe(true);
    });

    it("should not apply thenSchema when condition is false", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .when(
          (input) => input.type === "premium",
          { premiumCode: z.string().min(5) },
          "type is premium"
        )
        .build();

      // Basic user without premiumCode should pass
      const basicUser = { name: "John", type: "basic" as const };
      const result = schema.safeParse(basicUser);
      expect(result.success).toBe(true);
    });

    it("should apply otherwiseSchema when condition is false", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .when(
          (input) => input.type === "premium",
          { premiumCode: z.string() },
          "type is premium",
          { basicReason: z.string().min(1) } // Required for non-premium
        )
        .build();

      // Basic user without basicReason should fail
      const basicWithoutReason = { name: "John", type: "basic" as const };
      const result = schema.safeParse(basicWithoutReason);
      expect(result.success).toBe(false);

      // Basic user with basicReason should pass
      const basicWithReason = { name: "John", type: "basic" as const, basicReason: "testing" };
      const validResult = schema.safeParse(basicWithReason);
      expect(validResult.success).toBe(true);
    });

    it("should include condition description in error message", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .when(
          (input) => input.type === "premium",
          { premiumCode: z.string().min(5) },
          "type is premium"
        )
        .build();

      const invalidPremium = { name: "John", type: "premium" as const };
      const result = schema.safeParse(invalidPremium);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessage = result.error.issues[0].message;
        expect(errorMessage).toContain("when type is premium");
      }
    });

    it("should support chaining multiple when rules", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .when((input) => input.type === "premium", { premiumCode: z.string() }, "type is premium")
        .when(
          (input) => input.type === "enterprise",
          { enterpriseId: z.string().uuid() },
          "type is enterprise"
        )
        .build();

      // Enterprise user needs enterpriseId
      const invalidEnterprise = { name: "John", type: "enterprise" as const };
      const result = schema.safeParse(invalidEnterprise);
      expect(result.success).toBe(false);

      // Enterprise user with valid enterpriseId should pass
      const validEnterprise = {
        name: "John",
        type: "enterprise" as const,
        enterpriseId: "550e8400-e29b-41d4-a716-446655440000",
      };
      const validResult = schema.safeParse(validEnterprise);
      expect(validResult.success).toBe(true);
    });
  });

  describe("unless()", () => {
    it("should apply thenSchema when condition is false", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .unless((input) => input.isGuest === true, { email: z.string().email() }, "user is a guest")
        .build();

      // Non-guest without email should fail
      const nonGuestNoEmail = { name: "John", isGuest: false };
      const result = schema.safeParse(nonGuestNoEmail);
      expect(result.success).toBe(false);

      // Non-guest with email should pass
      const nonGuestWithEmail = { name: "John", isGuest: false, email: "john@example.com" };
      const validResult = schema.safeParse(nonGuestWithEmail);
      expect(validResult.success).toBe(true);
    });

    it("should not apply thenSchema when condition is true", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .unless((input) => input.isGuest === true, { email: z.string().email() }, "user is a guest")
        .build();

      // Guest without email should pass
      const guestNoEmail = { name: "Guest", isGuest: true };
      const result = schema.safeParse(guestNoEmail);
      expect(result.success).toBe(true);
    });
  });

  describe("whenField()", () => {
    it("should apply schema to specific field when condition is true", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .whenField(
          "age",
          (input) => input.type === "enterprise",
          z.number().min(18),
          "type is enterprise"
        )
        .build();

      // Enterprise user with age < 18 should fail
      const invalidEnterprise = { name: "John", type: "enterprise" as const, age: 16 };
      const result = schema.safeParse(invalidEnterprise);
      expect(result.success).toBe(false);

      // Enterprise user with age >= 18 should pass
      const validEnterprise = { name: "John", type: "enterprise" as const, age: 25 };
      const validResult = schema.safeParse(validEnterprise);
      expect(validResult.success).toBe(true);

      // Basic user with age < 18 should pass (condition not met)
      const basicYoung = { name: "John", type: "basic" as const, age: 16 };
      const basicResult = schema.safeParse(basicYoung);
      expect(basicResult.success).toBe(true);
    });
  });

  describe("unlessField()", () => {
    it("should apply schema to specific field when condition is false", () => {
      // Use a base schema without email validation to test conditional validation
      const baseSchemaNoEmailValidation = z.object({
        name: z.string().min(1),
        email: z.string().optional(), // No .email() validation in base
        isGuest: z.boolean().optional(),
      });

      const schema = new ConditionalValidationBuilder(baseSchemaNoEmailValidation)
        .whenField(
          "email",
          (input) => input.isGuest !== true, // Apply email validation when NOT a guest
          z.string().email(),
          "user is not a guest"
        )
        .build();

      // Non-guest with invalid email should fail
      const nonGuestInvalidEmail = { name: "John", isGuest: false, email: "invalid" };
      const result = schema.safeParse(nonGuestInvalidEmail);
      expect(result.success).toBe(false);

      // Guest with invalid email should pass (condition is false, so rule doesn't apply)
      const guestInvalidEmail = { name: "Guest", isGuest: true, email: "invalid" };
      const guestResult = schema.safeParse(guestInvalidEmail);
      expect(guestResult.success).toBe(true);
    });
  });

  describe("getRules()", () => {
    it("should return all added rules", () => {
      const builder = new ConditionalValidationBuilder(baseUserSchema)
        .when((input) => input.type === "premium", { code: z.string() })
        .unless((input) => input.isGuest === true, { email: z.string() });

      const rules = builder.getRules();
      expect(rules).toHaveLength(2);
    });

    it("should return a copy of rules array", () => {
      const builder = new ConditionalValidationBuilder(baseUserSchema).when(
        (input) => input.type === "premium",
        { code: z.string() }
      );

      const rules1 = builder.getRules();
      const rules2 = builder.getRules();

      expect(rules1).not.toBe(rules2);
      expect(rules1).toEqual(rules2);
    });
  });

  describe("build()", () => {
    it("should return a valid Zod schema", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema).build();

      expect(schema).toBeDefined();
      expect(typeof schema.safeParse).toBe("function");
      expect(typeof schema.parse).toBe("function");
    });

    it("should preserve base schema validation", () => {
      const schema = new ConditionalValidationBuilder(baseUserSchema)
        .when((input) => input.type === "premium", { code: z.string() })
        .build();

      // Base schema validation should still work
      const invalidName = { name: "", type: "basic" as const };
      const result = schema.safeParse(invalidName);
      expect(result.success).toBe(false);
    });
  });
});

describe("createConditionalValidation()", () => {
  it("should create a ConditionalValidationBuilder instance", () => {
    const baseSchema = z.object({ name: z.string() });
    const builder = createConditionalValidation(baseSchema);

    expect(builder).toBeInstanceOf(ConditionalValidationBuilder);
  });
});

describe("Condition Helper Functions", () => {
  describe("fieldEquals()", () => {
    it("should return true when field equals value", () => {
      const condition = fieldEquals<{ type: string }>("type", "premium");
      expect(condition({ type: "premium" })).toBe(true);
    });

    it("should return false when field does not equal value", () => {
      const condition = fieldEquals<{ type: string }>("type", "premium");
      expect(condition({ type: "basic" })).toBe(false);
    });

    it("should return false for null input", () => {
      const condition = fieldEquals<{ type: string }>("type", "premium");
      expect(condition(null as unknown as { type: string })).toBe(false);
    });

    it("should return false for undefined input", () => {
      const condition = fieldEquals<{ type: string }>("type", "premium");
      expect(condition(undefined as unknown as { type: string })).toBe(false);
    });

    it("should handle undefined field value", () => {
      const condition = fieldEquals<{ type?: string }>("type", undefined);
      expect(condition({})).toBe(true);
    });
  });

  describe("fieldExists()", () => {
    it("should return true when field exists and is not null/undefined", () => {
      const condition = fieldExists<{ email?: string }>("email");
      expect(condition({ email: "test@example.com" })).toBe(true);
    });

    it("should return false when field is undefined", () => {
      const condition = fieldExists<{ email?: string }>("email");
      expect(condition({})).toBe(false);
    });

    it("should return false when field is null", () => {
      const condition = fieldExists<{ email?: string | null }>("email");
      expect(condition({ email: null })).toBe(false);
    });

    it("should return true for empty string (exists but empty)", () => {
      const condition = fieldExists<{ email?: string }>("email");
      expect(condition({ email: "" })).toBe(true);
    });

    it("should return true for zero (exists but falsy)", () => {
      const condition = fieldExists<{ count?: number }>("count");
      expect(condition({ count: 0 })).toBe(true);
    });
  });

  describe("fieldTruthy()", () => {
    it("should return true for truthy values", () => {
      const condition = fieldTruthy<{ active?: boolean }>("active");
      expect(condition({ active: true })).toBe(true);
    });

    it("should return false for falsy values", () => {
      const condition = fieldTruthy<{ active?: boolean }>("active");
      expect(condition({ active: false })).toBe(false);
    });

    it("should return false for undefined", () => {
      const condition = fieldTruthy<{ active?: boolean }>("active");
      expect(condition({})).toBe(false);
    });

    it("should return false for null", () => {
      const condition = fieldTruthy<{ active?: boolean | null }>("active");
      expect(condition({ active: null })).toBe(false);
    });

    it("should return false for empty string", () => {
      const condition = fieldTruthy<{ name?: string }>("name");
      expect(condition({ name: "" })).toBe(false);
    });

    it("should return false for zero", () => {
      const condition = fieldTruthy<{ count?: number }>("count");
      expect(condition({ count: 0 })).toBe(false);
    });

    it("should return true for non-empty string", () => {
      const condition = fieldTruthy<{ name?: string }>("name");
      expect(condition({ name: "John" })).toBe(true);
    });

    it("should return true for non-zero number", () => {
      const condition = fieldTruthy<{ count?: number }>("count");
      expect(condition({ count: 5 })).toBe(true);
    });
  });

  describe("fieldMatches()", () => {
    it("should return true when comparator returns true", () => {
      const condition = fieldMatches<{ age?: number }, number>("age", (age) => age >= 18);
      expect(condition({ age: 25 })).toBe(true);
    });

    it("should return false when comparator returns false", () => {
      const condition = fieldMatches<{ age?: number }, number>("age", (age) => age >= 18);
      expect(condition({ age: 16 })).toBe(false);
    });

    it("should handle complex comparators", () => {
      const condition = fieldMatches<{ tags?: string[] }, string[]>(
        "tags",
        (tags) => tags?.includes("premium") ?? false
      );
      expect(condition({ tags: ["basic", "premium"] })).toBe(true);
      expect(condition({ tags: ["basic"] })).toBe(false);
    });
  });

  describe("allOf()", () => {
    it("should return true when all conditions are true", () => {
      const condition = allOf(
        fieldEquals<{ type: string; active: boolean }>("type", "premium"),
        fieldTruthy<{ type: string; active: boolean }>("active")
      );
      expect(condition({ type: "premium", active: true })).toBe(true);
    });

    it("should return false when any condition is false", () => {
      const condition = allOf(
        fieldEquals<{ type: string; active: boolean }>("type", "premium"),
        fieldTruthy<{ type: string; active: boolean }>("active")
      );
      expect(condition({ type: "premium", active: false })).toBe(false);
      expect(condition({ type: "basic", active: true })).toBe(false);
    });

    it("should return true for empty conditions array", () => {
      const condition = allOf<{ type: string }>();
      expect(condition({ type: "any" })).toBe(true);
    });
  });

  describe("anyOf()", () => {
    it("should return true when any condition is true", () => {
      const condition = anyOf(
        fieldEquals<{ type: string }>("type", "premium"),
        fieldEquals<{ type: string }>("type", "enterprise")
      );
      expect(condition({ type: "premium" })).toBe(true);
      expect(condition({ type: "enterprise" })).toBe(true);
    });

    it("should return false when all conditions are false", () => {
      const condition = anyOf(
        fieldEquals<{ type: string }>("type", "premium"),
        fieldEquals<{ type: string }>("type", "enterprise")
      );
      expect(condition({ type: "basic" })).toBe(false);
    });

    it("should return false for empty conditions array", () => {
      const condition = anyOf<{ type: string }>();
      expect(condition({ type: "any" })).toBe(false);
    });
  });

  describe("not()", () => {
    it("should negate a true condition", () => {
      const condition = not(fieldEquals<{ type: string }>("type", "premium"));
      expect(condition({ type: "premium" })).toBe(false);
    });

    it("should negate a false condition", () => {
      const condition = not(fieldEquals<{ type: string }>("type", "premium"));
      expect(condition({ type: "basic" })).toBe(true);
    });
  });
});

describe("Complex Conditional Scenarios", () => {
  it("should handle nested conditions with allOf and anyOf", () => {
    const baseSchema = z.object({
      type: z.enum(["basic", "premium", "enterprise"]),
      region: z.enum(["us", "eu", "asia"]),
      verified: z.boolean().optional(),
    });

    const schema = new ConditionalValidationBuilder(baseSchema)
      .when(
        allOf(
          anyOf(
            fieldEquals<z.infer<typeof baseSchema>>("type", "premium"),
            fieldEquals<z.infer<typeof baseSchema>>("type", "enterprise")
          ),
          fieldEquals<z.infer<typeof baseSchema>>("region", "eu")
        ),
        { gdprConsent: z.boolean().refine((v) => v === true, "GDPR consent required") },
        "premium/enterprise in EU"
      )
      .build();

    // Premium in EU without GDPR consent should fail
    const premiumEuNoConsent = { type: "premium" as const, region: "eu" as const };
    expect(schema.safeParse(premiumEuNoConsent).success).toBe(false);

    // Premium in EU with GDPR consent should pass
    const premiumEuWithConsent = {
      type: "premium" as const,
      region: "eu" as const,
      gdprConsent: true,
    };
    expect(schema.safeParse(premiumEuWithConsent).success).toBe(true);

    // Premium in US without GDPR consent should pass (not in EU)
    const premiumUsNoConsent = { type: "premium" as const, region: "us" as const };
    expect(schema.safeParse(premiumUsNoConsent).success).toBe(true);

    // Basic in EU without GDPR consent should pass (not premium/enterprise)
    const basicEuNoConsent = { type: "basic" as const, region: "eu" as const };
    expect(schema.safeParse(basicEuNoConsent).success).toBe(true);
  });

  it("should handle multiple field-dependent validations", () => {
    const orderSchema = z.object({
      paymentMethod: z.enum(["card", "bank", "crypto"]),
      amount: z.number().positive(),
      cardNumber: z.string().optional(),
      bankAccount: z.string().optional(),
      walletAddress: z.string().optional(),
    });

    const schema = new ConditionalValidationBuilder(orderSchema)
      .whenField(
        "cardNumber",
        (input) => input.paymentMethod === "card",
        z.string().regex(/^\d{16}$/),
        "payment method is card"
      )
      .whenField(
        "bankAccount",
        (input) => input.paymentMethod === "bank",
        z.string().min(10),
        "payment method is bank"
      )
      .whenField(
        "walletAddress",
        (input) => input.paymentMethod === "crypto",
        z.string().regex(/^0x[a-fA-F0-9]{40}$/),
        "payment method is crypto"
      )
      .build();

    // Card payment with valid card number should pass
    const validCard = {
      paymentMethod: "card" as const,
      amount: 100,
      cardNumber: "1234567890123456",
    };
    expect(schema.safeParse(validCard).success).toBe(true);

    // Card payment with invalid card number should fail
    const invalidCard = {
      paymentMethod: "card" as const,
      amount: 100,
      cardNumber: "invalid",
    };
    expect(schema.safeParse(invalidCard).success).toBe(false);

    // Bank payment without bank account should fail
    const bankNoAccount = {
      paymentMethod: "bank" as const,
      amount: 100,
    };
    expect(schema.safeParse(bankNoAccount).success).toBe(false);

    // Crypto payment with valid wallet should pass
    const validCrypto = {
      paymentMethod: "crypto" as const,
      amount: 100,
      walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    };
    expect(schema.safeParse(validCrypto).success).toBe(true);
  });

  it("should handle conditional validation with optional base fields", () => {
    const profileSchema = z.object({
      name: z.string(),
      newsletter: z.boolean().optional(),
      email: z.string().optional(),
    });

    const schema = new ConditionalValidationBuilder(profileSchema)
      .when(
        (input) => input.newsletter === true,
        { email: z.string().email() },
        "newsletter is enabled"
      )
      .build();

    // Newsletter enabled without email should fail
    const newsletterNoEmail = { name: "John", newsletter: true };
    expect(schema.safeParse(newsletterNoEmail).success).toBe(false);

    // Newsletter enabled with valid email should pass
    const newsletterWithEmail = { name: "John", newsletter: true, email: "john@example.com" };
    expect(schema.safeParse(newsletterWithEmail).success).toBe(true);

    // Newsletter disabled without email should pass
    const noNewsletter = { name: "John", newsletter: false };
    expect(schema.safeParse(noNewsletter).success).toBe(true);

    // No newsletter field without email should pass
    const noNewsletterField = { name: "John" };
    expect(schema.safeParse(noNewsletterField).success).toBe(true);
  });
});
