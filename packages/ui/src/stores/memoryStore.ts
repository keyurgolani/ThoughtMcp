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
 * - Optimistic updates for immediate UI feedback on memory creation
 * - WebSocket integration for real-time updates
 *
 * Requirements: 41.1, 41.2 (WikiLink), Memory consistency across views
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 (Optimistic updates)
 * Requirements: 3.4, 3.5, 3.6, 3.8 (WebSocket integration)
 */

import { create } from "zustand";
import { getDefaultClient } from "../api/client";
import {
  getDefaultMemoryHandler,
  type WebSocketMemoryHandler,
} from "../api/websocket-memory-handler";
import type {
  Memory,
  MemorySectorType,
  StoreMemoryRequest,
  WebSocketConnectionState,
} from "../types/api";
import {
  useOptimisticUpdateStore,
  type MemoryContent,
  type OptimisticMemory,
} from "./optimisticUpdateManager";

// ============================================================================
// Types
// ============================================================================

/** Number of memories to fetch per page (matches server MAX_MEMORY_RECALL_LIMIT) */
export const MEMORIES_PER_PAGE = 100;

export interface MemoryState {
  /** All memories for the current user (accumulated from pagination) */
  memories: Memory[];
  /** Optimistic memories pending server confirmation */
  optimisticMemories: OptimisticMemory[];
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
  /** WebSocket connection state - Requirements: 3.4, 3.5, 3.6 */
  wsConnectionState: WebSocketConnectionState;
  /** Whether WebSocket is subscribed to memory events */
  wsSubscribed: boolean;
  /** Set of temp IDs that have been confirmed (for deduplication) - Requirements: 3.8 */
  confirmedTempIds: Set<string>;
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
  /**
   * Create memory with optimistic update - displays immediately, confirms with server
   * Returns the temp ID for tracking
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  createMemoryOptimistic: (request: StoreMemoryRequest) => Promise<string>;
  /**
   * Check if a memory is pending (optimistic, not yet confirmed)
   * Requirements: 1.5
   */
  isMemoryPending: (memoryId: string) => boolean;
  /**
   * Get all memories including optimistic ones (for display)
   * Optimistic memories appear first with pending status
   */
  getAllMemoriesWithOptimistic: () => Memory[];
  /**
   * Subscribe to WebSocket memory events for the current user
   * Requirements: 3.4, 3.5, 3.6
   */
  subscribeToWebSocket: () => void;
  /**
   * Unsubscribe from WebSocket memory events
   */
  unsubscribeFromWebSocket: () => void;
  /**
   * Handle memory created event from WebSocket
   * Requirements: 3.4, 3.8
   */
  handleWebSocketMemoryCreated: (memory: Memory, tempId?: string) => void;
  /**
   * Handle memory updated event from WebSocket
   * Requirements: 3.5
   */
  handleWebSocketMemoryUpdated: (
    memoryId: string,
    updates: Partial<Memory>,
    reason: string
  ) => void;
  /**
   * Handle memory deleted event from WebSocket
   * Requirements: 3.6
   */
  handleWebSocketMemoryDeleted: (memoryId: string) => void;
  /**
   * Get WebSocket connection state
   */
  getWebSocketConnectionState: () => WebSocketConnectionState;
  /**
   * Set the current user ID and clear store if user changed.
   * This should be called when the user logs in or switches accounts.
   * Requirements: 7.6
   */
  setUserId: (userId: string | null) => void;
  /**
   * Get the current user ID
   */
  getUserId: () => string | null;
}

export type MemoryStore = MemoryState & MemoryActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: MemoryState = {
  memories: [],
  optimisticMemories: [],
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
  wsConnectionState: "disconnected",
  wsSubscribed: false,
  confirmedTempIds: new Set(),
};

// ============================================================================
// WebSocket Handler Reference
// ============================================================================

