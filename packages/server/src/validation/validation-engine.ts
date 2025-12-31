/**
 * Validation Engine
 *
 * Core validation engine that orchestrates validation and error collection.
 * Integrates ZodErrorTransformer, ErrorAggregator, SuggestionGenerator, ValueSanitizer,
 * and SchemaRegistry for comprehensive validation.
 *
 * Requirements: 1.1, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4
 */

import type { ZodSchema } from "zod";
import { metrics } from "../monitoring/metrics-collector.js";
import { StructuredLogger } from "../monitoring/structured-logger.js";
import { ErrorAggregator } from "./error-aggregator.js";
import { SchemaNotFoundError, SchemaRegistry, type SchemaMetadata } from "./schema-registry.js";
import { SuggestionGenerator } from "./suggestion-generator.js";
import type { FieldError, ValidationContext, ValidationResult } from "./types.js";
import { ValueSanitizer } from "./value-sanitizer.js";
import { ZodErrorTransformer } from "./zod-transformer.js";

/**
 * Configuration options for ValidationEngine
 *
 * Requirements: 9.1, 9.2, 10.1, 10.2, 10.3, 10.4
 */
export interface ValidationEngineConfig {
  /** Maximum value length before truncation in error output (default: 100) */
  maxValueLength?: number;

  /** Sensitive field patterns to sanitize */
  sensitivePatterns?: RegExp[];

  /** Whether to collect all errors or fail fast (default: true) */
  collectAllErrors?: boolean;

  /** Similarity threshold for enum suggestions (default: 0.7) */
  similarityThreshold?: number;

  /** Maximum number of schemas to cache (default: 100) */
  maxCacheSize?: number;

  /** Whether to validate schemas on registration (default: true) */
  validateOnRegister?: boolean;

  /** Whether to enable logging (default: true) */
  enableLogging?: boolean;

  /** Custom logger instance (default: creates new StructuredLogger) */
  logger?: StructuredLogger;

  /** Whether to enable metrics emission (default: true) */
  enableMetrics?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<ValidationEngineConfig, "logger">> & {
  logger?: StructuredLogger;
} = {
  maxValueLength: 100,
  sensitivePatterns: [],
  collectAllErrors: true,
  similarityThreshold: 0.7,
  maxCacheSize: 100,
  validateOnRegister: true,
  enableLogging: true,
  enableMetrics: true,
  logger: undefined,
};

/**
 * ValidationEngine class
 *
 * Core validation engine that orchestrates validation and error collection.
 * Integrates all validation components for comprehensive validation.
 *
 * Features:
 * - Validates input against Zod schemas or registered schema names
 * - Transforms Zod errors into standardized FieldError format
 * - Aggregates all errors without short-circuiting
 * - Sanitizes sensitive values in error output
 * - Generates actionable suggestions for each error
 * - Tracks validation timing for performance monitoring
 * - Caches schemas for improved performance
 * - Logs validation failures with field details (DEBUG) and summaries (INFO)
 * - Emits metrics for validation failure rates by endpoint and error type
 *
 * Requirements: 1.1, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4
 */
export class ValidationEngine {
  private readonly config: Required<Omit<ValidationEngineConfig, "logger">> & {
    logger?: StructuredLogger;
  };
  private readonly valueSanitizer: ValueSanitizer;
  private readonly suggestionGenerator: SuggestionGenerator;
  private readonly zodErrorTransformer: ZodErrorTransformer;
  private readonly schemaRegistry: SchemaRegistry;
  private readonly logger: StructuredLogger;

  constructor(config: ValidationEngineConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize logger
    this.logger = config.logger ?? new StructuredLogger({ component: "validation" });

    // Initialize components with configuration
    this.valueSanitizer = new ValueSanitizer({
      maxValueLength: this.config.maxValueLength,
      sensitivePatterns:
        this.config.sensitivePatterns.length > 0 ? this.config.sensitivePatterns : undefined,
    });

    this.suggestionGenerator = new SuggestionGenerator(this.config.similarityThreshold);

    this.zodErrorTransformer = new ZodErrorTransformer({
      suggestionGenerator: this.suggestionGenerator,
      valueSanitizer: this.valueSanitizer,
    });

    this.schemaRegistry = new SchemaRegistry({
      maxCacheSize: this.config.maxCacheSize,
      validateOnRegister: this.config.validateOnRegister,
    });
  }

