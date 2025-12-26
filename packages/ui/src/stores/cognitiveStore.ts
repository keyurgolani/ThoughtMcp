/**
 * CognitiveStore - Zustand store for cognitive operations
 *
 * Manages state for cognitive processing operations including
 * reasoning, analysis, confidence assessment, and bias detection.
 *
 * Requirements: 16.1-16.8, 22.1-22.4
 */

import { create } from 'zustand';
import type {
  AnalyzeResponse,
  AssessConfidenceResponse,
  DecomposeResponse,
  DetectBiasResponse,
  DetectEmotionResponse,
  EvaluateResponse,
  Memory,
  MetacognitionAnalyzeResponse,
  ParallelThinkResponse,
  ReasoningMode,
  ThinkResponse,
} from '../types/api';

// ============================================================================
// Types
// ============================================================================

export type CognitiveOperationType =
  | 'think'
  | 'think_parallel'
  | 'analyze'
  | 'decompose'
  | 'assess_confidence'
  | 'detect_bias'
  | 'detect_emotion'
  | 'evaluate';

export interface CognitiveOperation {
  /** Unique operation ID */
  id: string;
  /** Type of cognitive operation */
  type: CognitiveOperationType;
  /** Input problem/text */
  input: string;
  /** Reasoning mode (for think operations) */
  mode?: ReasoningMode | undefined;
  /** Operation start time */
  startedAt: number;
  /** Whether operation is in progress */
  isProcessing: boolean;
  /** Progress percentage (0-100) for parallel operations */
  progress?: number | undefined;
}

export type CognitiveResult =
  | { type: 'think'; data: ThinkResponse }
  | { type: 'think_parallel'; data: ParallelThinkResponse }
  | { type: 'analyze'; data: AnalyzeResponse }
  | { type: 'analyze_metacognition'; data: MetacognitionAnalyzeResponse }
  | { type: 'decompose'; data: DecomposeResponse }
  | { type: 'assess_confidence'; data: AssessConfidenceResponse }
  | { type: 'detect_bias'; data: DetectBiasResponse }
  | { type: 'detect_emotion'; data: DetectEmotionResponse }
  | { type: 'evaluate'; data: EvaluateResponse };

export interface ContextMemory {
  /** Memory data */
  memory: Memory;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Whether this memory is included in reasoning context */
  isIncluded: boolean;
  /** Whether this memory influenced the result */
  influencedResult?: boolean;
}

export interface CognitiveState {
  /** Currently active operation (if any) */
  activeOperation: CognitiveOperation | null;
  /** Results from completed operations (keyed by operation ID) */
  results: Map<string, CognitiveResult>;
  /** Context memories for memory-augmented reasoning */
  contextMemories: ContextMemory[];
  /** Error state */
  error: string | null;
  /** History of recent operations (for quick access) */
  recentOperations: Array<{ id: string; type: CognitiveOperationType; timestamp: number }>;
  /** Maximum number of recent operations to keep */
  maxRecentOperations: number;
}

export interface CognitiveActions {
  /** Start a new cognitive operation */
  startOperation: (type: CognitiveOperationType, input: string, mode?: ReasoningMode) => string;
  /** Update operation progress */
  updateProgress: (operationId: string, progress: number) => void;
  /** Complete an operation with result */
  completeOperation: (operationId: string, result: CognitiveResult) => void;
  /** Fail an operation with error */
  failOperation: (operationId: string, error: string) => void;
  /** Cancel the active operation */
  cancelOperation: () => void;
  /** Set context memories for reasoning */
  setContextMemories: (memories: ContextMemory[]) => void;
  /** Toggle inclusion of a context memory */
  toggleContextMemoryInclusion: (memoryId: string) => void;
  /** Mark memories that influenced the result */
  setInfluencedMemories: (memoryIds: string[]) => void;
  /** Clear context memories */
  clearContextMemories: () => void;
  /** Get result by operation ID */
  getResult: (operationId: string) => CognitiveResult | undefined;
  /** Clear a specific result */
  clearResult: (operationId: string) => void;
  /** Clear all results */
  clearAllResults: () => void;
  /** Set error state */
  setError: (error: string | null) => void;
}

