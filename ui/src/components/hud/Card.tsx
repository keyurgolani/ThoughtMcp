/**
 * Card Component
 *
 * A polished card component with glassmorphism styling and interactive states.
 * Supports multiple variants and hover effects.
 */

import { forwardRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost' | 'gradient';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: CardVariant;
  /** Whether the card is interactive (clickable) */
  interactive?: boolean;
  /** Whether to show hover lift effect */
  hoverLift?: boolean;
  /** Whether to show glow on hover */
  hoverGlow?: boolean;
  /** Whether the card is selected/active */
  selected?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Children */
  children: React.ReactNode;
}

// ============================================================================
// Style Configurations
// ============================================================================

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    background: 'var(--theme-surface)',
    border: '1px solid var(--theme-border)',
    backdropFilter: 'blur(12px)',
  },
  elevated: {
    background: 'var(--theme-surface-elevated)',
    border: '1px solid var(--theme-border)',
    backdropFilter: 'blur(16px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  outlined: {
    background: 'transparent',
    border: '1px solid var(--theme-border)',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
  },
  gradient: {
    background: 'var(--theme-surface)',
    border: '1px solid transparent',
    backdropFilter: 'blur(12px)',
  },
};

const paddingClasses: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// ============================================================================
// Component
// ============================================================================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      interactive = false,
      hoverLift = false,
      hoverGlow = false,
      selected = false,
      padding = 'md',
      className = '',
      children,
      style,
      ...props
    },
    ref
  ) => {
    const baseStyle = variantStyles[variant];

    // Build dynamic styles
    const dynamicStyle: React.CSSProperties = {
      ...baseStyle,
      ...style,
    };

    // Add selected state styling
    if (selected) {
      dynamicStyle.borderColor = 'var(--theme-primary-glow)';
      dynamicStyle.boxShadow = `0 0 20px var(--theme-primary-glow), ${String(dynamicStyle.boxShadow ?? '')}`;
    }

    // Build class names
    const interactiveClasses = interactive
      ? 'cursor-pointer active:scale-[0.98] transition-transform duration-150'
      : '';

    const hoverLiftClasses = hoverLift ? 'hover-lift' : '';

    const hoverGlowClasses = hoverGlow
      ? 'hover:border-[var(--theme-border-hover)] hover:shadow-[0_0_20px_var(--theme-primary-glow)]'
      : '';

    // Gradient border effect for gradient variant
    const gradientBorderClass = variant === 'gradient' ? 'gradient-border' : '';

    return (
      <div
        ref={ref}
        className={`
          rounded-lg
          transition-all duration-200
          ${paddingClasses[padding]}
          ${interactiveClasses}
          ${hoverLiftClasses}
          ${hoverGlowClasses}
          ${gradientBorderClass}
          ${className}
        `}
        style={dynamicStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ============================================================================
// Card Header Component
// ============================================================================

export interface CardHeaderProps {
  /** Title text */
  title: React.ReactNode;
  /** Subtitle text */
  subtitle?: React.ReactNode;
  /** Action element (button, icon, etc.) */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: CardHeaderProps): React.ReactElement {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-white truncate">{title}</h3>
        {subtitle !== undefined && subtitle !== null && (
          <p className="text-sm text-white/60 mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
      {action !== undefined && action !== null && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ============================================================================
// Card Content Component
// ============================================================================

export interface CardContentProps {
  /** Children */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps): React.ReactElement {
  return <div className={`mt-3 ${className}`}>{children}</div>;
}

// ============================================================================
// Card Footer Component
// ============================================================================

export interface CardFooterProps {
  /** Children */
  children: React.ReactNode;
  /** Alignment */
  align?: 'left' | 'center' | 'right' | 'between';
  /** Additional CSS classes */
  className?: string;
}

export function CardFooter({
  children,
  align = 'right',
  className = '',
}: CardFooterProps): React.ReactElement {
  const alignClasses: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`
        flex items-center gap-2 mt-4 pt-4
        border-t border-white/10
        ${alignClasses[align] ?? 'justify-end'}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

export interface StatCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: React.ReactNode;
  /** Change indicator (e.g., "+12%") */
  change?: string;
  /** Whether change is positive */
  changePositive?: boolean;
  /** Icon */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changePositive,
  icon,
  className = '',
}: StatCardProps): React.ReactElement {
  return (
    <Card variant="default" padding="md" className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--theme-primary)' }}>
            {value}
          </p>
          {change !== undefined && change !== '' && (
            <p
              className={`text-xs mt-1 ${changePositive === true ? 'text-green-400' : 'text-red-400'}`}
            >
              {change}
            </p>
          )}
        </div>
        {icon !== undefined && icon !== null && (
          <div className="p-2 rounded-lg" style={{ background: 'var(--theme-primary-bg)' }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default Card;
