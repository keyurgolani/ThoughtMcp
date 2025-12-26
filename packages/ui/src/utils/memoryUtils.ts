import type { Memory } from "../types/api";

/**
 * Sort memories by createdAt date (newest first)
 */
export function sortMemoriesByCreatedAt(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Get the N most recent memories sorted by createdAt
 * Requirements: 4.8
 */
export function getRecentMemories(memories: Memory[], count: number): Memory[] {
  const sorted = sortMemoriesByCreatedAt(memories);
  return sorted.slice(0, count);
}
