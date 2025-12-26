/**
 * QuickStats Component
 *
 * Displays quick statistics about the knowledge base including
 * total memories, connections, memories added this week, and hub nodes.
 * Uses glassmorphism styling consistent with the dark cosmic theme.
 *
 * Requirements: 39.2, 42.3
 */

import { useMemo, type ReactElement } from "react";
import { ConnectionsIcon, HubNodesIcon, MemoriesIcon, ThisWeekIcon, type IconSize } from "../icons";

// ============================================================================
// Types
// ============================================================================

export interface QuickStatsData {
  /** Total number of memories */
  totalMemories: number;
  /** Total number of connections */
  totalConnections: number;
  /** Memories added this week */
  memoriesThisWeek: number;
  /** Number of hub nodes (>5 connections) */
  hubNodes: number;
}

export interface QuickStatsProps {
  /** Stats data to display */
  stats: QuickStatsData;
  /** Display variant */
  variant?: "grid" | "compact" | "inline";
  /** Show trend indicators */
  showTrends?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface StatCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: number;
  /** Icon component getter */
  getIcon: (size: IconSize) => ReactElement;
  /** Trend direction */
  trend?: "up" | "down" | "neutral" | undefined;
  /** Trend display value */
  trendValue?: string | undefined;
  /** Compact display mode */
  compact?: boolean | undefined;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Individual stat card with glassmorphism styling
 */
function StatCard({
  label,
  value,
  getIcon,
  trend,
  trendValue,
  compact = false,
}: StatCardProps): ReactElement {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ui-surface/30 backdrop-blur-sm">
        <span className="text-ui-text-muted" aria-hidden="true">
          {getIcon("lg")}
        </span>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-ui-text-primary">{value.toLocaleString()}</span>
          <span className="text-xs text-ui-text-muted">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel-glow p-4 flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-ui-text-muted" aria-hidden="true">
          {getIcon("2xl")}
        </span>
        {trend !== undefined && trendValue !== undefined && (
          <span
            className={`
              text-xs px-2 py-0.5 rounded-full
              ${trend === "up" ? "bg-status-success/20 text-status-success" : ""}
              ${trend === "down" ? "bg-status-error/20 text-status-error" : ""}
              ${trend === "neutral" ? "bg-ui-border/50 text-ui-text-secondary" : ""}
            `}
          >
            {trend === "up" && "↑"}
            {trend === "down" && "↓"}
            {trendValue}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-3xl font-bold text-ui-text-primary">{value.toLocaleString()}</span>
        <span className="text-sm text-ui-text-secondary">{label}</span>
      </div>
    </div>
  );
}

/**
 * Inline stat item for compact displays
 */
function InlineStat({
  label,
  value,
  getIcon,
}: {
  label: string;
  value: number;
  getIcon: (size: IconSize) => ReactElement;
}): ReactElement {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${String(value)}`}>
      <span className="text-ui-text-muted" aria-hidden="true">
        {getIcon("sm")}
      </span>
      <span className="text-ui-accent-primary text-sm font-semibold">{value.toLocaleString()}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuickStats - Display quick statistics about the knowledge base
 *
 * Features:
 * - Total memories count (Requirement 39.2)
 * - Total connections count (Requirement 39.2)
 * - Memories added this week (Requirement 39.2)
 * - Hub nodes count (>5 connections) (Requirement 39.2, 42.3)
 * - Multiple display variants (grid, compact, inline)
 * - Trend indicators for activity tracking
 * - Glassmorphism styling
 *
 * Variants:
 * - grid: Full-size cards in a responsive grid (default)
 * - compact: Smaller cards for sidebar use
 * - inline: Single-line display for minimal space
 *
 * Requirements: 39.2, 42.3
 */
export function QuickStats({
  stats,
  variant = "grid",
  showTrends = true,
  className = "",
}: QuickStatsProps): ReactElement {
  // Calculate trends based on this week's activity
  const trends = useMemo(() => {
    const weeklyActive = stats.memoriesThisWeek > 0;
    const highActivity = stats.memoriesThisWeek > 5;

    return {
      memories: {
        trend: weeklyActive ? ("up" as const) : ("neutral" as const),
        value: weeklyActive ? `+${String(stats.memoriesThisWeek)}` : "—",
      },
      thisWeek: {
        trend: highActivity ? ("up" as const) : ("neutral" as const),
        value: highActivity ? "Active" : "—",
      },
    };
  }, [stats.memoriesThisWeek]);

  // Inline variant - single row of stats
  if (variant === "inline") {
    return (
      <div
        className={`flex items-center gap-4 ${className}`}
        role="region"
        aria-label="Quick Statistics"
      >
        <InlineStat
          label="Memories"
          value={stats.totalMemories}
          getIcon={(size) => <MemoriesIcon size={size} />}
        />
        <InlineStat
          label="Connections"
          value={stats.totalConnections}
          getIcon={(size) => <ConnectionsIcon size={size} />}
        />
        <InlineStat
          label="Hub Nodes"
          value={stats.hubNodes}
          getIcon={(size) => <HubNodesIcon size={size} />}
        />
        <InlineStat
          label="This Week"
          value={stats.memoriesThisWeek}
          getIcon={(size) => <ThisWeekIcon size={size} />}
        />
      </div>
    );
  }

  // Compact variant - smaller cards for sidebar
  if (variant === "compact") {
    return (
      <div
        className={`grid grid-cols-2 gap-2 ${className}`}
        role="region"
        aria-label="Quick Statistics"
      >
        <StatCard
          label="Memories"
          value={stats.totalMemories}
          getIcon={(size) => <MemoriesIcon size={size} />}
          compact
        />
        <StatCard
          label="Connections"
          value={stats.totalConnections}
          getIcon={(size) => <ConnectionsIcon size={size} />}
          compact
        />
        <StatCard
          label="Hub Nodes"
          value={stats.hubNodes}
          getIcon={(size) => <HubNodesIcon size={size} />}
          compact
        />
        <StatCard
          label="This Week"
          value={stats.memoriesThisWeek}
          getIcon={(size) => <ThisWeekIcon size={size} />}
          compact
        />
      </div>
    );
  }

  // Grid variant (default) - full-size cards
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      role="region"
      aria-label="Quick Statistics"
    >
      <StatCard
        label="Total Memories"
        value={stats.totalMemories}
        getIcon={(size) => <MemoriesIcon size={size} />}
        trend={showTrends ? trends.memories.trend : undefined}
        trendValue={showTrends ? trends.memories.value : undefined}
      />
      <StatCard
        label="Connections"
        value={stats.totalConnections}
        getIcon={(size) => <ConnectionsIcon size={size} />}
      />
      <StatCard
        label="Hub Nodes"
        value={stats.hubNodes}
        getIcon={(size) => <HubNodesIcon size={size} />}
      />
      <StatCard
        label="This Week"
        value={stats.memoriesThisWeek}
        getIcon={(size) => <ThisWeekIcon size={size} />}
        trend={showTrends ? trends.thisWeek.trend : undefined}
        trendValue={showTrends ? trends.thisWeek.value : undefined}
      />
    </div>
  );
}

export default QuickStats;
