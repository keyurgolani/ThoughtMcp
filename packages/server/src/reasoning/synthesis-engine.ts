/**
 * Result Synthesis Engine
 *
 * Integrates outputs from all four parallel reasoning streams into a coherent
 * result with attributed insights, ranked recommendations, preserved conflicts,
 * and quality assessment.
 */

import { ConflictResolutionEngine } from "./conflict-resolution-engine";
import {
  ConflictSeverity,
  type AttributedInsight,
  type Conflict,
  type Insight,
  type QualityAssessment,
  type Recommendation,
  type StreamResult,
  type SynthesizedResult,
} from "./types";

/**
 * Result Synthesis Engine
 *
 * Synthesizes results from parallel reasoning streams into a unified,
 * coherent output with insight attribution, recommendation ranking,
 * conflict preservation, and quality assessment.
 */
export class ResultSynthesisEngine {
  private readonly conflictEngine: ConflictResolutionEngine;

  constructor() {
    this.conflictEngine = new ConflictResolutionEngine();
  }

  /**
   * Synthesize results from multiple reasoning streams
   *
   * @param results - Array of stream results to synthesize
   * @returns Synthesized result with integrated insights and recommendations
   */
  synthesizeResults(results: StreamResult[]): SynthesizedResult {
    const startTime = performance.now();

    // Handle empty results
    if (results.length === 0) {
      return this.createEmptySynthesis("Unable to synthesize results: no streams provided");
    }

    // Filter successful streams
    const successfulResults = results.filter((r) => r.status === "completed");

    // Handle no successful streams
    if (successfulResults.length === 0) {
      return this.createEmptySynthesis("Unable to synthesize results: no successful streams");
    }

    // Detect conflicts BEFORE synthesis using ConflictResolutionEngine
    const conflicts = this.conflictEngine.detectConflicts(successfulResults);

    // Extract all insights from successful streams
    const allInsights: Insight[] = [];
    for (const result of successfulResults) {
      allInsights.push(...result.insights);
    }

    // Attribute and rank insights
    const attributedInsights = this.attributeInsights(allInsights, successfulResults);

    // Extract recommendations from insights and conclusions
    const recommendations = this.extractRecommendations(successfulResults);
    const rankedRecommendations = this.rankRecommendations(recommendations);

    // Generate integrated conclusion (guided by resolution frameworks)
    const conclusion = this.generateConclusion(successfulResults, conflicts);

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(successfulResults);

    // Create synthesis result
    const synthesis: SynthesizedResult = {
      conclusion,
      insights: attributedInsights,
      recommendations: rankedRecommendations,
      conflicts,
      confidence,
      quality: {
        overallScore: 0,
        coherence: 0,
        completeness: 0,
        consistency: 0,
        insightQuality: 0,
        recommendationQuality: 0,
      },
      metadata: {
        streamsUsed: successfulResults.map((r) => r.streamType),
        synthesisTime: Math.max(1, Math.round(performance.now() - startTime)),
        timestamp: new Date(),
      },
    };

    // Assess quality
    synthesis.quality = this.assessSynthesisQuality(synthesis);

    return synthesis;
  }

  /**
   * Attribute insights to source streams
   *
   * @param insights - Array of insights to attribute
   * @param results - Array of stream results for context
   * @returns Array of attributed insights
   */
  attributeInsights(insights: Insight[], results: StreamResult[]): AttributedInsight[] {
    // Group similar insights
    const insightGroups = new Map<string, Insight[]>();

    for (const insight of insights) {
      const normalized = insight.content.toLowerCase().trim();
      const existing = insightGroups.get(normalized);
      if (existing) {
        existing.push(insight);
      } else {
        insightGroups.set(normalized, [insight]);
      }
    }

    // Create attributed insights
    const attributed: AttributedInsight[] = [];

    for (const [, group] of insightGroups.entries()) {
      // Collect unique sources
      const sources = Array.from(new Set(group.map((i) => i.source)));

      // Calculate average confidence and importance
      const avgConfidence = group.reduce((sum, i) => sum + i.confidence, 0) / group.length;
      const avgImportance = group.reduce((sum, i) => sum + i.importance, 0) / group.length;

      // Extract evidence from stream reasoning
      const evidence: string[] = [];
      for (const source of sources) {
        const result = results.find((r) => r.streamType === source);
        if (result) {
          evidence.push(...result.reasoning.slice(0, 2)); // Take first 2 reasoning steps
        }
      }

      attributed.push({
        content: group[0].content, // Use original content (not normalized)
        sources,
        confidence: avgConfidence,
        importance: avgImportance,
        evidence,
      });
    }

    // Rank by importance * confidence
    attributed.sort((a, b) => {
      const scoreA = a.importance * a.confidence;
      const scoreB = b.importance * b.confidence;
      return scoreB - scoreA;
    });

    // Filter low-importance insights (threshold: 0.4) after ranking
    const filtered = attributed.filter((i) => i.importance > 0.4);

    return filtered;
  }

