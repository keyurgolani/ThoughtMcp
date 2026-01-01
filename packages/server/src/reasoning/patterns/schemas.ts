/**
 * Zod Schemas for Pattern Configuration Validation
 *
 * This module provides Zod schemas for validating reasoning pattern
 * configuration files. Schemas enforce required fields, validate
 * indicator types, severity levels, and priority ranges.
 *
 * Requirements: 1.2, 2.7
 */

import { z } from "zod";

// ============================================================================
// Enum Schemas
// ============================================================================

/**
 * Severity level schema
 *
 * Validates pattern severity levels: critical, high, medium, low
 */
export const PatternSeveritySchema = z.enum(["critical", "high", "medium", "low"]);

/**
 * Indicator type schema
 *
 * Validates indicator matching types: exact, fuzzy, regex
 */
export const IndicatorTypeSchema = z.enum(["exact", "fuzzy", "regex"]);

/**
 * Recommendation type schema
 *
 * Validates recommendation types: diagnostic, remedial
 */
export const RecommendationTypeSchema = z.enum(["diagnostic", "remedial"]);

/**
 * Key term category schema
 *
 * Validates key term categories that can boost indicator scores
 */
export const KeyTermCategorySchema = z.enum(["domainTerms", "actionVerbs", "nounPhrases", "terms"]);

// ============================================================================
// Component Schemas
// ============================================================================

/**
 * Pattern indicator schema
 *
 * Validates indicator definitions with type, value, weight, and optional keyTermCategory.
 * Weight must be between 0 and 1.
 *
 * Requirements: 3.2, 3.3, 3.4
 */
export const PatternIndicatorSchema = z.object({
  type: IndicatorTypeSchema,
  value: z.string().min(1, "Indicator value cannot be empty"),
  weight: z.number().min(0, "Weight must be at least 0").max(1, "Weight must be at most 1"),
  keyTermCategory: KeyTermCategorySchema.optional(),
});

/**
 * Hypothesis template schema
 *
 * Validates hypothesis templates with all required fields.
 * Likelihood must be between 0 and 1.
 *
 * Requirements: 4.1-4.6
 */
export const HypothesisTemplateSchema = z.object({
  id: z.string().min(1, "Hypothesis ID cannot be empty"),
  statement: z.string().min(1, "Hypothesis statement cannot be empty"),
  investigationSteps: z
    .array(z.string().min(1, "Investigation step cannot be empty"))
    .min(1, "At least one investigation step is required"),
  expectedFindings: z
    .array(z.string().min(1, "Expected finding cannot be empty"))
    .min(1, "At least one expected finding is required"),
  relatedHypotheses: z.array(z.string()).default([]),
  estimatedTime: z.string().min(1, "Estimated time cannot be empty"),
  likelihood: z
    .number()
    .min(0, "Likelihood must be at least 0")
    .max(1, "Likelihood must be at most 1"),
});

/**
 * Recommendation template schema
 *
 * Validates recommendation templates with all required fields.
 * Priority must be between 1 and 10.
 *
 * Requirements: 5.1-5.4
 */
export const RecommendationTemplateSchema = z.object({
  id: z.string().min(1, "Recommendation ID cannot be empty"),
  type: RecommendationTypeSchema,
  action: z.string().min(1, "Recommendation action cannot be empty"),
  tools: z.array(z.string()).default([]),
  expectedOutcome: z.string().min(1, "Expected outcome cannot be empty"),
  prerequisites: z.array(z.string()).default([]),
  priority: z
    .number()
    .int("Priority must be an integer")
    .min(1, "Priority must be at least 1")
    .max(10, "Priority must be at most 10"),
  documentationLinks: z.array(z.string().url("Invalid documentation URL")).optional(),
});

/**
 * Domain pattern schema
 *
 * Validates complete pattern definitions with indicators, hypotheses,
 * and recommendations. Quality threshold defaults to 0.5.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.6, 2.7
 */
export const DomainPatternSchema = z.object({
  id: z.string().min(1, "Pattern ID cannot be empty"),
  name: z.string().min(1, "Pattern name cannot be empty"),
  description: z.string().min(1, "Pattern description cannot be empty"),
  indicators: z.array(PatternIndicatorSchema).min(1, "At least one indicator is required"),
  negativeIndicators: z.array(PatternIndicatorSchema).optional(),
  hypotheses: z.array(HypothesisTemplateSchema).min(1, "At least one hypothesis is required"),
  recommendations: z
    .array(RecommendationTemplateSchema)
    .min(1, "At least one recommendation is required"),
  severity: PatternSeveritySchema,
  qualityThreshold: z
    .number()
    .min(0, "Quality threshold must be at least 0")
    .max(1, "Quality threshold must be at most 1")
    .default(0.5),
});

