/**
 * Scenes Index
 *
 * Export all screen components for the Memory Exploration UI.
 */

export { Dashboard } from './Dashboard';
export type {
  CognitiveSession,
  DashboardProps,
  GraphPreviewNode,
  PinnedMemoryItem,
  QuickStats,
  RecentMemoryItem,
  SuggestedAction,
} from './Dashboard';

export { ReasoningConsole } from './ReasoningConsole';
export type { ReasoningConsoleProps } from './ReasoningConsole';

export { ProblemDecomposition } from './ProblemDecomposition';
export type { ProblemDecompositionProps } from './ProblemDecomposition';

export { FRAMEWORKS, FrameworkAnalysis, recommendFramework } from './FrameworkAnalysis';
export type { FrameworkAnalysisProps } from './FrameworkAnalysis';

export { ConfidenceBiasDashboard, getSeverityColorClass } from './ConfidenceBiasDashboard';
export type { ConfidenceBiasDashboardProps } from './ConfidenceBiasDashboard';

export { EmotionAnalysis } from './EmotionAnalysis';
export type { EmotionAnalysisProps } from './EmotionAnalysis';

export { MemoryManagement } from './MemoryManagement';
export type { default as MemoryManagementDefault } from './MemoryManagement';
