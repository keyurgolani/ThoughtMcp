/**
 * KeyboardShortcutsModal Component
 *
 * Modal displaying all available keyboard shortcuts organized by category.
 * Triggered by pressing "?" key.
 */

import { useEffect, useRef, type ReactElement } from "react";
import type { KeyboardShortcut } from "../../hooks/useKeyboardShortcuts";

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcutsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** List of shortcuts to display */
  shortcuts: KeyboardShortcut[];
  /** Modifier key string (⌘ or Ctrl) */
  modifierKey: string;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  navigation: { label: "Navigation", icon: "🧭" },
  actions: { label: "Actions", icon: "⚡" },
  ui: { label: "Interface", icon: "🎨" },
  editing: { label: "Editing", icon: "✏️" },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ShortcutRowProps {
  shortcut: KeyboardShortcut;
}

function ShortcutRow({ shortcut }: ShortcutRowProps): ReactElement {
  return (
    <div
      className={`
        flex items-center justify-between py-2 px-3 rounded-lg
        ${shortcut.enabled ? "bg-ui-surface/50" : "bg-ui-surface/20 opacity-50"}
        transition-colors hover:bg-ui-surface/70
      `}
    >
      <span className="text-sm text-ui-text-primary">{shortcut.description}</span>
      <kbd
        className={`
          px-2 py-1 text-xs font-mono rounded
          ${shortcut.enabled ? "bg-ui-accent-primary/20 text-ui-accent-primary border border-ui-accent-primary/30" : "bg-ui-border/30 text-ui-text-muted border border-ui-border/50"}
        `}
      >
        {shortcut.keys}
      </kbd>
    </div>
  );
}

interface CategorySectionProps {
  category: string;
  shortcuts: KeyboardShortcut[];
}

function CategorySection({ category, shortcuts }: CategorySectionProps): ReactElement | null {
  const categoryInfo = CATEGORY_LABELS[category] || { label: category, icon: "📌" };
  const enabledShortcuts = shortcuts.filter((s) => s.enabled);

  if (enabledShortcuts.length === 0) return null;

  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-xs font-semibold text-ui-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
        <span>{categoryInfo.icon}</span>
        {categoryInfo.label}
      </h3>
      <div className="space-y-1">
        {enabledShortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.id} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts,
}: KeyboardShortcutsModalProps): ReactElement | null {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent): void => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return (): void => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce<Record<string, KeyboardShortcut[]>>((acc, shortcut) => {
    const category = shortcut.category;
    if (acc[category] === undefined) {
      acc[category] = [];
    }
    const categoryArray = acc[category];
    categoryArray.push(shortcut);
    return acc;
  }, {});

  // Order categories
  const categoryOrder = ["navigation", "actions", "ui", "editing"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        ref={modalRef}
        className="
          w-[90%] max-w-lg max-h-[80vh]
          bg-ui-surface/95 backdrop-blur-glass
          border border-ui-border
          rounded-xl shadow-glow
          overflow-hidden
          animate-scale-in
        "
        style={{
          boxShadow: `
            0 0 40px rgba(0, 255, 255, 0.2),
            0 0 80px rgba(0, 255, 255, 0.1),
            inset 0 0 30px rgba(0, 255, 255, 0.05)
          `,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ui-border">
          <h2
            id="shortcuts-modal-title"
            className="text-lg font-semibold text-ui-accent-primary flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
              />
            </svg>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ui-text-muted hover:text-ui-text-primary hover:bg-ui-border/30 transition-colors"
            aria-label="Close shortcuts modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)] custom-scrollbar">
          {categoryOrder.map((category) => {
            const categoryShortcuts = groupedShortcuts[category];
            if (!categoryShortcuts) return null;
            return (
              <CategorySection key={category} category={category} shortcuts={categoryShortcuts} />
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-ui-border bg-ui-background/30">
          <p className="text-xs text-ui-text-muted text-center">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-ui-surface rounded text-ui-text-secondary">?</kbd>{" "}
            anytime to show this help •{" "}
            <kbd className="px-1.5 py-0.5 bg-ui-surface rounded text-ui-text-secondary">Esc</kbd> to
            close
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
