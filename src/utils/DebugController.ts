/**
 * Debug Controller for Component-Level Inspection
 *
 * Provides debugging capabilities for cognitive components including
 * state inspection, performance monitoring, and interactive debugging.
 */

import {
  CognitiveComponent,
  ComponentStatus,
} from "../interfaces/cognitive.js";
import { CognitiveVisualizer } from "./CognitiveVisualizer.js";
import { CognitiveContext, DebugMode, getLogger } from "./logger.js";

export interface DebugSession {
  id: string;
  start_time: number;
  components: Map<string, ComponentDebugInfo>;
  breakpoints: Set<string>;
  step_mode: boolean;
  current_step: number;
}

export interface ComponentDebugInfo {
  component_name: string;
  status: ComponentStatus;
  state_snapshot: Record<string, unknown>;
  performance_metrics: {
    avg_processing_time: number;
    memory_usage: number;
    error_count: number;
    call_count: number;
  };
  last_input?: unknown;
  last_output?: unknown;
  last_error?: Error;
}

export interface BreakpointCondition {
  component?: string;
  confidence_threshold?: number;
  processing_time_threshold?: number;
  error_condition?: boolean;
  custom_condition?: (context: CognitiveContext) => boolean;
}

export class DebugController {
  private logger = getLogger();
  private visualizer = new CognitiveVisualizer();
  private debugSessions = new Map<string, DebugSession>();
  private globalBreakpoints = new Map<string, BreakpointCondition>();
  private componentInspectors = new Map<string, ComponentInspector>();

  /**
   * Start a new debug session
   */
  startDebugSession(
    sessionId: string,
    debugMode: DebugMode = DebugMode.BASIC
  ): DebugSession {
    const session: DebugSession = {
      id: sessionId,
      start_time: Date.now(),
      components: new Map(),
      breakpoints: new Set(),
      step_mode: debugMode === DebugMode.FULL,
      current_step: 0,
    };

    this.debugSessions.set(sessionId, session);
    this.logger.setDebugMode(debugMode);

    this.logger.info("DebugController", `Started debug session: ${sessionId}`, {
      debug_mode: debugMode,
      step_mode: session.step_mode,
    });

    return session;
  }

  /**
   * End a debug session and generate report
   */
  endDebugSession(sessionId: string): {
    session: DebugSession;
    report: string;
    visualization_data: string;
  } {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    const report = this.generateDebugReport(session);
    const visualizationData =
      this.visualizer.exportVisualizationData(sessionId);

    this.debugSessions.delete(sessionId);

    this.logger.info("DebugController", `Ended debug session: ${sessionId}`, {
      duration: Date.now() - session.start_time,
      components_debugged: session.components.size,
    });

    return { session, report, visualization_data: visualizationData };
  }

  /**
   * Register a component for debugging
   */
  registerComponent(sessionId: string, component: CognitiveComponent): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    const debugInfo: ComponentDebugInfo = {
      component_name: component.constructor.name,
      status: component.getStatus(),
      state_snapshot: {},
      performance_metrics: {
        avg_processing_time: 0,
        memory_usage: 0,
        error_count: 0,
        call_count: 0,
      },
    };

    session.components.set(component.constructor.name, debugInfo);

    // Create component inspector
    const inspector = new ComponentInspector(component);
    this.componentInspectors.set(component.constructor.name, inspector);

