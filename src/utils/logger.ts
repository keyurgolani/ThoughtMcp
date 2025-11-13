/**
 * Logger utility for ThoughtMCP
 *
 * Writes to stderr to avoid interfering with MCP protocol on stdout.
 * Simple implementation without external dependencies.
 */

/**
 * Format arguments for logging
 */
function formatArgs(...args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return arg.stack ?? arg.message;
      }
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ");
}

/**
 * Logger class with methods for different log levels
 */
export class Logger {
  /**
   * Log error messages to stderr
   */
  static error(...args: unknown[]): void {
    const message = formatArgs(...args);
    process.stderr.write(`${message}\n`);
  }

  /**
   * Log info messages to stderr
   */
  static info(...args: unknown[]): void {
    const message = formatArgs(...args);
    process.stderr.write(`${message}\n`);
  }

  /**
   * Log warning messages to stderr
   */
  static warn(...args: unknown[]): void {
    const message = formatArgs(...args);
    process.stderr.write(`${message}\n`);
  }

  /**
   * Log debug messages to stderr (only in development)
   */
  static debug(...args: unknown[]): void {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    const message = formatArgs(...args);
    process.stderr.write(`${message}\n`);
  }

  /**
   * Log general messages to stderr
   */
  static log(...args: unknown[]): void {
    const message = formatArgs(...args);
    process.stderr.write(`${message}\n`);
  }
}
