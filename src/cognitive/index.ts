/**
 * Cognitive Architecture Components
 *
 * This module exports all the cognitive components that make up the
 * human-like thinking system.
 */

export { CognitiveOrchestrator } from "./CognitiveOrchestrator.js";
export { ConsolidationEngine } from "./ConsolidationEngine.js";
export { DeliberativeProcessor } from "./DeliberativeProcessor.js";
export { DualProcessController } from "./DualProcessController.js";
export { DynamicFrameworkSelector } from "./DynamicFrameworkSelector.js";
export { EmotionalProcessor } from "./EmotionalProcessor.js";
export { EpisodicMemory } from "./EpisodicMemory.js";
export { IntuitiveProcessor } from "./IntuitiveProcessor.js";
export { MemorySystem } from "./MemorySystem.js";
export { MetacognitionModule } from "./MetacognitionModule.js";
export { ParallelReasoningProcessor } from "./ParallelReasoningProcessor.js";
export { PredictiveProcessor } from "./PredictiveProcessor.js";
export { ProblemAnalyzer } from "./ProblemAnalyzer.js";
export { RealTimeProblemDecomposer } from "./RealTimeProblemDecomposer.js";
export { SemanticMemory } from "./SemanticMemory.js";
export { SensoryProcessor } from "./SensoryProcessor.js";
export { StochasticNeuralProcessor } from "./StochasticNeuralProcessor.js";
export { StreamSynchronizationManager } from "./StreamSynchronizationManager.js";
export { SystematicThinkingOrchestrator } from "./SystematicThinkingOrchestrator.js";
export { WorkingMemoryModule } from "./WorkingMemoryModule.js";

// Export stream classes
export { AnalyticalReasoningStream } from "./streams/AnalyticalReasoningStream.js";
export { BaseReasoningStream } from "./streams/BaseReasoningStream.js";
export { CreativeReasoningStream } from "./streams/CreativeReasoningStream.js";
export { CriticalReasoningStream } from "./streams/CriticalReasoningStream.js";
export { SyntheticReasoningStream } from "./streams/SyntheticReasoningStream.js";

// Export forgetting system components
export {
  ForgettingDecisionSynthesizer,
  ForgettingEvaluationEngine,
  ImportanceBasedStrategyImpl,
  InterferenceBasedStrategyImpl,
  MemoryUsageAnalyzer,
  TemporalDecayStrategyImpl,
} from "./forgetting/index.js";
