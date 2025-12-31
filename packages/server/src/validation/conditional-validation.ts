/**
 * Conditional Validation Support
 *
 * Provides when/unless conditional validation rules that allow field-dependent validation.
 * Enables validation rules to be applied conditionally based on other field values.
 *
 * Requirements: 3.3
 */

import { type ZodObject, type ZodRawShape, type ZodSchema, type ZodTypeAny, z } from "zod";

/**
 * Condition function type that receives the full input context
 * and returns whether the condition is satisfied
 */
export type ConditionFn<T = unknown> = (input: T) => boolean;

/**
 * Conditional validation rule configuration
 */
export interface ConditionalRule<T = unknown> {
  /** Field path to apply conditional validation to */
  field: string;

  /** Condition that must be satisfied for the rule to apply */
  condition: ConditionFn<T>;

  /** Schema to apply when condition is satisfied (for 'when' rules) */
  thenSchema?: ZodTypeAny;

  /** Schema to apply when condition is NOT satisfied (for 'unless' rules) */
  otherwiseSchema?: ZodTypeAny;

  /** Human-readable description of the condition for error messages */
  description?: string;
}

/**
 * Configuration for conditional validation builder
 */
export interface ConditionalValidationConfig {
  /** Base schema to apply conditional rules to */
  baseSchema: ZodObject<ZodRawShape>;

  /** Array of conditional rules to apply */
  rules: ConditionalRule[];
}

/**
 * Error thrown when conditional validation configuration is invalid
 */
export class ConditionalValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = "ConditionalValidationError";
  }
}

/**
 * ConditionalValidationBuilder class
 *
 * Provides a fluent API for building schemas with conditional validation rules.
 * Supports 'when' (apply if condition is true) and 'unless' (apply if condition is false) patterns.
 *
 * Example usage:
 * ```typescript
 * const schema = new ConditionalValidationBuilder(baseSchema)
 *   .when(
 *     (input) => input.type === 'premium',
 *     { premiumFeatures: z.array(z.string()).min(1) },
 *     'type is premium'
 *   )
 *   .unless(
 *     (input) => input.isGuest,
 *     { email: z.string().email() },
 *     'user is not a guest'
 *   )
 *   .build();
 * ```
 *
 * Requirements: 3.3
 */
export class ConditionalValidationBuilder<T extends ZodRawShape = ZodRawShape> {
  private readonly baseSchema: ZodObject<T>;
  private readonly rules: ConditionalRule<z.infer<ZodObject<T>>>[] = [];

  constructor(baseSchema: ZodObject<T>) {
    this.baseSchema = baseSchema;
  }

  /**
   * Add a 'when' conditional rule
   *
   * The thenSchema is applied when the condition returns true.
   * Optionally, an otherwiseSchema can be applied when the condition returns false.
   *
   * @param condition - Function that receives the input and returns true if the rule should apply
   * @param thenSchema - Schema or shape to apply when condition is true
   * @param description - Human-readable description of the condition
   * @param otherwiseSchema - Optional schema to apply when condition is false
   * @returns this for chaining
   *
   * Requirements: 3.3
   */
  when(
    condition: ConditionFn<z.infer<ZodObject<T>>>,
    thenSchema: ZodRawShape | ZodTypeAny,
    description?: string,
    otherwiseSchema?: ZodRawShape | ZodTypeAny
  ): this {
    // Convert shape to schema if needed
    const thenZodSchema = this.normalizeSchema(thenSchema);
    const otherwiseZodSchema = otherwiseSchema ? this.normalizeSchema(otherwiseSchema) : undefined;

    this.rules.push({
      field: "*", // Applies to the whole object
      condition,
      thenSchema: thenZodSchema,
      otherwiseSchema: otherwiseZodSchema,
      description,
    });

    return this;
  }

  /**
   * Add an 'unless' conditional rule
   *
   * The thenSchema is applied when the condition returns false.
   * This is the inverse of 'when' - the rule applies unless the condition is true.
   *
   * @param condition - Function that receives the input and returns true if the rule should NOT apply
   * @param thenSchema - Schema or shape to apply when condition is false
   * @param description - Human-readable description of the condition
   * @returns this for chaining
   *
   * Requirements: 3.3
   */
  unless(
    condition: ConditionFn<z.infer<ZodObject<T>>>,
    thenSchema: ZodRawShape | ZodTypeAny,
    description?: string
  ): this {
    // Invert the condition for 'unless' semantics
    const invertedCondition: ConditionFn<z.infer<ZodObject<T>>> = (input) => !condition(input);

    return this.when(
      invertedCondition,
      thenSchema,
      description ? `NOT (${description})` : undefined
    );
  }

