/**
 * LoadingIndicator Component
 *
 * Loading indicators for async operations including inline spinners,
 * progress bars, and branded loading screens.
 *
 * Requirements: 37.3, 37.4
 */

import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LoadingVariant = 'spinner' | 'dots' | 'pulse' | 'bars';

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: LoadingSize;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'white' | 'muted';
  /** Additional CSS classes */
  className?: string;
}

export interface LoadingDotsProps {
  /** Size of the dots */
  size?: LoadingSize;
  /** Color variant */
  color?: 'primary' | 'secondary' | 'white' | 'muted';
  /** Additional CSS classes */
  className?: string;
}

export interface ProgressBarProps {
  /** Progress value (0-100) */
  progress: number;
  /** Whether to show percentage label */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  color?: 'primary' | 'secondary' | 'success';
  /** Whether progress is indeterminate */
  indeterminate?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface LoadingScreenProps {
  /** Loading message */
  message?: string;
  /** Sub-message or status */
  subMessage?: string;
  /** Progress value (0-100), if provided shows progress bar */
  progress?: number;
  /** Whether to show the branded logo */
  showLogo?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface InlineLoadingProps {
  /** Loading text */
  text?: string;
  /** Size of the spinner */
  size?: LoadingSize;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Size Configurations
// ============================================================================

const sizeClasses: Record<LoadingSize, { spinner: string; dot: string }> = {
  xs: { spinner: 'w-3 h-3', dot: 'w-1 h-1' },
  sm: { spinner: 'w-4 h-4', dot: 'w-1.5 h-1.5' },
  md: { spinner: 'w-6 h-6', dot: 'w-2 h-2' },
  lg: { spinner: 'w-8 h-8', dot: 'w-2.5 h-2.5' },
  xl: { spinner: 'w-12 h-12', dot: 'w-3 h-3' },
};

type ColorVariant = 'primary' | 'secondary' | 'white' | 'muted';

const colorClasses: Record<ColorVariant, string> = {
  primary: 'text-ui-accent-primary',
  secondary: 'text-ui-accent-secondary',
  white: 'text-white',
  muted: 'text-ui-text-tertiary',
};

// ============================================================================
// Loading Spinner Component
// ============================================================================

/**
 * LoadingSpinner - Inline loading spinner
 *
 * Requirements: 37.3
 */
export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  className = '',
}: LoadingSpinnerProps): React.ReactElement {
  return (
    <svg
      className={`animate-spin ${sizeClasses[size].spinner} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
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
// Loading Dots Component
// ============================================================================

/**
 * LoadingDots - Animated loading dots
 *
 * Requirements: 37.3
 */
export function LoadingDots({
  size = 'md',
  color = 'primary',
  className = '',
}: LoadingDotsProps): React.ReactElement {
  const dotSize = sizeClasses[size].dot;
  const dotColor = colorClasses[color].replace('text-', 'bg-');

  return (
    <div className={`flex items-center gap-1 ${className}`} role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`
            ${dotSize} rounded-full ${dotColor}
            animate-pulse
          `}
          style={{
            animationDelay: `${String(index * 150)}ms`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Progress Bar Component
// ============================================================================

/**
 * ProgressBar - Progress indicator bar
 *
 * Requirements: 37.3, 37.4
 */
type ProgressBarSize = 'sm' | 'md' | 'lg';
type ProgressBarColor = 'primary' | 'secondary' | 'success';

export function ProgressBar({
  progress,
  showLabel = false,
  size = 'md',
  color = 'primary',
  indeterminate = false,
  className = '',
}: ProgressBarProps): React.ReactElement {
  const heightClasses: Record<ProgressBarSize, string> = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const colorStyles: Record<ProgressBarColor, { bg: string; fill: string }> = {
    primary: {
      bg: 'bg-ui-accent-primary-bg',
      fill: 'bg-ui-accent-primary',
    },
    secondary: {
      bg: 'bg-ui-accent-secondary-bg',
      fill: 'bg-ui-accent-secondary',
    },
    success: {
      bg: 'bg-status-success-bg',
      fill: 'bg-status-success',
    },
  };

  const clampedProgress = Math.min(100, Math.max(0, progress));
  const currentColorStyle = colorStyles[color];
  const currentHeightClass = heightClasses[size];

  return (
    <div className={className}>
      <div
        className={`
          w-full ${currentHeightClass} rounded-full overflow-hidden
          ${currentColorStyle.bg}
        `}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`
            h-full rounded-full transition-all duration-300 ease-out
            ${currentColorStyle.fill}
            ${indeterminate ? 'animate-progress-indeterminate' : ''}
          `}
          style={indeterminate ? undefined : { width: `${String(clampedProgress)}%` }}
        />
      </div>
      {showLabel && !indeterminate && (
        <div className="mt-1 text-xs text-ui-text-secondary text-right">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Inline Loading Component
// ============================================================================

/**
 * InlineLoading - Inline loading indicator with optional text
 *
 * Requirements: 37.3
 */
export function InlineLoading({
  text = 'Loading...',
  size = 'sm',
  className = '',
}: InlineLoadingProps): React.ReactElement {
  return (
    <div
      className={`inline-flex items-center gap-2 text-ui-text-secondary ${className}`}
      role="status"
    >
      <LoadingSpinner size={size} color="muted" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

// ============================================================================
// Loading Overlay Component
// ============================================================================

/**
 * LoadingOverlay - Full overlay loading indicator
 *
 * Requirements: 37.3
 */
export function LoadingOverlay({
  message = 'Loading...',
  className = '',
}: {
  message?: string;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`
        absolute inset-0 flex items-center justify-center
        bg-ui-background/80 backdrop-blur-glass-light
        z-modal
        ${className}
      `}
      role="status"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <span className="text-sm text-ui-text-secondary">{message}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Branded Loading Screen Component
// ============================================================================

/**
 * LoadingScreen - Full-screen branded loading screen
 *
 * Requirements: 37.4
 */
export function LoadingScreen({
  message = 'Loading Memory Explorer...',
  subMessage,
  progress,
  showLogo = true,
  className = '',
}: LoadingScreenProps): React.ReactElement {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return (): void => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`
        fixed inset-0 flex flex-col items-center justify-center
        bg-ui-background
        z-modal
        ${className}
      `}
      role="status"
      aria-label={message}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-ui-accent-primary/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-ui-accent-secondary/5 blur-3xl animate-float" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        {showLogo && (
          <div className="mb-8">
            <div className="relative">
              {/* Outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-ui-accent-primary/20 blur-xl animate-pulse-slow" />

              {/* Logo container */}
              <div className="relative w-20 h-20 rounded-full bg-ui-surface border border-ui-accent-primary/30 flex items-center justify-center shadow-glow">
                {/* Brain/Neural icon */}
                <svg
                  className="w-10 h-10 text-ui-accent-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>

              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin-slow">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-ui-accent-primary" />
              </div>
              <div
                className="absolute inset-0 animate-spin-slow"
                style={{ animationDirection: 'reverse', animationDuration: '4s' }}
              >
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 rounded-full bg-ui-accent-secondary" />
              </div>
            </div>
          </div>
        )}

        {/* Loading text */}
        <h2 className="text-xl font-semibold text-ui-text-primary mb-2">
          {message}
          <span className="inline-block w-6 text-left">{dots}</span>
        </h2>

        {subMessage !== undefined && subMessage !== '' && (
          <p className="text-sm text-ui-text-secondary mb-4">{subMessage}</p>
        )}

        {/* Progress bar */}
        {progress !== undefined ? (
          <div className="w-64 mt-4">
            <ProgressBar progress={progress} showLabel size="sm" color="primary" />
          </div>
        ) : (
          <div className="mt-4">
            <LoadingDots size="md" color="primary" />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Button Loading State Component
// ============================================================================

/**
 * ButtonLoading - Loading state for buttons
 *
 * Requirements: 37.3
 */
export function ButtonLoading({
  size = 'sm',
  className = '',
}: {
  size?: LoadingSize;
  className?: string;
}): React.ReactElement {
  return <LoadingSpinner size={size} color="white" className={className} />;
}

export default LoadingSpinner;
