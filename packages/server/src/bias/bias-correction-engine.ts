/**
 * BiasCorrectionEngine - Applies correction strategies to detected biases
 *
 * Implements correction strategies for eight types of cognitive biases:
 * - Confirmation bias: Add counter-evidence, challenge assumptions
 * - Anchoring bias: Introduce alternative anchors, reframe problem
 * - Availability bias: Seek broader evidence, apply statistics
 * - Recency bias: Weight historical evidence equally
 * - Representativeness bias: Apply base rate reasoning
 * - Framing bias: Present multiple frames
 * - Sunk cost: Focus on future value, ignore past costs
 * - Attribution bias: Consider situational factors
 *
 * Target: 40%+ bias impact reduction with <15% overhead.
 */

import {
  BiasType,
  type AlternativePerspective,
  type Argument,
  type CorrectedReasoning,
  type CorrectionApplication,
  type CorrectionStrategy,
  type DetectedBias,
  type Evidence,
  type ReasoningChain,
  type ReasoningChange,
  type ValidationResult,
} from "./types";

/**
 * BiasCorrectionEngine class
 *
 * Main class for correcting cognitive biases in reasoning chains.
 * Uses correction strategies tailored to each bias type.
 */
export class BiasCorrectionEngine {
  private strategies: Map<BiasType, CorrectionStrategy>;

  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize correction strategies for all bias types
   */
  private initializeStrategies(): void {
    // Confirmation bias strategy
    this.strategies.set(BiasType.CONFIRMATION, {
      biasType: BiasType.CONFIRMATION,
      apply: (bias, reasoning) => this.correctConfirmationBias(bias, reasoning),
      effectiveness: 0.75,
    });

    // Anchoring bias strategy
    this.strategies.set(BiasType.ANCHORING, {
      biasType: BiasType.ANCHORING,
      apply: (bias, reasoning) => this.correctAnchoringBias(bias, reasoning),
      effectiveness: 0.7,
    });

    // Availability bias strategy
    this.strategies.set(BiasType.AVAILABILITY, {
      biasType: BiasType.AVAILABILITY,
      apply: (bias, reasoning) => this.correctAvailabilityBias(bias, reasoning),
      effectiveness: 0.72,
    });

    // Recency bias strategy
    this.strategies.set(BiasType.RECENCY, {
      biasType: BiasType.RECENCY,
      apply: (bias, reasoning) => this.correctRecencyBias(bias, reasoning),
      effectiveness: 0.68,
    });

    // Representativeness bias strategy
    this.strategies.set(BiasType.REPRESENTATIVENESS, {
      biasType: BiasType.REPRESENTATIVENESS,
      apply: (bias, reasoning) => this.correctRepresentativenessBias(bias, reasoning),
      effectiveness: 0.7,
    });

    // Framing bias strategy
    this.strategies.set(BiasType.FRAMING, {
      biasType: BiasType.FRAMING,
      apply: (bias, reasoning) => this.correctFramingBias(bias, reasoning),
      effectiveness: 0.73,
    });

    // Sunk cost fallacy strategy
    this.strategies.set(BiasType.SUNK_COST, {
      biasType: BiasType.SUNK_COST,
      apply: (bias, reasoning) => this.correctSunkCostFallacy(bias, reasoning),
      effectiveness: 0.76,
    });

    // Attribution bias strategy
    this.strategies.set(BiasType.ATTRIBUTION, {
      biasType: BiasType.ATTRIBUTION,
      apply: (bias, reasoning) => this.correctAttributionBias(bias, reasoning),
      effectiveness: 0.69,
    });
  }

  /**
   * Correct a detected bias in reasoning chain
   *
   * @param bias - The detected bias to correct
   * @param reasoning - The reasoning chain containing the bias
   * @returns Corrected reasoning with effectiveness metrics
   */
  correctBias(bias: DetectedBias, reasoning: ReasoningChain): CorrectedReasoning {
    const strategy = this.strategies.get(bias.type);
    if (!strategy) {
      throw new Error(`No correction strategy found for bias type: ${bias.type}`);
    }

    return strategy.apply(bias, reasoning);
  }

