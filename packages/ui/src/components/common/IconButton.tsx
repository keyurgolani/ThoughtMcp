/**
 * IconButton Component
 *
 * Specialized button for icon-only actions with consistent sizing and accessibility.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

export type IconButtonSize = "xs" | "sm" | "md" | "lg";
export type IconButtonVariant = "default" | "ghost" | "primary" | "secondary" | "destructive";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Icon element */
  icon: ReactNode;
  /** Size variant */
  size?: IconButtonSize;
  /** Visual variant */
  variant?: IconButtonVariant;
  /** Accessible label (required for icon-only buttons) */
  "aria-label": string;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Whether to show tooltip on hover */
  tooltip?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CLASSES: Record<IconButtonSize, { button: string; icon: string }> = {
  xs: { button: "p-1", icon: "w-3 h-3" },
  sm: { button: "p-1.5", icon: "w-4 h-4" },
  md: { button: "p-2", icon: "w-5 h-5" },
  lg: { button: "p-2.5", icon: "w-6 h-6" },
};

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  default: `
    text-ui-text-secondary
    hover:text-ui-text-primary hover:bg-ui-border/30
    active:bg-ui-border/50
  `,
  ghost: `
    text-ui-text-muted
    hover:text-ui-text-secondary hover:bg-ui-border/20
    active:bg-ui-border/30
  `,
  primary: `
    text-ui-accent-primary
    hover:bg-ui-accent-primary/10
    active:bg-ui-accent-primary/20
  `,
  secondary: `
    text-ui-accent-secondary
    hover:bg-ui-accent-secondary/10
    active:bg-ui-accent-secondary/20
  `,
  destructive: `
    text-status-error
    hover:bg-status-error/10
    active:bg-status-error/20
  `,
};

// ============================================================================
// Component
// ============================================================================

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      size = "md",
      variant = "default",
      loading = false,
      tooltip,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeConfig = SIZE_CLASSES[size];
    const isDisabled = disabled === true || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        title={tooltip}
        className={`
          inline-flex items-center justify-center
          rounded-md
          transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-primary/50
          disabled:opacity-50 disabled:cursor-not-allowed
          active:scale-95
          ${sizeConfig.button}
          ${VARIANT_CLASSES[variant]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <LoadingSpinner className={sizeConfig.icon} />
        ) : (
          <span className={`flex-shrink-0 ${sizeConfig.icon}`}>{icon}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

// ============================================================================
// Loading Spinner
// ============================================================================

function LoadingSpinner({ className = "" }: { className?: string }): React.ReactElement {
  return (
    <svg
      className={`animate-spin ${className}`}
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
// Icon Button Group
// ============================================================================

export interface IconButtonGroupProps {
  children: ReactNode;
  /** Orientation of the group */
  orientation?: "horizontal" | "vertical";
  /** Whether buttons are attached */
  attached?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function IconButtonGroup({
  children,
  orientation = "horizontal",
  attached = false,
  className = "",
}: IconButtonGroupProps): React.ReactElement {
  const orientationClasses = orientation === "horizontal" ? "flex-row" : "flex-col";
  const attachedClasses = attached
    ? orientation === "horizontal"
      ? "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:last-child)]:border-r-0"
      : "[&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:last-child)]:border-b-0"
    : "gap-1";

  return (
    <div className={`inline-flex ${orientationClasses} ${attachedClasses} ${className}`}>
      {children}
    </div>
  );
}

// ============================================================================
// Common Icon Button Presets
// ============================================================================

export interface CloseButtonProps extends Omit<IconButtonProps, "icon" | "aria-label"> {
  "aria-label"?: string;
}

export function CloseButton({
  "aria-label": ariaLabel = "Close",
  ...props
}: CloseButtonProps): React.ReactElement {
  return (
    <IconButton
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      }
      aria-label={ariaLabel}
      {...props}
    />
  );
}

export interface MenuButtonProps extends Omit<IconButtonProps, "icon" | "aria-label"> {
  "aria-label"?: string;
}

export function MenuButton({
  "aria-label": ariaLabel = "Menu",
  ...props
}: MenuButtonProps): React.ReactElement {
  return (
    <IconButton
      icon={
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      }
      aria-label={ariaLabel}
      {...props}
    />
  );
}

export interface ExpandButtonProps extends Omit<IconButtonProps, "icon" | "aria-label"> {
  expanded?: boolean;
  "aria-label"?: string;
}

export function ExpandButton({
  expanded = false,
  "aria-label": ariaLabel,
  ...props
}: ExpandButtonProps): React.ReactElement {
  return (
    <IconButton
      icon={
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      }
      aria-label={ariaLabel ?? (expanded ? "Collapse" : "Expand")}
      aria-expanded={expanded}
      {...props}
    />
  );
}

export default IconButton;
