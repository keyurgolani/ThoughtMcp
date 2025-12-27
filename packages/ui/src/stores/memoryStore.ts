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

/** Number of memories to fetch per page (matches server MAX_MEMORY_RECALL_LIMIT) */
export const MEMORIES_PER_PAGE = 100;

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
      state.memories.length > 0 &&
      state.isFullyLoaded
    ) {
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
      let allMemories: Memory[] = [];
      let currentOffset = 0;
      let hasMore = true;
      let totalCount = 0;

      // Load ALL pages immediately in a loop
      while (hasMore) {
        const response = await client.recallMemories(
          {
            userId,
            limit: MEMORIES_PER_PAGE,
            offset: currentOffset,
          },
          force && currentOffset === 0 // Only force refresh on first request
        );

        const fetchedMemories = response.memories;
        totalCount = response.totalCount;

        // Deduplicate memories by ID
        const existingIds = new Set(allMemories.map((m) => m.id));
        const newMemories = fetchedMemories.filter((m) => !existingIds.has(m.id));
        allMemories = [...allMemories, ...newMemories];

        currentOffset += fetchedMemories.length;
        hasMore = fetchedMemories.length === MEMORIES_PER_PAGE && currentOffset < totalCount;

        // Update state progressively so UI shows progress
        set({
          memories: allMemories,
          offset: currentOffset,
          totalCount,
          hasMore,
          isLoadingMore: hasMore,
        });
      }

      set({
        isLoading: false,
        isLoadingMore: false,
        lastFetchedAt: Date.now(),
        isUsingDemoData: false,
        error: null,
        hasMore: false,
        isFullyLoaded: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch memories";
      console.error("Failed to fetch memories:", message);

      set({
        isLoading: false,
        isLoadingMore: false,
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
      let allMemories = [...state.memories];
      let currentOffset = state.offset;
      let hasMore: boolean = state.hasMore;
      let totalCount = state.totalCount ?? 0;

      // Load ALL remaining pages immediately
      while (hasMore) {
        const response = await client.recallMemories({
          userId: state.userId,
          limit: MEMORIES_PER_PAGE,
          offset: currentOffset,
        });

        const fetchedMemories = response.memories;
        totalCount = response.totalCount;
        const newTotal = currentOffset + fetchedMemories.length;
        hasMore = fetchedMemories.length === MEMORIES_PER_PAGE && newTotal < totalCount;

        // Deduplicate memories by ID
        const existingIds = new Set(allMemories.map((m) => m.id));
        const newMemories = fetchedMemories.filter((m) => !existingIds.has(m.id));
        allMemories = [...allMemories, ...newMemories];
        currentOffset += fetchedMemories.length;

        // Update state progressively
        set({
          memories: allMemories,
          offset: currentOffset,
          totalCount,
          hasMore,
        });
      }

      set({
        isLoadingMore: false,
        hasMore: false,
        isFullyLoaded: true,
      });
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
