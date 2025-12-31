/**
 * Custom Validators Support
 *
 * Provides custom validation function registration and execution.
 * Custom validators receive the full input context including all field values.
 *
 * Requirements: 3.5
 */

import { type ZodObject, type ZodRawShape, type ZodSchema, z } from "zod";
import type { FieldError, ValidationErrorCode } from "./types.js";

/**
 * Full input context provided to custom validators
 *
 * Requirements: 3.5
 */
export interface CustomValidatorContext<T = unknown> {
  /** The complete input object being validated */
  input: T;

  /** The specific field value being validated */
  fieldValue: unknown;

  /** The path to the field being validated */
  fieldPath: string;

  /** Additional metadata about the validation */
  metadata: {
    /** The schema name if registered */
    schemaName?: string;

    /** The endpoint being validated */
    endpoint?: string;

    /** The operation being performed */
    operation?: string;
  };
}

/**
 * Result returned by a custom validator
 */
export interface CustomValidatorResult {
  /** Whether validation passed */
  valid: boolean;

  /** Error message if validation failed */
  message?: string;

  /** Description of what was expected (for error reporting) */
  expectedDescription?: string;

  /** Suggestion for fixing the error */
  suggestion?: string;
}

/**
 * Custom validator function type
 *
 * Receives the full input context and returns a validation result.
 *
 * Requirements: 3.5
 */
export type CustomValidatorFn<T = unknown> = (
  context: CustomValidatorContext<T>
) => CustomValidatorResult | Promise<CustomValidatorResult>;

/**
 * Configuration for a registered custom validator
 */
export interface CustomValidatorConfig<T = unknown> {
  /** Unique name for the validator */
  name: string;

  /** The validation function */
  validate: CustomValidatorFn<T>;

  /** Human-readable description of what the validator checks */
  description: string;

  /** Default error message if validation fails */
  defaultMessage?: string;

  /** Default suggestion if validation fails */
  defaultSuggestion?: string;
}

/**
 * Error thrown when custom validator registration fails
 */
export class CustomValidatorRegistrationError extends Error {
  constructor(
    message: string,
    public readonly validatorName: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = "CustomValidatorRegistrationError";
  }
}

/**
 * Error thrown when a custom validator is not found
 */
export class CustomValidatorNotFoundError extends Error {
  constructor(validatorName: string) {
    super(`Custom validator not found: ${validatorName}`);
    this.name = "CustomValidatorNotFoundError";
  }
}

/**
 * CustomValidatorRegistry class
 *
 * Manages registration and retrieval of custom validation functions.
 * Custom validators receive the full input context for cross-field validation.
 *
 * Requirements: 3.5
 */
export class CustomValidatorRegistry {
  private readonly validators: Map<string, CustomValidatorConfig> = new Map();

  /**
   * Register a custom validator
   *
   * @param config - Custom validator configuration
   * @throws CustomValidatorRegistrationError if registration fails
   *
   * Requirements: 3.5
   */
  register<T = unknown>(config: CustomValidatorConfig<T>): void {
    // Validate name
    if (!config.name || typeof config.name !== "string") {
      throw new CustomValidatorRegistrationError(
        "Validator name must be a non-empty string",
        config.name || "unknown"
      );
    }

    if (config.name.trim() !== config.name) {
      throw new CustomValidatorRegistrationError(
        "Validator name must not have leading or trailing whitespace",
        config.name
      );
    }

    // Validate function
    if (typeof config.validate !== "function") {
      throw new CustomValidatorRegistrationError(
        "Validator must have a validate function",
        config.name,
        "Expected a function that receives CustomValidatorContext"
      );
    }

    // Validate description
    if (!config.description || typeof config.description !== "string") {
      throw new CustomValidatorRegistrationError(
        "Validator must have a description",
        config.name,
        "Description is required for error reporting"
      );
    }

    this.validators.set(config.name, config as CustomValidatorConfig);
  }

  /**
   * Get a registered custom validator
   *
   * @param name - Validator name
   * @returns The validator configuration or undefined
   */
  get(name: string): CustomValidatorConfig | undefined {
    return this.validators.get(name);
  }

