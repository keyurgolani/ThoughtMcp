/**
 * MemoryDetailPanel Component
 *
 * HUD panel displaying current memory details with glassmorphism styling.
 * Supports viewing and editing memory content and metadata.
 * Includes keyword highlighting for linked keywords in memory content.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 40.1, 40.2, 40.3, 40.4, 40.5
 */

import { useCallback, useMemo, useState } from 'react';
import { getDefaultClient } from '../../api/client';
import type { CompositeScore, Memory, MemoryMetadata } from '../../types/api';
import { ContentRenderer } from './ContentRenderer';
import { type LinkedKeyword } from './KeywordHighlighter';
import type { MemoryPreview } from './KeywordHoverPreview';

// ============================================================================
// Types
// ============================================================================

export interface MemoryDetailPanelProps {
  /** The memory to display */
  memory: Memory;
  /** Composite score breakdown for the memory */
  compositeScore?: CompositeScore;
  /** Callback when edit is requested */
  onEdit?: () => void;
  /** Callback when delete is requested */
  onDelete?: () => void;
  /** Callback when a cognitive action is triggered */
  onCognitiveAction?: (action: CognitiveAction) => void;
  /** Callback when memory is updated */
  onMemoryUpdated?: (memory: Memory) => void;
  /** Whether the panel is in edit mode */
  isEditing?: boolean;
  /** Callback to toggle edit mode */
  onEditModeChange?: (editing: boolean) => void;
  /** Additional CSS classes */
  className?: string;
  /** Linked keywords in the memory content for highlighting (Requirements: 40.1, 40.4) */
  linkedKeywords?: LinkedKeyword[] | undefined;
  /** Callback when a keyword is clicked to navigate to connected memory (Requirements: 40.2) */
  onKeywordClick?: ((memoryId: string) => void) | undefined;
  /** Map of memory IDs to memory previews for hover tooltip (Requirements: 40.3) */
  memoryPreviews?: Map<string, MemoryPreview> | undefined;
  /** Whether to use high contrast colors */
  highContrast?: boolean | undefined;
}

export type CognitiveAction =
  | 'analyze-reasoning'
  | 'detect-bias'
  | 'assess-confidence'
  | 'detect-emotion'
  | 'decompose';

// ============================================================================
// Constants
// ============================================================================

/** Date format options */
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
  } catch {
    return dateString;
  }
}

/**
 * Format a sector type for display
 */
function formatSectorType(sector: string): string {
  return sector.charAt(0).toUpperCase() + sector.slice(1);
}

/**
 * Format a number as percentage
 */
function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Get sector color class
 */
function getSectorColorClass(sector: string): string {
  const colorMap: Record<string, string> = {
    episodic: 'text-sector-episodic',
    semantic: 'text-sector-semantic',
    procedural: 'text-sector-procedural',
    emotional: 'text-sector-emotional',
    reflective: 'text-sector-reflective',
  };
  return colorMap[sector] ?? 'text-ui-text-primary';
}

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper with semi-transparent background,
 * blur effect, and glowing cyan borders.
 * Requirements: 5.7, 23.5
 */
function GlassPanel({ children, className = '' }: GlassPanelProps): React.ReactElement {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: 'var(--theme-surface)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--theme-primary-glow)',
        boxShadow: `
          0 0 20px var(--theme-primary-glow),
          0 0 40px var(--theme-primary-bg),
          inset 0 0 30px var(--theme-primary-bg)
        `,
      }}
    >
      {children}
    </div>
  );
}

interface MetadataRowProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

/**
 * Single row of metadata display
 * Uses text hierarchy: secondary (70%) for labels, primary (100%) for values
 * Requirements: 32.6
 */
function MetadataRow({ label, value, colorClass }: MetadataRowProps): React.ReactElement {
  const displayValue = typeof value === 'number' ? String(value) : value;
  return (
    <div className="flex justify-between items-center py-1">
      {/* Label: secondary text (70% opacity) */}
      <span className="text-white/70 text-sm">{label}</span>
      {/* Value: primary text (100% opacity) or custom color */}
      <span className={`text-sm font-medium ${colorClass ?? 'text-white'}`}>{displayValue}</span>
    </div>
  );
}

interface TagListProps {
  tags: string[];
  label: string;
}

/**
 * Display a list of tags/keywords
 * Uses text hierarchy: secondary (70%) for label, primary (100%) for tags
 * Requirements: 32.6
 */
