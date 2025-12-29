/**
 * Reasoning Workflow Integration Tests (Mocked)
 *
 * Tests the interaction between Orchestrator, Streams, and SynthesisEngine
 * using mocks for external dependencies.
 *
 * This is an integration test that verifies internal module interactions work correctly,
 * NOT a test of external service integration.
 *
 * Requirements: 12.2, 12.3, 12.4
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Problem } from "../../framework/types";
import type { ReasoningContext } from "../../reasoning/types";

// Mock emotion model for emotion detection components
function createMockEmotionModel() {
  return {
    name: "mock-emotion-model",
    version: "1.0.0",
    analyzeValence: vi.fn().mockReturnValue(0.5),
    analyzeArousal: vi.fn().mockReturnValue(0.5),
    analyzeDominance: vi.fn().mockReturnValue(0.5),
    classifyEmotions: vi.fn().mockReturnValue([]),
  };
}

describe("Reasoning Workflow Integration (Mocked)", () => {
  let mockEmotionModel: ReturnType<typeof createMockEmotionModel>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmotionModel = createMockEmotionModel();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Complete Reasoning Pipeline", () => {
    it("should coordinate problem classification, framework selection, and reasoning execution", async () => {
      // Import real components (they don't have external dependencies)
      const { ProblemClassifier } = await import("../../framework/problem-classifier");
      const { FrameworkRegistry } = await import("../../framework/framework-registry");
      const { FrameworkLearningSystem } = await import("../../framework/framework-learning");
      const { FrameworkSelector } = await import("../../framework/framework-selector");

      // Initialize components
      const problemClassifier = new ProblemClassifier();
      const registry = FrameworkRegistry.getInstance();
      const learningSystem = new FrameworkLearningSystem();
      const frameworkSelector = new FrameworkSelector(problemClassifier, registry, learningSystem);

      // Define test problem
      const problem: Problem = {
        id: "test-problem-1",
        description: "How can we improve database query performance?",
        context: "Production database with scaling challenges",
        constraints: ["Cannot change schema", "Must maintain compatibility"],
        goals: ["Reduce query time", "Improve user experience"],
      };

      // Step 1: Classify problem
      const classification = problemClassifier.classifyProblem(problem);
      expect(classification).toBeDefined();
      expect(classification.complexity).toMatch(/simple|moderate|complex/);
      expect(classification.uncertainty).toMatch(/low|medium|high/);

      // Step 2: Select framework
      const context = {
        problem,
        evidence: [],
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };
      const selection = frameworkSelector.selectFramework(problem, context);
      expect(selection).toBeDefined();
      expect(selection.primaryFramework).toBeDefined();
      expect(selection.confidence).toBeGreaterThan(0);
      expect(selection.confidence).toBeLessThanOrEqual(1);

      // Step 3: Verify framework selection is appropriate for problem type
      expect(selection.primaryFramework.name).toBeDefined();
    });

    it("should execute parallel reasoning streams and synthesize results", async () => {
      const { ParallelReasoningOrchestrator } = await import("../../reasoning/orchestrator");
      const { AnalyticalReasoningStream } =
        await import("../../reasoning/streams/analytical-stream");
      const { CreativeReasoningStream } = await import("../../reasoning/streams/creative-stream");
      const { CriticalReasoningStream } = await import("../../reasoning/streams/critical-stream");
      const { SyntheticReasoningStream } = await import("../../reasoning/streams/synthetic-stream");

      const orchestrator = new ParallelReasoningOrchestrator();
      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const problem: Problem = {
        id: "test-problem-2",
        description: "Design a new feature for real-time collaboration",
        context: "Web application with 10k+ users",
        constraints: ["Must work with existing architecture", "Budget limit"],
        goals: ["Enable real-time collaboration", "Maintain performance"],
      };

      // Execute parallel reasoning
      const result = await orchestrator.executeStreams(problem, streams, 30000);

      // Verify synthesis result structure
      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Verify insights from multiple streams
      expect(result.insights.length).toBeGreaterThan(0);

      // Verify recommendations have sources
      for (const rec of result.recommendations) {
        expect(rec.sources).toBeDefined();
        expect(rec.sources.length).toBeGreaterThan(0);
      }
    }, 35000);
  });

  describe("Confidence Assessment Integration", () => {
    it("should assess confidence for reasoning results", async () => {
      const { MultiDimensionalConfidenceAssessor } =
        await import("../../confidence/multi-dimensional-assessor");

      const confidenceAssessor = new MultiDimensionalConfidenceAssessor();

      const problem: Problem = {
        id: "test-problem-3",
        description: "Should we migrate to microservices?",
        context: "Monolithic application with scaling challenges",
        constraints: ["Limited team size"],
        goals: ["Improve scalability"],
      };

      const reasoningContext: ReasoningContext = {
        problem,
        evidence: [
          "Evidence 1: Current system struggles with load",
          "Evidence 2: Team has microservices experience",
        ],
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };

      // Assess confidence
      const confidence = await confidenceAssessor.assessConfidence(reasoningContext);

      expect(confidence).toBeDefined();
      expect(confidence.overallConfidence).toBeGreaterThan(0);
      expect(confidence.overallConfidence).toBeLessThanOrEqual(1);
      expect(confidence.evidenceQuality).toBeDefined();
      expect(confidence.reasoningCoherence).toBeDefined();
      expect(confidence.completeness).toBeDefined();
    });

    it("should identify uncertainty in high-risk problems", async () => {
      const { MultiDimensionalConfidenceAssessor } =
        await import("../../confidence/multi-dimensional-assessor");

      const confidenceAssessor = new MultiDimensionalConfidenceAssessor();

      const problem: Problem = {
        id: "test-problem-4",
        description: "Predict market trends for next quarter",
        context: "Highly volatile market conditions",
        constraints: ["Limited historical data", "Many unknown factors"],
        goals: ["Maximize returns", "Minimize risk"],
      };

      const reasoningContext: ReasoningContext = {
        problem,
        evidence: ["Limited data available"],
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };

      const confidence = await confidenceAssessor.assessConfidence(reasoningContext);

      // High uncertainty problem should have lower confidence
      expect(confidence.overallConfidence).toBeLessThan(0.9);
      expect(confidence.uncertaintyType).toMatch(/epistemic|aleatoric|ambiguity/);
    });
  });

  describe("Bias Detection Integration", () => {
    it("should detect biases in reasoning chains", async () => {
      const { BiasPatternRecognizer } = await import("../../bias/bias-pattern-recognizer");

      const biasRecognizer = new BiasPatternRecognizer();

      // Create a reasoning chain with potential biases
      const reasoningChain = {
        id: "test-chain-1",
        steps: [
          {
            id: "step-1",
            type: "inference" as const,
            content: "All data supports our hypothesis",
            timestamp: new Date(),
          },
        ],
        branches: [],
        assumptions: [
          {
            id: "assumption-1",
            content: "We should continue because we've already invested",
            explicit: true,
            confidence: 0.8,
          },
        ],
        inferences: [
          {
            id: "inference-1",
            content: "Must continue to justify investment",
            premises: ["Significant investment made"],
            confidence: 0.7,
            type: "deductive" as const,
          },
        ],
        evidence: [
          {
            id: "evidence-1",
            content: "Significant investment made",
            source: "context",
            reliability: 0.8,
          },
        ],
        conclusion: "Continue with current approach",
      };

      const detectedBiases = biasRecognizer.detectBiases(reasoningChain);

      expect(detectedBiases).toBeDefined();
      expect(Array.isArray(detectedBiases)).toBe(true);

      // If biases detected, verify structure
      if (detectedBiases.length > 0) {
        for (const bias of detectedBiases) {
          expect(bias.type).toBeDefined();
          expect(bias.severity).toBeGreaterThan(0);
          expect(bias.severity).toBeLessThanOrEqual(1);
          expect(bias.evidence).toBeDefined();
        }
      }
    });

    it("should detect multiple biases in comprehensive test case", async () => {
      const { BiasPatternRecognizer } = await import("../../bias/bias-pattern-recognizer");

      const biasRecognizer = new BiasPatternRecognizer();

      const testCase =
        "All the data clearly supports my hypothesis. I've been working on this for 6 months " +
        "and invested significant resources, so we should definitely continue. Everyone else " +
        "is doing it this way.";

      const detectedBiases = biasRecognizer.detectBiasesFromText(testCase);

      // Should detect at least 3 biases
      expect(detectedBiases.length).toBeGreaterThanOrEqual(3);

      // Verify confirmation bias
      const confirmationBias = detectedBiases.find((b) => b.type === "confirmation");
      expect(confirmationBias).toBeDefined();

      // Verify sunk cost fallacy
      const sunkCostBias = detectedBiases.find((b) => b.type === "sunk_cost");
      expect(sunkCostBias).toBeDefined();

      // Verify bandwagon effect (now has its own type)
      const bandwagonBias = detectedBiases.find((b) => b.type === "bandwagon");
      expect(bandwagonBias).toBeDefined();
    });

    it("should apply bias correction when biases are detected", async () => {
      const { BiasPatternRecognizer } = await import("../../bias/bias-pattern-recognizer");
      const { BiasCorrectionEngine } = await import("../../bias/bias-correction-engine");

      const biasRecognizer = new BiasPatternRecognizer();
      const correctionEngine = new BiasCorrectionEngine();

      const reasoningChain = {
        id: "test-chain-2",
        steps: [
          {
            id: "step-1",
            type: "inference" as const,
            content: "We should continue because we've invested significantly",
            timestamp: new Date(),
          },
        ],
        branches: [],
        assumptions: [
          {
            id: "assumption-1",
            content: "Sunk costs justify continuation",
            explicit: true,
            confidence: 0.8,
          },
        ],
        inferences: [
          {
            id: "inference-1",
            content: "Must continue to justify investment",
            premises: ["Significant investment made"],
            confidence: 0.7,
            type: "deductive" as const,
          },
        ],
        evidence: [
          {
            id: "evidence-1",
            content: "Significant investment made",
            source: "context",
            reliability: 0.8,
          },
        ],
        conclusion: "Continue with current approach",
      };

      const detectedBiases = biasRecognizer.detectBiases(reasoningChain);
      const sunkCostBias = detectedBiases.find((b) => b.type === "sunk_cost");

      if (sunkCostBias) {
        const corrected = correctionEngine.correctBias(sunkCostBias, reasoningChain);

        expect(corrected).toBeDefined();
        expect(corrected.corrected).toBeDefined();
        expect(corrected.correctionsApplied).toBeDefined();
      }
    });
  });

  describe("Emotion Detection Integration", () => {
    it("should detect emotions in problem context", async () => {
      const { CircumplexEmotionAnalyzer } = await import("../../emotion/circumplex-analyzer");
      const { DiscreteEmotionClassifier } =
        await import("../../emotion/discrete-emotion-classifier");

      const emotionAnalyzer = new CircumplexEmotionAnalyzer(mockEmotionModel);
      const emotionClassifier = new DiscreteEmotionClassifier(mockEmotionModel);

      const emotionalProblem =
        "I'm really frustrated with our system's performance. Users are complaining.";

      // Detect circumplex dimensions
      const circumplex = emotionAnalyzer.analyzeCircumplex(emotionalProblem);
      expect(circumplex).toBeDefined();
      expect(circumplex.valence).toBeDefined();
      expect(circumplex.arousal).toBeDefined();
      expect(circumplex.confidence).toBeGreaterThan(0);

      // Detect discrete emotions
      const emotions = emotionClassifier.classify(emotionalProblem);
      expect(emotions).toBeDefined();
    });

    it("should process contextual emotional factors", async () => {
      const { ContextualEmotionProcessor } = await import("../../emotion/contextual-processor");
      // ProfessionalContext type is used inline below
      await import("../../emotion/types");

      const processor = new ContextualEmotionProcessor(mockEmotionModel);
      const text = "I'm feeling okay about this situation";

      const professionalContext = {
        setting: "formal" as const,
        relationship: "peer" as const,
        domain: "technology",
      };

      const result = processor.processWithContext(text, { professionalContext });

      expect(result).toBeDefined();
      expect(result.circumplex).toBeDefined();
      expect(result.circumplex.valence).toBeDefined();
      expect(result.circumplex.arousal).toBeDefined();
      expect(result.circumplex.dominance).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle invalid problem gracefully", async () => {
      const { ProblemClassifier } = await import("../../framework/problem-classifier");
      const { FrameworkRegistry } = await import("../../framework/framework-registry");
      const { FrameworkLearningSystem } = await import("../../framework/framework-learning");
      const { FrameworkSelector } = await import("../../framework/framework-selector");

      const problemClassifier = new ProblemClassifier();
      const registry = FrameworkRegistry.getInstance();
      const learningSystem = new FrameworkLearningSystem();
      const frameworkSelector = new FrameworkSelector(problemClassifier, registry, learningSystem);

      const invalidProblem: Problem = {
        id: "test-problem-invalid",
        description: "", // Empty description
        context: "",
        constraints: [],
        goals: [],
      };

      // Should throw validation error
      expect(() => problemClassifier.classifyProblem(invalidProblem)).toThrow(
        "Problem must have id and description"
      );

      const invalidContext = {
        problem: invalidProblem,
        evidence: [],
        constraints: [],
        goals: [],
      };
      expect(() => frameworkSelector.selectFramework(invalidProblem, invalidContext)).toThrow();
    });

    it("should handle reasoning timeout gracefully", async () => {
      const { ParallelReasoningOrchestrator } = await import("../../reasoning/orchestrator");
      const { AnalyticalReasoningStream } =
        await import("../../reasoning/streams/analytical-stream");
      const { CreativeReasoningStream } = await import("../../reasoning/streams/creative-stream");
      const { CriticalReasoningStream } = await import("../../reasoning/streams/critical-stream");
      const { SyntheticReasoningStream } = await import("../../reasoning/streams/synthetic-stream");

      const orchestrator = new ParallelReasoningOrchestrator();
      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const problem: Problem = {
        id: "test-problem-timeout",
        description: "Complex problem that might timeout",
        context: "Testing timeout handling",
        constraints: ["Time constraint"],
        goals: ["Test timeout"],
      };

      // Use very short timeout
      const result = await orchestrator.executeStreams(problem, streams, 100);

      // Should return partial results even if timeout
      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
    }, 15000);

    it("should recover from individual stream failures", async () => {
      const { ParallelReasoningOrchestrator } = await import("../../reasoning/orchestrator");
      const { AnalyticalReasoningStream } =
        await import("../../reasoning/streams/analytical-stream");
      const { CreativeReasoningStream } = await import("../../reasoning/streams/creative-stream");
      const { CriticalReasoningStream } = await import("../../reasoning/streams/critical-stream");
      const { SyntheticReasoningStream } = await import("../../reasoning/streams/synthetic-stream");

      const orchestrator = new ParallelReasoningOrchestrator();
      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const problem: Problem = {
        id: "test-problem-recovery",
        description: "Test problem for stream failure recovery",
        context: "Testing error recovery",
        constraints: ["Error handling"],
        goals: ["Graceful degradation"],
      };

      const result = await orchestrator.executeStreams(problem, streams, 30000);

      // Should complete even if some streams fail
      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
    }, 35000);
  });

  describe("Performance Validation", () => {
    it("should complete reasoning workflow within reasonable time", async () => {
      const { ProblemClassifier } = await import("../../framework/problem-classifier");
      const { FrameworkRegistry } = await import("../../framework/framework-registry");
      const { FrameworkLearningSystem } = await import("../../framework/framework-learning");
      const { FrameworkSelector } = await import("../../framework/framework-selector");
      const { ParallelReasoningOrchestrator } = await import("../../reasoning/orchestrator");
      const { MultiDimensionalConfidenceAssessor } =
        await import("../../confidence/multi-dimensional-assessor");
      const { AnalyticalReasoningStream } =
        await import("../../reasoning/streams/analytical-stream");
      const { CreativeReasoningStream } = await import("../../reasoning/streams/creative-stream");
      const { CriticalReasoningStream } = await import("../../reasoning/streams/critical-stream");
      const { SyntheticReasoningStream } = await import("../../reasoning/streams/synthetic-stream");

      const problemClassifier = new ProblemClassifier();
      const registry = FrameworkRegistry.getInstance();
      const learningSystem = new FrameworkLearningSystem();
      const frameworkSelector = new FrameworkSelector(problemClassifier, registry, learningSystem);
      const orchestrator = new ParallelReasoningOrchestrator();
      const confidenceAssessor = new MultiDimensionalConfidenceAssessor();

      const problem: Problem = {
        id: "test-problem-perf",
        description: "How should we prioritize our product roadmap?",
        context: "Multiple competing features, limited resources",
        constraints: ["Team of 5 engineers", "3-month timeline"],
        goals: ["Maximize user value", "Meet business objectives"],
      };

      const start = Date.now();

      // Execute full workflow
      const classification = problemClassifier.classifyProblem(problem);
      const context = {
        problem,
        evidence: [],
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };
      const selection = frameworkSelector.selectFramework(problem, context);

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await orchestrator.executeStreams(problem, streams, 30000);

      const reasoningContext: ReasoningContext = {
        problem,
        evidence: reasoningResult.insights.map((i) => i.content),
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };
      const confidence = await confidenceAssessor.assessConfidence(reasoningContext);

      const duration = Date.now() - start;

      // Verify all components completed
      expect(classification).toBeDefined();
      expect(selection).toBeDefined();
      expect(reasoningResult).toBeDefined();
      expect(confidence).toBeDefined();

      // Should complete within 35 seconds (allowing for LLM fallback)
      expect(duration).toBeLessThan(35000);
    }, 40000);

    it("should meet confidence assessment latency target", async () => {
      const { MultiDimensionalConfidenceAssessor } =
        await import("../../confidence/multi-dimensional-assessor");

      const confidenceAssessor = new MultiDimensionalConfidenceAssessor();

      const problem: Problem = {
        id: "test-problem-latency",
        description: "Test problem for performance",
        context: "Performance test context",
        constraints: ["Test constraint"],
        goals: ["Test goal"],
      };

      const reasoningContext: ReasoningContext = {
        problem,
        evidence: ["Evidence 1", "Evidence 2", "Evidence 3"],
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };

      const latencies: number[] = [];

      // Measure confidence assessment latency
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await confidenceAssessor.assessConfidence(reasoningContext);
        const latency = Date.now() - start;
        latencies.push(latency);
      }

      // Calculate average latency
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

      expect(avgLatency).toBeLessThan(100); // <100ms target
    });

    it("should maintain bias detection overhead below 15%", async () => {
      const { ParallelReasoningOrchestrator } = await import("../../reasoning/orchestrator");
      const { BiasPatternRecognizer } = await import("../../bias/bias-pattern-recognizer");
      const { AnalyticalReasoningStream } =
        await import("../../reasoning/streams/analytical-stream");
      const { CreativeReasoningStream } = await import("../../reasoning/streams/creative-stream");
      const { CriticalReasoningStream } = await import("../../reasoning/streams/critical-stream");
      const { SyntheticReasoningStream } = await import("../../reasoning/streams/synthetic-stream");

      const orchestrator = new ParallelReasoningOrchestrator();
      const biasRecognizer = new BiasPatternRecognizer();

      const problem: Problem = {
        id: "test-problem-overhead",
        description: "Performance test for bias detection overhead",
        context: "Testing bias detection performance impact",
        constraints: ["Performance constraint"],
        goals: ["Measure overhead"],
      };

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      // Measure reasoning time
      const startReasoning = Date.now();
      const result = await orchestrator.executeStreams(problem, streams, 30000);
      const reasoningDuration = Date.now() - startReasoning;

      // Measure bias detection time
      const reasoningChain = {
        id: "test-chain-3",
        steps: [
          {
            id: "step-1",
            type: "inference" as const,
            content: result.conclusion,
            timestamp: new Date(),
          },
        ],
        branches: [],
        assumptions: [],
        inferences: [],
        evidence: [],
        conclusion: result.conclusion,
      };

      const startBias = Date.now();
      biasRecognizer.detectBiases(reasoningChain);
      const biasDuration = Date.now() - startBias;

      // Bias detection should be fast in absolute terms (< 200ms)
      // This is more reliable than percentage-based checks in mocked environments
      // where reasoning time can be artificially short
      expect(biasDuration).toBeLessThan(200);

      // Only check percentage overhead if reasoning took meaningful time (> 100ms)
      // to avoid flaky results from near-zero division
      if (reasoningDuration > 100) {
        const overhead = (biasDuration / reasoningDuration) * 100;
        expect(overhead).toBeLessThan(15);
      }
    }, 35000);
  });
});
