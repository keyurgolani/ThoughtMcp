/**
 * Enhanced formatting utilities specifically for the think tool output
 * Provides improved reasoning presentation, metacognitive advice, and emotional integration
 *
 * Note: This file uses 'any' types for flexible formatting.
 * TODO: Refactor to use proper generic types in future iteration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  EmotionalState,
  ReasoningStep,
  ReasoningType,
  ThoughtResult,
} from "../types/core.js";

export interface EnhancedReasoningPresentation {
  narrative_flow: string;
  step_summary: string;
  confidence_assessment: string;
  emotional_influence: string;
  alternatives_considered: string;
  metacognitive_notes: string;
}

export interface MetacognitiveAdvice {
  key_insights: string[];
  potential_biases: string[];
  confidence_factors: string[];
  improvement_suggestions: string[];
  next_thinking_steps: string[];
}

export interface EmotionalIntegration {
  emotional_summary: string;
  emotional_influence_on_reasoning: string;
  emotional_confidence_impact: string;
  emotional_recommendations: string[];
}

export class ThinkToolFormatter {
  /**
   * Create an enhanced narrative flow from reasoning steps
   */
  static createReasoningNarrative(steps: ReasoningStep[]): string {
    if (steps.length === 0) {
      return "No reasoning steps were recorded for this thought process.";
    }

    const narrativeParts: string[] = [];

    // Group steps by reasoning type for better flow
    const groupedSteps = this.groupStepsByType(steps);

    // Create opening
    narrativeParts.push("🧠 **My Thinking Process:**\n");

    // Process each group with contextual transitions
    let stepNumber = 1;
    for (const [type, typeSteps] of groupedSteps) {
      const typeDescription = this.getReasoningTypeNarrative(type);

      if (typeSteps.length === 1) {
        const step = typeSteps[0];
        narrativeParts.push(
          `${stepNumber}. **${typeDescription}**\n` +
            `   ${this.formatStepContent(step)}\n` +
            `   *Confidence: ${this.getConfidenceNarrative(step.confidence)}*\n`
        );
      } else {
        narrativeParts.push(`${stepNumber}. **${typeDescription}**`);
        typeSteps.forEach((step, index) => {
          narrativeParts.push(
            `   ${String.fromCharCode(97 + index)}. ${this.formatStepContent(
              step
            )}\n` +
              `      *Confidence: ${this.getConfidenceNarrative(
                step.confidence
              )}*`
          );
        });
        narrativeParts.push("");
      }
      stepNumber++;
    }

    return narrativeParts.join("\n");
  }

  /**
   * Generate enhanced metacognitive advice
   */
  static generateMetacognitiveAdvice(
    result: ThoughtResult,
    steps: ReasoningStep[]
  ): MetacognitiveAdvice {
    const metacognitiveAssessment = result.metadata
      .metacognitive_assessment as any;

    const advice: MetacognitiveAdvice = {
      key_insights: [],
      potential_biases: [],
      confidence_factors: [],
      improvement_suggestions: [],
      next_thinking_steps: [],
    };

    // Extract key insights from reasoning pattern
    const reasoningTypes = steps.map((s) => s.type);
    const avgConfidence =
      steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

    // Key insights based on reasoning pattern
    if (reasoningTypes.includes(ReasoningType.PATTERN_MATCH)) {
      advice.key_insights.push(
        "Drew on past experience and pattern recognition"
      );
    }
    if (reasoningTypes.includes(ReasoningType.LOGICAL_INFERENCE)) {
      advice.key_insights.push("Applied logical reasoning and deduction");
    }
    if (reasoningTypes.includes(ReasoningType.ANALOGICAL)) {
      advice.key_insights.push("Used analogical thinking to connect concepts");
    }
    if (reasoningTypes.includes(ReasoningType.METACOGNITIVE)) {
      advice.key_insights.push(
        "Engaged in self-reflective thinking about the process"
      );
    }

    // Potential biases based on metacognitive assessment
    if (metacognitiveAssessment?.biases_detected) {
      advice.potential_biases = metacognitiveAssessment.biases_detected.map(
        (bias: string) => this.formatBiasWarning(bias)
      );
    }

    // Add common bias checks based on reasoning pattern
    if (
      reasoningTypes.includes(ReasoningType.PATTERN_MATCH) &&
      avgConfidence > 0.8
    ) {
      advice.potential_biases.push(
        "High confidence in pattern matching - consider if this situation is truly similar to past experiences"
      );
    }
    if (reasoningTypes.length < 3) {
      advice.potential_biases.push(
        "Limited reasoning diversity - consider exploring alternative approaches"
      );
    }

    // Confidence factors
    advice.confidence_factors = this.analyzeConfidenceFactors(steps, result);

    // Improvement suggestions
    advice.improvement_suggestions = this.generateImprovementSuggestions(
      steps,
      result
    );

    // Next thinking steps
    advice.next_thinking_steps = this.suggestNextSteps(steps, result);

    return advice;
  }

  /**
   * Integrate emotional context into reasoning narrative
   */
  static integrateEmotionalContext(
    emotionalContext: EmotionalState,
    steps: ReasoningStep[]
  ): EmotionalIntegration {
    const valenceDescription = this.getValenceDescription(
      emotionalContext.valence
    );
    const arousalDescription = this.getArousalDescription(
      emotionalContext.arousal
    );
    const dominanceDescription = this.getDominanceDescription(
      emotionalContext.dominance
    );

    const emotionalSummary = `${valenceDescription}, ${arousalDescription}, feeling ${dominanceDescription}`;

    // Analyze how emotions might have influenced reasoning
    const emotionalInfluence = this.analyzeEmotionalInfluence(
      emotionalContext,
      steps
    );

    // Assess confidence impact
    const confidenceImpact =
      this.assessEmotionalConfidenceImpact(emotionalContext);

    // Generate recommendations
    const recommendations = this.generateEmotionalRecommendations(
      emotionalContext,
      steps
    );

    return {
      emotional_summary: emotionalSummary,
      emotional_influence_on_reasoning: emotionalInfluence,
      emotional_confidence_impact: confidenceImpact,
      emotional_recommendations: recommendations,
    };
  }

  /**
   * Group reasoning steps by type for better narrative flow
   */
  private static groupStepsByType(
    steps: ReasoningStep[]
  ): Map<ReasoningType, ReasoningStep[]> {
    const groups = new Map<ReasoningType, ReasoningStep[]>();

    for (const step of steps) {
      if (!groups.has(step.type)) {
        groups.set(step.type, []);
      }
      groups.get(step.type)!.push(step);
    }

    return groups;
  }

  /**
   * Get narrative description for reasoning type
   */
  private static getReasoningTypeNarrative(type: ReasoningType): string {
    const narratives: Record<ReasoningType, string> = {
      [ReasoningType.PATTERN_MATCH]: "Pattern Recognition",
      [ReasoningType.LOGICAL_INFERENCE]: "Logical Analysis",
      [ReasoningType.ANALOGICAL]: "Drawing Analogies",
      [ReasoningType.CAUSAL]: "Cause-Effect Analysis",
      [ReasoningType.PROBABILISTIC]: "Probability Assessment",
      [ReasoningType.METACOGNITIVE]: "Self-Reflection",
      [ReasoningType.DEDUCTIVE]: "Deductive Reasoning",
      [ReasoningType.INDUCTIVE]: "Inductive Reasoning",
      [ReasoningType.ABDUCTIVE]: "Best Explanation",
      [ReasoningType.HEURISTIC]: "Intuitive Shortcuts",
      [ReasoningType.CONTEXTUAL]: "Contextual Considerations",
    };

    return narratives[type] || "General Reasoning";
  }

  /**
   * Format step content for narrative flow
   */
  private static formatStepContent(step: ReasoningStep): string {
    // Remove technical prefixes and make more conversational
    let content = step.content;

    // Remove common technical prefixes
    content = content.replace(
      /^(Therefore,|Given that,|Based on,|Considering,)\s*/i,
      ""
    );

    // Ensure first letter is capitalized
    content = content.charAt(0).toUpperCase() + content.slice(1);

    // Add period if missing
    if (!content.match(/[.!?]$/)) {
      content += ".";
    }

    return content;
  }

  /**
   * Get narrative confidence description
   */
  private static getConfidenceNarrative(confidence: number): string {
    if (confidence >= 0.9) return "Very confident about this reasoning";
    if (confidence >= 0.7) return "Quite confident in this approach";
    if (confidence >= 0.5) return "Moderately confident, but worth considering";
    if (confidence >= 0.3) return "Somewhat uncertain about this reasoning";
    return "Low confidence - this might need more thought";
  }

  /**
   * Format bias warning in user-friendly way
   */
  private static formatBiasWarning(bias: string): string {
    const biasDescriptions: Record<string, string> = {
      confirmation_bias:
        "May be favoring information that confirms existing beliefs",
      anchoring_bias: "Might be too influenced by initial information",
      availability_heuristic: "Could be overweighting easily recalled examples",
      overconfidence: "May be more certain than the evidence warrants",
      pattern_overgeneralization: "Might be seeing patterns where none exist",
    };

    return (
      biasDescriptions[bias] || `Potential ${bias.replace(/_/g, " ")} detected`
    );
  }

  /**
   * Analyze factors contributing to confidence levels
   */
  private static analyzeConfidenceFactors(
    steps: ReasoningStep[],
    result: ThoughtResult
  ): string[] {
    const factors: string[] = [];
    const avgConfidence =
      steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

    if (avgConfidence > 0.8) {
      factors.push("Strong consistency across reasoning steps");
    }
    if (steps.length >= 5) {
      factors.push("Thorough analysis with multiple reasoning approaches");
    }
    if (steps.some((s) => s.alternatives.length > 0)) {
      factors.push("Considered alternative perspectives");
    }
    if (result.metadata.memory_retrievals > 3) {
      factors.push("Drew on substantial relevant experience");
    }

    return factors;
  }

  /**
   * Generate improvement suggestions based on reasoning analysis
   */
  private static generateImprovementSuggestions(
    steps: ReasoningStep[],
    _result: ThoughtResult
  ): string[] {
    const suggestions: string[] = [];
    const reasoningTypes = steps.map((s) => s.type);
    const avgConfidence =
      steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

    if (avgConfidence < 0.6) {
      suggestions.push("Consider gathering more information or evidence");
    }
    if (!reasoningTypes.includes(ReasoningType.ANALOGICAL)) {
      suggestions.push("Try thinking of similar situations or analogies");
    }
    if (!reasoningTypes.includes(ReasoningType.CAUSAL)) {
      suggestions.push("Explore cause-and-effect relationships");
    }
    if (steps.length < 3) {
      suggestions.push("Break down the problem into more detailed steps");
    }
    if (steps.every((s) => s.alternatives.length === 0)) {
      suggestions.push("Consider alternative viewpoints or approaches");
    }

    return suggestions;
  }

  /**
   * Suggest next thinking steps
   */
  private static suggestNextSteps(
    steps: ReasoningStep[],
    _result: ThoughtResult
  ): string[] {
    const nextSteps: string[] = [];
    const avgConfidence =
      steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

    if (avgConfidence > 0.8) {
      nextSteps.push("Consider potential counterarguments or edge cases");
      nextSteps.push("Test your reasoning with a different approach");
    } else {
      nextSteps.push("Gather additional evidence or information");
      nextSteps.push("Break down uncertain aspects into smaller questions");
    }

    nextSteps.push("Reflect on what assumptions you might be making");
    nextSteps.push(
      "Consider how someone with a different perspective might view this"
    );

    return nextSteps;
  }

  /**
   * Get valence description
   */
  private static getValenceDescription(valence: number): string {
    if (valence > 0.5) return "positive emotional tone";
    if (valence > 0.1) return "slightly positive emotional tone";
    if (valence > -0.1) return "neutral emotional tone";
    if (valence > -0.5) return "slightly negative emotional tone";
    return "negative emotional tone";
  }

  /**
   * Get arousal description
   */
  private static getArousalDescription(arousal: number): string {
    if (arousal > 0.7) return "high energy";
    if (arousal > 0.4) return "moderate energy";
    return "calm energy";
  }

  /**
   * Get dominance description
   */
  private static getDominanceDescription(dominance: number): string {
    if (dominance > 0.7) return "in control";
    if (dominance > 0.4) return "moderately confident";
    return "somewhat uncertain";
  }

  /**
   * Analyze how emotions influenced reasoning
   */
  private static analyzeEmotionalInfluence(
    emotional: EmotionalState,
    _steps: ReasoningStep[]
  ): string {
    const influences: string[] = [];

    if (emotional.valence > 0.5) {
      influences.push(
        "positive emotions may have encouraged optimistic reasoning"
      );
    } else if (emotional.valence < -0.3) {
      influences.push(
        "negative emotions might have led to more cautious or critical thinking"
      );
    }

    if (emotional.arousal > 0.7) {
      influences.push(
        "high energy levels could have accelerated decision-making"
      );
    } else if (emotional.arousal < 0.3) {
      influences.push(
        "calm state likely supported careful, deliberate analysis"
      );
    }

    if (emotional.dominance < 0.4) {
      influences.push(
        "feelings of uncertainty may have increased thoroughness"
      );
    }

    return influences.length > 0
      ? influences.join("; ")
      : "emotions appear to have had minimal influence on the reasoning process";
  }

  /**
   * Assess how emotions impacted confidence
   */
  private static assessEmotionalConfidenceImpact(
    emotional: EmotionalState
  ): string {
    if (emotional.dominance > 0.7 && emotional.valence > 0.3) {
      return "positive emotions and sense of control likely boosted confidence";
    }
    if (emotional.dominance < 0.3) {
      return "feelings of uncertainty may have appropriately tempered confidence";
    }
    if (emotional.arousal > 0.8) {
      return "high arousal might have led to overconfidence - consider double-checking";
    }
    return "emotional state appears well-balanced for confident reasoning";
  }

  /**
   * Generate emotional recommendations
   */
  private static generateEmotionalRecommendations(
    emotional: EmotionalState,
    _steps: ReasoningStep[]
  ): string[] {
    const recommendations: string[] = [];

    if (emotional.arousal > 0.8) {
      recommendations.push(
        "Take a moment to slow down and double-check your reasoning"
      );
    }
    if (emotional.valence < -0.5) {
      recommendations.push(
        "Consider if negative emotions are making you overly pessimistic"
      );
    }
    if (emotional.dominance < 0.3) {
      recommendations.push(
        "Your uncertainty is valuable - use it to explore more thoroughly"
      );
    }
    if (emotional.valence > 0.7 && emotional.dominance > 0.7) {
      recommendations.push(
        "High confidence is good, but consider potential blind spots"
      );
    }

    return recommendations;
  }
}
