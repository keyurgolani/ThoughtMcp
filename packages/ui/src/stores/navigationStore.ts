/**
 * NavigationStore - Zustand store for navigation history
 *
 * Manages navigation state including history, breadcrumbs,
 * and transition states for the memory exploration UI.
 *
 * Requirements: 4.4-4.8, 8.5
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbItem {
  /** Node ID */
  id: string;
  /** Display label (content preview) */
  label: string;
  /** Timestamp when visited */
  visitedAt: number;
}

export interface NavigationState {
  /** Stack of visited node IDs */
  history: string[];
  /** Current position in history (for back/forward) */
  historyIndex: number;
  /** Breadcrumb trail for display */
  breadcrumbs: BreadcrumbItem[];
  /** Whether a navigation transition is in progress */
  isTransitioning: boolean;
  /** Maximum history size */
  maxHistorySize: number;
}

export interface NavigationActions {
  /** Navigate to a new node */
  navigateTo: (nodeId: string, label?: string) => boolean;
  /** Go back in history */
  goBack: () => string | null;
  /** Go forward in history */
  goForward: () => string | null;
  /** Set transition state */
  setTransitioning: (value: boolean) => void;
  /** Clear navigation history */
  clearHistory: () => void;
  /** Check if can go back */
  canGoBack: () => boolean;
  /** Check if can go forward */
  canGoForward: () => boolean;
  /** Get current node ID from history */
  getCurrentNodeId: () => string | null;
  /** Get previous node ID from history */
  getPreviousNodeId: () => string | null;
}

export type NavigationStore = NavigationState & NavigationActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: NavigationState = {
  history: [],
  historyIndex: -1,
  breadcrumbs: [],
  isTransitioning: false,
  maxHistorySize: 100,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  ...initialState,

  navigateTo: (nodeId: string, label?: string): boolean => {
    const state = get();

    // Reject navigation during transition (Requirement 4.8)
    if (state.isTransitioning) {
      return false;
    }

    // Don't navigate to the same node
    const currentNodeId = state.history[state.historyIndex];
    if (currentNodeId === nodeId) {
      return false;
    }

    // Truncate forward history if we're not at the end
    const newHistory = state.history.slice(0, state.historyIndex + 1);

    // Add new node to history
    newHistory.push(nodeId);

    // Trim history if it exceeds max size
    if (newHistory.length > state.maxHistorySize) {
      newHistory.shift();
    }

    // Update breadcrumbs
    const newBreadcrumb: BreadcrumbItem = {
      id: nodeId,
      label: label ?? nodeId.substring(0, 8) + '...',
      visitedAt: Date.now(),
    };

    // Check if node already exists in breadcrumbs
    const existingIndex = state.breadcrumbs.findIndex((b) => b.id === nodeId);
    let newBreadcrumbs: BreadcrumbItem[];

    if (existingIndex >= 0) {
      // Truncate breadcrumbs to this point and update timestamp
      newBreadcrumbs = state.breadcrumbs.slice(0, existingIndex);
      newBreadcrumbs.push(newBreadcrumb);
    } else {
      // Add new breadcrumb
      newBreadcrumbs = [...state.breadcrumbs, newBreadcrumb];
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      breadcrumbs: newBreadcrumbs,
    });

    return true;
  },

  goBack: (): string | null => {
    const state = get();

    // Reject during transition (Requirement 4.8)
    if (state.isTransitioning) {
      return null;
    }

    // Check if we can go back
    if (state.historyIndex <= 0) {
      return null;
    }

    const newIndex = state.historyIndex - 1;
    const targetNodeId = state.history[newIndex];

    if (targetNodeId === undefined) {
      return null;
    }

    // Update breadcrumbs to reflect going back
    const targetBreadcrumbIndex = state.breadcrumbs.findIndex((b) => b.id === targetNodeId);
    const newBreadcrumbs =
      targetBreadcrumbIndex >= 0
        ? state.breadcrumbs.slice(0, targetBreadcrumbIndex + 1)
        : state.breadcrumbs;

    set({
      historyIndex: newIndex,
      breadcrumbs: newBreadcrumbs,
    });

    return targetNodeId;
  },

  goForward: (): string | null => {
    const state = get();

    // Reject during transition (Requirement 4.8)
    if (state.isTransitioning) {
      return null;
    }

    // Check if we can go forward
    if (state.historyIndex >= state.history.length - 1) {
      return null;
    }

    const newIndex = state.historyIndex + 1;
    const targetNodeId = state.history[newIndex];

    if (targetNodeId === undefined) {
      return null;
    }

    // Add breadcrumb for forward navigation
    const existingIndex = state.breadcrumbs.findIndex((b) => b.id === targetNodeId);
    let newBreadcrumbs: BreadcrumbItem[];

    if (existingIndex < 0) {
      newBreadcrumbs = [
        ...state.breadcrumbs,
        {
          id: targetNodeId,
          label: targetNodeId.substring(0, 8) + '...',
          visitedAt: Date.now(),
        },
      ];
    } else {
      newBreadcrumbs = state.breadcrumbs;
    }

    set({
      historyIndex: newIndex,
      breadcrumbs: newBreadcrumbs,
    });

    return targetNodeId;
  },

  setTransitioning: (value: boolean): void => {
    set({ isTransitioning: value });
  },

  clearHistory: (): void => {
    set(initialState);
  },

  canGoBack: (): boolean => {
    const state = get();
    return !state.isTransitioning && state.historyIndex > 0;
  },

  canGoForward: (): boolean => {
    const state = get();
    return !state.isTransitioning && state.historyIndex < state.history.length - 1;
  },

  getCurrentNodeId: (): string | null => {
    const state = get();
    if (state.historyIndex < 0 || state.historyIndex >= state.history.length) {
      return null;
    }
    return state.history[state.historyIndex] ?? null;
  },

  getPreviousNodeId: (): string | null => {
    const state = get();
    if (state.historyIndex <= 0) {
      return null;
    }
    return state.history[state.historyIndex - 1] ?? null;
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get the current breadcrumb trail
 */
export const selectBreadcrumbs = (state: NavigationStore): BreadcrumbItem[] => state.breadcrumbs;

/**
 * Get history length
 */
export const selectHistoryLength = (state: NavigationStore): number => state.history.length;

/**
 * Check if navigation is locked
 */
export const selectIsNavigationLocked = (state: NavigationStore): boolean => state.isTransitioning;

/**
 * Get navigation position info
 */
export const selectNavigationPosition = (
  state: NavigationStore
): { current: number; total: number } => ({
  current: state.historyIndex + 1,
  total: state.history.length,
});
