/**
 * SectorBadge Component
 *
 * A unified, consistent badge for displaying memory sector types.
 * Uses fixed, theme-agnostic colors for business logic consistency.
 *
 * Variants:
 * - pill: Full badge with icon, label, background, and border (default)
 * - icon: Icon-only indicator with colored dot (for compact lists)
 * - dot: Small colored circle indicator
 * - compact: Icon and label without background
 * - outline: Border only, no background
 * - minimal: Text only with sector color
 *
 * Usage:
 * ```tsx
 * <SectorBadge sector="semantic" />                    // Full pill badge
 * <SectorBadge sector="episodic" variant="icon" />     // Icon indicator
 * <SectorBadge sector="procedural" variant="dot" />    // Dot indicator
 * ```
 */

import type { MemorySectorType } from "../../types/api";
import { getSectorIcon } from "../../utils/iconUtils";
import type { IconSize } from "../icons/Icons";

// ============================================================================
// Types
// ============================================================================

export type SectorBadgeVariant = "pill" | "icon" | "dot" | "compact" | "outline" | "minimal";
export type SectorBadgeSize = "xs" | "sm" | "md" | "lg";

export interface SectorBadgeProps {
  /** The memory sector type */
  sector: MemorySectorType;
  /** Display variant */
  variant?: SectorBadgeVariant;
  /** Size of the badge */
  size?: SectorBadgeSize;
  /** Whether to show the sector icon */
  showIcon?: boolean;
  /** Whether to show the sector label */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Optional title/tooltip text (defaults to sector name) */
  title?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SECTOR_LABELS: Record<MemorySectorType, string> = {
  episodic: "Episodic",
  semantic: "Semantic",
  procedural: "Procedural",
  emotional: "Emotional",
  reflective: "Reflective",
};

// CSS classes for each sector - uses CSS variables (theme-agnostic)
const SECTOR_STYLES: Record<MemorySectorType, string> = {
  episodic: "sector-badge-episodic",
  semantic: "sector-badge-semantic",
  procedural: "sector-badge-procedural",
  emotional: "sector-badge-emotional",
  reflective: "sector-badge-reflective",
};

// Size configurations
const SIZE_CLASSES: Record<
  SectorBadgeSize,
  { pill: string; dot: string; iconIndicator: string; icon: IconSize; fontSize: string }
> = {
  xs: {
    pill: "px-1.5 py-0.5 text-[10px] gap-1",
    dot: "w-1.5 h-1.5",
    iconIndicator: "w-4 h-4",
    icon: "xs",
    fontSize: "text-[10px]",
  },
  sm: {
    pill: "px-2 py-0.5 text-xs gap-1.5",
    dot: "w-2 h-2",
    iconIndicator: "w-5 h-5",
    icon: "xs",
    fontSize: "text-xs",
  },
  md: {
    pill: "px-2.5 py-1 text-sm gap-1.5",
    dot: "w-2.5 h-2.5",
    iconIndicator: "w-6 h-6",
    icon: "sm",
    fontSize: "text-sm",
  },
  lg: {
    pill: "px-3 py-1.5 text-sm gap-2",
    dot: "w-3 h-3",
    iconIndicator: "w-7 h-7",
    icon: "md",
    fontSize: "text-sm",
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * SectorBadge - Unified badge component for memory sector types
 *
 * Features:
 * - Fixed, theme-agnostic colors for business logic consistency
 * - Six variants: pill (full badge), icon (indicator), dot (circle),
 *   compact (icon + label), outline (border only), minimal (text only)
 * - Consistent appearance across all themes
 * - Uses CSS variables for sector colors
 */
export function SectorBadge({
  sector,
  variant = "pill",
  size = "sm",
  showIcon = true,
  showLabel = true,
  className = "",
  title,
}: SectorBadgeProps): React.ReactElement {
  const label = SECTOR_LABELS[sector];
  const sectorClass = SECTOR_STYLES[sector];
  const sizeConfig = SIZE_CLASSES[size];
  const tooltipText = title ?? label;

  // Dot variant - just a colored circle
  if (variant === "dot") {
    return (
      <span
        className={`
          inline-block rounded-full flex-shrink-0
          ${sizeConfig.dot}
          ${className}
        `}
        style={{
          backgroundColor: `var(--sector-${sector}-color)`,
        }}
        title={tooltipText}
        aria-label={label}
      />
    );
  }

  // Icon variant - icon with colored background circle (for compact lists)
  if (variant === "icon") {
    return (
      <span
        className={`
          inline-flex items-center justify-center rounded-full flex-shrink-0
          ${sizeConfig.iconIndicator}
          ${className}
        `}
        style={{
          backgroundColor: `var(--sector-${sector}-bg)`,
          color: `var(--sector-${sector}-color)`,
          border: `1px solid var(--sector-${sector}-border)`,
        }}
        title={tooltipText}
        aria-label={label}
      >
        {getSectorIcon(sector, sizeConfig.icon)}
      </span>
    );
  }

  // Minimal variant - text only with sector color
  if (variant === "minimal") {
    return (
      <span
        className={`${sizeConfig.fontSize} font-medium capitalize ${className}`}
        style={{
          color: `var(--sector-${sector}-color)`,
        }}
        title={tooltipText}
      >
        {showIcon && (
          <span className="inline-flex mr-1" aria-hidden="true">
            {getSectorIcon(sector, sizeConfig.icon)}
          </span>
        )}
        {showLabel && label}
      </span>
    );
  }

  // Outline variant - border only, no background
  if (variant === "outline") {
    return (
      <span
        className={`
          inline-flex items-center rounded-full font-medium border bg-transparent
          ${sizeConfig.pill}
          ${className}
        `}
        style={{
          color: `var(--sector-${sector}-color)`,
          borderColor: `var(--sector-${sector}-border)`,
        }}
        title={tooltipText}
      >
        {showIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {getSectorIcon(sector, sizeConfig.icon)}
          </span>
        )}
        {showLabel && <span className="capitalize">{label}</span>}
      </span>
    );
  }

  // Compact variant - icon and label without background
  if (variant === "compact") {
    return (
      <span
        className={`
          inline-flex items-center gap-1
          ${sectorClass}
          ${className}
        `}
        title={tooltipText}
      >
        {showIcon && <span aria-hidden="true">{getSectorIcon(sector, sizeConfig.icon)}</span>}
        {showLabel && <span>{label}</span>}
      </span>
    );
  }

  // Pill variant - full badge with background and border
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${sectorClass}
        ${sizeConfig.pill}
        ${className}
      `}
      title={tooltipText}
    >
      {showIcon && <span aria-hidden="true">{getSectorIcon(sector, sizeConfig.icon)}</span>}
      {showLabel && <span>{label}</span>}
    </span>
  );
}

export default SectorBadge;
