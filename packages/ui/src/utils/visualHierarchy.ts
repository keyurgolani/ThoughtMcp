/**
 * Visual Hierarchy Utilities
 *
 * Centralized utilities for consistent visual hierarchy across the UI.
 * Provides exact color values, button hierarchy styles, and text hierarchy utilities.
 *
 * Requirements: 32.1, 32.2, 32.3, 32.4, 32.6, 35.4, 35.6, 38.1, 38.2, 38.3
 */

// ============================================================================
// EXACT ACCENT COLORS (Requirements: 38.1, 38.2, 38.3)
// These are the ONLY values that should be used for accent colors
// ============================================================================

/**
 * Exact cyan accent color values
 * Requirements: 38.1
 */
export const CYAN = {
  /** Primary cyan color - #00FFFF */
  primary: '#00FFFF',
  /** Cyan glow for shadows and effects - rgba(0, 255, 255, 0.3) */
  glow: 'rgba(0, 255, 255, 0.3)',
  /** Subtle cyan for backgrounds - rgba(0, 255, 255, 0.15) */
  subtle: 'rgba(0, 255, 255, 0.15)',
  /** Very subtle cyan for backgrounds - rgba(0, 255, 255, 0.1) */
  bg: 'rgba(0, 255, 255, 0.1)',
  /** Border color with 30% opacity */
  border: 'rgba(0, 255, 255, 0.3)',
  /** Hover border color with 50% opacity */
  borderHover: 'rgba(0, 255, 255, 0.5)',
} as const;

/**
 * Exact purple accent color values
 * Requirements: 38.2
 */
export const PURPLE = {
  /** Primary purple color - #9B59B6 */
  primary: '#9B59B6',
  /** Purple glow for shadows and effects - rgba(155, 89, 182, 0.3) */
  glow: 'rgba(155, 89, 182, 0.3)',
  /** Subtle purple for backgrounds - rgba(155, 89, 182, 0.15) */
  subtle: 'rgba(155, 89, 182, 0.15)',
  /** Very subtle purple for backgrounds - rgba(155, 89, 182, 0.1) */
  bg: 'rgba(155, 89, 182, 0.1)',
  /** Border color with 30% opacity */
  border: 'rgba(155, 89, 182, 0.3)',
  /** Hover border color with 50% opacity */
  borderHover: 'rgba(155, 89, 182, 0.5)',
} as const;

/**
 * Exact gold accent color values
 * Requirements: 38.3
 */
export const GOLD = {
  /** Primary gold color - #FFD700 */
  primary: '#FFD700',
  /** Gold glow for shadows and effects - rgba(255, 215, 0, 0.3) */
  glow: 'rgba(255, 215, 0, 0.3)',
  /** Subtle gold for backgrounds - rgba(255, 215, 0, 0.15) */
  subtle: 'rgba(255, 215, 0, 0.15)',
  /** Very subtle gold for backgrounds - rgba(255, 215, 0, 0.1) */
  bg: 'rgba(255, 215, 0, 0.1)',
  /** Border color with 30% opacity */
  border: 'rgba(255, 215, 0, 0.3)',
  /** Hover border color with 50% opacity */
  borderHover: 'rgba(255, 215, 0, 0.5)',
} as const;

/**
 * Destructive/error color values
 * Requirements: 32.3
 */
export const DESTRUCTIVE = {
  /** Primary red color - #E74C3C */
  primary: '#E74C3C',
  /** Red glow for shadows and effects */
  glow: 'rgba(231, 76, 60, 0.3)',
  /** Subtle red for backgrounds */
  subtle: 'rgba(231, 76, 60, 0.15)',
  /** Very subtle red for backgrounds */
  bg: 'rgba(231, 76, 60, 0.1)',
  /** Border color with 30% opacity */
  border: 'rgba(231, 76, 60, 0.3)',
  /** Hover border color with 50% opacity */
  borderHover: 'rgba(231, 76, 60, 0.5)',
} as const;