/** Reference to the WebSocket memory handler */
let wsHandler: WebSocketMemoryHandler | null = null;

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

    // Detect user change and clear store if different user
    // Requirements: 7.6
    if (state.userId !== null && state.userId !== userId) {
      // User has changed - clear all data for the previous user
      get().clearMemories();
    }

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

  /**
   * Add a new memory to the store with deduplication.
   * If a memory with the same ID already exists, it will not be added.
   * Requirements: 7.3
   */
  addMemory: (memory: Memory): void => {
    set((state) => {
      // Deduplication: Check if memory already exists by ID
      // Requirements: 7.3
      const exists = state.memories.some((m) => m.id === memory.id);
      if (exists) {
        // Memory already exists, don't add duplicate
        return state;
      }

      return {
        memories: [memory, ...state.memories],
        totalCount: state.totalCount !== null ? state.totalCount + 1 : null,
      };
    });
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
    // Also clear optimistic entries when clearing memories
    const optimisticStore = useOptimisticUpdateStore.getState();
    optimisticStore.clearAll();

    // Unsubscribe from WebSocket when clearing memories
    if (wsHandler !== null) {
      wsHandler.unsubscribe();
    }

    set({
      memories: [],
      optimisticMemories: [],
      lastFetchedAt: null,
      isUsingDemoData: false,
      hasMore: true,
      offset: 0,
      totalCount: null,
      isFullyLoaded: false,
      wsSubscribed: false,
      wsConnectionState: "disconnected",
      confirmedTempIds: new Set(),
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

  createMemoryOptimistic: async (request: StoreMemoryRequest): Promise<string> => {
    const optimisticStore = useOptimisticUpdateStore.getState();

    // Create optimistic memory content
    // Only include metadata if it's defined to satisfy exactOptionalPropertyTypes
    const memoryContent: MemoryContent = {
      content: request.content,
      userId: request.userId,
      sessionId: request.sessionId,
      primarySector: request.primarySector,
      ...(request.metadata !== undefined ? { metadata: request.metadata } : {}),
    };

    // Add optimistic entry immediately (Requirements: 1.1, 1.2)
    const tempId = optimisticStore.addOptimistic(memoryContent);

    // Update local state with optimistic memory
    const optimisticMemory = optimisticStore.getOptimisticMemory(tempId);
    if (optimisticMemory !== undefined) {
      set((state) => ({
        optimisticMemories: [optimisticMemory, ...state.optimisticMemories],
      }));
    }

    try {
      // Make API call
      const client = getDefaultClient();
      const response = await client.storeMemory(request);

      // Create the real memory object from response
      const realMemory: Memory = {
        id: response.memoryId,
        content: request.content,
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        salience: response.salience,
        strength: response.strength,
        userId: request.userId,
        sessionId: request.sessionId,
        primarySector: request.primarySector,
        metadata: request.metadata ?? {},
      };

      // Confirm optimistic entry (Requirements: 1.3)
      optimisticStore.confirmOptimistic(tempId, realMemory);

      // Track this temp ID as confirmed for WebSocket deduplication (Requirements: 3.8)
      // Remove from optimistic memories and add to real memories
      set((state) => ({
        optimisticMemories: state.optimisticMemories.filter((m) => m.tempId !== tempId),
        memories: [realMemory, ...state.memories],
        totalCount: state.totalCount !== null ? state.totalCount + 1 : null,
        confirmedTempIds: new Set([...state.confirmedTempIds, tempId]),
      }));

      return response.memoryId;
    } catch (error) {
      // Reject optimistic entry on failure (Requirements: 1.4)
      const err = error instanceof Error ? error : new Error(String(error));
      optimisticStore.rejectOptimistic(tempId, err);

      // Remove from optimistic memories
      set((state) => ({
        optimisticMemories: state.optimisticMemories.filter((m) => m.tempId !== tempId),
        error: err.message,
      }));

      throw error;
    }
  },

  isMemoryPending: (memoryId: string): boolean => {
    // Check if it's a temp ID (Requirements: 1.5)
    if (memoryId.startsWith("temp-")) {
      const state = get();
      return state.optimisticMemories.some((m) => m.tempId === memoryId || m.id === memoryId);
    }
    // Also check the optimistic update store
    const optimisticStore = useOptimisticUpdateStore.getState();
    return optimisticStore.isPending(memoryId);
  },

  getAllMemoriesWithOptimistic: (): Memory[] => {
    const state = get();
    // Optimistic memories appear first, then confirmed memories
    // Cast optimistic memories to Memory type (they have all required fields)
    const optimisticAsMemories: Memory[] = state.optimisticMemories.map((om) => ({
      id: om.id,
      content: om.content,
      createdAt: om.createdAt,
      lastAccessed: om.lastAccessed,
      accessCount: om.accessCount,
      salience: om.salience,
      strength: om.strength,
      userId: om.userId,
      sessionId: om.sessionId,
      primarySector: om.primarySector,
      metadata: om.metadata,
    }));
    return [...optimisticAsMemories, ...state.memories];
  },

  /**
   * Subscribe to WebSocket memory events for the current user
   * Requirements: 3.4, 3.5, 3.6
   */
  subscribeToWebSocket: (): void => {
    const state = get();
    if (state.userId === null || state.userId === "") {
      console.warn("Cannot subscribe to WebSocket: no userId set");
      return;
    }

    if (state.wsSubscribed) {
      return; // Already subscribed
    }

    // Get or create the WebSocket handler
    wsHandler = getDefaultMemoryHandler();

    // Subscribe to memory events with callbacks that update the store
    wsHandler.subscribeToMemoryEvents(state.userId, {
      onMemoryCreated: (memory: Memory, tempId?: string) => {
        get().handleWebSocketMemoryCreated(memory, tempId);
      },
      onMemoryUpdated: (memoryId: string, updates: Partial<Memory>, reason: string) => {
        get().handleWebSocketMemoryUpdated(memoryId, updates, reason);
      },
      onMemoryDeleted: (memoryId: string) => {
        get().handleWebSocketMemoryDeleted(memoryId);
      },
      onConnectionStateChange: (connectionState: WebSocketConnectionState) => {
        set({ wsConnectionState: connectionState });
      },
      onError: (error: Error) => {
        console.error("WebSocket error:", error.message);
      },
    });

    set({ wsSubscribed: true });
  },

  /**
   * Unsubscribe from WebSocket memory events
   */
  unsubscribeFromWebSocket: (): void => {
    if (wsHandler !== null) {
      wsHandler.unsubscribe();
    }
    set({ wsSubscribed: false, wsConnectionState: "disconnected" });
  },

  /**
   * Handle memory created event from WebSocket
   * Requirements: 3.4, 3.8 (deduplication)
   */
  handleWebSocketMemoryCreated: (memory: Memory, tempId?: string): void => {
    const state = get();

    // Deduplication: Check if this memory was created via optimistic update
    // Requirements: 3.8
    if (tempId !== undefined && tempId !== "") {
      // Check if we have this temp ID in our confirmed set (already processed)
      if (state.confirmedTempIds.has(tempId)) {
        // Already processed this optimistic update, skip
        return;
      }

      // Check if we have an optimistic memory with this temp ID
      const hasOptimistic = state.optimisticMemories.some((m) => m.tempId === tempId);
      if (hasOptimistic) {
        // This is a confirmation of our optimistic update
        // The optimistic update flow already handled adding the real memory
        // Just mark this temp ID as confirmed to prevent future duplicates
        set((s) => ({
          confirmedTempIds: new Set([...s.confirmedTempIds, tempId]),
        }));
        return;
      }
    }

    // Check if memory already exists (by ID)
    const exists = state.memories.some((m) => m.id === memory.id);
    if (exists) {
      return; // Already have this memory
    }

    // Add the new memory to the store
    // Requirements: 3.4
    set((s) => ({
      memories: [memory, ...s.memories],
      totalCount: s.totalCount !== null ? s.totalCount + 1 : null,
    }));
  },

  /**
   * Handle memory updated event from WebSocket
   * Requirements: 3.5
   */
  handleWebSocketMemoryUpdated: (
    memoryId: string,
    updates: Partial<Memory>,
    _reason: string
  ): void => {
    const state = get();

    // Check if memory exists
    const exists = state.memories.some((m) => m.id === memoryId);
    if (!exists) {
      // Memory doesn't exist in our store, ignore update
      return;
    }

    // Update the memory
    // Requirements: 3.5
    set((s) => ({
      memories: s.memories.map((m) => (m.id === memoryId ? { ...m, ...updates } : m)),
    }));
  },

  /**
   * Handle memory deleted event from WebSocket
   * Requirements: 3.6
   */
  handleWebSocketMemoryDeleted: (memoryId: string): void => {
    const state = get();

    // Check if memory exists
    const exists = state.memories.some((m) => m.id === memoryId);
    if (!exists) {
      // Memory doesn't exist in our store, ignore delete
      return;
    }

    // Remove the memory
    // Requirements: 3.6
    set((s) => ({
      memories: s.memories.filter((m) => m.id !== memoryId),
      totalCount: s.totalCount !== null ? s.totalCount - 1 : null,
    }));
  },

  /**
   * Get WebSocket connection state
   */
  getWebSocketConnectionState: (): WebSocketConnectionState => {
    return get().wsConnectionState;
  },

  /**
   * Set the current user ID and clear store if user changed.
   * This should be called when the user logs in or switches accounts.
   * Requirements: 7.6
   */
  setUserId: (userId: string | null): void => {
    const state = get();

    // If user is changing, clear all data for the previous user
    // Requirements: 7.6
    if (state.userId !== null && state.userId !== userId) {
      get().clearMemories();
    }

    // Set the new user ID
    set({ userId });
  },

  /**
   * Get the current user ID
   */
  getUserId: (): string | null => {
    return get().userId;
  },
}));

