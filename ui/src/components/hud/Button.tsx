/**
 * Button Component
 *
 * Reusable button component with consistent styling and micro-interactions.
 * Supports multiple variants (primary, secondary, destructive, ghost, icon).
 *
 * Requirements: 32.1, 32.2, 32.3, 32.4, 33.1
 */

import { forwardRef, useState } from 'react';
import { CYAN, DESTRUCTIVE, DISABLED_OPACITY, PURPLE } from '../../utils/visualHierarchy';

// ============================================================================
// Types
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: ButtonVariant;
  /** Size variant */
  size?: ButtonSize;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Icon to display before the label */
  leftIcon?: React.ReactNode;
  /** Icon to display after the label */
  rightIcon?: React.ReactNode;
  /** Whether to show success animation after click */
  showSuccessOnClick?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children?: React.ReactNode;
}

// ============================================================================
// Size Configurations
// Requirements: 31.1
// ============================================================================

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const iconSizeStyles: Record<ButtonSize, string> = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
};

// ============================================================================
// Button Variant Styles with EXACT accent colors
// Requirements: 32.1, 32.2, 32.3, 32.4
// ============================================================================

/**
 * Get variant-specific inline styles for exact color control
 * Using exact color values per Requirements 38.1, 38.2, 38.3
 */
const getVariantStyles = (
  variant: ButtonVariant,
  isHovered: boolean,
  isDisabled: boolean
): React.CSSProperties => {
  const baseTransition = 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)';

  if (isDisabled) {
    return {
      opacity: DISABLED_OPACITY,
      cursor: 'not-allowed',
      transition: baseTransition,
    };
  }

  switch (variant) {
    // Primary: Cyan glow (Requirements: 32.1)
    case 'primary':
      return {
        background: isHovered ? CYAN.subtle : CYAN.bg,
        border: `1px solid ${isHovered ? CYAN.borderHover : CYAN.border}`,
        color: CYAN.primary,
        boxShadow: isHovered ? `0 0 15px ${CYAN.glow}` : 'none',
        transition: baseTransition,
      };

    // Secondary: Purple subtle glow (Requirements: 32.2)
    case 'secondary':
      return {
        background: isHovered ? PURPLE.subtle : PURPLE.bg,
        border: `1px solid ${isHovered ? PURPLE.borderHover : PURPLE.border}`,
        color: PURPLE.primary,
        boxShadow: isHovered ? `0 0 15px ${PURPLE.glow}` : 'none',
        transition: baseTransition,
      };

    // Destructive: Red warning styling (Requirements: 32.3)
    case 'destructive':
      return {
        background: isHovered ? DESTRUCTIVE.subtle : DESTRUCTIVE.bg,
        border: `1px solid ${isHovered ? DESTRUCTIVE.borderHover : DESTRUCTIVE.border}`,
        color: DESTRUCTIVE.primary,
        boxShadow: isHovered ? `0 0 15px ${DESTRUCTIVE.glow}` : 'none',
        transition: baseTransition,
      };

    // Ghost: Minimal styling
    case 'ghost':
      return {
        background: isHovered ? 'rgba(100, 100, 150, 0.15)' : 'transparent',
        border: '1px solid rgba(100, 100, 150, 0.3)',
        color: isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
        transition: baseTransition,
      };

    // Icon: Minimal with cyan hover
    case 'icon':
      return {
        background: isHovered ? CYAN.bg : 'transparent',
        color: isHovered ? CYAN.primary : 'rgba(255, 255, 255, 0.7)',
        transition: baseTransition,
      };

    default:
      return { transition: baseTransition };
  }
};

// ============================================================================
// Component
// ============================================================================

/**
 * Button - Reusable button component with micro-interactions
 *
 * Features:
 * - Scale-down animation on click (95% for 100ms)
 * - Glow effect on hover (cyan for primary, purple for secondary, red for destructive)
 * - Loading state with spinner
 * - Success pulse animation
 * - Disabled state with 50% opacity (Requirements: 32.4)
 * - Multiple variants and sizes
 *
 * Button Hierarchy (Requirements: 32.1, 32.2, 32.3, 32.4):
 * - Primary: Cyan glow (#00FFFF) - for main actions
 * - Secondary: Purple subtle glow (#9B59B6) - for secondary actions
 * - Destructive: Red warning (#E74C3C) - for dangerous actions
 * - Ghost: Minimal styling - for tertiary actions
 * - Disabled: 50% opacity - for unavailable actions
 *
 * Requirements: 32.1, 32.2, 32.3, 32.4, 33.1
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      showSuccessOnClick = false,
      className = '',
      children,
      disabled,
      onClick,
      ...props
    },
    ref
  ) => {
    const [showSuccess, setShowSuccess] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
      if (showSuccessOnClick && disabled !== true && !loading) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 500);
      }
      if (onClick !== undefined) {
        onClick(e);
      }
    };

    const isDisabled = disabled === true || loading;
    const isIconOnly = variant === 'icon';

    // Build class names (layout and animation only)
    const sizeClasses = isIconOnly ? iconSizeStyles[size] : sizeStyles[size];
    const successClasses = showSuccess ? 'animate-glow-success' : '';

    // Base classes for layout and interaction
    const baseClasses = `
      rounded-md font-medium
      inline-flex items-center justify-center gap-2
      active:scale-95
      focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
    `;

    // Get variant-specific inline styles with exact colors
    const variantStyles = getVariantStyles(variant, isHovered && !isDisabled, isDisabled);

    return (
      <button
        ref={ref}
        className={`
          ${baseClasses}
          ${sizeClasses}
          ${successClasses}
          ${className}
        `}
        style={variantStyles}
        disabled={isDisabled}
        onClick={handleClick}
        onMouseEnter={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        {...props}
      >
        {loading ? (
          <LoadingSpinner size={size} />
        ) : (
          <>
            {leftIcon !== undefined && leftIcon !== null && (
              <span className="flex-shrink-0">{leftIcon}</span>
            )}
            {children}
            {rightIcon !== undefined && rightIcon !== null && (
              <span className="flex-shrink-0">{rightIcon}</span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================================================
// Loading Spinner
// ============================================================================

interface LoadingSpinnerProps {
  size: ButtonSize;
}

function LoadingSpinner({ size }: LoadingSpinnerProps): React.ReactElement {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
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

export default Button;
