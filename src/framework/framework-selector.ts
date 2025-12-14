/**
 * Framework Selector
 *
 * Dynamically selects appropriate systematic thinking frameworks based on
 * problem classification. Supports single framework selection and hybrid
 * framework combinations for complex problems.
 */

import { randomUUID } from "node:crypto";
import type { FrameworkLearningSystem } from "./framework-learning.js";
import type { FrameworkRegistry } from "./framework-registry.js";
import type { ProblemClassifier } from "./problem-classifier.js";
import type {
  Context,
  FrameworkAlternative,
  FrameworkSelection,
  Problem,
  ProblemClassification,
  ThinkingFramework,
} from "./types.js";

/**
 * Framework score with reasoning
 */
interface FrameworkScore {
  framework: ThinkingFramework;
  score: number;
  reason: string;
}

/**
 * Framework Selector
 *
 * Selects optimal systematic thinking framework(s) based on problem
 * classification across complexity, uncertainty, stakes, and time pressure.
 * Optionally integrates with learning system for adaptive selection.
 */
export class FrameworkSelector {
  constructor(
    private readonly classifier: ProblemClassifier,
    private readonly registry: FrameworkRegistry,
    private readonly learningSystem?: FrameworkLearningSystem
  ) {}

  /**
   * Select the most appropriate framework(s) for a problem
   *
   * @param problem - Problem to solve
   * @param _context - Execution context (reserved for future use)
   * @returns Framework selection with primary, alternatives, and hybrid info
   */
  selectFramework(problem: Problem, _context: Context): FrameworkSelection {
    // Validate inputs
    if (!problem) {
      throw new Error("Problem cannot be null or undefined");
    }

    // Generate selection ID if learning system is provided
    const selectionId = this.learningSystem ? randomUUID() : undefined;

    // Classify the problem
    const classification = this.classifier.classifyProblem(problem);

    // Get adaptive weights from learning system if available
    const adaptiveWeights = this.getAdaptiveWeights(classification);

    // Get user preferences from learning system if available
    const userPreferences = this.getUserPreferences();

    // Score all frameworks with adaptive weights and preferences
    const scores = this.scoreAllFrameworks(classification, adaptiveWeights, userPreferences);

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    // Check for hybrid opportunity
    const hybridInfo = this.identifyHybridOpportunity(scores, classification);

    if (hybridInfo.isHybrid) {
      return this.createHybridSelection(scores, hybridInfo, classification, selectionId);
    }

    // Single framework selection
    return this.createSingleSelection(scores, classification, selectionId);
  }

  /**
   * Get adaptive weights from learning system
   */
  private getAdaptiveWeights(classification: ProblemClassification): {
    complexity: number;
    uncertainty: number;
    stakes: number;
    timePressure: number;
  } {
    if (!this.learningSystem) {
      // Default weights
      return {
        complexity: 0.3,
        uncertainty: 0.3,
        stakes: 0.25,
        timePressure: 0.15,
      };
    }

    try {
      // Try to get domain-specific weights
      const domain = `${classification.complexity}-${classification.uncertainty}-${classification.stakes}-${classification.timePressure}`;
      const weights = this.learningSystem.getAdaptiveWeights(domain);

      return {
        complexity: weights.complexity,
        uncertainty: weights.uncertainty,
        stakes: weights.stakes,
        timePressure: weights.timePressure,
      };
    } catch {
      // Fall back to default weights on error
      return {
        complexity: 0.3,
        uncertainty: 0.3,
        stakes: 0.25,
        timePressure: 0.15,
      };
    }
  }

  /**
   * Get user preferences from learning system
   */
  private getUserPreferences(): Map<string, number> {
    if (!this.learningSystem) {
      return new Map();
    }

    try {
      // Use default user ID for now
      return this.learningSystem.getUserPreferences("default");
    } catch {
      // Fall back to empty preferences on error
      return new Map();
    }
  }

  /**
   * Score all available frameworks for the problem
   */
  private scoreAllFrameworks(
    classification: ProblemClassification,
    adaptiveWeights?: {
      complexity: number;
      uncertainty: number;
      stakes: number;
      timePressure: number;
    },
    userPreferences?: Map<string, number>
  ): FrameworkScore[] {
    const frameworks = this.registry.getAllFrameworks();
    const scores: FrameworkScore[] = [];

    // Use default weights if not provided
    const weights = adaptiveWeights ?? {
      complexity: 0.3,
      uncertainty: 0.3,
      stakes: 0.25,
      timePressure: 0.15,
    };

    for (const framework of frameworks) {
      const score = this.calculateFrameworkScore(framework, classification, weights);

      // Apply user preference boost if available
      if (userPreferences?.has(framework.id)) {
        const preference = userPreferences.get(framework.id);
        if (preference !== undefined) {
          // Boost score by up to 20% based on preference (-1 to +1 range)
          score.score = score.score * (1 + preference * 0.2);
          // Clamp to valid range
          score.score = Math.max(0, Math.min(1, score.score));
        }
      }

      scores.push(score);
    }

    return scores;
  }

