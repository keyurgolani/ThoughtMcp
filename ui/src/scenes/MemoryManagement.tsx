/**
 * MemoryManagement Component
 *
 * Page for managing memories with CRUD operations in a list/table view.
 * Provides search, filter, create, edit, and delete functionality
 * without the 3D graph visualization.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { getDefaultClient } from '../api/client';
import {
  QuickCaptureModal,
  type QuickCaptureSaveResult,
} from '../components/hud/QuickCaptureModal';
import type { Memory, MemorySectorType } from '../types/api';

// ============================================================================
// Types
// ============================================================================

interface MemoryManagementProps {
  userId?: string;
  sessionId?: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SECTOR_OPTIONS: { value: MemorySectorType; label: string; icon: string; color: string }[] = [
  { value: 'episodic', label: 'Episodic', icon: '📅', color: '#FFD700' },
  { value: 'semantic', label: 'Semantic', icon: '📚', color: '#00FFFF' },
  { value: 'procedural', label: 'Procedural', icon: '⚙️', color: '#9B59B6' },
  { value: 'emotional', label: 'Emotional', icon: '💛', color: '#F39C12' },
  { value: 'reflective', label: 'Reflective', icon: '🪞', color: '#C0C0C0' },
];

const ITEMS_PER_PAGE = 20;

// Demo data for when API is not available
const DEMO_MEMORIES: Memory[] = [
  {
    id: 'mem-1',
    userId: 'demo-user',
    sessionId: 'demo-session',
    content: 'The architecture of neural networks mimics biological brain structures',
    primarySector: 'semantic',
    salience: 0.9,
    strength: 0.85,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 15,
    metadata: { keywords: ['neural', 'architecture', 'brain'], tags: ['AI', 'learning'] },
  },
  {
    id: 'mem-2',
    userId: 'demo-user',
    sessionId: 'demo-session',
    content:
      'Yesterday I learned about transformer attention mechanisms and how they enable models to focus on relevant parts of the input',
    primarySector: 'episodic',
    salience: 0.7,
    strength: 0.9,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 5,
    metadata: { keywords: ['transformer', 'attention'], tags: ['learning'] },
  },
  {
    id: 'mem-3',
    userId: 'demo-user',
    sessionId: 'demo-session',
    content:
      'To train a model: prepare data, define architecture, set hyperparameters, iterate until convergence',
    primarySector: 'procedural',
    salience: 0.8,
    strength: 0.75,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 20,
    metadata: { keywords: ['training', 'model', 'steps'], tags: ['how-to'] },
  },
  {
    id: 'mem-4',
    userId: 'demo-user',
    sessionId: 'demo-session',
    content:
      'Feeling excited about the potential of AI to solve complex problems and improve human lives',
    primarySector: 'emotional',
    salience: 0.6,
    strength: 0.8,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 3,
    metadata: { keywords: ['excitement', 'AI', 'potential'], tags: ['emotion'] },
  },
  {
    id: 'mem-5',
    userId: 'demo-user',
    sessionId: 'demo-session',
    content:
      'Reflecting on how my understanding of machine learning has evolved over time through practice and study',
    primarySector: 'reflective',
    salience: 0.65,
    strength: 0.7,
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 8,
    metadata: { keywords: ['reflection', 'growth', 'ML'], tags: ['meta'] },
  },
  {
    id: 'mem-6',
    userId: 'demo-user',
    sessionId: 'demo-session',
    content:
      'Backpropagation is the key algorithm for training neural networks by computing gradients',
    primarySector: 'semantic',
    salience: 0.85,
    strength: 0.9,
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 12,
    metadata: {
      keywords: ['backpropagation', 'gradients', 'training'],
      tags: ['AI', 'fundamentals'],
    },
  },
];

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

function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

function getSectorInfo(sector: MemorySectorType): { icon: string; color: string } {
  const info = SECTOR_OPTIONS.find((s) => s.value === sector);
  return info ?? { icon: '📝', color: '#888888' };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MemoryCardProps {
  memory: Memory;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  isPinned: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function MemoryCard({
  memory,
  onEdit,
  onDelete,
  onPin,
  isPinned,
  isSelected,
  onSelect,
}: MemoryCardProps): ReactElement {
  const sectorInfo = getSectorInfo(memory.primarySector);

  return (
    <div
      className={`
        p-4 rounded-lg border transition-all duration-200
        ${isSelected ? 'border-ui-accent-primary/50 bg-ui-accent-primary/10' : 'border-ui-border/30 bg-ui-surface/50'}
        hover:border-ui-accent-primary/30 hover:bg-ui-surface-elevated/50
      `}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 relative">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
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

        <div
          className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
          style={{ backgroundColor: sectorInfo.color }}
          title={memory.primarySector}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-ui-text-primary leading-relaxed">
              {truncateContent(memory.content, 150)}
            </p>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onPin}
                className={`p-1.5 rounded transition-colors ${
                  isPinned
                    ? 'text-ui-accent-primary hover:bg-ui-accent-primary/20'
                    : 'text-ui-text-secondary hover:bg-ui-border/50 hover:text-ui-accent-primary'
                }`}
                title={isPinned ? 'Unpin memory' : 'Pin memory'}
              >
                <span className="text-sm">{isPinned ? '📌' : '📍'}</span>
              </button>
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

          <div className="flex items-center gap-3 mt-2 text-xs text-ui-text-muted">
            <span className="flex items-center gap-1">
              <span>{sectorInfo.icon}</span>
              <span className="capitalize">{memory.primarySector}</span>
            </span>
            <span>•</span>
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
      </div>
    </div>
  );
}
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
          <div className="text-4xl mb-4">⚠️</div>
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

export function MemoryManagement({
  userId = 'demo-user',
  sessionId = 'demo-session',
  className = '',
}: MemoryManagementProps): ReactElement {
  // Data state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<MemorySectorType | 'all'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pinned memories state (stored locally for demo)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set(['mem-1', 'mem-3']));

  // Fetch memories - falls back to demo data if API fails
  const fetchMemories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const client = getDefaultClient();
      const response = await client.recallMemories({
        userId,
        limit: 1000,
      });
      setMemories(response.memories);
    } catch {
      // Use demo data when API is not available
      setMemories(DEMO_MEMORIES);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchMemories();
  }, [fetchMemories]);

  // Filter and search memories
  const filteredMemories = useMemo(() => {
    return memories.filter((memory) => {
      const lowerQuery = searchQuery.toLowerCase();
      const contentMatches = memory.content.toLowerCase().includes(lowerQuery);
      const tagsMatch =
        memory.metadata.tags !== undefined &&
        memory.metadata.tags.some((t) => t.toLowerCase().includes(lowerQuery));
      const keywordsMatch =
        memory.metadata.keywords !== undefined &&
        memory.metadata.keywords.some((k) => k.toLowerCase().includes(lowerQuery));
      const matchesSearch = searchQuery === '' || contentMatches || tagsMatch || keywordsMatch;
      const matchesSector = sectorFilter === 'all' || memory.primarySector === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [memories, searchQuery, sectorFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredMemories.length / ITEMS_PER_PAGE);
  const paginatedMemories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMemories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMemories, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sectorFilter]);

  // Auto-focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedMemories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedMemories.map((m) => m.id)));
    }
  }, [paginatedMemories, selectedIds.size]);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle save from QuickCaptureModal (works for both create and edit)
  const handleQuickCaptureSave = useCallback(
    (result: QuickCaptureSaveResult) => {
      if (editingMemory !== null) {
        // Edit mode: update local state
        setMemories((prev) =>
          prev.map((m) =>
            m.id === result.memoryId
              ? {
                  ...m,
                  content: result.content,
                  primarySector: result.primarySector,
                }
              : m
          )
        );
        setEditingMemory(null);
      } else {
        // Create mode: add to local state (API already called by modal)
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
        setMemories((prev) => [newMemory, ...prev]);
        setIsCreateModalOpen(false);
      }
    },
    [editingMemory, userId, sessionId]
  );

  const handleDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const client = getDefaultClient();
      await Promise.all(Array.from(selectedIds).map((id) => client.deleteMemory(id, userId)));
      await fetchMemories();
    } catch {
      // Demo mode: remove from local state
      setMemories((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    } finally {
      setIsDeleting(false);
      setSelectedIds(new Set());
      setIsDeleteModalOpen(false);
    }
  }, [selectedIds, userId, fetchMemories]);

  const handleDeleteSingle = useCallback((memory: Memory) => {
    setSelectedIds(new Set([memory.id]));
    setIsDeleteModalOpen(true);
  }, []);

  const handleEditClick = useCallback((memory: Memory) => {
    setEditingMemory(memory);
  }, []);

  const handleTogglePin = useCallback((memoryId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memoryId)) {
        next.delete(memoryId);
      } else {
        next.add(memoryId);
      }
      return next;
    });
  }, []);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-ui-border/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-ui-text-primary flex items-center gap-2">
              <span>🗃️</span>
              Memory Management
            </h1>
            <p className="text-sm text-ui-text-secondary mt-1">
              {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'}
              {searchQuery || sectorFilter !== 'all' ? ' (filtered)' : ''}
            </p>
          </div>
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
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search memories..."
                className="w-full pl-10 pr-4 py-2 bg-ui-background/70 border border-ui-border/50 rounded-lg text-ui-text-primary placeholder:text-ui-text-muted"
              />
            </div>
          </div>

          <div className="relative">
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value as MemorySectorType | 'all');
              }}
              className="appearance-none pl-3 pr-10 py-2 bg-ui-background/70 border border-ui-border/50 rounded-lg text-ui-text-primary cursor-pointer"
            >
              <option value="all">All Types</option>
              {SECTOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
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
        {error !== null && error !== '' && (
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
                {searchQuery !== '' || sectorFilter !== 'all'
                  ? 'No memories match your filters'
                  : 'No memories yet'}
              </p>
              <button
                onClick={() => {
                  setIsCreateModalOpen(true);
                }}
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
                  checked={
                    selectedIds.size === paginatedMemories.length && paginatedMemories.length > 0
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-2 memory-checkbox"
                  style={{
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundColor:
                      selectedIds.size === paginatedMemories.length && paginatedMemories.length > 0
                        ? 'var(--theme-primary)'
                        : 'var(--theme-surface)',
                    borderColor:
                      selectedIds.size === paginatedMemories.length && paginatedMemories.length > 0
                        ? 'var(--theme-primary)'
                        : 'var(--theme-border)',
                    cursor: 'pointer',
                  }}
                />
                {selectedIds.size === paginatedMemories.length && paginatedMemories.length > 0 && (
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
                {selectedIds.size > 0 ? `${String(selectedIds.size)} selected` : 'Select all'}
              </span>
            </div>

            {/* Memory List */}
            <div className="space-y-3">
              {paginatedMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  isSelected={selectedIds.has(memory.id)}
                  isPinned={pinnedIds.has(memory.id)}
                  onSelect={() => {
                    handleSelect(memory.id);
                  }}
                  onEdit={() => {
                    handleEditClick(memory);
                  }}
                  onDelete={() => {
                    handleDeleteSingle(memory);
                  }}
                  onPin={() => {
                    handleTogglePin(memory.id);
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-ui-border/30">
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg text-ui-text-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-ui-text-secondary px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg text-ui-text-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Action Button - Bottom center */}
      <button
        onClick={() => {
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-56 px-6 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95"
        aria-label="Create new memory"
        style={{
          boxShadow: '0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
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

      {/* Modals */}
      <QuickCaptureModal
        isOpen={isCreateModalOpen}
        onSave={handleQuickCaptureSave}
        onClose={() => {
          setIsCreateModalOpen(false);
        }}
        availableMemories={memories}
        userId={userId}
        sessionId={sessionId}
      />

      <QuickCaptureModal
        isOpen={editingMemory !== null}
        {...(editingMemory !== null ? { editingMemory } : {})}
        onSave={handleQuickCaptureSave}
        onClose={() => {
          setEditingMemory(null);
        }}
        availableMemories={memories}
        userId={userId}
        sessionId={sessionId}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
        }}
        onConfirm={handleDelete}
        count={selectedIds.size}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default MemoryManagement;
