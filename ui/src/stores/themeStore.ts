/**
 * ThemeStore - Zustand store for theme management
 *
 * Manages theme options with persistent storage.
 * Consolidated to 5 distinct themes with meaningful visual differences.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ============================================================================
// Theme Definitions
// ============================================================================

export type ThemeId = 'cosmic' | 'ember' | 'monochrome' | 'light' | 'high-contrast';

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
  isLight: boolean;
}

// ============================================================================
// Theme Palette Definitions
// ============================================================================

export const themes: Record<ThemeId, Theme> = {
  // Cosmic - Neon cyberpunk with cyan accents (the original)
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic',
    description: 'Neon cyberpunk with cyan and purple accents',
    isLight: false,
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

  // Ember - Warm, cozy dark theme with orange/amber tones
  ember: {
    id: 'ember',
    name: 'Ember',
    description: 'Warm and cozy with orange and amber tones',
    isLight: false,
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

  // Monochrome - Clean grayscale with white accents
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Clean and minimal grayscale',
    isLight: false,
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

  // Light - Clean, professional light theme
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean and professional light theme',
    isLight: true,
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

      highlight: '#B45309',
      highlightMuted: '#92400E',
      highlightGlow: 'rgba(180, 83, 9, 0.3)',
      highlightSubtle: 'rgba(180, 83, 9, 0.15)',
      highlightBg: 'rgba(180, 83, 9, 0.1)',

      background: '#F8FAFC',
      backgroundSecondary: '#F1F5F9',
      backgroundTertiary: '#E2E8F0',

      surface: 'rgba(255, 255, 255, 0.95)',
      surfaceElevated: 'rgba(255, 255, 255, 0.98)',
      surfaceOverlay: 'rgba(255, 255, 255, 1)',
      surfaceSunken: 'rgba(241, 245, 249, 1)',

      border: 'rgba(0, 0, 0, 0.15)',
      borderHover: 'rgba(0, 0, 0, 0.25)',
      borderActive: 'rgba(0, 102, 204, 0.6)',

      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#475569',
    },
  },

  // High Contrast - Maximum contrast for accessibility
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    isLight: false,
    colors: {
      primary: '#00FF00',
      primaryMuted: '#00CC00',
      primaryGlow: 'rgba(0, 255, 0, 0.4)',
      primarySubtle: 'rgba(0, 255, 0, 0.2)',
      primaryBg: 'rgba(0, 255, 0, 0.15)',

      secondary: '#FFFF00',
      secondaryMuted: '#CCCC00',
      secondaryGlow: 'rgba(255, 255, 0, 0.4)',
      secondarySubtle: 'rgba(255, 255, 0, 0.2)',
      secondaryBg: 'rgba(255, 255, 0, 0.15)',

      highlight: '#FF00FF',
      highlightMuted: '#CC00CC',
      highlightGlow: 'rgba(255, 0, 255, 0.4)',
      highlightSubtle: 'rgba(255, 0, 255, 0.2)',
      highlightBg: 'rgba(255, 0, 255, 0.15)',

      background: '#000000',
      backgroundSecondary: '#0a0a0a',
      backgroundTertiary: '#141414',

      surface: 'rgba(0, 0, 0, 0.95)',
      surfaceElevated: 'rgba(20, 20, 20, 0.95)',
      surfaceOverlay: 'rgba(30, 30, 30, 0.98)',
      surfaceSunken: 'rgba(0, 0, 0, 1)',

      border: 'rgba(255, 255, 255, 0.6)',
      borderHover: 'rgba(255, 255, 255, 0.8)',
      borderActive: 'rgba(0, 255, 0, 0.9)',

      textPrimary: '#FFFFFF',
      textSecondary: '#FFFFFF',
      textMuted: 'rgba(255, 255, 255, 0.9)',
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
}

export interface ThemeActions {
  /** Set the current theme */
  setTheme: (themeId: ThemeId) => void;
  /** Toggle reduced motion preference */
  toggleReducedMotion: () => void;
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
  currentTheme: 'cosmic',
  respectReducedMotion: false,
};

// ============================================================================
// Theme Migration
// ============================================================================

/**
 * Map old theme IDs to new consolidated themes
 */
const THEME_MIGRATION_MAP: Record<string, ThemeId> = {
  // Old dark themes -> new equivalents
  'cosmic-cyan': 'cosmic',
  'midnight-ocean': 'cosmic',
  'sunset-ember': 'ember',
  'forest-glow': 'cosmic',
  'aurora-violet': 'cosmic',
  // Old light themes -> light
  'light-cloud': 'light',
  'light-mint': 'light',
  'light-rose': 'light',
  'light-sand': 'light',
  // Already valid
  cosmic: 'cosmic',
  ember: 'ember',
  monochrome: 'monochrome',
  light: 'light',
  'high-contrast': 'high-contrast',
};

/**
 * Migrate old theme ID to new theme ID
 */
function migrateThemeId(themeId: string): ThemeId {
  return THEME_MIGRATION_MAP[themeId] || 'cosmic';
}

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
      partialize: (state): Pick<ThemeState, 'currentTheme' | 'respectReducedMotion'> => ({
        currentTheme: state.currentTheme,
        respectReducedMotion: state.respectReducedMotion,
      }),
      // Migrate old theme IDs when loading from storage
      onRehydrateStorage:
        (): ((state: ThemeStore | undefined) => void) =>
        (state): void => {
          if (state) {
            const migratedTheme = migrateThemeId(state.currentTheme);
            if (migratedTheme !== state.currentTheme) {
              state.currentTheme = migratedTheme;
            }
          }
        },
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
  root.setAttribute('data-theme-mode', theme.isLight ? 'light' : 'dark');

  // High contrast theme automatically enables high contrast mode
  if (theme.id === 'high-contrast') {
    root.setAttribute('data-high-contrast', 'true');
    root.classList.add('high-contrast');
  } else {
    root.removeAttribute('data-high-contrast');
    root.classList.remove('high-contrast');
  }
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

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentTheme = (state: ThemeStore): ThemeId => state.currentTheme;
export const selectReducedMotion = (state: ThemeStore): boolean => state.respectReducedMotion;

// ============================================================================
// Theme Initialization Hook
// ============================================================================

/**
 * Initialize theme on app load
 * Call this in App.tsx or main.tsx
 */
export function initializeTheme(): void {
  const state = useThemeStore.getState();
  // Migrate theme if needed
  const migratedTheme = migrateThemeId(state.currentTheme);
  if (migratedTheme !== state.currentTheme) {
    useThemeStore.setState({ currentTheme: migratedTheme });
  }
  const theme = themes[migratedTheme];
  applyThemeToDocument(theme);
  applyReducedMotion(state.respectReducedMotion);
}
