/**
 * OptimisticUpdateManager - Manages optimistic UI updates for memory operations
 *
 * Provides immediate UI feedback when creating memories by displaying them
 * before server confirmation. Handles the lifecycle of optimistic entries:
 * - Add: Display memory immediately with temp ID
 * - Confirm: Replace temp ID with real server ID
 * - Reject: Remove optimistic entry on failure
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { create } from "zustand";
import type { Memory, MemoryMetadata, MemorySectorType } from "../types/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Content required to create an optimistic memory entry
 */
export interface MemoryContent {
  content: string;
  userId: string;
  sessionId: string;
  primarySector: MemorySectorType;
  metadata?: MemoryMetadata;
}

/**
 * Extended Memory type with optimistic update tracking fields
 */
export interface OptimisticMemory extends Memory {
  /** Temporary client-side ID (format: temp-{uuid}) */
  tempId: string;
  /** Whether this is an optimistic entry pending server confirmation */
  isPending: boolean;
  /** Timestamp when optimistic entry was created */
  optimisticCreatedAt: number;
}

/**
 * State for tracking optimistic updates
 */
export interface OptimisticUpdateState {
  /** Map of temp ID to optimistic memory entry */
  optimisticEntries: Map<string, OptimisticMemory>;
  /** Map of temp ID to error for rejected entries */
  rejectedEntries: Map<string, Error>;
}

/**
 * Actions for managing optimistic updates
 */
export interface OptimisticUpdateActions {
  /** Add memory optimistically, returns temp ID */
  addOptimistic: (content: MemoryContent) => string;
  /** Confirm optimistic entry with real server ID */
  confirmOptimistic: (tempId: string, realMemory: Memory) => void;
  /** Remove optimistic entry on failure */
  rejectOptimistic: (tempId: string, error: Error) => void;
  /** Check if memory is pending */
  isPending: (memoryId: string) => boolean;
  /** Get optimistic memory by temp ID */
  getOptimisticMemory: (tempId: string) => OptimisticMemory | undefined;
  /** Get all optimistic memories */
  getAllOptimisticMemories: () => OptimisticMemory[];
  /** Clear all optimistic entries */
  clearAll: () => void;
  /** Get error for rejected entry */
  getRejectionError: (tempId: string) => Error | undefined;
  /** Clear rejection error */
  clearRejectionError: (tempId: string) => void;
}

export type OptimisticUpdateStore = OptimisticUpdateState & OptimisticUpdateActions;

// ============================================================================
// UUID Generation
// ============================================================================

/**
 * Generate a UUID v4 for temp IDs
 * Uses crypto.randomUUID if available, falls back to manual generation
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a temporary ID with the format temp-{uuid}
 */
export function generateTempId(): string {
  return `temp-${generateUUID()}`;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: OptimisticUpdateState = {
  optimisticEntries: new Map(),
  rejectedEntries: new Map(),
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useOptimisticUpdateStore = create<OptimisticUpdateStore>((set, get) => ({
  ...initialState,

  addOptimistic: (content: MemoryContent): string => {
    const tempId = generateTempId();
    const now = Date.now();

    const optimisticMemory: OptimisticMemory = {
      // Use temp ID as the memory ID until confirmed
      id: tempId,
      content: content.content,
      createdAt: new Date(now).toISOString(),
      lastAccessed: new Date(now).toISOString(),
      accessCount: 0,
      salience: content.metadata?.importance ?? 0.5,
      strength: 1.0,
      userId: content.userId,
      sessionId: content.sessionId,
      primarySector: content.primarySector,
      metadata: content.metadata ?? {},
      // Optimistic tracking fields
      tempId,
      isPending: true,
      optimisticCreatedAt: now,
    };

    set((state) => {
      const newEntries = new Map(state.optimisticEntries);
      newEntries.set(tempId, optimisticMemory);
      return { optimisticEntries: newEntries };
    });

    return tempId;
  },

  confirmOptimistic: (tempId: string, _realMemory: Memory): void => {
    set((state) => {
      const newEntries = new Map(state.optimisticEntries);
      const optimisticEntry = newEntries.get(tempId);

      if (optimisticEntry !== undefined) {
        // Remove the optimistic entry - the real memory will be added to the main store
        newEntries.delete(tempId);
      }

      // Also clear any rejection error for this temp ID
      const newRejected = new Map(state.rejectedEntries);
      newRejected.delete(tempId);

      return {
        optimisticEntries: newEntries,
        rejectedEntries: newRejected,
      };
    });
  },

  rejectOptimistic: (tempId: string, error: Error): void => {
    set((state) => {
      const newEntries = new Map(state.optimisticEntries);
      const newRejected = new Map(state.rejectedEntries);

      // Remove the optimistic entry
      newEntries.delete(tempId);

      // Store the error for potential display
      newRejected.set(tempId, error);

      return {
        optimisticEntries: newEntries,
        rejectedEntries: newRejected,
      };
    });
  },

  isPending: (memoryId: string): boolean => {
    const state = get();
    // Check if the ID is a temp ID and exists in optimistic entries
    if (memoryId.startsWith("temp-")) {
      return state.optimisticEntries.has(memoryId);
    }
    // Check if any optimistic entry has this as its temp ID
    for (const entry of state.optimisticEntries.values()) {
      if (entry.tempId === memoryId) {
        return true;
      }
    }
    return false;
  },

  getOptimisticMemory: (tempId: string): OptimisticMemory | undefined => {
    return get().optimisticEntries.get(tempId);
  },

  getAllOptimisticMemories: (): OptimisticMemory[] => {
    return Array.from(get().optimisticEntries.values());
  },

  clearAll: (): void => {
    set({
      optimisticEntries: new Map(),
      rejectedEntries: new Map(),
    });
  },

  getRejectionError: (tempId: string): Error | undefined => {
    return get().rejectedEntries.get(tempId);
  },

  clearRejectionError: (tempId: string): void => {
    set((state) => {
      const newRejected = new Map(state.rejectedEntries);
      newRejected.delete(tempId);
      return { rejectedEntries: newRejected };
    });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select all optimistic entries
 */
export const selectOptimisticEntries = (
  state: OptimisticUpdateStore
): Map<string, OptimisticMemory> => state.optimisticEntries;

/**
 * Select optimistic entries count
 */
export const selectOptimisticCount = (state: OptimisticUpdateStore): number =>
  state.optimisticEntries.size;

/**
 * Select whether there are any pending optimistic entries
 */
export const selectHasPendingOptimistic = (state: OptimisticUpdateStore): boolean =>
  state.optimisticEntries.size > 0;

/**
 * Select rejected entries
 */
export const selectRejectedEntries = (state: OptimisticUpdateStore): Map<string, Error> =>
  state.rejectedEntries;

/**
 * Select whether there are any rejected entries
 */
export const selectHasRejectedEntries = (state: OptimisticUpdateStore): boolean =>
  state.rejectedEntries.size > 0;
