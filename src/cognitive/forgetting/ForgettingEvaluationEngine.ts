/**
 * Forgetting Evaluation Engine
 *
 * Coordinates multiple forgetting strategies to evaluate memories
 * for potential forgetting, providing comprehensive analysis and recommendations.
 */

import {
  ForgettingContext,
  ForgettingEvaluation,
  ForgettingImpact,
  ForgettingRecommendation,
  ForgettingScore,
  ForgettingStrategy,
  IForgettingEvaluationEngine,
} from "../../interfaces/forgetting.js";
import { Concept, Episode } from "../../types/core.js";
import { ImportanceBasedStrategyImpl } from "./ImportanceBasedStrategy.js";
import { InterferenceBasedStrategyImpl } from "./InterferenceBasedStrategy.js";
import { TemporalDecayStrategyImpl } from "./TemporalDecayStrategy.js";

export interface ForgettingEvaluationEngineConfig {
  enable_temporal_decay: boolean;
  enable_interference_based: boolean;
  enable_importance_based: boolean;
  strategy_weights: Record<string, number>;
  recommendation_threshold: number;
  high_confidence_threshold: number;
}

export class ForgettingEvaluationEngine implements IForgettingEvaluationEngine {
  private strategies: Map<string, ForgettingStrategy> = new Map();
  private config: ForgettingEvaluationEngineConfig;

  constructor(config?: Partial<ForgettingEvaluationEngineConfig>) {
    this.config = {
      enable_temporal_decay: true,
      enable_interference_based: true,
      enable_importance_based: true,
      strategy_weights: {
        temporal_decay: 0.3,
        interference_based: 0.3,
        importance_based: 0.4,
      },
      recommendation_threshold: 0.6,
      high_confidence_threshold: 0.8,
      ...config,
    };

    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    if (this.config.enable_temporal_decay) {
      this.addStrategy(new TemporalDecayStrategyImpl());
    }

    if (this.config.enable_interference_based) {
      this.addStrategy(new InterferenceBasedStrategyImpl());
    }

    if (this.config.enable_importance_based) {
      this.addStrategy(new ImportanceBasedStrategyImpl());
    }
  }

  async evaluateMemories(
    memories: (Episode | Concept)[],
    context: ForgettingContext
  ): Promise<ForgettingEvaluation[]> {
    const evaluations: ForgettingEvaluation[] = [];

    for (const memory of memories) {
      const evaluation = await this.evaluateMemory(memory, context);
      evaluations.push(evaluation);
    }

    // Sort by combined score (highest forgetting score first)
    return evaluations.sort((a, b) => b.combined_score - a.combined_score);
  }

  private async evaluateMemory(
    memory: Episode | Concept,
    context: ForgettingContext
  ): Promise<ForgettingEvaluation> {
    const strategyScores: ForgettingScore[] = [];

    // Evaluate with each strategy
    for (const strategy of this.strategies.values()) {
      try {
        const score = await strategy.evaluateForForgetting(memory, context);
        strategyScores.push(score);
      } catch (error) {
        console.warn(
          `Strategy ${strategy.name} failed for memory evaluation:`,
          error
        );
      }
    }

    // Calculate combined score
    const combinedScore = this.calculateCombinedScore(strategyScores);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      combinedScore,
      strategyScores,
      memory
    );

    // Assess impact
    const impact = this.assessForgettingImpact(memory, strategyScores);

    // Check if user consent is required
    const requiresConsent = this.requiresUserConsent(
      memory,
      combinedScore,
      context
    );

