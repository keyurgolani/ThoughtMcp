/**
 * Property Test: Memory-Augmented Reasoning
 *
 * **Feature: mcp-tool-improvements, Property 15: Memory-Augmented Reasoning**
 *
 * This property test validates that when cognitive tools are called with userId
 * and relevant memories exist, the memoriesUsed array SHALL be non-empty.
 *
 * **Validates: Requirements 13.1, 13.2, 13.3**
 *
 * - Requirement 13.1: WHEN a cognitive tool (think, analyze_systematically, decompose_problem,
 *   think_parallel) is called with userId THEN the tool SHALL retrieve relevant memories before reasoning
 * - Requirement 13.2: WHEN relevant memories exist for a problem domain THEN the cognitive tool
 *   SHALL incorporate memory content into the analysis context
 * - Requirement 13.3: WHEN cognitive tools produce insights THEN the response SHALL include
 *   references to memories that informed the analysis
 *
 * @module __tests__/property/reasoning/memory-augmented-reasoning.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";

import { MemoryRepository } from "../../../memory/memory-repository";
import type { CompositeScore, Memory, MemorySectorType, SearchResult } from "../../../memory/types";
import { MemoryAugmentedReasoning } from "../../../reasoning/memory-augmented-reasoning";

describe("Property 15: Memory-Augmented Reasoning", () => {
  /**
   * Valid memory sectors
   */
  const VALID_SECTORS: MemorySectorType[] = [
    "episodic",
    "semantic",
    "procedural",
    "emotional",
    "reflective",
  ];

  /**
   * Arbitrary for generating valid user IDs
   */
  const userIdArb = fc
    .stringMatching(/^[a-z][a-z0-9-]{3,20}$/)
    .filter((id) => id.length >= 4 && id.length <= 21);

  /**
   * Arbitrary for generating valid problem text
   */
  const problemTextArb = fc.constantFrom(
    "How to optimize database queries?",
    "What is the best way to improve API performance?",
    "Why does user authentication fail sometimes?",
    "When should I use caching strategy?",
    "How can we improve error handling?",
    "What are the trade-offs of memory management?",
    "How to implement code organization?",
    "What causes testing approach failures?",
    "How to debug deployment process issues?",
    "What is the difference between security measures?"
  );

  /**
   * Arbitrary for generating valid memory content
   */
  const memoryContentArb = fc.constantFrom(
    "Previous experience with database optimization",
    "Known fact about API design",
    "Best practice for authentication systems",
    "Common issue with caching mechanisms",
    "Successful approach to error recovery",
    "Lesson learned from memory efficiency",
    "Important consideration for code structure",
    "Key insight about test coverage"
  );

  /**
   * Arbitrary for generating valid memory sector
   */
  const sectorArb = fc.constantFrom(...VALID_SECTORS);

  /**
   * Arbitrary for generating salience values (0.5-1.0 to pass minSalience filter)
   */
  const salienceArb = fc.integer({ min: 50, max: 100 }).map((n) => n / 100);

  /**
   * Arbitrary for generating strength values (0.3-1.0 to pass minStrength filter)
   */
  const strengthArb = fc.integer({ min: 30, max: 100 }).map((n) => n / 100);

  /**
   * Arbitrary for generating relevance scores
   */
  const relevanceScoreArb = fc.integer({ min: 50, max: 100 }).map((n) => n / 100);

  /**
   * Arbitrary for generating keywords
   */
  const keywordsArb = fc.array(
    fc.constantFrom(
      "optimization",
      "performance",
      "security",
      "testing",
      "deployment",
      "database",
      "api",
      "cache",
      "error",
      "memory"
    ),
    { minLength: 1, maxLength: 5 }
  );

  /**
   * Create a test memory with generated values
   */
  const createTestMemory = (
    id: string,
    content: string,
    sector: MemorySectorType,
    salience: number,
    strength: number,
    keywords: string[]
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
      keywords,
      tags: [],
      category: "test",
      context: "",
      importance: 0.5,
      isAtomic: true,
    },
  });

  /**
   * Create a test search result with scores
   */
  const createTestSearchResult = (memories: Memory[], relevanceScores: number[]): SearchResult => {
    const scores = new Map<string, CompositeScore>();
    memories.forEach((m, index) => {
      const relevance = relevanceScores[index] ?? 0.8;
      scores.set(m.id, {
        total: relevance,
        similarity: relevance * 0.9,
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

  /**
   * Arbitrary for generating a single memory data object
   */
  const memoryDataArb = fc.record({
    content: memoryContentArb,
    sector: sectorArb,
    salience: salienceArb,
    strength: strengthArb,
    keywords: keywordsArb,
    relevanceScore: relevanceScoreArb,
  });

  /**
   * Arbitrary for generating a list of memory data (1-5 memories)
   */
  const memoriesDataArb = fc.array(memoryDataArb, { minLength: 1, maxLength: 5 });

  /**
   * **Feature: mcp-tool-improvements, Property 15: Memory-Augmented Reasoning**
   * **Validates: Requirements 13.1, 13.2, 13.3**
   *
   * For any cognitive tool with userId and relevant memories,
   * memoriesUsed SHALL be non-empty.
   */
  describe("Memory retrieval with relevant memories", () => {
    it("should return non-empty memoriesUsed when relevant memories exist", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          memoriesDataArb,
          async (problemText, userId, memoryDataList) => {
            // Create fresh mock for each iteration
            const mockRepository = {
              search: vi.fn(),
              create: vi.fn(),
              retrieve: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            } as unknown as MemoryRepository;

            const reasoning = new MemoryAugmentedReasoning(mockRepository);

            // Create memories from data
            const memories = memoryDataList.map((data, index) =>
              createTestMemory(
                `mem-${index}`,
                data.content,
                data.sector,
                data.salience,
                data.strength,
                data.keywords
              )
            );
            const relevanceScores = memoryDataList.map((d) => d.relevanceScore);
            const searchResult = createTestSearchResult(memories, relevanceScores);

            vi.mocked(mockRepository.search).mockResolvedValue(searchResult);

            const result = await reasoning.augmentProblemContext(problemText, userId);

            // Property: When relevant memories exist, memoriesUsed SHALL be non-empty
            expect(result.memoriesUsed.length).toBeGreaterThan(0);
            expect(result.hasMemoryContext).toBe(true);

            // Property: memoriesUsed count SHALL match retrieved memories count
            expect(result.memoriesUsed.length).toBe(memories.length);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include memory content in augmented problem context", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          memoriesDataArb,
          async (problemText, userId, memoryDataList) => {
            const mockRepository = {
              search: vi.fn(),
              create: vi.fn(),
              retrieve: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            } as unknown as MemoryRepository;

            const reasoning = new MemoryAugmentedReasoning(mockRepository);

            const memories = memoryDataList.map((data, index) =>
              createTestMemory(
                `mem-${index}`,
                data.content,
                data.sector,
                data.salience,
                data.strength,
                data.keywords
              )
            );
            const relevanceScores = memoryDataList.map((d) => d.relevanceScore);
            const searchResult = createTestSearchResult(memories, relevanceScores);

            vi.mocked(mockRepository.search).mockResolvedValue(searchResult);

            const result = await reasoning.augmentProblemContext(problemText, userId);

            // Property: Augmented problem SHALL contain memory background
            expect(result.augmentedProblem).toContain(
              "Relevant context from previous interactions"
            );

            // Property: Augmented problem SHALL contain original problem
            expect(result.augmentedProblem).toContain(problemText);

            // Property: Memory background SHALL be non-empty
            expect(result.memoryBackground.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 15: Memory-Augmented Reasoning**
   * **Validates: Requirements 13.1**
   *
   * For any cognitive tool call, the search SHALL be called with correct parameters.
   */
  describe("Search parameter correctness", () => {
    it("should call search with userId and problem text", async () => {
      await fc.assert(
        fc.asyncProperty(problemTextArb, userIdArb, async (problemText, userId) => {
          const mockRepository = {
            search: vi.fn(),
            create: vi.fn(),
            retrieve: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          } as unknown as MemoryRepository;

          const reasoning = new MemoryAugmentedReasoning(mockRepository);

          vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([], []));

          await reasoning.retrieveContext(problemText, userId);

          // Property: Search SHALL be called with userId
          expect(mockRepository.search).toHaveBeenCalledWith(
            expect.objectContaining({
              userId,
            })
          );

          // Property: Search SHALL be called with problem text
          expect(mockRepository.search).toHaveBeenCalledWith(
            expect.objectContaining({
              text: problemText,
            })
          );

          // Property: Search SHALL use minSalience of 0.5 (Requirement 13.6)
          expect(mockRepository.search).toHaveBeenCalledWith(
            expect.objectContaining({
              minSalience: 0.5,
            })
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 15: Memory-Augmented Reasoning**
   * **Validates: Requirements 13.3**
   *
   * For any retrieved memory, the response SHALL include proper references.
   */
  describe("Memory reference completeness", () => {
    it("should include all memory fields in memoriesUsed", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          memoriesDataArb,
          async (problemText, userId, memoryDataList) => {
            const mockRepository = {
              search: vi.fn(),
              create: vi.fn(),
              retrieve: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            } as unknown as MemoryRepository;

            const reasoning = new MemoryAugmentedReasoning(mockRepository);

            const memories = memoryDataList.map((data, index) =>
              createTestMemory(
                `mem-${index}`,
                data.content,
                data.sector,
                data.salience,
                data.strength,
                data.keywords
              )
            );
            const relevanceScores = memoryDataList.map((d) => d.relevanceScore);
            const searchResult = createTestSearchResult(memories, relevanceScores);

            vi.mocked(mockRepository.search).mockResolvedValue(searchResult);

            const result = await reasoning.augmentProblemContext(problemText, userId);

            // Property: Each memory in memoriesUsed SHALL have required fields
            for (const memory of result.memoriesUsed) {
              expect(memory.id).toBeTruthy();
              expect(memory.content).toBeTruthy();
              expect(VALID_SECTORS).toContain(memory.primarySector);
              expect(memory.salience).toBeGreaterThanOrEqual(0);
              expect(memory.salience).toBeLessThanOrEqual(1);
              expect(memory.strength).toBeGreaterThanOrEqual(0);
              expect(memory.strength).toBeLessThanOrEqual(1);
              expect(memory.relevanceScore).toBeGreaterThanOrEqual(0);
              expect(Array.isArray(memory.keywords)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve memory content accurately", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          memoriesDataArb,
          async (problemText, userId, memoryDataList) => {
            const mockRepository = {
              search: vi.fn(),
              create: vi.fn(),
              retrieve: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            } as unknown as MemoryRepository;

            const reasoning = new MemoryAugmentedReasoning(mockRepository);

            const memories = memoryDataList.map((data, index) =>
              createTestMemory(
                `mem-${index}`,
                data.content,
                data.sector,
                data.salience,
                data.strength,
                data.keywords
              )
            );
            const relevanceScores = memoryDataList.map((d) => d.relevanceScore);
            const searchResult = createTestSearchResult(memories, relevanceScores);

            vi.mocked(mockRepository.search).mockResolvedValue(searchResult);

            const result = await reasoning.augmentProblemContext(problemText, userId);

            // Property: Memory content SHALL be preserved in memoriesUsed
            for (let i = 0; i < memories.length; i++) {
              const originalMemory = memories[i];
              const retrievedMemory = result.memoriesUsed.find((m) => m.id === originalMemory.id);

              expect(retrievedMemory).toBeDefined();
              expect(retrievedMemory!.content).toBe(originalMemory.content);
              expect(retrievedMemory!.primarySector).toBe(originalMemory.primarySector);
              expect(retrievedMemory!.salience).toBe(originalMemory.salience);
              expect(retrievedMemory!.strength).toBe(originalMemory.strength);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 15: Memory-Augmented Reasoning**
   * **Validates: Requirements 13.4**
   *
   * When no relevant memories exist, the cognitive tool SHALL proceed without error.
   */
  describe("Graceful handling when no memories exist", () => {
    it("should return empty memoriesUsed when no memories found", async () => {
      await fc.assert(
        fc.asyncProperty(problemTextArb, userIdArb, async (problemText, userId) => {
          const mockRepository = {
            search: vi.fn(),
            create: vi.fn(),
            retrieve: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          } as unknown as MemoryRepository;

          const reasoning = new MemoryAugmentedReasoning(mockRepository);

          vi.mocked(mockRepository.search).mockResolvedValue(createTestSearchResult([], []));

          const result = await reasoning.augmentProblemContext(problemText, userId);

          // Property: When no memories exist, memoriesUsed SHALL be empty
          expect(result.memoriesUsed).toHaveLength(0);
          expect(result.hasMemoryContext).toBe(false);

          // Property: Original problem SHALL be preserved
          expect(result.originalProblem).toBe(problemText);
          expect(result.augmentedProblem).toBe(problemText);

          // Property: Memory background SHALL be empty
          expect(result.memoryBackground).toBe("");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should handle search errors gracefully", async () => {
      await fc.assert(
        fc.asyncProperty(problemTextArb, userIdArb, async (problemText, userId) => {
          const mockRepository = {
            search: vi.fn(),
            create: vi.fn(),
            retrieve: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          } as unknown as MemoryRepository;

          const reasoning = new MemoryAugmentedReasoning(mockRepository);

          vi.mocked(mockRepository.search).mockRejectedValue(new Error("Database error"));

          const result = await reasoning.retrieveContext(problemText, userId);

          // Property: On error, SHALL return empty context without throwing
          expect(result.memories).toHaveLength(0);
          expect(result.totalFound).toBe(0);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 15: Memory-Augmented Reasoning**
   * **Validates: Requirements 13.2**
   *
   * Memory background SHALL include sector labels for context.
   */
  describe("Memory sector labeling", () => {
    it("should include appropriate sector labels in memory background", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          memoriesDataArb,
          async (problemText, userId, memoryDataList) => {
            const mockRepository = {
              search: vi.fn(),
              create: vi.fn(),
              retrieve: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            } as unknown as MemoryRepository;

            const reasoning = new MemoryAugmentedReasoning(mockRepository);

            const memories = memoryDataList.map((data, index) =>
              createTestMemory(
                `mem-${index}`,
                data.content,
                data.sector,
                data.salience,
                data.strength,
                data.keywords
              )
            );
            const relevanceScores = memoryDataList.map((d) => d.relevanceScore);
            const searchResult = createTestSearchResult(memories, relevanceScores);

            vi.mocked(mockRepository.search).mockResolvedValue(searchResult);

            const result = await reasoning.augmentProblemContext(problemText, userId);

            // Property: Memory background SHALL contain sector-appropriate labels
            const sectorLabels: Record<MemorySectorType, string> = {
              episodic: "Past experience",
              semantic: "Known fact",
              procedural: "Learned procedure",
              emotional: "Emotional context",
              reflective: "Previous insight",
            };

            // Check that at least one sector label appears for each memory type present
            const sectorsPresent = new Set(memories.map((m) => m.primarySector));
            for (const sector of sectorsPresent) {
              const expectedLabel = sectorLabels[sector];
              expect(result.memoryBackground).toContain(expectedLabel);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 15: Memory-Augmented Reasoning**
   * **Validates: Requirements 13.2, 13.3**
   *
   * Memories SHALL be sorted by relevance score in the background.
   */
  describe("Memory relevance ordering", () => {
    it("should order memories by relevance score (highest first) in background", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          // Generate exactly 2 memories with different relevance scores
          fc.tuple(
            fc.record({
              content: fc.constantFrom(
                "High relevance memory content",
                "Important database insight"
              ),
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
            }),
            fc.record({
              content: fc.constantFrom("Low relevance memory content", "Less important API note"),
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
            })
          ),
          async (problemText, userId, [highData, lowData]) => {
            const mockRepository = {
              search: vi.fn(),
              create: vi.fn(),
              retrieve: vi.fn(),
              update: vi.fn(),
              delete: vi.fn(),
            } as unknown as MemoryRepository;

            const reasoning = new MemoryAugmentedReasoning(mockRepository);

            // Create memories with distinct relevance scores
            const highMemory = createTestMemory(
              "mem-high",
              highData.content,
              highData.sector,
              highData.salience,
              highData.strength,
              highData.keywords
            );
            const lowMemory = createTestMemory(
              "mem-low",
              lowData.content,
              lowData.sector,
              lowData.salience,
              lowData.strength,
              lowData.keywords
            );

            // Ensure different relevance scores
            const highRelevance = 0.9;
            const lowRelevance = 0.5;

            const memories = [lowMemory, highMemory]; // Put low first to test sorting
            const relevanceScores = [lowRelevance, highRelevance];
            const searchResult = createTestSearchResult(memories, relevanceScores);

            vi.mocked(mockRepository.search).mockResolvedValue(searchResult);

            const result = await reasoning.augmentProblemContext(problemText, userId);

            // Property: Higher relevance memories SHALL appear earlier in background
            const highIndex = result.memoryBackground.indexOf(highData.content);
            const lowIndex = result.memoryBackground.indexOf(lowData.content);

            // Both should be present
            expect(highIndex).toBeGreaterThanOrEqual(0);
            expect(lowIndex).toBeGreaterThanOrEqual(0);

            // High relevance should appear before low relevance
            expect(highIndex).toBeLessThan(lowIndex);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
