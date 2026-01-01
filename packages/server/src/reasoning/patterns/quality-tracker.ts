/**
 * Quality Tracker for Pattern-Based Reasoning
 *
 * Tracks pattern usage and quality metrics for iterative improvement.
 * Provides quality score computation, threshold checking, and metrics export.
 *
 * Requirements: 7.1, 7.2, 7.4, 7.6
 */

import { Logger } from "../../utils/logger.js";
import type { DomainPattern, PatternQualityMetrics, QualityMetricsExport } from "./types.js";

// ============================================================================
// Constants
// ============================================================================

/** Default quality threshold when not specified in pattern */
const DEFAULT_QUALITY_THRESHOLD = 0.5;

/** Weight for usage count in quality score computation */
const USAGE_WEIGHT = 0.3;

/** Weight for average confidence in quality score computation */
const CONFIDENCE_WEIGHT = 0.5;

/** Weight for test results in quality score computation */
const TEST_WEIGHT = 0.2;

/** Minimum usage count for full usage contribution to quality score */
const MIN_USAGE_FOR_FULL_SCORE = 10;

// ============================================================================
// Internal Types
// ============================================================================

interface PatternTrackingData {
  patternId: string;
  domain: string;
  qualityThreshold: number;
  usageCount: number;
  totalConfidence: number;
  lastUsed: Date | null;
  testsPassing: number;
  testsFailing: number;
  matchHistory: Array<{ confidence: number; timestamp: Date }>;
}

// ============================================================================
// QualityTracker Class
// ============================================================================

/**
 * Tracks pattern usage and quality metrics for iterative improvement.
 *
 * The quality score is computed based on:
 * - Usage frequency (more usage = higher confidence in the score)
 * - Average match confidence (higher confidence = better pattern)
 * - Test results (passing tests = validated pattern)
 *
 * Requirements: 7.1, 7.2, 7.4, 7.6
 */
export class QualityTracker {
  private patterns: Map<string, PatternTrackingData> = new Map();

  /**
   * Register a pattern for quality tracking.
   *
   * @param pattern - The domain pattern to register
   * @param domain - Optional domain name (if not provided, extracted from pattern ID)
   */
  registerPattern(pattern: DomainPattern, domain?: string): void {
    const trackingData: PatternTrackingData = {
      patternId: pattern.id,
      domain: domain ?? this.extractDomain(pattern),
      qualityThreshold: pattern.qualityThreshold ?? DEFAULT_QUALITY_THRESHOLD,
      usageCount: 0,
      totalConfidence: 0,
      lastUsed: null,
      testsPassing: 0,
      testsFailing: 0,
      matchHistory: [],
    };

    this.patterns.set(pattern.id, trackingData);
    Logger.debug(
      `QualityTracker: Registered pattern ${pattern.id} in domain ${trackingData.domain}`
    );
  }

  /**
   * Record a pattern match for usage tracking.
   *
   * Updates usage count, average confidence, and last used timestamp.
   *
   * @param patternId - The pattern that was matched
   * @param confidence - The confidence score of the match (0-1)
   *
   * Requirements: 7.1
   */
  recordMatch(patternId: string, confidence: number): void {
    const data = this.patterns.get(patternId);
    if (!data) {
      Logger.debug(`QualityTracker: Ignoring match for unregistered pattern ${patternId}`);
      return;
    }

    // Clamp confidence to valid range
    const clampedConfidence = Math.max(0, Math.min(1, confidence));

    data.usageCount++;
    data.totalConfidence += clampedConfidence;
    data.lastUsed = new Date();
    data.matchHistory.push({
      confidence: clampedConfidence,
      timestamp: new Date(),
    });

    // Keep match history bounded to prevent memory growth
    if (data.matchHistory.length > 100) {
      data.matchHistory = data.matchHistory.slice(-100);
    }

    Logger.debug(
      `QualityTracker: Recorded match for ${patternId} with confidence ${clampedConfidence.toFixed(2)}`
    );
  }

  /**
   * Get the computed quality score for a pattern.
   *
   * Quality score is computed based on:
   * - Usage frequency (normalized to 0-1 based on MIN_USAGE_FOR_FULL_SCORE)
   * - Average match confidence
   * - Test pass rate
   *
   * @param patternId - The pattern to get quality score for
   * @returns Quality score between 0 and 1, or 0 if pattern not found
   *
   * Requirements: 7.2
   */
  getQualityScore(patternId: string): number {
    const data = this.patterns.get(patternId);
    if (!data) {
      return 0;
    }

    return this.computeQualityScore(data);
  }

  /**
   * Check if a pattern meets its quality threshold.
   *
   * @param patternId - The pattern to check
   * @returns True if quality score meets or exceeds threshold
   *
   * Requirements: 7.4
   */
  meetsQualityThreshold(patternId: string): boolean {
    const data = this.patterns.get(patternId);
    if (!data) {
      return false;
    }

    const qualityScore = this.computeQualityScore(data);
    return qualityScore >= data.qualityThreshold;
  }

