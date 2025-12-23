/**
 * MemoryPreviewModal Component
 *
 * Global memory preview modal that can be opened from any page.
 * Uses the existing MemoryModal component in view/edit mode.
 * State is managed through the uiStore for global access.
 */

import { useCallback } from 'react';
import { isDemoMemoryId } from '../../api/client';
import { useMemoryStore } from '../../stores/memoryStore';
import { useUIStore } from '../../stores/uiStore';
import type { Memory } from '../../types/api';
import { MemoryModal, type MemoryModalSaveResult } from './MemoryModal';

export interface MemoryPreviewModalProps {
  /** All available memories for WikiLink autocomplete */
  availableMemories?: Memory[];
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
}

/**
 * Global memory preview modal component.
 * Renders the MemoryModal based on uiStore state.
 * Should be placed in the root App component to be available on all pages.
 */
export function MemoryPreviewModal({
  availableMemories = [],
  userId,
  sessionId,
}: MemoryPreviewModalProps): React.ReactElement | null {
  // Get state from uiStore
  const memoryPreview = useUIStore((state) => state.memoryPreview);
  const closeMemoryPreview = useUIStore((state) => state.closeMemoryPreview);
  const switchToEditMode = useUIStore((state) => state.switchToEditMode);
  const updatePreviewedMemory = useUIStore((state) => state.updatePreviewedMemory);
  const openMemoryPreview = useUIStore((state) => state.openMemoryPreview);

  // Get memory store actions for updates
  const storeUpdateMemory = useMemoryStore((state) => state.updateMemory);
  const storeRemoveMemory = useMemoryStore((state) => state.removeMemory);

  // Handle save (for edit mode)
  const handleSave = useCallback(
    (result: MemoryModalSaveResult) => {
      // Update the memory in the store
      storeUpdateMemory(result.memoryId, {
        content: result.content,
        primarySector: result.primarySector,
      });

      // Update the previewed memory state
      updatePreviewedMemory({
        content: result.content,
        primarySector: result.primarySector,
      });

      // Close the modal
      closeMemoryPreview();
    },
    [storeUpdateMemory, updatePreviewedMemory, closeMemoryPreview]
  );

  // Handle edit button click
  const handleEdit = useCallback(() => {
    if (memoryPreview.memory && isDemoMemoryId(memoryPreview.memory.id)) {
      // Demo memories can't be edited - the MemoryModal handles this internally
      return;
    }
    switchToEditMode();
  }, [memoryPreview.memory, switchToEditMode]);

  // Handle delete
  const handleDelete = useCallback(
    (memoryId: string) => {
      storeRemoveMemory(memoryId);
      closeMemoryPreview();
    },
    [storeRemoveMemory, closeMemoryPreview]
  );

  // Handle wiki link click - open the linked memory in the preview modal
  const handleWikiLinkClick = useCallback(
    (memoryId: string) => {
      // Find the memory from available memories
      const linkedMemory = availableMemories.find((m) => m.id === memoryId);
      if (linkedMemory) {
        // Open the linked memory in the preview modal
        openMemoryPreview(linkedMemory);
      }
    },
    [availableMemories, openMemoryPreview]
  );

  // Don't render if not open
  if (!memoryPreview.isOpen || !memoryPreview.memory) {
    return null;
  }

  return (
    <MemoryModal
      isOpen={memoryPreview.isOpen}
      mode={memoryPreview.mode}
      memory={memoryPreview.memory}
      onSave={handleSave}
      onClose={closeMemoryPreview}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onWikiLinkClick={handleWikiLinkClick}
      availableMemories={availableMemories}
      userId={userId}
      sessionId={sessionId}
    />
  );
}

export default MemoryPreviewModal;
