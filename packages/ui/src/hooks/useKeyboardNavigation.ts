/**
 * useKeyboardNavigation Hook
 *
 * Provides keyboard navigation for the Memory Exploration UI.
 * Supports Tab to cycle through nodes and Enter to select.
 *
 * Requirements: 13.1
 */

import { useCallback, useEffect, useState } from 'react';
import type { GraphNode } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardNavigationConfig {
  /** Whether keyboard navigation is enabled */
  enabled: boolean;
  /** Callback when a node is focused */
  onNodeFocus?: (nodeId: string | null) => void;
  /** Callback when a node is selected (Enter pressed) */
  onNodeSelect?: (nodeId: string) => void;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Whether to wrap around when reaching the end of the list */
  wrapAround?: boolean;
}

export interface KeyboardNavigationState {
  /** Currently focused node ID */
  focusedNodeId: string | null;
  /** Index of the focused node in the list */
  focusedIndex: number;
  /** Whether keyboard navigation is active */
  isActive: boolean;
}

export interface KeyboardNavigationActions {
  /** Focus the next node in the list */
  focusNext: () => void;
  /** Focus the previous node in the list */
  focusPrevious: () => void;
  /** Focus a specific node by ID */
  focusNode: (nodeId: string) => void;
  /** Clear focus */
  clearFocus: () => void;
  /** Select the currently focused node */
  selectFocused: () => void;
  /** Activate keyboard navigation */
  activate: () => void;
  /** Deactivate keyboard navigation */
  deactivate: () => void;
}

export interface UseKeyboardNavigationReturn
  extends KeyboardNavigationState, KeyboardNavigationActions {}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_KEYBOARD_NAVIGATION_CONFIG: KeyboardNavigationConfig = {
  enabled: true,
  wrapAround: true,
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for keyboard navigation through memory nodes.
 *
 * @param nodes - Array of nodes to navigate through
 * @param config - Configuration options
 * @returns Navigation state and actions
 *
 * Requirements: 13.1
 */
export function useKeyboardNavigation(
  nodes: GraphNode[],
  config: Partial<KeyboardNavigationConfig> = {}
): UseKeyboardNavigationReturn {
  const mergedConfig = { ...DEFAULT_KEYBOARD_NAVIGATION_CONFIG, ...config };
  const { enabled, onNodeFocus, onNodeSelect, onEscape, wrapAround } = mergedConfig;

  // State
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [isActive, setIsActive] = useState<boolean>(false);

  // Derived state
  const focusedNodeId =
    focusedIndex >= 0 && focusedIndex < nodes.length ? (nodes[focusedIndex]?.id ?? null) : null;

  // Focus next node
  const focusNext = useCallback(() => {
    if (!enabled || nodes.length === 0) return;

    setFocusedIndex((current) => {
      let nextIndex: number;
      if (current < 0) {
        // Start from the beginning
        nextIndex = 0;
      } else if (current >= nodes.length - 1) {
        // At the end
        nextIndex = wrapAround === true ? 0 : current;
      } else {
        nextIndex = current + 1;
      }
      return nextIndex;
    });
    setIsActive(true);
  }, [enabled, nodes.length, wrapAround]);

  // Focus previous node
  const focusPrevious = useCallback((): void => {
    if (!enabled || nodes.length === 0) return;

    setFocusedIndex((current) => {
      let prevIndex: number;
      if (current <= 0) {
        // At the beginning or not focused
        prevIndex = wrapAround === true ? nodes.length - 1 : 0;
      } else {
        prevIndex = current - 1;
      }
      return prevIndex;
    });
    setIsActive(true);
  }, [enabled, nodes.length, wrapAround]);

  // Focus a specific node by ID
  const focusNode = useCallback(
    (nodeId: string) => {
      if (!enabled) return;

      const index = nodes.findIndex((n) => n.id === nodeId);
      if (index >= 0) {
        setFocusedIndex(index);
        setIsActive(true);
      }
    },
    [enabled, nodes]
  );

  // Clear focus
  const clearFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  // Select the currently focused node
  const selectFocused = useCallback(() => {
    if (!enabled || focusedNodeId === null) return;
    onNodeSelect?.(focusedNodeId);
  }, [enabled, focusedNodeId, onNodeSelect]);

  // Activate keyboard navigation
  const activate = useCallback(() => {
    setIsActive(true);
    if (focusedIndex < 0 && nodes.length > 0) {
      setFocusedIndex(0);
    }
  }, [focusedIndex, nodes.length]);

  // Deactivate keyboard navigation
  const deactivate = useCallback(() => {
    setIsActive(false);
  }, []);

  // Notify when focus changes
  useEffect(() => {
    if (isActive) {
      onNodeFocus?.(focusedNodeId);
    }
  }, [focusedNodeId, isActive, onNodeFocus]);

  // Reset focus when nodes change
  useEffect(() => {
    if (focusedIndex >= nodes.length) {
      setFocusedIndex(nodes.length > 0 ? nodes.length - 1 : -1);
    }
  }, [nodes.length, focusedIndex]);

  // Keyboard event handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Don't handle if focus is in an input element
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.key) {
        case 'Tab':
          event.preventDefault();
          if (event.shiftKey) {
            focusPrevious();
          } else {
            focusNext();
          }
          break;

        case 'Enter':
        case ' ':
          if (isActive && focusedNodeId !== null) {
            event.preventDefault();
            selectFocused();
          }
          break;

        case 'Escape':
          if (isActive) {
            event.preventDefault();
            clearFocus();
            setIsActive(false);
            onEscape?.();
          }
          break;

        case 'ArrowDown':
        case 'ArrowRight':
          if (isActive) {
            event.preventDefault();
            focusNext();
          }
          break;

        case 'ArrowUp':
        case 'ArrowLeft':
          if (isActive) {
            event.preventDefault();
            focusPrevious();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    isActive,
    focusedNodeId,
    focusNext,
    focusPrevious,
    selectFocused,
    clearFocus,
    onEscape,
  ]);

  return {
    focusedNodeId,
    focusedIndex,
    isActive,
    focusNext,
    focusPrevious,
    focusNode,
    clearFocus,
    selectFocused,
    activate,
    deactivate,
  };
}

export default useKeyboardNavigation;
