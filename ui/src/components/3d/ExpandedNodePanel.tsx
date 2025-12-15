/**
 * ExpandedNodePanel Component
 *
 * In-place panel that replaces a memory node when clicked, displaying
 * memory content, metadata, and key attributes within the 3D space.
 * Uses Html from @react-three/drei to render 2D content in 3D space.
 *
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 40.2
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Memory } from '../../types/api';
import { getSectorColor } from '../../utils/visualization';
import { ContentRenderer } from '../hud/ContentRenderer';
import { type LinkedKeyword } from '../hud/KeywordHighlighter';
import type { CognitiveAction } from '../hud/MemoryDetailPanel';

// ============================================================================
// Types
// ============================================================================

export interface ExpandedNodePanelProps {
  /** The memory to display */
  memory: Memory;
  /** 3D position of the panel */
  position: [number, number, number];
  /** Whether the panel is expanded (visible) */
  isExpanded: boolean;
  /** Animation progress (0-1) for expansion animation */
  animationProgress?: number | undefined;
  /** Callback when close button is clicked */
  onClose: () => void;
  /** Callback when edit is requested */
  onEdit?: (() => void) | undefined;
  /** Callback when a cognitive action is triggered */
  onCognitiveAction?: ((action: CognitiveAction) => void) | undefined;
  /** Whether to use high contrast colors */
  highContrast?: boolean | undefined;
  /** Linked keywords in the memory content for highlighting (Requirements: 40.1, 40.2) */
  linkedKeywords?: LinkedKeyword[] | undefined;
  /** Callback when a keyword is clicked to navigate to connected memory (Requirements: 40.2) */
  onKeywordClick?: ((memoryId: string) => void) | undefined;
  /** Map of memory IDs to memory previews for hover tooltip (Requirements: 40.3) */
  memoryPreviews?: Map<string, import('../hud/KeywordHoverPreview').MemoryPreview> | undefined;
}

// ============================================================================
// Constants
// ============================================================================

/** Panel dimensions */
const PANEL_WIDTH = 320;
const PANEL_MIN_HEIGHT = 200;
const PANEL_MAX_HEIGHT = 400;

/** Animation duration in seconds */
const ANIMATION_DURATION = 0.3;

/** Date format options */
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, DATE_FORMAT_OPTIONS);
  } catch {
    return dateString;
  }
}

/**
 * Format a sector type for display
 */
function formatSectorType(sector: string): string {
  return sector.charAt(0).toUpperCase() + sector.slice(1);
}

/**
 * Format a number as percentage
 */
function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Truncate content for preview
 */
function truncateContent(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetadataRowProps {
  label: string;
  value: string | number;
  colorClass?: string;
}

/**
 * Single row of metadata display
 */
function MetadataRow({ label, value, colorClass }: MetadataRowProps): React.ReactElement {
  const displayValue = typeof value === 'number' ? String(value) : value;
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-ui-text-muted text-xs">{label}</span>
      <span className={`text-xs font-medium ${colorClass ?? 'text-ui-text-primary'}`}>
        {displayValue}
      </span>
    </div>
  );
}

interface TagListProps {
  tags: string[];
  label: string;
}

/**
 * Display a list of tags/keywords
 */
