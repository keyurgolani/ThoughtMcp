/**
 * Memory Analysis Formatter
 * Provides user-friendly formatting for memory analysis results with summary levels
 */

import {
  ForgettingBenefit,
  MemoryOptimizationRecommendation,
  MemoryUsageAnalysis,
} from "../interfaces/forgetting.js";

export type MemoryAnalysisSummaryLevel = "overview" | "detailed" | "full";

export interface MemoryHealthScore {
  overall_score: number; // 0-100
  category_scores: {
    efficiency: number;
    organization: number;
    performance: number;
    maintenance: number;
  };
  health_status: "excellent" | "good" | "fair" | "poor" | "critical";
  primary_concerns: string[];
  strengths: string[];
}

export interface FormattedMemoryAnalysis {
  health_score: MemoryHealthScore;
  summary: string;
  key_metrics: {
    total_memories: number;
    memory_size_mb: number;
    optimization_potential: number;
    top_recommendation: string;
  };
  detailed_analysis?: MemoryUsageAnalysis;
  prioritized_recommendations: FormattedRecommendation[];
  trends?: MemoryTrends;
}

export interface FormattedRecommendation {
  priority: "high" | "medium" | "low";
  type: string;
  title: string;
  description: string;
  impact_summary: string;
  memory_count: number;
  estimated_benefit: string;
  risk_level: "low" | "medium" | "high";
  requires_consent: boolean;
  sample_memory_ids?: string[]; // Only first few IDs for reference
}

export interface MemoryTrends {
  growth_rate: "increasing" | "stable" | "decreasing";
  access_patterns: "healthy" | "declining" | "irregular";
  optimization_history: string[];
  recommendations: string[];
}

export class MemoryAnalysisFormatter {
  /**
   * Format memory analysis results with specified summary level
   */
  static formatAnalysis(
    analysis: MemoryUsageAnalysis,
    recommendations: MemoryOptimizationRecommendation[],
    summaryLevel: MemoryAnalysisSummaryLevel = "overview"
  ): FormattedMemoryAnalysis {
    const healthScore = this.calculateHealthScore(analysis);
    const prioritizedRecommendations = this.formatRecommendations(
      recommendations,
      summaryLevel
    );
    const keyMetrics = this.extractKeyMetrics(analysis, recommendations);
    const summary = this.generateSummary(analysis, healthScore, summaryLevel);

    const result: FormattedMemoryAnalysis = {
      health_score: healthScore,
      summary,
      key_metrics: keyMetrics,
      prioritized_recommendations: prioritizedRecommendations,
    };

    // Add detailed analysis for detailed/full levels
    if (summaryLevel === "detailed" || summaryLevel === "full") {
      result.detailed_analysis = analysis;
    }

    // Add trends for full level
    if (summaryLevel === "full") {
      result.trends = this.generateTrends(analysis);
    }

    return result;
  }

  /**
   * Calculate comprehensive health score
   */
  private static calculateHealthScore(
    analysis: MemoryUsageAnalysis
  ): MemoryHealthScore {
    // Calculate category scores (0-100)
    const efficiency = this.calculateEfficiencyScore(analysis);
    const organization = this.calculateOrganizationScore(analysis);
    const performance = this.calculatePerformanceScore(analysis);
    const maintenance = this.calculateMaintenanceScore(analysis);

    const overall = Math.round(
      (efficiency + organization + performance + maintenance) / 4
    );

    const healthStatus = this.getHealthStatus(overall);
    const concerns = this.identifyPrimaryConcerns(analysis, {
      efficiency,
      organization,
      performance,
      maintenance,
    });
    const strengths = this.identifyStrengths(analysis, {
      efficiency,
      organization,
      performance,
      maintenance,
    });

    return {
      overall_score: overall,
      category_scores: {
        efficiency,
        organization,
        performance,
        maintenance,
      },
      health_status: healthStatus,
      primary_concerns: concerns,
      strengths,
    };
  }

  private static calculateEfficiencyScore(
    analysis: MemoryUsageAnalysis
  ): number {
    // Based on memory pressure and fragmentation
    const pressureScore = Math.max(
      0,
      100 - analysis.memory_pressure_level * 100
    );
    const fragmentationScore = Math.max(
      0,
      100 - analysis.fragmentation_level * 100
    );
    return Math.round((pressureScore + fragmentationScore) / 2);
  }

