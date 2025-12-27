/**
 * User Badge Component
 *
 * Displays the current username in a subtle badge that persists across all views.
 * Clicking the badge allows the user to switch to a different username scope
 * and change the theme.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { themes, useThemeStore, type ThemeId } from "../../stores/themeStore";
import { useUserStore } from "../../stores/userStore";

export interface UserBadgeProps {
  /** Additional CSS classes */
  className?: string;
}

// All themes in display order
const ALL_THEMES: ThemeId[] = [
  "cosmic",
  "ember",
  "forest",
  "midnight",
  "dawn",
  "arctic",
  "sage",
  "pearl",
];

/**
 * Theme option component for the dropdown
 */
function ThemeOption({
  themeId,
  isSelected,
  onClick,
}: {
  themeId: ThemeId;
  isSelected: boolean;
  onClick: () => void;
}): React.ReactElement {
  const theme = themes[themeId];
  const { colors } = theme;

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-3 py-2 rounded-lg
        flex items-center gap-3
        transition-all duration-200
        ${isSelected ? "bg-ui-accent-primary/10" : "hover:bg-ui-bg-secondary/50"}
      `}
      aria-pressed={isSelected}
    >
      {/* Color preview circles */}
      <div className="flex gap-1 flex-shrink-0">
        <div
          className="w-3 h-3 rounded-full ring-1 ring-black/20"
          style={{ backgroundColor: colors.primary }}
        />
        <div
          className="w-3 h-3 rounded-full ring-1 ring-black/20"
          style={{ backgroundColor: colors.secondary }}
        />
        <div
          className="w-3 h-3 rounded-full ring-1 ring-black/20"
          style={{ backgroundColor: colors.highlight }}
        />
      </div>

      {/* Theme name */}
      <span className="flex-1 text-left text-sm text-ui-text-secondary">{theme.name}</span>

      {/* Light/Dark indicator */}
      <div className="flex-shrink-0">
        {theme.isLight ? (
          <svg className="w-3.5 h-3.5 text-ui-text-muted" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-ui-text-muted" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <svg
          className="w-4 h-4 flex-shrink-0 text-ui-accent-primary"
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

/**
 * Reduce motion toggle component
 */
function ReduceMotionToggle(): React.ReactElement {
  const { respectReducedMotion, toggleReducedMotion } = useThemeStore();

  return (
    <label className="flex items-center justify-between px-3 py-2 cursor-pointer">
      <span className="text-xs text-ui-text-muted">Reduce motion</span>
      <button
        onClick={toggleReducedMotion}
        className="relative w-8 h-4 rounded-full transition-colors duration-200"
        style={{
          backgroundColor: respectReducedMotion
            ? "var(--theme-primary-subtle)"
            : "var(--theme-surface-sunken)",
        }}
        role="switch"
        aria-checked={respectReducedMotion}
      >
        <span
          className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full transition-transform duration-200"
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

/**
 * User Badge - displays current username with option to switch and theme selection
 */
export function UserBadge({ className = "" }: UserBadgeProps): React.ReactElement | null {
  const username = useUserStore((state) => state.username);
  const clearUser = useUserStore((state) => state.clearUser);
  const [showMenu, setShowMenu] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const { currentTheme, setTheme, getTheme } = useThemeStore();
  const theme = getTheme();

  const handleClick = useCallback((): void => {
    setShowMenu((prev) => !prev);
  }, []);

  const handleSwitchUser = useCallback((): void => {
    clearUser();
    setShowMenu(false);
  }, [clearUser]);

  const handleClickOutside = useCallback((): void => {
    setShowMenu(false);
  }, []);

  const handleThemeSelect = useCallback(
    (themeId: ThemeId): void => {
      setTheme(themeId);
    },
    [setTheme]
  );

  // Update menu position when opening
  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8, // 8px gap (mt-2)
        right: window.innerWidth - rect.right,
      });
    }
  }, [showMenu]);

  if (username === null || username === "") {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ui-bg-secondary/50 border border-ui-border/50 hover:border-ui-accent-primary/50 transition-all duration-200 group"
        aria-label={`Logged in as ${username}`}
        title={`Memory scope: ${username}`}
      >
        {/* User icon */}
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-ui-accent-primary/30 to-ui-accent-secondary/30 flex items-center justify-center">
          <svg
            className="w-3 h-3 text-ui-accent-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <span className="text-xs text-ui-text-secondary group-hover:text-ui-text-primary transition-colors max-w-[100px] truncate">
          {username}
        </span>
        {/* Theme color indicator */}
        <div className="flex gap-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: theme.colors.secondary }}
          />
        </div>
        {/* Dropdown indicator */}
        <svg
          className={`w-3 h-3 text-ui-text-tertiary transition-transform duration-200 ${showMenu ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu - rendered via portal to escape stacking context */}
      {showMenu &&
        createPortal(
          <>
            {/* Backdrop overlay to close menu - covers entire viewport */}
            <div
              className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-[2px]"
              onClick={handleClickOutside}
              aria-hidden="true"
            />

            <div
              className="fixed z-[9999] glass-panel-glow rounded-xl p-2 min-w-[220px] animate-fade-in shadow-2xl"
              style={{
                top: menuPosition.top,
                right: menuPosition.right,
              }}
            >
              {/* User section */}
              <div className="px-3 py-2 border-b border-ui-border/30 mb-2">
                <p className="text-xs text-ui-text-tertiary">Memory scope</p>
                <p className="text-sm text-ui-text-primary font-medium truncate">{username}</p>
              </div>
              <button
                onClick={handleSwitchUser}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-ui-text-secondary hover:text-ui-text-primary hover:bg-ui-bg-secondary/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Switch User
              </button>

              {/* Theme section */}
              <div className="border-t border-ui-border/30 mt-2 pt-2">
                <p className="px-3 py-1 text-xs text-ui-text-tertiary">Theme</p>
                <div className="space-y-0.5">
                  {ALL_THEMES.map((themeId) => (
                    <ThemeOption
                      key={themeId}
                      themeId={themeId}
                      isSelected={themeId === currentTheme}
                      onClick={(): void => {
                        handleThemeSelect(themeId);
                      }}
                    />
                  ))}
                </div>
                <div className="border-t border-ui-border/30 mt-2 pt-1">
                  <ReduceMotionToggle />
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
