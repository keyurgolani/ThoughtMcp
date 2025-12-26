/**
 * Framework Learning System
 *
 * Tracks framework selection outcomes and improves selection accuracy over time
 * through feedback integration and adaptive selection. Target: 5%+ accuracy
 * improvement over 100 selections.
 */

import type {
  ComplexityLevel,
  DomainPattern,
  LearningMetrics,
  ScoringWeights,
  SelectionOutcome,
  StakesLevel,
  TimePressureLevel,
  UncertaintyLevel,
  UserFeedback,
} from "./types.js";

/**
 * Framework Learning System
 *
 * Implements learning mechanisms to improve framework selection accuracy:
 * - Tracks selection outcomes and user feedback
 * - Learns user preferences and domain patterns
 * - Adapts scoring weights based on historical performance
 * - Provides personalized framework recommendations
 */
export class FrameworkLearningSystem {
  private outcomes: Map<string, SelectionOutcome> = new Map();
  private feedback: Map<string, UserFeedback[]> = new Map();
  private domainPatterns: Map<string, DomainPattern> = new Map();
  private userPreferences: Map<string, Map<string, number>> = new Map();
  private adaptiveWeights: Map<string, ScoringWeights> = new Map();
  private metrics: LearningMetrics;
  private metricHistory: Array<{ timestamp: Date; metrics: LearningMetrics }> = [];

  constructor() {
    this.metrics = {
      totalSelections: 0,
      successfulSelections: 0,
      averageUserSatisfaction: 0,
      accuracyRate: 0,
      improvementRate: 0,
      lastUpdated: new Date(),
      domainMetrics: {},
    };
  }

