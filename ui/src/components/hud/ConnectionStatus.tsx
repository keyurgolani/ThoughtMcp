/**
 * ConnectionStatus Component
 *
 * Connection status indicator for WebSocket and API connectivity.
 * Shows offline, reconnecting, and error states in an unobtrusive location.
 *
 * Requirements: 37.6
 */

import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'offline' | 'error';

export interface ConnectionStatusProps {
  /** Current connection state */
  state: ConnectionState;
  /** Error message (when state is 'error') */
  errorMessage?: string;
  /** Callback to retry connection */
  onRetry?: () => void;
  /** Whether to auto-hide when connected */
  autoHideWhenConnected?: boolean;
  /** Position of the indicator */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Additional CSS classes */
  className?: string;
}

export interface ConnectionStatusBadgeProps {
  /** Current connection state */
  state: ConnectionState;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// State Configurations
// ============================================================================

const stateConfig: Record<
  ConnectionState,
  {
    label: string;
    icon: React.ReactNode;
    bgColor: string;
    textColor: string;
    borderColor: string;
    animate?: boolean;
  }
> = {
  connected: {
    label: 'Connected',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
    bgColor: 'bg-status-success-bg',
    textColor: 'text-status-success',
    borderColor: 'border-status-success/30',
  },
  connecting: {
    label: 'Connecting',
    icon: (
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ),
    bgColor: 'bg-status-info-bg',
    textColor: 'text-status-info',
    borderColor: 'border-status-info/30',
    animate: true,
  },
  reconnecting: {
    label: 'Reconnecting',
    icon: (
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    bgColor: 'bg-status-warning-bg',
    textColor: 'text-status-warning',
    borderColor: 'border-status-warning/30',
    animate: true,
  },
  offline: {
    label: 'Offline',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
        />
      </svg>
    ),
    bgColor: 'bg-ui-surface',
    textColor: 'text-ui-text-tertiary',
    borderColor: 'border-ui-border',
  },
  error: {
    label: 'Connection Error',
    icon: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    bgColor: 'bg-status-error-bg',
    textColor: 'text-status-error',
    borderColor: 'border-status-error/30',
  },
};

const positionClasses: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

// ============================================================================
// Connection Status Component
// ============================================================================

/**
 * ConnectionStatus - Connection status indicator
 *
 * Requirements: 37.6
 */
export function ConnectionStatus({
  state,
  errorMessage,
  onRetry,
  autoHideWhenConnected = true,
  position = 'bottom-right',
  className = '',
}: ConnectionStatusProps): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const config = stateConfig[state];

  // Auto-hide when connected
  useEffect(() => {
    if (state === 'connected' && autoHideWhenConnected) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return (): void => {
        clearTimeout(timer);
      };
    } else {
      setIsVisible(true);
      return undefined;
    }
  }, [state, autoHideWhenConnected]);

  if (!isVisible) return null;

  const positionClass = positionClasses[position] ?? 'bottom-4 right-4';

  return (
    <div
      className={`
        fixed ${positionClass} z-toast
        ${className}
      `}
    >
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          ${config.bgColor} ${config.textColor}
          border ${config.borderColor}
          backdrop-blur-glass-light
          shadow-subtle
          transition-all duration-normal
          cursor-pointer
          ${isExpanded ? 'pr-4' : ''}
        `}
        onClick={(): void => {
          setIsExpanded(!isExpanded);
        }}
        role="status"
        aria-live="polite"
      >
        {/* Icon */}
        <span className="flex-shrink-0">{config.icon}</span>

        {/* Label */}
        <span className="text-xs font-medium whitespace-nowrap">{config.label}</span>

        {/* Expanded content */}
        {isExpanded && (
          <div className="flex items-center gap-2 ml-2 animate-fade-in">
            {/* Error message */}
            {state === 'error' && errorMessage !== undefined && errorMessage !== '' && (
              <span className="text-xs opacity-80 max-w-[150px] truncate">{errorMessage}</span>
            )}

            {/* Retry button */}
            {(state === 'offline' || state === 'error') && onRetry !== undefined && (
              <button
                onClick={(e): void => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="text-xs underline hover:no-underline"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Expand indicator */}
        {(state === 'offline' || state === 'error') && (
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Connection Status Badge Component
// ============================================================================

/**
 * ConnectionStatusBadge - Compact connection status badge
 *
 * Requirements: 37.6
 */
export function ConnectionStatusBadge({
  state,
  size = 'sm',
  className = '',
}: ConnectionStatusBadgeProps): React.ReactElement {
  const config = stateConfig[state];

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5
        ${className}
      `}
      role="status"
      aria-label={config.label}
    >
      <span
        className={`
          ${sizeClasses[size]} rounded-full
          ${config.textColor.replace('text-', 'bg-')}
          ${config.animate === true ? 'animate-pulse' : ''}
        `}
      />
      <span className={`text-xs ${config.textColor}`}>{config.label}</span>
    </div>
  );
}

// ============================================================================
// Connection Status Dot Component
// ============================================================================

/**
 * ConnectionStatusDot - Minimal dot indicator for connection status
 *
 * Requirements: 37.6
 */
export function ConnectionStatusDot({
  state,
  size = 'sm',
  showTooltip = true,
  className = '',
}: {
  state: ConnectionState;
  size?: 'xs' | 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
}): React.ReactElement {
  const config = stateConfig[state];

  const sizeClasses: Record<'xs' | 'sm' | 'md', string> = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className={`relative group ${className}`}>
      <span
        className={`
          inline-block ${sizeClass} rounded-full
          ${config.textColor.replace('text-', 'bg-')}
          ${config.animate === true ? 'animate-pulse' : ''}
        `}
        role="status"
        aria-label={config.label}
      />

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2
            px-2 py-1 rounded text-xs whitespace-nowrap
            bg-ui-surface-overlay border border-ui-border
            opacity-0 group-hover:opacity-100
            transition-opacity pointer-events-none
            z-tooltip
          "
        >
          {config.label}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Offline Banner Component
// ============================================================================

/**
 * OfflineBanner - Full-width offline notification banner
 *
 * Requirements: 37.6
 */
export function OfflineBanner({
  onRetry,
  className = '',
}: {
  onRetry?: () => void;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={`
        w-full px-4 py-2
        bg-status-warning-bg border-b border-status-warning/30
        flex items-center justify-center gap-3
        ${className}
      `}
      role="alert"
    >
      <svg
        className="w-4 h-4 text-status-warning"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="text-sm text-status-warning">
        You're offline. Some features may be unavailable.
      </span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-status-warning underline hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Hook for monitoring connection status
// ============================================================================

/**
 * useConnectionStatus - Hook to monitor browser online/offline status
 *
 * Requirements: 37.6
 */
export function useConnectionStatus(): {
  isOnline: boolean;
  connectionState: ConnectionState;
} {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
    };
    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return (): void => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionState: isOnline ? 'connected' : 'offline',
  };
}

export default ConnectionStatus;
