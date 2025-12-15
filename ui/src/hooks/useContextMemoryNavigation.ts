/**
 * useContextMemoryNavigation Hook
 *
 * Provides navigation functionality for context memories.
 * Allows navigating from cognitive processing screens to the Memory Explorer
 * to view a specific memory.
 *
 * Requirements: 22.5
 */

import { useCallback } from 'react';
import { useNavigationStore } from '../stores/navigationStore';

// ============================================================================
// Types
// ============================================================================

export interface UseContextMemoryNavigationOptions {
  /** Callback to switch to Memory Explorer screen */
  onSwitchToExplorer?: () => void;
  /** Callback after navigation is initiated */
  onNavigationStarted?: (memoryId: string) => void;
}

export interface UseContextMemoryNavigationReturn {
  /** Navigate to a memory in the Memory Explorer */
  navigateToMemory: (memoryId: string, label?: string) => void;
  /** Check if navigation is possible */
  canNavigate: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for navigating to context memories in the Memory Explorer
 *
 * This hook provides a way to navigate from cognitive processing screens
 * (like ReasoningConsole, FrameworkAnalysis, etc.) to view a specific
 * memory in the Memory Explorer.
 *
 * Requirements: 22.5
 */
export function useContextMemoryNavigation(
  options: UseContextMemoryNavigationOptions = {}
): UseContextMemoryNavigationReturn {
  const { onSwitchToExplorer, onNavigationStarted } = options;

  // Get navigation store state
  const isTransitioning = useNavigationStore((state) => state.isTransitioning);
  const navigateTo = useNavigationStore((state) => state.navigateTo);

  /**
   * Navigate to a memory in the Memory Explorer
   *
   * This function:
   * 1. Adds the memory to navigation history
   * 2. Triggers the switch to Memory Explorer screen
   * 3. The Memory Explorer will then handle the actual 3D navigation
   *
   * Requirements: 22.5
   */
  const navigateToMemory = useCallback(
    (memoryId: string, label?: string) => {
      // Don't navigate during transitions
      if (isTransitioning) {
        return;
      }

      // Add to navigation history so the Memory Explorer knows where to go
      navigateTo(memoryId, label);

      // Notify that navigation has started
      onNavigationStarted?.(memoryId);

      // Switch to Memory Explorer screen
      onSwitchToExplorer?.();
    },
    [isTransitioning, navigateTo, onNavigationStarted, onSwitchToExplorer]
  );

  return {
    navigateToMemory,
    canNavigate: !isTransitioning,
  };
}

export default useContextMemoryNavigation;
