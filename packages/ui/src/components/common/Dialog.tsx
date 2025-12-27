/**
 * Dialog Component
 *
 * Confirmation/alert dialog built on Modal.
 * Use for destructive actions, confirmations, and alerts.
 */

import { useCallback, useState, type ReactNode } from "react";
import { Button } from "../hud/Button";
import { Modal, ModalBody, ModalFooter } from "./Modal";

// ============================================================================
// Types
// ============================================================================

export type DialogVariant = "info" | "warning" | "error" | "success";

export interface DialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Dialog title */
  title: string;
  /** Dialog message/content */
  children: ReactNode;
  /** Dialog variant for styling */
  variant?: DialogVariant;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm?: () => void | Promise<void>;
  /** Whether confirm action is loading */
  isLoading?: boolean;
  /** Whether to show cancel button */
  showCancel?: boolean;
  /** Custom icon */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const VARIANT_STYLES: Record<
  DialogVariant,
  { iconBg: string; iconColor: string; confirmVariant: "primary" | "destructive" }
> = {
  info: {
    iconBg: "bg-ui-accent-primary/20",
    iconColor: "text-ui-accent-primary",
    confirmVariant: "primary",
  },
  warning: {
    iconBg: "bg-status-warning/20",
    iconColor: "text-status-warning",
    confirmVariant: "primary",
  },
  error: {
    iconBg: "bg-status-error/20",
    iconColor: "text-status-error",
    confirmVariant: "destructive",
  },
  success: {
    iconBg: "bg-status-success/20",
    iconColor: "text-status-success",
    confirmVariant: "primary",
  },
};

const VARIANT_ICONS: Record<DialogVariant, React.ReactElement> = {
  info: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  error: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
      />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  success: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

// ============================================================================
// Component
// ============================================================================

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  variant = "info",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  isLoading = false,
  showCancel = true,
  icon,
  className = "",
}: DialogProps): React.ReactElement | null {
  const [internalLoading, setInternalLoading] = useState(false);
  const styles = VARIANT_STYLES[variant];
  const loading = isLoading || internalLoading;

  const handleConfirm = useCallback(async () => {
    if (!onConfirm) {
      onClose();
      return;
    }

    const result = onConfirm();
    if (result instanceof Promise) {
      setInternalLoading(true);
      try {
        await result;
      } finally {
        setInternalLoading(false);
      }
    }
  }, [onConfirm, onClose]);

  const displayIcon = icon ?? VARIANT_ICONS[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      closeOnBackdropClick={!loading}
      closeOnEscape={!loading}
      className={className}
    >
      <ModalBody className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 p-3 rounded-full ${styles.iconBg}`}>
            <span className={styles.iconColor}>{displayIcon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-ui-text-primary mb-2">{title}</h3>
            <div className="text-sm text-ui-text-secondary">{children}</div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        {showCancel && (
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
        )}
        <Button
          variant={styles.confirmVariant}
          onClick={() => void handleConfirm()}
          loading={loading}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ============================================================================
// Specialized Dialog Variants
// ============================================================================

export type ConfirmDialogProps = Omit<DialogProps, "variant" | "showCancel">;

export function ConfirmDialog(props: ConfirmDialogProps): React.ReactElement | null {
  return <Dialog {...props} variant="warning" showCancel />;
}

export interface DeleteDialogProps extends Omit<DialogProps, "variant"> {
  /** Item name being deleted (for message) */
  itemName?: string;
}

export function DeleteDialog({
  itemName,
  children,
  confirmText = "Delete",
  ...props
}: DeleteDialogProps): React.ReactElement | null {
  return (
    <Dialog {...props} variant="error" confirmText={confirmText}>
      {children ?? (
        <p>
          Are you sure you want to delete{" "}
          {itemName !== undefined && itemName !== "" ? `"${itemName}"` : "this item"}? This action
          cannot be undone.
        </p>
      )}
    </Dialog>
  );
}

export type AlertDialogProps = Omit<DialogProps, "showCancel" | "onConfirm">;

export function AlertDialog(props: AlertDialogProps): React.ReactElement | null {
  return <Dialog {...props} showCancel={false} confirmText="OK" />;
}

export default Dialog;
