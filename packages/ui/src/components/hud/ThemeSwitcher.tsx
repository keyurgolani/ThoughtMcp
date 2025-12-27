/**
 * ThemeSwitcher Component
 *
 * A compact theme selection component that allows users to switch between
 * 8 available themes (4 dark, 4 light). Displays as a dropdown with theme previews.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { themes, useThemeStore, type ThemeId } from "../../stores/themeStore";
import { GlassPanel } from "./GlassPanel";

// ============================================================================
// Types
// ============================================================================

export interface ThemeSwitcherProps {
  /** Position of the dropdown */
  position?: "top" | "bottom";
  /** Alignment of the dropdown */
  align?: "left" | "right";
  /** Additional CSS classes */
  className?: string;
  /** Compact mode - icon only */
  compact?: boolean;
}

// Dark themes in display order
const DARK_THEMES: ThemeId[] = ["cosmic", "ember", "forest", "midnight"];

// Light themes in display order
const LIGHT_THEMES: ThemeId[] = ["dawn", "arctic", "sage", "pearl"];

// ============================================================================
// Theme Preview Component
// ============================================================================

interface ThemePreviewProps {
  themeId: ThemeId;
  isSelected: boolean;
  onClick: () => void;
}

function ThemePreview({ themeId, isSelected, onClick }: ThemePreviewProps): React.ReactElement {
  const theme = themes[themeId];
  const { colors } = theme;

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-2.5 rounded-lg
        flex items-center gap-3
        transition-all duration-200
        ${isSelected ? "ring-1" : "hover:bg-black/5 dark:hover:bg-white/5"}
      `}
      style={{
        backgroundColor: isSelected ? "var(--theme-primary-bg)" : undefined,
        borderColor: isSelected ? "var(--theme-primary-glow)" : undefined,
      }}
      aria-pressed={isSelected}
    >
      {/* Color preview circles */}
      <div className="flex gap-1 flex-shrink-0">
        <div
          className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/10"
          style={{ backgroundColor: colors.primary }}
          title="Primary"
        />
        <div
          className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/10"
          style={{ backgroundColor: colors.secondary }}
          title="Secondary"
        />
        <div
          className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/10"
          style={{ backgroundColor: colors.highlight }}
          title="Highlight"
        />
      </div>

      {/* Theme info */}
      <div className="flex-1 text-left min-w-0">
        <div
          className="text-sm font-medium truncate"
          style={{ color: "var(--theme-text-primary)" }}
        >
          {theme.name}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <svg
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "var(--theme-primary)" }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

// ============================================================================
// Section Header Component
// ============================================================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
}

function SectionHeader({ icon, label }: SectionHeaderProps): React.ReactElement {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium uppercase tracking-wider"
      style={{ color: "var(--theme-text-muted)" }}
    >
      {icon}
      {label}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ThemeSwitcher({
  position = "bottom",
  align = "right",
  className = "",
  compact = false,
}: ThemeSwitcherProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { currentTheme, setTheme, getTheme } = useThemeStore();
  const theme = getTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return (): void => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return (): void => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleThemeSelect = useCallback(
    (themeId: ThemeId): void => {
      setTheme(themeId);
      setIsOpen(false);
    },
    [setTheme]
  );

  const toggleDropdown = useCallback((): void => {
    setIsOpen((prev) => !prev);
  }, []);

  // Position classes for dropdown
  const positionClasses = position === "top" ? "bottom-full mb-2" : "top-full mt-2";
  const alignClasses = align === "left" ? "left-0" : "right-0";

  // Icons for section headers
  const moonIcon = (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  );

  const sunIcon = (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`
          flex items-center gap-2 rounded-lg
          transition-all duration-200
          ${compact ? "p-2" : "px-3 py-2"}
          hover:opacity-90
        `}
        style={{
          backgroundColor: "var(--theme-surface)",
          border: "1px solid var(--theme-border)",
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title="Change theme"
      >
        {/* Theme icon with color indicator */}
        {compact ? (
          /* Compact mode: palette icon with theme color accent */
          <div className="relative">
            <svg
              className="w-5 h-5"
              style={{ color: "var(--theme-text-secondary)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            {/* Small color dot indicator */}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--theme-surface)]"
              style={{ backgroundColor: theme.colors.primary }}
            />
          </div>
        ) : (
          /* Full mode: color dots with theme name */
          <div className="flex gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: theme.colors.secondary }}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: theme.colors.highlight }}
            />
          </div>
        )}

        {!compact && (
          <>
            <span className="text-sm" style={{ color: "var(--theme-text-secondary)" }}>
              {theme.name}
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              style={{ color: "var(--theme-text-muted)" }}
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
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-50 ${positionClasses} ${alignClasses}
            w-64 animate-scale-in
          `}
        >
          <GlassPanel variant="floating" className="p-2">
            {/* Dark themes section */}
            <SectionHeader icon={moonIcon} label="Dark" />
            <div className="space-y-0.5 mb-3" role="listbox" aria-label="Dark themes">
              {DARK_THEMES.map((themeId) => (
                <ThemePreview
                  key={themeId}
                  themeId={themeId}
                  isSelected={themeId === currentTheme}
                  onClick={(): void => {
                    handleThemeSelect(themeId);
                  }}
                />
              ))}
            </div>

            {/* Light themes section */}
            <SectionHeader icon={sunIcon} label="Light" />
            <div className="space-y-0.5" role="listbox" aria-label="Light themes">
              {LIGHT_THEMES.map((themeId) => (
                <ThemePreview
                  key={themeId}
                  themeId={themeId}
                  isSelected={themeId === currentTheme}
                  onClick={(): void => {
                    handleThemeSelect(themeId);
                  }}
                />
              ))}
            </div>

            {/* Reduce motion toggle */}
            <div className="mt-3 pt-3 border-t border-white/10 px-2">
              <ReduceMotionToggle />
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Reduce Motion Toggle
// ============================================================================

function ReduceMotionToggle(): React.ReactElement {
  const { respectReducedMotion, toggleReducedMotion } = useThemeStore();

  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-xs transition-colors" style={{ color: "var(--theme-text-muted)" }}>
        Reduce motion
      </span>
      <button
        onClick={toggleReducedMotion}
        className="relative w-9 h-5 rounded-full transition-colors duration-200"
        style={{
          backgroundColor: respectReducedMotion
            ? "var(--theme-primary-subtle)"
            : "var(--theme-surface-sunken)",
        }}
        role="switch"
        aria-checked={respectReducedMotion}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200"
          style={{
            backgroundColor: respectReducedMotion
              ? "var(--theme-primary)"
              : "var(--theme-text-muted)",
            transform: respectReducedMotion ? "translateX(16px)" : "translateX(0)",
          }}
        />
      </button>
    </label>
  );
}

export default ThemeSwitcher;
