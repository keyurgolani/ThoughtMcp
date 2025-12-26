/**
 * MemoryStore - Zustand store for centralized memory management
 *
 * Provides a single source of truth for memories across all UI components.
 * Ensures WikiLink autocomplete, Memory Explorer, and Memory Graph
 * all show the same memories.
 *
 * Features:
 * - Background loading: First page shows immediately, rest loads in background
 * - All views (Dashboard, Memory Explorer, Memory Graph) update as data arrives
 * - Deduplication to prevent duplicate memories
 *
 * Requirements: 41.1, 41.2 (WikiLink), Memory consistency across views
 */

import { create } from "zustand";
import { getDefaultClient } from "../api/client";
import type { Memory, MemorySectorType } from "../types/api";

// ============================================================================
// Types
// ============================================================================

/** Number of memories to fetch per page */
export const MEMORIES_PER_PAGE = 50;

export interface MemoryState {
  /** All memories for the current user (accumulated from pagination) */
  memories: Memory[];
  /** Whether initial page is being loaded */
  isLoading: boolean;
  /** Whether background loading is in progress */
  isLoadingMore: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Last fetch timestamp */
  lastFetchedAt: number | null;
  /** Current user ID */
  userId: string | null;
  /** Whether using demo data (API unavailable) */
  isUsingDemoData: boolean;
  /** Whether there are more memories to load */
  hasMore: boolean;
  /** Current offset for pagination */
  offset: number;
  /** Total count of memories (if known) */
  totalCount: number | null;
  /** Whether all memories have been loaded */
  isFullyLoaded: boolean;
}

export interface MemoryActions {
  /** Fetch memories from API - loads first page immediately, then continues in background */
  fetchMemories: (userId: string, force?: boolean) => Promise<void>;
  /** Force refresh memories from server, bypassing all caches */
  forceRefreshMemories: () => Promise<void>;
  /** Load more memories (called automatically or manually) */
  loadMoreMemories: () => Promise<void>;
  /** Add a new memory to the store (after successful API save) */
  addMemory: (memory: Memory) => void;
  /** Update a memory in the store */
  updateMemory: (memoryId: string, updates: Partial<Memory>) => void;
  /** Remove a memory from the store */
  removeMemory: (memoryId: string) => void;
  /** Clear all memories */
  clearMemories: () => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Get memories filtered by sector */
  getMemoriesBySector: (sector: MemorySectorType) => Memory[];
  /** Search memories by content */
  searchMemories: (query: string) => Memory[];
}

export type MemoryStore = MemoryState & MemoryActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: MemoryState = {
  memories: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  lastFetchedAt: null,
  userId: null,
  isUsingDemoData: false,
  hasMore: true,
  offset: 0,
  totalCount: null,
  isFullyLoaded: false,
};

// ============================================================================
// Cache Duration
// ============================================================================

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000;

/** Delay between background page fetches (ms) */
const BACKGROUND_FETCH_DELAY = 100;

