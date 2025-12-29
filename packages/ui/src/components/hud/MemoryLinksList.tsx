/**
 * MemoryLinksList Component
 *
 * A searchable list of memories for linking/unlinking in the Memory Modal.
 * Displays linked memories first with unlink buttons, followed by
 * unlinked memories with link buttons.
 *
 * Requirements: 7.6, 7.7, 7.8
 */

import { Link2, Link2Off, Search } from "lucide-react";
import { useMemo, type ReactElement } from "react";
import type { Memory } from "../../types/api";
import { MemoryContentPreview } from "./MemoryContentPreview";
import { SectorBadge } from "./SectorBadge";

// ============================================================================
// Types
// ============================================================================

export interface MemoryLinksListProps {
  /** ID of the current memory being viewed/edited (excluded from list) */
  currentMemoryId?: string;
  /** IDs of memories currently linked to the current memory */
  linkedMemoryIds: string[];
  /** All available memories to display */
  availableMemories: Memory[];
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Callback when a memory should be linked */
  onLink: (memoryId: string) => void;
  /** Callback when a memory should be unlinked */
  onUnlink: (memoryId: string) => void;
  /** Whether link/unlink actions are disabled */
  disabled?: boolean;
  /** Optional className for the container */
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MemoryListItemProps {
  memory: Memory;
  isLinked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function MemoryListItem({
  memory,
  isLinked,
  onToggle,
  disabled,
}: MemoryListItemProps): ReactElement {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-ui-background/50 border border-ui-border/30 rounded-lg hover:border-ui-border/50 transition-colors">
      {/* Icon indicator for memory type */}
      <SectorBadge sector={memory.primarySector} variant="icon" size="sm" className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ui-text-primary overflow-hidden" style={{ maxHeight: "48px" }}>
          <MemoryContentPreview content={memory.content} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs font-medium capitalize"
            style={{ color: `var(--sector-${memory.primarySector}-color)` }}
          >
            {memory.primarySector}
          </span>
          <span className="text-xs text-ui-text-muted">•</span>
          <span className="text-xs text-ui-text-muted">
            {Math.round(memory.strength * 100)}% strength
          </span>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isLinked
            ? "bg-status-error/20 hover:bg-status-error/30 text-status-error"
            : "bg-ui-accent-primary/20 hover:bg-ui-accent-primary/30 text-ui-accent-primary"
        }`}
        title={isLinked ? "Unlink memory" : "Link memory"}
        aria-label={
          isLinked
            ? `Unlink memory: ${memory.content.substring(0, 30)}`
            : `Link memory: ${memory.content.substring(0, 30)}`
        }
      >
        {isLinked ? <Link2Off size={16} /> : <Link2 size={16} />}
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MemoryLinksList({
  currentMemoryId,
  linkedMemoryIds,
  availableMemories,
  searchQuery,
  onSearchChange,
  onLink,
  onUnlink,
  disabled = false,
  className = "",
}: MemoryLinksListProps): ReactElement {
  // Filter and sort memories
  const { linkedMemories, unlinkedMemories } = useMemo(() => {
    // Exclude current memory from the list
    const filteredMemories = availableMemories.filter((m) => m.id !== currentMemoryId);

    // Apply search filter
    const searchLower = searchQuery.toLowerCase().trim();
    const searchFiltered =
      searchLower !== ""
        ? filteredMemories.filter(
            (m) =>
              m.content.toLowerCase().includes(searchLower) ||
              m.primarySector.toLowerCase().includes(searchLower) ||
              (m.metadata.tags !== undefined &&
                m.metadata.tags.some((tag) => tag.toLowerCase().includes(searchLower))) ||
              (m.metadata.keywords !== undefined &&
                m.metadata.keywords.some((kw) => kw.toLowerCase().includes(searchLower)))
          )
        : filteredMemories;

    // Separate linked and unlinked
    const linkedSet = new Set(linkedMemoryIds);
    const linked = searchFiltered.filter((m) => linkedSet.has(m.id));
    const unlinked = searchFiltered.filter((m) => !linkedSet.has(m.id));

    return {
      linkedMemories: linked,
      unlinkedMemories: unlinked,
    };
  }, [availableMemories, currentMemoryId, linkedMemoryIds, searchQuery]);

  const totalCount = linkedMemories.length + unlinkedMemories.length;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Search Bar */}
      <div className="flex-shrink-0 mb-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
            }}
            placeholder="Search memories..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-ui-background/70 border border-ui-border/50 rounded-lg text-ui-text-primary placeholder:text-ui-text-muted focus:outline-none focus:border-ui-border-active focus:ring-2 focus:ring-ui-accent-primary/20 hover:border-ui-border-hover transition-colors"
            aria-label="Search memories to link"
          />
        </div>
      </div>

      {/* Memory List - Independently Scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-8">
        {totalCount === 0 ? (
          <div className="text-center py-8 text-ui-text-muted text-sm">
            {searchQuery ? "No memories match your search" : "No memories available"}
          </div>
        ) : (
          <>
            {/* Linked Memories Section */}
            {linkedMemories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Link2 size={14} className="text-ui-accent-primary" />
                  <h4 className="text-xs font-medium text-ui-text-secondary uppercase tracking-wide">
                    Linked ({linkedMemories.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {linkedMemories.map((memory) => (
                    <MemoryListItem
                      key={memory.id}
                      memory={memory}
                      isLinked={true}
                      onToggle={() => {
                        onUnlink(memory.id);
                      }}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unlinked Memories Section */}
            {unlinkedMemories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Link2Off size={14} className="text-ui-text-muted" />
                  <h4 className="text-xs font-medium text-ui-text-secondary uppercase tracking-wide">
                    Available ({unlinkedMemories.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {unlinkedMemories.map((memory) => (
                    <MemoryListItem
                      key={memory.id}
                      memory={memory}
                      isLinked={false}
                      onToggle={() => {
                        onLink(memory.id);
                      }}
                      disabled={disabled}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default MemoryLinksList;
