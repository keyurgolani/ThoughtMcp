import { createContext, useContext } from "react";
import type { PanelContextValue } from "../../types/panel";

export const PanelContext = createContext<PanelContextValue | null>(null);

export function usePanelContext(): PanelContextValue {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error("usePanelContext must be used within ResponsivePanelContainer");
  }
  return context;
}