// ============================================================================
// Memoization Utilities
// ============================================================================

/**
 * Simple memoization cache for selectors.
 * Tracks the last input and output to avoid recomputation when inputs haven't changed.
 * Requirements: 7.5
 */
interface MemoCache<TInput, TOutput> {
  lastInput: TInput | undefined;
  lastOutput: TOutput | undefined;
}

/**
 * Create a memoized selector that caches the last result.
 * Returns the same reference if the input hasn't changed.
 * Requirements: 7.5
 */
function createMemoizedSelector<TInput, TOutput>(
  selector: (input: TInput) => TOutput,
  isEqual: (a: TInput | undefined, b: TInput) => boolean = (a, b) => a === b
): (input: TInput) => TOutput {
  const cache: MemoCache<TInput, TOutput> = {
    lastInput: undefined,
    lastOutput: undefined,
  };

  return (input: TInput): TOutput => {
    if (cache.lastOutput !== undefined && isEqual(cache.lastInput, input)) {
      return cache.lastOutput;
    }
    const output = selector(input);
    cache.lastInput = input;
    cache.lastOutput = output;
    return output;
  };
}

/**
 * Create a memoized selector with a key parameter.
 * Maintains separate caches for each key value.
 * Requirements: 7.5
 */
function createKeyedMemoizedSelector<TKey, TInput, TOutput>(
  selector: (key: TKey, input: TInput) => TOutput,
  isEqual: (a: TInput | undefined, b: TInput) => boolean = (a, b) => a === b
): (key: TKey) => (input: TInput) => TOutput {
  const caches = new Map<TKey, MemoCache<TInput, TOutput>>();

  return (key: TKey) => {
    return (input: TInput): TOutput => {
      let cache = caches.get(key);
      if (cache === undefined) {
        cache = { lastInput: undefined, lastOutput: undefined };
        caches.set(key, cache);
      }

      if (cache.lastOutput !== undefined && isEqual(cache.lastInput, input)) {
        return cache.lastOutput;
      }
      const output = selector(key, input);
      cache.lastInput = input;
      cache.lastOutput = output;
      return output;
    };
  };
}

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
 * Select current user ID
 * Requirements: 7.6
 */