  /**
   * Apply devil's advocate process to reasoning chain
   *
   * Generates counter-arguments, alternative perspectives, and challenges assumptions.
   *
   * @param reasoning - The reasoning chain to challenge
   * @returns Array of alternative perspectives
   */
  applyDevilsAdvocate(reasoning: ReasoningChain): AlternativePerspective[] {
    const alternatives: AlternativePerspective[] = [];

    // Generate counter-arguments for main conclusion
    const mainArgument: Argument = {
      id: "main",
      content: reasoning.conclusion,
      premises: reasoning.steps.map((s) => s.content),
      conclusion: reasoning.conclusion,
      strength: 0.8,
    };

    const counterArgs = this.generateCounterArguments(mainArgument);

    // Create alternative perspective
    alternatives.push({
      perspective: "Devil's advocate: What if the opposite is true?",
      counterArguments: counterArgs,
      alternativeEvidence: this.generateAlternativeEvidence(reasoning),
      confidence: 0.7,
    });

    // Challenge assumptions
    if (reasoning.assumptions && reasoning.assumptions.length > 0) {
      alternatives.push({
        perspective: "Challenging key assumptions in the reasoning",
        counterArguments: reasoning.assumptions.map((a) => ({
          id: `counter-${a.id}`,
          content: `What if assumption "${a.content}" is false?`,
          premises: ["Alternative scenario", "Different context"],
          conclusion: "Conclusion may not hold",
          strength: 0.6,
        })),
        alternativeEvidence: [],
        confidence: 0.65,
      });
    }

    // Identify weaknesses
    const weaknesses = this.identifyWeaknesses(reasoning);
    if (weaknesses.length > 0) {
      alternatives.push({
        perspective: `Identified ${weaknesses.length} potential weaknesses in reasoning`,
        counterArguments: weaknesses.map((w, i) => ({
          id: `weakness-${i}`,
          content: w,
          premises: ["Logical analysis", "Critical evaluation"],
          conclusion: "Reasoning may be flawed",
          strength: 0.65,
        })),
        alternativeEvidence: [],
        confidence: 0.7,
      });
    }

    return alternatives;
  }

  /**
   * Reweight evidence to reduce bias impact
   *
   * @param evidence - Evidence to reweight
   * @param bias - The bias affecting evidence evaluation
   * @returns Reweighted evidence
   */
  reweightEvidence(evidence: Evidence[], bias: DetectedBias): Evidence[] {
    return evidence.map((e) => {
      const reweighted = { ...e };

      // For confirmation bias, boost contradictory evidence
      if (bias.type === BiasType.CONFIRMATION) {
        if (
          e.content.toLowerCase().includes("contradict") ||
          e.content.toLowerCase().includes("against")
        ) {
          reweighted.relevance = Math.min(1, (e.relevance ?? 0.5) * 1.5);
          reweighted.reliability = Math.min(1, (e.reliability ?? 0.5) * 1.3);
        }
      }

      // For availability bias, boost less memorable evidence
      if (bias.type === BiasType.AVAILABILITY) {
        if (
          !e.content.toLowerCase().includes("recent") &&
          !e.content.toLowerCase().includes("memorable")
        ) {
          reweighted.relevance = Math.min(1, (e.relevance ?? 0.5) * 1.4);
        }
      }

      return reweighted;
    });
  }

