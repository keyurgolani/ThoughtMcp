/**
 * Validation System Module
 *
 * Exports validation types and utilities for the Enhanced Validation Error Reporting System.
 * Provides standardized error structures across all interfaces (MCP, REST API, UI).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 8.1, 8.3, 8.4, 9.5
 */

export type {
  ConstraintType,
  ExpectedConstraint,
  FieldError,
  ValidationContext,
  ValidationErrorCode,
  ValidationResult,
} from "./types.js";

export { ValueSanitizer, createValueSanitizer } from "./value-sanitizer.js";
export type { ValueSanitizerConfig } from "./value-sanitizer.js";

export { SuggestionGenerator, createSuggestionGenerator } from "./suggestion-generator.js";
export type { SuggestionInput } from "./suggestion-generator.js";

export { ErrorAggregator, createErrorAggregator } from "./error-aggregator.js";

export { ZodErrorTransformer, createZodErrorTransformer } from "./zod-transformer.js";
export type { ZodErrorTransformerConfig } from "./zod-transformer.js";

export {
  SchemaCompositionError,
  SchemaNotFoundError,
  SchemaRegistry,
  SchemaValidationError,
  createSchemaRegistry,
} from "./schema-registry.js";
export type {
  SchemaMetadata,
  SchemaRegistryConfig,
  SchemaRegistryEntry,
} from "./schema-registry.js";

export { ValidationEngine, createValidationEngine } from "./validation-engine.js";
export type { ValidationEngineConfig } from "./validation-engine.js";

// Formatters - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 8.1, 8.3, 8.4
export {
  MCPFormatter,
  RESTFormatter,
  UIFormatter,
  createMCPFormatter,
  createRESTFormatter,
  createUIFormatter,
} from "./formatters/index.js";
export type {
  ErrorFormatter,
  MCPValidationErrorResponse,
  RESTFieldErrorDetails,
  RESTValidationErrorResponse,
  UIValidationErrorResponse,
} from "./formatters/index.js";

// Serialization - Requirements: 6.1, 6.4, 6.5
export {
  parseValidationResult,
  stringifyValidationResult,
  validationResultFromJSON,
  validationResultToJSON,
} from "./serialization.js";
export type {
  SerializedFieldError,
  SerializedValidationContext,
  SerializedValidationResult,
} from "./serialization.js";

// Conditional Validation - Requirements: 3.3
export {
  ConditionalValidationBuilder,
  ConditionalValidationError,
  allOf,
  anyOf,
  createConditionalValidation,
  fieldEquals,
  fieldExists,
  fieldMatches,
  fieldTruthy,
  not,
} from "./conditional-validation.js";
export type {
  ConditionFn,
  ConditionalRule,
  ConditionalValidationConfig,
} from "./conditional-validation.js";

// Custom Validators - Requirements: 3.5
export {
  CustomValidationBuilder,
  CustomValidatorNotFoundError,
  CustomValidatorRegistrationError,
  CustomValidatorRegistry,
  createCustomValidation,
  createCustomValidatorRegistry,
  customResultToFieldError,
} from "./custom-validators.js";
export type {
  CustomValidatorConfig,
  CustomValidatorContext,
  CustomValidatorFn,
  CustomValidatorResult,
} from "./custom-validators.js";

// Built-in Validators - Requirements: 3.6
export {
  BUILT_IN_VALIDATORS,
  BuiltInValidators,
  createBuiltInValidators,
  validateEmail,
  validateISODate,
  validateJSON,
  validateURL,
  validateUUID,
} from "./built-in-validators.js";
export type {
  BuiltInValidatorName,
  EmailValidationResult,
  EmailValidatorConfig,
  ISODateValidationResult,
  ISODateValidatorConfig,
  JSONValidationResult,
  JSONValidatorConfig,
  URLValidationResult,
  URLValidatorConfig,
  UUIDValidationResult,
  UUIDValidatorConfig,
} from "./built-in-validators.js";
