/**
 * ThemeStore - Zustand store for theme management
 *
 * Manages multiple theme options with persistent storage.
 * Supports dark cosmic themes with different accent color palettes.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================================================
// Theme Definitions
// ============================================================================

export type ThemeId =
  | 'cosmic-cyan'
  | 'midnight-ocean'
  | 'sunset-ember'
  | 'forest-glow'
  | 'aurora-violet'
  | 'monochrome'
  | 'light-cloud'
  | 'light-mint'
  | 'light-rose'
  | 'light-sand';

export interface ThemeColors {
  // Primary accent (main actions, highlights)
  primary: string;
  primaryMuted: string;
  primaryGlow: string;
  primarySubtle: string;
  primaryBg: string;

  // Secondary accent (secondary actions)
  secondary: string;
  secondaryMuted: string;
  secondaryGlow: string;
  secondarySubtle: string;
  secondaryBg: string;

  // Highlight accent (current/selected items)
  highlight: string;
  highlightMuted: string;
  highlightGlow: string;
  highlightSubtle: string;
  highlightBg: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;

  // Surface colors
  surface: string;
  surfaceElevated: string;
  surfaceOverlay: string;
  surfaceSunken: string;

  // Border colors
  border: string;
  borderHover: string;
  borderActive: string;

  // Text colors (for light/dark theme support)
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: ThemeColors;
}

// ============================================================================
// Theme Palette Definitions
// ============================================================================

export const themes: Record<ThemeId, Theme> = {
  // Default cosmic cyan theme (original)
  'cosmic-cyan': {
    id: 'cosmic-cyan',
    name: 'Cosmic Cyan',
    description: 'The original dark cosmic theme with cyan accents',
    colors: {
      primary: '#00FFFF',
      primaryMuted: '#00CCCC',
      primaryGlow: 'rgba(0, 255, 255, 0.3)',
      primarySubtle: 'rgba(0, 255, 255, 0.15)',
      primaryBg: 'rgba(0, 255, 255, 0.1)',

      secondary: '#9B59B6',
      secondaryMuted: '#7D4A94',
      secondaryGlow: 'rgba(155, 89, 182, 0.3)',
      secondarySubtle: 'rgba(155, 89, 182, 0.15)',
      secondaryBg: 'rgba(155, 89, 182, 0.1)',

      highlight: '#FFD700',
      highlightMuted: '#CCAC00',
      highlightGlow: 'rgba(255, 215, 0, 0.3)',
      highlightSubtle: 'rgba(255, 215, 0, 0.15)',
      highlightBg: 'rgba(255, 215, 0, 0.1)',

      background: '#0a0a0f',
      backgroundSecondary: '#0d0d14',
      backgroundTertiary: '#12121a',

      surface: 'rgba(15, 15, 25, 0.85)',
      surfaceElevated: 'rgba(20, 20, 35, 0.9)',
      surfaceOverlay: 'rgba(25, 25, 40, 0.95)',
      surfaceSunken: 'rgba(8, 8, 12, 0.9)',

      border: 'rgba(100, 100, 150, 0.3)',
      borderHover: 'rgba(100, 100, 150, 0.5)',
      borderActive: 'rgba(0, 255, 255, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
    },
  },

  // Midnight ocean - deep blue tones
  'midnight-ocean': {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    description: 'Deep ocean blues with aquamarine highlights',
    colors: {
      primary: '#00D4FF',
      primaryMuted: '#00A8CC',
      primaryGlow: 'rgba(0, 212, 255, 0.3)',
      primarySubtle: 'rgba(0, 212, 255, 0.15)',
      primaryBg: 'rgba(0, 212, 255, 0.1)',

      secondary: '#5B8DEE',
      secondaryMuted: '#4A72C4',
      secondaryGlow: 'rgba(91, 141, 238, 0.3)',
      secondarySubtle: 'rgba(91, 141, 238, 0.15)',
      secondaryBg: 'rgba(91, 141, 238, 0.1)',

      highlight: '#7FFFD4',
      highlightMuted: '#66CCAA',
      highlightGlow: 'rgba(127, 255, 212, 0.3)',
      highlightSubtle: 'rgba(127, 255, 212, 0.15)',
      highlightBg: 'rgba(127, 255, 212, 0.1)',

      background: '#050a12',
      backgroundSecondary: '#081018',
      backgroundTertiary: '#0c1620',

      surface: 'rgba(8, 16, 30, 0.85)',
      surfaceElevated: 'rgba(12, 22, 40, 0.9)',
      surfaceOverlay: 'rgba(16, 28, 50, 0.95)',
      surfaceSunken: 'rgba(4, 8, 16, 0.9)',

      border: 'rgba(60, 100, 150, 0.3)',
      borderHover: 'rgba(60, 100, 150, 0.5)',
      borderActive: 'rgba(0, 212, 255, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
    },
  },

  // Sunset ember - warm orange/red tones
  'sunset-ember': {
    id: 'sunset-ember',
    name: 'Sunset Ember',
    description: 'Warm sunset colors with ember glows',
    colors: {
      primary: '#FF6B35',
      primaryMuted: '#CC5529',
      primaryGlow: 'rgba(255, 107, 53, 0.3)',
      primarySubtle: 'rgba(255, 107, 53, 0.15)',
      primaryBg: 'rgba(255, 107, 53, 0.1)',

      secondary: '#FFB347',
      secondaryMuted: '#CC8F39',
      secondaryGlow: 'rgba(255, 179, 71, 0.3)',
      secondarySubtle: 'rgba(255, 179, 71, 0.15)',
      secondaryBg: 'rgba(255, 179, 71, 0.1)',

      highlight: '#FF4757',
      highlightMuted: '#CC3946',
      highlightGlow: 'rgba(255, 71, 87, 0.3)',
      highlightSubtle: 'rgba(255, 71, 87, 0.15)',
      highlightBg: 'rgba(255, 71, 87, 0.1)',

      background: '#0f0808',
      backgroundSecondary: '#140c0c',
      backgroundTertiary: '#1a1010',

      surface: 'rgba(25, 15, 15, 0.85)',
      surfaceElevated: 'rgba(35, 20, 20, 0.9)',
      surfaceOverlay: 'rgba(45, 25, 25, 0.95)',
      surfaceSunken: 'rgba(12, 8, 8, 0.9)',

      border: 'rgba(150, 80, 60, 0.3)',
      borderHover: 'rgba(150, 80, 60, 0.5)',
      borderActive: 'rgba(255, 107, 53, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
    },
  },

  // Forest glow - green/emerald tones
  'forest-glow': {
    id: 'forest-glow',
    name: 'Forest Glow',
    description: 'Lush forest greens with emerald accents',
    colors: {
      primary: '#00FF88',
      primaryMuted: '#00CC6D',
      primaryGlow: 'rgba(0, 255, 136, 0.3)',
      primarySubtle: 'rgba(0, 255, 136, 0.15)',
      primaryBg: 'rgba(0, 255, 136, 0.1)',

      secondary: '#2ECC71',
      secondaryMuted: '#25A35A',
      secondaryGlow: 'rgba(46, 204, 113, 0.3)',
      secondarySubtle: 'rgba(46, 204, 113, 0.15)',
      secondaryBg: 'rgba(46, 204, 113, 0.1)',

      highlight: '#98FB98',
      highlightMuted: '#7AC97A',
      highlightGlow: 'rgba(152, 251, 152, 0.3)',
      highlightSubtle: 'rgba(152, 251, 152, 0.15)',
      highlightBg: 'rgba(152, 251, 152, 0.1)',

      background: '#060f08',
      backgroundSecondary: '#0a140c',
      backgroundTertiary: '#0e1a10',

      surface: 'rgba(10, 20, 15, 0.85)',
      surfaceElevated: 'rgba(15, 30, 20, 0.9)',
      surfaceOverlay: 'rgba(20, 40, 25, 0.95)',
      surfaceSunken: 'rgba(5, 10, 8, 0.9)',

      border: 'rgba(60, 120, 80, 0.3)',
      borderHover: 'rgba(60, 120, 80, 0.5)',
      borderActive: 'rgba(0, 255, 136, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
    },
  },

  // Aurora violet - purple/pink tones
  'aurora-violet': {
    id: 'aurora-violet',
    name: 'Aurora Violet',
    description: 'Northern lights inspired purple and pink',
    colors: {
      primary: '#BF40BF',
      primaryMuted: '#993399',
      primaryGlow: 'rgba(191, 64, 191, 0.3)',
      primarySubtle: 'rgba(191, 64, 191, 0.15)',
      primaryBg: 'rgba(191, 64, 191, 0.1)',

      secondary: '#FF69B4',
      secondaryMuted: '#CC5490',
      secondaryGlow: 'rgba(255, 105, 180, 0.3)',
      secondarySubtle: 'rgba(255, 105, 180, 0.15)',
      secondaryBg: 'rgba(255, 105, 180, 0.1)',

      highlight: '#E0B0FF',
      highlightMuted: '#B38DCC',
      highlightGlow: 'rgba(224, 176, 255, 0.3)',
      highlightSubtle: 'rgba(224, 176, 255, 0.15)',
      highlightBg: 'rgba(224, 176, 255, 0.1)',

      background: '#0a060f',
      backgroundSecondary: '#0e0a14',
      backgroundTertiary: '#140e1a',

      surface: 'rgba(20, 12, 25, 0.85)',
      surfaceElevated: 'rgba(28, 18, 35, 0.9)',
      surfaceOverlay: 'rgba(36, 24, 45, 0.95)',
      surfaceSunken: 'rgba(10, 6, 12, 0.9)',

      border: 'rgba(120, 80, 140, 0.3)',
      borderHover: 'rgba(120, 80, 140, 0.5)',
      borderActive: 'rgba(191, 64, 191, 0.5)',

      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
    },
  },

  // Monochrome - grayscale with white accents
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Clean grayscale with subtle white accents',
    colors: {
      primary: '#FFFFFF',
      primaryMuted: '#CCCCCC',
      primaryGlow: 'rgba(255, 255, 255, 0.25)',
      primarySubtle: 'rgba(255, 255, 255, 0.12)',
      primaryBg: 'rgba(255, 255, 255, 0.08)',

      secondary: '#A0A0A0',
      secondaryMuted: '#808080',
      secondaryGlow: 'rgba(160, 160, 160, 0.25)',
      secondarySubtle: 'rgba(160, 160, 160, 0.12)',
      secondaryBg: 'rgba(160, 160, 160, 0.08)',

      highlight: '#E0E0E0',
      highlightMuted: '#B0B0B0',
      highlightGlow: 'rgba(224, 224, 224, 0.25)',
      highlightSubtle: 'rgba(224, 224, 224, 0.12)',
      highlightBg: 'rgba(224, 224, 224, 0.08)',

      background: '#0a0a0a',
      backgroundSecondary: '#101010',
      backgroundTertiary: '#161616',

      surface: 'rgba(20, 20, 20, 0.85)',
      surfaceElevated: 'rgba(28, 28, 28, 0.9)',
      surfaceOverlay: 'rgba(36, 36, 36, 0.95)',
      surfaceSunken: 'rgba(10, 10, 10, 0.9)',

      border: 'rgba(100, 100, 100, 0.3)',
      borderHover: 'rgba(100, 100, 100, 0.5)',
      borderActive: 'rgba(255, 255, 255, 0.4)',

      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
    },
  },

  // ============================================================================
  // LIGHT THEMES
  // ============================================================================

  // Light Cloud - Clean light theme with blue accents
  'light-cloud': {
    id: 'light-cloud',
    name: 'Light Cloud',
    description: 'Clean light theme with soft blue accents',
    colors: {
      primary: '#0066CC',
      primaryMuted: '#0052A3',
      primaryGlow: 'rgba(0, 102, 204, 0.3)',
      primarySubtle: 'rgba(0, 102, 204, 0.15)',
      primaryBg: 'rgba(0, 102, 204, 0.1)',

      secondary: '#4B5563',
      secondaryMuted: '#374151',
      secondaryGlow: 'rgba(75, 85, 99, 0.3)',
      secondarySubtle: 'rgba(75, 85, 99, 0.15)',
      secondaryBg: 'rgba(75, 85, 99, 0.1)',

      highlight: '#D97706',
      highlightMuted: '#B45309',
      highlightGlow: 'rgba(217, 119, 6, 0.3)',
      highlightSubtle: 'rgba(217, 119, 6, 0.15)',
      highlightBg: 'rgba(217, 119, 6, 0.1)',

      background: '#F8FAFC',
      backgroundSecondary: '#F1F5F9',
      backgroundTertiary: '#E2E8F0',

      surface: 'rgba(255, 255, 255, 0.95)',
      surfaceElevated: 'rgba(255, 255, 255, 0.98)',
      surfaceOverlay: 'rgba(255, 255, 255, 1)',
      surfaceSunken: 'rgba(241, 245, 249, 1)',

      border: 'rgba(0, 0, 0, 0.12)',
      borderHover: 'rgba(0, 0, 0, 0.2)',
      borderActive: 'rgba(0, 102, 204, 0.6)',

      textPrimary: '#1E293B',
      textSecondary: '#475569',
      textMuted: '#64748B',
    },
  },

  // Light Mint - Fresh light theme with green accents
  'light-mint': {
    id: 'light-mint',
    name: 'Light Mint',
    description: 'Fresh light theme with mint green accents',
    colors: {
      primary: '#047857',
      primaryMuted: '#065F46',
      primaryGlow: 'rgba(4, 120, 87, 0.3)',
      primarySubtle: 'rgba(4, 120, 87, 0.15)',
      primaryBg: 'rgba(4, 120, 87, 0.1)',

      secondary: '#0F766E',
      secondaryMuted: '#115E59',
      secondaryGlow: 'rgba(15, 118, 110, 0.3)',
      secondarySubtle: 'rgba(15, 118, 110, 0.15)',
      secondaryBg: 'rgba(15, 118, 110, 0.1)',

      highlight: '#059669',
      highlightMuted: '#047857',
      highlightGlow: 'rgba(5, 150, 105, 0.3)',
      highlightSubtle: 'rgba(5, 150, 105, 0.15)',
      highlightBg: 'rgba(5, 150, 105, 0.1)',

      background: '#F0FDF4',
      backgroundSecondary: '#ECFDF5',
      backgroundTertiary: '#D1FAE5',

      surface: 'rgba(255, 255, 255, 0.95)',
      surfaceElevated: 'rgba(255, 255, 255, 0.98)',
      surfaceOverlay: 'rgba(255, 255, 255, 1)',
      surfaceSunken: 'rgba(236, 253, 245, 1)',

      border: 'rgba(0, 0, 0, 0.1)',
      borderHover: 'rgba(0, 0, 0, 0.18)',
      borderActive: 'rgba(4, 120, 87, 0.6)',

      textPrimary: '#14532D',
      textSecondary: '#166534',
      textMuted: '#15803D',
    },
  },

  // Light Rose - Warm light theme with rose/pink accents
  'light-rose': {
    id: 'light-rose',
    name: 'Light Rose',
    description: 'Warm light theme with soft rose accents',
    colors: {
      primary: '#BE185D',
      primaryMuted: '#9D174D',
      primaryGlow: 'rgba(190, 24, 93, 0.3)',
      primarySubtle: 'rgba(190, 24, 93, 0.15)',
      primaryBg: 'rgba(190, 24, 93, 0.1)',

      secondary: '#7C3AED',
      secondaryMuted: '#6D28D9',
      secondaryGlow: 'rgba(124, 58, 237, 0.3)',
      secondarySubtle: 'rgba(124, 58, 237, 0.15)',
      secondaryBg: 'rgba(124, 58, 237, 0.1)',

      highlight: '#DB2777',
      highlightMuted: '#BE185D',
      highlightGlow: 'rgba(219, 39, 119, 0.3)',
      highlightSubtle: 'rgba(219, 39, 119, 0.15)',
      highlightBg: 'rgba(219, 39, 119, 0.1)',

      background: '#FDF2F8',
      backgroundSecondary: '#FCE7F3',
      backgroundTertiary: '#FBCFE8',

      surface: 'rgba(255, 255, 255, 0.95)',
      surfaceElevated: 'rgba(255, 255, 255, 0.98)',
      surfaceOverlay: 'rgba(255, 255, 255, 1)',
      surfaceSunken: 'rgba(252, 231, 243, 1)',

      border: 'rgba(0, 0, 0, 0.1)',
      borderHover: 'rgba(0, 0, 0, 0.18)',
      borderActive: 'rgba(190, 24, 93, 0.6)',

      textPrimary: '#831843',
      textSecondary: '#9D174D',
      textMuted: '#BE185D',
    },
  },

  // Light Sand - Neutral warm light theme
  'light-sand': {
    id: 'light-sand',
    name: 'Light Sand',
    description: 'Warm neutral light theme with earthy tones',
    colors: {
      primary: '#92400E',
      primaryMuted: '#78350F',
      primaryGlow: 'rgba(146, 64, 14, 0.3)',
      primarySubtle: 'rgba(146, 64, 14, 0.15)',
      primaryBg: 'rgba(146, 64, 14, 0.1)',

      secondary: '#854D0E',
      secondaryMuted: '#713F12',
      secondaryGlow: 'rgba(133, 77, 14, 0.3)',
      secondarySubtle: 'rgba(133, 77, 14, 0.15)',
      secondaryBg: 'rgba(133, 77, 14, 0.1)',

      highlight: '#B45309',
      highlightMuted: '#92400E',
      highlightGlow: 'rgba(180, 83, 9, 0.3)',
      highlightSubtle: 'rgba(180, 83, 9, 0.15)',
      highlightBg: 'rgba(180, 83, 9, 0.1)',

      background: '#FFFBEB',
      backgroundSecondary: '#FEF3C7',
      backgroundTertiary: '#FDE68A',

      surface: 'rgba(255, 255, 255, 0.95)',
      surfaceElevated: 'rgba(255, 255, 255, 0.98)',
      surfaceOverlay: 'rgba(255, 255, 255, 1)',
      surfaceSunken: 'rgba(254, 243, 199, 1)',

      border: 'rgba(0, 0, 0, 0.1)',
      borderHover: 'rgba(0, 0, 0, 0.18)',
      borderActive: 'rgba(146, 64, 14, 0.6)',

      textPrimary: '#78350F',
      textSecondary: '#92400E',
      textMuted: '#A16207',
    },
  },
};

// ============================================================================
// Store Types
// ============================================================================

export interface ThemeState {
  /** Current active theme ID */
  currentTheme: ThemeId;
  /** Whether to use system preference for reduced motion */
  respectReducedMotion: boolean;
  /** Whether to use high contrast mode */
  highContrast: boolean;
}

