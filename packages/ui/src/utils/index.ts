/**
 * Utils Module Exports
 *
 * Re-exports all utility functions.
 */

// Format utilities - common formatting functions
export * from "./formatUtils";

// Dashboard utilities - shared dashboard helper functions
export * from "./dashboardUtils";

// Design tokens - single source of truth for styling values
// Note: tokens.ts provides the canonical values, other files may have legacy exports
export {
  BACKGROUNDS,
  BORDERS,
  DESTRUCTIVE,
  DURATION,
  EASING,
  FONT_FAMILY,
  FONT_SIZE,
  FONT_WEIGHT,
  GLASS,
  HIGHLIGHT,
  LINE_HEIGHT,
  LINK_TYPES,
  PRIMARY,
  RADIUS,
  SECONDARY,
  SECTORS,
  SHADOWS,
  SPACING,
  STATUS,
  SURFACES,
  TEXT,
  TEXT_OPACITY,
  Z_INDEX,
  cssVar,
  getLinkColor,
  getSectorColor,
  getTextColor,
} from "./tokens";

// Theme utilities
export * from "./accessibility";
export * from "./autoSuggest";
export * from "./clustering";
export * from "./designTokenAudit";
export * from "./filters";
export * from "./graphEdges";
export * from "./markdownBlocks";
export * from "./performance";
export * from "./preview";
export * from "./relatedMemories";

// Re-export theme utilities excluding conflicting names
export {
  borderRadius,
  buttonStyles,
  colors,
  getGlassPanelStyle,
  getLinkThemeColor,
  getNeonTextStyle,
  getSectorThemeColor,
  glassmorphism,
  neonText,
  spacing,
  transitions,
  twButton,
  twGlassPanel,
  twInput,
  twNeonText,
  typography,
} from "./theme";

// Re-export visualHierarchy excluding conflicting names
export {
  CYAN,
  DISABLED_OPACITY,
  GOLD,
  PURPLE,
  TEXT_COLORS,
  TEXT_SHADOW,
  buttonClasses,
  destructiveButtonHoverStyle,
  destructiveButtonStyle,
  disabledButtonStyle,
  getButtonClass,
  getTextClass,
  getTextShadowStyle,
  getTextStyle,
  primaryButtonHoverStyle,
  primaryButtonStyle,
  secondaryButtonHoverStyle,
  secondaryButtonStyle,
  textClasses,
} from "./visualHierarchy";

// Re-export visualization excluding conflicting getSectorColor
export {
  calculateClusterPositions,
  calculateConnectionCounts,
  calculateEdgeThickness,
  calculateFibonacciSpherePositions,
  calculateHubAndSpokePositions,
  calculateHubCentricPositions,
  calculateHubEdgeThickness,
  calculateHubSizeMultiplier,
  calculateNodeOpacity,
  calculateNodeSize,
  calculateNodeSizeWithHubEmphasis,
  calculateRadialNeighborPositions,
  calculateTimelinePositions,
  edgeConnectsNodes,
  filterValidEdges,
  getClusterCenter,
  getEdgeBetweenNodes,
  getHubEdgeEmissiveMultiplier,
  getHubEdgeGlowMultiplier,
  getHubThreshold,
  getLinkTypeColor,
  getLinkTypeLabel,
  getSectorColor as getSectorColorWithContrast,
  isHubNode,
  isValidEdge,
  type ClusterNode,
  type HubLayoutNode,
  type HubNode,
  type Position3D,
  type TimelineNode,
} from "./visualization";

// Re-export zIndex with explicit names to avoid conflicts
export { Z_INDEX as Z_INDEX_LEGACY, getZIndex, getZIndexStyle } from "./zIndex";
