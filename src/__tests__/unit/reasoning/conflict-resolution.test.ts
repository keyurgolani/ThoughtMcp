/**
 * Tests for ConflictResolutionEngine
 *
 * Following TDD methodology - these tests are written first and should fail
 * until the conflict resolution engine implementation is complete.
 *
 * Tests cover:
 * - Automatic conflict identification for all 5 types
 * - Conflict classification
 * - Severity assessment (LOW/MEDIUM/HIGH/CRITICAL)
 * - Resolution framework generation
 * - Pattern tracking
 * - Edge cases (no conflicts, all conflicts, partial)
 * - Error scenarios
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ConflictResolutionEngine } from "../../../reasoning/conflict-resolution-engine";
import {
  ConflictSeverity,
  ConflictType,
  StreamStatus,
  StreamType,
  type Conflict,
  type StreamResult,
} from "../../../reasoning/types";

describe("ConflictResolutionEngine", () => {
  let engine: ConflictResolutionEngine;

  beforeEach(() => {
    engine = new ConflictResolutionEngine();
  });

  // Helper function to create mock stream results
  function createMockStreamResult(
    type: StreamType,
    conclusion: string,
    confidence: number = 0.8,
    insights: string[] = []
  ): StreamResult {
    return {
      streamId: `${type}-stream`,
      streamType: type,
      conclusion,
      reasoning: [`${type} reasoning step 1`, `${type} reasoning step 2`],
      insights: insights.map((content, idx) => ({
        content,
        source: type,
        confidence: 0.8 - idx * 0.1,
        importance: 0.7 - idx * 0.1,
      })),
      confidence,
      processingTime: 100,
      status: StreamStatus.COMPLETED,
    };
  }

  describe("detectConflicts", () => {
    it("should detect no conflicts when all streams agree", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "The solution is X"),
        createMockStreamResult(StreamType.CREATIVE, "The solution is X"),
        createMockStreamResult(StreamType.CRITICAL, "The solution is X"),
        createMockStreamResult(StreamType.SYNTHETIC, "The solution is X"),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts).toHaveLength(0);
    });

    it("should detect factual conflicts when streams contradict on facts", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "The data shows 100 users", 0.9, [
          "Data analysis reveals 100 active users",
        ]),
        createMockStreamResult(StreamType.CREATIVE, "The data shows 200 users", 0.9, [
          "Creative interpretation suggests 200 users",
        ]),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(0);
      const factualConflict = conflicts.find((c) => c.type === ConflictType.FACTUAL);
      expect(factualConflict).toBeDefined();
      expect(factualConflict?.sourceStreams).toContain("analytical-stream");
      expect(factualConflict?.sourceStreams).toContain("creative-stream");
    });

    it("should detect logical conflicts when reasoning is inconsistent", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "If A then B, A is true, therefore B", 0.9),
        createMockStreamResult(StreamType.CRITICAL, "If A then B, A is true, but B is false", 0.9),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(0);
      const logicalConflict = conflicts.find((c) => c.type === ConflictType.LOGICAL);
      expect(logicalConflict).toBeDefined();
    });

    it("should detect methodological conflicts between different approaches", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "Use quantitative analysis", 0.8, [
          "Data-driven approach is best",
        ]),
        createMockStreamResult(StreamType.CREATIVE, "Use qualitative exploration", 0.8, [
          "Intuitive approach is better",
        ]),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(0);
      const methodologicalConflict = conflicts.find((c) => c.type === ConflictType.METHODOLOGICAL);
      expect(methodologicalConflict).toBeDefined();
    });

    it("should detect evaluative conflicts when value judgments differ", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.CRITICAL, "Prioritize security over usability", 0.8, [
          "Security is paramount",
        ]),
        createMockStreamResult(StreamType.CREATIVE, "Prioritize usability over security", 0.8, [
          "User experience matters most",
        ]),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(0);
      const evaluativeConflict = conflicts.find((c) => c.type === ConflictType.EVALUATIVE);
      expect(evaluativeConflict).toBeDefined();
    });

    it("should detect predictive conflicts when forecasts differ", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "Market will grow by 10%", 0.7, [
          "Historical trends suggest 10% growth",
        ]),
        createMockStreamResult(StreamType.SYNTHETIC, "Market will decline by 5%", 0.7, [
          "Synthesis indicates 5% decline",
        ]),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(0);
      const predictiveConflict = conflicts.find((c) => c.type === ConflictType.PREDICTIVE);
      expect(predictiveConflict).toBeDefined();
    });

    it("should detect multiple conflicts in complex scenarios", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "Data shows X, use method A", 0.9),
        createMockStreamResult(StreamType.CREATIVE, "Data shows Y, use method B", 0.9),
        createMockStreamResult(StreamType.CRITICAL, "Data shows X, but method B is better", 0.8),
        createMockStreamResult(StreamType.SYNTHETIC, "Data shows Z, method C is optimal", 0.7),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(1);
      // Should detect multiple types of conflicts
      const conflictTypes = new Set(conflicts.map((c) => c.type));
      expect(conflictTypes.size).toBeGreaterThan(1);
    });

    it("should handle edge case with only one stream result", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "Single stream conclusion"),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts).toHaveLength(0);
    });

    it("should handle edge case with empty results array", () => {
      const results: StreamResult[] = [];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe("classifyConflict", () => {
    it("should classify factual conflicts correctly", () => {
      const result1 = createMockStreamResult(StreamType.ANALYTICAL, "Fact: X is 100");
      const result2 = createMockStreamResult(StreamType.CREATIVE, "Fact: X is 200");

      const conflictType = engine.classifyConflict(result1, result2);

      expect(conflictType).toBe(ConflictType.FACTUAL);
    });

    it("should classify logical conflicts correctly", () => {
      const result1 = createMockStreamResult(StreamType.ANALYTICAL, "If A then B, A is true");
      const result2 = createMockStreamResult(StreamType.CRITICAL, "If A then B, but not B");

      const conflictType = engine.classifyConflict(result1, result2);

      expect(conflictType).toBe(ConflictType.LOGICAL);
    });

    it("should classify methodological conflicts correctly", () => {
      const result1 = createMockStreamResult(StreamType.ANALYTICAL, "Use quantitative method");
      const result2 = createMockStreamResult(StreamType.CREATIVE, "Use qualitative method");

      const conflictType = engine.classifyConflict(result1, result2);

      expect(conflictType).toBe(ConflictType.METHODOLOGICAL);
    });

    it("should classify evaluative conflicts correctly", () => {
      const result1 = createMockStreamResult(StreamType.CRITICAL, "Prioritize X over Y");
      const result2 = createMockStreamResult(StreamType.CREATIVE, "Prioritize Y over X");

      const conflictType = engine.classifyConflict(result1, result2);

      expect(conflictType).toBe(ConflictType.EVALUATIVE);
    });

    it("should classify predictive conflicts correctly", () => {
      const result1 = createMockStreamResult(StreamType.ANALYTICAL, "Will increase by 10%");
      const result2 = createMockStreamResult(StreamType.SYNTHETIC, "Will decrease by 5%");

      const conflictType = engine.classifyConflict(result1, result2);

      expect(conflictType).toBe(ConflictType.PREDICTIVE);
    });
  });

  describe("assessSeverity", () => {
    it("should assess LOW severity for minor disagreements", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.METHODOLOGICAL,
        severity: ConflictSeverity.LOW, // Will be overridden
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Minor methodological difference",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "Use method A",
            reasoning: "Method A is slightly better",
            confidence: 0.5, // Low confidence for LOW severity
          },
          {
            streamId: "creative-stream",
            streamType: StreamType.CREATIVE,
            claim: "Use method B",
            reasoning: "Method B is slightly better",
            confidence: 0.5, // Low confidence for LOW severity
          },
        ],
        detectedAt: new Date(),
      };

      const severity = engine.assessSeverity(conflict);

      expect(severity).toBe(ConflictSeverity.LOW);
    });

    it("should assess MEDIUM severity for significant disagreements", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Moderate factual disagreement",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "Value is 100",
            reasoning: "Data shows 100",
            confidence: 0.7, // Moderate confidence for MEDIUM severity
          },
          {
            streamId: "creative-stream",
            streamType: StreamType.CREATIVE,
            claim: "Value is 150",
            reasoning: "Interpretation suggests 150",
            confidence: 0.7, // Moderate confidence for MEDIUM severity
          },
        ],
        detectedAt: new Date(),
      };

      const severity = engine.assessSeverity(conflict);

      expect(severity).toBe(ConflictSeverity.MEDIUM);
    });

    it("should assess HIGH severity for major contradictions", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.LOGICAL,
        severity: ConflictSeverity.HIGH,
        sourceStreams: ["analytical-stream", "critical-stream"],
        description: "Major logical contradiction",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "A implies B",
            reasoning: "Logical deduction",
            confidence: 0.88, // High but not critical confidence for HIGH severity
          },
          {
            streamId: "critical-stream",
            streamType: StreamType.CRITICAL,
            claim: "A but not B",
            reasoning: "Critical analysis",
            confidence: 0.88, // High but not critical confidence for HIGH severity
          },
        ],
        detectedAt: new Date(),
      };

      const severity = engine.assessSeverity(conflict);

      expect(severity).toBe(ConflictSeverity.HIGH);
    });

    it("should assess CRITICAL severity for fundamental incompatibilities", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.CRITICAL,
        sourceStreams: ["analytical-stream", "synthetic-stream"],
        description: "Critical factual contradiction",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "System is safe",
            reasoning: "All safety checks passed",
            confidence: 0.95,
          },
          {
            streamId: "synthetic-stream",
            streamType: StreamType.SYNTHETIC,
            claim: "System is unsafe",
            reasoning: "Critical vulnerabilities found",
            confidence: 0.95,
          },
        ],
        detectedAt: new Date(),
      };

      const severity = engine.assessSeverity(conflict);

      expect(severity).toBe(ConflictSeverity.CRITICAL);
    });
  });

  describe("generateResolutionFramework", () => {
    it("should generate resolution framework for factual conflicts", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Factual disagreement",
        evidence: [],
        detectedAt: new Date(),
      };

      const framework = engine.generateResolutionFramework(conflict);

      expect(framework).toBeDefined();
      expect(framework.approach).toBeTruthy();
      expect(framework.steps).toBeInstanceOf(Array);
      expect(framework.steps.length).toBeGreaterThan(0);
      expect(framework.considerations).toBeInstanceOf(Array);
      expect(framework.considerations.length).toBeGreaterThan(0);
      expect(framework.recommendedAction).toBeTruthy();
    });

    it("should generate resolution framework for logical conflicts", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.LOGICAL,
        severity: ConflictSeverity.HIGH,
        sourceStreams: ["analytical-stream", "critical-stream"],
        description: "Logical inconsistency",
        evidence: [],
        detectedAt: new Date(),
      };

      const framework = engine.generateResolutionFramework(conflict);

      expect(framework).toBeDefined();
      expect(framework.approach).toContain("logical");
      expect(framework.steps.length).toBeGreaterThan(0);
    });

    it("should generate resolution framework for methodological conflicts", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.METHODOLOGICAL,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Methodological difference",
        evidence: [],
        detectedAt: new Date(),
      };

      const framework = engine.generateResolutionFramework(conflict);

      expect(framework).toBeDefined();
      expect(framework.approach).toContain("method");
      expect(framework.steps.length).toBeGreaterThan(0);
    });

    it("should generate resolution framework for evaluative conflicts", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.EVALUATIVE,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["critical-stream", "creative-stream"],
        description: "Value judgment difference",
        evidence: [],
        detectedAt: new Date(),
      };

      const framework = engine.generateResolutionFramework(conflict);

      expect(framework).toBeDefined();
      expect(framework.approach).toContain("value");
      expect(framework.steps.length).toBeGreaterThan(0);
    });

    it("should generate resolution framework for predictive conflicts", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.PREDICTIVE,
        severity: ConflictSeverity.HIGH,
        sourceStreams: ["analytical-stream", "synthetic-stream"],
        description: "Prediction disagreement",
        evidence: [],
        detectedAt: new Date(),
      };

      const framework = engine.generateResolutionFramework(conflict);

      expect(framework).toBeDefined();
      expect(framework.approach).toContain("predict");
      expect(framework.steps.length).toBeGreaterThan(0);
    });

    it("should tailor resolution framework based on severity", () => {
      const lowSeverityConflict: Conflict = {
        id: "low-conflict",
        type: ConflictType.METHODOLOGICAL,
        severity: ConflictSeverity.LOW,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Minor difference",
        evidence: [],
        detectedAt: new Date(),
      };

      const criticalConflict: Conflict = {
        id: "critical-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.CRITICAL,
        sourceStreams: ["analytical-stream", "synthetic-stream"],
        description: "Critical contradiction",
        evidence: [],
        detectedAt: new Date(),
      };

      const lowFramework = engine.generateResolutionFramework(lowSeverityConflict);
      const criticalFramework = engine.generateResolutionFramework(criticalConflict);

      expect(lowFramework.recommendedAction).not.toBe(criticalFramework.recommendedAction);
      // Critical conflicts should have more urgent language
      expect(criticalFramework.recommendedAction.toLowerCase()).toMatch(
        /immediate|urgent|critical|priority/
      );
    });

    it("should generate default resolution framework for unknown conflict types", () => {
      // Create a conflict with an unknown type by casting
      const unknownConflict: Conflict = {
        id: "unknown-conflict",
        type: "UNKNOWN_TYPE" as ConflictType,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Unknown conflict type",
        evidence: [],
        detectedAt: new Date(),
      };

      const framework = engine.generateResolutionFramework(unknownConflict);

      expect(framework).toBeDefined();
      expect(framework.approach).toBe("Systematic analysis and evidence-based resolution");
      expect(framework.steps).toBeInstanceOf(Array);
      expect(framework.steps.length).toBeGreaterThan(0);
      expect(framework.steps).toContain("Clearly define the conflict");
      expect(framework.steps).toContain("Gather additional evidence");
      expect(framework.considerations).toContain("Context and constraints");
      expect(framework.considerations).toContain("Evidence quality");
      expect(framework.recommendedAction).toBe("Conduct systematic analysis to resolve conflict");
    });
  });

  describe("trackConflictPattern", () => {
    it("should track conflict patterns over time", () => {
      const conflicts: Conflict[] = [
        {
          id: "conflict-1",
          type: ConflictType.METHODOLOGICAL,
          severity: ConflictSeverity.MEDIUM,
          sourceStreams: ["analytical-stream", "creative-stream"],
          description: "Method conflict 1",
          evidence: [],
          detectedAt: new Date(),
        },
        {
          id: "conflict-2",
          type: ConflictType.METHODOLOGICAL,
          severity: ConflictSeverity.MEDIUM,
          sourceStreams: ["analytical-stream", "creative-stream"],
          description: "Method conflict 2",
          evidence: [],
          detectedAt: new Date(),
        },
      ];

      conflicts.forEach((conflict) => engine.trackConflictPattern(conflict));

      const patterns = engine.getConflictPatterns();

      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);

      const methodologicalPattern = patterns.find((p) =>
        p.conflictTypes.includes(ConflictType.METHODOLOGICAL)
      );
      expect(methodologicalPattern).toBeDefined();
      expect(methodologicalPattern?.frequency).toBeGreaterThan(1);
    });

    it("should identify common source streams in patterns", () => {
      const conflicts: Conflict[] = [
        {
          id: "conflict-1",
          type: ConflictType.EVALUATIVE,
          severity: ConflictSeverity.LOW,
          sourceStreams: ["critical-stream", "creative-stream"],
          description: "Evaluative conflict 1",
          evidence: [],
          detectedAt: new Date(),
        },
        {
          id: "conflict-2",
          type: ConflictType.EVALUATIVE,
          severity: ConflictSeverity.LOW,
          sourceStreams: ["critical-stream", "creative-stream"],
          description: "Evaluative conflict 2",
          evidence: [],
          detectedAt: new Date(),
        },
      ];

      conflicts.forEach((conflict) => engine.trackConflictPattern(conflict));

      const patterns = engine.getConflictPatterns();
      const evaluativePattern = patterns.find((p) =>
        p.conflictTypes.includes(ConflictType.EVALUATIVE)
      );

      expect(evaluativePattern).toBeDefined();
      expect(evaluativePattern?.commonSources).toContain("critical-stream");
      expect(evaluativePattern?.commonSources).toContain("creative-stream");
    });

    it("should track resolution success rate", () => {
      const conflict: Conflict = {
        id: "conflict-1",
        type: ConflictType.LOGICAL,
        severity: ConflictSeverity.HIGH,
        sourceStreams: ["analytical-stream", "critical-stream"],
        description: "Logical conflict",
        evidence: [],
        detectedAt: new Date(),
      };

      engine.trackConflictPattern(conflict, true); // Resolved successfully

      const patterns = engine.getConflictPatterns();
      const logicalPattern = patterns.find((p) => p.conflictTypes.includes(ConflictType.LOGICAL));

      expect(logicalPattern).toBeDefined();
      expect(logicalPattern?.resolutionSuccess).toBeGreaterThan(0);
      expect(logicalPattern?.resolutionSuccess).toBeLessThanOrEqual(1);
    });
  });

  describe("error handling", () => {
    it("should handle null or undefined results gracefully", () => {
      expect(() => engine.detectConflicts(null as any)).not.toThrow();
      expect(() => engine.detectConflicts(undefined as any)).not.toThrow();
    });

    it("should handle malformed stream results", () => {
      const malformedResults = [
        {
          streamId: "test",
          // Missing required fields
        } as any,
      ];

      expect(() => engine.detectConflicts(malformedResults)).not.toThrow();
    });

    it("should handle conflicts with missing evidence", () => {
      const conflict: Conflict = {
        id: "test-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["stream1", "stream2"],
        description: "Test conflict",
        evidence: [], // Empty evidence
        detectedAt: new Date(),
      };

      expect(() => engine.generateResolutionFramework(conflict)).not.toThrow();
      expect(() => engine.assessSeverity(conflict)).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete workflow: detect, classify, assess, resolve", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "Solution A is optimal", 0.9),
        createMockStreamResult(StreamType.CREATIVE, "Solution B is optimal", 0.9),
      ];

      // Detect conflicts
      const conflicts = engine.detectConflicts(results);
      expect(conflicts.length).toBeGreaterThan(0);

      // Each conflict should have classification
      conflicts.forEach((conflict) => {
        expect(conflict.type).toBeDefined();
        expect(Object.values(ConflictType)).toContain(conflict.type);
      });

      // Each conflict should have severity assessment
      conflicts.forEach((conflict) => {
        expect(conflict.severity).toBeDefined();
        expect(Object.values(ConflictSeverity)).toContain(conflict.severity);
      });

      // Generate resolution frameworks
      conflicts.forEach((conflict) => {
        const framework = engine.generateResolutionFramework(conflict);
        expect(framework).toBeDefined();
        expect(framework.approach).toBeTruthy();
        expect(framework.steps.length).toBeGreaterThan(0);
      });

      // Track patterns
      conflicts.forEach((conflict) => engine.trackConflictPattern(conflict));
      const patterns = engine.getConflictPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe("severity calibration based on contradiction degree (Requirement 6.1)", () => {
    it("should assess higher severity for direct contradictions", () => {
      // Direct contradiction: safe vs unsafe
      const directContradiction: Conflict = {
        id: "direct-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.LOW,
        sourceStreams: ["analytical-stream", "synthetic-stream"],
        description: "Direct contradiction",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "System is safe",
            reasoning: "All checks passed",
            confidence: 0.9,
          },
          {
            streamId: "synthetic-stream",
            streamType: StreamType.SYNTHETIC,
            claim: "System is unsafe",
            reasoning: "Vulnerabilities found",
            confidence: 0.9,
          },
        ],
        detectedAt: new Date(),
      };

      // Indirect disagreement: different methods
      const indirectDisagreement: Conflict = {
        id: "indirect-conflict",
        type: ConflictType.METHODOLOGICAL,
        severity: ConflictSeverity.LOW,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Indirect disagreement",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "Use approach A",
            reasoning: "Approach A is good",
            confidence: 0.9,
          },
          {
            streamId: "creative-stream",
            streamType: StreamType.CREATIVE,
            claim: "Use approach B",
            reasoning: "Approach B is good",
            confidence: 0.9,
          },
        ],
        detectedAt: new Date(),
      };

      const directSeverity = engine.assessSeverity(directContradiction);
      const indirectSeverity = engine.assessSeverity(indirectDisagreement);

      // Direct contradictions should have higher or equal severity
      const directScore = severityToScore(directSeverity);
      const indirectScore = severityToScore(indirectSeverity);
      expect(directScore).toBeGreaterThanOrEqual(indirectScore);
    });

    it("should assess higher severity for factual conflicts than methodological at same confidence", () => {
      const factualConflict: Conflict = {
        id: "factual-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.LOW,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Factual conflict",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "Value is 100",
            reasoning: "Data shows 100",
            confidence: 0.8,
          },
          {
            streamId: "creative-stream",
            streamType: StreamType.CREATIVE,
            claim: "Value is 200",
            reasoning: "Data shows 200",
            confidence: 0.8,
          },
        ],
        detectedAt: new Date(),
      };

      const methodConflict: Conflict = {
        id: "method-conflict",
        type: ConflictType.METHODOLOGICAL,
        severity: ConflictSeverity.LOW,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Method conflict",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "Use method A",
            reasoning: "Method A is better",
            confidence: 0.8,
          },
          {
            streamId: "creative-stream",
            streamType: StreamType.CREATIVE,
            claim: "Use method B",
            reasoning: "Method B is better",
            confidence: 0.8,
          },
        ],
        detectedAt: new Date(),
      };

      const factualSeverity = engine.assessSeverity(factualConflict);
      const methodSeverity = engine.assessSeverity(methodConflict);

      // Factual conflicts should have higher or equal severity
      const factualScore = severityToScore(factualSeverity);
      const methodScore = severityToScore(methodSeverity);
      expect(factualScore).toBeGreaterThanOrEqual(methodScore);
    });

    it("should vary severity based on confidence levels", () => {
      const highConfConflict: Conflict = {
        id: "high-conf-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.LOW,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "High confidence conflict",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "Value is 100",
            reasoning: "Data shows 100",
            confidence: 0.95,
          },
          {
            streamId: "creative-stream",
            streamType: StreamType.CREATIVE,
            claim: "Value is 200",
            reasoning: "Data shows 200",
            confidence: 0.95,
          },
        ],
        detectedAt: new Date(),
      };

      const lowConfConflict: Conflict = {
        id: "low-conf-conflict",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.LOW,
        sourceStreams: ["analytical-stream", "creative-stream"],
        description: "Low confidence conflict",
        evidence: [
          {
            streamId: "analytical-stream",
            streamType: StreamType.ANALYTICAL,
            claim: "Value is 100",
            reasoning: "Data shows 100",
            confidence: 0.5,
          },
          {
            streamId: "creative-stream",
            streamType: StreamType.CREATIVE,
            claim: "Value is 200",
            reasoning: "Data shows 200",
            confidence: 0.5,
          },
        ],
        detectedAt: new Date(),
      };

      const highSeverity = engine.assessSeverity(highConfConflict);
      const lowSeverity = engine.assessSeverity(lowConfConflict);

      // Higher confidence should lead to higher or equal severity
      const highScore = severityToScore(highSeverity);
      const lowScore = severityToScore(lowSeverity);
      expect(highScore).toBeGreaterThanOrEqual(lowScore);
    });
  });

  describe("description specificity (Requirement 6.2)", () => {
    it("should generate specific descriptions explaining the nature of disagreement", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "The data shows 100 users", 0.9),
        createMockStreamResult(StreamType.CREATIVE, "The data shows 200 users", 0.9),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(0);
      const conflict = conflicts[0];

      // Description should not be generic
      expect(conflict.description).not.toBe("FACTUAL conflict between analytical and creative");

      // Description should contain specific claims
      expect(conflict.description.length).toBeGreaterThan(50);

      // Description should explain the nature of disagreement
      expect(
        conflict.description.includes("claims") ||
          conflict.description.includes("disagreement") ||
          conflict.description.includes("contradictory")
      ).toBe(true);
    });

    it("should include both claims in the description", () => {
      const results: StreamResult[] = [
        createMockStreamResult(StreamType.ANALYTICAL, "System is safe", 0.9),
        createMockStreamResult(StreamType.SYNTHETIC, "System is unsafe", 0.9),
      ];

      const conflicts = engine.detectConflicts(results);

      expect(conflicts.length).toBeGreaterThan(0);
      const conflict = conflicts[0];

      // Description should reference both claims
      expect(
        conflict.description.toLowerCase().includes("safe") ||
          conflict.description.toLowerCase().includes("unsafe")
      ).toBe(true);
    });
  });

  describe("resolution suggestions (Requirement 6.4)", () => {
    it("should provide resolution suggestions for all conflict types", () => {
      const conflictTypes = [
        ConflictType.FACTUAL,
        ConflictType.LOGICAL,
        ConflictType.METHODOLOGICAL,
        ConflictType.EVALUATIVE,
        ConflictType.PREDICTIVE,
      ];

      for (const type of conflictTypes) {
        const conflict: Conflict = {
          id: `${type}-conflict`,
          type,
          severity: ConflictSeverity.MEDIUM,
          sourceStreams: ["stream1", "stream2"],
          description: `${type} conflict`,
          evidence: [],
          detectedAt: new Date(),
        };

        const framework = engine.generateResolutionFramework(conflict);

        expect(framework).toBeDefined();
        expect(framework.approach).toBeTruthy();
        expect(framework.steps.length).toBeGreaterThan(0);
        expect(framework.considerations.length).toBeGreaterThan(0);
        expect(framework.recommendedAction).toBeTruthy();
      }
    });

    it("should tailor resolution suggestions based on conflict type", () => {
      const factualConflict: Conflict = {
        id: "factual",
        type: ConflictType.FACTUAL,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["stream1", "stream2"],
        description: "Factual conflict",
        evidence: [],
        detectedAt: new Date(),
      };

      const methodConflict: Conflict = {
        id: "method",
        type: ConflictType.METHODOLOGICAL,
        severity: ConflictSeverity.MEDIUM,
        sourceStreams: ["stream1", "stream2"],
        description: "Method conflict",
        evidence: [],
        detectedAt: new Date(),
      };

      const factualFramework = engine.generateResolutionFramework(factualConflict);
      const methodFramework = engine.generateResolutionFramework(methodConflict);

      // Different conflict types should have different approaches
      expect(factualFramework.approach).not.toBe(methodFramework.approach);
    });
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
