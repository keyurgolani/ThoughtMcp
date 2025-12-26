/**
 * Badge Component
 *
 * A polished badge component for displaying status, counts, or labels.
 * Supports multiple variants with theme-aware styling.
 */

import React from 'react';

// ============================================================================
// Types
// ============================================================================

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'highlight'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: BadgeVariant;
  /** Size variant */
  size?: BadgeSize;
  /** Whether to show a dot indicator */
  dot?: boolean;
  /** Whether the badge should pulse */
  pulse?: boolean;
  /** Icon to display before content */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

// ============================================================================
// Style Configurations
// ============================================================================

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--theme-primary-bg)',
    color: 'var(--theme-primary)',
    borderColor: 'var(--theme-primary-glow)',
  },
  secondary: {
    background: 'var(--theme-secondary-bg)',
    color: 'var(--theme-secondary)',
    borderColor: 'var(--theme-secondary-glow)',
  },
  highlight: {
    background: 'var(--theme-highlight-bg)',
    color: 'var(--theme-highlight)',
    borderColor: 'var(--theme-highlight-glow)',
  },
  success: {
    background: 'rgba(39, 174, 96, 0.15)',
    color: '#27AE60',
    borderColor: 'rgba(39, 174, 96, 0.3)',
  },
  warning: {
    background: 'rgba(243, 156, 18, 0.15)',
    color: '#F39C12',
    borderColor: 'rgba(243, 156, 18, 0.3)',
  },
  error: {
    background: 'rgba(231, 76, 60, 0.15)',
    color: '#E74C3C',
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  info: {
    background: 'rgba(52, 152, 219, 0.15)',
    color: '#3498DB',
    borderColor: 'rgba(52, 152, 219, 0.3)',
  },
  neutral: {
    background: 'rgba(100, 100, 100, 0.15)',
    color: 'rgba(255, 255, 255, 0.7)',
    borderColor: 'rgba(100, 100, 100, 0.3)',
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
};

const dotSizes: Record<BadgeSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

// ============================================================================
// Component
// ============================================================================

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  pulse = false,
  icon,
  className = '',
  onClick,
}: BadgeProps): React.ReactElement {
  const style = variantStyles[variant];
  const isClickable = onClick !== undefined;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full font-medium
        border
        transition-all duration-200
        ${sizeClasses[size]}
        ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      style={style}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e): void => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Dot indicator */}
      {dot && (
        <span
          className={`
            rounded-full flex-shrink-0
            ${dotSizes[size]}
            ${pulse ? 'animate-pulse' : ''}
          `}
          style={{ backgroundColor: style.color }}
        />
      )}

      {/* Icon */}
      {icon !== undefined && icon !== null && <span className="flex-shrink-0">{icon}</span>}

      {/* Content */}
      {children}
    </span>
  );
}

// ============================================================================
// Badge Group Component
// ============================================================================

export interface BadgeGroupProps {
  /** Badges to display */
  children: React.ReactNode;
  /** Maximum number of badges to show before collapsing */
  max?: number;
  /** Additional CSS classes */
  className?: string;
}

export function BadgeGroup({ children, max, className = '' }: BadgeGroupProps): React.ReactElement {
  const badges = React.Children.toArray(children);
  const visibleBadges = max !== undefined ? badges.slice(0, max) : badges;
  const hiddenCount = max !== undefined ? badges.length - max : 0;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleBadges}
      {hiddenCount > 0 && (
        <Badge variant="neutral" size="sm">
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}

export default Badge;
