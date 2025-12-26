/**
 * Contextual Emotion Processor
 *
 * Enhances emotion detection by considering conversation history, cultural factors,
 * professional context, and situational factors. Adjusts base emotion detection
 * to account for context that may influence emotional expression.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { CircumplexEmotionAnalyzer } from "./circumplex-analyzer";
import { DiscreteEmotionClassifier } from "./discrete-emotion-classifier";
import type {
  CircumplexState,
  ContextualEmotionResult,
  ContextualProcessingOptions,
  CulturalContext,
  EmotionAdjustment,
  EmotionModel,
  EmotionalContext,
  Message,
  ProfessionalContext,
  Situation,
} from "./types";

/**
 * ContextualEmotionProcessor
 *
 * Processes emotions with contextual awareness to improve detection accuracy.
 */
export class ContextualEmotionProcessor {
  private readonly circumplexAnalyzer: CircumplexEmotionAnalyzer;
  private readonly discreteClassifier: DiscreteEmotionClassifier;

  constructor(model: EmotionModel) {
    this.circumplexAnalyzer = new CircumplexEmotionAnalyzer(model);
    this.discreteClassifier = new DiscreteEmotionClassifier(model);
  }

  /**
   * Process text with contextual awareness
   * @param text - Text to analyze
   * @param options - Contextual processing options
   * @returns Complete contextual emotion result
   */
  processWithContext(text: string, options?: ContextualProcessingOptions): ContextualEmotionResult {
    // Get base emotion detection
    const baseCircumplex = this.circumplexAnalyzer.analyzeCircumplex(text);
    const baseDiscrete = this.discreteClassifier.classify(text);

    // If no context provided, return base detection
    if (!options) {
      return {
        circumplex: baseCircumplex,
        discreteEmotions: baseDiscrete,
        confidence: baseCircumplex.confidence,
      };
    }

    // Analyze context factors
    const contextFactors = this.analyzeConversationHistory(options.conversationHistory);

    // Calculate adjustments
    const adjustments = {
      culturalAdjustment: options.culturalContext
        ? this.calculateCulturalAdjustment(baseCircumplex, options.culturalContext)
        : undefined,
      professionalAdjustment: options.professionalContext
        ? this.calculateProfessionalAdjustment(baseCircumplex, options.professionalContext)
        : undefined,
      situationalAdjustment: options.situation
        ? this.calculateSituationalAdjustment(baseCircumplex, options.situation)
        : undefined,
    };

    // Apply adjustments to circumplex state
    const adjustedCircumplex = this.applyAdjustments(baseCircumplex, adjustments);

    // Calculate overall confidence (higher with more context)
    const confidence = this.calculateOverallConfidence(
      baseCircumplex.confidence,
      options,
      contextFactors
    );

    return {
      circumplex: adjustedCircumplex,
      discreteEmotions: baseDiscrete,
      confidence,
      contextFactors,
      adjustments,
    };
  }

  /**
   * Analyze conversation history to extract emotional context
   */
  private analyzeConversationHistory(history?: Message[]): EmotionalContext | undefined {
    if (!history || history.length === 0) {
      return undefined;
    }

    // Analyze recent messages (weight by recency)
    const recentEmotions: CircumplexState[] = [];
    let positiveCount = 0;
    let negativeCount = 0;

    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const message of history) {
      const age = now - message.timestamp.getTime();
      if (age > maxAge) continue; // Skip old messages

      const emotion = this.circumplexAnalyzer.analyzeCircumplex(message.text);
      recentEmotions.push(emotion);

      // Classify tone
      if (emotion.valence > 0.3) {
        positiveCount++;
      } else if (emotion.valence < -0.3) {
        negativeCount++;
      }
    }

    // Determine conversation tone (weight recent messages more)
    let conversationTone: "positive" | "negative" | "neutral" = "neutral";
    if (positiveCount > negativeCount) {
      conversationTone = "positive";
    } else if (negativeCount > positiveCount) {
      conversationTone = "negative";
    }

    // Determine emotional trend
    let emotionalTrend: "improving" | "declining" | "stable" = "stable";
    if (recentEmotions.length >= 3) {
      const first = recentEmotions[0].valence;
      const last = recentEmotions[recentEmotions.length - 1].valence;
      const delta = last - first;

      if (delta > 0.3) {
        emotionalTrend = "improving";
      } else if (delta < -0.3) {
        emotionalTrend = "declining";
      }
    }

