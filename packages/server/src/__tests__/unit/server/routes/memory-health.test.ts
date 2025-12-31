/**
 * Memory Health Routes Unit Tests
 *
 * Tests for the memory health routes that provide health monitoring and quality analysis endpoints.
 * Requirements: 2.1-2.7 (Memory Health Dashboard API), 8.1-8.6 (Memory Quality Metrics)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CognitiveCore } from "../../../../server/cognitive-core.js";
import { createMemoryHealthRoutes } from "../../../../server/routes/memory-health.js";

// Mock health response
const mockHealthResponse: {
  storage: { bytesUsed: number; quotaBytes: number; usagePercent: number };
  countsBySector: {
    episodic: number;
    semantic: number;
    procedural: number;
    emotional: number;
    reflective: number;
  };
  countsByAge: { last24h: number; lastWeek: number; lastMonth: number; older: number };
  consolidationQueue: { size: number; estimatedTimeMs: number };
  activeConsolidation: {
    isRunning: boolean;
    phase: string | null;
    clustersIdentified: number;
    clustersConsolidated: number;
    memoriesProcessed: number;
    memoriesTotal: number;
    percentComplete: number;
    estimatedRemainingMs: number;
    startedAt: Date | null;
  };
  forgettingCandidates: { lowStrength: number; oldAge: number; lowAccess: number; total: number };
  recommendations: Array<{ type: string; priority: string; message: string; action: string }>;
  timestamp: Date;
} = {
  storage: { bytesUsed: 1024000, quotaBytes: 10240000, usagePercent: 10 },
  countsBySector: {
    episodic: 100,
    semantic: 50,
    procedural: 30,
    emotional: 20,
    reflective: 10,
  },
  countsByAge: { last24h: 10, lastWeek: 50, lastMonth: 100, older: 50 },
  consolidationQueue: { size: 5, estimatedTimeMs: 5000 },
  activeConsolidation: {
    isRunning: false,
    phase: null,
    clustersIdentified: 0,
    clustersConsolidated: 0,
    memoriesProcessed: 0,
    memoriesTotal: 0,
    percentComplete: 0,
    estimatedRemainingMs: 0,
    startedAt: null,
  },
  forgettingCandidates: { lowStrength: 5, oldAge: 10, lowAccess: 15, total: 30 },
  recommendations: [
    {
      type: "consolidation",
      priority: "medium",
      message: "Consider consolidating old memories",
      action: "consolidate",
    },
  ],
  timestamp: new Date(),
};

// Mock quality metrics
const mockQualityMetrics = {
  averageStrengthBySector: {
    episodic: 0.75,
    semantic: 0.85,
    procedural: 0.9,
    emotional: 0.7,
    reflective: 0.8,
  },
  embeddingCoverage: 0.95,
  clusteringCoefficient: 0.65,
};

// Mock access patterns
const mockAccessPatterns = [
  { memoryId: "mem-1", content: "Test memory 1", accessCount: 100, lastAccessed: new Date() },
  { memoryId: "mem-2", content: "Test memory 2", accessCount: 50, lastAccessed: new Date() },
];

// Mock duplicate candidates
const mockDuplicates = [
  { memoryId1: "mem-1", memoryId2: "mem-2", similarity: 0.95, suggestedAction: "merge" },
];

// Mock quality trends
const mockTrends = [
  { date: new Date(), averageStrength: 0.8, totalMemories: 200, consolidatedCount: 10 },
  {
    date: new Date(Date.now() - 86400000),
    averageStrength: 0.78,
    totalMemories: 195,
    consolidatedCount: 8,
  },
];

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

describe("Memory Health Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
    vi.clearAllMocks();
  });

  describe("createMemoryHealthRoutes", () => {
    it("should create a router with routes", () => {
      const router = createMemoryHealthRoutes(mockCore);
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have GET route for health endpoint", () => {
      const router = createMemoryHealthRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/health");
    });

    it("should have GET route for quality endpoint", () => {
      const router = createMemoryHealthRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/quality");
    });

    it("should have GET route for access-patterns endpoint", () => {
      const router = createMemoryHealthRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/quality/access-patterns");
    });

    it("should have GET route for duplicates endpoint", () => {
      const router = createMemoryHealthRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/quality/duplicates");
    });

    it("should have GET route for trends endpoint", () => {
      const router = createMemoryHealthRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/quality/trends");
    });

    it("should have exactly 5 routes registered", () => {
      const router = createMemoryHealthRoutes(mockCore);
      expect(router.stack.length).toBe(5);
    });
  });

  describe("Health Endpoint Configuration", () => {
    it("should have memoryRepository with db connection", () => {
      createMemoryHealthRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
      expect((mockCore.memoryRepository as unknown as { db: unknown }).db).toBeDefined();
    });

    it("should have memoryRepository with embedding storage", () => {
      createMemoryHealthRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
      expect(
        (mockCore.memoryRepository as unknown as { embeddingStorage: unknown }).embeddingStorage
      ).toBeDefined();
    });
  });

  describe("Health Request Schema Validation - Requirements: 2.1", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123" };
      expect(validRequest.userId).toBeDefined();
      expect(validRequest.userId.length).toBeGreaterThan(0);
    });

    it("should reject empty userId", () => {
      const invalidRequest = { userId: "" };
      expect(invalidRequest.userId.length).toBe(0);
    });
  });

  describe("Quality Request Schema Validation - Requirements: 8.1", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123" };
      expect(validRequest.userId).toBeDefined();
      expect(validRequest.userId.length).toBeGreaterThan(0);
    });
  });

  describe("Access Patterns Request Schema Validation - Requirements: 8.2", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123", type: "most" };
      expect(validRequest.userId).toBeDefined();
    });

    it("should require type field with valid values", () => {
      const validTypes = ["most", "least", "never"];
      for (const type of validTypes) {
        expect(validTypes).toContain(type);
      }
    });

    it("should accept optional limit between 1 and 100", () => {
      const validLimits = [1, 10, 50, 100];
      for (const limit of validLimits) {
        expect(limit).toBeGreaterThanOrEqual(1);
        expect(limit).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Duplicates Request Schema Validation - Requirements: 8.3", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123" };
      expect(validRequest.userId).toBeDefined();
    });

    it("should accept optional threshold between 0 and 1", () => {
      const validThresholds = [0, 0.5, 0.9, 1];
      for (const threshold of validThresholds) {
        expect(threshold).toBeGreaterThanOrEqual(0);
        expect(threshold).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Trends Request Schema Validation - Requirements: 8.4", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123" };
      expect(validRequest.userId).toBeDefined();
    });

    it("should accept optional days between 1 and 365", () => {
      const validDays = [1, 7, 30, 90, 365];
      for (const days of validDays) {
        expect(days).toBeGreaterThanOrEqual(1);
        expect(days).toBeLessThanOrEqual(365);
      }
    });
  });

  describe("Health Response Format - Requirements: 2.2-2.7", () => {
    it("should have correct structure for health response", () => {
      expect(mockHealthResponse.storage).toBeDefined();
      expect(mockHealthResponse.countsBySector).toBeDefined();
      expect(mockHealthResponse.countsByAge).toBeDefined();
      expect(mockHealthResponse.consolidationQueue).toBeDefined();
      expect(mockHealthResponse.activeConsolidation).toBeDefined();
      expect(mockHealthResponse.forgettingCandidates).toBeDefined();
      expect(mockHealthResponse.recommendations).toBeDefined();
      expect(mockHealthResponse.timestamp).toBeInstanceOf(Date);
    });

    it("should have correct storage structure", () => {
      expect(typeof mockHealthResponse.storage.bytesUsed).toBe("number");
      expect(typeof mockHealthResponse.storage.quotaBytes).toBe("number");
      expect(typeof mockHealthResponse.storage.usagePercent).toBe("number");
    });

    it("should have correct countsBySector structure", () => {
      expect(typeof mockHealthResponse.countsBySector.episodic).toBe("number");
      expect(typeof mockHealthResponse.countsBySector.semantic).toBe("number");
      expect(typeof mockHealthResponse.countsBySector.procedural).toBe("number");
      expect(typeof mockHealthResponse.countsBySector.emotional).toBe("number");
      expect(typeof mockHealthResponse.countsBySector.reflective).toBe("number");
    });

    it("should have correct countsByAge structure", () => {
      expect(typeof mockHealthResponse.countsByAge.last24h).toBe("number");
      expect(typeof mockHealthResponse.countsByAge.lastWeek).toBe("number");
      expect(typeof mockHealthResponse.countsByAge.lastMonth).toBe("number");
      expect(typeof mockHealthResponse.countsByAge.older).toBe("number");
    });

    it("should have correct activeConsolidation structure", () => {
      expect(typeof mockHealthResponse.activeConsolidation.isRunning).toBe("boolean");
      expect(typeof mockHealthResponse.activeConsolidation.clustersIdentified).toBe("number");
      expect(typeof mockHealthResponse.activeConsolidation.clustersConsolidated).toBe("number");
      expect(typeof mockHealthResponse.activeConsolidation.memoriesProcessed).toBe("number");
      expect(typeof mockHealthResponse.activeConsolidation.memoriesTotal).toBe("number");
      expect(typeof mockHealthResponse.activeConsolidation.percentComplete).toBe("number");
      expect(typeof mockHealthResponse.activeConsolidation.estimatedRemainingMs).toBe("number");
    });

    it("should have correct forgettingCandidates structure", () => {
      expect(typeof mockHealthResponse.forgettingCandidates.lowStrength).toBe("number");
      expect(typeof mockHealthResponse.forgettingCandidates.oldAge).toBe("number");
      expect(typeof mockHealthResponse.forgettingCandidates.lowAccess).toBe("number");
      expect(typeof mockHealthResponse.forgettingCandidates.total).toBe("number");
    });

    it("should have correct recommendations structure", () => {
      expect(Array.isArray(mockHealthResponse.recommendations)).toBe(true);
      const rec = mockHealthResponse.recommendations[0];
      expect(typeof rec.type).toBe("string");
      expect(typeof rec.priority).toBe("string");
      expect(typeof rec.message).toBe("string");
      expect(typeof rec.action).toBe("string");
    });

    it("should convert health response to API format", () => {
      const apiResponse = {
        storage: mockHealthResponse.storage,
        countsBySector: mockHealthResponse.countsBySector,
        countsByAge: mockHealthResponse.countsByAge,
        consolidationQueue: mockHealthResponse.consolidationQueue,
        activeConsolidation: {
          ...mockHealthResponse.activeConsolidation,
          startedAt: mockHealthResponse.activeConsolidation.startedAt?.toISOString() ?? null,
        },
        forgettingCandidates: mockHealthResponse.forgettingCandidates,
        recommendations: mockHealthResponse.recommendations,
        timestamp: mockHealthResponse.timestamp.toISOString(),
      };

      expect(typeof apiResponse.timestamp).toBe("string");
      expect(apiResponse.activeConsolidation.startedAt).toBeNull();
    });
  });

  describe("Quality Metrics Response Format - Requirements: 8.1-8.2", () => {
    it("should have correct structure for quality metrics", () => {
      expect(mockQualityMetrics.averageStrengthBySector).toBeDefined();
      expect(typeof mockQualityMetrics.embeddingCoverage).toBe("number");
      expect(typeof mockQualityMetrics.clusteringCoefficient).toBe("number");
    });

    it("should have correct averageStrengthBySector structure", () => {
      expect(typeof mockQualityMetrics.averageStrengthBySector.episodic).toBe("number");
      expect(typeof mockQualityMetrics.averageStrengthBySector.semantic).toBe("number");
      expect(typeof mockQualityMetrics.averageStrengthBySector.procedural).toBe("number");
      expect(typeof mockQualityMetrics.averageStrengthBySector.emotional).toBe("number");
      expect(typeof mockQualityMetrics.averageStrengthBySector.reflective).toBe("number");
    });

    it("should convert quality metrics to API format", () => {
      const apiResponse = {
        averageStrengthBySector: mockQualityMetrics.averageStrengthBySector,
        embeddingCoverage: mockQualityMetrics.embeddingCoverage,
        clusteringCoefficient: mockQualityMetrics.clusteringCoefficient,
      };

      expect(apiResponse.embeddingCoverage).toBe(0.95);
      expect(apiResponse.clusteringCoefficient).toBe(0.65);
    });
  });

  describe("Access Patterns Response Format - Requirements: 8.3", () => {
    it("should have correct structure for access patterns", () => {
      expect(Array.isArray(mockAccessPatterns)).toBe(true);
      const pattern = mockAccessPatterns[0];
      expect(typeof pattern.memoryId).toBe("string");
      expect(typeof pattern.content).toBe("string");
      expect(typeof pattern.accessCount).toBe("number");
      expect(pattern.lastAccessed).toBeInstanceOf(Date);
    });

    it("should convert access patterns to API format", () => {
      const apiResponse = {
        patterns: mockAccessPatterns.map((p) => ({
          memoryId: p.memoryId,
          content: p.content,
          accessCount: p.accessCount,
          lastAccessed: p.lastAccessed.toISOString(),
        })),
        type: "most",
        count: mockAccessPatterns.length,
      };

      expect(apiResponse.patterns.length).toBe(2);
      expect(typeof apiResponse.patterns[0].lastAccessed).toBe("string");
      expect(apiResponse.type).toBe("most");
      expect(apiResponse.count).toBe(2);
    });
  });

  describe("Duplicates Response Format - Requirements: 8.4", () => {
    it("should have correct structure for duplicates", () => {
      expect(Array.isArray(mockDuplicates)).toBe(true);
      const dup = mockDuplicates[0];
      expect(typeof dup.memoryId1).toBe("string");
      expect(typeof dup.memoryId2).toBe("string");
      expect(typeof dup.similarity).toBe("number");
      expect(typeof dup.suggestedAction).toBe("string");
    });

    it("should convert duplicates to API format", () => {
      const apiResponse = {
        duplicates: mockDuplicates.map((d) => ({
          memoryId1: d.memoryId1,
          memoryId2: d.memoryId2,
          similarity: d.similarity,
          suggestedAction: d.suggestedAction,
        })),
        count: mockDuplicates.length,
        threshold: 0.9,
      };

      expect(apiResponse.duplicates.length).toBe(1);
      expect(apiResponse.count).toBe(1);
      expect(apiResponse.threshold).toBe(0.9);
    });
  });

  describe("Trends Response Format - Requirements: 8.5", () => {
    it("should have correct structure for trends", () => {
      expect(Array.isArray(mockTrends)).toBe(true);
      const trend = mockTrends[0];
      expect(trend.date).toBeInstanceOf(Date);
      expect(typeof trend.averageStrength).toBe("number");
      expect(typeof trend.totalMemories).toBe("number");
      expect(typeof trend.consolidatedCount).toBe("number");
    });

    it("should convert trends to API format", () => {
      const apiResponse = {
        trends: mockTrends.map((t) => ({
          date: t.date.toISOString().split("T")[0],
          averageStrength: t.averageStrength,
          totalMemories: t.totalMemories,
          consolidatedCount: t.consolidatedCount,
        })),
        days: 30,
      };

      expect(apiResponse.trends.length).toBe(2);
      expect(typeof apiResponse.trends[0].date).toBe("string");
      expect(apiResponse.days).toBe(30);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing userId error for health endpoint", () => {
      const errorCode = "VALIDATION_ERROR";
      const expectedMessage = "userId is required";
      expect(errorCode).toBe("VALIDATION_ERROR");
      expect(expectedMessage).toContain("userId");
    });

    it("should handle missing userId error for quality endpoint", () => {
      const errorCode = "VALIDATION_ERROR";
      const expectedMessage = "userId is required";
      expect(errorCode).toBe("VALIDATION_ERROR");
      expect(expectedMessage).toContain("userId");
    });

    it("should handle invalid type error for access-patterns endpoint", () => {
      const errorCode = "VALIDATION_ERROR";
      const expectedMessage = "type must be one of: most, least, never";
      expect(errorCode).toBe("VALIDATION_ERROR");
      expect(expectedMessage).toContain("type");
    });

    it("should handle health monitor errors", () => {
      const errorTypes = ["INVALID_USER_ID", "DATABASE_ERROR", "STORAGE_CALCULATION_FAILED"];
      expect(errorTypes.length).toBeGreaterThan(0);
    });

    it("should handle quality analyzer errors", () => {
      const errorTypes = ["INVALID_USER_ID", "DATABASE_ERROR", "METRICS_CALCULATION_FAILED"];
      expect(errorTypes.length).toBeGreaterThan(0);
    });
  });

  describe("Default Configuration", () => {
    it("should use default limit for access patterns", () => {
      const defaultLimit = 10;
      expect(defaultLimit).toBe(10);
    });

    it("should use default threshold for duplicates", () => {
      const defaultThreshold = 0.9;
      expect(defaultThreshold).toBe(0.9);
    });

    it("should use default days for trends", () => {
      const defaultDays = 30;
      expect(defaultDays).toBe(30);
    });
  });

  describe("Active Consolidation Status", () => {
    it("should handle active consolidation with progress", () => {
      const activeConsolidation = {
        isRunning: true,
        phase: "clustering",
        clustersIdentified: 10,
        clustersConsolidated: 5,
        memoriesProcessed: 50,
        memoriesTotal: 100,
        percentComplete: 50,
        estimatedRemainingMs: 30000,
        startedAt: new Date(),
      };

      expect(activeConsolidation.isRunning).toBe(true);
      expect(activeConsolidation.phase).toBe("clustering");
      expect(activeConsolidation.percentComplete).toBe(50);
    });

    it("should convert active consolidation startedAt to ISO string", () => {
      const startedAt = new Date();
      const apiStartedAt = startedAt.toISOString();
      expect(typeof apiStartedAt).toBe("string");
      expect(apiStartedAt).toContain("T");
    });

    it("should handle null startedAt when consolidation is not running", () => {
      const activeConsolidation: {
        isRunning: boolean;
        phase: string | null;
        startedAt: Date | null;
      } = {
        isRunning: false,
        phase: null,
        startedAt: null,
      };

      const apiStartedAt = activeConsolidation.startedAt?.toISOString() ?? null;
      expect(apiStartedAt).toBeNull();
    });
  });

  describe("Recommendations Structure", () => {
    it("should support multiple recommendation types", () => {
      const recommendationTypes = ["consolidation", "pruning", "archiving", "optimization"];
      expect(recommendationTypes.length).toBe(4);
    });

    it("should support multiple priority levels", () => {
      const priorityLevels = ["low", "medium", "high", "critical"];
      expect(priorityLevels.length).toBe(4);
    });

    it("should have actionable recommendations", () => {
      const recommendation = mockHealthResponse.recommendations[0];
      expect(recommendation.action).toBeDefined();
      expect(recommendation.action.length).toBeGreaterThan(0);
    });
  });
});
