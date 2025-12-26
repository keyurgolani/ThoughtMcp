/**
 * NeighborPreviewPanel Component
 *
 * HUD panel displaying preview information for a hovered neighbor node.
 * Shows content summary, sector type, salience, connection type, edge weight,
 * and relationship description.
 * Now includes a clickable "View Details" button to open the full memory modal.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { useCallback, useEffect, useState } from 'react';
import type { GraphEdge, GraphNode, LinkType, Memory, MemorySectorType } from '../../types/api';
import { truncateContent } from '../../utils/accessibility';
import { getRelationshipDescription } from '../../utils/preview';
import { getLinkTypeColor, getSectorColor } from '../../utils/visualization';
import { MemoryModal, type MemoryModalMode, type MemoryModalSaveResult } from './MemoryModal';

// ============================================================================
// Types
// ============================================================================

export interface NeighborPreviewPanelProps {
  neighbor: GraphNode | null;
  edge: GraphEdge | null;
  isVisible: boolean;
  positionHint?: { x: number; y: number };
  onMemoryUpdated?: (memory: Memory) => void;
  onMemoryDeleted?: (memoryId: string) => void;
  /** All available memories for WikiLink navigation */
  availableMemories?: Memory[];
  /** Callback when a linked memory is clicked */
  onLinkedMemoryClick?: (memoryId: string) => void;
  /** User ID for API calls - required for memory operations */
  userId: string;
  /** Session ID for API calls - required for memory operations */
  sessionId: string;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const FADE_DURATION = 200;

const LINK_TYPE_NAMES: Record<LinkType, string> = {
  semantic: 'Semantic',
  causal: 'Causal',
  temporal: 'Temporal',
  analogical: 'Analogical',
};

const SECTOR_NAMES: Record<MemorySectorType, string> = {
  episodic: 'Episodic',
  semantic: 'Semantic',
  procedural: 'Procedural',
  emotional: 'Emotional',
  reflective: 'Reflective',
};

