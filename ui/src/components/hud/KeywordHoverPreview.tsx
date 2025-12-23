/**
 * KeywordHoverPreview Component
 *
 * Displays a tooltip preview of connected memories when hovering over
 * a highlighted keyword in memory content.
 *
 * Requirements: 40.3
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import type { Memory, MemorySectorType } from '../../types/api';
import { getSectorColor } from '../../utils/visualization';

// ============================================================================
// Constants
// ============================================================================

/** Maximum length for content preview */
const MAX_CONTENT_LENGTH = 120;

/** Maximum number of memories to show in preview */
const MAX_MEMORIES_DISPLAYED = 3;

/** Tooltip animation duration in seconds */
const ANIMATION_DURATION = 0.15;

// ============================================================================
// Types
// ============================================================================

/**
 * Preview data for a connected memory
 */
export interface MemoryPreview {
  /** Memory ID */
  id: string;
  /** Memory content */
  content: string;
  /** Primary sector type */
  primarySector: MemorySectorType;
  /** Salience score (0-1) */
  salience: number;
  /** Strength score (0-1) */
  strength: number;
}

export interface KeywordHoverPreviewProps {
  /** Whether the preview is visible */
  isVisible: boolean;
  /** The keyword text being hovered */
  keywordText: string;
  /** Link type of the keyword */
  linkType: 'semantic' | 'causal' | 'temporal' | 'analogical';
  /** Connected memories to preview */
  connectedMemories: MemoryPreview[];
  /** Position of the preview (screen coordinates) */
  position: { x: number; y: number };
  /** Whether to use high contrast colors */
  highContrast?: boolean | undefined;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Truncates content for display in preview
 *
 * @param content - The content to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated content with ellipsis if needed
 */
export function truncatePreviewContent(
  content: string,
  maxLength: number = MAX_CONTENT_LENGTH
): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + '...';
}

/**
 * Gets the color for a link type in keyword preview
 *
 * @param linkType - The type of link
 * @param lightMode - Whether to use light mode colors
 * @returns CSS color string
 */
function getKeywordPreviewLinkColor(
  linkType: 'semantic' | 'causal' | 'temporal' | 'analogical',
  lightMode: boolean = false
): string {
  if (lightMode) {
    // Bold, saturated colors for light mode visibility
    switch (linkType) {
      case 'semantic':
        return '#0077B6'; // Bold blue
      case 'causal':
        return '#D62828'; // Bold red-orange
      case 'temporal':
        return '#2D6A4F'; // Bold green
      case 'analogical':
        return '#7B2CBF'; // Bold purple
      default:
        return '#0077B6'; // Bold blue (default)
    }
  }
  // Dark mode colors (original)
  switch (linkType) {
    case 'semantic':
      return '#00FFFF'; // Cyan
    case 'causal':
      return '#FF8800'; // Orange
    case 'temporal':
      return '#00FF88'; // Green
    case 'analogical':
      return '#8800FF'; // Purple
    default:
      return '#00FFFF'; // Cyan (default)
  }
}

/**
 * Gets the label for a link type in keyword preview
 *
 * @param linkType - The type of link
 * @returns Human-readable label
 */
function getKeywordPreviewLinkLabel(
  linkType: 'semantic' | 'causal' | 'temporal' | 'analogical'
): string {
  switch (linkType) {
    case 'semantic':
      return 'Semantic Link';
    case 'causal':
      return 'Causal Link';
    case 'temporal':
      return 'Temporal Link';
    case 'analogical':
      return 'Analogical Link';
    default:
      return 'Connected';
  }
}

/**
 * Formats a percentage value for display
 */
function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Converts a Memory object to MemoryPreview
 */
export function memoryToPreview(memory: Memory): MemoryPreview {
  return {
    id: memory.id,
    content: memory.content,
    primarySector: memory.primarySector,
    salience: memory.salience,
    strength: memory.strength,
  };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MemoryPreviewItemProps {
  memory: MemoryPreview;
  index: number;
  highContrast: boolean;
  lightMode: boolean;
}

/**
 * Single memory preview item in the tooltip
 */
function MemoryPreviewItem({
  memory,
  index,
  highContrast,
  lightMode,
}: MemoryPreviewItemProps): React.ReactElement {
  const sectorColor = getSectorColor(memory.primarySector, highContrast, lightMode);
  const truncatedContent = truncatePreviewContent(memory.content);

  // Theme-aware colors
  const itemBg = lightMode ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
  const itemBorder = lightMode ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.1)';
  const textPrimary = lightMode ? '#0F172A' : 'rgba(255, 255, 255, 0.9)';
  const textMuted = lightMode ? '#475569' : 'rgba(255, 255, 255, 0.5)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.1 }}
      className="p-2 rounded-lg"
      style={{ background: itemBg, border: `1px solid ${itemBorder}` }}
    >
      {/* Sector indicator and content */}
      <div className="flex items-start gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{
            backgroundColor: sectorColor,
            boxShadow: lightMode ? 'none' : `0 0 6px ${sectorColor}`,
          }}
        />
        <p className="text-sm leading-relaxed flex-1" style={{ color: textPrimary }}>
          {truncatedContent}
        </p>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-3 mt-1.5 ml-4">
        <span
          className="text-xs uppercase tracking-wider"
          style={{ color: sectorColor, opacity: 0.8 }}
        >
          {memory.primarySector}
        </span>
        <span className="text-xs" style={{ color: textMuted }}>
          Salience: {formatPercentage(memory.salience)}
        </span>
        <span className="text-xs" style={{ color: textMuted }}>
          Strength: {formatPercentage(memory.strength)}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * KeywordHoverPreview Component
 *
 * Displays a glassmorphism tooltip showing connected memory previews
 * when hovering over a highlighted keyword.
 *
 * Requirements: 40.3
 */
