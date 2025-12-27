/**
 * FloatingActionButton Component
 *
 * A standardized floating action button (FAB) for consistent UI across all pages.
 * Features:
 * - Fixed position at bottom center
 * - Consistent styling with glow effects
 * - Keyboard shortcut support (CMD+Enter / Ctrl+Enter)
 * - OS-aware keyboard shortcut display
 * - Loading state support
 * - Disabled state support
 * - Custom icon support
 */

import { useCallback, useEffect, useState, type ReactElement, type ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

export interface FloatingActionButtonProps {
  /** Button label text */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Optional icon to display before the label */
  icon?: ReactNode;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  isLoading?: boolean;
  /** Loading text to display when isLoading is true */
  loadingText?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Whether to show the keyboard shortcut hint */
  showKeyboardShortcut?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect if the user is on macOS
 */
function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  // Use userAgentData if available (modern browsers), fallback to userAgent
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    navigator.platform;
  return platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Get the keyboard shortcut display string based on OS
 */
function getKeyboardShortcutDisplay(): string {
  return isMacOS() ? "⌘↵" : "Ctrl+↵";
}

// ============================================================================
// Loading Spinner Component
// ============================================================================

interface LoadingSpinnerProps {
  size?: number;
}

function LoadingSpinner({ size = 20 }: LoadingSpinnerProps): ReactElement {
  return (
    <svg
      className="animate-spin text-ui-accent-primary"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FloatingActionButton - Standardized FAB component for all pages
 *
 * Usage:
 * ```tsx
 * <FloatingActionButton
 *   label="New Memory"
 *   onClick={handleCreate}
 *   icon={<PlusIcon />}
 * />
 * ```
 */
export function FloatingActionButton({
  label,
  onClick,
  icon,
  disabled = false,
  isLoading = false,
  loadingText = "Processing...",
  ariaLabel,
  showKeyboardShortcut = true,
  className = "",
}: FloatingActionButtonProps): ReactElement {
  const [keyboardShortcut, setKeyboardShortcut] = useState("⌘↵");

  // Detect OS on mount for keyboard shortcut display
  useEffect(() => {
    setKeyboardShortcut(getKeyboardShortcutDisplay());
  }, []);

  // Handle keyboard shortcut (CMD+Enter or Ctrl+Enter)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Allow CMD+Enter in textareas (common pattern for submit)
      // but only if the FAB is not disabled
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !disabled && !isLoading) {
        // If in a textarea, let the textarea's own handler deal with it first
        // The FAB should only handle it if no other handler prevents default
        if (!isInputElement) {
          e.preventDefault();
          onClick();
        }
      }
    },
    [onClick, disabled, isLoading]
  );

  // Register global keyboard shortcut
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const isDisabled = disabled || isLoading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        fixed bottom-[5vh] left-1/2 -translate-x-1/2 z-50
        w-48 h-12 rounded-xl
        shadow-glow hover:shadow-glow-lg
        transition-all duration-200
        flex items-center justify-center gap-2
        group
        hover:scale-105 active:scale-95
        bg-ui-surface-elevated text-ui-accent-primary
        border border-ui-accent-primary/40
        hover:border-ui-accent-primary/60
        ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      aria-label={ariaLabel ?? label}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size={20} />
          <span className="font-semibold text-sm">{loadingText}</span>
        </>
      ) : (
        <>
          {icon !== undefined && icon !== null && (
            <span className="w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110 duration-200">
              {icon}
            </span>
          )}
          <span className="font-semibold text-sm">{label}</span>
          {showKeyboardShortcut && (
            <kbd className="ml-1 px-2 py-1 text-xs font-medium bg-ui-accent-primary-bg text-ui-accent-primary rounded border border-ui-accent-primary/40">
              {keyboardShortcut}
            </kbd>
          )}
        </>
      )}
    </button>
  );
}

// ============================================================================
// Default Icons
// ============================================================================

/**
 * Plus icon for "New" actions
 */
export function PlusIcon(): ReactElement {
  return (
    <svg
      className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}

/**
 * Search icon for search actions
 */
export function SearchIcon(): ReactElement {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

/**
 * Lightning bolt icon for reasoning/analyze actions
 */
export function LightningIcon(): ReactElement {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

/**
 * Chart/Analyze icon for analysis actions
 */
export function AnalyzeIcon(): ReactElement {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

/**
 * Decompose/Split icon for decomposition actions
 */
export function DecomposeIcon(): ReactElement {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  );
}

/**
 * Heart icon for emotion analysis
 */
export function HeartIcon(): ReactElement {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );
}

export default FloatingActionButton;
