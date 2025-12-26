/**
 * Scenes Index
 *
 * Export all screen components for the Memory Exploration UI.
 */

export { Dashboard } from "./Dashboard";
export type {
  CognitiveSession,
  DashboardProps,
  QuickStats,
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  RecentMemoryItem,
  SuggestedAction,
} from "./Dashboard";

export { ReasoningConsole } from "./ReasoningConsole";
export type { ReasoningConsoleProps } from "./ReasoningConsole";

export { FRAMEWORKS, recommendFramework } from "../utils/frameworkUtils";
export type { FrameworkAnalysisProps } from "./FrameworkAnalysis";
export { ProblemDecomposition } from "./ProblemDecomposition";
export type { ProblemDecompositionProps } from "./ProblemDecomposition";
export { FrameworkAnalysis };

import { FrameworkAnalysis } from "./FrameworkAnalysis";

export { getSeverityColorClass } from "../utils/dashboardUtils";
export { ConfidenceBiasDashboard } from "./ConfidenceBiasDashboard";
export type { ConfidenceBiasDashboardProps } from "./ConfidenceBiasDashboard";

export { EmotionAnalysis } from "./EmotionAnalysis";
export type { EmotionAnalysisProps } from "./EmotionAnalysis";

export { MemoryExplorer } from "./MemoryExplorer";
export type { default as MemoryExplorerDefault } from "./MemoryExplorer";

export { MemoryGraph } from "./MemoryGraph";
export type { MemoryGraphProps } from "./MemoryGraph";

// Reference graph implementations for style comparison (isolated, will be removed after selection)
export { MemoryGraph1 } from "./MemoryGraph1";
export { MemoryGraph2 } from "./MemoryGraph2";
export { MemoryGraph3 } from "./MemoryGraph3";
export { MemoryGraph4 } from "./MemoryGraph4";
export { MemoryGraph5 } from "./MemoryGraph5";
