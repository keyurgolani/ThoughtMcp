/**
 * Structured Logger
 *
 * Production-ready structured logging with log levels, context, and JSON output.
 * Writes to stderr to avoid interfering with MCP protocol on stdout.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type { LogEntry, LogLevel } from "./types.js";

/**
 * Log level priority (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

/**
 * Structured Logger class
 *
 * Provides structured logging with configurable log levels, context propagation,
 * and JSON output for production environments.
 */
export class StructuredLogger {
  private minLevel: LogLevel;
  private structuredOutput: boolean;
  private defaultContext: Record<string, unknown>;
  private component: string;

  constructor(
    options: {
      minLevel?: LogLevel;
      structuredOutput?: boolean;
      component?: string;
      defaultContext?: Record<string, unknown>;
    } = {}
  ) {
    this.minLevel = options.minLevel ?? this.getLogLevelFromEnv();
    this.structuredOutput = options.structuredOutput ?? process.env.NODE_ENV === "production";
    this.component = options.component ?? "thoughtmcp";
    this.defaultContext = options.defaultContext ?? {};
  }

  /**
   * Get log level from environment variable
   */
  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
      return envLevel as LogLevel;
    }
    return process.env.NODE_ENV === "production" ? "warn" : "debug";
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * Format a log entry for output
   */
  private formatEntry(entry: LogEntry): string {
    if (this.structuredOutput) {
      return JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      });
    }

    // Human-readable format for development
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const component = entry.component ? `[${entry.component}]` : "";
    const operation = entry.operation ? `(${entry.operation})` : "";
    const duration = entry.durationMs !== undefined ? ` [${entry.durationMs}ms]` : "";
    const traceId = entry.traceId ? ` trace=${entry.traceId}` : "";

    let message = `${timestamp} ${level} ${component}${operation} ${entry.message}${duration}${traceId}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      message += ` ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      message += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\n  ${entry.error.stack}`;
      }
    }

    return message;
  }

  /**
   * Write a log entry
   */
  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatEntry(entry);
    process.stderr.write(`${formatted}\n`);
  }

  /**
   * Create a log entry with common fields
   */
  private createEntry(
    level: LogLevel,
    message: string,
    options: {
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
      error?: Error;
      durationMs?: number;
    } = {}
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      component: this.component,
      operation: options.operation,
      traceId: options.traceId,
      context: { ...this.defaultContext, ...options.context },
      durationMs: options.durationMs,
    };

    if (options.error) {
      entry.error = {
        name: options.error.name,
        message: options.error.message,
        stack: options.error.stack,
        code: (options.error as Error & { code?: string }).code,
      };
    }

    return entry;
  }

  /**
   * Log a debug message
   */
  debug(
    message: string,
    options?: {
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
      durationMs?: number;
    }
  ): void {
    this.write(this.createEntry("debug", message, options));
  }

  /**
   * Log an info message
   */
  info(
    message: string,
    options?: {
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
      durationMs?: number;
    }
  ): void {
    this.write(this.createEntry("info", message, options));
  }

  /**
   * Log a warning message
   */
  warn(
    message: string,
    options?: {
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
      error?: Error;
      durationMs?: number;
    }
  ): void {
    this.write(this.createEntry("warn", message, options));
  }

  /**
   * Log an error message
   */
  error(
    message: string,
    options?: {
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
      error?: Error;
      durationMs?: number;
    }
  ): void {
    this.write(this.createEntry("error", message, options));
  }

  /**
   * Log a fatal error message
   */
  fatal(
    message: string,
    options?: {
      operation?: string;
      traceId?: string;
      context?: Record<string, unknown>;
      error?: Error;
      durationMs?: number;
    }
  ): void {
    this.write(this.createEntry("fatal", message, options));
  }

  /**
   * Create a child logger with additional context
   */
  child(options: { component?: string; context?: Record<string, unknown> }): StructuredLogger {
    return new StructuredLogger({
      minLevel: this.minLevel,
      structuredOutput: this.structuredOutput,
      component: options.component ?? this.component,
      defaultContext: { ...this.defaultContext, ...options.context },
    });
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Get the current minimum log level
   */
  getLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Enable or disable structured output
   */
  setStructuredOutput(enabled: boolean): void {
    this.structuredOutput = enabled;
  }

  /**
   * Check if structured output is enabled
   */
  isStructuredOutput(): boolean {
    return this.structuredOutput;
  }
}

/**
 * Global structured logger instance
 */
export const logger = new StructuredLogger();
