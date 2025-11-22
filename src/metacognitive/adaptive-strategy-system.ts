/**
 * Adaptive Strategy System
 *
 * Learns from success/failure patterns and continuously improves
 * strategy selection effectiveness through pattern identification,
 * effectiveness measurement, and adaptive rule adjustment.
 */

import type {
  Context,
  FailurePattern,
  Feedback,
  ImprovementMetrics,
  Outcome,
  Pattern,
  Performance,
  Strategy,
  StrategyComparison,
  StrategyExecution,
  StrategyLearningEngine,
  StrategyRanking,
  StrategyRule,
  SuccessPattern,
} from "./types";

/**
 * Simple strategy learning engine implementation
 */
class SimpleStrategyLearningEngine implements StrategyLearningEngine {
  private executionHistory: StrategyExecution[] = [];
  private strategyScores: Map<string, number> = new Map();

  learn(history: StrategyExecution[]): void {
    this.executionHistory.push(...history);

    // Update strategy scores based on outcomes
    for (const execution of history) {
      const currentScore = this.strategyScores.get(execution.strategyId) ?? 0.5;
      const outcomeScore = execution.outcome.success ? execution.outcome.quality : 0;
      const newScore = currentScore * 0.9 + outcomeScore * 0.1; // Exponential moving average
      this.strategyScores.set(execution.strategyId, newScore);
    }
  }

  recommend(_context: Context): string {
    // Find best strategy based on learned scores
    let bestStrategy = "default";
    let bestScore = 0;

    for (const [strategyId, score] of this.strategyScores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategyId;
      }
    }

    return bestStrategy;
  }

  updateFromFeedback(feedback: Feedback[]): void {
    for (const fb of feedback) {
      const currentScore = this.strategyScores.get(fb.strategyId) ?? 0.5;
      const newScore = currentScore * 0.9 + fb.rating * 0.1;
      this.strategyScores.set(fb.strategyId, newScore);
    }
  }

  getStrategyScore(strategyId: string): number {
    return this.strategyScores.get(strategyId) ?? 0.5;
  }
}

/**
 * Adaptive Strategy System
 *
 * Identifies patterns in strategy execution, measures effectiveness,
 * adapts selection rules, and tracks improvement over time.
 */
export class AdaptiveStrategySystem {
  private readonly learningEngine: StrategyLearningEngine;
  private readonly strategyRules: Map<string, StrategyRule[]> = new Map();
  private readonly executionHistory: StrategyExecution[] = [];

  constructor() {
    this.learningEngine = new SimpleStrategyLearningEngine();
  }

  /**
   * Identify success patterns from execution history
   *
   * Analyzes execution history to find patterns where strategies
   * consistently succeed in specific contexts.
   *
   * @param history - Strategy execution history
   * @returns Array of identified success patterns
   */
  identifySuccessPatterns(history: StrategyExecution[]): SuccessPattern[] {
    if (history.length === 0) {
      return [];
    }

    // Filter successful executions
    const successes = history.filter((exec) => exec.outcome.success);

    if (successes.length === 0) {
      return [];
    }

    // Group by strategy and context
    const patternMap = new Map<string, StrategyExecution[]>();

    for (const execution of successes) {
      const contextKey = this.serializeContext(execution.context);
      const key = `${execution.strategyId}:${contextKey}`;

      if (!patternMap.has(key)) {
        patternMap.set(key, []);
      }
      patternMap.get(key)!.push(execution);
    }

    // Extract patterns with sufficient support
    const patterns: SuccessPattern[] = [];

    for (const [key, executions] of patternMap.entries()) {
      if (executions.length < 2) {
        continue; // Need at least 2 occurrences for a pattern
      }

      const [strategyId, ...contextParts] = key.split(":");
      const contextKey = contextParts.join(":");
      const contextFactors = contextKey.split(",").filter((f) => f.length > 0);

      // Calculate success rate and confidence
      const totalForStrategy = history.filter((e) => e.strategyId === strategyId).length;
      const successRate = executions.length / Math.max(totalForStrategy, 1);
      const confidence = Math.min(executions.length / 10, 1.0); // More samples = higher confidence

      patterns.push({
        strategyId,
        contextFactors,
        confidence,
        successRate,
        sampleSize: executions.length,
      });
    }

    // Sort by confidence and success rate
    patterns.sort((a, b) => {
      const scoreA = a.confidence * a.successRate;
      const scoreB = b.confidence * b.successRate;
      return scoreB - scoreA;
    });

    return patterns;
  }