export type CognitiveStore = CognitiveState & CognitiveActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: CognitiveState = {
  activeOperation: null,
  results: new Map(),
  contextMemories: [],
  error: null,
  recentOperations: [],
  maxRecentOperations: 20,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique operation ID
 */
function generateOperationId(): string {
  return `op-${String(Date.now())}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useCognitiveStore = create<CognitiveStore>((set, get) => ({
  ...initialState,

  startOperation: (type: CognitiveOperationType, input: string, mode?: ReasoningMode): string => {
    const id = generateOperationId();

    const operation: CognitiveOperation = {
      id,
      type,
      input,
      mode,
      startedAt: Date.now(),
      isProcessing: true,
      progress: type === 'think_parallel' ? 0 : undefined,
    };

    set({
      activeOperation: operation,
      error: null,
    });

    return id;
  },

  updateProgress: (operationId: string, progress: number): void => {
    const state = get();
    if (state.activeOperation?.id === operationId) {
      set({
        activeOperation: {
          ...state.activeOperation,
          progress: Math.min(100, Math.max(0, progress)),
        },
      });
    }
  },

  completeOperation: (operationId: string, result: CognitiveResult): void => {
    const state = get();

    // Only complete if this is the active operation
    if (state.activeOperation?.id !== operationId) {
      return;
    }

    const results = new Map(state.results);
    results.set(operationId, result);

    // Add to recent operations
    const recentOperations = [
      { id: operationId, type: state.activeOperation.type, timestamp: Date.now() },
      ...state.recentOperations,
    ].slice(0, state.maxRecentOperations);

    set({
      activeOperation: null,
      results,
      recentOperations,
      error: null,
    });
  },

  failOperation: (operationId: string, error: string): void => {
    const state = get();

    // Only fail if this is the active operation
    if (state.activeOperation?.id !== operationId) {
      return;
    }

    set({
      activeOperation: null,
      error,
    });
  },

  cancelOperation: (): void => {
    set({
      activeOperation: null,
      error: null,
    });
  },

  setContextMemories: (memories: ContextMemory[]): void => {
    set({ contextMemories: memories });
  },

  toggleContextMemoryInclusion: (memoryId: string): void => {
    const state = get();
    set({
      contextMemories: state.contextMemories.map((cm) =>
        cm.memory.id === memoryId ? { ...cm, isIncluded: !cm.isIncluded } : cm
      ),
    });
  },

  setInfluencedMemories: (memoryIds: string[]): void => {
    const state = get();
    const influencedSet = new Set(memoryIds);
    set({
      contextMemories: state.contextMemories.map((cm) => ({
        ...cm,
        influencedResult: influencedSet.has(cm.memory.id),
      })),
    });
  },

  clearContextMemories: (): void => {
    set({ contextMemories: [] });
  },

  getResult: (operationId: string): CognitiveResult | undefined => {
    const state = get();
    return state.results.get(operationId);
  },

  clearResult: (operationId: string): void => {
    const state = get();
    const results = new Map(state.results);
    results.delete(operationId);
    set({ results });
  },

  clearAllResults: (): void => {
    set({ results: new Map(), recentOperations: [] });
  },

  setError: (error: string | null): void => {
    set({ error });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Check if an operation is in progress
 */
export const selectIsProcessing = (state: CognitiveStore): boolean =>
  state.activeOperation?.isProcessing === true;

/**
 * Get active operation type
 */
export const selectActiveOperationType = (state: CognitiveStore): CognitiveOperationType | null =>
  state.activeOperation?.type ?? null;

/**
 * Get operation progress (for parallel operations)
 */
export const selectOperationProgress = (state: CognitiveStore): number | undefined =>
  state.activeOperation?.progress;

/**
 * Get included context memories
 */
export const selectIncludedContextMemories = (state: CognitiveStore): ContextMemory[] =>
  state.contextMemories.filter((cm) => cm.isIncluded);

/**
 * Get excluded context memories
 */
export const selectExcludedContextMemories = (state: CognitiveStore): ContextMemory[] =>
  state.contextMemories.filter((cm) => !cm.isIncluded);

/**
 * Get memories that influenced the result
 */
export const selectInfluencedMemories = (state: CognitiveStore): ContextMemory[] =>
  state.contextMemories.filter((cm) => cm.influencedResult === true);

/**
 * Get recent operations
 */
export const selectRecentOperations = (
  state: CognitiveStore
): Array<{ id: string; type: CognitiveOperationType; timestamp: number }> => state.recentOperations;

/**
 * Get result count
 */
export const selectResultCount = (state: CognitiveStore): number => state.results.size;

/**
 * Check if there's an error
 */
export const selectHasError = (state: CognitiveStore): boolean => state.error !== null;