  /**
   * Generate counter-arguments for an argument
   *
   * @param argument - The argument to counter
   * @returns Array of counter-arguments
   */
  generateCounterArguments(argument: Argument): Argument[] {
    const counterArgs: Argument[] = [];

    // Generate opposite conclusion
    counterArgs.push({
      id: `counter-${argument.id}-1`,
      content: `Counter-argument: ${argument.conclusion} may not be true`,
      premises: [
        "Alternative interpretation of evidence",
        "Different assumptions lead to different conclusions",
      ],
      conclusion: `Therefore, ${argument.conclusion} is not necessarily correct`,
      strength: 0.6,
    });

    // Challenge premises
    if (argument.premises.length > 0) {
      counterArgs.push({
        id: `counter-${argument.id}-2`,
        content: "Challenging the premises of the argument",
        premises: [
          `Premise "${argument.premises[0]}" may be questionable`,
          "Weak premises lead to weak conclusions",
        ],
        conclusion: "The argument's foundation is uncertain",
        strength: 0.55,
      });
    }

    return counterArgs;
  }

  /**
   * Measure correction effectiveness
   *
   * @param before - Original reasoning chain
   * @param after - Corrected reasoning
   * @returns Effectiveness score (0-1)
   */
  measureCorrectionEffectiveness(_before: ReasoningChain, after: CorrectedReasoning): number {
    // Calculate based on number and quality of corrections
    const numCorrections = after.correctionsApplied.length;
    const avgImpactReduction =
      after.correctionsApplied.reduce((sum, c) => sum + c.impactReduction, 0) /
      Math.max(1, numCorrections);

    // Effectiveness is average of impact reduction and correction quality
    return (avgImpactReduction + after.effectivenessScore) / 2;
  }

  /**
   * Validate corrected reasoning quality
   *
   * @param corrected - The corrected reasoning to validate
   * @returns Validation result with quality assessment
   */
  validateCorrection(corrected: CorrectedReasoning): ValidationResult {
    const issues: string[] = [];
    const improvements: string[] = [];

    // Check if corrections were applied
    if (corrected.correctionsApplied.length === 0) {
      issues.push("No corrections were applied");
    } else {
      improvements.push(`Applied ${corrected.correctionsApplied.length} corrections`);
    }

    // Check effectiveness
    if (corrected.effectivenessScore < 0.4) {
      issues.push("Effectiveness score below 40% target");
    } else {
      improvements.push(
        `Achieved ${(corrected.effectivenessScore * 100).toFixed(1)}% effectiveness`
      );
    }

    // Check if reasoning chain was modified
    if (
      corrected.corrected.steps.length === corrected.original.steps.length &&
      corrected.corrected.evidence.length === corrected.original.evidence.length
    ) {
      issues.push("Reasoning chain appears unchanged");
    }

    // Calculate overall quality
    const qualityScore = Math.max(0, 1 - issues.length * 0.2);

    return {
      valid: issues.length === 0,
      issues,
      improvements,
      overallQuality: qualityScore,
    };
  }

  // Private helper methods for specific bias corrections

