/**
 * UIStore - Zustand store for UI state management
 *
 * Manages UI state including clean mode, panel visibility,
 * and other UI-related state.
 *
 * Requirements: 46.1, 46.2, 46.5
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export interface UIState {
  /** Whether clean mode is enabled (hides all panels except minimal toolbar) */
  isCleanMode: boolean;
  /** Currently hovered panel ID (for edge hover behavior) */
  hoveredPanel: string | null;
  /** Set of panel IDs that are visible in clean mode due to hover */
  visiblePanels: Set<string>;
}

export interface UIActions {
  /** Toggle clean mode on/off */
  toggleCleanMode: () => void;
  /** Set clean mode state directly */
  setCleanMode: (enabled: boolean) => void;
  /** Set the currently hovered panel */
  setHoveredPanel: (panelId: string | null) => void;
  /** Add a panel to visible panels (for edge hover) */
  showPanel: (panelId: string) => void;
  /** Remove a panel from visible panels */
  hidePanel: (panelId: string) => void;
  /** Check if a panel should be visible */
  isPanelVisible: (panelId: string) => boolean;
}

export type UIStore = UIState & UIActions;

// ============================================================================
// Default Values
// ============================================================================

const initialState: UIState = {
  isCleanMode: false,
  hoveredPanel: null,
  visiblePanels: new Set<string>(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      toggleCleanMode: (): void => {
        const state = get();
        set({
          isCleanMode: !state.isCleanMode,
          // Clear visible panels when toggling clean mode
          visiblePanels: new Set<string>(),
          hoveredPanel: null,
        });
      },

      setCleanMode: (enabled: boolean): void => {
        set({
          isCleanMode: enabled,
          // Clear visible panels when changing clean mode
          visiblePanels: new Set<string>(),
          hoveredPanel: null,
        });
      },

      setHoveredPanel: (panelId: string | null): void => {
        const state = get();
        const newVisiblePanels = new Set(state.visiblePanels);

        // If we're hovering a panel in clean mode, make it visible
        if (panelId !== null && state.isCleanMode) {
          newVisiblePanels.add(panelId);
        }

        set({
          hoveredPanel: panelId,
          visiblePanels: newVisiblePanels,
        });
      },

      showPanel: (panelId: string): void => {
        const state = get();
        const newVisiblePanels = new Set(state.visiblePanels);
        newVisiblePanels.add(panelId);
        set({ visiblePanels: newVisiblePanels });
      },

      hidePanel: (panelId: string): void => {
        const state = get();
        const newVisiblePanels = new Set(state.visiblePanels);
        newVisiblePanels.delete(panelId);
        set({ visiblePanels: newVisiblePanels });
      },

      isPanelVisible: (panelId: string): boolean => {
        const state = get();
        // In normal mode, all panels are visible
        if (!state.isCleanMode) return true;
        // In clean mode, only visible panels or hovered panel are shown
        return state.visiblePanels.has(panelId) || state.hoveredPanel === panelId;
      },
    }),
    {
      name: 'thoughtmcp-ui-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isCleanMode: state.isCleanMode,
      }),
      // Custom serialization to handle Set
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<UIState>;
        return {
          ...currentState,
          isCleanMode: persisted.isCleanMode ?? currentState.isCleanMode,
          // Don't persist visiblePanels or hoveredPanel
          visiblePanels: new Set<string>(),
          hoveredPanel: null,
        };
      },
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select clean mode state
 */
export const selectIsCleanMode = (state: UIStore): boolean => state.isCleanMode;

/**
 * Select hovered panel
 */
export const selectHoveredPanel = (state: UIStore): string | null => state.hoveredPanel;

/**
 * Select visible panels
 */
export const selectVisiblePanels = (state: UIStore): Set<string> => state.visiblePanels;
