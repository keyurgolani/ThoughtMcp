/**
 * WikiLinkAutocomplete Component
 *
 * Provides autocomplete functionality for wiki-style [[ link syntax.
 * Detects [[ typing in text inputs and shows a dropdown with matching memories.
 * Creates waypoint connections when links are inserted.
 *
 * Requirements: 41.1, 41.2
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getDefaultClient } from '../../api/client';
import type { LinkType, Memory } from '../../types/api';
import { getSectorColor } from '../../utils/visualization';
import { GlassPanel } from './GlassPanel';

// ============================================================================
// Types
// ============================================================================

export interface WikiLinkAutocompleteProps {
  /** Current search query (text after [[) */
  searchQuery: string;
  /** List of memories to search through */
  memories: Memory[];
  /** Whether the autocomplete dropdown is open */
  isOpen: boolean;
  /** Callback when a memory is selected */
  onSelect: (memory: Memory) => void;
  /** Callback when the dropdown should close */
  onClose: () => void;
  /** Position of the dropdown relative to the viewport */
  position: { x: number; y: number; width?: number };
  /** Maximum number of results to show */
  maxResults?: number;
  /** Ref to the container element for click outside detection */
  containerRef?: React.RefObject<HTMLDivElement>;
}

export interface WikiLinkInputProps {
  /** Current value of the input */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** List of memories available for linking */
  memories: Memory[];
  /** Callback when a memory link is inserted */
  onLinkInsert?: (memory: Memory, linkText: string) => void;
  /** Callback when a waypoint connection is created */
  onWaypointCreated?: (sourceId: string, targetId: string, linkType: LinkType) => void;
  /** Source memory ID for creating waypoint connections */
  sourceMemoryId?: string;
  /** User ID for API calls */
  userId?: string;
  /** Whether to create waypoint connections on link insert (default: true) */
  createWaypointOnInsert?: boolean;
  /** Link type for waypoint connections (default: 'semantic') */
  defaultLinkType?: LinkType;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the input is multiline (textarea) */
  multiline?: boolean;
  /** Number of rows for multiline input */
  rows?: number;
  /** Whether to auto-focus the input on mount */
  autoFocus?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect [[ pattern in text and extract the search query
 * Returns null if no [[ pattern is found, or the query text after [[
 */
export function detectWikiLinkPattern(
  text: string,
  cursorPosition: number
): { query: string; startIndex: number } | null {
  // Look backwards from cursor to find [[
  const textBeforeCursor = text.substring(0, cursorPosition);
  const lastOpenBrackets = textBeforeCursor.lastIndexOf('[[');

  if (lastOpenBrackets === -1) {
    return null;
  }

  // Check if there's a closing ]] between [[ and cursor
  const textBetween = textBeforeCursor.substring(lastOpenBrackets + 2);
  if (textBetween.includes(']]')) {
    return null;
  }

  // Extract the query (text after [[)
  const query = textBetween;

  return {
    query,
    startIndex: lastOpenBrackets,
  };
}

/**
 * Extract title from memory content (first line or first 50 characters)
 *
 * Requirements: 41.5
 */
export function extractTitle(content: string): string {
  const lines = content.split('\n');
  const firstLine = (lines[0] ?? '').trim();
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return firstLine.substring(0, 50).trim();
}

/**
 * Calculate match score for a memory against a search query.
 * Higher scores indicate better matches.
 *
 * Scoring:
 * - Title exact match: 100 points
 * - Title starts with query: 80 points
 * - Title contains query: 60 points
 * - Content starts with query: 50 points
 * - Content contains query: 30 points
 * - Keywords match: 20 points
 * - Tags match: 15 points
 * - Category match: 10 points
 *
 * Requirements: 41.5
 */
export function calculateMatchScore(memory: Memory, query: string): number {
  const lowerQuery = query.toLowerCase().trim();
  if (lowerQuery.length === 0) {
    // When no query, score by recency (more recent = higher score)
    const createdTime = new Date(memory.createdAt).getTime();
    const now = Date.now();
    const ageInDays = (now - createdTime) / (1000 * 60 * 60 * 24);
    // Score from 100 (today) to 0 (365+ days old)
    return Math.max(0, 100 - ageInDays / 3.65);
  }

  let score = 0;
  const lowerContent = memory.content.toLowerCase();
  const title = extractTitle(memory.content).toLowerCase();

  // Title matching (highest priority)
  if (title === lowerQuery) {
    score += 100; // Exact title match
  } else if (title.startsWith(lowerQuery)) {
    score += 80; // Title starts with query
  } else if (title.includes(lowerQuery)) {
    score += 60; // Title contains query
  }

  // Content matching
  if (lowerContent.startsWith(lowerQuery)) {
    score += 50; // Content starts with query
  } else if (lowerContent.includes(lowerQuery)) {
    score += 30; // Content contains query
  }

  // Keywords matching
  if (memory.metadata.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery)) === true) {
    score += 20;
  }

  // Tags matching
  if (memory.metadata.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery)) === true) {
    score += 15;
  }

  // Category matching
  if (memory.metadata.category?.toLowerCase().includes(lowerQuery) === true) {
    score += 10;
  }

  return score;
}

/**
 * Filter and rank memories by search query in real-time.
 * Matches against title (first line of content) and full content.
 * Results are sorted by match score (best matches first).
 *
 * Requirements: 41.5
 */
export function filterMemoriesByQuery(memories: Memory[], query: string): Memory[] {
  const trimmedQuery = query.trim();

  // Score all memories
  const scoredMemories = memories.map((memory) => ({
    memory,
    score: calculateMatchScore(memory, trimmedQuery),
  }));

  // Filter out zero-score memories (no match) when there's a query
  const filtered =
    trimmedQuery.length === 0 ? scoredMemories : scoredMemories.filter((item) => item.score > 0);

  // Sort by score (highest first)
  filtered.sort((a, b) => b.score - a.score);

  // Return just the memories
  return filtered.map((item) => item.memory);
}

/**
 * Get a preview of memory content (first 60 characters)
 */
function getContentPreview(content: string, maxLength: number = 60): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength).trim() + '...';
}

// ============================================================================
// Waypoint Link Creation
// ============================================================================

export interface CreateWaypointLinkOptions {
  /** Source memory ID */
  sourceMemoryId: string;
  /** Target memory ID */
  targetMemoryId: string;
  /** User ID for API authentication */
  userId: string;
  /** Link type (default: 'semantic') */
  linkType?: LinkType;
}

export interface CreateWaypointLinkResult {
  /** Whether the link was created successfully */
  success: boolean;
  /** Error message if creation failed */
  error?: string;
  /** Source memory ID */
  sourceId: string;
  /** Target memory ID */
  targetId: string;
  /** Link type used */
  linkType: LinkType;
}

/**
 * Create a waypoint connection between two memories.
 *
 * This function creates a waypoint link by updating the source memory's content
 * to include a reference to the target memory. The server's waypoint graph builder
 * will detect this reference and create the actual graph edge.
 *
 * Note: The ThoughtMCP backend automatically creates waypoint links when memories
 * are stored or updated based on semantic similarity. This function provides a way
 * to explicitly create links through the wiki-link syntax.
 *
 * Requirements: 41.2
 *
 * @param options - Options for creating the waypoint link
 * @returns Result of the link creation operation
 */
export async function createWaypointLink(
  options: CreateWaypointLinkOptions
): Promise<CreateWaypointLinkResult> {
  const { sourceMemoryId, targetMemoryId, userId, linkType = 'semantic' } = options;

  // Validate inputs
  if (!sourceMemoryId || !targetMemoryId) {
    return {
      success: false,
      error: 'Source and target memory IDs are required',
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  }

  if (sourceMemoryId === targetMemoryId) {
    return {
      success: false,
      error: 'Cannot create a link from a memory to itself',
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  }

  try {
    const client = getDefaultClient();

    // Update the source memory to trigger waypoint link creation
    // The server's waypoint graph builder will process this update and
    // potentially create new links based on the updated content/metadata
    await client.updateMemory({
      memoryId: sourceMemoryId,
      userId,
      // Update keywords to include the target memory reference
      // This helps the waypoint builder identify the connection
      metadata: {
        keywords: [`linked:${targetMemoryId}`, `linktype:${linkType}`],
      },
    });

    return {
      success: true,
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create waypoint link';
    console.error('Failed to create waypoint link:', error);

    return {
      success: false,
      error: errorMessage,
      sourceId: sourceMemoryId,
      targetId: targetMemoryId,
      linkType,
    };
  }
}

/**
 * Insert a wiki link reference into text and optionally create a waypoint connection.
 *
 * This is a convenience function that combines text insertion with waypoint creation.
 *
 * Requirements: 41.2
 *
 * @param text - Current text value
 * @param startIndex - Index where [[ starts
 * @param cursorPosition - Current cursor position
 * @param memory - Memory to link to
 * @param options - Optional waypoint creation options
 * @returns Object with new text value and link creation result
 */
export async function insertWikiLinkWithWaypoint(
  text: string,
  startIndex: number,
  cursorPosition: number,
  memory: Memory,
  options?: {
    sourceMemoryId?: string;
    userId?: string;
    createWaypoint?: boolean;
    linkType?: LinkType;
  }
): Promise<{
  newText: string;
  linkText: string;
  newCursorPosition: number;
  waypointResult?: CreateWaypointLinkResult;
}> {
  // Create the link text: [[memory-id|preview]]
  const preview = getContentPreview(memory.content, 30);
  const linkText = `[[${memory.id}|${preview}]]`;

  // Replace the [[ and query with the full link
  const beforeLink = text.substring(0, startIndex);
  const afterLink = text.substring(cursorPosition);
  const newText = beforeLink + linkText + afterLink;
  const newCursorPosition = startIndex + linkText.length;

  // Create waypoint connection if requested
  if (
    options?.createWaypoint === true &&
    options.sourceMemoryId !== undefined &&
    options.sourceMemoryId !== '' &&
    options.userId !== undefined &&
    options.userId !== ''
  ) {
    const waypointOptions: CreateWaypointLinkOptions = {
      sourceMemoryId: options.sourceMemoryId,
      targetMemoryId: memory.id,
      userId: options.userId,
    };

    // Only add linkType if it's defined
    if (options.linkType !== undefined) {
      waypointOptions.linkType = options.linkType;
    }

    const waypointResult = await createWaypointLink(waypointOptions);

    return {
      newText,
      linkText,
      newCursorPosition,
      waypointResult,
    };
  }

  return {
    newText,
    linkText,
    newCursorPosition,
  };
}

// ============================================================================
// WikiLinkAutocomplete Component
// ============================================================================

/**
 * WikiLinkAutocomplete - Dropdown component for wiki link autocomplete
 *
 * Features:
 * - Shows matching memories based on search query
 * - Keyboard navigation (up/down arrows, enter to select, escape to close)
 * - Click to select with clear hover highlight
 * - Displays memory content preview and sector color
 * - Larger popup size for better visibility
 * - Positioned below the textarea
 *
 * Requirements: 41.1
 */
export function WikiLinkAutocomplete({
  searchQuery,
  memories,
  isOpen,
  onSelect,
  onClose,
  position,
  maxResults = 10,
  containerRef,
}: WikiLinkAutocompleteProps): React.ReactElement | null {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<HTMLDivElement>(null);

  // Use provided ref or internal ref
  const panelRef = containerRef ?? internalRef;

  // Filter memories based on search query
  const filteredMemories = useMemo(() => {
    return filterMemoriesByQuery(memories, searchQuery).slice(0, maxResults);
  }, [memories, searchQuery, maxResults]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
    setHoveredIndex(null);
  }, [filteredMemories]);

  // Handle keyboard navigation
  useEffect((): (() => void) | undefined => {
    if (!isOpen) return undefined;

    function handleKeyDown(e: KeyboardEvent): void {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredMemories.length - 1));
          setHoveredIndex(null);
          break;
        case 'ArrowUp':
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          setHoveredIndex(null);
          break;
        case 'Enter':
          e.preventDefault();
          e.stopPropagation();
          if (filteredMemories[selectedIndex]) {
            onSelect(filteredMemories[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          e.stopPropagation(); // Prevent modal from closing
          onClose();
          break;
        case 'Tab':
          // Close on tab
          e.stopPropagation();
          onClose();
          break;
      }
    }

    // Use capture phase to intercept events before they reach the modal
    window.addEventListener('keydown', handleKeyDown, true);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, filteredMemories, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredMemories.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, filteredMemories.length]);

  if (!isOpen || filteredMemories.length === 0) {
    return null;
  }

  // Determine which index to highlight (hover takes precedence)
  const highlightedIndex = hoveredIndex !== null ? hoveredIndex : selectedIndex;

  // Use portal to render dropdown at document body level
  // This ensures it's not affected by parent transforms/filters (like modal backdrop-filter)
  const dropdownContent = (
    <div ref={panelRef}>
      <GlassPanel
        variant="floating"
        className="fixed max-h-96 overflow-hidden wiki-link-autocomplete"
        style={{
          left: position.x,
          top: position.y,
          width: position.width ?? 320, // Match textarea width, fallback to 320px
          zIndex: 10000, // Very high to ensure it's above everything
        }}
      >
        <div ref={listRef} className="overflow-y-auto max-h-80">
          {filteredMemories.map((memory, index) => {
            const isHighlighted = index === highlightedIndex;
            const sectorColor = getSectorColor(memory.primarySector);

            return (
              <button
                key={memory.id}
                type="button"
                className="w-full text-left px-4 py-3 transition-all duration-150 flex items-start gap-3 border-b border-ui-border/30 last:border-b-0"
                style={{
                  backgroundColor: isHighlighted ? 'var(--theme-primary-bg)' : 'transparent',
                  borderLeft: isHighlighted
                    ? '3px solid var(--theme-primary)'
                    : '3px solid transparent',
                }}
                onClick={() => {
                  onSelect(memory);
                }}
                onMouseEnter={() => {
                  setHoveredIndex(index);
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                }}
              >
                {/* Sector color indicator */}
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: sectorColor }}
                />

                {/* Memory info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm"
                    style={{
                      color: isHighlighted
                        ? 'var(--theme-text-primary)'
                        : 'var(--theme-text-secondary)',
                      fontWeight: isHighlighted ? 500 : 400,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.4',
                    }}
                  >
                    {getContentPreview(memory.content, 150)}
                  </div>
                  <div
                    className="text-xs mt-1 flex items-center gap-2"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <span
                      className="capitalize px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${sectorColor}20`,
                        color: sectorColor,
                        fontSize: '10px',
                      }}
                    >
                      {memory.primarySector}
                    </span>
                    {memory.metadata.tags && memory.metadata.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {memory.metadata.tags.slice(0, 2).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                {isHighlighted && (
                  <div className="flex-shrink-0 text-xs" style={{ color: 'var(--theme-primary)' }}>
                    ↵
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div
          className="px-4 py-2 border-t text-xs flex items-center justify-between"
          style={{
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-text-muted)',
            backgroundColor: 'var(--theme-surface-sunken)',
          }}
        >
          <div>
            <span className="mr-4">↑↓ Navigate</span>
            <span className="mr-4">↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div style={{ color: 'var(--theme-text-tertiary)' }}>
            {filteredMemories.length} result{filteredMemories.length !== 1 ? 's' : ''}
          </div>
        </div>
      </GlassPanel>
    </div>
  );

  // Render using portal to escape modal's stacking context
  return createPortal(dropdownContent, document.body);
}

// ============================================================================
// WikiLinkInput Component
// ============================================================================

/**
 * WikiLinkInput - Input component with built-in wiki link autocomplete
 *
 * Features:
 * - Detects [[ typing and shows autocomplete
 * - Inserts [[memory-id|preview]] on selection
 * - Creates waypoint connections to selected memories
 * - Works with both input and textarea elements
 *
 * Requirements: 41.1, 41.2
 */
export function WikiLinkInput({
  value,
  onChange,
  memories,
  onLinkInsert,
  onWaypointCreated,
  sourceMemoryId,
  userId,
  createWaypointOnInsert = true,
  defaultLinkType = 'semantic',
  placeholder,
  className = '',
  multiline = false,
  rows = 3,
  autoFocus = false,
}: WikiLinkInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ x: 0, y: 0, width: 320 });
  const [wikiLinkStartIndex, setWikiLinkStartIndex] = useState<number | null>(null);
  const [isCreatingWaypoint, setIsCreatingWaypoint] = useState(false);

  // Auto-focus the input when autoFocus is true
  useEffect((): (() => void) | undefined => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure the modal animation has started
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return (): void => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [autoFocus]);

  // Recalculate position when autocomplete opens (ensures correct position after modal animation)
  useEffect((): (() => void) | undefined => {
    if (isAutocompleteOpen && inputRef.current) {
      // Small delay to ensure any animations have completed
      const timer = setTimeout(() => {
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const dropdownHeight = 384;

          let yPos = rect.bottom + 2;
          if (yPos + dropdownHeight > viewportHeight - 20) {
            yPos = Math.max(20, rect.top - dropdownHeight - 2);
          }

          setAutocompletePosition({
            x: rect.left,
            y: yPos,
            width: rect.width, // Match textarea width
          });
        }
      }, 50);
      return (): void => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [isAutocompleteOpen]);

  // Handle input change and detect [[ pattern
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart ?? newValue.length;

      onChange(newValue);

      // Detect [[ pattern
      const wikiLink = detectWikiLinkPattern(newValue, cursorPosition);

      if (wikiLink) {
        setAutocompleteQuery(wikiLink.query);
        setWikiLinkStartIndex(wikiLink.startIndex);
        setIsAutocompleteOpen(true);

        // Calculate position for dropdown - position below the textarea at its bottom edge
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          // Get viewport dimensions to ensure dropdown stays visible
          const viewportHeight = window.innerHeight;
          const dropdownHeight = 384; // max-h-96 = 24rem = 384px

          // Calculate y position - prefer below textarea, but flip above if not enough space
          let yPos = rect.bottom + 2; // 2px gap below textarea
          if (yPos + dropdownHeight > viewportHeight - 20) {
            // Not enough space below, position above the textarea
            yPos = Math.max(20, rect.top - dropdownHeight - 2);
          }

          setAutocompletePosition({
            x: rect.left, // Align with left edge of textarea
            y: yPos,
            width: rect.width, // Match textarea width
          });
        }
      } else {
        setIsAutocompleteOpen(false);
        setWikiLinkStartIndex(null);
      }
    },
    [onChange]
  );

  // Handle memory selection from autocomplete
  const handleSelect = useCallback(
    async (memory: Memory) => {
      if (wikiLinkStartIndex === null) return;

      const cursorPosition = inputRef.current?.selectionStart ?? value.length;

      // Determine if we should create a waypoint connection
      const shouldCreateWaypoint =
        createWaypointOnInsert &&
        sourceMemoryId !== undefined &&
        sourceMemoryId !== '' &&
        userId !== undefined &&
        userId !== '' &&
        sourceMemoryId !== memory.id;

      // Use the helper function to insert link and optionally create waypoint
      setIsCreatingWaypoint(shouldCreateWaypoint);

      try {
        const result = await insertWikiLinkWithWaypoint(
          value,
          wikiLinkStartIndex,
          cursorPosition,
          memory,
          shouldCreateWaypoint
            ? {
                sourceMemoryId,
                userId,
                createWaypoint: true,
                linkType: defaultLinkType,
              }
            : undefined
        );

        // Update the text value
        onChange(result.newText);
        setIsAutocompleteOpen(false);
        setWikiLinkStartIndex(null);

        // Notify parent about the link insertion
        onLinkInsert?.(memory, result.linkText);

        // Notify parent about waypoint creation if successful
        if (
          result.waypointResult?.success === true &&
          sourceMemoryId !== undefined &&
          sourceMemoryId !== ''
        ) {
          onWaypointCreated?.(sourceMemoryId, memory.id, defaultLinkType);
        }

        // Focus back on input and set cursor after the link
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
          }
        }, 0);
      } catch (error) {
        console.error('Failed to insert wiki link:', error);
        // Still close the autocomplete even on error
        setIsAutocompleteOpen(false);
        setWikiLinkStartIndex(null);
      } finally {
        setIsCreatingWaypoint(false);
      }
    },
    [
      value,
      wikiLinkStartIndex,
      onChange,
      onLinkInsert,
      onWaypointCreated,
      sourceMemoryId,
      userId,
      createWaypointOnInsert,
      defaultLinkType,
    ]
  );

  // Handle close
  const handleClose = useCallback(() => {
    setIsAutocompleteOpen(false);
    setWikiLinkStartIndex(null);
  }, []);

  // Close autocomplete when clicking outside
  useEffect(() => {
    if (!isAutocompleteOpen) return;

    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target as Node;
      const isInsideInput = inputRef.current?.contains(target) === true;
      const isInsideAutocomplete = autocompleteRef.current?.contains(target) === true;

      if (!isInsideInput && !isInsideAutocomplete) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAutocompleteOpen, handleClose]);

  const inputClassName = `
    w-full bg-ui-surface/50 border border-ui-border rounded-md
    px-3 py-2 text-text-primary placeholder-text-tertiary
    focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30
    transition-colors duration-fast
    ${isCreatingWaypoint ? 'opacity-70 cursor-wait' : ''}
    ${className}
  `;

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={inputClassName}
          rows={rows}
          disabled={isCreatingWaypoint}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={inputClassName}
          disabled={isCreatingWaypoint}
        />
      )}

      {/* Loading indicator for waypoint creation */}
      {isCreatingWaypoint && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <svg
            className="animate-spin h-4 w-4 text-accent-cyan"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <WikiLinkAutocomplete
        searchQuery={autocompleteQuery}
        memories={memories}
        isOpen={isAutocompleteOpen && !isCreatingWaypoint}
        onSelect={(memory) => {
          void handleSelect(memory);
        }}
        onClose={handleClose}
        position={autocompletePosition}
        containerRef={autocompleteRef}
      />
    </div>
  );
}

export default WikiLinkAutocomplete;