export const selectUserId = (state: MemoryStore): string | null => state.userId;

/**
 * Select memories by sector (non-memoized version for backward compatibility)
 */
export const selectMemoriesBySector =
  (sector: MemorySectorType) =>
  (state: MemoryStore): Memory[] =>
    state.memories.filter((m) => m.primarySector === sector);

/**
 * Select optimistic memories
 */
export const selectOptimisticMemories = (state: MemoryStore): OptimisticMemory[] =>
  state.optimisticMemories;

/**
 * Select whether there are pending optimistic memories
 */
export const selectHasPendingMemories = (state: MemoryStore): boolean =>
  state.optimisticMemories.length > 0;

/**
 * Select all memories including optimistic ones
 * Optimistic memories appear first with pending status
 */
export const selectAllMemoriesWithOptimistic = (state: MemoryStore): Memory[] => {
  const optimisticAsMemories: Memory[] = state.optimisticMemories.map((om) => ({
    id: om.id,
    content: om.content,
    createdAt: om.createdAt,
    lastAccessed: om.lastAccessed,
    accessCount: om.accessCount,
    salience: om.salience,
    strength: om.strength,
    userId: om.userId,
    sessionId: om.sessionId,
    primarySector: om.primarySector,
    metadata: om.metadata,
  }));
  return [...optimisticAsMemories, ...state.memories];
};