// ============================================================================
// TEXT HIERARCHY (Requirements: 32.6, 35.4)
// ============================================================================

/**
 * Text opacity levels for visual hierarchy
 * Requirements: 32.6
 */
export const TEXT_OPACITY = {
  /** Primary text - 100% opacity */
  primary: 1,
  /** Secondary text - 70% opacity */
  secondary: 0.7,
  /** Tertiary text - 50% opacity */
  tertiary: 0.5,
  /** Muted text - 40% opacity */
  muted: 0.4,
  /** Disabled text - 30% opacity */
  disabled: 0.3,
} as const;

/**
 * Text color values with opacity applied
 * Requirements: 32.6
 */
export const TEXT_COLORS = {
  /** Primary text - full white */
  primary: '#ffffff',
  /** Secondary text - 70% white */
  secondary: 'rgba(255, 255, 255, 0.7)',
  /** Tertiary text - 50% white */
  tertiary: 'rgba(255, 255, 255, 0.5)',
  /** Muted text - 40% white */
  muted: 'rgba(255, 255, 255, 0.4)',
  /** Disabled text - 30% white */
  disabled: 'rgba(255, 255, 255, 0.3)',
} as const;

/**
 * Text shadow for 3D labels to improve legibility
 * Requirements: 35.6
 */
export const TEXT_SHADOW = {
  /** Subtle shadow for labels */
  subtle: '0 1px 2px rgba(0, 0, 0, 0.5)',
  /** Medium shadow for better contrast */
  medium: '0 1px 3px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.3)',
  /** Strong shadow for 3D labels */
  strong: '0 2px 4px rgba(0, 0, 0, 0.8), 0 4px 8px rgba(0, 0, 0, 0.4)',
  /** Glow shadow for neon effect */
  glow: '0 0 5px rgba(0, 255, 255, 0.5), 0 0 10px rgba(0, 255, 255, 0.3)',
} as const;

// ============================================================================
// BUTTON HIERARCHY STYLES (Requirements: 32.1, 32.2, 32.3, 32.4)
// ============================================================================

/**
 * Disabled state opacity
 * Requirements: 32.4
 */
export const DISABLED_OPACITY = 0.5;

/**
 * Primary button styles (cyan glow)
 * Requirements: 32.1
 */
export const primaryButtonStyle: React.CSSProperties = {
  background: CYAN.bg,
  border: `1px solid ${CYAN.border}`,
  color: CYAN.primary,
};

export const primaryButtonHoverStyle: React.CSSProperties = {
  background: CYAN.subtle,
  borderColor: CYAN.borderHover,
  boxShadow: `0 0 15px ${CYAN.glow}`,
};

/**
 * Secondary button styles (purple subtle glow)
 * Requirements: 32.2
 */
export const secondaryButtonStyle: React.CSSProperties = {
  background: PURPLE.bg,
  border: `1px solid ${PURPLE.border}`,
  color: PURPLE.primary,
};

export const secondaryButtonHoverStyle: React.CSSProperties = {
  background: PURPLE.subtle,
  borderColor: PURPLE.borderHover,
  boxShadow: `0 0 15px ${PURPLE.glow}`,
};

/**
 * Destructive button styles (red warning)
 * Requirements: 32.3
 */
export const destructiveButtonStyle: React.CSSProperties = {
  background: DESTRUCTIVE.bg,
  border: `1px solid ${DESTRUCTIVE.border}`,
  color: DESTRUCTIVE.primary,
};

export const destructiveButtonHoverStyle: React.CSSProperties = {
  background: DESTRUCTIVE.subtle,
  borderColor: DESTRUCTIVE.borderHover,
  boxShadow: `0 0 15px ${DESTRUCTIVE.glow}`,
};

/**
 * Disabled button style
 * Requirements: 32.4
 */
