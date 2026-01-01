/**
 * Unit Tests for Pattern Configuration Schemas
 *
 * Tests Zod schema validation for reasoning pattern configuration files.
 * Validates required fields, optional fields with defaults, indicator types,
 * severity levels, and priority ranges.
 *
 * Requirements: 1.2, 2.7
 */

import { describe, expect, it } from "vitest";

import {
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
} from "../../../../reasoning/patterns/schemas.js";

// ============================================================================
// Test Fixtures
// ============================================================================

const validIndicator = {
  type: "exact" as const,
  value: "slow query",
  weight: 0.9,
};

const validHypothesis = {
  id: "missing-index",
  statement: "The {{primarySubject}} may be slow due to missing indexes",
  investigationSteps: ["Run EXPLAIN ANALYZE on the slow query"],
  expectedFindings: ["Sequential scans on large tables"],
  relatedHypotheses: ["query-complexity"],
  estimatedTime: "15-30 minutes",
  likelihood: 0.7,
};

const validRecommendation = {
  id: "add-index",
  type: "remedial" as const,
  action: "Create indexes on columns used in WHERE clauses",
  tools: ["CREATE INDEX", "EXPLAIN ANALYZE"],
  expectedOutcome: "Query execution time reduced by 50-90%",
  prerequisites: ["Identify slow queries"],
  priority: 8,
};

const validPattern = {
  id: "db-slow-query",
  name: "Slow Query Detection",
  description: "Detects database performance issues related to slow queries",
  indicators: [validIndicator],
  hypotheses: [validHypothesis],
  recommendations: [validRecommendation],
  severity: "high" as const,
};

const validTestCase = {
  id: "test-slow-query-basic",
  input: "Our database queries are running slow",
  expectedDomain: "database",
  expectedPatternIds: ["db-slow-query"],
  minConfidence: 0.7,
};

const validConfigFile = {
  version: "1.0.0",
  domain: "database",
  description: "Patterns for database performance issues",
  patterns: [validPattern],
  testCases: [validTestCase],
};

// ============================================================================
// Enum Schema Tests
// ============================================================================

describe("PatternSeveritySchema", () => {
  it("should accept valid severity levels", () => {
    expect(PatternSeveritySchema.parse("critical")).toBe("critical");
    expect(PatternSeveritySchema.parse("high")).toBe("high");
    expect(PatternSeveritySchema.parse("medium")).toBe("medium");
    expect(PatternSeveritySchema.parse("low")).toBe("low");
  });

  it("should reject invalid severity levels", () => {
    expect(() => PatternSeveritySchema.parse("urgent")).toThrow();
    expect(() => PatternSeveritySchema.parse("")).toThrow();
    expect(() => PatternSeveritySchema.parse(1)).toThrow();
  });
});

describe("IndicatorTypeSchema", () => {
  it("should accept valid indicator types", () => {
    expect(IndicatorTypeSchema.parse("exact")).toBe("exact");
    expect(IndicatorTypeSchema.parse("fuzzy")).toBe("fuzzy");
    expect(IndicatorTypeSchema.parse("regex")).toBe("regex");
  });

  it("should reject invalid indicator types", () => {
    expect(() => IndicatorTypeSchema.parse("wildcard")).toThrow();
    expect(() => IndicatorTypeSchema.parse("")).toThrow();
  });
});

describe("RecommendationTypeSchema", () => {
  it("should accept valid recommendation types", () => {
    expect(RecommendationTypeSchema.parse("diagnostic")).toBe("diagnostic");
    expect(RecommendationTypeSchema.parse("remedial")).toBe("remedial");
  });

  it("should reject invalid recommendation types", () => {
    expect(() => RecommendationTypeSchema.parse("preventive")).toThrow();
    expect(() => RecommendationTypeSchema.parse("")).toThrow();
  });
});

describe("KeyTermCategorySchema", () => {
  it("should accept valid key term categories", () => {
    expect(KeyTermCategorySchema.parse("domainTerms")).toBe("domainTerms");
    expect(KeyTermCategorySchema.parse("actionVerbs")).toBe("actionVerbs");
    expect(KeyTermCategorySchema.parse("nounPhrases")).toBe("nounPhrases");
    expect(KeyTermCategorySchema.parse("terms")).toBe("terms");
  });

  it("should reject invalid key term categories", () => {
    expect(() => KeyTermCategorySchema.parse("keywords")).toThrow();
    expect(() => KeyTermCategorySchema.parse("")).toThrow();
  });
});

