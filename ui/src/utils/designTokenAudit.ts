/**
 * Design Token Audit Utilities
 *
 * Provides utilities for auditing design token compliance across the UI.
 * Used for visual consistency verification per Requirements 31.1-31.6, 38.1-38.6.
 *
 * Requirements: 31.1-31.6, 38.1-38.6
 */

// ============================================================================
// DESIGN TOKEN DEFINITIONS
// ============================================================================

/**
 * Spacing scale (4px base)
 * Requirements: 31.1, 31.3
 */
export const SPACING_SCALE = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

/**
 * Border radius scale
 * Requirements: 31.1
 */
export const BORDER_RADIUS_SCALE = {
  none: 0,
  sm: 4,
  DEFAULT: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

/**
 * Transition duration scale
 * Requirements: 31.2, 33.1, 33.2, 33.3
 */
export const TRANSITION_DURATION_SCALE = {
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 500,
} as const;

/**
 * Typography scale
 * Requirements: 35.1, 35.2
 */
export const TYPOGRAPHY_SCALE = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Exact accent colors
 * Requirements: 38.1, 38.2, 38.3
 */
export const ACCENT_COLORS = {
  cyan: {
    primary: '#00FFFF',
    glow: 'rgba(0, 255, 255, 0.3)',
    subtle: 'rgba(0, 255, 255, 0.15)',
    bg: 'rgba(0, 255, 255, 0.1)',
  },
  purple: {
    primary: '#9B59B6',
    glow: 'rgba(155, 89, 182, 0.3)',
    subtle: 'rgba(155, 89, 182, 0.15)',
    bg: 'rgba(155, 89, 182, 0.1)',
  },
  gold: {
    primary: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.3)',
    subtle: 'rgba(255, 215, 0, 0.15)',
    bg: 'rgba(255, 215, 0, 0.1)',
  },
} as const;

/**
 * Surface opacity levels
 * Requirements: 38.4
 */
export const SURFACE_OPACITY = {
  panels: 0.85,
  overlays: 0.6,
  tooltips: 0.4,
} as const;

/**
 * Backdrop blur values
 * Requirements: 38.4
 */
export const BACKDROP_BLUR = {
  light: 8,
  standard: 16,
  heavy: 20,
} as const;

/**
 * Shadow spread values
 * Requirements: 38.6
 */
export const SHADOW_SPREAD = {
  subtle: 10,
  medium: 20,
  prominent: 40,
} as const;

/**
 * Text opacity levels for audit
 * Requirements: 32.6
 */
export const AUDIT_TEXT_OPACITY = {
  primary: 1.0,
  secondary: 0.7,
  tertiary: 0.5,
  muted: 0.4,
  disabled: 0.3,
} as const;

/**
 * Disabled state opacity for audit
 * Requirements: 32.4
 */
export const AUDIT_DISABLED_OPACITY = 0.5;

// ============================================================================
// AUDIT FUNCTIONS
// ============================================================================

export interface AuditResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Validates that a spacing value matches the design token scale
 */
export function isValidSpacing(value: number): boolean {
  return Object.values(SPACING_SCALE).includes(
    value as (typeof SPACING_SCALE)[keyof typeof SPACING_SCALE]
  );
}

/**
 * Validates that a border radius value matches the design token scale
 */
export function isValidBorderRadius(value: number): boolean {
  return Object.values(BORDER_RADIUS_SCALE).includes(
    value as (typeof BORDER_RADIUS_SCALE)[keyof typeof BORDER_RADIUS_SCALE]
  );
}

/**
 * Validates that a transition duration matches the design token scale
 */
export function isValidTransitionDuration(value: number): boolean {
  return Object.values(TRANSITION_DURATION_SCALE).includes(
    value as (typeof TRANSITION_DURATION_SCALE)[keyof typeof TRANSITION_DURATION_SCALE]
  );
}

/**
 * Validates that a font size matches the typography scale
 */
export function isValidFontSize(value: number): boolean {
  return Object.values(TYPOGRAPHY_SCALE.fontSize).includes(
    value as (typeof TYPOGRAPHY_SCALE.fontSize)[keyof typeof TYPOGRAPHY_SCALE.fontSize]
  );
}

/**
 * Validates that a font weight matches the typography scale
 */
export function isValidFontWeight(value: number): boolean {
  return Object.values(TYPOGRAPHY_SCALE.fontWeight).includes(
    value as (typeof TYPOGRAPHY_SCALE.fontWeight)[keyof typeof TYPOGRAPHY_SCALE.fontWeight]
  );
}

