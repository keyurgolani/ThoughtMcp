/**
 * usePanelPositioning Hook
 *
 * Provides smart panel positioning with viewport boundary detection,
 * z-index management, and smooth repositioning animations.
 *
 * Requirements: 36.3, 36.4, 36.5, 36.6
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PanelBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface PositionAdjustment {
  x: number;
  y: number;
  isAdjusted: boolean;
}

export interface UsePanelPositioningOptions {
  /** Initial position */
  initialPosition?: { x: number; y: number };
  /** Padding from viewport edges */
  viewportPadding?: number;
  /** Whether to animate position changes */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether the panel is currently visible */
  isVisible?: boolean;
  /** Callback when position is adjusted */
  onPositionAdjusted?: (adjustment: PositionAdjustment) => void;
}

export interface UsePanelPositioningReturn {
  /** Ref to attach to the panel element */
  panelRef: React.RefObject<HTMLDivElement>;
  /** Current position style */
  positionStyle: React.CSSProperties;
  /** Whether position has been adjusted from original */
  isAdjusted: boolean;
  /** Force recalculate position */
  recalculatePosition: () => void;
  /** Current panel bounds */
  bounds: PanelBounds | null;
}

// ============================================================================
// Z-Index Manager
// ============================================================================

/** Global z-index counter for panel layering */
let globalZIndexCounter = 40;
const panelZIndexMap = new Map<string, number>();

/**
 * Get z-index for a panel, bringing it to front if needed
 * Requirements: 36.3
 */
export function getPanelZIndex(panelId: string, bringToFront = false): number {
  if (bringToFront || !panelZIndexMap.has(panelId)) {
    globalZIndexCounter += 1;
    panelZIndexMap.set(panelId, globalZIndexCounter);
  }
  return panelZIndexMap.get(panelId) ?? 40;
}

/**
 * Reset z-index for all panels
 */