/**
 * Check if a specific memory is pending (optimistic)
 * Requirements: 1.5
 */
export const selectIsMemoryPending =
  (memoryId: string) =>
  (state: MemoryStore): boolean => {
    if (memoryId.startsWith("temp-")) {
      return state.optimisticMemories.some((m) => m.tempId === memoryId || m.id === memoryId);
    }
    return false;
  };

/**
 * Select WebSocket connection state
 * Requirements: 3.4, 3.5, 3.6
 */
export const selectWsConnectionState = (state: MemoryStore): WebSocketConnectionState =>
  state.wsConnectionState;

/**
 * Select whether WebSocket is subscribed
 */
export const selectWsSubscribed = (state: MemoryStore): boolean => state.wsSubscribed;

/**
 * Select whether WebSocket is connected
 */
export const selectIsWsConnected = (state: MemoryStore): boolean =>
  state.wsConnectionState === "connected";

// ============================================================================
// Memoized Selectors
// Requirements: 7.5
// ============================================================================

/**
 * Memoized selector for memories by sector.
 * Returns the same array reference if the memories array hasn't changed.
 * Requirements: 7.5
 *
 * Usage:
 *   const selectEpisodic = createMemoizedSectorSelector('episodic');
 *   const episodicMemories = useMemoryStore(selectEpisodic);
 */
export const createMemoizedSectorSelector = createKeyedMemoizedSelector<
  MemorySectorType,
  MemoryStore,
  Memory[]
>(
  (sector: MemorySectorType, state: MemoryStore) =>
    state.memories.filter((m) => m.primarySector === sector),
  (a, b) => a?.memories === b.memories
);

/**
 * Memoized selector for search results.
 * Returns the same array reference if the memories array and query haven't changed.
 * Requirements: 7.5
 *
 * Usage:
 *   const selectSearch = createMemoizedSearchSelector('my query');
 *   const searchResults = useMemoryStore(selectSearch);
 */
export const createMemoizedSearchSelector = createKeyedMemoizedSelector<
  string,
  MemoryStore,
  Memory[]
>(
  (query: string, state: MemoryStore) => {
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
  (a, b) => a?.memories === b.memories
);

/**
 * Memoized selector for all memories with optimistic entries.
 * Returns the same array reference if neither memories nor optimisticMemories have changed.
 * Requirements: 7.5
 */
export const selectMemoizedAllMemoriesWithOptimistic = createMemoizedSelector<
  MemoryStore,
  Memory[]
>(
  (state: MemoryStore) => {
    const optimisticAsMemories: Memory[] = state.optimisticMemories.map((om) => ({
      id: om.id,
      content: om.content,
      createdAt: om.createdAt,
      lastAccessed: om.lastAccessed,
      accessCount: om.accessCount,
      salience: om.salience,
      strength: om.strength,
      userId: om.userId,
      sessionId: om.sessionId,
      primarySector: om.primarySector,
      metadata: om.metadata,
    }));
    return [...optimisticAsMemories, ...state.memories];
  },
  (a, b) => a?.memories === b.memories && a?.optimisticMemories === b.optimisticMemories
);

/**
 * Memoized selector for memory count by sector.
 * Returns a record with counts for each sector.
 * Requirements: 7.5
 */
export const selectMemoizedSectorCounts = createMemoizedSelector<
  MemoryStore,
  Record<MemorySectorType, number>
>(
  (state: MemoryStore) => {
    const counts: Record<MemorySectorType, number> = {
      episodic: 0,
      semantic: 0,
      procedural: 0,
      emotional: 0,
      reflective: 0,
    };

    for (const memory of state.memories) {
      counts[memory.primarySector]++;
    }

    return counts;
  },
  (a, b) => a?.memories === b.memories
);
