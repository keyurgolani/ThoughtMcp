/**
 * QuickCaptureModal Component
 *
 * Modal for rapid memory creation with auto-linking.
 * Provides a streamlined interface for quickly capturing thoughts
 * without leaving the current view.
 * Supports wiki-style [[ link syntax for creating connections.
 * Auto-suggests related memories based on keywords in the content.
 *
 * Requirements: 44.1, 44.2, 44.3, 44.4, 44.5, 44.6
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDefaultClient } from '../../api/client';
import type { Memory, MemorySectorType } from '../../types/api';
import { findRelatedMemories, type SuggestedMemory } from '../../utils/autoSuggest';
import { WikiLinkInput, createWaypointLink } from './WikiLinkAutocomplete';

// ============================================================================
// Types
// ============================================================================

/**
 * Result data returned when a memory is successfully saved
 * Used for animating the new node in the 3D view (Requirement 44.6)
 */
export interface QuickCaptureSaveResult {
  /** The ID of the newly created memory */
  memoryId: string;
  /** The content that was saved */
  content: string;
  /** The primary sector type */
  primarySector: MemorySectorType;
  /** Whether the memory was linked to the current node */
  linkedToCurrent: boolean;
  /** The ID of the current node it was linked to (if any) */
  linkedToNodeId: string | undefined;
  /** Salience score from the API response */
  salience: number;
  /** Strength score from the API response */
  strength: number;
}

export interface QuickCaptureModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Current memory context for auto-linking (Requirement 44.2) */
  currentMemoryContext?: Memory;
  /** Memory to edit (if provided, modal is in edit mode) */
  editingMemory?: Memory;
  /** Callback when memory is saved (Requirement 44.5, 44.6) */
  onSave: (result: QuickCaptureSaveResult) => void;
  /** Callback to close the modal */
  onClose: () => void;
  /** Suggested memories for linking (optional) */
  suggestedLinks?: Memory[];
  /** All available memories for wiki link autocomplete (Requirement 44.3) */
  availableMemories?: Memory[];
  /** User ID for API calls */
  userId?: string;
  /** Session ID for API calls */
  sessionId?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SECTOR_OPTIONS: { value: MemorySectorType; label: string; icon: string }[] = [
  { value: 'episodic', label: 'Episodic', icon: '📅' },
  { value: 'semantic', label: 'Semantic', icon: '📚' },
  { value: 'procedural', label: 'Procedural', icon: '⚙️' },
  { value: 'emotional', label: 'Emotional', icon: '💛' },
  { value: 'reflective', label: 'Reflective', icon: '🪞' },
];

// Stable empty arrays to avoid re-renders from default prop values
const EMPTY_MEMORY_ARRAY: Memory[] = [];
const EMPTY_SUGGESTED_LINKS: Memory[] = [];

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuickCaptureModal - Rapid memory creation modal
 *
 * Features:
 * - Streamlined content input
 * - Quick sector type selection
 * - Optional link to current memory (Requirement 44.4)
 * - Context preservation from current memory (Requirement 44.2)
 * - Keyboard shortcut support (Cmd/Ctrl+Enter to save)
 * - Returns focus to 3D view after save (Requirement 44.5)
 * - Provides save result for animating new node (Requirement 44.6)
 *
 * Requirements: 44.1, 44.2, 44.4, 44.5, 44.6
 */
