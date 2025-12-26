/**
 * WikiLinkAutocomplete Component
 *
 * Provides autocomplete functionality for wiki-style [[ link syntax.
 * Detects [[ typing in text inputs and shows a dropdown with matching memories.
 * Creates waypoint connections when links are inserted.
 *
 * Requirements: 41.1, 41.2
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { LinkType, Memory } from "../../types/api";
import { getSectorColor } from "../../utils/visualization";
import { GlassPanel } from "./GlassPanel";

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

import {
  detectWikiLinkPattern,
  filterMemoriesByQuery,
  getContentPreview,
  insertWikiLinkWithWaypoint,
} from "../../utils/wikiLinkUtils";

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
        case "ArrowDown":
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredMemories.length - 1));
          setHoveredIndex(null);
          break;
        case "ArrowUp":
          e.preventDefault();
          e.stopPropagation();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          setHoveredIndex(null);
          break;
        case "Enter":
          e.preventDefault();
          e.stopPropagation();
          if (filteredMemories[selectedIndex]) {
            onSelect(filteredMemories[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          e.stopPropagation(); // Prevent modal from closing
          onClose();
          break;
        case "Tab":
          // Close on tab
          e.stopPropagation();
          onClose();
          break;
      }
    }

    // Use capture phase to intercept events before they reach the modal
    window.addEventListener("keydown", handleKeyDown, true);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, filteredMemories, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredMemories.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selectedElement?.scrollIntoView({ block: "nearest" });
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
                  backgroundColor: isHighlighted ? "var(--theme-primary-bg)" : "transparent",
                  borderLeft: isHighlighted
                    ? "3px solid var(--theme-primary)"
                    : "3px solid transparent",
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
                        ? "var(--theme-text-primary)"
                        : "var(--theme-text-secondary)",
                      fontWeight: isHighlighted ? 500 : 400,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: "1.4",
                    }}
                  >
                    {getContentPreview(memory.content, 150)}
                  </div>
                  <div
                    className="text-xs mt-1 flex items-center gap-2"
                    style={{ color: "var(--theme-text-muted)" }}
                  >
                    <span
                      className="capitalize px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: `${sectorColor}20`,
                        color: sectorColor,
                        fontSize: "10px",
                      }}
                    >
                      {memory.primarySector}
                    </span>
                    {memory.metadata.tags && memory.metadata.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {memory.metadata.tags.slice(0, 2).join(", ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                {isHighlighted && (
                  <div className="flex-shrink-0 text-xs" style={{ color: "var(--theme-primary)" }}>
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
            borderColor: "var(--theme-border)",
            color: "var(--theme-text-muted)",
            backgroundColor: "var(--theme-surface-sunken)",
          }}
        >
          <div>
            <span className="mr-4">↑↓ Navigate</span>
            <span className="mr-4">↵ Select</span>
            <span>Esc Close</span>
          </div>
          <div style={{ color: "var(--theme-text-tertiary)" }}>
            {filteredMemories.length} result{filteredMemories.length !== 1 ? "s" : ""}
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
  defaultLinkType = "semantic",
  placeholder,
  className = "",
  multiline = false,
  rows = 3,
  autoFocus = false,
}: WikiLinkInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
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
        sourceMemoryId !== "" &&
        userId !== undefined &&
        userId !== "" &&
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
          sourceMemoryId !== ""
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
        console.error("Failed to insert wiki link:", error);
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

    document.addEventListener("mousedown", handleClickOutside);
    return (): void => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAutocompleteOpen, handleClose]);

  const inputClassName = `
    w-full bg-ui-surface/50 border border-ui-border rounded-md
    px-3 py-2 text-text-primary placeholder-text-tertiary
    focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30
    transition-colors duration-fast
    ${isCreatingWaypoint ? "opacity-70 cursor-wait" : ""}
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