  /**
   * Calculate score for a specific framework
   */
  private calculateFrameworkScore(
    framework: ThinkingFramework,
    classification: ProblemClassification,
    weights?: { complexity: number; uncertainty: number; stakes: number; timePressure: number }
  ): FrameworkScore {
    let score = 0;
    const reasons: string[] = [];

    // Use provided weights or defaults
    const w = weights ?? {
      complexity: 0.3,
      uncertainty: 0.3,
      stakes: 0.25,
      timePressure: 0.15,
    };

    // Complexity match (weighted)
    const complexityScore = this.scoreComplexityMatch(framework.id, classification.complexity);
    score += complexityScore.score * w.complexity;
    if (complexityScore.reason) reasons.push(complexityScore.reason);

    // Uncertainty match (weighted)
    const uncertaintyScore = this.scoreUncertaintyMatch(framework.id, classification.uncertainty);
    score += uncertaintyScore.score * w.uncertainty;
    if (uncertaintyScore.reason) reasons.push(uncertaintyScore.reason);

    // Stakes match (weighted)
    const stakesScore = this.scoreStakesMatch(framework.id, classification.stakes);
    score += stakesScore.score * w.stakes;
    if (stakesScore.reason) reasons.push(stakesScore.reason);

    // Time pressure match (weighted)
    const timePressureScore = this.scoreTimePressureMatch(
      framework.id,
      classification.timePressure
    );
    score += timePressureScore.score * w.timePressure;
    if (timePressureScore.reason) reasons.push(timePressureScore.reason);

    return {
      framework,
      score,
      reason: reasons.join(", "),
    };
  }

  /**
   * Score complexity match for framework
   * Returns normalized score (0-1) independent of weight
   */
  private scoreComplexityMatch(
    frameworkId: string,
    complexity: string
  ): { score: number; reason: string } {
    const rules: Record<string, Record<string, { score: number; reason: string }>> = {
      "scientific-method": {
        simple: { score: 1.0, reason: "ideal for simple problems" },
        moderate: { score: 0.5, reason: "works for moderate problems" },
        complex: { score: 0.17, reason: "less suitable for complex problems" },
      },
      "design-thinking": {
        simple: { score: 0.33, reason: "may be overkill for simple problems" },
        moderate: { score: 0.83, reason: "good for moderate complexity" },
        complex: { score: 0.67, reason: "handles complex problems" },
      },
      "systems-thinking": {
        simple: { score: 0.17, reason: "overkill for simple problems" },
        moderate: { score: 0.67, reason: "useful for moderate complexity" },
        complex: { score: 1.0, reason: "ideal for complex systems" },
      },
      "critical-thinking": {
        simple: { score: 0.67, reason: "works for simple evaluation" },
        moderate: { score: 0.83, reason: "good for moderate evaluation" },
        complex: { score: 0.67, reason: "handles complex evaluation" },
      },
      "root-cause-analysis": {
        simple: { score: 0.83, reason: "good for simple diagnostics" },
        moderate: { score: 1.0, reason: "ideal for moderate diagnostics" },
        complex: { score: 0.67, reason: "works for complex diagnostics" },
      },
    };

    return rules[frameworkId]?.[complexity] ?? { score: 0.33, reason: "" };
  }

  /**
   * Score uncertainty match for framework
   * Returns normalized score (0-1) independent of weight
   */
  private scoreUncertaintyMatch(
    frameworkId: string,
    uncertainty: string
  ): { score: number; reason: string } {
    const rules: Record<string, Record<string, { score: number; reason: string }>> = {
      "scientific-method": {
        low: { score: 1.0, reason: "ideal for low uncertainty" },
        medium: { score: 0.6, reason: "works with medium uncertainty" },
        high: { score: 0.2, reason: "struggles with high uncertainty" },
      },
      "design-thinking": {
        low: { score: 0.4, reason: "less needed for low uncertainty" },
        medium: { score: 0.8, reason: "good for medium uncertainty" },
        high: { score: 1.0, reason: "ideal for high uncertainty" },
      },
      "systems-thinking": {
        low: { score: 0.6, reason: "works with low uncertainty" },
        medium: { score: 0.8, reason: "good for medium uncertainty" },
        high: { score: 0.8, reason: "handles high uncertainty" },
      },
      "critical-thinking": {
        low: { score: 0.8, reason: "good for clear evaluation" },
        medium: { score: 1.0, reason: "ideal for uncertain evaluation" },
        high: { score: 0.6, reason: "works with high uncertainty" },
      },
      "root-cause-analysis": {
        low: { score: 0.8, reason: "good for clear diagnostics" },
        medium: { score: 1.0, reason: "ideal for uncertain diagnostics" },
        high: { score: 0.8, reason: "works with high uncertainty" },
      },
    };

    return rules[frameworkId]?.[uncertainty] ?? { score: 0.4, reason: "" };
  }

