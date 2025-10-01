/**
 * Forgetting System Components
 *
 * Exports all forgetting-related components including strategies,
 * evaluation engines, decision synthesizers, memory analyzers,
 * audit systems, policy management, and secure deletion.
 */

export { ForgettingDecisionSynthesizer } from "./ForgettingDecisionSynthesizer.js";
export { ForgettingEvaluationEngine } from "./ForgettingEvaluationEngine.js";
export { GradualDegradationManager } from "./GradualDegradationManager.js";
export { ImportanceBasedStrategyImpl } from "./ImportanceBasedStrategy.js";
export { InterferenceBasedStrategyImpl } from "./InterferenceBasedStrategy.js";
export { MemoryUsageAnalyzer } from "./MemoryUsageAnalyzer.js";
export { RecoveryEngine } from "./RecoveryEngine.js";
export { TemporalDecayStrategyImpl } from "./TemporalDecayStrategy.js";

// Audit and control system components
export { ForgettingAuditSystem } from "./ForgettingAuditSystem.js";
export { ForgettingControlSystem } from "./ForgettingControlSystem.js";
export { ForgettingPolicyManager } from "./ForgettingPolicyManager.js";
export { SecureDeletionManager } from "./SecureDeletionManager.js";