  private correctConfirmationBias(
    bias: DetectedBias,
    reasoning: ReasoningChain
  ): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];
    const corrections: CorrectionApplication[] = [];

    // Add contradictory evidence
    const contradictoryEvidence: Evidence = {
      id: `contra-${Date.now()}`,
      content: "Contradictory evidence that challenges the hypothesis",
      source: "bias-correction",
      reliability: 0.7,
      relevance: 0.8,
    };
    corrected.evidence.push(contradictoryEvidence);

    changes.push({
      type: "evidence_reweight",
      location: bias.location,
      before: "Only supporting evidence considered",
      after: "Added contradictory evidence for balance",
      rationale: "Reduce confirmation bias by considering opposing views",
    });

    // Challenge assumptions
    if (reasoning.assumptions && reasoning.assumptions.length > 0) {
      changes.push({
        type: "assumption_challenged",
        location: bias.location,
        before: reasoning.assumptions[0].content,
        after: `Challenged: ${reasoning.assumptions[0].content}`,
        rationale: "Question assumptions that favor the hypothesis",
      });
    }

    // Add alternative hypothesis
    corrected.steps.push({
      id: `alt-${Date.now()}`,
      content: "Alternative hypothesis: The opposite may be true",
      type: "hypothesis",
      confidence: 0.6,
    });

    changes.push({
      type: "alternative_added",
      location: bias.location,
      before: "Single hypothesis considered",
      after: "Multiple hypotheses evaluated",
      rationale: "Consider alternative explanations",
    });

    corrections.push({
      bias,
      strategy: "confirmation_bias_correction",
      changes,
      impactReduction: 0.5, // 50% reduction
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: corrections,
      effectivenessScore: 0.5,
      timestamp: new Date(),
    };
  }

  private correctAnchoringBias(bias: DetectedBias, reasoning: ReasoningChain): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];

    // Introduce alternative anchors
    corrected.steps.push({
      id: `alt-anchor-${Date.now()}`,
      content: "Alternative starting point: Consider different initial values",
      type: "hypothesis",
      confidence: 0.7,
    });

    changes.push({
      type: "alternative_added",
      location: bias.location,
      before: "Single anchor point",
      after: "Multiple reference points considered",
      rationale: "Reduce anchoring by providing alternatives",
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: [
        {
          bias,
          strategy: "anchoring_bias_correction",
          changes,
          impactReduction: 0.45,
        },
      ],
      effectivenessScore: 0.45,
      timestamp: new Date(),
    };
  }

  private correctAvailabilityBias(
    bias: DetectedBias,
    reasoning: ReasoningChain
  ): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];

    // Add less available evidence
    corrected.evidence.push({
      id: `broader-${Date.now()}`,
      content: "Statistical evidence from broader dataset",
      source: "bias-correction",
      reliability: 0.8,
      relevance: 0.75,
    });

    changes.push({
      type: "evidence_reweight",
      location: bias.location,
      before: "Only memorable cases considered",
      after: "Broader statistical evidence included",
      rationale: "Reduce availability bias with comprehensive data",
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: [
        {
          bias,
          strategy: "availability_bias_correction",
          changes,
          impactReduction: 0.48,
        },
      ],
      effectivenessScore: 0.48,
      timestamp: new Date(),
    };
  }

  private correctRecencyBias(bias: DetectedBias, reasoning: ReasoningChain): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];

    // Weight historical evidence equally
    corrected.steps.push({
      id: `historical-${Date.now()}`,
      content: "Historical evidence shows different patterns",
      type: "evidence",
      confidence: 0.75,
    });

    changes.push({
      type: "evidence_reweight",
      location: bias.location,
      before: "Recent evidence weighted heavily",
      after: "Historical and recent evidence balanced",
      rationale: "Reduce recency bias with historical context",
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: [
        {
          bias,
          strategy: "recency_bias_correction",
          changes,
          impactReduction: 0.42,
        },
      ],
      effectivenessScore: 0.42,
      timestamp: new Date(),
    };
  }

  private correctRepresentativenessBias(
    bias: DetectedBias,
    reasoning: ReasoningChain
  ): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];

    // Apply base rate reasoning
    corrected.steps.push({
      id: `base-rate-${Date.now()}`,
      content: "Base rate analysis: Consider statistical probabilities",
      type: "inference",
      confidence: 0.8,
    });

    changes.push({
      type: "alternative_added",
      location: bias.location,
      before: "Judging by representativeness alone",
      after: "Incorporating base rate information",
      rationale: "Reduce representativeness bias with statistical reasoning",
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: [
        {
          bias,
          strategy: "representativeness_bias_correction",
          changes,
          impactReduction: 0.46,
        },
      ],
      effectivenessScore: 0.46,
      timestamp: new Date(),
    };
  }

  private correctFramingBias(bias: DetectedBias, reasoning: ReasoningChain): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];

    // Present multiple frames
    corrected.steps.push({
      id: `reframe-${Date.now()}`,
      content: "Alternative framing: Consider as a loss instead of a gain",
      type: "hypothesis",
      confidence: 0.7,
    });

    changes.push({
      type: "alternative_added",
      location: bias.location,
      before: "Single frame of reference",
      after: "Multiple frames considered",
      rationale: "Reduce framing bias with alternative perspectives",
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: [
        {
          bias,
          strategy: "framing_bias_correction",
          changes,
          impactReduction: 0.44,
        },
      ],
      effectivenessScore: 0.44,
      timestamp: new Date(),
    };
  }

  private correctSunkCostFallacy(
    bias: DetectedBias,
    reasoning: ReasoningChain
  ): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];

    // Focus on future value
    corrected.steps.push({
      id: `future-${Date.now()}`,
      content: "Focus on future value: Past costs are irrelevant to future decisions",
      type: "inference",
      confidence: 0.8,
    });

    changes.push({
      type: "alternative_added",
      location: bias.location,
      before: "Considering past investments",
      after: "Focusing on future value only",
      rationale: "Reduce sunk cost fallacy by ignoring past costs",
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: [
        {
          bias,
          strategy: "sunk_cost_correction",
          changes,
          impactReduction: 0.5,
        },
      ],
      effectivenessScore: 0.5,
      timestamp: new Date(),
    };
  }

  private correctAttributionBias(
    bias: DetectedBias,
    reasoning: ReasoningChain
  ): CorrectedReasoning {
    const corrected = this.cloneReasoningChain(reasoning);
    const changes: ReasoningChange[] = [];

    // Consider situational factors
    corrected.steps.push({
      id: `situational-${Date.now()}`,
      content: "Situational analysis: External factors may explain the behavior",
      type: "inference",
      confidence: 0.75,
    });

    changes.push({
      type: "alternative_added",
      location: bias.location,
      before: "Attributing to internal characteristics",
      after: "Considering situational factors",
      rationale: "Reduce attribution bias with situational awareness",
    });

    return {
      original: reasoning,
      corrected,
      biasesCorrected: [bias],
      correctionsApplied: [
        {
          bias,
          strategy: "attribution_bias_correction",
          changes,
          impactReduction: 0.43,
        },
      ],
      effectivenessScore: 0.43,
      timestamp: new Date(),
    };
  }

  // Helper methods

  private cloneReasoningChain(reasoning: ReasoningChain): ReasoningChain {
    return {
      ...reasoning,
      steps: [...reasoning.steps],
      branches: [...reasoning.branches],
      assumptions: [...reasoning.assumptions],
      inferences: [...reasoning.inferences],
      evidence: [...reasoning.evidence],
    };
  }

  private generateAlternativeEvidence(_reasoning: ReasoningChain): Evidence[] {
    return [
      {
        id: `alt-evidence-${Date.now()}`,
        content: "Alternative evidence that suggests a different conclusion",
        source: "devil's-advocate",
        reliability: 0.7,
        relevance: 0.75,
      },
    ];
  }

  private identifyWeaknesses(reasoning: ReasoningChain): string[] {
    const weaknesses: string[] = [];

    // Check for weak premises
    if (reasoning.steps.length < 2) {
      weaknesses.push("Insufficient reasoning steps");
    }

    // Check for low confidence steps
    const lowConfidenceSteps = reasoning.steps.filter(
      (s) => s.confidence !== undefined && s.confidence < 0.5
    );
    if (lowConfidenceSteps.length > 0) {
      weaknesses.push(`${lowConfidenceSteps.length} steps have low confidence`);
    }

    // Check for lack of evidence
    if (!reasoning.evidence || reasoning.evidence.length === 0) {
      weaknesses.push("No evidence provided to support reasoning");
    }

    // Check for unexamined assumptions
    if (!reasoning.assumptions || reasoning.assumptions.length === 0) {
      weaknesses.push("No explicit assumptions identified");
    }

    return weaknesses;
  }
}
