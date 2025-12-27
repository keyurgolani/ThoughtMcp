/**
 * Design Tokens
 *
 * Single source of truth for all design tokens used across the UI.
 * This consolidates values from theme.ts, visualHierarchy.ts, and CSS variables.
 *
 * Usage:
 * - Import tokens directly for TypeScript/JS usage
 * - CSS variables are defined in index.css and reference these values
 * - Tailwind config extends these tokens
 */

// ============================================================================
// COLOR TOKENS
// ============================================================================

/**
 * Primary accent color (Cyan)
 * Used for: Primary actions, highlights, focus states
 */
export const PRIMARY = {
  base: "#00FFFF",
  muted: "#00CCCC",
  glow: "rgba(0, 255, 255, 0.3)",
  subtle: "rgba(0, 255, 255, 0.15)",
  bg: "rgba(0, 255, 255, 0.1)",
  border: "rgba(0, 255, 255, 0.3)",
  borderHover: "rgba(0, 255, 255, 0.5)",
} as const;

/**
 * Secondary accent color (Purple)
 * Used for: Secondary actions, procedural sector
 */
export const SECONDARY = {
  base: "#9B59B6",
  muted: "#7D4A94",
  glow: "rgba(155, 89, 182, 0.3)",
  subtle: "rgba(155, 89, 182, 0.15)",
  bg: "rgba(155, 89, 182, 0.1)",
  border: "rgba(155, 89, 182, 0.3)",
  borderHover: "rgba(155, 89, 182, 0.5)",
} as const;

/**
 * Highlight accent color (Gold)
 * Used for: Current/selected items, episodic sector
 */
export const HIGHLIGHT = {
  base: "#FFD700",
  muted: "#CCAC00",
  glow: "rgba(255, 215, 0, 0.3)",
  subtle: "rgba(255, 215, 0, 0.15)",
  bg: "rgba(255, 215, 0, 0.1)",
  border: "rgba(255, 215, 0, 0.3)",
  borderHover: "rgba(255, 215, 0, 0.5)",
} as const;

/**
 * Destructive/error color (Red)
 * Used for: Delete actions, errors, warnings
 */
export const DESTRUCTIVE = {
  base: "#E74C3C",
  glow: "rgba(231, 76, 60, 0.3)",
  subtle: "rgba(231, 76, 60, 0.15)",
  bg: "rgba(231, 76, 60, 0.1)",
  border: "rgba(231, 76, 60, 0.3)",
  borderHover: "rgba(231, 76, 60, 0.5)",
} as const;

/**
 * Status colors
 */
export const STATUS = {
  success: {
    base: "#27AE60",
    text: "#4ade80",
    glow: "rgba(39, 174, 96, 0.3)",
    bg: "rgba(39, 174, 96, 0.15)",
    border: "rgba(39, 174, 96, 0.4)",
  },
  warning: {
    base: "#F39C12",
    text: "#fbbf24",
    glow: "rgba(243, 156, 18, 0.3)",
    bg: "rgba(243, 156, 18, 0.15)",
    border: "rgba(243, 156, 18, 0.4)",
  },
  error: {
    base: "#E74C3C",
    text: "#f87171",
    glow: "rgba(231, 76, 60, 0.3)",
    bg: "rgba(231, 76, 60, 0.15)",
    border: "rgba(231, 76, 60, 0.4)",
  },
  info: {
    base: "#3498DB",
    text: "#60a5fa",
    glow: "rgba(52, 152, 219, 0.3)",
    bg: "rgba(52, 152, 219, 0.15)",
    border: "rgba(52, 152, 219, 0.4)",
  },
} as const;

/**
 * Memory sector colors
 */
export const SECTORS = {
  episodic: {
    base: "#FFD700",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.15)",
    border: "rgba(251, 191, 36, 0.4)",
  },
  semantic: {
    base: "#00FFFF",
    color: "#22d3ee",
    bg: "rgba(34, 211, 238, 0.15)",
    border: "rgba(34, 211, 238, 0.4)",
  },
  procedural: {
    base: "#9B59B6",
    color: "#a78bfa",
    bg: "rgba(167, 139, 250, 0.15)",
    border: "rgba(167, 139, 250, 0.4)",
  },
  emotional: {
    base: "#FFA500",
    color: "#fb923c",
    bg: "rgba(251, 146, 60, 0.15)",
    border: "rgba(251, 146, 60, 0.4)",
  },
  reflective: {
    base: "#C0C0C0",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.15)",
    border: "rgba(148, 163, 184, 0.4)",
  },
} as const;

/**
 * Link type colors
 */
export const LINK_TYPES = {
  semantic: "#3498DB",
  causal: "#E67E22",
  temporal: "#27AE60",
  analogical: "#9B59B6",
} as const;

/**
 * Background colors
 */
export const BACKGROUNDS = {
  primary: "#0a0a0f",
  secondary: "#0d0d14",
  tertiary: "#12121a",
} as const;

/**
 * Surface colors (for panels)
 */
export const SURFACES = {
  base: "rgba(15, 15, 25, 0.85)",
  elevated: "rgba(20, 20, 35, 0.9)",
  overlay: "rgba(25, 25, 40, 0.95)",
  sunken: "rgba(8, 8, 12, 0.9)",
} as const;