    return {
      memory_id: this.getMemoryId(memory),
      memory_type: this.getMemoryType(memory),
      memory_content_summary: this.generateContentSummary(memory),
      strategy_scores: strategyScores,
      combined_score: combinedScore,
      recommendation,
      requires_user_consent: requiresConsent,
      estimated_impact: impact,
    };
  }

  private calculateCombinedScore(scores: ForgettingScore[]): number {
    if (scores.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const score of scores) {
      const weight = this.config.strategy_weights[score.strategy_name] || 1;
      weightedSum += score.score * score.confidence * weight;
      totalWeight += score.confidence * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private generateRecommendation(
    combinedScore: number,
    strategyScores: ForgettingScore[],
    memory: Episode | Concept
  ): ForgettingRecommendation {
    let action: "forget" | "retain" | "degrade" | "archive";
    let confidence: number;
    let reasoning: string;
    const alternativeActions: string[] = [];

    // Determine primary action based on combined score
    if (combinedScore >= this.config.recommendation_threshold) {
      if (combinedScore >= this.config.high_confidence_threshold) {
        action = "forget";
        confidence = combinedScore;
        reasoning =
          "High forgetting score across multiple strategies indicates memory should be forgotten";
      } else {
        action = "degrade";
        confidence = combinedScore * 0.8;
        reasoning = "Moderate forgetting score suggests gradual degradation";
        alternativeActions.push("archive", "forget");
      }
    } else {
      if (combinedScore >= 0.3) {
        action = "archive";
        confidence = 1 - combinedScore;
        reasoning =
          "Low-moderate forgetting score suggests archiving for potential future retrieval";
        alternativeActions.push("retain", "degrade");
      } else {
        action = "retain";
        confidence = 1 - combinedScore;
        reasoning = "Low forgetting score indicates memory should be retained";
        alternativeActions.push("archive");
      }
    }

    // Adjust based on memory importance
    const importance = this.getMemoryImportance(memory);
    if (importance > 0.8 && action === "forget") {
      action = "degrade";
      reasoning += " (adjusted due to high importance)";
      alternativeActions.unshift("archive");
    }

    // Consider strategy consensus
    const highScoreStrategies = strategyScores.filter(
      (s) => s.score > 0.7
    ).length;
    const lowScoreStrategies = strategyScores.filter(
      (s) => s.score < 0.3
    ).length;

    if (highScoreStrategies >= 2 && action !== "forget") {
      alternativeActions.unshift("forget");
    }
    if (lowScoreStrategies >= 2 && action === "forget") {
      action = "retain";
      reasoning += " (multiple strategies indicate retention)";
    }

    return {
      action,
      confidence: Math.max(0.1, Math.min(1, confidence)),
      reasoning,
      alternative_actions: alternativeActions,
    };
  }

  private assessForgettingImpact(
    memory: Episode | Concept,
    strategyScores: ForgettingScore[]
  ): ForgettingImpact {
    const importance = this.getMemoryImportance(memory);

    // Estimate retrieval loss probability
    const avgForgettingScore =
      strategyScores.reduce((sum, s) => sum + s.score, 0) /
      strategyScores.length;
    const retrievalLossProbability = avgForgettingScore * (1 - importance);

    // Estimate related memories affected (simplified heuristic)
    let relatedMemoriesAffected = 0;
    if ("relations" in memory && memory.relations) {
      relatedMemoriesAffected = memory.relations.length;
    } else if ("context" in memory && memory.context) {
      // Estimate based on context similarity
      relatedMemoriesAffected = Math.floor(Math.random() * 5) + 1; // Simplified
    }

    // Assess knowledge gap risk
    const knowledgeGapRisk =
      importance * (1 - this.getMemoryRedundancy(memory));

    // Assess recovery difficulty
    const recoveryDifficulty = this.assessRecoveryDifficulty(
      memory,
      strategyScores
    );

    return {
      retrieval_loss_probability: Math.max(
        0,
        Math.min(1, retrievalLossProbability)
      ),
      related_memories_affected: relatedMemoriesAffected,
      knowledge_gap_risk: Math.max(0, Math.min(1, knowledgeGapRisk)),
      recovery_difficulty: Math.max(0, Math.min(1, recoveryDifficulty)),
    };
  }

  private requiresUserConsent(
    memory: Episode | Concept,
    combinedScore: number,
    context: ForgettingContext
  ): boolean {
    // Always require consent if user preferences demand it
    if (context.user_preferences.consent_required) {
      return true;
    }

    // Require consent for high-importance memories
    const importance = this.getMemoryImportance(memory);
    if (importance > context.user_preferences.max_auto_forget_importance) {
      return true;
    }

    // Require consent for protected categories
    if ("context" in memory && memory.context && memory.context.domain) {
      if (
        context.user_preferences.protected_categories.includes(
          memory.context.domain
        )
      ) {
        return true;
      }
    }

    // Require consent for emotional memories
    if ("emotional_tags" in memory && memory.emotional_tags) {
      const hasProtectedEmotion = memory.emotional_tags.some((tag) =>
        context.user_preferences.protected_categories.includes(tag)
      );
      if (hasProtectedEmotion) {
        return true;
      }
    }

    // Require consent for high-confidence forgetting decisions
    if (combinedScore > this.config.high_confidence_threshold) {
      return true;
    }

    return false;
  }

  addStrategy(strategy: ForgettingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  removeStrategy(strategyName: string): void {
    this.strategies.delete(strategyName);
  }

  getStrategies(): ForgettingStrategy[] {
    return Array.from(this.strategies.values());
  }

  // Helper methods

  private getMemoryId(memory: Episode | Concept): string {
    if ("id" in memory && memory.id) {
      return memory.id;
    }
    // Generate temporary ID for episodes
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryType(memory: Episode | Concept): "episodic" | "semantic" {
    return "timestamp" in memory ? "episodic" : "semantic";
  }

  private generateContentSummary(memory: Episode | Concept): string {
    if ("content" in memory) {
      const content =
        typeof memory.content === "string"
          ? memory.content
          : JSON.stringify(memory.content);
      return content.length > 100 ? content.substring(0, 100) + "..." : content;
    }
    return "No content summary available";
  }

  private getMemoryImportance(memory: Episode | Concept): number {
    if ("importance" in memory) {
      return memory.importance;
    } else if ("activation" in memory) {
      return memory.activation;
    }
    return 0.5; // Default moderate importance
  }

  private getMemoryRedundancy(memory: Episode | Concept): number {
    // Simplified heuristic for memory redundancy
    // In a real implementation, this would analyze similar memories in the system
    if (
      "relations" in memory &&
      memory.relations &&
      memory.relations.length > 3
    ) {
      return 0.7; // High redundancy if many relations
    }
    return 0.3; // Default low redundancy
  }

  private assessRecoveryDifficulty(
    memory: Episode | Concept,
    strategyScores: ForgettingScore[]
  ): number {
    let difficulty = 0.5; // Base difficulty

    // Higher difficulty for older memories
    if ("timestamp" in memory) {
      const ageInDays = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
      difficulty += Math.min(ageInDays / 365, 0.3); // Up to 30% increase for age
    }

    // Lower difficulty if memory has strong associations
    if (
      "relations" in memory &&
      memory.relations &&
      memory.relations.length > 0
    ) {
      difficulty -= Math.min(memory.relations.length / 10, 0.2); // Up to 20% decrease
    }

    // Consider strategy consensus on difficulty
    const temporalScore =
      strategyScores.find((s) => s.strategy_name === "temporal_decay")?.score ||
      0;
    difficulty += temporalScore * 0.2; // Temporal decay increases recovery difficulty

    return Math.max(0.1, Math.min(1, difficulty));
  }
}
