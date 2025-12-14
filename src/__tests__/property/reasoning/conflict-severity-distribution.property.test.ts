/**
 * Property Tests for Conflict Severity Distribution
 *
 * Property 7: Conflict Severity Distribution
 * For any parallel reasoning with conflicts, severity SHALL NOT be 100% "low".
 *
 * Validates: Requirement 6.1
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ConflictResolutionEngine } from "../../../reasoning/conflict-resolution-engine";
import {
  ConflictSeverity,
  StreamStatus,
  StreamType,
  type StreamResult,
} from "../../../reasoning/types";

describe("Property 7: Conflict Severity Distribution", () => {
  const engine = new ConflictResolutionEngine();

  /**
   * Helper to create a stream result with specific properties
   */
  function createStreamResult(
    streamType: StreamType,
    conclusion: string,
    confidence: number
  ): StreamResult {
    return {
      streamId: `${streamType}-stream`,
      streamType,
      conclusion,
      reasoning: [`${streamType} reasoning step 1`, `${streamType} reasoning step 2`],
      insights: [
        {
          content: `Insight from ${streamType}`,
          source: streamType,
          confidence: confidence,
          importance: 0.7,
        },
      ],
      confidence,
      processingTime: 100,
      status: StreamStatus.COMPLETED,
    };
  }

  /**
   * Arbitrary for generating stream types
   */
  const streamTypeArb = fc.constantFrom(
    StreamType.ANALYTICAL,
    StreamType.CREATIVE,
    StreamType.CRITICAL,
    StreamType.SYNTHETIC
  );

  /**
   * Arbitrary for generating confidence levels
   */
  const confidenceArb = fc.double({ min: 0.5, max: 1.0, noNaN: true });

  /**
   * Arbitrary for generating contradictory conclusion pairs
   */
  const contradictoryPairArb = fc.constantFrom(
    { claim1: "The system is safe", claim2: "The system is unsafe" },
    { claim1: "Value is 100", claim2: "Value is 200" },
    { claim1: "Use method A", claim2: "Use method B" },
    { claim1: "Will increase by 10%", claim2: "Will decrease by 5%" },
    { claim1: "Prioritize security", claim2: "Prioritize usability" },
    { claim1: "Data shows growth", claim2: "Data shows decline" },
    { claim1: "Solution A is optimal", claim2: "Solution B is optimal" },
    { claim1: "If A then B, A is true", claim2: "If A then B, but not B" }
  );

  it("should produce varied severity levels across diverse conflicts", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            streamTypeArb,
            streamTypeArb,
            contradictoryPairArb,
            confidenceArb,
            confidenceArb
          ),
          { minLength: 10, maxLength: 20 }
        ),
        (conflictSpecs) => {
          const severities: ConflictSeverity[] = [];

          for (const [type1, type2, pair, conf1, conf2] of conflictSpecs) {
            // Skip if same stream type
            if (type1 === type2) continue;

            const results: StreamResult[] = [
              createStreamResult(type1, pair.claim1, conf1),
              createStreamResult(type2, pair.claim2, conf2),
            ];

            const conflicts = engine.detectConflicts(results);

            for (const conflict of conflicts) {
              severities.push(conflict.severity);
            }
          }

          // If we have conflicts, they should not all be LOW
          if (severities.length >= 5) {
            const lowCount = severities.filter((s) => s === ConflictSeverity.LOW).length;
            const lowPercentage = lowCount / severities.length;

            // Property: Not 100% LOW severity
            expect(lowPercentage).toBeLessThan(1.0);
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  it("should assess higher severity for high-confidence conflicts", () => {
    fc.assert(
      fc.property(streamTypeArb, streamTypeArb, contradictoryPairArb, (type1, type2, pair) => {
        // Skip if same stream type
        if (type1 === type2) return true;

        // High confidence conflict
        const highConfResults: StreamResult[] = [
          createStreamResult(type1, pair.claim1, 0.95),
          createStreamResult(type2, pair.claim2, 0.95),
        ];

        // Low confidence conflict
        const lowConfResults: StreamResult[] = [
          createStreamResult(type1, pair.claim1, 0.5),
          createStreamResult(type2, pair.claim2, 0.5),
        ];

        const highConfConflicts = engine.detectConflicts(highConfResults);
        const lowConfConflicts = engine.detectConflicts(lowConfResults);

        if (highConfConflicts.length > 0 && lowConfConflicts.length > 0) {
          const highSeverityScore = severityToScore(highConfConflicts[0].severity);
          const lowSeverityScore = severityToScore(lowConfConflicts[0].severity);

          // High confidence conflicts should have equal or higher severity
          expect(highSeverityScore).toBeGreaterThanOrEqual(lowSeverityScore);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("should assess higher severity for factual/logical conflicts than methodological", () => {
    fc.assert(
      fc.property(confidenceArb, (confidence) => {
        // Factual conflict
        const factualResults: StreamResult[] = [
          createStreamResult(StreamType.ANALYTICAL, "Data shows 100 users", confidence),
          createStreamResult(StreamType.CREATIVE, "Data shows 200 users", confidence),
        ];

        // Methodological conflict
        const methodResults: StreamResult[] = [
          createStreamResult(StreamType.ANALYTICAL, "Use quantitative method", confidence),
          createStreamResult(StreamType.CREATIVE, "Use qualitative method", confidence),
        ];

        const factualConflicts = engine.detectConflicts(factualResults);
        const methodConflicts = engine.detectConflicts(methodResults);

        if (factualConflicts.length > 0 && methodConflicts.length > 0) {
          const factualSeverityScore = severityToScore(factualConflicts[0].severity);
          const methodSeverityScore = severityToScore(methodConflicts[0].severity);

          // Factual conflicts should have equal or higher severity than methodological
          // at the same confidence level
          expect(factualSeverityScore).toBeGreaterThanOrEqual(methodSeverityScore);
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it("should produce CRITICAL severity for direct contradictions with very high confidence", () => {
    // Direct contradiction with very high confidence should be CRITICAL
    const results: StreamResult[] = [
      createStreamResult(StreamType.ANALYTICAL, "System is safe", 0.95),
      createStreamResult(StreamType.SYNTHETIC, "System is unsafe", 0.95),
    ];

    const conflicts = engine.detectConflicts(results);

    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe(ConflictSeverity.CRITICAL);
  });

  it("should produce varied severity distribution across many conflicts", () => {
    const severityCounts = {
      [ConflictSeverity.LOW]: 0,
      [ConflictSeverity.MEDIUM]: 0,
      [ConflictSeverity.HIGH]: 0,
      [ConflictSeverity.CRITICAL]: 0,
    };

    // Generate many conflicts with varying parameters
    const streamTypes = [
      StreamType.ANALYTICAL,
      StreamType.CREATIVE,
      StreamType.CRITICAL,
      StreamType.SYNTHETIC,
    ];

    const conclusions = [
      { c1: "Value is 100", c2: "Value is 200" },
      { c1: "System is safe", c2: "System is unsafe" },
      { c1: "Use method A", c2: "Use method B" },
      { c1: "Will grow by 10%", c2: "Will decline by 5%" },
      { c1: "Prioritize security", c2: "Prioritize usability" },
      { c1: "If A then B", c2: "If A then not B" },
    ];

    const confidences = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];

    for (let i = 0; i < streamTypes.length; i++) {
      for (let j = i + 1; j < streamTypes.length; j++) {
        for (const pair of conclusions) {
          for (const conf of confidences) {
            const results: StreamResult[] = [
              createStreamResult(streamTypes[i], pair.c1, conf),
              createStreamResult(streamTypes[j], pair.c2, conf),
            ];

            const conflicts = engine.detectConflicts(results);
            for (const conflict of conflicts) {
              severityCounts[conflict.severity]++;
            }
          }
        }
      }
    }

    // Property: Should have at least 2 different severity levels represented
    const nonZeroCounts = Object.values(severityCounts).filter((c) => c > 0).length;
    expect(nonZeroCounts).toBeGreaterThanOrEqual(2);

    // Property: Not all LOW
    const total = Object.values(severityCounts).reduce((a, b) => a + b, 0);
    const lowPercentage = severityCounts[ConflictSeverity.LOW] / total;
    expect(lowPercentage).toBeLessThan(1.0);
  });

  it("should include specific descriptions explaining the nature of disagreement", () => {
    fc.assert(
      fc.property(
        streamTypeArb,
        streamTypeArb,
        contradictoryPairArb,
        confidenceArb,
        (type1, type2, pair, confidence) => {
          // Skip if same stream type
          if (type1 === type2) return true;

          const results: StreamResult[] = [
            createStreamResult(type1, pair.claim1, confidence),
            createStreamResult(type2, pair.claim2, confidence),
          ];

          const conflicts = engine.detectConflicts(results);

          for (const conflict of conflicts) {
            // Description should not be generic
            expect(conflict.description).not.toMatch(
              /^[A-Z]+\s+conflict\s+between\s+\w+\s+and\s+\w+$/
            );

            // Description should contain specific claims or explanations
            expect(conflict.description.length).toBeGreaterThan(50);

            // Description should mention the nature of disagreement
            const hasSpecificContent =
              conflict.description.includes("claims") ||
              conflict.description.includes("concludes") ||
              conflict.description.includes("advocates") ||
              conflict.description.includes("prioritizes") ||
              conflict.description.includes("forecasts") ||
              conflict.description.includes("disagreement") ||
              conflict.description.includes("conflict");

            expect(hasSpecificContent).toBe(true);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should include resolution suggestions for all conflicts", () => {
    fc.assert(
      fc.property(
        streamTypeArb,
        streamTypeArb,
        contradictoryPairArb,
        confidenceArb,
        (type1, type2, pair, confidence) => {
          // Skip if same stream type
          if (type1 === type2) return true;

          const results: StreamResult[] = [
            createStreamResult(type1, pair.claim1, confidence),
            createStreamResult(type2, pair.claim2, confidence),
          ];

          const conflicts = engine.detectConflicts(results);

          for (const conflict of conflicts) {
            // Should have resolution framework
            expect(conflict.resolutionFramework).toBeDefined();

            if (conflict.resolutionFramework) {
              // Should have approach
              expect(conflict.resolutionFramework.approach).toBeTruthy();
              expect(conflict.resolutionFramework.approach.length).toBeGreaterThan(10);

              // Should have steps
              expect(conflict.resolutionFramework.steps).toBeInstanceOf(Array);
              expect(conflict.resolutionFramework.steps.length).toBeGreaterThan(0);

              // Should have considerations
              expect(conflict.resolutionFramework.considerations).toBeInstanceOf(Array);
              expect(conflict.resolutionFramework.considerations.length).toBeGreaterThan(0);

              // Should have recommended action
              expect(conflict.resolutionFramework.recommendedAction).toBeTruthy();
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to convert severity to numeric score for comparison
 */
function severityToScore(severity: ConflictSeverity): number {
  switch (severity) {
    case ConflictSeverity.LOW:
      return 1;
    case ConflictSeverity.MEDIUM:
      return 2;
    case ConflictSeverity.HIGH:
      return 3;
    case ConflictSeverity.CRITICAL:
      return 4;
    default:
      return 0;
  }
}
