/**
 * useSidebarCollapse Hook Tests
 *
 * Tests for the sidebar collapse hook with session persistence.
 *
 * Requirements: 36.1 - Collapse to icons on small viewports, persist state in session
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import { useSessionStore } from '../../stores/sessionStore';

// ============================================================================
// Test Setup
// ============================================================================

// Mock window.innerWidth
let mockInnerWidth = 1200;

Object.defineProperty(window, 'innerWidth', {
  get: () => mockInnerWidth,
  configurable: true,
});

// Mock resize event
const resizeListeners: Array<() => void> = [];
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

beforeEach(() => {
  // Reset mock width
  mockInnerWidth = 1200;

  // Reset session store
  useSessionStore.setState({
    uiPreferences: { sidebarCollapsed: false },
  });

  // Mock event listeners
  window.addEventListener = vi.fn((event, handler) => {
    if (event === 'resize') {
      resizeListeners.push(handler as () => void);
    }
    originalAddEventListener.call(window, event, handler);
  });

  window.removeEventListener = vi.fn((event, handler) => {
    if (event === 'resize') {
      const index = resizeListeners.indexOf(handler as () => void);
      if (index > -1) {
        resizeListeners.splice(index, 1);
      }
    }
    originalRemoveEventListener.call(window, event, handler);
  });
});

afterEach(() => {
  resizeListeners.length = 0;
  window.addEventListener = originalAddEventListener;
  window.removeEventListener = originalRemoveEventListener;
  vi.clearAllMocks();
});

// Helper to trigger resize
function triggerResize(width: number): void {
  mockInnerWidth = width;
  resizeListeners.forEach((listener) => {
    listener();
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('useSidebarCollapse', () => {
  describe('Initial State', () => {
    it('should return collapsed state from session store', () => {
      useSessionStore.setState({
        uiPreferences: { sidebarCollapsed: true },
      });

      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should show sidebar by default on large viewports', () => {
      mockInnerWidth = 1200;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.showSidebar).toBe(true);
    });

    it('should not be auto-collapsed on large viewports', () => {
      mockInnerWidth = 1200;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isAutoCollapsed).toBe(false);
    });
  });

  describe('Auto-Collapse on Small Viewports (Requirement 36.1)', () => {
    it('should auto-collapse when viewport is less than 1024px', () => {
      mockInnerWidth = 800;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isAutoCollapsed).toBe(true);
      expect(result.current.isCollapsed).toBe(true);
    });

    it('should auto-collapse when viewport resizes below 1024px', () => {
      mockInnerWidth = 1200;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isAutoCollapsed).toBe(false);

      act(() => {
        triggerResize(800);
      });

      expect(result.current.isAutoCollapsed).toBe(true);
      expect(result.current.isCollapsed).toBe(true);
    });

    it('should restore to persisted state when viewport resizes above 1024px', () => {
      // Start with persisted collapsed = false
      useSessionStore.setState({
        uiPreferences: { sidebarCollapsed: false },
      });

      mockInnerWidth = 800;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isAutoCollapsed).toBe(true);
      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        triggerResize(1200);
      });

      expect(result.current.isAutoCollapsed).toBe(false);
      expect(result.current.isCollapsed).toBe(false);
    });
  });

  describe('Hide Sidebar on Very Small Viewports', () => {
    it('should hide sidebar when viewport is less than 640px', () => {
      mockInnerWidth = 500;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.showSidebar).toBe(false);
    });

    it('should show sidebar when viewport is 640px or more', () => {
      mockInnerWidth = 640;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.showSidebar).toBe(true);
    });
  });

  describe('Toggle Collapse', () => {
    it('should toggle collapsed state and persist to session', () => {
      mockInnerWidth = 1200;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isCollapsed).toBe(false);

      act(() => {
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(true);
      expect(useSessionStore.getState().uiPreferences.sidebarCollapsed).toBe(true);
    });

    it('should toggle viewport-based state when auto-collapsed', () => {
      mockInnerWidth = 800;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isCollapsed).toBe(true);

      act(() => {
        result.current.toggleCollapse();
      });

      expect(result.current.isCollapsed).toBe(false);
      // Should not persist to session when auto-collapsed
      expect(useSessionStore.getState().uiPreferences.sidebarCollapsed).toBe(false);
    });
  });

  describe('Set Collapsed', () => {
    it('should set collapsed state explicitly and persist', () => {
      mockInnerWidth = 1200;
      const { result } = renderHook(() => useSidebarCollapse());

      act(() => {
        result.current.setCollapsed(true);
      });

      expect(result.current.isCollapsed).toBe(true);
      expect(useSessionStore.getState().uiPreferences.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.setCollapsed(false);
      });

      expect(result.current.isCollapsed).toBe(false);
      expect(useSessionStore.getState().uiPreferences.sidebarCollapsed).toBe(false);
    });

    it('should set viewport-based state when auto-collapsed', () => {
      mockInnerWidth = 800;
      const { result } = renderHook(() => useSidebarCollapse());

      act(() => {
        result.current.setCollapsed(false);
      });

      expect(result.current.isCollapsed).toBe(false);
    });
  });

  describe('Session Persistence (Requirement 36.1)', () => {
    it('should persist collapsed state across hook re-renders', () => {
      mockInnerWidth = 1200;
      const { result, rerender } = renderHook(() => useSidebarCollapse());

      act(() => {
        result.current.setCollapsed(true);
      });

      rerender();

      expect(result.current.isCollapsed).toBe(true);
    });

    it('should restore persisted state on mount', () => {
      useSessionStore.setState({
        uiPreferences: { sidebarCollapsed: true },
      });

      mockInnerWidth = 1200;
      const { result } = renderHook(() => useSidebarCollapse());

      expect(result.current.isCollapsed).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove resize listener on unmount', () => {
      const { unmount } = renderHook(() => useSidebarCollapse());

      expect(resizeListeners.length).toBeGreaterThan(0);

      unmount();

      // The listener should be removed
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});