export function resetPanelZIndexes(): void {
  globalZIndexCounter = 40;
  panelZIndexMap.clear();
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for smart panel positioning
 *
 * Features:
 * - Viewport boundary detection (Requirement 36.4)
 * - Smooth repositioning animations (Requirement 36.5)
 * - Automatic position adjustment when panel would overflow
 *
 * Requirements: 36.3, 36.4, 36.5, 36.6
 */
export function usePanelPositioning(
  options: UsePanelPositioningOptions = {}
): UsePanelPositioningReturn {
  const {
    initialPosition,
    viewportPadding = 16,
    animate = true,
    animationDuration = 200,
    isVisible = true,
    onPositionAdjusted,
  } = options;

  const panelRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<PanelBounds | null>(null);
  const [adjustment, setAdjustment] = useState<PositionAdjustment>({
    x: 0,
    y: 0,
    isAdjusted: false,
  });

  // Calculate position adjustment to keep panel in viewport
  const calculateAdjustment = useCallback((): PositionAdjustment => {
    const panel = panelRef.current;
    if (!panel) {
      return { x: 0, y: 0, isAdjusted: false };
    }

    const rect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustX = 0;
    let adjustY = 0;

    // Check horizontal bounds
    if (rect.left < viewportPadding) {
      adjustX = viewportPadding - rect.left;
    } else if (rect.right > viewportWidth - viewportPadding) {
      adjustX = viewportWidth - viewportPadding - rect.right;
    }

    // Check vertical bounds
    if (rect.top < viewportPadding) {
      adjustY = viewportPadding - rect.top;
    } else if (rect.bottom > viewportHeight - viewportPadding) {
      adjustY = viewportHeight - viewportPadding - rect.bottom;
    }

    const isAdjusted = adjustX !== 0 || adjustY !== 0;

    return { x: adjustX, y: adjustY, isAdjusted };
  }, [viewportPadding]);

  // Recalculate position
  const recalculatePosition = useCallback(() => {
    const panel = panelRef.current;
    if (!panel || !isVisible) return;

    const rect = panel.getBoundingClientRect();
    setBounds({
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    });

    const newAdjustment = calculateAdjustment();
    setAdjustment(newAdjustment);

    if (newAdjustment.isAdjusted) {
      onPositionAdjusted?.(newAdjustment);
    }
  }, [isVisible, calculateAdjustment, onPositionAdjusted]);

  // Update position on resize and visibility change
  useEffect(() => {
    if (!isVisible) return;

    // Initial calculation
    recalculatePosition();

    // Recalculate on resize
    function handleResize(): void {
      recalculatePosition();
    }

    window.addEventListener('resize', handleResize);

    // Use ResizeObserver for panel size changes
    const resizeObserver = new ResizeObserver(() => {
      recalculatePosition();
    });

    if (panelRef.current) {
      resizeObserver.observe(panelRef.current);
    }

    return (): void => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [isVisible, recalculatePosition]);

  // Build position style
  const positionStyle: React.CSSProperties = {
    ...(initialPosition && {
      left: initialPosition.x,
      top: initialPosition.y,
    }),
    transform: adjustment.isAdjusted
      ? `translate(${String(adjustment.x)}px, ${String(adjustment.y)}px)`
      : undefined,
    transition: animate
      ? `transform ${String(animationDuration)}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : undefined,
  };

  return {
    panelRef,
    positionStyle,
    isAdjusted: adjustment.isAdjusted,
    recalculatePosition,
    bounds,
  };
}

// ============================================================================
// Overlap Detection Hook
// ============================================================================

export interface UseOverlapDetectionOptions {
  /** Ref to the panel element */
  panelRef: React.RefObject<HTMLElement>;
  /** Ref to the 3D canvas element */
  canvasRef?: React.RefObject<HTMLElement>;
  /** Whether to check for overlap */
  enabled?: boolean;
}

export interface UseOverlapDetectionReturn {
  /** Whether the panel overlaps with 3D content */
  isOverlapping: boolean;
  /** Overlap percentage (0-1) */
  overlapPercentage: number;
}

/**
 * Hook for detecting panel overlap with 3D content
 * Requirements: 36.6
 */
export function useOverlapDetection(
  options: UseOverlapDetectionOptions
): UseOverlapDetectionReturn {
  const { panelRef, canvasRef, enabled = true } = options;
  const [isOverlapping, setIsOverlapping] = useState(false);
  const [overlapPercentage, setOverlapPercentage] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIsOverlapping(false);
      setOverlapPercentage(0);
      return;
    }

    function checkOverlap(): void {
      const panel = panelRef.current;
      if (!panel) {
        setIsOverlapping(false);
        setOverlapPercentage(0);
        return;
      }

      const panelRect = panel.getBoundingClientRect();

      // If no canvas ref, assume full viewport is 3D content
      const canvasRect = canvasRef?.current?.getBoundingClientRect() ?? {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Calculate overlap
      const overlapLeft = Math.max(panelRect.left, canvasRect.left);
      const overlapRight = Math.min(panelRect.right, canvasRect.right);
      const overlapTop = Math.max(panelRect.top, canvasRect.top);
      const overlapBottom = Math.min(panelRect.bottom, canvasRect.bottom);

      const overlapWidth = Math.max(0, overlapRight - overlapLeft);
      const overlapHeight = Math.max(0, overlapBottom - overlapTop);
      const overlapArea = overlapWidth * overlapHeight;
      const panelArea = panelRect.width * panelRect.height;

      const percentage = panelArea > 0 ? overlapArea / panelArea : 0;

      setIsOverlapping(percentage > 0);
      setOverlapPercentage(percentage);
    }

    checkOverlap();

    window.addEventListener('resize', checkOverlap);
    window.addEventListener('scroll', checkOverlap);

    return (): void => {
      window.removeEventListener('resize', checkOverlap);
      window.removeEventListener('scroll', checkOverlap);
    };
  }, [panelRef, canvasRef, enabled]);

  return { isOverlapping, overlapPercentage };
}

export default usePanelPositioning;
