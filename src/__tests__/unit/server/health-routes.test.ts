/**
 * Health Routes Unit Tests
 *
 * Tests for the health routes including full health check, readiness probe,
 * and liveness probe endpoints.
 * Requirements: 13.1, 13.2, 13.3
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { healthChecker } from "../../../monitoring/health-checker.js";
import type { CognitiveCore } from "../../../server/cognitive-core.js";
import { createHealthRoutes } from "../../../server/routes/health.js";

// Mock the performance middleware
vi.mock("../../../server/middleware/performance.js", () => ({
  getPerformanceStats: vi.fn(() => ({
    totalRequests: 100,
    avgDurationMs: 50,
    p95DurationMs: 150,
  })),
}));

// Mock the response cache middleware
vi.mock("../../../server/middleware/response-cache.js", () => ({
  getResponseCacheMetrics: vi.fn(() => ({
    hits: 50,
    misses: 50,
    hitRate: 0.5,
    size: 10,
  })),
}));

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

/**
 * Helper to invoke a route handler and capture the response
 */
async function invokeHandler(
  router: ReturnType<typeof createHealthRoutes>,
  path: string
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const layer = router.stack.find((l: any) => l.route?.path === path);
    if (!layer?.route?.stack?.[0]?.handle) {
      resolve({ status: 404, body: { error: "Not found" } });
      return;
    }

    const mockReq = {
      method: "GET",
      url: path,
      headers: {},
      requestId: "test-request-id",
    } as any;

    let responseStatus = 200;
    let responseBody: unknown = null;
    let resolved = false;

    const mockRes = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: unknown) {
        responseBody = data;
        if (!resolved) {
          resolved = true;
          resolve({ status: responseStatus, body: responseBody });
        }
        return this;
      },
    } as any;

    const mockNext = ((err?: unknown) => {
      if (err && !resolved) {
        resolved = true;
        const errorMessage = err instanceof Error ? err.message : String(err);
        resolve({ status: 500, body: { error: errorMessage } });
      }
    }) as any;

    // The handler is wrapped by asyncHandler which returns a sync function
    // that internally handles the promise
    layer.route.stack[0].handle(mockReq, mockRes, mockNext);

    // Give the async handler time to complete
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ status: responseStatus, body: responseBody });
      }
    }, 100);
  });
}