  private static calculateOrganizationScore(
    analysis: MemoryUsageAnalysis
  ): number {
    // Based on conflicting memories and importance distribution
    const conflictScore = Math.max(
      0,
      100 - (analysis.conflicting_memories / analysis.total_memories) * 200
    );
    const importanceScore = Math.max(
      0,
      100 - (analysis.low_importance_memories / analysis.total_memories) * 150
    );
    return Math.round((conflictScore + importanceScore) / 2);
  }

  private static calculatePerformanceScore(
    analysis: MemoryUsageAnalysis
  ): number {
    // Based on access frequency and rarely accessed memories
    const accessScore = Math.min(100, analysis.average_access_frequency * 20);
    const utilizationScore = Math.max(
      0,
      100 - (analysis.rarely_accessed_memories / analysis.total_memories) * 150
    );
    return Math.round((accessScore + utilizationScore) / 2);
  }

  private static calculateMaintenanceScore(
    analysis: MemoryUsageAnalysis
  ): number {
    // Based on optimization potential and memory age distribution
    const optimizationScore = Math.max(
      0,
      100 - analysis.optimization_potential * 100
    );
    const ageScore = Math.min(
      100,
      Math.max(0, 100 - analysis.oldest_memory_age_days / 10)
    );
    return Math.round((optimizationScore + ageScore) / 2);
  }

  private static getHealthStatus(
    score: number
  ): "excellent" | "good" | "fair" | "poor" | "critical" {
    if (score >= 90) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "fair";
    if (score >= 40) return "poor";
    return "critical";
  }

  private static identifyPrimaryConcerns(
    analysis: MemoryUsageAnalysis,
    scores: {
      efficiency: number;
      organization: number;
      performance: number;
      maintenance: number;
    }
  ): string[] {
    const concerns: string[] = [];

    if (scores.efficiency < 60) {
      if (analysis.memory_pressure_level > 0.7) {
        concerns.push("High memory pressure - system is running out of space");
      }
      if (analysis.fragmentation_level > 0.4) {
        concerns.push("High fragmentation - memory is poorly organized");
      }
    }

    if (scores.organization < 60) {
      if (analysis.conflicting_memories > analysis.total_memories * 0.1) {
        concerns.push("Too many conflicting memories causing interference");
      }
      if (analysis.low_importance_memories > analysis.total_memories * 0.3) {
        concerns.push(
          "Excessive low-importance memories cluttering the system"
        );
      }
    }

    if (scores.performance < 60) {
      if (analysis.average_access_frequency < 1) {
        concerns.push("Low memory access frequency indicates underutilization");
      }
      if (analysis.rarely_accessed_memories > analysis.total_memories * 0.4) {
        concerns.push(
          "Too many rarely accessed memories slowing down retrieval"
        );
      }
    }

    if (scores.maintenance < 60) {
      if (analysis.optimization_potential > 0.6) {
        concerns.push("High optimization potential - system needs maintenance");
      }
      if (analysis.oldest_memory_age_days > 300) {
        concerns.push("Very old memories may need review or archiving");
      }
    }

    return concerns.slice(0, 3); // Limit to top 3 concerns
  }

  private static identifyStrengths(
    analysis: MemoryUsageAnalysis,
    scores: {
      efficiency: number;
      organization: number;
      performance: number;
      maintenance: number;
    }
  ): string[] {
    const strengths: string[] = [];

    if (scores.efficiency >= 80) {
      strengths.push(
        "Excellent memory efficiency with low pressure and fragmentation"
      );
    }
    if (scores.organization >= 80) {
      strengths.push("Well-organized memory structure with minimal conflicts");
    }
    if (scores.performance >= 80) {
      strengths.push("High-performance memory access patterns");
    }
    if (scores.maintenance >= 80) {
      strengths.push("Well-maintained memory system with good optimization");
    }

    if (analysis.episodic_memories > 0 && analysis.semantic_memories > 0) {
      const ratio = analysis.episodic_memories / analysis.semantic_memories;
      if (ratio >= 0.4 && ratio <= 2.5) {
        strengths.push(
          "Healthy balance between episodic and semantic memories"
        );
      }
    }

    return strengths.slice(0, 3); // Limit to top 3 strengths
  }

