/**
 * ConnectionTooltip Component
 *
 * Displays a tooltip listing connected memory titles when hovering over a node.
 * Shows the names/previews of memories that are connected to the hovered node.
 *
 * Requirements: 39.3
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of connections to display in tooltip */
const MAX_CONNECTIONS_DISPLAYED = 8;

/** Maximum length for memory title preview */
const MAX_TITLE_LENGTH = 40;

/** Tooltip animation duration in seconds */
const ANIMATION_DURATION = 0.15;

// ============================================================================
// Types
// ============================================================================

export interface ConnectedMemory {
  /** Memory ID */
  id: string;
  /** Memory content or title */
  content: string;
  /** Link type connecting to this memory */
  linkType?: 'semantic' | 'causal' | 'temporal' | 'analogical';
}

export interface ConnectionTooltipProps {
  /** Whether the tooltip is visible */
  isVisible: boolean;
  /** List of connected memories to display */
  connections: ConnectedMemory[];
  /** Position of the tooltip (screen coordinates) */
  position: { x: number; y: number };
  /** Optional title for the hovered node */
  hoveredNodeTitle?: string | undefined;
  /** Whether to use high contrast colors */
  highContrast?: boolean | undefined;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Truncates content for display in tooltip
 *
 * @param content - The content to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated content with ellipsis if needed
 */
export function truncateForTooltip(content: string, maxLength: number = MAX_TITLE_LENGTH): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + '...';
}

/**
 * Gets the color for a link type
 *
 * @param linkType - The type of link
 * @param lightMode - Whether to use light mode colors (darker for visibility)
 * @returns CSS color string
 */
export function getLinkTypeColor(
  linkType?: 'semantic' | 'causal' | 'temporal' | 'analogical',
  lightMode: boolean = false
): string {
  if (lightMode) {
    // Darker colors for light mode visibility
    switch (linkType) {
      case 'semantic':
        return '#1E5F8A'; // Darker blue
      case 'causal':
        return '#B5522D'; // Darker orange
      case 'temporal':
        return '#2D6B3F'; // Darker green
      case 'analogical':
        return '#5E4A8A'; // Darker purple
      default:
        return '#0088AA'; // Darker cyan (default)
    }
  }
  // Dark mode colors (original)
  switch (linkType) {
    case 'semantic':
      return '#00BFFF'; // Blue
    case 'causal':
      return '#FFA500'; // Orange
    case 'temporal':
      return '#00FF7F'; // Green
    case 'analogical':
      return '#9B59B6'; // Purple
    default:
      return '#00FFFF'; // Cyan (default)
  }
}

/**
 * Gets the label for a link type
 *
 * @param linkType - The type of link
 * @returns Human-readable label
 */
