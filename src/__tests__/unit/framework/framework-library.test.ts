/**
 * Framework Library Tests
 *
 * Tests for systematic thinking framework implementations including
 * Scientific Method, Design Thinking, Systems Thinking, Critical Thinking,
 * and Root Cause Analysis frameworks.
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Context, FrameworkResult, Problem, StepResult } from "../../../framework/types.js";

describe("Scientific Method Framework", () => {
  let problem: Problem;
  let context: Context;

  beforeEach(() => {
    problem = {
      id: "test-problem-1",
      description: "Test if adding fertilizer increases plant growth",
      context: "Agricultural research study on plant growth optimization",
      constraints: ["Limited time", "Budget constraints"],
      goals: ["Determine optimal fertilizer amount"],
      complexity: "moderate",
      urgency: "medium",
    };

    context = {
      problem,
      evidence: ["Previous studies show fertilizer helps growth"],
      constraints: ["Must complete in 30 days", "Budget: $500"],
      goals: ["Find optimal fertilizer amount", "Measure growth rate"],
    };
  });

  describe("Framework Metadata", () => {
    it("should have correct framework ID", async () => {
      // This test will fail until we implement the framework
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      expect(framework.id).toBe("scientific-method");
    });

    it("should have correct framework name", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      expect(framework.name).toBe("Scientific Method");
    });

    it("should have descriptive description", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      expect(framework.description).toContain("empirical");
      expect(framework.description.length).toBeGreaterThan(20);
    });

    it("should be best suited for empirical problems", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      expect(framework.bestSuitedFor).toBeDefined();
      expect(framework.bestSuitedFor.length).toBeGreaterThan(0);
    });
  });

  describe("Framework Steps", () => {
    it("should have exactly 5 steps", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      expect(framework.steps).toHaveLength(5);
    });

    it("should have steps in correct order: Observe, Hypothesize, Experiment, Collect, Analyze", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      expect(framework.steps[0].id).toBe("observe");
      expect(framework.steps[0].name).toBe("Observe");
      expect(framework.steps[0].order).toBe(0);

      expect(framework.steps[1].id).toBe("hypothesize");
      expect(framework.steps[1].name).toBe("Hypothesize");
      expect(framework.steps[1].order).toBe(1);

      expect(framework.steps[2].id).toBe("experiment");
      expect(framework.steps[2].name).toBe("Experiment");
      expect(framework.steps[2].order).toBe(2);

      expect(framework.steps[3].id).toBe("collect");
      expect(framework.steps[3].name).toBe("Collect Data");
      expect(framework.steps[3].order).toBe(3);

      expect(framework.steps[4].id).toBe("analyze");
      expect(framework.steps[4].name).toBe("Analyze");
      expect(framework.steps[4].order).toBe(4);
    });

    it("should have all steps with descriptions", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      framework.steps.forEach((step) => {
        expect(step.description).toBeDefined();
        expect(step.description.length).toBeGreaterThan(10);
      });
    });

    it("should have all steps marked as non-optional", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      framework.steps.forEach((step) => {
        expect(step.optional).toBe(false);
      });
    });
  });

  describe("Step Execution", () => {
    it("should execute Observe step successfully", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const observeStep = framework.steps[0];

      const result = await observeStep.execute(context, []);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("observe");
      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should execute Hypothesize step successfully", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const hypothesizeStep = framework.steps[1];

      const previousResults: StepResult[] = [
        {
          stepId: "observe",
          success: true,
          output: "Plants show varying growth rates",
          insights: ["Growth varies by location"],
          processingTime: 100,
          confidence: 0.8,
        },
      ];

      const result = await hypothesizeStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("hypothesize");
      expect(result.output).toContain("hypothesis");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Experiment step successfully", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const experimentStep = framework.steps[2];

      const previousResults: StepResult[] = [
        {
          stepId: "observe",
          success: true,
          output: "Plants show varying growth rates",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "hypothesize",
          success: true,
          output: "Hypothesis: Fertilizer increases growth by 20%",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
      ];

      const result = await experimentStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("experiment");
      expect(result.output).toContain("experiment");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Collect Data step successfully", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const collectStep = framework.steps[3];

      const previousResults: StepResult[] = [
        {
          stepId: "observe",
          success: true,
          output: "Plants show varying growth rates",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "hypothesize",
          success: true,
          output: "Hypothesis: Fertilizer increases growth by 20%",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
        {
          stepId: "experiment",
          success: true,
          output: "Experiment designed with control and test groups",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      const result = await collectStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("collect");
      expect(result.output).toContain("data");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Analyze step successfully", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const analyzeStep = framework.steps[4];

      const previousResults: StepResult[] = [
        {
          stepId: "observe",
          success: true,
          output: "Plants show varying growth rates",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "hypothesize",
          success: true,
          output: "Hypothesis: Fertilizer increases growth by 20%",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
        {
          stepId: "experiment",
          success: true,
          output: "Experiment designed with control and test groups",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "collect",
          success: true,
          output: "Data collected from 50 plants over 30 days",
          insights: [],
          processingTime: 100,
          confidence: 0.85,
        },
      ];

      const result = await analyzeStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("analyze");
      expect(result.output).toContain("analysis");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Complete Framework Execution", () => {
    it("should execute complete framework successfully", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      const result: FrameworkResult = await framework.execute(problem, context);

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe("scientific-method");
      expect(result.frameworkName).toBe("Scientific Method");
      expect(result.steps).toHaveLength(5);
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should generate insights during execution", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      const result = await framework.execute(problem, context);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it("should track progress through all steps", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      const result = await framework.execute(problem, context);

      expect(result.progress).toBeDefined();
      expect(result.progress.completedSteps).toHaveLength(5);
      expect(result.progress.progressPercentage).toBe(100);
      expect(result.progress.totalSteps).toBe(5);
    });

    it("should complete execution within reasonable time", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      const startTime = Date.now();
      await framework.execute(problem, context);
      const executionTime = Date.now() - startTime;

      // Should complete within 5 seconds as per requirements
      expect(executionTime).toBeLessThan(5000);
    });
  });

  describe("Step Validation", () => {
    it("should validate Observe step with valid context", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const observeStep = framework.steps[0];

      const validation = await observeStep.validate(context, []);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("should validate Hypothesize step requires Observe results", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const hypothesizeStep = framework.steps[1];

      // Should fail without previous results
      const validationWithoutResults = await hypothesizeStep.validate(context, []);
      expect(validationWithoutResults.valid).toBe(false);
      expect(validationWithoutResults.issues.length).toBeGreaterThan(0);

      // Should pass with previous results
      const previousResults: StepResult[] = [
        {
          stepId: "observe",
          success: true,
          output: "Observations made",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ];
      const validationWithResults = await hypothesizeStep.validate(context, previousResults);
      expect(validationWithResults.valid).toBe(true);
    });

    it("should validate Experiment step requires Hypothesize results", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const experimentStep = framework.steps[2];

      // Should fail without hypothesis
      const validationWithoutHypothesis = await experimentStep.validate(context, []);
      expect(validationWithoutHypothesis.valid).toBe(false);
      expect(validationWithoutHypothesis.issues.length).toBeGreaterThan(0);

      // Should fail with failed hypothesis
      const failedHypothesis: StepResult[] = [
        {
          stepId: "hypothesize",
          success: false,
          output: "Failed to form hypothesis",
          insights: [],
          processingTime: 100,
          confidence: 0.3,
        },
      ];
      const validationWithFailedHypothesis = await experimentStep.validate(
        context,
        failedHypothesis
      );
      expect(validationWithFailedHypothesis.valid).toBe(false);

      // Should pass with successful hypothesis
      const successfulHypothesis: StepResult[] = [
        {
          stepId: "hypothesize",
          success: true,
          output: "Hypothesis formed",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ];
      const validationWithHypothesis = await experimentStep.validate(context, successfulHypothesis);
      expect(validationWithHypothesis.valid).toBe(true);
    });

    it("should validate Collect Data step requires Experiment results", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const collectStep = framework.steps[3];

      // Should fail without experiment
      const validationWithoutExperiment = await collectStep.validate(context, []);
      expect(validationWithoutExperiment.valid).toBe(false);
      expect(validationWithoutExperiment.issues.length).toBeGreaterThan(0);

      // Should fail with failed experiment
      const failedExperiment: StepResult[] = [
        {
          stepId: "experiment",
          success: false,
          output: "Experiment failed",
          insights: [],
          processingTime: 100,
          confidence: 0.3,
        },
      ];
      const validationWithFailedExperiment = await collectStep.validate(context, failedExperiment);
      expect(validationWithFailedExperiment.valid).toBe(false);

      // Should pass with successful experiment
      const successfulExperiment: StepResult[] = [
        {
          stepId: "experiment",
          success: true,
          output: "Experiment completed",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ];
      const validationWithExperiment = await collectStep.validate(context, successfulExperiment);
      expect(validationWithExperiment.valid).toBe(true);
    });

    it("should validate Analyze step requires Collect Data results", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();
      const analyzeStep = framework.steps[4];

      // Should fail without data collection
      const validationWithoutData = await analyzeStep.validate(context, []);
      expect(validationWithoutData.valid).toBe(false);
      expect(validationWithoutData.issues.length).toBeGreaterThan(0);

      // Should fail with failed data collection
      const failedCollection: StepResult[] = [
        {
          stepId: "collect",
          success: false,
          output: "Data collection failed",
          insights: [],
          processingTime: 100,
          confidence: 0.3,
        },
      ];
      const validationWithFailedCollection = await analyzeStep.validate(context, failedCollection);
      expect(validationWithFailedCollection.valid).toBe(false);

      // Should pass with successful data collection
      const successfulCollection: StepResult[] = [
        {
          stepId: "collect",
          success: true,
          output: "Data collected",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ];
      const validationWithData = await analyzeStep.validate(context, successfulCollection);
      expect(validationWithData.valid).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing problem description gracefully", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      const invalidProblem = { ...problem, description: "" };
      const invalidContext = { ...context, problem: invalidProblem };

      const result = await framework.execute(invalidProblem, invalidContext);

      // Should still complete but may have lower confidence
      expect(result).toBeDefined();
      expect(result.frameworkId).toBe("scientific-method");
    });

    it("should handle empty evidence array", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      const contextWithoutEvidence = { ...context, evidence: [] };

      const result = await framework.execute(problem, contextWithoutEvidence);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Adaptation", () => {
    it("should have adapt method", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      expect(framework.adapt).toBeDefined();
      expect(typeof framework.adapt).toBe("function");
    });

    it("should call adapt method without errors", async () => {
      const { ScientificMethodFramework } = await import(
        "../../../framework/frameworks/scientific-method.js"
      );
      const framework = new ScientificMethodFramework();

      const progress = {
        currentStep: "observe",
        completedSteps: [],
        totalSteps: 5,
        progressPercentage: 0,
        obstacles: [],
        adaptations: [],
      };

      await expect(framework.adapt(problem, progress)).resolves.not.toThrow();
    });
  });
});

describe("Design Thinking Framework", () => {
  let problem: Problem;
  let context: Context;

  beforeEach(() => {
    problem = {
      id: "test-problem-2",
      description: "Design a mobile app to help elderly users manage medications",
      context: "Healthcare technology project focused on user experience and accessibility",
      constraints: ["Limited budget", "Must be accessible", "Simple interface required"],
      goals: ["Create user-friendly medication tracker", "Improve medication adherence"],
      complexity: "moderate",
      urgency: "medium",
    };

    context = {
      problem,
      evidence: ["Elderly users struggle with complex interfaces", "Medication errors are common"],
      constraints: ["Budget: $50,000", "Timeline: 6 months", "Must support iOS and Android"],
      goals: ["Improve user experience", "Reduce medication errors", "Increase adherence"],
    };
  });

  describe("Framework Metadata", () => {
    it("should have correct framework ID", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      expect(framework.id).toBe("design-thinking");
    });

    it("should have correct framework name", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      expect(framework.name).toBe("Design Thinking");
    });

    it("should have descriptive description", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      expect(framework.description).toContain("user-centered");
      expect(framework.description.length).toBeGreaterThan(20);
    });

    it("should be best suited for user-centered problems", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      expect(framework.bestSuitedFor).toBeDefined();
      expect(framework.bestSuitedFor.length).toBeGreaterThan(0);
    });
  });

  describe("Framework Steps", () => {
    it("should have exactly 5 phases", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      expect(framework.steps).toHaveLength(5);
    });

    it("should have phases in correct order: Empathize, Define, Ideate, Prototype, Test", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      expect(framework.steps[0].id).toBe("empathize");
      expect(framework.steps[0].name).toBe("Empathize");
      expect(framework.steps[0].order).toBe(0);

      expect(framework.steps[1].id).toBe("define");
      expect(framework.steps[1].name).toBe("Define");
      expect(framework.steps[1].order).toBe(1);

      expect(framework.steps[2].id).toBe("ideate");
      expect(framework.steps[2].name).toBe("Ideate");
      expect(framework.steps[2].order).toBe(2);

      expect(framework.steps[3].id).toBe("prototype");
      expect(framework.steps[3].name).toBe("Prototype");
      expect(framework.steps[3].order).toBe(3);

      expect(framework.steps[4].id).toBe("test");
      expect(framework.steps[4].name).toBe("Test");
      expect(framework.steps[4].order).toBe(4);
    });

    it("should have all phases with descriptions", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      framework.steps.forEach((step) => {
        expect(step.description).toBeDefined();
        expect(step.description.length).toBeGreaterThan(10);
      });
    });

    it("should have all phases marked as non-optional", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      framework.steps.forEach((step) => {
        expect(step.optional).toBe(false);
      });
    });
  });

  describe("Phase Execution", () => {
    it("should execute Empathize phase successfully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const empathizePhase = framework.steps[0];

      const result = await empathizePhase.execute(context, []);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("empathize");
      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.output.toLowerCase()).toContain("user");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should execute Define phase successfully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const definePhase = framework.steps[1];

      const previousResults: StepResult[] = [
        {
          stepId: "empathize",
          success: true,
          output: "User needs: Elderly users need simple medication tracking",
          insights: ["Users struggle with complex interfaces"],
          processingTime: 100,
          confidence: 0.8,
        },
      ];

      const result = await definePhase.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("define");
      expect(result.output.toLowerCase()).toContain("problem");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Ideate phase successfully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const ideatePhase = framework.steps[2];

      const previousResults: StepResult[] = [
        {
          stepId: "empathize",
          success: true,
          output: "User needs identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "define",
          success: true,
          output: "Problem statement: Create accessible medication tracker",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      const result = await ideatePhase.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("ideate");
      expect(result.output).toContain("idea");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Prototype phase successfully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const prototypePhase = framework.steps[3];

      const previousResults: StepResult[] = [
        {
          stepId: "empathize",
          success: true,
          output: "User needs identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "define",
          success: true,
          output: "Problem statement defined",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "ideate",
          success: true,
          output: "Multiple solution ideas generated",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
      ];

      const result = await prototypePhase.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("prototype");
      expect(result.output).toContain("prototype");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Test phase successfully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const testPhase = framework.steps[4];

      const previousResults: StepResult[] = [
        {
          stepId: "empathize",
          success: true,
          output: "User needs identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "define",
          success: true,
          output: "Problem statement defined",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "ideate",
          success: true,
          output: "Multiple solution ideas generated",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
        {
          stepId: "prototype",
          success: true,
          output: "Prototype created for testing",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      const result = await testPhase.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("test");
      expect(result.output).toContain("test");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Complete Framework Execution", () => {
    it("should execute complete framework successfully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const result: FrameworkResult = await framework.execute(problem, context);

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe("design-thinking");
      expect(result.frameworkName).toBe("Design Thinking");
      expect(result.steps).toHaveLength(5);
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should generate insights during execution", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const result = await framework.execute(problem, context);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it("should track progress through all phases", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const result = await framework.execute(problem, context);

      expect(result.progress).toBeDefined();
      expect(result.progress.completedSteps).toHaveLength(5);
      expect(result.progress.progressPercentage).toBe(100);
      expect(result.progress.totalSteps).toBe(5);
    });

    it("should complete execution within reasonable time", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const startTime = Date.now();
      await framework.execute(problem, context);
      const executionTime = Date.now() - startTime;

      // Should complete within 5 seconds as per requirements
      expect(executionTime).toBeLessThan(5000);
    });

    it("should demonstrate user-centered approach", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const result = await framework.execute(problem, context);

      // Check that user-centered language appears in outputs
      const allOutputs = result.steps.map((s) => s.output.toLowerCase()).join(" ");
      expect(allOutputs).toMatch(/user|empathy|need|experience/);
    });

    it("should focus on innovation", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const result = await framework.execute(problem, context);

      // Check that innovation-focused language appears
      const allOutputs = result.steps.map((s) => s.output.toLowerCase()).join(" ");
      expect(allOutputs).toMatch(/idea|creative|solution|prototype|innovation/);
    });
  });

  describe("Phase Validation", () => {
    it("should validate Empathize phase with valid context", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const empathizePhase = framework.steps[0];

      const validation = await empathizePhase.validate(context, []);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("should validate Define phase requires Empathize results", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const definePhase = framework.steps[1];

      // Should fail without previous results
      const validationWithoutResults = await definePhase.validate(context, []);
      expect(validationWithoutResults.valid).toBe(false);
      expect(validationWithoutResults.issues.length).toBeGreaterThan(0);

      // Should pass with previous results
      const previousResults: StepResult[] = [
        {
          stepId: "empathize",
          success: true,
          output: "User needs identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ];
      const validationWithResults = await definePhase.validate(context, previousResults);
      expect(validationWithResults.valid).toBe(true);
    });

    it("should validate Ideate phase requires Define results", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();
      const ideatePhase = framework.steps[2];

      // Should fail without Define results
      const validationWithoutDefine = await ideatePhase.validate(context, [
        {
          stepId: "empathize",
          success: true,
          output: "User needs",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ]);
      expect(validationWithoutDefine.valid).toBe(false);

      // Should pass with Define results
      const validationWithDefine = await ideatePhase.validate(context, [
        {
          stepId: "empathize",
          success: true,
          output: "User needs",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "define",
          success: true,
          output: "Problem defined",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ]);
      expect(validationWithDefine.valid).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing problem description gracefully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const invalidProblem = { ...problem, description: "" };
      const invalidContext = { ...context, problem: invalidProblem };

      const result = await framework.execute(invalidProblem, invalidContext);

      // Should still complete but may have lower confidence
      expect(result).toBeDefined();
      expect(result.frameworkId).toBe("design-thinking");
    });

    it("should handle empty evidence array", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const contextWithoutEvidence = { ...context, evidence: [] };

      const result = await framework.execute(problem, contextWithoutEvidence);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle missing goals gracefully", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const contextWithoutGoals = { ...context, goals: [] };

      const result = await framework.execute(problem, contextWithoutGoals);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Adaptation", () => {
    it("should have adapt method", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      expect(framework.adapt).toBeDefined();
      expect(typeof framework.adapt).toBe("function");
    });

    it("should call adapt method without errors", async () => {
      const { DesignThinkingFramework } = await import(
        "../../../framework/frameworks/design-thinking.js"
      );
      const framework = new DesignThinkingFramework();

      const progress = {
        currentStep: "empathize",
        completedSteps: [],
        totalSteps: 5,
        progressPercentage: 0,
        obstacles: [],
        adaptations: [],
      };

      await expect(framework.adapt(problem, progress)).resolves.not.toThrow();
    });
  });
});

describe("Systems Thinking Framework", () => {
  let problem: Problem;
  let context: Context;

  beforeEach(() => {
    problem = {
      id: "test-problem-3",
      description: "Reduce traffic congestion in downtown area",
      context:
        "Urban planning challenge involving multiple interconnected systems: transportation, business, residential, and environmental",
      constraints: [
        "Limited budget for infrastructure",
        "Cannot disrupt existing businesses",
        "Must maintain emergency vehicle access",
      ],
      goals: [
        "Reduce average commute time by 20%",
        "Improve air quality",
        "Maintain business accessibility",
      ],
      complexity: "complex",
      urgency: "medium",
    };

    context = {
      problem,
      evidence: [
        "Peak hour traffic increased 30% in last 5 years",
        "Public transit usage declined 15%",
        "Parking shortage in commercial areas",
        "Air quality violations during rush hours",
      ],
      constraints: [
        "Budget: $5 million",
        "Timeline: 2 years",
        "Must preserve historic district",
        "Coordinate with 5 city departments",
      ],
      goals: [
        "Reduce congestion",
        "Improve public transit",
        "Enhance walkability",
        "Reduce emissions",
      ],
    };
  });

  describe("Framework Metadata", () => {
    it("should have correct framework ID", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      expect(framework.id).toBe("systems-thinking");
    });

    it("should have correct framework name", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      expect(framework.name).toBe("Systems Thinking");
    });

    it("should have descriptive description", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      expect(framework.description).toContain("interconnected");
      expect(framework.description.length).toBeGreaterThan(20);
    });

    it("should be best suited for complex interconnected problems", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      expect(framework.bestSuitedFor).toBeDefined();
      expect(framework.bestSuitedFor.length).toBeGreaterThan(0);
    });
  });

  describe("Framework Steps", () => {
    it("should have exactly 5 steps", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      expect(framework.steps).toHaveLength(5);
    });

    it("should have steps in correct order: Boundary, Components, Relationships, Feedback, Leverage", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      expect(framework.steps[0].id).toBe("boundary");
      expect(framework.steps[0].name).toBe("Define Boundary");
      expect(framework.steps[0].order).toBe(0);

      expect(framework.steps[1].id).toBe("components");
      expect(framework.steps[1].name).toBe("Identify Components");
      expect(framework.steps[1].order).toBe(1);

      expect(framework.steps[2].id).toBe("relationships");
      expect(framework.steps[2].name).toBe("Map Relationships");
      expect(framework.steps[2].order).toBe(2);

      expect(framework.steps[3].id).toBe("feedback");
      expect(framework.steps[3].name).toBe("Analyze Feedback Loops");
      expect(framework.steps[3].order).toBe(3);

      expect(framework.steps[4].id).toBe("leverage");
      expect(framework.steps[4].name).toBe("Find Leverage Points");
      expect(framework.steps[4].order).toBe(4);
    });

    it("should have all steps with descriptions", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      framework.steps.forEach((step) => {
        expect(step.description).toBeDefined();
        expect(step.description.length).toBeGreaterThan(10);
      });
    });

    it("should have all steps marked as non-optional", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      framework.steps.forEach((step) => {
        expect(step.optional).toBe(false);
      });
    });
  });

  describe("Step Execution", () => {
    it("should execute Define Boundary step successfully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const boundaryStep = framework.steps[0];

      const result = await boundaryStep.execute(context, []);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("boundary");
      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.output.toLowerCase()).toContain("system");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should execute Identify Components step successfully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const componentsStep = framework.steps[1];

      const previousResults: StepResult[] = [
        {
          stepId: "boundary",
          success: true,
          output: "System boundary: Downtown transportation network",
          insights: ["Boundary defined clearly"],
          processingTime: 100,
          confidence: 0.8,
        },
      ];

      const result = await componentsStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("components");
      expect(result.output.toLowerCase()).toContain("component");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Map Relationships step successfully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const relationshipsStep = framework.steps[2];

      const previousResults: StepResult[] = [
        {
          stepId: "boundary",
          success: true,
          output: "System boundary defined",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "components",
          success: true,
          output: "Components: roads, transit, parking, businesses",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      const result = await relationshipsStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("relationships");
      expect(result.output.toLowerCase()).toContain("relationship");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Analyze Feedback Loops step successfully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const feedbackStep = framework.steps[3];

      const previousResults: StepResult[] = [
        {
          stepId: "boundary",
          success: true,
          output: "System boundary defined",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "components",
          success: true,
          output: "Components identified",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "relationships",
          success: true,
          output: "Relationships mapped between components",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
      ];

      const result = await feedbackStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("feedback");
      expect(result.output.toLowerCase()).toContain("feedback");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Find Leverage Points step successfully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const leverageStep = framework.steps[4];

      const previousResults: StepResult[] = [
        {
          stepId: "boundary",
          success: true,
          output: "System boundary defined",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "components",
          success: true,
          output: "Components identified",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "relationships",
          success: true,
          output: "Relationships mapped",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
        {
          stepId: "feedback",
          success: true,
          output: "Feedback loops identified: congestion reinforcing loop",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      const result = await leverageStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("leverage");
      expect(result.output.toLowerCase()).toContain("leverage");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Complete Framework Execution", () => {
    it("should execute complete framework successfully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const result: FrameworkResult = await framework.execute(problem, context);

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe("systems-thinking");
      expect(result.frameworkName).toBe("Systems Thinking");
      expect(result.steps).toHaveLength(5);
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should generate insights during execution", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const result = await framework.execute(problem, context);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it("should track progress through all steps", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const result = await framework.execute(problem, context);

      expect(result.progress).toBeDefined();
      expect(result.progress.completedSteps).toHaveLength(5);
      expect(result.progress.progressPercentage).toBe(100);
      expect(result.progress.totalSteps).toBe(5);
    });

    it("should complete execution within reasonable time", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const startTime = Date.now();
      await framework.execute(problem, context);
      const executionTime = Date.now() - startTime;

      // Should complete within 5 seconds as per requirements
      expect(executionTime).toBeLessThan(5000);
    });

    it("should demonstrate systems analysis approach", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const result = await framework.execute(problem, context);

      // Check that systems-focused language appears in outputs
      const allOutputs = result.steps.map((s) => s.output.toLowerCase()).join(" ");
      expect(allOutputs).toMatch(/system|component|relationship|feedback|interconnect/);
    });

    it("should identify interconnections", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const result = await framework.execute(problem, context);

      // Check that interconnection mapping appears
      const relationshipsOutput = result.steps.find((s) => s.stepId === "relationships");
      expect(relationshipsOutput).toBeDefined();
      expect(relationshipsOutput?.output.toLowerCase()).toMatch(/relationship|connect|interact/);
    });

    it("should detect feedback loops", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const result = await framework.execute(problem, context);

      // Check that feedback loop analysis appears
      const feedbackOutput = result.steps.find((s) => s.stepId === "feedback");
      expect(feedbackOutput).toBeDefined();
      expect(feedbackOutput?.output.toLowerCase()).toMatch(/feedback|loop|reinforc|balanc/);
    });
  });

  describe("Step Validation", () => {
    it("should validate Define Boundary step with valid context", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const boundaryStep = framework.steps[0];

      const validation = await boundaryStep.validate(context, []);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it("should validate Identify Components step requires Boundary results", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const componentsStep = framework.steps[1];

      // Should fail without previous results
      const validationWithoutResults = await componentsStep.validate(context, []);
      expect(validationWithoutResults.valid).toBe(false);
      expect(validationWithoutResults.issues.length).toBeGreaterThan(0);

      // Should pass with previous results
      const previousResults: StepResult[] = [
        {
          stepId: "boundary",
          success: true,
          output: "Boundary defined",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ];
      const validationWithResults = await componentsStep.validate(context, previousResults);
      expect(validationWithResults.valid).toBe(true);
    });

    it("should validate Map Relationships step requires Components results", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();
      const relationshipsStep = framework.steps[2];

      // Should fail without Components results
      const validationWithoutComponents = await relationshipsStep.validate(context, [
        {
          stepId: "boundary",
          success: true,
          output: "Boundary defined",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ]);
      expect(validationWithoutComponents.valid).toBe(false);

      // Should pass with Components results
      const validationWithComponents = await relationshipsStep.validate(context, [
        {
          stepId: "boundary",
          success: true,
          output: "Boundary defined",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "components",
          success: true,
          output: "Components identified",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ]);
      expect(validationWithComponents.valid).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing problem description gracefully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const invalidProblem = { ...problem, description: "" };
      const invalidContext = { ...context, problem: invalidProblem };

      const result = await framework.execute(invalidProblem, invalidContext);

      // Should still complete but may have lower confidence
      expect(result).toBeDefined();
      expect(result.frameworkId).toBe("systems-thinking");
    });

    it("should handle empty evidence array", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const contextWithoutEvidence = { ...context, evidence: [] };

      const result = await framework.execute(problem, contextWithoutEvidence);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle missing goals gracefully", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const contextWithoutGoals = { ...context, goals: [] };

      const result = await framework.execute(problem, contextWithoutGoals);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Adaptation", () => {
    it("should have adapt method", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      expect(framework.adapt).toBeDefined();
      expect(typeof framework.adapt).toBe("function");
    });

    it("should call adapt method without errors", async () => {
      const { SystemsThinkingFramework } = await import(
        "../../../framework/frameworks/systems-thinking.js"
      );
      const framework = new SystemsThinkingFramework();

      const progress = {
        currentStep: "boundary",
        completedSteps: [],
        totalSteps: 5,
        progressPercentage: 0,
        obstacles: [],
        adaptations: [],
      };

      await expect(framework.adapt(problem, progress)).resolves.not.toThrow();
    });
  });
});

describe("Critical Thinking Framework", () => {
  let problem: Problem;
  let context: Context;

  beforeEach(() => {
    problem = {
      id: "test-problem-4",
      description: "Should we implement a new company-wide remote work policy?",
      context:
        "Corporate policy decision requiring careful evaluation of arguments, assumptions, and evidence from multiple stakeholders",
      constraints: [
        "Must maintain productivity",
        "Need to consider employee satisfaction",
        "Budget for office space",
      ],
      goals: [
        "Make evidence-based decision",
        "Consider all stakeholder perspectives",
        "Identify potential risks and benefits",
      ],
      complexity: "moderate",
      urgency: "medium",
    };

    context = {
      problem,
      evidence: [
        "Employee survey shows 75% prefer remote work",
        "Productivity metrics unchanged during trial period",
        "Office space costs $500k annually",
        "Some teams report communication challenges",
      ],
      constraints: [
        "Decision needed within 2 months",
        "Must align with company values",
        "Legal compliance required",
      ],
      goals: [
        "Evaluate all arguments objectively",
        "Challenge assumptions",
        "Make logical decision",
      ],
    };
  });

  describe("Framework Metadata", () => {
    it("should have correct framework ID", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      expect(framework.id).toBe("critical-thinking");
    });

    it("should have correct framework name", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      expect(framework.name).toBe("Critical Thinking");
    });

    it("should have descriptive description", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      expect(framework.description).toContain("argument");
      expect(framework.description.length).toBeGreaterThan(20);
    });

    it("should be best suited for argument evaluation and logical reasoning", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      expect(framework.bestSuitedFor).toBeDefined();
      expect(framework.bestSuitedFor.length).toBeGreaterThan(0);
    });
  });

  describe("Framework Steps", () => {
    it("should have exactly 5 steps", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      expect(framework.steps).toHaveLength(5);
    });

    it("should have steps in correct order: Identify, Evaluate, Examine, Assess, Validate", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      expect(framework.steps[0].id).toBe("identify");
      expect(framework.steps[0].name).toBe("Identify Claims");
      expect(framework.steps[0].order).toBe(0);

      expect(framework.steps[1].id).toBe("evaluate");
      expect(framework.steps[1].name).toBe("Evaluate Evidence");
      expect(framework.steps[1].order).toBe(1);

      expect(framework.steps[2].id).toBe("examine");
      expect(framework.steps[2].name).toBe("Examine Assumptions");
      expect(framework.steps[2].order).toBe(2);

      expect(framework.steps[3].id).toBe("assess");
      expect(framework.steps[3].name).toBe("Assess Logic");
      expect(framework.steps[3].order).toBe(3);

      expect(framework.steps[4].id).toBe("validate");
      expect(framework.steps[4].name).toBe("Validate Conclusions");
      expect(framework.steps[4].order).toBe(4);
    });

    it("should have all steps with descriptions", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      framework.steps.forEach((step) => {
        expect(step.description).toBeDefined();
        expect(step.description.length).toBeGreaterThan(10);
      });
    });

    it("should have all steps marked as non-optional", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      framework.steps.forEach((step) => {
        expect(step.optional).toBe(false);
      });
    });
  });

  describe("Step Execution", () => {
    it("should execute Identify Claims step successfully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const identifyStep = framework.steps[0];

      const result = await identifyStep.execute(context, []);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("identify");
      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.output.toLowerCase()).toContain("claim");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should execute Evaluate Evidence step successfully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const evaluateStep = framework.steps[1];

      const previousResults: StepResult[] = [
        {
          stepId: "identify",
          success: true,
          output: "Claims identified: Remote work improves satisfaction, maintains productivity",
          insights: ["Multiple claims found"],
          processingTime: 100,
          confidence: 0.8,
        },
      ];

      const result = await evaluateStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("evaluate");
      expect(result.output.toLowerCase()).toContain("evidence");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Examine Assumptions step successfully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const examineStep = framework.steps[2];

      const previousResults: StepResult[] = [
        {
          stepId: "identify",
          success: true,
          output: "Claims identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "evaluate",
          success: true,
          output: "Evidence evaluated: Survey data credible, productivity metrics reliable",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      const result = await examineStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("examine");
      expect(result.output.toLowerCase()).toContain("assumption");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Assess Logic step successfully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const assessStep = framework.steps[3];

      const previousResults: StepResult[] = [
        {
          stepId: "identify",
          success: true,
          output: "Claims identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "evaluate",
          success: true,
          output: "Evidence evaluated",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "examine",
          success: true,
          output: "Assumptions examined: Assumes all roles suitable for remote work",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
      ];

      const result = await assessStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("assess");
      expect(result.output.toLowerCase()).toContain("logic");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Validate Conclusions step successfully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const validateStep = framework.steps[4];

      const previousResults: StepResult[] = [
        {
          stepId: "identify",
          success: true,
          output: "Claims identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "evaluate",
          success: true,
          output: "Evidence evaluated",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "examine",
          success: true,
          output: "Assumptions examined",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
        {
          stepId: "assess",
          success: true,
          output: "Logic assessed: Arguments generally sound with minor gaps",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      const result = await validateStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("validate");
      expect(result.output.toLowerCase()).toContain("conclusion");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Complete Framework Execution", () => {
    it("should execute complete framework successfully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const result: FrameworkResult = await framework.execute(problem, context);

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe("critical-thinking");
      expect(result.frameworkName).toBe("Critical Thinking");
      expect(result.steps).toHaveLength(5);
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should generate insights during execution", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const result = await framework.execute(problem, context);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it("should track progress through all steps", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const result = await framework.execute(problem, context);

      expect(result.progress).toBeDefined();
      expect(result.progress.completedSteps).toHaveLength(5);
      expect(result.progress.progressPercentage).toBe(100);
      expect(result.progress.totalSteps).toBe(5);
    });

    it("should complete execution within reasonable time", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const startTime = Date.now();
      await framework.execute(problem, context);
      const executionTime = Date.now() - startTime;

      // Should complete within 5 seconds as per requirements
      expect(executionTime).toBeLessThan(5000);
    });

    it("should demonstrate critical analysis approach", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const result = await framework.execute(problem, context);

      // Should show evidence of critical analysis
      const allOutput = result.steps
        .map((s) => s.output)
        .join(" ")
        .toLowerCase();
      expect(
        allOutput.includes("claim") ||
          allOutput.includes("evidence") ||
          allOutput.includes("assumption") ||
          allOutput.includes("logic")
      ).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing evidence gracefully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const contextWithoutEvidence = { ...context, evidence: [] };

      const result = await framework.execute(problem, contextWithoutEvidence);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle missing constraints gracefully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const contextWithoutConstraints = { ...context, constraints: [] };

      const result = await framework.execute(problem, contextWithoutConstraints);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle missing goals gracefully", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const contextWithoutGoals = { ...context, goals: [] };

      const result = await framework.execute(problem, contextWithoutGoals);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Step Validation", () => {
    it("should validate Evaluate Evidence step requires Identify Claims", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const evaluateStep = framework.steps[1];

      // Missing previous step result
      const validation = await evaluateStep.validate(context, []);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Claims must be identified before evaluating evidence");
    });

    it("should validate Examine Assumptions step requires Evaluate Evidence", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const examineStep = framework.steps[2];

      const previousResults: StepResult[] = [
        {
          stepId: "identify",
          success: true,
          output: "Claims identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
      ];

      // Missing evaluate step result
      const validation = await examineStep.validate(context, previousResults);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain(
        "Evidence must be evaluated before examining assumptions"
      );
    });

    it("should validate Assess Logic step requires Examine Assumptions", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const assessStep = framework.steps[3];

      const previousResults: StepResult[] = [
        {
          stepId: "identify",
          success: true,
          output: "Claims identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "evaluate",
          success: true,
          output: "Evidence evaluated",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
      ];

      // Missing examine step result
      const validation = await assessStep.validate(context, previousResults);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Assumptions must be examined before assessing logic");
    });

    it("should validate Validate Conclusions step requires Assess Logic", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();
      const validateStep = framework.steps[4];

      const previousResults: StepResult[] = [
        {
          stepId: "identify",
          success: true,
          output: "Claims identified",
          insights: [],
          processingTime: 100,
          confidence: 0.8,
        },
        {
          stepId: "evaluate",
          success: true,
          output: "Evidence evaluated",
          insights: [],
          processingTime: 100,
          confidence: 0.75,
        },
        {
          stepId: "examine",
          success: true,
          output: "Assumptions examined",
          insights: [],
          processingTime: 100,
          confidence: 0.7,
        },
      ];

      // Missing assess step result
      const validation = await validateStep.validate(context, previousResults);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Logic must be assessed before validating conclusions");
    });
  });

  describe("Adaptation", () => {
    it("should have adapt method", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      expect(framework.adapt).toBeDefined();
      expect(typeof framework.adapt).toBe("function");
    });

    it("should call adapt method without errors", async () => {
      const { CriticalThinkingFramework } = await import(
        "../../../framework/frameworks/critical-thinking.js"
      );
      const framework = new CriticalThinkingFramework();

      const progress = {
        currentStep: "identify",
        completedSteps: [],
        totalSteps: 5,
        progressPercentage: 0,
        obstacles: [],
        adaptations: [],
      };

      await expect(framework.adapt(problem, progress)).resolves.not.toThrow();
    });
  });
});

describe("Root Cause Analysis Framework", () => {
  let problem: Problem;
  let context: Context;

  beforeEach(() => {
    problem = {
      id: "test-problem-5",
      description: "Production system experiencing intermittent database connection failures",
      context:
        "Critical production issue requiring systematic diagnosis to identify and address the underlying cause rather than symptoms",
      constraints: [
        "System must remain operational during investigation",
        "Limited access to production environment",
        "Need to minimize customer impact",
      ],
      goals: [
        "Identify root cause of failures",
        "Prevent recurrence",
        "Implement permanent solution",
      ],
      complexity: "complex",
      urgency: "high",
    };

    context = {
      problem,
      evidence: [
        "Connection failures occur every 2-3 hours",
        "Error logs show 'connection timeout' messages",
        "Database server CPU usage spikes to 95% during failures",
        "Recent deployment changed connection pool configuration",
        "Monitoring shows connection pool exhaustion",
      ],
      constraints: [
        "Cannot restart production database",
        "Must maintain service availability",
        "Limited time for investigation",
      ],
      goals: [
        "Diagnose root cause systematically",
        "Identify contributing factors",
        "Recommend permanent fix",
      ],
    };
  });

  describe("Framework Metadata", () => {
    it("should have correct framework ID", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      expect(framework.id).toBe("root-cause-analysis");
    });

    it("should have correct framework name", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      expect(framework.name).toBe("Root Cause Analysis");
    });

    it("should have descriptive description", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      expect(framework.description).toContain("root cause");
      expect(framework.description.length).toBeGreaterThan(20);
    });

    it("should be best suited for problem diagnosis and failure analysis", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      expect(framework.bestSuitedFor).toBeDefined();
      expect(framework.bestSuitedFor.length).toBeGreaterThan(0);
    });
  });

  describe("Framework Steps", () => {
    it("should have exactly 5 steps", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      expect(framework.steps).toHaveLength(5);
    });

    it("e steps in correct order: Define, Collect, Identify, Determine, Recommend", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      expect(framework.steps[0].id).toBe("define");
      expect(framework.steps[0].name).toBe("Define Problem");
      expect(framework.steps[0].order).toBe(0);

      expect(framework.steps[1].id).toBe("collect");
      expect(framework.steps[1].name).toBe("Collect Data");
      expect(framework.steps[1].order).toBe(1);

      expect(framework.steps[2].id).toBe("identify");
      expect(framework.steps[2].name).toBe("Identify Causal Factors");
      expect(framework.steps[2].order).toBe(2);

      expect(framework.steps[3].id).toBe("determine");
      expect(framework.steps[3].name).toBe("Determine Root Cause");
      expect(framework.steps[3].order).toBe(3);

      expect(framework.steps[4].id).toBe("recommend");
      expect(framework.steps[4].name).toBe("Recommend Solutions");
      expect(framework.steps[4].order).toBe(4);
    });

    it("should have all steps with descriptions", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      framework.steps.forEach((step) => {
        expect(step.description).toBeDefined();
        expect(step.description.length).toBeGreaterThan(10);
      });
    });

    it("should have all steps marked as non-optional", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      framework.steps.forEach((step) => {
        expect(step.optional).toBe(false);
      });
    });
  });

  describe("Step Execution", () => {
    it("should execute Define Problem step successfully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const defineStep = framework.steps[0];

      const result = await defineStep.execute(context, []);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("define");
      expect(result.output).toBeDefined();
      expect(result.output.length).toBeGreaterThan(0);
      expect(result.output.toLowerCase()).toContain("problem");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should execute Collect Data step successfully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const collectStep = framework.steps[1];

      const previousResults: StepResult[] = [
        {
          stepId: "define",
          success: true,
          output: "Problem defined: Intermittent database connection failures in production",
          insights: ["Problem scope clarified"],
          processingTime: 100,
          confidence: 0.85,
        },
      ];

      const result = await collectStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("collect");
      expect(result.output.toLowerCase()).toContain("data");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Identify Causal Factors step successfully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const identifyStep = framework.steps[2];

      const previousResults: StepResult[] = [
        {
          stepId: "define",
          success: true,
          output: "Problem defined",
          insights: [],
          processingTime: 100,
          confidence: 0.85,
        },
        {
          stepId: "collect",
          success: true,
          output: "Data collected: Error logs, monitoring metrics, deployment history",
          insights: [],
          processingTime: 150,
          confidence: 0.8,
        },
      ];

      const result = await identifyStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("identify");
      expect(result.output.toLowerCase()).toContain("factor");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Determine Root Cause step successfully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const determineStep = framework.steps[3];

      const previousResults: StepResult[] = [
        {
          stepId: "define",
          success: true,
          output: "Problem defined",
          insights: [],
          processingTime: 100,
          confidence: 0.85,
        },
        {
          stepId: "collect",
          success: true,
          output: "Data collected",
          insights: [],
          processingTime: 150,
          confidence: 0.8,
        },
        {
          stepId: "identify",
          success: true,
          output: "Causal factors: Connection pool exhaustion, CPU spikes, recent config change",
          insights: [],
          processingTime: 200,
          confidence: 0.75,
        },
      ];

      const result = await determineStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("determine");
      expect(result.output.toLowerCase()).toContain("root cause");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should execute Recommend Solutions step successfully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const recommendStep = framework.steps[4];

      const previousResults: StepResult[] = [
        {
          stepId: "define",
          success: true,
          output: "Problem defined",
          insights: [],
          processingTime: 100,
          confidence: 0.85,
        },
        {
          stepId: "collect",
          success: true,
          output: "Data collected",
          insights: [],
          processingTime: 150,
          confidence: 0.8,
        },
        {
          stepId: "identify",
          success: true,
          output: "Causal factors identified",
          insights: [],
          processingTime: 200,
          confidence: 0.75,
        },
        {
          stepId: "determine",
          success: true,
          output: "Root cause: Insufficient connection pool size after recent deployment",
          insights: [],
          processingTime: 180,
          confidence: 0.8,
        },
      ];

      const result = await recommendStep.execute(context, previousResults);

      expect(result.success).toBe(true);
      expect(result.stepId).toBe("recommend");
      expect(result.output.toLowerCase()).toContain("solution");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Complete Framework Execution", () => {
    it("should execute complete framework successfully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const result: FrameworkResult = await framework.execute(problem, context);

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe("root-cause-analysis");
      expect(result.frameworkName).toBe("Root Cause Analysis");
      expect(result.steps).toHaveLength(5);
      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should generate insights during execution", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const result = await framework.execute(problem, context);

      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });

    it("should track progress through all steps", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const result = await framework.execute(problem, context);

      expect(result.progress).toBeDefined();
      expect(result.progress.completedSteps).toHaveLength(5);
      expect(result.progress.progressPercentage).toBe(100);
      expect(result.progress.totalSteps).toBe(5);
    });

    it("should complete execution within reasonable time", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const startTime = Date.now();
      await framework.execute(problem, context);
      const executionTime = Date.now() - startTime;

      // Should complete within 5 seconds as per requirements
      expect(executionTime).toBeLessThan(5000);
    });

    it("should demonstrate systematic diagnostic approach", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const result = await framework.execute(problem, context);

      // Should show evidence of systematic diagnosis
      const allOutput = result.steps
        .map((s) => s.output)
        .join(" ")
        .toLowerCase();
      expect(
        allOutput.includes("problem") ||
          allOutput.includes("data") ||
          allOutput.includes("factor") ||
          allOutput.includes("root cause") ||
          allOutput.includes("solution")
      ).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing evidence gracefully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const contextWithoutEvidence = { ...context, evidence: [] };

      const result = await framework.execute(problem, contextWithoutEvidence);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle missing constraints gracefully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const contextWithoutConstraints = { ...context, constraints: [] };

      const result = await framework.execute(problem, contextWithoutConstraints);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should handle missing goals gracefully", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const contextWithoutGoals = { ...context, goals: [] };

      const result = await framework.execute(problem, contextWithoutGoals);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Step Validation", () => {
    it("should validate Collect Data step requires Define Problem", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const collectStep = framework.steps[1];

      // Missing previous step result
      const validation = await collectStep.validate(context, []);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain("Problem must be defined before collecting data");
    });

    it("should validate Identify Causal Factors step requires Collect Data", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const identifyStep = framework.steps[2];

      const previousResults: StepResult[] = [
        {
          stepId: "define",
          success: true,
          output: "Problem defined",
          insights: [],
          processingTime: 100,
          confidence: 0.85,
        },
      ];

      // Missing collect step result
      const validation = await identifyStep.validate(context, previousResults);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain(
        "Data must be collected before identifying causal factors"
      );
    });

    it("should validate Determine Root Cause step requires Identify Causal Factors", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const determineStep = framework.steps[3];

      const previousResults: StepResult[] = [
        {
          stepId: "define",
          success: true,
          output: "Problem defined",
          insights: [],
          processingTime: 100,
          confidence: 0.85,
        },
        {
          stepId: "collect",
          success: true,
          output: "Data collected",
          insights: [],
          processingTime: 150,
          confidence: 0.8,
        },
      ];

      // Missing identify step result
      const validation = await determineStep.validate(context, previousResults);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain(
        "Causal factors must be identified before determining root cause"
      );
    });

    it("should validate Recommend Solutions step requires Determine Root Cause", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();
      const recommendStep = framework.steps[4];

      const previousResults: StepResult[] = [
        {
          stepId: "define",
          success: true,
          output: "Problem defined",
          insights: [],
          processingTime: 100,
          confidence: 0.85,
        },
        {
          stepId: "collect",
          success: true,
          output: "Data collected",
          insights: [],
          processingTime: 150,
          confidence: 0.8,
        },
        {
          stepId: "identify",
          success: true,
          output: "Causal factors identified",
          insights: [],
          processingTime: 120,
          confidence: 0.75,
        },
      ];

      // Missing determine step result
      const validation = await recommendStep.validate(context, previousResults);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain(
        "Root cause must be determined before recommending solutions"
      );
    });
  });

  describe("Adaptation", () => {
    it("should have adapt method", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      expect(framework.adapt).toBeDefined();
      expect(typeof framework.adapt).toBe("function");
    });

    it("should call adapt method without errors", async () => {
      const { RootCauseAnalysisFramework } = await import(
        "../../../framework/frameworks/root-cause-analysis.js"
      );
      const framework = new RootCauseAnalysisFramework();

      const progress = {
        currentStep: "define",
        completedSteps: [],
        totalSteps: 5,
        progressPercentage: 0,
        obstacles: [],
        adaptations: [],
      };

      await expect(framework.adapt(problem, progress)).resolves.not.toThrow();
    });
  });
});
