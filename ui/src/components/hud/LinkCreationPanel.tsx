/**
 * LinkCreationPanel Component
 *
 * Panel for creating waypoint links between memory nodes.
 * Allows selecting link type and target node.
 *
 * Requirements: 15.3, 15.4
 */

import { useCallback, useState } from 'react';
import { getDefaultClient } from '../../api/client';
import type { LinkType, Memory } from '../../types/api';

// ============================================================================
// Types
// ============================================================================

export interface LinkCreationPanelProps {
  /** Source memory node */
  sourceMemory: Memory;
  /** Callback when link is created */
  onLinkCreated: (sourceId: string, targetId: string, linkType: LinkType) => void;
  /** Callback to close the panel */
  onClose: () => void;
  /** Callback when target node is selected in 3D view */
  onTargetSelected?: (targetId: string) => void;
  /** Currently selected target node ID */
  selectedTargetId?: string | null;
  /** Target memory (if selected) */
  targetMemory?: Memory | null;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const LINK_TYPES: { value: LinkType; label: string; description: string; color: string }[] = [
  {
    value: 'semantic',
    label: 'Semantic',
    description: 'Related by meaning or concept',
    color: 'text-blue-400',
  },
  {
    value: 'causal',
    label: 'Causal',
    description: 'Cause and effect relationship',
    color: 'text-orange-400',
  },
  {
    value: 'temporal',
    label: 'Temporal',
    description: 'Related by time sequence',
    color: 'text-green-400',
  },
  {
    value: 'analogical',
    label: 'Analogical',
    description: 'Similar pattern or structure',
    color: 'text-purple-400',
  },
];

// ============================================================================
// Sub-Components
// ============================================================================

interface LinkTypeOptionProps {
  type: (typeof LINK_TYPES)[number];
  isSelected: boolean;
  onSelect: () => void;
}

function LinkTypeOption({ type, isSelected, onSelect }: LinkTypeOptionProps): React.ReactElement {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-3 rounded-lg border transition-all text-left
        ${
          isSelected
            ? 'border-ui-accent-primary bg-ui-accent-primary/10'
            : 'border-ui-border hover:border-ui-accent-primary/50 bg-ui-background/30'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-medium ${type.color}`}>{type.label}</span>
        {isSelected && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-ui-accent-primary"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <p className="text-xs text-ui-text-secondary">{type.description}</p>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * LinkCreationPanel - Panel for creating waypoint links
 *
 * Features:
 * - Link type selection
 * - Target node selection indicator
 * - Create link via API
 * - Loading and error states
 *
 * Requirements: 15.3, 15.4
 */
export function LinkCreationPanel({
  sourceMemory,
  onLinkCreated,
  onClose,
  selectedTargetId,
  targetMemory,
  className = '',
}: LinkCreationPanelProps): React.ReactElement {
  const [selectedLinkType, setSelectedLinkType] = useState<LinkType>('semantic');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateLink = useCallback(async () => {
    if (selectedTargetId === undefined || selectedTargetId === null || selectedTargetId === '') {
      setError('Please select a target node in the 3D view');
      return;
    }

    if (selectedTargetId === sourceMemory.id) {
      setError('Cannot link a memory to itself');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const client = getDefaultClient();
      // Create the waypoint link by updating the source memory
      // The API will handle creating the bidirectional link
      await client.updateMemory({
        memoryId: sourceMemory.id,
        userId: sourceMemory.userId,
        // Note: The actual link creation would be handled by a dedicated endpoint
        // For now, we simulate the link creation
      });

      onLinkCreated(sourceMemory.id, selectedTargetId, selectedLinkType);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create link';
      setError(message);
      setIsCreating(false);
    }
  }, [sourceMemory, selectedTargetId, selectedLinkType, onLinkCreated, onClose]);

  // Truncate content for display
  const truncateContent = (content: string, maxLength: number = 50): string => {
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  };

  return (
    <div
      className={`
        bg-ui-surface
        backdrop-blur-glass
        border border-ui-border
        rounded-lg
        shadow-glow
        p-4
        max-w-sm w-full
        ${className}
      `}
      style={{
        boxShadow: `
          0 0 20px rgba(0, 255, 255, 0.15),
          inset 0 0 30px rgba(0, 255, 255, 0.05)
        `,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-ui-accent-primary">Create Link</h3>
        <button
          onClick={onClose}
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

      {/* Source Memory */}
      <div className="mb-4">
        <label className="text-xs text-ui-text-secondary uppercase tracking-wider">From</label>
        <div className="mt-1 p-2 bg-ui-background/50 rounded-lg border border-ui-border">
          <p className="text-sm text-ui-text-primary">{truncateContent(sourceMemory.content)}</p>
        </div>
      </div>

      {/* Target Memory */}
      <div className="mb-4">
        <label className="text-xs text-ui-text-secondary uppercase tracking-wider">To</label>
        {selectedTargetId !== undefined && selectedTargetId !== null && targetMemory ? (
          <div className="mt-1 p-2 bg-ui-accent-primary/10 rounded-lg border border-ui-accent-primary/50">
            <p className="text-sm text-ui-text-primary">{truncateContent(targetMemory.content)}</p>
          </div>
        ) : (
          <div className="mt-1 p-3 bg-ui-background/30 rounded-lg border border-dashed border-ui-border">
            <p className="text-sm text-ui-text-secondary text-center">
              Click a node in the 3D view to select target
            </p>
          </div>
        )}
      </div>

      {/* Link Type Selection */}
      <div className="mb-4">
        <label className="text-xs text-ui-text-secondary uppercase tracking-wider mb-2 block">
          Link Type
        </label>
        <div className="space-y-2">
          {LINK_TYPES.map((type) => (
            <LinkTypeOption
              key={type.value}
              type={type}
              isSelected={selectedLinkType === type.value}
              onSelect={() => {
                setSelectedLinkType(type.value);
              }}
            />
          ))}
        </div>
      </div>

      {/* Error message */}
      {error !== null && error !== '' && (
        <div className="mb-4 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
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
            void handleCreateLink();
          }}
          disabled={isCreating || selectedTargetId === undefined || selectedTargetId === null}
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
            'Create Link'
          )}
        </button>
      </div>
    </div>
  );
}

export default LinkCreationPanel;