  /**
   * Identify failure patterns from execution history
   *
   * Analyzes execution history to find anti-patterns where strategies
   * consistently fail in specific contexts.
   *
   * @param history - Strategy execution history
   * @returns Array of identified failure patterns
   */
  identifyFailurePatterns(history: StrategyExecution[]): FailurePattern[] {
    if (history.length === 0) {
      return [];
    }

    // Filter failed executions
    const failures = history.filter((exec) => !exec.outcome.success);

    if (failures.length === 0) {
      return [];
    }

    // Group by strategy and context
    const patternMap = new Map<string, StrategyExecution[]>();

    for (const execution of failures) {
      const contextKey = this.serializeContext(execution.context);
      const key = `${execution.strategyId}:${contextKey}`;

      if (!patternMap.has(key)) {
        patternMap.set(key, []);
      }
      patternMap.get(key)!.push(execution);
    }

    // Extract patterns with sufficient support
    const patterns: FailurePattern[] = [];

    for (const [key, executions] of patternMap.entries()) {
      if (executions.length < 2) {
        continue; // Need at least 2 occurrences for a pattern
      }

      const [strategyId, ...contextParts] = key.split(":");
      const contextKey = contextParts.join(":");
      const contextFactors = contextKey.split(",").filter((f) => f.length > 0);

      // Calculate failure rate and confidence
      const totalForStrategy = history.filter((e) => e.strategyId === strategyId).length;
      const failureRate = executions.length / Math.max(totalForStrategy, 1);
      const confidence = Math.min(executions.length / 10, 1.0);

      patterns.push({
        strategyId,
        contextFactors,
        confidence,
        failureRate,
        sampleSize: executions.length,
      });
    }

    // Sort by confidence and failure rate
    patterns.sort((a, b) => {
      const scoreA = a.confidence * a.failureRate;
      const scoreB = b.confidence * b.failureRate;
      return scoreB - scoreA;
    });

    return patterns;
  }

