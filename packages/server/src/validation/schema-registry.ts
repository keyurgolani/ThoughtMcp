/**
 * Schema Registry
 *
 * Provides schema storage, retrieval, and caching for validation schemas.
 * Supports registering Zod schemas by name for reuse across endpoints.
 *
 * Requirements: 3.1, 3.4, 9.4
 */

import type { ZodSchema, ZodType } from "zod";

/**
 * Schema registry entry with metadata and caching
 *
 * Requirements: 3.1, 9.4
 */
export interface SchemaRegistryEntry {
  /** Schema name */
  name: string;

  /** The Zod schema */
  schema: ZodSchema;

  /** Registration timestamp */
  registeredAt: Date;

  /** Last access timestamp for cache management */
  lastAccessedAt: Date;

  /** Number of times the schema has been accessed */
  accessCount: number;

  /** Schema metadata */
  metadata: SchemaMetadata;
}

/**
 * Schema metadata for documentation and debugging
 */
export interface SchemaMetadata {
  /** Human-readable description of the schema */
  description?: string;

  /** Schema version for tracking changes */
  version?: string;

  /** Example valid inputs for documentation */
  examples?: unknown[];
}

/**
 * Configuration options for SchemaRegistry
 */
export interface SchemaRegistryConfig {
  /** Maximum number of schemas to cache (default: 100) */
  maxCacheSize?: number;

  /** Whether to validate schemas on registration (default: true) */
  validateOnRegister?: boolean;
}

/**
 * Error thrown when schema validation fails
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly schemaName: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = "SchemaValidationError";
  }
}

/**
 * Error thrown when schema is not found
 */
export class SchemaNotFoundError extends Error {
  constructor(schemaName: string) {
    super(`Schema not found: ${schemaName}`);
    this.name = "SchemaNotFoundError";
  }
}

/**
 * SchemaRegistry class
 *
 * Provides methods to register, retrieve, and manage validation schemas:
 * - Register schemas by name for reuse across endpoints
 * - Validate schema definitions on registration
 * - Cache schemas for improved performance
 * - Track schema usage statistics
 *
 * Requirements: 3.1, 3.4, 9.4
 */
export class SchemaRegistry {
  private readonly schemas: Map<string, SchemaRegistryEntry> = new Map();
  private readonly maxCacheSize: number;
  private readonly validateOnRegister: boolean;

  constructor(config: SchemaRegistryConfig = {}) {
    this.maxCacheSize = config.maxCacheSize ?? 100;
    this.validateOnRegister = config.validateOnRegister ?? true;
  }

  /**
   * Register a schema by name
   *
   * Validates the schema definition if validateOnRegister is enabled.
   * Evicts least recently used schemas if cache is full.
   *
   * @param name - Unique schema name
   * @param schema - Zod schema to register
   * @param metadata - Optional schema metadata
   * @throws SchemaValidationError if schema validation fails
   *
   * Requirements: 3.1, 3.4
   */
  registerSchema(name: string, schema: ZodSchema, metadata: SchemaMetadata = {}): void {
    // Validate schema name
    if (!name || typeof name !== "string") {
      throw new SchemaValidationError("Schema name must be a non-empty string", name || "unknown");
    }

    if (name.trim() !== name) {
      throw new SchemaValidationError(
        "Schema name must not have leading or trailing whitespace",
        name
      );
    }

    // Validate schema definition
    if (this.validateOnRegister) {
      this.validateSchemaDefinition(name, schema);
    }

    // Evict LRU schema if cache is full
    if (this.schemas.size >= this.maxCacheSize && !this.schemas.has(name)) {
      this.evictLeastRecentlyUsed();
    }

    const now = new Date();
    const entry: SchemaRegistryEntry = {
      name,
      schema,
      registeredAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      metadata,
    };

    this.schemas.set(name, entry);
  }

