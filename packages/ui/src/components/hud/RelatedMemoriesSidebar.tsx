/**
 * RelatedMemoriesSidebar Component
 *
 * Displays semantically related memories alongside the current memory.
 * Shows relevance scores, shared keywords, and distinguishes between
 * direct links and semantic similarity. Also displays a summary of the
 * focused memory at the top so users understand what the related
 * memories relate to, even when the popup is closed.
 *
 * Requirements: 45.1, 45.2, 45.3, 45.4, 45.5, 45.6
 */

import React, { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Memory, MemorySectorType } from "../../types/api";
import { getSectorColor } from "../../utils/visualization";
import { GlassPanel } from "./GlassPanel";
import { MarkdownPreview } from "./MarkdownPreview";
import { MemoryModal, type MemoryModalMode, type MemoryModalSaveResult } from "./MemoryModal";
import { SectorBadge } from "./SectorBadge";
import { Skeleton } from "./Skeleton";

// ============================================================================
// Types
// ============================================================================

export type ConnectionType = "direct" | "semantic" | "inferred";

export interface RelatedMemory {
  /** The related memory */
  memory: Memory;
  /** Relevance score (0-1) */
  relevanceScore: number;
  /** Keywords shared between current and related memory */
  sharedKeywords: string[];
  /** Type of connection */
  connectionType: ConnectionType;
}

/** Suggested topic for exploration */
export interface SuggestedTopic {
  /** Topic name/label */
  name: string;
  /** Topic type (sector, tag, keyword) */
  type: "sector" | "tag" | "keyword";
  /** Number of memories with this topic */
  count?: number;
  /** Color for visual indicator */
  color?: string;
}

/** Suggested memory to link */
export interface SuggestedMemoryToLink {
  /** Memory to suggest */
  memory: Memory;
  /** Reason for suggestion */
  reason: string;
}

export interface RelatedMemoriesSidebarProps {
  /** The current memory being viewed */
  currentMemory: Memory | null;
  /** List of related memories */
  relatedMemories: RelatedMemory[];
  /** Callback when user clicks a related memory */
  onMemoryClick: (memoryId: string) => void;
  /** Whether related memories are being loaded */
  isLoading: boolean;
  /** Suggested topics to explore when no related memories (Requirement 45.5) */
  suggestedTopics?: SuggestedTopic[];
  /** Suggested memories to link when no related memories (Requirement 45.5) */
  suggestedMemoriesToLink?: SuggestedMemoryToLink[];
  /** Callback when user clicks a suggested topic */
  onTopicClick?: (topic: SuggestedTopic) => void;
  /** Callback when user wants to create a link */
  onCreateLink?: (memoryId: string) => void;
  /** Callback when memory is updated via modal */
  onMemoryUpdated?: (memory: Memory) => void;
  /** Callback when memory is deleted via modal */
  onMemoryDeleted?: (memoryId: string) => void;
  /** All available memories for WikiLink navigation */
  availableMemories?: Memory[];
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface RelevanceScoreProps {
  score: number;
}

/**
 * Visual relevance score indicator
 * Requirements: 45.2
 */
function RelevanceScore({ score }: RelevanceScoreProps): React.ReactElement {
  const percentage = Math.round(score * 100);
  const barColor = score >= 0.7 ? "bg-green-500" : score >= 0.4 ? "bg-yellow-500" : "bg-orange-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-ui-border rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${String(percentage)}%` }}
        />
      </div>
      <span className="text-xs text-ui-text-secondary w-8 text-right font-mono">
        {String(percentage)}%
      </span>
    </div>
  );
}

interface ConnectionTypeBadgeProps {
  type: ConnectionType;
}

/**
 * Badge showing the type of connection
 * Requirements: 45.4
 */
