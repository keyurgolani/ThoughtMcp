/**
 * Tests for useRadialLayoutTransition Hook
 *
 * Tests smooth transitions to radial layout when navigating to hub nodes.
 *
 * Requirements: 43.4
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRadialLayoutTransition } from '../../hooks/useRadialLayoutTransition';

// Mock the accessibility utility
vi.mock('../../utils/accessibility', () => ({
  prefersReducedMotion: vi.fn(() => false),
}));

describe('useRadialLayoutTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with empty positions', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      expect(result.current.nodePositions.size).toBe(0);
      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.transitionProgress).toBe(0);
      expect(result.current.isRadialLayout).toBe(false);
    });
  });

  describe('setPositionsImmediate', () => {
    it('should set positions immediately for non-hub nodes using Fibonacci sphere', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      act(() => {
        result.current.setPositionsImmediate('node-1', ['neighbor-1', 'neighbor-2'], 3);
      });

      // Should have positions for current node and neighbors
      expect(result.current.nodePositions.size).toBe(3);
      expect(result.current.nodePositions.has('node-1')).toBe(true);
      expect(result.current.nodePositions.has('neighbor-1')).toBe(true);
      expect(result.current.nodePositions.has('neighbor-2')).toBe(true);

      // Current node should be at center
      const currentPos = result.current.nodePositions.get('node-1');
      expect(currentPos).toEqual([0, 0, 0]);

      // Should not be radial layout (connection count < 6)
      expect(result.current.isRadialLayout).toBe(false);
    });

    it('should set positions immediately for hub nodes using radial layout', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      act(() => {
        // 6 connections makes it a hub (>5)
        result.current.setPositionsImmediate('hub-node', ['n1', 'n2', 'n3', 'n4'], 6);
      });

      // Should have positions for hub and neighbors
      expect(result.current.nodePositions.size).toBe(5);
      expect(result.current.nodePositions.has('hub-node')).toBe(true);

      // Hub node should be at center (with slight y offset)
      const hubPos = result.current.nodePositions.get('hub-node');
      expect(hubPos?.[0]).toBe(0);
      expect(hubPos?.[2]).toBe(0);

      // Should be radial layout
      expect(result.current.isRadialLayout).toBe(true);
    });

    it('should arrange neighbors in radial pattern for hub nodes', () => {
      const { result } = renderHook(() =>
        useRadialLayoutTransition({
          radialRadius: 6,
          addYVariation: false,
        })
      );

      act(() => {
        result.current.setPositionsImmediate('hub', ['n1', 'n2', 'n3', 'n4'], 8);
      });

      // All neighbors should be at the same distance from center (radial layout)
      const neighbors = ['n1', 'n2', 'n3', 'n4'];
      const distances = neighbors.map((id) => {
        const pos = result.current.nodePositions.get(id);
        if (!pos) return 0;
        return Math.sqrt(pos[0] ** 2 + pos[2] ** 2);
      });

      // All distances should be approximately equal (the radial radius)
      const expectedRadius = 6;
      distances.forEach((d) => {
        expect(d).toBeCloseTo(expectedRadius, 1);
      });
    });
  });

  describe('transitionToNode', () => {
    it('should set positions immediately when no previous positions exist', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      act(() => {
        result.current.transitionToNode('node-1', ['n1', 'n2'], 3);
      });

      // Should set positions immediately (no animation for first load)
      expect(result.current.nodePositions.size).toBe(3);
      expect(result.current.isTransitioning).toBe(false);
    });

    it('should start transition when previous positions exist', () => {
      const { result } = renderHook(() =>
        useRadialLayoutTransition({
          duration: 100,
        })
      );

      // Set initial positions
      act(() => {
        result.current.setPositionsImmediate('node-1', ['n1', 'n2'], 3);
      });

      // Verify initial state
      expect(result.current.isRadialLayout).toBe(false);
      expect(result.current.nodePositions.size).toBe(3);

      // Trigger transition to hub node
      act(() => {
        result.current.transitionToNode('hub-node', ['n1', 'n2', 'n3'], 7);
      });

      // Should be transitioning (animation started)
      expect(result.current.isTransitioning).toBe(true);

      // Positions should be updated (interpolated or target)
      expect(result.current.nodePositions.size).toBeGreaterThan(0);
    });
  });

  describe('cancelTransition', () => {
    it('should cancel ongoing transition', () => {
      const { result } = renderHook(() =>
        useRadialLayoutTransition({
          duration: 1000,
        })
      );

      // Set initial positions
      act(() => {
        result.current.setPositionsImmediate('node-1', ['n1'], 2);
      });

      // Start transition
      act(() => {
        result.current.transitionToNode('node-2', ['n1', 'n2'], 3);
      });

      expect(result.current.isTransitioning).toBe(true);

      // Cancel transition
      act(() => {
        result.current.cancelTransition();
      });

      expect(result.current.isTransitioning).toBe(false);
      expect(result.current.transitionProgress).toBe(0);
    });
  });

  describe('getNodePosition', () => {
    it('should return position for existing node', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      act(() => {
        result.current.setPositionsImmediate('node-1', ['n1'], 2);
      });

      const pos = result.current.getNodePosition('node-1');
      expect(pos).toEqual([0, 0, 0]);
    });

    it('should return [0,0,0] for non-existing node', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      const pos = result.current.getNodePosition('non-existent');
      expect(pos).toEqual([0, 0, 0]);
    });
  });

  describe('hub detection', () => {
    it('should use Fibonacci sphere for nodes with 5 or fewer connections', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      act(() => {
        result.current.setPositionsImmediate('node', ['n1', 'n2', 'n3'], 5);
      });

      expect(result.current.isRadialLayout).toBe(false);
    });

    it('should use radial layout for nodes with more than 5 connections', () => {
      const { result } = renderHook(() => useRadialLayoutTransition());

      act(() => {
        result.current.setPositionsImmediate('hub', ['n1', 'n2', 'n3'], 6);
      });

      expect(result.current.isRadialLayout).toBe(true);
    });
  });

  describe('configuration', () => {
    it('should respect custom radial radius', () => {
      const { result } = renderHook(() =>
        useRadialLayoutTransition({
          radialRadius: 10,
          addYVariation: false,
        })
      );

      act(() => {
        result.current.setPositionsImmediate('hub', ['n1'], 8);
      });

      const neighborPos = result.current.nodePositions.get('n1');
      if (neighborPos) {
        const distance = Math.sqrt(neighborPos[0] ** 2 + neighborPos[2] ** 2);
        expect(distance).toBeCloseTo(10, 1);
      }
    });

    it('should respect custom sphere radius for non-hub nodes', () => {
      const { result } = renderHook(() =>
        useRadialLayoutTransition({
          sphereRadius: 12,
        })
      );

      act(() => {
        result.current.setPositionsImmediate('node', ['n1'], 3);
      });

      const neighborPos = result.current.nodePositions.get('n1');
      if (neighborPos) {
        const distance = Math.sqrt(neighborPos[0] ** 2 + neighborPos[1] ** 2 + neighborPos[2] ** 2);
        // Should be approximately the sphere radius
        expect(distance).toBeCloseTo(12, 1);
      }
    });
  });
});
