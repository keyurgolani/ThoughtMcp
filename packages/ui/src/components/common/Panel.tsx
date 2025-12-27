/**
 * Panel Component
 *
 * Unified panel component that consolidates GlassPanel patterns.
 * Provides consistent glassmorphism styling with multiple variants.
 */

import React, { forwardRef, type HTMLAttributes, type ReactNode, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export type PanelVariant =
  | "default"
  | "elevated"
  | "floating"
  | "sunken"
  | "glow"
  | "glow-primary"
  | "glow-secondary"
  | "glow-highlight";

export type PanelSize = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: PanelVariant;
  /** Padding size */
  padding?: PanelSize;
  /** Border radius */
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  /** Whether panel is interactive (clickable) */
  interactive?: boolean;
  /** Whether to show hover effects */
  hoverable?: boolean;
  /** Whether panel is selected/active */
  selected?: boolean;
  /** Whether to animate glow effect */
  animated?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Panel content */
  children: ReactNode;
}

// ============================================================================
// Constants
//=======================================================================

const PADDING_CLASSES: Record<PanelSize, string> = {
  none: "",
  xs: "p-1",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
  xl: "p-8",
};

const ROUNDED_CLASSES = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
} as const;

const VARIANT_STYLES: Record<PanelVariant, React.CSSProperties> = {
  default: {
    background: "var(--theme-surface)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid var(--theme-border)",
    boxShadow: `
      0 0 20px rgba(0, 255, 255, 0.1),
      inset 0 0 30px rgba(0, 255, 255, 0.03)
    `,
  },
  elevated: {
    background: "var(--theme-surface-elevated)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--theme-border)",
    boxShadow: `
      0 8px 32px rgba(0, 0, 0, 0.5),
      0 0 20px var(--theme-primary-glow)
    `,
  },
  floating: {
    background: "var(--theme-surface-overlay)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid var(--theme-border)",
    boxShadow: `
      0 12px 48px rgba(0, 0, 0, 0.6),
      0 0 30px var(--theme-primary-glow)
    `,
  },
  sunken: {
    background: "var(--theme-surface-sunken)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid var(--theme-border)",
    boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.3)",
  },
  glow: {
    background: "var(--theme-surface)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--theme-primary-glow)",
    boxShadow: `
      0 0 20px var(--theme-primary-glow),
      0 0 40px var(--theme-primary-bg),
      inset 0 0 30px var(--theme-primary-bg)
    `,
  },
  "glow-primary": {
    background: "var(--theme-surface)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--theme-primary-subtle)",
    boxShadow: `
      0 0 20px var(--theme-primary-glow),
      0 0 40px var(--theme-primary-bg),
      inset 0 0 30px var(--theme-primary-bg)
    `,
  },
  "glow-secondary": {
    background: "var(--theme-surface)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--theme-secondary-subtle)",
    boxShadow: `
      0 0 20px var(--theme-secondary-glow),
      0 0 40px var(--theme-secondary-bg),
      inset 0 0 30px var(--theme-secondary-bg)
    `,
  },
  "glow-highlight": {
    background: "var(--theme-surface)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--theme-highlight-subtle)",
    boxShadow: `
      0 0 20px var(--theme-highlight-glow),
      0 0 40px var(--theme-highlight-bg),
      inset 0 0 30px var(--theme-highlight-bg)
    `,
  },
};

const ANIMATION_CLASSES: Record<PanelVariant, string> = {
  default: "",
  elevated: "",
  floating: "",
  sunken: "",
  glow: "animate-glow-slow",
  "glow-primary": "animate-glow-slow",
  "glow-secondary": "animate-glow-purple",
  "glow-highlight": "animate-glow-gold",
};

// ============================================================================
// Component
// ============================================================================

