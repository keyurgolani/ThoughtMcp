/**
 * GlassPanel Component
 *
 * Reusable glassmorphism panel component with consistent styling across all HUD elements.
 * Supports multiple glow variants (cyan, purple, gold) and intensity levels.
 *
 * Requirements: 5.7, 17.7, 23.5, 31.1, 38.4, 38.5, 38.6
 */

import { forwardRef } from "react";
import { borderRadius, glassmorphism } from "../../utils/theme";

// ============================================================================
// Types
// ============================================================================

export type GlassPanelVariant =
  | "default"
  | "glow"
  | "glow-cyan"
  | "glow-purple"
  | "glow-gold"
  | "light"
  | "heavy"
  | "elevated"
  | "floating"
  | "sunken";

export type GlassPanelSize = "sm" | "md" | "lg";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the panel */
  variant?: GlassPanelVariant;
  /** Size variant affecting padding */
  size?: GlassPanelSize;
  /** Whether to animate the glow effect */
  animated?: boolean;
  /** Whether to apply hover effect */
  hoverable?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Child elements */
  children: React.ReactNode;
}

// ============================================================================
// Style Configurations
// Requirements: 38.4, 38.5, 38.6
// ============================================================================

const variantStyles: Record<GlassPanelVariant, React.CSSProperties> = {
  default: {
    background: glassmorphism.standard.background,
    backdropFilter: glassmorphism.standard.backdropFilter,
    WebkitBackdropFilter: glassmorphism.standard.backdropFilter,
    border: glassmorphism.standard.border,
    boxShadow: glassmorphism.standard.boxShadow,
  },
  glow: {
    background: "var(--theme-surface)",
    backdropFilter: glassmorphism.standard.backdropFilter,
    WebkitBackdropFilter: glassmorphism.standard.backdropFilter,
    border: "1px solid var(--theme-primary-subtle)",
    boxShadow: "var(--unified-panel-glow)",
  },
  "glow-cyan": {
    background: "var(--theme-surface)",
    backdropFilter: glassmorphism.glowCyan.backdropFilter,
    WebkitBackdropFilter: glassmorphism.glowCyan.backdropFilter,
    border: "1px solid var(--theme-primary-subtle)",
    boxShadow: "var(--unified-panel-glow)",
  },
  "glow-purple": {
    background: "var(--theme-surface)",
    backdropFilter: glassmorphism.glowPurple.backdropFilter,
    WebkitBackdropFilter: glassmorphism.glowPurple.backdropFilter,
    border: "1px solid var(--theme-secondary-subtle)",
    boxShadow: "var(--unified-panel-glow-secondary)",
  },
  "glow-gold": {
    background: "var(--theme-surface)",
    backdropFilter: glassmorphism.glowGold.backdropFilter,
    WebkitBackdropFilter: glassmorphism.glowGold.backdropFilter,
    border: "1px solid var(--theme-highlight-subtle)",
    boxShadow: "var(--unified-panel-glow-highlight)",
  },
  light: {
    background: glassmorphism.light.background,
    backdropFilter: glassmorphism.light.backdropFilter,
    WebkitBackdropFilter: glassmorphism.light.backdropFilter,
    border: glassmorphism.light.border,
    boxShadow: glassmorphism.light.boxShadow,
  },
  heavy: {
    background: glassmorphism.heavy.background,
    backdropFilter: glassmorphism.heavy.backdropFilter,
    WebkitBackdropFilter: glassmorphism.heavy.backdropFilter,
    border: glassmorphism.heavy.border,
    boxShadow: glassmorphism.heavy.boxShadow,
  },
  elevated: {
    background: glassmorphism.elevated.background,
    backdropFilter: glassmorphism.elevated.backdropFilter,
    WebkitBackdropFilter: glassmorphism.elevated.backdropFilter,
    border: glassmorphism.elevated.border,
    boxShadow: glassmorphism.elevated.boxShadow,
  },
  floating: {
    background: glassmorphism.floating.background,
    backdropFilter: glassmorphism.floating.backdropFilter,
    WebkitBackdropFilter: glassmorphism.floating.backdropFilter,
    border: glassmorphism.floating.border,
    boxShadow: glassmorphism.floating.boxShadow,
  },
  sunken: {
    background: glassmorphism.sunken.background,
    backdropFilter: glassmorphism.sunken.backdropFilter,
    WebkitBackdropFilter: glassmorphism.sunken.backdropFilter,
    border: glassmorphism.sunken.border,
    boxShadow: glassmorphism.sunken.boxShadow,
  },
};

// Size configurations using design tokens
// Requirements: 31.1, 31.3
const sizeStyles: Record<GlassPanelSize, string> = {
  sm: "p-2", // 8px
  md: "p-4", // 16px
  lg: "p-6", // 24px
};

const animationClasses: Record<GlassPanelVariant, string> = {
  default: "",
  glow: "animate-glow-slow",
  "glow-cyan": "animate-glow-slow",
  "glow-purple": "animate-glow-purple",
  "glow-gold": "animate-glow-gold",
  light: "",
  heavy: "",
  elevated: "",
  floating: "",
  sunken: "",
};

// ============================================================================
// Component
// ============================================================================

/**
 * GlassPanel - Reusable glassmorphism panel component
 *
 * Features:
 * - Semi-transparent background with blur effect (16px standard)
 * - Glowing borders in cyan, purple, or gold
 * - Dark cosmic color palette
 * - Optional glow animation
 * - Consistent styling across all HUD elements
 * - Size variants for consistent padding
 * - Hover effects for interactive panels
 *
 * Requirements: 5.7, 17.7, 23.5, 31.1, 38.4, 38.5, 38.6
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      variant = "default",
      size,
      animated = false,
      hoverable = false,
      className = "",
      children,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyle = variantStyles[variant];
    const animationClass = animated ? animationClasses[variant] : "";
    const sizeClass = size ? sizeStyles[size] : "";
    const hoverClass = hoverable
      ? "transition-all duration-normal hover:border-ui-border-hover hover:shadow-glow-sm cursor-pointer"
      : "";

    return (
      <div
        ref={ref}
        className={`${sizeClass} ${animationClass} ${hoverClass} ${className}`}
        style={{
          ...variantStyle,
          borderRadius: borderRadius.lg,
          transition: hoverable ? "all 200ms cubic-bezier(0.4, 0, 0.2, 1)" : undefined,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;
