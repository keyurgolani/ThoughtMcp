/**
 * CognitiveToolsPanel Component
 *
 * HUD panel providing AI-powered tools for analyzing and transforming memories.
 * Includes Summarize, Transform, Find Similar, and Analyze actions with loading states.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useCallback, useState } from 'react';
import { getDefaultClient } from '../../api/client';
import { selectIsProcessing, useCognitiveStore } from '../../stores/cognitiveStore';
import { useGraphStore } from '../../stores/graphStore';
import type {
  AssessConfidenceResponse,
  DetectBiasResponse,
  Memory,
  SearchResultItem,
  ThinkResponse,
} from '../../types/api';

// ============================================================================
// Types
// ============================================================================

export type CognitiveToolAction = 'summarize' | 'transform' | 'find-similar' | 'analyze';

export interface CognitiveToolsPanelProps {
  /** The memory to perform actions on */
  memory: Memory;
  /** Callback when similar nodes are found (for highlighting in 3D view) */
  onSimilarNodesFound?: (nodeIds: string[]) => void;
  /** Callback when a result modal should be shown */
  onShowResult?: (result: CognitiveToolResult) => void;
  /** Additional CSS classes */
  className?: string;
  /** Layout mode - 'grid' for 2x2 grid, 'horizontal' for inline row */
  layout?: 'grid' | 'horizontal';
}

export interface SummarizeResult {
  type: 'summarize';
  summary: string;
  insights: string[];
  confidence: number;
}

export interface TransformResult {
  type: 'transform';
  transformed: string;
  mode: string;
}

export interface FindSimilarResult {
  type: 'find-similar';
  similarMemories: SearchResultItem[];
  highlightedNodeIds: string[];
}

export interface AnalyzeResult {
  type: 'analyze';
  confidence: AssessConfidenceResponse;
  bias: DetectBiasResponse;
}

export type CognitiveToolResult =
  | SummarizeResult
  | TransformResult
  | FindSimilarResult
  | AnalyzeResult;

// ============================================================================
// Constants
// ============================================================================

const TOOL_DESCRIPTIONS: Record<CognitiveToolAction, string> = {
  summarize: 'Generate an AI summary of this memory',
  transform: 'Transform the memory content',
  'find-similar': 'Find semantically similar memories',
  analyze: 'Analyze confidence and detect biases',
};

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper with cyan glow
 * Requirements: 23.5
 */
function GlassPanel({ children, className = '' }: GlassPanelProps): React.ReactElement {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: 'var(--theme-surface)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--theme-primary-glow)',
        boxShadow: `
          0 0 20px var(--theme-primary-glow),
          0 0 40px var(--theme-primary-bg),
          inset 0 0 30px var(--theme-primary-bg)
        `,
      }}
    >
      {children}
    </div>
  );
}

interface ToolButtonProps {
  action: CognitiveToolAction;
  label: string;
  icon: React.ReactNode;
  isLoading: boolean;
  isDisabled: boolean;
  onClick: () => void;
  layout?: 'grid' | 'horizontal';
}

/**
 * Individual tool button with loading state
 * Requirements: 9.1, 9.6
 */
function ToolButton({
  action,
  label,
  icon,
  isLoading,
  isDisabled,
  onClick,
  layout = 'grid',
}: ToolButtonProps): React.ReactElement {
  const isHorizontal = layout === 'horizontal';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled || isLoading}
      title={TOOL_DESCRIPTIONS[action]}
      className={`
        flex items-center justify-center
        rounded-lg
        transition-all duration-200
        ${isHorizontal ? 'flex-row gap-1.5 px-3 py-1.5' : 'flex-col p-3'}
        ${
          isDisabled || isLoading
            ? 'bg-ui-border/50 text-ui-text-muted cursor-not-allowed'
            : 'bg-ui-border hover:bg-ui-accent-primary/20 text-ui-text-primary hover:text-ui-accent-primary'
        }
      `}
      aria-label={`${label} - ${TOOL_DESCRIPTIONS[action]}`}
      aria-busy={isLoading}
    >
      <div className="relative flex items-center justify-center">
        {isLoading ? (
          <LoadingSpinner size={isHorizontal ? 14 : 24} />
        ) : (
          <span className={isHorizontal ? 'text-sm' : 'text-2xl'}>{icon}</span>
        )}
      </div>
      <span className={`font-medium ${isHorizontal ? 'text-xs' : 'text-xs mt-1'}`}>{label}</span>
    </button>
  );
}

interface LoadingSpinnerProps {
  size?: number;
}

/**
 * Loading spinner component
 * Requirements: 9.6
 */
