/**
 * Risk Assessment System for Memory Operations
 *
 * Provides clear, user-friendly risk assessments for forgetting operations
 * with color coding and plain language explanations.
 */

import {
  ForgettingDecision,
  ForgettingEvaluation,
  MemoryOptimizationRecommendation,
} from "../../interfaces/forgetting.js";

export interface RiskAssessment {
  level: "very_low" | "low" | "medium" | "high" | "very_high";
  score: number; // 0-1
  color: string;
  emoji: string;
  title: string;
  description: string;
  warnings: string[];
  safeguards: string[];
  recommendations: string[];
}

export interface MemoryOperationRisk {
  operation_type: "forget" | "optimize" | "archive" | "consolidate";
  memory_count: number;
  risk_assessment: RiskAssessment;
  impact_summary: {
    data_loss_risk: string;
    performance_impact: string;
    recovery_difficulty: string;
    user_impact: string;
  };
  safety_measures: {
    backup_available: boolean;
    rollback_possible: boolean;
    gradual_execution: boolean;
    user_consent_required: boolean;
  };
}

export class RiskAssessmentEngine {
  static assessForgettingRisk(
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    memoryCount: number = 1
  ): MemoryOperationRisk {
    const riskScore = this.calculateForgettingRiskScore(
      decision,
      evaluation,
      memoryCount
    );
    const riskAssessment = this.createRiskAssessment(
      riskScore,
      "forget",
      memoryCount
    );

    return {
      operation_type: "forget",
      memory_count: memoryCount,
      risk_assessment: riskAssessment,
      impact_summary: this.createImpactSummary(
        decision,
        evaluation,
        memoryCount
      ),
      safety_measures: this.assessSafetyMeasures(decision, evaluation),
    };
  }

  static assessOptimizationRisk(
    recommendations: MemoryOptimizationRecommendation[],
    totalMemoryCount: number
  ): MemoryOperationRisk {
    const affectedMemories = recommendations.reduce(
      (sum, rec) => sum + rec.target_memories.length,
      0
    );
    const riskScore = this.calculateOptimizationRiskScore(
      recommendations,
      totalMemoryCount
    );
    const riskAssessment = this.createRiskAssessment(
      riskScore,
      "optimize",
      affectedMemories
    );

    return {
      operation_type: "optimize",
      memory_count: affectedMemories,
      risk_assessment: riskAssessment,
      impact_summary: this.createOptimizationImpactSummary(
        recommendations,
        totalMemoryCount
      ),
      safety_measures: this.assessOptimizationSafetyMeasures(recommendations),
    };
  }

  private static calculateForgettingRiskScore(
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    memoryCount: number
  ): number {
    let riskScore = 0;

    // Base risk from memory importance
    const importance = evaluation.combined_score || 0;
    if (importance > 0.8) riskScore += 0.4;
    else if (importance > 0.6) riskScore += 0.3;
    else if (importance > 0.4) riskScore += 0.2;
    else if (importance > 0.2) riskScore += 0.1;

    // Risk from memory count
    if (memoryCount > 1000) riskScore += 0.3;
    else if (memoryCount > 100) riskScore += 0.2;
    else if (memoryCount > 10) riskScore += 0.1;

    // Risk from decision confidence
    const confidence = decision.confidence || 0;
    if (confidence < 0.5) riskScore += 0.2;
    else if (confidence < 0.7) riskScore += 0.1;

    // Risk from memory type
    if (evaluation.memory_type === "episodic") riskScore += 0.1;

    // Risk from recovery difficulty
    if (evaluation.estimated_impact?.recovery_difficulty > 0.7)
      riskScore += 0.2;

    return Math.min(riskScore, 1.0);
  }

