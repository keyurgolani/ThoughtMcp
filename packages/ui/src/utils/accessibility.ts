/**
 * Accessibility Utility Functions
 *
 * Provides utility functions for accessibility features including ARIA labels
 * and reduced motion preference handling.
 * Requirements: 13.2, 13.4
 */

import type { GraphNode, MemorySectorType } from '@types';

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for content preview in ARIA labels */
const ARIA_CONTENT_PREVIEW_LENGTH = 50;

/** Sector type display names for ARIA labels */
const SECTOR_DISPLAY_NAMES: Record<MemorySectorType, string> = {
  episodic: 'Episodic',
  semantic: 'Semantic',
  procedural: 'Procedural',
  emotional: 'Emotional',
  reflective: 'Reflective',
};

// ============================================================================
// ARIA Label Generator (Requirements: 13.4)
// ============================================================================

/**
 * Generates a descriptive ARIA label for a memory node.
 * The label includes a content preview and connection count for screen readers.
 *
 * @param node - The graph node to generate a label for
 * @param connectionCount - Number of connections to/from this node
 * @returns Descriptive ARIA label string
 *
 * Requirements: 13.4
 */
export function generateAriaLabel(node: GraphNode, connectionCount: number): string {
  // Generate content preview (truncated if necessary)
  const contentPreview = truncateContent(node.content, ARIA_CONTENT_PREVIEW_LENGTH);

  // Get sector display name
  const sectorName = SECTOR_DISPLAY_NAMES[node.primarySector];

  // Format connection count text
  const connectionText = formatConnectionCount(connectionCount);

  // Construct the ARIA label
  return `${sectorName} memory: ${contentPreview}. ${connectionText}.`;
}

/**
 * Truncates content to a maximum length, adding ellipsis if truncated.
 * Attempts to break at word boundaries when possible.
 *
 * @param content - The content to truncate
 * @param maxLength - Maximum length for the preview
 * @returns Truncated content string
 */
export function truncateContent(content: string, maxLength: number): string {
  // Handle empty or whitespace-only content
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return 'Empty content';
  }

  // Return as-is if within limit
  if (trimmedContent.length <= maxLength) {
    return trimmedContent;
  }

  // Find a good break point (space) near the max length
  const truncated = trimmedContent.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  // If there's a space in the last third of the string, break there
  if (lastSpaceIndex > maxLength * 0.66) {
    return truncated.substring(0, lastSpaceIndex) + '...';
  }

  // Otherwise, just truncate at max length
  return truncated + '...';
}

/**
 * Formats the connection count for ARIA label.
 *
 * @param count - Number of connections
 * @returns Formatted connection count string
 */
export function formatConnectionCount(count: number): string {
  if (count < 0) {
    return 'No connections';
  }

  if (count === 0) {
    return 'No connections';
  }

  if (count === 1) {
    return '1 connection';
  }

  return String(count) + ' connections';
}

// ============================================================================
// Reduced Motion Preference Handler (Requirements: 13.2)
// ============================================================================

/**
 * Checks if the user prefers reduced motion.
 * Uses the prefers-reduced-motion media query.
 *
 * @returns true if user prefers reduced motion, false otherwise
 *
 * Requirements: 13.2
 */
export function prefersReducedMotion(): boolean {
  // Check if window and matchMedia are available (SSR safety)
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if matchMedia is available (some environments may not have it)
  const matchMediaFn = window.matchMedia as typeof window.matchMedia | undefined;
  if (matchMediaFn === undefined) {
    return false;
  }

  return matchMediaFn('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Creates a subscription to reduced motion preference changes.
 * Calls the callback whenever the preference changes.
 *
 * @param callback - Function to call when preference changes
 * @returns Cleanup function to remove the listener
 *
 * Requirements: 13.2
 */
export function subscribeToReducedMotion(callback: (prefersReduced: boolean) => void): () => void {
  // Check if window and matchMedia are available (SSR safety)
  if (typeof window === 'undefined') {
    return (): void => {
      // No-op cleanup function for SSR
    };
  }

  // Check if matchMedia is available (some environments may not have it)
  const matchMediaFn = window.matchMedia as typeof window.matchMedia | undefined;
  if (matchMediaFn === undefined) {
    return (): void => {
      // No-op cleanup function when matchMedia is unavailable
    };
  }

  const mediaQuery = matchMediaFn('(prefers-reduced-motion: reduce)');

  // Handler for media query changes
  const handler = (event: MediaQueryListEvent): void => {
    callback(event.matches);
  };

  // Add listener (using addEventListener for modern browsers)
  mediaQuery.addEventListener('change', handler);

  // Return cleanup function
  return (): void => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * Returns animation configuration based on reduced motion preference.
 * Provides a convenient way to conditionally disable animations.
 *
 * @param prefersReduced - Whether user prefers reduced motion
 * @returns Animation configuration object
 *
 * Requirements: 13.2
 */
export interface AnimationConfig {
  /** Whether animations should be enabled */
  enabled: boolean;
  /** Duration multiplier (0 for instant, 1 for normal) */
  durationMultiplier: number;
  /** Whether to use transitions */
  useTransitions: boolean;
}

export function getAnimationConfig(prefersReduced: boolean): AnimationConfig {
  if (prefersReduced) {
    return {
      enabled: false,
      durationMultiplier: 0,
      useTransitions: false,
    };
  }

  return {
    enabled: true,
    durationMultiplier: 1,
    useTransitions: true,
  };
}
