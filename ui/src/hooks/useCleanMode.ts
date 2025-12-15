/**
 * useCleanMode Hook
 *
 * Hooks for consuming clean mode state from the UI store.
 *
 * Requirements: 46.1, 46.5
 */

import { useUIStore } from '../stores/uiStore';

/**
 * Hook to check if a panel should be visible based on clean mode state
 *
 * @param panelId - The ID of the panel to check
 * @returns Whether the panel should be visible
 */
export function useCleanModeVisibility(panelId: string): boolean {
  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const isPanelVisible = useUIStore((state) => state.isPanelVisible);

  // In normal mode, all panels are visible
  if (!isCleanMode) return true;

  // In clean mode, check if this specific panel should be visible
  return isPanelVisible(panelId);
}

/**
 * Hook to get clean mode state and toggle function
 *
 * @returns Object with isCleanMode state and toggleCleanMode function
 */
export function useCleanMode(): {
  isCleanMode: boolean;
  toggleCleanMode: () => void;
  setCleanMode: (enabled: boolean) => void;
} {
  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const toggleCleanMode = useUIStore((state) => state.toggleCleanMode);
  const setCleanMode = useUIStore((state) => state.setCleanMode);

  return { isCleanMode, toggleCleanMode, setCleanMode };
}
