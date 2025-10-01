/**
 * Forgetting Decision Synthesizer
 *
 * Synthesizes forgetting decisions from multiple strategy evaluations
 * and manages user consent processes for memory forgetting operations.
 */

import {
  ConsentResult,
  ForgettingBenefit,
  ForgettingContext,
  ForgettingDecision,
  ForgettingEvaluation,
  IForgettingDecisionSynthesizer,
} from "../../interfaces/forgetting.js";

export interface ForgettingDecisionSynthesizerConfig {
  auto_consent_threshold: number;
  batch_consent_enabled: boolean;
  consent_timeout_ms: number;
  priority_weighting: {
    memory_pressure: number;
    user_preferences: number;
    system_performance: number;
  };
}

export class ForgettingDecisionSynthesizer
  implements IForgettingDecisionSynthesizer
{
  private config: ForgettingDecisionSynthesizerConfig;
  private pendingConsents: Map<string, ForgettingDecision> = new Map();

  constructor(config?: Partial<ForgettingDecisionSynthesizerConfig>) {
    this.config = {
      auto_consent_threshold: 0.3,
      batch_consent_enabled: true,
      consent_timeout_ms: 300000, // 5 minutes
      priority_weighting: {
        memory_pressure: 0.4,
        user_preferences: 0.4,
        system_performance: 0.2,
      },
      ...config,
    };
  }

  async synthesizeDecisions(
    evaluations: ForgettingEvaluation[],
    context: ForgettingContext
  ): Promise<ForgettingDecision[]> {
    const decisions: ForgettingDecision[] = [];

    for (const evaluation of evaluations) {
      const decision = await this.createDecision(evaluation, context);
      decisions.push(decision);
    }

    // Sort decisions by execution priority
    return decisions.sort(
      (a, b) => b.execution_priority - a.execution_priority
    );
  }

  private async createDecision(
    evaluation: ForgettingEvaluation,
    context: ForgettingContext
  ): Promise<ForgettingDecision> {
    const action = evaluation.recommendation.action;
    const confidence = evaluation.recommendation.confidence;

    // Determine if user consent is required
    const userConsentRequired = this.determineConsentRequirement(
      evaluation,
      context
    );

    // Calculate execution priority
    const executionPriority = this.calculateExecutionPriority(
      evaluation,
      context
    );

    // Estimate benefits of forgetting
    const estimatedBenefit = this.estimateForgettingBenefit(
      evaluation,
      context
    );

    // Generate comprehensive reasoning
    const reasoning = this.generateDecisionReasoning(evaluation, context);

    const decision: ForgettingDecision = {
      memory_id: evaluation.memory_id,
      action,
      confidence,
      reasoning,
      user_consent_required: userConsentRequired,
      execution_priority: executionPriority,
      estimated_benefit: estimatedBenefit,
    };

    // If consent is required, add to pending consents
    if (userConsentRequired) {
      this.pendingConsents.set(evaluation.memory_id, decision);
    }

    return decision;
  }

  private determineConsentRequirement(
    evaluation: ForgettingEvaluation,
    context: ForgettingContext
  ): boolean {
    // Already determined by evaluation engine
    if (evaluation.requires_user_consent) {
      return true;
    }

    // Additional consent requirements based on decision synthesis

    // High-impact decisions require consent
    if (evaluation.estimated_impact.knowledge_gap_risk > 0.7) {
      return true;
    }

    // Decisions affecting many related memories require consent
    if (evaluation.estimated_impact.related_memories_affected > 5) {
      return true;
    }

    // Low confidence decisions require consent
    if (
      evaluation.recommendation.confidence < this.config.auto_consent_threshold
    ) {
      return true;
    }

    // Check memory pressure - if low, be more conservative
    if (context.memory_pressure < 0.5 && evaluation.combined_score < 0.8) {
      return true;
    }

    return false;
  }

  private calculateExecutionPriority(
    evaluation: ForgettingEvaluation,
    context: ForgettingContext
  ): number {
    let priority = 5; // Base priority (1-10 scale)

    // Memory pressure factor
    const memoryPressureFactor =
      context.memory_pressure * this.config.priority_weighting.memory_pressure;
    priority += memoryPressureFactor * 3; // Up to +3 for high memory pressure

    // Forgetting score factor
    const forgettingScoreFactor = evaluation.combined_score * 2; // Up to +2 for high forgetting score
    priority += forgettingScoreFactor;

    // Confidence factor
    const confidenceFactor = evaluation.recommendation.confidence * 1.5; // Up to +1.5 for high confidence
    priority += confidenceFactor;

    // Impact factor (negative - high impact reduces priority)
    const impactFactor = evaluation.estimated_impact.knowledge_gap_risk * -2; // Up to -2 for high impact
    priority += impactFactor;

    // User preference factor
    if (!evaluation.requires_user_consent) {
      priority += this.config.priority_weighting.user_preferences * 2; // Boost for auto-consent eligible
    }

    // System performance factor
    const performanceFactor =
      this.estimatePerformanceGain(evaluation) *
      this.config.priority_weighting.system_performance *
      2;
    priority += performanceFactor;

    return Math.max(1, Math.min(10, Math.round(priority)));
  }

  private estimateForgettingBenefit(
    evaluation: ForgettingEvaluation,
    context: ForgettingContext
  ): ForgettingBenefit {
    // Estimate memory space freed (simplified calculation)
    const contentSize = evaluation.memory_content_summary.length;
    const relatedMemoriesSize =
      evaluation.estimated_impact.related_memories_affected * 100; // Estimated
    const memorySpaceFreed = contentSize + relatedMemoriesSize;

    // Estimate processing speed improvement
    const processingSpeedImprovement = this.estimateProcessingSpeedGain(
      evaluation,
      context
    );

    // Estimate interference reduction
    const interferenceReduction =
      this.estimateInterferenceReduction(evaluation);

    // Estimate focus improvement
    const focusImprovement = this.estimateFocusImprovement(evaluation, context);

    return {
      memory_space_freed: memorySpaceFreed,
      processing_speed_improvement: processingSpeedImprovement,
      interference_reduction: interferenceReduction,
      focus_improvement: focusImprovement,
    };
  }

  private estimateProcessingSpeedGain(
    evaluation: ForgettingEvaluation,
    context: ForgettingContext
  ): number {
    // Base gain from removing memory
    let speedGain = 0.01; // 1% base gain

    // Higher gain if memory pressure is high
    speedGain += context.memory_pressure * 0.05; // Up to 5% additional

    // Higher gain for memories with many relations (reduce search space)
    speedGain += evaluation.estimated_impact.related_memories_affected * 0.002; // 0.2% per related memory

    // Higher gain for frequently accessed but low-importance memories
    const interferenceScore =
      evaluation.strategy_scores.find(
        (s) => s.strategy_name === "interference_based"
      )?.score || 0;
    speedGain += interferenceScore * 0.03; // Up to 3% for high interference

    return Math.max(0, Math.min(0.2, speedGain)); // Cap at 20%
  }

  private estimateInterferenceReduction(
    evaluation: ForgettingEvaluation
  ): number {
    // Base interference reduction
    let interferenceReduction = evaluation.combined_score * 0.1; // 10% max base reduction

    // Higher reduction for interference-based strategy scores
    const interferenceScore =
      evaluation.strategy_scores.find(
        (s) => s.strategy_name === "interference_based"
      )?.score || 0;
    interferenceReduction += interferenceScore * 0.15; // Up to 15% additional

    // Consider memory type - episodic memories may cause more interference
    if (evaluation.memory_type === "episodic") {
      interferenceReduction += 0.05; // 5% additional for episodic
    }

    return Math.max(0, Math.min(0.3, interferenceReduction)); // Cap at 30%
  }

  private estimateFocusImprovement(
    evaluation: ForgettingEvaluation,
    context: ForgettingContext
  ): number {
    // Focus improvement from removing irrelevant memories
    let focusImprovement = 0;

    // Check goal alignment
    const importanceScore =
      evaluation.strategy_scores.find(
        (s) => s.strategy_name === "importance_based"
      )?.score || 0;
    focusImprovement += importanceScore * 0.1; // Up to 10% for low importance

    // Check context relevance
    if (evaluation.memory_type === "episodic") {
      // Episodic memories not aligned with current goals improve focus when removed
      focusImprovement += 0.05;
    }

    // Memory pressure factor
    focusImprovement += context.memory_pressure * 0.08; // Up to 8% for high pressure

    return Math.max(0, Math.min(0.2, focusImprovement)); // Cap at 20%
  }

  private estimatePerformanceGain(evaluation: ForgettingEvaluation): number {
    // Estimate overall performance gain (0-1 scale)
    const benefit = this.estimateForgettingBenefit(evaluation, {
      current_time: Date.now(),
      memory_pressure: 0.5,
      recent_access_patterns: [],
      system_goals: [],
      user_preferences: {
        consent_required: false,
        protected_categories: [],
        max_auto_forget_importance: 0.3,
        retention_period_days: 30,
      },
    });

    return (
      (benefit.processing_speed_improvement +
        benefit.interference_reduction +
        benefit.focus_improvement) /
      3
    );
  }

  private generateDecisionReasoning(
    evaluation: ForgettingEvaluation,
    context: ForgettingContext
  ): string {
    const reasons: string[] = [];

    // Primary recommendation reasoning
    reasons.push(evaluation.recommendation.reasoning);

    // Strategy consensus
    const highScoreStrategies = evaluation.strategy_scores.filter(
      (s) => s.score > 0.6
    );
    if (highScoreStrategies.length >= 2) {
      reasons.push(
        `Multiple strategies (${highScoreStrategies
          .map((s) => s.strategy_name)
          .join(", ")}) recommend forgetting`
      );
    }

    // Memory pressure consideration
    if (context.memory_pressure > 0.7) {
      reasons.push("High memory pressure increases forgetting priority");
    } else if (context.memory_pressure < 0.3) {
      reasons.push("Low memory pressure allows for conservative retention");
    }

    // Impact assessment
    if (evaluation.estimated_impact.knowledge_gap_risk > 0.5) {
      reasons.push("Moderate to high knowledge gap risk identified");
    }

    if (evaluation.estimated_impact.related_memories_affected > 3) {
      reasons.push(
        `Forgetting may affect ${evaluation.estimated_impact.related_memories_affected} related memories`
      );
    }

    // User consent reasoning
    if (evaluation.requires_user_consent) {
      reasons.push(
        "User consent required due to memory importance or protection settings"
      );
    }

    return reasons.join(". ");
  }

  async requestUserConsent(
    decisions: ForgettingDecision[]
  ): Promise<ConsentResult[]> {
    const consentResults: ConsentResult[] = [];

    // Filter decisions that require consent
    const consentRequired = decisions.filter((d) => d.user_consent_required);

    if (consentRequired.length === 0) {
      return consentResults;
    }

    // In a real implementation, this would present a UI to the user
    // For now, we'll simulate user consent based on decision characteristics
    for (const decision of consentRequired) {
      const consentResult = await this.simulateUserConsent(decision);
      consentResults.push(consentResult);

      // Update decision with consent result
      decision.user_consent_obtained = consentResult.consent_granted;
    }

    return consentResults;
  }

  private async simulateUserConsent(
    decision: ForgettingDecision
  ): Promise<ConsentResult> {
    // Simulate user decision-making process
    // In reality, this would be an interactive UI process

    let consentProbability = 0.5; // Base 50% consent rate

    // Higher confidence decisions are more likely to be approved
    consentProbability += decision.confidence * 0.3;

    // Lower priority decisions are less likely to be approved
    consentProbability += (decision.execution_priority / 10) * 0.2;

    // Decisions with high benefits are more likely to be approved
    const totalBenefit =
      decision.estimated_benefit.processing_speed_improvement +
      decision.estimated_benefit.interference_reduction +
      decision.estimated_benefit.focus_improvement;
    consentProbability += totalBenefit * 0.2;

    // Add some randomness to simulate user variability
    consentProbability += (Math.random() - 0.5) * 0.2;

    const consentGranted = Math.random() < consentProbability;

    let userFeedback: string | undefined;
    let alternativeAction: string | undefined;

    if (!consentGranted) {
      // Simulate user providing feedback or alternative
      if (Math.random() < 0.3) {
        userFeedback = "This memory seems important to me";
      }
      if (Math.random() < 0.4) {
        alternativeAction = decision.action === "forget" ? "archive" : "retain";
      }
    }

    return {
      memory_id: decision.memory_id,
      consent_granted: consentGranted,
      user_feedback: userFeedback,
      alternative_action: alternativeAction,
    };
  }

  // Utility methods for managing consent process

  getPendingConsents(): ForgettingDecision[] {
    return Array.from(this.pendingConsents.values());
  }

  clearPendingConsent(memoryId: string): void {
    this.pendingConsents.delete(memoryId);
  }

  clearExpiredConsents(): void {
    for (const [memoryId] of this.pendingConsents.entries()) {
      // Check if consent request has expired (simplified - would need timestamp tracking)
      if (Math.random() < 0.1) {
        // Simulate 10% expiration rate
        this.pendingConsents.delete(memoryId);
      }
    }
  }
}
