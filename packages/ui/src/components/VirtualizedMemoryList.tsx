/**
 * VirtualizedMemoryList Component
 *
 * A virtualized list component for efficiently rendering large lists of memories.
 * Uses react-window for virtualization to maintain 60fps scroll performance.
 *
 * Requirements: 4.1, 4.2, 4.5
 * - 4.1: Use virtualized rendering for >100 memories
 * - 4.2: Only render visible items plus overscan buffer
 * - 4.5: Support variable height items
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactElement,
} from "react";
import {
  List,
  useDynamicRowHeight,
  type ListImperativeAPI,
  type RowComponentProps,
} from "react-window";
import type { Memory } from "../types/api";

// ============================================================================
// Types
// ============================================================================

export interface VirtualizedMemoryListProps {
  /** Array of memories to display */
  memories: Memory[];
  /** Callback when a memory is selected/clicked */
  onSelect: (memoryId: string) => void;
  /** Callback to load more memories (infinite scroll) */
  onLoadMore?: () => void;
  /** Whether there are more memories to load */
  hasMore?: boolean;
  /** Whether memories are currently loading */
  isLoading?: boolean;
  /** Overscan count for smooth scrolling (default: 5) */
  overscanCount?: number;
  /** Estimated item height for initial render (default: 100) */
  estimatedItemHeight?: number;
  /** Custom className for the container */
  className?: string;
  /** Render function for each memory item */
  renderItem: (props: MemoryItemRenderProps) => ReactElement;
  /** Currently selected memory IDs */
  selectedIds?: Set<string>;
  /** Callback when selection changes */
  onSelectionChange?: (memoryId: string) => void;
  /** Ref callback to access the list's imperative API for scrolling */
  listRef?: React.RefObject<ListImperativeAPI>;
}

export interface MemoryItemRenderProps {
  memory: Memory;
  index: number;
  style: CSSProperties;
  isSelected: boolean;
  onSelect: () => void;
  onSelectionChange: () => void;
}

interface RowData {
  memories: Memory[];
  onSelect: (memoryId: string) => void;
  renderItem: (props: MemoryItemRenderProps) => ReactElement;
  selectedIds: Set<string>;
  onSelectionChange: (memoryId: string) => void;
  dynamicRowHeight: ReturnType<typeof useDynamicRowHeight>;
}

// ============================================================================
// Constants
// ============================================================================

/** Default overscan count for smooth scrolling */
const DEFAULT_OVERSCAN_COUNT = 5;

/** Default estimated item height */
const DEFAULT_ESTIMATED_ITEM_HEIGHT = 100;

// ============================================================================
// Row Component
// ============================================================================

/**
 * Individual row component for the virtualized list.
 * Uses dynamic row height measurement for variable height items.
 */
function MemoryRow({
  index,
  style,
  ariaAttributes,
  memories,
  onSelect,
  renderItem,
  selectedIds,
  onSelectionChange,
  dynamicRowHeight,
}: RowComponentProps<RowData>): ReactElement {
  const memory = memories[index];
  const rowRef = useRef<HTMLDivElement>(null);

  // Observe row element for dynamic height measurement
  useEffect(() => {
    if (rowRef.current) {
      const cleanup = dynamicRowHeight.observeRowElements([rowRef.current]);
      return cleanup;
    }
    return undefined;
  }, [dynamicRowHeight]);

  // Handle case where memory doesn't exist at this index (shouldn't happen but handle gracefully)
  if (!memory) {
    return <div style={style} {...ariaAttributes} data-index={index} />;
  }

  const isSelected = selectedIds.has(memory.id);

  return (
    <div style={style} {...ariaAttributes} ref={rowRef} data-index={index}>
      {renderItem({
        memory,
        index,
        style: {},
        isSelected,
        onSelect: () => onSelect(memory.id),
        onSelectionChange: () => onSelectionChange(memory.id),
      })}
    </div>
  );
}

// ============================================================================
// Loading Indicator
// ============================================================================

function LoadingIndicator(): ReactElement {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center gap-2 text-ui-text-muted">
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm">Loading more memories...</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * VirtualizedMemoryList - Efficiently renders large lists of memories
 *
 * Uses react-window's List component for virtualization, which:
 * - Only renders visible items plus overscan buffer
 * - Supports variable height items via useDynamicRowHeight
 * - Maintains smooth 60fps scrolling
 *
 * Requirements: 4.1, 4.2, 4.5
 */
export function VirtualizedMemoryList({
  memories,
  onSelect,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  overscanCount = DEFAULT_OVERSCAN_COUNT,
  estimatedItemHeight = DEFAULT_ESTIMATED_ITEM_HEIGHT,
  className = "",
  renderItem,
  selectedIds = new Set(),
  onSelectionChange,
  listRef: externalListRef,
}: VirtualizedMemoryListProps): ReactElement {
  const internalListRef = useRef<ListImperativeAPI>(null);
  // Use external ref if provided, otherwise use internal ref
  const listRef = externalListRef ?? internalListRef;

  // Use dynamic row height for variable height items
  // Key changes when memories array changes to reset measurements
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: estimatedItemHeight,
    key: memories.length,
  });

  // Handle selection change with fallback
  const handleSelectionChange = useCallback(
    (memoryId: string) => {
      if (onSelectionChange) {
        onSelectionChange(memoryId);
      }
    },
    [onSelectionChange]
  );

  // Handle rows rendered for infinite scroll
  const handleRowsRendered = useCallback(
    (
      visibleRows: { startIndex: number; stopIndex: number },
      _allRows: { startIndex: number; stopIndex: number }
    ) => {
      if (!onLoadMore || !hasMore || isLoading) {
        return;
      }

      // Check if we're near the end of the list
      const { stopIndex } = visibleRows;
      const threshold = Math.max(0, memories.length - 5);
      if (stopIndex >= threshold) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading, memories.length]
  );

  // Memoize row props to prevent unnecessary re-renders
  const rowProps = useMemo<RowData>(
    () => ({
      memories,
      onSelect,
      renderItem,
      selectedIds,
      onSelectionChange: handleSelectionChange,
      dynamicRowHeight,
    }),
    [memories, onSelect, renderItem, selectedIds, handleSelectionChange, dynamicRowHeight]
  );

  return (
    <div className={`virtualized-memory-list h-full w-full ${className}`}>
      <List
        listRef={listRef}
        rowCount={memories.length}
        rowHeight={dynamicRowHeight}
        rowComponent={MemoryRow}
        rowProps={rowProps}
        overscanCount={overscanCount}
        onRowsRendered={handleRowsRendered}
        className="virtualized-list-inner"
      />
      {isLoading && <LoadingIndicator />}
    </div>
  );
}

// Re-export ListImperativeAPI for consumers who need to use the listRef
export type { ListImperativeAPI } from "react-window";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Scroll to a specific memory in the list
 */
export function scrollToMemory(
  listRef: React.RefObject<ListImperativeAPI | null>,
  memories: Memory[],
  memoryId: string,
  align: "start" | "center" | "end" | "smart" | "auto" = "smart"
): void {
  if (!listRef.current) return;

  const index = memories.findIndex((m) => m.id === memoryId);
  if (index >= 0) {
    listRef.current.scrollToRow({ index, align });
  }
}

/**
 * Check if virtualization should be enabled based on item count
 * Requirement 4.1: Use virtualized rendering for >100 memories
 */
export function shouldUseVirtualization(itemCount: number, threshold = 100): boolean {
  return itemCount > threshold;
}

export default VirtualizedMemoryList;
