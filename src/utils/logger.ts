/**
 * Enhanced logging utilities for cognitive processing with structured cognitive context
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum DebugMode {
  NONE = "none",
  BASIC = "basic",
  DETAILED = "detailed",
  FULL = "full",
}

export interface CognitiveContext {
  session_id?: string;
  processing_mode?: string;
  component_state?: Record<string, unknown>;
  reasoning_step?: number;
  confidence?: number;
  memory_usage?: number;
  processing_time?: number;
  emotional_state?: Record<string, unknown>;
  working_memory_load?: number;
  prediction_error?: number;
  metacognitive_flags?: string[];
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  context?: Record<string, unknown>;
  cognitive_context?: CognitiveContext;
  trace_id?: string;
  parent_trace_id?: string;
}

export class CognitiveLogger {
  private static instance: CognitiveLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private debugMode: DebugMode = DebugMode.NONE;
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;
  private enableVisualization: boolean = false;
  private traceStack: string[] = [];
  private componentFilters: Set<string> = new Set();

  private constructor() {
    // Set log level from environment
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && envLogLevel in LogLevel) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    }

    // Set debug mode from environment
    const envDebugMode = process.env.COGNITIVE_DEBUG_MODE?.toLowerCase();
    if (
      envDebugMode &&
      Object.values(DebugMode).includes(envDebugMode as DebugMode)
    ) {
      this.debugMode = envDebugMode as DebugMode;
    }

    // Enable visualization if requested
    this.enableVisualization =
      process.env.COGNITIVE_ENABLE_VISUALIZATION === "true";

    // Set component filters
    const filters = process.env.COGNITIVE_LOG_COMPONENTS?.split(",");
    if (filters) {
      filters.forEach((filter) => this.componentFilters.add(filter.trim()));
    }
  }

  static getInstance(): CognitiveLogger {
    if (!CognitiveLogger.instance) {
      CognitiveLogger.instance = new CognitiveLogger();
    }
    return CognitiveLogger.instance;
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private shouldLog(level: LogLevel, component: string): boolean {
    if (level < this.logLevel) {
      return false;
    }

    // Apply component filters if set
    if (
      this.componentFilters.size > 0 &&
      !this.componentFilters.has(component)
    ) {
      return false;
    }

    return true;
  }

  private formatLogOutput(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toISOString();

    let output = `[${timestamp}] ${levelName} [${entry.component}]`;

    if (entry.trace_id) {
      output += ` [${entry.trace_id}]`;
    }

    output += ` ${entry.message}`;

    // Add cognitive context in debug modes
    if (this.debugMode !== DebugMode.NONE && entry.cognitive_context) {
      const cogCtx = this.formatCognitiveContext(entry.cognitive_context);
      if (cogCtx) {
        output += ` | Cognitive: ${cogCtx}`;
      }
    }

    // Add regular context
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` | Context: ${JSON.stringify(entry.context)}`;
    }

    return output;
  }

  private formatCognitiveContext(cogCtx: CognitiveContext): string {
    const parts: string[] = [];

    if (cogCtx.session_id) parts.push(`session=${cogCtx.session_id}`);
    if (cogCtx.processing_mode) parts.push(`mode=${cogCtx.processing_mode}`);
    if (cogCtx.reasoning_step !== undefined)
      parts.push(`step=${cogCtx.reasoning_step}`);
    if (cogCtx.confidence !== undefined)
      parts.push(`conf=${cogCtx.confidence.toFixed(2)}`);
    if (cogCtx.processing_time !== undefined)
      parts.push(`time=${cogCtx.processing_time}ms`);
    if (cogCtx.working_memory_load !== undefined)
      parts.push(`wm_load=${cogCtx.working_memory_load.toFixed(2)}`);
    if (cogCtx.prediction_error !== undefined)
      parts.push(`pred_err=${cogCtx.prediction_error.toFixed(3)}`);
    if (cogCtx.metacognitive_flags && cogCtx.metacognitive_flags.length > 0) {
      parts.push(`meta_flags=[${cogCtx.metacognitive_flags.join(",")}]`);
    }

    return parts.join(", ");
  }

  private log(
    level: LogLevel,
    component: string,
    message: string,
    context?: Record<string, unknown>,
    cognitiveContext?: CognitiveContext
  ): void {
    if (!this.shouldLog(level, component)) {
      return;
    }

    const traceId = this.generateTraceId();
    const parentTraceId =
      this.traceStack.length > 0
        ? this.traceStack[this.traceStack.length - 1]
        : undefined;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      context: context || {},
      ...(cognitiveContext && { cognitive_context: cognitiveContext }),
      trace_id: traceId,
      ...(parentTraceId && { parent_trace_id: parentTraceId }),
    };

    // Add to internal log storage
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console (stderr for MCP compatibility)
    const formattedOutput = this.formatLogOutput(entry);
    console.error(formattedOutput);

    // Generate visualization data if enabled
    if (this.enableVisualization && cognitiveContext) {
      this.generateVisualizationData(entry);
    }
  }

  // Enhanced logging methods with cognitive context
  debug(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    cognitiveContext?: CognitiveContext
  ): void {
    this.log(LogLevel.DEBUG, component, message, context, cognitiveContext);
  }

  info(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    cognitiveContext?: CognitiveContext
  ): void {
    this.log(LogLevel.INFO, component, message, context, cognitiveContext);
  }

  warn(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    cognitiveContext?: CognitiveContext
  ): void {
    this.log(LogLevel.WARN, component, message, context, cognitiveContext);
  }

  error(
    component: string,
    message: string,
    context?: Record<string, unknown>,
    cognitiveContext?: CognitiveContext
  ): void {
    this.log(LogLevel.ERROR, component, message, context, cognitiveContext);
  }

  // Specialized cognitive logging methods
  logThoughtProcess(
    component: string,
    step: number,
    content: string,
    confidence: number,
    processingTime: number,
    cognitiveContext?: Partial<CognitiveContext>
  ): void {
    this.debug(
      component,
      `Thought step ${step}: ${content}`,
      {},
      {
        reasoning_step: step,
        confidence,
        processing_time: processingTime,
        ...cognitiveContext,
      }
    );
  }

  logMemoryOperation(
    component: string,
    operation: string,
    details: string,
    memoryUsage?: number,
    cognitiveContext?: Partial<CognitiveContext>
  ): void {
    this.debug(
      component,
      `Memory ${operation}: ${details}`,
      {},
      {
        ...(memoryUsage !== undefined && { memory_usage: memoryUsage }),
        ...cognitiveContext,
      }
    );
  }

  logEmotionalState(
    component: string,
    message: string,
    emotionalState: Record<string, unknown>,
    cognitiveContext?: Partial<CognitiveContext>
  ): void {
    this.debug(
      component,
      message,
      {},
      {
        emotional_state: emotionalState,
        ...cognitiveContext,
      }
    );
  }

  logPredictionError(
    component: string,
    message: string,
    predictionError: number,
    cognitiveContext?: Partial<CognitiveContext>
  ): void {
    this.debug(
      component,
      message,
      {},
      {
        prediction_error: predictionError,
        ...cognitiveContext,
      }
    );
  }

  logMetacognition(
    component: string,
    message: string,
    flags: string[],
    cognitiveContext?: Partial<CognitiveContext>
  ): void {
    this.debug(
      component,
      message,
      {},
      {
        metacognitive_flags: flags,
        ...cognitiveContext,
      }
    );
  }

  // Trace management for debugging complex cognitive flows
  startTrace(traceId?: string): string {
    const id = traceId || this.generateTraceId();
    this.traceStack.push(id);
    return id;
  }

  endTrace(): string | undefined {
    return this.traceStack.pop();
  }

  getCurrentTrace(): string | undefined {
    return this.traceStack.length > 0
      ? this.traceStack[this.traceStack.length - 1]
      : undefined;
  }

  // Enhanced log retrieval with cognitive filtering
  getLogs(
    level?: LogLevel,
    component?: string,
    sessionId?: string,
    traceId?: string,
    timeRange?: { start: number; end: number }
  ): LogEntry[] {
    return this.logs.filter((entry) => {
      if (level !== undefined && entry.level < level) {
        return false;
      }
      if (component && entry.component !== component) {
        return false;
      }
      if (sessionId && entry.cognitive_context?.session_id !== sessionId) {
        return false;
      }
      if (traceId && entry.trace_id !== traceId) {
        return false;
      }
      if (
        timeRange &&
        (entry.timestamp < timeRange.start || entry.timestamp > timeRange.end)
      ) {
        return false;
      }
      return true;
    });
  }

  // Get cognitive processing timeline for a session
  getCognitiveTimeline(sessionId: string): LogEntry[] {
    return this.getLogs(undefined, undefined, sessionId)
      .filter((entry) => entry.cognitive_context)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get component-specific debug information
  getComponentDebugInfo(
    component: string,
    sessionId?: string
  ): {
    logs: LogEntry[];
    stats: {
      total_entries: number;
      avg_processing_time?: number;
      avg_confidence?: number;
      error_count: number;
    };
  } {
    const logs = this.getLogs(undefined, component, sessionId);
    const stats: {
      total_entries: number;
      avg_processing_time?: number;
      avg_confidence?: number;
      error_count: number;
    } = {
      total_entries: logs.length,
      error_count: logs.filter((log) => log.level === LogLevel.ERROR).length,
    };

    // Calculate averages from cognitive context
    const cognitiveEntries = logs.filter((log) => log.cognitive_context);
    if (cognitiveEntries.length > 0) {
      const processingTimes = cognitiveEntries
        .map((log) => log.cognitive_context?.processing_time)
        .filter((time): time is number => time !== undefined);

      const confidences = cognitiveEntries
        .map((log) => log.cognitive_context?.confidence)
        .filter((conf): conf is number => conf !== undefined);

      if (processingTimes.length > 0) {
        stats.avg_processing_time =
          processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      }

      if (confidences.length > 0) {
        stats.avg_confidence =
          confidences.reduce((a, b) => a + b, 0) / confidences.length;
      }
    }

    return { logs, stats };
  }

  clearLogs(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  setDebugMode(mode: DebugMode): void {
    this.debugMode = mode;
  }

  setComponentFilters(components: string[]): void {
    this.componentFilters = new Set(components);
  }

  setVisualizationEnabled(enable: boolean): void {
    this.enableVisualization = enable;
  }

  // Visualization data generation
  private generateVisualizationData(entry: LogEntry): void {
    if (!entry.cognitive_context) return;

    // This would generate data for cognitive process visualization
    // In a real implementation, this might write to a file or send to a visualization service
    const vizData = {
      timestamp: entry.timestamp,
      component: entry.component,
      trace_id: entry.trace_id,
      cognitive_state: entry.cognitive_context,
      message: entry.message,
    };

    // For now, just log visualization data in debug mode
    if (this.debugMode === DebugMode.FULL) {
      console.error(`[VIZ] ${JSON.stringify(vizData)}`);
    }
  }
}

// Maintain backward compatibility
export const Logger = CognitiveLogger;

// Export convenience function for getting logger instance
export function getLogger(): CognitiveLogger {
  return CognitiveLogger.getInstance();
}
