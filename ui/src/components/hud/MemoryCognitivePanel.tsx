/**
 * MemoryCognitivePanel Component
 *
 * Dedicated panel for applying ThoughtMCP's cognitive processing features to memories.
 * Provides buttons for Analyze Reasoning, Detect Bias, Assess Confidence, Detect Emotion,
 * and Decompose operations with result display and save-as-memory functionality.
 *
 * Requirements: 16.1-16.8
 */

import { useCallback, useState } from 'react';
import { getDefaultClient } from '../../api/client';
import { selectIsProcessing, useCognitiveStore } from '../../stores/cognitiveStore';
import type {
  AssessConfidenceResponse,
  DecomposeResponse,
  DetectBiasResponse,
  DetectEmotionResponse,
  EvaluateResponse,
  Memory,
} from '../../types/api';

// ============================================================================
// Types
// ============================================================================

export type CognitiveActionType =
  | 'analyze-reasoning'
  | 'detect-bias'
  | 'assess-confidence'
  | 'detect-emotion'
  | 'decompose';

export interface MemoryCognitivePanelProps {
  /** The memory to perform cognitive operations on */
  memory: Memory;
  /** Callback when a result is ready to display */
  onShowResult?: (result: CognitiveResultData) => void;
  /** Callback when a new memory is created from cognitive insights */
  onMemoryCreated?: (memoryId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export interface AnalyzeReasoningResult {
  type: 'analyze-reasoning';
  data: EvaluateResponse;
}

export interface DetectBiasResult {
  type: 'detect-bias';
  data: DetectBiasResponse;
}

export interface AssessConfidenceResult {
  type: 'assess-confidence';
  data: AssessConfidenceResponse;
}

export interface DetectEmotionResult {
  type: 'detect-emotion';
  data: DetectEmotionResponse;
}

export interface DecomposeResult {
  type: 'decompose';
  data: DecomposeResponse;
}

export type CognitiveResultData =
  | AnalyzeReasoningResult
  | DetectBiasResult
  | AssessConfidenceResult
  | DetectEmotionResult
  | DecomposeResult;

// ============================================================================
// Constants
// ============================================================================

const ACTION_DESCRIPTIONS: Record<CognitiveActionType, string> = {
  'analyze-reasoning': 'Evaluate reasoning quality, coherence, and completeness',
  'detect-bias': 'Identify cognitive biases in the memory content',
  'assess-confidence': 'Multi-dimensional confidence assessment',
  'detect-emotion': 'Analyze emotional content using Circumplex model',
  decompose: 'Break down complex content into sub-problems',
};

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper
 * Requirements: 16.7
 */
function GlassPanel({ children, className = '' }: GlassPanelProps): React.ReactElement {
  return (
    <div
      className={`
        bg-ui-surface
        backdrop-blur-glass
        border border-ui-border
        rounded-lg
        shadow-glow
        ${className}
      `}
      style={{
        boxShadow: `
          0 0 20px rgba(0, 255, 255, 0.15),
          inset 0 0 30px rgba(0, 255, 255, 0.05)
        `,
      }}
    >
      {children}
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: number;
}

/**
 * Loading spinner component
 */
function LoadingSpinner({ size = 20 }: LoadingSpinnerProps): React.ReactElement {
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

interface CognitiveButtonProps {
  action: CognitiveActionType;
  label: string;
  icon: React.ReactNode;
  isLoading: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

/**
 * Individual cognitive action button
 * Requirements: 16.1
 */
function CognitiveButton({
  action,
  label,
  icon,
  isLoading,
  isDisabled,
  onClick,
}: CognitiveButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled || isLoading}
      title={ACTION_DESCRIPTIONS[action]}
      className={`
        flex items-center gap-2
        px-3 py-2 rounded-lg
        transition-all duration-200
        text-sm font-medium
        ${
          isDisabled || isLoading
            ? 'bg-ui-border/50 text-ui-text-muted cursor-not-allowed'
            : 'bg-ui-border hover:bg-ui-accent-primary/20 text-ui-text-primary hover:text-ui-accent-primary'
        }
      `}
      aria-label={`${label} - ${ACTION_DESCRIPTIONS[action]}`}
      aria-busy={isLoading}
    >
      {isLoading ? <LoadingSpinner size={16} /> : <span className="w-4 h-4">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// Icons
// ============================================================================

const AnalyzeIcon = (): React.ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);

const BiasIcon = (): React.ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const ConfidenceIcon = (): React.ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const EmotionIcon = (): React.ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const DecomposeIcon = (): React.ReactElement => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

// ============================================================================
// Main Component
// ============================================================================

/**
 * MemoryCognitivePanel - Cognitive processing tools for memories
 *
 * Features:
 * - Analyze Reasoning: Evaluate reasoning quality, coherence, and completeness
 * - Detect Bias: Identify cognitive biases in memory content
 * - Assess Confidence: Multi-dimensional confidence assessment
 * - Detect Emotion: Analyze emotional content using Circumplex model
 * - Decompose: Break down complex content into sub-problems
 *
 * Requirements: 16.1-16.6
 */
export function MemoryCognitivePanel({
  memory,
  onShowResult,
  onMemoryCreated: _onMemoryCreated,
  className = '',
}: MemoryCognitivePanelProps): React.ReactElement {
  // Local loading state for each action
  const [loadingAction, setLoadingAction] = useState<CognitiveActionType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Global cognitive store state
  const isGlobalProcessing = useCognitiveStore(selectIsProcessing);
  const startOperation = useCognitiveStore((state) => state.startOperation);
  const completeOperation = useCognitiveStore((state) => state.completeOperation);
  const failOperation = useCognitiveStore((state) => state.failOperation);

  /**
   * Handle Analyze Reasoning action
   * Requirements: 16.2
   */
  const handleAnalyzeReasoning = useCallback(async () => {
    setLoadingAction('analyze-reasoning');
    setError(null);

    const operationId = startOperation('evaluate', memory.content);

    try {
      const client = getDefaultClient();
      const response = await client.evaluate({
        reasoning: memory.content,
        context: `${memory.primarySector} memory with salience ${String(memory.salience)}`,
        includeConfidence: true,
        includeBias: true,
        includeEmotion: false,
      });

      const result: AnalyzeReasoningResult = {
        type: 'analyze-reasoning',
        data: response,
      };

      completeOperation(operationId, { type: 'evaluate', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze reasoning';
      setError(message);
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  /**
   * Handle Detect Bias action
   * Requirements: 16.3
   */
  const handleDetectBias = useCallback(async () => {
    setLoadingAction('detect-bias');
    setError(null);

    const operationId = startOperation('detect_bias', memory.content);

    try {
      const client = getDefaultClient();
      const response = await client.detectBias({
        reasoning: memory.content,
        context: `${memory.primarySector} memory`,
      });

      const result: DetectBiasResult = {
        type: 'detect-bias',
        data: response,
      };

      completeOperation(operationId, { type: 'detect_bias', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect bias';
      setError(message);
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  /**
   * Handle Assess Confidence action
   * Requirements: 16.4
   */
  const handleAssessConfidence = useCallback(async () => {
    setLoadingAction('assess-confidence');
    setError(null);

    const operationId = startOperation('assess_confidence', memory.content);

    try {
      const client = getDefaultClient();
      const response = await client.assessConfidence({
        reasoning: memory.content,
        context: `${memory.primarySector} memory`,
      });

      const result: AssessConfidenceResult = {
        type: 'assess-confidence',
        data: response,
      };

      completeOperation(operationId, { type: 'assess_confidence', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assess confidence';
      setError(message);
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  /**
   * Handle Detect Emotion action
   * Requirements: 16.5
   */
  const handleDetectEmotion = useCallback(async () => {
    setLoadingAction('detect-emotion');
    setError(null);

    const operationId = startOperation('detect_emotion', memory.content);

    try {
      const client = getDefaultClient();
      const response = await client.detectEmotion({
        text: memory.content,
        includeDiscrete: true,
        context: `${memory.primarySector} memory`,
      });

      const result: DetectEmotionResult = {
        type: 'detect-emotion',
        data: response,
      };

      completeOperation(operationId, { type: 'detect_emotion', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to detect emotion';
      setError(message);
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  /**
   * Handle Decompose action
   * Requirements: 16.6
   */
  const handleDecompose = useCallback(async () => {
    setLoadingAction('decompose');
    setError(null);

    const operationId = startOperation('decompose', memory.content);

    try {
      const client = getDefaultClient();
      const response = await client.decompose({
        problem: memory.content,
        maxDepth: 3,
        userId: memory.userId,
      });

      const result: DecomposeResult = {
        type: 'decompose',
        data: response,
      };

      completeOperation(operationId, { type: 'decompose', data: response });
      onShowResult?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to decompose';
      setError(message);
      failOperation(operationId, message);
    } finally {
      setLoadingAction(null);
    }
  }, [memory, startOperation, completeOperation, failOperation, onShowResult]);

  // Determine if any action is loading
  const isAnyLoading = loadingAction !== null || isGlobalProcessing;

  return (
    <GlassPanel className={`p-4 ${className}`}>
      {/* Header */}
      <h3 className="text-sm font-semibold text-ui-accent-primary mb-3">Cognitive Tools</h3>
      <p className="text-xs text-ui-text-secondary mb-4">
        Apply cognitive processing to analyze this memory
      </p>

      {/* Error display */}
      {error !== null && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Cognitive action buttons - Requirements: 16.1 */}
      <div className="flex flex-col gap-2">
        <CognitiveButton
          action="analyze-reasoning"
          label="Analyze Reasoning"
          icon={<AnalyzeIcon />}
          isLoading={loadingAction === 'analyze-reasoning'}
          isDisabled={isAnyLoading && loadingAction !== 'analyze-reasoning'}
          onClick={() => void handleAnalyzeReasoning()}
        />
        <CognitiveButton
          action="detect-bias"
          label="Detect Bias"
          icon={<BiasIcon />}
          isLoading={loadingAction === 'detect-bias'}
          isDisabled={isAnyLoading && loadingAction !== 'detect-bias'}
          onClick={() => void handleDetectBias()}
        />
        <CognitiveButton
          action="assess-confidence"
          label="Assess Confidence"
          icon={<ConfidenceIcon />}
          isLoading={loadingAction === 'assess-confidence'}
          isDisabled={isAnyLoading && loadingAction !== 'assess-confidence'}
          onClick={() => void handleAssessConfidence()}
        />
        <CognitiveButton
          action="detect-emotion"
          label="Detect Emotion"
          icon={<EmotionIcon />}
          isLoading={loadingAction === 'detect-emotion'}
          isDisabled={isAnyLoading && loadingAction !== 'detect-emotion'}
          onClick={() => void handleDetectEmotion()}
        />
        <CognitiveButton
          action="decompose"
          label="Decompose"
          icon={<DecomposeIcon />}
          isLoading={loadingAction === 'decompose'}
          isDisabled={isAnyLoading && loadingAction !== 'decompose'}
          onClick={() => void handleDecompose()}
        />
      </div>

      {/* Loading indicator for global operations */}
      {isGlobalProcessing && loadingAction === null && (
        <div className="mt-3 flex items-center justify-center text-ui-text-secondary text-xs">
          <LoadingSpinner size={16} />
          <span className="ml-2">Processing...</span>
        </div>
      )}
    </GlassPanel>
  );
}

export default MemoryCognitivePanel;
