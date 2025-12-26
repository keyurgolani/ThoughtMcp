import type { Memory, MemorySectorType } from "../types/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Preview data for a connected memory
 */
export interface MemoryPreview {
  /** Memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Primary sector type */
  primarySector: MemorySectorType;
  /** Salience score (0-1) */
  salience: number;
  /** Strength score (0-1) */
  strength: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for content preview */
export const MAX_CONTENT_LENGTH = 120;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Truncates content for display in preview
 *
 * @param content - The content to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated content with ellipsis if needed
 */
export function truncatePreviewContent(
  content: string,
  maxLength: number = MAX_CONTENT_LENGTH
): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + "...";
}

/**
 * Formats a percentage value for display
 */
export function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Converts a Memory object to MemoryPreview
 */
export function memoryToPreview(memory: Memory): MemoryPreview {
  return {
    id: memory.id,
    content: memory.content,
    primarySector: memory.primarySector,
    salience: memory.salience,
    strength: memory.strength,
  };
}