export interface ThemeActions {
  /** Set the current theme */
  setTheme: (themeId: ThemeId) => void;
  /** Toggle reduced motion preference */
  toggleReducedMotion: () => void;
  /** Toggle high contrast mode */
  toggleHighContrast: () => void;
  /** Get the current theme object */
  getTheme: () => Theme;
  /** Get CSS custom properties for the current theme */
  getCSSVariables: () => Record<string, string>;
}

export type ThemeStore = ThemeState & ThemeActions;

// ============================================================================
// Default Values
// ============================================================================

const initialState: ThemeState = {
  currentTheme: 'cosmic-cyan',
  respectReducedMotion: true,
  highContrast: false,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTheme: (themeId: ThemeId): void => {
        set({ currentTheme: themeId });
        // Apply theme CSS variables to document
        const theme = themes[themeId];
        applyThemeToDocument(theme);
      },

      toggleReducedMotion: (): void => {
        set((state) => {
          const newValue = !state.respectReducedMotion;
          applyReducedMotion(newValue);
          return { respectReducedMotion: newValue };
        });
      },

      toggleHighContrast: (): void => {
        set((state) => {
          const newValue = !state.highContrast;
          applyHighContrast(newValue);
          return { highContrast: newValue };
        });
      },

      getTheme: (): Theme => {
        const state = get();
        return themes[state.currentTheme];
      },

      getCSSVariables: (): Record<string, string> => {
        const theme = get().getTheme();
        return themeToCSSVariables(theme);
      },
    }),
    {
      name: 'thoughtmcp-theme',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        respectReducedMotion: state.respectReducedMotion,
        highContrast: state.highContrast,
      }),
    }
  )
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert theme colors to CSS custom properties
 */
