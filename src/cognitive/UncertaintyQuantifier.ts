/**
 * Uncertainty Quantifier for tracking epistemic and aleatoric uncertainty
 */

import {
  CombinedUncertainty,
  ConfidenceChange,
  ConfidenceEvolution,
  DataPoint,
  UncertaintyQuantifier as IUncertaintyQuantifier,
  KnowledgeState,
  ReasoningStep,
} from "../interfaces/probabilistic-reasoning.js";

export class UncertaintyQuantifier implements IUncertaintyQuantifier {
  private readonly EPISTEMIC_THRESHOLD = 0.1;
  private readonly ALEATORIC_THRESHOLD = 0.05;
  private readonly CONFIDENCE_STABILITY_WINDOW = 5;

  assessEpistemicUncertainty(knowledge: KnowledgeState): number {
    const knowledgeCompleteness =
      this.calculateKnowledgeCompleteness(knowledge);
    const knowledgeReliability = knowledge.confidence_in_knowledge;
    const knowledgeRecency = this.calculateKnowledgeRecency(knowledge);

    // Epistemic uncertainty increases with incomplete, unreliable, or outdated knowledge
    const completenessUncertainty = 1 - knowledgeCompleteness;
    const reliabilityUncertainty = 1 - knowledgeReliability;
    const recencyUncertainty = 1 - knowledgeRecency;

    // Combine uncertainties with weights
    const epistemicUncertainty =
      completenessUncertainty * 0.4 +
      reliabilityUncertainty * 0.4 +
      recencyUncertainty * 0.2;

    return Math.max(
      this.EPISTEMIC_THRESHOLD,
      Math.min(0.95, epistemicUncertainty)
    );
  }

  assessAleatoricUncertainty(data: DataPoint[]): number {
    if (data.length === 0) {
      return 0.5; // Default uncertainty when no data available
    }

    // Calculate inherent variability in the data
    const dataVariability = this.calculateDataVariability(data);
    const measurementUncertainty = this.calculateMeasurementUncertainty(data);
    const sourceReliabilityVariance =
      this.calculateSourceReliabilityVariance(data);

    // Aleatoric uncertainty comes from inherent randomness and measurement noise
    const aleatoricUncertainty =
      dataVariability * 0.5 +
      measurementUncertainty * 0.3 +
      sourceReliabilityVariance * 0.2;

    return Math.max(
      this.ALEATORIC_THRESHOLD,
      Math.min(0.95, aleatoricUncertainty)
    );
  }

  combineUncertainties(
    epistemic: number,
    aleatoric: number
  ): CombinedUncertainty {
    // Use quadrature sum for independent uncertainties
    const independentCombination = Math.sqrt(
      epistemic * epistemic + aleatoric * aleatoric
    );

    // Account for interaction effects
    const interactionEffects = this.calculateInteractionEffects(
      epistemic,
      aleatoric
    );

    // Total uncertainty with interaction effects
    const totalUncertainty = Math.min(
      0.99,
      independentCombination + interactionEffects
    );

    // Calculate confidence bounds
    const confidenceBounds = this.calculateConfidenceBounds(totalUncertainty);

    return {
      total_uncertainty: totalUncertainty,
      epistemic_component: epistemic,
      aleatoric_component: aleatoric,
      interaction_effects: interactionEffects,
      confidence_bounds: confidenceBounds,
    };
  }

  trackConfidenceEvolution(reasoning: ReasoningStep[]): ConfidenceEvolution {
    if (reasoning.length === 0) {
      return {
        initial_confidence: 0.5,
        final_confidence: 0.5,
        confidence_trajectory: [0.5],
        confidence_changes: [],
        stability_measure: 1.0,
      };
    }

    const confidenceTrajectory = reasoning.map((step) => step.confidence);
    const initialConfidence = confidenceTrajectory[0];
    const finalConfidence =
      confidenceTrajectory[confidenceTrajectory.length - 1];

    const confidenceChanges = this.identifyConfidenceChanges(reasoning);
    const stabilityMeasure =
      this.calculateStabilityMeasure(confidenceTrajectory);

    return {
      initial_confidence: initialConfidence,
      final_confidence: finalConfidence,
      confidence_trajectory: confidenceTrajectory,
      confidence_changes: confidenceChanges,
      stability_measure: stabilityMeasure,
    };
  }

  // Private helper methods
  private calculateKnowledgeCompleteness(knowledge: KnowledgeState): number {
    const totalKnowledgeItems =
      knowledge.known_facts.length +
      knowledge.uncertain_beliefs.size +
      knowledge.knowledge_gaps.length;

    if (totalKnowledgeItems === 0) {
      return 0.1; // Very low completeness when no knowledge available
    }

    const knownFactsWeight = knowledge.known_facts.length * 1.0;
    const uncertainBeliefsWeight = knowledge.uncertain_beliefs.size * 0.5;
    const knowledgeGapsPenalty = knowledge.knowledge_gaps.length * 0.8;

    const completenessScore =
      (knownFactsWeight + uncertainBeliefsWeight) /
      (totalKnowledgeItems + knowledgeGapsPenalty);

    return Math.max(0.1, Math.min(1.0, completenessScore));
  }

  private calculateKnowledgeRecency(knowledge: KnowledgeState): number {
    const currentTime = Date.now();
    const timeSinceUpdate = currentTime - knowledge.last_updated;

    // Knowledge becomes less reliable over time (exponential decay)
    const halfLife = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const recencyScore = Math.exp(-timeSinceUpdate / halfLife);

    return Math.max(0.1, Math.min(1.0, recencyScore));
  }

