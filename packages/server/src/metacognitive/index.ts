/**
 * Metacognitive Monitoring Module
 *
 * Exports metacognitive monitoring types and PerformanceMonitoringSystem class
 * for tracking reasoning quality, confidence calibration, bias detection effectiveness,
 * framework selection accuracy, and user satisfaction for self-improvement.
 */

// Export all types
export * from "./types";

// Export main classes
export { AdaptiveStrategySystem } from "./adaptive-strategy-system";
export { PerformanceMonitoringSystem } from "./performance-monitoring-system";
export {
  FeedbackIntegrator,
  OutcomeTracker,
  PreferenceLearner,
  SelfImprovementSystem,
} from "./self-improvement-system";