function themeToCSSVariables(theme: Theme): Record<string, string> {
  const { colors } = theme;
  return {
    '--theme-primary': colors.primary,
    '--theme-primary-muted': colors.primaryMuted,
    '--theme-primary-glow': colors.primaryGlow,
    '--theme-primary-subtle': colors.primarySubtle,
    '--theme-primary-bg': colors.primaryBg,

    '--theme-secondary': colors.secondary,
    '--theme-secondary-muted': colors.secondaryMuted,
    '--theme-secondary-glow': colors.secondaryGlow,
    '--theme-secondary-subtle': colors.secondarySubtle,
    '--theme-secondary-bg': colors.secondaryBg,

    '--theme-highlight': colors.highlight,
    '--theme-highlight-muted': colors.highlightMuted,
    '--theme-highlight-glow': colors.highlightGlow,
    '--theme-highlight-subtle': colors.highlightSubtle,
    '--theme-highlight-bg': colors.highlightBg,

    '--theme-background': colors.background,
    '--theme-background-secondary': colors.backgroundSecondary,
    '--theme-background-tertiary': colors.backgroundTertiary,

    '--theme-surface': colors.surface,
    '--theme-surface-elevated': colors.surfaceElevated,
    '--theme-surface-overlay': colors.surfaceOverlay,
    '--theme-surface-sunken': colors.surfaceSunken,

    '--theme-border': colors.border,
    '--theme-border-hover': colors.borderHover,
    '--theme-border-active': colors.borderActive,

    '--theme-text-primary': colors.textPrimary,
    '--theme-text-secondary': colors.textSecondary,
    '--theme-text-muted': colors.textMuted,
  };
}

