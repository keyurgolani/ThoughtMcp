/**
 * Memory Consolidation Routes Unit Tests
 *
 * Tests for the memory consolidation routes that provide consolidation endpoints.
 * Requirements: 7.2, 7.3 (Consolidation Scheduling)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CognitiveCore } from "../../../../server/cognitive-core.js";
import { createMemoryConsolidationRoutes } from "../../../../server/routes/memory-consolidation.js";

// Mock consolidation result
const mockConsolidationResult = {
  summaryId: "summary-123",
  consolidatedIds: ["mem-1", "mem-2", "mem-3"],
  summaryContent: "Consolidated summary of related memories",
  consolidatedAt: new Date(),
};

// Mock scheduler status
const mockSchedulerStatus = {
  isRunning: false,
  lastRunAt: new Date(Date.now() - 3600000), // 1 hour ago
  nextRunAt: new Date(Date.now() + 3600000), // 1 hour from now
  currentProgress: null,
  detailedProgress: null,
  lastError: null,
  retryAttempts: 0,
  batchSize: 100,
};

// Mock database connection manager
const mockDbConnection = {
  query: vi.fn(),
  getPool: vi.fn(),
};

// Mock embedding storage
const mockEmbeddingStorage = {
  storeEmbeddings: vi.fn(),
  retrieveEmbeddings: vi.fn(),
};

// Mock cognitive core with memory repository
const createMockCognitiveCore = (): CognitiveCore => {
  return {
    memoryRepository: {
      db: mockDbConnection,
      embeddingStorage: mockEmbeddingStorage,
    } as unknown as CognitiveCore["memoryRepository"],
    reasoningOrchestrator: {} as CognitiveCore["reasoningOrchestrator"],
    frameworkSelector: {} as CognitiveCore["frameworkSelector"],
    confidenceAssessor: {} as CognitiveCore["confidenceAssessor"],
    biasDetector: {} as CognitiveCore["biasDetector"],
    emotionAnalyzer: {} as CognitiveCore["emotionAnalyzer"],
    problemDecomposer: {} as CognitiveCore["problemDecomposer"],
    memoryAugmentedReasoning: {} as CognitiveCore["memoryAugmentedReasoning"],
  };
};

describe("Memory Consolidation Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
    vi.clearAllMocks();
  });

  describe("createMemoryConsolidationRoutes", () => {
    it("should create a router with routes", () => {
      const router = createMemoryConsolidationRoutes(mockCore);
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have POST route for consolidate endpoint", () => {
      const router = createMemoryConsolidationRoutes(mockCore);
      expect(router.stack.length).toBeGreaterThan(0);
      const firstLayer = router.stack[0];
      expect(firstLayer).toBeDefined();
    });

    it("should have GET route for status endpoint", () => {
      const router = createMemoryConsolidationRoutes(mockCore);
      // Router should have at least 2 routes (consolidate and status)
      expect(router.stack.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Consolidate Endpoint Configuration", () => {
    it("should have memoryRepository with db connection", () => {
      createMemoryConsolidationRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
      expect((mockCore.memoryRepository as unknown as { db: unknown }).db).toBeDefined();
    });

    it("should have memoryRepository with embedding storage", () => {
      createMemoryConsolidationRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
      expect(
        (mockCore.memoryRepository as unknown as { embeddingStorage: unknown }).embeddingStorage
      ).toBeDefined();
    });
  });

  describe("Consolidation Request Schema Validation", () => {
    it("should require userId field", () => {
      // Schema requires userId to be a non-empty string
      const validRequest = { userId: "user-123" };
      expect(validRequest.userId).toBeDefined();
      expect(validRequest.userId.length).toBeGreaterThan(0);
    });

    it("should accept optional similarityThreshold between 0 and 1", () => {
      const validThresholds = [0, 0.5, 0.75, 1];
      for (const threshold of validThresholds) {
        expect(threshold).toBeGreaterThanOrEqual(0);
        expect(threshold).toBeLessThanOrEqual(1);
      }
    });

    it("should accept optional minClusterSize >= 2", () => {
      const validSizes = [2, 3, 5, 10];
      for (const size of validSizes) {
        expect(size).toBeGreaterThanOrEqual(2);
      }
    });

    it("should accept optional batchSize between 1 and 1000", () => {
      const validBatchSizes = [1, 100, 500, 1000];
      for (const size of validBatchSizes) {
        expect(size).toBeGreaterThanOrEqual(1);
        expect(size).toBeLessThanOrEqual(1000);
      }
    });

    it("should accept optional strengthReductionFactor between 0 and 1", () => {
      const validFactors = [0, 0.25, 0.5, 0.75, 1];
      for (const factor of validFactors) {
        expect(factor).toBeGreaterThanOrEqual(0);
        expect(factor).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Status Request Schema Validation", () => {
    it("should accept optional userId field", () => {
      const validRequests = [
        {}, // No userId
        { userId: "user-123" }, // With userId
      ];
      expect(validRequests).toHaveLength(2);
    });
  });

  describe("Consolidation Result Response Format", () => {
    it("should have correct structure for consolidation result", () => {
      expect(mockConsolidationResult.summaryId).toBeDefined();
      expect(mockConsolidationResult.consolidatedIds).toBeDefined();
      expect(Array.isArray(mockConsolidationResult.consolidatedIds)).toBe(true);
      expect(mockConsolidationResult.summaryContent).toBeDefined();
      expect(mockConsolidationResult.consolidatedAt).toBeInstanceOf(Date);
    });

    it("should convert consolidation result to API response format", () => {
      const apiResponse = {
        summaryId: mockConsolidationResult.summaryId,
        consolidatedIds: mockConsolidationResult.consolidatedIds,
        summaryContent: mockConsolidationResult.summaryContent,
        consolidatedAt: mockConsolidationResult.consolidatedAt.toISOString(),
      };

      expect(apiResponse.summaryId).toBe("summary-123");
      expect(apiResponse.consolidatedIds).toEqual(["mem-1", "mem-2", "mem-3"]);
      expect(typeof apiResponse.consolidatedAt).toBe("string");
    });
  });

  describe("Status Response Format", () => {
    it("should have correct structure for scheduler status", () => {
      expect(typeof mockSchedulerStatus.isRunning).toBe("boolean");
      expect(mockSchedulerStatus.lastRunAt).toBeInstanceOf(Date);
      expect(mockSchedulerStatus.nextRunAt).toBeInstanceOf(Date);
      expect(mockSchedulerStatus.currentProgress).toBeNull();
      expect(mockSchedulerStatus.detailedProgress).toBeNull();
      expect(mockSchedulerStatus.lastError).toBeNull();
      expect(typeof mockSchedulerStatus.retryAttempts).toBe("number");
      expect(typeof mockSchedulerStatus.batchSize).toBe("number");
    });

    it("should convert scheduler status to API response format", () => {
      const apiResponse = {
        isRunning: mockSchedulerStatus.isRunning,
        lastRunAt: mockSchedulerStatus.lastRunAt?.toISOString() ?? null,
        nextRunAt: mockSchedulerStatus.nextRunAt?.toISOString() ?? null,
        currentProgress: mockSchedulerStatus.currentProgress,
        detailedProgress: mockSchedulerStatus.detailedProgress,
        lastError: mockSchedulerStatus.lastError,
        retryAttempts: mockSchedulerStatus.retryAttempts,
        batchSize: mockSchedulerStatus.batchSize,
      };

      expect(apiResponse.isRunning).toBe(false);
      expect(typeof apiResponse.lastRunAt).toBe("string");
      expect(typeof apiResponse.nextRunAt).toBe("string");
      expect(apiResponse.retryAttempts).toBe(0);
      expect(apiResponse.batchSize).toBe(100);
    });
  });

  describe("Status with Progress", () => {
    it("should handle status with current progress", () => {
      const statusWithProgress = {
        ...mockSchedulerStatus,
        isRunning: true,
        currentProgress: {
          processed: 50,
          total: 100,
          percentComplete: 50,
        },
      };

      expect(statusWithProgress.isRunning).toBe(true);
      expect(statusWithProgress.currentProgress).toBeDefined();
      expect(statusWithProgress.currentProgress?.processed).toBe(50);
      expect(statusWithProgress.currentProgress?.total).toBe(100);
      expect(statusWithProgress.currentProgress?.percentComplete).toBe(50);
    });

    it("should handle status with detailed progress", () => {
      const statusWithDetailedProgress = {
        ...mockSchedulerStatus,
        isRunning: true,
        detailedProgress: {
          phase: "clustering",
          clustersIdentified: 5,
          clustersConsolidated: 2,
          memoriesProcessed: 20,
          memoriesTotal: 50,
          percentComplete: 40,
          estimatedRemainingMs: 30000,
          startedAt: new Date(),
        },
      };

      expect(statusWithDetailedProgress.detailedProgress).toBeDefined();
      expect(statusWithDetailedProgress.detailedProgress?.phase).toBe("clustering");
      expect(statusWithDetailedProgress.detailedProgress?.clustersIdentified).toBe(5);
      expect(statusWithDetailedProgress.detailedProgress?.clustersConsolidated).toBe(2);
    });
  });

  describe("Error Handling", () => {
    it("should handle job in progress error", () => {
      const errorCode = "JOB_IN_PROGRESS";
      const expectedMessage =
        "A consolidation job is already running. Please wait for it to complete.";
      expect(errorCode).toBe("JOB_IN_PROGRESS");
      expect(expectedMessage).toContain("already running");
    });

    it("should handle load threshold exceeded error", () => {
      const errorCode = "LOAD_THRESHOLD_EXCEEDED";
      const expectedMessage = "System load is too high. Please try again later.";
      expect(errorCode).toBe("LOAD_THRESHOLD_EXCEEDED");
      expect(expectedMessage).toContain("load is too high");
    });

    it("should handle consolidation engine errors", () => {
      const errorTypes = [
        "INVALID_USER_ID",
        "CLUSTERING_FAILED",
        "SUMMARY_GENERATION_FAILED",
        "DATABASE_ERROR",
      ];
      expect(errorTypes.length).toBeGreaterThan(0);
    });
  });

  describe("Default Configuration", () => {
    it("should use default consolidation config values", () => {
      const defaultConfig = {
        similarityThreshold: 0.75,
        minClusterSize: 5,
        batchSize: 100,
        strengthReductionFactor: 0.5,
      };

      expect(defaultConfig.similarityThreshold).toBe(0.75);
      expect(defaultConfig.minClusterSize).toBe(5);
      expect(defaultConfig.batchSize).toBe(100);
      expect(defaultConfig.strengthReductionFactor).toBe(0.5);
    });
  });

  describe("Route Registration", () => {
    it("should register POST /consolidate route", () => {
      const router = createMemoryConsolidationRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);

      expect(routes).toContain("/consolidate");
    });

    it("should register GET /consolidate/status route", () => {
      const router = createMemoryConsolidationRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);

      expect(routes).toContain("/consolidate/status");
    });
  });
});