    return {
      recentEmotions,
      emotionalTrend,
      conversationTone,
    };
  }

  /**
   * Calculate cultural adjustment based on cultural context
   */
  private calculateCulturalAdjustment(
    state: CircumplexState,
    culture: CulturalContext
  ): EmotionAdjustment {
    let valenceDelta = 0;
    let arousalDelta = 0;
    const dominanceDelta = 0;
    let reason = "";

    // Adjust for emotional expressiveness
    if (culture.emotionExpressiveness === "low") {
      // Low expressiveness cultures may understate emotions
      // Amplify detected emotions
      valenceDelta = state.valence * 0.2;
      arousalDelta = state.arousal * 0.2;
      reason = "Low expressiveness culture - emotions may be understated";
    } else if (culture.emotionExpressiveness === "high") {
      // High expressiveness cultures may overstate emotions
      // Dampen detected emotions slightly
      valenceDelta = state.valence * -0.1;
      arousalDelta = state.arousal * -0.1;
      reason = "High expressiveness culture - emotions may be overstated";
    }

    // Adjust for communication directness
    if (culture.directness === "indirect") {
      // Indirect communication may mask true emotions
      // Increase sensitivity to subtle signals
      valenceDelta += state.valence * 0.15;
      reason += reason ? "; Indirect communication style" : "Indirect communication style";
    }

    return {
      valenceDelta,
      arousalDelta,
      dominanceDelta,
      reason,
    };
  }

  /**
   * Calculate professional context adjustment
   */
  private calculateProfessionalAdjustment(
    state: CircumplexState,
    context: ProfessionalContext
  ): EmotionAdjustment {
    let valenceDelta = 0;
    let arousalDelta = 0;
    let dominanceDelta = 0;
    let reason = "";

    // Formal settings suppress emotional expression
    if (context.setting === "formal") {
      valenceDelta = state.valence * 0.2;
      arousalDelta = state.arousal * 0.2;
      reason = "Formal setting - emotions may be suppressed";
    }

    // Relationship dynamics affect expression
    if (context.relationship === "superior") {
      dominanceDelta = -0.1;
      reason += reason ? "; Speaking to superior" : "Speaking to superior";
    } else if (context.relationship === "subordinate") {
      dominanceDelta = 0.1;
      reason += reason ? "; Speaking to subordinate" : "Speaking to subordinate";
    }

    return {
      valenceDelta,
      arousalDelta,
      dominanceDelta,
      reason,
    };
  }

  /**
   * Calculate situational adjustment
   */
  private calculateSituationalAdjustment(
    state: CircumplexState,
    situation: Situation
  ): EmotionAdjustment {
    const valenceDelta = 0;
    let arousalDelta = 0;
    let dominanceDelta = 0;
    let reason = "";

    // High urgency increases arousal
    if (situation.urgency === "high") {
      arousalDelta = 0.2;
      reason = "High urgency situation";
    }

    // High stakes increases arousal and may affect dominance
    if (situation.stakes === "high") {
      arousalDelta += 0.15;
      dominanceDelta = state.dominance > 0 ? 0.1 : -0.1;
      reason += reason ? "; High stakes" : "High stakes";
    }

    // Time of day can affect emotional state
    if (situation.timeOfDay === "night") {
      arousalDelta -= 0.1; // Lower energy at night
      reason += reason ? "; Late hour" : "Late hour";
    }

    return {
      valenceDelta,
      arousalDelta,
      dominanceDelta,
      reason,
    };
  }

  /**
   * Apply adjustments to circumplex state
   */
  private applyAdjustments(
    state: CircumplexState,
    adjustments: {
      culturalAdjustment?: EmotionAdjustment;
      professionalAdjustment?: EmotionAdjustment;
      situationalAdjustment?: EmotionAdjustment;
    }
  ): CircumplexState {
    let valence = state.valence;
    let arousal = state.arousal;
    let dominance = state.dominance;

    // Apply cultural adjustment
    if (adjustments.culturalAdjustment) {
      valence += adjustments.culturalAdjustment.valenceDelta;
      arousal += adjustments.culturalAdjustment.arousalDelta;
      dominance += adjustments.culturalAdjustment.dominanceDelta;
    }

    // Apply professional adjustment
    if (adjustments.professionalAdjustment) {
      valence += adjustments.professionalAdjustment.valenceDelta;
      arousal += adjustments.professionalAdjustment.arousalDelta;
      dominance += adjustments.professionalAdjustment.dominanceDelta;
    }

    // Apply situational adjustment
    if (adjustments.situationalAdjustment) {
      valence += adjustments.situationalAdjustment.valenceDelta;
      arousal += adjustments.situationalAdjustment.arousalDelta;
      dominance += adjustments.situationalAdjustment.dominanceDelta;
    }

    // Clamp to valid ranges
    valence = Math.max(-1, Math.min(1, valence));
    arousal = Math.max(0, Math.min(1, arousal));
    dominance = Math.max(-1, Math.min(1, dominance));

    return {
      valence,
      arousal,
      dominance,
      confidence: state.confidence,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate overall confidence based on available context
   */
  private calculateOverallConfidence(
    baseConfidence: number,
    options: ContextualProcessingOptions,
    contextFactors?: EmotionalContext
  ): number {
    let confidence = baseConfidence;

    // Increase confidence with conversation history
    if (contextFactors && contextFactors.recentEmotions.length > 0) {
      confidence += 0.1;
    }

    // Increase confidence with cultural context
    if (options.culturalContext) {
      confidence += 0.05;
    }

    // Increase confidence with professional context
    if (options.professionalContext) {
      confidence += 0.05;
    }

    // Increase confidence with situational context
    if (options.situation) {
      confidence += 0.05;
    }

    // Clamp to valid range
    return Math.max(0, Math.min(1, confidence));
  }
}
