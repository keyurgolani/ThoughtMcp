/**
 * ThemeStore - Zustand store for theme management
 *
 * Manages 8 thoughtfully designed color schemes (4 dark, 4 light)
 * for a cognitive memory/reasoning application.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ============================================================================
// Theme Definitions
// ============================================================================

export type ThemeId =
  | "cosmic"
  | "ember"
  | "forest"
  | "midnight"
  | "dawn"
  | "arctic"
  | "sage"
  | "pearl";

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
// Theme Palette Definitions - 4 Dark Themes
// ============================================================================

export const themes: Record<ThemeId, Theme> = {
  // ============================================================================
  // DARK THEMES
  // ============================================================================

  // Cosmic - Neon cyberpunk with cyan/purple accents (default)
  cosmic: {
    id: "cosmic",
    name: "Cosmic",
    description: "Neon cyberpunk with cyan and purple accents",
    isLight: false,
    colors: {
      primary: "#00FFFF",
      primaryMuted: "#00CCCC",
      primaryGlow: "rgba(0, 255, 255, 0.3)",
      primarySubtle: "rgba(0, 255, 255, 0.15)",
      primaryBg: "rgba(0, 255, 255, 0.1)",

      secondary: "#9B59B6",
      secondaryMuted: "#7D4A94",
      secondaryGlow: "rgba(155, 89, 182, 0.3)",
      secondarySubtle: "rgba(155, 89, 182, 0.15)",
      secondaryBg: "rgba(155, 89, 182, 0.1)",

      highlight: "#FFD700",
      highlightMuted: "#CCAC00",
      highlightGlow: "rgba(255, 215, 0, 0.3)",
      highlightSubtle: "rgba(255, 215, 0, 0.15)",
      highlightBg: "rgba(255, 215, 0, 0.1)",

      background: "#0a0a0f",
      backgroundSecondary: "#0d0d14",
      backgroundTertiary: "#12121a",

      surface: "rgba(15, 15, 25, 0.85)",
      surfaceElevated: "rgba(20, 20, 35, 0.9)",
      surfaceOverlay: "rgba(25, 25, 40, 0.95)",
      surfaceSunken: "rgba(8, 8, 12, 0.9)",

      border: "rgba(100, 100, 150, 0.3)",
      borderHover: "rgba(100, 100, 150, 0.5)",
      borderActive: "rgba(0, 255, 255, 0.5)",

      textPrimary: "#ffffff",
      textSecondary: "rgba(255, 255, 255, 0.7)",
      textMuted: "rgba(255, 255, 255, 0.5)",
    },
  },

  // Ember - Warm orange/amber tones
  ember: {
    id: "ember",
    name: "Ember",
    description: "Warm and cozy with orange and amber tones",
    isLight: false,
    colors: {
      primary: "#FF6B35",
      primaryMuted: "#E55A2B",
      primaryGlow: "rgba(255, 107, 53, 0.3)",
      primarySubtle: "rgba(255, 107, 53, 0.15)",
      primaryBg: "rgba(255, 107, 53, 0.1)",

      secondary: "#FFB347",
      secondaryMuted: "#E5A03F",
      secondaryGlow: "rgba(255, 179, 71, 0.3)",
      secondarySubtle: "rgba(255, 179, 71, 0.15)",
      secondaryBg: "rgba(255, 179, 71, 0.1)",

      highlight: "#FF4757",
      highlightMuted: "#E53E4D",
      highlightGlow: "rgba(255, 71, 87, 0.3)",
      highlightSubtle: "rgba(255, 71, 87, 0.15)",
      highlightBg: "rgba(255, 71, 87, 0.1)",

      background: "#0f0908",
      backgroundSecondary: "#140d0b",
      backgroundTertiary: "#1a1210",

      surface: "rgba(25, 18, 15, 0.85)",
      surfaceElevated: "rgba(35, 25, 20, 0.9)",
      surfaceOverlay: "rgba(45, 32, 25, 0.95)",
      surfaceSunken: "rgba(12, 8, 6, 0.9)",

      border: "rgba(150, 100, 80, 0.3)",
      borderHover: "rgba(150, 100, 80, 0.5)",
      borderActive: "rgba(255, 107, 53, 0.5)",

      textPrimary: "#ffffff",
      textSecondary: "rgba(255, 255, 255, 0.7)",
      textMuted: "rgba(255, 255, 255, 0.5)",
    },
  },

  // Forest - Deep greens and earth tones
  forest: {
    id: "forest",
    name: "Forest",
    description: "Deep greens and natural earth tones",
    isLight: false,
    colors: {
      primary: "#4ADE80",
      primaryMuted: "#3CC96E",
      primaryGlow: "rgba(74, 222, 128, 0.3)",
      primarySubtle: "rgba(74, 222, 128, 0.15)",
      primaryBg: "rgba(74, 222, 128, 0.1)",

      secondary: "#A3E635",
      secondaryMuted: "#8FCC2E",
      secondaryGlow: "rgba(163, 230, 53, 0.3)",
      secondarySubtle: "rgba(163, 230, 53, 0.15)",
      secondaryBg: "rgba(163, 230, 53, 0.1)",

      highlight: "#34D399",
      highlightMuted: "#2DBD87",
      highlightGlow: "rgba(52, 211, 153, 0.3)",
      highlightSubtle: "rgba(52, 211, 153, 0.15)",
      highlightBg: "rgba(52, 211, 153, 0.1)",

      background: "#080f0a",
      backgroundSecondary: "#0b140d",
      backgroundTertiary: "#101a12",

      surface: "rgba(15, 25, 18, 0.85)",
      surfaceElevated: "rgba(20, 35, 25, 0.9)",
      surfaceOverlay: "rgba(25, 45, 32, 0.95)",
      surfaceSunken: "rgba(6, 12, 8, 0.9)",

      border: "rgba(80, 130, 100, 0.3)",
      borderHover: "rgba(80, 130, 100, 0.5)",
      borderActive: "rgba(74, 222, 128, 0.5)",

      textPrimary: "#ffffff",
      textSecondary: "rgba(255, 255, 255, 0.7)",
      textMuted: "rgba(255, 255, 255, 0.5)",
    },
  },

  // Midnight - Deep blues and silver accents
  midnight: {
    id: "midnight",
    name: "Midnight",
    description: "Deep blues with elegant silver accents",
    isLight: false,
    colors: {
      primary: "#60A5FA",
      primaryMuted: "#4B91E5",
      primaryGlow: "rgba(96, 165, 250, 0.3)",
      primarySubtle: "rgba(96, 165, 250, 0.15)",
      primaryBg: "rgba(96, 165, 250, 0.1)",

      secondary: "#A78BFA",
      secondaryMuted: "#9277E5",
      secondaryGlow: "rgba(167, 139, 250, 0.3)",
      secondarySubtle: "rgba(167, 139, 250, 0.15)",
      secondaryBg: "rgba(167, 139, 250, 0.1)",

      highlight: "#C0C0C0",
      highlightMuted: "#A8A8A8",
      highlightGlow: "rgba(192, 192, 192, 0.3)",
      highlightSubtle: "rgba(192, 192, 192, 0.15)",
      highlightBg: "rgba(192, 192, 192, 0.1)",

      background: "#080a10",
      backgroundSecondary: "#0b0e16",
      backgroundTertiary: "#10141e",

      surface: "rgba(15, 18, 30, 0.85)",
      surfaceElevated: "rgba(20, 25, 42, 0.9)",
      surfaceOverlay: "rgba(25, 32, 55, 0.95)",
      surfaceSunken: "rgba(6, 8, 14, 0.9)",

      border: "rgba(80, 100, 150, 0.3)",
      borderHover: "rgba(80, 100, 150, 0.5)",
      borderActive: "rgba(96, 165, 250, 0.5)",

      textPrimary: "#ffffff",
      textSecondary: "rgba(255, 255, 255, 0.7)",
      textMuted: "rgba(255, 255, 255, 0.5)",
    },
  },

  // ============================================================================
  // LIGHT THEMES
  // ============================================================================

  // Dawn - Soft warm light theme with coral/peach accents
  dawn: {
    id: "dawn",
    name: "Dawn",
    description: "Soft warm light with coral and peach accents",
    isLight: true,
    colors: {
      primary: "#E11D48",
      primaryMuted: "#BE123C",
      primaryGlow: "rgba(225, 29, 72, 0.25)",
      primarySubtle: "rgba(225, 29, 72, 0.12)",
      primaryBg: "rgba(225, 29, 72, 0.08)",

      secondary: "#F97316",
      secondaryMuted: "#EA580C",
      secondaryGlow: "rgba(249, 115, 22, 0.25)",
      secondarySubtle: "rgba(249, 115, 22, 0.12)",
      secondaryBg: "rgba(249, 115, 22, 0.08)",

      highlight: "#DB2777",
      highlightMuted: "#BE185D",
      highlightGlow: "rgba(219, 39, 119, 0.25)",
      highlightSubtle: "rgba(219, 39, 119, 0.12)",
      highlightBg: "rgba(219, 39, 119, 0.08)",

      background: "#FFFBF5",
      backgroundSecondary: "#FFF7ED",
      backgroundTertiary: "#FFEDD5",

      surface: "rgba(255, 255, 255, 0.95)",
      surfaceElevated: "rgba(255, 255, 255, 0.98)",
      surfaceOverlay: "rgba(255, 255, 255, 1)",
      surfaceSunken: "rgba(255, 237, 213, 0.6)",

      border: "rgba(0, 0, 0, 0.12)",
      borderHover: "rgba(0, 0, 0, 0.2)",
      borderActive: "rgba(225, 29, 72, 0.5)",

      textPrimary: "#1C1917",
      textSecondary: "#44403C",
      textMuted: "#78716C",
    },
  },

  // Arctic - Cool crisp light theme with blue accents
  arctic: {
    id: "arctic",
    name: "Arctic",
    description: "Cool and crisp with blue accents",
    isLight: true,
    colors: {
      primary: "#0284C7",
      primaryMuted: "#0369A1",
      primaryGlow: "rgba(2, 132, 199, 0.25)",
      primarySubtle: "rgba(2, 132, 199, 0.12)",
      primaryBg: "rgba(2, 132, 199, 0.08)",

      secondary: "#0891B2",
      secondaryMuted: "#0E7490",
      secondaryGlow: "rgba(8, 145, 178, 0.25)",
      secondarySubtle: "rgba(8, 145, 178, 0.12)",
      secondaryBg: "rgba(8, 145, 178, 0.08)",

      highlight: "#2563EB",
      highlightMuted: "#1D4ED8",
      highlightGlow: "rgba(37, 99, 235, 0.25)",
      highlightSubtle: "rgba(37, 99, 235, 0.12)",
      highlightBg: "rgba(37, 99, 235, 0.08)",

      background: "#F8FAFC",
      backgroundSecondary: "#F1F5F9",
      backgroundTertiary: "#E2E8F0",

      surface: "rgba(255, 255, 255, 0.95)",
      surfaceElevated: "rgba(255, 255, 255, 0.98)",
      surfaceOverlay: "rgba(255, 255, 255, 1)",
      surfaceSunken: "rgba(241, 245, 249, 0.8)",

      border: "rgba(0, 0, 0, 0.1)",
      borderHover: "rgba(0, 0, 0, 0.18)",
      borderActive: "rgba(2, 132, 199, 0.5)",

      textPrimary: "#0F172A",
      textSecondary: "#334155",
      textMuted: "#64748B",
    },
  },

  // Sage - Natural light theme with green accents
  sage: {
    id: "sage",
    name: "Sage",
    description: "Natural and calming with green accents",
    isLight: true,
    colors: {
      primary: "#059669",
      primaryMuted: "#047857",
      primaryGlow: "rgba(5, 150, 105, 0.25)",
      primarySubtle: "rgba(5, 150, 105, 0.12)",
      primaryBg: "rgba(5, 150, 105, 0.08)",

      secondary: "#0D9488",
      secondaryMuted: "#0F766E",
      secondaryGlow: "rgba(13, 148, 136, 0.25)",
      secondarySubtle: "rgba(13, 148, 136, 0.12)",
      secondaryBg: "rgba(13, 148, 136, 0.08)",

      highlight: "#16A34A",
      highlightMuted: "#15803D",
      highlightGlow: "rgba(22, 163, 74, 0.25)",
      highlightSubtle: "rgba(22, 163, 74, 0.12)",
      highlightBg: "rgba(22, 163, 74, 0.08)",

      background: "#F7FDF9",
      backgroundSecondary: "#ECFDF5",
      backgroundTertiary: "#D1FAE5",

      surface: "rgba(255, 255, 255, 0.95)",
      surfaceElevated: "rgba(255, 255, 255, 0.98)",
      surfaceOverlay: "rgba(255, 255, 255, 1)",
      surfaceSunken: "rgba(209, 250, 229, 0.5)",

      border: "rgba(0, 0, 0, 0.1)",
      borderHover: "rgba(0, 0, 0, 0.18)",
      borderActive: "rgba(5, 150, 105, 0.5)",

      textPrimary: "#14532D",
      textSecondary: "#166534",
      textMuted: "#4D7C5F",
    },
  },

  // Pearl - Clean minimal light theme with purple accents
  pearl: {
    id: "pearl",
    name: "Pearl",
    description: "Clean and minimal with purple accents",
    isLight: true,
    colors: {
      primary: "#7C3AED",
      primaryMuted: "#6D28D9",
      primaryGlow: "rgba(124, 58, 237, 0.25)",
      primarySubtle: "rgba(124, 58, 237, 0.12)",
      primaryBg: "rgba(124, 58, 237, 0.08)",

      secondary: "#8B5CF6",
      secondaryMuted: "#7C3AED",
      secondaryGlow: "rgba(139, 92, 246, 0.25)",
      secondarySubtle: "rgba(139, 92, 246, 0.12)",
      secondaryBg: "rgba(139, 92, 246, 0.08)",

      highlight: "#A855F7",
      highlightMuted: "#9333EA",
      highlightGlow: "rgba(168, 85, 247, 0.25)",
      highlightSubtle: "rgba(168, 85, 247, 0.12)",
      highlightBg: "rgba(168, 85, 247, 0.08)",

      background: "#FAFAFF",
      backgroundSecondary: "#F5F3FF",
      backgroundTertiary: "#EDE9FE",

      surface: "rgba(255, 255, 255, 0.95)",
      surfaceElevated: "rgba(255, 255, 255, 0.98)",
      surfaceOverlay: "rgba(255, 255, 255, 1)",
      surfaceSunken: "rgba(237, 233, 254, 0.6)",

      border: "rgba(0, 0, 0, 0.1)",
      borderHover: "rgba(0, 0, 0, 0.18)",
      borderActive: "rgba(124, 58, 237, 0.5)",

      textPrimary: "#1E1B4B",
      textSecondary: "#3730A3",
      textMuted: "#6366F1",
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
  currentTheme: "cosmic",
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
  "cosmic-cyan": "cosmic",
  "midnight-ocean": "midnight",
  "sunset-ember": "ember",
  "forest-glow": "forest",
  "aurora-violet": "cosmic",
  monochrome: "midnight",
  "high-contrast": "cosmic",
  // Old light themes -> new light equivalents
  "light-cloud": "arctic",
  "light-mint": "sage",
  "light-rose": "dawn",
  "light-sand": "dawn",
  light: "arctic",
  // Already valid
  cosmic: "cosmic",
  ember: "ember",
  forest: "forest",
  midnight: "midnight",
  dawn: "dawn",
  arctic: "arctic",
  sage: "sage",
  pearl: "pearl",
};

/**
 * Migrate old theme ID to new theme ID
 */
