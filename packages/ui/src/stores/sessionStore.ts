/**
 * SessionStore - Zustand store for session persistence
 *
 * Manages session state including bookmarks, saved paths,
 * filter settings, and local storage persistence.
 *
 * Requirements: 14.1-14.5
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { MemorySectorType } from '../types/api';

// ============================================================================
// Types
// ============================================================================

export interface Bookmark {
  /** Memory node ID */
  nodeId: string;
  /** Display label */
  label: string;
  /** Timestamp when bookmarked */
  createdAt: number;
  /** Optional notes */
  notes?: string | undefined;
}

export interface SavedPath {
  /** Unique path ID */
  id: string;
  /** Path name */
  name: string;
  /** Ordered list of node IDs */
  nodeIds: string[];
  /** Timestamp when saved */
  createdAt: number;
  /** Optional description */
  description?: string | undefined;
}

export interface FilterSettings {
  /** Text search query */
  searchQuery: string;
  /** Selected sector types to show */
  selectedSectors: MemorySectorType[];
  /** Minimum strength threshold (0-1) */
  minStrength: number;
  /** Minimum salience threshold (0-1) */
  minSalience: number;
}

export interface CameraPosition {
  /** Camera position [x, y, z] */
  position: [number, number, number];
  /** Camera rotation [x, y, z] */
  rotation: [number, number, number];
}

export interface ExplorationState {
  /** Current node ID */
  currentNodeId: string | null;
  /** Camera position and rotation */
  cameraPosition: CameraPosition | null;
  /** Current filter settings */
  filterSettings: FilterSettings;
}

export interface UIPreferences {
  /** Whether the sidebar is collapsed */
  sidebarCollapsed: boolean;
}

export interface SessionState {
  /** User's bookmarked nodes */
  bookmarks: Bookmark[];
  /** User's saved exploration paths */
  savedPaths: SavedPath[];
  /** Current filter settings */
  filterSettings: FilterSettings;
  /** Last exploration state (for restore) */
  lastExplorationState: ExplorationState | null;
  /** UI preferences (persisted across sessions) */
  uiPreferences: UIPreferences;
}

export interface SessionActions {
  // Bookmark actions
  /** Add a bookmark */
  addBookmark: (nodeId: string, label: string, notes?: string) => void;
  /** Remove a bookmark */
  removeBookmark: (nodeId: string) => void;
  /** Update bookmark notes */
  updateBookmarkNotes: (nodeId: string, notes: string) => void;
  /** Check if a node is bookmarked */
  isBookmarked: (nodeId: string) => boolean;

  // Path actions
  /** Save a path */
  savePath: (name: string, nodeIds: string[], description?: string) => string;
  /** Delete a saved path */
  deletePath: (pathId: string) => void;
  /** Update a saved path */
  updatePath: (pathId: string, updates: Partial<Omit<SavedPath, 'id' | 'createdAt'>>) => void;

  // Filter actions
  /** Update filter settings */
  setFilterSettings: (settings: Partial<FilterSettings>) => void;
  /** Reset filter settings to defaults */
  resetFilterSettings: () => void;

  // Exploration state actions
  /** Save current exploration state */
  saveExplorationState: (
    currentNodeId: string | null,
    cameraPosition: CameraPosition | null
  ) => void;
  /** Restore last exploration state */
  restoreExplorationState: () => ExplorationState | null;
  /** Clear last exploration state */
  clearExplorationState: () => void;

  // Session actions
  /** Clear all session data */
  clearSession: () => void;

  // UI Preferences actions
  /** Set sidebar collapsed state */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Toggle sidebar collapsed state */
  toggleSidebarCollapsed: () => void;
}

export type SessionStore = SessionState & SessionActions;

// ============================================================================
// Default Values
// ============================================================================

const defaultFilterSettings: FilterSettings = {
  searchQuery: '',
  selectedSectors: ['episodic', 'semantic', 'procedural', 'emotional', 'reflective'],
  minStrength: 0,
  minSalience: 0,
};

const defaultUIPreferences: UIPreferences = {
  sidebarCollapsed: false,
};