// ============================================================================
// PatternIndicatorSchema Tests
// ============================================================================

describe("PatternIndicatorSchema", () => {
  it("should accept valid indicator with required fields", () => {
    const result = PatternIndicatorSchema.parse(validIndicator);
    expect(result.type).toBe("exact");
    expect(result.value).toBe("slow query");
    expect(result.weight).toBe(0.9);
  });

  it("should accept indicator with optional keyTermCategory", () => {
    const indicator = { ...validIndicator, keyTermCategory: "domainTerms" };
    const result = PatternIndicatorSchema.parse(indicator);
    expect(result.keyTermCategory).toBe("domainTerms");
  });

  it("should reject indicator with empty value", () => {
    const indicator = { ...validIndicator, value: "" };
    expect(() => PatternIndicatorSchema.parse(indicator)).toThrow(
      "Indicator value cannot be empty"
    );
  });

  it("should reject indicator with weight below 0", () => {
    const indicator = { ...validIndicator, weight: -0.1 };
    expect(() => PatternIndicatorSchema.parse(indicator)).toThrow("Weight must be at least 0");
  });

  it("should reject indicator with weight above 1", () => {
    const indicator = { ...validIndicator, weight: 1.1 };
    expect(() => PatternIndicatorSchema.parse(indicator)).toThrow("Weight must be at most 1");
  });

  it("should accept indicator with weight at boundaries", () => {
    expect(PatternIndicatorSchema.parse({ ...validIndicator, weight: 0 }).weight).toBe(0);
    expect(PatternIndicatorSchema.parse({ ...validIndicator, weight: 1 }).weight).toBe(1);
  });

  it("should reject indicator with invalid type", () => {
    const indicator = { ...validIndicator, type: "invalid" };
    expect(() => PatternIndicatorSchema.parse(indicator)).toThrow();
  });

  it("should reject indicator with invalid keyTermCategory", () => {
    const indicator = { ...validIndicator, keyTermCategory: "invalid" };
    expect(() => PatternIndicatorSchema.parse(indicator)).toThrow();
  });
});

// ============================================================================
// HypothesisTemplateSchema Tests
// ============================================================================

describe("HypothesisTemplateSchema", () => {
  it("should accept valid hypothesis with all required fields", () => {
    const result = HypothesisTemplateSchema.parse(validHypothesis);
    expect(result.id).toBe("missing-index");
    expect(result.statement).toContain("{{primarySubject}}");
    expect(result.investigationSteps).toHaveLength(1);
    expect(result.expectedFindings).toHaveLength(1);
    expect(result.relatedHypotheses).toHaveLength(1);
    expect(result.estimatedTime).toBe("15-30 minutes");
    expect(result.likelihood).toBe(0.7);
  });

  it("should default relatedHypotheses to empty array", () => {
    const hypothesis = { ...validHypothesis };
    delete (hypothesis as Record<string, unknown>).relatedHypotheses;
    const result = HypothesisTemplateSchema.parse(hypothesis);
    expect(result.relatedHypotheses).toEqual([]);
  });

  it("should reject hypothesis with empty id", () => {
    const hypothesis = { ...validHypothesis, id: "" };
    expect(() => HypothesisTemplateSchema.parse(hypothesis)).toThrow(
      "Hypothesis ID cannot be empty"
    );
  });

  it("should reject hypothesis with empty statement", () => {
    const hypothesis = { ...validHypothesis, statement: "" };
    expect(() => HypothesisTemplateSchema.parse(hypothesis)).toThrow(
      "Hypothesis statement cannot be empty"
    );
  });

  it("should reject hypothesis with empty investigationSteps", () => {
    const hypothesis = { ...validHypothesis, investigationSteps: [] };
    expect(() => HypothesisTemplateSchema.parse(hypothesis)).toThrow(
      "At least one investigation step is required"
    );
  });

  it("should reject hypothesis with empty expectedFindings", () => {
    const hypothesis = { ...validHypothesis, expectedFindings: [] };
    expect(() => HypothesisTemplateSchema.parse(hypothesis)).toThrow(
      "At least one expected finding is required"
    );
  });

  it("should reject hypothesis with empty estimatedTime", () => {
    const hypothesis = { ...validHypothesis, estimatedTime: "" };
    expect(() => HypothesisTemplateSchema.parse(hypothesis)).toThrow(
      "Estimated time cannot be empty"
    );
  });

  it("should reject hypothesis with likelihood below 0", () => {
    const hypothesis = { ...validHypothesis, likelihood: -0.1 };
    expect(() => HypothesisTemplateSchema.parse(hypothesis)).toThrow(
      "Likelihood must be at least 0"
    );
  });

  it("should reject hypothesis with likelihood above 1", () => {
    const hypothesis = { ...validHypothesis, likelihood: 1.1 };
    expect(() => HypothesisTemplateSchema.parse(hypothesis)).toThrow(
      "Likelihood must be at most 1"
    );
  });
});