  /**
   * Check if a validator is registered
   *
   * @param name - Validator name
   * @returns true if validator exists
   */
  has(name: string): boolean {
    return this.validators.has(name);
  }

  /**
   * Unregister a custom validator
   *
   * @param name - Validator name
   * @returns true if validator was removed
   */
  unregister(name: string): boolean {
    return this.validators.delete(name);
  }

  /**
   * Get all registered validator names
   *
   * @returns Array of validator names
   */
  getValidatorNames(): string[] {
    return Array.from(this.validators.keys());
  }

  /**
   * Get the number of registered validators
   *
   * @returns Number of validators
   */
  getValidatorCount(): number {
    return this.validators.size;
  }

  /**
   * Clear all registered validators
   */
  clear(): void {
    this.validators.clear();
  }

  /**
   * Execute a custom validator
   *
   * @param name - Validator name
   * @param context - Validation context with full input
   * @returns Validation result
   * @throws CustomValidatorNotFoundError if validator is not registered
   *
   * Requirements: 3.5
   */
  async execute<T = unknown>(
    name: string,
    context: CustomValidatorContext<T>
  ): Promise<CustomValidatorResult> {
    const config = this.validators.get(name);

    if (!config) {
      throw new CustomValidatorNotFoundError(name);
    }

    try {
      const result = await config.validate(context as CustomValidatorContext);

      // Apply defaults if not provided
      if (!result.valid) {
        return {
          valid: false,
          message: result.message ?? config.defaultMessage ?? `Custom validation failed: ${name}`,
          expectedDescription: result.expectedDescription ?? config.description,
          suggestion:
            result.suggestion ??
            config.defaultSuggestion ??
            `Ensure the value meets: ${config.description}`,
        };
      }

      return result;
    } catch (error) {
      // Handle validator execution errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        message: `Custom validator '${name}' threw an error: ${errorMessage}`,
        expectedDescription: config.description,
        suggestion: "Check the input value and try again",
      };
    }
  }
}

/**
 * CustomValidationBuilder class
 *
 * Provides a fluent API for adding custom validators to Zod schemas.
 * Custom validators receive the full input context for cross-field validation.
 *
 * Example usage:
 * ```typescript
 * const registry = new CustomValidatorRegistry();
 * registry.register({
 *   name: 'passwordStrength',
 *   description: 'Password must contain uppercase, lowercase, and numbers',
 *   validate: (ctx) => ({
 *     valid: /[A-Z]/.test(ctx.fieldValue) && /[a-z]/.test(ctx.fieldValue) && /[0-9]/.test(ctx.fieldValue),
 *     message: 'Password is too weak'
 *   })
 * });
 *
 * const schema = new CustomValidationBuilder(baseSchema, registry)
 *   .addValidator('password', 'passwordStrength')
 *   .build();
 * ```
 *
 * Requirements: 3.5
 */
export class CustomValidationBuilder<T extends ZodRawShape = ZodRawShape> {
  private readonly baseSchema: ZodObject<T>;
  private readonly registry: CustomValidatorRegistry;
  private readonly fieldValidators: Map<string, string[]> = new Map();
  private readonly inlineValidators: Map<string, CustomValidatorFn[]> = new Map();

  constructor(baseSchema: ZodObject<T>, registry: CustomValidatorRegistry) {
    this.baseSchema = baseSchema;
    this.registry = registry;
  }

  /**
   * Add a registered custom validator to a field
   *
   * @param field - Field path to validate
   * @param validatorName - Name of the registered validator
   * @returns this for chaining
   *
   * Requirements: 3.5
   */
  addValidator(field: string, validatorName: string): this {
    if (!this.registry.has(validatorName)) {
      throw new CustomValidatorNotFoundError(validatorName);
    }

    const validators = this.fieldValidators.get(field) ?? [];
    validators.push(validatorName);
    this.fieldValidators.set(field, validators);

    return this;
  }

