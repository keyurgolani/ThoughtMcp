import { createContext, useContext } from "react";

export interface SidebarContextValue {
  /** Whether the sidebar is collapsed */
  collapsed: boolean;
  /** Current active route */
  currentRoute: string;
  /** Navigate to a route */
  onNavigate: (route: string) => void;
}

export const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  currentRoute: "",
  onNavigate: () => {},
});

/**
 * Hook to access sidebar context from child components
 */
export function useSidebarContext(): SidebarContextValue {
  return useContext(SidebarContext);
}
