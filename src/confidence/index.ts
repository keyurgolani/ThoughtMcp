/**
 * Confidence Calibration System
 *
 * Multi-dimensional confidence assessment, calibration learning, and
 * confidence communication for the ThoughtMCP cognitive architecture.
 */

export { CalibrationLearningEngine } from "./calibration-learning-engine";
export type { CalibrationErrorByRange, ImprovementMetrics } from "./calibration-learning-engine";
export { ConfidenceCommunicationModule } from "./confidence-communication";
export type { InterpretationContext } from "./confidence-communication";
export { MultiDimensionalConfidenceAssessor } from "./multi-dimensional-assessor";
export * from "./types";