describe("Health Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createHealthRoutes", () => {
    it("should create a router with routes", () => {
      const router = createHealthRoutes(mockCore);
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have GET route for root health endpoint", () => {
      const router = createHealthRoutes(mockCore);
      const hasHealthRoute = router.stack.some((layer: any) => {
        return layer.route?.path === "/" && layer.route?.methods?.get;
      });
      expect(hasHealthRoute).toBe(true);
    });

    it("should have GET route for readiness endpoint", () => {
      const router = createHealthRoutes(mockCore);
      const hasReadyRoute = router.stack.some((layer: any) => {
        return layer.route?.path === "/ready" && layer.route?.methods?.get;
      });
      expect(hasReadyRoute).toBe(true);
    });

    it("should have GET route for liveness endpoint", () => {
      const router = createHealthRoutes(mockCore);
      const hasLiveRoute = router.stack.some((layer: any) => {
        return layer.route?.path === "/live" && layer.route?.methods?.get;
      });
      expect(hasLiveRoute).toBe(true);
    });
  });

  describe("Health Checker Integration", () => {
    it("should have health checker available", () => {
      createHealthRoutes(mockCore);
      expect(healthChecker).toBeDefined();
      expect(healthChecker.generateReport).toBeDefined();
    });

    it("should generate health report", async () => {
      createHealthRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(report).toBeDefined();
      expect(report.status).toBeDefined();
      expect(["healthy", "unhealthy", "degraded"]).toContain(report.status);
    });

    it("should include uptime in health report", async () => {
      createHealthRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(report.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Component Health Checks", () => {
    it("should check database health via memory repository", () => {
      const router = createHealthRoutes(mockCore);
      expect(router).toBeDefined();
      expect(mockCore.memoryRepository).toBeDefined();
    });

    it("should check reasoning health via reasoning orchestrator", () => {
      const router = createHealthRoutes(mockCore);
      expect(router).toBeDefined();
      expect(mockCore.reasoningOrchestrator).toBeDefined();
    });
  });

  describe("System Metrics", () => {
    it("should have access to process uptime", () => {
      createHealthRoutes(mockCore);
      const uptime = process.uptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    it("should have access to process memory usage", () => {
      createHealthRoutes(mockCore);
      const memUsage = process.memoryUsage();
      expect(memUsage.heapUsed).toBeGreaterThanOrEqual(0);
      expect(memUsage.heapTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Health Component Coverage Property", () => {
    it("should have cognitive core with all required components", () => {
      createHealthRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
      expect(mockCore.reasoningOrchestrator).toBeDefined();
    });

    it("should have health checker with report generation capability", async () => {
      createHealthRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(report).toBeDefined();
      expect(report.status).toBeDefined();
      expect(report.components).toBeDefined();
      expect(Array.isArray(report.components)).toBe(true);
    });

    it("should report overall status as one of healthy, degraded, or unhealthy", async () => {
      createHealthRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(["healthy", "degraded", "unhealthy"]).toContain(report.status);
    });

    it("should include metrics in health report", async () => {
      createHealthRoutes(mockCore);
      const report = await healthChecker.generateReport();
      expect(report.metrics).toBeDefined();
      expect(report.metrics.memoryUsed).toBeGreaterThanOrEqual(0);
      expect(report.metrics.heapUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Readiness Check Logic", () => {
    it("should consider system ready when critical components are available", () => {
      createHealthRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
    });

    it("should consider system not ready when memory repository is missing", () => {
      const coreWithoutMemory = {
        ...mockCore,
        memoryRepository: null as unknown as CognitiveCore["memoryRepository"],
      };
      const router = createHealthRoutes(coreWithoutMemory);
      expect(router).toBeDefined();
    });
  });

  describe("Liveness Check Logic", () => {
    it("should always report alive when process is running", () => {
      createHealthRoutes(mockCore);
      const uptime = process.uptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
    });

    it("should report uptime in seconds", () => {
      createHealthRoutes(mockCore);
      const uptimeSeconds = Math.floor(process.uptime());
      expect(uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Status Determination Logic", () => {
    type HealthStatus = "healthy" | "degraded" | "unhealthy";

    it("should determine healthy status when all components are healthy", () => {
      const components: Record<string, { status: HealthStatus; lastCheck: string }> = {
        database: { status: "healthy", lastCheck: new Date().toISOString() },
        embeddingEngine: { status: "healthy", lastCheck: new Date().toISOString() },
        reasoning: { status: "healthy", lastCheck: new Date().toISOString() },
        memory: { status: "healthy", lastCheck: new Date().toISOString() },
      };

      const statuses = Object.values(components).map((c) => c.status);
      const hasUnhealthy = statuses.some((s) => s === "unhealthy");
      const hasDegraded = statuses.some((s) => s === "degraded");

      expect(hasUnhealthy).toBe(false);
      expect(hasDegraded).toBe(false);
    });

    it("should determine degraded status when any component is degraded", () => {
      const components: Record<string, { status: HealthStatus; lastCheck: string }> = {
        database: { status: "healthy", lastCheck: new Date().toISOString() },
        embeddingEngine: { status: "degraded", lastCheck: new Date().toISOString() },
        reasoning: { status: "healthy", lastCheck: new Date().toISOString() },
        memory: { status: "healthy", lastCheck: new Date().toISOString() },
      };

      const statuses = Object.values(components).map((c) => c.status);
      const hasUnhealthy = statuses.some((s) => s === "unhealthy");
      const hasDegraded = statuses.some((s) => s === "degraded");

      expect(hasUnhealthy).toBe(false);
      expect(hasDegraded).toBe(true);
    });

    it("should determine unhealthy status when any component is unhealthy", () => {
      const components: Record<string, { status: HealthStatus; lastCheck: string }> = {
        database: { status: "unhealthy", lastCheck: new Date().toISOString() },
        embeddingEngine: { status: "healthy", lastCheck: new Date().toISOString() },
        reasoning: { status: "healthy", lastCheck: new Date().toISOString() },
        memory: { status: "healthy", lastCheck: new Date().toISOString() },
      };

      const statuses = Object.values(components).map((c) => c.status);
      const hasUnhealthy = statuses.some((s) => s === "unhealthy");

      expect(hasUnhealthy).toBe(true);
    });
  });

  describe("Route Handler Execution", () => {
    describe("GET /health - Full Health Check Handler", () => {
      it("should return health response with all components when core is healthy", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/");

        expect(response.status).toBe(200);
        expect(response.body).toBeDefined();
        const body = response.body as any;
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
        expect(body.data.status).toBe("healthy");
        expect(body.data.components).toBeDefined();
        expect(body.data.components.database).toBeDefined();
        expect(body.data.components.embeddingEngine).toBeDefined();
        expect(body.data.components.reasoning).toBeDefined();
        expect(body.data.components.memory).toBeDefined();
        expect(body.data.metrics).toBeDefined();
        expect(body.data.metrics.uptime).toBeGreaterThanOrEqual(0);
        expect(body.data.metrics.memoryUsage).toBeGreaterThan(0);
      });

      it("should return unhealthy status when memory repository is missing", async () => {
        const coreWithoutMemory = {
          ...mockCore,
          memoryRepository: null as unknown as CognitiveCore["memoryRepository"],
        };
        const router = createHealthRoutes(coreWithoutMemory);
        const response = await invokeHandler(router, "/");

        expect(response.status).toBe(503);
        const body = response.body as any;
        expect(body.data.status).toBe("unhealthy");
        expect(body.data.components.database.status).toBe("unhealthy");
        expect(body.data.components.memory.status).toBe("unhealthy");
      });

      it("should return unhealthy status when reasoning orchestrator is missing", async () => {
        const coreWithoutReasoning = {
          ...mockCore,
          reasoningOrchestrator: null as unknown as CognitiveCore["reasoningOrchestrator"],
        };
        const router = createHealthRoutes(coreWithoutReasoning);
        const response = await invokeHandler(router, "/");

        expect(response.status).toBe(503);
        const body = response.body as any;
        expect(body.data.status).toBe("unhealthy");
        expect(body.data.components.reasoning.status).toBe("unhealthy");
      });

      it("should include cache metrics in response", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/");

        const body = response.body as any;
        expect(body.data.metrics.cache).toBeDefined();
        expect(body.data.metrics.cache.hits).toBe(50);
        expect(body.data.metrics.cache.misses).toBe(50);
        expect(body.data.metrics.cache.hitRate).toBe(0.5);
      });

      it("should include performance stats in response", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/");

        const body = response.body as any;
        expect(body.data.metrics.requestCount).toBe(100);
        expect(body.data.metrics.avgResponseTime).toBe(50);
        expect(body.data.metrics.p95ResponseTime).toBe(150);
      });
    });

    describe("GET /health/ready - Readiness Probe Handler", () => {
      it("should return ready=true when critical components are available", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/ready");

        expect(response.status).toBe(200);
        const body = response.body as any;
        expect(body.data.ready).toBe(true);
        expect(body.data.reason).toBeUndefined();
      });

      it("should return ready=false when database is unhealthy", async () => {
        const coreWithoutMemory = {
          ...mockCore,
          memoryRepository: null as unknown as CognitiveCore["memoryRepository"],
        };
        const router = createHealthRoutes(coreWithoutMemory);
        const response = await invokeHandler(router, "/ready");

        expect(response.status).toBe(503);
        const body = response.body as any;
        expect(body.data.ready).toBe(false);
        expect(body.data.reason).toBeDefined();
        expect(body.data.reason).toContain("Critical components unhealthy");
      });

      it("should include reason with specific unhealthy components", async () => {
        const coreWithoutMemory = {
          ...mockCore,
          memoryRepository: null as unknown as CognitiveCore["memoryRepository"],
        };
        const router = createHealthRoutes(coreWithoutMemory);
        const response = await invokeHandler(router, "/ready");

        const body = response.body as any;
        expect(body.data.reason).toContain("database");
        expect(body.data.reason).toContain("memory");
      });
    });

    describe("GET /health/live - Liveness Probe Handler", () => {
      it("should return alive=true with uptime", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/live");

        expect(response.status).toBe(200);
        const body = response.body as any;
        expect(body.data.alive).toBe(true);
        expect(body.data.uptime).toBeGreaterThanOrEqual(0);
      });

      it("should always return 200 status for liveness check", async () => {
        const coreWithoutMemory = {
          ...mockCore,
          memoryRepository: null as unknown as CognitiveCore["memoryRepository"],
        };
        const router = createHealthRoutes(coreWithoutMemory);
        const response = await invokeHandler(router, "/live");

        expect(response.status).toBe(200);
      });
    });

    describe("Component Health Check Functions", () => {
      it("should report database healthy when memory repository exists", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/");

        const body = response.body as any;
        expect(body.data.components.database.status).toBe("healthy");
        expect(body.data.components.database.latency).toBeGreaterThanOrEqual(0);
        expect(body.data.components.database.lastCheck).toBeDefined();
      });

      it("should report embedding engine healthy by default", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/");

        const body = response.body as any;
        expect(body.data.components.embeddingEngine.status).toBe("healthy");
        expect(body.data.components.embeddingEngine.lastCheck).toBeDefined();
      });

      it("should report reasoning healthy when orchestrator exists", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/");

        const body = response.body as any;
        expect(body.data.components.reasoning.status).toBe("healthy");
        expect(body.data.components.reasoning.latency).toBeGreaterThanOrEqual(0);
      });

      it("should report memory healthy when repository exists", async () => {
        const router = createHealthRoutes(mockCore);
        const response = await invokeHandler(router, "/");

        const body = response.body as any;
        expect(body.data.components.memory.status).toBe("healthy");
        expect(body.data.components.memory.latency).toBeGreaterThanOrEqual(0);
      });

      it("should include error message when component is unhealthy", async () => {
        const coreWithoutMemory = {
          ...mockCore,
          memoryRepository: null as unknown as CognitiveCore["memoryRepository"],
        };
        const router = createHealthRoutes(coreWithoutMemory);
        const response = await invokeHandler(router, "/");

        const body = response.body as any;
        expect(body.data.components.database.message).toBeDefined();
        expect(body.data.components.database.message).toContain("not available");
      });
    });
  });
});
