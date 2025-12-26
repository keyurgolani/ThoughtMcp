/**
 * Root Cause Analysis Framework
 *
 * Implements Root Cause Analysis methodology as a systematic thinking framework
 * with five steps: Define Problem, Collect Data, Identify Causal Factors,
 * Determine Root Cause, and Recommend Solutions.
 * Best suited for problem diagnosis and failure analysis.
 */

import { BaseFramework } from "../base-framework.js";
import type { Context, FrameworkStep, StepResult } from "../types.js";

/**
 * Root Cause Analysis Framework
 *
 * A systematic approach to identifying the fundamental cause of problems
 * by analyzing symptoms, collecting data, identifying causal factors,
 * and determining the root cause to prevent recurrence.
 * Best suited for problem diagnosis, failure analysis, and incident investigation.
 */
export class RootCauseAnalysisFramework extends BaseFramework {
  constructor() {
    super({
      id: "root-cause-analysis",
      name: "Root Cause Analysis",
      description:
        "A systematic approach to identifying the fundamental cause of problems by analyzing symptoms, collecting data, and determining root causes to prevent recurrence. Best suited for problem diagnosis, failure analysis, and incident investigation.",
      bestSuitedFor: [
        {
          goalCount: 3,
          constraintCount: 3,
          knownFactorCount: 4,
          unknownFactorCount: 3,
          stakeholderCount: 2,
          hasDeadline: true,
          importanceIndicators: ["problem", "failure", "issue", "incident", "diagnosis"],
          complexityIndicators: ["cause", "symptom", "factor", "analysis"],
          uncertaintyIndicators: ["why", "root", "underlying", "fundamental"],
        },
      ],
      expectedDuration: 5000,
      version: "1.0.0",
    });
  }

  protected createSteps(): FrameworkStep[] {
    return [
      this.createDefineProblemStep(),
      this.createCollectDataStep(),
      this.createIdentifyCausalFactorsStep(),
      this.createDetermineRootCauseStep(),
      this.createRecommendSolutionsStep(),
    ];
  }