    this.logger.debug(
      "DebugController",
      `Registered component for debugging: ${component.constructor.name}`,
      {},
      {
        session_id: sessionId,
      }
    );
  }

  /**
   * Set a breakpoint with conditions
   */
  setBreakpoint(name: string, condition: BreakpointCondition): void {
    this.globalBreakpoints.set(name, condition);

    this.logger.debug("DebugController", `Set breakpoint: ${name}`, {
      condition: {
        component: condition.component,
        confidence_threshold: condition.confidence_threshold,
        processing_time_threshold: condition.processing_time_threshold,
        error_condition: condition.error_condition,
      },
    });
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(name: string): void {
    this.globalBreakpoints.delete(name);
    this.logger.debug("DebugController", `Removed breakpoint: ${name}`);
  }

  /**
   * Check if execution should break at current context
   */
  shouldBreak(component: string, context: CognitiveContext): boolean {
    for (const [name, condition] of this.globalBreakpoints) {
      if (this.evaluateBreakpointCondition(condition, component, context)) {
        this.logger.warn("DebugController", `Breakpoint triggered: ${name}`, {
          component,
          context,
        });
        return true;
      }
    }
    return false;
  }

  /**
   * Step through execution (for step mode debugging)
   */
  step(sessionId: string): void {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    session.current_step++;
    this.logger.debug(
      "DebugController",
      `Debug step: ${session.current_step}`,
      {},
      {
        session_id: sessionId,
      }
    );
  }

  /**
   * Inspect component state
   */
  inspectComponent(
    sessionId: string,
    componentName: string
  ): ComponentDebugInfo | null {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    const debugInfo = session.components.get(componentName);
    if (!debugInfo) {
      return null;
    }

    // Update with latest inspector data
    const inspector = this.componentInspectors.get(componentName);
    if (inspector) {
      debugInfo.state_snapshot = inspector.getStateSnapshot();
      debugInfo.performance_metrics = inspector.getPerformanceMetrics();
    }

    return debugInfo;
  }

  /**
   * Get all components in session
   */
  getSessionComponents(sessionId: string): ComponentDebugInfo[] {
    const session = this.debugSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debug session ${sessionId} not found`);
    }

    return Array.from(session.components.values());
  }

  /**
   * Generate cognitive flow visualization for session
   */
  generateFlowVisualization(
    sessionId: string,
    format: "ascii" | "mermaid" = "ascii"
  ): string {
    if (format === "mermaid") {
      return this.visualizer.generateMermaidDiagram(sessionId);
    }
    return this.visualizer.generateASCIIFlow(sessionId);
  }

  /**
   * Get performance heatmap for session
   */
  getPerformanceHeatmap(
    sessionId: string
  ): ReturnType<CognitiveVisualizer["generatePerformanceHeatmap"]> {
    return this.visualizer.generatePerformanceHeatmap(sessionId);
  }

  private evaluateBreakpointCondition(
    condition: BreakpointCondition,
    component: string,
    context: CognitiveContext
  ): boolean {
    // Check component filter
    if (condition.component && condition.component !== component) {
      return false;
    }

    // Check confidence threshold
    if (
      condition.confidence_threshold !== undefined &&
      context.confidence !== undefined &&
      context.confidence < condition.confidence_threshold
    ) {
      return true;
    }

    // Check processing time threshold
    if (
      condition.processing_time_threshold !== undefined &&
      context.processing_time !== undefined &&
      context.processing_time > condition.processing_time_threshold
    ) {
      return true;
    }

    // Check error condition
    if (
      condition.error_condition &&
      context.metacognitive_flags?.includes("error")
    ) {
      return true;
    }

    // Check custom condition
    if (condition.custom_condition && condition.custom_condition(context)) {
      return true;
    }

    return false;
  }

  private generateDebugReport(session: DebugSession): string {
    const lines: string[] = [];
    const duration = Date.now() - session.start_time;

    lines.push(`Debug Session Report: ${session.id}`);
    lines.push("=".repeat(50));
    lines.push(`Duration: ${duration}ms`);
    lines.push(`Components: ${session.components.size}`);
    lines.push(`Steps: ${session.current_step}`);
    lines.push("");

    // Component summary
    lines.push("Component Summary:");
    lines.push("-".repeat(20));

    for (const [name, info] of session.components) {
      lines.push(`${name}:`);
      lines.push(`  Status: ${info.status}`);
      lines.push(`  Calls: ${info.performance_metrics.call_count}`);
      lines.push(
        `  Avg Time: ${info.performance_metrics.avg_processing_time.toFixed(
          2
        )}ms`
      );
      lines.push(`  Errors: ${info.performance_metrics.error_count}`);
      lines.push("");
    }

    // Performance analysis
    const heatmap = this.visualizer.generatePerformanceHeatmap(session.id);
    lines.push("Performance Analysis:");
    lines.push("-".repeat(20));

    heatmap.metrics.forEach((metric) => {
      lines.push(`${metric.component}:`);
      lines.push(
        `  Avg Processing Time: ${metric.avg_processing_time.toFixed(2)}ms`
      );
      lines.push(`  Avg Confidence: ${metric.avg_confidence.toFixed(2)}`);
      lines.push(`  Error Rate: ${(metric.error_rate * 100).toFixed(1)}%`);
      lines.push(`  Usage Count: ${metric.usage_count}`);
      lines.push("");
    });

    return lines.join("\n");
  }
}

/**
 * Component Inspector for detailed component state monitoring
 */
class ComponentInspector {
  private component: CognitiveComponent;
  private callTimes: number[] = [];
  private errorCount = 0;
  private callCount = 0;

  constructor(component: CognitiveComponent) {
    this.component = component;
  }

  recordCall(processingTime: number): void {
    this.callTimes.push(processingTime);
    this.callCount++;

    // Keep only last 100 calls for memory efficiency
    if (this.callTimes.length > 100) {
      this.callTimes.shift();
    }
  }

  recordError(): void {
    this.errorCount++;
  }

  getStateSnapshot(): Record<string, unknown> {
    // This would extract internal state from the component
    // Implementation depends on component structure
    return {
      component_type: this.component.constructor.name,
      timestamp: Date.now(),
      // Add component-specific state extraction here
    };
  }

  getPerformanceMetrics(): ComponentDebugInfo["performance_metrics"] {
    const avgTime =
      this.callTimes.length > 0
        ? this.callTimes.reduce((a, b) => a + b, 0) / this.callTimes.length
        : 0;

    return {
      avg_processing_time: avgTime,
      memory_usage: process.memoryUsage().heapUsed, // Approximate
      error_count: this.errorCount,
      call_count: this.callCount,
    };
  }
}

export function createDebugController(): DebugController {
  return new DebugController();
}