export const Panel = forwardRef<HTMLDivElement, PanelProps>(
  (
    {
      variant = "default",
      padding = "md",
      rounded = "lg",
      interactive = false,
      hoverable = false,
      selected = false,
      animated = false,
      className = "",
      children,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyle = VARIANT_STYLES[variant];
    const animationClass = animated ? ANIMATION_CLASSES[variant] : "";

    // Build dynamic styles
    const dynamicStyle: React.CSSProperties = {
      ...variantStyle,
      ...style,
    };

    // Add selected state styling
    if (selected) {
      dynamicStyle.borderColor = "var(--theme-primary-glow)";
      const existingBoxShadow = dynamicStyle.boxShadow;
      const boxShadowStr = typeof existingBoxShadow === "string" ? existingBoxShadow : "";
      dynamicStyle.boxShadow = `0 0 20px var(--theme-primary-glow), ${boxShadowStr}`;
    }

    // Build class names
    const interactiveClasses = interactive
      ? "cursor-pointer active:scale-[0.98] transition-transform duration-150"
      : "";

    const hoverClasses = hoverable
      ? "transition-all duration-200 hover:border-[var(--theme-border-hover)] hover:shadow-glow-sm"
      : "";

    return (
      <div
        ref={ref}
        className={`
          ${ROUNDED_CLASSES[rounded]}
          ${PADDING_CLASSES[padding]}
          ${interactiveClasses}
          ${hoverClasses}
          ${animationClass}
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

Panel.displayName = "Panel";

// ============================================================================
// Panel Header Component
// ============================================================================

export interface PanelHeaderProps {
  /** Title text or element */
  title: ReactNode;
  /** Subtitle text */
  subtitle?: ReactNode;
  /** Icon element */
  icon?: ReactNode;
  /** Action elements (buttons, etc.) */
  actions?: ReactNode;
  /** Whether to show border */
  bordered?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  bordered = true,
  className = "",
}: PanelHeaderProps): React.ReactElement {
  const hasIcon = icon !== undefined && icon !== null;
  const hasSubtitle = subtitle !== undefined && subtitle !== null;
  const hasActions = actions !== undefined && actions !== null;

  return (
    <div
      className={`
        flex items-start justify-between gap-4
        ${bordered ? "pb-3 mb-3 border-b border-ui-border/50" : ""}
        ${className}
      `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {hasIcon && <span className="flex-shrink-0 text-ui-accent-primary">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ui-text-primary truncate">{title}</h3>
          {hasSubtitle && (
            <p className="text-sm text-ui-text-secondary mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {hasActions && <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ============================================================================
// Panel Content Component
// ============================================================================

export interface PanelContentProps {
  children: ReactNode;
  /** Whether content is scrollable */
  scrollable?: boolean;
  /** Max height for scrollable content */
  maxHeight?: string;
  /** Additional CSS classes */
  className?: string;
}

export function PanelContent({
  children,
  scrollable = false,
  maxHeight,
  className = "",
}: PanelContentProps): React.ReactElement {
  const hasMaxHeight = maxHeight !== undefined && maxHeight !== "";
  return (
    <div
      className={`
        ${scrollable ? "overflow-y-auto" : ""}
        ${className}
      `}
      style={scrollable && hasMaxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Panel Footer Component
// ============================================================================

export interface PanelFooterProps {
  children: ReactNode;
  /** Alignment */
  align?: "left" | "center" | "right" | "between";
  /** Whether to show border */
  bordered?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PanelFooter({
  children,
  align = "right",
  bordered = true,
  className = "",
}: PanelFooterProps): React.ReactElement {
  const alignClasses = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  } as const;

  const alignClass = alignClasses[align];

  return (
    <div
      className={`
        flex items-center gap-2
        ${bordered ? "pt-3 mt-3 border-t border-ui-border/50" : ""}
        ${alignClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Panel Section Component
// ============================================================================

export interface PanelSectionProps {
  /** Section title */
  title?: ReactNode;
  /** Section content */
  children: ReactNode;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Whether section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PanelSection({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = "",
}: PanelSectionProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleClick = (): void => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={className}>
      {title !== undefined && title !== null && (
        <div
          className={`
            flex items-center justify-between
            ${collapsible ? "cursor-pointer" : ""}
            mb-2
          `}
          onClick={collapsible ? handleClick : undefined}
        >
          <h4 className="text-sm font-medium text-ui-text-secondary uppercase tracking-wider">
            {title}
          </h4>
          {collapsible && (
            <svg
              className={`w-4 h-4 text-ui-text-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </div>
      )}
      {!collapsed && children}
    </div>
  );
}

export default Panel;
