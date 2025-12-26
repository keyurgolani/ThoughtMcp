/**
 * TagFilterPanel Component
 *
 * Collapsible tag panel for filtering the 3D graph by specific topics.
 * Displays tags with memory count badges and supports multi-tag filtering.
 * Positioned on the left edge of the viewport.
 *
 * Requirements: 42.1, 42.2
 */

import { useCallback, useMemo, useState } from 'react';
import { GlassPanel } from './GlassPanel';

// ============================================================================
// Types
// ============================================================================

export interface TagWithCount {
  /** Tag name */
  name: string;
  /** Number of memories with this tag */
  count: number;
  /** Nested child tags (for hierarchical tag structures) */
  children?: TagWithCount[];
}

export interface TagFilterPanelProps {
  /** List of tags with their memory counts */
  tags: TagWithCount[];
  /** Currently selected tags */
  selectedTags?: string[];
  /** Whether the panel is collapsed */
  isCollapsed?: boolean;
  /** Callback when a tag is selected */
  onTagSelect?: (tag: string) => void;
  /** Callback when a tag is deselected */
  onTagDeselect?: (tag: string) => void;
  /** Callback when collapse state changes */
  onToggleCollapse?: () => void;
  /** Callback when hovering over a tag (for 3D highlighting) */
  onTagHover?: (tag: string | null) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TagItemProps {
  tag: TagWithCount;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onHover: (hovering: boolean) => void;
  depth?: number;
}

/**
 * Individual tag item with count badge
 * Requirements: 42.2
 */
function TagItem({
  tag,
  isSelected,
  onSelect,
  onDeselect,
  onHover,
  depth = 0,
}: TagItemProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = tag.children !== undefined && tag.children.length > 0;

  const handleClick = useCallback(() => {
    if (isSelected) {
      onDeselect();
    } else {
      onSelect();
    }
  }, [isSelected, onSelect, onDeselect]);

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded]
  );

  // Calculate padding based on depth
  const paddingLeft = String(8 + depth * 12);

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        onMouseEnter={() => {
          onHover(true);
        }}
        onMouseLeave={() => {
          onHover(false);
        }}
        className={`
          w-full flex items-center justify-between gap-2
          px-2 py-1.5 rounded-md
          text-sm text-left
          transition-all duration-150
          ${
            isSelected
              ? 'bg-ui-accent-primary/20 text-ui-accent-primary border border-ui-accent-primary/30'
              : 'text-ui-text-secondary hover:bg-ui-surface-hover hover:text-ui-text-primary'
          }
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
        aria-pressed={isSelected}
        aria-label={`${isSelected ? 'Deselect' : 'Select'} tag: ${tag.name} (${String(tag.count)} memories)`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Expand/collapse button for nested tags */}
          {hasChildren ? (
            <span
              onClick={handleToggleExpand}
              className="p-0.5 hover:bg-ui-border rounded transition-colors cursor-pointer"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleToggleExpand(e as unknown as React.MouseEvent);
                }
              }}
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          ) : null}

          {/* Tag icon */}
          <svg
            className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-ui-accent-primary' : 'text-ui-text-muted'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>

          {/* Tag name */}
          <span className="truncate">{tag.name}</span>
        </div>

        {/* Count badge - Requirements: 42.2 */}
        <span
          className={`
            px-1.5 py-0.5 text-xs rounded-full font-mono
            ${
              isSelected
                ? 'bg-ui-accent-primary/30 text-ui-accent-primary'
                : 'bg-ui-border text-ui-text-muted'
            }
          `}
        >
          {tag.count}
        </span>
      </button>

      {/* Nested children */}
      {hasChildren && isExpanded && tag.children !== undefined ? (
        <div className="mt-0.5">
          {tag.children.map((child) => (
            <TagItem
              key={child.name}
              tag={child}
              isSelected={false} // Child selection handled separately
              onSelect={() => {
                /* no-op for nested children */
              }}
              onDeselect={() => {
                /* no-op for nested children */
              }}
              onHover={() => {
                /* no-op for nested children */
              }}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface CollapsedViewProps {
  selectedCount: number;
  totalCount: number;
  onExpand: () => void;
}

/**
 * Collapsed view showing only icon
 * Requirements: 42.5
 */
function CollapsedView({
  selectedCount,
  totalCount,
  onExpand,
}: CollapsedViewProps): React.ReactElement {
  return (
    <button
      onClick={onExpand}
      className="glass-panel-glow p-2.5 rounded-xl text-ui-text-secondary hover:text-ui-accent-primary transition-colors floating-glow relative"
      aria-label={`Expand tag filter panel. ${String(selectedCount)} of ${String(totalCount)} tags selected`}
    >
      {/* Tag icon */}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>

      {/* Selection indicator badge - positioned as overlay */}
      {selectedCount > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px] bg-ui-accent-primary text-ui-background rounded-full font-mono">
          {selectedCount}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TagFilterPanel - Collapsible tag panel for filtering the 3D graph
 *
 * Features:
 * - Displays tags with memory count badges (Requirement 42.2)
 * - Collapsible to icons to maximize 3D viewport (Requirement 42.5)
 * - Positioned on left edge (Requirement 42.1)
 * - Supports multi-tag selection
 * - Hover highlighting for 3D preview (Requirement 42.6)
 *
 * Requirements: 42.1, 42.2
 */
export function TagFilterPanel({
  tags,
  selectedTags = [],
  isCollapsed = false,
  onTagSelect,
  onTagDeselect,
  onToggleCollapse,
  onTagHover,
  className = '',
}: TagFilterPanelProps): React.ReactElement {
  // Sort tags by count (descending) for better UX
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => b.count - a.count);
  }, [tags]);

  // Calculate total memories across all tags
  const totalMemories = useMemo(() => {
    return tags.reduce((sum, tag) => sum + tag.count, 0);
  }, [tags]);

  // Handle tag selection
  const handleTagSelect = useCallback(
    (tagName: string) => {
      onTagSelect?.(tagName);
    },
    [onTagSelect]
  );

  // Handle tag deselection
  const handleTagDeselect = useCallback(
    (tagName: string) => {
      onTagDeselect?.(tagName);
    },
    [onTagDeselect]
  );

  // Handle tag hover
  const handleTagHover = useCallback(
    (tagName: string, hovering: boolean) => {
      onTagHover?.(hovering ? tagName : null);
    },
    [onTagHover]
  );

  // Handle clear all selection
  const handleClearAll = useCallback(() => {
    selectedTags.forEach((tag) => {
      onTagDeselect?.(tag);
    });
  }, [selectedTags, onTagDeselect]);

  // Collapsed view - Requirements: 42.5
  if (isCollapsed) {
    return (
      <CollapsedView
        selectedCount={selectedTags.length}
        totalCount={tags.length}
        onExpand={() => {
          onToggleCollapse?.();
        }}
      />
    );
  }

  // Expanded view - Requirements: 42.1, 42.2
  return (
    <GlassPanel
      variant="glow-purple"
      className={`w-56 floating-rounded-xl animate-pulse-glow-subtle ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-ui-border">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-ui-accent-secondary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <h3 className="text-sm font-medium neon-text-purple">Tags</h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Clear all button */}
          {selectedTags.length > 0 ? (
            <button
              onClick={handleClearAll}
              className="p-1 text-ui-text-muted hover:text-ui-text-primary transition-colors"
              aria-label="Clear all selected tags"
              title="Clear all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null}

          {/* Collapse button */}
          <button
            onClick={onToggleCollapse}
            className="p-1 text-ui-text-muted hover:text-ui-text-primary transition-colors"
            aria-label="Collapse tag panel"
            title="Collapse"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tag list */}
      <div className="p-2 max-h-80 overflow-y-auto space-y-0.5">
        {sortedTags.length === 0 ? (
          <div className="py-4 text-center text-sm text-ui-text-muted">No tags available</div>
        ) : (
          sortedTags.map((tag) => (
            <TagItem
              key={tag.name}
              tag={tag}
              isSelected={selectedTags.includes(tag.name)}
              onSelect={() => {
                handleTagSelect(tag.name);
              }}
              onDeselect={() => {
                handleTagDeselect(tag.name);
              }}
              onHover={(hovering) => {
                handleTagHover(tag.name, hovering);
              }}
            />
          ))
        )}
      </div>

      {/* Footer with summary */}
      <div className="px-3 py-2 border-t border-ui-border">
        <div className="flex justify-between items-center text-xs">
          <span className="text-ui-text-secondary">
            {selectedTags.length > 0 ? `${String(selectedTags.length)} selected` : 'All tags'}
          </span>
          <span className="text-ui-text-muted">{String(totalMemories)} memories</span>
        </div>
      </div>
    </GlassPanel>
  );
}

export default TagFilterPanel;
