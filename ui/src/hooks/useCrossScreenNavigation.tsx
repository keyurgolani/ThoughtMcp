/**
 * useCrossScreenNavigation Hook
 *
 * Provides cross-screen navigation functionality, allowing quick switching
 * to Memory Explorer from cognitive screens with optional memory context.
 *
 * Requirements: 23.4
 */

import { useCallback, useMemo } from 'react';
import type { ScreenId } from '../components/navigation/MainNavigation';

// ============================================================================
// Types
// ============================================================================

export interface NavigationTarget {
  /** Target screen ID */
  screenId: ScreenId;
  /** Optional memory ID to focus on */
  memoryId?: string | undefined;
  /** Optional search query to apply */
  searchQuery?: string | undefined;
  /** Additional context data */
  context?: Record<string, unknown> | undefined;
}

export interface CrossScreenNavigationOptions {
  /** Current screen ID */
  currentScreen: ScreenId;
  /** Callback to navigate to a screen */
  onNavigate: (target: NavigationTarget) => void;
  /** Whether navigation is currently disabled */
  disabled?: boolean;
}

export interface CrossScreenNavigationResult {
  /** Navigate to Memory Explorer */
  goToExplorer: (memoryId?: string) => void;
  /** Navigate to Memory Explorer with a specific memory */
  viewMemory: (memoryId: string) => void;
  /** Navigate to Reasoning Console with optional problem */
  goToReasoning: (problem?: string) => void;
  /** Navigate to Framework Analysis with optional problem */
  goToFramework: (problem?: string) => void;
  /** Navigate to Problem Decomposition with optional problem */
  goToDecomposition: (problem?: string) => void;
  /** Navigate to Confidence & Bias with optional text */
  goToConfidenceBias: (text?: string) => void;
  /** Navigate to Emotion Analysis with optional text */
  goToEmotionAnalysis: (text?: string) => void;
  /** Navigate to any screen */
  navigateTo: (target: NavigationTarget) => void;
  /** Whether currently on Memory Explorer */
  isOnExplorer: boolean;
  /** Whether currently on a cognitive screen */
  isOnCognitiveScreen: boolean;
  /** Whether navigation is disabled */
  isDisabled: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const COGNITIVE_SCREENS: ScreenId[] = [
  'reasoning-console',
  'framework-analysis',
  'problem-decomposition',
  'confidence-bias',
  'emotion-analysis',
];

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for cross-screen navigation
 *
 * Provides convenient methods for navigating between screens,
 * especially for quick switching to Memory Explorer from cognitive screens.
 *
 * Requirements: 23.4
 */
export function useCrossScreenNavigation(
  options: CrossScreenNavigationOptions
): CrossScreenNavigationResult {
  const { currentScreen, onNavigate, disabled = false } = options;

  // Computed states
  const isOnExplorer = currentScreen === 'memory-explorer';
  const isOnCognitiveScreen = COGNITIVE_SCREENS.includes(currentScreen);

  // Generic navigation
  const navigateTo = useCallback(
    (target: NavigationTarget) => {
      if (disabled) return;
      onNavigate(target);
    },
    [disabled, onNavigate]
  );

  // Navigate to Memory Explorer
  const goToExplorer = useCallback(
    (memoryId?: string) => {
      navigateTo({
        screenId: 'memory-explorer',
        memoryId,
      });
    },
    [navigateTo]
  );

  // Navigate to Memory Explorer with a specific memory
  const viewMemory = useCallback(
    (memoryId: string) => {
      navigateTo({
        screenId: 'memory-explorer',
        memoryId,
        context: { focusMemory: true },
      });
    },
    [navigateTo]
  );

  // Navigate to Reasoning Console
  const goToReasoning = useCallback(
    (problem?: string) => {
      navigateTo({
        screenId: 'reasoning-console',
        context:
          problem !== undefined && problem.length > 0 ? { initialProblem: problem } : undefined,
      });
    },
    [navigateTo]
  );

  // Navigate to Framework Analysis
  const goToFramework = useCallback(
    (problem?: string) => {
      navigateTo({
        screenId: 'framework-analysis',
        context:
          problem !== undefined && problem.length > 0 ? { initialProblem: problem } : undefined,
      });
    },
    [navigateTo]
  );

  // Navigate to Problem Decomposition
  const goToDecomposition = useCallback(
    (problem?: string) => {
      navigateTo({
        screenId: 'problem-decomposition',
        context:
          problem !== undefined && problem.length > 0 ? { initialProblem: problem } : undefined,
      });
    },
    [navigateTo]
  );

  // Navigate to Confidence & Bias
  const goToConfidenceBias = useCallback(
    (text?: string) => {
      navigateTo({
        screenId: 'confidence-bias',
        context: text !== undefined && text.length > 0 ? { initialText: text } : undefined,
      });
    },
    [navigateTo]
  );

  // Navigate to Emotion Analysis
  const goToEmotionAnalysis = useCallback(
    (text?: string) => {
      navigateTo({
        screenId: 'emotion-analysis',
        context: text !== undefined && text.length > 0 ? { initialText: text } : undefined,
      });
    },
    [navigateTo]
  );

  return useMemo(
    () => ({
      goToExplorer,
      viewMemory,
      goToReasoning,
      goToFramework,
      goToDecomposition,
      goToConfidenceBias,
      goToEmotionAnalysis,
      navigateTo,
      isOnExplorer,
      isOnCognitiveScreen,
      isDisabled: disabled,
    }),
    [
      goToExplorer,
      viewMemory,
      goToReasoning,
      goToFramework,
      goToDecomposition,
      goToConfidenceBias,
      goToEmotionAnalysis,
      navigateTo,
      isOnExplorer,
      isOnCognitiveScreen,
      disabled,
    ]
  );
}

// ============================================================================
// Utility Component: ExplorerLink
// ============================================================================

export interface ExplorerLinkProps {
  /** Memory ID to navigate to */
  memoryId: string;
  /** Link text */
  children: React.ReactNode;
  /** Click handler from useCrossScreenNavigation */
  onViewMemory: (memoryId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline link component for navigating to Memory Explorer
 *
 * Requirements: 23.4
 */
export function ExplorerLink({
  memoryId,
  children,
  onViewMemory,
  className = '',
}: ExplorerLinkProps): React.ReactElement {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onViewMemory(memoryId);
    },
    [memoryId, onViewMemory]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onViewMemory(memoryId);
      }
    },
    [memoryId, onViewMemory]
  );

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        text-ui-accent-primary
        hover:text-ui-accent-secondary
        underline underline-offset-2
        transition-colors duration-200
        cursor-pointer
        ${className}
      `}
      aria-label="View memory in Explorer"
    >
      {children}
    </button>
  );
}

// ============================================================================
// Utility Component: ViewInExplorerButton
// ============================================================================

export interface ViewInExplorerButtonProps {
  /** Memory ID to navigate to */
  memoryId: string;
  /** Click handler from useCrossScreenNavigation */
  onViewMemory: (memoryId: string) => void;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button component for quick navigation to Memory Explorer
 *
 * Requirements: 23.4
 */
export function ViewInExplorerButton({
  memoryId,
  onViewMemory,
  size = 'md',
  className = '',
}: ViewInExplorerButtonProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onViewMemory(memoryId);
  }, [memoryId, onViewMemory]);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5
        ${sizeClasses[size]}
        bg-ui-accent-primary/20
        hover:bg-ui-accent-primary/30
        text-ui-accent-primary
        border border-ui-accent-primary/50
        rounded-lg
        transition-all duration-200
        ${className}
      `}
      aria-label="View in Memory Explorer"
    >
      <span aria-hidden="true">🧠</span>
      <span>View in Explorer</span>
    </button>
  );
}

export default useCrossScreenNavigation;
