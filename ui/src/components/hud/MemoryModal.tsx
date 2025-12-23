/**
 * MemoryModal Component
 *
 * Unified modal for memory operations with three variants:
 * - 'create': Creating new memories
 * - 'view': Viewing/previewing memory details (read-only)
 * - 'edit': Editing existing memories
 *
 * Layout:
 * - 80% viewport width
 * - Top section: Three-column layout (left sidebar, center content, right sidebar)
 * - Bottom section: Linked memories (independently scrollable)
 * - All sections independently scrollable
 */

import { Edit, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { getDefaultClient, isDemoMemoryId } from '../../api/client';
import type { Memory, MemorySectorType } from '../../types/api';
import { findRelatedMemories, type SuggestedMemory } from '../../utils/autoSuggest';
import { getSectorColor } from '../../utils/visualization';
import { getSectorIcon, MemoriesIcon, type IconSize } from '../icons';
import { ContentRenderer } from './ContentRenderer';
import { createWaypointLink, WikiLinkInput } from './WikiLinkAutocomplete';
import { parseWikiLinks } from './WikiLinkRenderer';

// ============================================================================
// Types
// ============================================================================

export type MemoryModalMode = 'create' | 'view' | 'edit';

export interface MemoryModalSaveResult {
  memoryId: string;
  content: string;
  primarySector: MemorySectorType;
  linkedToCurrent: boolean;
  linkedToNodeId: string | undefined;
  salience: number;
  strength: number;
}

export interface MemoryModalProps {
  isOpen: boolean;
  mode: MemoryModalMode;
  memory?: Memory;
  currentMemoryContext?: Memory;
  onSave?: (result: MemoryModalSaveResult) => void;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: (memoryId: string) => void;
  onWikiLinkClick?: (memoryId: string) => void;
  availableMemories?: Memory[];
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
  className?: string;
  /** When true, modal takes full viewport width/height */
  fullscreen?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

interface SectorOption {
  value: MemorySectorType;
  label: string;
  getIcon: (size: IconSize) => ReactElement;
}

const SECTOR_OPTIONS: SectorOption[] = [
  {
    value: 'episodic',
    label: 'Episodic',
    getIcon: (size) => getSectorIcon('episodic', size),
  },
  {
    value: 'semantic',
    label: 'Semantic',
    getIcon: (size) => getSectorIcon('semantic', size),
  },
  {
    value: 'procedural',
    label: 'Procedural',
    getIcon: (size) => getSectorIcon('procedural', size),
  },
  {
    value: 'emotional',
    label: 'Emotional',
    getIcon: (size) => getSectorIcon('emotional', size),
  },
  {
    value: 'reflective',
    label: 'Reflective',
    getIcon: (size) => getSectorIcon('reflective', size),
  },
];

/**
 * Helper to detect light mode from document attribute
 */
function isLightModeActive(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light'
  );
}

const EMPTY_MEMORY_ARRAY: Memory[] = [];

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSectorInfo(sector: MemorySectorType): {
  getIcon: (size: IconSize) => ReactElement;
  color: string;
  label: string;
} {
  const info = SECTOR_OPTIONS.find((s) => s.value === sector);
  const lightMode = isLightModeActive();
  const color = getSectorColor(sector, false, lightMode);
  return info
    ? { getIcon: info.getIcon, color, label: info.label }
    : {
        getIcon: (size) => getSectorIcon('default', size),
        color: lightMode ? '#495057' : '#888888',
        label: 'Unknown',
      };
}

function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetadataItemProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}

function MetadataItem({ label, value, icon }: MetadataItemProps): React.ReactElement {
  return (
    <div className="p-3 bg-ui-background/30 rounded-lg">
      <p className="text-xs text-ui-text-muted mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p className="text-sm text-ui-text-secondary">{value}</p>
    </div>
  );
}

interface TagDisplayProps {
  tags: string[];
  label: string;
  variant?: 'primary' | 'secondary';
}

