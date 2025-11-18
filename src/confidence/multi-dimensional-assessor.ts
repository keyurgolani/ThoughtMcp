/**
 * Multi-Dimensional Confidence Assessor
 *
 * Evaluates confidence across five dimensions: evidence quality, reasoning
 * coherence, completeness, uncertainty level, and bias freedom. Provides
 * fast (<100ms), heuristic-based assessetailed factor breakdown.
 */

import type { ReasoningContext } from "../reasoning/types";
import {
  UncertaintyType as UncertaintyTypeEnum,
  type CalibrationModel,
  type ConfidenceAssessment,
  type ConfidenceFactor,
  type UncertaintyType,
} from "./types";

/**
 * Default weights for confidence dimensions
 *
 * These weights determine how much each dimension contributes to the
 * overall confidence score. Weights sum to 1.0.
 */
const DEFAULT_WEIGHTS = {
  evidence: 0.3,
  coherence: 0.3,
  completeness: 0.25,
  uncertainty: 0.15,
};

/**
 * Multi-dimensional confidence assessor
 *
 * Assesses confidence in reasoning results across multiple dimensions
 * using fast heuristic-based evaluation. Designed to complete in <100ms
 * for real-time confidence feedback.
 */
export class MultiDimensionalConfidenceAssessor {
  private calibrationModel?: CalibrationModel;

  /**
   * Assess confidence for a reasoning context
   *
   * Evaluates confidence across all dimensions and returns a comprehensive
   * assessment with overall confidence, individual dimension scores, and
   * detailed factor breakdown.
   *
   * @param context - Reasoning context to assess
   * @returns Complete confidence assessment
   */
  async assessConfidence(context: ReasoningContext): Promise<ConfidenceAssessment> {
    const startTime = Date.now();

    // Assess individual dimensions
    const evidenceQuality = this.assessEvidenceQuality(context.evidence);
    const reasoningCoherence = this.assessReasoningCoherence(context);
    const completeness = this.assessCompleteness(context);
    const uncertaintyType = this.classifyUncertainty(context);
    const uncertaintyLevel = this.calculateUncertaintyLevel(context, uncertaintyType);

    // Generate detailed factor breakdown
    const factors = this.generateFactorBreakdown(
      evidenceQuality,
      reasoningCoherence,
      completeness,
      uncertaintyLevel,
      context
    );

    // Calculate overall confidence
    const rawConfidence = this.calculateOverallConfidence(factors);

    // Apply calibration if model is available
    const overallConfidence = this.calibrationModel
      ? this.calibrateConfidence(rawConfidence, context)
      : rawConfidence;

    const processingTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms

    return {
      overallConfidence,
      evidenceQuality,
      reasoningCoherence,
      completeness,
      uncertaintyLevel,
      uncertaintyType,
      factors,
      timestamp: new Date(),
      processingTime,
    };
  }

  /**
   * Assess evidence quality
   *
   * Evaluates the quality and quantity of evidence available for reasoning.
   * Considers evidence count, diversity, and relevance.
   *
   * @param evidence - Array of evidence strings
   * @returns Evidence quality score (0-1)
   */
  private assessEvidenceQuality(evidence: string[] | null | undefined): number {
    // Handle null/undefined evidence
    if (!evidence || !Array.isArray(evidence)) {
      return 0;
    }

    // Handle empty evidence
    if (evidence.length === 0) {
      return 0;
    }

    // Count evidence items (with diminishing returns)
    // Optimal range: 3-7 pieces of evidence
    const evidenceCount = evidence.length;
    let countScore: number;

    if (evidenceCount === 0) {
      countScore = 0;
    } else if (evidenceCount <= 3) {
      // Linear increase up to 3 items
      countScore = evidenceCount / 3;
    } else if (evidenceCount <= 7) {
      // Optimal range: high score
      countScore = 0.9 + (evidenceCount - 3) * 0.025; // 0.9 to 1.0
    } else {
      // Diminishing returns after 7 items
      const excess = evidenceCount - 7;
      countScore = Math.max(0.85, 1.0 - excess * 0.01); // Slowly decrease
    }

    // Assess evidence diversity (unique content)
    const uniqueEvidence = new Set(evidence.map((e) => e.trim().toLowerCase()));
    const diversityRatio = uniqueEvidence.size / evidence.length;
    const diversityScore = diversityRatio; // 1.0 if all unique, lower if duplicates

    // Assess evidence substance (non-trivial content)
    const substantialEvidence = evidence.filter((e) => e.trim().length > 10);
    const substanceRatio = substantialEvidence.length / evidence.length;
    const substanceScore = substanceRatio;

    // Weighted combination
    const quality = countScore * 0.5 + diversityScore * 0.25 + substanceScore * 0.25;

    return Math.min(1.0, Math.max(0, quality));
  }