  private static calculateOptimizationRiskScore(
    recommendations: MemoryOptimizationRecommendation[],
    totalMemoryCount: number
  ): number {
    let riskScore = 0;

    // Risk from operation types
    const hasForget = recommendations.some((r) => r.type === "forget");
    const hasConsolidate = recommendations.some(
      (r) => r.type === "consolidate"
    );

    if (hasForget) riskScore += 0.3;
    if (hasConsolidate) riskScore += 0.2;

    // Risk from affected memory percentage
    const affectedCount = recommendations.reduce(
      (sum, rec) => sum + rec.target_memories.length,
      0
    );
    const affectedPercentage = affectedCount / totalMemoryCount;

    if (affectedPercentage > 0.5) riskScore += 0.3;
    else if (affectedPercentage > 0.3) riskScore += 0.2;
    else if (affectedPercentage > 0.1) riskScore += 0.1;

    // Risk from high-risk recommendations
    const highRiskCount = recommendations.filter(
      (r) => r.risk_level === "high"
    ).length;
    riskScore += highRiskCount * 0.15;

    return Math.min(riskScore, 1.0);
  }

  private static createRiskAssessment(
    riskScore: number,
    operationType: string,
    memoryCount: number
  ): RiskAssessment {
    if (riskScore < 0.2) {
      return {
        level: "very_low",
        score: riskScore,
        color: "#22c55e", // Green
        emoji: "✅",
        title: "Very Low Risk",
        description: `This ${operationType} operation is very safe with minimal risk of data loss or negative impact.`,
        warnings: [],
        safeguards: [
          "Automatic backups are created",
          "Operation can be easily reversed",
          "Only low-importance memories affected",
        ],
        recommendations: [
          "Safe to proceed without additional precautions",
          "Consider enabling automatic optimization for similar operations",
        ],
      };
    } else if (riskScore < 0.4) {
      return {
        level: "low",
        score: riskScore,
        color: "#84cc16", // Light green
        emoji: "🟢",
        title: "Low Risk",
        description: `This ${operationType} operation has low risk. Standard safety measures are in place.`,
        warnings: [
          memoryCount > 10 ? "Multiple memories will be affected" : "",
        ].filter(Boolean),
        safeguards: [
          "Backups created before operation",
          "Gradual execution with monitoring",
          "Rollback available if needed",
        ],
        recommendations: [
          "Review the affected memories if desired",
          "Proceed with confidence - safety measures are active",
        ],
      };
    } else if (riskScore < 0.6) {
      return {
        level: "medium",
        score: riskScore,
        color: "#f59e0b", // Orange
        emoji: "🟡",
        title: "Medium Risk",
        description: `This ${operationType} operation has moderate risk. Please review carefully before proceeding.`,
        warnings: [
          "Some important memories may be affected",
          memoryCount > 100 ? "Large number of memories involved" : "",
          "Recovery may be challenging for some items",
        ].filter(Boolean),
        safeguards: [
          "Full backups created",
          "User consent required for important items",
          "Gradual execution with pause points",
          "Enhanced monitoring active",
        ],
        recommendations: [
          "Review the list of affected memories",
          "Consider using a more conservative approach",
          "Ensure you understand what will be changed",
        ],
      };
    } else if (riskScore < 0.8) {
      return {
        level: "high",
        score: riskScore,
        color: "#ef4444", // Red
        emoji: "🔴",
        title: "High Risk",
        description: `This ${operationType} operation has high risk of data loss or negative impact. Careful consideration recommended.`,
        warnings: [
          "Important memories will be affected",
          "Recovery may be difficult or impossible",
          memoryCount > 500 ? "Very large number of memories involved" : "",
          "Significant performance impact possible",
        ].filter(Boolean),
        safeguards: [
          "Multiple backup layers created",
          "Manual approval required for each step",
          "Extended rollback window available",
          "Detailed audit logging enabled",
        ],
        recommendations: [
          "Carefully review all affected memories",
          "Consider using a more conservative policy",
          "Test with a small subset first",
          "Ensure you have recent external backups",
        ],
      };
    } else {
      return {
        level: "very_high",
        score: riskScore,
        color: "#dc2626", // Dark red
        emoji: "⚠️",
        title: "Very High Risk",
        description: `This ${operationType} operation has very high risk. Strongly consider alternative approaches.`,
        warnings: [
          "Critical memories will be permanently lost",
          "Recovery is unlikely to be successful",
          "Major performance or functionality impact expected",
          "Operation cannot be easily reversed",
        ],
        safeguards: [
          "Maximum security backups created",
          "Individual approval required for each memory",
          "Extended testing and validation period",
          "Emergency recovery procedures prepared",
        ],
        recommendations: [
          "Consider alternative approaches",
          "Consult documentation or support",
          "Use the most conservative settings possible",
          "Create external backups before proceeding",
          "Test thoroughly in a safe environment first",
        ],
      };
    }
  }