function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function GlassPanel({ children, className = '', style }: GlassPanelProps): React.ReactElement {
  const isLightMode =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';

  return (
    <div
      className={`rounded-xl neighbor-preview-panel ${className}`}
      style={{
        background: isLightMode ? 'rgba(255, 255, 255, 0.98)' : 'var(--theme-surface-overlay)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: isLightMode ? '1px solid rgba(0, 0, 0, 0.15)' : '1px solid var(--theme-border)',
        boxShadow: isLightMode
          ? '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)'
          : '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px var(--theme-border)',
        color: isLightMode ? 'var(--theme-text-primary)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface MetadataRowProps {
  label: string;
  value: string;
  colorClass?: string;
  colorStyle?: string | undefined;
}

function MetadataRow({
  label,
  value,
  colorClass,
  colorStyle,
}: MetadataRowProps): React.ReactElement {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-ui-text-secondary text-xs">{label}</span>
      <span
        className={`text-xs font-medium ${colorClass !== undefined && colorClass !== '' ? colorClass : 'text-ui-text-primary'}`}
        style={colorStyle !== undefined && colorStyle !== '' ? { color: colorStyle } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function NeighborPreviewPanel({
  neighbor,
  edge,
  isVisible,
  positionHint,
  onMemoryUpdated,
  onMemoryDeleted,
  availableMemories = [],
  onLinkedMemoryClick,
  userId,
  sessionId,
  className = '',
}: NeighborPreviewPanelProps): React.ReactElement | null {
  const [opacity, setOpacity] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);
  const [modalMode, setModalMode] = useState<MemoryModalMode | null>(null);

  useEffect(() => {
    if (isVisible && neighbor) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        setOpacity(1);
      });
      return undefined;
    } else {
      setOpacity(0);
      const timer = setTimeout((): void => {
        setShouldRender(false);
      }, FADE_DURATION);
      return (): void => {
        clearTimeout(timer);
      };
    }
  }, [isVisible, neighbor]);

  const calculatePosition = useCallback((): React.CSSProperties => {
    if (!positionHint) {
      return { position: 'absolute', top: '50%', right: '20px', transform: 'translateY(-50%)' };
    }
    const offsetX = 20;
    const offsetY = -10;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const panelWidth = 280;
    const isRightSide = positionHint.x > viewportWidth / 2;

    return {
      position: 'fixed',
      top: `${String(Math.max(10, positionHint.y + offsetY))}px`,
      left: isRightSide ? undefined : `${String(positionHint.x + offsetX)}px`,
      right: isRightSide ? `${String(viewportWidth - positionHint.x + offsetX)}px` : undefined,
      maxWidth: `${String(panelWidth)}px`,
    };
  }, [positionHint]);

  const handleViewDetails = useCallback(() => {
    setModalMode('view');
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalMode(null);
  }, []);

  const handleSwitchToEdit = useCallback(() => {
    setModalMode('edit');
  }, []);

  const handleSave = useCallback(
    (result: MemoryModalSaveResult) => {
      if (neighbor && onMemoryUpdated) {
        const updatedMemory: Memory = {
          id: neighbor.id,
          userId: userId,
          sessionId: sessionId,
          content: result.content,
          primarySector: result.primarySector,
          salience: result.salience,
          strength: result.strength,
          createdAt: neighbor.createdAt,
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          metadata: neighbor.metadata,
        };
        onMemoryUpdated(updatedMemory);
      }
      setModalMode(null);
    },
    [neighbor, onMemoryUpdated, userId, sessionId]
  );

  const handleDelete = useCallback(
    (memoryId: string) => {
      onMemoryDeleted?.(memoryId);
      setModalMode(null);
    },
    [onMemoryDeleted]
  );

  // Handle wiki link click - open the linked memory
  const handleWikiLinkClick = useCallback(
    (memoryId: string) => {
      // If we have a callback, use it (allows parent to handle navigation)
      if (onLinkedMemoryClick) {
        onLinkedMemoryClick(memoryId);
        return;
      }
      // Otherwise, find the memory and open it in the modal
      const linkedMemory = availableMemories.find((m) => m.id === memoryId);
      if (linkedMemory) {
        // Close current modal and open the linked memory
        // Note: This is a simple approach - parent component can provide
        // onLinkedMemoryClick for more sophisticated navigation
        setModalMode(null);
        // Small delay to allow modal to close before opening new one
        setTimeout(() => {
          onMemoryUpdated?.({
            ...linkedMemory,
            lastAccessed: new Date().toISOString(),
          });
        }, 100);
      }
    },
    [availableMemories, onLinkedMemoryClick, onMemoryUpdated]
  );

  if (!shouldRender || !neighbor) return null;

  const isLightMode =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';
  const sectorColor = getSectorColor(neighbor.primarySector, false, isLightMode);
  const linkTypeColor = edge ? getLinkTypeColor(edge.linkType, isLightMode) : undefined;

  // Convert GraphNode to Memory for the modal
  const memoryForModal: Memory = {
    id: neighbor.id,
    userId: userId,
    sessionId: sessionId,
    content: neighbor.content,
    primarySector: neighbor.primarySector,
    salience: neighbor.salience,
    strength: neighbor.strength,
    createdAt: neighbor.createdAt,
    lastAccessed: neighbor.createdAt,
    accessCount: 0,
    metadata: neighbor.metadata,
  };

  return (
    <>
      <GlassPanel
        className={`p-3 w-64 ${className}`}
        style={{
          ...calculatePosition(),
          opacity,
          transition: `opacity ${String(FADE_DURATION)}ms ease-in-out`,
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
      >
        {/* Sector Type Header */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: sectorColor }}
            aria-hidden="true"
          />
          <span
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: sectorColor }}
          >
            {SECTOR_NAMES[neighbor.primarySector]}
          </span>
        </div>

        {/* Content Summary */}
        <div className="mb-3">
          <p className="text-sm text-ui-text-primary leading-relaxed">
            {truncateContent(neighbor.content, 150)}
          </p>
        </div>

        {/* Metadata Section */}
        <div className="space-y-0.5 border-t border-ui-border pt-2">
          <MetadataRow label="Salience" value={formatPercentage(neighbor.salience)} />
          <MetadataRow label="Strength" value={formatPercentage(neighbor.strength)} />
        </div>

        {/* Edge Information */}
        {edge && (
          <div className="mt-2 pt-2 border-t border-ui-border space-y-0.5">
            <MetadataRow
              label="Connection"
              value={LINK_TYPE_NAMES[edge.linkType]}
              colorStyle={linkTypeColor}
            />
            <MetadataRow label="Weight" value={formatPercentage(edge.weight)} />
            <div className="mt-1">
              <p className="text-xs text-ui-text-muted italic">
                {getRelationshipDescription(edge.linkType)}
              </p>
            </div>
          </div>
        )}

        {/* View Details Button */}
        <button
          onClick={handleViewDetails}
          className="mt-3 w-full px-3 py-1.5 text-xs font-medium rounded-lg border border-ui-accent-primary/30 bg-ui-accent-primary/10 text-ui-accent-primary hover:bg-ui-accent-primary/20 transition-colors"
        >
          View Details
        </button>
      </GlassPanel>

      {/* Memory Modal */}
      {modalMode && (
        <MemoryModal
          isOpen={true}
          mode={modalMode}
          memory={memoryForModal}
          onSave={handleSave}
          onClose={handleCloseModal}
          onEdit={handleSwitchToEdit}
          onDelete={handleDelete}
          onWikiLinkClick={handleWikiLinkClick}
          availableMemories={availableMemories}
          userId={userId}
          sessionId={sessionId}
        />
      )}
    </>
  );
}

export default NeighborPreviewPanel;
