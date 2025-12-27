/**
 * Hooks Module Exports
 *
 * Re-exports all custom React hooks for the Memory Exploration UI.
 */

export { DEFAULT_WARP_CONFIG, useWarpTransition } from "./useWarpTransition";
export type {
  UseWarpTransitionReturn,
  WarpTransitionActions,
  WarpTransitionConfig,
  WarpTransitionState,
} from "./useWarpTransition";

// Utility functions for warp transitions
export { calculateMotionBlurIntensity, interpolateWarpPath } from "./useWarpTransition";

export { useNavigationTransition } from "./useNavigationTransition";
export type {
  NavigationTransitionActions,
  NavigationTransitionState,
  UseNavigationTransitionReturn,
} from "./useNavigationTransition";

export { useSaveAsMemory } from "./useSaveAsMemory";
export type { SaveAsMemoryOptions, SaveAsMemoryResult } from "./useSaveAsMemory";

export { useContextMemoryNavigation } from "./useContextMemoryNavigation";
export type {
  UseContextMemoryNavigationOptions,
  UseContextMemoryNavigationReturn,
} from "./useContextMemoryNavigation";

export { useViewModeTransition } from "./useViewModeTransition";
export type {
  UseViewModeTransitionReturn,
  ViewModeTransitionActions,
  ViewModeTransitionConfig,
  ViewModeTransitionState,
} from "./useViewModeTransition";

export { DEFAULT_PROGRESSIVE_LOADING_CONFIG, useProgressiveLoading } from "./useProgressiveLoading";
export type {
  LoadableNode,
  ProgressiveLoadingConfig,
  ProgressiveLoadingResult,
  ProgressiveLoadingState,
} from "./useProgressiveLoading";

export { DEFAULT_IDLE_DETECTION_CONFIG, useIdleDetection } from "./useIdleDetection";
export type {
  IdleDetectionConfig,
  IdleDetectionResult,
  IdleDetectionState,
} from "./useIdleDetection";

export {
  DEFAULT_FRAME_RATE_CONTROL_CONFIG,
  useFrameRateControl,
  useFrameRateControlStandalone,
} from "./useFrameRateControl";
export type {
  FrameRateControlConfig,
  FrameRateControlResult,
  FrameRateControlStandaloneResult,
  FrameRateControlState,
} from "./useFrameRateControl";

export { DEFAULT_KEYBOARD_NAVIGATION_CONFIG, useKeyboardNavigation } from "./useKeyboardNavigation";
export type {
  KeyboardNavigationActions,
  KeyboardNavigationConfig,
  KeyboardNavigationState,
  UseKeyboardNavigationReturn,
} from "./useKeyboardNavigation";

export { useCrossScreenNavigation } from "./useCrossScreenNavigation";
export type {
  CrossScreenNavigationOptions,
  CrossScreenNavigationResult,
  NavigationTarget,
} from "./useCrossScreenNavigation";

export { useAccessibilityMode } from "./useAccessibilityMode";
export type {
  AccessibilityModeActions,
  AccessibilityModeState,
  UseAccessibilityModeReturn,
} from "./useAccessibilityMode";

export {
  BREAKPOINT_COLLAPSE,
  BREAKPOINT_STACK,
  MIN_TOUCH_TARGET,
  useIsTouchDevice,
  useResponsive,
  useViewportSize,
} from "./useResponsive";
export type { ResponsiveState } from "./useResponsive";

export { useSwipeGesture } from "./useSwipeGesture";
export type {
  SwipeDirection,
  SwipeHandlers,
  SwipeState,
  UseSwipeGestureOptions,
  UseSwipeGestureReturn,
} from "./useSwipeGesture";

export {
  getPanelZIndex,
  resetPanelZIndexes,
  useOverlapDetection,
  usePanelPositioning,
} from "./usePanelPositioning";
export type {
  PanelBounds,
  PositionAdjustment,
  UseOverlapDetectionOptions,
  UseOverlapDetectionReturn,
  UsePanelPositioningOptions,
  UsePanelPositioningReturn,
} from "./usePanelPositioning";

export { usePinchZoom } from "./usePinchZoom";
export type {
  PinchHandlers,
  PinchState,
  UsePinchZoomOptions,
  UsePinchZoomReturn,
} from "./usePinchZoom";

export { useSidebarCollapse } from "./useSidebarCollapse";
export type { UseSidebarCollapseResult } from "./useSidebarCollapse";

export { useRadialLayoutTransition } from "./useRadialLayoutTransition";
export type {
  RadialLayoutTransitionActions,
  RadialLayoutTransitionConfig,
  RadialLayoutTransitionState,
  UseRadialLayoutTransitionReturn,
} from "./useRadialLayoutTransition";

export { useCleanMode, useCleanModeVisibility } from "./useCleanMode";

export { useEdgeHover, useEdgePanelVisibility } from "./useEdgeHover";
export type { EdgeZone, UseEdgeHoverOptions, UseEdgeHoverResult } from "./useEdgeHover";

export { useKeyboardShortcuts } from "./useKeyboardShortcuts";
export type {
  KeyboardShortcut,
  UseKeyboardShortcutsOptions,
  UseKeyboardShortcutsReturn,
} from "./useKeyboardShortcuts";