  /**
   * Get a registered schema by name
   *
   * Updates access statistics for cache management.
   * Uses Map reordering for reliable LRU tracking.
   *
   * @param name - Schema name
   * @returns The registered schema or undefined if not found
   *
   * Requirements: 3.1, 9.4
   */
  getSchema(name: string): ZodSchema | undefined {
    const entry = this.schemas.get(name);

    if (!entry) {
      return undefined;
    }

    // Update access statistics for LRU cache management
    entry.lastAccessedAt = new Date();
    entry.accessCount++;

    // Reorder in Map for reliable LRU tracking (most recently used at end)
    this.schemas.delete(name);
    this.schemas.set(name, entry);

    return entry.schema;
  }

  /**
   * Get a registered schema entry with metadata
   *
   * @param name - Schema name
   * @returns The schema registry entry or undefined if not found
   */
  getSchemaEntry(name: string): SchemaRegistryEntry | undefined {
    return this.schemas.get(name);
  }

  /**
   * Check if a schema is registered
   *
   * @param name - Schema name
   * @returns true if schema exists
   */
  hasSchema(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Unregister a schema by name
   *
   * @param name - Schema name
   * @returns true if schema was removed, false if not found
   */
  unregisterSchema(name: string): boolean {
    return this.schemas.delete(name);
  }

  /**
   * Get all registered schema names
   *
   * @returns Array of schema names
   */
  getSchemaNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get the number of registered schemas
   *
   * @returns Number of schemas in registry
   */
  getSchemaCount(): number {
    return this.schemas.size;
  }

  /**
   * Clear all registered schemas
   */
  clear(): void {
    this.schemas.clear();
  }

  /**
   * Validate a schema definition
   *
   * Checks that the schema is a valid Zod schema with required methods.
   *
   * @param name - Schema name for error reporting
   * @param schema - Schema to validate
   * @throws SchemaValidationError if validation fails
   *
   * Requirements: 3.4
   */
  validateSchemaDefinition(name: string, schema: unknown): void {
    // Check that schema is defined
    if (schema === null || schema === undefined) {
      throw new SchemaValidationError("Schema cannot be null or undefined", name);
    }

    // Check that schema is an object
    if (typeof schema !== "object") {
      throw new SchemaValidationError(
        `Schema must be an object, got ${typeof schema}`,
        name,
        `Expected a Zod schema object`
      );
    }

    const zodSchema = schema as ZodType;

    // Check for required Zod schema methods
    if (typeof zodSchema.parse !== "function") {
      throw new SchemaValidationError(
        "Schema must have a parse method",
        name,
        "Expected a valid Zod schema with parse() method"
      );
    }

    if (typeof zodSchema.safeParse !== "function") {
      throw new SchemaValidationError(
        "Schema must have a safeParse method",
        name,
        "Expected a valid Zod schema with safeParse() method"
      );
    }

    // Check for _def property which all Zod schemas have
    if (!("_def" in zodSchema)) {
      throw new SchemaValidationError(
        "Schema must be a valid Zod schema",
        name,
        "Missing _def property - not a valid Zod schema"
      );
    }
  }

  /**
   * Evict the least recently used schema from cache
   *
   * Uses Map iteration order (first entry is LRU due to reordering on access)
   *
   * Requirements: 9.4
   */
  private evictLeastRecentlyUsed(): void {
    // Map maintains insertion order, and we reorder on access
    // So the first entry is the least recently used
    const firstKey = this.schemas.keys().next().value;
    if (firstKey !== undefined) {
      this.schemas.delete(firstKey);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics object
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalAccesses: number;
  } {
    let totalAccesses = 0;

    for (const entry of this.schemas.values()) {
      totalAccesses += entry.accessCount;
    }

    return {
      size: this.schemas.size,
      maxSize: this.maxCacheSize,
      hitRate: this.schemas.size > 0 ? totalAccesses / this.schemas.size : 0,
      totalAccesses,
    };
  }
}

/**
 * Create a SchemaRegistry instance
 *
 * @param config - Configuration options
 * @returns New SchemaRegistry instance
 */
export function createSchemaRegistry(config: SchemaRegistryConfig = {}): SchemaRegistry {
  return new SchemaRegistry(config);
}