// ============================================================================
// Store Implementation
// ============================================================================

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  ...initialState,

  fetchMemories: async (userId: string, force: boolean = false): Promise<void> => {
    const state = get();

    // Check if we have cached data that's still valid
    if (
      !force &&
      state.userId === userId &&
      state.lastFetchedAt !== null &&
      Date.now() - state.lastFetchedAt < CACHE_DURATION_MS &&
      state.memories.length > 0
    ) {
      // If not fully loaded, continue background loading
      if (!state.isFullyLoaded && state.hasMore && !state.isLoadingMore) {
        void get().loadMoreMemories();
      }
      return;
    }

    // Reset pagination state for fresh fetch
    set({
      isLoading: true,
      error: null,
      userId,
      offset: 0,
      memories: [],
      hasMore: true,
      isFullyLoaded: false,
    });

    try {
      const client = getDefaultClient();
      // Use forceRefresh when force=true to bypass server-side cache
      const response = await client.recallMemories(
        {
          userId,
          limit: MEMORIES_PER_PAGE,
          offset: 0,
        },
        force
      );

      const fetchedMemories = response.memories;
      const totalCount = response.totalCount;
      // hasMore is true if we received a full page AND there are more memories to load
      const hasMore =
        fetchedMemories.length === MEMORIES_PER_PAGE && fetchedMemories.length < totalCount;

      set({
        memories: fetchedMemories,
        isLoading: false,
        lastFetchedAt: Date.now(),
        isUsingDemoData: false,
        error: null,
        hasMore,
        offset: fetchedMemories.length,
        totalCount,
        isFullyLoaded: !hasMore,
      });

      // Continue loading in background if there are more memories
      if (hasMore) {
        setTimeout(() => {
          void get().loadMoreMemories();
        }, BACKGROUND_FETCH_DELAY);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch memories";
      console.error("Failed to fetch memories:", message);

      set({
        isLoading: false,
        error: message,
        isUsingDemoData: state.memories.length === 0,
      });
    }
  },

  forceRefreshMemories: async (): Promise<void> => {
    const state = get();
    if (state.userId === null || state.userId === "") {
      console.warn("Cannot force refresh: no userId set");
      return;
    }
    // Clear local cache and fetch with server-side cache bypass
    set({ lastFetchedAt: null });
    await get().fetchMemories(state.userId, true);
  },

  loadMoreMemories: async (): Promise<void> => {
    const state = get();

    // Don't load if already loading or no more data
    if (
      state.isLoadingMore ||
      state.isLoading ||
      !state.hasMore ||
      state.userId === null ||
      state.userId === ""
    ) {
      return;
    }

    set({ isLoadingMore: true, error: null });

    try {
      const client = getDefaultClient();
      const response = await client.recallMemories({
        userId: state.userId,
        limit: MEMORIES_PER_PAGE,
        offset: state.offset,
      });

      const fetchedMemories = response.memories;
      const totalCount = response.totalCount;
      const currentTotal = state.offset + fetchedMemories.length;
      const hasMore = fetchedMemories.length === MEMORIES_PER_PAGE && currentTotal < totalCount;

      // Deduplicate memories by ID
      const existingIds = new Set(state.memories.map((m) => m.id));
      const newMemories = fetchedMemories.filter((m) => !existingIds.has(m.id));

      set({
        memories: [...state.memories, ...newMemories],
        isLoadingMore: false,
        hasMore,
        offset: state.offset + fetchedMemories.length,
        totalCount,
        isFullyLoaded: !hasMore,
      });

      // Continue loading in background if there are more memories
      if (hasMore) {
        setTimeout(() => {
          void get().loadMoreMemories();
        }, BACKGROUND_FETCH_DELAY);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load more memories";
      console.error("Failed to load more memories:", message);

      set({
        isLoadingMore: false,
        error: message,
      });
    }
  },

  addMemory: (memory: Memory): void => {
    set((state) => ({
      memories: [memory, ...state.memories],
      totalCount: state.totalCount !== null ? state.totalCount + 1 : null,
    }));
  },

  updateMemory: (memoryId: string, updates: Partial<Memory>): void => {
    set((state) => ({
      memories: state.memories.map((m) => (m.id === memoryId ? { ...m, ...updates } : m)),
    }));
  },

  removeMemory: (memoryId: string): void => {
    set((state) => ({
      memories: state.memories.filter((m) => m.id !== memoryId),
      totalCount: state.totalCount !== null ? state.totalCount - 1 : null,
    }));
  },

  clearMemories: (): void => {
    set({
      memories: [],
      lastFetchedAt: null,
      isUsingDemoData: false,
      hasMore: true,
      offset: 0,
      totalCount: null,
      isFullyLoaded: false,
    });
  },

  setError: (error: string | null): void => {
    set({ error });
  },

  getMemoriesBySector: (sector: MemorySectorType): Memory[] => {
    const state = get();
    return state.memories.filter((m) => m.primarySector === sector);
  },

  searchMemories: (query: string): Memory[] => {
    const state = get();
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length === 0) {
      return state.memories;
    }

    return state.memories.filter((memory) => {
      const contentMatches = memory.content.toLowerCase().includes(lowerQuery);
      const tagsMatch =
        memory.metadata.tags?.some((t) => t.toLowerCase().includes(lowerQuery)) === true;
      const keywordsMatch =
        memory.metadata.keywords?.some((k) => k.toLowerCase().includes(lowerQuery)) === true;
      return contentMatches || tagsMatch || keywordsMatch;
    });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select all memories
 */
export const selectMemories = (state: MemoryStore): Memory[] => state.memories;

/**
 * Select loading state
 */
export const selectIsLoading = (state: MemoryStore): boolean => state.isLoading;

/**
 * Select loading more state
 */
export const selectIsLoadingMore = (state: MemoryStore): boolean => state.isLoadingMore;

/**
 * Select error state
 */
export const selectError = (state: MemoryStore): string | null => state.error;

/**
 * Select whether using demo data
 */
export const selectIsUsingDemoData = (state: MemoryStore): boolean => state.isUsingDemoData;

/**
 * Select memory count
 */
export const selectMemoryCount = (state: MemoryStore): number => state.memories.length;

/**
 * Select whether there are more memories to load
 */
export const selectHasMore = (state: MemoryStore): boolean => state.hasMore;

/**
 * Select total count
 */
export const selectTotalCount = (state: MemoryStore): number | null => state.totalCount;

/**
 * Select whether all memories are fully loaded
 */
export const selectIsFullyLoaded = (state: MemoryStore): boolean => state.isFullyLoaded;

/**
 * Select memories by sector
 */
export const selectMemoriesBySector =
  (sector: MemorySectorType) =>
  (state: MemoryStore): Memory[] =>
    state.memories.filter((m) => m.primarySector === sector);
