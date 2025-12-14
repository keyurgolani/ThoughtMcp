/**
 * Tests for Analytical Reasoning Stream
 *
 * Following TDD methodology - these tests define expected behavior
 * for the analytical reasoning stream before implementation.
 *
 * The analytical stream performs logical, systematic analysis with:
 * - Problem decomposition into sub-problems
 * - Systematic step-by-step analysis
 * - Evidence evaluation and validation
 * - Structured solution generation
 * - Progress tracking (0 → 1)
 * - Timeout management (10s default)
 * - Cancellation support
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReasoningStream } from "../../../../reasoning/stream";
import { type Problem } from "../../../../reasoning/types";

// Test problem factory
const createTestProblem = (
  complexity: "simple" | "moderate" | "complex" = "moderate"
): Problem => ({
  id: "test-problem-1",
  description: "Analyze the root causes of declining user engagement",
  context: "User engagement has dropped 30% over the last quarter",
  constraints: ["Limited budget", "Must maintain current features"],
  goals: ["Identify root causes", "Propose actionable solutions"],
  complexity,
  urgency: "high",
});

// TDD GREEN PHASE: Implementation complete, tests now active
import { AnalyticalReasoningStream } from "../../../../reasoning/streams/analytical-stream";

describe("AnalyticalReasoningStream", () => {
  let stream: ReasoningStream;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    // Create real stream instance
    stream = new AnalyticalReasoningStream();
  });

  describe("Stream Initialization", () => {
    it("should create stream with correct type", () => {
      // This will fail until AnalyticalReasoningStream is implemented
      expect(stream).toBeDefined();
      expect(stream.type).toBe("analytical");
      expect(stream.id).toContain("analytical");
    });

    it("should have default 10s timeout", () => {
      expect(stream).toBeDefined();
      expect(stream.timeout).toBe(10000);
    });

    it("should have processor defined", () => {
      expect(stream).toBeDefined();
      expect(stream.processor).toBeDefined();
      expect(stream.processor.getStreamType()).toBe("analytical");
    });

    it("should start with progress at 0", () => {
      expect(stream).toBeDefined();
      expect(stream.getProgress()).toBe(0);
    });
  });

  describe("Problem Decomposition", () => {
    it("should decompose complex problem into sub-problems", async () => {
      const complexProblem = createTestProblem("complex");

      const result = await stream.process(complexProblem);

      // Should identify multiple sub-
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(2);

      // Reasoning should show decomposition
      const decompositionStep = result.reasoning.find(
        (step) =>
          step.toLowerCase().includes("decompose") || step.toLowerCase().includes("break down")
      );
      expect(decompositionStep).toBeDefined();
    });

    it("should identify logical dependencies between sub-problems", async () => {
      const result = await stream.process(testProblem);

      // Should show logical flow in reasoning
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);

      // Should have structured analysis
      const hasStructure = result.reasoning.some(
        (step) => step.includes("first") || step.includes("then") || step.includes("therefore")
      );
      expect(hasStructure).toBe(true);
    });

    it("should handle simple problems without over-decomposition", async () => {
      const simpleProblem = createTestProblem("simple");

      const result = await stream.process(simpleProblem);

      // Simple problems should have fewer reasoning steps
      expect(result.reasoning.length).toBeLessThan(10);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe("Systematic Analysis", () => {
    it("should perform step-by-step logical analysis", async () => {
      const result = await stream.process(testProblem);

      // Should have multiple reasoning steps
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(3);

      // Each step should be logical and connected
      for (const step of result.reasoning) {
        expect(step).toBeTruthy();
        expect(typeof step).toBe("string");
        expect(step.length).toBeGreaterThan(10);
      }
    });

    it("should follow logical progression", async () => {
      const result = await stream.process(testProblem);

      // Reasoning should show progression
      expect(result.reasoning[0]).toBeDefined();
      expect(result.reasoning[result.reasoning.length - 1]).toBeDefined();

      // First step should be about understanding/analyzing
      const firstStep = result.reasoning[0].toLowerCase();
      expect(
        firstStep.includes("analyze") ||
          firstStep.includes("examine") ||
          firstStep.includes("consider") ||
          firstStep.includes("identify")
      ).toBe(true);
    });

    it("should consider problem constraints", async () => {
      const result = await stream.process(testProblem);

      // Should reference constraints in reasoning
      const mentionsConstraints = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("budget") ||
          step.toLowerCase().includes("constraint") ||
          step.toLowerCase().includes("limitation")
      );
      expect(mentionsConstraints).toBe(true);
    });

    it("should address problem goals", async () => {
      const result = await stream.process(testProblem);

      // Should reference goals in reasoning or conclusion
      const addressesGoals =
        result.reasoning.some(
          (step) =>
            step.toLowerCase().includes("root cause") || step.toLowerCase().includes("solution")
        ) ||
        result.conclusion.toLowerCase().includes("root cause") ||
        result.conclusion.toLowerCase().includes("solution");

      expect(addressesGoals).toBe(true);
    });
  });

  describe("Evidence Evaluation", () => {
    it("should evaluate available evidence", async () => {
      const problemWithEvidence: Problem = {
        ...testProblem,
        context:
          testProblem.context +
          ". Data shows: 40% drop in mobile users, 20% drop in desktop users.",
      };

      const result = await stream.process(problemWithEvidence);

      // Should reference evidence in reasoning
      const usesEvidence = result.reasoning.some(
        (step) =>
          step.includes("40%") ||
          step.includes("mobile") ||
          step.includes("data") ||
          step.toLowerCase().includes("evidence")
      );
      expect(usesEvidence).toBe(true);
    });

    it("should identify gaps in evidence", async () => {
      const vagueProb: Problem = {
        ...testProblem,
        context: "Something is wrong with user engagement",
      };

      const result = await stream.process(vagueProb);

      // Should note lack of specific data
      const notesGaps = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("need") ||
          step.toLowerCase().includes("require") ||
          step.toLowerCase().includes("missing") ||
          step.toLowerCase().includes("unclear")
      );
      expect(notesGaps).toBe(true);
    });

    it("should assess evidence quality", async () => {
      const result = await stream.process(testProblem);

      // Should show critical thinking about evidence
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Lower confidence when evidence is limited
      if (testProblem.context.length < 100) {
        expect(result.confidence).toBeLessThan(0.9);
      }
    });
  });

  describe("Solution Generation", () => {
    it("should generate structured conclusion", async () => {
      const result = await stream.process(testProblem);

      // Should have non-empty conclusion
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(20);
      expect(typeof result.conclusion).toBe("string");
    });

    it("should generate actionable insights", async () => {
      const result = await stream.process(testProblem);

      // Should have insights
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.insights.length).toBeGreaterThan(0);

      // Each insight should be well-formed
      for (const insight of result.insights) {
        expect(insight.content).toBeDefined();
        expect(insight.content.length).toBeGreaterThan(10);
        expect(insight.source).toBe("analytical");
        expect(insight.confidence).toBeGreaterThan(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
        expect(insight.importance).toBeGreaterThan(0);
        expect(insight.importance).toBeLessThanOrEqual(1);
      }
    });

    it("should provide logical justification", async () => {
      const result = await stream.process(testProblem);

      // Conclusion should be supported by reasoning
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.conclusion).toBeDefined();

      // Should show logical connection
      const hasJustification = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("because") ||
          step.toLowerCase().includes("therefore") ||
          step.toLowerCase().includes("thus") ||
          step.toLowerCase().includes("consequently")
      );
      expect(hasJustification).toBe(true);
    });
  });

  describe("Progress Tracking", () => {
    it("should track progress from 0 to 1", async () => {
      const progressValues: number[] = [];

      // Mock progress tracking
      const originalGetProgress = stream.getProgress.bind(stream);
      stream.getProgress = vi.fn(() => {
        const progress = originalGetProgress();
        progressValues.push(progress);
        return progress;
      });

      await stream.process(testProblem);

      // Progress should start at 0
      expect(stream.getProgress()).toBeGreaterThanOrEqual(0);
      expect(stream.getProgress()).toBeLessThanOrEqual(1);
    });

    it("should report progress during processing", async () => {
      // Start processing
      const processPromise = stream.process(testProblem);

      // Check progress during processing
      await new Promise((resolve) => setTimeout(resolve, 50));
      const midProgress = stream.getProgress();

      await processPromise;
      const finalProgress = stream.getProgress();

      // Progress should increase
      expect(finalProgress).toBeGreaterThanOrEqual(midProgress);
      expect(finalProgress).toBe(1);
    });

    it("should reach 1.0 on completion", async () => {
      await stream.process(testProblem);

      expect(stream.getProgress()).toBe(1);
    });
  });

  describe("Timeout Management", () => {
    it("should complete within 10s timeout", async () => {
      const startTime = Date.now();

      await stream.process(testProblem);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000);
    });

    it("should handle timeout gracefully", async () => {
      // Create problem that would take too long
      const complexProblem: Problem = {
        ...testProblem,
        complexity: "complex",
        description: "Extremely complex problem requiring extensive analysis",
      };

      // Create new stream with very short timeout for testing
      const shortTimeoutStream = new AnalyticalReasoningStream(100);

      const result = await shortTimeoutStream.process(complexProblem);

      // Should return partial result on timeout
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    }, 15000);

    it("should track processing time", async () => {
      const result = await stream.process(testProblem);

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(10000);
    });
  });

  describe("Cancellation Support", () => {
    it("should support cancellation", () => {
      expect(stream.cancel).toBeDefined();
      expect(typeof stream.cancel).toBe("function");
    });

    it("should stop processing when cancelled", async () => {
      // Start processing
      const processPromise = stream.process(testProblem);

      // Cancel immediately
      stream.cancel();

      const result = await processPromise;

      // Should return cancelled status
      expect(result.status).toBe("cancelled");
      expect(result.conclusion).toBe("");
    });

    it("should clean up resources on cancellation", async () => {
      const processPromise = stream.process(testProblem);

      stream.cancel();

      await processPromise;

      // Progress should be reset or at final state
      const progress = stream.getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid problem gracefully", async () => {
      const invalidProblem = {
        id: "",
        description: "",
        context: "",
      } as Problem;

      await expect(stream.process(invalidProblem)).rejects.toThrow();
    });

    it("should handle missing problem fields", async () => {
      const incompleteProblem = {
        id: "test",
        description: "Test problem",
        context: "",
      } as Problem;

      const result = await stream.process(incompleteProblem);

      // Should still produce result with lower confidence
      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.7);
    });

    it("should return error status on failure", async () => {
      // Simulate processing error
      const problematicProblem = null as unknown as Problem;

      try {
        await stream.process(problematicProblem);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should preserve error information", async () => {
      const invalidProblem = null as unknown as Problem;

      try {
        await stream.process(invalidProblem);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });
  });

  describe("Result Structure", () => {
    it("should return complete StreamResult", async () => {
      const result = await stream.process(testProblem);

      // Verify all required fields
      expect(result.streamId).toBeDefined();
      expect(result.streamType).toBe("analytical");
      expect(result.conclusion).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.processingTime).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it("should have valid confidence score", async () => {
      const result = await stream.process(testProblem);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should have completed status on success", async () => {
      const result = await stream.process(testProblem);

      expect(result.status).toBe("completed");
    });

    it("should include stream metadata", async () => {
      const result = await stream.process(testProblem);

      expect(result.streamId).toContain("analytical");
      expect(result.streamType).toBe("analytical");
    });
  });

  describe("Quality Metrics", () => {
    it("should produce high-quality analysis for well-defined problems", async () => {
      const wellDefinedProblem: Problem = {
        id: "test-2",
        description: "Reduce customer churn rate from 15% to 10%",
        context:
          "Current churn rate is 15%. Exit surveys show: 40% price concerns, 35% feature gaps, 25% support issues.",
        constraints: ["6-month timeline", "$100k budget"],
        goals: ["Reduce churn to 10%", "Improve customer satisfaction"],
        complexity: "moderate",
        urgency: "high",
      };

      const result = await stream.process(wellDefinedProblem);

      // Should have high confidence with good data
      expect(result.confidence).toBeGreaterThan(0.7);

      // Should have comprehensive reasoning
      expect(result.reasoning.length).toBeGreaterThan(5);

      // Should have multiple insights
      expect(result.insights.length).toBeGreaterThan(2);
    });

    it("should indicate uncertainty for ambiguous problems", async () => {
      const ambiguousProblem: Problem = {
        id: "test-3",
        description: "Something is wrong",
        context: "Users are unhappy",
        complexity: "complex",
        urgency: "low",
      };

      const result = await stream.process(ambiguousProblem);

      // Should have lower confidence with vague data
      expect(result.confidence).toBeLessThan(0.6);

      // Should note ambiguity in reasoning
      const notesAmbiguity = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("unclear") ||
          step.toLowerCase().includes("ambiguous") ||
          step.toLowerCase().includes("need more")
      );
      expect(notesAmbiguity).toBe(true);
    });

    it("should balance depth and speed", async () => {
      const startTime = Date.now();
      const result = await stream.process(testProblem);
      const duration = Date.now() - startTime;

      // Should complete reasonably fast
      expect(duration).toBeLessThan(5000);

      // But still provide quality analysis
      expect(result.reasoning.length).toBeGreaterThan(3);
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });
});
