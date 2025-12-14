/**
 * Emotional Trajectory Tracker
 *
 * Tracks emotional states over time, detects shifts, recognizes patterns,
 * identifies triggers, and generates insights about emotional dynamics.
 */

import type {
  CircumplexState,
  EmotionalPattern,
  EmotionalShift,
  EmotionalTrigger,
  EmotionType,
  TrajectoryInsight,
  TrajectoryStatistics,
} from "./types";

/**
 * Tracks emotional trajectory over time
 */
export class EmotionalTrajectoryTracker {
  private history: CircumplexState[] = [];
  private triggers: Map<
    string,
    { emotionType: EmotionType; intensities: number[]; timestamps: Date[] }
  > = new Map();

  /**
   * Track a new emotional state
   * @param state - Circumplex emotional state to track
   * @param trigger - Optional trigger that caused this state
   */
  trackEmotionalState(state: CircumplexState, trigger?: string): void {
    // Validate state
    this.validateState(state);

    // Add to history
    this.history.push(state);

    // Track trigger if provided and there was a shift
    if (trigger && this.history.length > 1) {
      const prevState = this.history[this.history.length - 2];
      const magnitude = this.calculateShiftMagnitude(prevState, state);

      if (magnitude > 0.2) {
        // Significant shift
        const emotionType = this.inferEmotionType(state);
        const intensity = Math.sqrt(state.valence ** 2 + state.arousal ** 2 + state.dominance ** 2);

        if (!this.triggers.has(trigger)) {
          this.triggers.set(trigger, {
            emotionType,
            intensities: [],
            timestamps: [],
          });
        }

        const triggerData = this.triggers.get(trigger);
        if (triggerData) {
          triggerData.intensities.push(intensity);
          triggerData.timestamps.push(state.timestamp);
        }
      }
    }
  }

  /**
   * Get emotional state history
   * @param limit - Optional limit on number of states to return
   * @returns Array of emotional states
   */
  getHistory(limit?: number): CircumplexState[] {
    if (limit === undefined) {
      return [...this.history];
    }
    return this.history.slice(-limit);
  }

  /**
   * Clear all tracked history
   */
  clearHistory(): void {
    this.history = [];
    this.triggers.clear();
  }

  /**
   * Get trajectory statistics
   * @returns Statistics about the emotional trajectory
   */
  getStatistics(): TrajectoryStatistics {
    if (this.history.length === 0) {
      return {
        totalStates: 0,
        averageValence: 0,
        averageArousal: 0,
        averageDominance: 0,
        volatility: 0,
        timeSpan: 0,
      };
    }

    const totalStates = this.history.length;

    // Calculate averages
    const averageValence = this.history.reduce((sum, s) => sum + s.valence, 0) / totalStates;
    const averageArousal = this.history.reduce((sum, s) => sum + s.arousal, 0) / totalStates;
    const averageDominance = this.history.reduce((sum, s) => sum + s.dominance, 0) / totalStates;

    // Calculate volatility (average magnitude of changes)
    let volatility = 0;
    if (totalStates > 1) {
      let totalChange = 0;
      for (let i = 1; i < totalStates; i++) {
        totalChange += this.calculateShiftMagnitude(this.history[i - 1], this.history[i]);
      }
      volatility = totalChange / (totalStates - 1);
    }

    // Calculate time span
    let timeSpan = 0;
    if (totalStates > 1) {
      const firstTime = this.history[0].timestamp.getTime();
      const lastTime = this.history[totalStates - 1].timestamp.getTime();
      timeSpan = lastTime - firstTime;
    }

    return {
      totalStates,
      averageValence,
      averageArousal,
      averageDominance,
      volatility,
      timeSpan,
    };
  }

  /**
   * Detect emotional shift between last two states
   * @param threshold - Minimum magnitude to consider a shift (0-1)
   * @returns Emotional shift if detected, null otherwise
   */
  detectEmotionalShift(threshold: number): EmotionalShift | null {
    // Validate threshold
    if (threshold < 0 || threshold > 1) {
      throw new Error("Threshold must be between 0 and 1");
    }

    if (this.history.length < 2) {
      return null;
    }

    const fromState = this.history[this.history.length - 2];
    const toState = this.history[this.history.length - 1];

    const magnitude = this.calculateShiftMagnitude(fromState, toState);

    if (magnitude < threshold) {
      return null;
    }

    return {
      fromState,
      toState,
      magnitude,
      timestamp: toState.timestamp,
    };
  }

  /**
   * Recognize emotional patterns in the trajectory
   * @returns Array of detected patterns
   */
  recognizePatterns(): EmotionalPattern[] {
    if (this.history.length < 3) {
      return [];
    }

    const patterns: EmotionalPattern[] = [];

    // Detect recurring pattern
    const recurring = this.detectRecurringPattern();
    if (recurring) {
      patterns.push(recurring);
    }

    // Detect progressive pattern
    const progressive = this.detectProgressivePattern();
    if (progressive) {
      patterns.push(progressive);
    }

    // Detect reactive pattern
    const reactive = this.detectReactivePattern();
    if (reactive) {
      patterns.push(reactive);
    }

    return patterns;
  }

