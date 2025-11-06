/**
 * Risk Assessment Engine for Forgetting Operations
 *
 * Evaluates the risk of forgetting specific memories and provides
 * safety recommendations for memory management operations.
 */

import type { Memory, RiskLevel } from "../../types/MemoryTypes.js";

export interface RiskAssessmentResult {
  risk_level: RiskLevel;
  risk_score: number;
  risk_factors: string[];
  recommendations: string[];
  safe_to_forget: boolean;
}

export class RiskAssessmentEngine {
  private importance_threshold: number = 0.7;
  private recency_threshold_days: number = 7;
  private access_frequency_threshold: number = 5;

  /**
   * Assess the risk of forgetting a specific memory
   */
  assessRisk(memory: Memory): RiskAssessmentResult {
    const risk_factors: string[] = [];
    let risk_score = 0;

    // Check importance level
    if (memory.importance > this.importance_threshold) {
      risk_factors.push("High importance memory");
      risk_score += 0.4;
    }

    // Check recency
    const age_days = (Date.now() - memory.created_at) / (1000 * 60 * 60 * 24);
    if (age_days < this.recency_threshold_days) {
      risk_factors.push("Recently created memory");
      risk_score += 0.3;
    }

    // Check access frequency
    if (memory.access_count > this.access_frequency_threshold) {
      risk_factors.push("Frequently accessed memory");
      risk_score += 0.2;
    }

    // Check for explicit protection
    if (memory.protected) {
      risk_factors.push("Explicitly protected memory");
      risk_score += 0.5;
    }

    const risk_level = this.calculateRiskLevel(risk_score);
    const recommendations = this.generateRecommendations(
      risk_level,
      risk_factors
    );

    return {
      risk_level,
      risk_score,
      risk_factors,
      recommendations,
      safe_to_forget: risk_level === "low",
    };
  }

  /**
   * Assess risk for multiple memories
   */
  assessBatchRisk(memories: Memory[]): Map<string, RiskAssessmentResult> {
    const results = new Map<string, RiskAssessmentResult>();

    for (const memory of memories) {
      results.set(memory.id, this.assessRisk(memory));
    }

    return results;
  }

  private calculateRiskLevel(risk_score: number): RiskLevel {
    if (risk_score >= 0.7) return "high";
    if (risk_score >= 0.4) return "medium";
    return "low";
  }

  private generateRecommendations(
    risk_level: RiskLevel,
    risk_factors: string[]
  ): string[] {
    const recommendations: string[] = [];

    switch (risk_level) {
      case "high":
        recommendations.push("Do not forget this memory");
        recommendations.push("Consider archiving instead of deletion");
        break;
      case "medium":
        recommendations.push("Proceed with caution");
        recommendations.push("Consider user confirmation");
        break;
      case "low":
        recommendations.push("Safe to forget");
        break;
    }

    if (risk_factors.includes("High importance memory")) {
      recommendations.push("Verify importance assessment");
    }

    if (risk_factors.includes("Recently created memory")) {
      recommendations.push("Wait for memory to age before forgetting");
    }

    return recommendations;
  }
}
