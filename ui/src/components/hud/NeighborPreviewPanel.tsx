/**
 * NeighborPreviewPanel Component
 *
 * HUD panel displaying preview information for a hovered neighbor node.
 * Shows content summary, sector type, salience, connection type, edge weight,
 * and relationship description.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { useCallback, useEffect, useState } from 'react';
import type { GraphEdge, GraphNode, LinkType, MemorySectorType } from '../../types/api';
import { truncateContent } from '../../utils/accessibility';
import { getRelationshipDescription } from '../../utils/preview';
import { getLinkTypeColor, getSectorColor } from '../../utils/visualization';

// ============================================================================
// Types
// ============================================================================

export interface NeighborPreviewPanelProps {
  /** The neighbor node to preview */
  neighbor: GraphNode | null;
  /** The edge connecting the neighbor to the current node */
  edge: GraphEdge | null;
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Position hint for the panel (screen coordinates) */
  positionHint?: { x: number; y: number };
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Animation duration in milliseconds */
const FADE_DURATION = 200;

/** Link type display names */
const LINK_TYPE_NAMES: Record<LinkType, string> = {
  semantic: 'Semantic',
  causal: 'Causal',
  temporal: 'Temporal',
  analogical: 'Analogical',
};

/** Sector type display names */
const SECTOR_NAMES: Record<MemorySectorType, string> = {
  episodic: 'Episodic',
  semantic: 'Semantic',
  procedural: 'Procedural',
  emotional: 'Emotional',
  reflective: 'Reflective',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a percentage value for display
 */
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

/**
 * Glassmorphism panel wrapper with semi-transparent background,
 * blur effect, and glowing gold borders (for preview/highlight).
 * Requirements: 23.5
 */
function GlassPanel({ children, className = '', style }: GlassPanelProps): React.ReactElement {
  // Check if we're in light mode by looking at the document's data-theme-mode attribute
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

/**
 * Single row of metadata display
 */
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
        className={`text-xs font-medium ${colorClass ?? 'text-ui-text-primary'}`}
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

/**
 * NeighborPreviewPanel - HUD panel for previewing neighbor node details
 *
 * Features:
 * - Content summary display
 * - Sector type with color indicator
 * - Salience score
 * - Connection type (link type) with color
 * - Edge weight
 * - Relationship description
 * - Fade in/out animations
 * - Positioning near hovered node
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */
export function NeighborPreviewPanel({
  neighbor,
  edge,
  isVisible,
  positionHint,
  className = '',
}: NeighborPreviewPanelProps): React.ReactElement | null {
  // Animation state for fade in/out
  const [opacity, setOpacity] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle visibility changes with fade animation
  // Requirements: 6.5
  useEffect(() => {
    if (isVisible && neighbor) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for transition
      requestAnimationFrame(() => {
        setOpacity(1);
      });
      return undefined;
    } else {
      setOpacity(0);
      // Wait for fade out animation before unmounting
      const timer = setTimeout((): void => {
        setShouldRender(false);
      }, FADE_DURATION);
      return (): void => {
        clearTimeout(timer);
      };
    }
  }, [isVisible, neighbor]);

  // Calculate panel position
  // Requirements: 6.4
  const calculatePosition = useCallback((): React.CSSProperties => {
    if (!positionHint) {
      return {
        position: 'absolute',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
      };
    }

    // Position panel near the hovered node, offset to avoid obscuring it
    const offsetX = 20;
    const offsetY = -10;

    // Determine if panel should be on left or right of cursor
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

  // Don't render if not visible and animation complete
  if (!shouldRender || !neighbor) {
    return null;
  }

  // Check if we're in light mode for color adjustments
  const isLightMode =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';

  const sectorColor = getSectorColor(neighbor.primarySector, false, isLightMode);
  const linkTypeColor = edge ? getLinkTypeColor(edge.linkType, isLightMode) : undefined;

  return (
    <GlassPanel
      className={`p-3 w-64 pointer-events-none ${className}`}
      style={{
        ...calculatePosition(),
        opacity,
        transition: `opacity ${String(FADE_DURATION)}ms ease-in-out`,
        zIndex: 1000,
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

      {/* Content Summary - Requirements: 6.1 */}
      <div className="mb-3">
        <p className="text-sm text-ui-text-primary leading-relaxed">
          {truncateContent(neighbor.content, 150)}
        </p>
      </div>

      {/* Metadata Section - Requirements: 6.2 */}
      <div className="space-y-0.5 border-t border-ui-border pt-2">
        <MetadataRow label="Salience" value={formatPercentage(neighbor.salience)} />
        <MetadataRow label="Strength" value={formatPercentage(neighbor.strength)} />
      </div>

      {/* Edge Information - Requirements: 6.3 */}
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
    </GlassPanel>
  );
}

export default NeighborPreviewPanel;
