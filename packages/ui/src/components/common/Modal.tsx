/**
 * Modal Component
 *
 * Base modal component with consistent backdrop, animations, and accessibility.
 * All modal dialogs should extend this component.
 */

import { forwardRef, useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX } from "../../utils/zIndex";

// ============================================================================
// Types
// ============================================================================

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Modal size variant */
  size?: ModalSize;
  /** Whether clicking backdrop closes modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Whether to show close button */
  showCloseButton?: boolean;
  /** Custom z-index (defaults to modal layer) */
  zIndex?: number;
  /** Additional CSS classes for the modal container */
  className?: string;
  /** Additional CSS classes for the backdrop */
  backdropClassName?: string;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Aria labelledby for accessibility */
  ariaLabelledBy?: string;
  /** Prevent body scroll when open */
  preventScroll?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[95vw] max-h-[95vh]",
};

// ============================================================================
// Component
// ============================================================================

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      children,
      size = "md",
      closeOnBackdropClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      zIndex = Z_INDEX.MODAL_CONTENT,
      className = "",
      backdropClassName = "",
      ariaLabel,
      ariaLabelledBy,
      preventScroll = true,
    },
    ref
  ) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const combinedRef = ref !== null ? (ref as React.RefObject<HTMLDivElement>) : modalRef;

    // Handle backdrop click
    const handleBackdropClick = useCallback(
      (e: React.MouseEvent) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      },
      [closeOnBackdropClick, onClose]
    );

    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return;

      const handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return (): void => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOpen, closeOnEscape, onClose]);

    // Prevent body scroll
    useEffect(() => {
      if (!preventScroll) return undefined;

      if (isOpen) {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return (): void => {
          document.body.style.overflow = originalOverflow;
        };
      }
      return undefined;
    }, [isOpen, preventScroll]);

    // Focus trap - focus modal on open
    useEffect(() => {
      if (isOpen && combinedRef.current !== null) {
        combinedRef.current.focus();
      }
    }, [isOpen, combinedRef]);

    if (!isOpen) return null;

    return createPortal(
      <div
        className={`
          fixed inset-0 flex items-center justify-center
          bg-black/60 backdrop-blur-sm
          animate-fade-in
          ${backdropClassName}
        `}
        style={{ zIndex: zIndex - 5 }}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
      >
        <div
          ref={combinedRef}
          className={`
            relative w-full mx-4
            bg-ui-surface/98 backdrop-blur-xl
            border border-ui-accent-primary/30 rounded-xl
            shadow-glow overflow-hidden
            animate-scale-in
            focus:outline-none
            ${SIZE_CLASSES[size]}
            ${className}
          `}
          style={{
            zIndex,
            boxShadow: `
              0 0 40px var(--theme-primary-glow),
              0 0 80px var(--theme-primary-subtle),
              inset 0 0 40px var(--theme-primary-bg)
            `,
          }}
          tabIndex={-1}
          onClick={(e): void => {
            e.stopPropagation();
          }}
        >
          {showCloseButton && (
            <button
              onClick={onClose}
              className="
                absolute top-3 right-3 z-10
                p-2 rounded-lg
                border border-ui-border/50
                hover:border-ui-border hover:bg-ui-border/30
                text-ui-text-secondary hover:text-ui-text-primary
                transition-colors
              "
              aria-label="Close modal"
            >
              <CloseIcon />
            </button>
          )}
          {children}
        </div>
      </div>,
      document.body
    );
  }
);

Modal.displayName = "Modal";

// ============================================================================
// Sub-components
// ============================================================================

function CloseIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export interface ModalHeaderProps {
  /** Title text or element */
  title: ReactNode;
  /** Optional icon */
  icon?: ReactNode;
  /** Optional subtitle */
  subtitle?: ReactNode;
  /** Additional actions (buttons, etc.) */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function ModalHeader({
  title,
  icon,
  subtitle,
  actions,
  className = "",
}: ModalHeaderProps): React.ReactElement {
  return (
    <div
      className={`flex items-center justify-between p-4 border-b border-ui-border/50 ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon !== undefined && icon !== null && (
          <span className="text-ui-accent-primary">{icon}</span>
        )}
        <div>
          <h2 className="text-lg font-semibold text-ui-accent-primary">{title}</h2>
          {subtitle !== undefined && subtitle !== null && (
            <p className="text-sm text-ui-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions !== undefined && actions !== null && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export interface ModalBodyProps {
  children: ReactNode;
  className?: string;
  /** Whether to add padding */
  padded?: boolean;
}

export function ModalBody({
  children,
  className = "",
  padded = true,
}: ModalBodyProps): React.ReactElement {
  return <div className={`${padded ? "p-4" : ""} ${className}`}>{children}</div>;
}

export interface ModalFooterProps {
  children: ReactNode;
  className?: string;
  /** Alignment of footer content */
  align?: "left" | "center" | "right" | "between";
}

export function ModalFooter({
  children,
  className = "",
  align = "right",
}: ModalFooterProps): React.ReactElement {
  const alignClasses: Record<"left" | "center" | "right" | "between", string> = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  };

  const alignClass = alignClasses[align];

  return (
    <div
      className={`
        flex items-center gap-3 p-4
        border-t border-ui-border/50
        ${alignClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Modal;
