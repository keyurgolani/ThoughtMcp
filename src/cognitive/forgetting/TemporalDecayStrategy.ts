/**
 * Temporal Decay Forgetting Strategy
 *
 * Implements forgetting based on temporal decay patterns, considering
 * memory age, access frequency, and recency of access.
 */

import {
  ForgettingContext,
  ForgettingFactor,
  ForgettingScore,
  TemporalDecayStrategy,
} from "../../interfaces/forgetting.js";
import { Concept, Episode } from "../../types/core.js";

export class TemporalDecayStrategyImpl implements TemporalDecayStrategy {
  name = "temporal_decay";
  description = "Forgets memories based on age, access frequency, and recency";

  decay_rate: number;
  recency_weight: number;
  access_frequency_weight: number;

  constructor(config?: {
    decay_rate?: number;
    recency_weight?: number;
    access_frequency_weight?: number;
  }) {
    this.decay_rate = config?.decay_rate ?? 0.1;
    this.recency_weight = config?.recency_weight ?? 0.4;
    this.access_frequency_weight = config?.access_frequency_weight ?? 0.3;
  }

  async evaluateForForgetting(
    memory: Episode | Concept,
    context: ForgettingContext
  ): Promise<ForgettingScore> {
    const factors: ForgettingFactor[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Age factor - older memories are more likely to be forgotten
    const ageFactor = this.calculateAgeFactor(memory, context);
    factors.push(ageFactor);
    totalScore += ageFactor.value * ageFactor.weight;
    totalWeight += ageFactor.weight;

    // Recency factor - memories accessed recently are less likely to be forgotten
    const recencyFactor = this.calculateRecencyFactor(memory, context);
    factors.push(recencyFactor);
    totalScore += recencyFactor.value * recencyFactor.weight;
    totalWeight += recencyFactor.weight;

    // Access frequency factor - frequently accessed memories are less likely to be forgotten
    const frequencyFactor = this.calculateFrequencyFactor(memory, context);
    factors.push(frequencyFactor);
    totalScore += frequencyFactor.value * frequencyFactor.weight;
    totalWeight += frequencyFactor.weight;

    // Decay factor - apply exponential decay based on time
    const decayFactor = this.calculateDecayFactor(memory, context);
    factors.push(decayFactor);
    totalScore += decayFactor.value * decayFactor.weight;
    totalWeight += decayFactor.weight;

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const confidence = this.calculateConfidence(factors);

    return {
      strategy_name: this.name,
      score: Math.max(0, Math.min(1, finalScore)),
      confidence,
      reasoning: this.generateReasoning(factors, finalScore),
      factors,
    };
  }

  private calculateAgeFactor(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    const memoryAge = this.getMemoryAge(memory, context.current_time);
    const ageInDays = memoryAge / (1000 * 60 * 60 * 24);

    // Normalize age to 0-1 scale (assuming 365 days as maximum relevant age)
    const normalizedAge = Math.min(ageInDays / 365, 1);

    return {
      name: "age",
      value: normalizedAge,
      weight: 0.3,
      description: `Memory is ${ageInDays.toFixed(1)} days old`,
    };
  }

  private calculateRecencyFactor(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    const lastAccess = this.getLastAccessTime(memory);
    const timeSinceAccess = context.current_time - lastAccess;
    const daysSinceAccess = timeSinceAccess / (1000 * 60 * 60 * 24);

    // Inverse recency - more recent access means lower forgetting score
    const recencyScore = Math.min(daysSinceAccess / 30, 1); // 30 days as reference

    return {
      name: "recency",
      value: recencyScore,
      weight: this.recency_weight,
      description: `Last accessed ${daysSinceAccess.toFixed(1)} days ago`,
    };
  }

  private calculateFrequencyFactor(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    const memoryId = this.getMemoryId(memory);
    const accessCount = context.recent_access_patterns.filter(
      (pattern) => pattern.memory_id === memoryId
    ).length;

    // Normalize access frequency (assuming 10 accesses as high frequency)
    const normalizedFrequency = Math.min(accessCount / 10, 1);

    // Inverse frequency - more frequent access means lower forgetting score
    const frequencyScore = 1 - normalizedFrequency;

    return {
      name: "access_frequency",
      value: frequencyScore,
      weight: this.access_frequency_weight,
      description: `Accessed ${accessCount} times recently`,
    };
  }

  private calculateDecayFactor(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    const memoryAge = this.getMemoryAge(memory, context.current_time);
    const ageInHours = memoryAge / (1000 * 60 * 60);

    // Exponential decay function
    const decayValue = 1 - Math.exp((-this.decay_rate * ageInHours) / 24);

    return {
      name: "temporal_decay",
      value: decayValue,
      weight: 0.3,
      description: `Exponential decay factor: ${decayValue.toFixed(3)}`,
    };
  }

  private calculateConfidence(factors: ForgettingFactor[]): number {
    // Confidence based on consistency of factors and data quality
    const scores = factors.map((f) => f.value);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance =
      scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      scores.length;

    // Lower variance means higher confidence
    const consistency = 1 - Math.min(variance, 1);

    // Base confidence adjusted by consistency
    return Math.max(0.5, consistency);
  }

  private generateReasoning(
    factors: ForgettingFactor[],
    finalScore: number
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(
      `Temporal decay analysis resulted in forgetting score: ${finalScore.toFixed(
        3
      )}`
    );

    // Analyze dominant factors
    const sortedFactors = factors.sort(
      (a, b) => b.value * b.weight - a.value * a.weight
    );
    const dominantFactor = sortedFactors[0];

    reasoning.push(
      `Primary factor: ${dominantFactor.name} (${dominantFactor.description})`
    );

    if (finalScore > 0.7) {
      reasoning.push(
        "High forgetting score - memory is a strong candidate for forgetting"
      );
    } else if (finalScore > 0.4) {
      reasoning.push(
        "Moderate forgetting score - memory could be considered for forgetting"
      );
    } else {
      reasoning.push("Low forgetting score - memory should likely be retained");
    }

    return reasoning;
  }

  private getMemoryAge(memory: Episode | Concept, currentTime: number): number {
    if ("timestamp" in memory) {
      return currentTime - memory.timestamp;
    } else if ("last_accessed" in memory) {
      return currentTime - memory.last_accessed;
    }
    return 0;
  }

  private getLastAccessTime(memory: Episode | Concept): number {
    if ("last_accessed" in memory) {
      return memory.last_accessed;
    } else if ("timestamp" in memory) {
      return memory.timestamp;
    }
    return Date.now();
  }

  private getMemoryId(memory: Episode | Concept): string {
    if ("id" in memory) {
      return memory.id;
    }
    // Generate a temporary ID for episodes without explicit IDs
    return `episode_${JSON.stringify(memory).slice(0, 50)}`;
  }
}