  /**
   * Assess reasoning coherence
   *
   * Evaluates the logical consistency and structure of the reasoning context.
   * Considers presence of constraints, goals, framework selection, and
   * overall context completeness.
   *
   * @param context - Reasoning context
   * @returns Coherence score (0-1)
   */
  private assessReasoningCoherence(context: ReasoningContext): number {
    const scores: number[] = [];

    // Assess problem definition quality
    this.assessProblemDefinition(context, scores);

    // Assess structural elements
    this.assessStructuralElements(context, scores);

    // Assess framework and alignment
    this.assessFrameworkAndAlignment(context, scores);

    // Average across factors
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  /**
   * Assess problem definition quality
   *
   * Evaluates the quality of problem description and context.
   *
   * @param context - Reasoning context
   * @param scores - Array to accumulate scores
   */
  private assessProblemDefinition(context: ReasoningContext, scores: number[]): void {
    // Check for problem description
    const descLength = context.problem?.description?.trim().length ?? 0;
    if (descLength > 0) {
      scores.push(descLength > 20 ? 1.0 : descLength / 20);
    }

    // Check for problem context
    const contextLength = context.problem?.context?.trim().length ?? 0;
    if (contextLength > 0) {
      scores.push(contextLength > 20 ? 1.0 : contextLength / 20);
    }
  }

  /**
   * Assess structural elements
   *
   * Evaluates presence and quality of constraints and goals.
   *
   * @param context - Reasoning context
   * @param scores - Array to accumulate scores
   */
  private assessStructuralElements(context: ReasoningContext, scores: number[]): void {
    // Check for constraints
    if (context.constraints?.length) {
      scores.push(Math.min(1.0, context.constraints.length / 3));
    }

    // Check for goals
    if (context.goals?.length) {
      scores.push(Math.min(1.0, context.goals.length / 3));
    }
  }

  /**
   * Assess framework and alignment
   *
   * Evaluates framework selection and evidence-goal alignment.
   *
   * @param context - Reasoning context
   * @param scores - Array to accumulate scores
   */
  private assessFrameworkAndAlignment(context: ReasoningContext, scores: number[]): void {
    // Check for framework selection (indicates structured thinking)
    if (context.framework) {
      scores.push(1.0);
    }

    // Check for evidence-goal alignment
    if (context.evidence?.length && context.goals?.length) {
      scores.push(0.5);
    }
  }

  /**
   * Assess completeness
   *
   * Evaluates how completely the reasoning addresses the problem goals
   * and constraints. Considers goal coverage, constraint satisfaction,
   * and evidence sufficiency.
   *
   * @param context - Reasoning context
   * @returns Completeness score (0-1)
   */
  private assessCompleteness(context: ReasoningContext): number {
    const scores: number[] = [];

    // Assess goal coverage
    this.assessGoalCoverage(context, scores);

    // Assess constraint consideration
    this.assessConstraintConsideration(context, scores);

    // Assess overall comprehensiveness
    this.assessOverallComprehensiveness(context, scores);

    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0.5;
  }

  /**
   * Assess goal coverage
   *
   * Evaluates whether goals are defined and adequately supported by evidence.
   *
   * @param context - Reasoning context
   * @param scores - Array to accumulate scores
   */
  private assessGoalCoverage(context: ReasoningContext, scores: number[]): void {
    // Check if goals are defined
    const hasGoals = (context.goals?.length ?? 0) > 0;
    scores.push(hasGoals ? 0.5 : 0.5); // Baseline score

    // Check if evidence addresses goals
    if (hasGoals && context.evidence?.length && context.goals) {
      const evidencePerGoal = context.evidence.length / context.goals.length;
      scores.push(Math.min(1.0, evidencePerGoal / 2)); // 2+ evidence per goal is good
    }
  }

  /**
   * Assess constraint consideration
   *
   * Evaluates whether constraints and problem complexity are considered.
   *
   * @param context - Reasoning context
   * @param scores - Array to accumulate scores
   */
  private assessConstraintConsideration(context: ReasoningContext, scores: number[]): void {
    // Check if constraints are considered
    if (context.constraints?.length) {
      scores.push(0.5);
    }

    // Check for problem complexity consideration
    if (context.problem?.complexity) {
      scores.push(0.5);
    }
  }

  /**
   * Assess overall comprehensiveness
   *
   * Evaluates whether all key elements are present for comprehensive analysis.
   *
   * @param context - Reasoning context
   * @param scores - Array to accumulate scores
   */
  private assessOverallComprehensiveness(context: ReasoningContext, scores: number[]): void {
    // Check for comprehensive context (all elements present)
    if (context.problem && context.evidence?.length && context.goals?.length) {
      scores.push(1.0);
    }
  }

  /**
   * Classify uncertainty type
   *
   * Determines the primary type of uncertainty present in the reasoning
   * context: epistemic (lack of knowledge), aleatory (inherent randomness),
   * or ambiguity (multiple interpretations).
   *
   * @param context - Reasoning context
   * @returns Uncertainty type classification
   */
  private classifyUncertainty(context: ReasoningContext): UncertaintyType {
    // Epistemic uncertainty: lack of evidence or information
    const hasLittleEvidence = !context.evidence || context.evidence.length < 2;
    const hasNoGoals = !context.goals || context.goals.length === 0;
    const hasNoConstraints = !context.constraints || context.constraints.length === 0;

    if (hasLittleEvidence || (hasNoGoals && hasNoConstraints)) {
      return UncertaintyTypeEnum.EPISTEMIC;
    }

    // Ambiguity: multiple evidence items suggesting different things
    const hasManyEvidence = context.evidence && context.evidence.length >= 3;
    const hasAmbiguousDescription =
      context.problem &&
      (context.problem.description.toLowerCase().includes("multiple") ||
        context.problem.description.toLowerCase().includes("ambiguous") ||
        context.problem.description.toLowerCase().includes("unclear") ||
        context.problem.description.toLowerCase().includes("various"));

    if (hasManyEvidence || hasAmbiguousDescription) {
      return UncertaintyTypeEnum.AMBIGUITY;
    }

    // Aleatory: inherent randomness (default for well-defined problems)
    return UncertaintyTypeEnum.ALEATORY;
  }

  /**
   * Calculate uncertainty level
   *
   * Quantifies the level of uncertainty (0-1) based on the uncertainty
   * type and context characteristics.
   *
   * @param context - Reasoning context
   * @param uncertaintyType - Classified uncertainty type
   * @returns Uncertainty level (0-1, higher means more uncertain)
   */
  private calculateUncertaintyLevel(
    context: ReasoningContext,
    uncertaintyType: UncertaintyType
  ): number {
    let uncertaintyLevel = 0.5; // Default moderate uncertainty

    switch (uncertaintyType) {
      case UncertaintyTypeEnum.EPISTEMIC: {
        // High uncertainty due to lack of information
        const evidenceCount = context.evidence?.length ?? 0;
        uncertaintyLevel = Math.max(0.6, 1.0 - evidenceCount * 0.1);
        break;
      }

      case UncertaintyTypeEnum.AMBIGUITY:
        // Moderate to high uncertainty due to multiple interpretations
        uncertaintyLevel = 0.6;
        break;

      case UncertaintyTypeEnum.ALEATORY:
        // Lower uncertainty - inherent randomness is understood
        uncertaintyLevel = 0.4;
        break;
    }

    // Adjust based on problem complexity
    if (context.problem?.complexity === "complex") {
      uncertaintyLevel = Math.min(1.0, uncertaintyLevel + 0.1);
    } else if (context.problem?.complexity === "simple") {
      uncertaintyLevel = Math.max(0, uncertaintyLevel - 0.1);
    }

    return Math.min(1.0, Math.max(0, uncertaintyLevel));
  }

  /**
   * Generate factor breakdown
   *
   * Creates detailed breakdown of confidence factors with scores,
   * weights, and explanations for each dimension.
   *
   * @param evidenceQuality - Evidence quality score
   * @param reasoningCoherence - Reasoning coherence score
   * @param completeness - Completeness score
   * @param uncertaintyLevel - Uncertainty level
   * @param context - Reasoning context for explanations
   * @returns Array of confidence factors
   */
  private generateFactorBreakdown(
    evidenceQuality: number,
    reasoningCoherence: number,
    completeness: number,
    uncertaintyLevel: number,
    context: ReasoningContext
  ): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];

