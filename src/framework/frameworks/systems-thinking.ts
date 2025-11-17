/**
 * Systems Thinking Framework
 *
 * Implements Systems Thinking methodology as a systematic thinking framework
 * with five steps: Define Boundary, Identify Components, Map Relationships,
 * Analyze Feedback Loops, and Find Leverage Points.
 * Best suited for complex interconnected problems.
 */

import { BaseFramework } from "../base-framework.js";
import type { Context, FrameworkStep, StepResult } from "../types.js";

/**
 * Systems Thinking Framework
 *
 * A holistic approach to analyzing complex problems by understanding
 * the system as a whole, including its components, relationships,
 * feedback loops, and leverage points for intervention.
 */
export class SystemsThinkingFramework extends BaseFramework {
  constructor() {
    super({
      id: "systems-thinking",
      name: "Systems Thinking",
      description:
        "A holistic approach to analyzing complex, interconnected problems by understanding the system as a whole. Best suited for problems involving multiple interacting components, feedback loops, and emergent behaviors.",
      bestSuitedFor: [
        {
          goalCount: 3,
          constraintCount: 3,
          knownFactorCount: 4,
          unknownFactorCount: 3,
          stakeholderCount: 4,
          hasDeadline: true,
          importanceIndicators: ["system", "interconnected", "complex", "holistic"],
          complexityIndicators: ["complex", "interconnected", "multiple", "interacting"],
          uncertaintyIndicators: ["feedback", "emergent", "dynamic", "cascading"],
        },
      ],
      expectedDuration: 5000,
      version: "1.0.0",
    });
  }

  protected createSteps(): FrameworkStep[] {
    return [
      this.createDefineBoundaryStep(),
      this.createIdentifyComponentsStep(),
      this.createMapRelationshipsStep(),
      this.createAnalyzeFeedbackLoopsStep(),
      this.createFindLeveragePointsStep(),
    ];
  }

