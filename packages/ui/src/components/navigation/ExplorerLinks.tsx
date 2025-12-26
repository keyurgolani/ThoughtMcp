import React, { useCallback } from "react";
import { Brain } from "../icons/Icons";

// ============================================================================
// Utility Component: ExplorerLink
// ============================================================================

export interface ExplorerLinkProps {
  /** Memory ID to navigate to */
  memoryId: string;
  /** Link text */
  children: React.ReactNode;
  /** Click handler from useCrossScreenNavigation */
  onViewMemory: (memoryId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Inline link component for navigating to Memory Explorer
 *
 * Requirements: 23.4
 */
export function ExplorerLink({
  memoryId,
  children,
  onViewMemory,
  className = "",
}: ExplorerLinkProps): React.ReactElement {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onViewMemory(memoryId);
    },
    [memoryId, onViewMemory]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onViewMemory(memoryId);
      }
    },
    [memoryId, onViewMemory]
  );

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        text-ui-accent-primary
        hover:text-ui-accent-secondary
        underline underline-offset-2
        transition-colors duration-200
        cursor-pointer
        ${className}
      `}
      aria-label="View memory in Explorer"
    >
      {children}
    </button>
  );
}

// ============================================================================
// Utility Component: ViewInExplorerButton
// ============================================================================

export interface ViewInExplorerButtonProps {
  /** Memory ID to navigate to */
  memoryId: string;
  /** Click handler from useCrossScreenNavigation */
  onViewMemory: (memoryId: string) => void;
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Button component for quick navigation to Memory Explorer
 *
 * Requirements: 23.4
 */
export function ViewInExplorerButton({
  memoryId,
  onViewMemory,
  size = "md",
  className = "",
}: ViewInExplorerButtonProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onViewMemory(memoryId);
  }, [memoryId, onViewMemory]);

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1.5
        ${sizeClasses[size]}
        bg-ui-accent-primary/20
        hover:bg-ui-accent-primary/30
        text-ui-accent-primary
        border border-ui-accent-primary/50
        rounded-lg
        transition-all duration-200
        ${className}
      `}
      aria-label="View in Memory Explorer"
    >
      <Brain size={16} />
      <span>View in Explorer</span>
    </button>
  );
}
