/**
 * Emotion Detection Types
 *
 * Type definitions for the emotion detection system including
 * Circumplex model, discrete emotions, and emotional intelligence.
 */

/**
 * Circumplex emotional state with three dimensions
 */
export interface CircumplexState {
  /** Emotional positivity/negativity (-1 to +1) */
  valence: number;

  /** Emotional intensity/activation (0 to 1) */
  arousal: number;

  /** Sense of control/power (-1 to +1) */
  dominance: number;

  /** Confidence in the emotion detection (0 to 1) */
  confidence: number;

  /** Timestamp of the analysis */
  timestamp: Date;
}

/**
 * Emotion model configuration
 */
export interface EmotionModel {
  /** Model name (e.g., "lexicon-based", "ml-model") */
  name: string;

  /** Model version */
  version: string;
}

/**
 * Options for emotion analysis
 */
export interface EmotionAnalysisOptions {
  /** Whether to cache results for repeated text */
  cacheResults?: boolean;

  /** Timeout for analysis in milliseconds */
  timeout?: number;
}

/**
 * Discrete emotion types
 */
export type EmotionType =
  | "joy"
  | "sadness"
  | "anger"
  | "fear"
  | "disgust"
  | "surprise"
  | "pride"
  | "shame"
  | "guilt"
  | "gratitude"
  | "awe";

/**
 * Emotion classification result
 */
export interface EmotionClassification {
  /** Emotion type */
  emotion: EmotionType;

  /** Intensity score (0 to 1) */
  intensity: number;

  /** Confidence in classification (0 to 1) */
  confidence: number;

  /** Evidence words/phrases that triggered this emotion (optional) */
  evidence?: string[];
}

/**
 * Emotional features extracted from text
 */
export interface EmotionalFeatures {
  /** Positive sentiment words found */
  positiveWords: string[];

  /** Negative sentiment words found */
  negativeWords: string[];

  /** High arousal words found */
  highArousalWords: string[];

  /** Medium arousal words found */
  mediumArousalWords?: string[];

  /** Low arousal words found */
  lowArousalWords: string[];

  /** High dominance words found */
  highDominanceWords: string[];

  /** Low dominance words found */
  lowDominanceWords: string[];

  /** Intensity markers (exclamation marks, caps, etc.) */
  intensityMarkers: number;

  /** Total word count */
  wordCount: number;
}

/**
 * Message in conversation history with emotional state
 */
export interface Message {
  /** Unique message identifier */
  id: string;

  /** Message text content */
  text: string;

  /** Timestamp when message was sent */
  timestamp: Date;

  /** Emotional state detected in the message (optional) */
  emotionalState?: CircumplexState;

  /** Discrete emotions detected in the message (optional) */
  discreteEmotions?: EmotionClassification[];
}

/**
 * Emotional context extracted from conversation history
 */
export interface EmotionalContext {
  /** Recent emotional states from conversation */
  recentEmotions: CircumplexState[];

  /** Trend of emotional states over time */
  emotionalTrend: "improving" | "declining" | "stable";

  /** Most frequently occurring emotion in conversation (optional) */
  dominantEmotion?: EmotionType;

  /** Overall tone of the conversation */
  conversationTone: "positive" | "negative" | "neutral";
}

/**
 * Cultural context affecting emotion expression
 */
export interface CulturalContext {
  /** Cultural identifier (e.g., "western", "eastern", "latin", "nordic") */
  culture: string;

  /** Level of emotional expressiveness in the culture */
  emotionExpressiveness: "high" | "medium" | "low";

  /** Communication style directness */
  directness: "direct" | "indirect";
}

/**
 * Emotion adjustment based on cultural factors
 */
export interface EmotionAdjustment {
  /** Adjustment to valence dimension */
  valenceDelta: number;

  /** Adjustment to arousal dimension */
  arousalDelta: number;

  /** Adjustment to dominance dimension */
  dominanceDelta: number;

  /** Explanation for the adjustment */
  reason: string;
}

/**
 * Professional context for emotion adjustment
 */
export interface ProfessionalContext {
  /** Formality level of the setting */
  setting: "formal" | "informal" | "casual";