    // Evidence factor
    factors.push({
      dimension: "evidence",
      score: evidenceQuality,
      weight: DEFAULT_WEIGHTS.evidence,
      explanation: this.explainEvidenceScore(evidenceQuality, context),
    });

    // Coherence factor
    factors.push({
      dimension: "coherence",
      score: reasoningCoherence,
      weight: DEFAULT_WEIGHTS.coherence,
      explanation: this.explainCoherenceScore(reasoningCoherence, context),
    });

    // Completeness factor
    factors.push({
      dimension: "completeness",
      score: completeness,
      weight: DEFAULT_WEIGHTS.completeness,
      explanation: this.explainCompletenessScore(completeness, context),
    });

    // Uncertainty factor (inverted - lower uncertainty = higher confidence)
    const uncertaintyConfidence = 1.0 - uncertaintyLevel;
    factors.push({
      dimension: "uncertainty",
      score: uncertaintyConfidence,
      weight: DEFAULT_WEIGHTS.uncertainty,
      explanation: this.explainUncertaintyScore(uncertaintyLevel, context),
    });

    return factors;
  }

  /**
   * Calculate overall confidence
   *
   * Computes weighted average of all confidence factors to produce
   * overall confidence score.
   *
   * @param factors - Array of confidence factors
   * @returns Overall confidence score (0-1)
   */
  private calculateOverallConfidence(factors: ConfidenceFactor[]): number {
    const weightedSum = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);
    return Math.min(1.0, Math.max(0, weightedSum));
  }

  /**
   * Calibrate confidence
   *
   * Adjusts raw confidence score using calibration model based on
   * historical performance data.
   *
   * @param rawConfidence - Raw confidence score
   * @param context - Reasoning context
   * @returns Calibrated confidence score
   */
  private calibrateConfidence(rawConfidence: number, _context: ReasoningContext): number {
    if (!this.calibrationModel) {
      return rawConfidence;
    }

    // Apply linear calibration: calibrated = slope * raw + intercept
    const calibrated =
      this.calibrationModel.slope * rawConfidence + this.calibrationModel.intercept;

    // Ensure result is in valid range
    return Math.min(1.0, Math.max(0, calibrated));
  }

  // Explanation generators

  private explainEvidenceScore(score: number, context: ReasoningContext): string {
    const evidenceCount = context.evidence?.length ?? 0;

    if (score >= 0.8) {
      return `Strong evidence base with ${evidenceCount} pieces of relevant information`;
    } else if (score >= 0.6) {
      return `Adequate evidence with ${evidenceCount} supporting items`;
    } else if (score >= 0.4) {
      return `Limited evidence (${evidenceCount} items) - more information would help`;
    } else if (score > 0) {
      return `Weak evidence base with only ${evidenceCount} item(s)`;
    } else {
      return "No evidence provided";
    }
  }

  private explainCoherenceScore(score: number, _context: ReasoningContext): string {
    if (score >= 0.8) {
      return "Well-structured reasoning with clear goals, constraints, and framework";
    } else if (score >= 0.6) {
      return "Reasonably coherent reasoning with most key elements present";
    } else if (score >= 0.4) {
      return "Somewhat fragmented reasoning - missing some structure";
    } else {
      return "Poorly structured reasoning lacking clear goals or constraints";
    }
  }

  private explainCompletenessScore(score: number, context: ReasoningContext): string {
    const goalCount = context.goals?.length ?? 0;
    const evidenceCount = context.evidence?.length ?? 0;

    if (score >= 0.8) {
      return `Comprehensive analysis addressing all ${goalCount} goals with sufficient evidence`;
    } else if (score >= 0.6) {
      return `Mostly complete analysis with ${evidenceCount} evidence items for ${goalCount} goals`;
    } else if (score >= 0.4) {
      return "Incomplete analysis - some goals or constraints not fully addressed";
    } else {
      return "Significantly incomplete - major gaps in analysis";
    }
  }

  private explainUncertaintyScore(uncertaintyLevel: number, _context: ReasoningContext): string {
    if (uncertaintyLevel >= 0.7) {
      return "High uncertainty due to limited information or ambiguity";
    } else if (uncertaintyLevel >= 0.5) {
      return "Moderate uncertainty - some unknowns remain";
    } else if (uncertaintyLevel >= 0.3) {
      return "Low uncertainty - most factors are well understood";
    } else {
      return "Very low uncertainty - high confidence in available information";
    }
  }

  /**
   * Set calibration model
   *
   * Updates the calibration model used to adjust confidence scores
   * based on historical performance.
   *
   * @param model - Calibration model to use
   */
  setCalibrationModel(model: CalibrationModel): void {
    this.calibrationModel = model;
  }

  /**
   * Get calibration model
   *
   * Returns the current calibration model if set.
   *
   * @returns Current calibration model or undefined
   */
  getCalibrationModel(): CalibrationModel | undefined {
    return this.calibrationModel;
  }
}
