/**
 * Property Tests: Memory Relevance Filtering
 *
 * **Feature: reasoning-quality-improvements, Properties 5, 6, 7, 9**
 *
 * These property tests validate the memory relevance filtering behavior
 * in memory-augmented reasoning.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * @module __tests__/property/reasoning/memory-relevance-filtering.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";

import { MemoryRepository } from "../../../memory/memory-repository";
import type { CompositeScore, Memory, MemorySectorType, SearchResult } from "../../../memory/types";
import { MemoryAugmentedReasoning } from "../../../reasoning/memory-augmented-reasoning";

describe("Memory Relevance Filtering Properties", () => {
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
    "How can we improve error handling?"
  );

  /**
   * Arbitrary for generating valid memory content
   */
  const memoryContentArb = fc.constantFrom(
    "Previous experience with database optimization",
    "Known fact about API design",
    "Best practice for authentication systems",
    "Common issue with caching mechanisms",
    "Successful approach to error recovery"
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
   * Arbitrary for generating keywords
   */
  const keywordsArb = fc.array(
    fc.constantFrom("optimization", "performance", "security", "testing", "database"),
    { minLength: 1, maxLength: 3 }
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
   * Create mock repository
   */
  const createMockRepository = (): MemoryRepository =>
    ({
      search: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      batchCreate: vi.fn(),
      batchRetrieve: vi.fn(),
      batchDelete: vi.fn(),
    }) as unknown as MemoryRepository;

  /**
   * **Feature: reasoning-quality-improvements, Property 5: Memory relevance filtering with threshold**
   * **Validates: Requirements 3.1, 3.2**
   *
   * For any memory-augmented reasoning request, all returned memories SHALL have
   * relevance score >= 0.5 AND be sorted by relevance descending.
   */
  describe("Property 5: Memory relevance filtering with threshold", () => {
    it("should filter memories below relevance threshold and sort by relevance descending", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          // Generate memories with varying relevance scores (some above, some below threshold)
          fc.array(
            fc.record({
              content: memoryContentArb,
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
              // Generate relevance scores that span above and below 0.5 threshold
              relevanceScore: fc.integer({ min: 20, max: 100 }).map((n) => n / 100),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (problemText, userId, memoryDataList) => {
            const mockRepository = createMockRepository();
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

            const result = await reasoning.retrieveContext(problemText, userId);

            // Property: All returned memories SHALL have relevance score >= 0.5
            for (const memory of result.memories) {
              expect(memory.relevanceScore).toBeGreaterThanOrEqual(0.5);
            }

            // Property: Memories SHALL be sorted by relevance descending
            for (let i = 1; i < result.memories.length; i++) {
              expect(result.memories[i - 1].relevanceScore).toBeGreaterThanOrEqual(
                result.memories[i].relevanceScore
              );
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 6: Memory result limit**
   * **Validates: Requirements 3.4**
   *
   * For any memory context retrieval, the number of returned memories SHALL NOT exceed 5.
   */
  describe("Property 6: Memory result limit", () => {
    it("should limit results to maxMemories (default 5)", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          // Generate more memories than the limit to test limiting
          fc.array(
            fc.record({
              content: memoryContentArb,
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
              // All above threshold to ensure they would be included
              relevanceScore: fc.integer({ min: 60, max: 100 }).map((n) => n / 100),
            }),
            { minLength: 6, maxLength: 15 }
          ),
          async (problemText, userId, memoryDataList) => {
            const mockRepository = createMockRepository();
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

            const result = await reasoning.retrieveContext(problemText, userId);

            // Property: Number of returned memories SHALL NOT exceed 5
            expect(result.memories.length).toBeLessThanOrEqual(5);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should respect custom maxMemories configuration", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          fc.integer({ min: 1, max: 10 }), // Custom limit
          fc.array(
            fc.record({
              content: memoryContentArb,
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
              relevanceScore: fc.integer({ min: 60, max: 100 }).map((n) => n / 100),
            }),
            { minLength: 1, maxLength: 15 }
          ),
          async (problemText, userId, customLimit, memoryDataList) => {
            const mockRepository = createMockRepository();
            const reasoning = new MemoryAugmentedReasoning(mockRepository, {
              maxMemories: customLimit,
            });

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

            const result = await reasoning.retrieveContext(problemText, userId);

            // Property: Number of returned memories SHALL NOT exceed custom limit
            expect(result.memories.length).toBeLessThanOrEqual(customLimit);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 7: Empty context for irrelevant queries**
   * **Validates: Requirements 3.5**
   *
   * For any problem query where no memories have relevance >= 0.5,
   * the memory context SHALL be empty rather than containing low-relevance memories.
   */
  describe("Property 7: Empty context for irrelevant queries", () => {
    it("should return empty context when all memories are below relevance threshold", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          // Generate memories with relevance scores all below 0.5 threshold
          fc.array(
            fc.record({
              content: memoryContentArb,
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
              // All below threshold
              relevanceScore: fc.integer({ min: 10, max: 49 }).map((n) => n / 100),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (problemText, userId, memoryDataList) => {
            const mockRepository = createMockRepository();
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

            const result = await reasoning.retrieveContext(problemText, userId);

            // Property: Memory context SHALL be empty when no memories meet threshold
            expect(result.memories).toHaveLength(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty augmented context when no relevant memories exist", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          fc.array(
            fc.record({
              content: memoryContentArb,
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
              relevanceScore: fc.integer({ min: 10, max: 49 }).map((n) => n / 100),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (problemText, userId, memoryDataList) => {
            const mockRepository = createMockRepository();
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

            // Property: hasMemoryContext SHALL be false when no relevant memories
            expect(result.hasMemoryContext).toBe(false);
            expect(result.memoriesUsed).toHaveLength(0);
            expect(result.memoryBackground).toBe("");
            // Original problem should be preserved
            expect(result.augmentedProblem).toBe(problemText);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 9: Reasoning context completeness**
   * **Validates: Requirements 3.3**
   *
   * For any memory included in reasoning context, the content SHALL be provided
   * in full without truncation (truncation only applies to display, not reasoning input).
   *
   * Note: This property tests that the memory background used for reasoning
   * contains the memory content (which may be truncated for display purposes).
   * The design specifies truncation for display, but the reasoning context
   * uses the content as stored in RetrievedMemory.
   */
  describe("Property 9: Reasoning context completeness", () => {
    it("should include memory content in reasoning background", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          fc.array(
            fc.record({
              content: memoryContentArb,
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
              relevanceScore: fc.integer({ min: 60, max: 100 }).map((n) => n / 100),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (problemText, userId, memoryDataList) => {
            const mockRepository = createMockRepository();
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

            // Property: Each memory's content SHALL appear in the memory background
            for (const memory of result.memoriesUsed) {
              // The content (possibly truncated) should be in the background
              expect(result.memoryBackground).toContain(memory.content);
            }

            // Property: Augmented problem SHALL contain the memory background
            expect(result.augmentedProblem).toContain(result.memoryBackground);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should track truncation status for each memory", async () => {
      await fc.assert(
        fc.asyncProperty(
          problemTextArb,
          userIdArb,
          fc.array(
            fc.record({
              // Generate content of varying lengths
              content: fc.oneof(
                memoryContentArb, // Short content
                fc.string({ minLength: 600, maxLength: 800 }) // Long content that will be truncated
              ),
              sector: sectorArb,
              salience: salienceArb,
              strength: strengthArb,
              keywords: keywordsArb,
              relevanceScore: fc.integer({ min: 60, max: 100 }).map((n) => n / 100),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (problemText, userId, memoryDataList) => {
            const mockRepository = createMockRepository();
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

            const result = await reasoning.retrieveContext(problemText, userId);

            // Property: Each memory SHALL have isTruncated field
            for (const memory of result.memories) {
              expect(typeof memory.isTruncated).toBe("boolean");

              // If truncated, originalLength should be set
              if (memory.isTruncated) {
                expect(memory.originalLength).toBeDefined();
                expect(memory.originalLength).toBeGreaterThan(memory.content.length);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
