/**
 * DeleteConfirmationDialog Component
 *
 * Confirmation dialog for deleting memories with soft delete via API.
 *
 * Requirements: 15.2
 */

import { useCallback, useState } from 'react';
import { getDefaultClient } from '../../api/client';

// ============================================================================
// Types
// ============================================================================

export interface DeleteConfirmationDialogProps {
  /** Memory ID to delete */
  memoryId: string;
  /** User ID for the delete request */
  userId: string;
  /** Memory content preview for confirmation */
  contentPreview: string;
  /** Callback when deletion is successful */
  onDeleted: (memoryId: string) => void;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DeleteConfirmationDialog - Confirmation dialog for memory deletion
 *
 * Features:
 * - Confirmation message with content preview
 * - Soft delete via REST API
 * - Loading state during deletion
 * - Error handling
 *
 * Requirements: 15.2
 */
export function DeleteConfirmationDialog({
  memoryId,
  userId,
  contentPreview,
  onDeleted,
  onClose,
  className = '',
}: DeleteConfirmationDialogProps): React.ReactElement {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const client = getDefaultClient();
      // Soft delete the memory
      await client.deleteMemory(memoryId, userId, true);
      onDeleted(memoryId);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete memory';
      setError(message);
      setIsDeleting(false);
    }
  }, [memoryId, userId, onDeleted, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isDeleting) {
        onClose();
      }
    },
    [onClose, isDeleting]
  );

  // Truncate content preview
  const truncatedPreview =
    contentPreview.length > 100 ? `${contentPreview.substring(0, 100)}...` : contentPreview;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div
        className={`
          bg-ui-surface
          backdrop-blur-glass
          border border-ui-border
          rounded-lg
          shadow-glow
          max-w-md w-full mx-4
          p-6
          ${className}
        `}
        style={{
          boxShadow: `
            0 0 30px rgba(255, 100, 100, 0.2),
            inset 0 0 40px rgba(255, 100, 100, 0.05)
          `,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-full">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-red-400"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 id="delete-dialog-title" className="text-lg font-semibold text-ui-text-primary">
            Delete Memory
          </h2>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-ui-text-secondary mb-3">
            Are you sure you want to delete this memory? This action can be undone.
          </p>
          <div className="p-3 bg-ui-background/50 rounded-lg border border-ui-border">
            <p className="text-sm text-ui-text-primary italic">&quot;{truncatedPreview}&quot;</p>
          </div>
        </div>

        {/* Error message - Using exact destructive color (Requirements: 32.3) */}
        {error !== null && error !== '' && (
          <div className="mb-4 p-3 bg-[rgba(231,76,60,0.15)] border border-[rgba(231,76,60,0.3)] rounded-lg">
            <p className="text-sm text-[#E74C3C]">{error}</p>
          </div>
        )}

        {/* Actions - Using exact colors per Requirements 32.3, 32.4 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="
              px-4 py-2 text-sm rounded-lg
              bg-transparent border border-[rgba(100,100,150,0.3)]
              text-white/70
              hover:bg-[rgba(100,100,150,0.15)] hover:text-white
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
          {/* Destructive button with red warning styling (Requirements: 32.3) */}
          <button
            onClick={() => {
              void handleDelete();
            }}
            disabled={isDeleting}
            className="
              px-4 py-2 text-sm rounded-lg
              bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.3)]
              text-[#E74C3C]
              hover:bg-[rgba(231,76,60,0.15)] hover:border-[rgba(231,76,60,0.5)] hover:shadow-[0_0_15px_rgba(231,76,60,0.3)]
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            {isDeleting ? (
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
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationDialog;
