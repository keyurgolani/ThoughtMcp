/**
 * SchemaRegistry Unit Tests
 *
 * Tests for schema registration, retrieval, validation, and caching:
 * - Schema storage by name
 * - Schema compilation caching
 * - Schema self-validation
 *
 * Requirements: 3.1, 3.4, 9.4
 */

import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createSchemaRegistry,
  SchemaRegistry,
  SchemaValidationError,
} from "../../../validation/schema-registry.js";

describe("SchemaRegistry", () => {
  let registry: SchemaRegistry;

  // Sample Zod schemas for testing
  const userSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    age: z.number().min(0).max(150),
  });

  const addressSchema = z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string().regex(/^\d{5}$/),
  });

  const simpleSchema = z.string();

  beforeEach(() => {
    registry = new SchemaRegistry();
  });

  describe("registerSchema()", () => {
    it("should register a schema by name", () => {
      registry.registerSchema("user", userSchema);

      expect(registry.hasSchema("user")).toBe(true);
      expect(registry.getSchemaCount()).toBe(1);
    });

    it("should register multiple schemas", () => {
      registry.registerSchema("user", userSchema);
      registry.registerSchema("address", addressSchema);
      registry.registerSchema("simple", simpleSchema);

      expect(registry.getSchemaCount()).toBe(3);
      expect(registry.hasSchema("user")).toBe(true);
      expect(registry.hasSchema("address")).toBe(true);
      expect(registry.hasSchema("simple")).toBe(true);
    });

    it("should overwrite existing schema with same name", () => {
      const schema1 = z.string();
      const schema2 = z.number();

      registry.registerSchema("test", schema1);
      registry.registerSchema("test", schema2);

      expect(registry.getSchemaCount()).toBe(1);
      const retrieved = registry.getSchema("test");
      expect(retrieved).toBe(schema2);
    });

    it("should register schema with metadata", () => {
      registry.registerSchema("user", userSchema, {
        description: "User validation schema",
        version: "1.0.0",
        examples: [{ name: "John", email: "john@example.com", age: 30 }],
      });

      const entry = registry.getSchemaEntry("user");
      expect(entry?.metadata.description).toBe("User validation schema");
      expect(entry?.metadata.version).toBe("1.0.0");
      expect(entry?.metadata.examples).toHaveLength(1);
    });

    it("should throw error for empty schema name", () => {
      expect(() => registry.registerSchema("", userSchema)).toThrow(SchemaValidationError);
    });

    it("should throw error for whitespace-only schema name", () => {
      expect(() => registry.registerSchema("   ", userSchema)).toThrow(SchemaValidationError);
    });

    it("should throw error for schema name with leading whitespace", () => {
      expect(() => registry.registerSchema(" user", userSchema)).toThrow(SchemaValidationError);
    });

    it("should throw error for schema name with trailing whitespace", () => {
      expect(() => registry.registerSchema("user ", userSchema)).toThrow(SchemaValidationError);
    });

    it("should throw error for null schema", () => {
      expect(() => registry.registerSchema("test", null as unknown as z.ZodSchema)).toThrow(
        SchemaValidationError
      );
    });

    it("should throw error for undefined schema", () => {
      expect(() => registry.registerSchema("test", undefined as unknown as z.ZodSchema)).toThrow(
        SchemaValidationError
      );
    });

    it("should throw error for non-object schema", () => {
      expect(() =>
        registry.registerSchema("test", "not a schema" as unknown as z.ZodSchema)
      ).toThrow(SchemaValidationError);
    });

    it("should throw error for object without parse method", () => {
      const invalidSchema = { safeParse: () => {}, _def: {} };
      expect(() =>
        registry.registerSchema("test", invalidSchema as unknown as z.ZodSchema)
      ).toThrow(SchemaValidationError);
    });

    it("should throw error for object without safeParse method", () => {
      const invalidSchema = { parse: () => {}, _def: {} };
      expect(() =>
        registry.registerSchema("test", invalidSchema as unknown as z.ZodSchema)
      ).toThrow(SchemaValidationError);
    });

    it("should throw error for object without _def property", () => {
      const invalidSchema = { parse: () => {}, safeParse: () => {} };
      expect(() =>
        registry.registerSchema("test", invalidSchema as unknown as z.ZodSchema)
      ).toThrow(SchemaValidationError);
    });
  });

  describe("getSchema()", () => {
    it("should return registered schema", () => {
      registry.registerSchema("user", userSchema);

      const retrieved = registry.getSchema("user");
      expect(retrieved).toBe(userSchema);
    });

    it("should return undefined for non-existent schema", () => {
      const retrieved = registry.getSchema("nonexistent");
      expect(retrieved).toBeUndefined();
    });

    it("should update access statistics on retrieval", () => {
      registry.registerSchema("user", userSchema);

      const entryBefore = registry.getSchemaEntry("user");
      const accessCountBefore = entryBefore?.accessCount ?? 0;

      registry.getSchema("user");
      registry.getSchema("user");

      const entryAfter = registry.getSchemaEntry("user");
      expect(entryAfter?.accessCount).toBe(accessCountBefore + 2);
    });

    it("should update lastAccessedAt on retrieval", () => {
      registry.registerSchema("user", userSchema);

      const entryBefore = registry.getSchemaEntry("user");
      const lastAccessedBefore = entryBefore?.lastAccessedAt;

      // Small delay to ensure time difference
      registry.getSchema("user");

      const entryAfter = registry.getSchemaEntry("user");
      expect(entryAfter?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(
        lastAccessedBefore?.getTime() ?? 0
      );
    });
  });

  describe("getSchemaEntry()", () => {
    it("should return full schema entry with metadata", () => {
      registry.registerSchema("user", userSchema, {
        description: "User schema",
        version: "1.0.0",
      });

      const entry = registry.getSchemaEntry("user");

      expect(entry).toBeDefined();
      expect(entry?.name).toBe("user");
      expect(entry?.schema).toBe(userSchema);
      expect(entry?.metadata.description).toBe("User schema");
      expect(entry?.registeredAt).toBeInstanceOf(Date);
      expect(entry?.lastAccessedAt).toBeInstanceOf(Date);
      expect(entry?.accessCount).toBe(0);
    });

    it("should return undefined for non-existent schema", () => {
      const entry = registry.getSchemaEntry("nonexistent");
      expect(entry).toBeUndefined();
    });
  });

  describe("hasSchema()", () => {
    it("should return true for registered schema", () => {
      registry.registerSchema("user", userSchema);
      expect(registry.hasSchema("user")).toBe(true);
    });

    it("should return false for non-existent schema", () => {
      expect(registry.hasSchema("nonexistent")).toBe(false);
    });
  });

  describe("unregisterSchema()", () => {
    it("should remove registered schema", () => {
      registry.registerSchema("user", userSchema);
      expect(registry.hasSchema("user")).toBe(true);

      const result = registry.unregisterSchema("user");

      expect(result).toBe(true);
      expect(registry.hasSchema("user")).toBe(false);
    });

    it("should return false for non-existent schema", () => {
      const result = registry.unregisterSchema("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("getSchemaNames()", () => {
    it("should return empty array when no schemas registered", () => {
      expect(registry.getSchemaNames()).toEqual([]);
    });

    it("should return all registered schema names", () => {
      registry.registerSchema("user", userSchema);
      registry.registerSchema("address", addressSchema);
      registry.registerSchema("simple", simpleSchema);

      const names = registry.getSchemaNames();

      expect(names).toHaveLength(3);
      expect(names).toContain("user");
      expect(names).toContain("address");
      expect(names).toContain("simple");
    });
  });

  describe("getSchemaCount()", () => {
    it("should return 0 when no schemas registered", () => {
      expect(registry.getSchemaCount()).toBe(0);
    });

    it("should return correct count", () => {
      registry.registerSchema("user", userSchema);
      registry.registerSchema("address", addressSchema);

      expect(registry.getSchemaCount()).toBe(2);
    });
  });

  describe("clear()", () => {
    it("should remove all schemas", () => {
      registry.registerSchema("user", userSchema);
      registry.registerSchema("address", addressSchema);

      expect(registry.getSchemaCount()).toBe(2);

      registry.clear();

      expect(registry.getSchemaCount()).toBe(0);
      expect(registry.hasSchema("user")).toBe(false);
      expect(registry.hasSchema("address")).toBe(false);
    });
  });

  describe("validateSchemaDefinition()", () => {
    it("should not throw for valid Zod schema", () => {
      expect(() => registry.validateSchemaDefinition("test", userSchema)).not.toThrow();
    });

    it("should throw for null schema", () => {
      expect(() => registry.validateSchemaDefinition("test", null)).toThrow(SchemaValidationError);
    });

    it("should throw for undefined schema", () => {
      expect(() => registry.validateSchemaDefinition("test", undefined)).toThrow(
        SchemaValidationError
      );
    });

    it("should throw for primitive value", () => {
      expect(() => registry.validateSchemaDefinition("test", "string")).toThrow(
        SchemaValidationError
      );
      expect(() => registry.validateSchemaDefinition("test", 123)).toThrow(SchemaValidationError);
      expect(() => registry.validateSchemaDefinition("test", true)).toThrow(SchemaValidationError);
    });

    it("should throw for plain object without Zod methods", () => {
      expect(() => registry.validateSchemaDefinition("test", {})).toThrow(SchemaValidationError);
    });

    it("should include schema name in error", () => {
      try {
        registry.validateSchemaDefinition("mySchema", null);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(SchemaValidationError);
        expect((error as SchemaValidationError).schemaName).toBe("mySchema");
      }
    });
  });

  describe("LRU cache eviction (Requirement 9.4)", () => {
    it("should evict least recently used schema when cache is full", () => {
      const smallRegistry = new SchemaRegistry({ maxCacheSize: 3 });

      smallRegistry.registerSchema("schema1", z.string());
      smallRegistry.registerSchema("schema2", z.number());
      smallRegistry.registerSchema("schema3", z.boolean());

      // Access schema1 and schema3 to make schema2 the LRU
      smallRegistry.getSchema("schema1");
      smallRegistry.getSchema("schema3");

      // Register a new schema, should evict schema2
      smallRegistry.registerSchema("schema4", z.array(z.string()));

      expect(smallRegistry.hasSchema("schema1")).toBe(true);
      expect(smallRegistry.hasSchema("schema2")).toBe(false); // Evicted
      expect(smallRegistry.hasSchema("schema3")).toBe(true);
      expect(smallRegistry.hasSchema("schema4")).toBe(true);
    });

    it("should not evict when updating existing schema", () => {
      const smallRegistry = new SchemaRegistry({ maxCacheSize: 2 });

      smallRegistry.registerSchema("schema1", z.string());
      smallRegistry.registerSchema("schema2", z.number());

      // Update existing schema should not trigger eviction
      smallRegistry.registerSchema("schema1", z.string().min(1));

      expect(smallRegistry.getSchemaCount()).toBe(2);
      expect(smallRegistry.hasSchema("schema1")).toBe(true);
      expect(smallRegistry.hasSchema("schema2")).toBe(true);
    });
  });

  describe("getCacheStats()", () => {
    it("should return correct stats for empty registry", () => {
      const stats = registry.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100); // Default
      expect(stats.hitRate).toBe(0);
      expect(stats.totalAccesses).toBe(0);
    });

    it("should return correct stats after registrations and accesses", () => {
      registry.registerSchema("user", userSchema);
      registry.registerSchema("address", addressSchema);

      registry.getSchema("user");
      registry.getSchema("user");
      registry.getSchema("address");

      const stats = registry.getCacheStats();

      expect(stats.size).toBe(2);
      expect(stats.totalAccesses).toBe(3);
      expect(stats.hitRate).toBe(1.5); // 3 accesses / 2 schemas
    });
  });

  describe("configuration options", () => {
    it("should respect maxCacheSize option", () => {
      const smallRegistry = new SchemaRegistry({ maxCacheSize: 2 });

      smallRegistry.registerSchema("schema1", z.string());
      smallRegistry.registerSchema("schema2", z.number());
      smallRegistry.registerSchema("schema3", z.boolean());

      expect(smallRegistry.getSchemaCount()).toBe(2);
    });

    it("should skip validation when validateOnRegister is false", () => {
      const noValidationRegistry = new SchemaRegistry({ validateOnRegister: false });

      // This would normally throw, but validation is disabled
      const invalidSchema = { parse: () => {}, safeParse: () => {} };
      expect(() =>
        noValidationRegistry.registerSchema("test", invalidSchema as unknown as z.ZodSchema)
      ).not.toThrow();
    });
  });

  describe("createSchemaRegistry()", () => {
    it("should create a new SchemaRegistry instance", () => {
      const newRegistry = createSchemaRegistry();

      expect(newRegistry).toBeInstanceOf(SchemaRegistry);
      expect(newRegistry.getSchemaCount()).toBe(0);
    });

    it("should create instance with custom config", () => {
      const customRegistry = createSchemaRegistry({ maxCacheSize: 50 });

      const stats = customRegistry.getCacheStats();
      expect(stats.maxSize).toBe(50);
    });

    it("should create independent instances", () => {
      const registry1 = createSchemaRegistry();
      const registry2 = createSchemaRegistry();

      registry1.registerSchema("test", z.string());

      expect(registry1.hasSchema("test")).toBe(true);
      expect(registry2.hasSchema("test")).toBe(false);
    });
  });

  describe("schema round-trip (Requirement 3.1)", () => {
    it("should return equivalent schema that produces identical validation results", () => {
      registry.registerSchema("user", userSchema);

      const retrieved = registry.getSchema("user");

      // Valid input should pass both
      const validInput = { name: "John", email: "john@example.com", age: 30 };
      const originalResult = userSchema.safeParse(validInput);
      const retrievedResult = retrieved?.safeParse(validInput);

      expect(originalResult.success).toBe(true);
      expect(retrievedResult?.success).toBe(true);

      // Invalid input should fail both with same errors
      const invalidInput = { name: "", email: "invalid", age: -1 };
      const originalInvalid = userSchema.safeParse(invalidInput);
      const retrievedInvalid = retrieved?.safeParse(invalidInput);

      expect(originalInvalid.success).toBe(false);
      expect(retrievedInvalid?.success).toBe(false);
    });
  });
});