function LoadingSpinner({ size = 24 }: LoadingSpinnerProps): React.ReactElement {
  return (
    <svg
      className="animate-spin text-ui-accent-primary"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Icons
// ============================================================================

const SummarizeIcon = (): React.ReactElement => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h10M4 18h14" />
  </svg>
);

const TransformIcon = (): React.ReactElement => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const FindSimilarIcon = (): React.ReactElement => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
    <path d="M11 8v6M8 11h6" />
  </svg>
);

const AnalyzeIcon = (): React.ReactElement => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * CognitiveToolsPanel - AI tools for memory analysis and transformation
 *
 * Features:
 * - Summarize: Generate AI summary of memory content
 * - Transform: Transform memory content (placeholder for future modes)
 * - Find Similar: Find semantically similar memories and highlight in 3D view
 * - Analyze: Assess confidence and detect biases
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
export function CognitiveToolsPanel({
  memory,
  onSimilarNodesFound,
  onShowResult,
  className = '',
  layout = 'grid',
}: CognitiveToolsPanelProps): React.ReactElement {
  // Local loading states for each action
  const [loadingAction, setLoadingAction] = useState<CognitiveToolAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<CognitiveToolAction | null>(null);

  // Global cognitive store state
  const isGlobalProcessing = useCognitiveStore(selectIsProcessing);
  const startOperation = useCognitiveStore((state) => state.startOperation);
  const completeOperation = useCognitiveStore((state) => state.completeOperation);
  const failOperation = useCognitiveStore((state) => state.failOperation);

  // Graph store for highlighting similar nodes
  const visibleNodes = useGraphStore((state) => state.visibleNodes);

  /**
   * Handle Summarize action
   * Requirements: 9.2
   */
  const handleSummarize = useCallback(async () => {
    setLoadingAction('summarize');
    setError(null);
    setLastFailedAction(null);

    const operationId = startOperation('think', memory.content, 'analytical');

    try {
      const client = getDefaultClient();
      const response: ThinkResponse = await client.think({
        input: `Summarize the following memory content and extract key insights:\n\n${memory.content}`,
        mode: 'analytical',
        userId: memory.userId,
        context: `This is a ${memory.primarySector} memory with salience ${String(memory.salience)} and strength ${String(memory.strength)}.`,
      });

      const result: SummarizeResult = {
        type: 'summarize',
        summary: response.conclusion,
        insights: response.thoughts.map((t) => t.content),
        confidence: response.confidence,
      };

      completeOperation(operationId, { type: 'think', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to summarize memory';
      setError(message);
      setLastFailedAction('summarize');
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  /**
   * Handle Transform action (placeholder for future implementation)
   */
  const handleTransform = useCallback(async () => {
    setLoadingAction('transform');
    setError(null);
    setLastFailedAction(null);

    const operationId = startOperation('think', memory.content, 'creative');

    try {
      const client = getDefaultClient();
      const response: ThinkResponse = await client.think({
        input: `Transform and enhance the following memory content with creative insights:\n\n${memory.content}`,
        mode: 'creative',
        userId: memory.userId,
      });

      const result: TransformResult = {
        type: 'transform',
        transformed: response.conclusion,
        mode: 'creative',
      };

      completeOperation(operationId, { type: 'think', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transform memory';
      setError(message);
      setLastFailedAction('transform');
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  /**
   * Handle Find Similar action
   * Requirements: 9.3
   */
  const handleFindSimilar = useCallback(async () => {
    setLoadingAction('find-similar');
    setError(null);
    setLastFailedAction(null);

    try {
      const client = getDefaultClient();
      const response = await client.searchMemories({
        userId: memory.userId,
        text: memory.content,
        minSimilarity: 0.5,
        limit: 10,
      });

      // Filter out the current memory and get IDs
      const similarMemories = response.results.filter((r) => r.id !== memory.id);
      const highlightedNodeIds = similarMemories.map((r) => r.id);

      // Filter to only include nodes that are visible in the 3D view
      const visibleHighlightedIds = highlightedNodeIds.filter((id) => visibleNodes.has(id));

      const result: FindSimilarResult = {
        type: 'find-similar',
        similarMemories,
        highlightedNodeIds: visibleHighlightedIds,
      };

      // Notify parent to highlight nodes in 3D view
      onSimilarNodesFound?.(visibleHighlightedIds);
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find similar memories';
      setError(message);
      setLastFailedAction('find-similar');
    } finally {
      setLoadingAction(null);
    }
  }, [memory, visibleNodes, onSimilarNodesFound, onShowResult]);

  /**
   * Handle Analyze action
   * Requirements: 9.4, 9.5, 30.4
   * Uses the unified /api/v1/metacognition/analyze endpoint for both confidence and bias
   */
  const handleAnalyze = useCallback(async () => {
    setLoadingAction('analyze');
    setError(null);
    setLastFailedAction(null);

    const operationId = startOperation('analyze', memory.content);

    try {
      const client = getDefaultClient();

      // Use the unified metacognition analyze endpoint (Requirement 30.4)
      // This returns both confidence and bias data in a single call
      const response = await client.analyzeMetacognition({
        reasoningChain: memory.content,
        context: `${memory.primarySector} memory with salience ${String(memory.salience)} and strength ${String(memory.strength)}`,
      });

      const result: AnalyzeResult = {
        type: 'analyze',
        confidence: response.confidence,
        bias: response.biases,
      };

      completeOperation(operationId, { type: 'analyze_metacognition', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze memory';
      setError(message);
      setLastFailedAction('analyze');
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  /**
   * Handle retry of the last failed action
   * Requirements: 30.5
   */
  const handleRetry = useCallback((): void => {
    if (lastFailedAction === null) return;

    switch (lastFailedAction) {
      case 'summarize':
        void handleSummarize();
        break;
      case 'transform':
        void handleTransform();
        break;
      case 'find-similar':
        void handleFindSimilar();
        break;
      case 'analyze':
        void handleAnalyze();
        break;
    }
  }, [lastFailedAction, handleSummarize, handleTransform, handleFindSimilar, handleAnalyze]);

  // Determine if any action is loading
  const isAnyLoading = loadingAction !== null || isGlobalProcessing;

  const isHorizontal = layout === 'horizontal';

  const toolButtons = (
    <div className={isHorizontal ? 'flex items-center gap-2' : 'grid grid-cols-2 gap-2'}>
      <ToolButton
        action="summarize"
        label="Summarize"
        icon={<SummarizeIcon />}
        isLoading={loadingAction === 'summarize'}
        isDisabled={isAnyLoading && loadingAction !== 'summarize'}
        onClick={() => void handleSummarize()}
        layout={layout}
      />
      <ToolButton
        action="transform"
        label="Transform"
        icon={<TransformIcon />}
        isLoading={loadingAction === 'transform'}
        isDisabled={isAnyLoading && loadingAction !== 'transform'}
        onClick={() => void handleTransform()}
        layout={layout}
      />
      <ToolButton
        action="find-similar"
        label={isHorizontal ? 'Similar' : 'Find Similar'}
        icon={<FindSimilarIcon />}
        isLoading={loadingAction === 'find-similar'}
        isDisabled={isAnyLoading && loadingAction !== 'find-similar'}
        onClick={() => void handleFindSimilar()}
        layout={layout}
      />
      <ToolButton
        action="analyze"
        label="Analyze"
        icon={<AnalyzeIcon />}
        isLoading={loadingAction === 'analyze'}
        isDisabled={isAnyLoading && loadingAction !== 'analyze'}
        onClick={() => void handleAnalyze()}
        layout={layout}
      />
    </div>
  );

  // Horizontal layout - simple div wrapper
  if (isHorizontal) {
    return (
      <div className={className}>
        {error !== null && (
          <div className="mb-0 mr-2 p-2 bg-red-500/20 border border-red-500/50 rounded">
            <p className="text-red-400 text-xs">Server unavailable</p>
          </div>
        )}
        {toolButtons}
      </div>
    );
  }

  // Grid layout - GlassPanel wrapper
  return (
    <GlassPanel className={`p-4 ${className}`}>
      <h3 className="text-sm font-semibold neon-text-subtle mb-3">AI Tools</h3>

      {error !== null && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded">
          <p className="text-red-400 text-xs mb-2">
            {error.includes('EAGAIN') || error.includes('ECONNREFUSED') || error.includes('fetch')
              ? 'Backend server not available. Start ThoughtMCP server to use AI tools.'
              : error}
          </p>
          {lastFailedAction !== null && (
            <button
              onClick={handleRetry}
              disabled={isAnyLoading}
              className="text-xs px-2 py-1 bg-red-500/30 hover:bg-red-500/50 text-red-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Retry {lastFailedAction.replace('-', ' ')}
            </button>
          )}
        </div>
      )}

      {toolButtons}

      {isGlobalProcessing && loadingAction === null && (
        <div className="mt-3 flex items-center justify-center text-ui-text-secondary text-xs">
          <LoadingSpinner size={16} />
          <span className="ml-2">Processing...</span>
        </div>
      )}
    </GlassPanel>
  );
}

export default CognitiveToolsPanel;
