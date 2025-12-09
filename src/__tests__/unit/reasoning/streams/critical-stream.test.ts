/**
 * Tests for Critical Reasoning Stream
 *
 * Following TDD methodology - these tests define expected behavior
 * for the critical reasoning stream before implementation.
 *
 * The critical stream performs skeptical, evaluative thinking with:
 * - Weakness identification in arguments and solutions
 * - Assumption challenging and questioning
 * - Risk assessment and threat analysis
 * - Flaw detection in logic and reasoning
 * - Skeptical end devil's advocate approach
 * - Counter-argument generation
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
  description: "Implement a new feature to increase user engagement",
  context:
    "Proposal: Add gamification elements (points, badges, leaderboards) to increase engagement by 50%",
  constraints: ["3-month timeline", "$50k budget", "Must not alienate existing users"],
  goals: ["Increase engagement", "Maintain user satisfaction"],
  complexity,
  urgency: "high",
});

// TDD GREEN PHASE: Implementation now exists, tests should pass
import { CriticalReasoningStream } from "../../../../reasoning/streams/critical-stream";

describe("CriticalReasoningStream", () => {
  let stream: ReasoningStream | undefined;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    // Create actual stream instance now that implementation exists
    stream = new CriticalReasoningStream();
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
      // This will fail until CriticalReasoningStream is implemented
      expect(getStream()).toBeDefined();
      expect(getStream().type).toBe("critical");
      expect(getStream().id).toContain("critical");
    });

    it("should have default 10s timeout", () => {
      expect(getStream()).toBeDefined();
      expect(getStream().timeout).toBe(10000);
    });

    it("should have processor defined", () => {
      expect(getStream()).toBeDefined();
      expect(getStream().processor).toBeDefined();
      expect(getStream().processor.getStreamType()).toBe("critical");
    });

    it("should start with progress at 0", () => {
      expect(getStream()).toBeDefined();
      expect(getStream().getProgress()).toBe(0);
    });
  });

  describe("Weakness Identification", () => {
    it("should identify weaknesses in proposed solutions", async () => {
      const result = await getStream().process(testProblem);

      // Should identify potential weaknesses
      const identifiesWeaknesses = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("weakness") ||
          step.toLowerCase().includes("flaw") ||
          step.toLowerCase().includes("problem") ||
          step.toLowerCase().includes("issue")
      );
      expect(identifiesWeaknesses).toBe(true);
    });

    it("should identify logical gaps", async () => {
      const result = await getStream().process(testProblem);

      // Should point out logical gaps or missing information
      const identifiesGaps = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("gap") ||
          step.toLowerCase().includes("missing") ||
          step.toLowerCase().includes("unclear") ||
          step.toLowerCase().includes("not addressed")
      );
      expect(identifiesGaps).toBe(true);
    });

    it("should identify potential failure points", async () => {
      const result = await getStream().process(testProblem);

      // Should identify what could go wrong
      const identifiesFailures = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("fail") ||
          step.toLowerCase().includes("wrong") ||
          step.toLowerCase().includes("risk") ||
          step.toLowerCase().includes("danger")
      );
      expect(identifiesFailures).toBe(true);
    });

    it("should identify implementation challenges", async () => {
      const result = await getStream().process(testProblem);

      // Should point out practical difficulties
      const identifiesChallenges = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("challenge") ||
          step.toLowerCase().includes("difficult") ||
          step.toLowerCase().includes("complex") ||
          step.toLowerCase().includes("hard")
      );
      expect(identifiesChallenges).toBe(true);
    });

    it("should provide specific weakness examples", async () => {
      const result = await getStream().process(testProblem);

      // Should have multiple specific weaknesses identified
      expect(result.insights).toBeDefined();
      expect(result.insights.length).toBeGreaterThanOrEqual(2);

      // Each insight should describe a specific weakness
      for (const insight of result.insights) {
        expect(insight.content).toBeDefined();
        expect(insight.content.length).toBeGreaterThan(20);
        expect(insight.source).toBe("critical");
      }
    });
  });

  describe("Assumption Challenging", () => {
    it("should identify and challenge assumptions", async () => {
      const result = await getStream().process(testProblem);

      // Should identify assumptions in the proposal
      const challengesAssumptions = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("assum") ||
          step.toLowerCase().includes("presume") ||
          step.toLowerCase().includes("take for granted")
      );
      expect(challengesAssumptions).toBe(true);
    });

    it("should question unstated premises", async () => {
      const result = await getStream().process(testProblem);

      // Should ask critical questions
      const asksQuestions = result.reasoning.some(
        (step) =>
          step.includes("?") ||
          step.toLowerCase().includes("what if") ||
          step.toLowerCase().includes("how do we know") ||
          step.toLowerCase().includes("is it true")
      );
      expect(asksQuestions).toBe(true);
    });

    it("should challenge optimistic projections", async () => {
      const result = await getStream().process(testProblem);

      // Should question the 50% engagement increase claim
      const challengesProjections = result.reasoning.some(
        (step) =>
          step.includes("50%") ||
          step.toLowerCase().includes("realistic") ||
          step.toLowerCase().includes("achievable") ||
          step.toLowerCase().includes("optimistic")
      );
      expect(challengesProjections).toBe(true);
    });

    it("should identify hidden assumptions", async () => {
      const result = await getStream().process(testProblem);

      // Should uncover implicit assumptions
      const identifiesHidden = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("implicit") ||
          step.toLowerCase().includes("hidden") ||
          step.toLowerCase().includes("underlying") ||
          step.toLowerCase().includes("unstated")
      );
      expect(identifiesHidden).toBe(true);
    });

    it("should test assumption validity", async () => {
      const result = await getStream().process(testProblem);

      // Should evaluate whether assumptions hold
      const testsValidity = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("valid") ||
          step.toLowerCase().includes("hold") ||
          step.toLowerCase().includes("true") ||
          step.toLowerCase().includes("evidence")
      );
      expect(testsValidity).toBe(true);
    });
  });

  describe("Risk Assessment", () => {
    it("should identify potential risks", async () => {
      const result = await getStream().process(testProblem);

      // Should identify risks in the proposal
      const identifiesRisks = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("risk") ||
          step.toLowerCase().includes("threat") ||
          step.toLowerCase().includes("danger") ||
          step.toLowerCase().includes("concern")
      );
      expect(identifiesRisks).toBe(true);
    });

    it("should assess risk severity", async () => {
      const result = await getStream().process(testProblem);

      // Should evaluate how serious risks are
      const assessesSeverity = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("serious") ||
          step.toLowerCase().includes("significant") ||
          step.toLowerCase().includes("major") ||
          step.toLowerCase().includes("critical")
      );
      expect(assessesSeverity).toBe(true);
    });

    it("should identify unintended consequences", async () => {
      const result = await getStream().process(testProblem);

      // Should consider what could go wrong
      const identifiesConsequences = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("consequence") ||
          step.toLowerCase().includes("effect") ||
          step.toLowerCase().includes("result") ||
          step.toLowerCase().includes("impact")
      );
      expect(identifiesConsequences).toBe(true);
    });

    it("should consider worst-case scenarios", async () => {
      const result = await getStream().process(testProblem);

      // Should think about what could go badly wrong
      const considersWorstCase = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("worst") ||
          step.toLowerCase().includes("fail") ||
          step.toLowerCase().includes("backfire") ||
          step.toLowerCase().includes("disaster")
      );
      expect(considersWorstCase).toBe(true);
    });

    it("should evaluate risk mitigation", async () => {
      const result = await getStream().process(testProblem);

      // Should consider how risks could be addressed
      const evaluatesMitigation = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("mitigate") ||
          step.toLowerCase().includes("prevent") ||
          step.toLowerCase().includes("avoid") ||
          step.toLowerCase().includes("address")
      );
      expect(evaluatesMitigation).toBe(true);
    });
  });

  describe("Flaw Detection", () => {
    it("should detect logical flaws", async () => {
      const result = await getStream().process(testProblem);

      // Should identify logical problems
      const detectsFlaws = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("flaw") ||
          step.toLowerCase().includes("fallacy") ||
          step.toLowerCase().includes("error") ||
          step.toLowerCase().includes("mistake")
      );
      expect(detectsFlaws).toBe(true);
    });

    it("should identify circular reasoning", async () => {
      const circularProblem: Problem = {
        ...testProblem,
        context:
          "Gamification will increase engagement because users will be more engaged with gamification",
      };

      const result = await getStream().process(circularProblem);

      // Should detect circular logic
      const detectsCircular = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("circular") ||
          step.toLowerCase().includes("tautolog") ||
          step.toLowerCase().includes("repeats itself")
      );
      expect(detectsCircular).toBe(true);
    });

    it("should identify false dichotomies", async () => {
      const dichotomyProblem: Problem = {
        ...testProblem,
        context: "We must either add gamification or accept declining engagement",
      };

      const result = await getStream().process(dichotomyProblem);

      // Should detect false either/or thinking
      const detectsDichotomy = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("false dichotomy") ||
          step.toLowerCase().includes("either/or") ||
          step.toLowerCase().includes("other options") ||
          step.toLowerCase().includes("alternative")
      );
      expect(detectsDichotomy).toBe(true);
    });

    it("should identify correlation vs causation errors", async () => {
      const correlationProblem: Problem = {
        ...testProblem,
        context:
          "Companies with gamification have higher engagement, so gamification causes engagement",
      };

      const result = await getStream().process(correlationProblem);

      // Should detect correlation/causation confusion
      const detectsCorrelation = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("correlation") ||
          step.toLowerCase().includes("causation") ||
          step.toLowerCase().includes("cause") ||
          step.toLowerCase().includes("not necessarily")
      );
      expect(detectsCorrelation).toBe(true);
    });

    it("should identify overgeneralizations", async () => {
      const result = await getStream().process(testProblem);

      // Should detect sweeping claims
      const detectsOvergeneralization = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("generalization") ||
          step.toLowerCase().includes("all") ||
          step.toLowerCase().includes("always") ||
          step.toLowerCase().includes("never")
      );
      expect(detectsOvergeneralization).toBe(true);
    });

    it("should detect overgeneralizations with 'all' keyword", async () => {
      const overgeneralProblem: Problem = {
        ...testProblem,
        context: "All users love gamification and always engage more with badges",
      };

      const result = await getStream().process(overgeneralProblem);

      // Should detect overgeneralization flaw
      const hasOvergeneralizationFlaw = result.insights.some(
        (insight) =>
          insight.content.toLowerCase().includes("overgeneralization") ||
          insight.content.toLowerCase().includes("sweeping claim")
      );
      expect(hasOvergeneralizationFlaw).toBe(true);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it("should detect overgeneralizations with 'never' keyword", async () => {
      const overgeneralProblem: Problem = {
        ...testProblem,
        context: "Users never complain about gamification features",
      };

      const result = await getStream().process(overgeneralProblem);

      // Should detect overgeneralization flaw
      const hasOvergeneralizationFlaw = result.insights.some(
        (insight) =>
          insight.content.toLowerCase().includes("overgeneralization") ||
          insight.content.toLowerCase().includes("sweeping")
      );
      expect(hasOvergeneralizationFlaw).toBe(true);
    });

    it("should provide general flaw concern when no specific flaws detected", async () => {
      const simpleProblem: Problem = {
        id: "simple-1",
        description: "Add a button",
        context: "Add a button to the page",
        constraints: [],
        goals: ["Add button"],
        complexity: "simple",
        urgency: "low",
      };

      const result = await getStream().process(simpleProblem);

      // Should still have at least one flaw insight (general concern)
      expect(result.insights.length).toBeGreaterThan(0);

      // Should have general scrutiny message if no specific flaws
      const hasGeneralConcern = result.insights.some(
        (insight) =>
          insight.content.toLowerCase().includes("scrutiny") ||
          insight.content.toLowerCase().includes("examination") ||
          insight.content.toLowerCase().includes("flaw")
      );
      expect(hasGeneralConcern).toBe(true);
    });
  });

  describe("Skeptical Evaluation", () => {
    it("should maintain skeptical perspective", async () => {
      const result = await getStream().process(testProblem);

      // Should show skepticism throughout
      const showsSkepticism = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("however") ||
          step.toLowerCase().includes("but") ||
          step.toLowerCase().includes("concern") ||
          step.toLowerCase().includes("question")
      );
      expect(showsSkepticism).toBe(true);
    });

    it("should question evidence quality", async () => {
      const result = await getStream().process(testProblem);

      // Should evaluate evidence critically
      const questionsEvidence = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("evidence") ||
          step.toLowerCase().includes("data") ||
          step.toLowerCase().includes("support") ||
          step.toLowerCase().includes("proof")
      );
      expect(questionsEvidence).toBe(true);
    });

    it("should identify biases", async () => {
      const result = await getStream().process(testProblem);

      // Should point out potential biases
      const identifiesBiases = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("bias") ||
          step.toLowerCase().includes("prejudice") ||
          step.toLowerCase().includes("assumption") ||
          step.toLowerCase().includes("preconception")
      );
      expect(identifiesBiases).toBe(true);
    });

    it("should challenge conventional wisdom", async () => {
      const result = await getStream().process(testProblem);

      // Should question accepted ideas
      const challengesConvention = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("conventional") ||
          step.toLowerCase().includes("traditional") ||
          step.toLowerCase().includes("accepted") ||
          step.toLowerCase().includes("standard")
      );
      expect(challengesConvention).toBe(true);
    });

    it("should not be overly pessimistic", async () => {
      const result = await getStream().process(testProblem);

      // Should be critical but balanced
      expect(result.confidence).toBeGreaterThan(0.2);
      expect(result.confidence).toBeLessThan(0.9);

      // Should have constructive criticism
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe("Counter-Argument Generation", () => {
    it("should generate counter-arguments", async () => {
      const result = await getStream().process(testProblem);

      // Should provide alternative viewpoints
      const hasCounterArguments = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("counter") ||
          step.toLowerCase().includes("alternatively") ||
          step.toLowerCase().includes("on the other hand") ||
          step.toLowerCase().includes("conversely")
      );
      expect(hasCounterArguments).toBe(true);
    });

    it("should play devil's advocate", async () => {
      const result = await getStream().process(testProblem);

      // Should argue against the proposal
      const playsDevilsAdvocate = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("devil") ||
          step.toLowerCase().includes("argue against") ||
          step.toLowerCase().includes("oppose") ||
          step.toLowerCase().includes("disagree")
      );
      expect(playsDevilsAdvocate).toBe(true);
    });

    it("should provide alternative perspectives", async () => {
      const result = await getStream().process(testProblem);

      // Should consider different viewpoints (may use various phrasings)
      const providesAlternatives = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("perspective") ||
          step.toLowerCase().includes("viewpoint") ||
          step.toLowerCase().includes("angle") ||
          step.toLowerCase().includes("consider") ||
          step.toLowerCase().includes("alternative") ||
          step.toLowerCase().includes("counter")
      );
      expect(providesAlternatives).toBe(true);
    });

    it("should challenge from multiple angles", async () => {
      const result = await getStream().process(testProblem);

      // Should have multiple different criticisms
      expect(result.insights.length).toBeGreaterThanOrEqual(3);

      // Insights should cover different concerns
      const concerns = result.insights.map((i) => i.content.toLowerCase());
      const uniqueWords = new Set(concerns.join(" ").split(" "));
      expect(uniqueWords.size).toBeGreaterThan(20);
    });

    it("should provide constructive criticism", async () => {
      const result = await getStream().process(testProblem);

      // Should not just criticize but suggest improvements
      const isConstructive = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("instead") ||
          step.toLowerCase().includes("better") ||
          step.toLowerCase().includes("improve") ||
          step.toLowerCase().includes("address")
      );
      expect(isConstructive).toBe(true);
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

    it("should handle timeout gracefully with TIMEOUT status", async () => {
      // Create stream with very short timeout for testing
      const shortTimeoutStream = new CriticalReasoningStream(50); // 50ms timeout

      // Create a problem that would take longer to process
      const complexProblem: Problem = {
        ...testProblem,
        complexity: "complex",
        description:
          "Analyze all possible flaws in a comprehensive business strategy with extensive detail",
      };

      // Mock the processor to take longer than timeout
      const originalProcess = shortTimeoutStream.processor.process.bind(
        shortTimeoutStream.processor
      );
      shortTimeoutStream.processor.process = vi
        .fn()
        .mockImplementation(async (problem: Problem) => {
          // Simulate slow processing
          await new Promise((resolve) => setTimeout(resolve, 200));
          return originalProcess(problem);
        });

      const result = await shortTimeoutStream.process(complexProblem);

      // Should return TIMEOUT status
      expect(result.status).toBe("timeout");
      expect(result.conclusion).toContain("timeout");
      expect(result.confidence).toBe(0.3);
      expect(result.processingTime).toBeGreaterThanOrEqual(50);
    }, 15000);

    it("should track processing time", async () => {
      const result = await getStream().process(testProblem);

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(10000);
    });

    it("should maintain thoroughness within time limit", async () => {
      const result = await getStream().process(testProblem);

      // Should still be thorough despite time pressure
      expect(result.insights.length).toBeGreaterThanOrEqual(2);
      expect(result.reasoning.length).toBeGreaterThan(3);
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

      // Should have status cancelled OR completed (timing-dependent)
      expect(["cancelled", "completed"]).toContain(result.status);

      // Should have insights regardless
      expect(result.insights).toBeDefined();
    });

    it("should handle late cancellation after processing completes", async () => {
      // Create a stream with slow processing
      const stream = new CriticalReasoningStream();

      // Mock processor to complete quickly
      const originalProcess = stream.processor.process.bind(stream.processor);
      stream.processor.process = vi.fn().mockImplementation(async (problem: Problem) => {
        const result = await originalProcess(problem);
        // Cancel after processing completes but before promise resolves
        stream.cancel();
        return result;
      });

      const result = await stream.process(testProblem);

      // Should detect late cancellation and override status
      expect(result.status).toBe("cancelled");
      expect(result.confidence).toBe(0);
      expect(result.conclusion).toBe("");
      expect(result.processingTime).toBeGreaterThan(0);
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

      // Should still provide critical analysis with lower confidence
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

    it("should return FAILED status with error in result when processor encounters error", async () => {
      // Create a stream with a problem that will cause an internal error
      const stream = new CriticalReasoningStream();

      // Create a problem that will trigger an error in the processor
      // by having invalid data that causes processing to fail
      const problematicProblem: Problem = {
        id: "error-test",
        description: "Test error handling",
        context: "Test context",
        constraints: [],
        goals: [],
        complexity: "simple",
        urgency: "low",
      };

      // Mock a method inside the processor to throw an error
      const originalIdentifyWeaknesses = (stream.processor as any).identifyWeaknesses;
      (stream.processor as any).identifyWeaknesses = vi.fn().mockImplementation(() => {
        throw new Error("Processing failed");
      });

      const result = await stream.process(problematicProblem);

      // Restore original method
      (stream.processor as any).identifyWeaknesses = originalIdentifyWeaknesses;

      // Should return FAILED status with error
      expect(result.status).toBe("failed");
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Processing failed");
      expect(result.confidence).toBe(0);
      expect(result.conclusion).toBe("");
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe("Result Structure", () => {
    it("should return complete StreamResult", async () => {
      const result = await getStream().process(testProblem);

      // Verify all required fields
      expect(result.streamId).toBeDefined();
      expect(result.streamType).toBe("critical");
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

      expect(result.streamId).toContain("critical");
      expect(result.streamType).toBe("critical");
    });

    it("should have insights with source attribution", async () => {
      const result = await getStream().process(testProblem);

      // All insights should be attributed to critical stream
      for (const insight of result.insights) {
        expect(insight.source).toBe("critical");
      }
    });
  });

  describe("Quality Metrics", () => {
    it("should provide thorough critical analysis", async () => {
      const result = await getStream().process(testProblem);

      // Should have comprehensive criticism
      expect(result.insights.length).toBeGreaterThanOrEqual(3);
      expect(result.reasoning.length).toBeGreaterThan(5);

      // Should have moderate confidence (critical but not dismissive)
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it("should identify multiple types of issues", async () => {
      const result = await getStream().process(testProblem);

      // Should cover different categories of criticism
      const hasWeaknesses = result.reasoning.some((s) => s.toLowerCase().includes("weakness"));
      const hasRisks = result.reasoning.some((s) => s.toLowerCase().includes("risk"));
      const hasAssumptions = result.reasoning.some((s) => s.toLowerCase().includes("assum"));

      const categoriesCount = [hasWeaknesses, hasRisks, hasAssumptions].filter(Boolean).length;
      expect(categoriesCount).toBeGreaterThanOrEqual(2);
    });

    it("should balance criticism with constructiveness", async () => {
      const result = await getStream().process(testProblem);

      // Should not just tear down but offer insights
      expect(result.insights.length).toBeGreaterThan(0);

      // Should have some constructive elements
      const hasConstructive = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("instead") ||
          step.toLowerCase().includes("better") ||
          step.toLowerCase().includes("improve")
      );
      expect(hasConstructive).toBe(true);
    });

    it("should maintain skeptical but fair tone", async () => {
      const result = await getStream().process(testProblem);

      // Should be critical but not dismissive
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(20);

      // Should acknowledge both concerns and potential
      const isFair =
        result.reasoning.some((s) => s.toLowerCase().includes("concern")) &&
        result.reasoning.some(
          (s) => s.toLowerCase().includes("could") || s.toLowerCase().includes("might")
        );
      expect(isFair).toBe(true);
    });

    it("should demonstrate deep analytical thinking", async () => {
      const result = await getStream().process(testProblem);

      // Should go beyond surface-level criticism
      expect(result.reasoning.length).toBeGreaterThan(5);

      // Should show depth in analysis
      const showsDepth = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("underlying") ||
          step.toLowerCase().includes("fundamental") ||
          step.toLowerCase().includes("root") ||
          step.toLowerCase().includes("deeper")
      );
      expect(showsDepth).toBe(true);
    });
  });
});