function TagList({ tags, label }: TagListProps): React.ReactElement | null {
  if (tags.length === 0) return null;

  return (
    <div className="mt-1">
      <span className="text-ui-text-muted text-xs">{label}: </span>
      <div className="flex flex-wrap gap-1 mt-0.5">
        {tags.slice(0, 5).map((tag, index) => (
          <span
            key={`${tag}-${String(index)}`}
            className="px-1.5 py-0.5 text-xs bg-ui-border/30 rounded text-ui-text-secondary"
          >
            {tag}
          </span>
        ))}
        {tags.length > 5 && (
          <span className="text-xs text-ui-text-muted">+{tags.length - 5} more</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ExpandedNodePanel - In-place panel that replaces a node when clicked
 *
 * Features:
 * - Displays memory content, metadata, and key attributes
 * - Maintains 3D position while showing 2D content
 * - Close button to collapse back to node form
 * - Glassmorphism styling consistent with UI design
 *
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5
 */
export function ExpandedNodePanel({
  memory,
  position,
  isExpanded,
  // animationProgress is available for future use but currently animation is handled internally
  animationProgress: _animationProgress = 1,
  onClose,
  onEdit,
  onCognitiveAction,
  highContrast = false,
  linkedKeywords = [],
  onKeywordClick,
  memoryPreviews,
}: ExpandedNodePanelProps): React.ReactElement | null {
  const groupRef = useRef<THREE.Group>(null);
  const [currentScale, setCurrentScale] = useState(isExpanded ? 1 : 0);

  // Get sector color for accent
  const sectorColor = useMemo(
    () => getSectorColor(memory.primarySector, highContrast),
    [memory.primarySector, highContrast]
  );

  // Animate scale based on expansion state
  useFrame((_, delta) => {
    const targetScale = isExpanded ? 1 : 0;
    const newScale = THREE.MathUtils.lerp(
      currentScale,
      targetScale,
      Math.min(1, delta / ANIMATION_DURATION)
    );
    setCurrentScale(newScale);

    if (groupRef.current) {
      groupRef.current.scale.setScalar(Math.max(0.001, newScale));
    }
  });

  // Handle close click
  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // Handle edit click
  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.();
    },
    [onEdit]
  );

  // Handle cognitive action click
  const handleCognitiveAction = useCallback(
    (action: CognitiveAction) =>
      (e: React.MouseEvent): void => {
        e.stopPropagation();
        if (onCognitiveAction) {
          onCognitiveAction(action);
        }
      },
    [onCognitiveAction]
  );

  // Handle keyword click to navigate to connected memory (Requirements: 40.2)
  const handleKeywordClick = useCallback(
    (keyword: LinkedKeyword): void => {
      // Navigate to the first connected memory
      if (keyword.linkedMemoryIds.length > 0 && onKeywordClick) {
        const targetMemoryId = keyword.linkedMemoryIds[0];
        if (targetMemoryId != null && targetMemoryId !== '') {
          onKeywordClick(targetMemoryId);
        }
      }
    },
    [onKeywordClick]
  );

  // Don't render if fully collapsed
  if (currentScale < 0.01 && !isExpanded) {
    return null;
  }

  // Calculate opacity based on animation progress
  const opacity = Math.min(1, currentScale * 1.5);

  return (
    <group ref={groupRef} position={position}>
      <Html
        center
        distanceFactor={10}
        style={{
          opacity,
          pointerEvents: isExpanded ? 'auto' : 'none',
          transition: 'opacity 0.2s ease-out',
        }}
        occlude={false}
        transform
        sprite
      >
        <div
          className="select-none expanded-node-panel"
          style={{
            width: PANEL_WIDTH,
            minHeight: PANEL_MIN_HEIGHT,
            maxHeight: PANEL_MAX_HEIGHT,
            background: 'var(--theme-surface-overlay)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '12px',
            border: `1px solid ${sectorColor}40`,
            boxShadow: `
              0 0 30px ${sectorColor}30,
              0 0 60px ${sectorColor}15,
              inset 0 0 40px var(--theme-primary-bg)
            `,
            overflow: 'hidden',
          }}
          onClick={(e): void => {
            e.stopPropagation();
          }}
        >
          {/* Header */}
          <div
            className="px-3 py-2 flex justify-between items-center"
            style={{
              borderBottom: `1px solid ${sectorColor}30`,
              background: `linear-gradient(180deg, ${sectorColor}15 0%, transparent 100%)`,
            }}
          >
            <div className="flex items-center gap-2">
              {/* Sector indicator dot */}
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: sectorColor,
                  boxShadow: `0 0 8px ${sectorColor}`,
                }}
              />
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: sectorColor }}
              >
                {formatSectorType(memory.primarySector)}
              </span>
            </div>
            {/* Close button - Requirements: 26.5 */}
            <button
              onClick={handleClose}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-ui-border/30 hover:bg-ui-border/50 transition-colors"
              aria-label="Close panel"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-ui-text-secondary"
              >
                <path d="M2 2L10 10M10 2L2 10" />
              </svg>
            </button>
          </div>

          {/* Content - Requirements: 26.2, 40.2, 41.3, 41.4 */}
          <div className="p-3 overflow-y-auto" style={{ maxHeight: PANEL_MAX_HEIGHT - 100 }}>
            {/* Memory Content with Keyword Highlighting and Wiki Links (Requirements: 40.1, 40.2, 40.3, 41.3, 41.4) */}
            <div className="mb-3">
              <p className="text-sm text-ui-text-primary leading-relaxed whitespace-pre-wrap">
                <ContentRenderer
                  content={truncateContent(memory.content)}
                  linkedKeywords={linkedKeywords}
                  onKeywordClick={handleKeywordClick}
                  onWikiLinkClick={onKeywordClick}
                  memoryPreviews={memoryPreviews}
                  highContrast={highContrast}
                />
              </p>
            </div>

            {/* Metadata Section */}
            <div className="space-y-0.5 mb-2">
              <MetadataRow label="Created" value={formatDate(memory.createdAt)} />
              <MetadataRow label="Last Accessed" value={formatDate(memory.lastAccessed)} />
              <MetadataRow label="Access Count" value={memory.accessCount} />
              <MetadataRow
                label="Strength"
                value={formatPercentage(memory.strength)}
                colorClass={
                  memory.strength > 0.7
                    ? 'text-green-400'
                    : memory.strength > 0.3
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }
              />
              <MetadataRow
                label="Salience"
                value={formatPercentage(memory.salience)}
                colorClass={
                  memory.salience > 0.7
                    ? 'text-green-400'
                    : memory.salience > 0.3
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }
              />
            </div>

            {/* Tags and Keywords */}
            {memory.metadata.category != null && memory.metadata.category !== '' && (
              <MetadataRow label="Category" value={memory.metadata.category} />
            )}
            <TagList tags={memory.metadata.keywords ?? []} label="Keywords" />
            <TagList tags={memory.metadata.tags ?? []} label="Tags" />
          </div>

          {/* Action Buttons */}
          <div
            className="px-3 py-2 flex gap-2"
            style={{
              borderTop: `1px solid ${sectorColor}20`,
              background: 'var(--theme-surface-sunken)',
            }}
          >
            {onEdit && (
              <button
                onClick={handleEdit}
                className="px-2 py-1 text-xs bg-ui-border/30 hover:bg-ui-border/50 rounded transition-colors text-ui-text-secondary"
              >
                Edit
              </button>
            )}
            {onCognitiveAction && (
              <>
                <button
                  onClick={handleCognitiveAction('analyze-reasoning')}
                  className="px-2 py-1 text-xs bg-ui-border/30 hover:bg-ui-border/50 rounded transition-colors text-ui-text-secondary"
                >
                  Analyze
                </button>
                <button
                  onClick={handleCognitiveAction('detect-bias')}
                  className="px-2 py-1 text-xs bg-ui-border/30 hover:bg-ui-border/50 rounded transition-colors text-ui-text-secondary"
                >
                  Bias
                </button>
                <button
                  onClick={handleCognitiveAction('detect-emotion')}
                  className="px-2 py-1 text-xs bg-ui-border/30 hover:bg-ui-border/50 rounded transition-colors text-ui-text-secondary"
                >
                  Emotion
                </button>
              </>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

export default ExpandedNodePanel;