  /**
   * Add a field-specific 'when' conditional rule
   *
   * Applies additional validation to a specific field when the condition is true.
   *
   * @param field - Field path to apply the rule to
   * @param condition - Function that receives the input and returns true if the rule should apply
   * @param thenSchema - Schema to apply to the field when condition is true
   * @param description - Human-readable description of the condition
   * @returns this for chaining
   *
   * Requirements: 3.3
   */
  whenField(
    field: string,
    condition: ConditionFn<z.infer<ZodObject<T>>>,
    thenSchema: ZodTypeAny,
    description?: string
  ): this {
    this.rules.push({
      field,
      condition,
      thenSchema,
      description,
    });

    return this;
  }

  /**
   * Add a field-specific 'unless' conditional rule
   *
   * Applies additional validation to a specific field when the condition is false.
   *
   * @param field - Field path to apply the rule to
   * @param condition - Function that receives the input and returns true if the rule should NOT apply
   * @param thenSchema - Schema to apply to the field when condition is false
   * @param description - Human-readable description of the condition
   * @returns this for chaining
   *
   * Requirements: 3.3
   */
  unlessField(
    field: string,
    condition: ConditionFn<z.infer<ZodObject<T>>>,
    thenSchema: ZodTypeAny,
    description?: string
  ): this {
    const invertedCondition: ConditionFn<z.infer<ZodObject<T>>> = (input) => !condition(input);
    return this.whenField(
      field,
      invertedCondition,
      thenSchema,
      description ? `NOT (${description})` : undefined
    );
  }

  /**
   * Build the final schema with all conditional rules applied
   *
   * Creates a Zod schema that applies conditional validation using superRefine.
   * The base schema is validated first, then conditional rules are evaluated
   * and applied based on the input values.
   *
   * @returns A Zod schema with conditional validation
   *
   * Requirements: 3.3
   */
  build(): ZodSchema<z.infer<ZodObject<T>>> {
    const rules = [...this.rules];

    // Use passthrough() to preserve unknown keys for conditional validation
    // This allows conditional schemas to validate fields not in the base schema
    const passthroughSchema = this.baseSchema.passthrough();

    // Use superRefine to apply conditional validation after base validation
    return passthroughSchema.superRefine((data, ctx) => {
      for (const rule of rules) {
        const conditionResult = rule.condition(data as z.infer<ZodObject<T>>);

        if (conditionResult && rule.thenSchema) {
          // Condition is true, apply thenSchema
          this.applyConditionalSchema(data, rule.field, rule.thenSchema, ctx, rule.description);
        } else if (!conditionResult && rule.otherwiseSchema) {
          // Condition is false, apply otherwiseSchema
          // Use negated description for otherwise case
          const otherwiseDescription = rule.description ? `NOT (${rule.description})` : undefined;
          this.applyConditionalSchema(
            data,
            rule.field,
            rule.otherwiseSchema,
            ctx,
            otherwiseDescription
          );
        }
      }
    }) as ZodSchema<z.infer<ZodObject<T>>>;
  }

  /**
   * Get the current rules for inspection/testing
   *
   * @returns Array of conditional rules
   */
  getRules(): ReadonlyArray<ConditionalRule<z.infer<ZodObject<T>>>> {
    return [...this.rules];
  }

  /**
   * Normalize a schema input to a ZodTypeAny
   *
   * @param schema - Schema or shape to normalize
   * @returns ZodTypeAny schema
   */
  private normalizeSchema(schema: ZodRawShape | ZodTypeAny): ZodTypeAny {
    // Check if it's already a Zod schema (has _def property)
    if (this.isZodSchema(schema)) {
      return schema;
    }

    // It's a shape, convert to object schema with passthrough to allow extra fields
    return z.object(schema).passthrough();
  }

  /**
   * Type guard to check if a value is a Zod schema
   */
  private isZodSchema(value: ZodRawShape | ZodTypeAny): value is ZodTypeAny {
    return value && typeof value === "object" && "_def" in value;
  }

