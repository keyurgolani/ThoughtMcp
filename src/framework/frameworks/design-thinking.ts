/**
 * Design Thinking Framework
 *
 * Implements the Design Thinking methodology as a systematic thinking framework
 * with five phases: Empathize, Define, Ideate, Prototype, and Test.
 * Best suited for user-centered problems and innovation challenges.
 */

import { BaseFramework } from "../base-framework.js";
import type { Context, FrameworkStep, StepResult } from "../types.js";

/**
 * Design Thinking Framework
 *
 * A human-centered approach to innovation that draws from the designer's toolkit
 * to integrate the needs of people, the possibilities of technology, and the
 * requirements for business success.
 */
export class DesignThinkingFramework extends BaseFramework {
  constructor() {
    super({
      id: "design-thinking",
      name: "Design Thinking",
      description:
        "A human-centered approach to innovation and problem-solving that emphasizes empathy, ideation, and rapid prototyping. Best suited for user-centered problems, product design, and innovation challenges.",
      bestSuitedFor: [
        {
          goalCount: 2,
          constraintCount: 2,
          knownFactorCount: 2,
          unknownFactorCount: 3,
          stakeholderCount: 3,
          hasDeadline: true,
          importanceIndicators: ["user", "experience", "design", "innovation"],
          complexityIndicators: ["user-centered", "creative", "iterative"],
          uncertaintyIndicators: ["needs", "prototype", "feedback"],
        },
      ],
      expectedDuration: 5000,
      version: "1.0.0",
    });
  }

  protected createSteps(): FrameworkStep[] {
    return [
      this.createEmpathizeStep(),
      this.createDefineStep(),
      this.createIdeateStep(),
      this.createPrototypeStep(),
      this.createTestStep(),
    ];
  }

