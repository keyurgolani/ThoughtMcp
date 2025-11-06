/**
 * Cognitive Process Visualization Tools
 *
 * Provides tools for visualizing cognitive processes, component interactions,
 * and thought flows for debugging and analysis purposes.
 */

import { CognitiveContext, getLogger, LogEntry } from "./logger.js";

export interface VisualizationNode {
  id: string;
  component: string;
  timestamp: number;
  message: string;
  cognitive_context?: CognitiveContext;
  children: VisualizationNode[];
  parent?: string;
}

export interface CognitiveFlow {
  session_id: string;
  start_time: number;
  end_time: number;
  nodes: VisualizationNode[];
  edges: { from: string; to: string; type: string }[];
  metrics: {
    total_processing_time: number;
    avg_confidence: number;
    component_usage: Record<string, number>;
    reasoning_steps: number;
  };
}

export interface ComponentState {
  component: string;
  timestamp: number;
  state: Record<string, unknown>;
  performance_metrics: {
    processing_time?: number;
    memory_usage?: number;
    confidence?: number;
    error_rate?: number;
  };
}

export class CognitiveVisualizer {
  private logger = getLogger();

  /**
   * Generate a cognitive flow visualization from log entries
   */
  generateCognitiveFlow(sessionId: string): CognitiveFlow {
    const timeline = this.logger.getCognitiveTimeline(sessionId);

    if (timeline.length === 0) {
      throw new Error(`No cognitive timeline found for session ${sessionId}`);
    }

    const nodes = this.buildVisualizationNodes(timeline);
    const edges = this.buildVisualizationEdges(nodes);
    const metrics = this.calculateFlowMetrics(timeline);

    return {
      session_id: sessionId,
      start_time: timeline[0].timestamp,
      end_time: timeline[timeline.length - 1].timestamp,
      nodes,
      edges,
      metrics,
    };
  }

  /**
   * Generate ASCII art visualization of cognitive flow
   */
  generateASCIIFlow(sessionId: string): string {
    const flow = this.generateCognitiveFlow(sessionId);
    const lines: string[] = [];

    lines.push(`Cognitive Flow for Session: ${sessionId}`);
    lines.push("=".repeat(50));
    lines.push(`Duration: ${flow.end_time - flow.start_time}ms`);
    lines.push(
      `Components: ${Object.keys(flow.metrics.component_usage).join(", ")}`
    );
    lines.push(`Avg Confidence: ${flow.metrics.avg_confidence.toFixed(2)}`);
    lines.push("");

    // Build timeline visualization
    const sortedNodes = flow.nodes.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i];
      const indent = this.calculateIndent(node, sortedNodes);
      const timeOffset = node.timestamp - flow.start_time;

      lines.push(
        `${indent}[${timeOffset}ms] ${node.component}: ${node.message}`
      );

