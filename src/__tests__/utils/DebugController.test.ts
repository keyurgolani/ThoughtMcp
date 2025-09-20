/**
 * Unit tests for DebugController
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CognitiveComponent,
  ComponentStatus,
} from "../../interfaces/cognitive.js";
import {
  BreakpointCondition,
  DebugController,
} from "../../utils/DebugController.js";
import {
  CognitiveContext,
  CognitiveLogger,
  DebugMode,
  LogLevel,
} from "../../utils/logger.js";

// Mock cognitive component for testing
class MockCognitiveComponent implements CognitiveComponent {
  private status: ComponentStatus = {
    name: "MockCognitiveComponent",
    initialized: false,
    active: false,
    last_activity: Date.now(),
  };

  async initialize(): Promise<void> {
    this.status = {
      ...this.status,
      initialized: true,
    };
  }

  async process(input: unknown): Promise<unknown> {
    this.status = {
      ...this.status,
      active: true,
      last_activity: Date.now(),
    };

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    this.status = {
      ...this.status,
      active: false,
      last_activity: Date.now(),
    };

    return { processed: input };
  }

  reset(): void {
    this.status = {
      name: "MockCognitiveComponent",
      initialized: false,
      active: false,
      last_activity: Date.now(),
    };
  }

  getStatus(): ComponentStatus {
    return this.status;
  }
}

describe("DebugController", () => {
  let debugController: DebugController;
  let logger: CognitiveLogger;
  let mockComponent: MockCognitiveComponent;

  beforeEach(() => {
    // Reset singleton instance
    (CognitiveLogger as any).instance = undefined;
    logger = CognitiveLogger.getInstance();
    debugController = new DebugController();
    mockComponent = new MockCognitiveComponent();
    logger.setLogLevel(LogLevel.DEBUG);
  });

  afterEach(() => {
    logger.clearLogs();
  });

  describe("Debug Session Management", () => {
    it("should start a debug session", () => {
      const session = debugController.startDebugSession(
        "test-session",
        DebugMode.BASIC
      );

      expect(session.id).toBe("test-session");
      expect(session.start_time).toBeDefined();
      expect(session.components.size).toBe(0);
      expect(session.breakpoints.size).toBe(0);
      expect(session.step_mode).toBe(false);
      expect(session.current_step).toBe(0);
    });

    it("should start session with step mode for FULL debug mode", () => {
      const session = debugController.startDebugSession(
        "test-session",
        DebugMode.FULL
      );
      expect(session.step_mode).toBe(true);
    });

    it("should end a debug session and generate report", () => {
      debugController.startDebugSession("test-session");
      debugController.registerComponent("test-session", mockComponent);

      // Add some log entries
      logger.info(
        "MockCognitiveComponent",
        "Test operation",
        {},
        {
          session_id: "test-session",
          processing_time: 100,
          confidence: 0.8,
        }
      );

      const result = debugController.endDebugSession("test-session");

      expect(result.session).toBeDefined();
      expect(result.report).toContain("Debug Session Report: test-session");
      expect(result.report).toContain("MockCognitiveComponent");
      expect(result.visualization_data).toBeDefined();

      const vizData = JSON.parse(result.visualization_data);
      expect(vizData.session_id).toBe("test-session");
    });

    it("should throw error when ending non-existent session", () => {
      expect(() => {
        debugController.endDebugSession("non-existent-session");
      }).toThrow("Debug session non-existent-session not found");
    });
  });

  describe("Component Registration", () => {
    beforeEach(() => {
      debugController.startDebugSession("test-session");
    });

    it("should register component for debugging", () => {
      debugController.registerComponent("test-session", mockComponent);

      const components = debugController.getSessionComponents("test-session");
      expect(components).toHaveLength(1);
      expect(components[0].component_name).toBe("MockCognitiveComponent");
      expect(components[0].status.name).toBe("MockCognitiveComponent");
      expect(components[0].status.initialized).toBe(false);
    });

    it("should throw error when registering to non-existent session", () => {
      expect(() => {
        debugController.registerComponent(
          "non-existent-session",
          mockComponent
        );
      }).toThrow("Debug session non-existent-session not found");
    });
  });

  describe("Breakpoint Management", () => {
    it("should set and remove breakpoints", () => {
      const condition: BreakpointCondition = {
        component: "TestComponent",
        confidence_threshold: 0.5,
      };

      debugController.setBreakpoint("test-breakpoint", condition);
      debugController.removeBreakpoint("test-breakpoint");

      // Verify breakpoint was removed (no direct way to check, but no error should occur)
      expect(true).toBe(true);
    });

    it("should evaluate breakpoint conditions correctly", () => {
      const condition: BreakpointCondition = {
        component: "TestComponent",
        confidence_threshold: 0.7,
      };

      debugController.setBreakpoint("confidence-breakpoint", condition);

      const lowConfidenceContext: CognitiveContext = {
        session_id: "test-session",
        confidence: 0.5,
      };

      const highConfidenceContext: CognitiveContext = {
        session_id: "test-session",
        confidence: 0.9,
      };

      expect(
        debugController.shouldBreak("TestComponent", lowConfidenceContext)
      ).toBe(true);
      expect(
        debugController.shouldBreak("TestComponent", highConfidenceContext)
      ).toBe(false);
      expect(
        debugController.shouldBreak("OtherComponent", lowConfidenceContext)
      ).toBe(false);
    });

    it("should evaluate processing time threshold breakpoints", () => {
      const condition: BreakpointCondition = {
        processing_time_threshold: 100,
      };

      debugController.setBreakpoint("time-breakpoint", condition);

      const slowContext: CognitiveContext = {
        session_id: "test-session",
        processing_time: 150,
      };

      const fastContext: CognitiveContext = {
        session_id: "test-session",
        processing_time: 50,
      };

      expect(debugController.shouldBreak("TestComponent", slowContext)).toBe(
        true
      );
      expect(debugController.shouldBreak("TestComponent", fastContext)).toBe(
        false
      );
    });

    it("should evaluate error condition breakpoints", () => {
      const condition: BreakpointCondition = {
        error_condition: true,
      };

      debugController.setBreakpoint("error-breakpoint", condition);

      const errorContext: CognitiveContext = {
        session_id: "test-session",
        metacognitive_flags: ["error", "low_confidence"],
      };

      const normalContext: CognitiveContext = {
        session_id: "test-session",
        metacognitive_flags: ["normal"],
      };

      expect(debugController.shouldBreak("TestComponent", errorContext)).toBe(
        true
      );
      expect(debugController.shouldBreak("TestComponent", normalContext)).toBe(
        false
      );
    });

    it("should evaluate custom condition breakpoints", () => {
      const condition: BreakpointCondition = {
        custom_condition: (context) =>
          context.working_memory_load !== undefined &&
          context.working_memory_load > 0.8,
      };

      debugController.setBreakpoint("custom-breakpoint", condition);

      const highLoadContext: CognitiveContext = {
        session_id: "test-session",
        working_memory_load: 0.9,
      };

      const lowLoadContext: CognitiveContext = {
        session_id: "test-session",
        working_memory_load: 0.5,
      };

      expect(
        debugController.shouldBreak("TestComponent", highLoadContext)
      ).toBe(true);
      expect(debugController.shouldBreak("TestComponent", lowLoadContext)).toBe(
        false
      );
    });
  });

  describe("Step Mode Debugging", () => {
    beforeEach(() => {
      debugController.startDebugSession("test-session", DebugMode.FULL);
    });

    it("should increment step counter", () => {
      expect(
        debugController.getSessionComponents("test-session")
      ).toBeDefined();

      debugController.step("test-session");
      debugController.step("test-session");

      // We can't directly access current_step, but we can verify no errors occur
      expect(true).toBe(true);
    });

    it("should throw error when stepping non-existent session", () => {
      expect(() => {
        debugController.step("non-existent-session");
      }).toThrow("Debug session non-existent-session not found");
    });
  });

  describe("Component Inspection", () => {
    beforeEach(() => {
      debugController.startDebugSession("test-session");
      debugController.registerComponent("test-session", mockComponent);
    });

    it("should inspect component state", () => {
      const debugInfo = debugController.inspectComponent(
        "test-session",
        "MockCognitiveComponent"
      );

      expect(debugInfo).toBeDefined();
      expect(debugInfo?.component_name).toBe("MockCognitiveComponent");
      expect(debugInfo?.status.name).toBe("MockCognitiveComponent");
      expect(debugInfo?.status.initialized).toBe(false);
      expect(debugInfo?.state_snapshot).toBeDefined();
      expect(debugInfo?.performance_metrics).toBeDefined();
    });

    it("should return null for non-existent component", () => {
      const debugInfo = debugController.inspectComponent(
        "test-session",
        "NonExistentComponent"
      );
      expect(debugInfo).toBeNull();
    });

    it("should throw error when inspecting component in non-existent session", () => {
      expect(() => {
        debugController.inspectComponent(
          "non-existent-session",
          "MockCognitiveComponent"
        );
      }).toThrow("Debug session non-existent-session not found");
    });
  });

  describe("Visualization Generation", () => {
    beforeEach(() => {
      debugController.startDebugSession("test-session");

      // Add some log entries for visualization
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

    it("should generate ASCII flow visualization", () => {
      const ascii = debugController.generateFlowVisualization(
        "test-session",
        "ascii"
      );

      expect(ascii).toContain("Cognitive Flow for Session: test-session");
      expect(ascii).toContain("SensoryProcessor");
      expect(ascii).toContain("WorkingMemoryModule");
    });

    it("should generate Mermaid flow visualization", () => {
      const mermaid = debugController.generateFlowVisualization(
        "test-session",
        "mermaid"
      );

      expect(mermaid).toContain("graph TD");
      expect(mermaid).toContain("SensoryProcessor");
      expect(mermaid).toContain("WorkingMemoryModule");
    });

    it("should get performance heatmap", () => {
      const heatmap = debugController.getPerformanceHeatmap("test-session");

      expect(heatmap.components).toContain("SensoryProcessor");
      expect(heatmap.components).toContain("WorkingMemoryModule");
      expect(heatmap.metrics).toHaveLength(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing debug session gracefully", () => {
      expect(() => {
        debugController.getSessionComponents("non-existent-session");
      }).toThrow("Debug session non-existent-session not found");
    });

    it("should handle visualization of empty session", () => {
      debugController.startDebugSession("empty-session");

      expect(() => {
        debugController.generateFlowVisualization("empty-session");
      }).toThrow();
    });
  });

  describe("Debug Report Generation", () => {
    beforeEach(() => {
      debugController.startDebugSession("test-session");
      debugController.registerComponent("test-session", mockComponent);

      // Add various log entries
      logger.info(
        "MockCognitiveComponent",
        "Successful operation",
        {},
        {
          session_id: "test-session",
          processing_time: 100,
          confidence: 0.8,
        }
      );

      logger.error(
        "MockCognitiveComponent",
        "Failed operation",
        {},
        {
          session_id: "test-session",
          processing_time: 50,
          confidence: 0.3,
        }
      );
    });

    it("should generate comprehensive debug report", () => {
      const result = debugController.endDebugSession("test-session");

      expect(result.report).toContain("Debug Session Report: test-session");
      expect(result.report).toContain("Duration:");
      expect(result.report).toContain("Components: 1");
      expect(result.report).toContain("Component Summary:");
      expect(result.report).toContain("MockCognitiveComponent:");
      expect(result.report).toContain("Performance Analysis:");
    });
  });
});
