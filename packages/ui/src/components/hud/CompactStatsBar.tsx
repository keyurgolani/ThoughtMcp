/**
 * CompactStatsBar Component
 *
 * A minimal, non-intrusive stats bar that displays memory statistics
 * inline with icons. Designed to be positioned at the top of the dashboard
 * without occupying prime real estate.
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import { useCallback, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  ConnectionsIcon,
  HubNodesIcon,
  MemoriesIcon,
  ThisWeekIcon,
  type IconSize,
} from "../icons";

// ============================================================================
// Types
// ============================================================================

export interface CompactStatsBarProps {
  /** Total number of memories */
  totalMemories: number;
  /** Total number of connections */
  totalConnections: number;
  /** Number of hub nodes (>5 connections) */
  hubNodes: number;
  /** Memories added this week */
  memoriesThisWeek: number;
  /** Click handler for memories stat */
  onMemoriesClick?: () => void;
  /** Click handler for connections stat */
  onConnectionsClick?: () => void;
  /** Click handler for hub nodes stat */
  onHubNodesClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatItemProps {
  /** Icon component getter */
  getIcon: (size: IconSize) => ReactElement;
  /** Stat value */
  value: number;
  /** Stat label */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Individual stat item with icon and value
 */
function StatItem({ getIcon, value, label, onClick, ariaLabel }: StatItemProps): ReactElement {
  const content = (
    <>
      <span className="text-ui-text-muted" aria-hidden="true">
        {getIcon("sm")}
      </span>
      <span className="font-semibold text-ui-text-primary">{value.toLocaleString()}</span>
      <span className="text-ui-text-secondary">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 hover:text-ui-accent-primary transition-colors focus:outline-none focus:ring-2 focus:ring-ui-accent-primary focus:ring-offset-1 focus:ring-offset-ui-surface rounded px-1"
        aria-label={ariaLabel ?? `${String(value)} ${label}`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className="flex items-center gap-1.5"
      aria-label={ariaLabel ?? `${String(value)} ${label}`}
    >
      {content}
    </span>
  );
}

/**
 * Separator dot between stats
 */
function StatSeparator(): ReactElement {
  return (
    <span className="text-ui-border" aria-hidden="true">
      •
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CompactStatsBar - Minimal stats bar for dashboard header
 *
 * Features:
 * - Displays stats inline with icons (Requirement 5.2)
 * - Uses minimal height (40px) (Requirement 5.3)
 * - Non-intrusive positioning (Requirement 5.1)
 * - Clickable stats for navigation
 * - Trend indicator for weekly activity
 * - Accessible with proper ARIA labels
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export function CompactStatsBar({
  totalMemories,
  totalConnections,
  hubNodes,
  memoriesThisWeek,
  onMemoriesClick,
  onConnectionsClick,
  onHubNodesClick,
  className = "",
}: CompactStatsBarProps): ReactElement {
  const navigate = useNavigate();

  // Default click handlers navigate to appropriate pages
  const handleMemoriesClick = useCallback(() => {
    if (onMemoriesClick) {
      onMemoriesClick();
    } else {
      void navigate("/memories");
    }
  }, [onMemoriesClick, navigate]);

  const handleConnectionsClick = useCallback(() => {
    if (onConnectionsClick) {
      onConnectionsClick();
    } else {
      void navigate("/explorer");
    }
  }, [onConnectionsClick, navigate]);

  const handleHubNodesClick = useCallback(() => {
    if (onHubNodesClick) {
      onHubNodesClick();
    } else {
      void navigate("/explorer");
    }
  }, [onHubNodesClick, navigate]);

  return (
    <div
      className={`h-10 flex flex-wrap items-center justify-center gap-3 text-sm py-2 ${className}`}
      role="region"
      aria-label="Memory Statistics"
    >
      {/* Stats icon */}
      <span className="text-ui-text-muted" aria-hidden="true">
        <BarChart3 size={16} />
      </span>

      {/* Memories stat */}
      <StatItem
        getIcon={(size) => <MemoriesIcon size={size} />}
        value={totalMemories}
        label="memories"
        onClick={handleMemoriesClick}
        ariaLabel={`${String(totalMemories)} total memories, click to view all`}
      />

      <StatSeparator />

      {/* Connections stat */}
      <StatItem
        getIcon={(size) => <ConnectionsIcon size={size} />}
        value={totalConnections}
        label="connections"
        onClick={handleConnectionsClick}
        ariaLabel={`${String(totalConnections)} connections, click to explore`}
      />

      <StatSeparator />

      {/* Hub nodes stat */}
      <StatItem
        getIcon={(size) => <HubNodesIcon size={size} />}
        value={hubNodes}
        label="hubs"
        onClick={handleHubNodesClick}
        ariaLabel={`${String(hubNodes)} hub nodes, click to explore`}
      />

      {/* Weekly activity indicator - only shown when there's activity */}
      {memoriesThisWeek > 0 && (
        <>
          <StatSeparator />
          <span
            className="flex items-center gap-1.5 text-status-success text-xs"
            aria-label={`${String(memoriesThisWeek)} memories added this week`}
          >
            <span aria-hidden="true">
              <ThisWeekIcon size="xs" />
            </span>
            <span>+{memoriesThisWeek} this week</span>
          </span>
        </>
      )}
    </div>
  );
}

export default CompactStatsBar;
