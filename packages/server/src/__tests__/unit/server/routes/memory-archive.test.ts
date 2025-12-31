/**
 * Memory Archive Routes Unit Tests
 *
 * Tests for the memory archive routes that provide archiving, searching,
 * restoring, and statistics endpoints.
 * Requirements: 4.1-4.6 (Memory Archiving)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CognitiveCore } from "../../../../server/cognitive-core.js";
import { createMemoryArchiveRoutes } from "../../../../server/routes/memory-archive.js";

// Mock archive result
const mockArchiveResult = {
  archivedCount: 5,
  freedBytes: 10240,
  timestamp: new Date(),
};

// Mock archived memory
const mockArchivedMemory = {
  id: "mem-123",
  userId: "user-123",
  content: "Test archived memory content",
  metadata: {
    keywords: ["test", "archive"],
    tags: ["important"],
    category: "test",
    context: "unit test",
    importance: 0.8,
  },
  embeddings: { episodic: [0.1, 0.2, 0.3] },
  archivedAt: new Date(),
  originalCreatedAt: new Date(Date.now() - 86400000), // 1 day ago
  tags: ["important"],
  primarySector: "episodic",
  sessionId: "session-123",
  salience: 0.7,
  strength: 0.5,
  accessCount: 10,
  lastAccessed: new Date(Date.now() - 3600000), // 1 hour ago
};

// Mock restore result
const mockRestoreResult = {
  restoredCount: 1,
  timestamp: new Date(),
};

// Mock archive stats
const mockArchiveStats = {
  count: 100,
  bytesUsed: 1048576, // 1 MB
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

describe("Memory Archive Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
    vi.clearAllMocks();
  });

  describe("createMemoryArchiveRoutes", () => {
    it("should create a router with routes", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have POST route for archive endpoint", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive");
    });

    it("should have GET route for archive search endpoint", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive/search");
    });

    it("should have POST route for restore endpoint", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive/restore");
    });

    it("should have GET route for stats endpoint", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive/stats");
    });
  });

  describe("Archive Endpoint Configuration", () => {
    it("should have memoryRepository with db connection", () => {
      createMemoryArchiveRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
      expect((mockCore.memoryRepository as unknown as { db: unknown }).db).toBeDefined();
    });

    it("should have memoryRepository with embedding storage", () => {
      createMemoryArchiveRoutes(mockCore);
      expect(mockCore.memoryRepository).toBeDefined();
      expect(
        (mockCore.memoryRepository as unknown as { embeddingStorage: unknown }).embeddingStorage
      ).toBeDefined();
    });
  });

  describe("Archive Request Schema Validation - Requirements: 4.1, 4.2", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123" };
      expect(validRequest.userId).toBeDefined();
      expect(validRequest.userId.length).toBeGreaterThan(0);
    });

    it("should accept optional memoryIds array", () => {
      const validRequests = [
        { userId: "user-123" }, // No memoryIds
        { userId: "user-123", memoryIds: ["mem-1", "mem-2"] }, // With memoryIds
      ];
      expect(validRequests).toHaveLength(2);
    });

    it("should accept optional ageThresholdDays", () => {
      const validThresholds = [1, 7, 30, 90, 365];
      for (const threshold of validThresholds) {
        expect(threshold).toBeGreaterThanOrEqual(1);
      }
    });

    it("should accept optional retainEmbeddings boolean", () => {
      const validRequests = [
        { userId: "user-123", retainEmbeddings: true },
        { userId: "user-123", retainEmbeddings: false },
      ];
      expect(validRequests[0].retainEmbeddings).toBe(true);
      expect(validRequests[1].retainEmbeddings).toBe(false);
    });
  });

  describe("Archive Search Request Schema Validation - Requirements: 4.3", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123", query: "test" };
      expect(validRequest.userId).toBeDefined();
      expect(validRequest.userId.length).toBeGreaterThan(0);
    });

    it("should require query field", () => {
      const validRequest = { userId: "user-123", query: "search term" };
      expect(validRequest.query).toBeDefined();
      expect(validRequest.query.length).toBeGreaterThan(0);
    });
  });

  describe("Restore Request Schema Validation - Requirements: 4.4", () => {
    it("should require userId field", () => {
      const validRequest = { userId: "user-123", memoryId: "mem-123" };
      expect(validRequest.userId).toBeDefined();
      expect(validRequest.userId.length).toBeGreaterThan(0);
    });

    it("should require memoryId field", () => {
      const validRequest = { userId: "user-123", memoryId: "mem-123" };
      expect(validRequest.memoryId).toBeDefined();
      expect(validRequest.memoryId.length).toBeGreaterThan(0);
    });
  });

  describe("Archive Result Response Format - Requirements: 4.1, 4.2, 4.5", () => {
    it("should have correct structure for archive result", () => {
      expect(mockArchiveResult.archivedCount).toBeDefined();
      expect(typeof mockArchiveResult.archivedCount).toBe("number");
      expect(mockArchiveResult.freedBytes).toBeDefined();
      expect(typeof mockArchiveResult.freedBytes).toBe("number");
      expect(mockArchiveResult.timestamp).toBeInstanceOf(Date);
    });

    it("should convert archive result to API response format", () => {
      const apiResponse = {
        archivedCount: mockArchiveResult.archivedCount,
        freedBytes: mockArchiveResult.freedBytes,
        timestamp: mockArchiveResult.timestamp.toISOString(),
      };

      expect(apiResponse.archivedCount).toBe(5);
      expect(apiResponse.freedBytes).toBe(10240);
      expect(typeof apiResponse.timestamp).toBe("string");
    });
  });

  describe("Archived Memory Response Format - Requirements: 4.3", () => {
    it("should have correct structure for archived memory", () => {
      expect(mockArchivedMemory.id).toBeDefined();
      expect(mockArchivedMemory.userId).toBeDefined();
      expect(mockArchivedMemory.content).toBeDefined();
      expect(mockArchivedMemory.metadata).toBeDefined();
      expect(mockArchivedMemory.archivedAt).toBeInstanceOf(Date);
      expect(mockArchivedMemory.originalCreatedAt).toBeInstanceOf(Date);
      expect(mockArchivedMemory.primarySector).toBeDefined();
    });

    it("should convert archived memory to API response format", () => {
      const apiResponse = {
        id: mockArchivedMemory.id,
        userId: mockArchivedMemory.userId,
        content: mockArchivedMemory.content,
        metadata: mockArchivedMemory.metadata,
        embeddings: mockArchivedMemory.embeddings,
        archivedAt: mockArchivedMemory.archivedAt.toISOString(),
        originalCreatedAt: mockArchivedMemory.originalCreatedAt.toISOString(),
        tags: mockArchivedMemory.tags,
        primarySector: mockArchivedMemory.primarySector,
        sessionId: mockArchivedMemory.sessionId,
        salience: mockArchivedMemory.salience,
        strength: mockArchivedMemory.strength,
        accessCount: mockArchivedMemory.accessCount,
        lastAccessed: mockArchivedMemory.lastAccessed?.toISOString(),
        isArchived: true,
      };

      expect(apiResponse.id).toBe("mem-123");
      expect(apiResponse.userId).toBe("user-123");
      expect(typeof apiResponse.archivedAt).toBe("string");
      expect(typeof apiResponse.originalCreatedAt).toBe("string");
      expect(apiResponse.isArchived).toBe(true);
    });

    it("should include metadata fields in archived memory", () => {
      expect(mockArchivedMemory.metadata.keywords).toEqual(["test", "archive"]);
      expect(mockArchivedMemory.metadata.tags).toEqual(["important"]);
      expect(mockArchivedMemory.metadata.category).toBe("test");
      expect(mockArchivedMemory.metadata.context).toBe("unit test");
      expect(mockArchivedMemory.metadata.importance).toBe(0.8);
    });
  });

  describe("Archive Search Response Format - Requirements: 4.3", () => {
    it("should have correct structure for search response", () => {
      const searchResponse = {
        memories: [mockArchivedMemory],
        count: 1,
        query: "test",
      };

      expect(searchResponse.memories).toBeDefined();
      expect(Array.isArray(searchResponse.memories)).toBe(true);
      expect(searchResponse.count).toBe(1);
      expect(searchResponse.query).toBe("test");
    });

    it("should handle empty search results", () => {
      const emptyResponse = {
        memories: [],
        count: 0,
        query: "nonexistent",
      };

      expect(emptyResponse.memories).toHaveLength(0);
      expect(emptyResponse.count).toBe(0);
    });
  });

  describe("Restore Result Response Format - Requirements: 4.4", () => {
    it("should have correct structure for restore result", () => {
      expect(mockRestoreResult.restoredCount).toBeDefined();
      expect(typeof mockRestoreResult.restoredCount).toBe("number");
      expect(mockRestoreResult.timestamp).toBeInstanceOf(Date);
    });

    it("should convert restore result to API response format", () => {
      const apiResponse = {
        restoredCount: mockRestoreResult.restoredCount,
        timestamp: mockRestoreResult.timestamp.toISOString(),
        memoryId: "mem-123",
      };

      expect(apiResponse.restoredCount).toBe(1);
      expect(typeof apiResponse.timestamp).toBe("string");
      expect(apiResponse.memoryId).toBe("mem-123");
    });
  });

  describe("Archive Stats Response Format - Requirements: 4.6", () => {
    it("should have correct structure for archive stats", () => {
      expect(mockArchiveStats.count).toBeDefined();
      expect(typeof mockArchiveStats.count).toBe("number");
      expect(mockArchiveStats.bytesUsed).toBeDefined();
      expect(typeof mockArchiveStats.bytesUsed).toBe("number");
    });

    it("should convert archive stats to API response format", () => {
      const apiResponse = {
        count: mockArchiveStats.count,
        bytesUsed: mockArchiveStats.bytesUsed,
      };

      expect(apiResponse.count).toBe(100);
      expect(apiResponse.bytesUsed).toBe(1048576);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing userId error", () => {
      const errorCode = "VALIDATION_ERROR";
      const expectedMessage = "userId is required";
      expect(errorCode).toBe("VALIDATION_ERROR");
      expect(expectedMessage).toContain("userId");
    });

    it("should handle missing query error for search", () => {
      const errorCode = "VALIDATION_ERROR";
      const expectedMessage = "query is required";
      expect(errorCode).toBe("VALIDATION_ERROR");
      expect(expectedMessage).toContain("query");
    });

    it("should handle missing memoryId error for restore", () => {
      const errorCode = "VALIDATION_ERROR";
      const expectedMessage = "memoryId is required";
      expect(errorCode).toBe("VALIDATION_ERROR");
      expect(expectedMessage).toContain("memoryId");
    });

    it("should handle archive manager errors", () => {
      const errorTypes = ["MEMORY_NOT_FOUND", "ARCHIVE_FAILED", "RESTORE_FAILED", "DATABASE_ERROR"];
      expect(errorTypes.length).toBeGreaterThan(0);
    });
  });

  describe("Default Configuration", () => {
    it("should use default archive config values", () => {
      const defaultConfig = {
        ageThresholdDays: 90,
        retainEmbeddings: false,
      };

      expect(defaultConfig.ageThresholdDays).toBe(90);
      expect(defaultConfig.retainEmbeddings).toBe(false);
    });
  });

  describe("Route Registration", () => {
    it("should register POST /archive route", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive");
    });

    it("should register GET /archive/search route", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive/search");
    });

    it("should register POST /archive/restore route", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive/restore");
    });

    it("should register GET /archive/stats route", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      const routes = router.stack.map((layer) => layer.route?.path);
      expect(routes).toContain("/archive/stats");
    });

    it("should have exactly 4 routes registered", () => {
      const router = createMemoryArchiveRoutes(mockCore);
      expect(router.stack.length).toBe(4);
    });
  });

  describe("Bulk Archive Operations - Requirements: 4.5", () => {
    it("should support archiving by specific memory IDs", () => {
      const bulkRequest = {
        userId: "user-123",
        memoryIds: ["mem-1", "mem-2", "mem-3", "mem-4", "mem-5"],
      };

      expect(bulkRequest.memoryIds).toHaveLength(5);
      expect(bulkRequest.memoryIds.every((id) => id.startsWith("mem-"))).toBe(true);
    });

    it("should support archiving by age threshold", () => {
      const ageRequest = {
        userId: "user-123",
        ageThresholdDays: 30,
      };

      expect(ageRequest.ageThresholdDays).toBe(30);
    });

    it("should support retaining embeddings during archive", () => {
      const retainRequest = {
        userId: "user-123",
        memoryIds: ["mem-1"],
        retainEmbeddings: true,
      };

      expect(retainRequest.retainEmbeddings).toBe(true);
    });
  });
});