export const disabledButtonStyle: React.CSSProperties = {
  opacity: DISABLED_OPACITY,
  cursor: 'not-allowed',
};

// ============================================================================
// TAILWIND CLASS HELPERS
// ============================================================================

/**
 * Tailwind classes for text hierarchy
 * Requirements: 32.6
 */
export const textClasses = {
  /** Primary text - full opacity */
  primary: 'text-white',
  /** Secondary text - 70% opacity */
  secondary: 'text-white/70',
  /** Tertiary text - 50% opacity */
  tertiary: 'text-white/50',
  /** Muted text - 40% opacity */
  muted: 'text-white/40',
  /** Disabled text - 30% opacity */
  disabled: 'text-white/30',
} as const;

/**
 * Tailwind classes for button variants
 * Requirements: 32.1, 32.2, 32.3, 32.4
 */
export const buttonClasses = {
  /** Primary button with cyan accent */
  primary: `
    bg-[rgba(0,255,255,0.1)] border border-[rgba(0,255,255,0.3)]
    text-[#00FFFF]
    hover:bg-[rgba(0,255,255,0.15)] hover:border-[rgba(0,255,255,0.5)] hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
  `,
  /** Secondary button with purple accent */
  secondary: `
    bg-[rgba(155,89,182,0.1)] border border-[rgba(155,89,182,0.3)]
    text-[#9B59B6]
    hover:bg-[rgba(155,89,182,0.15)] hover:border-[rgba(155,89,182,0.5)] hover:shadow-[0_0_15px_rgba(155,89,182,0.3)]
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
  `,
  /** Destructive button with red accent */
  destructive: `
    bg-[rgba(231,76,60,0.1)] border border-[rgba(231,76,60,0.3)]
    text-[#E74C3C]
    hover:bg-[rgba(231,76,60,0.15)] hover:border-[rgba(231,76,60,0.5)] hover:shadow-[0_0_15px_rgba(231,76,60,0.3)]
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
  `,
  /** Ghost button */
  ghost: `
    bg-transparent border border-[rgba(100,100,150,0.3)]
    text-white/70
    hover:bg-[rgba(100,100,150,0.15)] hover:text-white
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the appropriate text class based on hierarchy level
 * @param level - The hierarchy level (primary, secondary, tertiary, muted, disabled)
 * @returns Tailwind class string
 */
export function getTextClass(level: keyof typeof textClasses): string {
  return textClasses[level];
}

/**
 * Get the appropriate button class based on variant
 * @param variant - The button variant (primary, secondary, destructive, ghost)
 * @returns Tailwind class string
 */
export function getButtonClass(variant: keyof typeof buttonClasses): string {
  return buttonClasses[variant];
}

/**
 * Get inline style for text with specific opacity
 * @param opacity - Opacity value (0-1)
 * @returns React CSS properties
 */
export function getTextStyle(opacity: number): React.CSSProperties {
  return {
    color: `rgba(255, 255, 255, ${String(opacity)})`,
  };
}

/**
 * Get inline style for text shadow
 * @param variant - Shadow variant (subtle, medium, strong, glow)
 * @returns React CSS properties
 */
export function getTextShadowStyle(variant: keyof typeof TEXT_SHADOW): React.CSSProperties {
  return {
    textShadow: TEXT_SHADOW[variant],
  };
}

export default {
  CYAN,
  PURPLE,
  GOLD,
  DESTRUCTIVE,
  TEXT_OPACITY,
  TEXT_COLORS,
  TEXT_SHADOW,
  DISABLED_OPACITY,
  primaryButtonStyle,
  primaryButtonHoverStyle,
  secondaryButtonStyle,
  secondaryButtonHoverStyle,
  destructiveButtonStyle,
  destructiveButtonHoverStyle,
  disabledButtonStyle,
  textClasses,
  buttonClasses,
  getTextClass,
  getButtonClass,
  getTextStyle,
  getTextShadowStyle,
};
