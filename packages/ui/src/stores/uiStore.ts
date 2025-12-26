/**
 * UIStore - Zustand store for UI state management
 *
 * Manages UI state including clean mode, panel visibility,
 * memory preview modal, and other UI-related state.
 *
 * Requirements: 46.1, 46.2, 46.5
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Memory } from "../types/api";

// ============================================================================
// Types
// ============================================================================

export interface MemoryPreviewState {
  /** Whether the memory preview modal is open */
  isOpen: boolean;
  /** The memory being previewed (null if closed) */
  memory: Memory | null;
  /** Current mode of the modal */
  mode: "view" | "edit";
}

export interface UIState {
  /** Whether clean mode is enabled (hides all panels except minimal toolbar) */
  isCleanMode: boolean;
  /** Currently hovered panel ID (for edge hover behavior) */
  hoveredPanel: string | null;
  /** Set of panel IDs that are visible in clean mode due to hover */
  visiblePanels: Set<string>;
  /** Memory preview modal state */
  memoryPreview: MemoryPreviewState;
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
  /** Open memory preview modal */
  openMemoryPreview: (memory: Memory) => void;
  /** Open memory edit modal directly */
  openMemoryEdit: (memory: Memory) => void;
  /** Close memory preview modal */
  closeMemoryPreview: () => void;
  /** Switch memory preview to edit mode */
  switchToEditMode: () => void;
  /** Switch memory preview to view mode (cancel edit) */
  switchToViewMode: () => void;
  /** Update the previewed memory (after edit) */
  updatePreviewedMemory: (updates: Partial<Memory>) => void;
}

export type UIStore = UIState & UIActions;

// ============================================================================
// Default Values
// ============================================================================

const initialMemoryPreviewState: MemoryPreviewState = {
  isOpen: false,
  memory: null,
  mode: "view",
};

const initialState: UIState = {
  isCleanMode: false,
  hoveredPanel: null,
  visiblePanels: new Set<string>(),
  memoryPreview: initialMemoryPreviewState,
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

      openMemoryPreview: (memory: Memory): void => {
        set({
          memoryPreview: {
            isOpen: true,
            memory,
            mode: "view",
          },
        });
      },

      openMemoryEdit: (memory: Memory): void => {
        set({
          memoryPreview: {
            isOpen: true,
            memory,
            mode: "edit",
          },
        });
      },

      closeMemoryPreview: (): void => {
        set({
          memoryPreview: initialMemoryPreviewState,
        });
      },

      switchToEditMode: (): void => {
        const state = get();
        if (state.memoryPreview.memory) {
          set({
            memoryPreview: {
              ...state.memoryPreview,
              mode: "edit",
            },
          });
        }
      },

      switchToViewMode: (): void => {
        const state = get();
        if (state.memoryPreview.memory) {
          set({
            memoryPreview: {
              ...state.memoryPreview,
              mode: "view",
            },
          });
        }
      },

      updatePreviewedMemory: (updates: Partial<Memory>): void => {
        const state = get();
        if (state.memoryPreview.memory) {
          set({
            memoryPreview: {
              ...state.memoryPreview,
              memory: { ...state.memoryPreview.memory, ...updates },
            },
          });
        }
      },
    }),
    {
      name: "thought-ui-state",
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

/**
 * Select memory preview state
 */
export const selectMemoryPreview = (state: UIStore): MemoryPreviewState => state.memoryPreview;

/**
 * Select if memory preview is open
 */
export const selectIsMemoryPreviewOpen = (state: UIStore): boolean => state.memoryPreview.isOpen;

/**
 * Select previewed memory
 */
export const selectPreviewedMemory = (state: UIStore): Memory | null => state.memoryPreview.memory;
