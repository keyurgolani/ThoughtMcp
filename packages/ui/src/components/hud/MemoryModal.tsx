/**
 * MemoryModal Component
 *
 * Unified modal for memory operations with three variants:
 * - 'create': Creating new memories
 * - 'view': Viewing/previewing memory details (read-only)
 * - 'edit': Editing existing memories
 *
 * Layout (Redesigned - Streamlined Controls):
 * - Single header row with all controls (title, mode indicator, actions, close)
 * - No footer - keyboard shortcut hint integrated into header
 * - Two-column layout (60/40 split)
 * - Left column: Content area (editor or rendered markdown)
 * - Right column: Memory Links (expanded) + Metadata (compact)
 */

import { Edit, Zap } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getDefaultClient, isDemoMemoryId } from "../../api/client";
import type { Memory, MemorySectorType } from "../../types/api";
import { formatPercentage } from "../../utils/formatUtils";
import { getSectorIcon } from "../../utils/iconUtils";
import { createWaypointLink, parseWikiLinks } from "../../utils/wikiLinkUtils";
import { BlockNoteEditor } from "../editor/BlockNoteEditor";
import { BlockNoteViewer } from "../editor/BlockNoteViewer";
import { MemoriesIcon, type IconSize } from "../icons";
import { MemoryLinksList } from "./MemoryLinksList";
import { SectorBadge } from "./SectorBadge";

export type MemoryModalMode = "create" | "view" | "edit";

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
  onCancelEdit?: () => void;
  onDelete?: (memoryId: string) => void;
  onWikiLinkClick?: (memoryId: string) => void;
  availableMemories?: Memory[];
  userId: string;
  sessionId: string;
  className?: string;
  fullscreen?: boolean;
}

interface SectorOption {
  value: MemorySectorType;
  label: string;
  getIcon: (size: IconSize) => React.ReactElement;
}

const SECTOR_OPTIONS: SectorOption[] = [
  { value: "episodic", label: "Episodic", getIcon: (size) => getSectorIcon("episodic", size) },
  { value: "semantic", label: "Semantic", getIcon: (size) => getSectorIcon("semantic", size) },
  {
    value: "procedural",
    label: "Procedural",
    getIcon: (size) => getSectorIcon("procedural", size),
  },
  { value: "emotional", label: "Emotional", getIcon: (size) => getSectorIcon("emotional", size) },
  {
    value: "reflective",
    label: "Reflective",
    getIcon: (size) => getSectorIcon("reflective", size),
  },
];

const EMPTY_MEMORY_ARRAY: Memory[] = [];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CompactMetadataProps {
  memory: Memory;
}

function CompactMetadata({ memory }: CompactMetadataProps): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <SectorBadge sector={memory.primarySector} size="sm" />
      <span className="px-2 py-0.5 rounded-full bg-ui-background/50 text-ui-text-secondary">
        Strength: {formatPercentage(memory.strength)}
      </span>
      <span className="px-2 py-0.5 rounded-full bg-ui-background/50 text-ui-text-secondary">
        Salience: {formatPercentage(memory.salience)}
      </span>
      <span className="px-2 py-0.5 rounded-full bg-ui-background/50 text-ui-text-muted">
        {formatDate(memory.createdAt)}
      </span>
      {(memory.metadata.tags ?? []).slice(0, 3).map((tag) => (
        <span
          key={tag}
          className="px-2 py-0.5 rounded-full bg-ui-accent-primary/10 border border-ui-accent-primary/30 text-ui-accent-primary"
        >
          {tag}
        </span>
      ))}
      {(memory.metadata.tags ?? []).length > 3 && (
        <span className="px-2 py-0.5 rounded-full bg-ui-border/30 text-ui-text-muted">
          +{(memory.metadata.tags ?? []).length - 3} more
        </span>
      )}
    </div>
  );
}

