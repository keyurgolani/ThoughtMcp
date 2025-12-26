/**
 * ContextMenu Component
 *
 * Right-click context menu for memory nodes with options:
 * Edit, Delete, Link, Bookmark
 *
 * Requirements: 15.1
 */

import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export type ContextMenuAction = 'edit' | 'delete' | 'link' | 'bookmark';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuProps {
  /** Position to display the menu */
  position: ContextMenuPosition;
  /** Whether the node is already bookmarked */
  isBookmarked: boolean;
  /** Callback when an action is selected */
  onAction: (action: ContextMenuAction) => void;
  /** Callback to close the menu */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

// ============================================================================
// Icons
// ============================================================================

function EditIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DeleteIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function LinkIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Individual menu item with icon and label
 */
function MenuItem({
  icon,
  label,
  onClick,
  variant = 'default',
}: MenuItemProps): React.ReactElement {
  const baseClasses = `
    flex items-center gap-3 w-full px-3 py-2
    text-sm transition-colors cursor-pointer
    rounded-md
  `;

  const variantClasses =
    variant === 'danger'
      ? 'text-red-400 hover:bg-red-500/20'
      : 'text-ui-text-primary hover:bg-ui-accent-primary/20';

  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses}`} role="menuitem">
      <span className="flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ContextMenu - Right-click context menu for memory nodes
 *
 * Features:
 * - Edit, Delete, Link, Bookmark options
 * - Glassmorphism styling
 * - Click outside to close
 * - Keyboard navigation (Escape to close)
 *
 * Requirements: 15.1
 */
export function ContextMenu({
  position,
  isBookmarked,
  onAction,
  onClose,
  className = '',
}: ContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add listeners with a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return (): void => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position if menu would overflow right edge
      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${String(position.x - rect.width)}px`;
      }

      // Adjust vertical position if menu would overflow bottom edge
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${String(position.y - rect.height)}px`;
      }
    }
  }, [position]);

  const handleAction = useCallback(
    (action: ContextMenuAction) => {
      onAction(action);
      onClose();
    },
    [onAction, onClose]
  );

  return (
    <div
      ref={menuRef}
      className={`
        fixed z-50
        bg-ui-surface
        backdrop-blur-glass
        border border-ui-border
        rounded-lg
        shadow-glow
        p-1
        min-w-[160px]
        ${className}
      `}
      style={{
        left: position.x,
        top: position.y,
        boxShadow: `
          0 0 20px rgba(0, 255, 255, 0.15),
          inset 0 0 30px rgba(0, 255, 255, 0.05)
        `,
      }}
      role="menu"
      aria-label="Memory context menu"
    >
      <MenuItem
        icon={<EditIcon />}
        label="Edit"
        onClick={() => {
          handleAction('edit');
        }}
      />
      <MenuItem
        icon={<BookmarkIcon filled={isBookmarked} />}
        label={isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
        onClick={() => {
          handleAction('bookmark');
        }}
      />
      <MenuItem
        icon={<LinkIcon />}
        label="Create Link"
        onClick={() => {
          handleAction('link');
        }}
      />
      <div className="my-1 border-t border-ui-border" />
      <MenuItem
        icon={<DeleteIcon />}
        label="Delete"
        onClick={() => {
          handleAction('delete');
        }}
        variant="danger"
      />
    </div>
  );
}

export default ContextMenu;