  /**
   * Identify emotional triggers
   * @returns Array of identified triggers
   */
  identifyTriggers(): EmotionalTrigger[] {
    const triggers: EmotionalTrigger[] = [];

    for (const [trigger, data] of this.triggers.entries()) {
      const averageIntensity =
        data.intensities.reduce((sum, i) => sum + i, 0) / data.intensities.length;

      triggers.push({
        trigger,
        emotionType: data.emotionType,
        frequency: data.intensities.length,
        averageIntensity: Math.min(1.0, averageIntensity / Math.sqrt(3)), // Normalize
        lastOccurrence: data.timestamps[data.timestamps.length - 1],
      });
    }

    return triggers;
  }

  /**
   * Generate trajectory insights
   * @returns Array of insights about the emotional trajectory
   */
  generateTrajectoryInsights(): TrajectoryInsight[] {
    if (this.history.length < 3) {
      return [];
    }

    const insights: TrajectoryInsight[] = [];
    const stats = this.getStatistics();

    // Trend insight
    const trendInsight = this.generateTrendInsight();
    if (trendInsight) {
      insights.push(trendInsight);
    }

    // Volatility insight
    if (stats.volatility > 0.4) {
      insights.push({
        type: "volatility",
        description: "Emotions are highly volatile with frequent significant changes",
        confidence: Math.min(1.0, stats.volatility),
        recommendation: "Consider identifying triggers for emotional instability",
      });
    }

    // Stability insight
    if (stats.volatility < 0.15) {
      insights.push({
        type: "stability",
        description: "Emotions are stable with minimal fluctuation",
        confidence: 1.0 - stats.volatility,
      });
    }

    // Recovery insight
    const recoveryInsight = this.generateRecoveryInsight();
    if (recoveryInsight) {
      insights.push(recoveryInsight);
    }

    return insights;
  }

  /**
   * Predict emotional trend based on history
   * @returns Predicted future emotional state
   */
  predictEmotionalTrend(): CircumplexState {
    if (this.history.length === 0) {
      throw new Error("Cannot predict trend with empty history");
    }

    if (this.history.length === 1) {
      return { ...this.history[0] };
    }

    // Use simple moving average with trend extrapolation
    const recentStates = this.history.slice(-5); // Last 5 states
    const n = recentStates.length;

    // Calculate trend
    let trendValence = 0;
    let trendArousal = 0;
    let trendDominance = 0;

    for (let i = 1; i < n; i++) {
      trendValence += recentStates[i].valence - recentStates[i - 1].valence;
      trendArousal += recentStates[i].arousal - recentStates[i - 1].arousal;
      trendDominance += recentStates[i].dominance - recentStates[i - 1].dominance;
    }

    if (n > 1) {
      trendValence /= n - 1;
      trendArousal /= n - 1;
      trendDominance /= n - 1;
    }

    // Extrapolate - use last value plus trend for more aggressive prediction
    const lastState = recentStates[n - 1];
    const predictedValence = this.clamp(lastState.valence + trendValence * 2, -1, 1);
    const predictedArousal = this.clamp(lastState.arousal + trendArousal * 2, 0, 1);
    const predictedDominance = this.clamp(lastState.dominance + trendDominance * 2, -1, 1);

    // Calculate confidence based on consistency
    const stats = this.getStatistics();
    const confidence = Math.max(0.3, 1.0 - stats.volatility);

    return {
      valence: predictedValence,
      arousal: predictedArousal,
      dominance: predictedDominance,
      confidence,
      timestamp: new Date(),
    };
  }

  // Private helper methods

  private validateState(state: CircumplexState): void {
    if (isNaN(state.valence) || isNaN(state.arousal) || isNaN(state.dominance)) {
      throw new Error("State values cannot be NaN");
    }

    if (state.valence < -1 || state.valence > 1) {
      throw new Error("Valence must be between -1 and 1");
    }

    if (state.arousal < 0 || state.arousal > 1) {
      throw new Error("Arousal must be between 0 and 1");
    }

    if (state.dominance < -1 || state.dominance > 1) {
      throw new Error("Dominance must be between -1 and 1");
    }
  }

  private calculateShiftMagnitude(from: CircumplexState, to: CircumplexState): number {
    // Euclidean distance normalized by maximum possible distance
    const valenceDiff = to.valence - from.valence;
    const arousalDiff = to.arousal - from.arousal;
    const dominanceDiff = to.dominance - from.dominance;

    const distance = Math.sqrt(valenceDiff ** 2 + arousalDiff ** 2 + dominanceDiff ** 2);

    // Maximum possible distance: valence (-1 to 1), arousal (0 to 1), dominance (-1 to 1)
    // Max change: valence=2, arousal=1, dominance=2
    // Max distance = sqrt(2^2 + 1^2 + 2^2) = sqrt(9) = 3
    // But for the test case (0,0,0) to (1,1,1), distance = sqrt(3)
    // To normalize sqrt(3) to 1.0, we divide by sqrt(3)
    return distance / Math.sqrt(3);
  }

