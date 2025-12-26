/**
 * Z-Index Hierarchy Constants
 *
 * Consistent z-index layering to prevent click-through issues.
 * All UI components should use these constants for z-index values.
 *
 * Requirements: 48.1, 48.2, 48.3, 48.4, 48.5, 48.6
 */

export const Z_INDEX = {
  // Base content layer (0-10)
  BASE_CONTENT: 0,
  THREE_D_CANVAS: 1,
  BACKGROUND_EFFECTS: 5,

  // Panel layer (20-30)
  SIDE_PANELS: 20,
  QUICK_ACCESS_PANEL: 25,
  FLOATING_PANELS: 30,
  MINI_MAP: 35,

  // Overlay layer (40-50)
  DROPDOWNS: 40,
  AUTOCOMPLETE: 45,
  CONTEXT_MENUS: 50,

  // Modal layer (60-70)
  MODAL_BACKDROP: 60,
  MODAL_CONTENT: 65,
  QUICK_CAPTURE_MODAL: 70,

  // Tooltip layer (80-90)
  TOOLTIPS: 80,
  NOTIFICATIONS: 85,
  CRITICAL_ALERTS: 90,
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;

/**
 * Get z-index value by key
 */
export function getZIndex(key: ZIndexKey): number {
  return Z_INDEX[key];
}

/**
 * Get z-index CSS style object
 */
export function getZIndexStyle(key: ZIndexKey): { zIndex: number } {
  return { zIndex: Z_INDEX[key] };
}

export default Z_INDEX;
