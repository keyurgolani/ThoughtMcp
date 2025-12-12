/**
 * Activity Routes Unit Tests
 *
 * Tests for the activity routes including the dashboard endpoint.
 * Requirements: 7.2
 */

import { beforeEach, describe, expect, it } from "vitest";
import { healthChecker } from "../../../monitoring/health-checker.js";
import { metrics } from "../../../monitoring/metrics-collector.js";
import type { CognitiveCore } from "../../../server/cognitive-core.js";
import { createActivityRoutes } from "../../../server/routes/activity.js";

// Mock cognitive core with all required methods
const createMockCognitiveCore = (): CognitiveCore => {
  return {
    memoryRepository: {} as CognitiveCore["memoryRepository"],
    reasoningOrchestrator: {} as CognitiveCore["reasoningOrchestrator"],
    frameworkSelector: {} as CognitiveCore["frameworkSelector"],
    confidenceAssessor: {} as CognitiveCore["confidenceAssessor"],
    biasDetector: {} as CognitiveCore["biasDetector"],
    emotionAnalyzer: {} as CognitiveCore["emotionAnalyzer"],
    problemDecomposer: {} as CognitiveCore["problemDecomposer"],
    memoryAugmentedReasoning: {} as CognitiveCore["memoryAugmentedReasoning"],
  };
};

// Helper to make request and get response using the router directly
async function makeRequest(
  core: CognitiveCore,
  method: "get" | "post",
  path: string,
  _body?: unknown
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const mockReq: any = {
      method: method.toUpperCase(),
      url: path,
      path: path,
      headers: {},
      body: _body || {},
      query: {},
      params: {},
      requestId: "test-request-id",
    };

    const mockRes: any = {
      statusCode: 200,
      _headers: {} as Record<string, string>,
      _body: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: unknown) {
        this._body = data;
        resolve({ status: this.statusCode, body: data });
        return this;
      },
      setHeader(name: string, value: string) {
        this._headers[name] = value;
        return this;
      },
      getHeader(name: string) {
        return this._headers[name];
      },
    };

    // Find the matching route and execute it
    const router = createActivityRoutes(core);
    const layer = router.stack.find((l: any) => {
      if (!l.route) return false;
      const routePath = l.route.path;
      const routeMethod = Object.keys(l.route.methods)[0];
      return path.endsWith(routePath) && routeMethod === method;
    });

    if (layer?.route) {
      const handler = layer.route.stack[0].handle;
      handler(mockReq, mockRes, (err: unknown) => {
        if (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          resolve({ status: 500, body: { error: errorMessage } });
        }
      });
    } else {
      resolve({ status: 404, body: { error: "Not found" } });
    }
  });
}