/**
 * Pattern test case schema
 *
 * Validates test case definitions for pattern validation.
 * Minimum confidence must be between 0 and 1.
 *
 * Requirements: 10.1
 */
export const PatternTestCaseSchema = z.object({
  id: z.string().min(1, "Test case ID cannot be empty"),
  input: z.string().min(1, "Test case input cannot be empty"),
  context: z.string().optional(),
  expectedDomain: z.string().min(1, "Expected domain cannot be empty"),
  expectedPatternIds: z
    .array(z.string().min(1, "Pattern ID cannot be empty"))
    .min(1, "At least one expected pattern ID is required"),
  minConfidence: z
    .number()
    .min(0, "Minimum confidence must be at least 0")
    .max(1, "Minimum confidence must be at most 1"),
});

// ============================================================================
// Top-Level Schema
// ============================================================================

/**
 * Pattern configuration file schema
 *
 * Validates the complete structure of pattern configuration JSON files.
 * Version should follow semver format.
 *
 * Requirements: 1.1, 1.2, 1.5, 1.7
 */
export const PatternConfigFileSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must be in semver format (e.g., '1.0.0')"),
  domain: z.string().min(1, "Domain cannot be empty"),
  description: z.string().min(1, "Description cannot be empty"),
  patterns: z.array(DomainPatternSchema).min(1, "At least one pattern is required"),
  testCases: z.array(PatternTestCaseSchema).optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

/**
 * Inferred types from Zod schemas
 *
 * These types are automatically derived from the schemas and can be used
 * for type-safe validation results.
 */
export type PatternSeverityInput = z.input<typeof PatternSeveritySchema>;
export type IndicatorTypeInput = z.input<typeof IndicatorTypeSchema>;
export type RecommendationTypeInput = z.input<typeof RecommendationTypeSchema>;
export type KeyTermCategoryInput = z.input<typeof KeyTermCategorySchema>;
export type PatternIndicatorInput = z.input<typeof PatternIndicatorSchema>;
export type HypothesisTemplateInput = z.input<typeof HypothesisTemplateSchema>;
export type RecommendationTemplateInput = z.input<typeof RecommendationTemplateSchema>;
export type DomainPatternInput = z.input<typeof DomainPatternSchema>;
export type PatternTestCaseInput = z.input<typeof PatternTestCaseSchema>;
export type PatternConfigFileInput = z.input<typeof PatternConfigFileSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates a pattern configuration file
 *
 * @param config - The configuration object to validate
 * @returns Validation result with parsed data or errors
 */
export function validatePatternConfig(
  config: unknown
): z.SafeParseReturnType<PatternConfigFileInput, z.output<typeof PatternConfigFileSchema>> {
  return PatternConfigFileSchema.safeParse(config);
}

/**
 * Validates a single domain pattern
 *
 * @param pattern - The pattern object to validate
 * @returns Validation result with parsed data or errors
 */
export function validateDomainPattern(
  pattern: unknown
): z.SafeParseReturnType<DomainPatternInput, z.output<typeof DomainPatternSchema>> {
  return DomainPatternSchema.safeParse(pattern);
}

/**
 * Validates a pattern indicator
 *
 * @param indicator - The indicator object to validate
 * @returns Validation result with parsed data or errors
 */
export function validatePatternIndicator(
  indicator: unknown
): z.SafeParseReturnType<PatternIndicatorInput, z.output<typeof PatternIndicatorSchema>> {
  return PatternIndicatorSchema.safeParse(indicator);
}

/**
 * Validates a hypothesis template
 *
 * @param hypothesis - The hypothesis object to validate
 * @returns Validation result with parsed data or errors
 */
export function validateHypothesisTemplate(
  hypothesis: unknown
): z.SafeParseReturnType<HypothesisTemplateInput, z.output<typeof HypothesisTemplateSchema>> {
  return HypothesisTemplateSchema.safeParse(hypothesis);
}

/**
 * Validates a recommendation template
 *
 * @param recommendation - The recommendation object to validate
 * @returns Validation result with parsed data or errors
 */
export function validateRecommendationTemplate(
  recommendation: unknown
): z.SafeParseReturnType<
  RecommendationTemplateInput,
  z.output<typeof RecommendationTemplateSchema>
> {
  return RecommendationTemplateSchema.safeParse(recommendation);
}

/**
 * Validates a pattern test case
 *
 * @param testCase - The test case object to validate
 * @returns Validation result with parsed data or errors
 */
export function validatePatternTestCase(
  testCase: unknown
): z.SafeParseReturnType<PatternTestCaseInput, z.output<typeof PatternTestCaseSchema>> {
  return PatternTestCaseSchema.safeParse(testCase);
}