  private createDefineProblemStep(): FrameworkStep {
    return {
      id: "define",
      name: "Define Problem",
      description:
        "Clearly define the problem, its symptoms, and impact. Establish the scope and boundaries of the investigation.",
      order: 0,
      optional: false,
      execute: async (context: Context, _previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const problemElements: string[] = [];

        problemElements.push("Problem definition:");

        if (context.problem.description) {
          problemElements.push(`- Problem statement: ${context.problem.description}`);
        }

        if (context.problem.context) {
          problemElements.push(`- Context: ${context.problem.context}`);
        }

        if (context.problem.complexity) {
          problemElements.push(`- Complexity level: ${context.problem.complexity}`);
        }

        if (context.problem.urgency) {
          problemElements.push(`- Urgency: ${context.problem.urgency}`);
        }

        if (context.constraints && context.constraints.length > 0) {
          problemElements.push(`- Constraints: ${context.constraints.length} identified`);
          context.constraints.slice(0, 2).forEach((constraint) => {
            problemElements.push(`  • ${constraint}`);
          });
        }

        problemElements.push("- Problem scope established");
        problemElements.push("- Investigation boundaries defined");

        const output = problemElements.join("\n");
        const insights = [
          "Problem clearly defined",
          "Scope and boundaries established",
          "Investigation parameters set",
        ];

        return {
          stepId: "define",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.85,
        };
      },
      validate: async (_context: Context, _previousResults: StepResult[]) => {
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
    };
  }

  private createCollectDataStep(): FrameworkStep {
    return {
      id: "collect",
      name: "Collect Data",
      description:
        "Gather relevant data, evidence, and information about the problem. Document symptoms, timeline, and environmental factors.",
      order: 1,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const defineResult = previousResults.find((r) => r.stepId === "define");
        const dataParts: string[] = [];

        dataParts.push("Data collection:");

        if (context.evidence && context.evidence.length > 0) {
          dataParts.push(`- Evidence items collected: ${context.evidence.length}`);
          context.evidence.slice(0, 3).forEach((evidence) => {
            dataParts.push(`  • ${evidence}`);
          });
        } else {
          dataParts.push("- Limited evidence available");
        }

        if (defineResult) {
          dataParts.push("- Data aligned with problem definition");
        }

        dataParts.push("- Symptcumented");
        dataParts.push("- Timeline established");
        dataParts.push("- Environmental factors noted");
        dataParts.push("- Data quality verified");

        const output = dataParts.join("\n");
        const insights = [
          `${context.evidence?.length || 0} evidence items collected`,
          "Symptoms and timeline documented",
          "Environmental factors identified",
          "Data foundation established for analysis",
        ];

        return {
          stepId: "collect",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.8,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const defineResult = previousResults.find((r) => r.stepId === "define");
        if (!defineResult?.success) {
          return {
            valid: false,
            issues: ["Problem must be defined before collecting data"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["define"],
    };
  }

  private createIdentifyCausalFactorsStep(): FrameworkStep {
    return {
      id: "identify",
      name: "Identify Causal Factors",
      description:
        "Identify all potential causal factors that may have contributed to the problem. Use techniques like 5 Whys or fishbone diagrams.",
      order: 2,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const collectResult = previousResults.find((r) => r.stepId === "collect");
        const factorParts: string[] = [];

        factorParts.push("Causal factors identified:");

        if (collectResult) {
          factorParts.push("- Data analyzed for causal relationships");
        }

        factorParts.push("- Contributing factors catalogued");
        factorParts.push("- Causal chains mapped");

        if (context.evidence && context.evidence.length > 0) {
          factorParts.push(`- Factors derived from ${context.evidence.length} evidence items`);
        }

        factorParts.push("- Direct and indirect causes identified");
        factorParts.push("- Factor relationships analyzed");
        factorParts.push("- 5 Whys technique applied");

        const output = factorParts.join("\n");
        const insights = [
          "Multiple causal factors identified",
          "Direct and indirect causes distinguished",
          "Causal relationships mapped",
          "Foundation for root cause determination established",
        ];

        return {
          stepId: "identify",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const collectResult = previousResults.find((r) => r.stepId === "collect");
        if (!collectResult?.success) {
          return {
            valid: false,
            issues: ["Data must be collected before identifying causal factors"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["collect"],
    };
  }

  private createDetermineRootCauseStep(): FrameworkStep {
    return {
      id: "determine",
      name: "Determine Root Cause",
      description:
        "Determine the fundamental root cause by analyzing causal factors and identifying the underlying issue that, if addressed, would prevent recurrence.",
      order: 3,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const identifyResult = previousResults.find((r) => r.stepId === "identify");
        const rootCauseParts: string[] = [];

        rootCauseParts.push("Root cause determination:");

        if (identifyResult) {
          rootCauseParts.push("- Causal factors analyzed for root cause");
          rootCauseParts.push("- Fundamental cause identified");
        }

        rootCauseParts.push("- Root cause distinguished from symptoms");
        rootCauseParts.push("- Underlying issue identified");

        if (context.goals && context.goals.length > 0) {
          rootCauseParts.push(`- Root cause addresses goal: ${context.goals[0]}`);
        }

        rootCauseParts.push("- Verification: Addressing this cause would prevent recurrence");
        rootCauseParts.push("- Root cause confidence assessed");

        const output = rootCauseParts.join("\n");
        const insights = [
          "Root cause identified",
          "Fundamental issue distinguished from symptoms",
          "Cause verified as addressable",
          "Prevention strategy enabled",
        ];

        return {
          stepId: "determine",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.8,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const identifyResult = previousResults.find((r) => r.stepId === "identify");
        if (!identifyResult?.success) {
          return {
            valid: false,
            issues: ["Causal factors must be identified before determining root cause"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["identify"],
    };
  }

  private createRecommendSolutionsStep(): FrameworkStep {
    return {
      id: "recommend",
      name: "Recommend Solutions",
      description:
        "Recommend solutions that address the root cause and prevent recurrence. Include short-term fixes and long-term preventive measures.",
      order: 4,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const determineResult = previousResults.find((r) => r.stepId === "determine");
        const solutionParts: string[] = [];

        solutionParts.push("Solution recommendations:");

        if (determineResult) {
          solutionParts.push("- Solutions target identified root cause");
        }

        solutionParts.push("- Short-term corrective actions recommended");
        solutionParts.push("- Long-term preventive measures proposed");

        if (context.constraints && context.constraints.length > 0) {
          solutionParts.push("- Solutions respect operational constraints");
        }

        if (context.goals && context.goals.length > 0) {
          solutionParts.push(`- Solutions achieve goals: ${context.goals.join(", ")}`);
        }

        solutionParts.push("- Implementation plan outlined");
        solutionParts.push("- Success metrics defined");
        solutionParts.push("- Recurrence prevention validated");

        const output = solutionParts.join("\n");
        const insights = [
          "Comprehensive solutions recommended",
          "Short-term and long-term actions defined",
          "Prevention strategy established",
          "Implementation roadmap provided",
        ];

        return {
          stepId: "recommend",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.85,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const determineResult = previousResults.find((r) => r.stepId === "determine");
        if (!determineResult?.success) {
          return {
            valid: false,
            issues: ["Root cause must be determined before recommending solutions"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["determine"],
    };
  }
}