  /** Relationship between parties */
  relationship: "superior" | "peer" | "subordinate" | "client";

  /** Professional domain (e.g., "healthcare", "legal", "education") */
  domain: string;
}

/**
 * Situational factors affecting emotion expression
 */
export interface Situation {
  /** Level of urgency in the situation */
  urgency: "high" | "medium" | "low";

  /** Stakes or importance of the situation */
  stakes: "high" | "medium" | "low";

  /** Privacy level of the interaction */
  privacy: "public" | "private";

  /** Time of day (optional) */
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
}

/**
 * Options for contextual emotion processing
 */
export interface ContextualProcessingOptions {
  /** Conversation history for context (optional) */
  conversationHistory?: Message[];

  /** Cultural context for adjustments (optional) */
  culturalContext?: CulturalContext;

  /** Professional context for adjustments (optional) */
  professionalContext?: ProfessionalContext;

  /** Situational factors for adjustments (optional) */
  situation?: Situation;
}

/**
 * Complete contextual emotion detection result
 */
export interface ContextualEmotionResult {
  /** Circumplex emotional state */
  circumplex: CircumplexState;

  /** Discrete emotions detected */
  discreteEmotions: EmotionClassification[];

  /** Overall confidence in the detection (0 to 1) */
  confidence: number;

  /** Context factors that influenced the detection (optional) */
  contextFactors?: EmotionalContext;

  /** Adjustments made based on context (optional) */
  adjustments?: {
    /** Cultural adjustment applied */
    culturalAdjustment?: EmotionAdjustment;

    /** Professional context adjustment applied */
    professionalAdjustment?: EmotionAdjustment;

    /** Situational adjustment applied */
    situationalAdjustment?: EmotionAdjustment;
  };
}

/**
 * Emotional shift detection result
 */
export interface EmotionalShift {
  /** Emotional state before the shift */
  fromState: CircumplexState;

  /** Emotional state after the shift */
  toState: CircumplexState;

  /** Magnitude of the shift (0 to 1) */
  magnitude: number;

  /** Timestamp when the shift occurred */
  timestamp: Date;

  /** What caused the shift (if identifiable) */
  trigger?: string;
}

/**
 * Emotional pattern types
 */
export type EmotionalPatternType = "recurring" | "cyclical" | "progressive" | "reactive";

/**
 * Emotional pattern recognition result
 */
export interface EmotionalPattern {
  /** Type of pattern detected */
  type: EmotionalPatternType;

  /** Human-readable description of the pattern */
  description: string;

  /** How often this pattern occurs */
  frequency: number;

  /** Confidence in pattern detection (0 to 1) */
  confidence: number;

  /** Example states showing this pattern */
  examples: CircumplexState[];
}

/**
 * Emotional trigger identification result
 */
export interface EmotionalTrigger {
  /** What triggered the emotion */
  trigger: string;

  /** Which emotion was triggered */
  emotionType: EmotionType;

  /** How often this trigger causes this emotion */
  frequency: number;

  /** Average intensity when triggered (0 to 1) */
  averageIntensity: number;

  /** When this trigger last occurred */
  lastOccurrence: Date;
}

/**
 * Trajectory insight types
 */
export type TrajectoryInsightType = "trend" | "volatility" | "stability" | "recovery";

/**
 * Trajectory insight result
 */
export interface TrajectoryInsight {
  /** Type of insight */
  type: TrajectoryInsightType;

  /** Human-readable description */
  description: string;

  /** Confidence in the insight (0 to 1) */
  confidence: number;

  /** Optional recommendation based on insight */
  recommendation?: string;
}

/**
 * Trajectory statistics
 */
export interface TrajectoryStatistics {
  /** Total number of emotional states tracked */
  totalStates: number;

  /** Average valence across all states */
  averageValence: number;

  /** Average arousal across all states */
  averageArousal: number;

  /** Average dominance across all states */
  averageDominance: number;

  /** How much emotions fluctuate (0 to 1) */
  volatility: number;

  /** Duration of tracking in milliseconds */
  timeSpan: number;
}
