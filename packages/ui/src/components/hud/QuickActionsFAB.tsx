/**
 * QuickActionsFAB Component
 *
 * A floating action button that expands horizontally to show quick actions.
 * Styled to match the AI Tools FAB on the memory graph page.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { AnimatePresence, motion } from "framer-motion";
import { X, Zap } from "lucide-react";
import { useCallback, useState, type ReactElement } from "react";
import { getSectorIcon } from "../../utils/iconUtils";
import { BiasIcon, GraphIcon, ReasoningIcon, SearchIcon } from "../icons/Icons";

// ============================================================================
// Types
// ============================================================================

export interface QuickActionsFABProps {
  /** Callback when New Memory action is clicked */
  onNewMemory: () => void;
  /** Callback when Reasoning action is clicked */
  onReasoning: () => void;
  /** Callback when Biases action is clicked */
  onBiasCheck: () => void;
  /** Callback when Search action is clicked */
  onSearch: () => void;
  /** Callback when Graph action is clicked */
  onGraphView: () => void;
  /** Additional CSS classes */
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: ReactElement;
  onClick: () => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Animation duration in seconds */
const ANIMATION_DURATION = 0.2;

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuickActionsFAB - Floating Action Button with horizontal expansion
 *
 * Features:
 * - Collapsed state shows single pill button (Requirement 3.3)
 * - Expanded state shows action buttons in horizontal bar (Requirement 3.2)
 * - Smooth framer-motion animations
 * - Actions: New Memory, Reasoning, Biases, Search, Graph (Requirement 3.1)
 * - Click outside to collapse
 * - Keyboard accessible
 * - Matches AI Tools FAB styling from memory graph page
 *
 * Requirements: 3.1, 3.2, 3.3
 */
export function QuickActionsFAB({
  onNewMemory,
  onReasoning,
  onBiasCheck,
  onSearch,
  onGraphView,
  className = "",
}: QuickActionsFABProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = useCallback((): void => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleClose = useCallback((): void => {
    setIsExpanded(false);
  }, []);

  const handleAction = useCallback(
    (action: () => void): void => {
      action();
      handleClose();
    },
    [handleClose]
  );

  // Define actions with their properties
  const actions: QuickAction[] = [
    {
      id: "new-memory",
      label: "New Memory",
      icon: getSectorIcon("default", "md"),
      onClick: onNewMemory,
    },
    {
      id: "reasoning",
      label: "Reasoning",
      icon: <ReasoningIcon size="md" />,
      onClick: onReasoning,
    },
    {
      id: "biases",
      label: "Biases",
      icon: <BiasIcon size="md" />,
      onClick: onBiasCheck,
    },
    {
      id: "search",
      label: "Search",
      icon: <SearchIcon size="md" />,
      onClick: onSearch,
    },
    {
      id: "graph",
      label: "Graph",
      icon: <GraphIcon size="md" />,
      onClick: onGraphView,
    },
  ];

  return (
    <div className={className}>
      {/* Backdrop for click-outside-to-close */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={handleClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* FAB Container */}
      <div className="relative z-50">
        <AnimatePresence mode="wait">
          {isExpanded ? (
            /* Expanded state - horizontal bar with actions */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, width: "auto" }}
              animate={{ opacity: 1, scale: 1, width: "auto" }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: ANIMATION_DURATION }}
              className="flex items-center gap-3 glass-panel-glow floating-rounded-xl px-4 py-2.5 animate-pulse-glow"
            >
              {/* Label */}
              <span className="text-xs font-semibold text-ui-accent-primary whitespace-nowrap">
                Quick Actions
              </span>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={(): void => {
                      handleAction(action.onClick);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ui-surface-elevated/50 border border-ui-border/50 hover:border-ui-accent-primary/50 hover:bg-ui-accent-primary/10 transition-all duration-200 group"
                    aria-label={action.label}
                    title={action.label}
                  >
                    <span className="text-ui-text-secondary group-hover:text-ui-accent-primary transition-colors">
                      {action.icon}
                    </span>
                    <span className="text-xs text-ui-text-secondary group-hover:text-ui-text-primary transition-colors">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full text-ui-text-secondary hover:text-ui-accent-primary transition-colors hover:bg-ui-accent-primary/10"
                aria-label="Close quick actions"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            /* Collapsed state - pill button */
            <motion.button
              key="collapsed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: ANIMATION_DURATION }}
              onClick={toggleExpanded}
              className="w-56 px-6 py-3 rounded-xl bg-ui-accent-primary hover:bg-ui-accent-primary/90 text-ui-background shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group hover:scale-105 active:scale-95"
              aria-label="Open quick actions"
              aria-expanded={false}
              style={{
                boxShadow: "0 0 20px rgba(0, 255, 255, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
            >
              <Zap className="w-6 h-6" />
              <span className="font-medium text-sm">Quick Actions</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default QuickActionsFAB;
