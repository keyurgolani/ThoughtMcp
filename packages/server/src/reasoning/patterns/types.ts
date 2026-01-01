/**
 * Pattern Type Definitions for Enhanced Rule-Based Reasoning
 *
 * This module defines the core types and interfaces for the externalized
 * reasoning pattern system. Patterns are loaded from JSON configuration
 * files and used to generate domain-specific hypotheses and recommendations.
 *
 * Requirements: 1.1, 1.2, 2.2, 2.3, 4.1-4.6, 5.1-5.4
 */

import type { KeyTerms } from "../key-term-extractor.js";

// ============================================================================
// Pattern Configuration Types
// ============================================================================

/**
 * Severity levels for patterns and hypotheses
 *
 * Used to prioritize issues and recommendations based on impact.
 */
export type PatternSeverity = "critical" | "high" | "medium" | "low";

/**
 * Indicator matching types
 *
 * Defines how pattern indicators are matched against problem text.
 * - exact: Case-insensitive exact phrase matching
 * - fuzzy: All keywords must be present (any order)
 * - regex: Regular expression pattern matching
 */
export type IndicatorType = "exact" | "fuzzy" | "regex";

/**
 * Recommendation types
 *
 * Classifies recommendations by their purpose.
 * - diagnostic: Investigation and analysis actions
 * - remedial: Fix and resolution actions
 */
export type RecommendationType = "diagnostic" | "remedial";

/**
 * Pattern indicator definition
 *
 * Defines a single indicator that triggers pattern matching.
 * Indicators can be exact phrases, fuzzy keyword sets, or regex patterns.
 *
 * Requirements: 3.2, 3.3, 3.4
 */
export interface PatternIndicator {
  /** Matching type: exact phrase, fuzzy keywords, or regex */
  type: IndicatorType;
  /** Pattern value (phrase, keywords, or regex string) */
  value: string;
  /** Weight for scoring (0-1), higher = more important */
  weight: number;
  /** Optional: boost score if key term matches this category */
  keyTermCategory?: "domainTerms" | "actionVerbs" | "nounPhrases" | "terms";
}

/**
 * Hypothesis template definition
 *
 * Defines a hypothesis that can be generated when a pattern matches.
 * Templates support placeholder substitution with key terms.
 *
 * Requirements: 4.1-4.6
 */
export interface HypothesisTemplate {
  /** Unique hypothesis identifier within the pattern */
  id: string;
  /** Hypothesis statement with {{placeholders}} for key terms */
  statement: string;
  /** Concrete steps to investigate this hypothesis */
  investigationSteps: string[];
  /** Expected findings that would confirm or refute the hypothesis */
  expectedFindings: string[];
  /** IDs of related hypotheses to consider if this one is ruled out */
  relatedHypotheses: string[];
  /** Estimated time to investigate (e.g., "15-30 minutes") */
  estimatedTime: string;
  /** Base likelihood score (0-1), adjusted by match strength */
  likelihood: number;
}

/**
 * Recommendation template definition
 *
 * Defines a recommendation that can be generated when a pattern matches.
 * Templates support placeholder substitution with key terms.
 *
 * Requirements: 5.1-5.4
 */
export interface RecommendationTemplate {
  /** Unique recommendation identifier within the pattern */
  id: string;
  /*e: diagnostic (investigation) or remedial (fix) */
  type: RecommendationType;
  /** Action description with {{placeholders}} for key terms */
  action: string;
  /** Relevant tools, commands, or techniques */
  tools: string[];
  /** Expected outcome from following this recommendation */
  expectedOutcome: string;
  /** Prerequisites or dependencies for this action */
  prerequisites: string[];
  /** Priority score (1-10), higher = more important */
  priority: number;
  /** Optional links to relevant documentation */
  documentationLinks?: string[];
}

/**
 * Domain pattern definition
 *
 * Defines a complete reasoning pattern for a specific problem type.
 * Patterns contain indicators for matching and templates for generation.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.6, 2.7
 */
export interface DomainPattern {
  /** Unique pattern identifier */
  id: string;
  /** Human-readable pattern name */
  name: string;
  /** Description of what this pattern detects */
  description: string;
  /** Indicators that trigger this pattern */
  indicators: PatternIndicator[];
  /** Optional: indicators that reduce match score */
  negativeIndicators?: PatternIndicator[];
  /** Hypothesis templates for this pattern */
  hypotheses: HypothesisTemplate[];
  /** Recommendation templates for this pattern */
  recommendations: RecommendationTemplate[];
  /** Severity level of issues detected by this pattern */
  severity: PatternSeverity;
  /** Minimum quality score threshold (default: 0.5) */
  qualityThreshold?: number;
}

