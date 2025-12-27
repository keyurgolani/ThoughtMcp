/**
 * Sidebar Component
 *
 * Collapsible navigation sidebar with navigation links, quick stats,
 * and recent memories list. Uses glassmorphism styling consistent
 * with the dark cosmic theme.
 *
 * Requirements: 23.1, 23.3, 36.1
 */

import { Home } from "lucide-react";
import { useCallback, useMemo, type ReactElement } from "react";
import { useSidebarContext } from "../../contexts/SidebarContext";
import { getSectorIcon } from "../../utils/iconUtils";
import {
  BiasIcon,
  ConnectionsIcon,
  DecomposeIcon,
  EmotionIcon,
  ExplorerIcon,
  FrameworkIcon,
  HubNodesIcon,
  MemoriesIcon,
  ReasoningIcon,
  ThisWeekIcon,
  type IconSize,
} from "../icons";

// ============================================================================
// Types
// ============================================================================

export interface QuickStats {
  /** Total number of memories */
  totalMemories: number;
  /** Total number of connections */
  totalConnections: number;
  /** Memories added this week */
  memoriesThisWeek: number;
  /** Number of hub nodes (>5 connections) */
  hubNodes: number;
}

export interface RecentMemoryItem {
  /** Memory ID */
  id: string;
  /** Memory content preview */
  contentPreview: string;
  /** Primary sector type */
  primarySector: string;
  /** Last accessed timestamp */
  lastAccessed: number;
}

export interface SidebarProps {
  /** Quick stats to display */
  quickStats?: QuickStats | undefined;
  /** Recent memories to display */
  recentMemories?: RecentMemoryItem[] | undefined;
  /** Callback when a memory is clicked */
  onMemoryClick?: ((memoryId: string) => void) | undefined;
  /** Maximum recent memories to show */
  maxRecentMemories?: number | undefined;
  /** Additional CSS classes */
  className?: string | undefined;
}

