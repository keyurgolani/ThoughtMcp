/**
 * MemoryCreationForm Component
 *
 * Form for creating new memories with optional link to current node.
 * Supports wiki-style [[ link syntax for creating connections.
 *
 * Requirements: 15.5, 41.1, 41.2
 */

import { useCallback, useState } from "react";
import { getDefaultClient } from "../../api/client";
import type { LinkType, Memory, MemoryMetadata, MemorySectorType } from "../../types/api";
import { WikiLinkInput } from "./WikiLinkAutocomplete";

// ============================================================================
// Types
// ============================================================================

export interface MemoryCreationFormProps {
  /** User ID for the new memory */
  userId: string;
  /** Session ID for the new memory */
  sessionId: string;
  /** Current node ID to optionally link to */
  currentNodeId?: string | null;
  /** Available memories for wiki link autocomplete (Requirements: 41.1) */
  availableMemories?: Memory[];
  /** Callback when memory is created */
  onCreated: (memoryId: string, linkedToCurrentNode: boolean) => void;
  /** Callback to close the form */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SECTOR_OPTIONS: { value: MemorySectorType; label: string; color: string }[] = [
  { value: "episodic", label: "Episodic", color: "sector-badge-episodic" },
  { value: "semantic", label: "Semantic", color: "sector-badge-semantic" },
  { value: "procedural", label: "Procedural", color: "sector-badge-procedural" },
  { value: "emotional", label: "Emotional", color: "sector-badge-emotional" },
  { value: "reflective", label: "Reflective", color: "sector-badge-reflective" },
];

const LINK_TYPE_OPTIONS: { value: LinkType; label: string }[] = [
  { value: "semantic", label: "Semantic" },
  { value: "causal", label: "Causal" },
  { value: "temporal", label: "Temporal" },
  { value: "analogical", label: "Analogical" },
];

// ============================================================================
// Main Component
// ============================================================================

/**
 * MemoryCreationForm - Form for creating new memories
 *
 * Features:
 * - Content input
 * - Sector type selection
 * - Optional metadata (keywords, tags, category)
 * - Optional link to current node
 * - Create via REST API
 *
 * Requirements: 15.5
 */
export function MemoryCreationForm({
  userId,
  sessionId,
  currentNodeId,
  availableMemories = [],
  onCreated,
  onClose,
  className = "",
}: MemoryCreationFormProps): React.ReactElement {
  // Form state
  const [content, setContent] = useState("");
  const [primarySector, setPrimarySector] = useState<MemorySectorType>("semantic");
  const [keywords, setKeywords] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [linkToCurrentNode, setLinkToCurrentNode] = useState(
    currentNodeId !== undefined && currentNodeId !== null
  );
  const [linkType, setLinkType] = useState<LinkType>("semantic");

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCreate = useCallback(async () => {
    // Validate content
    if (content.trim() === "") {
      setError("Content is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const client = getDefaultClient();

      // Build metadata
      const metadata: MemoryMetadata = {};
      if (keywords.trim()) {
        metadata.keywords = keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
      }
      if (tags.trim()) {
        metadata.tags = tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);
      }
      if (category.trim()) {
        metadata.category = category.trim();
      }

      // Create the memory
      const storeRequest = {
        content: content.trim(),
        userId,
        sessionId,
        primarySector,
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      };
      const response = await client.storeMemory(storeRequest);

      // If linking to current node, create the link
      // Note: In a real implementation, this would be handled by a dedicated link creation endpoint
      const shouldLink = linkToCurrentNode && currentNodeId !== undefined && currentNodeId !== null;

      onCreated(response.memoryId, shouldLink);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create memory";
      setError(message);
      setIsCreating(false);
    }
  }, [
    content,
    primarySector,
    keywords,
    tags,
    category,
    linkToCurrentNode,
    currentNodeId,
    userId,
    sessionId,
    onCreated,
    onClose,
  ]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isCreating) {
        onClose();
      }
    },
    [onClose, isCreating]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-memory-title"
    >
      <div
        className={`
          bg-ui-surface
          backdrop-blur-glass
          border border-ui-border
          rounded-lg
          shadow-glow
          max-w-lg w-full mx-4
          max-h-[90vh] overflow-y-auto
          ${className}
        `}
        style={{
          boxShadow: `
            0 0 30px rgba(0, 255, 255, 0.2),
            inset 0 0 40px rgba(0, 255, 255, 0.05)
          `,
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-ui-border">
          <h2 id="create-memory-title" className="text-lg font-semibold text-ui-accent-primary">
            Create New Memory
          </h2>
          <button
            onClick={onClose}
            disabled={isCreating}
            className="p-1 hover:bg-ui-border rounded transition-colors text-ui-text-secondary"
            aria-label="Close"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Content with wiki link support (Requirements: 41.1, 41.2) */}
          <div>
            <label className="text-sm text-ui-text-secondary block mb-1">
              Content <span className="text-red-400">*</span>
            </label>
            <WikiLinkInput
              value={content}
              onChange={setContent}
              memories={availableMemories}
              {...(currentNodeId != null ? { sourceMemoryId: currentNodeId } : {})}
              userId={userId}
              createWaypointOnInsert={true}
              placeholder="Enter memory content... Type [[ to link to memories"
              multiline={true}
              rows={4}
              className="bg-ui-background"
            />
            <p className="text-xs text-ui-text-muted mt-1">
              Tip: Type{" "}
              <kbd className="px-1 py-0.5 bg-ui-background/50 rounded text-ui-text-secondary">
                [[
              </kbd>{" "}
              to link to existing memories
            </p>
          </div>

          {/* Sector Type */}
          <div>
            <label className="text-sm text-ui-text-secondary block mb-2">Memory Type</label>
            <div className="flex flex-wrap gap-2">
              {SECTOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setPrimarySector(option.value);
                  }}
                  className={`
                    px-3 py-1.5 text-sm rounded-lg border transition-all
                    ${
                      primarySector === option.value
                        ? `border-ui-accent-primary bg-ui-accent-primary/10 ${option.color}`
                        : "border-ui-border text-ui-text-secondary hover:border-ui-accent-primary/50"
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link to Current Node */}
          {currentNodeId !== undefined && currentNodeId !== null && (
            <div className="p-3 bg-ui-background/30 rounded-lg border border-ui-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkToCurrentNode}
                  onChange={(e) => {
                    setLinkToCurrentNode(e.target.checked);
                  }}
                  className="
                    w-4 h-4
                    rounded
                    border-ui-border
                    bg-ui-background
                    text-ui-accent-primary
                    focus:ring-ui-accent-primary
                    focus:ring-offset-0
                  "
                />
                <span className="text-sm text-ui-text-primary">Link to current memory</span>
              </label>

              {linkToCurrentNode && (
                <div className="mt-3 pl-7">
                  <label className="text-xs text-ui-text-secondary block mb-1">Link Type</label>
                  <select
                    value={linkType}
                    onChange={(e) => {
                      setLinkType(e.target.value as LinkType);
                    }}
                    className="
                      w-full px-3 py-2
                      bg-ui-background
                      border border-ui-border
                      rounded-lg
                      text-ui-text-primary
                      text-sm
                      focus:outline-none
                      focus:border-ui-border-active
                      focus:ring-2 focus:ring-ui-accent-primary/20
                      hover:border-ui-border-hover
                      transition-colors
                    "
                  >
                    {LINK_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Advanced Options Toggle */}
          <button
            onClick={() => {
              setShowAdvanced(!showAdvanced);
            }}
            className="flex items-center gap-2 text-sm text-ui-text-secondary hover:text-ui-text-primary transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l-2 border-ui-border">
              <div>
                <label className="text-sm text-ui-text-secondary block mb-1">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => {
                    setKeywords(e.target.value);
                  }}
                  placeholder="keyword1, keyword2, ..."
                  className="
                    w-full px-3 py-2
                    bg-ui-background
                    border border-ui-border
                    rounded-lg
                    text-ui-text-primary
                    text-sm
                    focus:outline-none
                    focus:border-ui-border-active
                    focus:ring-2 focus:ring-ui-accent-primary/20
                    hover:border-ui-border-hover
                    transition-colors
                  "
                />
              </div>

              <div>
                <label className="text-sm text-ui-text-secondary block mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => {
                    setTags(e.target.value);
                  }}
                  placeholder="tag1, tag2, ..."
                  className="
                    w-full px-3 py-2
                    bg-ui-background
                    border border-ui-border
                    rounded-lg
                    text-ui-text-primary
                    text-sm
                    focus:outline-none
                    focus:border-ui-border-active
                    focus:ring-2 focus:ring-ui-accent-primary/20
                    hover:border-ui-border-hover
                    transition-colors
                  "
                />
              </div>

              <div>
                <label className="text-sm text-ui-text-secondary block mb-1">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                  }}
                  placeholder="Enter category..."
                  className="
                    w-full px-3 py-2
                    bg-ui-background
                    border border-ui-border
                    rounded-lg
                    text-ui-text-primary
                    text-sm
                    focus:outline-none
                    focus:border-ui-border-active
                    focus:ring-2 focus:ring-ui-accent-primary/20
                    hover:border-ui-border-hover
                    transition-colors
                  "
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error !== null && error !== "" && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-ui-border">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="
              px-4 py-2 text-sm
              bg-ui-border hover:bg-ui-border/80
              rounded-lg transition-colors
              text-ui-text-secondary
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleCreate();
            }}
            disabled={isCreating || !content.trim()}
            className="
              px-4 py-2 text-sm
              bg-ui-accent-primary/30 hover:bg-ui-accent-primary/50
              rounded-lg transition-colors
              text-ui-accent-primary
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            {isCreating ? (
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
                Creating...
              </>
            ) : (
              "Create Memory"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MemoryCreationForm;