/**
 * Validates that a backdrop blur value matches the design token scale
 */
export function isValidBackdropBlur(value: number): boolean {
  return Object.values(BACKDROP_BLUR).includes(
    value as (typeof BACKDROP_BLUR)[keyof typeof BACKDROP_BLUR]
  );
}

/**
 * Validates that a text opacity matches the hierarchy scale
 */
export function isValidTextOpacity(value: number): boolean {
  return Object.values(AUDIT_TEXT_OPACITY).includes(
    value as (typeof AUDIT_TEXT_OPACITY)[keyof typeof AUDIT_TEXT_OPACITY]
  );
}

/**
 * Checks if a color matches the exact cyan accent
 */
export function isCyanAccent(color: string): boolean {
  const normalizedColor = color.toLowerCase().replace(/\s/g, '');
  return (
    normalizedColor === '#00ffff' ||
    normalizedColor === 'rgba(0,255,255,0.3)' ||
    normalizedColor === 'rgba(0,255,255,0.15)' ||
    normalizedColor === 'rgba(0,255,255,0.1)'
  );
}

/**
 * Checks if a color matches the exact purple accent
 */
export function isPurpleAccent(color: string): boolean {
  const normalizedColor = color.toLowerCase().replace(/\s/g, '');
  return (
    normalizedColor === '#9b59b6' ||
    normalizedColor === 'rgba(155,89,182,0.3)' ||
    normalizedColor === 'rgba(155,89,182,0.15)' ||
    normalizedColor === 'rgba(155,89,182,0.1)'
  );
}

/**
 * Checks if a color matches the exact gold accent
 */
export function isGoldAccent(color: string): boolean {
  const normalizedColor = color.toLowerCase().replace(/\s/g, '');
  return (
    normalizedColor === '#ffd700' ||
    normalizedColor === 'rgba(255,215,0,0.3)' ||
    normalizedColor === 'rgba(255,215,0,0.15)' ||
    normalizedColor === 'rgba(255,215,0,0.1)'
  );
}

/**
 * Get the closest valid spacing value
 */
export function getClosestSpacing(value: number): number {
  const spacingValues = Object.values(SPACING_SCALE);
  return spacingValues.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

/**
 * Get the closest valid border radius value
 */
export function getClosestBorderRadius(value: number): number {
  const radiusValues = Object.values(BORDER_RADIUS_SCALE);
  return radiusValues.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

/**
 * Get the closest valid transition duration
 */
export function getClosestTransitionDuration(value: number): number {
  const durationValues = Object.values(TRANSITION_DURATION_SCALE);
  return durationValues.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

// ============================================================================
// CONTRAST RATIO UTILITIES (Requirements: 35.4)
// ============================================================================

/**
 * Calculate relative luminance of a color
 */
function getLuminance(r: number, g: number, b: number): number {
  const values = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  const rs = values[0] ?? 0;
  const gs = values[1] ?? 0;
  const bs = values[2] ?? 0;
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parse a hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result === null || result.length < 4) return null;
  const rStr = result[1];
  const gStr = result[2];
  const bStr = result[3];
  if (rStr === undefined || gStr === undefined || bStr === undefined) return null;
  return {
    r: parseInt(rStr, 16),
    g: parseInt(gStr, 16),
    b: parseInt(bStr, 16),
  };
}

/**
 * Calculate contrast ratio between two colors
 * Requirements: 35.4
 */
export function getContrastRatio(foreground: string, background: string): number {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return 0;

  const l1 = getLuminance(fg.r, fg.g, fg.b);
  const l2 = getLuminance(bg.r, bg.g, bg.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
 * Requirements: 35.4
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Check if contrast ratio meets WCAG AAA standard (7:1 for normal text)
 */
export function meetsWCAGAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  SPACING_SCALE,
  BORDER_RADIUS_SCALE,
  TRANSITION_DURATION_SCALE,
  TYPOGRAPHY_SCALE,
  ACCENT_COLORS,
  SURFACE_OPACITY,
  BACKDROP_BLUR,
  SHADOW_SPREAD,
  AUDIT_TEXT_OPACITY,
  AUDIT_DISABLED_OPACITY,
  isValidSpacing,
  isValidBorderRadius,
  isValidTransitionDuration,
  isValidFontSize,
  isValidFontWeight,
  isValidBackdropBlur,
  isValidTextOpacity,
  isCyanAccent,
  isPurpleAccent,
  isGoldAccent,
  getClosestSpacing,
  getClosestBorderRadius,
  getClosestTransitionDuration,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
};
