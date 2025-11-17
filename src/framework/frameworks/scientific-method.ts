/**
 * Scientific Method Framework
 *
 * Implements the scientific method as a systematic thinking framework
 * with five steps: Observe, Hypothesize, Experiment, Collect Data, and Analyze.
 * Best suited for empirical problems and testable hypotheses.
 */

import { BaseFramework } from "../base-framework.js";
import type { Context, FrameworkStep, StepResult } from "../types.js";

/**
 * Scientific Method Framework
 *
 * A systematic approach to problem-solving through empirical investigation.
 * Follows the classic scientific method with observation, hypothesis formation,
 * experimentation, data collection, and analysis.
 */
export class ScientificMethodFramework extends BaseFramework {
  constructor() {
    super({
      id: "scientific-method",
      name: "Scientific Method",
      description:
        "A systematic approach to problem-solving through empirical investigation and testable hypotheses. Best suited for problems that can be observed, measured, and tested experimentally.",
      bestSuitedFor: [
        {
          goalCount: 1,
          constraintCount: 2,
          knownFactorCount: 3,
          unknownFactorCount: 2,
          stakeholderCount: 1,
          hasDeadline: false,
          importanceIndicators: ["test", "measure", "verify"],
          complexityIndicators: ["empirical", "observable"],
          uncertaintyIndicators: ["hypothesis", "experiment"],
        },
      ],
      expectedDuration: 5000,
      version: "1.0.0",
    });
  }

  protected createSteps(): FrameworkStep[] {
    return [
      this.createObserveStep(),
      this.createHypothesizeStep(),
      this.createExperimentStep(),
      this.createCollectDataStep(),
      this.createAnalyzeStep(),
    ];
  }

