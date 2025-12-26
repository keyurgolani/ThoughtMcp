import type React from "react";

export interface PanelConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  position: "left" | "right" | "bottom";
  defaultExpanded?: boolean;
}

export interface ResponsivePanelContainerProps {
  /** Panel configurations */
  panels: PanelConfig[];
  /** Children (main content) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface PanelContextValue {
  /** Currently active panel ID (for mobile stacked view) */
  activePanelId: string | null;
  /** Set active panel */
  setActivePanelId: (id: string | null) => void;
  /** Expanded panel IDs */
  expandedPanels: Set<string>;
  /** Toggle panel expansion */
  togglePanel: (id: string) => void;
  /** Z-index for a panel */
  getZIndex: (id: string) => number;
  /** Bring panel to front */
  bringToFront: (id: string) => void;
}
