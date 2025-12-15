/**
 * useSaveAsMemory Hook
 *
 * Hook for saving cognitive insights as new linked memories.
 * Creates a new reflective memory with the cognitive result content
 * and optionally links it to the source memory.
 *
 * Requirements: 16.8
 */

import { useCallback, useState } from 'react';
import { getDefaultClient } from '../api/client';
import type { StoreMemoryRequest } from '../types/api';

export interface SaveAsMemoryOptions {
  /** User ID for the new memory */
  userId: string;
  /** Session ID for the new memory */
  sessionId: string;
  /** ID of the source memory to link to (optional) */
  sourceMemoryId?: string;
}

export interface SaveAsMemoryResult {
  /** Whether the save operation is in progress */
  isSaving: boolean;
  /** Error message if save failed */
  error: string | null;
  /** ID of the created memory (if successful) */
  createdMemoryId: string | null;
  /** Function to save content as a new memory */
  saveAsMemory: (content: string, linkedMemoryId?: string) => Promise<string | null>;
  /** Function to clear the error state */
  clearError: () => void;
}

/**
 * Hook for saving cognitive insights as new linked memories
 *
 * Requirements: 16.8
 */
export function useSaveAsMemory(options: SaveAsMemoryOptions): SaveAsMemoryResult {
  const { userId, sessionId } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdMemoryId, setCreatedMemoryId] = useState<string | null>(null);

  /**
   * Save content as a new reflective memory
   * Requirements: 16.8
   */
  const saveAsMemory = useCallback(
    async (content: string, linkedMemoryId?: string): Promise<string | null> => {
      setIsSaving(true);
      setError(null);
      setCreatedMemoryId(null);

      try {
        const client = getDefaultClient();

        // Create the new memory as a reflective type (cognitive insights)
        const request: StoreMemoryRequest = {
          content,
          userId,
          sessionId,
          primarySector: 'reflective',
          metadata: {
            category: 'cognitive-insight',
            tags: ['cognitive-analysis', 'auto-generated'],
            context:
              linkedMemoryId !== undefined && linkedMemoryId !== ''
                ? `Generated from cognitive analysis of memory ${linkedMemoryId}`
                : 'Generated from cognitive analysis',
          },
        };

        const response = await client.storeMemory(request);
        const newMemoryId = response.memoryId;

        setCreatedMemoryId(newMemoryId);
        setIsSaving(false);

        return newMemoryId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save as memory';
        setError(message);
        setIsSaving(false);
        return null;
      }
    },
    [userId, sessionId]
  );

  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isSaving,
    error,
    createdMemoryId,
    saveAsMemory,
    clearError,
  };
}

export default useSaveAsMemory;