      if (node.cognitive_context) {
        const ctx = node.cognitive_context;
        const contextInfo: string[] = [];

        if (ctx.confidence !== undefined) {
          contextInfo.push(`conf=${ctx.confidence.toFixed(2)}`);
        }
        if (ctx.processing_time !== undefined) {
          contextInfo.push(`time=${ctx.processing_time}ms`);
        }
        if (ctx.working_memory_load !== undefined) {
          contextInfo.push(`wm=${ctx.working_memory_load.toFixed(2)}`);
        }

        if (contextInfo.length > 0) {
          lines.push(`${indent}  └─ ${contextInfo.join(", ")}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Generate Mermaid diagram for cognitive flow
   */
  generateMermaidDiagram(sessionId: string): string {
    const flow = this.generateCognitiveFlow(sessionId);
    const lines: string[] = [];

    lines.push("graph TD");

    // Add nodes
    flow.nodes.forEach((node) => {
      const label = `${node.component}\\n${node.message.substring(0, 30)}...`;
      const confidence = node.cognitive_context?.confidence ?? 0;
      const style =
        confidence > 0.8
          ? "fill:#90EE90"
          : confidence > 0.5
          ? "fill:#FFE4B5"
          : "fill:#FFB6C1";

      lines.push(`    ${node.id}["${label}"]`);
      lines.push(`    ${node.id} --> ${node.id}[style="${style}"]`);
      lines.push(
        `    ${node.id} --> ${node.id}:::${this.getNodeClass(confidence)}`
      );
    });

    // Add edges
    flow.edges.forEach((edge) => {
      lines.push(`    ${edge.from} --> ${edge.to}`);
    });

    // Add styles
    lines.push("    classDef high fill:#90EE90,stroke:#333,stroke-width:2px");
    lines.push("    classDef medium fill:#FFE4B5,stroke:#333,stroke-width:2px");
    lines.push("    classDef low fill:#FFB6C1,stroke:#333,stroke-width:2px");

    return lines.join("\n");
  }

  /**
   * Generate component state timeline
   */
  generateComponentTimeline(
    component: string,
    sessionId?: string
  ): ComponentState[] {
    const debugInfo = this.logger.getComponentDebugInfo(component, sessionId);
    const timeline: ComponentState[] = [];

    debugInfo.logs.forEach((log) => {
      if (log.cognitive_context) {
        timeline.push({
          component,
          timestamp: log.timestamp,
          state: log.context ?? {},
          performance_metrics: {
            ...(log.cognitive_context.processing_time !== undefined && {
              processing_time: log.cognitive_context.processing_time,
            }),
            ...(log.cognitive_context.memory_usage !== undefined && {
              memory_usage: log.cognitive_context.memory_usage,
            }),
            ...(log.cognitive_context.confidence !== undefined && {
              confidence: log.cognitive_context.confidence,
            }),
          },
        });
      }
    });

    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Generate performance heatmap data
   */
  generatePerformanceHeatmap(sessionId: string): {
    components: string[];
    metrics: Array<{
      component: string;
      avg_processing_time: number;
      avg_confidence: number;
      error_rate: number;
      usage_count: number;
    }>;
  } {
    const timeline = this.logger.getCognitiveTimeline(sessionId);
    const componentStats = new Map<
      string,
      {
        processing_times: number[];
        confidences: number[];
        errors: number;
        total: number;
      }
    >();

    timeline.forEach((entry) => {
      const component = entry.component;
      if (!componentStats.has(component)) {
        componentStats.set(component, {
          processing_times: [],
          confidences: [],
          errors: 0,
          total: 0,
        });
      }

      const stats = componentStats.get(component);
      if (!stats) {
        return; // Skip if stats not found
      }
      stats.total++;

      if (entry.level === 3) {
        // ERROR level
        stats.errors++;
      }

      if (entry.cognitive_context) {
        if (entry.cognitive_context.processing_time !== undefined) {
          stats.processing_times.push(entry.cognitive_context.processing_time);
        }
        if (entry.cognitive_context.confidence !== undefined) {
          stats.confidences.push(entry.cognitive_context.confidence);
        }
      }
    });

    const components = Array.from(componentStats.keys());
    const metrics = components.map((component) => {
      const stats = componentStats.get(component);
      if (!stats) {
        throw new Error(`Stats not found for component: ${component}`);
      }
      return {
        component,
        avg_processing_time:
          stats.processing_times.length > 0
            ? stats.processing_times.reduce((a, b) => a + b, 0) /
              stats.processing_times.length
            : 0,
        avg_confidence:
          stats.confidences.length > 0
            ? stats.confidences.reduce((a, b) => a + b, 0) /
              stats.confidences.length
            : 0,
        error_rate: stats.errors / stats.total,
        usage_count: stats.total,
      };
    });

    return { components, metrics };
  }

  /**
   * Export visualization data as JSON
   */
  exportVisualizationData(sessionId: string): string {
    const flow = this.generateCognitiveFlow(sessionId);
    const heatmap = this.generatePerformanceHeatmap(sessionId);

    const exportData = {
      session_id: sessionId,
      generated_at: new Date().toISOString(),
      cognitive_flow: flow,
      performance_heatmap: heatmap,
      component_timelines: {} as Record<string, ComponentState[]>,
    };

    // Add component timelines
    heatmap.components.forEach((component) => {
      exportData.component_timelines[component] =
        this.generateComponentTimeline(component, sessionId);
    });

    return JSON.stringify(exportData, null, 2);
  }

  private buildVisualizationNodes(timeline: LogEntry[]): VisualizationNode[] {
    return timeline.map((entry, index) => ({
      id: `node_${index}`,
      component: entry.component,
      timestamp: entry.timestamp,
      message: entry.message,
      ...(entry.cognitive_context && {
        cognitive_context: entry.cognitive_context,
      }),
      children: [],
      ...(entry.parent_trace_id && { parent: entry.parent_trace_id }),
    }));
  }

  private buildVisualizationEdges(
    nodes: VisualizationNode[]
  ): Array<{ from: string; to: string; type: string }> {
    const edges: Array<{ from: string; to: string; type: string }> = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const current = nodes[i];
      const next = nodes[i + 1];

      // Create temporal edge
      edges.push({
        from: current.id,
        to: next.id,
        type: "temporal",
      });

      // Create parent-child edges based on trace IDs
      if (next.parent && current.id.includes(next.parent)) {
        edges.push({
          from: current.id,
          to: next.id,
          type: "hierarchical",
        });
      }
    }

    return edges;
  }

  private calculateFlowMetrics(timeline: LogEntry[]): CognitiveFlow["metrics"] {
    const componentUsage = new Map<string, number>();
    let totalProcessingTime = 0;
    const confidences: number[] = [];
    let reasoningSteps = 0;

    timeline.forEach((entry) => {
      // Count component usage
      const count = componentUsage.get(entry.component) ?? 0;
      componentUsage.set(entry.component, count + 1);

      if (entry.cognitive_context) {
        if (entry.cognitive_context.processing_time !== undefined) {
          totalProcessingTime += entry.cognitive_context.processing_time;
        }
        if (entry.cognitive_context.confidence !== undefined) {
          confidences.push(entry.cognitive_context.confidence);
        }
        if (entry.cognitive_context.reasoning_step !== undefined) {
          reasoningSteps = Math.max(
            reasoningSteps,
            entry.cognitive_context.reasoning_step
          );
        }
      }
    });

    return {
      total_processing_time: totalProcessingTime,
      avg_confidence:
        confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0,
      component_usage: Object.fromEntries(componentUsage),
      reasoning_steps: reasoningSteps,
    };
  }

  private calculateIndent(
    node: VisualizationNode,
    _allNodes: VisualizationNode[]
  ): string {
    // Simple indentation based on component hierarchy
    const componentOrder = [
      "SensoryProcessor",
      "WorkingMemoryModule",
      "DualProcessController",
      "IntuitiveProcessor",
      "DeliberativeProcessor",
      "EmotionalProcessor",
      "MetacognitionModule",
      "PredictiveProcessor",
      "StochasticNeuralProcessor",
      "MemorySystem",
      "CognitiveOrchestrator",
    ];

    const index = componentOrder.indexOf(node.component);
    const indentLevel = index >= 0 ? Math.floor(index / 3) : 0;
    return "  ".repeat(indentLevel);
  }

  private getNodeClass(confidence: number): string {
    if (confidence > 0.8) return "high";
    if (confidence > 0.5) return "medium";
    return "low";
  }
}

export function createVisualizer(): CognitiveVisualizer {
  return new CognitiveVisualizer();
}