  /**
   * Add an inline custom validator to a field
   *
   * @param field - Field path to validate
   * @param validate - Validation function
   * @param description - Description for error reporting
   * @returns this for chaining
   *
   * Requirements: 3.5
   */
  addInlineValidator<TInput = z.infer<ZodObject<T>>>(
    field: string,
    validate: CustomValidatorFn<TInput>,
    _description?: string
  ): this {
    const validators = this.inlineValidators.get(field) ?? [];
    validators.push(validate as CustomValidatorFn);
    this.inlineValidators.set(field, validators);

    return this;
  }

  /**
   * Build the final schema with custom validators applied
   *
   * Creates a Zod schema that applies custom validation using superRefine.
   * Custom validators receive the full input context.
   *
   * @returns A Zod schema with custom validation
   *
   * Requirements: 3.5
   */
  build(): ZodSchema<z.infer<ZodObject<T>>> {
    const registry = this.registry;
    const fieldValidators = new Map(this.fieldValidators);
    const inlineValidators = new Map(this.inlineValidators);

    return this.baseSchema.superRefine(async (data, ctx) => {
      const input = data;

      // Execute registered validators
      for (const [field, validatorNames] of fieldValidators) {
        const fieldValue = this.getFieldValue(input, field);

        for (const validatorName of validatorNames) {
          const context: CustomValidatorContext<z.infer<ZodObject<T>>> = {
            input,
            fieldValue,
            fieldPath: field,
            metadata: {},
          };

          const result = await registry.execute(validatorName, context);

          if (!result.valid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: field.split("."),
              message: result.message ?? "Custom validation failed",
              params: {
                validatorName,
                expectedDescription: result.expectedDescription,
                suggestion: result.suggestion,
              },
            });
          }
        }
      }

      // Execute inline validators
      for (const [field, validators] of inlineValidators) {
        const fieldValue = this.getFieldValue(input, field);

        for (const validate of validators) {
          const context: CustomValidatorContext<z.infer<ZodObject<T>>> = {
            input,
            fieldValue,
            fieldPath: field,
            metadata: {},
          };

          const result = await validate(context);

          if (!result.valid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: field.split("."),
              message: result.message ?? "Custom validation failed",
              params: {
                expectedDescription: result.expectedDescription,
                suggestion: result.suggestion,
              },
            });
          }
        }
      }
    }) as ZodSchema<z.infer<ZodObject<T>>>;
  }

  /**
   * Get a field value from nested data using dot notation
   *
   * @param data - The input data
   * @param field - Field path in dot notation
   * @returns The field value or undefined
   */
  private getFieldValue(data: unknown, field: string): unknown {
    if (!data || typeof data !== "object") {
      return undefined;
    }

    const parts = field.split(".");
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}

/**
 * Convert a CustomValidatorResult to a FieldError
 *
 * @param result - Custom validator result
 * @param fieldPath - Path to the field
 * @param actualValue - The actual value that failed validation
 * @returns FieldError object
 */
export function customResultToFieldError(
  result: CustomValidatorResult,
  fieldPath: string,
  actualValue: unknown
): FieldError {
  return {
    code: "CUSTOM_VALIDATION_FAILED" as ValidationErrorCode,
    message: result.message ?? "Custom validation failed",
    path: fieldPath,
    constraint: "custom",
    actualValue,
    expected: {
      type: "custom",
      description: result.expectedDescription ?? "Custom validation requirement",
    },
    suggestion: result.suggestion ?? "Check the input value",
  };
}

/**
 * Create a CustomValidatorRegistry instance
 *
 * @returns New CustomValidatorRegistry instance
 */
export function createCustomValidatorRegistry(): CustomValidatorRegistry {
  return new CustomValidatorRegistry();
}

/**
 * Create a CustomValidationBuilder for a base schema
 *
 * @param baseSchema - The base Zod object schema
 * @param registry - The custom validator registry
 * @returns A new CustomValidationBuilder instance
 *
 * Requirements: 3.5
 */
export function createCustomValidation<T extends ZodRawShape>(
  baseSchema: ZodObject<T>,
  registry: CustomValidatorRegistry
): CustomValidationBuilder<T> {
  return new CustomValidationBuilder(baseSchema, registry);
}
