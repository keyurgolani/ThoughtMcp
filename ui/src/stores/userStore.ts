/**
 * User Store
 *
 * Manages user scope state with localStorage persistence.
 * The username defines the memory scope for all API interactions.
 * This is NOT authentication - it's memory scoping/isolation.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const LOCAL_STORAGE_KEY = 'thoughtmcp-user';

export interface UserState {
  /** Current username for memory scoping, null if not set */
  username: string | null;
  /** Session ID for the current session */
  sessionId: string | null;
  /** Set the username and generate a session ID */
  setUser: (username: string) => void;
  /** Clear the username and session */
  clearUser: () => void;
  /** Check if username needs to be set */
  needsUsername: () => boolean;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${String(Date.now())}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * User store with localStorage persistence
 */
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      username: null,
      sessionId: null,

      setUser: (username: string): void => {
        const trimmedUsername = username.trim();
        if (trimmedUsername === '') return;

        set({
          username: trimmedUsername,
          sessionId: generateSessionId(),
        });
      },

      clearUser: (): void => {
        set({
          username: null,
          sessionId: null,
        });
      },

      needsUsername: (): boolean => {
        const state = get();
        return state.username === null || state.username === '';
      },
    }),
    {
      name: LOCAL_STORAGE_KEY,
      partialize: (state) => ({
        username: state.username,
        sessionId: state.sessionId,
      }),
    }
  )
);

/**
 * Hook to get the current user ID (username)
 * Returns null if not set - caller should handle this case
 */
export function useUserId(): string | null {
  return useUserStore((state) => state.username);
}

/**
 * Hook to get the current user ID (username) - throws if not set
 * Use within authenticated context only
 */
export function useRequiredUserId(): string {
  const username = useUserStore((state) => state.username);
  if (username === null || username === '') {
    throw new Error('User not authenticated');
  }
  return username;
}

/**
 * Hook to get the current session ID
 * Returns null if not set - caller should handle this case
 */
export function useSessionId(): string | null {
  return useUserStore((state) => state.sessionId);
}

/**
 * Hook to get the current session ID - throws if not set
 * Use within authenticated context only
 */
export function useRequiredSessionId(): string {
  const sessionId = useUserStore((state) => state.sessionId);
  if (sessionId === null || sessionId === '') {
    throw new Error('User not authenticated');
  }
  return sessionId;
}
