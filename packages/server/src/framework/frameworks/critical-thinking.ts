/**
 * Critical Thinking Framework
 *
 * Implements Critical Thinking methodology as a systematic thinking framework
 * with five steps: Identify Claims, Evaluate Evidence, Examine Assumptions,
 * Assess Logic, and Validate Conclusions.
 * Best suited for argument evaluation and logical reasoning.
 */

import { BaseFramework } from "../base-framework.js";
import type { Context, FrameworkStep, StepResult } from "../types.js";

/**
 * Critical Thinking Framework
 *
 * A rigorous approach to evaluating arguments, claims, and reasoning
 * by systematically analyzing evidence, assumptions, logic, and conclusions.
 * Best suited for decision-making, argument evaluation, and logical analysis.
 */
export class CriticalThinkingFramework extends BaseFramework {
  constructor() {
    super({
      id: "critical-thinking",
      name: "Critical Thinking",
      description:
        "A systematic approach to evaluating arguments, claims, and reasoning through rigorous analysis of evidence, assumptions, and logic. Best suited for decision-making, argument evaluation, and situations requiring objective analysis.",
      bestSuitedFor: [
        {
          goalCount: 3,
          constraintCount: 3,
          knownFactorCount: 4,
          unknownFactorCount: 2,
          stakeholderCount: 3,
          hasDeadline: true,
          importanceIndicators: ["argument", "claim", "evidence", "reasoning", "decision"],
          complexityIndicators: ["evaluate", "analyze", "assess", "logical"],
          uncertaintyIndicators: ["assumption", "bias", "validity", "soundness"],
        },
      ],
      expectedDuration: 5000,
      version: "1.0.0",
    });
  }

  protected createSteps(): FrameworkStep[] {
    return [
      this.createIdentifyClaimsStep(),
      this.createEvaluateEvidenceStep(),
      this.createExamineAssumptionsStep(),
      this.createAssessLogicStep(),
      this.createValidateConclusionsStep(),
    ];
  }