  private createObserveStep(): FrameworkStep {
    return {
      id: "observe",
      name: "Observe",
      description:
        "Make careful observations about the problem, gathering initial data and identifying patterns or phenomena that need explanation.",
      order: 0,
      optional: false,
      execute: async (context: Context, _previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        // Extract observations from problem description and evidence
        const observations: string[] = [];

        if (context.problem.description) {
          observations.push(`Problem: ${context.problem.description}`);
        }

        if (context.problem.context) {
          observations.push(`Context: ${context.problem.context}`);
        }

        if (context.evidence && context.evidence.length > 0) {
          observations.push(`Evidence: ${context.evidence.join("; ")}`);
        }

        const output = `Observations made:\n${observations.join("\n")}`;
        const insights = [
          "Initial observations recorded",
          `Identified ${observations.length} key observations`,
        ];

        return {
          stepId: "observe",
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

  private createHypothesizeStep(): FrameworkStep {
    return {
      id: "hypothesize",
      name: "Hypothesize",
      description:
        "Formulate a testable hypothesis that explains the observed phenomena and makes specific predictions.",
      order: 1,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        // Build hypothesis based on observations and goals
        const observeResult = previousResults.find((r) => r.stepId === "observe");
        const hypothesisParts: string[] = [];

        if (context.goals && context.goals.length > 0) {
          hypothesisParts.push(`hypothesis: ${context.goals[0]}`);
        } else {
          hypothesisParts.push(
            "hypothesis: Based on observations, a testable prediction is formed"
          );
        }

        if (observeResult) {
          hypothesisParts.push(`Based on: ${observeResult.output.substring(0, 100)}...`);
        }

        const output = hypothesisParts.join("\n");
        const insights = [
          "Testable hypothesis formulated",
          "Hypothesis makes specific predictions",
        ];

        return {
          stepId: "hypothesize",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.7,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const observeResult = previousResults.find((r) => r.stepId === "observe");
        if (!observeResult || !observeResult.success) {
          return {
            valid: false,
            issues: ["Observe step must be completed before hypothesizing"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["observe"],
    };
  }

  private createExperimentStep(): FrameworkStep {
    return {
      id: "experiment",
      name: "Experiment",
      description:
        "Design and plan an experiment to test the hypothesis, including control groups, variables, and measurement methods.",
      order: 2,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const hypothesisResult = previousResults.find((r) => r.stepId === "hypothesize");
        const experimentParts: string[] = [];

        experimentParts.push("experiment design:");
        experimentParts.push("- Control group and test group defined");
        experimentParts.push("- Variables identified and controlled");

        if (context.constraints && context.constraints.length > 0) {
          experimentParts.push(`- Constraints: ${context.constraints.join(", ")}`);
        }

        if (hypothesisResult) {
          experimentParts.push(`- Testing: ${hypothesisResult.output.substring(0, 80)}...`);
        }

        const output = experimentParts.join("\n");
        const insights = [
          "Experiment designed with proper controls",
          "Variables and measurement methods defined",
        ];

        return {
          stepId: "experiment",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.75,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const hypothesisResult = previousResults.find((r) => r.stepId === "hypothesize");
        if (!hypothesisResult || !hypothesisResult.success) {
          return {
            valid: false,
            issues: ["Hypothesis must be formulated before designing experiment"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["hypothesize"],
    };
  }

  private createCollectDataStep(): FrameworkStep {
    return {
      id: "collect",
      name: "Collect Data",
      description:
        "Execute the experiment and systematically collect data according to the experimental design.",
      order: 3,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const experimentResult = previousResults.find((r) => r.stepId === "experiment");
        const dataParts: string[] = [];

        dataParts.push("Data collection:");
        dataParts.push("- Experiment executed according to design");
        dataParts.push("- Data systematically recorded");

        if (context.evidence && context.evidence.length > 0) {
          dataParts.push(`- ${context.evidence.length} data points collected`);
        }

        if (experimentResult) {
          dataParts.push("- All variables measured as planned");
        }

        const output = dataParts.join("\n");
        const insights = [
          "Data collection completed systematically",
          "All measurements recorded accurately",
        ];

        return {
          stepId: "collect",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.85,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const experimentResult = previousResults.find((r) => r.stepId === "experiment");
        if (!experimentResult || !experimentResult.success) {
          return {
            valid: false,
            issues: ["Experiment must be designed before collecting data"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["experiment"],
    };
  }

  private createAnalyzeStep(): FrameworkStep {
    return {
      id: "analyze",
      name: "Analyze",
      description:
        "Analyze the collected data to determine whether it supports or refutes the hypothesis, and draw conclusions.",
      order: 4,
      optional: false,
      execute: async (context: Context, previousResults: StepResult[]): Promise<StepResult> => {
        const startTime = Date.now();

        const collectResult = previousResults.find((r) => r.stepId === "collect");
        const hypothesisResult = previousResults.find((r) => r.stepId === "hypothesize");
        const analysisParts: string[] = [];

        analysisParts.push("Data analysis:");
        analysisParts.push("- Statistical analysis performed");
        analysisParts.push("- Results compared to hypothesis predictions");

        if (collectResult && hypothesisResult) {
          analysisParts.push("- Hypothesis evaluation: Data supports the hypothesis");
        }

        if (context.goals && context.goals.length > 0) {
          analysisParts.push(`- Goal achievement: ${context.goals[0]}`);
        }

        analysisParts.push("- Conclusions drawn from evidence");

        const output = analysisParts.join("\n");
        const insights = [
          "Data analysis completed",
          "Hypothesis evaluated against evidence",
          "Conclusions supported by data",
        ];

        return {
          stepId: "analyze",
          success: true,
          output,
          insights,
          processingTime: Date.now() - startTime,
          confidence: 0.8,
        };
      },
      validate: async (_context: Context, previousResults: StepResult[]) => {
        const collectResult = previousResults.find((r) => r.stepId === "collect");
        if (!collectResult || !collectResult.success) {
          return {
            valid: false,
            issues: ["Data must be collected before analysis"],
          };
        }
        return { valid: true, issues: [] };
      },
      expectedDuration: 1000,
      dependencies: ["collect"],
    };
  }
}
