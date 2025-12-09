/**
 * Bias Detection and Mitigation Module
 *
 * Exports bias detection and correction types, BiasPatternRecognizer class,
 * BiasCorrectionEngine for applying correction strategies to detected biases,
 * BiasCorrector for generating text-based correction suggestions,
 * and BiasMonitoringSystem for real-time continuous monitoring
 * of cognitive biases in reasoning chains.
 */

// Export all types
export * from "./types";

// Export main classes
export { BiasCorrectionEngine } from "./bias-correction-engine";
export {
  BiasCorrector,
  type BiasCorrectionSuggestion,
  type BiasWithCorrection,
} from "./bias-corrector";
export { BiasLearningSystem } from "./bias-learning-system";
export { BiasMonitoringSystem } from "./bias-monitoring-system";
export { BiasPatternRecognizer } from "./bias-pattern-recognizer";
