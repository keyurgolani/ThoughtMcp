/**
 * AccessibilityPanel Component
 *
 * Provides UI controls for accessibility settings including
 * 2D fallback view toggle, high contrast mode, and keyboard navigation.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.5
 */

import { useAccessibilityMode } from '../../hooks/useAccessibilityMode';

// ============================================================================
// Types
// ============================================================================

export interface AccessibilityPanelProps {
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** CSS class name */
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ToggleSwitchProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleSwitchProps): React.ReactElement {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1 pr-4">
        <label
          htmlFor={id}
          className={`block text-sm font-medium ${
            disabled ? 'text-ui-text-muted' : 'text-ui-text-primary'
          }`}
        >
          {label}
        </label>
        <p className="text-xs text-ui-text-muted mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
          border-2 border-transparent transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-ui-accent-primary focus:ring-offset-2 focus:ring-offset-ui-background
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${checked ? 'bg-ui-accent-primary' : 'bg-ui-surface-elevated'}
        `}
      >
        <span className="sr-only">{label}</span>
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full
            bg-white shadow ring-0 transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AccessibilityPanel({
  isOpen,
  onClose,
  className = '',
}: AccessibilityPanelProps): React.ReactElement | null {
  const {
    use2DFallback,
    webGLAvailable,
    reducedMotion,
    highContrast,
    keyboardNavigationEnabled,
    toggle2DFallback,
    toggleHighContrast,
    toggleKeyboardNavigation,
  } = useAccessibilityMode();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${className}`}
      onClick={(): void => {
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-panel-title"
    >
      <div
        className="glass-panel p-6 max-w-md w-full mx-4"
        onClick={(e): void => {
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 id="accessibility-panel-title" className="text-lg font-semibold text-ui-text-primary">
            Accessibility Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-ui-surface-elevated transition-colors
              focus:outline-none focus:ring-2 focus:ring-ui-accent-primary"
            aria-label="Close accessibility settings"
          >
            <svg
              className="w-5 h-5 text-ui-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Settings */}
        <div className="divide-y divide-ui-border">
          {/* 2D Fallback View */}
          <ToggleSwitch
            id="toggle-2d-fallback"
            label="2D Fallback View"
            description={
              webGLAvailable
                ? 'Use a simplified 2D view instead of the 3D explorer'
                : 'WebGL is not available. 2D view is required.'
            }
            checked={use2DFallback}
            onChange={toggle2DFallback}
            disabled={!webGLAvailable}
          />

          {/* High Contrast Mode */}
          <ToggleSwitch
            id="toggle-high-contrast"
            label="High Contrast Mode"
            description="Use higher contrast colors for better visibility"
            checked={highContrast}
            onChange={toggleHighContrast}
          />

          {/* Keyboard Navigation */}
          <ToggleSwitch
            id="toggle-keyboard-nav"
            label="Keyboard Navigation"
            description="Enable Tab and arrow key navigation through nodes"
            checked={keyboardNavigationEnabled}
            onChange={toggleKeyboardNavigation}
          />

          {/* Reduced Motion (read-only, system preference) */}
          <div className="flex items-start justify-between py-3">
            <div className="flex-1 pr-4">
              <span className="block text-sm font-medium text-ui-text-primary">Reduced Motion</span>
              <p className="text-xs text-ui-text-muted mt-0.5">
                Controlled by your system preferences
              </p>
            </div>
            <span
              className={`
                px-2 py-1 rounded text-xs font-medium
                ${
                  reducedMotion
                    ? 'bg-ui-accent-primary/20 text-ui-accent-primary'
                    : 'bg-ui-surface-elevated text-ui-text-muted'
                }
              `}
            >
              {reducedMotion ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* WebGL Status */}
        <div className="mt-4 pt-4 border-t border-ui-border">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${webGLAvailable ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className="text-xs text-ui-text-muted">
              WebGL: {webGLAvailable ? 'Available' : 'Not Available'}
            </span>
          </div>
        </div>

        {/* Close button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-ui-accent-primary text-ui-background rounded
              hover:bg-ui-accent-primary/90 transition-colors
              focus:outline-none focus:ring-2 focus:ring-ui-accent-primary focus:ring-offset-2 focus:ring-offset-ui-surface"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessibilityPanel;
