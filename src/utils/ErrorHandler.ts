/**
 * Comprehensive error handling utilities for the cognitive MCP server
 * Provides graceful degradation and component failure recovery
 */

import { Logger } from "./logger.js";

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface ComponentError {
  component: string;
  error: Error;
  severity: ErrorSeverity;
  timestamp: number;
  context?: Record<string, unknown>;
}

export interface GracefulDegradationOptions {
  enableFallbacks: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  criticalComponents: string[];
}

export class ErrorHandler {
  private static logger = Logger.getInstance();
  private static componentErrors: Map<string, ComponentError[]> = new Map();
  private static readonly MAX_ERROR_HISTORY = 100;

  /**
   * Handle errors with appropriate logging and recovery strategies
   */
  static async handleError(
    error: Error | string,
    component: string,
    context?: Record<string, unknown>,
    options?: Partial<GracefulDegradationOptions>
  ): Promise<{ canContinue: boolean; fallbackData?: unknown }> {
    const errorObj = typeof error === "string" ? new Error(error) : error;
    const severity = this.assessErrorSeverity(errorObj, component);

    // Log the error
    this.logError(errorObj, component, severity, context);

    // Record error for tracking
    this.recordComponentError(component, errorObj, severity, context);

    // Determine if we can continue with graceful degradation
    const canContinue = this.canGracefullyDegrade(component, severity, options);

    if (canContinue && options?.enableFallbacks !== false) {
      const fallbackData = await this.attemptFallback(
        component,
        errorObj,
        context
      );
      return { canContinue: true, fallbackData };
    }

    return { canContinue: false };
  }

