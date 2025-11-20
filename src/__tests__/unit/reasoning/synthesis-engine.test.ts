/**
 * Tests for ResultSynthesisEngine
 *
 * Following TDD methodology - these tests are written first and should fail
 * until the synthesis engine implementation is complete.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ResultSynthesisEngine } from "../../../reasoning/synthesis-engine";
import type {
  Insight,
  Recommendation,
  StreamResult,
  StreamStatus,
  StreamType,
  SynthesizedResult,
} from "../../../reasoning/types";

describe("ResultSynthesisEngine", () => {
  let engine: ResultSynthesisEngine;

  beforeEach(() => {
    engine = new ResultSynthesisEngine();
  });

  // Helper function to create mock stream results
  function createMockStreamResult(
    type: StreamType,
    conclusion: string,
    confidence: number = 0.8,
    status: StreamStatus = "completed" as StreamStatus
  ): StreamResult {
    return {
      streamId: `${type}-stream`,
      streamType: type,
      conclusion,
      reasoning: [`${type} reasoning step 1`, `${type} reasoning step 2`],
      insights: [
        {
          content: `${type} insight 1`,
          source: type,
          confidence: 0.8,
          importance: 0.7,
        },
        {
          content: `${type} insight 2`,
          source: type,
          confidence: 0.6,
          importance: 0.5,
        },
      ],
      confidence,
      processingTime: 100,
      status,
    };
  }

  describe("synthesizeResults", () => {
    it("should synthesize results from all 4 successful streams", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
        createMockStreamResult("creative" as StreamType, "Creative conclusion"),
        createMockStreamResult("critical" as StreamType, "Critical conclusion"),
        createMockStreamResult("synthetic" as StreamType, "Synthetic conclusion"),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis).toBeDefined();
      expect(synthesis.conclusion).toBeTruthy();
      expect(synthesis.insights).toBeInstanceOf(Array);
      expect(synthesis.recommendations).toBeInstanceOf(Array);
      expect(synthesis.conflicts).toBeInstanceOf(Array);
      expect(synthesis.confidence).toBeGreaterThan(0);
      expect(synthesis.confidence).toBeLessThanOrEqual(1);
      expect(synthesis.quality).toBeDefined();
      expect(synthesis.metadata.streamsUsed).toHaveLength(4);
      expect(synthesis.metadata.synthesisTime).toBeGreaterThan(0);
      expect(synthesis.metadata.timestamp).toBeInstanceOf(Date);
    });

    it("should synthesize results from 3 successful streams (1 failed)", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
        createMockStreamResult("creative" as StreamType, "Creative conclusion"),
        createMockStreamResult("critical" as StreamType, "Critical conclusion"),
        createMockStreamResult("synthetic" as StreamType, "", 0, "failed" as StreamStatus),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis).toBeDefined();
      expect(synthesis.metadata.streamsUsed).toHaveLength(3);
      expect(synthesis.conclusion).toBeTruthy();
    });

    it("should synthesize results from 2 successful streams (2 failed)", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
        createMockStreamResult("creative" as StreamType, "Creative conclusion"),
        createMockStreamResult("critical" as StreamType, "", 0, "failed" as StreamStatus),
        createMockStreamResult("synthetic" as StreamType, "", 0, "timeout" as StreamStatus),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis).toBeDefined();
      expect(synthesis.metadata.streamsUsed).toHaveLength(2);
      expect(synthesis.conclusion).toBeTruthy();
    });

    it("should synthesize results from 1 successful stream (3 failed)", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
        createMockStreamResult("creative" as StreamType, "", 0, "failed" as StreamStatus),
        createMockStreamResult("critical" as StreamType, "", 0, "failed" as StreamStatus),
        createMockStreamResult("synthetic" as StreamType, "", 0, "timeout" as StreamStatus),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis).toBeDefined();
      expect(synthesis.metadata.streamsUsed).toHaveLength(1);
      expect(synthesis.conclusion).toBeTruthy();
      expect(synthesis.quality.completeness).toBeLessThan(0.5); // Low completeness
    });

    it("should handle no successful streams gracefully", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "", 0, "failed" as StreamStatus),
        createMockStreamResult("creative" as StreamType, "", 0, "failed" as StreamStatus),
        createMockStreamResult("critical" as StreamType, "", 0, "timeout" as StreamStatus),
        createMockStreamResult("synthetic" as StreamType, "", 0, "timeout" as StreamStatus),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis).toBeDefined();
      expect(synthesis.metadata.streamsUsed).toHaveLength(0);
      expect(synthesis.conclusion).toBe("Unable to synthesize results: no successful streams");
      expect(synthesis.confidence).toBe(0);
      expect(synthesis.quality.overallScore).toBe(0);
    });

    it("should handle empty results array", () => {
      const results: StreamResult[] = [];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis).toBeDefined();
      expect(synthesis.conclusion).toBe("Unable to synthesize results: no streams provided");
      expect(synthesis.confidence).toBe(0);
    });
  });

  describe("attributeInsights", () => {
    it("should attribute insights to single source stream", () => {
      const insights: Insight[] = [
        {
          content: "Analytical insight",
          source: "analytical" as StreamType,
          confidence: 0.8,
          importance: 0.7,
        },
      ];

      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
      ];

      const attributed = engine.attributeInsights(insights, results);

      expect(attributed).toHaveLength(1);
      expect(attributed[0].sources).toContain("analytical");
      expect(attributed[0].content).toBe("Analytical insight");
      expect(attributed[0].confidence).toBe(0.8);
      expect(attributed[0].importance).toBe(0.7);
      expect(attributed[0].evidence).toBeInstanceOf(Array);
    });

    it("should attribute insights to multiple sources (convergent insights)", () => {
      const insights: Insight[] = [
        {
          content: "Common insight",
          source: "analytical" as StreamType,
          confidence: 0.8,
          importance: 0.7,
        },
        {
          content: "Common insight",
          source: "creative" as StreamType,
          confidence: 0.7,
          importance: 0.8,
        },
      ];

      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
        createMockStreamResult("creative" as StreamType, "Creative conclusion"),
      ];

      const attributed = engine.attributeInsights(insights, results);

      // Should merge similar insights
      const commonInsight = attributed.find((i) => i.content === "Common insight");
      expect(commonInsight).toBeDefined();
      expect(commonInsight!.sources.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter low-importance insights", () => {
      const insights: Insight[] = [
        {
          content: "High importance",
          source: "analytical" as StreamType,
          confidence: 0.8,
          importance: 0.8,
        },
        {
          content: "Low importance",
          source: "analytical" as StreamType,
          confidence: 0.8,
          importance: 0.2,
        },
      ];

      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
      ];

      const attributed = engine.attributeInsights(insights, results);

      // Should prioritize high-importance insights
      expect(attributed.length).toBeGreaterThan(0);
      expect(attributed[0].importance).toBeGreaterThan(0.5);
    });

    it("should rank insights by importance and confidence", () => {
      const insights: Insight[] = [
        {
          content: "Low priority",
          source: "analytical" as StreamType,
          confidence: 0.5,
          importance: 0.5,
        },
        {
          content: "High priority",
          source: "creative" as StreamType,
          confidence: 0.9,
          importance: 0.9,
        },
        {
          content: "Medium priority",
          source: "critical" as StreamType,
          confidence: 0.7,
          importance: 0.7,
        },
      ];

      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
        createMockStreamResult("creative" as StreamType, "Creative conclusion"),
        createMockStreamResult("critical" as StreamType, "Critical conclusion"),
      ];

      const attributed = engine.attributeInsights(insights, results);

      // Should be ranked by importance * confidence
      expect(attributed[0].content).toBe("High priority");
      expect(attributed[attributed.length - 1].content).toBe("Low priority");
    });

    it("should extract evidence from stream reasoning", () => {
      const insights: Insight[] = [
        {
          content: "Analytical insight",
          source: "analytical" as StreamType,
          confidence: 0.8,
          importance: 0.7,
        },
      ];

      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Analytical conclusion"),
      ];

      const attributed = engine.attributeInsights(insights, results);

      expect(attributed[0].evidence).toBeInstanceOf(Array);
      expect(attributed[0].evidence.length).toBeGreaterThan(0);
    });
  });

  describe("rankRecommendations", () => {
    it("should rank recommendations by priority score", () => {
      const recommendations: Recommendation[] = [
        {
          description: "Low priority",
          sources: ["analytical" as StreamType],
          priority: 0.3,
          confidence: 0.8,
          rationale: ["Reason 1"],
          concerns: [],
        },
        {
          description: "High priority",
          sources: ["creative" as StreamType],
          priority: 0.9,
          confidence: 0.8,
          rationale: ["Reason 2"],
          concerns: [],
        },
      ];

      const ranked = engine.rankRecommendations(recommendations);

      expect(ranked[0].description).toBe("High priority");
      expect(ranked[1].description).toBe("Low priority");
    });

    it("should rank by confidence when priorities are equal", () => {
      const recommendations: Recommendation[] = [
        {
          description: "Low confidence",
          sources: ["analytical" as StreamType],
          priority: 0.8,
          confidence: 0.5,
          rationale: ["Reason 1"],
          concerns: [],
        },
        {
          description: "High confidence",
          sources: ["creative" as StreamType],
          priority: 0.8,
          confidence: 0.9,
          rationale: ["Reason 2"],
          concerns: [],
        },
      ];

      const ranked = engine.rankRecommendations(recommendations);

      expect(ranked[0].description).toBe("High confidence");
      expect(ranked[1].description).toBe("Low confidence");
    });

    it("should combine recommendations from multiple streams", () => {
      const recommendations: Recommendation[] = [
        {
          description: "Common recommendation",
          sources: ["analytical" as StreamType],
          priority: 0.8,
          confidence: 0.8,
          rationale: ["Analytical rationale"],
          concerns: [],
        },
        {
          description: "Common recommendation",
          sources: ["creative" as StreamType],
          priority: 0.7,
          confidence: 0.9,
          rationale: ["Creative rationale"],
          concerns: [],
        },
      ];

      const ranked = engine.rankRecommendations(recommendations);

      // Should merge similar recommendations
      const common = ranked.find((r) => r.description === "Common recommendation");
      expect(common).toBeDefined();
      expect(common!.sources.length).toBeGreaterThanOrEqual(2);
      expect(common!.rationale.length).toBeGreaterThanOrEqual(2);
    });

    it("should identify conflicting recommendations", () => {
      const recommendations: Recommendation[] = [
        {
          description: "Approach A",
          sources: ["analytical" as StreamType],
          priority: 0.8,
          confidence: 0.8,
          rationale: ["Reason for A"],
          concerns: [],
        },
        {
          description: "Approach B (opposite of A)",
          sources: ["creative" as StreamType],
          priority: 0.8,
          confidence: 0.8,
          rationale: ["Reason for B"],
          concerns: ["Conflicts with A"],
        },
      ];

      const ranked = engine.rankRecommendations(recommendations);

      expect(ranked).toHaveLength(2);
      // Conflicting recommendations should be preserved
    });

    it("should extract rationale and concerns", () => {
      const recommendations: Recommendation[] = [
        {
          description: "Test recommendation",
          sources: ["analytical" as StreamType],
          priority: 0.8,
          confidence: 0.8,
          rationale: ["Rationale 1", "Rationale 2"],
          concerns: ["Concern 1", "Concern 2"],
        },
      ];

      const ranked = engine.rankRecommendations(recommendations);

      expect(ranked[0].rationale).toHaveLength(2);
      expect(ranked[0].concerns).toHaveLength(2);
    });
  });

  // Note: Conflict detection tests moved to synthesis-engine-integration.test.ts
  // Conflicts are now detected by ConflictResolutionEngine before synthesis

  describe("assessSynthesisQuality", () => {
    it("should assess overall quality score", () => {
      const synthesis: SynthesizedResult = {
        conclusion: "Test conclusion",
        insights: [],
        recommendations: [],
        conflicts: [],
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical", "creative", "critical", "synthetic"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      expect(quality.overallScore).toBeGreaterThan(0);
      expect(quality.overallScore).toBeLessThanOrEqual(1);
    });

    it("should assess coherence of synthesis", () => {
      const synthesis: SynthesizedResult = {
        conclusion: "Coherent conclusion based on all streams",
        insights: [
          {
            content: "Insight 1",
            sources: ["analytical" as StreamType],
            confidence: 0.8,
            importance: 0.7,
            evidence: ["Evidence 1"],
          },
        ],
        recommendations: [],
        conflicts: [],
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical", "creative"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      expect(quality.coherence).toBeGreaterThan(0);
      expect(quality.coherence).toBeLessThanOrEqual(1);
    });

    it("should assess completeness (coverage of all streams)", () => {
      const synthesis: SynthesizedResult = {
        conclusion: "Test conclusion",
        insights: [],
        recommendations: [],
        conflicts: [],
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical", "creative", "critical", "synthetic"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      expect(quality.completeness).toBe(1.0); // All 4 streams used
    });

    it("should assess consistency across streams", () => {
      const synthesis: SynthesizedResult = {
        conclusion: "Consistent conclusion",
        insights: [],
        recommendations: [],
        conflicts: [], // No conflicts = high consistency
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical", "creative"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      expect(quality.consistency).toBeGreaterThan(0.5); // High consistency with no conflicts
    });

    it("should assess insight quality", () => {
      const synthesis: SynthesizedResult = {
        conclusion: "Test conclusion",
        insights: [
          {
            content: "High quality insight",
            sources: ["analytical", "creative"] as StreamType[],
            confidence: 0.9,
            importance: 0.9,
            evidence: ["Evidence 1", "Evidence 2"],
          },
        ],
        recommendations: [],
        conflicts: [],
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical", "creative"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      expect(quality.insightQuality).toBeGreaterThan(0.5);
    });

    it("should assess recommendation quality", () => {
      const synthesis: SynthesizedResult = {
        conclusion: "Test conclusion",
        insights: [],
        recommendations: [
          {
            description: "High quality recommendation",
            sources: ["analytical", "creative"] as StreamType[],
            priority: 0.9,
            confidence: 0.9,
            rationale: ["Rationale 1", "Rationale 2"],
            concerns: [],
          },
        ],
        conflicts: [],
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical", "creative"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      expect(quality.recommendationQuality).toBeGreaterThan(0.5);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty conclusion in coherence assessment", () => {
      const synthesis: SynthesizedResult = {
        conclusion: "", // Empty conclusion
        insights: [
          {
            content: "Insight 1",
            sources: ["analytical" as StreamType],
            confidence: 0.8,
            importance: 0.7,
            evidence: ["Evidence 1"],
          },
        ],
        recommendations: [],
        conflicts: [],
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      expect(quality.coherence).toBe(0); // Empty conclusion should result in 0 coherence
    });

    it("should handle very long conclusion in coherence assessment", () => {
      const longConclusion = "a".repeat(200); // 200 characters
      const synthesis: SynthesizedResult = {
        conclusion: longConclusion,
        insights: [
          {
            content: "Insight 1",
            sources: ["analytical" as StreamType],
            confidence: 0.8,
            importance: 0.7,
            evidence: ["Evidence 1"],
          },
          {
            content: "Insight 2",
            sources: ["creative" as StreamType],
            confidence: 0.8,
            importance: 0.7,
            evidence: ["Evidence 2"],
          },
          {
            content: "Insight 3",
            sources: ["critical" as StreamType],
            confidence: 0.8,
            importance: 0.7,
            evidence: ["Evidence 3"],
          },
          {
            content: "Insight 4",
            sources: ["synthetic" as StreamType],
            confidence: 0.8,
            importance: 0.7,
            evidence: ["Evidence 4"],
          },
          {
            content: "Insight 5",
            sources: ["analytical" as StreamType],
            confidence: 0.8,
            importance: 0.7,
            evidence: ["Evidence 5"],
          },
        ],
        recommendations: [],
        conflicts: [],
        confidence: 0.8,
        quality: {
          overallScore: 0,
          coherence: 0,
          completeness: 0,
          consistency: 0,
          insightQuality: 0,
          recommendationQuality: 0,
        },
        metadata: {
          streamsUsed: ["analytical", "creative"] as StreamType[],
          synthesisTime: 100,
          timestamp: new Date(),
        },
      };

      const quality = engine.assessSynthesisQuality(synthesis);

      // Long conclusion with many insights should have high coherence
      expect(quality.coherence).toBeGreaterThan(0.8);
    });

    it("should handle identical conclusions (perfect convergence)", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Identical conclusion"),
        createMockStreamResult("creative" as StreamType, "Identical conclusion"),
        createMockStreamResult("critical" as StreamType, "Identical conclusion"),
        createMockStreamResult("synthetic" as StreamType, "Identical conclusion"),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis.conflicts).toHaveLength(0);
      expect(synthesis.quality.consistency).toBeGreaterThan(0.9);
    });

    it("should handle completely contradictory conclusions", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Prioritize security over usability"),
        createMockStreamResult("creative" as StreamType, "Prioritize usability over security"),
        createMockStreamResult("critical" as StreamType, "Prioritize performance over security"),
        createMockStreamResult("synthetic" as StreamType, "Prioritize cost over performance"),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis.conflicts.length).toBeGreaterThan(0);
      expect(synthesis.quality.consistency).toBeLessThan(0.5);
    });

    it("should handle missing insights", () => {
      const results: StreamResult[] = [
        {
          ...createMockStreamResult("analytical" as StreamType, "Conclusion"),
          insights: [],
        },
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis.insights).toBeInstanceOf(Array);
    });

    it("should handle missing recommendations", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Conclusion"),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis.recommendations).toBeInstanceOf(Array);
    });

    it("should handle very low confidence results", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Low confidence conclusion", 0.1),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis.confidence).toBeLessThan(0.5);
      expect(synthesis.quality.overallScore).toBeLessThan(0.5);
    });

    it("should handle timeout scenarios", () => {
      const results: StreamResult[] = [
        createMockStreamResult("analytical" as StreamType, "Conclusion"),
        createMockStreamResult("creative" as StreamType, "", 0, "timeout" as StreamStatus),
      ];

      const synthesis = engine.synthesizeResults(results);

      expect(synthesis.metadata.streamsUsed).toHaveLength(1);
    });
  });
});
