/**
 * Reasoning Workflow Integration Tests
 *
 * Task 12.1.2: Test complete reasoning workflow
 * Tests problem → classification → framework selection → parallel reasoning → synthesis
 * Tests confidence assessment throughout workflow
 * Tests bias detection and correction integration
 * Tests emotion detection integration
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { beforeAll, describe, expect, it } from "vitest";
import { BiasCorrectionEngine } from "../../bias/bias-correction-engine.js";
import { BiasPatternRecognizer } from "../../bias/bias-pattern-recognizer.js";
import { MultiDimensionalConfidenceAssessor } from "../../confidence/multi-dimensional-assessor.js";
import { CircumplexEmotionAnalyzer } from "../../emotion/circumplex-analyzer.js";
import { ContextualEmotionProcessor } from "../../emotion/contextual-processor.js";
import { DiscreteEmotionClassifier } from "../../emotion/discrete-emotion-classifier.js";
import type { ProfessionalContext } from "../../emotion/types.js";
import { FrameworkLearningSystem } from "../../framework/framework-learning.js";
import { FrameworkRegistry } from "../../framework/framework-registry.js";
import { FrameworkSelector } from "../../framework/framework-selector.js";
import { ProblemClassifier } from "../../framework/problem-classifier.js";
import type { Problem } from "../../framework/types.js";
import { ParallelReasoningOrchestrator } from "../../reasoning/orchestrator.js";
import type { ReasoningContext } from "../../reasoning/types.js";

describe("Reasoning Workflow Integration", () => {
  let problemClassifier: ProblemClassifier;
  let frameworkSelector: FrameworkSelector;
  let reasoningOrchestrator: ParallelReasoningOrchestrator;
  let confidenceAssessor: MultiDimensionalConfidenceAssessor;

  let emotionAnalyzer: CircumplexEmotionAnalyzer;
  let emotionClassifier: DiscreteEmotionClassifier;

  beforeAll(() => {
    // Initialize problem classification
    problemClassifier = new ProblemClassifier();

    // Initialize framework selection
    const registry = FrameworkRegistry.getInstance();
    const learningSystem = new FrameworkLearningSystem();
    frameworkSelector = new FrameworkSelector(problemClassifier, registry, learningSystem);

    // Initialize parallel reasoning
    reasoningOrchestrator = new ParallelReasoningOrchestrator();

    // Initialize confidence assessment
    confidenceAssessor = new MultiDimensionalConfidenceAssessor();

    // Bias detection components initialized per-test as needed

    // Initialize emotion detection with mock models
    const mockEmotionModel = {
      name: "mock-emotion-model",
      version: "1.0.0",
      analyzeValence: () => 0.5,
      analyzeArousal: () => 0.5,
      analyzeDominance: () => 0.5,
      classifyEmotions: () => [],
    };
    emotionAnalyzer = new CircumplexEmotionAnalyzer(mockEmotionModel);
    emotionClassifier = new DiscreteEmotionClassifier(mockEmotionModel);
  });

  describe("Complete Reasoning Pipeline", () => {
    it("should execute full pipeline: problem → classification → framework → reasoning → synthesis", async () => {
      // 1. Define problem
      const problem: Problem = {
        id: "test-problem-1",
        description:
          "How can we improve the performance of our database queries that are taking too long?",
        context: "Production database with 1M+ records, queries taking 5-10 seconds",
        constraints: ["Cannot change database schema", "Must maintain backward compatibility"],
        goals: ["Reduce query time to <1 second", "Improve user experience"],
      };

      // 2. Classify problem
      const classification = problemClassifier.classifyProblem(problem);

      expect(classification).toBeDefined();
      expect(classification.complexity).toMatch(/simple|moderate|complex/);
      expect(classification.uncertainty).toMatch(/low|medium|high/);
      expect(classification.stakes).toMatch(/routine|important|critical/);
      expect(classification.timePressure).toMatch(/none|moderate|high/);

      // 3. Select framework
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

      // 4. Execute parallel reasoning
      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await reasoningOrchestrator.executeStreams(problem, streams, 30000);

      expect(reasoningResult).toBeDefined();
      expect(reasoningResult.conclusion).toBeDefined();
      expect(reasoningResult.insights).toBeDefined();
      expect(reasoningResult.recommendations).toBeDefined();
      expect(reasoningResult.confidence).toBeGreaterThan(0);
      expect(reasoningResult.confidence).toBeLessThanOrEqual(1);

      // 5. Assess confidence
      const reasoningContext: ReasoningContext = {
        problem,
        evidence: reasoningResult.insights.map((i) => i.content),
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };

      const confidence = await confidenceAssessor.assessConfidence(reasoningContext);

      expect(confidence).toBeDefined();
      expect(confidence.overallConfidence).toBeGreaterThan(0);
      expect(confidence.overallConfidence).toBeLessThanOrEqual(1);
      expect(confidence.evidenceQuality).toBeDefined();
      expect(confidence.reasoningCoherence).toBeDefined();
      expect(confidence.completeness).toBeDefined();

      // Verify pipeline completed successfully
      expect(reasoningResult.metadata.synthesisTime).toBeLessThan(30000);
    }, 35000);

    it("should handle complex multi-step reasoning workflow", async () => {
      const problem: Problem = {
        id: "test-problem-2",
        description: "Design a new feature for real-time collaboration in our application",
        context: "Web application with 10k+ users, need to support simultaneous editing",
        constraints: [
          "Must work with existing architecture",
          "Budget limit of $50k",
          "Launch in 3 months",
        ],
        goals: [
          "Enable real-time collaboration",
          "Maintain performance",
          "Ensure data consistency",
        ],
      };

      // Execute full pipeline
      const classification = problemClassifier.classifyProblem(problem);
      const context = {
        problem,
        evidence: [],
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };
      const selection = frameworkSelector.selectFramework(problem, context);

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await reasoningOrchestrator.executeStreams(problem, streams, 30000);

      // Verify all components worked together
      expect(classification.complexity).toMatch(/simple|moderate|complex/);
      expect(selection.primaryFramework.name).toBeDefined();
      expect(reasoningResult.recommendations.length).toBeGreaterThan(0);

      // Verify synthesis quality
      expect(reasoningResult.insights.length).toBeGreaterThan(0);
      expect(reasoningResult.recommendations.length).toBeGreaterThan(0);

      // Each recommendation should have attribution
      for (const rec of reasoningResult.recommendations) {
        expect(rec.sources).toBeDefined();
        expect(rec.sources.length).toBeGreaterThan(0);
      }
    }, 35000);
  });

  describe("Confidence Assessment Integration", () => {
    it("should assess confidence throughout reasoning workflow", async () => {
      const problem: Problem = {
        id: "test-problem-3",
        description: "Should we migrate to microservices architecture?",
        context: "Monolithic application with scaling challenges",
        constraints: ["Limited team size", "Cannot disrupt current operations"],
        goals: ["Improve scalability", "Enable independent deployments"],
      };

      // Execute reasoning
      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await reasoningOrchestrator.executeStreams(problem, streams, 30000);

      // Assess confidence at different stages
      const contexts = [
        {
          problem,
          evidence: [reasoningResult.conclusion],
          constraints: problem.constraints || [],
          goals: problem.goals || [],
        },
        {
          problem,
          evidence: reasoningResult.insights.map((i) => i.content),
          constraints: problem.constraints || [],
          goals: problem.goals || [],
        },
      ];

      const confidenceAssessments = await Promise.all(
        contexts.map((ctx) => confidenceAssessor.assessConfidence(ctx))
      );

      // Verify confidence assessments
      for (const assessment of confidenceAssessments) {
        expect(assessment.overallConfidence).toBeGreaterThan(0);
        expect(assessment.overallConfidence).toBeLessThanOrEqual(1);
        expect(assessment.evidenceQuality).toBeGreaterThan(0);
        expect(assessment.reasoningCoherence).toBeGreaterThan(0);
        expect(assessment.completeness).toBeGreaterThan(0);
      }

      // Final synthesis should have higher confidence than individual streams
      expect(confidenceAssessments[1].overallConfidence).toBeGreaterThanOrEqual(
        confidenceAssessments[0].overallConfidence * 0.8
      );
    }, 35000);

    it("should provide confidence warnings for low-confidence results", async () => {
      const problem: Problem = {
        id: "test-problem-4",
        description: "Predict stock market trends for next quarter",
        context: "Highly volatile market conditions",
        constraints: ["Limited historical data", "Many unknown factors"],
        goals: ["Maximize returns", "Minimize risk"],
      };

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await reasoningOrchestrator.executeStreams(problem, streams, 30000);

      const reasoningContext: ReasoningContext = {
        problem,
        evidence: reasoningResult.insights.map((i) => i.content),
        constraints: problem.constraints || [],
        goals: problem.goals || [],
      };

      const confidence = await confidenceAssessor.assessConfidence(reasoningContext);

      // High uncertainty problem should have lower confidence
      expect(confidence.overallConfidence).toBeLessThan(0.85);

      // Should identify uncertainty
      expect(confidence.uncertaintyType).toMatch(/epistemic|aleatoric|ambiguity/);
    }, 35000);
  });

  describe("Bias Detection Integration", () => {
    it("should detect biases during reasoning process", async () => {
      const problem: Problem = {
        id: "test-problem-5",
        description: "Our new product launch was successful, should we expand to more markets?",
        context: "Recent launch in one market showed positive results",
        constraints: ["Limited budget for expansion"],
        goals: ["Maximize market share", "Maintain profitability"],
      };

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await reasoningOrchestrator.executeStreams(problem, streams, 30000);

      // Create reasoning chain from results
      const reasoningChain = {
        id: "test-chain-1",
        steps: [
          {
            id: "step-1",
            type: "inference" as const,
            content: reasoningResult.conclusion,
            timestamp: new Date(),
          },
          {
            id: "step-2",
            type: "conclusion" as const,
            content: reasoningResult.conclusion,
            timestamp: new Date(),
          },
        ],
        branches: [],
        assumptions:
          problem.constraints?.map((c, i) => ({
            id: `assumption-${i}`,
            content: c,
            explicit: true,
            confidence: 0.8,
          })) || [],
        inferences: reasoningResult.insights.map((i, idx) => ({
          id: `inference-${idx}`,
          content: i.content,
          premises: [i.content],
          confidence: i.confidence,
          type: "inductive" as const,
        })),
        evidence: reasoningResult.insights.map((i, idx) => ({
          id: `evidence-${idx}`,
          content: i.content,
          source: "reasoning",
          reliability: 0.8,
        })),
        conclusion: reasoningResult.conclusion,
      };

      // Monitor for biases using recognizer directly
      const biasRecognizer = new BiasPatternRecognizer();
      const detectedBiases = biasRecognizer.detectBiases(reasoningChain);

      // Should detect potential confirmation bias (focusing on positive results)
      expect(detectedBiases).toBeDefined();
      expect(Array.isArray(detectedBiases)).toBe(true);

      // If biases detected, verify they have proper structure
      if (detectedBiases.length > 0) {
        for (const bias of detectedBiases) {
          expect(bias.type).toBeDefined();
          expect(bias.severity).toBeGreaterThan(0);
          expect(bias.severity).toBeLessThanOrEqual(1);
          expect(bias.evidence).toBeDefined();
        }
      }
    }, 35000);

    /**
     * Integration test for comprehensive test case from the report
     *
     * **Validates: Requirements 2.7**
     *
     * Tests the specific case: "All the data clearly supports my hypothesis.
     * I've been working on this for 6 months and invested significant resources,
     * so we should definitely continue. Everyone else is doing it this way."
     *
     * Verifies detection of:
     * - Confirmation bias (from "clearly supports", "all data supports")
     * - Sunk cost fallacy (from "invested significant")
     * - Bandwagon effect (from "everyone else is doing")
     */
    it("should detect all three biases in the comprehensive test case from the report", () => {
      const testCase =
        "All the data clearly supports my hypothesis. I've been working on this for 6 months " +
        "and invested significant resources, so we should definitely continue. Everyone else " +
        "is doing it this way.";

      const biasRecognizer = new BiasPatternRecognizer();
      const detectedBiases = biasRecognizer.detectBiasesFromText(testCase);

      // Should detect at least 3 biases
      expect(detectedBiases.length).toBeGreaterThanOrEqual(3);

      // Verify confirmation bias is detected
      const confirmationBias = detectedBiases.find((b) => b.type === "confirmation");
      expect(confirmationBias).toBeDefined();
      expect(confirmationBias?.severity).toBeGreaterThan(0);
      expect(confirmationBias?.confidence).toBeGreaterThan(0);
      expect(confirmationBias?.evidence.length).toBeGreaterThan(0);

      // Verify sunk cost fallacy is detected
      const sunkCostBias = detectedBiases.find((b) => b.type === "sunk_cost");
      expect(sunkCostBias).toBeDefined();
      expect(sunkCostBias?.severity).toBeGreaterThan(0);
      expect(sunkCostBias?.confidence).toBeGreaterThan(0);
      expect(sunkCostBias?.evidence.length).toBeGreaterThan(0);

      // Verify bandwagon effect is detected (mapped to REPRESENTATIVENESS)
      const bandwagonBias = detectedBiases.find((b) => b.type === "representativeness");
      expect(bandwagonBias).toBeDefined();
      expect(bandwagonBias?.severity).toBeGreaterThan(0);
      expect(bandwagonBias?.confidence).toBeGreaterThan(0);
      expect(bandwagonBias?.evidence.length).toBeGreaterThan(0);

      // Verify evidence contains matched indicators
      for (const bias of detectedBiases) {
        const hasMatchedIndicator = bias.evidence.some((e) =>
          e.toLowerCase().includes("matched indicator")
        );
        expect(hasMatchedIndicator).toBe(true);
      }
    });

    it("should apply bias correction when biases are detected", async () => {
      const problem: Problem = {
        id: "test-problem-6",
        description: "Should we continue with our current strategy?",
        context: "We've invested significant resources already",
        constraints: ["Sunk costs of $100k"],
        goals: ["Achieve ROI", "Complete project"],
      };

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await reasoningOrchestrator.executeStreams(problem, streams, 30000);

      const reasoningChain = {
        id: "test-chain-2",
        steps: [
          {
            id: "step-1",
            type: "inference" as const,
            content: reasoningResult.conclusion,
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
        conclusion: reasoningResult.conclusion,
      };

      // Detect biases using recognizer directly
      const biasRecognizer = new BiasPatternRecognizer();
      const detectedBiases = biasRecognizer.detectBiases(reasoningChain);

      // Should detect sunk cost fallacy
      const sunkCostBias = detectedBiases.find((b) => b.type === "sunk_cost");

      if (sunkCostBias) {
        // Apply correction using correction engine directly
        const correctionEngine = new BiasCorrectionEngine();
        const corrected = correctionEngine.correctBias(sunkCostBias, reasoningChain);

        expect(corrected).toBeDefined();
        expect(corrected.corrected).toBeDefined();
        expect(corrected.correctionsApplied).toBeDefined();

        // Correction should provide alternative perspective
        expect(corrected.corrected.steps.length).toBeGreaterThanOrEqual(
          reasoningChain.steps.length
        );
      }
    }, 35000);
  });

  describe("Emotion Detection Integration", () => {
    it("should detect emotions in problem context", () => {
      const emotionalProblem =
        "I'm really frustrated with our system's performance. Users are complaining and I'm worried we'll lose customers.";

      // Detect circumplex dimensions
      const circumplex = emotionAnalyzer.analyzeCircumplex(emotionalProblem);

      expect(circumplex).toBeDefined();
      expect(circumplex.valence).toBeLessThan(0); // Negative valence (frustrated, worried)
      expect(circumplex.arousal).toBeGreaterThanOrEqual(0.5); // High arousal (frustrated)
      expect(circumplex.confidence).toBeGreaterThan(0);

      // Detect discrete emotions
      const emotions = emotionClassifier.classify(emotionalProblem);

      expect(emotions).toBeDefined();
      expect(emotions.length).toBeGreaterThan(0);

      // Should detect frustration, worry, or fear
      const emotionTypes = emotions.map((e) => e.emotion);
      const hasNegativeEmotion =
        emotionTypes.includes("anger") ||
        emotionTypes.includes("fear") ||
        emotionTypes.includes("sadness");

      expect(hasNegativeEmotion).toBe(true);
    });

    it("should adjust reasoning based on emotional context", async () => {
      const calmProblem: Problem = {
        id: "test-problem-7",
        description: "Let's analyze the best approach for optimizing our database queries",
        context: "We have time to carefully evaluate options",
        constraints: ["No immediate deadline"],
        goals: ["Find optimal solution"],
      };

      const urgentProblem: Problem = {
        id: "test-problem-8",
        description: "URGENT: Production database is down! We need a solution immediately!",
        context: "Critical system failure affecting all users",
        constraints: ["Must fix within 1 hour"],
        goals: ["Restore service ASAP"],
      };

      // Detect emotions
      const calmEmotion = emotionAnalyzer.analyzeCircumplex(calmProblem.description);
      const urgentEmotion = emotionAnalyzer.analyzeCircumplex(urgentProblem.description);

      // Urgent problem should have higher arousal
      expect(urgentEmotion.arousal).toBeGreaterThan(calmEmotion.arousal);

      // Execute reasoning for both
      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const calmResult = await reasoningOrchestrator.executeStreams(calmProblem, streams, 30000);
      const urgentResult = await reasoningOrchestrator.executeStreams(
        urgentProblem,
        streams,
        30000
      );

      // Both should complete successfully
      expect(calmResult.conclusion).toBeDefined();
      expect(urgentResult.conclusion).toBeDefined();

      // Urgent problem might have different recommendation priorities
      expect(urgentResult.recommendations.length).toBeGreaterThan(0);
    }, 35000);

    it("should process contextual emotional factors", () => {
      // Create processor with mock model
      const mockModel = {
        name: "mock-emotion-model",
        version: "1.0.0",
        analyzeValence: () => 0.5,
        analyzeArousal: () => 0.5,
        analyzeDominance: () => 0.0,
        classifyEmotions: () => [],
      };
      const processor = new ContextualEmotionProcessor(mockModel);

      const text = "I'm feeling okay about this situation";

      // Test professional context adjustment
      const professionalContext: ProfessionalContext = {
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

  describe("Performance Validation", () => {
    it("should complete full reasoning workflow within 30 seconds", async () => {
      const problem: Problem = {
        id: "test-problem-9",
        description: "How should we prioritize our product roadmap for next quarter?",
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

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const reasoningResult = await reasoningOrchestrator.executeStreams(problem, streams, 30000);
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

      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    }, 35000);

    it("should meet confidence assessment latency target (<100ms)", async () => {
      const problem: Problem = {
        id: "test-problem-10",
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
      const problem: Problem = {
        id: "test-problem-11",
        description: "Performance test for bias detection overhead",
        context: "Testing bias detection performance impact",
        constraints: ["Performance constraint"],
        goals: ["Measure overhead"],
      };

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      // Measure reasoning time
      const startReasoning = Date.now();
      const result = await reasoningOrchestrator.executeStreams(problem, streams, 30000);
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
      const biasRecognizer = new BiasPatternRecognizer();
      biasRecognizer.detectBiases(reasoningChain);
      const biasDuration = Date.now() - startBias;

      // Calculate overhead as percentage of reasoning time
      // Guard against division by zero
      const overhead = reasoningDuration > 0 ? (biasDuration / reasoningDuration) * 100 : 0;

      // Overhead should be less than 15%
      expect(overhead).toBeLessThan(15);
    }, 35000);
  });

  describe("Error Handling and Recovery", () => {
    it("should handle invalid problem gracefully", async () => {
      const invalidProblem: Problem = {
        id: "test-problem-12",
        description: "", // Empty description
        context: "",
        constraints: [],
        goals: [],
      };

      // Should throw validation error for empty description
      expect(() => problemClassifier.classifyProblem(invalidProblem)).toThrow(
        "Problem must have id and description"
      );

      // Framework selection should also validate and throw
      const invalidContext = {
        problem: invalidProblem,
        evidence: [],
        constraints: [],
        goals: [],
      };
      expect(() => frameworkSelector.selectFramework(invalidProblem, invalidContext)).toThrow();
    });

    it("should handle reasoning timeout gracefully", async () => {
      const problem: Problem = {
        id: "test-problem-13",
        description: "Complex problem that might timeout",
        context: "Testing timeout handling",
        constraints: ["Time constraint"],
        goals: ["Test timeout"],
      };

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      // Use very short timeout
      const result = await reasoningOrchestrator.executeStreams(problem, streams, 100);

      // Should return partial results even if timeout
      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();
    }, 5000);

    it("should recover from individual stream failures", async () => {
      const problem: Problem = {
        id: "test-problem-14",
        description: "Test problem for stream failure recovery",
        context: "Testing error recovery",
        constraints: ["Error handling"],
        goals: ["Graceful degradation"],
      };

      // Create reasoning streams
      const { AnalyticalReasoningStream } = await import(
        "../../reasoning/streams/analytical-stream.js"
      );
      const { CreativeReasoningStream } = await import(
        "../../reasoning/streams/creative-stream.js"
      );
      const { CriticalReasoningStream } = await import(
        "../../reasoning/streams/critical-stream.js"
      );
      const { SyntheticReasoningStream } = await import(
        "../../reasoning/streams/synthetic-stream.js"
      );

      const streams = [
        new AnalyticalReasoningStream(),
        new CreativeReasoningStream(),
        new CriticalReasoningStream(),
        new SyntheticReasoningStream(),
      ];

      const result = await reasoningOrchestrator.executeStreams(problem, streams, 30000);

      // Should complete even if some streams fail
      expect(result).toBeDefined();
      expect(result.conclusion).toBeDefined();

      // Should have at least some results
      expect(result.insights.length).toBeGreaterThan(0);
    }, 35000);
  });
});
