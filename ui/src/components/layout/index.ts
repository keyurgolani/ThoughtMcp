/**
 * Layout Components
 *
 * Application shell and layout components for the Memory Exploration UI.
 */

export { AppShell, SidebarContext, useSidebarContext } from './AppShell';
export type { AppShellProps, SidebarContextValue } from './AppShell';

export { Sidebar } from './Sidebar';
export type {
  NavItemConfig,
  RecentMemoryItem,
  SidebarProps,
  QuickStats as SidebarQuickStats,
} from './Sidebar';