// ============================================================================
// RecommendationTemplateSchema Tests
// ============================================================================

describe("RecommendationTemplateSchema", () => {
  it("should accept valid recommendation with all required fields", () => {
    const result = RecommendationTemplateSchema.parse(validRecommendation);
    expect(result.id).toBe("add-index");
    expect(result.type).toBe("remedial");
    expect(result.action).toContain("Create indexes");
    expect(result.tools).toHaveLength(2);
    expect(result.expectedOutcome).toContain("50-90%");
    expect(result.prerequisites).toHaveLength(1);
    expect(result.priority).toBe(8);
  });

  it("should default tools to empty array", () => {
    const recommendation = { ...validRecommendation };
    delete (recommendation as Record<string, unknown>).tools;
    const result = RecommendationTemplateSchema.parse(recommendation);
    expect(result.tools).toEqual([]);
  });

  it("should default prerequisites to empty array", () => {
    const recommendation = { ...validRecommendation };
    delete (recommendation as Record<string, unknown>).prerequisites;
    const result = RecommendationTemplateSchema.parse(recommendation);
    expect(result.prerequisites).toEqual([]);
  });

  it("should accept recommendation with optional documentationLinks", () => {
    const recommendation = {
      ...validRecommendation,
      documentationLinks: ["https://example.com/docs"],
    };
    const result = RecommendationTemplateSchema.parse(recommendation);
    expect(result.documentationLinks).toEqual(["https://example.com/docs"]);
  });

  it("should reject recommendation with invalid documentationLinks URL", () => {
    const recommendation = {
      ...validRecommendation,
      documentationLinks: ["not-a-url"],
    };
    expect(() => RecommendationTemplateSchema.parse(recommendation)).toThrow(
      "Invalid documentation URL"
    );
  });

  it("should reject recommendation with empty id", () => {
    const recommendation = { ...validRecommendation, id: "" };
    expect(() => RecommendationTemplateSchema.parse(recommendation)).toThrow(
      "Recommendation ID cannot be empty"
    );
  });

  it("should reject recommendation with empty action", () => {
    const recommendation = { ...validRecommendation, action: "" };
    expect(() => RecommendationTemplateSchema.parse(recommendation)).toThrow(
      "Recommendation action cannot be empty"
    );
  });

  it("should reject recommendation with empty expectedOutcome", () => {
    const recommendation = { ...validRecommendation, expectedOutcome: "" };
    expect(() => RecommendationTemplateSchema.parse(recommendation)).toThrow(
      "Expected outcome cannot be empty"
    );
  });

  it("should reject recommendation with priority below 1", () => {
    const recommendation = { ...validRecommendation, priority: 0 };
    expect(() => RecommendationTemplateSchema.parse(recommendation)).toThrow(
      "Priority must be at least 1"
    );
  });

  it("should reject recommendation with priority above 10", () => {
    const recommendation = { ...validRecommendation, priority: 11 };
    expect(() => RecommendationTemplateSchema.parse(recommendation)).toThrow(
      "Priority must be at most 10"
    );
  });

  it("should reject recommendation with non-integer priority", () => {
    const recommendation = { ...validRecommendation, priority: 5.5 };
    expect(() => RecommendationTemplateSchema.parse(recommendation)).toThrow(
      "Priority must be an integer"
    );
  });

  it("should accept recommendation with priority at boundaries", () => {
    expect(
      RecommendationTemplateSchema.parse({ ...validRecommendation, priority: 1 }).priority
    ).toBe(1);
    expect(
      RecommendationTemplateSchema.parse({ ...validRecommendation, priority: 10 }).priority
    ).toBe(10);
  });
});

// ============================================================================
// DomainPatternSchema Tests
// ============================================================================