export interface NavItemConfig {
  /** Route identifier */
  route: string;
  /** Display label */
  label: string;
  /** Short label for collapsed state */
  shortLabel: string;
  /** Icon component getter */
  getIcon: (size: IconSize) => ReactElement;
  /** Description for tooltip */
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const NAV_ITEMS: NavItemConfig[] = [
  {
    route: "/dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    getIcon: (size) => <Home size={size === "sm" ? 14 : size === "lg" ? 20 : 16} />,
    description: "Overview of your knowledge base",
  },
  {
    route: "/explorer",
    label: "Memory Explorer",
    shortLabel: "Explorer",
    getIcon: (size) => <ExplorerIcon size={size} />,
    description: "Explore the 3D memory graph",
  },
  {
    route: "/reasoning",
    label: "Reasoning Console",
    shortLabel: "Reasoning",
    getIcon: (size) => <ReasoningIcon size={size} />,
    description: "Perform systematic reasoning analysis",
  },
  {
    route: "/framework",
    label: "Framework Analysis",
    shortLabel: "Framework",
    getIcon: (size) => <FrameworkIcon size={size} />,
    description: "Analyze problems using thinking frameworks",
  },
  {
    route: "/decomposition",
    label: "Problem Decomposition",
    shortLabel: "Decompose",
    getIcon: (size) => <DecomposeIcon size={size} />,
    description: "Break down complex problems",
  },
  {
    route: "/confidence-bias",
    label: "Confidence & Bias",
    shortLabel: "Bias",
    getIcon: (size) => <BiasIcon size={size} />,
    description: "Assess confidence and detect biases",
  },
  {
    route: "/emotion",
    label: "Emotion Analysis",
    shortLabel: "Emotion",
    getIcon: (size) => <EmotionIcon size={size} />,
    description: "Analyze emotional content",
  },
];

// CSS classes for sector badges - uses CSS variables that adapt to theme
const SECTOR_BADGE_CLASSES: Record<string, string> = {
  episodic: "sector-badge-episodic",
  semantic: "sector-badge-semantic",
  procedural: "sector-badge-procedural",
  emotional: "sector-badge-emotional",
  reflective: "sector-badge-reflective",
};

const DEFAULT_MAX_RECENT = 5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a timestamp as relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${String(days)}d ago`;
  if (hours > 0) return `${String(hours)}h ago`;
  if (minutes > 0) return `${String(minutes)}m ago`;
  return "Just now";
}

/**
 * Truncate text to a maximum length
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

// ============================================================================
// Sub-Components
// ============================================================================

interface NavItemProps {
  item: NavItemConfig;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

/**
 * Navigation item button
 */
function NavItem({ item, isActive, isCollapsed, onClick }: NavItemProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? item.label : item.description}
      aria-label={`Navigate to ${item.label}`}
      aria-current={isActive ? "page" : undefined}
      className={`
        w-full flex items-center gap-3
        px-3 py-2.5
        rounded-lg
        text-sm font-medium
        transition-all duration-normal
        group
        ${
          isActive
            ? "bg-ui-accent-primary/15 text-ui-accent-primary border border-ui-accent-primary/30"
            : "text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-border/30 border border-transparent"
        }
        ${isCollapsed ? "justify-center" : ""}
      `}
      style={
        isActive
          ? {
              boxShadow: "0 0 15px rgba(0, 255, 255, 0.15), inset 0 0 10px rgba(0, 255, 255, 0.05)",
            }
          : undefined
      }
    >
      {/* Icon */}
      <span
        className={`
          transition-transform duration-fast
          ${!isActive ? "group-hover:scale-110" : ""}
        `}
        aria-hidden="true"
      >
        {item.getIcon(isCollapsed ? "lg" : "md")}
      </span>

      {/* Label - hidden when collapsed */}
      {!isCollapsed && <span className="truncate">{item.label}</span>}

      {/* Active indicator dot */}
      {isActive && !isCollapsed && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full bg-ui-accent-primary animate-pulse"
          style={{
            boxShadow: "0 0 8px rgba(0, 255, 255, 0.8)",
          }}
        />
      )}
    </button>
  );
}

interface StatItemProps {
  label: string;
  value: number;
  getIcon: (size: IconSize) => ReactElement;
  isCollapsed: boolean;
}

/**
 * Quick stat display item
 */
function StatItem({ label, value, getIcon, isCollapsed }: StatItemProps): React.ReactElement {
  return (
    <div
      className={`
        flex items-center gap-2
        ${isCollapsed ? "justify-center" : ""}
      `}
      title={isCollapsed ? `${label}: ${String(value)}` : undefined}
    >
      <span className="text-ui-text-muted" aria-hidden="true">
        {getIcon("sm")}
      </span>
      {!isCollapsed && (
        <>
          <span className="text-ui-text-secondary text-xs">{label}</span>
          <span className="ml-auto text-ui-accent-primary text-sm font-semibold">
            {value.toLocaleString()}
          </span>
        </>
      )}
      {isCollapsed && (
        <span className="text-ui-accent-primary text-xs font-semibold">
          {value.toLocaleString()}
        </span>
      )}
    </div>
  );
}

interface RecentMemoryItemProps {
  memory: RecentMemoryItem;
  isCollapsed: boolean;
  onClick: () => void;
}

/**
 * Recent memory list item
 */
function RecentMemoryListItem({
  memory,
  isCollapsed,
  onClick,
}: RecentMemoryItemProps): React.ReactElement {
  const sectorBadgeClass = SECTOR_BADGE_CLASSES[memory.primarySector] ?? "";

  if (isCollapsed) {
    return (
      <button
        onClick={onClick}
        title={memory.contentPreview}
        className="
          w-full flex justify-center
          p-2
          rounded-lg
          hover:bg-ui-border/30
          transition-colors duration-normal
        "
        aria-label={`Navigate to memory: ${memory.contentPreview}`}
      >
        <span className={sectorBadgeClass} aria-hidden="true">
          {getSectorIcon(memory.primarySector, "sm")}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="
        w-full p-2
        text-left
        rounded-lg
        bg-ui-background/30
        hover:bg-ui-border/40
        transition-colors duration-normal
        group
      "
      aria-label={`Navigate to memory: ${memory.contentPreview}`}
    >
      <div className="flex items-start gap-2">
        <span className={`${sectorBadgeClass} mt-0.5`} aria-hidden="true">
          {getSectorIcon(memory.primarySector, "sm")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-ui-text-primary truncate group-hover:text-ui-accent-primary">
            {truncateText(memory.contentPreview, 40)}
          </p>
          <p className="text-[10px] text-ui-text-muted mt-0.5">
            {formatRelativeTime(memory.lastAccessed)}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Sidebar - Collapsible navigation sidebar
 *
 * Features:
 * - Navigation links for all screens (Requirement 23.1)
 * - Quick stats display (total memories, connections, hub nodes)
 * - Recent memories list (Requirement 23.3)
 * - Collapsible to icon-only mode (Requirement 36.1)
 * - Glassmorphism styling
 * - Keyboard accessible
 *
 * Requirements: 23.1, 23.3, 36.1
 */
export function Sidebar({
  quickStats,
  recentMemories = [],
  onMemoryClick,
  maxRecentMemories = DEFAULT_MAX_RECENT,
  className = "",
}: SidebarProps): React.ReactElement {
  // Get context from AppShell
  const { collapsed, currentRoute, onNavigate } = useSidebarContext();

  // Limit recent memories
  const limitedMemories = useMemo(
    () => recentMemories.slice(0, maxRecentMemories),
    [recentMemories, maxRecentMemories]
  );

  // Handle navigation
  const handleNavClick = useCallback(
    (route: string) => {
      onNavigate(route);
    },
    [onNavigate]
  );

  // Handle memory click
  const handleMemoryClick = useCallback(
    (memoryId: string) => {
      onMemoryClick?.(memoryId);
    },
    [onMemoryClick]
  );

  return (
    <div
      className={`
        flex flex-col h-full
        ${className}
      `}
    >
      {/* Navigation Section */}
      <nav className="p-3" aria-label="Main navigation">
        {!collapsed && (
          <h2 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-2 px-1">
            Navigation
          </h2>
        )}
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.route}>
              <NavItem
                item={item}
                isActive={currentRoute === item.route || currentRoute.startsWith(item.route)}
                isCollapsed={collapsed}
                onClick={(): void => {
                  handleNavClick(item.route);
                }}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-ui-border" />

      {/* Quick Stats Section */}
      {quickStats !== undefined && (
        <div className="p-3">
          {!collapsed && (
            <h2 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-2 px-1">
              Quick Stats
            </h2>
          )}
          <div
            className={`
              space-y-2
              ${collapsed ? "px-1" : "px-2 py-2 rounded-lg bg-ui-background/30"}
            `}
          >
            <StatItem
              label="Memories"
              value={quickStats.totalMemories}
              getIcon={(size) => <MemoriesIcon size={size} />}
              isCollapsed={collapsed}
            />
            <StatItem
              label="Connections"
              value={quickStats.totalConnections}
              getIcon={(size) => <ConnectionsIcon size={size} />}
              isCollapsed={collapsed}
            />
            <StatItem
              label="Hub Nodes"
              value={quickStats.hubNodes}
              getIcon={(size) => <HubNodesIcon size={size} />}
              isCollapsed={collapsed}
            />
            {!collapsed && (
              <StatItem
                label="This Week"
                value={quickStats.memoriesThisWeek}
                getIcon={(size) => <ThisWeekIcon size={size} />}
                isCollapsed={collapsed}
              />
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      {quickStats !== undefined && <div className="mx-3 border-t border-ui-border" />}

      {/* Recent Memories Section */}
      <div className="flex-1 p-3 overflow-y-auto">
        {!collapsed && (
          <h2 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-2 px-1">
            Recent Memories
          </h2>
        )}
        {limitedMemories.length > 0 ? (
          <ul className="space-y-1">
            {limitedMemories.map((memory) => (
              <li key={memory.id}>
                <RecentMemoryListItem
                  memory={memory}
                  isCollapsed={collapsed}
                  onClick={(): void => {
                    handleMemoryClick(memory.id);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          !collapsed && (
            <p className="text-xs text-ui-text-muted text-center py-4">No recent memories</p>
          )
        )}
      </div>
    </div>
  );
}

export default Sidebar;