  /**
   * Score stakes match for framework
   * Returns normalized score (0-1) independent of weight
   */
  private scoreStakesMatch(frameworkId: string, stakes: string): { score: number; reason: string } {
    const rules: Record<string, Record<string, { score: number; reason: string }>> = {
      "scientific-method": {
        routine: { score: 1.0, reason: "good for routine problems" },
        important: { score: 0.8, reason: "works for important problems" },
        critical: { score: 0.6, reason: "works for critical problems" },
      },
      "design-thinking": {
        routine: { score: 0.6, reason: "works for routine problems" },
        important: { score: 1.0, reason: "ideal for important problems" },
        critical: { score: 0.8, reason: "good for critical problems" },
      },
      "systems-thinking": {
        routine: { score: 0.4, reason: "may be overkill for routine" },
        important: { score: 0.8, reason: "good for important problems" },
        critical: { score: 1.0, reason: "ideal for critical problems" },
      },
      "critical-thinking": {
        routine: { score: 0.8, reason: "good for routine evaluation" },
        important: { score: 1.0, reason: "ideal for important evaluation" },
        critical: { score: 1.0, reason: "critical for high-stakes decisions" },
      },
      "root-cause-analysis": {
        routine: { score: 0.6, reason: "works for routine diagnostics" },
        important: { score: 0.8, reason: "good for important diagnostics" },
        critical: { score: 1.0, reason: "critical for high-stakes issues" },
      },
    };

    return rules[frameworkId]?.[stakes] ?? { score: 0.4, reason: "" };
  }

  /**
   * Score time pressure match for framework
   * Returns normalized score (0-1) independent of weight
   */
  private scoreTimePressureMatch(
    frameworkId: string,
    timePressure: string
  ): { score: number; reason: string } {
    const rules: Record<string, Record<string, { score: number; reason: string }>> = {
      "scientific-method": {
        none: { score: 1.0, reason: "thorough when time allows" },
        moderate: { score: 0.75, reason: "works with moderate pressure" },
        high: { score: 0.25, reason: "too slow for high pressure" },
      },
      "design-thinking": {
        none: { score: 1.0, reason: "thorough when time allows" },
        moderate: { score: 0.75, reason: "works with moderate pressure" },
        high: { score: 0.5, reason: "can be slow under pressure" },
      },
      "systems-thinking": {
        none: { score: 1.0, reason: "thorough when time allows" },
        moderate: { score: 0.75, reason: "works with moderate pressure" },
        high: { score: 0.5, reason: "can be slow under pressure" },
      },
      "critical-thinking": {
        none: { score: 0.75, reason: "works without pressure" },
        moderate: { score: 1.0, reason: "good under moderate pressure" },
        high: { score: 1.0, reason: "efficient under high pressure" },
      },
      "root-cause-analysis": {
        none: { score: 0.75, reason: "thorough when time allows" },
        moderate: { score: 1.0, reason: "efficient under moderate pressure" },
        high: { score: 1.0, reason: "focused under high pressure" },
      },
    };

    return rules[frameworkId]?.[timePressure] ?? { score: 0.5, reason: "" };
  }

  /**
   * Identify if hybrid framework approach is appropriate
   */
  private identifyHybridOpportunity(
    scores: FrameworkScore[],
    classification: ProblemClassification
  ): { isHybrid: boolean; count: number; reason: string } {
    const { count: closeScoreCount, hasClose } = this.hasCloseScores(scores, 0.15);
    const needsMultiplePerspectives = this.requiresMultiplePerspectives(classification);
    const needsBalancedApproach = this.requiresBalancedApproach(classification);

    const isHybrid = hasClose || needsMultiplePerspectives || needsBalancedApproach;
    const reason = this.buildHybridReason(
      classification,
      closeScoreCount,
      needsMultiplePerspectives,
      needsBalancedApproach
    );

    return {
      isHybrid,
      count: Math.min(3, Math.max(2, closeScoreCount)),
      reason: isHybrid ? `Hybrid approach: ${reason}` : "",
    };
  }