describe("DomainPatternSchema", () => {
  it("should accept valid pattern with all required fields", () => {
    const result = DomainPatternSchema.parse(validPattern);
    expect(result.id).toBe("db-slow-query");
    expect(result.name).toBe("Slow Query Detection");
    expect(result.description).toContain("database performance");
    expect(result.indicators).toHaveLength(1);
    expect(result.hypotheses).toHaveLength(1);
    expect(result.recommendations).toHaveLength(1);
    expect(result.severity).toBe("high");
  });

  it("should default qualityThreshold to 0.5", () => {
    const result = DomainPatternSchema.parse(validPattern);
    expect(result.qualityThreshold).toBe(0.5);
  });

  it("should accept pattern with custom qualityThreshold", () => {
    const pattern = { ...validPattern, qualityThreshold: 0.8 };
    const result = DomainPatternSchema.parse(pattern);
    expect(result.qualityThreshold).toBe(0.8);
  });

  it("should accept pattern with optional negativeIndicators", () => {
    const pattern = {
      ...validPattern,
      negativeIndicators: [{ type: "exact", value: "network latency", weight: 0.3 }],
    };
    const result = DomainPatternSchema.parse(pattern);
    expect(result.negativeIndicators).toHaveLength(1);
  });

  it("should reject pattern with empty id", () => {
    const pattern = { ...validPattern, id: "" };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow("Pattern ID cannot be empty");
  });

  it("should reject pattern with empty name", () => {
    const pattern = { ...validPattern, name: "" };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow("Pattern name cannot be empty");
  });

  it("should reject pattern with empty description", () => {
    const pattern = { ...validPattern, description: "" };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow("Pattern description cannot be empty");
  });

  it("should reject pattern with empty indicators", () => {
    const pattern = { ...validPattern, indicators: [] };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow("At least one indicator is required");
  });

  it("should reject pattern with empty hypotheses", () => {
    const pattern = { ...validPattern, hypotheses: [] };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow("At least one hypothesis is required");
  });

  it("should reject pattern with empty recommendations", () => {
    const pattern = { ...validPattern, recommendations: [] };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow(
      "At least one recommendation is required"
    );
  });

  it("should reject pattern with qualityThreshold below 0", () => {
    const pattern = { ...validPattern, qualityThreshold: -0.1 };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow(
      "Quality threshold must be at least 0"
    );
  });

  it("should reject pattern with qualityThreshold above 1", () => {
    const pattern = { ...validPattern, qualityThreshold: 1.1 };
    expect(() => DomainPatternSchema.parse(pattern)).toThrow("Quality threshold must be at most 1");
  });
});

// ============================================================================
// PatternTestCaseSchema Tests
// ============================================================================

describe("PatternTestCaseSchema", () => {
  it("should accept valid test case with all required fields", () => {
    const result = PatternTestCaseSchema.parse(validTestCase);
    expect(result.id).toBe("test-slow-query-basic");
    expect(result.input).toContain("database queries");
    expect(result.expectedDomain).toBe("database");
    expect(result.expectedPatternIds).toEqual(["db-slow-query"]);
    expect(result.minConfidence).toBe(0.7);
  });

  it("should accept test case with optional context", () => {
    const testCase = { ...validTestCase, context: "Production environment" };
    const result = PatternTestCaseSchema.parse(testCase);
    expect(result.context).toBe("Production environment");
  });

  it("should reject test case with empty id", () => {
    const testCase = { ...validTestCase, id: "" };
    expect(() => PatternTestCaseSchema.parse(testCase)).toThrow("Test case ID cannot be empty");
  });

  it("should reject test case with empty input", () => {
    const testCase = { ...validTestCase, input: "" };
    expect(() => PatternTestCaseSchema.parse(testCase)).toThrow("Test case input cannot be empty");
  });

  it("should reject test case with empty expectedDomain", () => {
    const testCase = { ...validTestCase, expectedDomain: "" };
    expect(() => PatternTestCaseSchema.parse(testCase)).toThrow("Expected domain cannot be empty");
  });

  it("should reject test case with empty expectedPatternIds", () => {
    const testCase = { ...validTestCase, expectedPatternIds: [] };
    expect(() => PatternTestCaseSchema.parse(testCase)).toThrow(
      "At least one expected pattern ID is required"
    );
  });

  it("should reject test case with minConfidence below 0", () => {
    const testCase = { ...validTestCase, minConfidence: -0.1 };
    expect(() => PatternTestCaseSchema.parse(testCase)).toThrow(
      "Minimum confidence must be at least 0"
    );
  });

  it("should reject test case with minConfidence above 1", () => {
    const testCase = { ...validTestCase, minConfidence: 1.1 };
    expect(() => PatternTestCaseSchema.parse(testCase)).toThrow(
      "Minimum confidence must be at most 1"
    );
  });
});

