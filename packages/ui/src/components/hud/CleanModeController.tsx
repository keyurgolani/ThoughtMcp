/**
 * CleanModeController Component
 *
 * Controller for toggling and managing clean UI mode.
 * Handles Escape key to toggle between clean mode and full UI mode.
 * In clean mode, all panels are hidden except a minimal toolbar.
 *
 * Requirements: 46.1, 46.5
 */

import { useCallback, useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';

// ============================================================================
// Types
// ============================================================================

export interface CleanModeControllerProps {
  /** Optional callback when clean mode changes */
  onCleanModeChange?: (isCleanMode: boolean) => void;
  /** Optional children to render (minimal toolbar content) */
  children?: React.ReactNode;
  /** Optional className for the minimal toolbar */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * CleanModeController - Manages clean UI mode state and keyboard shortcuts
 *
 * Features:
 * - Toggle clean mode on Escape key press (Requirement 46.5)
 * - Hide all panels except minimal toolbar in clean mode (Requirement 46.1)
 * - Provides visual indicator of current mode
 */
export function CleanModeController({
  onCleanModeChange,
  children,
  className = '',
}: CleanModeControllerProps): React.ReactElement {
  const isCleanMode = useUIStore((state) => state.isCleanMode);
  const toggleCleanMode = useUIStore((state) => state.toggleCleanMode);

  // Handle Escape key to toggle clean mode (Requirement 46.5)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      // Only toggle on Escape key
      if (event.key === 'Escape') {
        // Don't toggle if user is typing in an input field
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

        if (!isInputField) {
          event.preventDefault();
          toggleCleanMode();
        }
      }
    },
    [toggleCleanMode]
  );

  // Set up keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Notify parent of clean mode changes
  useEffect(() => {
    onCleanModeChange?.(isCleanMode);
  }, [isCleanMode, onCleanModeChange]);

  // Render minimal toolbar with clean mode toggle button
  return (
    <div className={`clean-mode-controller ${className}`} data-clean-mode={isCleanMode}>
      {/* Minimal toolbar - always visible */}
      <div className="flex items-center gap-2">
        {/* Clean mode toggle button - rounded square with glow */}
        <button
          onClick={toggleCleanMode}
          className={`
            glass-panel-glow p-2.5 rounded-xl transition-all duration-200 floating-glow
            ${
              isCleanMode
                ? 'bg-ui-accent-primary/20 text-ui-accent-primary border border-ui-accent-primary/30 animate-pulse-glow'
                : 'text-ui-text-secondary hover:text-ui-accent-primary'
            }
          `}
          aria-label={isCleanMode ? 'Exit clean mode (Esc)' : 'Enter clean mode (Esc)'}
          title={isCleanMode ? 'Exit clean mode (Esc)' : 'Enter clean mode (Esc)'}
        >
          {isCleanMode ? (
            // Expand icon - show panels
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          ) : (
            // Minimize icon - hide panels
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
              />
            </svg>
          )}
        </button>

        {/* Optional children (additional toolbar content) */}
        {children}
      </div>

      {/* Clean mode indicator tooltip */}
      {isCleanMode && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 pointer-events-none">
          <div className="glass-panel-glow px-3 py-1.5 rounded-lg text-xs text-ui-text-secondary whitespace-nowrap animate-fade-in">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-ui-surface rounded text-ui-accent-primary font-mono">
              Esc
            </kbd>{' '}
            to show panels
          </div>
        </div>
      )}
    </div>
  );
}

export default CleanModeController;