/**
 * Pattern test case definition
 *
 * Defines a test case for validating pattern matching behavior.
 *
 * Requirements: 10.1
 */
export interface PatternTestCase {
  /** Unique test case identifier */
  id: string;
  /** Problem description input */
  input: string;
  /** Optional context input */
  context?: string;
  /** Expected domain to match */
  expectedDomain: string;
  /** Expected pattern IDs to match */
  expectedPatternIds: string[];
  /** Minimum confidence score expected */
  minConfidence: number;
}

/**
 * Pattern configuration file structure
 *
 * Defines the structure of JSON configuration files that contain
 * reasoning patterns for a specific domain.
 *
 * Requirements: 1.1, 1.2, 1.5, 1.7
 */
export interface PatternConfigFile {
  /** Schema version (e.g., "1.0.0") */
  version: string;
  /** Domain identifier (e.g., "database", "customer-engagement") */
  domain: string;
  /** Human-readable description of this domain */
  description: string;
  /** Array of patterns for this domain */
  patterns: DomainPattern[];
  /** Optional test cases for validation */
  testCases?: PatternTestCase[];
}

// ============================================================================
// Pattern Matching Result Types
// ============================================================================

/**
 * Matched indicator details
 *
 * Captures details about a specific indicator that matched.
 */
export interface MatchedIndicator {
  /** The indicator that matched */
  indicator: PatternIndicator;
  /** The text that matched the indicator */
  matchedText: string;
  /** Contribution to overall score */
  scoreContribution: number;
}

/**
 * Pattern match result
 *
 * Contains the complete result of matching a pattern against problem text.
 *
 * Requirements: 3.1, 3.6
 */
export interface PatternMatchResult {
  /** Pattern identifier */
  patternId: string;
  /** Domain this pattern belongs to */
  domain: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Details of matched indicators */
  matchedIndicators: MatchedIndicator[];
  /** Generated hypotheses from this pattern */
  hypotheses: GeneratedHypothesis[];
  /** Generated recommendations from this pattern */
  recommendations: GeneratedRecommendation[];
  /** Pattern severity level */
  severity: PatternSeverity;
}

/**
 * Generated hypothesis (after template substitution)
 *
 * A hypothesis with placeholders replaced by actual key terms.
 *
 * Requirements: 4.1-4.6
 */
export interface GeneratedHypothesis {
  /** Hypothesis identifier */
  id: string;
  /** Hypothesis statement with substituted values */
  statement: string;
  /** Investigation steps with substituted values */
  investigationSteps: string[];
  /** Expected findings */
  expectedFindings: string[];
  /** Related hypothesis IDs */
  relatedHypotheses: string[];
  /** Estimated investigation time */
  estimatedTime: string;
  /** Likelihood score adjusted by match strength */
  likelihood: number;
  /** Source pattern ID */
  sourcePatternId: string;
}

/**
 * Generated recommendation (after template substitution)
 *
 * A recommendation with placeholders replaced by actual key terms.
 *
 * Requirements: 5.1-5.4
 */
export interface GeneratedRecommendation {
  /** Recommendation identifier */
  id: string;
  /** Recommendation type */
  type: RecommendationType;
  /** Action description with substituted values */
  action: string;
  /** Relevant tools */
  tools: string[];
  /** Expected outcome */
  expectedOutcome: string;
  /** Prerequisites */
  prerequisites: string[];
  /** Priority score */
  priority: number;
  /** Documentation links */
  documentationLinks?: string[];
  /** Source pattern ID */
  sourcePatternId: string;
}

// ============================================================================
// Insight Generation Types
// ============================================================================

/**
 * Generated insights from pattern matching
 *
 * Contains all generated hypotheses and recommendations from
 * matching patterns against a problem.
 *
 * Requirements: 4.1, 5.1
 */
export interface GeneratedInsights {
  /** Generated hypotheses ordered by likelihood */
  hypotheses: GeneratedHypothesis[];
  /** Generated recommendations ordered by priority */
  recommendations: GeneratedRecommendation[];
  /** Root cause analysis summary */
  rootCauseAnalysis: string;
  /** Overall conclusion */
  conclusion: string;
  /** Overall confidence score */
  confidence: number;
  /** Domains that matched */
  matchedDomains: string[];
  /** Whether fallback reasoning was used */
  usedFallback: boolean;
  /** Timeout indicator if reasoning was interrupted */
  timedOut?: boolean;
}