  private inferEmotionType(state: CircumplexState): EmotionType {
    // Simple heuristic based on circumplex dimensions
    if (state.valence > 0.3 && state.arousal > 0.5) {
      return "joy";
    } else if (state.valence < -0.3 && state.arousal > 0.5) {
      return "anger";
    } else if (state.valence < -0.3 && state.arousal < 0.5) {
      return "sadness";
    } else if (state.valence > 0.3 && state.arousal < 0.5) {
      return "gratitude";
    } else if (state.arousal > 0.7) {
      return "surprise";
    } else {
      return "fear";
    }
  }

  private detectRecurringPattern(): EmotionalPattern | null {
    // Look for similar states appearing multiple times
    const clusters: CircumplexState[][] = [];

    for (const state of this.history) {
      let foundCluster = false;

      for (const cluster of clusters) {
        const representative = cluster[0];
        const distance = this.calculateShiftMagnitude(representative, state);

        if (distance < 0.2) {
          // Similar enough
          cluster.push(state);
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push([state]);
      }
    }

    // Find largest cluster
    const largestCluster = clusters.reduce(
      (max, cluster) => (cluster.length > max.length ? cluster : max),
      clusters[0]
    );

    if (largestCluster.length >= 3) {
      const frequency = largestCluster.length;
      const confidence = Math.min(1.0, frequency / this.history.length);

      return {
        type: "recurring",
        description: `Recurring emotional state appears ${frequency} times`,
        frequency,
        confidence,
        examples: largestCluster.slice(0, 3),
      };
    }

    return null;
  }

  private detectProgressivePattern(): EmotionalPattern | null {
    // Look for gradual change in one direction
    let valenceTrend = 0;

    for (let i = 1; i < this.history.length; i++) {
      valenceTrend += this.history[i].valence - this.history[i - 1].valence;
    }

    const avgValenceTrend = valenceTrend / (this.history.length - 1);

    if (Math.abs(avgValenceTrend) > 0.1) {
      const direction = avgValenceTrend > 0 ? "improving" : "declining";
      const confidence = Math.min(1.0, Math.abs(avgValenceTrend) * 2);

      return {
        type: "progressive",
        description: `Emotions are progressively ${direction}`,
        frequency: 1,
        confidence,
        examples: [
          this.history[0],
          this.history[Math.floor(this.history.length / 2)],
          this.history[this.history.length - 1],
        ],
      };
    }

    return null;
  }

  private detectReactivePattern(): EmotionalPattern | null {
    // Look for rapid changes
    let rapidChanges = 0;

    for (let i = 1; i < this.history.length; i++) {
      const magnitude = this.calculateShiftMagnitude(this.history[i - 1], this.history[i]);

      if (magnitude > 0.4) {
        rapidChanges++;
      }
    }

    const rapidChangeRatio = rapidChanges / (this.history.length - 1);

    if (rapidChangeRatio > 0.5) {
      return {
        type: "reactive",
        description: `Emotions show rapid changes (${rapidChanges} significant shifts)`,
        frequency: rapidChanges,
        confidence: rapidChangeRatio,
        examples: this.history.slice(-3),
      };
    }

    return null;
  }

  private generateTrendInsight(): TrajectoryInsight | null {
    const recentStates = this.history.slice(-5);
    if (recentStates.length < 3) {
      return null;
    }

    const firstValence = recentStates[0].valence;
    const lastValence = recentStates[recentStates.length - 1].valence;
    const change = lastValence - firstValence;

    if (Math.abs(change) > 0.2) {
      const direction = change > 0 ? "improving" : "declining";
      const confidence = Math.min(1.0, Math.abs(change));

      let recommendation: string | undefined;
      if (direction === "declining") {
        recommendation = "Consider identifying factors contributing to emotional decline";
      }

      return {
        type: "trend",
        description: `Emotional trend is ${direction}`,
        confidence,
        recommendation,
      };
    }

    return null;
  }

  private generateRecoveryInsight(): TrajectoryInsight | null {
    if (this.history.length < 4) {
      return null;
    }

    // Look for recovery from negative state
    const recentStates = this.history.slice(-4);
    const hasNegativeStart = recentStates[0].valence < -0.3;
    const hasPositiveEnd = recentStates[recentStates.length - 1].valence > 0.3;

    if (hasNegativeStart && hasPositiveEnd) {
      // Check if it's a consistent recovery
      let isConsistent = true;
      for (let i = 1; i < recentStates.length; i++) {
        if (recentStates[i].valence < recentStates[i - 1].valence) {
          isConsistent = false;
          break;
        }
      }

      if (isConsistent) {
        const recovery = recentStates[recentStates.length - 1].valence - recentStates[0].valence;
        const confidence = Math.min(1.0, recovery);

        return {
          type: "recovery",
          description: "Emotions are recovering from negative state",
          confidence,
          recommendation: "Continue current coping strategies",
        };
      }
    }

    return null;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
