/**
 * Layout Components
 *
 * Application shell and layout components for the Memory Exploration UI.
 */

export { SidebarContext, useSidebarContext } from "../../contexts/SidebarContext";
export type { SidebarContextValue } from "../../contexts/SidebarContext";
export { AppShell } from "./AppShell";
export type { AppShellProps } from "./AppShell";

export { Sidebar } from "./Sidebar";
export type {
  NavItemConfig,
  RecentMemoryItem,
  SidebarProps,
  QuickStats as SidebarQuickStats,
} from "./Sidebar";
