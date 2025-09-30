/**
 * Tests for ParallelReasoningProcessor
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ParallelReasoningProcessor } from "../../cognitive/ParallelReasoningProcessor.js";
import { Problem } from "../../interfaces/systematic-thinking.js";
import { Context } from "../../types/core.js";

describe("ParallelReasoningProcessor", () => {
  let processor: ParallelReasoningProcessor;
  let testProblem: Problem;
  let testContext: Context;

  beforeEach(async () => {
    processor = new ParallelReasoningProcessor();

    testProblem = {
      description: "How can we optimize our software development process?",
      domain: "technology",
      complexity: 0.7,
      uncertainty: 0.5,
      constraints: ["time_constraint", "resource_constraint"],
      stakeholders: ["developers", "management"],
      time_sensitivity: 0.6,
      resource_requirements: ["human_resources", "technical_resources"],
    };

    testContext = {
      session_id: "test_session",
      domain: "technology",
      urgency: 0.6,
      complexity: 0.7,
    };
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      await processor.initialize();
      expect(processor).toBeDefined();
    });

    it("should handle multiple initializations gracefully", async () => {
      await processor.initialize();
      await processor.initialize(); // Should not throw
      expect(processor).toBeDefined();
    });
  });

  describe("stream initialization", () => {
    it("should initialize all stream types", async () => {
      await processor.initialize();
      const streams = await processor.initializeStreams(testProblem);

      expect(streams).toHaveLength(4); // analytical, creative, critical, synthetic

      const streamTypes = streams.map((s) => s.type);
      expect(streamTypes).toContain("analytical");
      expect(streamTypes).toContain("creative");
      expect(streamTypes).toContain("critical");
      expect(streamTypes).toContain("synthetic");
    });

    it("should return active streams only", async () => {
      await processor.initialize();
      const streams = await processor.initializeStreams(testProblem);

      for (const stream of streams) {
        const status = stream.getStatus();
        expect(status.active).toBe(true);
      }
    });
  });

  describe("parallel processing", () => {
    it("should process problem through all streams", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      expect(result).toBeDefined();
      expect(result.problem).toEqual(testProblem);
      expect(result.stream_results).toHaveLength(4);
      expect(result.processing_time_ms).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should include results from all stream types", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      const streamTypes = result.stream_results.map((r) => r.stream_type);
      expect(streamTypes).toContain("analytical");
      expect(streamTypes).toContain("creative");
      expect(streamTypes).toContain("critical");
      expect(streamTypes).toContain("synthetic");
    });

    it("should provide coordination information", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      expect(result.coordination).toBeDefined();
      expect(result.coordination.synchronization_points).toBeDefined();
      expect(result.coordination.conflict_resolutions).toBeDefined();
      expect(result.coordination.consensus_building).toBeDefined();
      expect(result.coordination.information_sharing).toBeDefined();
    });

    it("should generate synthesized conclusion", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      expect(result.synthesized_conclusion).toBeDefined();
      expect(typeof result.synthesized_conclusion).toBe("string");
      expect(result.synthesized_conclusion.length).toBeGreaterThan(0);
    });

    it("should provide insights and recommendations", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should create alternative perspectives", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      expect(result.alternative_perspectives).toBeDefined();
      expect(Array.isArray(result.alternative_perspectives)).toBe(true);
      expect(result.alternative_perspectives.length).toBe(4); // One per stream
    });
  });

  describe("conflict detection", () => {
    it("should detect conflicts between stream results", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      const conflicts = processor.detectConflicts(result.stream_results);
      expect(Array.isArray(conflicts)).toBe(true);

      // Conflicts may or may not exist depending on the specific results
      for (const conflict of conflicts) {
        expect(conflict.stream_ids).toBeDefined();
        expect(conflict.conflict_type).toBeDefined();
        expect(conflict.description).toBeDefined();
        expect(conflict.severity).toBeGreaterThanOrEqual(0);
        expect(conflict.severity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("consensus building", () => {
    it("should build consensus from stream results", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      const consensus = await processor.buildConsensus(result.stream_results);

      expect(consensus.participating_streams).toBeDefined();
      expect(consensus.consensus_points).toBeDefined();
      expect(consensus.disagreement_points).toBeDefined();
      expect(consensus.final_consensus).toBeDefined();
      expect(consensus.consensus_confidence).toBeGreaterThanOrEqual(0);
      expect(consensus.consensus_confidence).toBeLessThanOrEqual(1);
    });

    it("should include all streams in consensus building", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      const consensus = await processor.buildConsensus(result.stream_results);

      expect(consensus.participating_streams).toHaveLength(4);
      expect(consensus.participating_streams).toContain(
        result.stream_results.find((r) => r.stream_type === "analytical")
          ?.stream_id
      );
    });
  });

  describe("error handling", () => {
    it("should handle stream processing errors gracefully", async () => {
      // This test would require mocking stream failures
      // For now, we test that the processor doesn't crash with valid input
      const result = await processor.processParallel(testProblem, testContext);
      expect(result).toBeDefined();
    });

    it("should reset streams successfully", () => {
      expect(() => processor.reset()).not.toThrow();
    });
  });

  describe("stream coordination", () => {
    it("should coordinate streams effectively", async () => {
      await processor.initialize();
      const streams = await processor.initializeStreams(testProblem);

      const coordination = await processor.coordinateStreams(
        streams,
        testProblem
      );

      expect(coordination.synchronization_points).toBeDefined();
      expect(coordination.synchronization_points.length).toBeGreaterThan(0);
      expect(coordination.information_sharing).toBeDefined();
    });

    it("should synchronize streams at regular intervals", async () => {
      await processor.initialize();
      const streams = await processor.initializeStreams(testProblem);

      const syncPoints = await processor.synchronizeStreams(streams);

      expect(Array.isArray(syncPoints)).toBe(true);
      expect(syncPoints.length).toBeGreaterThan(0);

      for (const point of syncPoints) {
        expect(point.timestamp).toBeDefined();
        expect(point.participating_streams).toBeDefined();
        expect(point.shared_insights).toBeDefined();
        expect(point.coordination_type).toBeDefined();
      }
    });
  });

  describe("performance characteristics", () => {
    it("should complete processing within reasonable time", async () => {
      const startTime = Date.now();
      const result = await processor.processParallel(testProblem, testContext);
      const endTime = Date.now();

      const actualTime = endTime - startTime;

      expect(actualTime).toBeLessThan(10000); // Should complete within 10 seconds
      // The processing time should be defined and non-negative
      // The processing time should be defined and be a valid number
      expect(result.processing_time_ms).toBeDefined();
      expect(typeof result.processing_time_ms).toBe("number");
      expect(Number.isFinite(result.processing_time_ms)).toBe(true);

      // Processing time should be non-negative and reasonable
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.processing_time_ms).toBeLessThanOrEqual(actualTime + 100); // Allow small margin
    });

    it("should provide reasonable confidence scores", async () => {
      const result = await processor.processParallel(testProblem, testContext);

      expect(result.confidence).toBeGreaterThan(0.1); // Should have some confidence
      expect(result.confidence).toBeLessThanOrEqual(1.0); // Should not exceed maximum

      // Individual stream results should also have reasonable confidence
      for (const streamResult of result.stream_results) {
        expect(streamResult.confidence).toBeGreaterThanOrEqual(0);
        expect(streamResult.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("different problem types", () => {
    it("should handle simple problems", async () => {
      const simpleProblem: Problem = {
        description: "What is 2 + 2?",
        domain: "mathematics",
        complexity: 0.1,
        uncertainty: 0.1,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.2,
        resource_requirements: [],
      };

      const result = await processor.processParallel(
        simpleProblem,
        testContext
      );
      expect(result).toBeDefined();
      expect(result.stream_results).toHaveLength(4);
    });

    it("should handle complex problems", async () => {
      const complexProblem: Problem = {
        description:
          "Design a scalable microservices architecture for a global e-commerce platform with real-time inventory management, multi-currency support, and AI-powered recommendations",
        domain: "technology",
        complexity: 0.95,
        uncertainty: 0.8,
        constraints: [
          "time_constraint",
          "budget_constraint",
          "technical_constraint",
        ],
        stakeholders: [
          "developers",
          "architects",
          "product_managers",
          "customers",
        ],
        time_sensitivity: 0.9,
        resource_requirements: [
          "human_resources",
          "technical_resources",
          "financial_resources",
        ],
      };

      const result = await processor.processParallel(
        complexProblem,
        testContext
      );
      expect(result).toBeDefined();
      expect(result.stream_results).toHaveLength(4);
      expect(result.confidence).toBeGreaterThan(0); // Should still provide some confidence
    });
  });
});
