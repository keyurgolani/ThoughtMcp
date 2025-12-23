/**
 * Username Modal Component
 *
 * A modal that requires the user to enter their username before using the app.
 * Cannot be dismissed without entering a valid username.
 *
 * Requirements: User authentication for memory isolation
 */

import { useCallback, useState, type FormEvent, type KeyboardEvent } from 'react';

export interface UsernameModalProps {
  /** Callback when username is submitted */
  onSubmit: (username: string) => void;
  /** Optional error message to display */
  error?: string;
}

/**
 * Username Modal - requires user to enter username before proceeding
 */
export function UsernameModal({ onSubmit, error }: UsernameModalProps): React.ReactElement {
  const [username, setUsername] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateUsername = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Username is required';
    }
    if (trimmed.length < 2) {
      return 'Username must be at least 2 characters';
    }
    if (trimmed.length > 50) {
      return 'Username must be less than 50 characters';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent): void => {
      e.preventDefault();
      const validationResult = validateUsername(username);
      if (validationResult !== null) {
        setValidationError(validationResult);
        return;
      }
      setValidationError(null);
      onSubmit(username.trim());
    },
    [username, validateUsername, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleSubmit]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      setUsername(e.target.value);
      // Clear validation error when user starts typing
      if (validationError !== null) {
        setValidationError(null);
      }
    },
    [validationError]
  );

  const displayError = error ?? validationError;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-panel-glow rounded-2xl p-8 w-full max-w-md mx-4 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-ui-accent-primary/30 to-ui-accent-secondary/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-ui-accent-primary"
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
          <h2 className="text-2xl font-semibold text-ui-text-primary mb-2">
            Welcome to ThoughtMCP
          </h2>
          <p className="text-ui-text-secondary text-sm">
            Enter your username to access your memories and cognitive tools.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-ui-text-secondary mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter your username"
              autoFocus
              autoComplete="username"
              className={`w-full px-4 py-3 rounded-xl bg-ui-bg-secondary/50 border ${
                displayError !== null && displayError !== undefined
                  ? 'border-status-error focus:border-status-error'
                  : 'border-ui-border focus:border-ui-accent-primary'
              } text-ui-text-primary placeholder-ui-text-tertiary focus:outline-none focus:ring-2 ${
                displayError !== null && displayError !== undefined
                  ? 'focus:ring-status-error/30'
                  : 'focus:ring-ui-accent-primary/30'
              } transition-all duration-200`}
            />
            {displayError !== null && displayError !== undefined && (
              <p className="mt-2 text-sm text-status-error flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {displayError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-ui-accent-primary to-ui-accent-secondary text-white font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ui-accent-primary/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!username.trim()}
          >
            Continue
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-ui-text-tertiary">
          Your username is used to isolate your memories and cognitive sessions.
        </p>
      </div>
    </div>
  );
}
