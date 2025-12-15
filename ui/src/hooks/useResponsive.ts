/**
 * useResponsive Hook
 *
 * Provides responsive breakpoint detection and viewport information.
 * Used for adapting panel behavior based on screen size.
 *
 * Requirements: 36.1, 36.2
 */

import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ResponsiveState {
  /** Current viewport width */
  width: number;
  /** Current viewport height */
  height: number;
  /** Whether viewport is mobile size (< 768px) */
  isMobile: boolean;
  /** Whether viewport is tablet size (768px - 1023px) */
  isTablet: boolean;
  /** Whether viewport is desktop size (>= 1024px) */
  isDesktop: boolean;
  /** Whether panels should collapse to icons (< 1024px) */
  shouldCollapsePanels: boolean;
  /** Whether panels should stack vertically (< 768px) */
  shouldStackPanels: boolean;
  /** Whether touch interactions should be optimized */
  isTouchDevice: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Breakpoint for collapsing side panels to icons */
export const BREAKPOINT_COLLAPSE = 1024;

/** Breakpoint for stacking panels vertically */
export const BREAKPOINT_STACK = 768;

/** Minimum touch target size in pixels */
export const MIN_TOUCH_TARGET = 44;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for responsive behavior detection
 *
 * Features:
 * - Viewport size tracking
 * - Breakpoint detection
 * - Touch device detection
 * - Panel collapse/stack recommendations
 *
 * Requirements: 36.1, 36.2
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initial state based on window if available
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      return {
        width,
        height,
        isMobile: width < BREAKPOINT_STACK,
        isTablet: width >= BREAKPOINT_STACK && width < BREAKPOINT_COLLAPSE,
        isDesktop: width >= BREAKPOINT_COLLAPSE,
        shouldCollapsePanels: width < BREAKPOINT_COLLAPSE,
        shouldStackPanels: width < BREAKPOINT_STACK,
        isTouchDevice,
      };
    }

    // SSR fallback - assume desktop
    return {
      width: 1920,
      height: 1080,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      shouldCollapsePanels: false,
      shouldStackPanels: false,
      isTouchDevice: false,
    };
  });

  const updateState = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    setState({
      width,
      height,
      isMobile: width < BREAKPOINT_STACK,
      isTablet: width >= BREAKPOINT_STACK && width < BREAKPOINT_COLLAPSE,
      isDesktop: width >= BREAKPOINT_COLLAPSE,
      shouldCollapsePanels: width < BREAKPOINT_COLLAPSE,
      shouldStackPanels: width < BREAKPOINT_STACK,
      isTouchDevice,
    });
  }, []);

  useEffect(() => {
    // Update on resize
    window.addEventListener('resize', updateState);

    // Initial update
    updateState();

    return (): void => {
      window.removeEventListener('resize', updateState);
    };
  }, [updateState]);

  return state;
}

/**
 * Hook for detecting touch device
 */
export function useIsTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouchDevice;
}

/**
 * Hook for viewport dimensions
 */
export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateSize(): void {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', updateSize);
    updateSize();

    return (): void => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return size;
}

export default useResponsive;