/**
 * Apply theme CSS variables to the document root
 */
function applyThemeToDocument(theme: Theme): void {
  const variables = themeToCSSVariables(theme);
  const root = document.documentElement;

  for (const [property, value] of Object.entries(variables)) {
    root.style.setProperty(property, value);
  }

  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme.id);

  // Set light/dark mode attribute for theme-specific styling
  const isLightTheme = theme.id.startsWith('light-');
  root.setAttribute('data-theme-mode', isLightTheme ? 'light' : 'dark');
}

/**
 * Apply reduced motion setting to the document
 */
function applyReducedMotion(enabled: boolean): void {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-reduced-motion', 'true');
    root.classList.add('reduce-motion');
  } else {
    root.removeAttribute('data-reduced-motion');
    root.classList.remove('reduce-motion');
  }
}

/**
 * Apply high contrast setting to the document
 */
function applyHighContrast(enabled: boolean): void {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute('data-high-contrast', 'true');
    root.classList.add('high-contrast');
  } else {
    root.removeAttribute('data-high-contrast');
    root.classList.remove('high-contrast');
  }
}

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentTheme = (state: ThemeStore): ThemeId => state.currentTheme;
export const selectReducedMotion = (state: ThemeStore): boolean => state.respectReducedMotion;
export const selectHighContrast = (state: ThemeStore): boolean => state.highContrast;

// ============================================================================
// Theme Initialization Hook
// ============================================================================

/**
 * Initialize theme on app load
 * Call this in App.tsx or main.tsx
 */
export function initializeTheme(): void {
  const state = useThemeStore.getState();
  const theme = themes[state.currentTheme];
  applyThemeToDocument(theme);
  applyReducedMotion(state.respectReducedMotion);
  applyHighContrast(state.highContrast);
}