  /**
   * Format recommendations with priority and user-friendly descriptions
   */
  private static formatRecommendations(
    recommendations: MemoryOptimizationRecommendation[],
    summaryLevel: MemoryAnalysisSummaryLevel
  ): FormattedRecommendation[] {
    return recommendations.map((rec, index) => {
      const priority = this.calculateRecommendationPriority(rec, index);
      const impactSummary = this.formatImpactSummary(rec.estimated_benefit);
      const title = this.generateRecommendationTitle(rec);
      const estimatedBenefit = this.formatBenefitDescription(
        rec.estimated_benefit
      );

      const formatted: FormattedRecommendation = {
        priority,
        type: rec.type,
        title,
        description: rec.description,
        impact_summary: impactSummary,
        memory_count: rec.target_memories.length,
        estimated_benefit: estimatedBenefit,
        risk_level: rec.risk_level,
        requires_consent: rec.requires_user_consent,
      };

      // Add sample memory IDs for detailed/full levels (but limit to avoid overwhelming output)
      if (summaryLevel === "detailed" || summaryLevel === "full") {
        formatted.sample_memory_ids = rec.target_memories.slice(0, 5); // Only first 5 IDs
      }

      return formatted;
    });
  }

  private static calculateRecommendationPriority(
    rec: MemoryOptimizationRecommendation,
    index: number
  ): "high" | "medium" | "low" {
    // High priority for first recommendation or high-impact low-risk actions
    if (
      index === 0 ||
      (rec.risk_level === "low" && rec.target_memories.length > 100)
    ) {
      return "high";
    }
    // Medium priority for moderate impact or medium risk
    if (rec.target_memories.length > 50 || rec.risk_level === "medium") {
      return "medium";
    }
    return "low";
  }

  private static formatImpactSummary(benefit: ForgettingBenefit): string {
    const impacts: string[] = [];

    if (benefit.memory_space_freed > 1000) {
      impacts.push(
        `${Math.round(benefit.memory_space_freed / 1024)}KB space saved`
      );
    }
    if (benefit.processing_speed_improvement > 0.02) {
      impacts.push(
        `${Math.round(
          benefit.processing_speed_improvement * 100
        )}% faster processing`
      );
    }
    if (benefit.interference_reduction > 0.05) {
      impacts.push(
        `${Math.round(benefit.interference_reduction * 100)}% less interference`
      );
    }
    if (benefit.focus_improvement > 0.03) {
      impacts.push(
        `${Math.round(benefit.focus_improvement * 100)}% better focus`
      );
    }

    return impacts.length > 0 ? impacts.join(", ") : "Minor improvements";
  }

  private static generateRecommendationTitle(
    rec: MemoryOptimizationRecommendation
  ): string {
    const count = rec.target_memories.length;
    switch (rec.type) {
      case "forget":
        return `🗑️ Remove ${count} Low-Value Memories`;
      case "compress":
        return `🗜️ Compress ${count} Fragmented Memories`;
      case "archive":
        return `📦 Archive ${count} Rarely Used Memories`;
      case "consolidate":
        return `🔄 Consolidate ${count} Conflicting Memories`;
      default:
        return `⚙️ Optimize ${count} Memories`;
    }
  }

  private static formatBenefitDescription(benefit: ForgettingBenefit): string {
    const parts: string[] = [];

    if (benefit.memory_space_freed > 0) {
      const size =
        benefit.memory_space_freed > 1024
          ? `${(benefit.memory_space_freed / 1024).toFixed(1)}KB`
          : `${benefit.memory_space_freed}B`;
      parts.push(`Free ${size}`);
    }

    if (benefit.processing_speed_improvement > 0.01) {
      parts.push(
        `${(benefit.processing_speed_improvement * 100).toFixed(1)}% faster`
      );
    }

    if (benefit.interference_reduction > 0.02) {
      parts.push(
        `${(benefit.interference_reduction * 100).toFixed(1)}% less noise`
      );
    }

    return parts.length > 0 ? parts.join(" • ") : "Minor optimization";
  }

