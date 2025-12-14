/**
 * Tests for BaseFramework abstract class
 *
 * Validates common framework execution logic, step management,
 * progress tracking, adaptation mechanisms, and error handling.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { BaseFramework } from "../../../framework/base-framework.js";
import type {
  Context,
  ExecutionProgress,
  FrameworkStep,
  Problem,
  StepResult,
} from "../../../framework/types.js";

/**
 * Concrete implementation of BaseFramework for testing
 */
class TestFramework extends BaseFramework {
  constructor() {
    super({
      id: "test-framework",
      name: "Test Framework",
      description: "A test framework for unit testing",
      bestSuitedFor: [],
    });
  }

  protected createSteps(): FrameworkStep[] {
    return [
      {
        id: "step1",
        name: "Step 1",
        description: "First step",
        order: 0,
        optional: false,
        execute: async (_context: Context, _previousResults: StepResult[]) => {
          return {
            stepId: "step1",
            success: true,
            output: "Step 1 output",
            insights: ["Step 1 insight"],
            processingTime: 100,
            confidence: 0.9,
          };
        },
        validate: async () => ({ valid: true, issues: [] }),
      },
      {
        id: "step2",
        name: "Step 2",
        description: "Second step",
        order: 1,
        optional: false,
        execute: async (_context: Context, _previousResults: StepResult[]) => {
          return {
            stepId: "step2",
            success: true,
            output: "Step 2 output",
            insights: ["Step 2 insight"],
            processingTime: 150,
            confidence: 0.85,
          };
        },
        validate: async () => ({ valid: true, issues: [] }),
      },
    ];
  }
}

