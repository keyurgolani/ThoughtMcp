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
import { MAX_MEMORY_CONTENT_LENGTH } from '../types/api';

/**
 * Truncate content to fit within embedding model limits.
 * Attempts to truncate at a word boundary for cleaner output.
 *
 * @param content - The content to truncate
 * @param maxLength - Maximum allowed length (default: MAX_MEMORY_CONTENT_LENGTH)
 * @returns The original content if within limit, or truncated content with suffix
 */
export function truncateContent(
  content: string,
  maxLength: number = MAX_MEMORY_CONTENT_LENGTH
): string {
  if (content.length <= maxLength) {
    return content;
  }

  const suffix = '... [truncated]';
  const targetLength = maxLength - suffix.length;

  // Find the last space before the target length to truncate at word boundary
  const lastSpaceIndex = content.lastIndexOf(' ', targetLength);

  // If we found a space within a reasonable range (at least 80% of target), use it
  const cutoffIndex = lastSpaceIndex > targetLength * 0.8 ? lastSpaceIndex : targetLength;

  return content.substring(0, cutoffIndex) + suffix;
}

/**
 * Check if content will be truncated when saved.
 *
 * @param content - The content to check
 * @returns true if content exceeds MAX_MEMORY_CONTENT_LENGTH
 */
export function willContentBeTruncated(content: string): boolean {
  return content.length > MAX_MEMORY_CONTENT_LENGTH;
}

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
  /** Whether the last saved content was truncated */
  wasTruncated: boolean;
  /** Function to save content as a new memory */
  saveAsMemory: (content: string, linkedMemoryId?: string) => Promise<string | null>;
  /** Function to clear the error state */
  clearError: () => void;
  /** Function to check if content will be truncated before saving */
  checkWillTruncate: (content: string) => boolean;
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
  const [wasTruncated, setWasTruncated] = useState(false);

  /**
   * Check if content will be truncated before saving
   */
  const checkWillTruncate = useCallback((content: string): boolean => {
    return willContentBeTruncated(content);
  }, []);

  /**
   * Save content as a new reflective memory
   * Requirements: 16.8
   */
  const saveAsMemory = useCallback(
    async (content: string, linkedMemoryId?: string): Promise<string | null> => {
      setIsSaving(true);
      setError(null);
      setCreatedMemoryId(null);
      setWasTruncated(false);

      try {
        const client = getDefaultClient();

        // Check if content needs truncation
        const needsTruncation = willContentBeTruncated(content);
        const processedContent = truncateContent(content);

        // Track truncation state
        setWasTruncated(needsTruncation);

        // Build tags array
        const tags = ['cognitive-analysis', 'auto-generated'];
        if (needsTruncation) {
          tags.push('truncated');
        }

        // Build context string
        let contextStr =
          linkedMemoryId !== undefined && linkedMemoryId !== ''
            ? `Generated from cognitive analysis of memory ${linkedMemoryId}`
            : 'Generated from cognitive analysis';

        if (needsTruncation) {
          contextStr += ` (original content was ${String(content.length)} bytes, truncated to ${String(processedContent.length)} bytes)`;
        }

        // Create the new memory as a reflective type (cognitive insights)
        const request: StoreMemoryRequest = {
          content: processedContent,
          userId,
          sessionId,
          primarySector: 'reflective',
          metadata: {
            category: 'cognitive-insight',
            tags,
            context: contextStr,
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
    wasTruncated,
    saveAsMemory,
    clearError,
    checkWillTruncate,
  };
}

export default useSaveAsMemory;
