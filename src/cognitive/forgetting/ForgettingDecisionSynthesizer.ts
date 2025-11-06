/**
 * Forgetting Decision Synthesizer
 *
 * Synthesizes forgetting decisions from multiple strategy evaluations,
 * manages user consent, and coordinates the decision-making process.
 */

import type {
  ConsentResult,
  ForgettingBenefit,
  ForgettingContext,
  ForgettingDecision,
  ForgettingEvaluation,
  IForgettingDecisionSynthesizer,
} from "../../interfaces/forgetting.js";

export class ForgettingDecisionSynthesizer
  implements IForgettingDecisionSynthesizer
{
  private confidence_threshold: number = 0.7;

  /**
   * Synthesize forgetting decisions from multiple strategy evaluations
   */
  async synthesizeDecisions(
    evaluations: ForgettingEvaluation[],
    _context: ForgettingContext
  ): Promise<ForgettingDecision[]> {
    const decisions: ForgettingDecision[] = [];

    // Group evaluations by memory_id
    const evaluations_by_memory = this.groupEvaluationsByMemory(evaluations);

    for (const [memory_id, memory_evaluations] of evaluations_by_memory) {
      const decision = await this.synthesizeDecisionForMemory(
        memory_id,
        memory_evaluations
      );
      decisions.push(decision);
    }

    // Sort by execution priority
    decisions.sort((a, b) => b.execution_priority - a.execution_priority);

    return decisions;
  }

  /**
   * Request user consent for forgetting decisions
   */
  async requestUserConsent(
    decisions: ForgettingDecision[]
  ): Promise<ConsentResult[]> {
    const consent_results: ConsentResult[] = [];

    for (const decision of decisions) {
      if (decision.user_consent_required) {
        // In a real implementation, this would present a UI to the user
        // For now, we'll simulate consent based on confidence levels
        const consent_granted = decision.confidence > 0.8;

        consent_results.push({
          memory_id: decision.memory_id,
          consent_granted,
          user_feedback: consent_granted
            ? "Approved based on high confidence"
            : "Rejected due to insufficient confidence",
        });
      } else {
        // Automatic consent for low-risk decisions
        consent_results.push({
          memory_id: decision.memory_id,
          consent_granted: true,
          user_feedback: "Automatic approval for low-risk decision",
        });
      }
    }

    return consent_results;
  }

  private groupEvaluationsByMemory(
    evaluations: ForgettingEvaluation[]
  ): Map<string, ForgettingEvaluation[]> {
    const grouped = new Map<string, ForgettingEvaluation[]>();

    for (const evaluation of evaluations) {
      const existing = grouped.get(evaluation.memory_id) || [];
      existing.push(evaluation);
      grouped.set(evaluation.memory_id, existing);
    }

    return grouped;
  }

  private async synthesizeDecisionForMemory(
    memory_id: string,
    evaluations: ForgettingEvaluation[]
  ): Promise<ForgettingDecision> {
    // Get the primary recommendation from the first evaluation
    const primary_evaluation = evaluations[0];
    const recommendation = primary_evaluation.recommendation;

    // Calculate overall confidence based on combined score
    const confidence = primary_evaluation.combined_score;

    // Generate reasoning from the recommendation
    const reasoning = recommendation.reasoning;

    // Determine if user consent is required
    const user_consent_required = this.requiresUserConsent(
      recommendation.action,
      confidence,
      evaluations
    );

    // Calculate execution priority
    const execution_priority = this.calculateExecutionPriority(
      recommendation.action,
      confidence
    );

    // Estimate benefits
    const estimated_benefit = this.estimateBenefits(recommendation.action);

    return {
      memory_id,
      action: recommendation.action,
      confidence,
      reasoning,
      user_consent_required,
      execution_priority,
      estimated_benefit,
    };
  }

  private requiresUserConsent(
    action: string,
    confidence: number,
    evaluations: ForgettingEvaluation[]
  ): boolean {
    // Always require consent for forget actions with low confidence
    if (action === "forget" && confidence < this.confidence_threshold) {
      return true;
    }

    // Check if any evaluation specifically requires consent
    return evaluations.some((evaluation) => evaluation.requires_user_consent);
  }

  private calculateExecutionPriority(
    action: string,
    confidence: number
  ): number {
    let priority = 5; // Base priority

    // Higher priority for high-confidence decisions
    if (confidence > 0.8) priority += 2;
    else if (confidence > 0.6) priority += 1;

    // Adjust based on action type
    switch (action) {
      case "forget":
        priority += 1; // Forgetting frees up space
        break;
      case "archive":
        priority += 0; // Neutral priority
        break;
      case "degrade":
        priority -= 1; // Lower priority for gradual changes
        break;
      case "retain":
        priority -= 2; // Lowest priority for retention
        break;
    }

    return Math.max(1, Math.min(10, priority));
  }

  private estimateBenefits(action: string): ForgettingBenefit {
    // Base benefits - would be calculated more sophisticatedly in practice
    const base_benefit: ForgettingBenefit = {
      memory_space_freed: 0,
      processing_speed_improvement: 0,
      interference_reduction: 0,
      focus_improvement: 0,
    };

    if (action === "forget") {
      base_benefit.memory_space_freed = 1.0; // Assume 1MB average
      base_benefit.processing_speed_improvement = 0.1;
      base_benefit.interference_reduction = 0.2;
      base_benefit.focus_improvement = 0.1;
    } else if (action === "archive") {
      base_benefit.processing_speed_improvement = 0.05;
      base_benefit.interference_reduction = 0.1;
    }

    return base_benefit;
  }
}
