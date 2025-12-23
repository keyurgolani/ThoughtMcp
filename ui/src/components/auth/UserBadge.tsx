/**
 * User Badge Component
 *
 * Displays the current username in a subtle badge that persists across all views.
 * Clicking the badge allows the user to switch to a different username scope.
 */

import { useCallback, useState } from 'react';
import { useUserStore } from '../../stores/userStore';

export interface UserBadgeProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * User Badge - displays current username with option to switch
 */
export function UserBadge({ className = '' }: UserBadgeProps): React.ReactElement | null {
  const username = useUserStore((state) => state.username);
  const clearUser = useUserStore((state) => state.clearUser);
  const [showMenu, setShowMenu] = useState(false);

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

  if (username === null || username === '') {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
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
        {/* Dropdown indicator */}
        <svg
          className={`w-3 h-3 text-ui-text-tertiary transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-40" onClick={handleClickOutside} />

          <div className="absolute right-0 top-full mt-2 z-50 glass-panel-glow rounded-xl p-2 min-w-[160px] animate-fade-in">
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
          </div>
        </>
      )}
    </div>
  );
}