/**
 * Border colors
 */
export const BORDERS = {
  default: "rgba(100, 100, 150, 0.3)",
  hover: "rgba(100, 100, 150, 0.5)",
  active: "rgba(0, 255, 255, 0.5)",
} as const;

/**
 * Text colors with opacity levels
 */
export const TEXT = {
  primary: "#ffffff",
  secondary: "rgba(255, 255, 255, 0.7)",
  tertiary: "rgba(255, 255, 255, 0.5)",
  muted: "rgba(255, 255, 255, 0.4)",
  disabled: "rgba(255, 255, 255, 0.3)",
} as const;

/**
 * Text opacity levels
 */
export const TEXT_OPACITY = {
  primary: 1,
  secondary: 0.7,
  tertiary: 0.5,
  muted: 0.4,
  disabled: 0.3,
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

/**
 * Spacing scale (4px base)
 */
export const SPACING = {
  0: "0px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const RADIUS = {
  none: "0px",
  sm: "4px",
  default: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  "3xl": "24px",
  full: "9999px",
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const FONT_FAMILY = {
  sans: "Inter, system-ui, sans-serif",
  mono: "JetBrains Mono, Menlo, Monaco, monospace",
} as const;

export const FONT_SIZE = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "32px",
  "4xl": "40px",
} as const;

export const FONT_WEIGHT = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ============================================================================
// TRANSITION TOKENS
// ============================================================================

export const DURATION = {
  fast: "100ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

export const EASING = {
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeIn: "cubic-bezier(0.7, 0, 0.84, 0)",
  easeInOut: "cubic-bezier(0.87, 0, 0.13, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
} as const;

// ============================================================================
// Z-INDEX TOKENS
// ============================================================================

export const Z_INDEX = {
  base: 0,
  canvas: 1,
  background: 5,
  panels: 20,
  quickAccess: 25,
  floating: 30,
  minimap: 35,
  dropdown: 40,
  autocomplete: 45,
  contextMenu: 50,
  modalBackdrop: 60,
  modal: 65,
  quickCapture: 70,
  tooltip: 80,
  notification: 85,
  critical: 90,
} as const;

// ============================================================================
// SHADOW TOKENS
// ============================================================================

export const SHADOWS = {
  subtle: "0 2px 8px rgba(0, 0, 0, 0.3)",
  medium: "0 4px 16px rgba(0, 0, 0, 0.4)",
  prominent: "0 8px 32px rgba(0, 0, 0, 0.5)",
  glow: {
    primary: `0 0 20px ${PRIMARY.glow}, 0 0 40px ${PRIMARY.bg}`,
    secondary: `0 0 20px ${SECONDARY.glow}, 0 0 40px ${SECONDARY.bg}`,
    highlight: `0 0 20px ${HIGHLIGHT.glow}, 0 0 40px ${HIGHLIGHT.bg}`,
  },
  panel: `0 0 20px ${PRIMARY.glow}, 0 0 40px ${PRIMARY.bg}, inset 0 0 30px ${PRIMARY.bg}`,
  panelElevated: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${PRIMARY.glow}`,
  panelFloating: `0 12px 48px rgba(0, 0, 0, 0.6), 0 0 30px ${PRIMARY.glow}`,
} as const;

// ============================================================================
// GLASSMORPHISM PRESETS
// ============================================================================

export const GLASS = {
  light: {
    background: "rgba(15, 15, 25, 0.6)",
    blur: "8px",
    border: "1px solid rgba(100, 100, 150, 0.2)",
  },
  standard: {
    background: "rgba(15, 15, 25, 0.85)",
    blur: "16px",
    border: "1px solid rgba(100, 100, 150, 0.3)",
  },
  heavy: {
    background: "rgba(15, 15, 25, 0.9)",
    blur: "20px",
    border: "1px solid rgba(100, 100, 150, 0.4)",
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get sector color by type
 */
export function getSectorColor(sector: keyof typeof SECTORS): string {
  const sectorData = SECTORS[sector];
  return sectorData.base;
}

/**
 * Get link type color
 */
export function getLinkColor(linkType: keyof typeof LINK_TYPES): string {
  const linkColor = LINK_TYPES[linkType];
  return linkColor;
}

/**
 * Get text color with opacity
 */
export function getTextColor(level: keyof typeof TEXT_OPACITY): string {
  const opacity = TEXT_OPACITY[level];
  return `rgba(255, 255, 255, ${String(opacity)})`;
}

/**
 * Create CSS variable reference
 */
export function cssVar(name: string, fallback?: string): string {
  if (fallback !== undefined && fallback !== "") {
    return `var(--${name}, ${fallback})`;
  }
  return `var(--${name})`;
}

export default {
  PRIMARY,
  SECONDARY,
  HIGHLIGHT,
  DESTRUCTIVE,
  STATUS,
  SECTORS,
  LINK_TYPES,
  BACKGROUNDS,
  SURFACES,
  BORDERS,
  TEXT,
  TEXT_OPACITY,
  SPACING,
  RADIUS,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  LINE_HEIGHT,
  DURATION,
  EASING,
  Z_INDEX,
  SHADOWS,
  GLASS,
  getSectorColor,
  getLinkColor,
  getTextColor,
  cssVar,
};