  /**
   * Check if top frameworks have close scores
   */
  private hasCloseScores(
    scores: FrameworkScore[],
    threshold: number
  ): { count: number; hasClose: boolean } {
    const topScores = scores.slice(0, 3);
    const highestScore = topScores[0].score;

    let count = 1; // Always include the top framework
    for (let i = 1; i < topScores.length; i++) {
      if (highestScore - topScores[i].score <= threshold) {
        count++;
      }
    }

    return { count, hasClose: count >= 2 };
  }

  /**
   * Check if problem requires multiple perspectives
   */
  private requiresMultiplePerspectives(classification: ProblemClassification): boolean {
    return classification.complexity === "complex" && classification.uncertainty === "high";
  }

  /**
   * Check if problem requires balanced approach
   */
  private requiresBalancedApproach(classification: ProblemClassification): boolean {
    return classification.stakes === "critical" && classification.timePressure === "high";
  }

  /**
   * Build reason string for hybrid approach
   */
  private buildHybridReason(
    classification: ProblemClassification,
    closeScoreCount: number,
    needsMultiplePerspectives: boolean,
    needsBalancedApproach: boolean
  ): string {
    const reasons: string[] = [];

    if (needsMultiplePerspectives) {
      reasons.push("high complexity and high uncertainty require multiple perspectives");
    }

    if (needsBalancedApproach) {
      reasons.push("critical stakes and time pressure require balanced approach");
    }

    if (!needsBalancedApproach) {
      this.addStakesAndTimePressureReasons(classification, reasons);
    }

    if (closeScoreCount >= 2 && reasons.length === 0) {
      reasons.push(`${closeScoreCount} frameworks have similar scores`);
    }

    if (reasons.length === 0) {
      reasons.push("multiple frameworks are suitable");
    }

    return reasons.join("; ");
  }

  /**
   * Add stakes and time pressure reasons
   */
  private addStakesAndTimePressureReasons(
    classification: ProblemClassification,
    reasons: string[]
  ): void {
    const isCriticalOrImportantWithPressure =
      classification.stakes === "critical" ||
      (classification.stakes === "important" && classification.timePressure === "high");

    if (isCriticalOrImportantWithPressure) {
      reasons.push("critical stakes and time pressure require balanced approach");
    } else if (classification.stakes === "important") {
      reasons.push("important stakes require careful consideration");
    }

    const shouldAddTimePressure =
      classification.timePressure === "high" &&
      classification.stakes !== "important" &&
      classification.stakes !== "critical";

    if (shouldAddTimePressure) {
      reasons.push("high time pressure requires efficient approach");
    }
  }

  /**
   * Create hybrid framework selection
   */
  private createHybridSelection(
    scores: FrameworkScore[],
    hybridInfo: { isHybrid: boolean; count: number; reason: string },
    _classification: ProblemClassification,
    selectionId?: string
  ): FrameworkSelection {
    // Select top N frameworks for hybrid (2-3)
    const hybridFrameworks = scores.slice(0, hybridInfo.count).map((s) => s.framework);

    // Calculate hybrid confidence (average of component scores)
    const avgScore =
      scores.slice(0, hybridInfo.count).reduce((sum, s) => sum + s.score, 0) / hybridInfo.count;

    // Primary framework is still the highest scoring one
    const primaryFramework = scores[0].framework;

    // Alternatives are the remaining frameworks
    const alternatives: FrameworkAlternative[] = scores.slice(hybridInfo.count).map((s) => ({
      framework: s.framework,
      confidence: s.score,
      reason: s.reason,
    }));

    return {
      primaryFramework,
      alternatives,
      confidence: avgScore,
      reason: hybridInfo.reason,
      isHybrid: true,
      hybridFrameworks,
      timestamp: new Date(),
      selectionId,
    };
  }

  /**
   * Create single framework selection
   */
  private createSingleSelection(
    scores: FrameworkScore[],
    _classification: ProblemClassification,
    selectionId?: string
  ): FrameworkSelection {
    const primaryFramework = scores[0].framework;

    // Alternatives are the remaining frameworks
    const alternatives: FrameworkAlternative[] = scores.slice(1).map((s) => ({
      framework: s.framework,
      confidence: s.score,
      reason: s.reason,
    }));

    return {
      primaryFramework,
      alternatives,
      confidence: scores[0].score,
      reason: `Selected ${primaryFramework.name}: ${scores[0].reason}`,
      isHybrid: false,
      timestamp: new Date(),
      selectionId,
    };
  }
}
