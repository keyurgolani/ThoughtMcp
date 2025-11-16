/**
 * Tests for SynthesisEngine integration with ConflictResolutionEngine
 *
 * Verifies that synthesis engine properly integrates conflict detection
 * and uses resolution frameworks to guide synthesis.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ConflictResolutionEngine } from "../../../reasoning/conflict-resolution-engine";
import { ResultSynthesisEngine } from "../../../reasoning/synthesis-engine";
import {
  ConflictType,
  StreamStatus,
  StreamType,
  type StreamResult,
} from "../../../reasoning/types";

describe("SynthesisEngine - ConflictResolutionEngine Integration", () => {
  let synthesisEngine: ResultSynthesisEngine;
  let conflictEngine: ConflictResolutionEngine;

  beforeEach(() => {
    synthesisEngine = new ResultSynthesisEngine();
    conflictEngine = new ConflictResolutionEngine();
  });

  describe("Conflict Detection Integration", () => {
    it("should detect conflicts before synthesis", () => {
      // Create stream results with clearly conflicting conclusions
      const results: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Prioritize security over usability",
          reasoning: ["Security analysis", "Risk assessment"],
          insights: [],
          confidence: 0.9,
          processingTime: 100,
        },
        {
          streamId: "creative-1",
          streamType: StreamType.CREATIVE,
          status: StreamStatus.COMPLETED,
          conclusion: "Prioritize usability over security",
          reasoning: ["User experience", "Adoption concerns"],
          insights: [],
          confidence: 0.85,
          processingTime: 100,
        },
      ];

      // Detect conflicts
      const conflicts = conflictEngine.detectConflicts(results);

      // Should detect at least one conflict
      expect(conflicts.length).toBeGreaterThan(0);
      // Conflict type should be one of the valid types
      expect([
        ConflictType.FACTUAL,
        ConflictType.LOGICAL,
        ConflictType.METHODOLOGICAL,
        ConflictType.EVALUATIVE,
        ConflictType.PREDICTIVE,
      ]).toContain(conflicts[0].type);
    });

    it("should include detected conflicts in synthesis result", () => {
      const results: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Prioritize security over usability",
          reasoning: ["Security is paramount"],
          insights: [],
          confidence: 0.9,
          processingTime: 100,
        },
        {
          streamId: "creative-1",
          streamType: StreamType.CREATIVE,
          status: StreamStatus.COMPLETED,
          conclusion: "Prioritize usability over security",
          reasoning: ["User experience matters most"],
          insights: [],
          confidence: 0.85,
          processingTime: 100,
        },
      ];

      // Synthesize with conflict detection
      const synthesis = synthesisEngine.synthesizeResults(results);

      // Should include conflicts in result
      expect(synthesis.conflicts).toBeDefined();
      expect(synthesis.conflicts.length).toBeGreaterThan(0);
    });

    it("should preserve resolution frameworks in conflicts", () => {
      const results: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Market will grow by 10%",
          reasoning: ["Historical trends"],
          insights: [],
          confidence: 0.9,
          processingTime: 100,
        },
        {
          streamId: "critical-1",
          streamType: StreamType.CRITICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Market will decline by 5%",
          reasoning: ["Risk analysis"],
          insights: [],
          confidence: 0.85,
          processingTime: 100,
        },
      ];

      const synthesis = synthesisEngine.synthesizeResults(results);

      // Should have conflicts with resolution frameworks
      expect(synthesis.conflicts.length).toBeGreaterThan(0);
      const conflict = synthesis.conflicts[0];
      expect(conflict.resolutionFramework).toBeDefined();
      expect(conflict.resolutionFramework?.approach).toBeDefined();
      expect(conflict.resolutionFramework?.steps).toBeDefined();
      expect(conflict.resolutionFramework?.considerations).toBeDefined();
      expect(conflict.resolutionFramework?.recommendedAction).toBeDefined();
    });
  });

  describe("Resolution Framework Guidance", () => {
    it("should use resolution frameworks to guide synthesis conclusion", () => {
      const results: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Use quantitative method",
          reasoning: ["Data-driven approach"],
          insights: [],
          confidence: 0.9,
          processingTime: 100,
        },
        {
          streamId: "creative-1",
          streamType: StreamType.CREATIVE,
          status: StreamStatus.COMPLETED,
          conclusion: "Use qualitative method",
          reasoning: ["Exploratory approach"],
          insights: [],
          confidence: 0.85,
          processingTime: 100,
        },
      ];

      const synthesis = synthesisEngine.synthesizeResults(results);

      // Conclusion should acknowledge conflicts
      expect(synthesis.conclusion).toContain("conflict");
    });

    it("should adjust quality assessment based on conflict severity", () => {
      // High severity conflicts
      const highConflictResults: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "System is completely safe",
          reasoning: ["Safety analysis"],
          insights: [],
          confidence: 0.95,
          processingTime: 100,
        },
        {
          streamId: "critical-1",
          streamType: StreamType.CRITICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "System is completely unsafe",
          reasoning: ["Risk assessment"],
          insights: [],
          confidence: 0.95,
          processingTime: 100,
        },
      ];

      const highConflictSynthesis = synthesisEngine.synthesizeResults(highConflictResults);

      // Low severity conflicts
      const lowConflictResults: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Approach A is slightly better",
          reasoning: ["Minor advantage"],
          insights: [],
          confidence: 0.6,
          processingTime: 100,
        },
        {
          streamId: "creative-1",
          streamType: StreamType.CREATIVE,
          status: StreamStatus.COMPLETED,
          conclusion: "Approach B is slightly better",
          reasoning: ["Minor advantage"],
          insights: [],
          confidence: 0.6,
          processingTime: 100,
        },
      ];

      const lowConflictSynthesis = synthesisEngine.synthesizeResults(lowConflictResults);

      // High conflict should have lower consistency score
      expect(highConflictSynthesis.quality.consistency).toBeLessThan(
        lowConflictSynthesis.quality.consistency
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle no conflicts gracefully", () => {
      const results: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Solution A is optimal",
          reasoning: ["Analysis complete"],
          insights: [],
          confidence: 0.9,
          processingTime: 100,
        },
        {
          streamId: "creative-1",
          streamType: StreamType.CREATIVE,
          status: StreamStatus.COMPLETED,
          conclusion: "Solution A is optimal",
          reasoning: ["Creative exploration"],
          insights: [],
          confidence: 0.85,
          processingTime: 100,
        },
      ];

      const synthesis = synthesisEngine.synthesizeResults(results);

      // Should have no conflicts
      expect(synthesis.conflicts).toHaveLength(0);
      // Should have high consistency
      expect(synthesis.quality.consistency).toBeGreaterThan(0.9);
    });

    it("should handle single stream result (no conflicts possible)", () => {
      const results: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Analysis complete",
          reasoning: ["Single stream"],
          insights: [],
          confidence: 0.9,
          processingTime: 100,
        },
      ];

      const synthesis = synthesisEngine.synthesizeResults(results);

      // Should have no conflicts
      expect(synthesis.conflicts).toHaveLength(0);
    });

    it("should handle empty results", () => {
      const results: StreamResult[] = [];

      const synthesis = synthesisEngine.synthesizeResults(results);

      // Should return empty synthesis
      expect(synthesis.conflicts).toHaveLength(0);
      expect(synthesis.conclusion).toContain("no streams");
    });
  });

  describe("Performance", () => {
    it("should complete conflict detection and synthesis within reasonable time", () => {
      const results: StreamResult[] = [
        {
          streamId: "analytical-1",
          streamType: StreamType.ANALYTICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Conclusion A",
          reasoning: ["Reason 1", "Reason 2"],
          insights: [
            {
              content: "Insight 1",
              source: StreamType.ANALYTICAL,
              confidence: 0.9,
              importance: 0.8,
            },
          ],
          confidence: 0.9,
          processingTime: 100,
        },
        {
          streamId: "creative-1",
          streamType: StreamType.CREATIVE,
          status: StreamStatus.COMPLETED,
          conclusion: "Conclusion B",
          reasoning: ["Reason 3", "Reason 4"],
          insights: [
            {
              content: "Insight 2",
              source: StreamType.CREATIVE,
              confidence: 0.85,
              importance: 0.7,
            },
          ],
          confidence: 0.85,
          processingTime: 100,
        },
        {
          streamId: "critical-1",
          streamType: StreamType.CRITICAL,
          status: StreamStatus.COMPLETED,
          conclusion: "Conclusion C",
          reasoning: ["Reason 5", "Reason 6"],
          insights: [
            {
              content: "Insight 3",
              source: StreamType.CRITICAL,
              confidence: 0.8,
              importance: 0.75,
            },
          ],
          confidence: 0.8,
          processingTime: 100,
        },
        {
          streamId: "synthetic-1",
          streamType: StreamType.SYNTHETIC,
          status: StreamStatus.COMPLETED,
          conclusion: "Conclusion D",
          reasoning: ["Reason 7", "Reason 8"],
          insights: [
            {
              content: "Insight 4",
              source: StreamType.SYNTHETIC,
              confidence: 0.88,
              importance: 0.82,
            },
          ],
          confidence: 0.88,
          processingTime: 100,
        },
      ];

      const startTime = performance.now();
      const synthesis = synthesisEngine.synthesizeResults(results);
      const endTime = performance.now();

      const totalTime = endTime - startTime;

      // Should complete within 100ms (target from requirements)
      expect(totalTime).toBeLessThan(100);
      expect(synthesis).toBeDefined();
    });
  });
});
