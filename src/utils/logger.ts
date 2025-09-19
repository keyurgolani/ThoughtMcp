/**
 * Logging utilities for cognitive processing
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  context?: any;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  private constructor() {
    // Set log level from environment
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && envLogLevel in LogLevel) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, component: string, message: string, context?: any): void {
    if (level < this.logLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      context
    };

    // Add to internal log storage
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console (stderr for MCP compatibility)
    const levelName = LogLevel[level];
    const timestamp = new Date(entry.timestamp).toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    
    console.error(`[${timestamp}] ${levelName} [${component}] ${message}${contextStr}`);
  }

  debug(component: string, message: string, context?: any): void {
    this.log(LogLevel.DEBUG, component, message, context);
  }

  info(component: string, message: string, context?: any): void {
    this.log(LogLevel.INFO, component, message, context);
  }

  warn(component: string, message: string, context?: any): void {
    this.log(LogLevel.WARN, component, message, context);
  }

  error(component: string, message: string, context?: any): void {
    this.log(LogLevel.ERROR, component, message, context);
  }

  getLogs(level?: LogLevel, component?: string): LogEntry[] {
    return this.logs.filter(entry => {
      if (level !== undefined && entry.level < level) {
        return false;
      }
      if (component && entry.component !== component) {
        return false;
      }
      return true;
    });
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}