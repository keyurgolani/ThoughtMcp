/**
 * GraphNodePopup Component
 *
 * A popup card that displays memory content preview and metadata when a node
 * is clicked in the memory graph. Provides action buttons for viewing and editing.
 *
 * Requirements: 6.6
 * - Display memory content preview
 * - Show metadata (sector, strength, salience)
 * - Add action buttons (view, edit)
 */

import { Eye, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { GraphNode, MemorySectorType } from "../../types/api";
import { getSectorColor } from "../../utils/visualization";

// ============================================================================
// Types
// ============================================================================

export interface GraphNodePopupProps {
  /** The node to display */
  node: GraphNode;
  /** Position of the popup (screen coordinates) */
  position: { x: number; y: number };
  /** Callback when view button is clicked */
  onView?: (nodeId: string) => void;
  /** Callback when edit button is clicked */
  onEdit?: (nodeId: string) => void;
  /** Callback when popup is closed */
  onClose?: () => void;
  /** Whether to use high contrast colors */
  highContrast?: boolean;
  /** Whether to use light mode colors */
  lightMode?: boolean;
  /** Maximum content preview length */
  maxContentLength?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default maximum content preview length */
const DEFAULT_MAX_CONTENT_LENGTH = 200;

/** Popup dimensions */
const POPUP_WIDTH = 320;
const POPUP_PADDING = 16;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a sector type for display.
 */
function formatSectorType(sector: MemorySectorType): string {
  return sector.charAt(0).toUpperCase() + sector.slice(1);
}

/**
 * Formats a number as a percentage string.
 */
function formatPercentage(value: number): string {
  return `${String(Math.round(value * 100))}%`;
}

/**
 * Truncates content to a maximum length with ellipsis.
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength - 3).trim() + "...";
}

/**
 * Formats a date string to a relative or short format.
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${String(diffMins)}m ago`;
    if (diffHours < 24) return `${String(diffHours)}h ago`;
    if (diffDays < 7) return `${String(diffDays)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Gets the color class for strength/salience values.
 */
function getValueColorClass(value: number): string {
  if (value >= 0.7) return "text-green-400";
  if (value >= 0.4) return "text-yellow-400";
  return "text-red-400";
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetadataItemProps {
  label: string;
  value: string;
  colorClass?: string;
}

/**
 * Single metadata item display.
 */
function MetadataItem({ label, value, colorClass }: MetadataItemProps): React.ReactElement {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/60 text-xs">{label}</span>
      <span className={`text-xs font-medium ${colorClass ?? "text-white"}`}>{value}</span>
    </div>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

/**
 * Action button for the popup.
 */
function ActionButton({
  icon,
  label,
  onClick,
  variant = "secondary",
}: ActionButtonProps): React.ReactElement {
  const baseClasses =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150";
  const variantClasses =
    variant === "primary"
      ? "bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary-glow)] border border-[var(--theme-primary-glow)]"
      : "bg-white/5 text-white/80 hover:bg-white/10 border border-white/10";

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses}`} aria-label={label}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * GraphNodePopup - Displays memory details when a graph node is clicked.
 *
 * Features:
 * - Glassmorphism styling with blur effect
 * - Memory content preview with truncation
 * - Metadata display (sector, strength, salience, created date)
 * - Action buttons for view and edit
 * - Click outside to close
 * - Keyboard accessible (Escape to close)
 * - pointer-events: none on container to not block graph interactions
 *
 * Requirements: 6.6
 */
export function GraphNodePopup({
  node,
  position,
  onView,
  onEdit,
  onClose,
  highContrast = false,
  lightMode = false,
  maxContentLength = DEFAULT_MAX_CONTENT_LENGTH,
  className = "",
}: GraphNodePopupProps): React.ReactElement {
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle escape key to close
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return (): void => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Handle view button click
  const handleView = useCallback((): void => {
    onView?.(node.id);
  }, [node.id, onView]);

  // Handle edit button click
  const handleEdit = useCallback((): void => {
    onEdit?.(node.id);
  }, [node.id, onEdit]);

  // Get sector color
  const sectorColor = getSectorColor(node.primarySector, highContrast, lightMode);

  // Calculate popup position (ensure it stays within viewport)
  const popupStyle: React.CSSProperties = {
    position: "absolute",
    left: position.x,
    top: position.y,
    width: POPUP_WIDTH,
    transform: "translate(-50%, -100%)",
    marginTop: -POPUP_PADDING,
    zIndex: 1000,
    pointerEvents: "auto", // Enable pointer events only on the popup itself
  };

  return (
    <div
      ref={popupRef}
      className={`
        rounded-xl overflow-hidden
        ${className}
      `}
      style={{
        ...popupStyle,
        background: lightMode ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 15, 25, 0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${lightMode ? "rgba(0, 0, 0, 0.1)" : "var(--theme-primary-glow)"}`,
        boxShadow: lightMode
          ? "0 8px 32px rgba(0, 0, 0, 0.15)"
          : `0 0 20px var(--theme-primary-glow), 0 8px 32px rgba(0, 0, 0, 0.4)`,
      }}
      role="dialog"
      aria-label={`Memory details for ${truncateContent(node.content, 50)}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: `1px solid ${lightMode ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)"}`,
        }}
      >
        <div className="flex items-center gap-2">
          {/* Sector indicator */}
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sectorColor }} />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: sectorColor }}
          >
            {formatSectorType(node.primarySector)}
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`
            p-1 rounded-md transition-colors
            ${lightMode ? "hover:bg-black/5 text-black/50" : "hover:bg-white/10 text-white/50"}
          `}
          aria-label="Close popup"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content Preview */}
      <div className="px-4 py-3">
        <p className={`text-sm leading-relaxed ${lightMode ? "text-gray-700" : "text-white/90"}`}>
          {truncateContent(node.content, maxContentLength)}
        </p>
      </div>

      {/* Metadata */}
      <div
        className="px-4 py-2 space-y-1"
        style={{
          background: lightMode ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)",
        }}
      >
        <MetadataItem
          label="Strength"
          value={formatPercentage(node.strength)}
          colorClass={getValueColorClass(node.strength)}
        />
        <MetadataItem
          label="Salience"
          value={formatPercentage(node.salience)}
          colorClass={getValueColorClass(node.salience)}
        />
        <MetadataItem label="Created" value={formatDate(node.createdAt)} />
        {node.metadata.tags && node.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {node.metadata.tags.slice(0, 3).map((tag, index) => (
              <span
                key={`${tag}-${String(index)}`}
                className={`
                  px-1.5 py-0.5 text-xs rounded-full
                  ${lightMode ? "bg-gray-200 text-gray-600" : "bg-white/10 text-white/70"}
                `}
              >
                {tag}
              </span>
            ))}
            {node.metadata.tags.length > 3 && (
              <span
                className={`
                  px-1.5 py-0.5 text-xs rounded-full
                  ${lightMode ? "bg-gray-200 text-gray-500" : "bg-white/10 text-white/50"}
                `}
              >
                +{String(node.metadata.tags.length - 3)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{
          borderTop: `1px solid ${lightMode ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)"}`,
        }}
      >
        {onEdit && (
          <ActionButton
            icon={<Pencil size={12} />}
            label="Edit"
            onClick={handleEdit}
            variant="secondary"
          />
        )}
        {onView && (
          <ActionButton
            icon={<Eye size={12} />}
            label="View"
            onClick={handleView}
            variant="primary"
          />
        )}
      </div>
    </div>
  );
}

export default GraphNodePopup;