  /**
   * Apply a conditional schema to the data
   *
   * @param data - The input data
   * @param field - Field path or "*" for whole object
   * @param schema - Schema to apply
   * @param ctx - Zod refinement context for adding issues
   * @param description - Optional description for error messages
   */
  private applyConditionalSchema(
    data: unknown,
    field: string,
    schema: ZodTypeAny,
    ctx: z.RefinementCtx,
    description?: string
  ): void {
    if (field === "*") {
      // Apply to whole object - validate additional fields
      const result = schema.safeParse(data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: issue.path,
            message: description ? `${issue.message} (when ${description})` : issue.message,
          });
        }
      }
    } else {
      // Apply to specific field
      const fieldValue = this.getFieldValue(data, field);
      const result = schema.safeParse(fieldValue);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field, ...issue.path],
            message: description ? `${issue.message} (when ${description})` : issue.message,
          });
        }
      }
    }
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
 * Create a conditional validation builder for a base schema
 *
 * @param baseSchema - The base Zod object schema
 * @returns A new ConditionalValidationBuilder instance
 *
 * Requirements: 3.3
 */
export function createConditionalValidation<T extends ZodRawShape>(
  baseSchema: ZodObject<T>
): ConditionalValidationBuilder<T> {
  return new ConditionalValidationBuilder(baseSchema);
}

/**
 * Helper function to create a simple field-based condition
 *
 * Creates a condition function that checks if a field equals a specific value.
 *
 * @param field - Field path to check
 * @param value - Value to compare against
 * @returns Condition function
 *
 * Requirements: 3.3
 */
export function fieldEquals<T = unknown>(field: keyof T & string, value: unknown): ConditionFn<T> {
  return (input: T) => {
    if (!input || typeof input !== "object") {
      return false;
    }
    return (input as Record<string, unknown>)[field] === value;
  };
}

/**
 * Helper function to create a field existence condition
 *
 * Creates a condition function that checks if a field exists and is not null/undefined.
 *
 * @param field - Field path to check
 * @returns Condition function
 *
 * Requirements: 3.3
 */
export function fieldExists<T = unknown>(field: keyof T & string): ConditionFn<T> {
  return (input: T) => {
    if (!input || typeof input !== "object") {
      return false;
    }
    const value = (input as Record<string, unknown>)[field];
    return value !== null && value !== undefined;
  };
}

/**
 * Helper function to create a field truthy condition
 *
 * Creates a condition function that checks if a field is truthy.
 *
 * @param field - Field path to check
 * @returns Condition function
 *
 * Requirements: 3.3
 */
export function fieldTruthy<T = unknown>(field: keyof T & string): ConditionFn<T> {
  return (input: T) => {
    if (!input || typeof input !== "object") {
      return false;
    }
    return Boolean((input as Record<string, unknown>)[field]);
  };
}

/**
 * Helper function to create a field comparison condition
 *
 * Creates a condition function that compares a field value using a custom comparator.
 *
 * @param field - Field path to check
 * @param comparator - Comparison function
 * @returns Condition function
 *
 * Requirements: 3.3
 */
export function fieldMatches<T = unknown, V = unknown>(
  field: keyof T & string,
  comparator: (value: V) => boolean
): ConditionFn<T> {
  return (input: T) => {
    if (!input || typeof input !== "object") {
      return false;
    }
    const value = (input as Record<string, unknown>)[field] as V;
    return comparator(value);
  };
}

/**
 * Helper function to combine multiple conditions with AND logic
 *
 * @param conditions - Array of condition functions
 * @returns Combined condition function that returns true only if all conditions are true
 *
 * Requirements: 3.3
 */
export function allOf<T = unknown>(...conditions: ConditionFn<T>[]): ConditionFn<T> {
  return (input: T) => conditions.every((condition) => condition(input));
}

/**
 * Helper function to combine multiple conditions with OR logic
 *
 * @param conditions - Array of condition functions
 * @returns Combined condition function that returns true if any condition is true
 *
 * Requirements: 3.3
 */
export function anyOf<T = unknown>(...conditions: ConditionFn<T>[]): ConditionFn<T> {
  return (input: T) => conditions.some((condition) => condition(input));
}

/**
 * Helper function to negate a condition
 *
 * @param condition - Condition function to negate
 * @returns Negated condition function
 *
 * Requirements: 3.3
 */
export function not<T = unknown>(condition: ConditionFn<T>): ConditionFn<T> {
  return (input: T) => !condition(input);
}