  /**
   * Measure strategy effectiveness
   *
   * Calculates effectiveness score for a strategy based on outcomes,
   * weighted by outcome quality.
   *
   * @param strategy - Strategy to measure
   * @param outcomes - Outcomes from strategy executions
   * @returns Effectiveness score (0-1)
   */
  measureStrategyEffectiveness(_strategy: Strategy, outcomes: Outcome[]): number {
    if (outcomes.length === 0) {
      return 0;
    }

    // Calculate weighted average of outcome quality
    let totalWeight = 0;
    let weightedSum = 0;

    for (const outcome of outcomes) {
      const weight = outcome.success ? 1.0 : 0.5; // Successes weighted more
      weightedSum += outcome.quality * weight;
      totalWeight += weight;
    }

    const effectiveness = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, effectiveness));
  }

  /**
   * Compare strategies in a given context
   *
   * Ranks strategies by their expected effectiveness in the
   * specified context based on historical performance.
   *
   * @param strategies - Strategies to compare
   * @param context - Context for comparison
   * @returns Strategy comparison with rankings
   */
  compareStrategies(strategies: Strategy[], context: Context): StrategyComparison {
    const rankings: StrategyRanking[] = [];

    for (const strategy of strategies) {
      // Get historical outcomes for this strategy in similar contexts
      const relevantExecutions = this.executionHistory.filter(
        (exec) =>
          exec.strategyId === strategy.id && this.contextSimilarity(exec.context, context) > 0.5
      );

      const outcomes = relevantExecutions.map((exec) => exec.outcome);
      const score = this.measureStrategyEffectiveness(strategy, outcomes);

      // Confidence based on sample size
      const confidence = Math.min(relevantExecutions.length / 10, 1.0);

      rankings.push({
        strategyId: strategy.id,
        score,
        confidence,
      });
    }

    // Sort by score (descending)
    rankings.sort((a, b) => b.score - a.score);

    return {
      context,
      rankings,
      timestamp: new Date(),
    };
  }

  /**
   * Adjust strategy rules based on patterns
   *
   * Updates strategy selection rules based on identified success
   * and failure patterns to improve future selections.
   *
   * @param patterns - Patterns to incorporate into rules
   */
  adjustStrategyRules(patterns: Pattern[]): void {
    for (const pattern of patterns) {
      // Validate pattern
      if (!pattern.strategyId || pattern.confidence < 0 || pattern.confidence > 1) {
        continue;
      }

      // Get or create rules for this strategy
      if (!this.strategyRules.has(pattern.strategyId)) {
        this.strategyRules.set(pattern.strategyId, []);
      }

      const rules = this.strategyRules.get(pattern.strategyId)!;

      // Create conditions from context factors
      const conditions: Record<string, unknown> = {};
      for (const factor of pattern.contextFactors) {
        const [key, value] = factor.split(":");
        if (key && value) {
          conditions[key] = value;
        }
      }

      // Check if rule already exists
      const existingRuleIndex = rules.findIndex((rule) =>
        this.conditionsMatch(rule.conditions, conditions)
      );

      if (existingRuleIndex >= 0) {
        // Update existing rule
        const existingRule = rules[existingRuleIndex];
        existingRule.weight = existingRule.weight * 0.8 + pattern.confidence * 0.2;
        existingRule.confidence = pattern.confidence;
      } else {
        // Add new rule
        const newRule: StrategyRule = {
          id: `rule-${Date.now()}-${Math.random()}`,
          conditions,
          weight: pattern.confidence,
          confidence: pattern.confidence,
        };
        rules.push(newRule);
      }
    }
  }

  /**
   * Update strategy selection based on feedback
   *
   * Incorporates user feedback to refine strategy selection
   * and improve future recommendations.
   *
   * @param feedback - User feedback on strategy executions
   */
  updateStrategySelection(feedback: Feedback[]): void {
    // Update learning engine with feedback
    this.learningEngine.updateFromFeedback(feedback);

    // Adjust rules based on feedback patterns
    const feedbackPatterns: Pattern[] = [];

    // Group feedback by strategy and context
    const feedbackMap = new Map<string, Feedback[]>();

    for (const fb of feedback) {
      const contextKey = this.serializeContext(fb.context);
      const key = `${fb.strategyId}:${contextKey}`;

      if (!feedbackMap.has(key)) {
        feedbackMap.set(key, []);
      }
      feedbackMap.get(key)!.push(fb);
    }

    // Create patterns from feedback
    for (const [key, feedbackItems] of feedbackMap.entries()) {
      if (feedbackItems.length < 2) {
        continue;
      }

      const [strategyId, ...contextParts] = key.split(":");
      const contextKey = contextParts.join(":");
      const contextFactors = contextKey.split(",").filter((f) => f.length > 0);

      const averageRating =
        feedbackItems.reduce((sum, fb) => sum + fb.rating, 0) / feedbackItems.length;
      const confidence = Math.min(feedbackItems.length / 10, 1.0);

      feedbackPatterns.push({
        strategyId,
        contextFactors,
        confidence: confidence * averageRating, // Weight by rating
        sampleSize: feedbackItems.length,
      });
    }

    // Adjust rules based on feedback patterns
    this.adjustStrategyRules(feedbackPatterns);
  }

  /**
   * Demonstrate improvement over time
   *
   * Calculates improvement metrics by comparing baseline and
   * current performance across multiple dimensions.
   *
   * @param baseline - Baseline performance metrics
   * @param current - Current performance metrics
   * @returns Improvement metrics
   */
  demonstrateImprovement(baseline: Performance, current: Performance): ImprovementMetrics {
    // Calculate improvement percentages
    const successRateImprovement =
      baseline.successRate > 0
        ? (current.successRate - baseline.successRate) / baseline.successRate
        : 0;

    const qualityImprovement =
      baseline.averageQuality > 0
        ? (current.averageQuality - baseline.averageQuality) / baseline.averageQuality
        : 0;

    const timeImprovement =
      baseline.averageTime > 0
        ? (baseline.averageTime - current.averageTime) / baseline.averageTime
        : 0;

    // Determine overall trend
    let trend: "improving" | "stable" | "declining";
    const overallImprovement = (successRateImprovement + qualityImprovement + timeImprovement) / 3;

    if (overallImprovement > 0.02) {
      trend = "improving";
    } else if (overallImprovement < -0.02) {
      trend = "declining";
    } else {
      trend = "stable";
    }

    // Calculate time period
    const periodMs = current.timestamp.getTime() - baseline.timestamp.getTime();
    const periodDays = Math.max(1, Math.floor(periodMs / (1000 * 60 * 60 * 24)));

    // Calculate confidence based on sample size and time period
    const confidence = Math.min(periodDays / 30, 1.0); // More days = higher confidence

    return {
      successRateImprovement,
      qualityImprovement,
      timeImprovement,
      trend,
      periodDays,
      confidence,
    };
  }

  /**
   * Serialize context to string key
   *
   * @param context - Context to serialize
   * @returns String representation of context
   */
  private serializeContext(context: Context): string {
    const factors: string[] = [];

    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null) {
        factors.push(`${key}:${value}`);
      }
    }

    return factors.sort().join(",");
  }

  /**
   * Calculate context similarity
   *
   * @param context1 - First context
   * @param context2 - Second context
   * @returns Similarity score (0-1)
   */
  private contextSimilarity(context1: Context, context2: Context): number {
    const keys1 = new Set(Object.keys(context1));
    const keys2 = new Set(Object.keys(context2));

    // Calculate Jaccard similarity
    const intersection = new Set([...keys1].filter((k) => keys2.has(k)));
    const union = new Set([...keys1, ...keys2]);

    if (union.size === 0) {
      return 1.0; // Both empty = identical
    }

    let matchingValues = 0;
    for (const key of intersection) {
      if (context1[key] === context2[key]) {
        matchingValues++;
      }
    }

    return matchingValues / union.size;
  }

  /**
   * Check if conditions match
   *
   * @param conditions1 - First set of conditions
   * @param conditions2 - Second set of conditions
   * @returns True if conditions match
   */
  private conditionsMatch(
    conditions1: Record<string, unknown>,
    conditions2: Record<string, unknown>
  ): boolean {
    const keys1 = Object.keys(conditions1);
    const keys2 = Object.keys(conditions2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (conditions1[key] !== conditions2[key]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record strategy execution for learning
   *
   * @param execution - Strategy execution to record
   */
  recordExecution(execution: StrategyExecution): void {
    this.executionHistory.push(execution);
    this.learningEngine.learn([execution]);
  }

  /**
   * Get execution history
   *
   * @returns Array of recorded executions
   */
  getExecutionHistory(): StrategyExecution[] {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory.length = 0;
  }
}
