/**
 * useKeyboardShortcuts Hook
 *
 * Centralized keyboard shortcut management for the application.
 * Provides global shortcuts for navigation, actions, and UI controls.
 *
 * Shortcuts:
 * - ⌘/Ctrl + 1-7: Navigate to different screens
 * - ⌘/Ctrl + B: Toggle sidebar
 * - ⌘/Ctrl + K: Open search (when available)
 * - ⌘/Ctrl + Enter: Submit/Execute primary action
 * - Escape: Close modals, exit focus mode
 * - ?: Show keyboard shortcuts help
 */

import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Display key combination (e.g., "⌘1" or "Ctrl+1") */
  keys: string;
  /** Description of what the shortcut does */
  description: string;
  /** Category for grouping in help modal */
  category: "navigation" | "actions" | "ui" | "editing";
  /** Whether the shortcut is currently active */
  enabled: boolean;
}

export interface UseKeyboardShortcutsOptions {
  /** Callback for navigation shortcuts */
  onNavigate?: (route: string) => void;
  /** Callback for toggling sidebar */
  onToggleSidebar?: () => void;
  /** Callback for opening search */
  onOpenSearch?: () => void;
  /** Callback for showing help modal */
  onShowHelp?: () => void;
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

export interface UseKeyboardShortcutsReturn {
  /** List of all available shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Whether the help modal is open */
  isHelpOpen: boolean;
  /** Open the help modal */
  openHelp: () => void;
  /** Close the help modal */
  closeHelp: () => void;
  /** Get the modifier key display string based on OS */
  modifierKey: string;
}

// ============================================================================
// Constants
// ============================================================================

const NAVIGATION_ROUTES = [
  { key: "1", route: "/dashboard", label: "Dashboard" },
  { key: "2", route: "/explorer", label: "Memory Explorer" },
  { key: "3", route: "/reasoning", label: "Reasoning Console" },
  { key: "4", route: "/framework", label: "Framework Analysis" },
  { key: "5", route: "/decomposition", label: "Problem Decomposition" },
  { key: "6", route: "/confidence-bias", label: "Confidence & Bias" },
  { key: "7", route: "/emotion", label: "Emotion Analysis" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect if the user is on macOS
 */
function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    navigator.platform;
  return platform.toUpperCase().indexOf("MAC") >= 0;
}

/**
 * Get the modifier key display string based on OS
 */
function getModifierKey(): string {
  return isMacOS() ? "⌘" : "Ctrl";
}

/**
 * Check if an element is an input or editable
 */
function isInputElement(element: EventTarget | null): boolean {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toUpperCase();
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    element.isContentEditable
  );
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {}
): UseKeyboardShortcutsReturn {
  const { onNavigate, onToggleSidebar, onOpenSearch, onShowHelp, enabled = true } = options;

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const modifierKey = getModifierKey();

  // Build shortcuts list
  const shortcuts: KeyboardShortcut[] = [
    // Navigation shortcuts
    ...NAVIGATION_ROUTES.map((nav) => ({
      id: `nav-${nav.key}`,
      keys: `${modifierKey}${nav.key}`,
      description: `Go to ${nav.label}`,
      category: "navigation" as const,
      enabled: !!onNavigate,
    })),
    // UI shortcuts
    {
      id: "toggle-sidebar",
      keys: `${modifierKey}B`,
      description: "Toggle sidebar",
      category: "ui",
      enabled: !!onToggleSidebar,
    },
    {
      id: "open-search",
      keys: `${modifierKey}K`,
      description: "Open search",
      category: "ui",
      enabled: !!onOpenSearch,
    },
    {
      id: "show-help",
      keys: "?",
      description: "Show keyboard shortcuts",
      category: "ui",
      enabled: true,
    },
    // Action shortcuts
    {
      id: "submit",
      keys: `${modifierKey}↵`,
      description: "Submit / Execute action",
      category: "actions",
      enabled: true,
    },
    {
      id: "escape",
      keys: "Esc",
      description: "Close modal / Exit focus mode",
      category: "ui",
      enabled: true,
    },
  ];

  const openHelp = useCallback(() => {
    setIsHelpOpen(true);
    onShowHelp?.();
  }, [onShowHelp]);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Don't handle shortcuts when typing in inputs (except for specific ones)
      const isInput = isInputElement(e.target);

      // Handle ? for help (only when not in input)
      if (e.key === "?" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        openHelp();
        return;
      }

      // Handle Escape to close help
      if (e.key === "Escape" && isHelpOpen) {
        e.preventDefault();
        closeHelp();
        return;
      }

      // Handle modifier key shortcuts
      const hasModifier = e.metaKey || e.ctrlKey;
      if (!hasModifier) return;

      // Navigation shortcuts (1-7)
      const navRoute = NAVIGATION_ROUTES.find((nav) => nav.key === e.key);
      if (navRoute && onNavigate && !isInput) {
        e.preventDefault();
        onNavigate(navRoute.route);
        return;
      }

      // Toggle sidebar (B)
      if (e.key === "b" && onToggleSidebar && !isInput) {
        e.preventDefault();
        onToggleSidebar();
        return;
      }

      // Open search (K)
      if (e.key === "k" && onOpenSearch && !isInput) {
        e.preventDefault();
        onOpenSearch();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, isHelpOpen, onNavigate, onToggleSidebar, onOpenSearch, openHelp, closeHelp]);

  return {
    shortcuts,
    isHelpOpen,
    openHelp,
    closeHelp,
    modifierKey,
  };
}

export default useKeyboardShortcuts;