  /**
   * Rank recommendations by priority and confidence
   *
   * @param recommendations - Array of recommendations to rank
   * @returns Array of ranked recommendations
   */
  rankRecommendations(recommendations: Recommendation[]): Recommendation[] {
    // Group similar recommendations
    const recGroups = new Map<string, Recommendation[]>();

    for (const rec of recommendations) {
      const normalized = rec.description.toLowerCase().trim();
      const existing = recGroups.get(normalized);
      if (existing) {
        existing.push(rec);
      } else {
        recGroups.set(normalized, [rec]);
      }
    }

    // Merge similar recommendations
    const merged: Recommendation[] = [];

    for (const [, group] of recGroups.entries()) {
      // Collect unique sources
      const sources = Array.from(new Set(group.flatMap((r) => r.sources)));

      // Calculate average priority and confidence
      const avgPriority = group.reduce((sum, r) => sum + r.priority, 0) / group.length;
      const avgConfidence = group.reduce((sum, r) => sum + r.confidence, 0) / group.length;

      // Collect all rationale and concerns
      const rationale = Array.from(new Set(group.flatMap((r) => r.rationale)));
      const concerns = Array.from(new Set(group.flatMap((r) => r.concerns)));

      merged.push({
        description: group[0].description,
        sources,
        priority: avgPriority,
        confidence: avgConfidence,
        rationale,
        concerns,
      });
    }

    // Rank by priority, then confidence
    merged.sort((a, b) => {
      if (Math.abs(a.priority - b.priority) > 0.01) {
        return b.priority - a.priority;
      }
      return b.confidence - a.confidence;
    });

    return merged;
  }

  /**
   * Assess synthesis quality
   *
   * @param synthesis - Synthesized result to assess
   * @returns Quality assessment
   */
  assessSynthesisQuality(synthesis: SynthesizedResult): QualityAssessment {
    // Assess completeness (coverage of all 4 streams)
    const completeness = synthesis.metadata.streamsUsed.length / 4;

    // Assess consistency (inverse of conflict severity)
    const consistency = this.assessConsistency(synthesis.conflicts);

    // Assess coherence (based on conclusion quality)
    const coherence = this.assessCoherence(synthesis.conclusion, synthesis.insights);

    // Assess insight quality
    const insightQuality = this.assessInsightQuality(synthesis.insights);

    // Assess recommendation quality
    const recommendationQuality = this.assessRecommendationQuality(synthesis.recommendations);

    // Calculate overall score (weighted average)
    const overallScore =
      completeness * 0.2 +
      consistency * 0.2 +
      coherence * 0.2 +
      insightQuality * 0.2 +
      recommendationQuality * 0.2;

    return {
      overallScore,
      coherence,
      completeness,
      consistency,
      insightQuality,
      recommendationQuality,
    };
  }

  // Private helper methods

  private createEmptySynthesis(message: string): SynthesizedResult {
    return {
      conclusion: message,
      insights: [],
      recommendations: [],
      conflicts: [],
      confidence: 0,
      quality: {
        overallScore: 0,
        coherence: 0,
        completeness: 0,
        consistency: 0,
        insightQuality: 0,
        recommendationQuality: 0,
      },
      metadata: {
        streamsUsed: [],
        synthesisTime: 0,
        timestamp: new Date(),
      },
    };
  }

  private extractRecommendations(results: StreamResult[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const result of results) {
      // Extract recommendations from conclusions
      // Simple heuristic: look for action-oriented language
      if (
        result.conclusion.toLowerCase().includes("should") ||
        result.conclusion.toLowerCase().includes("recommend") ||
        result.conclusion.toLowerCase().includes("suggest")
      ) {
        recommendations.push({
          description: result.conclusion,
          sources: [result.streamType],
          priority: result.confidence,
          confidence: result.confidence,
          rationale: result.reasoning,
          concerns: [],
        });
      }
    }

    return recommendations;
  }