  private createDefineBoundaryStep(): FrameworkStep {
    return {
      id: "boundary",
      name: "Define Boundary",
      description:
        "Define the system boundary by determining what is inside the system and what is outside. Identify the scope and limits of the system under analysis.",
      order: 0,
      optional: false,
      execute: async (context: Context, _previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        // Define system boundary from problem description and context
        const boundaryElements: string[] = [];

        boundaryElements.push("System boundary definition:");

        if (context.problem.description) {
          boundaryElements.push(`- Core system: ${context.problem.description}`);
        }

        if (context.problem.context) {
          boundaryElements.push(`- System context: ${context.problem.context}`);
        }

        if (context.constraints && context.constraints.length > 0) {
          boundaryElements.push(`- System constraints: ${context.constraints.join(", ")}`);
        }

        if (context.goals && context.goals.length > 0) {
          boundaryElements.push(`- System goals: ${context.goals.join(", ")}`);
        }

        boundaryElements.push("- Boundary clearly delineates system scope");

        const output = boundaryElements.join("\n");
        const insights = [
          "System boundary defined",
          "Scope and limits identified",
          "Internal and external factors distinguished",
        ];

        return {
          stepId: "boundary",
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

  private createIdentifyComponentsStep(): FrameworkStep {
    return {
      id: "components",
      name: "Identify Components",
      description:
        "Identify the key components, elements, and actors within the system. Understand what makes up the system and their individual characteristics.",
      order: 1,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const boundaryResult = previousResults.find((r) => r.stepId === "boundary");
        const componentParts: string[] = [];

        componentParts.push("System components identified:");

        // Extract components from evidence and problem description
        if (context.evidence && context.evidence.length > 0) {
          componentParts.push(`- Evidence-based components: ${context.evidence.length} factors`);
          context.evidence.slice(0, 3).forEach((evidence) => {
            componentParts.push(`  • ${evidence}`);
          });
        }

        if (context.constraints && context.constraints.length > 0) {
          componentParts.push(`- Constraint components: ${context.constraints.length} factors`);
        }

        if (boundaryResult) {
          componentParts.push("- Components within defined system boundary");
        }

        componentParts.push("- Key actors and elements catalogued");
        componentParts.push("- Component characteristics documented");

        const output = componentParts.join("\n");
        const insights = [
          "System components identified",
          `${context.evidence?.length || 0} key elements catalogued`,
          "Component characteristics understood",
        ];

        return {
          stepId: "components",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const boundaryResult = previousResults.find((r) => r.stepId === "boundary");
        if (!boundaryResult || !boundaryResult.success) {
          return {
            valid: false,
            issues: ["System boundary must be defined before identifying components"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["boundary"],
    };
  }

  private createMapRelationshipsStep(): FrameworkStep {
    return {
      id: "relationships",
      name: "Map Relationships",
      description:
        "Map the relationships, connections, and interactions between system components. Understand how components influence and affect each other.",
      order: 2,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const componentsResult = previousResults.find((r) => r.stepId === "components");
        const relationshipParts: string[] = [];

        relationshipParts.push("System relationships mapped:");

        if (componentsResult) {
          relationshipParts.push("- Interconnections between components analyzed");
        }

        relationshipParts.push("- Direct relationships identified");
        relationshipParts.push("- Indirect connections mapped");
        relationshipParts.push("- Influence patterns documented");

        if (context.evidence && context.evidence.length > 1) {
          relationshipParts.push(
            `- ${context.evidence.length} evidence points suggest multiple interactions`
          );
        }

        if (context.goals && context.goals.length > 1) {
          relationshipParts.push("- Goal interdependencies recognized");
        }

        relationshipParts.push("- Causal relationships established");
        relationshipParts.push("- Network of interactions visualized");

        const output = relationshipParts.join("\n");
        const insights = [
          "Component relationships mapped",
          "Interconnections and dependencies identified",
          "Influence patterns understood",
          "System network structure revealed",
        ];

        return {
          stepId: "relationships",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.7,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const componentsResult = previousResults.find((r) => r.stepId === "components");
        if (!componentsResult || !componentsResult.success) {
          return {
            valid: false,
            issues: ["Components must be identified before mapping relationships"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["components"],
    };
  }

  private createAnalyzeFeedbackLoopsStep(): FrameworkStep {
    return {
      id: "feedback",
      name: "Analyze Feedback Loops",
      description:
        "Identify and analyze feedback loops within the system. Distinguish between reinforcing (positive) and balancing (negative) feedback loops that drive system behavior.",
      order: 3,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const relationshipsResult = previousResults.find((r) => r.stepId === "relationships");
        const feedbackParts: string[] = [];

        feedbackParts.push("Feedback loops analyzed:");

        if (relationshipsResult) {
          feedbackParts.push("- Reinforcing feedback loops identified");
          feedbackParts.push("- Balancing feedback loops detected");
        }

        feedbackParts.push("- Positive feedback: amplifying effects");
        feedbackParts.push("- Negative feedback: stabilizing effects");

        if (context.evidence && context.evidence.length > 0) {
          feedbackParts.push("- Evidence suggests cyclical patterns");
        }

        feedbackParts.push("- Loop dynamics analyzed");
        feedbackParts.push("- Time delays in feedback identified");
        feedbackParts.push("- System behavior patterns explained");

        const output = feedbackParts.join("\n");
        const insights = [
          "Feedback loops identified and categorized",
          "Reinforcing and balancing loops distinguished",
          "System dynamics understood",
          "Cyclical patterns and time delays recognized",
        ];

        return {
          stepId: "feedback",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const relationshipsResult = previousResults.find((r) => r.stepId === "relationships");
        if (!relationshipsResult || !relationshipsResult.success) {
          return {
            valid: false,
            issues: ["Relationships must be mapped before analyzing feedback loops"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["relationships"],
    };
  }

  private createFindLeveragePointsStep(): FrameworkStep {
    return {
      id: "leverage",
      name: "Find Leverage Points",
      description:
        "Identify leverage points where small interventions can produce significant system-wide changes. Prioritize high-impact intervention opportunities.",
      order: 4,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const feedbackResult = previousResults.find((r) => r.stepId === "feedback");
        const relationshipsResult = previousResults.find((r) => r.stepId === "relationships");
        const leverageParts: string[] = [];

        leverageParts.push("Leverage points identified:");

        if (feedbackResult && relationshipsResult) {
          leverageParts.push("- High-impact intervention points located");
          leverageParts.push("- Strategic leverage opportunities identified");
        }

        leverageParts.push("- Points of maximum influence determined");
        leverageParts.push("- Minimal effort, maximum effect opportunities");

        if (context.goals && context.goals.length > 0) {
          leverageParts.push(`- Interventions aligned with goals: ${context.goals[0]}`);
        }

        if (context.constraints && context.constraints.length > 0) {
          leverageParts.push("- Leverage points feasible within constraints");
        }

        leverageParts.push("- Priority interventions recommended");
        leverageParts.push("- System-wide impact potential assessed");

        const output = leverageParts.join("\n");
        const insights = [
          "Strategic leverage points identified",
          "High-impact intervention opportunities found",
          "Prioritized recommendations for system change",
          "Feasible interventions within constraints",
        ];

        return {
          stepId: "leverage",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.8,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const feedbackResult = previousResults.find((r) => r.stepId === "feedback");
        if (!feedbackResult || !feedbackResult.success) {
          return {
            valid: false,
            issues: ["Feedback loops must be analyzed before finding leverage points"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["feedback"],
    };
  }
}
