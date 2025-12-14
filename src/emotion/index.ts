/**
 * Emotion Detection Module
 *
 * Exports emotion detection components including:
 * - Circumplex Model emotion analyzer
 * - Discrete emotion classifier
 * - Contextual emotion processor
 * - Emotional trajectory tracker
 * - Emotion types and interfaces
 */

export { CircumplexEmotionAnalyzer } from "./circumplex-analyzer";
export { ContextualEmotionProcessor } from "./contextual-processor";
export { DiscreteEmotionClassifier } from "./discrete-emotion-classifier";
export { EmotionalTrajectoryTracker } from "./trajectory-tracker";
export type {
  CircumplexState,
  ContextualEmotionResult,
  ContextualProcessingOptions,
  CulturalContext,
  EmotionAdjustment,
  EmotionAnalysisOptions,
  EmotionClassification,
  EmotionModel,
  EmotionType,
  EmotionalContext,
  EmotionalFeatures,
  EmotionalPattern,
  EmotionalPatternType,
  EmotionalShift,
  EmotionalTrigger,
  Message,
  ProfessionalContext,
  Situation,
  TrajectoryInsight,
  TrajectoryInsightType,
  TrajectoryStatistics,
} from "./types";