  /**
   * Record a framework selection outcome
   */
  recordOutcome(outcome: SelectionOutcome): void {
    // Validate outcome data
    if (!outcome.selectionId || !outcome.frameworkId) {
      throw new Error("Invalid outcome: selectionId and frameworkId are required");
    }

    if (outcome.userSatisfaction < 0 || outcome.userSatisfaction > 1) {
      throw new Error("Invalid outcome: userSatisfaction must be between 0 and 1");
    }

    // Store outcome
    this.outcomes.set(outcome.selectionId, outcome);

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Record multiple outcomes in batch
   */
  recordOutcomes(outcomes: SelectionOutcome[]): void {
    for (const outcome of outcomes) {
      this.outcomes.set(outcome.selectionId, outcome);
    }
    this.updateMetrics();
  }

  /**
   * Record user feedback for a selection
   */
  recordFeedback(feedback: UserFeedback): void {
    // Validate feedback
    if (!feedback.feedbackId || !feedback.selectionId) {
      throw new Error("Invalid feedback: feedbackId and selectionId are required");
    }

    if (feedback.rating < 1 || feedback.rating > 5) {
      throw new Error("Invalid feedback: rating must be between 1 and 5");
    }

    // Check if selection exists
    if (!this.outcomes.has(feedback.selectionId)) {
      throw new Error(`Selection ${feedback.selectionId} not found`);
    }

    // Store feedback
    const existingFeedback = this.feedback.get(feedback.selectionId) ?? [];
    existingFeedback.push(feedback);
    this.feedback.set(feedback.selectionId, existingFeedback);

    // Update metrics
    this.updateMetrics();

    // Update user preferences
    this.updateUserPreferences(feedback);
  }

  /**
   * Get current learning metrics
   */
  getMetrics(): LearningMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metric history over time
   */
  getMetricHistory(): Array<{ timestamp: Date; metrics: LearningMetrics }> {
    return [...this.metricHistory];
  }

  /**
   * Get adaptive scoring weights for a domain
   */
  getAdaptiveWeights(domain?: string): ScoringWeights {
    // Return domain-specific weights if available
    if (domain) {
      const domainWeights = this.adaptiveWeights.get(domain);
      if (domainWeights) {
        return { ...domainWeights };
      }
    }

    // Return global adaptive weights if available
    const globalWeights = this.adaptiveWeights.get("global");
    if (globalWeights) {
      return { ...globalWeights };
    }

    // Return default weights
    return {
      complexity: 0.3,
      uncertainty: 0.3,
      stakes: 0.25,
      timePressure: 0.15,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get domain pattern for a specific domain
   */
  getDomainPattern(domain: string): DomainPattern | undefined {
    const pattern = this.domainPatterns.get(domain);
    return pattern ? { ...pattern } : undefined;
  }

  /**
   * Get all domain patterns
   */
  getAllDomainPatterns(): DomainPattern[] {
    return Array.from(this.domainPatterns.values()).map((pattern) => ({ ...pattern }));
  }

  /**
   * Get user preferences for frameworks
   */
  getUserPreferences(userId: string): Map<string, number> {
    return new Map(this.userPreferences.get(userId) ?? new Map());
  }

  /**
   * Reset user preferences
   */
  resetUserPreferences(userId: string): void {
    this.userPreferences.delete(userId);
  }

  /**
   * Calculate baseline accuracy rate
   */
  calculateBaselineAccuracy(): number {
    if (this.outcomes.size === 0) {
      return 0;
    }

    const successfulCount = Array.from(this.outcomes.values()).filter(
      (outcome) => outcome.wasSuccessful
    ).length;

    return successfulCount / this.outcomes.size;
  }

  /**
   * Calculate improvement rate over time
   */
  calculateImprovementRate(): number {
    if (this.metricHistory.length < 2) {
      return 0;
    }

    const oldest = this.metricHistory[0];
    const newest = this.metricHistory[this.metricHistory.length - 1];

    const accuracyChange = newest.metrics.accuracyRate - oldest.metrics.accuracyRate;
    const timeSpan = newest.timestamp.getTime() - oldest.timestamp.getTime();
    const daysSpan = timeSpan / (1000 * 60 * 60 * 24);

    // Return improvement rate per 100 selections
    if (daysSpan === 0) {
      return 0;
    }

    return (accuracyChange / daysSpan) * 100;
  }

  /**
   * Update learning metrics based on current outcomes and feedback
   */
  private updateMetrics(): void {
    const outcomes = Array.from(this.outcomes.values());

    if (outcomes.length === 0) {
      return;
    }

    // Calculate basic metrics
    const totalSelections = outcomes.length;
    const successfulSelections = outcomes.filter((o) => o.wasSuccessful).length;
    const accuracyRate = successfulSelections / totalSelections;

    // Calculate average user satisfaction
    const totalSatisfaction = outcomes.reduce((sum, o) => sum + o.userSatisfaction, 0);
    const averageUserSatisfaction = totalSatisfaction / totalSelections;

    // Calculate improvement rate
    const improvementRate = this.calculateImprovementRate();

    // Calculate domain-specific metrics
    const domainMetrics: Record<string, { accuracy: number; count: number }> = {};
    const domainGroups = this.groupOutcomesByDomain(outcomes);

    for (const [domain, domainOutcomes] of domainGroups.entries()) {
      const domainSuccessful = domainOutcomes.filter((o) => o.wasSuccessful).length;
      domainMetrics[domain] = {
        accuracy: domainSuccessful / domainOutcomes.length,
        count: domainOutcomes.length,
      };
    }

    // Update metrics
    this.metrics = {
      totalSelections,
      successfulSelections,
      averageUserSatisfaction,
      accuracyRate,
      improvementRate,
      lastUpdated: new Date(),
      domainMetrics,
    };

    // Add to history
    this.metricHistory.push({
      timestamp: new Date(),
      metrics: { ...this.metrics },
    });

    // Update adaptive weights
    this.updateAdaptiveWeights();

    // Update domain patterns
    this.updateDomainPatterns();
  }

  /**
   * Update user preferences based on feedback
   */
  private updateUserPreferences(feedback: UserFeedback): void {
    const outcome = this.outcomes.get(feedback.selectionId);
    if (!outcome) {
      return;
    }

    // Use a default user ID if not provided
    const userId = "default";

    // Get or create user preferences
    let preferences = this.userPreferences.get(userId);
    if (!preferences) {
      preferences = new Map();
      this.userPreferences.set(userId, preferences);
    }

    // Update preference for the framework
    const currentPreference = preferences.get(outcome.frameworkId) ?? 0;
    const feedbackScore = (feedback.rating - 3) / 2; // Convert 1-5 to -1 to 1
    const newPreference = currentPreference * 0.8 + feedbackScore * 0.2; // Weighted average

    preferences.set(outcome.frameworkId, newPreference);

    // If user suggested a different framework, boost its preference
    if (feedback.suggestedFramework && feedback.suggestedFramework !== outcome.frameworkId) {
      const suggestedPreference = preferences.get(feedback.suggestedFramework) ?? 0;
      preferences.set(feedback.suggestedFramework, suggestedPreference + 0.1);
    }
  }

  /**
   * Update adaptive scoring weights based on outcomes
   */
  private updateAdaptiveWeights(): void {
    const outcomes = Array.from(this.outcomes.values());

    if (outcomes.length < 10) {
      // Not enough data for adaptation
      return;
    }

    // Calculate dimension-specific accuracy
    const dimensionAccuracy = this.calculateDimensionAccuracy(outcomes);

    // Adjust weights based on accuracy
    // Dimensions with lower accuracy get higher weights
    const totalInverseAccuracy =
      1 -
      dimensionAccuracy.complexity +
      (1 - dimensionAccuracy.uncertainty) +
      (1 - dimensionAccuracy.stakes) +
      (1 - dimensionAccuracy.timePressure);

    if (totalInverseAccuracy === 0) {
      return;
    }

    const globalWeights: ScoringWeights = {
      complexity: (1 - dimensionAccuracy.complexity) / totalInverseAccuracy,
      uncertainty: (1 - dimensionAccuracy.uncertainty) / totalInverseAccuracy,
      stakes: (1 - dimensionAccuracy.stakes) / totalInverseAccuracy,
      timePressure: (1 - dimensionAccuracy.timePressure) / totalInverseAccuracy,
      lastUpdated: new Date(),
    };

    // Normalize weights to sum to 1
    const sum =
      globalWeights.complexity +
      globalWeights.uncertainty +
      globalWeights.stakes +
      globalWeights.timePressure;

    globalWeights.complexity /= sum;
    globalWeights.uncertainty /= sum;
    globalWeights.stakes /= sum;
    globalWeights.timePressure /= sum;

    this.adaptiveWeights.set("global", globalWeights);

    // Calculate domain-specific weights
    const domainGroups = this.groupOutcomesByDomain(outcomes);
    for (const [domain, domainOutcomes] of domainGroups.entries()) {
      if (domainOutcomes.length >= 5) {
        const domainDimensionAccuracy = this.calculateDimensionAccuracy(domainOutcomes);
        const domainTotalInverse =
          1 -
          domainDimensionAccuracy.complexity +
          (1 - domainDimensionAccuracy.uncertainty) +
          (1 - domainDimensionAccuracy.stakes) +
          (1 - domainDimensionAccuracy.timePressure);

        if (domainTotalInverse > 0) {
          const domainWeights: ScoringWeights = {
            complexity: (1 - domainDimensionAccuracy.complexity) / domainTotalInverse,
            uncertainty: (1 - domainDimensionAccuracy.uncertainty) / domainTotalInverse,
            stakes: (1 - domainDimensionAccuracy.stakes) / domainTotalInverse,
            timePressure: (1 - domainDimensionAccuracy.timePressure) / domainTotalInverse,
            domain,
            lastUpdated: new Date(),
          };

          // Normalize
          const domainSum =
            domainWeights.complexity +
            domainWeights.uncertainty +
            domainWeights.stakes +
            domainWeights.timePressure;

          domainWeights.complexity /= domainSum;
          domainWeights.uncertainty /= domainSum;
          domainWeights.stakes /= domainSum;
          domainWeights.timePressure /= domainSum;

          this.adaptiveWeights.set(domain, domainWeights);
        }
      }
    }
  }

  /**
   * Calculate accuracy for each dimension
   */
  private calculateDimensionAccuracy(outcomes: SelectionOutcome[]): {
    complexity: number;
    uncertainty: number;
    stakes: number;
    timePressure: number;
  } {
    // Group outcomes by dimension values
    const complexityGroups = new Map<ComplexityLevel, SelectionOutcome[]>();
    const uncertaintyGroups = new Map<UncertaintyLevel, SelectionOutcome[]>();
    const stakesGroups = new Map<StakesLevel, SelectionOutcome[]>();
    const timePressureGroups = new Map<TimePressureLevel, SelectionOutcome[]>();

    for (const outcome of outcomes) {
      const { complexity, uncertainty, stakes, timePressure } = outcome.problemClassification;

      let complexityGroup = complexityGroups.get(complexity);
      if (!complexityGroup) {
        complexityGroup = [];
        complexityGroups.set(complexity, complexityGroup);
      }
      complexityGroup.push(outcome);

      let uncertaintyGroup = uncertaintyGroups.get(uncertainty);
      if (!uncertaintyGroup) {
        uncertaintyGroup = [];
        uncertaintyGroups.set(uncertainty, uncertaintyGroup);
      }
      uncertaintyGroup.push(outcome);

      let stakesGroup = stakesGroups.get(stakes);
      if (!stakesGroup) {
        stakesGroup = [];
        stakesGroups.set(stakes, stakesGroup);
      }
      stakesGroup.push(outcome);

      let timePressureGroup = timePressureGroups.get(timePressure);
      if (!timePressureGroup) {
        timePressureGroup = [];
        timePressureGroups.set(timePressure, timePressureGroup);
      }
      timePressureGroup.push(outcome);
    }

    // Calculate accuracy for each dimension
    const calculateGroupAccuracy = (groups: Map<string, SelectionOutcome[]>): number => {
      let totalAccuracy = 0;
      let groupCount = 0;

      for (const groupOutcomes of groups.values()) {
        const successful = groupOutcomes.filter((o) => o.wasSuccessful).length;
        totalAccuracy += successful / groupOutcomes.length;
        groupCount++;
      }

      return groupCount > 0 ? totalAccuracy / groupCount : 0.5;
    };

    return {
      complexity: calculateGroupAccuracy(complexityGroups as Map<string, SelectionOutcome[]>),
      uncertainty: calculateGroupAccuracy(uncertaintyGroups as Map<string, SelectionOutcome[]>),
      stakes: calculateGroupAccuracy(stakesGroups as Map<string, SelectionOutcome[]>),
      timePressure: calculateGroupAccuracy(timePressureGroups as Map<string, SelectionOutcome[]>),
    };
  }

  /**
   * Update domain patterns based on outcomes
   */
  private updateDomainPatterns(): void {
    const outcomes = Array.from(this.outcomes.values());
    const domainGroups = this.groupOutcomesByDomain(outcomes);

    for (const [domain, domainOutcomes] of domainGroups.entries()) {
      if (domainOutcomes.length < 3) {
        // Not enough data for pattern
        continue;
      }

      // Calculate characteristic classification for domain
      const characteristics = this.calculateDomainCharacteristics(domainOutcomes);

      // Find preferred frameworks
      const frameworkSuccess = new Map<string, { success: number; total: number }>();
      for (const outcome of domainOutcomes) {
        const stats = frameworkSuccess.get(outcome.frameworkId) ?? { success: 0, total: 0 };
        stats.total++;
        if (outcome.wasSuccessful) {
          stats.success++;
        }
        frameworkSuccess.set(outcome.frameworkId, stats);
      }

      // Sort frameworks by success rate
      const preferredFrameworks = Array.from(frameworkSuccess.entries())
        .map(([frameworkId, stats]) => ({
          frameworkId,
          successRate: stats.success / stats.total,
        }))
        .sort((a, b) => b.successRate - a.successRate)
        .map((f) => f.frameworkId);

      // Calculate overall success rate
      const successfulCount = domainOutcomes.filter((o) => o.wasSuccessful).length;
      const successRate = successfulCount / domainOutcomes.length;

      // Create or update pattern
      const pattern: DomainPattern = {
        domain,
        characteristics,
        preferredFrameworks,
        successRate,
        sampleSize: domainOutcomes.length,
        lastUpdated: new Date(),
      };

      this.domainPatterns.set(domain, pattern);
    }
  }

  /**
   * Group outcomes by domain
   */
  private groupOutcomesByDomain(outcomes: SelectionOutcome[]): Map<string, SelectionOutcome[]> {
    const groups = new Map<string, SelectionOutcome[]>();

    for (const outcome of outcomes) {
      // Derive domain from problem classification
      const domain = this.deriveDomain(outcome.problemClassification);

      let domainGroup = groups.get(domain);
      if (!domainGroup) {
        domainGroup = [];
        groups.set(domain, domainGroup);
      }
      domainGroup.push(outcome);
    }

    return groups;
  }

  /**
   * Derive domain identifier from problem classification
   */
  private deriveDomain(classification: {
    complexity: ComplexityLevel;
    uncertainty: UncertaintyLevel;
    stakes: StakesLevel;
    timePressure: TimePressureLevel;
  }): string {
    return `${classification.complexity}-${classification.uncertainty}-${classification.stakes}-${classification.timePressure}`;
  }

  /**
   * Calculate characteristic classification for a domain
   */
  private calculateDomainCharacteristics(outcomes: SelectionOutcome[]): {
    complexity: ComplexityLevel;
    uncertainty: UncertaintyLevel;
    stakes: StakesLevel;
    timePressure: TimePressureLevel;
  } {
    // Find most common value for each dimension
    const complexityCounts = new Map<ComplexityLevel, number>();
    const uncertaintyCounts = new Map<UncertaintyLevel, number>();
    const stakesCounts = new Map<StakesLevel, number>();
    const timePressureCounts = new Map<TimePressureLevel, number>();

    for (const outcome of outcomes) {
      const { complexity, uncertainty, stakes, timePressure } = outcome.problemClassification;

      complexityCounts.set(complexity, (complexityCounts.get(complexity) ?? 0) + 1);
      uncertaintyCounts.set(uncertainty, (uncertaintyCounts.get(uncertainty) ?? 0) + 1);
      stakesCounts.set(stakes, (stakesCounts.get(stakes) ?? 0) + 1);
      timePressureCounts.set(timePressure, (timePressureCounts.get(timePressure) ?? 0) + 1);
    }

    const getMostCommon = <T>(counts: Map<T, number>, defaultValue: T): T => {
      let maxCount = 0;
      let mostCommon: T = defaultValue;

      for (const [value, count] of counts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mostCommon = value;
        }
      }

      return mostCommon;
    };

    return {
      complexity: getMostCommon(complexityCounts, "moderate"),
      uncertainty: getMostCommon(uncertaintyCounts, "medium"),
      stakes: getMostCommon(stakesCounts, "important"),
      timePressure: getMostCommon(timePressureCounts, "moderate"),
    };
  }
}