  /**
   * Validate input against a schema
   *
   * Validates the input and returns a ValidationResult with all errors.
   * Supports both Zod schemas and registered schema names.
   *
   * Logging behavior (Requirements 10.1, 10.2, 10.3):
   * - DEBUG: Logs field-level error details for each validation failure
   * - INFO: Logs validation failure summary with error count
   * - All logs include request context (endpoint, userId, requestId)
   *
   * Metrics behavior (Requirement 10.4):
   * - Emits validation_failures_total counter by endpoint
   * - Emits validation_errors_by_type counter by error code
   *
   * @param input - The input to validate
   * @param schema - Zod schema or registered schema name
   * @param context - Partial validation context (requestId and timestamp will be auto-generated if not provided)
   * @returns ValidationResult with all errors
   *
   * Requirements: 1.1, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4
   */
  validate<T>(
    input: unknown,
    schema: ZodSchema<T> | string,
    context: Partial<ValidationContext> = {}
  ): ValidationResult {
    const startTime = performance.now();

    // Build complete validation context
    const fullContext: ValidationContext = {
      endpoint: context.endpoint ?? "unknown",
      operation: context.operation ?? "validate",
      userId: context.userId,
      requestId: context.requestId ?? this.generateRequestId(),
      timestamp: context.timestamp ?? new Date(),
    };

    // Resolve schema if string name provided
    const resolvedSchema = this.resolveSchema<T>(schema);
    const schemaName = typeof schema === "string" ? schema : "inline";

    // Create error aggregator for this validation
    const aggregator = new ErrorAggregator();

    // Perform validation
    const result = resolvedSchema.safeParse(input);

    if (!result.success) {
      // Transform Zod errors to FieldErrors
      const fieldErrors = this.zodErrorTransformer.transform(result.error, input);

      // Add all errors to aggregator
      for (const error of fieldErrors) {
        aggregator.addError(error);
      }

      // Log validation failures if logging is enabled
      if (this.config.enableLogging) {
        this.logValidationFailure(fieldErrors, fullContext, schemaName);
      }

      // Emit metrics if metrics are enabled (Requirement 10.4)
      if (this.config.enableMetrics) {
        this.emitValidationMetrics(fieldErrors, fullContext);
      }
    }

    // Build and return result
    return aggregator.buildResult(fullContext, startTime);
  }

  /**
   * Register a named schema for reuse
   *
   * @param name - Schema name
   * @param schema - Zod schema
   * @param metadata - Optional schema metadata
   *
   * Requirements: 3.1
   */
  registerSchema(name: string, schema: ZodSchema, metadata?: SchemaMetadata): void {
    this.schemaRegistry.registerSchema(name, schema, metadata);
  }

  /**
   * Get a registered schema by name
   *
   * @param name - Schema name
   * @returns The registered schema or undefined
   *
   * Requirements: 3.1
   */
  getSchema(name: string): ZodSchema | undefined {
    return this.schemaRegistry.getSchema(name);
  }

  /**
   * Check if a schema is registered
   *
   * @param name - Schema name
   * @returns true if schema exists
   */
  hasSchema(name: string): boolean {
    return this.schemaRegistry.hasSchema(name);
  }

  /**
   * Unregister a schema by name
   *
   * @param name - Schema name
   * @returns true if schema was removed
   */
  unregisterSchema(name: string): boolean {
    return this.schemaRegistry.unregisterSchema(name);
  }

  /**
   * Get all registered schema names
   *
   * @returns Array of schema names
   */
  getSchemaNames(): string[] {
    return this.schemaRegistry.getSchemaNames();
  }

  /**
   * Get the current configuration
   *
   * @returns Current configuration (read-only copy)
   */
  getConfig(): Readonly<
    Required<Omit<ValidationEngineConfig, "logger">> & {
      enableLogging: boolean;
      enableMetrics: boolean;
    }
  > {
    const { logger: _logger, ...configWithoutLogger } = this.config;
    return configWithoutLogger;
  }