export function QuickCaptureModal({
  isOpen,
  currentMemoryContext,
  editingMemory,
  onSave,
  onClose,
  suggestedLinks = EMPTY_SUGGESTED_LINKS,
  availableMemories = EMPTY_MEMORY_ARRAY,
  userId = 'demo-user',
  sessionId = 'demo-session',
  className = '',
}: QuickCaptureModalProps): React.ReactElement | null {
  // Determine if we're in edit mode
  const isEditMode = editingMemory !== undefined;

  // Form state
  const [content, setContent] = useState('');
  const [primarySector, setPrimarySector] = useState<MemorySectorType>('semantic');
  const [linkToCurrent, setLinkToCurrent] = useState(currentMemoryContext !== undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-suggest state (Requirement 44.3)
  const [autoSuggestions, setAutoSuggestions] = useState<SuggestedMemory[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IDs to exclude from suggestions (current memory context + editing memory)
  const excludeIds = useMemo(() => {
    const ids: string[] = [];
    if (currentMemoryContext?.id !== undefined && currentMemoryContext.id !== '') {
      ids.push(currentMemoryContext.id);
    }
    if (editingMemory?.id !== undefined && editingMemory.id !== '') {
      ids.push(editingMemory.id);
    }
    return ids;
  }, [currentMemoryContext?.id, editingMemory?.id]);

  // Track if modal was previously open to detect open transitions
  const wasOpenRef = useRef(false);

  // Reset form when modal opens or editingMemory changes
  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (justOpened) {
      if (editingMemory !== undefined) {
        // Edit mode: populate with existing memory data
        setContent(editingMemory.content);
        setPrimarySector(editingMemory.primarySector);
        setTags(editingMemory.metadata.tags ?? []);
        setShowAdvanced((editingMemory.metadata.tags ?? []).length > 0);
      } else {
        // Create mode: reset to defaults
        setContent('');
        setPrimarySector('semantic');
        setTags([]);
        setShowAdvanced(false);
      }
      setLinkToCurrent(currentMemoryContext !== undefined && editingMemory === undefined);
      setError(null);
      setAutoSuggestions([]);
      setTagInput('');
    }
  }, [isOpen, editingMemory, currentMemoryContext]);

  // Auto-suggest related memories based on content (Requirement 44.3)
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't suggest if content is too short or no memories available
    if (content.trim().length < 10 || availableMemories.length === 0) {
      setAutoSuggestions([]);
      return;
    }

    // Debounce the suggestion calculation
    debounceTimerRef.current = setTimeout(() => {
      const suggestions = findRelatedMemories(content, availableMemories, excludeIds, 3);
      setAutoSuggestions(suggestions);
    }, 300);

    return (): void => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, availableMemories, excludeIds]);

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
    // Validate content
    if (content.trim() === '') {
      setError('Please enter some content');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const client = getDefaultClient();

      if (editingMemory !== undefined) {
        // Update existing memory
        await client.updateMemory({
          memoryId: editingMemory.id,
          userId,
          content: content.trim(),
          ...(tags.length > 0 ? { metadata: { tags } } : {}),
        });

        // Build the save result for edit
        const saveResult: QuickCaptureSaveResult = {
          memoryId: editingMemory.id,
          content: content.trim(),
          primarySector,
          linkedToCurrent: false,
          linkedToNodeId: undefined,
          salience: editingMemory.salience,
          strength: editingMemory.strength,
        };

        onSave(saveResult);
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

      // Track if link was successfully created
      let linkCreated = false;
      const currentMemoryId = currentMemoryContext?.id;

      // Create waypoint link to current memory if requested (Requirement 44.4)
      if (linkToCurrent && currentMemoryId !== undefined && currentMemoryId !== '') {
        try {
          await createWaypointLink({
            sourceMemoryId: storeResponse.memoryId,
            targetMemoryId: currentMemoryId,
            userId,
            linkType: 'semantic',
          });
          linkCreated = true;
        } catch (linkError) {
          // Log but don't fail the save if link creation fails
          console.warn('Failed to create waypoint link to current memory:', linkError);
        }
      }

      // Build the save result for the callback (Requirement 44.5, 44.6)
      const saveResult: QuickCaptureSaveResult = {
        memoryId: storeResponse.memoryId,
        content: content.trim(),
        primarySector,
        linkedToCurrent: linkCreated,
        linkedToNodeId: linkCreated ? currentMemoryId : undefined,
        salience: storeResponse.salience,
        strength: storeResponse.strength,
      };

      // Call the onSave callback with the result
      // This allows the parent to animate the new node appearing (Requirement 44.6)
      onSave(saveResult);

      // Close the modal and return focus to 3D view (Requirement 44.5)
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
    editingMemory,
    tags,
    userId,
    sessionId,
    onSave,
    onClose,
  ]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Cmd/Ctrl+Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (content.trim() !== '') {
          void handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, content, onClose, handleSave]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isSaving) {
        onClose();
      }
    },
    [onClose, isSaving]
  );

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-capture-title"
      style={{ zIndex: 70 }} // Z_INDEX.QUICK_CAPTURE_MODAL (Requirement 48.2)
    >
      {/* Adaptive modal sizing (Requirements 49.1, 49.2, 49.3, 49.5):
          - Large screens (>1440px): 60% width, min 800px
          - Medium screens (768-1440px): 80% width
          - Small screens (<768px): 95% width
      */}
      <div
        className={`
          bg-ui-surface/95
          backdrop-blur-glass
          border border-ui-accent-primary/30
          rounded-xl
          shadow-glow
          w-[95%] sm:w-[90%] md:w-[80%] xl:w-[60%]
          max-w-[900px] min-w-[300px]
          mx-4
          animate-scale-in
          transition-all duration-300 ease-out
          ${className}
        `}
        style={{
          boxShadow: `
            0 0 40px var(--theme-primary-glow),
            0 0 80px var(--theme-primary-subtle),
            inset 0 0 40px var(--theme-primary-bg)
          `,
          minWidth: '300px',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-ui-border/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              {isEditMode ? '✏️' : '⚡'}
            </span>
            <h2 id="quick-capture-title" className="text-lg font-semibold text-ui-accent-primary">
              {isEditMode ? 'Edit Memory' : 'Quick Capture'}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 hover:bg-ui-border/50 rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary"
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

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Context indicator (Requirement 44.2) */}
          {currentMemoryContext && (
            <div className="flex items-center gap-2 p-2 bg-ui-background/50 rounded-lg border border-ui-border/30">
              <span className="text-xs text-ui-text-muted">Context:</span>
              <span className="text-xs text-ui-text-secondary truncate flex-1">
                {currentMemoryContext.content.substring(0, 50)}
                {currentMemoryContext.content.length > 50 ? '...' : ''}
              </span>
            </div>
          )}

          {/* Content input with wiki link support (Requirement 44.3, 49.4) */}
          <div>
            <WikiLinkInput
              value={content}
              onChange={setContent}
              memories={availableMemories}
              {...(currentMemoryContext?.id != null
                ? { sourceMemoryId: currentMemoryContext.id }
                : {})}
              userId={userId}
              createWaypointOnInsert={true}
              placeholder="What's on your mind? Type [[ to link to memories..."
              multiline={true}
              rows={6}
              autoFocus={true}
              className={`
                bg-ui-background/70
                border-ui-border/50
                placeholder:text-ui-text-muted
                min-h-[200px]
                ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
            <p className="text-xs text-ui-text-muted mt-1">
              Tip: Type{' '}
              <kbd className="px-1 py-0.5 bg-ui-background/50 rounded text-ui-text-secondary">
                [[
              </kbd>{' '}
              to link to existing memories
            </p>
          </div>

          {/* Sector type selection */}
          <div>
            <label className="text-xs text-ui-text-muted block mb-2">Memory Type</label>
            <div className="flex flex-wrap gap-1.5">
              {SECTOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={(): void => {
                    setPrimarySector(option.value);
                  }}
                  disabled={isSaving}
                  className={`
                    px-2.5 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1.5
                    ${
                      primarySector === option.value
                        ? 'border-ui-accent-primary/50 bg-ui-accent-primary/10 text-ui-accent-primary'
                        : 'border-ui-border/50 text-ui-text-secondary hover:border-ui-accent-primary/30 hover:text-ui-text-primary'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link to current option (Requirement 44.4) - only in create mode */}
          {currentMemoryContext && !isEditMode && (
            <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-ui-background/30 transition-colors">
              <input
                type="checkbox"
                checked={linkToCurrent}
                onChange={(e): void => {
                  setLinkToCurrent(e.target.checked);
                }}
                disabled={isSaving}
                className="
                  w-4 h-4
                  rounded
                  border-ui-border
                  bg-ui-background
                  text-ui-accent-primary
                  focus:ring-ui-accent-primary/50
                  focus:ring-offset-0
                "
              />
              <span className="text-sm text-ui-text-secondary">Link to current memory</span>
            </label>
          )}

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={(): void => {
              setShowAdvanced(!showAdvanced);
            }}
            className="flex items-center gap-2 text-xs text-ui-text-muted hover:text-ui-text-secondary transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showAdvanced ? 'Hide' : 'Show'} tags
          </button>

          {/* Tags section (collapsible) */}
          {showAdvanced && (
            <div className="space-y-2 pl-2 border-l-2 border-ui-border/30">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e): void => {
                    setTagInput(e.target.value);
                  }}
                  onKeyDown={(e): void => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  disabled={isSaving}
                  className="flex-1 bg-ui-background/70 border border-ui-border/50 rounded-lg px-3 py-1.5 text-sm text-ui-text-primary placeholder:text-ui-text-muted"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={isSaving || tagInput.trim() === ''}
                  className="px-3 py-1.5 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg text-ui-text-secondary disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-ui-accent-primary/10 border border-ui-accent-primary/30 rounded-full text-ui-accent-primary flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={(): void => {
                          handleRemoveTag(tag);
                        }}
                        className="hover:text-status-error"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Auto-suggested links based on content keywords (Requirement 44.3) */}
          {autoSuggestions.length > 0 && (
            <div>
              <label className="text-xs text-ui-text-muted block mb-2">
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-3 h-3 text-ui-accent-primary"
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
                  Related Memories (click to link)
                </span>
              </label>
              <div className="space-y-1.5">
                {autoSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.memory.id}
                    onClick={(): void => {
                      // Insert wiki link at cursor position
                      const linkText = `[[${suggestion.memory.id}|${suggestion.memory.content.substring(0, 30)}...]]`;
                      setContent((prev) => prev + ' ' + linkText);
                    }}
                    disabled={isSaving}
                    className="
                      w-full text-left px-2.5 py-2 text-xs
                      bg-ui-background/50 border border-ui-border/30 rounded-lg
                      text-ui-text-secondary hover:border-ui-accent-primary/30
                      hover:bg-ui-accent-primary/5 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
                      group
                    "
                    title={suggestion.memory.content}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-ui-text-primary group-hover:text-ui-accent-primary transition-colors">
                          {suggestion.memory.content.substring(0, 40)}
                          {suggestion.memory.content.length > 40 ? '...' : ''}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-ui-text-muted">
                          <span className="capitalize">{suggestion.memory.primarySector}</span>
                          {suggestion.matchedKeywords.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="truncate">
                                Matches: {suggestion.matchedKeywords.slice(0, 2).join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual suggested links (if provided and no auto-suggestions) */}
          {suggestedLinks.length > 0 && autoSuggestions.length === 0 && (
            <div>
              <label className="text-xs text-ui-text-muted block mb-2">Suggested Links</label>
              <div className="flex flex-wrap gap-1.5">
                {suggestedLinks.slice(0, 3).map((memory) => (
                  <button
                    key={memory.id}
                    onClick={(): void => {
                      const linkText = `[[${memory.id}|${memory.content.substring(0, 30)}...]]`;
                      setContent((prev) => prev + ' ' + linkText);
                    }}
                    disabled={isSaving}
                    className="px-2 py-1 text-xs bg-ui-background/50 border border-ui-border/30 rounded text-ui-text-secondary hover:border-ui-accent-primary/30 transition-colors truncate max-w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={memory.content}
                  >
                    {memory.content.substring(0, 20)}...
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {error !== null && error !== '' && (
            <div className="p-2 bg-status-error/10 border border-status-error/30 rounded-lg">
              <p className="text-xs text-status-error">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-ui-border/50">
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
              className="
                px-3 py-1.5 text-sm
                bg-ui-border/30 hover:bg-ui-border/50
                rounded-lg transition-colors
                text-ui-text-secondary
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Cancel
            </button>
            <button
              onClick={(): void => {
                void handleSave();
              }}
              disabled={isSaving || !content.trim()}
              className="
                px-4 py-1.5 text-sm
                bg-ui-accent-primary/20 hover:bg-ui-accent-primary/30
                border border-ui-accent-primary/30
                rounded-lg transition-all
                text-ui-accent-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2
              "
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
                  {isEditMode ? 'Save' : 'Capture'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickCaptureModal;