export function getLinkTypeLabel(
  linkType?: 'semantic' | 'causal' | 'temporal' | 'analogical'
): string {
  switch (linkType) {
    case 'semantic':
      return 'Semantic';
    case 'causal':
      return 'Causal';
    case 'temporal':
      return 'Temporal';
    case 'analogical':
      return 'Analogical';
    default:
      return 'Connected';
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ConnectionItemWithThemeProps {
  connection: ConnectedMemory;
  index: number;
  textColor: string;
  isLightMode: boolean;
}

/**
 * Single connection item with theme-aware colors
 */
function ConnectionItemWithTheme({
  connection,
  index,
  textColor,
  isLightMode,
}: ConnectionItemWithThemeProps): React.ReactElement {
  const linkColor = getLinkTypeColor(connection.linkType, isLightMode);
  const truncatedContent = truncateForTooltip(connection.content);

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.1 }}
      className="flex items-center gap-2 py-1"
    >
      {/* Link type indicator dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: linkColor }}
        title={getLinkTypeLabel(connection.linkType)}
      />
      {/* Memory title/content */}
      <span className="text-sm truncate" style={{ color: textColor }}>
        {truncatedContent}
      </span>
    </motion.li>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ConnectionTooltip Component
 *
 * Displays a glassmorphism tooltip showing connected memory titles
 * when hovering over a node in the 3D view.
 *
 * Requirements: 39.3
 */
export function ConnectionTooltip({
  isVisible,
  connections,
  position,
  hoveredNodeTitle,
  highContrast = false,
}: ConnectionTooltipProps): React.ReactElement {
  // Check if we're in light mode
  const isLightMode =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-mode') === 'light';

  // Limit displayed connections
  const displayedConnections = useMemo(() => {
    return connections.slice(0, MAX_CONNECTIONS_DISPLAYED);
  }, [connections]);

  const hasMoreConnections = connections.length > MAX_CONNECTIONS_DISPLAYED;
  const remainingCount = connections.length - MAX_CONNECTIONS_DISPLAYED;

  // Calculate tooltip position with viewport boundary detection
  const tooltipStyle = useMemo(() => {
    // Offset from cursor
    const offsetX = 16;
    const offsetY = 16;

    // Default position (to the right and below cursor)
    let x = position.x + offsetX;
    let y = position.y + offsetY;

    // Viewport boundary detection (approximate tooltip size)
    const tooltipWidth = 280;
    const tooltipHeight = Math.min(connections.length * 32 + 80, 320);

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
  }, [position, connections.length]);

  // Background and text colors based on theme mode
  const themeStyles = isLightMode
    ? {
        background: 'rgba(255, 255, 255, 0.98)',
        border: '1px solid rgba(0, 0, 0, 0.18)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
        headerColor: '#0066CC',
        textPrimary: '#0F172A',
        textSecondary: '#334155',
        textMuted: '#475569',
        borderColor: 'rgba(0, 0, 0, 0.15)',
        glowShadow: 'inset 0 0 20px rgba(0, 102, 204, 0.05)',
      }
    : {
        background: highContrast ? 'rgba(0, 0, 0, 0.95)' : 'rgba(26, 26, 46, 0.9)',
        border: highContrast
          ? '1px solid rgba(255, 255, 255, 0.5)'
          : '1px solid rgba(0, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        headerColor: '#22D3EE',
        textPrimary: 'rgba(255, 255, 255, 0.9)',
        textSecondary: 'rgba(255, 255, 255, 0.6)',
        textMuted: 'rgba(255, 255, 255, 0.5)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        glowShadow: 'inset 0 0 20px rgba(0, 255, 255, 0.05)',
      };

  return (
    <AnimatePresence>
      {isVisible && connections.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          transition={{ duration: ANIMATION_DURATION }}
          className="fixed z-50 pointer-events-none backdrop-blur-xl rounded-lg"
          style={{
            ...tooltipStyle,
            maxWidth: '280px',
            maxHeight: '320px',
            background: themeStyles.background,
            border: themeStyles.border,
            boxShadow: themeStyles.boxShadow,
          }}
        >
          {/* Tooltip content */}
          <div className="p-3">
            {/* Header */}
            <div
              className="flex items-center justify-between mb-2 pb-2"
              style={{ borderBottom: `1px solid ${themeStyles.borderColor}` }}
            >
              <span
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: themeStyles.headerColor }}
              >
                Connections
              </span>
              <span className="text-xs" style={{ color: themeStyles.textSecondary }}>
                {connections.length} linked
              </span>
            </div>

            {/* Hovered node title (if provided) */}
            {hoveredNodeTitle !== undefined && hoveredNodeTitle !== '' && (
              <div
                className="mb-2 pb-2"
                style={{ borderBottom: `1px solid ${themeStyles.borderColor}` }}
              >
                <span className="text-xs" style={{ color: themeStyles.textMuted }}>
                  From:{' '}
                </span>
                <span className="text-sm font-medium" style={{ color: themeStyles.textPrimary }}>
                  {truncateForTooltip(hoveredNodeTitle, 30)}
                </span>
              </div>
            )}

            {/* Connection list */}
            <ul className="space-y-0.5 overflow-y-auto" style={{ maxHeight: '200px' }}>
              {displayedConnections.map((connection, index) => (
                <ConnectionItemWithTheme
                  key={connection.id}
                  connection={connection}
                  index={index}
                  textColor={themeStyles.textPrimary}
                  isLightMode={isLightMode}
                />
              ))}
            </ul>

            {/* More indicator */}
            {hasMoreConnections && (
              <div
                className="mt-2 pt-2"
                style={{ borderTop: `1px solid ${themeStyles.borderColor}` }}
              >
                <span className="text-xs" style={{ color: themeStyles.textMuted }}>
                  +{remainingCount} more connection{remainingCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
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

export default ConnectionTooltip;
