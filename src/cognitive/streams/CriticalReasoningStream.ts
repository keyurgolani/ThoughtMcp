/**
 * Critical Reasoning Stream
 *
 * Focuses on identifying assumptions, evaluating arguments, and detecting biases
 */

import {
  ArgumentChain,
  ArgumentEvaluation,
  Assumption,
  BiasDetection,
  Evidence,
  ICriticalReasoningStream,
} from "../../interfaces/parallel-reasoning.js";
import { Problem } from "../../interfaces/systematic-thinking.js";
import { Context, ReasoningStep, ReasoningType } from "../../types/core.js";
import { BaseReasoningStream } from "./BaseReasoningStream.js";

export class CriticalReasoningStream
  extends BaseReasoningStream
  implements ICriticalReasoningStream
{
  // Known biases for reference
  // private readonly knownBiases: string[] = [
  //   "confirmation_bias",
  //   "anchoring_bias",
  //   "availability_heuristic",
  //   "overconfidence_bias",
  //   "sunk_cost_fallacy",
  //   "groupthink",
  //   "survivorship_bias",
  //   "selection_bias",
  // ];

  constructor(id?: string) {
    super(
      "critical",
      "Critical Reasoning Stream",
      "Critical evaluation, assumption identification, and bias detection",
      id
    );
  }

  protected async doInitialize(): Promise<void> {
    // Initialize critical reasoning components
    // This could include loading bias detection patterns, argument evaluation criteria, etc.
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

    // Step 1: Identify assumptions
    const assumptions = await this.identifyAssumptions(reasoningSteps);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.METACOGNITIVE,
        `Identified ${assumptions.length} key assumptions`,
        this.calculateAssumptionConfidence(assumptions),
        { assumptions }
      )
    );

    // Step 2: Evaluate arguments (create mock arguments from problem)
    const mockArguments = this.createArgumentsFromProblem(problem);
    const argumentEvaluations = await this.evaluateArguments(mockArguments);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.METACOGNITIVE,
        `Evaluated ${argumentEvaluations.length} arguments`,
        this.calculateArgumentEvaluationConfidence(argumentEvaluations),
        { argument_evaluations: argumentEvaluations }
      )
    );

    // Step 3: Detect biases
    const biasDetections = await this.detectBiases(reasoningSteps);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.METACOGNITIVE,
        `Detected ${biasDetections.length} potential biases`,
        this.calculateBiasDetectionConfidence(biasDetections),
        { bias_detections: biasDetections }
      )
    );

    // Step 4: Critical evaluation of problem framing
    const framingEvaluation = this.evaluateProblemFraming(problem);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.METACOGNITIVE,
        `Problem framing evaluation: ${framingEvaluation.assessment}`,
        framingEvaluation.confidence,
        { framing_evaluation: framingEvaluation }
      )
    );

    // Step 5: Identify logical fallacies
    const logicalFallacies = this.identifyLogicalFallacies(problem, context);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.METACOGNITIVE,
        `Identified ${logicalFallacies.length} potential logical fallacies`,
        logicalFallacies.length > 0 ? 0.8 : 0.6,
        { logical_fallacies: logicalFallacies }
      )
    );

    // Generate evidence from critical analysis
    evidence.push(
      ...this.generateCriticalEvidence(
        assumptions,
        argumentEvaluations,
        biasDetections
      )
    );

    // Generate conclusions
    const conclusions = this.generateCriticalConclusions(
      assumptions,
      argumentEvaluations,
      biasDetections,
      framingEvaluation
    );

    // Generate insights
    const insights = this.generateCriticalInsights(
      problem,
      assumptions,
      biasDetections,
      framingEvaluation
    );

    // Calculate overall confidence
    const confidence = this.calculateCriticalConfidence(
      assumptions,
      argumentEvaluations,
      biasDetections
    );

    return {
      reasoning_steps: reasoningSteps,
      conclusions,
      confidence,
      insights,
      evidence,
      assumptions: assumptions.map((a) => a.assumption),
    };
  }

  protected doReset(): void {
    // Reset critical reasoning state
  }

  async identifyAssumptions(reasoning: ReasoningStep[]): Promise<Assumption[]> {
    const assumptions: Assumption[] = [];

    // Common implicit assumptions
    assumptions.push({
      assumption: "The problem as stated is the real problem to solve",
      implicit: true,
      validity: 0.7,
      impact_if_false: "May be solving the wrong problem entirely",
    });

    assumptions.push({
      assumption: "Current information is complete and accurate",
      implicit: true,
      validity: 0.6,
      impact_if_false: "Solutions may be based on incomplete or incorrect data",
    });

    assumptions.push({
      assumption: "Past patterns will continue into the future",
      implicit: true,
      validity: 0.5,
      impact_if_false: "Solutions may not work in changing conditions",
    });

    // Reasoning-specific assumptions
    if (reasoning.length > 0) {
      assumptions.push({
        assumption: "The reasoning process is unbiased and objective",
        implicit: true,
        validity: 0.4,
        impact_if_false: "Conclusions may be skewed by cognitive biases",
      });
    }

    // Resource assumptions
    assumptions.push({
      assumption: "Necessary resources will be available for implementation",
      implicit: false,
      validity: 0.6,
      impact_if_false:
        "Solutions may be impractical due to resource constraints",
    });

    return assumptions;
  }

  async evaluateArguments(
    argumentChains: ArgumentChain[]
  ): Promise<ArgumentEvaluation[]> {
    const evaluations: ArgumentEvaluation[] = [];

    for (const argument of argumentChains) {
      const strengths: string[] = [];
      const weaknesses: string[] = [];
      let overall_quality = 0.5;

      // Evaluate premises
      if (argument.premises.length > 1) {
        strengths.push("Multiple supporting premises");
        overall_quality += 0.1;
      } else if (argument.premises.length === 0) {
        weaknesses.push("No supporting premises provided");
        overall_quality -= 0.2;
      }

      // Evaluate inference steps
      if (argument.inference_steps.length > 2) {
        strengths.push("Detailed reasoning process");
        overall_quality += 0.1;
      } else if (argument.inference_steps.length === 0) {
        weaknesses.push("No clear reasoning steps");
        overall_quality -= 0.2;
      }

      // Evaluate validity
      if (argument.validity > 0.8) {
        strengths.push("High logical validity");
        overall_quality += 0.2;
      } else if (argument.validity < 0.5) {
        weaknesses.push("Low logical validity");
        overall_quality -= 0.2;
      }

      // Evaluate strength
      if (argument.strength > 0.7) {
        strengths.push("Strong supporting evidence");
        overall_quality += 0.1;
      } else if (argument.strength < 0.4) {
        weaknesses.push("Weak supporting evidence");
        overall_quality -= 0.1;
      }

      overall_quality = Math.max(0, Math.min(1, overall_quality));

      evaluations.push({
        argument,
        strengths,
        weaknesses,
        overall_quality,
      });
    }

    return evaluations;
  }

  async detectBiases(reasoning: ReasoningStep[]): Promise<BiasDetection[]> {
    const biases: BiasDetection[] = [];

    // Confirmation bias detection
    const confirmationBias = this.detectConfirmationBias(reasoning);
    if (confirmationBias) {
      biases.push(confirmationBias);
    }

    // Anchoring bias detection
    const anchoringBias = this.detectAnchoringBias(reasoning);
    if (anchoringBias) {
      biases.push(anchoringBias);
    }

    // Availability heuristic detection
    const availabilityBias = this.detectAvailabilityHeuristic(reasoning);
    if (availabilityBias) {
      biases.push(availabilityBias);
    }

    // Overconfidence bias detection
    const overconfidenceBias = this.detectOverconfidenceBias(reasoning);
    if (overconfidenceBias) {
      biases.push(overconfidenceBias);
    }

    return biases;
  }

  private createArgumentsFromProblem(problem: Problem): ArgumentChain[] {
    const argumentChains: ArgumentChain[] = [];

    // Create argument about problem complexity
    if (problem.complexity > 0.7) {
      argumentChains.push({
        premises: [
          `Problem has complexity score of ${problem.complexity}`,
          "High complexity problems require systematic approaches",
        ],
        inference_steps: [
          "Assess problem complexity",
          "Match complexity to appropriate solution approach",
        ],
        conclusion: "This problem requires a systematic, structured approach",
        validity: 0.8,
        strength: 0.7,
      });
    }

    // Create argument about time sensitivity
    if (problem.time_sensitivity > 0.7) {
      argumentChains.push({
        premises: [
          `Problem has time sensitivity score of ${problem.time_sensitivity}`,
          "Time-sensitive problems require rapid decision-making",
        ],
        inference_steps: [
          "Assess time constraints",
          "Balance thoroughness with speed requirements",
        ],
        conclusion:
          "Quick decision-making is prioritized over exhaustive analysis",
        validity: 0.7,
        strength: 0.6,
      });
    }

    return argumentChains;
  }

  private evaluateProblemFraming(problem: Problem): {
    assessment: string;
    confidence: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 0.7;

    // Check for framing issues
    if (problem.description.length < 50) {
      issues.push("Problem description may be too brief");
      suggestions.push("Provide more detailed problem description");
      confidence -= 0.1;
    }

    if (problem.constraints.length === 0) {
      issues.push("No constraints identified - may be unrealistic");
      suggestions.push("Identify and document relevant constraints");
      confidence -= 0.1;
    }

    if (problem.stakeholders.length === 0) {
      issues.push("No stakeholders identified");
      suggestions.push("Identify all relevant stakeholders");
      confidence -= 0.1;
    }

    if (problem.uncertainty > 0.8) {
      issues.push(
        "Very high uncertainty may indicate unclear problem definition"
      );
      suggestions.push("Gather more information to reduce uncertainty");
      confidence -= 0.1;
    }

    const assessment =
      issues.length === 0
        ? "Problem framing appears adequate"
        : `Problem framing has ${issues.length} potential issues`;

    return {
      assessment,
      confidence: Math.max(0.3, confidence),
      issues,
      suggestions,
    };
  }

  private identifyLogicalFallacies(
    problem: Problem,
    _context?: Context
  ): string[] {
    const fallacies: string[] = [];

    // Check for hasty generalization
    if (
      problem.description.includes("always") ?? problem.description.includes("never")
    ) {
      fallacies.push("Potential hasty generalization (absolute statements)");
    }

    // Check for false dichotomy
    if (
      problem.description.includes("either") &&
      problem.description.includes("or")
    ) {
      fallacies.push("Potential false dichotomy (limited options presented)");
    }

    // Check for appeal to authority
    if (
      problem.description.includes("expert") ?? problem.description.includes("authority")
    ) {
      fallacies.push(
        "Potential appeal to authority (expert opinion without evidence)"
      );
    }

    // Check for circular reasoning
    const words = problem.description.toLowerCase().split(/\s+/);
    const repeatedWords = words.filter(
      (word, index) => words.indexOf(word) !== index && word.length > 4
    );
    if (repeatedWords.length > 2) {
      fallacies.push("Potential circular reasoning (repeated concepts)");
    }

    return fallacies;
  }

  private detectConfirmationBias(
    reasoning: ReasoningStep[]
  ): BiasDetection | null {
    // Simple heuristic: if all reasoning steps have high confidence, might indicate confirmation bias
    const highConfidenceSteps = reasoning.filter(
      (step) => step.confidence > 0.8
    );

    if (
      highConfidenceSteps.length === reasoning.length &&
      reasoning.length > 2
    ) {
      return {
        bias_type: "confirmation_bias",
        description:
          "All reasoning steps show high confidence, may indicate selective evidence consideration",
        severity: 0.6,
        mitigation_suggestions: [
          "Actively seek disconfirming evidence",
          "Consider alternative explanations",
          "Invite devil's advocate perspectives",
        ],
      };
    }

    return null;
  }

  private detectAnchoringBias(
    reasoning: ReasoningStep[]
  ): BiasDetection | null {
    // Check if first reasoning step has disproportionate influence
    if (reasoning.length > 1) {
      const firstStepConfidence = reasoning[0].confidence;
      const avgOtherConfidence =
        reasoning.slice(1).reduce((sum, step) => sum + step.confidence, 0) /
        (reasoning.length - 1);

      if (firstStepConfidence > avgOtherConfidence + 0.3) {
        return {
          bias_type: "anchoring_bias",
          description:
            "First reasoning step has disproportionately high confidence",
          severity: 0.5,
          mitigation_suggestions: [
            "Consider multiple starting points",
            "Question initial assumptions",
            "Use structured decision-making processes",
          ],
        };
      }
    }

    return null;
  }

  private detectAvailabilityHeuristic(
    reasoning: ReasoningStep[]
  ): BiasDetection | null {
    // Check for recent or memorable examples dominating reasoning
    const recentKeywords = [
      "recent",
      "lately",
      "just",
      "yesterday",
      "last week",
    ];
    const memorableKeywords = ["dramatic", "shocking", "memorable", "vivid"];

    const hasRecentBias = reasoning.some((step) =>
      recentKeywords.some((keyword) =>
        step.content.toLowerCase().includes(keyword)
      )
    );

    const hasMemorableBias = reasoning.some((step) =>
      memorableKeywords.some((keyword) =>
        step.content.toLowerCase().includes(keyword)
      )
    );

    if (hasRecentBias ?? hasMemorableBias) {
      return {
        bias_type: "availability_heuristic",
        description:
          "Reasoning may be influenced by recent or memorable examples",
        severity: 0.4,
        mitigation_suggestions: [
          "Seek representative data samples",
          "Use statistical base rates",
          "Consider long-term patterns",
        ],
      };
    }

    return null;
  }

  private detectOverconfidenceBias(
    reasoning: ReasoningStep[]
  ): BiasDetection | null {
    // Check for consistently high confidence without corresponding evidence quality
    const avgConfidence =
      reasoning.reduce((sum, step) => sum + step.confidence, 0) /
      reasoning.length;

    if (avgConfidence > 0.85 && reasoning.length > 2) {
      return {
        bias_type: "overconfidence_bias",
        description:
          "Consistently high confidence levels may indicate overconfidence",
        severity: 0.5,
        mitigation_suggestions: [
          "Calibrate confidence with historical accuracy",
          "Seek external validation",
          "Consider uncertainty explicitly",
        ],
      };
    }

    return null;
  }

  private generateCriticalEvidence(
    assumptions: Assumption[],
    argumentEvaluations: ArgumentEvaluation[],
    biasDetections: BiasDetection[]
  ): Evidence[] {
    const evidence: Evidence[] = [];

    // Evidence from assumption analysis
    if (assumptions.length > 0) {
      const avgValidity =
        assumptions.reduce((sum, a) => sum + a.validity, 0) /
        assumptions.length;
      evidence.push(
        this.createEvidence(
          `Identified ${
            assumptions.length
          } assumptions with average validity ${avgValidity.toFixed(2)}`,
          "assumption_analysis",
          0.8,
          0.9
        )
      );
    }

    // Evidence from argument evaluation
    if (argumentEvaluations.length > 0) {
      const avgQuality =
        argumentEvaluations.reduce((sum, e) => sum + e.overall_quality, 0) /
        argumentEvaluations.length;
      evidence.push(
        this.createEvidence(
          `Evaluated ${
            argumentEvaluations.length
          } arguments with average quality ${avgQuality.toFixed(2)}`,
          "argument_evaluation",
          0.85,
          0.9
        )
      );
    }

    // Evidence from bias detection
    if (biasDetections.length > 0) {
      evidence.push(
        this.createEvidence(
          `Detected ${biasDetections.length} potential cognitive biases`,
          "bias_detection",
          0.7,
          0.95
        )
      );
    }

    return evidence;
  }

  private generateCriticalConclusions(
    assumptions: Assumption[],
    argumentEvaluations: ArgumentEvaluation[],
    biasDetections: BiasDetection[],
    framingEvaluation: { assessment: string; issues: string[] }
  ): string[] {
    const conclusions: string[] = [];

    // Assumption-based conclusions
    const weakAssumptions = assumptions.filter((a) => a.validity < 0.6);
    if (weakAssumptions.length > 0) {
      conclusions.push(
        `${weakAssumptions.length} assumptions require validation`
      );
    }

    // Argument-based conclusions
    const weakArguments = argumentEvaluations.filter(
      (e) => e.overall_quality < 0.6
    );
    if (weakArguments.length > 0) {
      conclusions.push(`${weakArguments.length} arguments need strengthening`);
    }

    // Bias-based conclusions
    if (biasDetections.length > 0) {
      const severeBiases = biasDetections.filter((b) => b.severity > 0.6);
      if (severeBiases.length > 0) {
        conclusions.push(
          `${severeBiases.length} significant biases detected requiring mitigation`
        );
      } else {
        conclusions.push("Minor biases detected, monitoring recommended");
      }
    } else {
      conclusions.push("No significant cognitive biases detected");
    }

    // Framing-based conclusions
    if (framingEvaluation.issues.length > 0) {
      conclusions.push("Problem framing requires refinement");
    } else {
      conclusions.push("Problem framing appears adequate");
    }

    return conclusions;
  }

  private generateCriticalInsights(
    problem: Problem,
    assumptions: Assumption[],
    biasDetections: BiasDetection[],
    framingEvaluation: { assessment: string; suggestions: string[] }
  ): string[] {
    const insights: string[] = [];

    // Assumption insights
    const implicitAssumptions = assumptions.filter((a) => a.implicit);
    if (implicitAssumptions.length > 0) {
      insights.push(
        "Multiple implicit assumptions may affect solution validity"
      );
    }

    // Bias insights
    if (biasDetections.length > 0) {
      insights.push("Cognitive biases present - systematic mitigation needed");
    }

    // Framing insights
    if (framingEvaluation.suggestions.length > 0) {
      insights.push(
        "Problem framing improvements could enhance solution quality"
      );
    }

    // Problem-specific insights
    if (problem.uncertainty > 0.7) {
      insights.push("High uncertainty requires explicit risk management");
    }

    // Add base insights
    insights.push(...this.generateInsights(problem, []));

    return insights;
  }

  private calculateAssumptionConfidence(assumptions: Assumption[]): number {
    if (assumptions.length === 0) return 0.3;

    const avgValidity =
      assumptions.reduce((sum, a) => sum + a.validity, 0) / assumptions.length;
    return avgValidity;
  }

  private calculateArgumentEvaluationConfidence(
    evaluations: ArgumentEvaluation[]
  ): number {
    if (evaluations.length === 0) return 0.3;

    const avgQuality =
      evaluations.reduce((sum, e) => sum + e.overall_quality, 0) /
      evaluations.length;
    return avgQuality;
  }

  private calculateBiasDetectionConfidence(biases: BiasDetection[]): number {
    // Higher confidence when biases are detected (indicates good detection)
    return biases.length > 0 ? 0.8 : 0.6;
  }

  private calculateCriticalConfidence(
    assumptions: Assumption[],
    argumentEvaluations: ArgumentEvaluation[],
    biasDetections: BiasDetection[]
  ): number {
    const assumptionConfidence =
      this.calculateAssumptionConfidence(assumptions);
    const argumentConfidence =
      this.calculateArgumentEvaluationConfidence(argumentEvaluations);
    const biasConfidence =
      this.calculateBiasDetectionConfidence(biasDetections);

    return (assumptionConfidence + argumentConfidence + biasConfidence) / 3;
  }
}