  private static createImpactSummary(
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    memoryCount: number
  ) {
    const importance = evaluation.combined_score || 0;
    const recoveryDifficulty =
      evaluation.estimated_impact?.recovery_difficulty || 0;

    return {
      data_loss_risk:
        importance > 0.7
          ? "High - important information may be lost"
          : importance > 0.4
          ? "Medium - some useful information may be lost"
          : "Low - minimal important information at risk",

      performance_impact:
        memoryCount > 1000
          ? "Significant performance improvement expected"
          : memoryCount > 100
          ? "Moderate performance improvement"
          : "Minor performance improvement",

      recovery_difficulty:
        recoveryDifficulty > 0.7
          ? "Very difficult - recovery unlikely"
          : recoveryDifficulty > 0.4
          ? "Moderate - partial recovery possible"
          : "Easy - full recovery likely if needed",

      user_impact: decision.user_consent_required
        ? "User approval required before execution"
        : "Automatic execution with monitoring",
    };
  }

  private static createOptimizationImpactSummary(
    recommendations: MemoryOptimizationRecommendation[],
    totalMemoryCount: number
  ) {
    const affectedCount = recommendations.reduce(
      (sum, rec) => sum + rec.target_memories.length,
      0
    );
    const affectedPercentage = (affectedCount / totalMemoryCount) * 100;

    const hasHighRisk = recommendations.some((r) => r.risk_level === "high");
    const requiresConsent = recommendations.some(
      (r) => r.requires_user_consent
    );

    return {
      data_loss_risk: hasHighRisk
        ? "High - some important memories may be affected"
        : affectedPercentage > 30
        ? "Medium - significant number of memories affected"
        : "Low - mostly unimportant memories affected",

      performance_impact:
        affectedPercentage > 50
          ? "Major performance improvement expected"
          : affectedPercentage > 20
          ? "Significant performance improvement"
          : "Moderate performance improvement",

      recovery_difficulty: hasHighRisk
        ? "Difficult - some operations may be irreversible"
        : "Moderate - most operations can be reversed",

      user_impact: requiresConsent
        ? "User approval required for some operations"
        : "Automatic execution with safety monitoring",
    };
  }

  private static assessSafetyMeasures(
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation
  ) {
    return {
      backup_available: true, // Always create backups
      rollback_possible: evaluation.estimated_impact?.recovery_difficulty < 0.7,
      gradual_execution: decision.confidence < 0.8,
      user_consent_required: decision.user_consent_required || false,
    };
  }

  private static assessOptimizationSafetyMeasures(
    recommendations: MemoryOptimizationRecommendation[]
  ) {
    const hasHighRisk = recommendations.some((r) => r.risk_level === "high");
    const requiresConsent = recommendations.some(
      (r) => r.requires_user_consent
    );

    return {
      backup_available: true,
      rollback_possible: !hasHighRisk,
      gradual_execution: hasHighRisk || recommendations.length > 10,
      user_consent_required: requiresConsent,
    };
  }

  static createRiskSummaryText(risk: MemoryOperationRisk): string {
    const { risk_assessment, memory_count } = risk;

    let summary = `${risk_assessment.emoji} **${risk_assessment.title}** - `;
    summary += `${risk_assessment.description}\n\n`;

    if (memory_count > 1) {
      summary += `**Affected Memories:** ${memory_count.toLocaleString()}\n`;
    }

    if (risk_assessment.warnings.length > 0) {
      summary += `**⚠️ Warnings:**\n`;
      risk_assessment.warnings.forEach((warning) => {
        summary += `• ${warning}\n`;
      });
      summary += `\n`;
    }

    summary += `**🛡️ Safety Measures:**\n`;
    risk_assessment.safeguards.forEach((safeguard) => {
      summary += `• ${safeguard}\n`;
    });

    if (risk_assessment.recommendations.length > 0) {
      summary += `\n**💡 Recommendations:**\n`;
      risk_assessment.recommendations.forEach((rec) => {
        summary += `• ${rec}\n`;
      });
    }

    return summary;
  }
}
