/**
 * Analytical Reasoning Stream
 *
 * Focuses on logical analysis, evidence evaluation, and systematic reasoning
 */

import {
  ArgumentChain,
  Evidence,
  EvidenceEvaluation,
  IAnalyticalReasoningStream,
  LogicalAnalysis,
} from "../../interfaces/parallel-reasoning.js";
import { Problem } from "../../interfaces/systematic-thinking.js";
import { Context, ReasoningStep, ReasoningType } from "../../types/core.js";
import { BaseReasoningStream } from "./BaseReasoningStream.js";

export class AnalyticalReasoningStream
  extends BaseReasoningStream
  implements IAnalyticalReasoningStream
{
  constructor(id?: string) {
    super(
      "analytical",
      "Analytical Reasoning Stream",
      "Systematic logical analysis and evidence-based reasoning",
      id
    );
  }

  protected async doInitialize(): Promise<void> {
    // Initialize analytical reasoning components
    // This could include loading logical reasoning patterns, evidence evaluation criteria, etc.
  }

  protected async doProcess(
    problem: Problem,
    context?: Context
  ): Promise<{
    reasoning_steps: ReasoningStep[];
    conclusions: string[];
    confidence: number;
    insights: string[];
    evidence: Evidence[];
    assumptions: string[];
  }> {
    const reasoningSteps: ReasoningStep[] = [];
    const evidence: Evidence[] = [];
    const assumptions: string[] = [];

    // Step 1: Logical analysis of the problem
    const logicalAnalysis = await this.analyzeLogically(problem);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.LOGICAL_INFERENCE,
        `Logical analysis: ${logicalAnalysis.soundness_assessment}`,
        logicalAnalysis.logical_validity,
        { analysis: logicalAnalysis }
      )
    );

    // Step 2: Extract and evaluate evidence
    const problemEvidence = this.extractEvidence(problem, context);
    evidence.push(...problemEvidence);

    const evidenceEvaluation = await this.evaluateEvidence(problemEvidence);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.LOGICAL_INFERENCE,
        `Evidence evaluation: Overall strength ${evidenceEvaluation.overall_strength.toFixed(
          2
        )}`,
        evidenceEvaluation.overall_strength,
        { evaluation: evidenceEvaluation }
      )
    );

    // Step 3: Build argument chain
    const argumentChain = await this.buildArgumentChain(
      logicalAnalysis.premises,
      logicalAnalysis.conclusions[0] ?? "No clear conclusion"
    );
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.DEDUCTIVE,
        `Argument chain: ${argumentChain.conclusion}`,
        argumentChain.validity,
        { argument_chain: argumentChain }
      )
    );

    // Step 4: Identify assumptions
    assumptions.push(...this.identifyAssumptions(problem, logicalAnalysis));

    // Step 5: Generate analytical conclusions
    const conclusions = this.generateAnalyticalConclusions(
      logicalAnalysis,
      evidenceEvaluation,
      argumentChain
    );

    // Calculate overall confidence
    const confidence = this.calculateAnalyticalConfidence(
      logicalAnalysis,
      evidenceEvaluation,
      argumentChain
    );

    // Generate insights
    const insights = this.generateAnalyticalInsights(
      problem,
      logicalAnalysis,
      evidenceEvaluation
    );

    return {
      reasoning_steps: reasoningSteps,
      conclusions,
      confidence,
      insights,
      evidence,
      assumptions,
    };
  }

  protected doReset(): void {
    // Reset analytical reasoning state
  }

  async analyzeLogically(problem: Problem): Promise<LogicalAnalysis> {
    const premises: string[] = [];
    const inferences: string[] = [];
    const conclusions: string[] = [];

    // Extract premises from problem description
    premises.push(`Problem domain: ${problem.domain}`);
    premises.push(
      `Complexity level: ${(problem.complexity * 100).toFixed(0)}%`
    );
    premises.push(
      `Uncertainty level: ${(problem.uncertainty * 100).toFixed(0)}%`
    );

    if (problem.constraints.length > 0) {
      premises.push(`Constraints: ${problem.constraints.join(", ")}`);
    }

    // Generate logical inferences
    if (problem.complexity > 0.7) {
      inferences.push("High complexity requires systematic decomposition");
    }

    if (problem.uncertainty > 0.6) {
      inferences.push("High uncertainty requires risk mitigation strategies");
    }

    if (problem.time_sensitivity > 0.8) {
      inferences.push("High time sensitivity requires prioritized approach");
    }

    // Generate conclusions based on inferences
    if (inferences.length > 0) {
      conclusions.push("Problem requires structured analytical approach");
    }

    if (problem.constraints.includes("resource_constraint")) {
      conclusions.push("Resource optimization is critical for success");
    }

    // Assess logical validity
    const logical_validity = this.assessLogicalValidity(
      premises,
      inferences,
      conclusions
    );

    // Assess soundness
    const soundness_assessment = this.assessSoundness(
      premises,
      logical_validity
    );

    return {
      premises,
      inferences,
      conclusions,
      logical_validity,
      soundness_assessment,
    };
  }

  async evaluateEvidence(evidence: Evidence[]): Promise<EvidenceEvaluation> {
    const reliability_scores = evidence.map((e) => e.reliability);
    const relevance_scores = evidence.map((e) => e.relevance);

    // Calculate overall strength as weighted average
    const overall_strength =
      evidence.length > 0
        ? evidence.reduce((sum, e) => sum + e.reliability * e.relevance, 0) /
          evidence.length
        : 0.5;

    return {
      evidence_items: evidence,
      reliability_scores,
      relevance_scores,
      overall_strength,
    };
  }

  async buildArgumentChain(
    premises: string[],
    conclusion: string
  ): Promise<ArgumentChain> {
    const inference_steps: string[] = [];

    // Generate inference steps from premises to conclusion
    if (premises.length > 0) {
      inference_steps.push("Analyzing given premises");
      inference_steps.push("Identifying logical relationships");
      inference_steps.push("Drawing valid inferences");
      inference_steps.push("Formulating conclusion");
    }

    // Assess validity based on logical structure
    const validity = this.assessArgumentValidity(
      premises,
      inference_steps,
      conclusion
    );

    // Assess strength based on premise quality and inference quality
    const strength = this.assessArgumentStrength(premises, inference_steps);

    return {
      premises,
      inference_steps,
      conclusion,
      validity,
      strength,
    };
  }

  private extractEvidence(problem: Problem, context?: Context): Evidence[] {
    const evidence: Evidence[] = [];

    // Extract evidence from problem description
    evidence.push(
      this.createEvidence(
        `Problem complexity: ${problem.complexity}`,
        "problem_analysis",
        0.9,
        1.0
      )
    );

    evidence.push(
      this.createEvidence(
        `Domain expertise: ${problem.domain}`,
        "domain_classification",
        0.8,
        0.9
      )
    );

    // Extract evidence from constraints
    if (problem.constraints.length > 0) {
      evidence.push(
        this.createEvidence(
          `Identified constraints: ${problem.constraints.join(", ")}`,
          "constraint_analysis",
          0.85,
          0.95
        )
      );
    }

    // Extract evidence from context if available
    if (context?.domain) {
      evidence.push(
        this.createEvidence(
          `Context domain: ${context.domain}`,
          "context_analysis",
          0.7,
          0.8
        )
      );
    }

    return evidence;
  }

  private identifyAssumptions(
    problem: Problem,
    analysis: LogicalAnalysis
  ): string[] {
    const assumptions: string[] = [];

    // Identify implicit assumptions
    assumptions.push("Problem description is accurate and complete");
    assumptions.push("Identified constraints are exhaustive");

    if (problem.stakeholders.length > 0) {
      assumptions.push(
        "Stakeholder interests are aligned with problem resolution"
      );
    }

    if (analysis.premises.length > 0) {
      assumptions.push("Premises are factually correct");
    }

    return assumptions;
  }

  private generateAnalyticalConclusions(
    logicalAnalysis: LogicalAnalysis,
    evidenceEvaluation: EvidenceEvaluation,
    argumentChain: ArgumentChain
  ): string[] {
    const conclusions: string[] = [];

    // Primary conclusion from logical analysis
    if (logicalAnalysis.conclusions.length > 0) {
      conclusions.push(logicalAnalysis.conclusions[0]);
    }

    // Evidence-based conclusions
    if (evidenceEvaluation.overall_strength > 0.7) {
      conclusions.push(
        "Strong evidence supports systematic analytical approach"
      );
    } else if (evidenceEvaluation.overall_strength > 0.4) {
      conclusions.push(
        "Moderate evidence suggests cautious analytical approach"
      );
    } else {
      conclusions.push(
        "Limited evidence requires additional information gathering"
      );
    }

    // Argument-based conclusions
    if (argumentChain.validity > 0.8) {
      conclusions.push("Logical argument structure is sound and valid");
    }

    return conclusions;
  }

  private calculateAnalyticalConfidence(
    logicalAnalysis: LogicalAnalysis,
    evidenceEvaluation: EvidenceEvaluation,
    argumentChain: ArgumentChain
  ): number {
    // Weight different factors
    const logicalWeight = 0.4;
    const evidenceWeight = 0.4;
    const argumentWeight = 0.2;

    const confidence =
      logicalAnalysis.logical_validity * logicalWeight +
      evidenceEvaluation.overall_strength * evidenceWeight +
      argumentChain.validity * argumentWeight;

    return Math.max(0, Math.min(1, confidence));
  }

  private generateAnalyticalInsights(
    problem: Problem,
    logicalAnalysis: LogicalAnalysis,
    evidenceEvaluation: EvidenceEvaluation
  ): string[] {
    const insights: string[] = [];

    // Logical insights
    if (logicalAnalysis.logical_validity > 0.8) {
      insights.push("Strong logical foundation supports systematic approach");
    }

    // Evidence insights
    if (evidenceEvaluation.overall_strength > 0.7) {
      insights.push("High-quality evidence enables confident decision-making");
    }

    // Problem-specific insights
    if (problem.complexity > 0.7 && problem.uncertainty < 0.4) {
      insights.push(
        "Complex but well-defined problem suitable for analytical methods"
      );
    }

    // Add base insights
    insights.push(...this.generateInsights(problem, []));

    return insights;
  }

  private assessLogicalValidity(
    premises: string[],
    inferences: string[],
    conclusions: string[]
  ): number {
    let validity = 0.7; // Base validity

    // Adjust based on structure quality
    if (premises.length > 0) validity += 0.1;
    if (inferences.length > 0) validity += 0.1;
    if (conclusions.length > 0) validity += 0.1;

    return Math.min(1.0, validity);
  }

  private assessSoundness(premises: string[], validity: number): string {
    if (validity > 0.8 && premises.length > 2) {
      return "Strong logical soundness with well-supported premises";
    } else if (validity > 0.6) {
      return "Moderate logical soundness with adequate premise support";
    } else {
      return "Limited logical soundness requiring additional premise validation";
    }
  }

  private assessArgumentValidity(
    premises: string[],
    inference_steps: string[],
    conclusion: string
  ): number {
    let validity = 0.6; // Base validity

    // Adjust based on argument structure
    if (premises.length > 1) validity += 0.1;
    if (inference_steps.length > 2) validity += 0.1;
    if (conclusion.length > 10) validity += 0.1; // Non-trivial conclusion

    return Math.min(1.0, validity);
  }

  private assessArgumentStrength(
    premises: string[],
    inference_steps: string[]
  ): number {
    let strength = 0.5; // Base strength

    // Adjust based on argument quality
    if (premises.length > 2) strength += 0.2;
    if (inference_steps.length > 3) strength += 0.2;

    return Math.min(1.0, strength);
  }
}