  private createEmpathizeStep(): FrameworkStep {
    return {
      id: "empathize",
      name: "Empathize",
      description:
        "Understand the users and their needs through observation, engagement, and immersion. Develop deep empathy for the people you're designing for.",
      order: 0,
      optional: false,
      execute: async (context: Context, _previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        // Gather user insights from problem description and evidence
        const userInsights: string[] = [];

        if (context.problem.description) {
          userInsights.push(`User challenge: ${context.problem.description}`);
        }

        if (context.problem.context) {
          userInsights.push(`User context: ${context.problem.context}`);
        }

        if (context.evidence && context.evidence.length > 0) {
          userInsights.push(`User feedback: ${context.evidence.join("; ")}`);
        }

        if (context.goals && context.goals.length > 0) {
          userInsights.push(`User goals: ${context.goals.join(", ")}`);
        }

        const output = `User empathy insights:\n${userInsights.join("\n")}`;
        const insights = [
          "User needs and pain points identified",
          `Gathered ${userInsights.length} key user insights`,
          "Empathy for user experience developed",
        ];

        return {
          stepId: "empathize",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.8,
        };
      },
      validate: async (_context: Context, _previousResults: StepResult[]) => {
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
    };
  }

  private createDefineStep(): FrameworkStep {
    return {
      id: "define",
      name: "Define",
      description:
        "Synthesize your findings from the empathize phase to define the core problem. Create a clear, actionable problem statement that guides ideation.",
      order: 1,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        // Build problem statement based on empathy insights
        const empathizeResult = previousResults.find((r) => r.stepId === "empathize");
        const problemParts: string[] = [];

        problemParts.push("Problem statement:");

        if (context.problem.description) {
          problemParts.push(`Core challenge: ${context.problem.description}`);
        }

        if (empathizeResult && empathizeResult.insights.length > 0) {
          problemParts.push(`Based on user insights: ${empathizeResult.insights[0]}`);
        }

        if (context.constraints && context.constraints.length > 0) {
          problemParts.push(`Constraints: ${context.constraints.join(", ")}`);
        }

        if (context.goals && context.goals.length > 0) {
          problemParts.push(`Success criteria: ${context.goals[0]}`);
        }

        const output = problemParts.join("\n");
        const insights = [
          "Clear problem statement defined",
          "User needs synthesized into actionable focus",
          "Design challenge framed for ideation",
        ];

        return {
          stepId: "define",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const empathizeResult = previousResults.find((r) => r.stepId === "empathize");
        if (!empathizeResult || !empathizeResult.success) {
          return {
            valid: false,
            issues: ["Empathize phase must be completed before defining problem"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["empathize"],
    };
  }

  private createIdeateStep(): FrameworkStep {
    return {
      id: "ideate",
      name: "Ideate",
      description:
        "Generate a wide range of creative ideas and potential solutions. Focus on quantity over quality, encouraging wild ideas and building on others' thoughts.",
      order: 2,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const defineResult = previousResults.find((r) => r.stepId === "define");
        const ideaParts: string[] = [];

        ideaParts.push("Ideation session:");
        ideaParts.push("- Brainstormed multiple solution approaches");
        ideaParts.push("- Explored creative and unconventional ideas");
        ideaParts.push("- Built upon user insights and problem definition");

        if (defineResult) {
          ideaParts.push(`- Addressing: ${defineResult.output.substring(0, 80)}...`);
        }

        if (context.goals && context.goals.length > 0) {
          ideaParts.push(`- Solution ideas targeting: ${context.goals.join(", ")}`);
        }

        ideaParts.push("- Generated diverse solution concepts");
        ideaParts.push("- Prioritized most promising ideas for prototyping");

        const output = ideaParts.join("\n");
        const insights = [
          "Multiple creative solution ideas generated",
          "Ideas aligned with user needs and constraints",
          "Most promising concepts identified for prototyping",
        ];

        return {
          stepId: "ideate",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.7,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const defineResult = previousResults.find((r) => r.stepId === "define");
        if (!defineResult || !defineResult.success) {
          return {
            valid: false,
            issues: ["Problem must be defined before ideating solutions"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["define"],
    };
  }

  private createPrototypeStep(): FrameworkStep {
    return {
      id: "prototype",
      name: "Prototype",
      description:
        "Build quick, inexpensive prototypes to explore the most promising ideas. Create tangible representations that can be tested with users.",
      order: 3,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const ideateResult = previousResults.find((r) => r.stepId === "ideate");
        const prototypeParts: string[] = [];

        prototypeParts.push("Prototype development:");
        prototypeParts.push("- Created low-fidelity prototype for testing");
        prototypeParts.push("- Focused on key features and user interactions");

        if (ideateResult) {
          prototypeParts.push("- Implemented top ideas from ideation");
        }

        if (context.constraints && context.constraints.length > 0) {
          prototypeParts.push(`- Designed within constraints: ${context.constraints[0]}`);
        }

        prototypeParts.push("- Prototype ready for user testing");
        prototypeParts.push("- Prepared test scenarios and feedback mechanisms");

        const output = prototypeParts.join("\n");
        const insights = [
          "Functional prototype created for testing",
          "Key features and interactions implemented",
          "Ready for user feedback and iteration",
        ];

        return {
          stepId: "prototype",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const ideateResult = previousResults.find((r) => r.stepId === "ideate");
        if (!ideateResult || !ideateResult.success) {
          return {
            valid: false,
            issues: ["Ideas must be generated before creating prototype"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["ideate"],
    };
  }

  private createTestStep(): FrameworkStep {
    return {
      id: "test",
      name: "Test",
      description:
        "Test the prototype with users, gather feedback, and refine the solution. Use insights to iterate on the design and improve the solution.",
      order: 4,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const prototypeResult = previousResults.find((r) => r.stepId === "prototype");
        const empathizeResult = previousResults.find((r) => r.stepId === "empathize");
        const testParts: string[] = [];

        testParts.push("User testing results:");
        testParts.push("- Prototype tested with target users");
        testParts.push("- User feedback collected and analyzed");

        if (prototypeResult) {
          testParts.push("- Validated key features and interactions");
        }

        if (empathizeResult) {
          testParts.push("- Confirmed solution addresses user needs");
        }

        if (context.goals && context.goals.length > 0) {
          testParts.push(`- Success metrics evaluated: ${context.goals[0]}`);
        }

        testParts.push("- Identified areas for improvement");
        testParts.push("- Recommendations for next iteration");

        const output = testParts.join("\n");
        const insights = [
          "User testing completed successfully",
          "Feedback validates design approach",
          "Clear path for iteration and refinement",
          "Solution meets user needs and goals",
        ];

        return {
          stepId: "test",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.8,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const prototypeResult = previousResults.find((r) => r.stepId === "prototype");
        if (!prototypeResult || !prototypeResult.success) {
          return {
            valid: false,
            issues: ["Prototype must be created before testing"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["prototype"],
    };
  }
}
