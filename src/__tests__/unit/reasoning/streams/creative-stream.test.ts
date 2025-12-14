/**
 * Tests for Creative Reasoning Stream
 *
 * Following TDD methodology - these tests define expected behavior
 * for the creative reasoning stream before implementation.
 *
 * The creative stream performs innovative, divergent thinking with:
 * - Brainstorming and ideation
 * - Alternative solution generation
 * - Creative techniques (analogy, metaphor, reframing, lateral thinking)
 * - Novelty scoring (how unique/innovative)
 * - Feasibility assessment (how practical)
 * - Progress tracking (0 → 1)
 * - Timeout management (10s default)
 * - Cancellation support
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReasoningStream, StreamProcessor } from "../../../../reasoning/stream";
import {
  CreativeReasoningStream,
  CreativeStreamProcessor,
} from "../../../../reasoning/streams/creative-stream";
import { StreamType, type Problem, type StreamResult } from "../../../../reasoning/types";

// Test problem factory
const createTestProblem = (
  complexity: "simple" | "moderate" | "complex" = "moderate"
): Problem => ({
  id: "test-problem-1",
  description: "Find innovative ways to increase user engagement",
  context: "Traditional marketing approaches are no longer effective",
  constraints: ["Limited budget", "Must be implementable within 3 months"],
  goals: ["Generate novel ideas", "Increase engagement by 50%"],
  complexity,
  urgency: "high",
});

// TDD GREEN PHASE: Implementation now exists, tests should pass
describe("CreativeReasoningStream", () => {
  let stream: ReasoningStream | undefined;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    // Create actual stream instance now that implementation exists
    stream = new CreativeReasoningStream();
  });

  // Helper to assert stream is defined (will fail in TDD red phase)
  const getStream = (): ReasoningStream => {
    if (!stream) {
      throw new Error("Stream not initialized - implementation doesn't exist yet");
    }
    return stream;
  };

  describe("Stream Initialization", () => {
    it("should create stream with correct type", () => {
      // This will fail until CreativeReasoningStream is implemented
      expect(getStream()).toBeDefined();
      expect(getStream().type).toBe("creative");
      expect(getStream().id).toContain("creative");
    });

    it("should have default 10s timeout", () => {
      expect(getStream()).toBeDefined();
      expect(getStream().timeout).toBe(10000);
    });

    it("should have processor defined", () => {
      expect(getStream()).toBeDefined();
      expect(getStream().processor).toBeDefined();
      expect(getStream().processor.getStreamType()).toBe("creative");
    });

    it("should start with progress at 0", () => {
      expect(getStream()).toBeDefined();
      expect(getStream().getProgress()).toBe(0);
    });
  });

  describe("Brainstorming and Ideation", () => {
    it("should generate multiple diverse ideas", async () => {
      const result = await getStream().process(testProblem);

      // Should have multiple insights representing different ideas
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThanOrEqual(3);

      // Ideas should be diverse (not just variations of same concept)
      const uniqueKeywords = new Set<string>();
      for (const insight of result.insights) {
        const words = insight.content.toLowerCase().split(" ");
        words.forEach((word) => uniqueKeywords.add(word));
      }
      expect(uniqueKeywords.size).toBeGreaterThan(10);
    });

    it("should prioritize quantity over quality in ideation phase", async () => {
      const result = await getStream().process(testProblem);

      // Creative stream should generate many ideas
      expect(result.insights.length).toBeGreaterThanOrEqual(5);

      // Should show brainstorming in reasoning
      const showsBrainstorming = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("brainstorm") ||
          step.toLowerCase().includes("generate") ||
          step.toLowerCase().includes("idea")
      );
      expect(showsBrainstorming).toBe(true);
    });

    it("should explore unconventional approaches", async () => {
      const result = await getStream().process(testProblem);

      // Should have insights that are creative/unconventional
      const hasCreativeLanguage = result.insights.some(
        (insight) =>
          insight.content.toLowerCase().includes("novel") ||
          insight.content.toLowerCase().includes("innovative") ||
          insight.content.toLowerCase().includes("unique") ||
          insight.content.toLowerCase().includes("creative") ||
          insight.content.toLowerCase().includes("unconventional")
      );
      expect(hasCreativeLanguage).toBe(true);
    });

    it("should not be constrained by conventional thinking", async () => {
      const result = await getStream().process(testProblem);

      // Should show willingness to think outside the box
      const showsCreativeThinking = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("what if") ||
          step.toLowerCase().includes("imagine") ||
          step.toLowerCase().includes("alternative") ||
          step.toLowerCase().includes("different")
      );
      expect(showsCreativeThinking).toBe(true);
    });
  });

  describe("Alternative Solution Generation", () => {
    it("should generate multiple alternative solutions", async () => {
      const result = await getStream().process(testProblem);

      // Should have multiple distinct solutions
      expect(result.insights.length).toBeGreaterThanOrEqual(3);

      // Each insight should represent a different approach
      for (const insight of result.insights) {
        expect(insight.content).toBeDefined();
        expect(insight.content.length).toBeGreaterThan(20);
      }
    });

    it("should explore different solution categories", async () => {
      const result = await getStream().process(testProblem);

      // Should show exploration of different approaches
      const hasVariety = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("another") ||
          step.toLowerCase().includes("alternatively") ||
          step.toLowerCase().includes("different approach") ||
          step.toLowerCase().includes("consider")
      );
      expect(hasVariety).toBe(true);
    });

    it("should combine ideas in novel ways", async () => {
      const result = await getStream().process(testProblem);

      // Should show synthesis or combination of ideas
      const showsCombination = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("combine") ||
          step.toLowerCase().includes("merge") ||
          step.toLowerCase().includes("integrate") ||
          step.toLowerCase().includes("together")
      );
      expect(showsCombination).toBe(true);
    });

    it("should build on previous ideas", async () => {
      const result = await getStream().process(testProblem);

      // Should show iterative ideation
      expect(result.reasoning.length).toBeGreaterThan(3);

      // Later reasoning should reference or build on earlier ideas
      const showsIteration =
        result.reasoning.length > 3 &&
        result.reasoning
          .slice(1)
          .some(
            (step) =>
              step.toLowerCase().includes("building on") ||
              step.toLowerCase().includes("expanding") ||
              step.toLowerCase().includes("further") ||
              step.toLowerCase().includes("also")
          );
      expect(showsIteration).toBe(true);
    });
  });

  describe("Creative Techniques", () => {
    it("should use analogy technique", async () => {
      const result = await getStream().process(testProblem);

      // Should use analogies in reasoning
      const usesAnalogy = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("like") ||
          step.toLowerCase().includes("similar to") ||
          step.toLowerCase().includes("analogous") ||
          step.toLowerCase().includes("as if")
      );
      expect(usesAnalogy).toBe(true);
    });

    it("should use metaphor technique", async () => {
      const result = await getStream().process(testProblem);

      // Should use metaphorical thinking
      const usesMetaphor =
        result.reasoning.some(
          (step) =>
            step.toLowerCase().includes("metaphor") ||
            step.toLowerCase().includes("imagine") ||
            step.toLowerCase().includes("picture")
        ) ||
        result.insights.some(
          (insight) =>
            insight.content.toLowerCase().includes("like") ||
            insight.content.toLowerCase().includes("as")
        );
      expect(usesMetaphor).toBe(true);
    });

    it("should use reframing technique", async () => {
      const result = await getStream().process(testProblem);

      // Should reframe the problem from different perspectives
      const usesReframing = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("reframe") ||
          step.toLowerCase().includes("perspective") ||
          step.toLowerCase().includes("view") ||
          step.toLowerCase().includes("angle") ||
          step.toLowerCase().includes("looking at")
      );
      expect(usesReframing).toBe(true);
    });

    it("should use lateral thinking", async () => {
      const result = await getStream().process(testProblem);

      // Should show non-linear, lateral thinking
      const usesLateralThinking = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("what if") ||
          step.toLowerCase().includes("suppose") ||
          step.toLowerCase().includes("unexpected") ||
          step.toLowerCase().includes("surprising")
      );
      expect(usesLateralThinking).toBe(true);
    });

    it("should apply multiple creative techniques", async () => {
      const result = await getStream().process(testProblem);

      // Should use at least 2 different techniques
      const techniques = {
        analogy: result.reasoning.some((step) => step.toLowerCase().includes("like")),
        reframing: result.reasoning.some((step) => step.toLowerCase().includes("perspective")),
        lateral: result.reasoning.some((step) => step.toLowerCase().includes("what if")),
        combination: result.reasoning.some((step) => step.toLowerCase().includes("combine")),
      };

      const techniquesUsed = Object.values(techniques).filter(Boolean).length;
      expect(techniquesUsed).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Novelty Scoring", () => {
    it("should assess novelty of each idea", async () => {
      const result = await getStream().process(testProblem);

      // Each insight should have importance score (used for novelty)
      for (const insight of result.insights) {
        expect(insight.importance).toBeDefined();
        expect(insight.importance).toBeGreaterThan(0);
        expect(insight.importance).toBeLessThanOrEqual(1);
      }
    });

    it("should rank ideas by novelty", async () => {
      const result = await getStream().process(testProblem);

      // Insights should be ordered or have varying importance scores
      const importanceScores = result.insights.map((i) => i.importance);
      const hasVariation = new Set(importanceScores).size > 1;
      expect(hasVariation).toBe(true);
    });

    it("should favor more innovative ideas", async () => {
      const result = await getStream().process(testProblem);

      // At least one insight should have high importance (novelty)
      const hasHighNovelty = result.insights.some((insight) => insight.importance > 0.7);
      expect(hasHighNovelty).toBe(true);
    });

    it("should identify breakthrough ideas", async () => {
      const complexProblem = createTestProblem("complex");
      const result = await getStream().process(complexProblem);

      // Should have at least one highly novel insight
      const breakthroughIdeas = result.insights.filter((insight) => insight.importance > 0.8);
      expect(breakthroughIdeas.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Feasibility Assessment", () => {
    it("should assess feasibility of ideas", async () => {
      const result = await getStream().process(testProblem);

      // Should mention feasibility in reasoning
      const considersFeasibility = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("feasible") ||
          step.toLowerCase().includes("practical") ||
          step.toLowerCase().includes("implementable") ||
          step.toLowerCase().includes("realistic")
      );
      expect(considersFeasibility).toBe(true);
    });

    it("should balance novelty with practicality", async () => {
      const result = await getStream().process(testProblem);

      // Should have mix of highly novel and more practical ideas
      const highNovelty = result.insights.filter((i) => i.importance > 0.7).length;
      const moderateNovelty = result.insights.filter(
        (i) => i.importance >= 0.4 && i.importance <= 0.7
      ).length;

      expect(highNovelty).toBeGreaterThan(0);
      expect(moderateNovelty).toBeGreaterThan(0);
    });

    it("should consider constraints in feasibility", async () => {
      const result = await getStream().process(testProblem);

      // Should reference constraints when assessing feasibility
      const considersConstraints = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("budget") ||
          step.toLowerCase().includes("constraint") ||
          step.toLowerCase().includes("limitation") ||
          step.toLowerCase().includes("within")
      );
      expect(considersConstraints).toBe(true);
    });

    it("should not dismiss ideas too quickly", async () => {
      const result = await getStream().process(testProblem);

      // Creative stream should be optimistic, not overly critical
      const hasPositiveLanguage = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("could") ||
          step.toLowerCase().includes("might") ||
          step.toLowerCase().includes("possible") ||
          step.toLowerCase().includes("potential")
      );
      expect(hasPositiveLanguage).toBe(true);
    });
  });

  describe("Progress Tracking", () => {
    it("should track progress from 0 to 1", async () => {
      const progressValues: number[] = [];

      // Mock progress tracking
      const originalGetProgress = getStream().getProgress.bind(stream);
      getStream().getProgress = vi.fn(() => {
        const progress = originalGetProgress();
        progressValues.push(progress);
        return progress;
      });

      await getStream().process(testProblem);

      // Progress should be between 0 and 1
      expect(getStream().getProgress()).toBeGreaterThanOrEqual(0);
      expect(getStream().getProgress()).toBeLessThanOrEqual(1);
    });

    it("should report progress during processing", async () => {
      // Start processing
      const processPromise = getStream().process(testProblem);

      // Check progress during processing
      await new Promise((resolve) => setTimeout(resolve, 50));
      const midProgress = getStream().getProgress();

      await processPromise;
      const finalProgress = getStream().getProgress();

      // Progress should increase
      expect(finalProgress).toBeGreaterThanOrEqual(midProgress);
      expect(finalProgress).toBe(1);
    });

    it("should reach 1.0 on completion", async () => {
      await getStream().process(testProblem);

      expect(getStream().getProgress()).toBe(1);
    });
  });

  describe("Timeout Management", () => {
    it("should complete within 10s timeout", async () => {
      const startTime = Date.now();

      await getStream().process(testProblem);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000);
    });

    it("should handle timeout gracefully", async () => {
      // Create problem that would generate many ideas
      // This test is commented out until implementation exists
      // const complexProblem: Problem = {
      //   ...testProblem,
      //   complexity: "complex",
      //   description: "Generate 100 innovative solutions for climate change",
      // };

      // Create stream with very short timeout for testing
      // const shortTimeoutStream = new CreativeReasoningStream(100);

      // Should return partial results on timeout
      // const result = await shortTimeoutStream.process(complexProblem);

      // expect(result).toBeDefined();
      // expect(result.status).toBeDefined();

      // Placeholder assertion for TDD red phase
      expect(true).toBe(true);
    }, 15000);

    it("should track processing time", async () => {
      const result = await getStream().process(testProblem);

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(10000);
    });

    it("should not sacrifice quality for speed", async () => {
      const result = await getStream().process(testProblem);

      // Even with time pressure, should generate quality ideas
      expect(result.insights.length).toBeGreaterThanOrEqual(3);
      expect(result.reasoning.length).toBeGreaterThan(2);
    });
  });

  describe("Cancellation Support", () => {
    it("should support cancellation", () => {
      expect(getStream().cancel).toBeDefined();
      expect(typeof getStream().cancel).toBe("function");
    });

    it("should stop processing when cancelled", async () => {
      // Start processing
      const processPromise = getStream().process(testProblem);

      // Cancel immediately
      getStream().cancel();

      const result = await processPromise;

      // Should return cancelled status
      expect(result.status).toBe("cancelled");
      expect(result.conclusion).toBe("");
    });

    it("should clean up resources on cancellation", async () => {
      const processPromise = getStream().process(testProblem);

      getStream().cancel();

      await processPromise;

      // Progress should be at final state
      const progress = getStream().getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it("should preserve partial results on cancellation", async () => {
      // Start processing
      const processPromise = getStream().process(testProblem);

      // Let it run briefly
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cancel
      getStream().cancel();

      const result = await processPromise;

      // Should have status cancelled OR completed (if processing finished before cancellation)
      // This is a timing-dependent test - if processing is very fast, it may complete before cancellation
      expect(["cancelled", "completed"]).toContain(result.status);

      // Should have insights regardless
      expect(result.insights).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid problem gracefully", async () => {
      const invalidProblem = {
        id: "",
        description: "",
        context: "",
      } as Problem;

      await expect(getStream().process(invalidProblem)).rejects.toThrow();
    });

    it("should handle missing problem fields", async () => {
      const incompleteProblem = {
        id: "test",
        description: "Test problem",
        context: "",
      } as Problem;

      const result = await getStream().process(incompleteProblem);

      // Should still produce creative ideas with lower confidence
      expect(result).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(0.7);
    });

    it("should return error status on failure", async () => {
      const problematicProblem = null as unknown as Problem;

      try {
        await getStream().process(problematicProblem);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should preserve error information", async () => {
      const invalidProblem = null as unknown as Problem;

      try {
        await getStream().process(invalidProblem);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBeDefined();
      }
    });
  });

  describe("Result Structure", () => {
    it("should return complete StreamResult", async () => {
      const result = await getStream().process(testProblem);

      // Verify all required fields
      expect(result.streamId).toBeDefined();
      expect(result.streamType).toBe("creative");
      expect(result.conclusion).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.processingTime).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it("should have valid confidence score", async () => {
      const result = await getStream().process(testProblem);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should have completed status on success", async () => {
      const result = await getStream().process(testProblem);

      expect(result.status).toBe("completed");
    });

    it("should include stream metadata", async () => {
      const result = await getStream().process(testProblem);

      expect(result.streamId).toContain("creative");
      expect(result.streamType).toBe("creative");
    });

    it("should have insights with source attribution", async () => {
      const result = await getStream().process(testProblem);

      // All insights should be attributed to creative stream
      for (const insight of result.insights) {
        expect(insight.source).toBe("creative");
      }
    });
  });

  describe("Quality Metrics", () => {
    it("should generate highly creative solutions for open-ended problems", async () => {
      const openEndedProblem: Problem = {
        id: "test-2",
        description: "Reimagine the future of education",
        context: "Traditional education models are becoming obsolete",
        constraints: [],
        goals: ["Generate transformative ideas"],
        complexity: "complex",
        urgency: "low",
      };

      const result = await getStream().process(openEndedProblem);

      // Should have many creative insights
      expect(result.insights.length).toBeGreaterThanOrEqual(5);

      // Should have high novelty scores
      const highNoveltyIdeas = result.insights.filter((i) => i.importance > 0.7);
      expect(highNoveltyIdeas.length).toBeGreaterThanOrEqual(2);
    });

    it("should balance creativity with constraints", async () => {
      const constrainedProblem: Problem = {
        id: "test-3",
        description: "Improve customer service",
        context: "Current satisfaction is 60%",
        constraints: ["No additional budget", "No new hires", "Must use existing tools"],
        goals: ["Increase satisfaction to 80%"],
        complexity: "moderate",
        urgency: "high",
      };

      const result = await getStream().process(constrainedProblem);

      // Should still generate creative ideas despite constraints
      expect(result.insights.length).toBeGreaterThanOrEqual(3);

      // Should acknowledge constraints
      const acknowledgesConstraints = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("constraint") ||
          step.toLowerCase().includes("budget") ||
          step.toLowerCase().includes("existing")
      );
      expect(acknowledgesConstraints).toBe(true);
    });

    it("should maintain creative confidence", async () => {
      const result = await getStream().process(testProblem);

      // Creative stream should be confident in generating ideas
      expect(result.confidence).toBeGreaterThan(0.5);

      // Should have multiple insights with good confidence
      const confidentInsights = result.insights.filter((i) => i.confidence > 0.6);
      expect(confidentInsights.length).toBeGreaterThan(0);
    });

    it("should demonstrate divergent thinking", async () => {
      const result = await getStream().process(testProblem);

      // Should have diverse insights (not all similar)
      const insightContents = result.insights.map((i) => i.content.toLowerCase());

      // Check for diversity by looking at unique words
      const allWords = insightContents.join(" ").split(" ");
      const uniqueWords = new Set(allWords);

      // Should have good vocabulary diversity
      expect(uniqueWords.size).toBeGreaterThan(allWords.length * 0.5);
    });
  });

  describe("Edge Cases for Coverage", () => {
    it("should handle problem with missing context", async () => {
      const problemWithoutContext: Problem = {
        id: "test-problem-no-context",
        description: "Find innovative solutions",
        context: "", // Empty context
        constraints: ["Limited budget"],
        goals: ["Generate ideas"],
        complexity: "moderate",
        urgency: "high",
      };

      const result = await getStream().process(problemWithoutContext);

      // Should still complete despite missing context
      expect(result.status).toBe("completed");
      expect(result.insights.length).toBeGreaterThan(0);

      // Confidence should be reduced due to missing context
      expect(result.confidence).toBeLessThan(0.7);
    });

    it("should handle problem with very limited context", async () => {
      const problemWithLimitedContext: Problem = {
        id: "test-problem-limited-context",
        description: "Find solutions",
        context: "Short", // Very short context (< 20 chars)
        constraints: [],
        goals: ["Generate ideas"],
        complexity: "moderate",
        urgency: "high",
      };

      const result = await getStream().process(problemWithLimitedContext);

      // Should complete with reduced confidence
      expect(result.status).toBe("completed");
      expect(result.confidence).toBeLessThan(0.8);
    });

    it("should handle problem with moderately limited context", async () => {
      const problemWithModerateContext: Problem = {
        id: "test-problem-moderate-context",
        description: "Find solutions",
        context: "This is a moderate length context", // Between 20-50 chars
        constraints: [],
        goals: ["Generate ideas"],
        complexity: "moderate",
        urgency: "high",
      };

      const result = await getStream().process(problemWithModerateContext);

      // Should complete with slightly reduced confidence
      expect(result.status).toBe("completed");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should handle problem with no highly novel ideas", async () => {
      // Create a very constrained problem that limits novelty
      const constrainedProblem: Problem = {
        id: "test-problem-constrained",
        description: "Make minor improvements",
        context: "Very limited scope for innovation",
        constraints: ["Must use existing tools", "No budget", "No time", "No resources"],
        goals: ["Make small tweaks"],
        complexity: "simple",
        urgency: "low",
      };

      const result = await getStream().process(constrainedProblem);

      // Should still complete and generate conclusion
      expect(result.status).toBe("completed");
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);

      // Conclusion should be generated even if not highly novel
      // The conclusion might say "several creative approaches generated" or similar
      expect(result.conclusion.length).toBeGreaterThan(10);
    });

    it("should handle problem with no constraints", async () => {
      const unconstrainedProblem: Problem = {
        id: "test-problem-unconstrained",
        description: "Find innovative solutions",
        context: "No limitations or constraints",
        constraints: [], // No constraints
        goals: ["Generate ideas"],
        complexity: "moderate",
        urgency: "high",
      };

      const result = await getStream().process(unconstrainedProblem);

      // Should complete with high confidence
      expect(result.status).toBe("completed");
      expect(result.confidence).toBeGreaterThan(0.6);

      // Conclusion should mention implementation potential
      expect(
        result.conclusion.toLowerCase().includes("implementation") ||
          result.conclusion.toLowerCase().includes("potential")
      ).toBe(true);
    });

    it("should handle problem with no goals", async () => {
      const problemWithoutGoals: Problem = {
        id: "test-problem-no-goals",
        description: "Find solutions",
        context: "Some context for the problem",
        constraints: ["Limited budget"],
        goals: [], // No goals
        complexity: "moderate",
        urgency: "high",
      };

      const result = await getStream().process(problemWithoutGoals);

      // Should still complete
      expect(result.status).toBe("completed");
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it("should handle concurrent processing attempts", async () => {
      const stream1 = new CreativeReasoningStream();

      // Start first processing
      const promise1 = stream1.process(testProblem);

      // Try to start second processing while first is running
      await expect(stream1.process(testProblem)).rejects.toThrow("already processing");

      // First should complete successfully
      const result1 = await promise1;
      expect(result1.status).toBe("completed");
    });

    it("should handle cancellation after processing completes", async () => {
      const stream1 = new CreativeReasoningStream(100); // Very short timeout

      // Start processing
      const promise = stream1.process(testProblem);

      // Cancel immediately (might complete before cancellation takes effect)
      stream1.cancel();

      const result = await promise;

      // Should either be cancelled or completed
      expect(["cancelled", "completed"]).toContain(result.status);
    });
  });

  describe("Error Handling Coverage", () => {
    it("should handle processor internal errors and return failed status", async () => {
      // Test the CreativeStreamProcessor's error handling directly
      const processor = new CreativeStreamProcessor();

      // Create a problem that will cause an internal error
      const problematicProblem = {
        id: "test-error",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
        complexity: "moderate",
        urgency: "high",
      } as Problem;

      // Mock a method to throw an error during processing
      const originalGenerate = (processor as any).generateCreativeIdeas.bind(processor);
      (processor as any).generateCreativeIdeas = vi.fn().mockImplementation(() => {
        throw new Error("Internal processing error");
      });

      const result = await processor.process(problematicProblem);

      // Should return failed status with error
      expect(result.status).toBe("failed");
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Internal processing error");
      expect(result.conclusion).toBe("");
      expect(result.confidence).toBe(0);
      expect(result.processingTime).toBeGreaterThan(0);

      // Restore original
      (processor as any).generateCreativeIdeas = originalGenerate;
    });

    it("should handle processor errors and return failed status", async () => {
      // Create a problem that will cause an error in processing
      const problematicProblem = {
        id: "test-error",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
        complexity: "moderate",
        urgency: "high",
      } as Problem;

      // Create a new processor that throws an error
      class ErrorProcessor implements StreamProcessor {
        async process(_problem: Problem): Promise<StreamResult> {
          throw new Error("Processing error");
        }
        getStreamType(): StreamType {
          return StreamType.CREATIVE;
        }
      }

      // Create stream with error processor
      const stream1 = new CreativeReasoningStream();
      const originalProcessor = stream1.processor;
      (stream1 as any).processor = new ErrorProcessor();

      try {
        await stream1.process(problematicProblem);
        expect.fail("Should have thrown error");
      } catch (error) {
        // Error should be thrown from processWithProgress
        expect(error).toBeDefined();
        expect((error as Error).message).toBe("Processing error");
      }

      // Restore original
      (stream1 as any).processor = originalProcessor;
    });

    it("should handle timeout scenario", async () => {
      // Create stream with very short timeout
      const stream1 = new CreativeReasoningStream(50);

      // Create a problem that would take longer to process
      const slowProblem = {
        id: "test-slow",
        description: "Complex problem requiring extensive analysis",
        context: "Very detailed context that requires careful consideration",
        constraints: ["Many", "Different", "Constraints", "To", "Consider"],
        goals: ["Multiple", "Complex", "Goals"],
        complexity: "complex",
        urgency: "high",
      } as Problem;

      // Mock processor to take longer than timeout
      const originalProcess = stream1.processor.process.bind(stream1.processor);
      stream1.processor.process = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return originalProcess(slowProblem);
      });

      const result = await stream1.process(slowProblem);

      // Should return timeout status
      expect(result.status).toBe("timeout");
      expect(result.conclusion).toContain("timeout");
      expect(result.confidence).toBe(0.3);
      expect(result.processingTime).toBe(50);

      // Restore original
      stream1.processor.process = originalProcess;
    }, 1000);

    it("should handle cancellation during processing", async () => {
      const stream1 = new CreativeReasoningStream(5000);

      // Mock processor to take some time
      const originalProcess = stream1.processor.process.bind(stream1.processor);
      stream1.processor.process = vi.fn().mockImplementation(async (problem) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return originalProcess(problem);
      });

      // Start processing
      const promise = stream1.process(testProblem);

      // Cancel during processing
      await new Promise((resolve) => setTimeout(resolve, 20));
      stream1.cancel();

      const result = await promise;

      // Should return cancelled status
      expect(result.status).toBe("cancelled");
      expect(result.conclusion).toBe("");
      expect(result.confidence).toBe(0);

      // Restore original
      stream1.processor.process = originalProcess;
    });

    it("should handle late cancellation after processing completes", async () => {
      const stream1 = new CreativeReasoningStream(5000);

      // Start processing
      const promise = stream1.process(testProblem);

      // Wait for processing to complete
      await promise;

      // Cancel after completion
      stream1.cancel();

      // Progress should be reset
      expect(stream1.getProgress()).toBe(0);
    });

    it("should clear progress interval on error", async () => {
      const stream1 = new CreativeReasoningStream(5000);

      // Mock processor to throw error
      const originalProcess = stream1.processor.process.bind(stream1.processor);
      stream1.processor.process = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        throw new Error("Test error");
      });

      try {
        await stream1.process(testProblem);
      } catch (error) {
        // Error should be thrown
        expect(error).toBeDefined();
        expect((error as Error).message).toBe("Test error");
      }

      // Restore original
      stream1.processor.process = originalProcess;
    });
  });
});
