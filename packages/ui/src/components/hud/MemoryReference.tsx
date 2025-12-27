/**
 * MemoryReference Component
 *
 * A clickable memory reference that can be used anywhere in the UI.
 * When clicked, opens the memory preview modal which allows viewing,
 * editing, and deleting the memory.
 */

import { useCallback, useState } from "react";
import type { Memory, MemorySectorType } from "../../types/api";
import { BookOpen, Calendar, Cog, Heart, Sparkles } from "../icons/Icons";
import { MemoryModal, type MemoryModalMode, type MemoryModalSaveResult } from "./MemoryModal";

// ============================================================================
// Types
// ============================================================================

export interface MemoryReferenceProps {
  /** The memory to reference */
  memory: Memory;
  /** Display variant */
  variant?: "inline" | "chip" | "card";
  /** Whether to show the sector icon */
  showIcon?: boolean;
  /** Maximum content length to display */
  maxLength?: number;
  /** Callback when memory is updated */
  onMemoryUpdated?: (memory: Memory) => void;
  /** Callback when memory is deleted */
  onMemoryDeleted?: (memoryId: string) => void;
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

// CSS classes for sector badges - uses CSS variables that adapt to theme
const SECTOR_BADGE_CLASSES: Record<MemorySectorType, string> = {
  episodic: "sector-badge-episodic",
  semantic: "sector-badge-semantic",
  procedural: "sector-badge-procedural",
  emotional: "sector-badge-emotional",
  reflective: "sector-badge-reflective",
};

const SECTOR_ICONS: Record<MemorySectorType, React.ReactElement> = {
  episodic: <Calendar size={14} />,
  semantic: <BookOpen size={14} />,
  procedural: <Cog size={14} />,
  emotional: <Heart size={14} />,
  reflective: <Sparkles size={14} />,
};

// ============================================================================
// Main Component
// ============================================================================

export function MemoryReference({
  memory,
  variant = "inline",
  showIcon = true,
  maxLength = 50,
  onMemoryUpdated,
  onMemoryDeleted,
  userId,
  sessionId,
  className = "",
}: MemoryReferenceProps): React.ReactElement {
  const [modalMode, setModalMode] = useState<MemoryModalMode | null>(null);

  const sectorBadgeClass = SECTOR_BADGE_CLASSES[memory.primarySector];
  const sectorIcon = SECTOR_ICONS[memory.primarySector];

  const truncatedContent =
    memory.content.length > maxLength
      ? memory.content.substring(0, maxLength - 3) + "..."
      : memory.content;

  const handleClick = useCallback(() => {
    setModalMode("view");
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalMode(null);
  }, []);

  const handleSwitchToEdit = useCallback(() => {
    setModalMode("edit");
  }, []);

  const handleSave = useCallback(
    (result: MemoryModalSaveResult) => {
      if (onMemoryUpdated) {
        onMemoryUpdated({
          ...memory,
          content: result.content,
          primarySector: result.primarySector,
        });
      }
      setModalMode(null);
    },
    [memory, onMemoryUpdated]
  );

  const handleDelete = useCallback(
    (memoryId: string) => {
      onMemoryDeleted?.(memoryId);
      setModalMode(null);
    },
    [onMemoryDeleted]
  );

  // Render based on variant
  if (variant === "chip") {
    return (
      <>
        <button
          onClick={handleClick}
          className={`
            inline-flex items-center gap-1.5 px-2 py-1 rounded-full
            text-xs font-medium transition-all duration-200
            hover:scale-105 active:scale-95
            ${sectorBadgeClass}
            ${className}
          `}
          title={memory.content}
        >
          {showIcon && <span aria-hidden="true">{sectorIcon}</span>}
          <span className="truncate max-w-[150px]">{truncatedContent}</span>
        </button>

        {modalMode && (
          <MemoryModal
            isOpen={true}
            mode={modalMode}
            memory={memory}
            onSave={handleSave}
            onClose={handleCloseModal}
            onEdit={handleSwitchToEdit}
            onDelete={handleDelete}
            userId={userId}
            sessionId={sessionId}
          />
        )}
      </>
    );
  }

  if (variant === "card") {
    return (
      <>
        <button
          onClick={handleClick}
          className={`
            w-full p-3 rounded-lg text-left
            transition-all duration-200
            hover:scale-[1.01] active:scale-[0.99]
            ${sectorBadgeClass}
            ${className}
          `}
        >
          <div className="flex items-start gap-2">
            {showIcon && (
              <div
                className={`
                  flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
                  ${sectorBadgeClass}
                `}
              >
                <span className="text-sm" aria-hidden="true">
                  {sectorIcon}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ui-text-primary line-clamp-2">{truncatedContent}</p>
              <p className="text-xs opacity-70 mt-1 capitalize">{memory.primarySector}</p>
            </div>
            <svg
              className="w-4 h-4 text-ui-text-muted flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {modalMode && (
          <MemoryModal
            isOpen={true}
            mode={modalMode}
            memory={memory}
            onSave={handleSave}
            onClose={handleCloseModal}
            onEdit={handleSwitchToEdit}
            onDelete={handleDelete}
            userId={userId}
            sessionId={sessionId}
          />
        )}
      </>
    );
  }

  // Default: inline variant
  return (
    <>
      <button
        onClick={handleClick}
        className={`
          inline-flex items-center gap-1 px-1.5 py-0.5 rounded
          text-sm transition-all duration-200
          hover:bg-ui-accent-primary/10
          ${sectorBadgeClass}
          ${className}
        `}
        title={memory.content}
      >
        {showIcon && (
          <span className="text-xs" aria-hidden="true">
            {sectorIcon}
          </span>
        )}
        <span className="underline decoration-dotted underline-offset-2">{truncatedContent}</span>
      </button>

      {modalMode && (
        <MemoryModal
          isOpen={true}
          mode={modalMode}
          memory={memory}
          onSave={handleSave}
          onClose={handleCloseModal}
          onEdit={handleSwitchToEdit}
          onDelete={handleDelete}
          userId={userId}
          sessionId={sessionId}
        />
      )}
    </>
  );
}

export default MemoryReference;
