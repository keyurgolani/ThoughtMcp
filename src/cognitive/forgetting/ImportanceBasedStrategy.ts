/**
 * Importance-Based Forgetting Strategy
 *
 * Implements forgetting based on memory importance, emotional significance,
 * and contextual relevance to current goals and activities.
 */

import {
  ForgettingContext,
  ForgettingFactor,
  ForgettingScore,
  ImportanceBasedStrategy,
} from "../../interfaces/forgetting.js";
import { Concept, Episode } from "../../types/core.js";

export class ImportanceBasedStrategyImpl implements ImportanceBasedStrategy {
  name = "importance_based";
  description =
    "Forgets memories based on importance, emotional significance, and contextual relevance";

  importance_threshold: number;
  emotional_weight: number;
  context_relevance_weight: number;

  constructor(config?: {
    importance_threshold?: number;
    emotional_weight?: number;
    context_relevance_weight?: number;
  }) {
    this.importance_threshold = config?.importance_threshold ?? 0.3;
    this.emotional_weight = config?.emotional_weight ?? 0.4;
    this.context_relevance_weight = config?.context_relevance_weight ?? 0.3;
  }

  async evaluateForForgetting(
    memory: Episode | Concept,
    context: ForgettingContext
  ): Promise<ForgettingScore> {
    const factors: ForgettingFactor[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Base importance factor
    const importanceFactor = this.calculateImportanceFactor(memory, context);
    factors.push(importanceFactor);
    totalScore += importanceFactor.value * importanceFactor.weight;
    totalWeight += importanceFactor.weight;

    // Emotional significance factor
    const emotionalFactor = this.calculateEmotionalFactor(memory, context);
    factors.push(emotionalFactor);
    totalScore += emotionalFactor.value * emotionalFactor.weight;
    totalWeight += emotionalFactor.weight;

    // Context relevance factor
    const relevanceFactor = this.calculateRelevanceFactor(memory, context);
    factors.push(relevanceFactor);
    totalScore += relevanceFactor.value * relevanceFactor.weight;
    totalWeight += relevanceFactor.weight;

    // User protection factor
    const protectionFactor = this.calculateProtectionFactor(memory, context);
    factors.push(protectionFactor);
    totalScore += protectionFactor.value * protectionFactor.weight;
    totalWeight += protectionFactor.weight;

    // Goal alignment factor
    const goalFactor = this.calculateGoalAlignmentFactor(memory, context);
    factors.push(goalFactor);
    totalScore += goalFactor.value * goalFactor.weight;
    totalWeight += goalFactor.weight;

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = this.calculateConfidence(factors, memory);

    return {
      strategy_name: this.name,
      score: Math.max(0, Math.min(1, finalScore)),
      confidence,
      reasoning: this.generateReasoning(factors, finalScore, memory),
      factors,
    };
  }

  private calculateImportanceFactor(
    memory: Episode | Concept,
    _context: ForgettingContext
  ): ForgettingFactor {
    const importance = this.getMemoryImportance(memory);

    // Inverse importance - lower importance means higher forgetting score
    const forgettingScore = 1 - importance;

    // Apply threshold - memories below threshold are strong candidates for forgetting
    let adjustedScore = forgettingScore;
    if (importance < this.importance_threshold) {
      adjustedScore = Math.min(forgettingScore * 1.5, 1); // Boost forgetting score
    }

    return {
      name: "base_importance",
      value: adjustedScore,
      weight: 0.4,
      description: `Memory importance: ${importance.toFixed(3)}, threshold: ${
        this.importance_threshold
      }`,
    };
  }

  private calculateEmotionalFactor(
    memory: Episode | Concept,
    _context: ForgettingContext
  ): ForgettingFactor {
    const emotionalSignificance = this.getEmotionalSignificance(memory);

    // Inverse emotional significance - less emotional memories are more likely to be forgotten
    const forgettingScore = 1 - emotionalSignificance;

    return {
      name: "emotional_significance",
      value: forgettingScore,
      weight: this.emotional_weight,
      description: `Emotional significance: ${emotionalSignificance.toFixed(
        3
      )}`,
    };
  }

  private calculateRelevanceFactor(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    let relevanceScore = 0;

    if ("context" in memory && memory.context) {
      // Check domain relevance
      const memoryDomain = memory.context.domain;
      if (memoryDomain) {
        const isRelevantDomain = context.system_goals.some((goal) =>
          goal.toLowerCase().includes(memoryDomain.toLowerCase())
        );
        relevanceScore += isRelevantDomain ? 0.4 : 0;
      }

      // Check session relevance
      const memorySession = memory.context.session_id;
      if (memorySession) {
        // Assume recent sessions are more relevant (simplified heuristic)
        const isRecentSession = context.recent_access_patterns.some((pattern) =>
          pattern.memory_id.includes(memorySession)
        );
        relevanceScore += isRecentSession ? 0.3 : 0;
      }

      // Check urgency relevance
      if (memory.context.urgency === 1) {
        // High urgency (assuming 0-1 scale)
        relevanceScore += 0.3;
      }
    }

    // Inverse relevance - less relevant memories are more likely to be forgotten
    const forgettingScore = 1 - Math.min(relevanceScore, 1);

    return {
      name: "context_relevance",
      value: forgettingScore,
      weight: this.context_relevance_weight,
      description: `Context relevance: ${relevanceScore.toFixed(3)}`,
    };
  }

  private calculateProtectionFactor(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    let protectionScore = 0;

    // Check if memory is in protected categories
    if ("context" in memory && memory.context) {
      const memoryDomain = memory.context.domain;
      if (
        memoryDomain &&
        context.user_preferences.protected_categories.includes(memoryDomain)
      ) {
        protectionScore = 1; // Fully protected
      }
    }

    // Check emotional tags for protection
    if ("emotional_tags" in memory && memory.emotional_tags) {
      const hasProtectedEmotions = memory.emotional_tags.some((tag) =>
        context.user_preferences.protected_categories.includes(tag)
      );
      if (hasProtectedEmotions) {
        protectionScore = Math.max(protectionScore, 0.8);
      }
    }

    // Check importance threshold protection
    const importance = this.getMemoryImportance(memory);
    if (importance > context.user_preferences.max_auto_forget_importance) {
      protectionScore = Math.max(protectionScore, 0.9);
    }

    // Inverse protection - protected memories have low forgetting scores
    const forgettingScore = 1 - protectionScore;

    return {
      name: "user_protection",
      value: forgettingScore,
      weight: 0.5, // High weight for user preferences
      description: `Protection level: ${protectionScore.toFixed(3)}`,
    };
  }

  private calculateGoalAlignmentFactor(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    let alignmentScore = 0;

    // Check if memory content aligns with current goals
    const memoryContent = this.getMemoryContentString(memory);
    const goalAlignment =
      context.system_goals.reduce((score, goal) => {
        const goalWords = goal.toLowerCase().split(" ");
        const contentWords = memoryContent.toLowerCase().split(" ");
        const overlap = goalWords.filter((word) =>
          contentWords.includes(word)
        ).length;
        return score + overlap / goalWords.length;
      }, 0) / Math.max(context.system_goals.length, 1);

    alignmentScore = Math.min(goalAlignment, 1);

    // Inverse alignment - memories not aligned with goals are more likely to be forgotten
    const forgettingScore = 1 - alignmentScore;

    return {
      name: "goal_alignment",
      value: forgettingScore,
      weight: 0.25,
      description: `Goal alignment: ${alignmentScore.toFixed(3)}`,
    };
  }

  private calculateConfidence(
    factors: ForgettingFactor[],
    memory: Episode | Concept
  ): number {
    // Base confidence on data quality and factor consistency
    let confidence = 0.6; // Base confidence

    // Higher confidence for memories with clear importance scores
    const importance = this.getMemoryImportance(memory);
    if (importance !== 0.5) {
      // Not default value
      confidence += 0.2;
    }

    // Higher confidence when emotional data is available
    if (
      "emotional_tags" in memory &&
      memory.emotional_tags &&
      memory.emotional_tags.length > 0
    ) {
      confidence += 0.1;
    }

    // Higher confidence when context is available
    if ("context" in memory && memory.context) {
      confidence += 0.1;
    }

    // Check factor consistency
    const scores = factors.map((f) => f.value);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;

    // Lower variance means higher confidence
    const consistency = 1 - Math.min(variance, 1);
    confidence *= consistency;

    return Math.max(0.3, Math.min(1, confidence));
  }

  private generateReasoning(
    factors: ForgettingFactor[],
    finalScore: number,
    memory: Episode | Concept
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(
      `Importance analysis resulted in forgetting score: ${finalScore.toFixed(
        3
      )}`
    );

    const importance = this.getMemoryImportance(memory);
    reasoning.push(`Memory base importance: ${importance.toFixed(3)}`);

    // Analyze protection status
    const protectionFactor = factors.find((f) => f.name === "user_protection");
    if (protectionFactor && protectionFactor.value < 0.2) {
      reasoning.push("Memory is protected by user preferences");
    }

    // Analyze emotional significance
    const emotionalFactor = factors.find(
      (f) => f.name === "emotional_significance"
    );
    if (emotionalFactor && emotionalFactor.value < 0.3) {
      reasoning.push("Memory has high emotional significance");
    }

    // Analyze relevance
    const relevanceFactor = factors.find((f) => f.name === "context_relevance");
    if (relevanceFactor && relevanceFactor.value > 0.7) {
      reasoning.push("Memory has low relevance to current context and goals");
    }

    // Final recommendation
    if (finalScore > 0.7) {
      reasoning.push(
        "High forgetting score - memory has low importance and relevance"
      );
    } else if (finalScore > 0.4) {
      reasoning.push(
        "Moderate forgetting score - memory importance is borderline"
      );
    } else {
      reasoning.push(
        "Low forgetting score - memory is important and should be retained"
      );
    }

    return reasoning;
  }

  private getMemoryImportance(memory: Episode | Concept): number {
    if ("importance" in memory) {
      return memory.importance;
    } else if ("activation" in memory) {
      return memory.activation;
    }
    return 0.5; // Default moderate importance
  }

  private getEmotionalSignificance(memory: Episode | Concept): number {
    if ("emotional_tags" in memory && memory.emotional_tags) {
      // Simple heuristic: more emotional tags = higher significance
      const tagCount = memory.emotional_tags.length;
      const significance = Math.min(tagCount / 3, 1); // Normalize to max 3 tags

      // Boost for strong emotions
      const strongEmotions = ["love", "fear", "anger", "joy", "sadness"];
      const hasStrongEmotion = memory.emotional_tags.some((tag) =>
        strongEmotions.includes(tag.toLowerCase())
      );

      return hasStrongEmotion ? Math.min(significance + 0.3, 1) : significance;
    }
    return 0.1; // Low emotional significance by default
  }

  private getMemoryContentString(memory: Episode | Concept): string {
    if ("content" in memory) {
      return typeof memory.content === "string"
        ? memory.content
        : JSON.stringify(memory.content);
    }
    return "";
  }
}