export function MemoryModal({
  isOpen,
  mode,
  memory,
  currentMemoryContext,
  onSave,
  onClose,
  onEdit,
  onCancelEdit,
  onDelete,
  onWikiLinkClick: _onWikiLinkClick,
  availableMemories = EMPTY_MEMORY_ARRAY,
  userId,
  sessionId,
  className = "",
  fullscreen = false,
}: MemoryModalProps): React.ReactElement | null {
  void _onWikiLinkClick;

  const [content, setContent] = useState(() => {
    if (memory && (mode === "view" || mode === "edit")) {
      return memory.content;
    }
    return "";
  });
  const [primarySector, setPrimarySector] = useState<MemorySectorType>(() => {
    if (memory && (mode === "view" || mode === "edit")) {
      return memory.primarySector;
    }
    return "semantic";
  });
  const [linkToCurrent, setLinkToCurrent] = useState(currentMemoryContext !== undefined);
  const [tags, setTags] = useState<string[]>(() => {
    if (memory && (mode === "view" || mode === "edit")) {
      return memory.metadata.tags ?? [];
    }
    return [];
  });
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (justOpened || (isOpen && memory)) {
      if (memory && (mode === "view" || mode === "edit")) {
        setContent(memory.content);
        setPrimarySector(memory.primarySector);
        setTags(memory.metadata.tags ?? []);
      } else if (mode === "create") {
        setContent("");
        setPrimarySector("semantic");
        setTags([]);
      }
      setLinkToCurrent(currentMemoryContext !== undefined && mode === "create");
      setError(null);
      setTagInput("");
      setShowDeleteConfirm(false);
      setLinkSearchQuery("");
    }
  }, [isOpen, mode, memory, currentMemoryContext]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag !== "" && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const linkedMemoryIds = useMemo(
    () => parseWikiLinks(content).map((link) => link.memoryId),
    [content]
  );

  const handleSave = useCallback(async () => {
    if (mode === "view") return;
    if (content.trim() === "") {
      setError("Please enter some content");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const client = getDefaultClient();
      if (mode === "edit" && memory) {
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
        setIsSaving(false);
        // Don't close modal after editing - user may want to continue editing
        return;
      }
      const storeResponse = await client.storeMemory({
        content: content.trim(),
        userId,
        sessionId,
        primarySector,
        ...(tags.length > 0 ? { metadata: { tags } } : {}),
      });
      let linkCreated = false;
      const currentMemoryId = currentMemoryContext?.id;
      if (linkToCurrent && currentMemoryId !== undefined && currentMemoryId !== "") {
        try {
          await createWaypointLink({
            sourceMemoryId: storeResponse.memoryId,
            targetMemoryId: currentMemoryId,
            userId,
            linkType: "semantic",
          });
          linkCreated = true;
        } catch (linkError) {
          console.warn("Failed to create waypoint link:", linkError);
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
    } catch (error) {
      console.error("Error saving memory:", error);
      setError(error instanceof Error ? error.message : "Failed to save memory");
    } finally {
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
      setError(err instanceof Error ? err.message : "Failed to delete memory");
      setIsDeleting(false);
    }
  }, [memory, userId, onDelete, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isSaving && !isDeleting) onClose();
    },
    [onClose, isSaving, isDeleting]
  );

  const handleCancelEdit = useCallback(() => {
    if (memory) {
      setContent(memory.content);
      setPrimarySector(memory.primarySector);
      setTags(memory.metadata.tags ?? []);
      setError(null);
      if (onCancelEdit) {
        onCancelEdit();
      } else {
        onClose();
      }
    }
  }, [memory, onCancelEdit, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        // In edit mode, Escape cancels edit and returns to view mode
        if (mode === "edit" && onCancelEdit) {
          handleCancelEdit();
        } else {
          onClose();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && mode !== "view") {
        e.preventDefault();
        if (content.trim() !== "") void handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, content, onClose, handleSave, mode, onCancelEdit, handleCancelEdit]);

  const handleSwitchToEdit = useCallback(() => {
    if (memory && isDemoMemoryId(memory.id)) {
      setError("Cannot edit demo memories. Demo data is read-only.");
      return;
    }
    onEdit?.();
  }, [memory, onEdit]);

  const handleLinkMemory = useCallback(
    (memoryId: string) => {
      const memoryToLink = availableMemories.find((m) => m.id === memoryId);
      if (!memoryToLink) return;
      const linkText = `[[${memoryToLink.id}|${memoryToLink.content.substring(0, 30)}...]]`;
      setContent((prev) => {
        const trimmed = prev.trimEnd();
        return trimmed + (trimmed.length > 0 ? " " : "") + linkText;
      });
    },
    [availableMemories]
  );

  const handleUnlinkMemory = useCallback((memoryId: string) => {
    setContent((prev) => {
      const pattern = new RegExp(`\\[\\[${memoryId}(\\|[^\\]]*)?\\]\\]`, "g");
      return prev.replace(pattern, "").replace(/\s+/g, " ").trim();
    });
  }, []);

  if (!isOpen) return null;

  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isCreateMode = mode === "create";
  const modalTitle = isCreateMode ? "Create Memory" : isEditMode ? "Edit Memory" : "Memory Details";
  const getModalIcon = (): React.ReactElement => {
    if (isCreateMode) return <Zap size={20} />;
    if (isEditMode) return <Edit size={20} />;
    return <MemoriesIcon size="lg" />;
  };

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
        className={`bg-ui-surface/98 backdrop-blur-xl border border-ui-accent-primary/30 rounded-xl shadow-glow box-border ${fullscreen ? "w-[95vw] h-[95vh]" : "w-[80vw] md:w-[80vw] max-md:w-[95vw] max-w-[calc(100vw-3rem)] min-w-[320px] max-h-[90vh]"} overflow-hidden animate-scale-in transition-all duration-300 ease-out flex flex-col ${className}`}
        style={{
          boxShadow: `0 0 40px var(--theme-primary-glow), 0 0 80px var(--theme-primary-subtle), inset 0 0 40px var(--theme-primary-bg)`,
          backdropFilter: "blur(24px) saturate(180%)",
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Streamlined Header - All controls in one row */}
        <div className="flex justify-between items-center p-3 border-b border-ui-border/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-ui-accent-primary" aria-hidden="true">
              {getModalIcon()}
            </span>
            <h2 id="memory-modal-title" className="text-base font-semibold text-ui-accent-primary">
              {modalTitle}
            </h2>
            {memory && <SectorBadge sector={memory.primarySector} size="sm" />}
          </div>
          <div className="flex items-center gap-2">
            {/* View mode: Edit button */}
            {isViewMode && onEdit && (
              <button
                onClick={handleSwitchToEdit}
                className="px-3 py-1.5 text-sm border border-ui-border/50 hover:border-ui-accent-primary/50 hover:bg-ui-accent-primary/10 rounded-lg transition-colors text-ui-text-secondary hover:text-ui-accent-primary flex items-center gap-1.5"
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
                Edit
              </button>
            )}
            {/* View/Edit mode: Delete button */}
            {(isViewMode || isEditMode) && onDelete && memory && (
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                }}
                className="px-3 py-1.5 text-sm border border-status-error/30 bg-status-error/10 hover:bg-status-error/20 rounded-lg transition-colors text-status-error flex items-center gap-1.5"
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
                Delete
              </button>
            )}
            {/* Create/Edit mode: Cancel button */}
            {(isCreateMode || isEditMode) && (
              <button
                onClick={isEditMode ? handleCancelEdit : onClose}
                disabled={isSaving}
                className="px-3 py-1.5 text-sm border border-ui-border/50 hover:border-ui-border hover:bg-ui-border/30 rounded-lg transition-colors text-ui-text-secondary disabled:opacity-50 flex items-center gap-1.5"
              >
                Cancel
              </button>
            )}
            {/* Create/Edit mode: Save/Create button */}
            {(isCreateMode || isEditMode) && (
              <button
                onClick={() => void handleSave()}
                disabled={isSaving || !content.trim()}
                className="px-3 py-1.5 text-sm bg-ui-accent-primary hover:bg-ui-accent-primary/90 rounded-lg transition-all text-white font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save
                  </>
                )}
              </button>
            )}
            {/* Close button - always rightmost, consistent style */}
            <button
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="p-2 border border-ui-border/50 hover:border-ui-border hover:bg-ui-border/30 rounded-lg transition-colors text-ui-text-secondary hover:text-ui-text-primary disabled:opacity-50"
              aria-label="Close"
              title="Close (Esc)"
            >
              <svg
                width="16"
                height="16"
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

        {/* Two-Column Content Area (60/40 split) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column - Content Area (60%) */}
          <div className="flex-1 md:w-[60%] min-h-0 flex flex-col p-4 overflow-hidden border-b md:border-b-0 md:border-r border-ui-border/30">
            {error !== null && error !== "" && (
              <div className="mb-3 p-2 bg-status-error/10 border border-status-error/30 rounded-lg text-status-error text-xs flex-shrink-0">
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
            {isViewMode && memory ? (
              <div className="flex-1 min-h-0 rounded-lg bg-ui-background/30 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                  <BlockNoteViewer content={memory.content} className="h-full" />
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div
                  className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-lg bg-ui-background/30 ${isSaving ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <BlockNoteEditor
                    key={memory?.id}
                    initialContent={content}
                    onChange={setContent}
                    placeholder="What's on your mind? Use '/' for formatting commands..."
                    readOnly={isSaving}
                    autoFocus={true}
                    className="h-full"
                  />
                </div>
                <p className="text-[10px] text-ui-text-muted mt-1 flex-shrink-0">
                  Press{" "}
                  <kbd className="px-1 py-0.5 bg-ui-background/50 rounded text-ui-text-secondary">
                    /
                  </kbd>{" "}
                  for formatting
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Memory Links (expanded) + Metadata (compact) */}
          <div className="md:w-[40%] min-h-0 flex flex-col p-4 overflow-hidden">
            {/* Compact Metadata Section */}
            <div className="flex-shrink-0 mb-3">
              {isViewMode && memory ? (
                <CompactMetadata memory={memory} />
              ) : (
                <div className="space-y-2">
                  {currentMemoryContext && isCreateMode && (
                    <div className="p-2 bg-ui-background/30 rounded-lg">
                      <p className="text-[10px] text-ui-text-muted mb-1">Context</p>
                      <p className="text-xs text-ui-text-secondary line-clamp-2">
                        {currentMemoryContext.content.substring(0, 80)}...
                      </p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {SECTOR_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPrimarySector(option.value);
                        }}
                        disabled={isSaving}
                        className={`px-2 py-1 text-[10px] rounded-lg border transition-all flex items-center gap-1 ${primarySector === option.value ? "border-ui-accent-primary/50 bg-ui-accent-primary/10 text-ui-accent-primary" : "border-ui-border/50 text-ui-text-secondary hover:border-ui-accent-primary/30"} disabled:opacity-50`}
                      >
                        <span aria-hidden="true">{option.getIcon("xs")}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {currentMemoryContext && isCreateMode && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={linkToCurrent}
                        onChange={(e) => {
                          setLinkToCurrent(e.target.checked);
                        }}
                        disabled={isSaving}
                        className="w-3 h-3 rounded border-ui-border bg-ui-background text-ui-accent-primary"
                      />
                      <span className="text-ui-text-secondary">Link to context</span>
                    </label>
                  )}
                  <div className="flex gap-1 items-center">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
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
                      disabled={isSaving || tagInput.trim() === ""}
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
                            onClick={() => {
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
            </div>
            {/* Memory Links - Takes remaining space */}
            <div className="flex-1 min-h-0 border-t border-ui-border/30 pt-3">
              <h3 className="text-xs font-medium text-ui-text-primary mb-2">Memory Links</h3>
              <MemoryLinksList
                {...(memory?.id !== undefined && memory.id !== ""
                  ? { currentMemoryId: memory.id }
                  : {})}
                linkedMemoryIds={linkedMemoryIds}
                availableMemories={availableMemories}
                searchQuery={linkSearchQuery}
                onSearchChange={setLinkSearchQuery}
                onLink={handleLinkMemory}
                onUnlink={handleUnlinkMemory}
                disabled={isViewMode || isSaving}
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Centered Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!isDeleting) setShowDeleteConfirm(false);
            }}
          />
          {/* Dialog */}
          <div className="relative bg-ui-surface border border-status-error/30 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              {/* Warning Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-status-error/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-status-error"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-base font-semibold text-ui-text-primary mb-1">Delete Memory</h3>
                <p className="text-sm text-ui-text-secondary mb-4">
                  Are you sure you want to delete this memory? This action cannot be undone.
                </p>
                {/* Actions */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                    }}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm bg-ui-border/30 hover:bg-ui-border/50 rounded-lg text-ui-text-secondary transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm bg-status-error hover:bg-status-error/80 rounded-lg text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoryModal;