// ============================================================================
// Quality Metrics Types
// ============================================================================

/**
 * Quality metrics for a single pattern
 *
 * Tracks usage and quality statistics for iterative improvement.
 *
 * Requirements: 7.1, 7.2, 7.4
 */
export interface PatternQualityMetrics {
  /** Pattern identifier */
  patternId: string;
  /** Domain this pattern belongs to */
  domain: string;
  /** Number of times this pattern was matched */
  usageCount: number;
  /** Average confidence score when matched */
  averageConfidence: number;
  /** Computed quality score */
  qualityScore: number;
  /** Last time this pattern was used */
  lastUsed: Date | null;
  /** Number of test cases passing */
  testsPassing: number;
  /** Number of test cases failing */
  testsFailing: number;
}

/**
 * Quality metrics export structure
 *
 * Contains aggregated quality metrics for analysis and reporting.
 *
 * Requirements: 7.6
 */
export interface QualityMetricsExport {
  /** Export timestamp */
  exportedAt: Date;
  /** Metrics for all patterns */
  patterns: PatternQualityMetrics[];
  /** Overall quality score across all patterns */
  overallQualityScore: number;
  /** Domains with quality scores below threshold */
  domainsWithLowQuality: string[];
  /** Total patterns loaded */
  totalPatterns: number;
  /** Total patterns with test cases */
  patternsWithTests: number;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for pattern configuration
 *
 * Contains validation status and any errors found.
 *
 * Requirements: 1.2, 1.3
 */
export interface PatternValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors if any */
  errors: PatternValidationError[];
  /** Validation warnings (non-fatal issues) */
  warnings: PatternValidationWarning[];
}

/**
 * Pattern validation error
 *
 * Describes a validation error in pattern configuration.
 */
export interface PatternValidationError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Path to the invalid field (e.g., "patterns[0].indicators[1].weight") */
  path: string;
  /** The invalid value */
  value?: unknown;
}

/**
 * Pattern validation warning
 *
 * Describes a non-fatal validation issue in pattern configuration.
 */
export interface PatternValidationWarning {
  /** Warning code */
  code: string;
  /** Human-readable warning message */
  message: string;
  /** Path to the field with the issue */
  path: string;
}

// ============================================================================
// Registry Types
// ============================================================================

/**
 * Pattern registry statistics
 *
 * Summary statistics about loaded patterns.
 */
export interface PatternRegistryStats {
  /** Total number of patterns loaded */
  totalPatterns: number;
  /** Number of domains */
  totalDomains: number;
  /** Patterns per domain */
  patternsPerDomain: Record<string, number>;
  /** Number of patterns with test cases */
  patternsWithTests: number;
  /** Last reload timestamp */
  lastReloadAt: Date | null;
}

// ============================================================================
// Integration Types
// ============================================================================

/**
 * Pattern matching context
 *
 * Context passed to pattern matching operations.
 */
export interface PatternMatchContext {
  /** Problem description */
  problem: string;
  /** Optional additional context */
  context?: string;
  /** Extracted key terms */
  keyTerms: KeyTerms;
  /** Optional: specific domains to match against */
  targetDomains?: string[];
  /** Optional: minimum confidence threshold */
  minConfidence?: number;
}

/**
 * Insight generation options
 *
 * Options for controlling insight generation behavior.
 */
export interface InsightGenerationOptions {
  /** Maximum number of hypotheses to generate */
  maxHypotheses?: number;
  /** Maximum number of recommendations to generate */
  maxRecommendations?: number;
  /** Whether to include fallback insights when no patterns match */
  includeFallback?: boolean;
  /** Timeout in milliseconds for generation */
  timeout?: number;
}

/**
 * Stream result extension for pattern-based reasoning
 *
 * Additional fields added to StreamResult when using pattern-based reasoning.
 */
export interface PatternReasoningMetadata {
  /** Pattern IDs that matched */
  matchedPatternIds: string[];
  /** Domains that matched */
  matchedDomains: string[];
  /** Whether fallback reasoning was used */
  usedFallback: boolean;
  /** Pattern matching time in milliseconds */
  patternMatchingTime: number;
  /** Insight generation time in milliseconds */
  insightGenerationTime: number;
  /** Whether reasoning timed out */
  timedOut: boolean;
}
