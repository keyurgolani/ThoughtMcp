/**
 * Unit tests for CognitiveVisualizer
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveVisualizer } from "../../utils/CognitiveVisualizer.js";
import { CognitiveLogger, LogLevel } from "../../utils/logger.js";

describe("CognitiveVisualizer", () => {
  let visualizer: CognitiveVisualizer;
  let logger: CognitiveLogger;

  beforeEach(() => {
    // Reset singleton instance
    (CognitiveLogger as any).instance = undefined;
    logger = CognitiveLogger.getInstance();
    visualizer = new CognitiveVisualizer();
    logger.setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe("Cognitive Flow Generation", () => {
    beforeEach(() => {
      // Set up test cognitive timeline
      logger.info(
        "SensoryProcessor",
        "Processing input",
        {},
        {
          session_id: "test-session",
          processing_mode: "balanced",
          reasoning_step: 1,
          confidence: 0.8,
          processing_time: 50,
        }
      );

      logger.info(
        "WorkingMemoryModule",
        "Integrating information",
        {},
        {
          session_id: "test-session",
          processing_mode: "balanced",
          reasoning_step: 2,
          confidence: 0.75,
          processing_time: 30,
          working_memory_load: 0.6,
        }
      );

      logger.info(
        "DualProcessController",
        "Dual process reasoning",
        {},
        {
          session_id: "test-session",
          processing_mode: "balanced",
          reasoning_step: 3,
          confidence: 0.9,
          processing_time: 120,
        }
      );
    });

    it("should generate cognitive flow", () => {
      const flow = visualizer.generateCognitiveFlow("test-session");

      expect(flow.session_id).toBe("test-session");
      expect(flow.nodes).toHaveLength(3);
      expect(flow.edges.length).toBeGreaterThan(0);
      expect(flow.metrics.total_processing_time).toBe(200); // 50 + 30 + 120
      expect(flow.metrics.avg_confidence).toBeCloseTo(0.817, 2); // (0.8 + 0.75 + 0.9) / 3
      expect(flow.metrics.reasoning_steps).toBe(3);
    });

    it("should throw error for non-existent session", () => {
      expect(() => {
        visualizer.generateCognitiveFlow("non-existent-session");
      }).toThrow(
        "No cognitive timeline found for session non-existent-session"
      );
    });

    it("should calculate component usage correctly", () => {
      const flow = visualizer.generateCognitiveFlow("test-session");

      expect(flow.metrics.component_usage).toEqual({
        SensoryProcessor: 1,
        WorkingMemoryModule: 1,
        DualProcessController: 1,
      });
    });
  });

  describe("ASCII Flow Visualization", () => {
    beforeEach(() => {
      logger.info(
        "SensoryProcessor",
        "Processing input",
        {},
        {
          session_id: "test-session",
          confidence: 0.8,
          processing_time: 50,
        }
      );

      logger.info(
        "WorkingMemoryModule",
        "Integrating information",
        {},
        {
          session_id: "test-session",
          confidence: 0.75,
          processing_time: 30,
        }
      );
    });

    it("should generate ASCII flow visualization", () => {
      const ascii = visualizer.generateASCIIFlow("test-session");

      expect(ascii).toContain("Cognitive Flow for Session: test-session");
      expect(ascii).toContain("SensoryProcessor");
      expect(ascii).toContain("WorkingMemoryModule");
      expect(ascii).toContain("Processing input");
      expect(ascii).toContain("Integrating information");
      expect(ascii).toContain("conf=0.80");
      expect(ascii).toContain("time=50ms");
    });

    it("should include duration and component information", () => {
      const ascii = visualizer.generateASCIIFlow("test-session");

      expect(ascii).toContain("Duration:");
      expect(ascii).toContain(
        "Components: SensoryProcessor, WorkingMemoryModule"
      );
      expect(ascii).toContain("Avg Confidence:");
    });
  });

  describe("Mermaid Diagram Generation", () => {
    beforeEach(() => {
      logger.info(
        "SensoryProcessor",
        "Processing input",
        {},
        {
          session_id: "test-session",
          confidence: 0.9,
        }
      );

      logger.info(
        "WorkingMemoryModule",
        "Integrating information",
        {},
        {
          session_id: "test-session",
          confidence: 0.6,
        }
      );
    });

    it("should generate Mermaid diagram", () => {
      const mermaid = visualizer.generateMermaidDiagram("test-session");

      expect(mermaid).toContain("graph TD");
      expect(mermaid).toContain("SensoryProcessor");
      expect(mermaid).toContain("WorkingMemoryModule");
      expect(mermaid).toContain("classDef high fill:#90EE90");
      expect(mermaid).toContain("classDef medium fill:#FFE4B5");
      expect(mermaid).toContain("classDef low fill:#FFB6C1");
    });

    it("should include node connections", () => {
      const mermaid = visualizer.generateMermaidDiagram("test-session");
      expect(mermaid).toContain("-->");
    });
  });

  describe("Component Timeline Generation", () => {
    beforeEach(() => {
      logger.info(
        "TestComponent",
        "First operation",
        {},
        {
          session_id: "test-session",
          processing_time: 100,
          confidence: 0.8,
        }
      );

      logger.warn(
        "TestComponent",
        "Second operation",
        {},
        {
          session_id: "test-session",
          processing_time: 150,
          confidence: 0.6,
        }
      );
    });

    it("should generate component timeline", () => {
      const timeline = visualizer.generateComponentTimeline(
        "TestComponent",
        "test-session"
      );

      expect(timeline).toHaveLength(2);
      expect(timeline[0].component).toBe("TestComponent");
      expect(timeline[0].performance_metrics.processing_time).toBe(100);
      expect(timeline[0].performance_metrics.confidence).toBe(0.8);
      expect(timeline[1].performance_metrics.processing_time).toBe(150);
      expect(timeline[1].performance_metrics.confidence).toBe(0.6);
    });

    it("should sort timeline by timestamp", () => {
      const timeline = visualizer.generateComponentTimeline(
        "TestComponent",
        "test-session"
      );

      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].timestamp).toBeGreaterThanOrEqual(
          timeline[i - 1].timestamp
        );
      }
    });
  });

  describe("Performance Heatmap Generation", () => {
    beforeEach(() => {
      // Add multiple entries for different components
      logger.info(
        "ComponentA",
        "Operation 1",
        {},
        {
          session_id: "test-session",
          processing_time: 100,
          confidence: 0.8,
        }
      );

      logger.info(
        "ComponentA",
        "Operation 2",
        {},
        {
          session_id: "test-session",
          processing_time: 200,
          confidence: 0.9,
        }
      );

      logger.error(
        "ComponentB",
        "Failed operation",
        {},
        {
          session_id: "test-session",
          processing_time: 50,
          confidence: 0.3,
        }
      );

      logger.info(
        "ComponentB",
        "Successful operation",
        {},
        {
          session_id: "test-session",
          processing_time: 75,
          confidence: 0.7,
        }
      );
    });

    it("should generate performance heatmap", () => {
      const heatmap = visualizer.generatePerformanceHeatmap("test-session");

      expect(heatmap.components).toContain("ComponentA");
      expect(heatmap.components).toContain("ComponentB");
      expect(heatmap.metrics).toHaveLength(2);

      const componentA = heatmap.metrics.find(
        (m) => m.component === "ComponentA"
      );
      const componentB = heatmap.metrics.find(
        (m) => m.component === "ComponentB"
      );

      expect(componentA?.avg_processing_time).toBe(150); // (100 + 200) / 2
      expect(componentA?.avg_confidence).toBeCloseTo(0.85, 2); // (0.8 + 0.9) / 2
      expect(componentA?.error_rate).toBe(0); // No errors
      expect(componentA?.usage_count).toBe(2);

      expect(componentB?.avg_processing_time).toBe(62.5); // (50 + 75) / 2
      expect(componentB?.avg_confidence).toBe(0.5); // (0.3 + 0.7) / 2
      expect(componentB?.error_rate).toBe(0.5); // 1 error out of 2 total
      expect(componentB?.usage_count).toBe(2);
    });
  });

  describe("Visualization Data Export", () => {
    beforeEach(() => {
      logger.info(
        "SensoryProcessor",
        "Processing input",
        {},
        {
          session_id: "test-session",
          processing_time: 50,
          confidence: 0.8,
        }
      );

      logger.info(
        "WorkingMemoryModule",
        "Integrating information",
        {},
        {
          session_id: "test-session",
          processing_time: 30,
          confidence: 0.75,
        }
      );
    });

    it("should export complete visualization data as JSON", () => {
      const exportData = visualizer.exportVisualizationData("test-session");
      const parsed = JSON.parse(exportData);

      expect(parsed.session_id).toBe("test-session");
      expect(parsed.generated_at).toBeDefined();
      expect(parsed.cognitive_flow).toBeDefined();
      expect(parsed.performance_heatmap).toBeDefined();
      expect(parsed.component_timelines).toBeDefined();

      // Check cognitive flow data
      expect(parsed.cognitive_flow.nodes).toHaveLength(2);
      expect(parsed.cognitive_flow.metrics.total_processing_time).toBe(80);

      // Check performance heatmap data
      expect(parsed.performance_heatmap.components).toContain(
        "SensoryProcessor"
      );
      expect(parsed.performance_heatmap.components).toContain(
        "WorkingMemoryModule"
      );

      // Check component timelines
      expect(parsed.component_timelines.SensoryProcessor).toBeDefined();
      expect(parsed.component_timelines.WorkingMemoryModule).toBeDefined();
    });

    it("should generate valid JSON", () => {
      const exportData = visualizer.exportVisualizationData("test-session");
      expect(() => JSON.parse(exportData)).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty session gracefully", () => {
      expect(() => {
        visualizer.generateCognitiveFlow("empty-session");
      }).toThrow();
    });

    it("should handle session with no cognitive context", () => {
      logger.info("TestComponent", "Message without cognitive context", {});

      expect(() => {
        visualizer.generateCognitiveFlow("test-session");
      }).toThrow();
    });

    it("should handle component timeline for non-existent component", () => {
      const timeline = visualizer.generateComponentTimeline(
        "NonExistentComponent",
        "test-session"
      );
      expect(timeline).toHaveLength(0);
    });
  });
});