  /**
   * Wrap async operations with error handling and retries
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    component: string,
    options?: Partial<GracefulDegradationOptions>
  ): Promise<{ success: boolean; data?: T; error?: Error }> {
    const maxRetries = options?.maxRetries ?? 3;
    const retryDelay = options?.retryDelayMs ?? 1000;
    const timeout = options?.timeoutMs ?? 30000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wrap with timeout
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise<T>(timeout),
        ]);

        return { success: true, data: result };
      } catch (error) {
        const errorObj =
          error instanceof Error ? error : new Error(String(error));

        this.logger.warn(
          component,
          `Attempt ${attempt}/${maxRetries} failed: ${errorObj.message}`
        );

        // If this is the last attempt, handle the error
        if (attempt === maxRetries) {
          const handleResult = await this.handleError(errorObj, component, {
            attempt,
          });
          return {
            success: false,
            error: errorObj,
            data: handleResult.fallbackData as T,
          };
        }

        // Wait before retry (exponential backoff)
        await this.delay(retryDelay * Math.pow(2, attempt - 1));
      }
    }

    return { success: false, error: new Error("Max retries exceeded") };
  }

  /**
   * Check if a component can gracefully degrade
   */
  private static canGracefullyDegrade(
    component: string,
    severity: ErrorSeverity,
    options?: Partial<GracefulDegradationOptions>
  ): boolean {
    // Critical errors cannot be gracefully degraded
    if (severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    // Check if component is marked as critical
    const criticalComponents = options?.criticalComponents ?? [
      "CognitiveOrchestrator",
      "MemorySystem",
    ];

    if (
      criticalComponents.includes(component) &&
      severity === ErrorSeverity.HIGH
    ) {
      return false;
    }

    // Check error frequency for this component
    const recentErrors = this.getRecentErrors(component, 60000); // Last minute
    if (recentErrors.length > 5) {
      this.logger.error(
        component,
        `Too many recent errors (${recentErrors.length}), cannot degrade gracefully`
      );
      return false;
    }

    return true;
  }

  /**
   * Attempt to provide fallback functionality
   */
  private static async attemptFallback(
    component: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<unknown> {
    this.logger.info(
      component,
      `Attempting fallback for error: ${error.message}`
    );

    switch (component) {
      case "SensoryProcessor":
        return this.sensoryProcessorFallback(context);

      case "EmotionalProcessor":
        return this.emotionalProcessorFallback(context);

      case "MetacognitionModule":
        return this.metacognitionFallback(context);

      case "PredictiveProcessor":
        return this.predictiveProcessorFallback(context);

      case "StochasticNeuralProcessor":
        return this.stochasticProcessorFallback(context);

      case "DualProcessController":
        return this.dualProcessFallback(context);

      default:
        this.logger.warn(
          component,
          `No fallback available for component: ${component}`
        );
        return null;
    }
  }

  /**
   * Fallback implementations for various components
   */
  private static sensoryProcessorFallback(context?: Record<string, unknown>) {
    return {
      tokens: context?.input
        ? [
            {
              text: String(context.input),
              position: 0,
              semantic_weight: 1.0,
              attention_score: 1.0,
              context_tags: ["fallback"],
            },
          ]
        : [],
      patterns: [],
      salience_map: new Map(),
    };
  }

  private static emotionalProcessorFallback(
    _context?: Record<string, unknown>
  ) {
    return {
      valence: 0,
      arousal: 0.5,
      dominance: 0.5,
      specific_emotions: new Map(),
    };
  }

  private static metacognitionFallback(_context?: Record<string, unknown>) {
    return {
      confidence: 0.5,
      coherence: 0.5,
      completeness: 0.5,
      biases_detected: [],
      suggestions: [
        "Metacognitive monitoring unavailable - using default assessment",
      ],
      reasoning: "Fallback assessment due to component failure",
    };
  }

  private static predictiveProcessorFallback(
    _context?: Record<string, unknown>
  ) {
    return {
      predictions: [],
      confidence: 0.5,
      model_updates: [],
    };
  }

  private static stochasticProcessorFallback(
    context?: Record<string, unknown>
  ) {
    // Return input unchanged when stochastic processing fails
    return context?.input ?? null;
  }

  private static dualProcessFallback(context?: Record<string, unknown>) {
    return {
      system1_response: {
        content: String(context?.input ?? ""),
        confidence: 0.5,
        processing_time: 0,
        heuristics_used: ["fallback"],
        patterns_detected: [],
      },
      system2_response: null,
      conflict_detected: false,
      resolution_strategy: "fallback_system1_only",
      processing_time_system1: 0,
      processing_time_system2: 0,
    };
  }

  /**
   * Assess error severity based on error type and component
   */
  private static assessErrorSeverity(
    error: Error,
    component: string
  ): ErrorSeverity {
    const message = error.message.toLowerCase();

    // Critical errors that should stop processing
    if (
      message.includes("out of memory") ||
      message.includes("stack overflow") ||
      message.includes("segmentation fault")
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for core component failures
    const coreComponents = [
      "CognitiveOrchestrator",
      "MemorySystem",
      "DualProcessController",
    ];
    if (coreComponents.includes(component)) {
      if (
        message.includes("initialization") ||
        message.includes("configuration") ||
        message.includes("connection")
      ) {
        return ErrorSeverity.HIGH;
      }
    }

    // Medium severity for processing errors
    if (
      message.includes("processing") ||
      message.includes("timeout") ||
      message.includes("validation")
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low severity
    return ErrorSeverity.LOW;
  }

  /**
   * Log errors with appropriate detail level
   */
  private static logError(
    error: Error,
    component: string,
    severity: ErrorSeverity,
    context?: Record<string, unknown>
  ): void {
    const logData = {
      component,
      severity,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(
          component,
          `CRITICAL ERROR: ${error.message}`,
          logData
        );
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(
          component,
          `HIGH SEVERITY: ${error.message}`,
          logData
        );
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(
          component,
          `MEDIUM SEVERITY: ${error.message}`,
          logData
        );
        break;
      case ErrorSeverity.LOW:
        this.logger.info(component, `LOW SEVERITY: ${error.message}`, logData);
        break;
    }
  }

  /**
   * Record component error for tracking and analysis
   */
  private static recordComponentError(
    component: string,
    error: Error,
    severity: ErrorSeverity,
    context?: Record<string, unknown>
  ): void {
    if (!this.componentErrors.has(component)) {
      this.componentErrors.set(component, []);
    }

    const errors = this.componentErrors.get(component);
    if (!errors) {
      throw new Error(`Component errors not found for: ${component}`);
    }
    errors.push({
      component,
      error,
      severity,
      timestamp: Date.now(),
      context: context ?? {},
    });

    // Keep only recent errors to prevent memory leaks
    if (errors.length > this.MAX_ERROR_HISTORY) {
      errors.splice(0, errors.length - this.MAX_ERROR_HISTORY);
    }
  }

  /**
   * Get recent errors for a component
   */
  private static getRecentErrors(
    component: string,
    timeWindowMs: number
  ): ComponentError[] {
    const errors = this.componentErrors.get(component) ?? [];
    const cutoff = Date.now() - timeWindowMs;
    return errors.filter((error) => error.timestamp > cutoff);
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStatistics(): Record<
    string,
    {
      total: number;
      recent: number;
      by_severity: Record<ErrorSeverity, number>;
    }
  > {
    const stats: Record<
      string,
      {
        total: number;
        recent: number;
        by_severity: Record<ErrorSeverity, number>;
      }
    > = {};
    const recentCutoff = Date.now() - 300000; // Last 5 minutes

    for (const [component, errors] of this.componentErrors.entries()) {
      const recentErrors = errors.filter((e) => e.timestamp > recentCutoff);

      stats[component] = {
        total: errors.length,
        recent: recentErrors.length,
        by_severity: {
          [ErrorSeverity.LOW]: errors.filter(
            (e) => e.severity === ErrorSeverity.LOW
          ).length,
          [ErrorSeverity.MEDIUM]: errors.filter(
            (e) => e.severity === ErrorSeverity.MEDIUM
          ).length,
          [ErrorSeverity.HIGH]: errors.filter(
            (e) => e.severity === ErrorSeverity.HIGH
          ).length,
          [ErrorSeverity.CRITICAL]: errors.filter(
            (e) => e.severity === ErrorSeverity.CRITICAL
          ).length,
        },
      };
    }

    return stats;
  }

  /**
   * Clear error history for a component
   */
  static clearErrorHistory(component?: string): void {
    if (component) {
      this.componentErrors.delete(component);
    } else {
      this.componentErrors.clear();
    }
  }

  /**
   * Create a timeout promise
   */
  private static createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    });
  }

  /**
   * Delay utility for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
