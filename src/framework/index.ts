/**
 * Framework module exports
 *
 * Provides problem classification, framework selection infrastructure,
 * systematic thinking framework implementations, and learning system
 * for adaptive framework selection based on outcomes and feedback.
 */

// Core infrastructure
export * from "./base-framework.js";
export * from "./framework-registry.js";
export * from "./framework-selector.js";
export * from "./problem-classifier.js";
export * from "./types.js";

// Learning system
export { FrameworkLearningSystem } from "./framework-learning.js";

// Framework implementations
export { CriticalThinkingFramework } from "./frameworks/critical-thinking.js";
export { DesignThinkingFramework } from "./frameworks/design-thinking.js";
export { RootCauseAnalysisFramework } from "./frameworks/root-cause-analysis.js";
export { ScientificMethodFramework } from "./frameworks/scientific-method.js";
export { SystemsThinkingFramework } from "./frameworks/systems-thinking.js";