describe("BaseFramework", () => {
  let framework: TestFramework;
  let mockProblem: Problem;
  let mockContext: Context;

  beforeEach(() => {
    framework = new TestFramework();
    mockProblem = {
      id: "test-problem",
      description: "Test problem",
      goals: ["Test goal"],
      constraints: [],
      context: "Test context",
    };
    mockContext = {
      problem: mockProblem,
      evidence: [],
      constraints: [],
      goals: ["Test goal"],
    };
  });

  describe("Constructor", () => {
    it("should initialize with required properties", () => {
      expect(framework.id).toBe("test-framework");
      expect(framework.name).toBe("Test Framework");
      expect(framework.description).toBe("A test framework for unit testing");
      expect(framework.bestSuitedFor).toEqual([]);
    });

    it("should initialize steps from createSteps", () => {
      expect(framework.steps).toHaveLength(2);
      expect(framework.steps[0].id).toBe("step1");
      expect(framework.steps[1].id).toBe("step2");
    });
  });

  describe("execute method", () => {
    it("should execute all steps in order", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      expect(result.success).toBe(true);
      expect(result.frameworkId).toBe("test-framework");
      expect(result.frameworkName).toBe("Test Framework");
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].stepId).toBe("step1");
      expect(result.steps[1].stepId).toBe("step2");
    });

    it("should track progress during execution", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      expect(result.progress.totalSteps).toBe(2);
      expect(result.progress.completedSteps).toHaveLength(2);
      expect(result.progress.progressPercentage).toBe(100);
    });

    it("should collect insights from all steps", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      expect(result.insights).toContain("Step 1 insight");
      expect(result.insights).toContain("Step 2 insight");
    });

    it("should calculate total processing time", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTime).toBe("number");
    });

    it("should calculate overall confidence", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should generate conclusion from step outputs", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      expect(result.conclusion).toBeDefined();
      expect(result.conclusion.length).toBeGreaterThan(0);
    });

    it("should handle step failures gracefully", async () => {
      class FailingFramework extends BaseFramework {
        constructor() {
          super({
            id: "failing-framework",
            name: "Failing Framework",
            description: "Test",
            bestSuitedFor: [],
          });
        }

        protected createSteps(): FrameworkStep[] {
          return [
            {
              id: "failing-step",
              name: "Failing Step",
              description: "This step fails",
              order: 0,
              optional: false,
              execute: async () => {
                throw new Error("Step execution failed");
              },
              validate: async () => ({ valid: true, issues: [] }),
            },
          ];
        }
      }

      const failingFramework = new FailingFramework();
      const result = await failingFramework.execute(mockProblem, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("adapt method", () => {
    it("should handle adaptation requests", async () => {
      const mockProgress: ExecutionProgress = {
        currentStep: "step1",
        completedSteps: [],
        totalSteps: 2,
        progressPercentage: 0,
        obstacles: [],
        adaptations: [],
      };

      await expect(framework.adapt(mockProblem, mockProgress)).resolves.not.toThrow();
    });

    it("should handle step validation failures", async () => {
      class ValidationFailureFramework extends BaseFramework {
        constructor() {
          super({
            id: "validation-failure-framework",
            name: "Validation Failure Framework",
            description: "Test validation failure",
            bestSuitedFor: [],
          });
        }

        protected createSteps(): FrameworkStep[] {
          return [
            {
              id: "invalid-step",
              name: "Invalid Step",
              description: "Step that fails validation",
              order: 0,
              optional: false,
              execute: async () => {
                return {
                  stepId: "invalid-step",
                  success: true,
                  output: "Output",
                  insights: [],
                  processingTime: 100,
                  confidence: 0.5,
                };
              },
              validate: async () => ({
                valid: false,
                issues: ["Missing required data", "Invalid format"],
              }),
            },
          ];
        }
      }

      const validationFramework = new ValidationFailureFramework();
      const result = await validationFramework.execute(mockProblem, mockContext);

      expect(result.obstacles.length).toBeGreaterThan(0);
      const validationObstacle = result.obstacles.find((o) =>
        o.description.includes("Step validation failed")
      );
      expect(validationObstacle).toBeDefined();
      expect(validationObstacle?.description).toContain("Missing required data");
      expect(validationObstacle?.description).toContain("Invalid format");
      expect(validationObstacle?.type).toBe("missing_information");
      expect(validationObstacle?.severity).toBe("medium");
    });

    it("should detect obstacles during execution", async () => {
      class ObstacleFramework extends BaseFramework {
        constructor() {
          super({
            id: "obstacle-framework",
            name: "Obstacle Framework",
            description: "Test",
            bestSuitedFor: [],
          });
        }

        protected createSteps(): FrameworkStep[] {
          return [
            {
              id: "obstacle-step",
              name: "Obstacle Step",
              description: "Step with obstacle",
              order: 0,
              optional: false,
              execute: async () => {
                return {
                  stepId: "obstacle-step",
                  success: true,
                  output: "Output",
                  insights: [],
                  processingTime: 100,
                  confidence: 0.5,
                  obstacles: [
                    {
                      id: "obs1",
                      type: "missing_information",
                      description: "Missing data",
                      severity: "medium",
                      detectedAt: new Date(),
                    },
                  ],
                };
              },
              validate: async () => ({ valid: true, issues: [] }),
            },
          ];
        }
      }

      const obstacleFramework = new ObstacleFramework();
      const result = await obstacleFramework.execute(mockProblem, mockContext);

      expect(result.obstacles.length).toBeGreaterThan(0);
      expect(result.obstacles[0].type).toBe("missing_information");
    });
  });

  describe("Progress tracking", () => {
    it("should update progress percentage correctly", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      expect(result.progress.progressPercentage).toBe(100);
      expect(result.progress.completedSteps).toEqual(["step1", "step2"]);
    });

    it("should track current step during execution", async () => {
      const result = await framework.execute(mockProblem, mockContext);

      // After completion, current step should be the last step
      expect(result.progress.currentStep).toBe("step2");
    });
  });

  describe("Error handling", () => {
    it("should catch and report errors", async () => {
      class ErrorFramework extends BaseFramework {
        constructor() {
          super({
            id: "error-framework",
            name: "Error Framework",
            description: "Test",
            bestSuitedFor: [],
          });
        }

        protected createSteps(): FrameworkStep[] {
          return [
            {
              id: "error-step",
              name: "Error Step",
              description: "Step that throws",
              order: 0,
              optional: false,
              execute: async () => {
                throw new Error("Execution error");
              },
              validate: async () => ({ valid: true, issues: [] }),
            },
          ];
        }
      }

      const errorFramework = new ErrorFramework();
      const result = await errorFramework.execute(mockProblem, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Execution error");
    });

    it("should handle all steps failing", async () => {
      class AllFailingFramework extends BaseFramework {
        constructor() {
          super({
            id: "all-failing-framework",
            name: "All Failing Framework",
            description: "Test all steps failing",
            bestSuitedFor: [],
          });
        }

        protected createSteps(): FrameworkStep[] {
          return [
            {
              id: "fail-step-1",
              name: "Fail Step 1",
              description: "First failing step",
              order: 0,
              optional: false,
              execute: async () => {
                return {
                  stepId: "fail-step-1",
                  success: false,
                  output: "",
                  insights: [],
                  processingTime: 50,
                  confidence: 0,
                };
              },
              validate: async () => ({ valid: true, issues: [] }),
            },
            {
              id: "fail-step-2",
              name: "Fail Step 2",
              description: "Second failing step",
              order: 1,
              optional: false,
              execute: async () => {
                return {
                  stepId: "fail-step-2",
                  success: false,
                  output: "",
                  insights: [],
                  processingTime: 50,
                  confidence: 0,
                };
              },
              validate: async () => ({ valid: true, issues: [] }),
            },
          ];
        }
      }

      const allFailingFramework = new AllFailingFramework();
      const result = await allFailingFramework.execute(mockProblem, mockContext);

      expect(result.conclusion).toContain("no successful steps");
      expect(result.steps.every((step) => !step.success)).toBe(true);
    });
  });
});
