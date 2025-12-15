/**
 * ViewModeSelector Component
 *
 * HUD component for selecting view modes in the Memory Exploration UI.
 * Supports Fly Mode, Orbit Mode, Timeline Mode, and Cluster Mode.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { useCallback, useMemo } from 'react';
import type { ViewMode } from '../../types/scene';

// ============================================================================
// Types
// ============================================================================

export interface ViewModeSelectorProps {
  /** Current view mode */
  currentMode: ViewMode;
  /** Callback when view mode changes */
  onModeChange: (mode: ViewMode) => void;
  /** Whether mode transitions are in progress */
  isTransitioning?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ViewModeOption {
  mode: ViewMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

/** View mode options with labels and icons */
const VIEW_MODE_OPTIONS: ViewModeOption[] = [
  {
    mode: 'fly',
    label: 'Fly',
    description: 'First-person navigation with click-to-warp',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    ),
  },
  {
    mode: 'orbit',
    label: 'Orbit',
    description: 'Third-person camera orbiting around current node',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
  {
    mode: 'timeline',
    label: 'Timeline',
    description: 'Nodes arranged chronologically along temporal axis',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    mode: 'cluster',
    label: 'Cluster',
    description: 'Nodes grouped by sector type into distinct regions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
];

// ============================================================================
// Sub-Components
// ============================================================================

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Glassmorphism panel wrapper with semi-transparent background,
 * blur effect, and glowing borders.
 */
function GlassPanel({ children, className = '' }: GlassPanelProps): React.ReactElement {
  return (
    <div
      className={`
        bg-ui-surface
        backdrop-blur-glass
        border border-ui-border
        rounded-lg
        shadow-glow
        ${className}
      `}
      style={{
        boxShadow: `
          0 0 20px rgba(0, 255, 255, 0.15),
          inset 0 0 30px rgba(0, 255, 255, 0.05)
        `,
      }}
    >
      {children}
    </div>
  );
}

interface ViewModeButtonProps {
  option: ViewModeOption;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

/**
 * Individual view mode button with icon and label
 */
function ViewModeButton({
  option,
  isSelected,
  isDisabled,
  onClick,
}: ViewModeButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        flex flex-col items-center justify-center
        px-3 py-2
        rounded-lg
        transition-all duration-200
        ${
          isSelected
            ? 'bg-ui-accent-primary/20 text-ui-accent-primary border border-ui-accent-primary/50'
            : 'bg-transparent text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-background/50 border border-transparent'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-pressed={isSelected}
      aria-label={`${option.label} mode: ${option.description}`}
      title={option.description}
    >
      <span className="mb-1" aria-hidden="true">
        {option.icon}
      </span>
      <span className="text-xs font-medium">{option.label}</span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ViewModeSelector - HUD component for selecting view modes
 *
 * Features:
 * - Four view modes: Fly, Orbit, Timeline, Cluster
 * - Visual feedback for current mode
 * - Disabled state during transitions
 * - Glassmorphism styling consistent with UI design
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export function ViewModeSelector({
  currentMode,
  onModeChange,
  isTransitioning = false,
  className = '',
}: ViewModeSelectorProps): React.ReactElement {
  // Handle mode selection
  const handleModeSelect = useCallback(
    (mode: ViewMode): void => {
      if (mode !== currentMode && !isTransitioning) {
        onModeChange(mode);
      }
    },
    [currentMode, isTransitioning, onModeChange]
  );

  // Memoize the options to avoid re-renders
  const options = useMemo(() => VIEW_MODE_OPTIONS, []);

  return (
    <GlassPanel className={`p-2 ${className}`}>
      <div className="flex items-center gap-1" role="group" aria-label="View mode selector">
        {options.map((option) => (
          <ViewModeButton
            key={option.mode}
            option={option}
            isSelected={currentMode === option.mode}
            isDisabled={isTransitioning}
            onClick={() => {
              handleModeSelect(option.mode);
            }}
          />
        ))}
      </div>
      {isTransitioning && (
        <div className="mt-2 text-xs text-ui-text-muted text-center">Transitioning...</div>
      )}
    </GlassPanel>
  );
}

export default ViewModeSelector;