// ============================================================================
// PatternConfigFileSchema Tests
// ============================================================================

describe("PatternConfigFileSchema", () => {
  it("should accept valid config file with all required fields", () => {
    const result = PatternConfigFileSchema.parse(validConfigFile);
    expect(result.version).toBe("1.0.0");
    expect(result.domain).toBe("database");
    expect(result.description).toContain("database performance");
    expect(result.patterns).toHaveLength(1);
    expect(result.testCases).toHaveLength(1);
  });

  it("should accept config file without optional testCases", () => {
    const config = { ...validConfigFile };
    delete (config as Record<string, unknown>).testCases;
    const result = PatternConfigFileSchema.parse(config);
    expect(result.testCases).toBeUndefined();
  });

  it("should reject config file with invalid version format", () => {
    const config = { ...validConfigFile, version: "1.0" };
    expect(() => PatternConfigFileSchema.parse(config)).toThrow("Version must be in semver format");
  });

  it("should reject config file with non-semver version", () => {
    const config = { ...validConfigFile, version: "v1.0.0" };
    expect(() => PatternConfigFileSchema.parse(config)).toThrow("Version must be in semver format");
  });

  it("should accept config file with valid semver versions", () => {
    expect(PatternConfigFileSchema.parse({ ...validConfigFile, version: "0.0.1" }).version).toBe(
      "0.0.1"
    );
    expect(PatternConfigFileSchema.parse({ ...validConfigFile, version: "10.20.30" }).version).toBe(
      "10.20.30"
    );
  });

  it("should reject config file with empty domain", () => {
    const config = { ...validConfigFile, domain: "" };
    expect(() => PatternConfigFileSchema.parse(config)).toThrow("Domain cannot be empty");
  });

  it("should reject config file with empty description", () => {
    const config = { ...validConfigFile, description: "" };
    expect(() => PatternConfigFileSchema.parse(config)).toThrow("Description cannot be empty");
  });

  it("should reject config file with empty patterns", () => {
    const config = { ...validConfigFile, patterns: [] };
    expect(() => PatternConfigFileSchema.parse(config)).toThrow("At least one pattern is required");
  });
});

// ============================================================================
// Validation Helper Function Tests
// ============================================================================

describe("validatePatternConfig", () => {
  it("should return success for valid config", () => {
    const result = validatePatternConfig(validConfigFile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.domain).toBe("database");
    }
  });

  it("should return error for invalid config", () => {
    const result = validatePatternConfig({ invalid: "config" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("validateDomainPattern", () => {
  it("should return success for valid pattern", () => {
    const result = validateDomainPattern(validPattern);
    expect(result.success).toBe(true);
  });

  it("should return error for invalid pattern", () => {
    const result = validateDomainPattern({ id: "" });
    expect(result.success).toBe(false);
  });
});

describe("validatePatternIndicator", () => {
  it("should return success for valid indicator", () => {
    const result = validatePatternIndicator(validIndicator);
    expect(result.success).toBe(true);
  });

  it("should return error for invalid indicator", () => {
    const result = validatePatternIndicator({ type: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("validateHypothesisTemplate", () => {
  it("should return success for valid hypothesis", () => {
    const result = validateHypothesisTemplate(validHypothesis);
    expect(result.success).toBe(true);
  });

  it("should return error for invalid hypothesis", () => {
    const result = validateHypothesisTemplate({ id: "" });
    expect(result.success).toBe(false);
  });
});

describe("validateRecommendationTemplate", () => {
  it("should return success for valid recommendation", () => {
    const result = validateRecommendationTemplate(validRecommendation);
    expect(result.success).toBe(true);
  });

  it("should return error for invalid recommendation", () => {
    const result = validateRecommendationTemplate({ id: "" });
    expect(result.success).toBe(false);
  });
});

describe("validatePatternTestCase", () => {
  it("should return success for valid test case", () => {
    const result = validatePatternTestCase(validTestCase);
    expect(result.success).toBe(true);
  });

  it("should return error for invalid test case", () => {
    const result = validatePatternTestCase({ id: "" });
    expect(result.success).toBe(false);
  });
});