function TagDisplay({
  tags,
  label,
  variant = 'primary',
}: TagDisplayProps): React.ReactElement | null {
  if (tags.length === 0) return null;

  const tagClasses =
    variant === 'primary'
      ? 'bg-ui-accent-primary/10 border border-ui-accent-primary/30 text-ui-accent-primary'
      : 'bg-ui-border/30 text-ui-text-secondary';

  return (
    <div className="p-3 bg-ui-background/30 rounded-lg">
      <p className="text-xs text-ui-text-muted mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className={`px-2 py-0.5 text-xs rounded-full ${tagClasses}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

interface LinkedMemoryCardProps {
  memory: Memory;
  onClick?: () => void;
}

function LinkedMemoryCard({ memory, onClick }: LinkedMemoryCardProps): React.ReactElement {
  const sectorInfo = getSectorInfo(memory.primarySector);

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 bg-ui-background/50 border border-ui-border/30 rounded-lg text-ui-text-secondary hover:border-ui-accent-primary/30 hover:bg-ui-accent-primary/5 transition-colors group"
      title={memory.content}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: sectorInfo.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="line-clamp-2 text-ui-text-primary group-hover:text-ui-accent-primary transition-colors text-sm">
            {memory.content.substring(0, 100)}
            {memory.content.length > 100 ? '...' : ''}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-ui-text-muted capitalize">{memory.primarySector}</span>
            <span className="text-xs text-ui-text-muted">•</span>
            <span className="text-xs text-ui-text-muted">
              {formatPercentage(memory.strength)} strength
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

interface LinkableMemoryCardProps {
  memory: Memory;
  isLinked: boolean;
  onToggleLink: () => void;
  disabled?: boolean;
}

function LinkableMemoryCard({
  memory,
  isLinked,
  onToggleLink,
  disabled,
}: LinkableMemoryCardProps): React.ReactElement {
  const sectorInfo = getSectorInfo(memory.primarySector);

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-ui-background/50 border border-ui-border/30 rounded-lg">
      <div
        className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
        style={{ backgroundColor: sectorInfo.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="line-clamp-1 text-ui-text-primary text-sm">
          {memory.content.substring(0, 80)}
          {memory.content.length > 80 ? '...' : ''}
        </div>
        <div className="text-xs text-ui-text-muted capitalize mt-0.5">{memory.primarySector}</div>
      </div>
      <button
        onClick={onToggleLink}
        disabled={disabled}
        className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isLinked
            ? 'bg-status-error/20 hover:bg-status-error/30 text-status-error'
            : 'bg-ui-accent-primary/20 hover:bg-ui-accent-primary/30 text-ui-accent-primary'
        }`}
        title={isLinked ? 'Unlink memory' : 'Link memory'}
      >
        {isLinked ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MemoryModal({
  isOpen,
  mode,
  memory,
  currentMemoryContext,
  onSave,
  onClose,
  onEdit,
  onDelete,
  onWikiLinkClick,
  availableMemories = EMPTY_MEMORY_ARRAY,
  userId,
  sessionId,
  className = '',
  fullscreen = false,
}: MemoryModalProps): React.ReactElement | null {
  // Form state
  const [content, setContent] = useState('');
  const [primarySector, setPrimarySector] = useState<MemorySectorType>('semantic');
  const [linkToCurrent, setLinkToCurrent] = useState(currentMemoryContext !== undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Auto-suggest state
  const [autoSuggestions, setAutoSuggestions] = useState<SuggestedMemory[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IDs to exclude from suggestions
  const excludeIds = useMemo(() => {
    const ids: string[] = [];
    if (currentMemoryContext?.id) ids.push(currentMemoryContext.id);
    if (memory?.id) ids.push(memory.id);
    return ids;
  }, [currentMemoryContext?.id, memory?.id]);

  // Track if modal was previously open
  const wasOpenRef = useRef(false);

  // Reset form when modal opens or mode/memory changes
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (justOpened || (isOpen && memory)) {
      if (memory && (mode === 'view' || mode === 'edit')) {
        setContent(memory.content);
        setPrimarySector(memory.primarySector);
        setTags(memory.metadata.tags ?? []);
      } else if (mode === 'create') {
        setContent('');
        setPrimarySector('semantic');
        setTags([]);
      }
      setLinkToCurrent(currentMemoryContext !== undefined && mode === 'create');
      setError(null);
      setAutoSuggestions([]);
      setTagInput('');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, mode, memory, currentMemoryContext]);

  // Auto-suggest related memories based on content
  useEffect(() => {
    if (mode === 'view') return;
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    if (content.trim().length < 10 || availableMemories.length === 0) {
      setAutoSuggestions([]);
      return;
    }
    debounceTimerRef.current = setTimeout(() => {
      const suggestions = findRelatedMemories(content, availableMemories, excludeIds, 5);
      setAutoSuggestions(suggestions);
    }, 300);
    return (): void => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    };
  }, [content, availableMemories, excludeIds, mode]);

  // Tag management
  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag !== '' && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleSave = useCallback(async () => {
    if (mode === 'view') return;
    if (content.trim() === '') {
      setError('Please enter some content');
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const client = getDefaultClient();

      if (mode === 'edit' && memory) {
        await client.updateMemory({
          memoryId: memory.id,
          userId,
          content: content.trim(),
          ...(tags.length > 0 ? { metadata: { tags } } : {}),
        });
        const saveResult: MemoryModalSaveResult = {
          memoryId: memory.id,
          content: content.trim(),
          primarySector,
          linkedToCurrent: false,
          linkedToNodeId: undefined,
          salience: memory.salience,
          strength: memory.strength,
        };
        onSave?.(saveResult);
        onClose();
        return;
      }

      // Create new memory
      const storeResponse = await client.storeMemory({
        content: content.trim(),
        userId,
        sessionId,
        primarySector,
        ...(tags.length > 0 ? { metadata: { tags } } : {}),
      });

      let linkCreated = false;
      const currentMemoryId = currentMemoryContext?.id;

      if (linkToCurrent && currentMemoryId) {
        try {
          await createWaypointLink({
            sourceMemoryId: storeResponse.memoryId,
            targetMemoryId: currentMemoryId,
            userId,
            linkType: 'semantic',
          });
          linkCreated = true;
        } catch (linkError) {
          console.warn('Failed to create waypoint link:', linkError);
        }
      }

      const saveResult: MemoryModalSaveResult = {
        memoryId: storeResponse.memoryId,
        content: content.trim(),
        primarySector,
        linkedToCurrent: linkCreated,
        linkedToNodeId: linkCreated ? currentMemoryId : undefined,
        salience: storeResponse.salience,
        strength: storeResponse.strength,
      };

      onSave?.(saveResult);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save memory';
      setError(message);
      setIsSaving(false);
    }
  }, [
    content,
    primarySector,
    linkToCurrent,
    currentMemoryContext,
    memory,
    tags,
    userId,
    sessionId,
    onSave,
    onClose,
    mode,
  ]);

  const handleDelete = useCallback(async () => {
    if (!memory || !onDelete) return;
    setIsDeleting(true);
    try {
      const client = getDefaultClient();
      await client.deleteMemory(memory.id, userId);
      onDelete(memory.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete memory');
      setIsDeleting(false);
    }
  }, [memory, userId, onDelete, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && mode !== 'view') {
        e.preventDefault();
        if (content.trim() !== '') void handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, content, onClose, handleSave, mode]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isSaving && !isDeleting) onClose();
    },
    [onClose, isSaving, isDeleting]
  );

  const handleSwitchToEdit = useCallback(() => {
    if (memory && isDemoMemoryId(memory.id)) {
      setError('Cannot edit demo memories. Demo data is read-only.');
      return;
    }
    onEdit?.();
  }, [memory, onEdit]);

  // Add a wiki link to content
  const handleLinkMemory = useCallback((memoryToLink: Memory) => {
    const linkText = `[[${memoryToLink.id}|${memoryToLink.content.substring(0, 30)}...]]`;
    setContent((prev) => {
      // Add link at the end with a space
      const trimmed = prev.trimEnd();
      return trimmed + (trimmed.length > 0 ? ' ' : '') + linkText;
    });
  }, []);

  // Remove a wiki link from content
  const handleUnlinkMemory = useCallback((memoryId: string) => {
    setContent((prev) => {
      // Remove all wiki links that reference this memory ID
      // Pattern matches [[memoryId]] or [[memoryId|display text]]
      const pattern = new RegExp(`\\[\\[${memoryId}(\\|[^\\]]*)?\\]\\]`, 'g');
      return prev.replace(pattern, '').replace(/\s+/g, ' ').trim();
    });
  }, []);

  if (!isOpen) return null;

  const sectorInfo = memory ? getSectorInfo(memory.primarySector) : null;
  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const modalTitle = isCreateMode ? 'Create Memory' : isEditMode ? 'Edit Memory' : 'Memory Details';
  const getModalIcon = (): ReactElement => {
    if (isCreateMode) return <Zap size={24} />;
    if (isEditMode) return <Edit size={24} />;
    return <MemoriesIcon size="xl" />;
  };

  // Get linked memories from content
  const linkedMemoryIds = parseWikiLinks(content).map((link) => link.memoryId);
  const linkedMemories = availableMemories.filter((m) => linkedMemoryIds.includes(m.id));

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-modal-title"
      style={{ zIndex: 70 }}
    >
      <div
        className={`
          bg-ui-surface/98 backdrop-blur-xl border border-ui-accent-primary/30
          rounded-xl shadow-glow box-border
          ${fullscreen ? 'w-[95vw] h-[95vh]' : 'w-[80vw] max-w-[calc(100vw-3rem)] min-w-[320px] max-h-[90vh]'}
          overflow-hidden
          animate-scale-in transition-all duration-300 ease-out
          flex flex-col
          ${className}
        `}
        style={{
          boxShadow: `0 0 40px var(--theme-primary-glow), 0 0 80px var(--theme-primary-subtle), inset 0 0 40px var(--theme-primary-bg)`,
          backdropFilter: 'blur(24px) saturate(180%)',
        }}
        onClick={(e) => { e.stopPropagation(); }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-ui-border/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-ui-accent-primary" aria-hidden="true">
              {getModalIcon()}
            </span>
            <h2 id="memory-modal-title" className="text-lg font-semibold text-ui-accent-primary">
              {modalTitle}
            </h2>
            {memory && sectorInfo && (
              <span
                className="px-2 py-0.5 text-xs rounded-full border flex items-center gap-1"
                style={{
                  borderColor: sectorInfo.color,
                  color: sectorInfo.color,
                  backgroundColor: `${sectorInfo.color}20`,
                }}
              >
                <span aria-hidden="true">{sectorInfo.getIcon('xs')}</span>
                {sectorInfo.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isViewMode && onEdit && (
              <button
                onClick={handleSwitchToEdit}
                className="p-2 hover:bg-ui-border/50 rounded-lg transition-colors text-ui-text-secondary hover:text-ui-accent-primary"
                title="Edit memory"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            {(isViewMode || isEditMode) && onDelete && memory && (
              <button
                onClick={() => { setShowDeleteConfirm(true); }}
                className="p-2 hover:bg-status-error/20 rounded-lg transition-colors text-ui-text-secondary hover:text-status-error"
                title="Delete memory"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="p-2 hover:bg-ui-border/50 rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
              aria-label="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Top Section - Three Column Layout */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="mx-4 mt-4 p-4 bg-status-error/10 border border-status-error/30 rounded-lg flex-shrink-0">
              <p className="text-sm text-status-error mb-3">
                Are you sure you want to delete this memory? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDeleteConfirm(false); }}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg text-ui-text-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleDelete()}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm bg-status-error/20 hover:bg-status-error/30 border border-status-error/30 rounded-lg text-status-error"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mx-4 mt-4 p-3 bg-status-error/10 border border-status-error/30 rounded-lg text-status-error text-sm flex-shrink-0">
              {error}
              <button onClick={() => { setError(null); }} className="ml-2 underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Three Column Content Area */}
          <div className="flex-1 min-h-0 flex gap-4 p-4 overflow-hidden">
            {/* Left Sidebar - Metadata */}
            <div className="w-[200px] flex-shrink-0 overflow-y-auto space-y-3">
              {isViewMode && memory ? (
                <>
                  <MetadataItem
                    label="Type"
                    value={memory.primarySector}
                    icon={sectorInfo?.getIcon('sm')}
                  />
                  <MetadataItem label="Created" value={formatDate(memory.createdAt)} />
                  <MetadataItem label="Last Accessed" value={formatDate(memory.lastAccessed)} />
                  <MetadataItem label="Strength" value={formatPercentage(memory.strength)} />
                  <MetadataItem label="Salience" value={formatPercentage(memory.salience)} />
                  {memory.metadata.category && (
                    <MetadataItem label="Category" value={memory.metadata.category} />
                  )}
                </>
              ) : (
                <>
                  {/* Context indicator for create mode */}
                  {currentMemoryContext && isCreateMode && (
                    <div className="p-3 bg-ui-background/30 rounded-lg">
                      <p className="text-xs text-ui-text-muted mb-1">Context</p>
                      <p className="text-xs text-ui-text-secondary line-clamp-3">
                        {currentMemoryContext.content.substring(0, 100)}
                        {currentMemoryContext.content.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  )}

                  {/* Sector type selection */}
                  <div className="p-3 bg-ui-background/30 rounded-lg">
                    <label className="text-xs text-ui-text-muted block mb-2">Memory Type</label>
                    <div className="flex flex-col gap-1.5">
                      {SECTOR_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => { setPrimarySector(option.value); }}
                          disabled={isSaving}
                          className={`px-2.5 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1.5
                            ${
                              primarySector === option.value
                                ? 'border-ui-accent-primary/50 bg-ui-accent-primary/10 text-ui-accent-primary'
                                : 'border-ui-border/50 text-ui-text-secondary hover:border-ui-accent-primary/30 hover:text-ui-text-primary'
                            }
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <span aria-hidden="true">{option.getIcon('sm')}</span>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Link to current option */}
                  {currentMemoryContext && isCreateMode && (
                    <div className="p-3 bg-ui-background/30 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={linkToCurrent}
                          onChange={(e) => { setLinkToCurrent(e.target.checked); }}
                          disabled={isSaving}
                          className="w-4 h-4 rounded border-ui-border bg-ui-background text-ui-accent-primary focus:ring-ui-accent-primary/50 focus:ring-offset-0"
                        />
                        <span className="text-xs text-ui-text-secondary">Link to context</span>
                      </label>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Center - Content Area */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {isViewMode && memory ? (
                <div className="flex-1 min-h-0 p-4 pr-5 bg-ui-background/50 rounded-lg border border-ui-border/30 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1">
                    <ContentRenderer
                      content={memory.content}
                      onWikiLinkClick={onWikiLinkClick}
                      renderMarkdown={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 flex flex-col">
                  <WikiLinkInput
                    value={content}
                    onChange={setContent}
                    memories={availableMemories}
                    {...(currentMemoryContext?.id
                      ? { sourceMemoryId: currentMemoryContext.id }
                      : {})}
                    userId={userId}
                    createWaypointOnInsert={true}
                    placeholder="What's on your mind? Type [[ to link to memories..."
                    multiline={true}
                    rows={12}
                    autoFocus={true}
                    className={`bg-ui-background/70 border-ui-border/50 placeholder:text-ui-text-muted flex-1 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <p className="text-xs text-ui-text-muted mt-2">
                    Tip: Type{' '}
                    <kbd className="px-1 py-0.5 bg-ui-background/50 rounded text-ui-text-secondary">
                      [[
                    </kbd>{' '}
                    to link to existing memories
                  </p>
                </div>
              )}
            </div>

            {/* Right Sidebar - Tags, Keywords */}
            <div className="w-[200px] flex-shrink-0 overflow-y-auto space-y-3">
              {isViewMode && memory ? (
                <>
                  <TagDisplay tags={memory.metadata.tags ?? []} label="Tags" variant="primary" />
                  <TagDisplay
                    tags={memory.metadata.keywords ?? []}
                    label="Keywords"
                    variant="secondary"
                  />
                </>
              ) : (
                <>
                  {/* Tags section - always visible */}
                  <div className="p-3 bg-ui-background/30 rounded-lg">
                    <p className="text-xs text-ui-text-muted mb-2">Tags</p>
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => { setTagInput(e.target.value); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Add tag..."
                          disabled={isSaving}
                          className="flex-1 bg-ui-background/70 border border-ui-border/50 rounded-lg px-2 py-1 text-xs text-ui-text-primary placeholder:text-ui-text-muted"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          disabled={isSaving || tagInput.trim() === ''}
                          className="px-2 py-1 text-xs bg-ui-border/30 hover:bg-ui-border/50 rounded-lg text-ui-text-secondary disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px] bg-ui-accent-primary/10 border border-ui-accent-primary/30 rounded-full text-ui-accent-primary flex items-center gap-0.5"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => { handleRemoveTag(tag); }}
                                className="hover:text-status-error"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section - Linked Memories and Suggestions */}
        {isViewMode
          ? // View mode: show linked memories only
            linkedMemories.length > 0 && (
              <div className="flex-shrink-0 border-t border-ui-border/50">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      className="w-4 h-4 text-ui-accent-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <h3 className="text-sm font-medium text-ui-text-primary">
                      Linked Memories ({linkedMemories.length})
                    </h3>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {linkedMemories.map((linkedMemory) => (
                        <LinkedMemoryCard
                          key={linkedMemory.id}
                          memory={linkedMemory}
                          onClick={() => onWikiLinkClick?.(linkedMemory.id)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          : // Edit/Create mode: show linked memories with unlink button and suggestions with link button
            (linkedMemories.length > 0 || autoSuggestions.length > 0) && (
              <div className="flex-shrink-0 border-t border-ui-border/50">
                <div className="p-4 max-h-[250px] overflow-y-auto">
                  {/* Linked Memories Section */}
                  {linkedMemories.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <svg
                          className="w-4 h-4 text-ui-accent-primary"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        <h3 className="text-sm font-medium text-ui-text-primary">
                          Linked Memories ({linkedMemories.length})
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {linkedMemories.map((linkedMemory) => (
                          <LinkableMemoryCard
                            key={linkedMemory.id}
                            memory={linkedMemory}
                            isLinked={true}
                            onToggleLink={() => { handleUnlinkMemory(linkedMemory.id); }}
                            disabled={isSaving}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions Section */}
                  {autoSuggestions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
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
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                        <h3 className="text-sm font-medium text-ui-text-primary">
                          Suggestions (
                          {
                            autoSuggestions.filter((s) => !linkedMemoryIds.includes(s.memory.id))
                              .length
                          }
                          )
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {autoSuggestions
                          .filter((suggestion) => !linkedMemoryIds.includes(suggestion.memory.id))
                          .map((suggestion) => (
                            <LinkableMemoryCard
                              key={suggestion.memory.id}
                              memory={suggestion.memory}
                              isLinked={false}
                              onToggleLink={() => { handleLinkMemory(suggestion.memory); }}
                              disabled={isSaving}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-ui-border/50 flex-shrink-0">
          {isCreateMode || isEditMode ? (
            <>
              <span className="text-xs text-ui-text-muted">
                <kbd className="px-1.5 py-0.5 bg-ui-background/50 rounded text-ui-text-secondary">
                  ⌘
                </kbd>
                <span className="mx-1">+</span>
                <kbd className="px-1.5 py-0.5 bg-ui-background/50 rounded text-ui-text-secondary">
                  Enter
                </kbd>
                <span className="ml-1.5">to save</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg transition-colors text-ui-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={isSaving || !content.trim()}
                  className="px-4 py-1.5 text-sm bg-ui-accent-primary/20 hover:bg-ui-accent-primary/30 border border-ui-accent-primary/30 rounded-lg transition-all text-ui-accent-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="animate-spin h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={isEditMode ? 'M5 13l4 4L19 7' : 'M12 4v16m8-8H4'}
                        />
                      </svg>
                      {isEditMode ? 'Save Changes' : 'Create Memory'}
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg transition-colors text-ui-text-secondary"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemoryModal;
