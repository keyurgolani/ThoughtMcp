/**
 * Pattern System Module
 *
 * Exports all types and classes for the externalized reasoning pattern system.
 */

// Type definitions
export type {
  DomainPattern,
  GeneratedHypothesis,
  // Insight types
  GeneratedInsights,
  GeneratedRecommendation,
  HypothesisTemplate,
  IndicatorType,
  InsightGenerationOptions,
  MatchedIndicator,
  // Configuration types
  PatternConfigFile,
  PatternIndicator,
  // Integration types
  PatternMatchContext,
  // Match result types
  PatternMatchResult,
  // Quality metrics types
  PatternQualityMetrics,
  PatternReasoningMetadata,
  // Registry types
  PatternRegistryStats,
  PatternSeverity,
  PatternTestCase,
  PatternValidationError,
  // Validation types
  PatternValidationResult,
  PatternValidationWarning,
  QualityMetricsExport,
  RecommendationTemplate,
  RecommendationType,
} from "./types.js";

// Schema exports
export {
  DomainPatternSchema,
  HypothesisTemplateSchema,
  IndicatorTypeSchema,
  KeyTermCategorySchema,
  PatternConfigFileSchema,
  PatternIndicatorSchema,
  PatternSeveritySchema,
  PatternTestCaseSchema,
  RecommendationTemplateSchema,
  RecommendationTypeSchema,
  validateDomainPattern,
  validateHypothesisTemplate,
  validatePatternConfig,
  validatePatternIndicator,
  validatePatternTestCase,
  validateRecommendationTemplate,
} from "./schemas.js";

// Class exports
export {
  InsightGenerator,
  createInsightGenerator,
  type InsightGeneratorOptions,
} from "./insight-generator.js";
export { PatternMatcher, createPatternMatcher } from "./pattern-matcher.js";
export { PatternRegistry, createPatternRegistry } from "./pattern-registry.js";
export { QualityTracker, createQualityTracker } from "./quality-tracker.js";

// Timeout utilities
export {
  FULL_REASONING_TIMEOUT_MS,
  PATTERN_MATCHING_TIMEOUT_MS,
  executeWithTimeout,
  executeWithTimeoutAndPartialResult,
  withAbortSignal,
  type TimeoutResult,
} from "./timeout-utils.js";
