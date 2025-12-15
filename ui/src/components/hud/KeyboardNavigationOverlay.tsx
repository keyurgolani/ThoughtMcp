/**
 * KeyboardNavigationOverlay Component
 *
 * Provides visual feedback for keyboard navigation in the Memory Exploration UI.
 * Shows focus indicators and navigation hints.
 *
 * Requirements: 13.1
 */

import type { GraphNode } from '../../types/api';
import { generateAriaLabel } from '../../utils/accessibility';

// ============================================================================
// Types
// ============================================================================

export interface KeyboardNavigationOverlayProps {
  /** Whether keyboard navigation is active */
  isActive: boolean;
  /** Currently focused node */
  focusedNode: GraphNode | null;
  /** Total number of navigable nodes */
  totalNodes: number;
  /** Current focus index (1-based for display) */
  focusIndex: number;
  /** Number of connections for the focused node */
  connectionCount: number;
  /** Whether to show navigation hints */
  showHints?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function KeyboardNavigationOverlay({
  isActive,
  focusedNode,
  totalNodes,
  focusIndex,
  connectionCount,
  showHints = true,
}: KeyboardNavigationOverlayProps): React.ReactElement | null {
  if (!isActive) {
    return null;
  }

  const ariaLabel = focusedNode
    ? generateAriaLabel(focusedNode, connectionCount)
    : 'No node focused';

  return (
    <div
      className="fixed bottom-20 left-4 z-50 glass-panel p-4 max-w-md"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Focus indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-ui-accent-primary animate-pulse" />
        <span className="text-ui-text-primary font-semibold">Keyboard Navigation Active</span>
      </div>

      {/* Current focus info */}
      {focusedNode ? (
        <div className="space-y-2">
          <p className="text-ui-text-secondary text-sm">
            Node {focusIndex} of {totalNodes}
          </p>
          <p className="text-ui-text-primary text-sm" aria-label={ariaLabel}>
            {ariaLabel}
          </p>
        </div>
      ) : (
        <p className="text-ui-text-secondary text-sm">Press Tab to focus a node</p>
      )}

      {/* Navigation hints */}
      {showHints && (
        <div className="mt-3 pt-3 border-t border-ui-border">
          <p className="text-ui-text-muted text-xs mb-1">Keyboard shortcuts:</p>
          <ul className="text-ui-text-muted text-xs space-y-0.5">
            <li>Tab / Arrow keys: Navigate nodes</li>
            <li>Enter / Space: Select node</li>
            <li>Escape: Exit navigation</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default KeyboardNavigationOverlay;