  /**
   * Get cache statistics from the schema registry
   *
   * @returns Cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalAccesses: number;
  } {
    return this.schemaRegistry.getCacheStats();
  }

  /**
   * Resolve a schema from name or return the schema directly
   *
   * @param schema - Zod schema or registered schema name
   * @returns Resolved Zod schema
   * @throws SchemaNotFoundError if schema name is not registered
   */
  private resolveSchema<T>(schema: ZodSchema<T> | string): ZodSchema<T> {
    if (typeof schema === "string") {
      const registeredSchema = this.schemaRegistry.getSchema(schema);
      if (!registeredSchema) {
        throw new SchemaNotFoundError(schema);
      }
      return registeredSchema as ZodSchema<T>;
    }
    return schema;
  }

  /**
   * Generate a unique request ID
   *
   * @returns Unique request ID string
   */
  private generateRequestId(): string {
    // Generate a simple unique ID using timestamp and random component
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `req_${timestamp}_${random}`;
  }

  /**
   * Log validation failure details
   *
   * Logs field-level error details at DEBUG level and a summary at INFO level.
   * Includes request context (endpoint, userId, requestId) in all logs.
   *
   * @param errors - Array of field errors
   * @param context - Validation context with request information
   * @param schemaName - Name of the schema being validated against
   *
   * Requirements: 10.1, 10.2, 10.3
   */
  private logValidationFailure(
    errors: FieldError[],
    context: ValidationContext,
    schemaName: string
  ): void {
    // Build request context for logging
    const requestContext: Record<string, unknown> = {
      endpoint: context.endpoint,
      operation: context.operation,
      schema: schemaName,
    };

    // Include userId if available (Requirement 10.3)
    if (context.userId) {
      requestContext.userId = context.userId;
    }

    // Log field-level details at DEBUG level (Requirement 10.1)
    for (const error of errors) {
      this.logger.debug(`Validation error on field "${error.path}": ${error.message}`, {
        operation: "validate",
        traceId: context.requestId,
        context: {
          ...requestContext,
          field: error.path,
          code: error.code,
          constraint: error.constraint,
          expected: error.expected,
          suggestion: error.suggestion,
        },
      });
    }

    // Log validation failure summary at INFO level (Requirement 10.2)
    const fieldPaths = errors.map((e) => e.path).join(", ");
    const errorCodes = [...new Set(errors.map((e) => e.code))].join(", ");

    this.logger.info(`Validation failed: ${errors.length} error(s) on fields [${fieldPaths}]`, {
      operation: "validate",
      traceId: context.requestId,
      context: {
        ...requestContext,
        errorCount: errors.length,
        errorCodes,
        fields: errors.map((e) => e.path),
      },
    });
  }

  /**
   * Emit validation metrics
   *
   * Emits metrics for validation failure rates by endpoint and error type.
   *
   * @param errors - Array of field errors
   * @param context - Validation context with request information
   *
   * Requirement: 10.4
   */
  private emitValidationMetrics(errors: FieldError[], context: ValidationContext): void {
    // Emit validation_failures_total counter by endpoint
    metrics.incrementCounter("validation_failures_total", 1, {
      labels: {
        endpoint: context.endpoint,
        operation: context.operation,
      },
    });

    // Emit validation_errors_by_type counter for each unique error code
    const errorCodeCounts = new Map<string, number>();
    for (const error of errors) {
      const count = errorCodeCounts.get(error.code) ?? 0;
      errorCodeCounts.set(error.code, count + 1);
    }

    for (const [errorCode, count] of errorCodeCounts) {
      metrics.incrementCounter("validation_errors_by_type", count, {
        labels: {
          endpoint: context.endpoint,
          error_type: errorCode,
        },
      });
    }
  }
}

/**
 * Create a ValidationEngine with custom configuration
 *
 * @param config - Configuration options
 * @returns Configured ValidationEngine instance
 */
export function createValidationEngine(config: ValidationEngineConfig = {}): ValidationEngine {
  return new ValidationEngine(config);
}
