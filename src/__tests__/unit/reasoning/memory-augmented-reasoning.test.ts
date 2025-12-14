/**
 * Tests for MemoryAugmentedReasoning
 *
 * Tests memory retrieval and problem context augmentation for cognitive tools.
 *
 * Requirements: 13.1, 13.2, 13.5, 13.6
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemoryRepository } from "../../../memory/memory-repository";
import type { CompositeScore, Memory, SearchResult } from "../../../memory/types";
import {
  MemoryAugmentedReasoning,
  type MemoryAugmentedReasoningConfig,
} from "../../../reasoning/memory-augmented-reasoning";

// Mock memory repository
const createMockMemoryRepository = () => {
  return {
    search: vi.fn(),
    create: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as MemoryRepository;
};

// Create test memory
const createTestMemory = (
  id: string,
  content: string,
  sector: "episodic" | "semantic" | "procedural" | "emotional" | "reflective" = "semantic",
  salience: number = 0.7,
  strength: number = 0.8
): Memory => ({
  id,
  content,
  createdAt: new Date(),
  lastAccessed: new Date(),
  accessCount: 1,
  salience,
  decayRate: 0.01,
  strength,
  userId: "test-user",
  sessionId: "test-session",
  primarySector: sector,
  metadata: {
    keywords: ["test", "keyword"],
    tags: ["tag1"],
    category: "test",
    context: "",
    importance: 0.5,
    isAtomic: true,
  },
});

// Create test search result
const createTestSearchResult = (memories: Memory[]): SearchResult => {
  const scores = new Map<string, CompositeScore>();
  memories.forEach((m, index) => {
    scores.set(m.id, {
      total: 0.9 - index * 0.1,
      similarity: 0.8 - index * 0.1,
      salience: m.salience,
      recency: 0.7,
      linkWeight: 0.1,
    });
  });

  return {
    memories,
    totalCount: memories.length,
    scores,
    processingTime: 50,
    rankingMethod: "similarity" as const,
  };
};

describe("MemoryAugmentedReasoning", () => {
  let mockRepository: MemoryRepository;
  let reasoning: MemoryAugmentedReasoning;

  beforeEach(() => {
    mockRepository = createMockMemoryRepository();
    reasoning = new MemoryAugmentedReasoning(mockRepository);
  });

  describe("Initialization", () => {
    it("should initialize with default configuration", () => {
      const config = reasoning.getConfig();

      expect(config.minSalience).toBe(0.5);
      expect(config.maxMemories).toBe(5); // Changed from 10 to 5 per Requirements 3.4
      expect(config.minStrength).toBe(0.3);
      expect(config.minRelevance).toBe(0.5); // New field per Requirements 3.1, 3.2
      expect(config.maxContentLength).toBe(500); // New field per Requirements 3.4
    });

    it("should accept custom configuration", () => {
      const customConfig: Partial<MemoryAugmentedReasoningConfig> = {
        minSalience: 0.7,
        maxMemories: 3,
        minStrength: 0.5,
        sectors: ["semantic", "procedural"],
        minRelevance: 0.6,
        maxContentLength: 300,
      };

      const customReasoning = new MemoryAugmentedReasoning(mockRepository, customConfig);
      const config = customReasoning.getConfig();

      expect(config.minSalience).toBe(0.7);
      expect(config.maxMemories).toBe(3);
      expect(config.minStrength).toBe(0.5);
      expect(config.sectors).toEqual(["semantic", "procedural"]);
      expect(config.minRelevance).toBe(0.6);
      expect(config.maxContentLength).toBe(300);
    });

    it("should allow configuration updates", () => {
      reasoning.updateConfig({ minSalience: 0.8 });
      const config = reasoning.getConfig();

      expect(config.minSalience).toBe(0.8);
      expect(config.maxMemories).toBe(5); // Default is now 5 per Requirements 3.4
    });
  });

  describe("retrieveContext", () => {
    it("should retrieve relevant memories for a problem", async () => {
      const memories = [
        createTestMemory("mem1", "Previous experience with database optimization"),
        createTestMemory("mem2", "Known fact about query performance"),
      ];

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult(memories));

      const context = await reasoning.retrieveContext(
        "How to optimize database queries?",
        "test-user"
      );

      expect(context.memories).toHaveLength(2);
      expect(context.totalFound).toBe(2);
      expect(context.retrievalTime).toBeGreaterThanOrEqual(0);
    });

    it("should use vector similarity search with problem text (Requirement 13.5)", async () => {
      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([]));

      await reasoning.retrieveContext("Test problem", "test-user");

      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "Test problem",
          userId: "test-user",
        })
      );
    });

    it("should filter by minSalience of 0.5 (Requirement 13.6)", async () => {
      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([]));

      await reasoning.retrieveContext("Test problem", "test-user");

      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          minSalience: 0.5,
        })
      );
    });

    it("should return empty context when no memories found", async () => {
      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([]));

      const context = await reasoning.retrieveContext("Unknown topic", "test-user");

      expect(context.memories).toHaveLength(0);
      expect(context.totalFound).toBe(0);
    });

    it("should handle search errors gracefully", async () => {
      vi.mocked(mockRepository.search).mockRejectedValue(new Error("Database error"));

      const context = await reasoning.retrieveContext("Test problem", "test-user");

      expect(context.memories).toHaveLength(0);
      expect(context.totalFound).toBe(0);
    });

    it("should convert memories to RetrievedMemory format", async () => {
      const memories = [createTestMemory("mem1", "Test content", "episodic", 0.8, 0.9)];

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult(memories));

      const context = await reasoning.retrieveContext("Test problem", "test-user");

      expect(context.memories[0]).toEqual(
        expect.objectContaining({
          id: "mem1",
          content: "Test content",
          primarySector: "episodic",
          salience: 0.8,
          strength: 0.9,
          keywords: ["test", "keyword"],
        })
      );
    });
  });

  describe("augmentProblemContext", () => {
    it("should augment problem with memory context (Requirement 13.1, 13.2)", async () => {
      const memories = [
        createTestMemory("mem1", "User prefers dark mode", "semantic"),
        createTestMemory("mem2", "Previous UI optimization worked well", "episodic"),
      ];

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult(memories));

      const augmented = await reasoning.augmentProblemContext(
        "How to improve UI performance?",
        "test-user"
      );

      expect(augmented.hasMemoryContext).toBe(true);
      expect(augmented.memoriesUsed).toHaveLength(2);
      expect(augmented.augmentedProblem).toContain("Relevant context from previous interactions");
      expect(augmented.augmentedProblem).toContain("How to improve UI performance?");
    });

    it("should return original problem when no memories found (Requirement 13.4)", async () => {
      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([]));

      const augmented = await reasoning.augmentProblemContext("Unknown topic", "test-user");

      expect(augmented.hasMemoryContext).toBe(false);
      expect(augmented.memoriesUsed).toHaveLength(0);
      expect(augmented.augmentedProblem).toBe("Unknown topic");
      expect(augmented.originalProblem).toBe("Unknown topic");
    });

    it("should include memory background in augmented problem", async () => {
      const memories = [createTestMemory("mem1", "Important context", "semantic")];

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult(memories));

      const augmented = await reasoning.augmentProblemContext("Test problem", "test-user");

      expect(augmented.memoryBackground).toContain("Important context");
      expect(augmented.augmentedProblem).toContain(augmented.memoryBackground);
    });

    it("should format memories with sector labels", async () => {
      const memories = [
        createTestMemory("mem1", "Past event", "episodic"),
        createTestMemory("mem2", "Known fact", "semantic"),
        createTestMemory("mem3", "How to do something", "procedural"),
        createTestMemory("mem4", "Emotional response", "emotional"),
        createTestMemory("mem5", "Meta insight", "reflective"),
      ];

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult(memories));

      const augmented = await reasoning.augmentProblemContext("Test problem", "test-user");

      expect(augmented.memoryBackground).toContain("Past experience");
      expect(augmented.memoryBackground).toContain("Known fact");
      expect(augmented.memoryBackground).toContain("Learned procedure");
      expect(augmented.memoryBackground).toContain("Emotional context");
      expect(augmented.memoryBackground).toContain("Previous insight");
    });

    it("should sort memories by relevance score", async () => {
      const memories = [
        createTestMemory("mem1", "Low relevance", "semantic"),
        createTestMemory("mem2", "High relevance", "semantic"),
      ];

      const searchResult = createTestSearchResult(memories);
      // Set mem2 as higher relevance
      searchResult.scores.set("mem2", {
        total: 0.95,
        similarity: 0.9,
        salience: 0.8,
        recency: 0.7,
        linkWeight: 0.1,
      });
      searchResult.scores.set("mem1", {
        total: 0.5,
        similarity: 0.4,
        salience: 0.6,
        recency: 0.5,
        linkWeight: 0.1,
      });

      vi.mocked(mockRepository.search).mockResolvedValue(searchResult);

      const augmented = await reasoning.augmentProblemContext("Test problem", "test-user");

      // High relevance should appear first in background
      const highIndex = augmented.memoryBackground.indexOf("High relevance");
      const lowIndex = augmented.memoryBackground.indexOf("Low relevance");
      expect(highIndex).toBeLessThan(lowIndex);
    });

    it("should include keywords in memory background", async () => {
      const memory = createTestMemory("mem1", "Test content", "semantic");
      memory.metadata.keywords = ["optimization", "performance"];

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([memory]));

      const augmented = await reasoning.augmentProblemContext("Test problem", "test-user");

      expect(augmented.memoryBackground).toContain("Keywords: optimization, performance");
    });
  });

  describe("Configuration", () => {
    it("should respect custom minSalience", async () => {
      reasoning.updateConfig({ minSalience: 0.8 });

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([]));

      await reasoning.retrieveContext("Test problem", "test-user");

      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          minSalience: 0.8,
        })
      );
    });

    it("should respect custom maxMemories", async () => {
      reasoning.updateConfig({ maxMemories: 5 });

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([]));

      await reasoning.retrieveContext("Test problem", "test-user");

      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
        })
      );
    });

    it("should respect custom sectors filter", async () => {
      reasoning.updateConfig({ sectors: ["semantic", "procedural"] });

      vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([]));

      await reasoning.retrieveContext("Test problem", "test-user");

      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          sectors: ["semantic", "procedural"],
        })
      );
    });
  });
});
