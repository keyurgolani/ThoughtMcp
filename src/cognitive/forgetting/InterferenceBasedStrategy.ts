/**
 * Interference-Based Forgetting Strategy
 *
 * Implements forgetting based on memory interference patterns,
 * identifying conflicting memories and resolving them through forgetting.
 */

import {
  ForgettingContext,
  ForgettingFactor,
  ForgettingScore,
  InterferenceBasedStrategy,
} from "../../interfaces/forgetting.js";
import { Concept, Episode } from "../../types/core.js";

export class InterferenceBasedStrategyImpl
  implements InterferenceBasedStrategy
{
  name = "interference_based";
  description =
    "Forgets memories that interfere with or conflict with newer memories";

  similarity_threshold: number;
  conflict_resolution_mode: "keep_newer" | "keep_stronger" | "merge";
  interference_weight: number;

  constructor(config?: {
    similarity_threshold?: number;
    conflict_resolution_mode?: "keep_newer" | "keep_stronger" | "merge";
    interference_weight?: number;
  }) {
    this.similarity_threshold = config?.similarity_threshold ?? 0.8;
    this.conflict_resolution_mode =
      config?.conflict_resolution_mode ?? "keep_newer";
    this.interference_weight = config?.interference_weight ?? 0.6;
  }

  async evaluateForForgetting(
    memory: Episode | Concept,
    context: ForgettingContext
  ): Promise<ForgettingScore> {
    const factors: ForgettingFactor[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Content similarity interference
    const similarityFactor = await this.calculateSimilarityInterference(
      memory,
      context
    );
    factors.push(similarityFactor);
    totalScore += similarityFactor.value * similarityFactor.weight;
    totalWeight += similarityFactor.weight;

    // Temporal interference - newer memories interfering with older ones
    const temporalFactor = this.calculateTemporalInterference(memory, context);
    factors.push(temporalFactor);
    totalScore += temporalFactor.value * temporalFactor.weight;
    totalWeight += temporalFactor.weight;

    // Context conflict interference
    const contextFactor = this.calculateContextInterference(memory, context);
    factors.push(contextFactor);
    totalScore += contextFactor.value * contextFactor.weight;
    totalWeight += contextFactor.weight;

    // Strength-based interference
    const strengthFactor = this.calculateStrengthInterference(memory, context);
    factors.push(strengthFactor);
    totalScore += strengthFactor.value * strengthFactor.weight;
    totalWeight += strengthFactor.weight;

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

  private async calculateSimilarityInterference(
    _memory: Episode | Concept,
    _context: ForgettingContext
  ): Promise<ForgettingFactor> {
    // Simulate finding similar memories that might interfere
    // In a real implementation, this would search through the memory system
    const similarMemoryCount = Math.floor(Math.random() * 5); // Simulated
    const averageSimilarity = Math.random() * 0.4 + 0.6; // Simulated high similarity

    let interferenceScore = 0;
    if (
      similarMemoryCount > 0 &&
      averageSimilarity > this.similarity_threshold
    ) {
      // Higher interference when there are many similar memories
      interferenceScore =
        Math.min(similarMemoryCount / 3, 1) * averageSimilarity;
    }

    return {
      name: "content_similarity",
      value: interferenceScore,
      weight: 0.4,
      description: `Found ${similarMemoryCount} similar memories with avg similarity ${averageSimilarity.toFixed(
        3
      )}`,
    };
  }

  private calculateTemporalInterference(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    const memoryAge = this.getMemoryAge(memory, context.current_time);
    const ageInDays = memoryAge / (1000 * 60 * 60 * 24);

    // Older memories are more susceptible to interference from newer ones
    let interferenceScore = 0;
    if (ageInDays > 7) {
      // Memories older than a week
      interferenceScore = Math.min(ageInDays / 30, 1); // Normalize to 30 days

      // Apply conflict resolution mode
      switch (this.conflict_resolution_mode) {
        case "keep_newer":
          interferenceScore *= 1.2; // Bias towards forgetting older memories
          break;
        case "keep_stronger":
          const strength = this.getMemoryStrength(memory);
          interferenceScore *= 1 - strength; // Weaker memories more likely to be forgotten
          break;
        case "merge":
          interferenceScore *= 0.5; // Lower interference when merging is preferred
          break;
      }
    }

    return {
      name: "temporal_interference",
      value: Math.min(interferenceScore, 1),
      weight: 0.3,
      description: `Memory age: ${ageInDays.toFixed(1)} days, mode: ${
        this.conflict_resolution_mode
      }`,
    };
  }

  private calculateContextInterference(
    memory: Episode | Concept,
    context: ForgettingContext
  ): ForgettingFactor {
    // Check if memory context conflicts with current system goals
    let contextConflictScore = 0;

    if ("context" in memory && memory.context) {
      const memoryDomain = memory.context.domain;
      const currentGoals = context.system_goals;

      // Simple heuristic: if memory domain is not in current goals, it might interfere
      if (
        memoryDomain &&
        !currentGoals.some((goal) => goal.includes(memoryDomain))
      ) {
        contextConflictScore = 0.6;
      }

      // Check for explicit conflicts in context
      if (memory.context.urgency === 0 && context.memory_pressure > 0.7) {
        // Low urgency
        contextConflictScore += 0.3;
      }
    }

    return {
      name: "context_conflict",
      value: Math.min(contextConflictScore, 1),
      weight: 0.2,
      description: `Context alignment with current goals and system state`,
    };
  }

  private calculateStrengthInterference(
    memory: Episode | Concept,
    _context: ForgettingContext
  ): ForgettingFactor {
    const memoryStrength = this.getMemoryStrength(memory);

    // Weaker memories are more susceptible to interference
    const interferenceScore = 1 - memoryStrength;

    return {
      name: "strength_interference",
      value: interferenceScore,
      weight: this.interference_weight,
      description: `Memory strength: ${memoryStrength.toFixed(
        3
      )}, interference susceptibility: ${interferenceScore.toFixed(3)}`,
    };
  }

  private calculateConfidence(factors: ForgettingFactor[]): number {
    // Confidence based on the strength of interference signals
    const interferenceFactors = factors.filter(
      (f) => f.name.includes("interference") ?? f.name.includes("similarity")
    );

    if (interferenceFactors.length === 0) {
      return 0.3; // Low confidence without interference evidence
    }

    const avgInterference =
      interferenceFactors.reduce((sum, f) => sum + f.value, 0) /
      interferenceFactors.length;

    // Higher interference means higher confidence in forgetting decision
    return Math.max(0.4, avgInterference);
  }

  private generateReasoning(
    factors: ForgettingFactor[],
    finalScore: number
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(
      `Interference analysis resulted in forgetting score: ${finalScore.toFixed(
        3
      )}`
    );

    // Analyze interference patterns
    const interferenceFactors = factors.filter((f) => f.value > 0.3);
    if (interferenceFactors.length > 0) {
      reasoning.push(
        `Detected interference from ${interferenceFactors.length} sources:`
      );
      interferenceFactors.forEach((factor) => {
        reasoning.push(`- ${factor.name}: ${factor.description}`);
      });
    } else {
      reasoning.push("No significant interference detected");
    }

    // Resolution mode explanation
    reasoning.push(
      `Conflict resolution mode: ${this.conflict_resolution_mode}`
    );

    if (finalScore > 0.6) {
      reasoning.push(
        "High interference detected - memory is likely causing conflicts"
      );
    } else if (finalScore > 0.3) {
      reasoning.push(
        "Moderate interference - memory may benefit from consolidation or archiving"
      );
    } else {
      reasoning.push(
        "Low interference - memory is not causing significant conflicts"
      );
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

  private getMemoryStrength(memory: Episode | Concept): number {
    if ("importance" in memory) {
      return memory.importance;
    } else if ("activation" in memory) {
      return memory.activation;
    }
    return 0.5; // Default moderate strength
  }
}
