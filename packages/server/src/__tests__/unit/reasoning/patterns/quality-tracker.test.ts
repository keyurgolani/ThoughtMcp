/**
 * Unit Tests for QualityTracker
 *
 * Tests pattern usage tracking, quality score computation, threshold checking,
 * and metrics export.
 *
 * Requirements: 7.1, 7.2, 7.4, 7.6
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createQualityTracker,
  QualityTracker,
} from "../../../../reasoning/patterns/quality-tracker.js";
import type { DomainPattern } from "../../../../reasoning/patterns/types.js";

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestPattern = (
  id: string,
  domain: string,
  qualityThreshold?: number
): DomainPattern => ({
  id,
  name: `Test Pattern ${id}`,
  description: `Test pattern for ${domain}`,
  indicators: [{ type: "exact", value: "test", weight: 0.8 }],
  hypotheses: [
    {
      id: "h1",
      statement: "Test hypothesis",
      investigationSteps: ["Step 1"],
      expectedFindings: ["Finding 1"],
      relatedHypotheses: [],
      estimatedTime: "10 minutes",
      likelihood: 0.7,
    },
  ],
  recommendations: [
    {
      id: "r1",
      type: "diagnostic",
      action: "Test action",
      tools: ["tool1"],
      expectedOutcome: "Expected outcome",
      prerequisites: [],
      priority: 5,
    },
  ],
  severity: "medium",
  qualityThreshold,
});

// ============================================================================
// Tests
// ============================================================================

describe("QualityTracker", () => {
  let tracker: QualityTracker;

  beforeEach(() => {
    tracker = new QualityTracker();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("createQualityTracker", () => {
    it("should create a new QualityTracker instance", () => {
      const newTracker = createQualityTracker();
      expect(newTracker).toBeInstanceOf(QualityTracker);
    });
  });

  describe("registerPattern", () => {
    it("should register a pattern for tracking", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      const metrics = tracker.getMetrics("test-1");
      expect(metrics).toBeDefined();
      expect(metrics?.patternId).toBe("test-1");
      expect(metrics?.domain).toBe("database");
      expect(metrics?.usageCount).toBe(0);
    });

    it("should use default quality threshold when not specified", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      // Default threshold is 0.5, and with no usage, quality score is 0
      // So it should NOT meet threshold
      expect(tracker.meetsQualityThreshold("test-1")).toBe(false);
    });

    it("should use custom quality threshold when specified", () => {
      const pattern = createTestPattern("test-1", "database", 0.8);
      tracker.registerPattern(pattern, "database");

      // With no usage, quality score is 0, which is below 0.8 threshold
      expect(tracker.meetsQualityThreshold("test-1")).toBe(false);
    });

    it("should extract domain from pattern ID when not provided", () => {
      const pattern = createTestPattern("database-slow-query", "database");
      tracker.registerPattern(pattern);

      const metrics = tracker.getMetrics("database-slow-query");
      expect(metrics?.domain).toBe("database");
    });
  });

  describe("recordMatch", () => {
    it("should increment usage count on match", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      tracker.recordMatch("test-1", 0.8);

      const metrics = tracker.getMetrics("test-1");
      expect(metrics?.usageCount).toBe(1);
    });

    it("should update average confidence on match", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-1", 0.6);

      const metrics = tracker.getMetrics("test-1");
      expect(metrics?.averageConfidence).toBe(0.7);
    });

    it("should update lastUsed timestamp on match", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      tracker.recordMatch("test-1", 0.8);

      const metrics = tracker.getMetrics("test-1");
      expect(metrics?.lastUsed).toEqual(new Date("2025-01-01T12:00:00Z"));
    });

    it("should handle match for unregistered pattern gracefully", () => {
      // Should not throw
      expect(() => tracker.recordMatch("unknown-pattern", 0.8)).not.toThrow();
    });

    it("should clamp confidence to valid range [0, 1]", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      tracker.recordMatch("test-1", 1.5); // Above 1
      tracker.recordMatch("test-1", -0.5); // Below 0

      const metrics = tracker.getMetrics("test-1");
      // Average of clamped values: (1.0 + 0.0) / 2 = 0.5
      expect(metrics?.averageConfidence).toBe(0.5);
    });
  });

  describe("getQualityScore", () => {
    it("should return 0 for pattern with no usage", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      expect(tracker.getQualityScore("test-1")).toBe(0);
    });

    it("should compute quality score based on usage and confidence", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      // Record multiple matches with varying confidence
      tracker.recordMatch("test-1", 0.9);
      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-1", 0.7);

      const score = tracker.getQualityScore("test-1");
      // Quality score should be positive and based on average confidence
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return 0 for unknown pattern", () => {
      expect(tracker.getQualityScore("unknown-pattern")).toBe(0);
    });

    it("should increase quality score with more usage", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      tracker.recordMatch("test-1", 0.8);
      const scoreAfterOne = tracker.getQualityScore("test-1");

      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-1", 0.8);
      const scoreAfterThree = tracker.getQualityScore("test-1");

      expect(scoreAfterThree).toBeGreaterThanOrEqual(scoreAfterOne);
    });
  });

  describe("meetsQualityThreshold", () => {
    it("should return true when quality score meets threshold", () => {
      const pattern = createTestPattern("test-1", "database", 0.3);
      tracker.registerPattern(pattern, "database");

      // Record enough matches to exceed threshold
      tracker.recordMatch("test-1", 0.9);
      tracker.recordMatch("test-1", 0.9);
      tracker.recordMatch("test-1", 0.9);

      expect(tracker.meetsQualityThreshold("test-1")).toBe(true);
    });

    it("should return false when quality score is below threshold", () => {
      const pattern = createTestPattern("test-1", "database", 0.9);
      tracker.registerPattern(pattern, "database");

      // Record low confidence matches
      tracker.recordMatch("test-1", 0.3);

      expect(tracker.meetsQualityThreshold("test-1")).toBe(false);
    });

    it("should return false for unknown pattern", () => {
      expect(tracker.meetsQualityThreshold("unknown-pattern")).toBe(false);
    });

    it("should use default threshold of 0.5 when not specified", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      // Record matches that should result in quality score around 0.6
      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-1", 0.8);

      expect(tracker.meetsQualityThreshold("test-1")).toBe(true);
    });
  });

  describe("exportMetrics", () => {
    it("should export metrics for all registered patterns", () => {
      const pattern1 = createTestPattern("test-1", "database");
      const pattern2 = createTestPattern("test-2", "api");
      tracker.registerPattern(pattern1, "database");
      tracker.registerPattern(pattern2, "api");

      tracker.recordMatch("test-1", 0.8);
      tracker.recordMatch("test-2", 0.6);

      const exported = tracker.exportMetrics();

      expect(exported.patterns).toHaveLength(2);
      expect(exported.exportedAt).toEqual(new Date("2025-01-01T12:00:00Z"));
      expect(exported.totalPatterns).toBe(2);
    });

    it("should compute overall quality score", () => {
      const pattern1 = createTestPattern("test-1", "database");
      const pattern2 = createTestPattern("test-2", "api");
      tracker.registerPattern(pattern1, "database");
      tracker.registerPattern(pattern2, "api");

      tracker.recordMatch("test-1", 0.9);
      tracker.recordMatch("test-2", 0.7);

      const exported = tracker.exportMetrics();

      expect(exported.overallQualityScore).toBeGreaterThan(0);
      expect(exported.overallQualityScore).toBeLessThanOrEqual(1);
    });

    it("should identify domains with low quality", () => {
      const pattern1 = createTestPattern("test-1", "database", 0.8);
      const pattern2 = createTestPattern("test-2", "api", 0.3);
      tracker.registerPattern(pattern1, "database");
      tracker.registerPattern(pattern2, "api");

      // database pattern has low quality (no usage)
      // api pattern has good quality
      tracker.recordMatch("test-2", 0.9);
      tracker.recordMatch("test-2", 0.9);
      tracker.recordMatch("test-2", 0.9);

      const exported = tracker.exportMetrics();

      expect(exported.domainsWithLowQuality).toContain("database");
    });

    it("should return empty metrics when no patterns registered", () => {
      const exported = tracker.exportMetrics();

      expect(exported.patterns).toHaveLength(0);
      expect(exported.totalPatterns).toBe(0);
      expect(exported.overallQualityScore).toBe(0);
      expect(exported.domainsWithLowQuality).toHaveLength(0);
    });

    it("should include test pass/fail counts", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");
      tracker.recordTestResult("test-1", true);
      tracker.recordTestResult("test-1", true);
      tracker.recordTestResult("test-1", false);

      const exported = tracker.exportMetrics();
      const patternMetrics = exported.patterns.find((p) => p.patternId === "test-1");

      expect(patternMetrics?.testsPassing).toBe(2);
      expect(patternMetrics?.testsFailing).toBe(1);
    });

    it("should include patternsWithTests count", () => {
      const pattern1 = createTestPattern("test-1", "database");
      const pattern2 = createTestPattern("test-2", "api");
      tracker.registerPattern(pattern1, "database");
      tracker.registerPattern(pattern2, "api");

      tracker.recordTestResult("test-1", true);
      // pattern2 has no test results

      const exported = tracker.exportMetrics();

      expect(exported.patternsWithTests).toBe(1);
    });
  });

  describe("recordTestResult", () => {
    it("should increment testsPassing for passing test", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      tracker.recordTestResult("test-1", true);

      const metrics = tracker.getMetrics("test-1");
      expect(metrics?.testsPassing).toBe(1);
      expect(metrics?.testsFailing).toBe(0);
    });

    it("should increment testsFailing for failing test", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      tracker.recordTestResult("test-1", false);

      const metrics = tracker.getMetrics("test-1");
      expect(metrics?.testsPassing).toBe(0);
      expect(metrics?.testsFailing).toBe(1);
    });

    it("should handle test result for unregistered pattern gracefully", () => {
      expect(() => tracker.recordTestResult("unknown-pattern", true)).not.toThrow();
    });
  });

  describe("getMetrics", () => {
    it("should return metrics for registered pattern", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      const metrics = tracker.getMetrics("test-1");

      expect(metrics).toBeDefined();
      expect(metrics?.patternId).toBe("test-1");
      expect(metrics?.domain).toBe("database");
    });

    it("should return undefined for unknown pattern", () => {
      const metrics = tracker.getMetrics("unknown-pattern");
      expect(metrics).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("should clear all metrics", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");
      tracker.recordMatch("test-1", 0.8);

      tracker.reset();

      expect(tracker.getMetrics("test-1")).toBeUndefined();
      expect(tracker.exportMetrics().totalPatterns).toBe(0);
    });
  });

  describe("quality score computation", () => {
    it("should weight recent usage more heavily", () => {
      const pattern = createTestPattern("test-1", "database");
      tracker.registerPattern(pattern, "database");

      // Record old matches
      tracker.recordMatch("test-1", 0.5);
      tracker.recordMatch("test-1", 0.5);

      // Advance time
      vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));

      // Record recent matches with higher confidence
      tracker.recordMatch("test-1", 0.9);
      tracker.recordMatch("test-1", 0.9);

      const score = tracker.getQualityScore("test-1");
      // Score should reflect the higher recent confidence
      expect(score).toBeGreaterThan(0.5);
    });
  });
});