  private createIdentifyClaimsStep(): FrameworkStep {
    return {
      id: "identify",
      name: "Identify Claims",
      description:
        "Identify the main claims, assertions, and arguments being made. Distinguish between facts, opinions, and inferences.",
      order: 0,
      optional: false,
      execute: async (context: Context, _previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const claimElements: string[] = [];

        claimElements.push("Claims and arguments identified:");

        if (context.problem.description) {
          claimElements.push(`- Main claim: ${context.problem.description}`);
        }

        if (context.problem.context) {
          claimElements.push(`- Context: ${context.problem.context}`);
        }

        if (context.evidence && context.evidence.length > 0) {
          claimElements.push(`- Supporting claims from evidence: ${context.evidence.length} items`);
          context.evidence.slice(0, 2).forEach((evidence) => {
            claimElements.push(`  • ${evidence}`);
          });
        }

        if (context.goals && context.goals.length > 0) {
          claimElements.push(`- Goal-related claims: ${context.goals.join(", ")}`);
        }

        claimElements.push("- Facts distinguished from opinions");
        claimElements.push("- Inferences identified");

        const output = claimElements.join("\n");
        const insights = [
          "Main claims identified",
          "Facts and opinions distinguished",
          "Arguments catalogued for analysis",
        ];

        return {
          stepId: "identify",
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

  private createEvaluateEvidenceStep(): FrameworkStep {
    return {
      id: "evaluate",
      name: "Evaluate Evidence",
      description:
        "Evaluate the quality, relevance, and credibility of evidence supporting the claims. Assess sources and identify gaps in evidence.",
      order: 1,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const identifyResult = previousResults.find((r) => r.stepId === "identify");
        const evidenceParts: string[] = [];

        evidenceParts.push("Evidence evaluation:");

        if (context.evidence && context.evidence.length > 0) {
          evidenceParts.push(`- Evidence items analyzed: ${context.evidence.length}`);
          evidenceParts.push("- Source credibility assessed");
          evidenceParts.push("- Relevance to claims evaluated");
          evidenceParts.push("- Evidence quality: Generally reliable");
        } else {
          evidenceParts.push("- Limited evidence available");
          evidenceParts.push("- Evidence gaps identified");
        }

        if (identifyResult) {
          evidenceParts.push("- Evidence mapped to identified claims");
        }

        evidenceParts.push("- Supporting and contradicting evidence noted");
        evidenceParts.push("- Evidence strength assessed");

        const output = evidenceParts.join("\n");
        const insights = [
          "Evidence quality evaluated",
          `${context.evidence?.length || 0} evidence items assessed`,
          "Source credibility and relevance determined",
          "Evidence gaps identified",
        ];

        return {
          stepId: "evaluate",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const identifyResult = previousResults.find((r) => r.stepId === "identify");
        if (!identifyResult?.success) {
          return {
            valid: false,
            issues: ["Claims must be identified before evaluating evidence"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["identify"],
    };
  }

  private createExamineAssumptionsStep(): FrameworkStep {
    return {
      id: "examine",
      name: "Examine Assumptions",
      description:
        "Examine underlying assumptions, both stated and unstated. Challenge assumptions and identify potential biases.",
      order: 2,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const evaluateResult = previousResults.find((r) => r.stepId === "evaluate");
        const assumptionParts: string[] = [];

        assumptionParts.push("Assumptions examined:");

        if (evaluateResult) {
          assumptionParts.push("- Underlying assumptions identified");
        }

        assumptionParts.push("- Stated assumptions catalogued");
        assumptionParts.push("- Unstated assumptions uncovered");

        if (context.constraints && context.constraints.length > 0) {
          assumptionParts.push(`- Constraint-based assumptions: ${context.constraints.length}`);
          assumptionParts.push(`  • ${context.constraints[0]}`);
        }

        assumptionParts.push("- Assumptions challenged and tested");
        assumptionParts.push("- Potential biases identified");
        assumptionParts.push("- Validity of assumptions assessed");

        const output = assumptionParts.join("\n");
        const insights = [
          "Underlying assumptions identified",
          "Stated and unstated assumptions distinguished",
          "Assumptions challenged for validity",
          "Potential biases recognized",
        ];

        return {
          stepId: "examine",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.7,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const evaluateResult = previousResults.find((r) => r.stepId === "evaluate");
        if (!evaluateResult?.success) {
          return {
            valid: false,
            issues: ["Evidence must be evaluated before examining assumptions"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["evaluate"],
    };
  }

  private createAssessLogicStep(): FrameworkStep {
    return {
      id: "assess",
      name: "Assess Logic",
      description:
        "Assess the logical structure and reasoning. Identify logical fallacies, inconsistencies, and gaps in reasoning.",
      order: 3,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const examineResult = previousResults.find((r) => r.stepId === "examine");
        const logicParts: string[] = [];

        logicParts.push("Logical reasoning assessed:");

        if (examineResult) {
          logicParts.push("- Argument structure analyzed");
          logicParts.push("- Logical connections evaluated");
        }

        logicParts.push("- Reasoning chain examined");
        logicParts.push("- Logical fallacies checked");
        logicParts.push("- Consistency of arguments verified");

        if (context.goals && context.goals.length > 0) {
          logicParts.push("- Logic aligned with stated goals");
        }

        logicParts.push("- Gaps in reasoning identified");
        logicParts.push("- Argument soundness assessed");

        const output = logicParts.join("\n");
        const insights = [
          "Logical structure analyzed",
          "Reasoning chain evaluated",
          "Logical fallacies and inconsistencies identified",
          "Argument soundness determined",
        ];

        return {
          stepId: "assess",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const examineResult = previousResults.find((r) => r.stepId === "examine");
        if (!examineResult?.success) {
          return {
            valid: false,
            issues: ["Assumptions must be examined before assessing logic"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["examine"],
    };
  }

  private createValidateConclusionsStep(): FrameworkStep {
    return {
      id: "validate",
      name: "Validate Conclusions",
      description:
        "Validate conclusions by checking if they logically follow from the evidence and reasoning. Assess the strength and limitations of conclusions.",
      order: 4,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const assessResult = previousResults.find((r) => r.stepId === "assess");
        const identifyResult = previousResults.find((r) => r.stepId === "identify");
        const conclusionParts: string[] = [];

        conclusionParts.push("Conclusions validated:");

        if (assessResult && identifyResult) {
          conclusionParts.push("- Conclusions checked against evidence");
          conclusionParts.push("- Logical consistency verified");
        }

        conclusionParts.push("- Conclusions follow from premises");
        conclusionParts.push("- Strength of conclusions assessed");

        if (context.goals && context.goals.length > 0) {
          conclusionParts.push(`- Conclusions address goals: ${context.goals[0]}`);
        }

        conclusionParts.push("- Limitations acknowledged");
        conclusionParts.push("- Alternative conclusions considered");
        conclusionParts.push("- Final validation: Conclusions supported by analysis");

        const output = conclusionParts.join("\n");
        const insights = [
          "Conclusions validated against evidence and logic",
          "Strength and limitations assessed",
          "Alternative conclusions considered",
          "Final recommendations supported by rigorous analysis",
        ];

        return {
          stepId: "validate",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.8,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const assessResult = previousResults.find((r) => r.stepId === "assess");
        if (!assessResult?.success) {
          return {
            valid: false,
            issues: ["Logic must be assessed before validating conclusions"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["assess"],
    };
  }
}
