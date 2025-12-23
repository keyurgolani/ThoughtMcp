/**
 * MemoryExplorer Component
 *
 * Page for managing memories with CRUD operations.
 * Supports two views: Cards (masonry grid) and Rows (stack view).
 * Uses the unified MemoryModal for all memory operations.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDefaultClient, isDemoMemoryId } from '../api/client';
import { MarkdownPreview } from '../components/hud/MarkdownPreview';
import {
  MemoryModal,
  type MemoryModalMode,
  type MemoryModalSaveResult,
} from '../components/hud/MemoryModal';
import { AlertTriangle, ExplorerIcon, getSectorIcon, type IconSize } from '../components/icons';
import { useMemoryStore } from '../stores/memoryStore';
import { type Memory, type MemorySectorType } from '../types/api';

// ============================================================================
// Types
// ============================================================================

interface MemoryExplorerProps {
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
  className?: string;
}

type ViewMode = 'cards' | 'rows';

// ============================================================================
// Constants
// ============================================================================

interface SectorOption {
  value: MemorySectorType;
  label: string;
  getIcon: (size: IconSize) => ReactElement;
  color: string;
}

const SECTOR_OPTIONS: SectorOption[] = [
  {
    value: 'episodic',
    label: 'Episodic',
    getIcon: (size) => getSectorIcon('episodic', size),
    color: '#FFD700',
  },
  {
    value: 'semantic',
    label: 'Semantic',
    getIcon: (size) => getSectorIcon('semantic', size),
    color: '#00FFFF',
  },
  {
    value: 'procedural',
    label: 'Procedural',
    getIcon: (size) => getSectorIcon('procedural', size),
    color: '#9B59B6',
  },
  {
    value: 'emotional',
    label: 'Emotional',
    getIcon: (size) => getSectorIcon('emotional', size),
    color: '#F39C12',
  },
  {
    value: 'reflective',
    label: 'Reflective',
    getIcon: (size) => getSectorIcon('reflective', size),
    color: '#C0C0C0',
  },
];

// Pagination is handled by the memory store (MEMORIES_PER_PAGE = 20)

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
} {
  const info = SECTOR_OPTIONS.find((s) => s.value === sector);
  return info ?? { getIcon: (size) => getSectorIcon('default', size), color: '#888888' };
}

// ============================================================================
// View Toggle Component
// ============================================================================

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps): ReactElement {
  return (
    <div className="flex items-center gap-1 p-1 bg-ui-background/70 border border-ui-border/50 rounded-lg">
      <button
        onClick={() => {
          onViewModeChange('cards');
        }}
        className={`p-2 rounded transition-all duration-200 ${
          viewMode === 'cards'
            ? 'bg-ui-accent-primary/20 text-ui-accent-primary'
            : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-border/30'
        }`}
        title="Cards view (masonry grid)"
        aria-label="Switch to cards view"
        aria-pressed={viewMode === 'cards'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
          />
        </svg>
      </button>
      <button
        onClick={() => {
          onViewModeChange('rows');
        }}
        className={`p-2 rounded transition-all duration-200 ${
          viewMode === 'rows'
            ? 'bg-ui-accent-primary/20 text-ui-accent-primary'
            : 'text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-border/30'
        }`}
        title="Rows view (stack)"
        aria-label="Switch to rows view"
        aria-pressed={viewMode === 'rows'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// Memory Card Component (for Cards View - Masonry Grid)
// Min height: fits metadata + 1 line of content
// Max height: fits metadata + 8 lines of content
// ============================================================================

interface MemoryCardProps {
  memory: Memory;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

function MemoryCard({
  memory,
  onView,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
}: MemoryCardProps): ReactElement {
  const sectorInfo = getSectorInfo(memory.primarySector);

  return (
    <div
      className={`
        p-4 rounded-lg border transition-all duration-200 cursor-pointer
        break-inside-avoid mb-4
        ${isSelected ? 'border-ui-accent-primary/50 bg-ui-accent-primary/10' : 'border-ui-border/50 bg-ui-surface/80'}
        hover:border-ui-accent-primary/50 hover:bg-ui-surface-elevated/50
        hover:scale-[1.02] hover:-translate-y-0.5
      `}
      style={{
        backdropFilter: 'blur(12px)',
        boxShadow: isSelected
          ? '0 0 25px var(--theme-primary-glow), 0 0 50px var(--theme-primary-bg), inset 0 0 30px var(--theme-primary-bg)'
          : '0 0 15px var(--theme-primary-glow), inset 0 0 20px var(--theme-primary-bg)',
        minHeight: '120px', // Fits metadata + ~1 line
        maxHeight: '300px', // Fits metadata + ~8 lines
        transition: 'all 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow =
            '0 0 25px var(--theme-primary-glow), 0 0 50px var(--theme-primary-bg), inset 0 0 30px var(--theme-primary-bg)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow =
            '0 0 15px var(--theme-primary-glow), inset 0 0 20px var(--theme-primary-bg)';
        }
      }}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onView();
      }}
    >
      {/* Header with checkbox and actions */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div
            className="relative"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <input
              type="checkbox"
              id={`memory-card-select-${memory.id}`}
              name={`memory-card-select-${memory.id}`}
              checked={isSelected}
              onChange={onSelect}
              aria-label={`Select memory: ${memory.content.substring(0, 50)}...`}
              className="w-4 h-4 rounded border-2 memory-checkbox"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-surface)',
                borderColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-border)',
                cursor: 'pointer',
              }}
            />
            {isSelected && (
              <svg
                className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 8L7 11L12 5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          {/* Sector chip - matches modal style */}
          <span
            className="px-2 py-0.5 text-xs rounded-full border flex items-center gap-1"
            style={{
              borderColor: sectorInfo.color,
              color: sectorInfo.color,
              backgroundColor: `${sectorInfo.color}20`,
            }}
          >
            <span aria-hidden="true">{sectorInfo.getIcon('xs')}</span>
            <span className="capitalize">{memory.primarySector}</span>
          </span>
        </div>
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-ui-border/50 text-ui-text-secondary hover:text-ui-accent-primary transition-colors"
            title="Edit memory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-status-error/20 text-ui-text-secondary hover:text-status-error transition-colors"
            title="Delete memory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Content - variable height, overflow hidden */}
      <div className="overflow-hidden" style={{ maxHeight: '160px' }}>
        <div className="text-sm text-ui-text-primary leading-relaxed">
          <MarkdownPreview content={memory.content} maxLines={6} />
        </div>
      </div>

      {/* Footer metadata */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ui-border/30 text-xs text-ui-text-muted">
        <span>{formatDate(memory.createdAt)}</span>
        {memory.metadata.tags && memory.metadata.tags.length > 0 && (
          <>
            <span>•</span>
            <span className="truncate">{memory.metadata.tags.slice(0, 2).join(', ')}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Memory Row Component (for Rows View - Stack)
// Min height: fits metadata + 1 line of content
// Max height: fits metadata + 3 lines of content
// ============================================================================

interface MemoryRowProps {
  memory: Memory;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

function MemoryRow({
  memory,
  onView,
  onEdit,
  onDelete,
  isSelected,
  onSelect,
}: MemoryRowProps): ReactElement {
  const sectorInfo = getSectorInfo(memory.primarySector);

  return (
    <div
      className={`
        p-4 rounded-lg border transition-all duration-200 cursor-pointer w-full
        ${isSelected ? 'border-ui-accent-primary/50 bg-ui-accent-primary/10' : 'border-ui-border/50 bg-ui-surface/80'}
        hover:border-ui-accent-primary/50 hover:bg-ui-surface-elevated/50
        hover:scale-[1.01] hover:-translate-y-0.5
      `}
      style={{
        backdropFilter: 'blur(12px)',
        boxShadow: isSelected
          ? '0 0 25px var(--theme-primary-glow), 0 0 50px var(--theme-primary-bg), inset 0 0 30px var(--theme-primary-bg)'
          : '0 0 15px var(--theme-primary-glow), inset 0 0 20px var(--theme-primary-bg)',
        minHeight: '80px', // Fits metadata + ~1 line
        maxHeight: '160px', // Fits metadata + ~3 lines
        transition: 'all 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow =
            '0 0 25px var(--theme-primary-glow), 0 0 50px var(--theme-primary-bg), inset 0 0 30px var(--theme-primary-bg)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.boxShadow =
            '0 0 15px var(--theme-primary-glow), inset 0 0 20px var(--theme-primary-bg)';
        }
      }}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onView();
      }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div
          className="mt-1 relative flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <input
            type="checkbox"
            id={`memory-row-select-${memory.id}`}
            name={`memory-row-select-${memory.id}`}
            checked={isSelected}
            onChange={onSelect}
            aria-label={`Select memory: ${memory.content.substring(0, 50)}...`}
            className="w-4 h-4 rounded border-2 memory-checkbox"
            style={{
              appearance: 'none',
              WebkitAppearance: 'none',
              backgroundColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-surface)',
              borderColor: isSelected ? 'var(--theme-primary)' : 'var(--theme-border)',
              cursor: 'pointer',
            }}
          />
          {isSelected && (
            <svg
              className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M4 8L7 11L12 5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Sector chip - matches modal style */}
        <span
          className="px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 flex-shrink-0 mt-0.5"
          style={{
            borderColor: sectorInfo.color,
            color: sectorInfo.color,
            backgroundColor: `${sectorInfo.color}20`,
          }}
        >
          <span aria-hidden="true">{sectorInfo.getIcon('xs')}</span>
          <span className="capitalize">{memory.primarySector}</span>
        </span>

        {/* Content area */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Content text - max 3 lines */}
          <div className="overflow-hidden" style={{ maxHeight: '60px' }}>
            <div className="text-sm text-ui-text-primary leading-relaxed">
              <MarkdownPreview content={memory.content} maxLines={3} />
            </div>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-ui-text-muted">
            <span>{formatDate(memory.createdAt)}</span>
            {memory.metadata.tags && memory.metadata.tags.length > 0 && (
              <>
                <span>•</span>
                <span className="truncate max-w-[200px]">
                  {memory.metadata.tags.slice(0, 3).join(', ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-ui-border/50 text-ui-text-secondary hover:text-ui-accent-primary transition-colors"
            title="Edit memory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-status-error/20 text-ui-text-secondary hover:text-status-error transition-colors"
            title="Delete memory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Delete Confirm Modal
// ============================================================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  count: number;
  isDeleting: boolean;
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  count,
  isDeleting,
}: DeleteConfirmModalProps): ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-ui-surface/95 backdrop-blur-glass border border-status-error/30 rounded-xl shadow-glow w-[90%] max-w-[400px] mx-4 p-6">
        <div className="text-center">
          <div className="text-status-warning mb-4 flex justify-center">
            <AlertTriangle size={40} />
          </div>
          <h3 className="text-lg font-semibold text-ui-text-primary mb-2">
            Delete {count} {count === 1 ? 'Memory' : 'Memories'}?
          </h3>
          <p className="text-sm text-ui-text-secondary mb-6">This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg text-ui-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => void onConfirm()}
              disabled={isDeleting}
              className="px-4 py-2 text-sm bg-status-error/20 hover:bg-status-error/30 border border-status-error/30 rounded-lg text-status-error flex items-center gap-2"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MemoryExplorer({
  userId,
  sessionId,
  className = '',
}: MemoryExplorerProps): ReactElement {
  const [searchParams, setSearchParams] = useSearchParams();

  // Use centralized memory store
  // Use centralized memory store - memories load in background automatically
  const memories = useMemoryStore((state) => state.memories);
  const isLoading = useMemoryStore((state) => state.isLoading);
  const isLoadingMore = useMemoryStore((state) => state.isLoadingMore);
  const storeError = useMemoryStore((state) => state.error);
  const totalCount = useMemoryStore((state) => state.totalCount);
  const isFullyLoaded = useMemoryStore((state) => state.isFullyLoaded);
  const storeFetchMemories = useMemoryStore((state) => state.fetchMemories);
  const storeAddMemory = useMemoryStore((state) => state.addMemory);
  const storeRemoveMemory = useMemoryStore((state) => state.removeMemory);

  // Local UI state
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<MemorySectorType | 'all'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Modal state - unified modal
  const [modalMode, setModalMode] = useState<MemoryModalMode | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync error from store
  useEffect(() => {
    if (storeError !== null && storeError !== '') setError(storeError);
  }, [storeError]);

  // Fetch memories from store on mount - background loading happens automatically
  useEffect(() => {
    void storeFetchMemories(userId);
  }, [userId, storeFetchMemories]);

  // Handle openMemory query parameter (from Dashboard click)
  useEffect(() => {
    const openMemoryId = searchParams.get('openMemory');
    if (openMemoryId !== null && openMemoryId !== '' && memories.length > 0) {
      const memoryToOpen = memories.find((m) => m.id === openMemoryId);
      if (memoryToOpen !== undefined) {
        setSelectedMemory(memoryToOpen);
        setModalMode('view');
        // Clear the query parameter
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, memories, setSearchParams]);

  // Filter and search memories (applied to whatever is loaded so far)
  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const lowerQuery = searchQuery.toLowerCase();
      const contentMatches = memory.content.toLowerCase().includes(lowerQuery);
      const tagsMatch =
        memory.metadata.tags?.some((t) => t.toLowerCase().includes(lowerQuery)) === true;
      const keywordsMatch =
        memory.metadata.keywords?.some((k) => k.toLowerCase().includes(lowerQuery)) === true;
      const matchesSearch = searchQuery === '' || contentMatches || tagsMatch || keywordsMatch;
      const matchesSector = sectorFilter === 'all' || memory.primarySector === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [memories, searchQuery, sectorFilter]);

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredMemories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMemories.map((m) => m.id)));
    }
  }, [filteredMemories, selectedIds.size]);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Modal handlers
  const handleOpenCreate = useCallback(() => {
    setSelectedMemory(null);
    setModalMode('create');
  }, []);

  const handleOpenView = useCallback((memory: Memory) => {
    setSelectedMemory(memory);
    setModalMode('view');
  }, []);

  const handleOpenEdit = useCallback((memory: Memory) => {
    if (isDemoMemoryId(memory.id)) {
      setError('Cannot edit demo memories. Demo data is read-only.');
      return;
    }
    setSelectedMemory(memory);
    setModalMode('edit');
  }, []);

  const handleSwitchToEdit = useCallback(() => {
    if (selectedMemory) {
      if (isDemoMemoryId(selectedMemory.id)) {
        setError('Cannot edit demo memories. Demo data is read-only.');
        return;
      }
      setModalMode('edit');
    }
  }, [selectedMemory]);

  const handleCloseModal = useCallback(() => {
    setModalMode(null);
    setSelectedMemory(null);
  }, []);

  // Get updateMemory from store
  const storeUpdateMemory = useMemoryStore((state) => state.updateMemory);

  const handleModalSave = useCallback(
    (result: MemoryModalSaveResult) => {
      if (modalMode === 'edit' && selectedMemory) {
        // Update in store
        storeUpdateMemory(result.memoryId, {
          content: result.content,
          primarySector: result.primarySector,
        });
      } else if (modalMode === 'create') {
        // Add to store
        const newMemory: Memory = {
          id: result.memoryId,
          userId,
          sessionId,
          content: result.content,
          primarySector: result.primarySector,
          salience: result.salience,
          strength: result.strength,
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          metadata: {},
        };
        storeAddMemory(newMemory);
      }
      handleCloseModal();
    },
    [
      modalMode,
      selectedMemory,
      userId,
      sessionId,
      storeAddMemory,
      storeUpdateMemory,
      handleCloseModal,
    ]
  );

  const handleModalDelete = useCallback(
    (memoryId: string) => {
      storeRemoveMemory(memoryId);
      handleCloseModal();
    },
    [storeRemoveMemory, handleCloseModal]
  );

  // Bulk delete handler
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const client = getDefaultClient();
      await Promise.all(Array.from(selectedIds).map((id) => client.deleteMemory(id, userId)));
      for (const id of selectedIds) storeRemoveMemory(id);
    } catch (err) {
      console.error('Failed to delete memories:', err);
    } finally {
      setIsDeleting(false);
      setSelectedIds(new Set());
      setIsDeleteModalOpen(false);
    }
  }, [selectedIds, userId, storeRemoveMemory]);

  const handleDeleteSingle = useCallback((memory: Memory) => {
    setSelectedIds(new Set([memory.id]));
    setIsDeleteModalOpen(true);
  }, []);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-ui-border/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-ui-text-primary flex items-center gap-2">
              <span className="text-ui-accent-primary">
                <ExplorerIcon size="2xl" />
              </span>
              Memory Explorer
            </h1>
            <p className="text-sm text-ui-text-secondary mt-1 flex items-center gap-2">
              <span>
                {filteredMemories.length}
                {totalCount !== null && totalCount > 0 && !isFullyLoaded
                  ? ` of ${String(totalCount)}`
                  : ''}{' '}
                {filteredMemories.length === 1 ? 'memory' : 'memories'}
                {searchQuery !== '' || sectorFilter !== 'all' ? ' (filtered)' : ''}
              </span>
              {isLoadingMore && (
                <span className="flex items-center gap-1 text-ui-accent-primary">
                  <svg
                    className="animate-spin h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  <span className="text-xs">loading...</span>
                </span>
              )}
            </p>
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                id="search-memories"
                name="search-memories"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search memories..."
                aria-label="Search memories"
                className="w-full pl-10 pr-4 py-2 bg-ui-background/70 border border-ui-border/50 rounded-lg text-ui-text-primary placeholder:text-ui-text-muted"
              />
            </div>
          </div>

          <div className="relative">
            <select
              id="filter-sector"
              name="filter-sector"
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value as MemorySectorType | 'all');
              }}
              aria-label="Filter by memory type"
              className="appearance-none pl-3 pr-10 py-2 bg-ui-background/70 border border-ui-border/50 rounded-lg text-ui-text-primary cursor-pointer"
            >
              <option value="all">All Types</option>
              {SECTOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>

          {selectedIds.size > 0 && (
            <button
              onClick={() => {
                setIsDeleteModalOpen(true);
              }}
              className="px-3 py-2 bg-status-error/20 hover:bg-status-error/30 border border-status-error/30 rounded-lg text-status-error flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-status-error/10 border border-status-error/30 rounded-lg text-status-error text-sm">
            {error}
            <button
              onClick={() => {
                setError(null);
              }}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <svg
                className="animate-spin h-8 w-8 text-ui-accent-primary mx-auto mb-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
              <p className="text-ui-text-secondary">Loading memories...</p>
            </div>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <span className="text-5xl mb-4 block">🧠</span>
              <p className="text-ui-text-secondary mb-2">
                {searchQuery || sectorFilter !== 'all'
                  ? 'No memories match your filters'
                  : 'No memories yet'}
              </p>
              <button
                onClick={handleOpenCreate}
                className="text-ui-accent-primary hover:underline text-sm"
              >
                Create your first memory
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Select All */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-ui-border/30">
              <div className="relative">
                <input
                  type="checkbox"
                  id="select-all-memories"
                  name="select-all-memories"
                  checked={
                    selectedIds.size === filteredMemories.length && filteredMemories.length > 0
                  }
                  onChange={handleSelectAll}
                  aria-label="Select all memories"
                  className="w-4 h-4 rounded border-2 memory-checkbox"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundColor:
                      selectedIds.size === filteredMemories.length && filteredMemories.length > 0
                        ? 'var(--theme-primary)'
                        : 'var(--theme-surface)',
                    borderColor:
                      selectedIds.size === filteredMemories.length && filteredMemories.length > 0
                        ? 'var(--theme-primary)'
                        : 'var(--theme-border)',
                    cursor: 'pointer',
                  }}
                />
                {selectedIds.size === filteredMemories.length && filteredMemories.length > 0 && (
                  <svg
                    className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 8L7 11L12 5"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <span className="text-sm text-ui-text-secondary">
                {selectedIds.size > 0
                  ? `${String(selectedIds.size)} selected`
                  : `Select all (${String(filteredMemories.length)})`}
              </span>
            </div>

            {/* Memory Views */}
            {viewMode === 'cards' ? (
              /* Cards View - Masonry Grid */
              <div
                className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4"
                style={{ columnFill: 'balance' }}
              >
                {filteredMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    isSelected={selectedIds.has(memory.id)}
                    onSelect={() => {
                      handleSelect(memory.id);
                    }}
                    onView={() => {
                      handleOpenView(memory);
                    }}
                    onEdit={() => {
                      handleOpenEdit(memory);
                    }}
                    onDelete={() => {
                      handleDeleteSingle(memory);
                    }}
                  />
                ))}
              </div>
            ) : (
              /* Rows View - Stack */
              <div className="flex flex-col gap-3">
                {filteredMemories.map((memory) => (
                  <MemoryRow
                    key={memory.id}
                    memory={memory}
                    isSelected={selectedIds.has(memory.id)}
                    onSelect={() => {
                      handleSelect(memory.id);
                    }}
                    onView={() => {
                      handleOpenView(memory);
                    }}
                    onEdit={() => {
                      handleOpenEdit(memory);
                    }}
                    onDelete={() => {
                      handleDeleteSingle(memory);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleOpenCreate}
        className="fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50 w-56 px-6 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95"
        aria-label="Create new memory"
        style={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)' }}
      >
        <svg
          className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="font-medium text-sm">New Memory</span>
      </button>

      {/* Unified Memory Modal */}
      {modalMode && (
        <MemoryModal
          isOpen={true}
          mode={modalMode}
          {...(selectedMemory ? { memory: selectedMemory } : {})}
          onSave={handleModalSave}
          onClose={handleCloseModal}
          onEdit={handleSwitchToEdit}
          onDelete={handleModalDelete}
          availableMemories={memories}
          userId={userId}
          sessionId={sessionId}
        />
      )}

      {/* Bulk Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
        }}
        onConfirm={handleBulkDelete}
        count={selectedIds.size}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default MemoryExplorer;