  /**
   * Extract key metrics for quick overview
   */
  private static extractKeyMetrics(
    analysis: MemoryUsageAnalysis,
    recommendations: MemoryOptimizationRecommendation[]
  ): FormattedMemoryAnalysis["key_metrics"] {
    const topRecommendation =
      recommendations.length > 0
        ? this.generateRecommendationTitle(recommendations[0])
        : "No recommendations needed";

    return {
      total_memories: analysis.total_memories,
      memory_size_mb:
        Math.round((analysis.memory_size_bytes / (1024 * 1024)) * 10) / 10,
      optimization_potential: Math.round(analysis.optimization_potential * 100),
      top_recommendation: topRecommendation,
    };
  }

  /**
   * Generate user-friendly summary based on analysis and health score
   */
  private static generateSummary(
    analysis: MemoryUsageAnalysis,
    healthScore: MemoryHealthScore,
    summaryLevel: MemoryAnalysisSummaryLevel
  ): string {
    const statusEmoji = {
      excellent: "🟢",
      good: "🟡",
      fair: "🟠",
      poor: "🔴",
      critical: "🚨",
    };

    let summary = `${
      statusEmoji[healthScore.health_status]
    } **Memory Health: ${healthScore.health_status.toUpperCase()}** (${
      healthScore.overall_score
    }/100)\n\n`;

    summary += `Your memory system contains **${analysis.total_memories.toLocaleString()} memories** `;
    summary += `(${analysis.episodic_memories.toLocaleString()} episodic, ${analysis.semantic_memories.toLocaleString()} semantic) `;
    summary += `using **${(analysis.memory_size_bytes / (1024 * 1024)).toFixed(
      1
    )}MB** of space.\n\n`;

    if (healthScore.primary_concerns.length > 0) {
      summary += `**🚨 Primary Concerns:**\n`;
      healthScore.primary_concerns.forEach((concern) => {
        summary += `• ${concern}\n`;
      });
      summary += `\n`;
    }

    if (healthScore.strengths.length > 0) {
      summary += `**✅ Strengths:**\n`;
      healthScore.strengths.forEach((strength) => {
        summary += `• ${strength}\n`;
      });
      summary += `\n`;
    }

    if (analysis.optimization_potential > 0.3) {
      summary += `**⚡ Optimization Potential:** ${Math.round(
        analysis.optimization_potential * 100
      )}% - `;
      summary += `Your memory system could benefit from optimization to improve performance and reduce clutter.\n\n`;
    } else {
      summary += `**✨ Well Optimized:** Your memory system is in good shape with only ${Math.round(
        analysis.optimization_potential * 100
      )}% optimization potential.\n\n`;
    }

    if (summaryLevel === "overview") {
      summary += `💡 **Quick Tip:** Use 'detailed' analysis for more insights or 'full' for comprehensive data.`;
    }

    return summary;
  }

  /**
   * Generate memory trends analysis
   */
  private static generateTrends(analysis: MemoryUsageAnalysis): MemoryTrends {
    // Simulate trend analysis (in real implementation, this would use historical data)
    const growthRate =
      analysis.total_memories > 3000
        ? "increasing"
        : analysis.total_memories < 1500
        ? "decreasing"
        : "stable";

    const accessPatterns =
      analysis.average_access_frequency > 2
        ? "healthy"
        : analysis.average_access_frequency < 1
        ? "declining"
        : "irregular";

    const optimizationHistory = [
      "Last optimization: 15 days ago",
      "Average optimization frequency: Every 30 days",
      "Most common optimization: Low-importance memory cleanup",
    ];

    const recommendations = [
      "Consider setting up automatic optimization for low-importance memories",
      "Review memory access patterns monthly",
      "Archive memories older than 6 months if rarely accessed",
    ];

    return {
      growth_rate: growthRate,
      access_patterns: accessPatterns,
      optimization_history: optimizationHistory,
      recommendations,
    };
  }

  /**
   * Create a user-friendly progress message for memory analysis
   */
  static createProgressMessage(stage: string, progress: number): string {
    const emoji =
      progress >= 1.0
        ? "✅"
        : progress >= 0.8
        ? "🏁"
        : progress >= 0.5
        ? "⚡"
        : "🔍";
    const percent = Math.round(progress * 100);

    return `${emoji} ${stage} (${percent}% complete)`;
  }
}