function ConnectionTypeBadge({ type }: ConnectionTypeBadgeProps): React.ReactElement {
  const config: Record<ConnectionType, { label: string; className: string }> = {
    direct: {
      label: "Direct Link",
      className: "bg-ui-accent-primary/20 text-ui-accent-primary border-ui-accent-primary/30",
    },
    semantic: {
      label: "Semantic",
      className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    },
    inferred: {
      label: "Inferred",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
  };

  const { label, className } = config[type];

  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${className}`}>
      {label}
    </span>
  );
}

interface SharedKeywordsProps {
  keywords: string[];
  maxDisplay?: number;
}

/**
 * Display shared keywords between memories
 * Requirements: 45.2
 */
function SharedKeywords({
  keywords,
  maxDisplay = 3,
}: SharedKeywordsProps): React.ReactElement | null {
  if (keywords.length === 0) {
    return null;
  }

  const displayKeywords = keywords.slice(0, maxDisplay);
  const remainingCount = keywords.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {displayKeywords.map((keyword) => (
        <span
          key={keyword}
          className="px-1.5 py-0.5 text-[10px] bg-ui-surface-hover rounded text-ui-text-secondary"
        >
          {keyword}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="px-1.5 py-0.5 text-[10px] text-ui-text-muted">
          +{String(remainingCount)} more
        </span>
      )}
    </div>
  );
}

interface RelatedMemoryItemProps {
  relatedMemory: RelatedMemory;
  onNavigate: () => void;
  onPreview: () => void;
}

/**
 * Individual related memory item
 * Requirements: 45.1, 45.2, 45.3, 45.4
 */
function RelatedMemoryItem({
  relatedMemory,
  onNavigate,
  onPreview,
}: RelatedMemoryItemProps): React.ReactElement {
  const { memory, relevanceScore, sharedKeywords, connectionType } = relatedMemory;

  // Get first line of content for BlockNote preview
  const firstLine = memory.content.split("\n")[0]?.trim() ?? memory.content.substring(0, 100);

  return (
    <div
      className={`
        w-full text-left p-3 rounded-lg border transition-all duration-200
        border-ui-border/50 bg-ui-surface/80
        hover:border-ui-accent-primary/50 hover:bg-ui-surface
        group
      `}
      style={{
        backdropFilter: "blur(12px)",
        boxShadow: `
          0 0 15px rgba(0, 255, 255, 0.08),
          0 0 30px rgba(0, 255, 255, 0.04),
          inset 0 0 20px rgba(0, 255, 255, 0.02)
        `,
      }}
    >
      {/* Header with sector indicator and connection type */}
      <div className="flex items-center justify-between mb-2">
        <SectorBadge sector={memory.primarySector} variant="dot" size="sm" />
        <span className="text-xs text-ui-text-secondary capitalize">{memory.primarySector}</span>
        <ConnectionTypeBadge type={connectionType} />
      </div>

      {/* Content preview - BlockNote rendered first line */}
      <button
        onClick={onPreview}
        className="w-full text-left mb-2 focus:outline-none focus:ring-1 focus:ring-ui-accent-primary/50 rounded"
        aria-label={`Preview memory: ${memory.content.substring(0, 80)}`}
      >
        <div className="text-sm text-ui-text-primary group-hover:text-ui-accent-primary transition-colors">
          <MarkdownPreview content={firstLine} maxLines={2} />
        </div>
      </button>

      {/* Relevance score - Requirements: 45.2 */}
      <div className="mb-1.5">
        <span className="text-[10px] text-ui-text-muted uppercase tracking-wide">Relevance</span>
        <RelevanceScore score={relevanceScore} />
      </div>

      {/* Shared keywords - Requirements: 45.2 */}
      {sharedKeywords.length > 0 && (
        <div>
          <span className="text-[10px] text-ui-text-muted uppercase tracking-wide">
            Shared Keywords
          </span>
          <SharedKeywords keywords={sharedKeywords} />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-ui-accent-primary bg-ui-accent-primary/10 hover:bg-ui-accent-primary/20 rounded transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Preview
        </button>
        <button
          onClick={onNavigate}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs text-ui-text-secondary hover:text-ui-accent-primary border border-ui-border hover:border-ui-accent-primary/50 rounded transition-colors"
        >
          <NavigateIcon />
          Navigate
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function FocusIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function RelatedIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="3" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="19" r="2" />
      <circle cx="5" cy="19" r="2" />
      <line x1="12" y1="9" x2="12" y2="5" />
      <line x1="14.5" y1="10.5" x2="17" y2="7" />
      <line x1="9.5" y1="10.5" x2="7" y2="7" />
      <line x1="14.5" y1="13.5" x2="17" y2="17" />
      <line x1="9.5" y1="13.5" x2="7" y2="17" />
    </svg>
  );
}

function NavigateIcon(): React.ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function LinkIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CompassIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function SparklesIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z" />
      <path d="M19 12l1 2 1-2 2-1-2-1-1-2-1 2-2 1 2 1z" />
    </svg>
  );
}

// ============================================================================
// Focused Memory Summary (Requirement 45.6)
// ============================================================================

interface FocusedMemorySummaryProps {
  /** The currently focused memory */
  memory: Memory;
  /** Callback when preview button is clicked */
  onPreview?: () => void;
}

/**
 * Displays a summary of the currently focused memory (metadata only)
 * Shows key details so users understand what the related memories relate to
 * Content is hidden to save space - use Preview button to view full content
 * Requirement 45.6
 */
function FocusedMemorySummary({
  memory,
  onPreview,
}: FocusedMemorySummaryProps): React.ReactElement {
  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${String(diffDays)} days ago`;
    return date.toLocaleDateString();
  };

  // Get title from content (first line or first 50 chars)
  const getTitle = (): string => {
    const firstLine = memory.content.split("\n")[0] ?? "";
    // Remove markdown headers
    const cleanTitle = firstLine.replace(/^#+\s*/, "").trim();
    if (cleanTitle.length > 50) {
      return cleanTitle.substring(0, 47) + "...";
    }
    return cleanTitle || "Untitled Memory";
  };

  // Get keywords and tags
  const keywords = memory.metadata.keywords ?? [];
  const tags = memory.metadata.tags ?? [];
  const displayKeywords = keywords.slice(0, 3);
  const displayTags = tags.slice(0, 3);

  return (
    <div className="mb-4 pb-3 border-b border-ui-border/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FocusIcon />
          <h4 className="text-xs font-semibold text-ui-text-primary uppercase tracking-wide">
            Focused Memory
          </h4>
        </div>
        {onPreview && (
          <button
            onClick={onPreview}
            className="flex items-center gap-1 px-2 py-1 text-xs text-ui-accent-primary bg-ui-accent-primary/10 hover:bg-ui-accent-primary/20 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Preview
          </button>
        )}
      </div>

      {/* Title (extracted from content) */}
      <h5 className="text-sm font-medium text-ui-text-primary mb-2 line-clamp-1">{getTitle()}</h5>

      {/* Memory details */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-ui-text-secondary">
        {/* Sector badge */}
        <SectorBadge sector={memory.primarySector} size="xs" />

        {/* Salience indicator */}
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-ui-surface/50">
          <span className="text-ui-text-muted">Salience:</span>
          <span className="font-mono">{String(Math.round(memory.salience * 100))}%</span>
        </span>

        {/* Date */}
        <span className="text-ui-text-muted">{formatDate(memory.createdAt)}</span>
      </div>

      {/* Keywords */}
      {displayKeywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {displayKeywords.map((keyword) => (
            <span
              key={keyword}
              className="px-1.5 py-0.5 text-[10px] bg-ui-accent-primary/10 text-ui-accent-primary rounded"
            >
              {keyword}
            </span>
          ))}
          {keywords.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] text-ui-text-muted">
              +{String(keywords.length - 3)} more
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {displayTags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] bg-ui-surface-hover text-ui-text-secondary rounded"
            >
              #{tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-1.5 py-0.5 text-[10px] text-ui-text-muted">
              +{String(tags.length - 3)} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Empty State with Suggestions (Requirement 45.5)
// ============================================================================

/** Default suggested topics when none provided */
const DEFAULT_SUGGESTED_TOPICS: SuggestedTopic[] = [
  { name: "episodic", type: "sector", color: getSectorColor("episodic") },
  { name: "semantic", type: "sector", color: getSectorColor("semantic") },
  { name: "procedural", type: "sector", color: getSectorColor("procedural") },
  { name: "emotional", type: "sector", color: getSectorColor("emotional") },
  { name: "reflective", type: "sector", color: getSectorColor("reflective") },
];

interface RelatedMemoriesEmptyStateProps {
  /** Current memory for context */
  currentMemory: Memory | null;
  /** Suggested topics to explore */
  suggestedTopics?: SuggestedTopic[] | undefined;
  /** Suggested memories to link */
  suggestedMemoriesToLink?: SuggestedMemoryToLink[] | undefined;
  /** Callback when topic is clicked */
  onTopicClick?: ((topic: SuggestedTopic) => void) | undefined;
  /** Callback when memory link is clicked */
  onCreateLink?: ((memoryId: string) => void) | undefined;
  /** Callback when memory is clicked for navigation (navigates viewport AND opens preview) */
  onMemoryClick?: ((memoryId: string) => void) | undefined;
  /** Callback to open memory preview modal */
  onMemoryPreview?: ((memory: Memory) => void) | undefined;
}

/**
 * Enhanced empty state for RelatedMemoriesSidebar
 * Shows suggestions for topics to explore and memories to link
 * Requirement 45.5
 */
function RelatedMemoriesEmptyState({
  currentMemory,
  suggestedTopics = DEFAULT_SUGGESTED_TOPICS,
  suggestedMemoriesToLink = [],
  onTopicClick,
  onCreateLink,
  onMemoryClick,
  onMemoryPreview,
}: RelatedMemoriesEmptyStateProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<"topics" | "memories">("topics");

  // Get sector-based topics from current memory
  const contextualTopics = useMemo(() => {
    if (!currentMemory) return suggestedTopics;

    // Prioritize topics related to current memory's sector
    const currentSector = currentMemory.primarySector;
    const sortedTopics = [...suggestedTopics].sort((a, b) => {
      if (a.name === currentSector) return -1;
      if (b.name === currentSector) return 1;
      return 0;
    });

    return sortedTopics;
  }, [currentMemory, suggestedTopics]);

  return (
    <div className="py-2">
      {/* Empty state header */}
      <div className="flex flex-col items-center text-center mb-4">
        <div className="w-12 h-12 rounded-full bg-ui-accent-primary/10 flex items-center justify-center mb-3">
          <SparklesIcon />
        </div>
        <h4 className="text-sm font-medium text-ui-text-primary mb-1">No Related Memories</h4>
        <p className="text-xs text-ui-text-secondary max-w-[200px]">
          {currentMemory
            ? "This memory doesn't have connections yet. Explore topics or link memories."
            : "Select a memory to discover related content."}
        </p>
      </div>

      {/* Tab navigation */}
      {currentMemory && (
        <>
          <div className="flex border-b border-ui-border mb-3">
            <button
              onClick={(): void => {
                setActiveTab("topics");
              }}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === "topics"
                  ? "text-ui-accent-primary border-b-2 border-ui-accent-primary"
                  : "text-ui-text-secondary hover:text-ui-text-primary"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <CompassIcon />
                Topics to Explore
              </span>
            </button>
            <button
              onClick={(): void => {
                setActiveTab("memories");
              }}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                activeTab === "memories"
                  ? "text-ui-accent-primary border-b-2 border-ui-accent-primary"
                  : "text-ui-text-secondary hover:text-ui-text-primary"
              }`}
            >
              <span className="flex items-center justify-center gap-1">
                <LinkIcon />
                Memories to Link
              </span>
            </button>
          </div>

          {/* Topics tab content */}
          {activeTab === "topics" && (
            <div className="space-y-2">
              <p className="text-[10px] text-ui-text-muted uppercase tracking-wide mb-2">
                Explore by sector
              </p>
              <div className="flex flex-wrap gap-2">
                {contextualTopics.map((topic) => (
                  <button
                    key={`${topic.type}-${topic.name}`}
                    onClick={() => onTopicClick?.(topic)}
                    className={`
                      px-2.5 py-1.5 text-xs rounded-lg
                      border border-ui-border
                      bg-ui-surface/50 hover:bg-ui-accent-primary/10
                      hover:border-ui-accent-primary/50
                      transition-all duration-200
                      flex items-center gap-1.5
                      group
                    `}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          topic.color ?? getSectorColor(topic.name as MemorySectorType),
                      }}
                    />
                    <span className="capitalize text-ui-text-secondary group-hover:text-ui-text-primary">
                      {topic.name}
                    </span>
                    {topic.count !== undefined && (
                      <span className="text-[10px] text-ui-text-muted">({topic.count})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tips section */}
              <div className="mt-4 p-2.5 rounded-lg bg-ui-surface/30 border border-ui-border/50">
                <p className="text-[10px] text-ui-text-muted uppercase tracking-wide mb-1.5">
                  💡 Tips to find connections
                </p>
                <ul className="text-xs text-ui-text-secondary space-y-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-ui-accent-primary">•</span>
                    Add keywords or tags to this memory
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-ui-accent-primary">•</span>
                    Use [[link]] syntax to connect memories
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-ui-accent-primary">•</span>
                    Create memories on similar topics
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Memories to link tab content */}
          {activeTab === "memories" && (
            <div className="space-y-2">
              {suggestedMemoriesToLink.length > 0 ? (
                <>
                  <p className="text-[10px] text-ui-text-muted uppercase tracking-wide mb-2">
                    Suggested memories to link
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {suggestedMemoriesToLink.map((suggestion) => (
                      <SuggestedMemoryItem
                        key={suggestion.memory.id}
                        suggestion={suggestion}
                        onNavigate={() => {
                          onMemoryClick?.(suggestion.memory.id);
                          onMemoryPreview?.(suggestion.memory);
                        }}
                        onLink={() => onCreateLink?.(suggestion.memory.id)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-ui-text-secondary mb-3">
                    No suggested memories available yet.
                  </p>
                  <p className="text-xs text-ui-text-muted">
                    Create more memories to see link suggestions here.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface SuggestedMemoryItemProps {
  suggestion: SuggestedMemoryToLink;
  onNavigate: () => void;
  onLink: () => void;
}

/**
 * Individual suggested memory item with navigate and link actions
 */
function SuggestedMemoryItem({
  suggestion,
  onNavigate,
  onLink,
}: SuggestedMemoryItemProps): React.ReactElement {
  const { memory, reason } = suggestion;

  return (
    <div
      className={`
        p-2.5 rounded-lg border transition-all duration-200
        border-ui-border/50 bg-ui-surface/80
        hover:border-ui-accent-primary/30 hover:bg-ui-surface
      `}
      style={{
        backdropFilter: "blur(12px)",
        boxShadow: `
          0 0 15px rgba(0, 255, 255, 0.08),
          0 0 30px rgba(0, 255, 255, 0.04),
          inset 0 0 20px rgba(0, 255, 255, 0.02)
        `,
      }}
    >
      {/* Header with sector indicator */}
      <div className="flex items-center gap-2 mb-1.5">
        <SectorBadge sector={memory.primarySector} variant="dot" size="xs" />
        <span className="text-[10px] text-ui-text-muted capitalize">{memory.primarySector}</span>
        <span className="text-[10px] text-ui-accent-secondary ml-auto">{reason}</span>
      </div>

      {/* Content preview */}
      <div className="text-xs text-ui-text-primary mb-2">
        <MarkdownPreview content={memory.content} maxLines={2} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onNavigate}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px]
                     rounded bg-ui-surface hover:bg-ui-accent-primary/10
                     text-ui-text-secondary hover:text-ui-accent-primary
                     border border-ui-border hover:border-ui-accent-primary/50
                     transition-all duration-200"
        >
          <NavigateIcon />
          Explore
        </button>
        <button
          onClick={onLink}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px]
                     rounded bg-ui-accent-primary/10 hover:bg-ui-accent-primary/20
                     text-ui-accent-primary
                     border border-ui-accent-primary/30 hover:border-ui-accent-primary/50
                     transition-all duration-200"
        >
          <LinkIcon />
          Link
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function RelatedMemorySkeleton(): React.ReactElement {
  return (
    <div
      className="p-3 rounded-lg border border-ui-border/50 bg-ui-surface/80"
      style={{
        backdropFilter: "blur(12px)",
        boxShadow: `
          0 0 15px rgba(0, 255, 255, 0.08),
          0 0 30px rgba(0, 255, 255, 0.04),
          inset 0 0 20px rgba(0, 255, 255, 0.02)
        `,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton rounded="full" width="w-2" height="h-2" />
          <Skeleton width="w-16" height="h-3" />
        </div>
        <Skeleton width="w-16" height="h-4" />
      </div>
      <Skeleton width="w-full" height="h-4" className="mb-1" />
      <Skeleton width="w-4/5" height="h-4" className="mb-2" />
      <Skeleton width="w-12" height="h-3" className="mb-1" />
      <Skeleton width="w-full" height="h-1" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * RelatedMemoriesSidebar - Display semantically related memories
 *
 * Features:
 * - Display related memories with relevance scores (Requirement 45.1, 45.2)
 * - Show shared keywords between memories (Requirement 45.2)
 * - Click to navigate to related memory (Requirement 45.3)
 * - Distinguish direct links from semantic similarity (Requirement 45.4)
 * - Show suggestions when no related memories (Requirement 45.5)
 * - Show focused memory summary at top for context (Requirement 45.6)
 * - Preview modal for viewing/editing memories without navigation
 *
 * Requirements: 45.1, 45.2, 45.3, 45.4, 45.5, 45.6
 */
export function RelatedMemoriesSidebar({
  currentMemory,
  relatedMemories,
  onMemoryClick,
  isLoading,
  suggestedTopics,
  suggestedMemoriesToLink,
  onTopicClick,
  onCreateLink,
  onMemoryUpdated,
  onMemoryDeleted,
  availableMemories = [],
  userId,
  sessionId,
  className = "",
}: RelatedMemoriesSidebarProps): React.ReactElement {
  // Modal state for memory preview
  const [previewMemory, setPreviewMemory] = useState<Memory | null>(null);
  const [modalMode, setModalMode] = useState<MemoryModalMode | null>(null);

  // Sort related memories by relevance score (descending)
  // Property 85: Related Memories Relevance Ordering
  const sortedMemories = useMemo(() => {
    return [...relatedMemories].sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [relatedMemories]);

  // Handle memory navigate - Requirements: 45.3
  // Only navigate to the memory node (does not open modal)
  const handleMemoryNavigate = useCallback(
    (memoryId: string) => {
      // Navigate viewport to the memory node only
      onMemoryClick(memoryId);
    },
    [onMemoryClick]
  );

  // Handle preview click - opens modal
  const handlePreviewClick = useCallback((memory: Memory) => {
    setPreviewMemory(memory);
    setModalMode("view");
  }, []);

  // Handle focused memory preview
  const handleFocusedMemoryPreview = useCallback(() => {
    if (currentMemory) {
      setPreviewMemory(currentMemory);
      setModalMode("view");
    }
  }, [currentMemory]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setModalMode(null);
    setPreviewMemory(null);
  }, []);

  // Handle switch to edit mode
  const handleSwitchToEdit = useCallback(() => {
    setModalMode("edit");
  }, []);

  // Handle save from modal
  const handleSave = useCallback(
    (result: MemoryModalSaveResult) => {
      if (previewMemory && onMemoryUpdated) {
        onMemoryUpdated({
          ...previewMemory,
          content: result.content,
          primarySector: result.primarySector,
        });
      }
      handleCloseModal();
    },
    [previewMemory, onMemoryUpdated, handleCloseModal]
  );

  // Handle delete from modal
  const handleDelete = useCallback(
    (memoryId: string) => {
      onMemoryDeleted?.(memoryId);
      handleCloseModal();
    },
    [onMemoryDeleted, handleCloseModal]
  );

  // Handle wiki link click - open the linked memory in the modal
  const handleWikiLinkClick = useCallback(
    (memoryId: string) => {
      // Find the memory from available memories or related memories
      const linkedMemory =
        availableMemories.find((m) => m.id === memoryId) ??
        relatedMemories.find((rm) => rm.memory.id === memoryId)?.memory;
      if (linkedMemory) {
        // Open the linked memory in the preview modal
        setPreviewMemory(linkedMemory);
        setModalMode("view");
      }
    },
    [availableMemories, relatedMemories]
  );

  // Count by connection type for summary
  const connectionCounts = useMemo(() => {
    const counts = { direct: 0, semantic: 0, inferred: 0 };
    for (const rm of relatedMemories) {
      counts[rm.connectionType]++;
    }
    return counts;
  }, [relatedMemories]);

  // If no current memory, show placeholder
  if (currentMemory === null) {
    return (
      <GlassPanel variant="default" className={`p-4 flex flex-col h-full ${className}`}>
        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <RelatedIcon />
          <h3 className="text-sm font-semibold text-ui-accent-primary">Related Memories</h3>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <RelatedMemoriesEmptyState
            currentMemory={null}
            suggestedTopics={suggestedTopics}
            suggestedMemoriesToLink={suggestedMemoriesToLink}
            onTopicClick={onTopicClick}
            onCreateLink={onCreateLink}
            onMemoryClick={handleMemoryNavigate}
            onMemoryPreview={handlePreviewClick}
          />
        </div>
      </GlassPanel>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <GlassPanel variant="default" className={`p-4 flex flex-col h-full ${className}`}>
        {/* Focused Memory Summary - always show when we have a current memory (Requirement 45.6) */}
        <FocusedMemorySummary memory={currentMemory} onPreview={handleFocusedMemoryPreview} />

        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <RelatedIcon />
          <h3 className="text-sm font-semibold text-ui-accent-primary">Related Memories</h3>
        </div>
        <div className="space-y-3 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <RelatedMemorySkeleton />
          <RelatedMemorySkeleton />
          <RelatedMemorySkeleton />
        </div>
      </GlassPanel>
    );
  }

  // Empty state with suggestions - Requirements: 45.5
  if (sortedMemories.length === 0) {
    return (
      <GlassPanel variant="default" className={`p-4 flex flex-col h-full ${className}`}>
        {/* Focused Memory Summary - always show when we have a current memory (Requirement 45.6) */}
        <FocusedMemorySummary memory={currentMemory} onPreview={handleFocusedMemoryPreview} />

        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
          <RelatedIcon />
          <h3 className="text-sm font-semibold text-ui-accent-primary">Related Memories</h3>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <RelatedMemoriesEmptyState
            currentMemory={currentMemory}
            suggestedTopics={suggestedTopics}
            suggestedMemoriesToLink={suggestedMemoriesToLink}
            onTopicClick={onTopicClick}
            onCreateLink={onCreateLink}
            onMemoryClick={handleMemoryNavigate}
            onMemoryPreview={handlePreviewClick}
          />
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel variant="default" className={`p-4 flex flex-col h-full ${className}`}>
      {/* Focused Memory Summary - always show when we have a current memory (Requirement 45.6) */}
      <FocusedMemorySummary memory={currentMemory} onPreview={handleFocusedMemoryPreview} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <RelatedIcon />
          <h3 className="text-sm font-semibold text-ui-accent-primary">Related Memories</h3>
        </div>
        <span className="text-xs text-ui-text-secondary">
          {String(sortedMemories.length)} found
        </span>
      </div>

      {/* Connection type summary */}
      <div className="flex items-center gap-2 mb-3 text-[10px] text-ui-text-muted flex-shrink-0">
        {connectionCounts.direct > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-ui-accent-primary" />
            {String(connectionCounts.direct)} direct
          </span>
        )}
        {connectionCounts.semantic > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            {String(connectionCounts.semantic)} semantic
          </span>
        )}
        {connectionCounts.inferred > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {String(connectionCounts.inferred)} inferred
          </span>
        )}
      </div>

      {/* Related memories list - Requirements: 45.1 - flex-1 to fill remaining height, pb-0 to remove bottom padding */}
      <div className="space-y-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-0">
        {sortedMemories.map((relatedMemory) => (
          <RelatedMemoryItem
            key={relatedMemory.memory.id}
            relatedMemory={relatedMemory}
            onNavigate={() => {
              handleMemoryNavigate(relatedMemory.memory.id);
            }}
            onPreview={() => {
              handlePreviewClick(relatedMemory.memory);
            }}
          />
        ))}
      </div>

      {/* Memory Preview Modal - rendered via portal to escape sidebar container */}
      {modalMode &&
        previewMemory &&
        createPortal(
          <MemoryModal
            isOpen={true}
            mode={modalMode}
            memory={previewMemory}
            onSave={handleSave}
            onClose={handleCloseModal}
            onEdit={handleSwitchToEdit}
            onDelete={handleDelete}
            onWikiLinkClick={handleWikiLinkClick}
            availableMemories={availableMemories}
            userId={userId}
            sessionId={sessionId}
            fullscreen={true}
          />,
          document.body
        )}
    </GlassPanel>
  );
}

export default RelatedMemoriesSidebar;