  /**
   * Export all quality metrics for analysis.
   *
   * @returns Complete quality metrics export
   *
   * Requirements: 7.6
   */
  exportMetrics(): QualityMetricsExport {
    const patternMetrics: PatternQualityMetrics[] = [];
    const domainQualityMap = new Map<string, { total: number; count: number }>();

    for (const data of this.patterns.values()) {
      const qualityScore = this.computeQualityScore(data);
      const averageConfidence = data.usageCount > 0 ? data.totalConfidence / data.usageCount : 0;

      patternMetrics.push({
        patternId: data.patternId,
        domain: data.domain,
        usageCount: data.usageCount,
        averageConfidence,
        qualityScore,
        lastUsed: data.lastUsed,
        testsPassing: data.testsPassing,
        testsFailing: data.testsFailing,
      });

      // Aggregate domain quality
      const domainData = domainQualityMap.get(data.domain) ?? { total: 0, count: 0 };
      domainData.total += qualityScore;
      domainData.count++;
      domainQualityMap.set(data.domain, domainData);
    }

    // Compute overall quality score
    const overallQualityScore =
      patternMetrics.length > 0
        ? patternMetrics.reduce((sum, p) => sum + p.qualityScore, 0) / patternMetrics.length
        : 0;

    // Identify domains with low quality
    const domainsWithLowQuality: string[] = [];
    for (const [domain, data] of domainQualityMap) {
      const avgDomainQuality = data.total / data.count;
      // Find the threshold for this domain
      const threshold = this.getDomainThreshold(domain);
      if (avgDomainQuality < threshold) {
        domainsWithLowQuality.push(domain);
      }
    }

    // Count patterns with tests
    const patternsWithTests = patternMetrics.filter(
      (p) => p.testsPassing > 0 || p.testsFailing > 0
    ).length;

    return {
      exportedAt: new Date(),
      patterns: patternMetrics,
      overallQualityScore,
      domainsWithLowQuality,
      totalPatterns: patternMetrics.length,
      patternsWithTests,
    };
  }

  /**
   * Record a test result for a pattern.
   *
   * @param patternId - The pattern that was tested
   * @param passed - Whether the test passed
   */
  recordTestResult(patternId: string, passed: boolean): void {
    const data = this.patterns.get(patternId);
    if (!data) {
      Logger.debug(`QualityTracker: Ignoring test result for unregistered pattern ${patternId}`);
      return;
    }

    if (passed) {
      data.testsPassing++;
    } else {
      data.testsFailing++;
    }

    Logger.debug(`QualityTracker: Recorded test ${passed ? "pass" : "fail"} for ${patternId}`);
  }

  /**
   * Get metrics for a specific pattern.
   *
   * @param patternId - The pattern to get metrics for
   * @returns Pattern metrics or undefined if not found
   */
  getMetrics(patternId: string): PatternQualityMetrics | undefined {
    const data = this.patterns.get(patternId);
    if (!data) {
      return undefined;
    }

    const qualityScore = this.computeQualityScore(data);
    const averageConfidence = data.usageCount > 0 ? data.totalConfidence / data.usageCount : 0;

    return {
      patternId: data.patternId,
      domain: data.domain,
      usageCount: data.usageCount,
      averageConfidence,
      qualityScore,
      lastUsed: data.lastUsed,
      testsPassing: data.testsPassing,
      testsFailing: data.testsFailing,
    };
  }

  /**
   * Reset all tracking data.
   */
  reset(): void {
    this.patterns.clear();
    Logger.debug("QualityTracker: Reset all tracking data");
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Compute quality score for a pattern.
   *
   * The score is a weighted combination of:
   * - Usage component: How often the pattern is used (normalized)
   * - Confidence component: Average match confidence
   * - Test component: Test pass rate
   */
  private computeQualityScore(data: PatternTrackingData): number {
    if (data.usageCount === 0) {
      return 0;
    }

    // Usage component: normalized to 0-1 based on MIN_USAGE_FOR_FULL_SCORE
    const usageComponent = Math.min(1, data.usageCount / MIN_USAGE_FOR_FULL_SCORE);

    // Confidence component: average confidence
    const confidenceComponent = data.totalConfidence / data.usageCount;

    // Test component: test pass rate (if tests exist)
    const totalTests = data.testsPassing + data.testsFailing;
    const testComponent = totalTests > 0 ? data.testsPassing / totalTests : 0.5; // Default to 0.5 if no tests

    // Weighted combination
    const score =
      USAGE_WEIGHT * usageComponent +
      CONFIDENCE_WEIGHT * confidenceComponent +
      TEST_WEIGHT * testComponent;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Extract domain from pattern.
   * This is a simple implementation - in practice, domain would be set during registration.
   */
  private extractDomain(pattern: DomainPattern): string {
    // Domain is typically set by the config file, but we can infer from pattern ID
    const parts = pattern.id.split("-");
    return parts[0] || "unknown";
  }

  /**
   * Get the quality threshold for a domain.
   */
  private getDomainThreshold(domain: string): number {
    // Find first pattern in domain and use its threshold
    for (const data of this.patterns.values()) {
      if (data.domain === domain) {
        return data.qualityThreshold;
      }
    }
    return DEFAULT_QUALITY_THRESHOLD;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new QualityTracker instance.
 *
 * @returns A new QualityTracker
 */
export function createQualityTracker(): QualityTracker {
  return new QualityTracker();
}