export function KeywordHoverPreview({
  isVisible,
  keywordText,
  linkType,
  connectedMemories,
  position,
  highContrast = false,
}: KeywordHoverPreviewProps): React.ReactElement {
  // Check if we're in light mode
  const isLightMode =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';

  // Limit displayed memories
  const displayedMemories = useMemo(() => {
    return connectedMemories.slice(0, MAX_MEMORIES_DISPLAYED);
  }, [connectedMemories]);

  const hasMoreMemories = connectedMemories.length > MAX_MEMORIES_DISPLAYED;
  const remainingCount = connectedMemories.length - MAX_MEMORIES_DISPLAYED;

  // Get link type styling with light mode support
  const linkColor = getKeywordPreviewLinkColor(linkType, isLightMode);
  const linkLabel = getKeywordPreviewLinkLabel(linkType);

  // Theme-aware styles
  const themeStyles = isLightMode
    ? {
        background: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid rgba(0, 0, 0, 0.18)',
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.1)`,
        textPrimary: '#0F172A',
        textMuted: '#475569',
        borderColor: 'rgba(0, 0, 0, 0.15)',
        glowShadow: `inset 0 0 20px ${linkColor}10`,
      }
    : {
        background: highContrast ? 'rgba(0, 0, 0, 0.95)' : 'rgba(10, 10, 20, 0.95)',
        border: highContrast ? '1px solid rgba(255, 255, 255, 0.5)' : `1px solid ${linkColor}30`,
        boxShadow: `0 0 30px ${linkColor}20, 0 4px 20px rgba(0, 0, 0, 0.5)`,
        textPrimary: 'rgba(255, 255, 255, 0.9)',
        textMuted: 'rgba(255, 255, 255, 0.5)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        glowShadow: `inset 0 0 20px ${linkColor}10`,
      };

  // Calculate tooltip position with viewport boundary detection
  const tooltipStyle = useMemo(() => {
    // Offset from cursor
    const offsetX = 12;
    const offsetY = 20;

    // Default position (to the right and below cursor)
    let x = position.x + offsetX;
    let y = position.y + offsetY;

    // Viewport boundary detection (approximate tooltip size)
    const tooltipWidth = 320;
    const tooltipHeight = Math.min(connectedMemories.length * 100 + 80, 400);

    // Check right boundary
    if (typeof window !== 'undefined' && x + tooltipWidth > window.innerWidth - 20) {
      x = position.x - tooltipWidth - offsetX;
    }

    // Check bottom boundary
    if (typeof window !== 'undefined' && y + tooltipHeight > window.innerHeight - 20) {
      y = position.y - tooltipHeight - offsetY;
    }

    // Ensure minimum position
    x = Math.max(20, x);
    y = Math.max(20, y);

    return {
      left: x,
      top: y,
    };
  }, [position, connectedMemories.length]);

  return (
    <AnimatePresence>
      {isVisible && connectedMemories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          transition={{ duration: ANIMATION_DURATION }}
          className="fixed z-50 pointer-events-none backdrop-blur-xl rounded-lg"
          style={{
            ...tooltipStyle,
            width: '320px',
            maxHeight: '400px',
            background: themeStyles.background,
            border: themeStyles.border,
            boxShadow: themeStyles.boxShadow,
          }}
        >
          {/* Tooltip content */}
          <div className="p-3">
            {/* Header with keyword and link type */}
            <div
              className="flex items-center justify-between mb-3 pb-2"
              style={{ borderBottom: `1px solid ${themeStyles.borderColor}` }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: linkColor,
                    boxShadow: isLightMode ? 'none' : `0 0 8px ${linkColor}`,
                  }}
                />
                <span className="font-medium text-sm" style={{ color: themeStyles.textPrimary }}>
                  "{keywordText}"
                </span>
              </div>
              <span className="text-xs uppercase tracking-wider" style={{ color: linkColor }}>
                {linkLabel}
              </span>
            </div>

            {/* Connected memories preview */}
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '300px' }}>
              {displayedMemories.map((memory, index) => (
                <MemoryPreviewItem
                  key={memory.id}
                  memory={memory}
                  index={index}
                  highContrast={highContrast}
                  lightMode={isLightMode}
                />
              ))}
            </div>

            {/* More indicator */}
            {hasMoreMemories && (
              <div
                className="mt-2 pt-2"
                style={{ borderTop: `1px solid ${themeStyles.borderColor}` }}
              >
                <span className="text-xs" style={{ color: themeStyles.textMuted }}>
                  +{remainingCount} more connected memor{remainingCount > 1 ? 'ies' : 'y'}
                </span>
              </div>
            )}

            {/* Click hint */}
            <div
              className="mt-2 pt-2"
              style={{ borderTop: `1px solid ${themeStyles.borderColor}` }}
            >
              <span className="text-xs italic" style={{ color: themeStyles.textMuted }}>
                Click keyword to navigate
              </span>
            </div>
          </div>

          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{
              boxShadow: themeStyles.glowShadow,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default KeywordHoverPreview;
