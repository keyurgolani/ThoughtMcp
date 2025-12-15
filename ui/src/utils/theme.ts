/**
 * Theme Utilities
 *
 * Centralized theme configuration for consistent glassmorphism styling,
 * neon accents, and dark cosmic color palette across all UI components.
 *
 * Requirements: 5.7, 17.7, 23.5, 2.2, 31.1-31.6, 38.1-38.6
 */

// ============================================================================
// DESIGN TOKENS
// ============================================================================

/**
 * Spacing scale (4px base)
 * Requirements: 31.1, 31.3
 */
export const spacing = {
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

/**
 * Border radius scale
 * Requirements: 31.1
 */
export const borderRadius = {
  none: '0px',
  sm: '4px',
  DEFAULT: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  full: '9999px',
} as const;

/**
 * Typography scale
 * Requirements: 35.1, 35.2, 35.3
 */
export const typography = {
  fontFamily: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, Menlo, Monaco, monospace',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
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
 * Transition durations
 * Requirements: 31.2, 33.1, 33.2, 33.3
 */
export const transitions = {
  duration: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
    easeIn: 'cubic-bezier(0.7, 0, 0.84, 0)',
    easeInOut: 'cubic-bezier(0.87, 0, 0.13, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ============================================================================
// Color Palette
// Requirements: 38.1, 38.2, 38.3
// IMPORTANT: These are the EXACT color values that MUST be used throughout the UI
// ============================================================================

/**
 * Core color palette for the dark cosmic theme
 */
export const colors = {
  // Background colors
  background: {
    primary: '#0a0a0f',
    secondary: '#0d0d14',
    tertiary: '#12121a',
  },

  // Surface colors (for panels)
  surface: {
    base: 'rgba(15, 15, 25, 0.85)',
    elevated: 'rgba(20, 20, 35, 0.9)',
    overlay: 'rgba(25, 25, 40, 0.95)',
    sunken: 'rgba(8, 8, 12, 0.9)',
  },

  // Neon accent colors - EXACT values per Requirements 38.1, 38.2, 38.3
  // CYAN: Primary accent for primary actions and highlights
  // PURPLE: Secondary accent for secondary actions
  // GOLD: Highlight accent for current/selected items
  accent: {
    // Cyan - Primary Accent (Requirements: 38.1)
    cyan: '#00FFFF', // EXACT: Do not change
    cyanMuted: '#00CCCC',
    cyanGlow: 'rgba(0, 255, 255, 0.3)', // EXACT: Do not change
    cyanSubtle: 'rgba(0, 255, 255, 0.15)',
    cyanBg: 'rgba(0, 255, 255, 0.1)',

    // Purple - Secondary Accent (Requirements: 38.2)
    purple: '#9B59B6', // EXACT: Do not change
    purpleMuted: '#7D4A94',
    purpleGlow: 'rgba(155, 89, 182, 0.3)', // EXACT: Do not change
    purpleSubtle: 'rgba(155, 89, 182, 0.15)',
    purpleBg: 'rgba(155, 89, 182, 0.1)',

    // Gold - Highlight Accent (Requirements: 38.3)
    gold: '#FFD700', // EXACT: Do not change
    goldMuted: '#CCAC00',
    goldGlow: 'rgba(255, 215, 0, 0.3)', // EXACT: Do not change
    goldSubtle: 'rgba(255, 215, 0, 0.15)',
    goldBg: 'rgba(255, 215, 0, 0.1)',
  },

  // Text colors with opacity levels (Requirements: 32.6)
  text: {
    primary: '#ffffff', // 100%
    secondary: 'rgba(255, 255, 255, 0.7)', // 70%
    tertiary: 'rgba(255, 255, 255, 0.5)', // 50%
    muted: 'rgba(255, 255, 255, 0.4)', // 40%
    disabled: 'rgba(255, 255, 255, 0.3)', // 30%
  },

  // Border colors
  border: {
    default: 'rgba(100, 100, 150, 0.3)',
    hover: 'rgba(100, 100, 150, 0.5)',
    active: 'rgba(0, 255, 255, 0.5)',
    glow: 'rgba(0, 255, 255, 0.3)',
  },

  // Memory sector colors
  sector: {
    episodic: '#FFD700',
    semantic: '#00FFFF',
    procedural: '#9B59B6',
    emotional: '#FFA500',
    reflective: '#C0C0C0',
  },

  // Link type colors
  link: {
    semantic: '#3498DB',
    causal: '#E67E22',
    temporal: '#27AE60',
    analogical: '#9B59B6',
  },

  // Status colors
  status: {
    success: '#27AE60',
    successGlow: 'rgba(39, 174, 96, 0.3)',
    successBg: 'rgba(39, 174, 96, 0.15)',
    warning: '#F39C12',
    warningGlow: 'rgba(243, 156, 18, 0.3)',
    warningBg: 'rgba(243, 156, 18, 0.15)',
    error: '#E74C3C',
    errorGlow: 'rgba(231, 76, 60, 0.3)',
    errorBg: 'rgba(231, 76, 60, 0.15)',
    info: '#3498DB',
    infoGlow: 'rgba(52, 152, 219, 0.3)',
    infoBg: 'rgba(52, 152, 219, 0.15)',
  },
} as const;

// ============================================================================
// Glassmorphism Styles
// Requirements: 38.4, 38.5, 38.6
// ============================================================================

/**
 * Glassmorphism panel styles with different intensity levels
 */
export const glassmorphism = {
  /** Light glassmorphism for subtle panels */
  light: {
    background: 'rgba(15, 15, 25, 0.6)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(100, 100, 150, 0.2)',
    boxShadow: `
      0 0 15px rgba(0, 255, 255, 0.08),
      inset 0 0 20px rgba(0, 255, 255, 0.02)
    `,
  },

  /** Standard glassmorphism for most panels */
  standard: {
    background: 'rgba(15, 15, 25, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(100, 100, 150, 0.3)',
    boxShadow: `
      0 0 20px rgba(0, 255, 255, 0.15),
      0 0 40px rgba(0, 255, 255, 0.08),
      inset 0 0 30px rgba(0, 255, 255, 0.04)
    `,
  },

  /** Heavy glassmorphism for prominent panels */
  heavy: {
    background: 'rgba(15, 15, 25, 0.9)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(100, 100, 150, 0.4)',
    boxShadow: `
      0 0 25px rgba(0, 255, 255, 0.15),
      inset 0 0 40px rgba(0, 255, 255, 0.05)
    `,
  },

  /** Elevated panel with stronger shadow */
  elevated: {
    background: 'rgba(20, 20, 35, 0.9)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(100, 100, 150, 0.3)',
    boxShadow: `
      0 8px 32px rgba(0, 0, 0, 0.5),
      0 0 20px rgba(0, 255, 255, 0.2)
    `,
  },

  /** Floating panel for tooltips/popovers */
  floating: {
    background: 'rgba(25, 25, 40, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(100, 100, 150, 0.4)',
    boxShadow: `
      0 12px 48px rgba(0, 0, 0, 0.6),
      0 0 30px rgba(0, 255, 255, 0.15)
    `,
  },

  /** Sunken panel for input areas */
  sunken: {
    background: 'rgba(8, 8, 12, 0.9)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(60, 60, 80, 0.3)',
    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3)',
  },

  /** Glassmorphism with cyan glow border */
  glowCyan: {
    background: 'rgba(15, 15, 25, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    boxShadow: `
      0 0 20px rgba(0, 255, 255, 0.2),
      0 0 40px rgba(0, 255, 255, 0.1),
      inset 0 0 30px rgba(0, 255, 255, 0.05)
    `,
  },

  /** Glassmorphism with purple glow border */
  glowPurple: {
    background: 'rgba(15, 15, 25, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(155, 89, 182, 0.3)',
    boxShadow: `
      0 0 20px rgba(155, 89, 182, 0.2),
      0 0 40px rgba(155, 89, 182, 0.1),
      inset 0 0 30px rgba(155, 89, 182, 0.05)
    `,
  },

  /** Glassmorphism with gold glow border (for current/highlighted items) */
  glowGold: {
    background: 'rgba(15, 15, 25, 0.85)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 215, 0, 0.3)',
    boxShadow: `
      0 0 20px rgba(255, 215, 0, 0.2),
      0 0 40px rgba(255, 215, 0, 0.1),
      inset 0 0 30px rgba(255, 215, 0, 0.05)
    `,
  },
} as const;

// ============================================================================
// Neon Text Styles
// ============================================================================

/**
 * Neon text glow effects
 */
export const neonText = {
  cyan: {
    color: colors.accent.cyan,
    textShadow: `
      0 0 5px rgba(0, 255, 255, 0.5),
      0 0 10px rgba(0, 255, 255, 0.3),
      0 0 20px rgba(0, 255, 255, 0.2)
    `,
  },

  cyanSubtle: {
    color: colors.accent.cyan,
    textShadow: `
      0 0 5px rgba(0, 255, 255, 0.3),
      0 0 10px rgba(0, 255, 255, 0.15)
    `,
  },

  purple: {
    color: colors.accent.purple,
    textShadow: `
      0 0 5px rgba(155, 89, 182, 0.5),
      0 0 10px rgba(155, 89, 182, 0.3),
      0 0 20px rgba(155, 89, 182, 0.2)
    `,
  },

  gold: {
    color: colors.accent.gold,
    textShadow: `
      0 0 5px rgba(255, 215, 0, 0.5),
      0 0 10px rgba(255, 215, 0, 0.3),
      0 0 20px rgba(255, 215, 0, 0.2)
    `,
  },
} as const;

// ============================================================================
// Button Styles
// Requirements: 32.1, 32.2, 32.3, 32.4
// ============================================================================

/**
 * Button style variants
 */
export const buttonStyles = {
  /** Primary button with cyan accent */
  primary: {
    base: {
      background: 'rgba(0, 255, 255, 0.15)',
      border: '1px solid rgba(0, 255, 255, 0.3)',
      color: colors.accent.cyan,
      transition: `all ${transitions.duration.normal} ${transitions.easing.default}`,
    },
    hover: {
      background: 'rgba(0, 255, 255, 0.25)',
      border: '1px solid rgba(0, 255, 255, 0.5)',
      boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)',
    },
    active: {
      background: 'rgba(0, 255, 255, 0.35)',
      border: '1px solid rgba(0, 255, 255, 0.6)',
      transform: 'scale(0.95)',
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },

  /** Secondary button with purple accent */
  secondary: {
    base: {
      background: 'rgba(155, 89, 182, 0.15)',
      border: '1px solid rgba(155, 89, 182, 0.3)',
      color: colors.accent.purple,
      transition: `all ${transitions.duration.normal} ${transitions.easing.default}`,
    },
    hover: {
      background: 'rgba(155, 89, 182, 0.25)',
      border: '1px solid rgba(155, 89, 182, 0.5)',
      boxShadow: '0 0 15px rgba(155, 89, 182, 0.3)',
    },
    active: {
      background: 'rgba(155, 89, 182, 0.35)',
      border: '1px solid rgba(155, 89, 182, 0.6)',
      transform: 'scale(0.95)',
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },

  /** Destructive button with red accent */
  destructive: {
    base: {
      background: 'rgba(231, 76, 60, 0.15)',
      border: '1px solid rgba(231, 76, 60, 0.3)',
      color: colors.status.error,
      transition: `all ${transitions.duration.normal} ${transitions.easing.default}`,
    },
    hover: {
      background: 'rgba(231, 76, 60, 0.25)',
      border: '1px solid rgba(231, 76, 60, 0.5)',
      boxShadow: '0 0 15px rgba(231, 76, 60, 0.3)',
    },
    active: {
      background: 'rgba(231, 76, 60, 0.35)',
      border: '1px solid rgba(231, 76, 60, 0.6)',
      transform: 'scale(0.95)',
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },

  /** Ghost button (minimal styling) */
  ghost: {
    base: {
      background: 'transparent',
      border: '1px solid rgba(100, 100, 150, 0.3)',
      color: colors.text.secondary,
      transition: `all ${transitions.duration.normal} ${transitions.easing.default}`,
    },
    hover: {
      background: 'rgba(100, 100, 150, 0.15)',
      border: '1px solid rgba(100, 100, 150, 0.5)',
      color: colors.text.primary,
    },
    active: {
      background: 'rgba(100, 100, 150, 0.25)',
      transform: 'scale(0.95)',
    },
    disabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  },
} as const;

// ============================================================================
// CSS Class Generators
// ============================================================================

/**
 * Generate inline styles for glassmorphism panels
 */
export function getGlassPanelStyle(
  variant: keyof typeof glassmorphism = 'standard'
): React.CSSProperties {
  const style = glassmorphism[variant];
  return {
    background: style.background,
    backdropFilter: style.backdropFilter,
    WebkitBackdropFilter: style.backdropFilter, // Safari support
    border: style.border,
    boxShadow: style.boxShadow,
    borderRadius: borderRadius.lg,
  };
}

/**
 * Generate inline styles for neon text
 */
export function getNeonTextStyle(variant: keyof typeof neonText = 'cyan'): React.CSSProperties {
  return neonText[variant];
}

/**
 * Get sector color by type
 */
export function getSectorThemeColor(sector: string): string {
  const sectorKey = sector as keyof typeof colors.sector;
  if (sectorKey in colors.sector) {
    return colors.sector[sectorKey];
  }
  return colors.text.primary;
}

/**
 * Get link type color
 */
export function getLinkThemeColor(linkType: string): string {
  const linkKey = linkType as keyof typeof colors.link;
  if (linkKey in colors.link) {
    return colors.link[linkKey];
  }
  return colors.text.secondary;
}

// ============================================================================
// Tailwind Class Helpers
// ============================================================================

/**
 * Common Tailwind classes for glassmorphism panels
 */
export const twGlassPanel = {
  base: 'bg-ui-surface backdrop-blur-glass border border-ui-border rounded-lg',
  glow: 'bg-ui-surface backdrop-blur-glass-medium border border-ui-border rounded-lg shadow-panel',
  elevated:
    'bg-ui-surface-elevated backdrop-blur-glass-medium border border-ui-border rounded-lg shadow-panel-elevated',
  floating:
    'bg-ui-surface-overlay backdrop-blur-glass-heavy border border-ui-border rounded-lg shadow-panel-floating',
  sunken: 'bg-ui-surface-sunken backdrop-blur-glass-light border border-ui-border rounded-lg',
  glowCyan:
    'bg-ui-surface backdrop-blur-glass-medium border border-ui-accent-primary/30 rounded-lg shadow-glow',
  glowPurple:
    'bg-ui-surface backdrop-blur-glass-medium border border-sector-procedural/30 rounded-lg shadow-glow-purple',
  glowGold:
    'bg-ui-surface backdrop-blur-glass-medium border border-sector-episodic/30 rounded-lg shadow-glow-gold',
} as const;

/**
 * Common Tailwind classes for neon text
 */
export const twNeonText = {
  cyan: 'text-ui-accent-primary',
  purple: 'text-sector-procedural',
  gold: 'text-sector-episodic',
} as const;

/**
 * Common Tailwind classes for buttons
 * Requirements: 32.1, 32.2, 32.3, 32.4, 33.1
 */
export const twButton = {
  base: 'px-4 py-2 rounded-md font-medium transition-all duration-normal disabled:opacity-disabled disabled:cursor-not-allowed active:scale-95',
  primary: `
    bg-ui-accent-primary-bg border border-ui-accent-primary/30
    text-ui-accent-primary
    hover:bg-ui-accent-primary-subtle hover:border-ui-accent-primary/50 hover:shadow-glow-sm
    active:bg-ui-accent-primary/25 active:scale-95
  `,
  secondary: `
    bg-ui-accent-secondary-bg border border-ui-accent-secondary/30
    text-ui-accent-secondary
    hover:bg-ui-accent-secondary-subtle hover:border-ui-accent-secondary/50 hover:shadow-glow-purple-sm
    active:bg-ui-accent-secondary/25 active:scale-95
  `,
  destructive: `
    bg-status-error-bg border border-status-error/30
    text-status-error
    hover:bg-status-error/25 hover:border-status-error/50 hover:shadow-glow-error
    active:bg-status-error/35 active:scale-95
  `,
  ghost: `
    bg-transparent border border-ui-border
    text-ui-text-secondary
    hover:bg-ui-border/50 hover:text-ui-text-primary
    active:bg-ui-border active:scale-95
  `,
  icon: `
    p-2 rounded-md
    text-ui-text-secondary
    hover:text-ui-accent-primary hover:bg-ui-accent-primary-bg
    active:scale-95
  `,
} as const;

/**
 * Common Tailwind classes for inputs
 */
export const twInput = {
  base: `
    w-full px-4 py-2 rounded-md
    bg-ui-surface-sunken border border-ui-border
    text-ui-text-primary placeholder-ui-text-muted
    transition-all duration-normal
    focus:outline-none focus:border-ui-accent-primary/50 focus:shadow-glow-sm
  `,
  textarea: `
    w-full px-4 py-3 rounded-md resize-none
    bg-ui-surface-sunken border border-ui-border
    text-ui-text-primary placeholder-ui-text-muted
    transition-all duration-normal
    focus:outline-none focus:border-ui-accent-primary/50 focus:shadow-glow-sm
  `,
} as const;

export default {
  spacing,
  borderRadius,
  typography,
  transitions,
  colors,
  glassmorphism,
  neonText,
  buttonStyles,
  getGlassPanelStyle,
  getNeonTextStyle,
  getSectorThemeColor,
  getLinkThemeColor,
  twGlassPanel,
  twNeonText,
  twButton,
  twInput,
};