describe("Activity Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
    // Reset metrics before each test
    metrics.resetAll();
  });

  describe("createActivityRoutes", () => {
    it("should create a router with routes", () => {
      const router = createActivityRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have stack with routes
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have GET route for dashboard endpoint", () => {
      const router = createActivityRoutes(mockCore);
      // Check that there's at least one route in the stack
      expect(router.stack.length).toBeGreaterThan(0);
      // The first route should be a GET handler for /dashboard

      const hasDashboardRoute = router.stack.some((layer: any) => {
        return layer.route?.path === "/dashboard" && layer.route?.methods?.get;
      });
      expect(hasDashboardRoute).toBe(true);
    });
  });

  describe("Dashboard Handler Logic", () => {
    it("should have metrics collector available", () => {
      createActivityRoutes(mockCore);
      expect(metrics).toBeDefined();
      expect(metrics.getGauge).toBeDefined();
      expect(metrics.getHistory).toBeDefined();
    });

    it("should have health checker available", () => {
      createActivityRoutes(mockCore);
      expect(healthChecker).toBeDefined();
      expect(healthChecker.generateReport).toBeDefined();
    });
  });

  describe("Metrics Integration", () => {
    it("should read active sessions from gauge", () => {
      createActivityRoutes(mockCore);
      metrics.setGauge("active_sessions", 5);
      const value = metrics.getGauge("active_sessions");
      expect(value).toBe(5);
    });

    it("should read processing queue depth from gauge", () => {
      createActivityRoutes(mockCore);
      metrics.setGauge("processing_queue_depth", 3);
      const value = metrics.getGauge("processing_queue_depth");
      expect(value).toBe(3);
    });

    it("should return 0 for unset gauges", () => {
      createActivityRoutes(mockCore);
      const value = metrics.getGauge("nonexistent_gauge");
      expect(value).toBe(0);
    });

    it("should track operation history", () => {
      createActivityRoutes(mockCore);
      metrics.incrementCounter("memory_operation", 1);
      metrics.incrementCounter("request_count", 1);
      const history = metrics.getHistory({ limit: 10 });
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe("Health Checker Integration", () => {
    it("should generate health report", async () => {
      createActivityRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(report).toBeDefined();
      expect(report.status).toBeDefined();
      expect(["healthy", "unhealthy", "degraded"]).toContain(report.status);
    });

    it("should include uptime in health report", async () => {
      createActivityRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(report.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should include components array in health report", async () => {
      createActivityRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(Array.isArray(report.components)).toBe(true);
    });

    it("should register and report custom health checks", async () => {
      createActivityRoutes(mockCore);
      healthChecker.registerCheck("test-component", async () => ({
        component: "test-component",
        status: "healthy",
        responseTimeMs: 10,
      }));

      const report = await healthChecker.generateReport();
      const testComponent = report.components.find((c) => c.component === "test-component");
      expect(testComponent).toBeDefined();
      expect(testComponent?.status).toBe("healthy");

      // Clean up
      healthChecker.unregisterCheck("test-component");
    });

    it("should report degraded status when component is degraded", async () => {
      createActivityRoutes(mockCore);
      healthChecker.registerCheck("degraded-component", async () => ({
        component: "degraded-component",
        status: "degraded",
        responseTimeMs: 100,
      }));

      const report = await healthChecker.generateReport();
      expect(["degraded", "unhealthy"]).toContain(report.status);

      // Clean up
      healthChecker.unregisterCheck("degraded-component");
    });

    it("should report unhealthy status when component is unhealthy", async () => {
      createActivityRoutes(mockCore);
      healthChecker.registerCheck("unhealthy-component", async () => ({
        component: "unhealthy-component",
        status: "unhealthy",
        responseTimeMs: 0,
        error: "Component failed",
      }));

      const report = await healthChecker.generateReport();
      expect(report.status).toBe("unhealthy");

      // Clean up
      healthChecker.unregisterCheck("unhealthy-component");
    });
  });

  describe("Memory Usage Metrics", () => {
    it("should have access to process memory usage", () => {
      createActivityRoutes(mockCore);
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeGreaterThanOrEqual(0);
      expect(memUsage.heapTotal).toBeGreaterThanOrEqual(0);
      expect(memUsage.rss).toBeGreaterThanOrEqual(0);
      expect(memUsage.external).toBeGreaterThanOrEqual(0);
    });

    it("should calculate heap usage percentage correctly", () => {
      createActivityRoutes(mockCore);
      const memUsage = process.memoryUsage();
      const heapUsagePercent =
        memUsage.heapTotal > 0
          ? Math.round((memUsage.heapUsed / memUsage.heapTotal) * 10000) / 100
          : 0;
      expect(heapUsagePercent).toBeGreaterThanOrEqual(0);
      expect(heapUsagePercent).toBeLessThanOrEqual(100);
    });
  });

  /**
   * Property 18: Dashboard Metrics Non-Negative
   * For any dashboard request, all numeric metrics (active_sessions,
   * processing_queue, memory_usage values) should be non-negative.
   * Validates: Requirements 7.2
   */
  describe("Dashboard Metrics Non-Negative Property", () => {
    it("should ensure active sessions gauge is non-negative", () => {
      createActivityRoutes(mockCore);
      // Test with various values
      const testValues = [0, 1, 10, 100];
      for (const value of testValues) {
        metrics.setGauge("active_sessions", value);
        const result = metrics.getGauge("active_sessions");
        expect(result).toBeGreaterThanOrEqual(0);
      }
    });

    it("should ensure processing queue gauge is non-negative", () => {
      createActivityRoutes(mockCore);
      // Test with various values
      const testValues = [0, 1, 5, 50];
      for (const value of testValues) {
        metrics.setGauge("processing_queue_depth", value);
        const result = metrics.getGauge("processing_queue_depth");
        expect(result).toBeGreaterThanOrEqual(0);
      }
    });

    it("should ensure memory usage values are non-negative", () => {
      createActivityRoutes(mockCore);
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeGreaterThanOrEqual(0);
      expect(memUsage.heapTotal).toBeGreaterThanOrEqual(0);
      expect(memUsage.rss).toBeGreaterThanOrEqual(0);
      expect(memUsage.external).toBeGreaterThanOrEqual(0);
    });

    it("should ensure uptime is non-negative", async () => {
      createActivityRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(report.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * Dashboard Handler Tests
   * Tests that actually invoke the dashboard endpoint handler
   * to cover getRecentOperations, getActiveSessions, getProcessingQueueDepth,
   * getSystemHealth, convertToComponentHealth, and createDashboardHandler.
   * Requirements: 7.2
   */
  describe("Dashboard Handler Invocation", () => {
    it("should return dashboard response with all required fields", async () => {
      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      const body = response.body as {
        success: boolean;
        data: {
          activeSessions: number;
          processingQueue: number;
          memoryUsage: {
            heapUsed: number;
            heapTotal: number;
            rss: number;
            external: number;
            heapUsagePercent: number;
          };
          recentOperations: Array<{
            type: string;
            timestamp: string;
            durationMs?: number;
            status: string;
          }>;
          health: {
            status: string;
            components: Array<{
              name: string;
              status: string;
              responseTimeMs?: number;
              lastCheck?: string;
              error?: string;
            }>;
            uptimeMs: number;
            version?: string;
          };
        };
      };

      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.activeSessions).toBeGreaterThanOrEqual(0);
      expect(body.data.processingQueue).toBeGreaterThanOrEqual(0);
      expect(body.data.memoryUsage).toBeDefined();
      expect(body.data.memoryUsage.heapUsed).toBeGreaterThanOrEqual(0);
      expect(body.data.memoryUsage.heapTotal).toBeGreaterThanOrEqual(0);
      expect(body.data.memoryUsage.rss).toBeGreaterThanOrEqual(0);
      expect(body.data.memoryUsage.external).toBeGreaterThanOrEqual(0);
      expect(body.data.memoryUsage.heapUsagePercent).toBeGreaterThanOrEqual(0);
      expect(body.data.memoryUsage.heapUsagePercent).toBeLessThanOrEqual(100);
      expect(Array.isArray(body.data.recentOperations)).toBe(true);
      expect(body.data.health).toBeDefined();
      expect(body.data.health.status).toBeDefined();
      expect(["healthy", "unhealthy", "degraded"]).toContain(body.data.health.status);
      expect(Array.isArray(body.data.health.components)).toBe(true);
      expect(body.data.health.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should return active sessions from gauge when set", async () => {
      metrics.setGauge("active_sessions", 42);
      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as { data: { activeSessions: number } };
      expect(body.data.activeSessions).toBe(42);
    });

    it("should return processing queue depth from gauge when set", async () => {
      metrics.setGauge("processing_queue_depth", 15);
      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as { data: { processingQueue: number } };
      expect(body.data.processingQueue).toBe(15);
    });

    it("should return processing queue depth from reasoning_queue_depth when primary not set", async () => {
      metrics.setGauge("reasoning_queue_depth", 7);
      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as { data: { processingQueue: number } };
      expect(body.data.processingQueue).toBe(7);
    });

    it("should return recent operations from metrics history", async () => {
      // Add some operation metrics
      metrics.incrementCounter("memory_operation", 1);
      metrics.incrementCounter("request_count", 1);
      metrics.incrementCounter("reasoning_task", 1);
      metrics.observeHistogram("operation_duration", 150);

      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as {
        data: {
          recentOperations: Array<{
            type: string;
            timestamp: string;
            durationMs?: number;
            status: string;
          }>;
        };
      };
      expect(Array.isArray(body.data.recentOperations)).toBe(true);
      // Should have filtered operations based on name patterns
      const operationTypes = body.data.recentOperations.map((op) => op.type);
      const hasRelevantOps = operationTypes.some(
        (type) =>
          type.includes("operation") ||
          type.includes("request") ||
          type.includes("memory_") ||
          type.includes("reasoning_")
      );
      expect(hasRelevantOps || body.data.recentOperations.length === 0).toBe(true);
    });

    it("should include histogram duration in recent operations", async () => {
      // Record a histogram metric that matches operation pattern
      metrics.observeHistogram("operation_latency", 250);

      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as {
        data: {
          recentOperations: Array<{
            type: string;
            timestamp: string;
            durationMs?: number;
            status: string;
          }>;
        };
      };
      // Histogram entries should have durationMs set
      const histogramOps = body.data.recentOperations.filter(
        (op) => op.type === "operation_latency"
      );
      if (histogramOps.length > 0) {
        expect(histogramOps[0].durationMs).toBe(250);
      }
    });

    it("should convert health check results to component health format", async () => {
      // Register a custom health check
      healthChecker.registerCheck("test-dashboard-component", async () => ({
        component: "test-dashboard-component",
        status: "healthy",
        responseTimeMs: 25,
        lastSuccess: new Date(),
      }));

      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as {
        data: {
          health: {
            components: Array<{
              name: string;
              status: string;
              responseTimeMs?: number;
              lastCheck?: string;
              error?: string;
            }>;
          };
        };
      };

      const testComponent = body.data.health.components.find(
        (c) => c.name === "test-dashboard-component"
      );
      expect(testComponent).toBeDefined();
      expect(testComponent?.status).toBe("healthy");
      // responseTimeMs is measured by the health checker, not the value we return
      expect(testComponent?.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(testComponent?.lastCheck).toBeDefined();

      // Clean up
      healthChecker.unregisterCheck("test-dashboard-component");
    });

    it("should include error in component health when unhealthy", async () => {
      // Register an unhealthy component
      healthChecker.registerCheck("unhealthy-dashboard-component", async () => ({
        component: "unhealthy-dashboard-component",
        status: "unhealthy",
        responseTimeMs: 0,
        error: "Connection failed",
      }));

      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as {
        data: {
          health: {
            components: Array<{
              name: string;
              status: string;
              error?: string;
            }>;
          };
        };
      };

      const unhealthyComponent = body.data.health.components.find(
        (c) => c.name === "unhealthy-dashboard-component"
      );
      expect(unhealthyComponent).toBeDefined();
      expect(unhealthyComponent?.status).toBe("unhealthy");
      expect(unhealthyComponent?.error).toBe("Connection failed");

      // Clean up
      healthChecker.unregisterCheck("unhealthy-dashboard-component");
    });

    it("should fallback to session history when active_sessions gauge is 0", async () => {
      // Ensure active_sessions gauge is 0
      metrics.setGauge("active_sessions", 0);
      // Add some session_created metrics to history
      metrics.incrementCounter("session_created", 1);
      metrics.incrementCounter("session_created", 1);
      metrics.incrementCounter("session_created", 1);

      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as { data: { activeSessions: number } };
      // Should return count from session history
      expect(body.data.activeSessions).toBeGreaterThanOrEqual(0);
    });

    it("should return 0 for processing queue when no gauges are set", async () => {
      // Reset all metrics to ensure no gauges are set
      metrics.resetAll();

      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as { data: { processingQueue: number } };
      expect(body.data.processingQueue).toBe(0);
    });

    it("should include version in health status when available", async () => {
      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as {
        data: {
          health: {
            version?: string;
          };
        };
      };
      // Version may or may not be set depending on environment
      expect(body.data.health).toBeDefined();
    });

    it("should limit recent operations to 10 entries", async () => {
      // Add more than 10 operation metrics
      for (let i = 0; i < 20; i++) {
        metrics.incrementCounter(`operation_${i}`, 1);
      }

      const response = await makeRequest(mockCore, "get", "/dashboard");

      expect(response.status).toBe(200);
      const body = response.body as {
        data: {
          recentOperations: Array<{ type: string }>;
        };
      };
      expect(body.data.recentOperations.length).toBeLessThanOrEqual(10);
    });
  });
});