const initialState: SessionState = {
  bookmarks: [],
  savedPaths: [],
  filterSettings: { ...defaultFilterSettings },
  lastExplorationState: null,
  uiPreferences: { ...defaultUIPreferences },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID for saved paths
 */
function generatePathId(): string {
  return `path-${String(Date.now())}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Bookmark actions
      addBookmark: (nodeId: string, label: string, notes?: string): void => {
        const state = get();

        // Don't add duplicate bookmarks
        if (state.bookmarks.some((b) => b.nodeId === nodeId)) {
          return;
        }

        const newBookmark: Bookmark = {
          nodeId,
          label,
          createdAt: Date.now(),
          notes,
        };

        set({ bookmarks: [...state.bookmarks, newBookmark] });
      },

      removeBookmark: (nodeId: string): void => {
        const state = get();
        set({ bookmarks: state.bookmarks.filter((b) => b.nodeId !== nodeId) });
      },

      updateBookmarkNotes: (nodeId: string, notes: string): void => {
        const state = get();
        set({
          bookmarks: state.bookmarks.map((b) => (b.nodeId === nodeId ? { ...b, notes } : b)),
        });
      },

      isBookmarked: (nodeId: string): boolean => {
        const state = get();
        return state.bookmarks.some((b) => b.nodeId === nodeId);
      },

      // Path actions
      savePath: (name: string, nodeIds: string[], description?: string): string => {
        const state = get();
        const id = generatePathId();

        const newPath: SavedPath = {
          id,
          name,
          nodeIds,
          createdAt: Date.now(),
          description,
        };

        set({ savedPaths: [...state.savedPaths, newPath] });
        return id;
      },

      deletePath: (pathId: string): void => {
        const state = get();
        set({ savedPaths: state.savedPaths.filter((p) => p.id !== pathId) });
      },

      updatePath: (pathId: string, updates: Partial<Omit<SavedPath, 'id' | 'createdAt'>>): void => {
        const state = get();
        set({
          savedPaths: state.savedPaths.map((p) => (p.id === pathId ? { ...p, ...updates } : p)),
        });
      },

      // Filter actions
      setFilterSettings: (settings: Partial<FilterSettings>): void => {
        const state = get();
        set({
          filterSettings: { ...state.filterSettings, ...settings },
        });
      },

      resetFilterSettings: (): void => {
        set({ filterSettings: { ...defaultFilterSettings } });
      },

      // Exploration state actions
      saveExplorationState: (
        currentNodeId: string | null,
        cameraPosition: CameraPosition | null
      ): void => {
        const state = get();
        set({
          lastExplorationState: {
            currentNodeId,
            cameraPosition,
            filterSettings: { ...state.filterSettings },
          },
        });
      },

      restoreExplorationState: (): ExplorationState | null => {
        const state = get();
        if (state.lastExplorationState) {
          // Restore filter settings
          set({ filterSettings: { ...state.lastExplorationState.filterSettings } });
        }
        return state.lastExplorationState;
      },

      clearExplorationState: (): void => {
        set({ lastExplorationState: null });
      },

      // Session actions
      clearSession: (): void => {
        set(initialState);
      },

      // UI Preferences actions
      setSidebarCollapsed: (collapsed: boolean): void => {
        const state = get();
        set({
          uiPreferences: { ...state.uiPreferences, sidebarCollapsed: collapsed },
        });
      },

      toggleSidebarCollapsed: (): void => {
        const state = get();
        set({
          uiPreferences: {
            ...state.uiPreferences,
            sidebarCollapsed: !state.uiPreferences.sidebarCollapsed,
          },
        });
      },
    }),
    {
      name: 'memory-exploration-session',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        savedPaths: state.savedPaths,
        filterSettings: state.filterSettings,
        lastExplorationState: state.lastExplorationState,
        uiPreferences: state.uiPreferences,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get all bookmarks sorted by creation date (newest first)
 */
export const selectBookmarksSorted = (state: SessionStore): Bookmark[] =>
  [...state.bookmarks].sort((a, b) => b.createdAt - a.createdAt);

/**
 * Get all saved paths sorted by creation date (newest first)
 */
export const selectSavedPathsSorted = (state: SessionStore): SavedPath[] =>
  [...state.savedPaths].sort((a, b) => b.createdAt - a.createdAt);

/**
 * Get bookmark by node ID
 */
export const selectBookmarkByNodeId = (state: SessionStore, nodeId: string): Bookmark | undefined =>
  state.bookmarks.find((b) => b.nodeId === nodeId);

/**
 * Get saved path by ID
 */
export const selectSavedPathById = (state: SessionStore, pathId: string): SavedPath | undefined =>
  state.savedPaths.find((p) => p.id === pathId);

/**
 * Check if any filters are active
 */
export const selectHasActiveFilters = (state: SessionStore): boolean => {
  const { filterSettings } = state;
  return (
    filterSettings.searchQuery !== '' ||
    filterSettings.selectedSectors.length < 5 ||
    filterSettings.minStrength > 0 ||
    filterSettings.minSalience > 0
  );
};

/**
 * Get sidebar collapsed state
 */
export const selectSidebarCollapsed = (state: SessionStore): boolean =>
  state.uiPreferences.sidebarCollapsed;