  private generateConclusion(results: StreamResult[], conflicts: Conflict[]): string {
    if (results.length === 0) {
      return "No conclusion available";
    }

    // If no conflicts, synthesize conclusions
    if (conflicts.length === 0) {
      const conclusions = results.map((r) => r.conclusion).filter((c) => c.length > 0);
      return `Integrated conclusion: ${conclusions.join(". ")}`;
    }

    // Categorize conflicts by severity
    const criticalConflicts = conflicts.filter((c) => c.severity === ConflictSeverity.CRITICAL);
    const highConflicts = conflicts.filter((c) => c.severity === ConflictSeverity.HIGH);
    const otherConflicts = conflicts.filter(
      (c) => c.severity !== ConflictSeverity.CRITICAL && c.severity !== ConflictSeverity.HIGH
    );

    const conclusions = results.map((r) => r.conclusion).filter((c) => c.length > 0);
    let conclusionText = `Multiple perspectives identified: ${conclusions.join(". ")}`;

    // Highlight critical conflicts prominently
    if (criticalConflicts.length > 0) {
      const criticalDescriptions = criticalConflicts
        .map((c) => this.formatConflictWithResolution(c))
        .join(" ");
      conclusionText += ` CRITICAL CONFLICTS REQUIRING IMMEDIATE ATTENTION: ${criticalDescriptions}`;
    }

    // Highlight high-severity conflicts
    if (highConflicts.length > 0) {
      const highDescriptions = highConflicts
        .map((c) => this.formatConflictWithResolution(c))
        .join(" ");
      conclusionText += ` HIGH-PRIORITY CONFLICTS: ${highDescriptions}`;
    }

    // Mention other conflicts
    if (otherConflicts.length > 0) {
      conclusionText += ` (${otherConflicts.length} additional conflicts detected)`;
    }

    return conclusionText;
  }

  /**
   * Format a conflict with its resolution suggestion
   */
  private formatConflictWithResolution(conflict: Conflict): string {
    let formatted = conflict.description;

    // Add resolution suggestion if available
    if (conflict.resolutionFramework) {
      formatted += ` Resolution: ${conflict.resolutionFramework.recommendedAction}`;
    }

    return formatted;
  }

  private calculateOverallConfidence(results: StreamResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    return totalConfidence / results.length;
  }

  private assessConsistency(conflicts: Conflict[]): number {
    if (conflicts.length === 0) {
      return 1.0;
    }

    // Calculate average conflict severity (map enum to numeric score)
    const severityScores = conflicts.map((c) => this.severityToScore(c.severity));
    const avgSeverity =
      severityScores.reduce((sum, score) => sum + score, 0) / severityScores.length;

    // Consistency is inverse of severity
    return 1.0 - avgSeverity;
  }

  private severityToScore(severity: ConflictSeverity): number {
    switch (severity) {
      case ConflictSeverity.LOW:
        return 0.25;
      case ConflictSeverity.MEDIUM:
        return 0.5;
      case ConflictSeverity.HIGH:
        return 0.75;
      case ConflictSeverity.CRITICAL:
        return 1.0;
      default:
        return 0.5;
    }
  }

  private assessCoherence(conclusion: string, insights: AttributedInsight[]): number {
    // Simple heuristic: longer conclusions with more insights are more coherent
    if (conclusion.length === 0) {
      return 0;
    }

    const lengthScore = Math.min(conclusion.length / 100, 1.0);
    const insightScore = Math.min(insights.length / 5, 1.0);

    return (lengthScore + insightScore) / 2;
  }

  private assessInsightQuality(insights: AttributedInsight[]): number {
    if (insights.length === 0) {
      return 0;
    }

    // Quality based on average confidence, importance, and evidence
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    const avgImportance = insights.reduce((sum, i) => sum + i.importance, 0) / insights.length;
    const avgEvidence = insights.reduce((sum, i) => sum + i.evidence.length, 0) / insights.length;

    const evidenceScore = Math.min(avgEvidence / 3, 1.0);

    return (avgConfidence + avgImportance + evidenceScore) / 3;
  }

  private assessRecommendationQuality(recommendations: Recommendation[]): number {
    if (!recommendations || recommendations.length === 0) {
      return 0;
    }

    // Quality based on average priority, confidence, and rationale
    const avgPriority =
      recommendations.reduce((sum, r) => sum + r.priority, 0) / recommendations.length;
    const avgConfidence =
      recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length;
    const avgRationale =
      recommendations.reduce((sum, r) => sum + r.rationale.length, 0) / recommendations.length;

    const rationaleScore = Math.min(avgRationale / 3, 1.0);

    return (avgPriority + avgConfidence + rationaleScore) / 3;
  }
}