function TagList({ tags, label }: TagListProps): React.ReactElement | null {
  if (tags.length === 0) return null;

  return (
    <div className="mt-2">
      {/* Label: secondary text (70% opacity) */}
      <span className="text-white/70 text-sm">{label}</span>
      <div className="flex flex-wrap gap-1 mt-1">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${String(index)}`}
            className="px-2 py-0.5 text-xs bg-ui-border rounded-full text-white"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

interface CompositeScoreDisplayProps {
  score: CompositeScore;
}

/**
 * Display composite score breakdown
 * Requirements: 5.6
 */
function CompositeScoreDisplay({ score }: CompositeScoreDisplayProps): React.ReactElement {
  return (
    <div className="mt-4 pt-4 border-t border-ui-border">
      <h4 className="text-sm font-medium text-ui-accent-primary mb-2">Composite Score</h4>
      <div className="space-y-1">
        <MetadataRow
          label="Total"
          value={formatPercentage(score.total)}
          colorClass="text-ui-accent-secondary"
        />
        <MetadataRow label="Similarity" value={formatPercentage(score.similarity)} />
        <MetadataRow label="Salience" value={formatPercentage(score.salience)} />
        <MetadataRow label="Recency" value={formatPercentage(score.recency)} />
        <MetadataRow label="Link Weight" value={formatPercentage(score.linkWeight)} />
      </div>
    </div>
  );
}

// ============================================================================
// Edit Mode Components
// ============================================================================

interface EditableContentProps {
  content: string;
  onChange: (content: string) => void;
}

/**
 * Editable content textarea
 * Requirements: 5.4
 */
function EditableContent({ content, onChange }: EditableContentProps): React.ReactElement {
  return (
    <textarea
      value={content}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      className="
        w-full h-40 p-3
        bg-ui-background
        border border-ui-border
        rounded-lg
        text-ui-text-primary
        text-sm
        resize-none
        focus:outline-none
        focus:border-ui-accent-primary
        focus:ring-1
        focus:ring-ui-accent-primary
      "
      placeholder="Enter memory content..."
    />
  );
}

interface EditableMetadataProps {
  metadata: MemoryMetadata;
  onChange: (metadata: MemoryMetadata) => void;
}

/**
 * Editable metadata fields
 * Requirements: 5.4
 */
function EditableMetadata({ metadata, onChange }: EditableMetadataProps): React.ReactElement {
  const handleKeywordsChange = useCallback(
    (value: string) => {
      const keywords = value
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      onChange({ ...metadata, keywords });
    },
    [metadata, onChange]
  );

  const handleTagsChange = useCallback(
    (value: string) => {
      const tags = value
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      onChange({ ...metadata, tags });
    },
    [metadata, onChange]
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      const newMetadata: MemoryMetadata = { ...metadata };
      if (value) {
        newMetadata.category = value;
      } else {
        delete newMetadata.category;
      }
      onChange(newMetadata);
    },
    [metadata, onChange]
  );

  return (
    <div className="space-y-3 mt-4">
      <div>
        <label className="text-ui-text-secondary text-sm block mb-1">Category</label>
        <input
          type="text"
          value={metadata.category ?? ''}
          onChange={(e) => {
            handleCategoryChange(e.target.value);
          }}
          className="
            w-full px-3 py-2
            bg-ui-background
            border border-ui-border
            rounded-lg
            text-ui-text-primary
            text-sm
            focus:outline-none
            focus:border-ui-accent-primary
          "
          placeholder="Enter category..."
        />
      </div>
      <div>
        <label className="text-ui-text-secondary text-sm block mb-1">
          Keywords (comma-separated)
        </label>
        <input
          type="text"
          value={metadata.keywords?.join(', ') ?? ''}
          onChange={(e) => {
            handleKeywordsChange(e.target.value);
          }}
          className="
            w-full px-3 py-2
            bg-ui-background
            border border-ui-border
            rounded-lg
            text-ui-text-primary
            text-sm
            focus:outline-none
            focus:border-ui-accent-primary
          "
          placeholder="keyword1, keyword2, ..."
        />
      </div>
      <div>
        <label className="text-ui-text-secondary text-sm block mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={metadata.tags?.join(', ') ?? ''}
          onChange={(e) => {
            handleTagsChange(e.target.value);
          }}
          className="
            w-full px-3 py-2
            bg-ui-background
            border border-ui-border
            rounded-lg
            text-ui-text-primary
            text-sm
            focus:outline-none
            focus:border-ui-accent-primary
          "
          placeholder="tag1, tag2, ..."
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MemoryDetailPanel - HUD panel for viewing and editing memory details
 *
 * Features:
 * - Glassmorphism styling with semi-transparent background and blur
 * - Full content display with scrolling
 * - All metadata fields display
 * - Composite score breakdown
 * - Inline editing of content and metadata
 * - Save functionality via REST API
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export function MemoryDetailPanel({
  memory,
  compositeScore,
  onEdit,
  onDelete,
  onCognitiveAction,
  onMemoryUpdated,
  isEditing = false,
  onEditModeChange,
  className = '',
  linkedKeywords = [],
  onKeywordClick,
  memoryPreviews,
  highContrast = false,
}: MemoryDetailPanelProps): React.ReactElement {
  // Edit state
  const [editedContent, setEditedContent] = useState(memory.content);
  const [editedMetadata, setEditedMetadata] = useState<MemoryMetadata>(memory.metadata);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset edit state when memory changes
  useMemo(() => {
    setEditedContent(memory.content);
    setEditedMetadata(memory.metadata);
    setSaveError(null);
  }, [memory.content, memory.metadata]);

  // Handle entering edit mode
  const handleEditClick = useCallback(() => {
    setEditedContent(memory.content);
    setEditedMetadata(memory.metadata);
    setSaveError(null);
    onEditModeChange?.(true);
    onEdit?.();
  }, [memory.content, memory.metadata, onEditModeChange, onEdit]);

  // Handle canceling edit mode
  const handleCancelEdit = useCallback(() => {
    setEditedContent(memory.content);
    setEditedMetadata(memory.metadata);
    setSaveError(null);
    onEditModeChange?.(false);
  }, [memory.content, memory.metadata, onEditModeChange]);

  // Handle saving edits
  // Requirements: 5.5
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const client = getDefaultClient();
      const updateRequest: Parameters<typeof client.updateMemory>[0] = {
        memoryId: memory.id,
        userId: memory.userId,
      };

      if (editedContent !== memory.content) {
        updateRequest.content = editedContent;
      }

      if (JSON.stringify(editedMetadata) !== JSON.stringify(memory.metadata)) {
        updateRequest.metadata = editedMetadata;
      }

      await client.updateMemory(updateRequest);

      // Update the memory object with new values
      const updatedMemory: Memory = {
        ...memory,
        content: editedContent,
        metadata: editedMetadata,
      };

      onMemoryUpdated?.(updatedMemory);
      onEditModeChange?.(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save changes';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [memory, editedContent, editedMetadata, onMemoryUpdated, onEditModeChange]);

  // Determine if there are unsaved changes
  const hasChanges = useMemo(() => {
    return (
      editedContent !== memory.content ||
      JSON.stringify(editedMetadata) !== JSON.stringify(memory.metadata)
    );
  }, [editedContent, editedMetadata, memory.content, memory.metadata]);

  // Handle keyword click to navigate to connected memory (Requirements: 40.2)
  const handleKeywordClick = useCallback(
    (keyword: LinkedKeyword): void => {
      // Navigate to the first connected memory
      if (keyword.linkedMemoryIds.length > 0 && onKeywordClick) {
        const targetMemoryId = keyword.linkedMemoryIds[0];
        if (targetMemoryId !== undefined && targetMemoryId !== '') {
          onKeywordClick(targetMemoryId);
        }
      }
    },
    [onKeywordClick]
  );

  return (
    <GlassPanel className={`p-4 max-w-md w-full ${className}`}>
      {/* Header with neon accents */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span
            className={`text-xs font-medium uppercase tracking-wider ${getSectorColorClass(memory.primarySector)}`}
            style={{
              textShadow: `0 0 8px currentColor`,
            }}
          >
            {formatSectorType(memory.primarySector)}
          </span>
          <h3 className="text-lg font-semibold text-ui-text-primary mt-1 neon-text-subtle">
            Memory Details
          </h3>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handleEditClick}
                className="px-3 py-1 text-sm bg-ui-border hover:bg-ui-accent-primary/20 rounded transition-colors text-ui-text-primary"
                aria-label="Edit memory"
              >
                Edit
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/40 rounded transition-colors text-red-400"
                  aria-label="Delete memory"
                >
                  Delete
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-sm bg-ui-border hover:bg-ui-border/80 rounded transition-colors text-ui-text-secondary"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  void handleSave();
                }}
                disabled={isSaving || !hasChanges}
                className={`
                  px-3 py-1 text-sm rounded transition-colors
                  ${
                    hasChanges && !isSaving
                      ? 'bg-ui-accent-primary/30 hover:bg-ui-accent-primary/50 text-ui-accent-primary'
                      : 'bg-ui-border text-ui-text-muted cursor-not-allowed'
                  }
                `}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      {saveError !== null && saveError !== '' && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">
          {saveError}
        </div>
      )}

      {/* Content Section - Requirements: 5.1, 40.1, 40.2, 40.3, 40.4, 40.5, 41.3, 41.4 */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-ui-accent-primary mb-2">Content</h4>
        {isEditing ? (
          <EditableContent content={editedContent} onChange={setEditedContent} />
        ) : (
          <div className="max-h-40 overflow-y-auto p-3 bg-ui-background/50 rounded-lg">
            <p className="text-sm text-ui-text-primary whitespace-pre-wrap">
              <ContentRenderer
                content={memory.content}
                linkedKeywords={linkedKeywords}
                onKeywordClick={handleKeywordClick}
                onWikiLinkClick={onKeywordClick}
                memoryPreviews={memoryPreviews}
                highContrast={highContrast}
              />
            </p>
          </div>
        )}
      </div>

      {/* Metadata Section - Requirements: 5.2, 5.3 */}
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-ui-accent-primary mb-2">Metadata</h4>
        <MetadataRow label="Created" value={formatDate(memory.createdAt)} />
        <MetadataRow label="Last Accessed" value={formatDate(memory.lastAccessed)} />
        <MetadataRow label="Access Count" value={memory.accessCount} />
        <MetadataRow
          label="Strength"
          value={formatPercentage(memory.strength)}
          colorClass={
            memory.strength > 0.7
              ? 'text-green-400'
              : memory.strength > 0.3
                ? 'text-yellow-400'
                : 'text-red-400'
          }
        />
        <MetadataRow
          label="Salience"
          value={formatPercentage(memory.salience)}
          colorClass={
            memory.salience > 0.7
              ? 'text-green-400'
              : memory.salience > 0.3
                ? 'text-yellow-400'
                : 'text-red-400'
          }
        />
      </div>

      {/* Editable Metadata or Display Tags/Keywords - Requirements: 5.3, 5.4 */}
      {isEditing ? (
        <EditableMetadata metadata={editedMetadata} onChange={setEditedMetadata} />
      ) : (
        <>
          {memory.metadata.category !== undefined && memory.metadata.category !== '' && (
            <div className="mt-2">
              <MetadataRow label="Category" value={memory.metadata.category} />
            </div>
          )}
          <TagList tags={memory.metadata.keywords ?? []} label="Keywords" />
          <TagList tags={memory.metadata.tags ?? []} label="Tags" />
        </>
      )}

      {/* Composite Score - Requirements: 5.6 */}
      {compositeScore && <CompositeScoreDisplay score={compositeScore} />}

      {/* Cognitive Actions */}
      {onCognitiveAction && !isEditing && (
        <div className="mt-4 pt-4 border-t border-ui-border">
          <h4 className="text-sm font-medium text-ui-accent-primary mb-2">Cognitive Tools</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                onCognitiveAction('analyze-reasoning');
              }}
              className="px-2 py-1 text-xs bg-ui-border hover:bg-ui-accent-primary/20 rounded transition-colors text-ui-text-primary"
            >
              Analyze
            </button>
            <button
              onClick={() => {
                onCognitiveAction('detect-bias');
              }}
              className="px-2 py-1 text-xs bg-ui-border hover:bg-ui-accent-primary/20 rounded transition-colors text-ui-text-primary"
            >
              Detect Bias
            </button>
            <button
              onClick={() => {
                onCognitiveAction('assess-confidence');
              }}
              className="px-2 py-1 text-xs bg-ui-border hover:bg-ui-accent-primary/20 rounded transition-colors text-ui-text-primary"
            >
              Confidence
            </button>
            <button
              onClick={() => {
                onCognitiveAction('detect-emotion');
              }}
              className="px-2 py-1 text-xs bg-ui-border hover:bg-ui-accent-primary/20 rounded transition-colors text-ui-text-primary"
            >
              Emotion
            </button>
            <button
              onClick={() => {
                onCognitiveAction('decompose');
              }}
              className="px-2 py-1 text-xs bg-ui-border hover:bg-ui-accent-primary/20 rounded transition-colors text-ui-text-primary"
            >
              Decompose
            </button>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

export default MemoryDetailPanel;
