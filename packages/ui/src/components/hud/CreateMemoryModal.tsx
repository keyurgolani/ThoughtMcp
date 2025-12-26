/**
 * CreateMemoryModal Component
 *
 * Wrapper around MemoryModal for creating new memories.
 * Uses the unified MemoryModal component in 'create' mode.
 *
 * Requirements: 44.1, 44.2, 44.3, 44.4, 44.5, 44.6
 */

import { useCallback } from 'react';
import type { Memory, MemorySectorType } from '../../types/api';
import { MemoryModal, type MemoryModalSaveResult } from './MemoryModal';

// ============================================================================
// Types
// ============================================================================

/**
 * Result data returned when a memory is successfully saved
 * Used for animating the new node in the 3D view (Requirement 44.6)
 */
export interface CreateMemorySaveResult {
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

export interface CreateMemoryModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Current memory context for auto-linking (Requirement 44.2) */
  currentMemoryContext?: Memory;
  /** Callback when memory is saved (Requirement 44.5, 44.6) */
  onSave: (result: CreateMemorySaveResult) => void;
  /** Callback to close the modal */
  onClose: () => void;
  /** All available memories for wiki link autocomplete (Requirement 44.3) */
  availableMemories?: Memory[];
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
  /** Additional CSS classes */
  className?: string;
}

// Stable empty array to avoid re-renders
const EMPTY_MEMORY_ARRAY: Memory[] = [];

// ============================================================================
// Main Component
// ============================================================================

/**
 * CreateMemoryModal - Memory creation modal using unified MemoryModal
 *
 * Features:
 * - Uses unified MemoryModal in 'create' mode
 * - Same layout as view/edit memory modals
 * - Supports current memory context for linking
 * - Wiki-link autocomplete support
 *
 * Requirements: 44.1, 44.2, 44.4, 44.5, 44.6
 */
export function CreateMemoryModal({
  isOpen,
  currentMemoryContext,
  onSave,
  onClose,
  availableMemories = EMPTY_MEMORY_ARRAY,
  userId,
  sessionId,
  className = '',
}: CreateMemoryModalProps): React.ReactElement | null {
  // Handle save from MemoryModal
  const handleSave = useCallback(
    (result: MemoryModalSaveResult) => {
      const saveResult: CreateMemorySaveResult = {
        memoryId: result.memoryId,
        content: result.content,
        primarySector: result.primarySector,
        linkedToCurrent: result.linkedToCurrent,
        linkedToNodeId: result.linkedToNodeId,
        salience: result.salience,
        strength: result.strength,
      };
      onSave(saveResult);
    },
    [onSave]
  );

  return (
    <MemoryModal
      isOpen={isOpen}
      mode="create"
      {...(currentMemoryContext ? { currentMemoryContext } : {})}
      onSave={handleSave}
      onClose={onClose}
      availableMemories={availableMemories}
      userId={userId}
      sessionId={sessionId}
      className={className}
    />
  );
}

export default CreateMemoryModal;