function migrateThemeId(themeId: string): ThemeId {
  return THEME_MIGRATION_MAP[themeId] || "cosmic";
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
      name: "thought-theme",
      storage: createJSONStorage(() => localStorage),
      partialize: (state): Pick<ThemeState, "currentTheme" | "respectReducedMotion"> => ({
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
    "--theme-primary": colors.primary,
    "--theme-primary-muted": colors.primaryMuted,
    "--theme-primary-glow": colors.primaryGlow,
    "--theme-primary-subtle": colors.primarySubtle,
    "--theme-primary-bg": colors.primaryBg,

    "--theme-secondary": colors.secondary,
    "--theme-secondary-muted": colors.secondaryMuted,
    "--theme-secondary-glow": colors.secondaryGlow,
    "--theme-secondary-subtle": colors.secondarySubtle,
    "--theme-secondary-bg": colors.secondaryBg,

    "--theme-highlight": colors.highlight,
    "--theme-highlight-muted": colors.highlightMuted,
    "--theme-highlight-glow": colors.highlightGlow,
    "--theme-highlight-subtle": colors.highlightSubtle,
    "--theme-highlight-bg": colors.highlightBg,

    "--theme-background": colors.background,
    "--theme-background-secondary": colors.backgroundSecondary,
    "--theme-background-tertiary": colors.backgroundTertiary,

    "--theme-surface": colors.surface,
    "--theme-surface-elevated": colors.surfaceElevated,
    "--theme-surface-overlay": colors.surfaceOverlay,
    "--theme-surface-sunken": colors.surfaceSunken,

    "--theme-border": colors.border,
    "--theme-border-hover": colors.borderHover,
    "--theme-border-active": colors.borderActive,

    "--theme-text-primary": colors.textPrimary,
    "--theme-text-secondary": colors.textSecondary,
    "--theme-text-muted": colors.textMuted,
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
  root.setAttribute("data-theme", theme.id);

  // Set light/dark mode attribute for theme-specific styling
  root.setAttribute("data-theme-mode", theme.isLight ? "light" : "dark");

  // Update color-scheme for native elements
  root.style.colorScheme = theme.isLight ? "light" : "dark";

  // Update background color on html/body for light themes
  if (theme.isLight) {
    root.style.backgroundColor = theme.colors.background;
    document.body.style.backgroundColor = theme.colors.background;
  } else {
    root.style.backgroundColor = theme.colors.background;
    document.body.style.backgroundColor = theme.colors.background;
  }
}

/**
 * Apply reduced motion setting to the document
 */
function applyReducedMotion(enabled: boolean): void {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute("data-reduced-motion", "true");
    root.classList.add("reduce-motion");
  } else {
    root.removeAttribute("data-reduced-motion");
    root.classList.remove("reduce-motion");
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
