/**
 * BiasLearningSystem - Improves bias detection through learning
 *
 * Implements a learning system that:
 * - Integrates user feedback on bias detections
 * - Adapts pattern recognition based on accuracy
 * - Personalizes sensitivity thresholds per user
 * - Tracks detection accuracy improvement over time
 *
 * Performance target: <10ms feedback integration
 */

import {
  BiasType,
  type AccuracyMetrics,
  type BiasFeedback,
  type BiasPattern,
  type LearningMetrics,
  type TimePeriod,
  type UserSensitivityProfile,
} from "./types";

/**
 * BiasLearningSystem class
 *
 * Main class for learning from feedback and improving bias detection.
 */
export class BiasLearningSystem {
  private feedbackHistory: BiasFeedback[] = [];
  private userProfiles: Map<string, UserSensitivityProfile> = new Map();
  private patternWeights: Map<BiasType, number> = new Map();
  private baselineAccuracy: Map<BiasType, AccuracyMetrics> | null = null;

  constructor() {
    // Initialize default pattern weights
    for (const biasType of Object.values(BiasType)) {
      this.patternWeights.set(biasType, 1.0);
    }
  }

  /**
   * Integrate user feedback on a bias detection
   *
   * Records feedback and updates learning models.
   * Performance target: <10ms
   *
   * @param feedback - User feedback on a detection
   */
  integrateFeedback(feedback: BiasFeedback): void {
    // Validate feedback
    if (!feedback.detectedBias || typeof feedback.correct !== "boolean") {
      throw new Error("Invalid feedback: missing required fields");
    }

    // Store feedback
    this.feedbackHistory.push(feedback);

    // Update pattern weights based on feedback
    const biasType = feedback.detectedBias.type;
    const currentWeight = this.patternWeights.get(biasType) ?? 1.0;

    // Exponential moving average: adjust weight based on correctness
    const learningRate = 0.1;
    const adjustment = feedback.correct ? learningRate : -learningRate;
    const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));
    this.patternWeights.set(biasType, newWeight);

    // Update user sensitivity if needed
    this.updateUserSensitivity(feedback);
  }

  /**
   * Update pattern weights based on accuracy
   *
   * Adjusts detection sensitivity for a bias type based on measured accuracy.
   *
   * @param biasType - Type of bias to adjust
   * @param accuracy - Measured accuracy (0-1)
   */
  updatePatternWeights(biasType: BiasType, accuracy: number): void {
    if (accuracy < 0 || accuracy > 1) {
      throw new Error("Accuracy must be between 0 and 1");
    }

    const currentWeight = this.patternWeights.get(biasType) ?? 1.0;

    // Adjust weight based on accuracy
    // High accuracy (>0.8): increase weight slightly
    // Low accuracy (<0.6): decrease weight
    let adjustment = 0;
    if (accuracy > 0.8) {
      adjustment = 0.1;
    } else if (accuracy < 0.6) {
      adjustment = -0.15;
    }

    const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustment));
    this.patternWeights.set(biasType, newWeight);
  }

  /**
   * Adjust sensitivity for a specific user and bias type
   *
   * @param userId - User identifier
   * @param biasType - Type of bias
   * @param adjustment - Adjustment amount (-1 to +1)
   */
  adjustSensitivity(userId: string, biasType: BiasType, adjustment: number): void {
    // Get or create user profile
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        userId: userId,
        sensitivityByType: new Map(),
        lastUpdated: new Date(),
      };
      this.userProfiles.set(userId, profile);
    }

    // Get current sensitivity (default 0.5)
    const currentSensitivity = profile.sensitivityByType.get(biasType) ?? 0.5;

    // Apply adjustment with bounds [0, 1]
    const newSensitivity = Math.max(0, Math.min(1, currentSensitivity + adjustment));
    profile.sensitivityByType.set(biasType, newSensitivity);
    profile.lastUpdated = new Date();
  }

  /**
   * Learn new pattern from feedback data
   *
   * Analyzes feedback to discover new bias patterns.
   *
   * @param feedback - Array of feedback items
   * @returns Discovered pattern or null if none found
   */
  learnNewPattern(feedback: BiasFeedback[]): BiasPattern | null {
    if (feedback.length < 3) {
      return null; // Need minimum data
    }

    // Group feedback by bias type
    const byType = new Map<BiasType, BiasFeedback[]>();
    for (const item of feedback) {
      const type = item.detectedBias.type;
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      const typeArray = byType.get(type);
      if (typeArray) {
        typeArray.push(item);
      }
    }

    // Find patterns with consistent false negatives
    for (const [biasType, items] of byType) {
      const falseNegatives = items.filter((f) => !f.correct);
      if (falseNegatives.length >= 2) {
        // Discovered a pattern
        return {
          biasTypes: [biasType],
          frequency: falseNegatives.length,
          commonContexts: [],
          averageSeverity: 0.6,
        };
      }
    }

    return null;
  }

  /**
   * Prune ineffective patterns
   *
   * Removes patterns that consistently cause false positives.
   */
  pruneIneffectivePatterns(): void {
    // Analyze feedback for false positives
    const falsePositivesByType = new Map<BiasType, number>();

    for (const feedback of this.feedbackHistory) {
      if (!feedback.correct) {
        const type = feedback.detectedBias.type;
        falsePositivesByType.set(type, (falsePositivesByType.get(type) ?? 0) + 1);
      }
    }

    // Reduce weight for types with high false positive rate
    for (const [biasType, count] of falsePositivesByType) {
      const totalForType = this.feedbackHistory.filter(
        (f) => f.detectedBias.type === biasType
      ).length;
      const falsePositiveRate = count / totalForType;

      if (falsePositiveRate > 0.3) {
        // High false positive rate - reduce weight
        const currentWeight = this.patternWeights.get(biasType) ?? 1.0;
        this.patternWeights.set(biasType, Math.max(0.1, currentWeight * 0.8));
      }
    }
  }

  /**
   * Get accuracy metrics for a bias type or overall
   *
   * @param biasType - Optional bias type to filter by
   * @returns Accuracy metrics
   */
  getAccuracyMetrics(biasType?: BiasType): AccuracyMetrics {
    // Filter feedback by bias type if specified
    const relevantFeedback = biasType
      ? this.feedbackHistory.filter((f) => f.detectedBias.type === biasType)
      : this.feedbackHistory;

    if (relevantFeedback.length === 0) {
      return {
        truePositives: 0,
        falsePositives: 0,
        trueNegatives: 0,
        falseNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
      };
    }

    // Calculate metrics
    const truePositives = relevantFeedback.filter((f) => f.correct).length;
    const falsePositives = relevantFeedback.filter((f) => !f.correct).length;
    const trueNegatives = 0; // Not tracked in current implementation
    const falseNegatives = 0; // Not tracked in current implementation

    const precision =
      truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall =
      truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      precision,
      recall,
      f1Score,
    };
  }

  /**
   * Get improvement rate over a time period
   *
   * @param period - Time period to measure
   * @returns Improvement rate (0-1)
   */
  getImprovementRate(period: TimePeriod): number {
    if (this.feedbackHistory.length < 10) {
      return 0; // Not enough data
    }

    // Calculate time window
    const now = Date.now();
    let windowMs = 0;
    switch (period) {
      case "day":
        windowMs = 24 * 60 * 60 * 1000;
        break;
      case "week":
        windowMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        windowMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case "all":
        windowMs = Number.MAX_SAFE_INTEGER;
        break;
    }

    // Split feedback into early and recent
    const cutoff = now - windowMs;
    const earlyFeedback = this.feedbackHistory.filter((f) => f.timestamp.getTime() < cutoff);
    const recentFeedback = this.feedbackHistory.filter((f) => f.timestamp.getTime() >= cutoff);

    if (earlyFeedback.length === 0 || recentFeedback.length === 0) {
      return 0;
    }

    // Calculate accuracy for each period
    const earlyAccuracy = earlyFeedback.filter((f) => f.correct).length / earlyFeedback.length;
    const recentAccuracy = recentFeedback.filter((f) => f.correct).length / recentFeedback.length;

    // Return improvement
    return Math.max(0, recentAccuracy - earlyAccuracy);
  }

  /**
   * Get user sensitivity for a bias type
   *
   * @param userId - User identifier
   * @param biasType - Type of bias
   * @returns Sensitivity threshold (0-1, default 0.5)
   */
  getUserSensitivity(userId: string, biasType: BiasType): number {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return 0.5; // Default sensitivity
    }

    return profile.sensitivityByType.get(biasType) ?? 0.5;
  }

  /**
   * Get overall learning metrics
   *
   * @returns Learning system metrics
   */
  getLearningMetrics(): LearningMetrics {
    const currentAccuracy = this.getAccuracyMetrics();
    const baselineF1 = this.baselineAccuracy
      ? Array.from(this.baselineAccuracy.values()).reduce((sum, m) => sum + m.f1Score, 0) /
        this.baselineAccuracy.size
      : 0;

    return {
      totalFeedback: this.feedbackHistory.length,
      accuracyImprovement: Math.max(0, currentAccuracy.f1Score - baselineF1),
      patternCount: this.patternWeights.size,
      userCount: this.userProfiles.size,
    };
  }

  /**
   * Update user sensitivity based on feedback
   *
   * Automatically tunes sensitivity using Bayesian updating.
   *
   * @param feedback - User feedback
   */
  private updateUserSensitivity(feedback: BiasFeedback): void {
    const userId = feedback.userId;
    const biasType = feedback.detectedBias.type;

    // Get user's feedback history for this bias type
    const userHistory = this.feedbackHistory.filter(
      (f) => f.userId === userId && f.detectedBias.type === biasType
    );

    if (userHistory.length < 3) {
      return; // Need more data
    }

    // Calculate user's accuracy for this bias type
    const correct = userHistory.filter((f) => f.correct).length;
    const accuracy = correct / userHistory.length;

    // Adjust sensitivity based on accuracy
    // High accuracy: user is good at identifying this bias, increase sensitivity
    // Low accuracy: user has false positives, decrease sensitivity
    let adjustment = 0;
    if (accuracy > 0.8) {
      adjustment = 0.05;
    } else if (accuracy < 0.5) {
      adjustment = -0.05;
    }

    if (adjustment !== 0) {
      this.adjustSensitivity(userId, biasType, adjustment);
    }
  }
}
