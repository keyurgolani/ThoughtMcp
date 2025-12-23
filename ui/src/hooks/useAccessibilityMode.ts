/**
 * useAccessibilityMode Hook
 *
 * Manages accessibility mode settings including 2D fallback view detection
 * and user preferences for accessibility features.
 *
 * Requirements: 13.2, 13.3, 13.5
 */

import { useCallback, useEffect, useState } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { prefersReducedMotion, subscribeToReducedMotion } from '../utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface AccessibilityModeState {
  /** Whether to use 2D fallback view instead of 3D */
  use2DFallback: boolean;
  /** Whether WebGL is available */
  webGLAvailable: boolean;
  /** Whether user prefers reduced motion */
  reducedMotion: boolean;
  /** Whether high contrast mode is enabled (derived from theme) */
  highContrast: boolean;
  /** Whether keyboard navigation is enabled */
  keyboardNavigationEnabled: boolean;
}

export interface AccessibilityModeActions {
  /** Toggle 2D fallback view */
  toggle2DFallback: () => void;
  /** Set 2D fallback view explicitly */
  set2DFallback: (value: boolean) => void;
  /** Toggle high contrast mode (switches to/from high-contrast theme) */
  toggleHighContrast: () => void;
  /** Set high contrast mode explicitly */
  setHighContrast: (value: boolean) => void;
  /** Toggle keyboard navigation */
  toggleKeyboardNavigation: () => void;
  /** Set keyboard navigation explicitly */
  setKeyboardNavigation: (value: boolean) => void;
}

export interface UseAccessibilityModeReturn
  extends AccessibilityModeState, AccessibilityModeActions {}

// ============================================================================
// WebGL Detection
// ============================================================================

/**
 * Checks if WebGL is available in the browser
 */
function checkWebGLAvailability(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    return gl !== null;
  } catch {
    return false;
  }
}

// ============================================================================
// Local Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  use2DFallback: 'memory-explorer-2d-fallback',
  keyboardNavigation: 'memory-explorer-keyboard-nav',
  previousTheme: 'memory-explorer-previous-theme',
} as const;

/**
 * Safely get a boolean value from localStorage
 */
function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const stored = localStorage.getItem(key);
    if (stored === null) {
      return defaultValue;
    }
    return stored === 'true';
  } catch {
    return defaultValue;
  }
}

/**
 * Safely set a boolean value in localStorage
 */
function setStoredBoolean(key: string, value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Safely get a string value from localStorage
 */
function getStoredString(key: string, defaultValue: string): string {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const stored = localStorage.getItem(key);
    return stored ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely set a string value in localStorage
 */
function setStoredString(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing accessibility mode settings.
 *
 * @returns Accessibility mode state and actions
 *
 * Requirements: 13.2, 13.3, 13.5
 */
export function useAccessibilityMode(): UseAccessibilityModeReturn {
  // Check WebGL availability once on mount
  const [webGLAvailable] = useState(() => checkWebGLAvailability());

  // Get theme state - high contrast is now derived from theme
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const highContrast = currentTheme === 'high-contrast';

  // Initialize state from localStorage or defaults
  const [use2DFallback, setUse2DFallbackState] = useState(() => {
    // Default to 2D if WebGL is not available
    if (!checkWebGLAvailability()) {
      return true;
    }
    return getStoredBoolean(STORAGE_KEYS.use2DFallback, false);
  });

  const [keyboardNavigationEnabled, setKeyboardNavigationState] = useState(() =>
    getStoredBoolean(STORAGE_KEYS.keyboardNavigation, true)
  );

  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());

  // Subscribe to reduced motion preference changes
  useEffect(() => {
    const unsubscribe = subscribeToReducedMotion(setReducedMotion);
    return unsubscribe;
  }, []);

  // Actions
  const toggle2DFallback = useCallback(() => {
    setUse2DFallbackState((prev) => {
      const newValue = !prev;
      setStoredBoolean(STORAGE_KEYS.use2DFallback, newValue);
      return newValue;
    });
  }, []);

  const set2DFallback = useCallback((value: boolean) => {
    setUse2DFallbackState(value);
    setStoredBoolean(STORAGE_KEYS.use2DFallback, value);
  }, []);

  const toggleHighContrast = useCallback(() => {
    if (currentTheme === 'high-contrast') {
      // Switch back to previous theme
      const previousTheme = getStoredString(STORAGE_KEYS.previousTheme, 'cosmic');
      setTheme(previousTheme as 'cosmic' | 'ember' | 'monochrome' | 'light' | 'high-contrast');
    } else {
      // Save current theme and switch to high contrast
      setStoredString(STORAGE_KEYS.previousTheme, currentTheme);
      setTheme('high-contrast');
    }
  }, [currentTheme, setTheme]);

  const setHighContrast = useCallback(
    (value: boolean) => {
      if (value && currentTheme !== 'high-contrast') {
        setStoredString(STORAGE_KEYS.previousTheme, currentTheme);
        setTheme('high-contrast');
      } else if (!value && currentTheme === 'high-contrast') {
        const previousTheme = getStoredString(STORAGE_KEYS.previousTheme, 'cosmic');
        setTheme(previousTheme as 'cosmic' | 'ember' | 'monochrome' | 'light' | 'high-contrast');
      }
    },
    [currentTheme, setTheme]
  );

  const toggleKeyboardNavigation = useCallback(() => {
    setKeyboardNavigationState((prev) => {
      const newValue = !prev;
      setStoredBoolean(STORAGE_KEYS.keyboardNavigation, newValue);
      return newValue;
    });
  }, []);

  const setKeyboardNavigation = useCallback((value: boolean) => {
    setKeyboardNavigationState(value);
    setStoredBoolean(STORAGE_KEYS.keyboardNavigation, value);
  }, []);

  return {
    // State
    use2DFallback,
    webGLAvailable,
    reducedMotion,
    highContrast,
    keyboardNavigationEnabled,
    // Actions
    toggle2DFallback,
    set2DFallback,
    toggleHighContrast,
    setHighContrast,
    toggleKeyboardNavigation,
    setKeyboardNavigation,
  };
}

export default useAccessibilityMode;
