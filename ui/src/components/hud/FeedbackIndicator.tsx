/**
 * FeedbackIndicator Component
 *
 * Visual feedback indicators for success, error, warning, and info states.
 * Includes animations for user feedback.
 *
 * Requirements: 33.4, 33.5, 37.3
 */

import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface FeedbackIndicatorProps {
  /** Type of feedback to display */
  type: FeedbackType;
  /** Message to display */
  message?: string;
  /** Whether the indicator is visible */
  visible: boolean;
  /** Auto-hide duration in ms (0 = no auto-hide) */
  autoHideDuration?: number;
  /** Callback when indicator should hide */
  onHide?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Style Configurations
// ============================================================================

const typeStyles: Record<FeedbackType, { bg: string; border: string; text: string; icon: string }> =
  {
    success: {
      bg: 'bg-status-success-bg',
      border: 'border-status-success/30',
      text: 'text-status-success',
      icon: '✓',
    },
    error: {
      bg: 'bg-status-error-bg',
      border: 'border-status-error/30',
      text: 'text-status-error',
      icon: '✕',
    },
    warning: {
      bg: 'bg-status-warning-bg',
      border: 'border-status-warning/30',
      text: 'text-status-warning',
      icon: '⚠',
    },
    info: {
      bg: 'bg-status-info-bg',
      border: 'border-status-info/30',
      text: 'text-status-info',
      icon: 'ℹ',
    },
    loading: {
      bg: 'bg-ui-accent-primary-bg',
      border: 'border-ui-accent-primary/30',
      text: 'text-ui-accent-primary',
      icon: '',
    },
  };

const animationClasses: Record<FeedbackType, string> = {
  success: 'animate-success-pulse',
  error: 'animate-shake',
  warning: '',
  info: '',
  loading: '',
};

// ============================================================================
// Component
// ============================================================================

/**
 * FeedbackIndicator - Visual feedback for user actions
 *
 * Features:
 * - Success pulse animation (green glow)
 * - Error shake animation
 * - Auto-hide functionality
 * - Loading spinner
 * - Consistent styling with theme
 *
 * Requirements: 33.4, 33.5, 37.3
 */
export function FeedbackIndicator({
  type,
  message,
  visible,
  autoHideDuration = 3000,
  onHide,
  className = '',
}: FeedbackIndicatorProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);

    if (visible && autoHideDuration > 0 && type !== 'loading') {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onHide?.();
      }, autoHideDuration);

      return (): void => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [visible, autoHideDuration, type, onHide]);

  if (!isVisible) return null;

  const styles = typeStyles[type];
  const animation = animationClasses[type];

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-md
        ${styles.bg} ${styles.border} ${styles.text}
        border backdrop-blur-glass-light
        animate-fade-in ${animation}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      {type === 'loading' ? (
        <LoadingSpinner />
      ) : (
        <span className="text-sm font-medium">{styles.icon}</span>
      )}
      {message != null && message !== '' && <span className="text-sm">{message}</span>}
    </div>
  );
}

// ============================================================================
// Loading Spinner
// ============================================================================

function LoadingSpinner(): React.ReactElement {
  return (
    <svg
      className="animate-spin w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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
// Toast Notification Component
// ============================================================================

export interface ToastProps {
  type: FeedbackType;
  message: string;
  visible: boolean;
  onClose: () => void;
  autoHideDuration?: number;
}

/**
 * Toast - Floating notification component
 *
 * Requirements: 33.4, 33.5
 */
export function Toast({
  type,
  message,
  visible,
  onClose,
  autoHideDuration = 4000,
}: ToastProps): React.ReactElement | null {
  useEffect(() => {
    if (visible && autoHideDuration > 0 && type !== 'loading') {
      const timer = setTimeout(onClose, autoHideDuration);
      return (): void => {
        clearTimeout(timer);
      };
    }
    return undefined;
  }, [visible, autoHideDuration, type, onClose]);

  if (!visible) return null;

  const styles = typeStyles[type];

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-toast
        flex items-center gap-3 px-4 py-3 rounded-lg
        ${styles.bg} ${styles.text}
        border ${styles.border}
        backdrop-blur-glass-medium
        shadow-panel-floating
        animate-slide-up
      `}
      role="alert"
      aria-live="polite"
    >
      {type === 'loading' ? <LoadingSpinner /> : <span className="text-lg">{styles.icon}</span>}
      <span className="text-sm font-medium">{message}</span>
      {type !== 'loading' && (
        <button
          onClick={onClose}
          className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default FeedbackIndicator;
