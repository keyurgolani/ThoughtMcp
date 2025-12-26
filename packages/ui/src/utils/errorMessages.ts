/**
 * Error Message Utilities
 *
 * Provides user-friendly error messages for common API errors.
 */

/**
 * Format an API error into a user-friendly message
 */
export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Network/connection errors
    if (
      message.includes("EAGAIN") ||
      message.includes("ECONNREFUSED") ||
      message.includes("fetch") ||
      message.includes("Failed to fetch") ||
      message.includes("Network request failed") ||
      message.includes("NetworkError")
    ) {
      return "Backend server not available. Please start the Thought server to use this feature.";
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      return "Request timed out. Please try again.";
    }

    // Authentication errors
    if (message.includes("401") || message.includes("Unauthorized")) {
      return "Authentication required. Please check your credentials.";
    }

    // Not found errors
    if (message.includes("404") || message.includes("Not Found")) {
      return "Resource not found. The requested item may have been deleted.";
    }

    // Server errors
    if (message.includes("500") || message.includes("Internal Server Error")) {
      return "Server error. Please try again later.";
    }

    // Return original message if no specific handling
    return message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Check if an error is a connection error (backend not available)
 */
export function isConnectionError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message;
    return (
      message.includes("EAGAIN") ||
      message.includes("ECONNREFUSED") ||
      message.includes("fetch") ||
      message.includes("Failed to fetch") ||
      message.includes("Network request failed") ||
      message.includes("NetworkError")
    );
  }
  return false;
}