  private calculateDataVariability(data: DataPoint[]): number {
    if (data.length < 2) {
      return 0.5; // Default variability for insufficient data
    }

    // Calculate coefficient of variation for numerical data
    const uncertainties = data.map((point) => point.uncertainty);
    const mean =
      uncertainties.reduce((sum, val) => sum + val, 0) / uncertainties.length;
    const variance =
      uncertainties.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      uncertainties.length;
    const standardDeviation = Math.sqrt(variance);

    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0.5;

    return Math.max(0.01, Math.min(0.95, coefficientOfVariation));
  }

  private calculateMeasurementUncertainty(data: DataPoint[]): number {
    // Average uncertainty across all data points
    const avgUncertainty =
      data.reduce((sum, point) => sum + point.uncertainty, 0) / data.length;
    return Math.max(0.01, Math.min(0.95, avgUncertainty));
  }

  private calculateSourceReliabilityVariance(data: DataPoint[]): number {
    const reliabilities = data.map((point) => point.reliability);

    if (reliabilities.length < 2) {
      return 0.1; // Low variance for single source
    }

    const mean =
      reliabilities.reduce((sum, val) => sum + val, 0) / reliabilities.length;
    const variance =
      reliabilities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      reliabilities.length;

    return Math.max(0.01, Math.min(0.5, variance));
  }

  private calculateInteractionEffects(
    epistemic: number,
    aleatoric: number
  ): number {
    // Interaction effects occur when epistemic and aleatoric uncertainties amplify each other
    // Higher interaction when both uncertainties are high
    const interactionStrength = epistemic * aleatoric;

    // Scale interaction effects (typically small compared to main uncertainties)
    return interactionStrength * 0.1;
  }

  private calculateConfidenceBounds(
    totalUncertainty: number
  ): [number, number] {
    // Assume symmetric confidence bounds around 0.5 (neutral confidence)
    const baseConfidence = 0.5;
    const lowerBound = Math.max(0.01, baseConfidence - totalUncertainty);
    const upperBound = Math.min(0.99, baseConfidence + totalUncertainty);

    return [lowerBound, upperBound];
  }

  private identifyConfidenceChanges(
    reasoning: ReasoningStep[]
  ): ConfidenceChange[] {
    const changes: ConfidenceChange[] = [];

    for (let i = 1; i < reasoning.length; i++) {
      const currentStep = reasoning[i];
      const previousStep = reasoning[i - 1];

      const confidenceChange = Math.abs(
        currentStep.confidence - previousStep.confidence
      );

      // Only record significant changes
      if (confidenceChange > 0.1) {
        changes.push({
          step: i,
          old_confidence: previousStep.confidence,
          new_confidence: currentStep.confidence,
          reason: this.inferChangeReason(currentStep, previousStep),
          evidence_impact: this.calculateEvidenceImpact(currentStep),
        });
      }
    }

    return changes;
  }

  private calculateStabilityMeasure(confidenceTrajectory: number[]): number {
    if (confidenceTrajectory.length < this.CONFIDENCE_STABILITY_WINDOW) {
      return 1.0; // Perfect stability for short sequences
    }

    // Calculate rolling variance over stability window
    let totalVariance = 0;
    let windowCount = 0;

    for (
      let i = this.CONFIDENCE_STABILITY_WINDOW - 1;
      i < confidenceTrajectory.length;
      i++
    ) {
      const window = confidenceTrajectory.slice(
        i - this.CONFIDENCE_STABILITY_WINDOW + 1,
        i + 1
      );
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const variance =
        window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        window.length;

      totalVariance += variance;
      windowCount++;
    }

    const avgVariance = windowCount > 0 ? totalVariance / windowCount : 0;

    // Convert variance to stability measure (lower variance = higher stability)
    return Math.max(0.1, 1 - Math.min(1, avgVariance * 10));
  }

  private inferChangeReason(
    currentStep: ReasoningStep,
    previousStep: ReasoningStep
  ): string {
    const confidenceDelta = currentStep.confidence - previousStep.confidence;

    if (confidenceDelta > 0.1) {
      if (
        currentStep.evidence_basis.length > previousStep.evidence_basis.length
      ) {
        return "Additional supporting evidence";
      } else if (
        currentStep.type === "inference" &&
        previousStep.type === "premise"
      ) {
        return "Logical inference from premises";
      } else {
        return "Increased confidence through reasoning";
      }
    } else if (confidenceDelta < -0.1) {
      if (currentStep.alternatives.length > previousStep.alternatives.length) {
        return "Discovery of alternative explanations";
      } else if (currentStep.uncertainty > previousStep.uncertainty) {
        return "Increased uncertainty from conflicting information";
      } else {
        return "Decreased confidence through critical analysis";
      }
    } else {
      return "Minor confidence adjustment";
    }
  }

  private calculateEvidenceImpact(step: ReasoningStep): number {
    if (step.evidence_basis.length === 0) {
      return 0;
    }

    // Calculate average reliability of evidence supporting this step
    const avgReliability =
      step.evidence_basis.reduce((sum, evidence) => {
        // Assuming evidence has a reliability property (simplified)
        return sum + (evidence.reliability ?? 0.5);
      }, 0) / step.evidence_basis.length;

    // Evidence impact is proportional to reliability and quantity
    const quantityFactor = Math.min(1, step.evidence_basis.length / 3); // Diminishing returns
    return avgReliability * quantityFactor;
  }
}
