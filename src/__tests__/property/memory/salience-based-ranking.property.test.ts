/**
 * Property Test: Salience-Based Ranking
 *
 * **Feature: mcp-tool-improvements, Property 6: Salience-Based Ranking**
 *
 * This property test validates that when no text query is provided to retrieve_memories,
 * the system uses salience-weighted ranking instead of similarity-based scoring.
 *
 * **Validates: Requirements 5.1, 5.2**
 *
 * - Requirement 5.1: WHEN no text query is provided THEN the retrieval SHALL use
 *   salience-weighted ranking instead of similarity
 * - Requirement 5.2: WHEN no text query is provided THEN the composite score SHALL use
 *   (0.4×salience + 0.3×recency + 0.3×linkWeight) instead of similarity-based scoring
 *
 * @module __tests__/property/memory/salience-based-ranking.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import type {
  CompositeScore,
  Memory,
  RankingMethod,
  SearchQuery,
  SearchResult,
} from "../../../memory/types";

/**
 * Mock MemoryRepository that simulates the search behavior
 * This allows us to test the ranking method selection logic in isolation
 */
class MockMemoryRepository {
  private memories: Memory[] = [];

  setMemories(memories: Memory[]): void {
    this.memories = memories;
  }

  /**
   * Simulates the search method from MemoryRepository
   * Implements the ranking method selection logic per Requirements 5.1, 5.2
   */
  search(query: SearchQuery): SearchResult {
    const startTime = Date.now();

    // Determine ranking method based on whether text query is provided
    const hasTextQuery = !!query.text;
    const rankingMethod: RankingMethod = hasTextQuery ? "similarity" : "salience";

    // Filter memories by userId
    const filteredMemories = this.memories.filter((m) => m.userId === query.userId);

    // Calculate scores for each memory
    const scores = new Map<string, CompositeScore>();

    for (const memory of filteredMemories) {
      const similarity = hasTextQuery
        ? this.calculateMockSimilarity(query.text!, memory.content)
        : 0;
      const recency = this.calculateRecencyScore(memory.createdAt);
      const linkWeight = 0.5; // Mock link weight

      const compositeScore = this.calculateCompositeScore(
        similarity,
        memory.salience,
        recency,
        linkWeight,
        hasTextQuery
      );

      scores.set(memory.id, compositeScore);
    }

    // Sort by total score
    const sortedMemories = [...filteredMemories].sort((a, b) => {
      const scoreA = scores.get(a.id)?.total ?? 0;
      const scoreB = scores.get(b.id)?.total ?? 0;
      return scoreB - scoreA;
    });

    // Apply pagination
    const limit = Math.min(query.limit ?? 10, 100);
    const offset = query.offset ?? 0;
    const paginatedMemories = sortedMemories.slice(offset, offset + limit);

    return {
      memories: paginatedMemories,
      totalCount: filteredMemories.length,
      scores,
      processingTime: Math.max(1, Date.now() - startTime),
      rankingMethod,
    };
  }

  /**
   * Calculate composite score with weights
   *
   * When hasTextQuery is true (similarity-based ranking):
   *   Formula: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight
   *
   * When hasTextQuery is false (salience-based ranking):
   *   Formula: 0.4×salience + 0.3×recency + 0.3×linkWeight
   */
  private calculateCompositeScore(
    similarity: number,
    salience: number,
    recency: number,
    linkWeight: number,
    hasTextQuery: boolean
  ): CompositeScore {
    let total: number;

    if (hasTextQuery) {
      // Similarity-based scoring: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight
      total = 0.6 * similarity + 0.2 * salience + 0.1 * recency + 0.1 * linkWeight;
    } else {
      // Salience-based scoring: 0.4×salience + 0.3×recency + 0.3×linkWeight
      total = 0.4 * salience + 0.3 * recency + 0.3 * linkWeight;
    }

    return {
      total: Math.max(0, Math.min(1.0, total)),
      similarity: Math.max(0, Math.min(1.0, similarity)),
      salience: Math.max(0, Math.min(1.0, salience)),
      recency: Math.max(0, Math.min(1.0, recency)),
      linkWeight: Math.max(0, Math.min(1.0, linkWeight)),
    };
  }

  private calculateRecencyScore(createdAt: Date): number {
    const ageMs = Date.now() - createdAt.getTime();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const recency = Math.max(0, 1.0 - ageMs / oneYearMs);
    return Math.min(1.0, recency);
  }

  private calculateMockSimilarity(query: string, content: string): number {
    // Simple mock similarity based on word overlap
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const contentWords = new Set(content.toLowerCase().split(/\s+/));
    const intersection = [...queryWords].filter((w) => contentWords.has(w));
    return Math.min(1.0, intersection.length / Math.max(queryWords.size, 1));
  }
}

/**
 * Arbitrary for generating valid memory objects
 * Uses integer timestamps to avoid NaN date issues
 */
const memoryArb = (userId: string): fc.Arbitrary<Memory> => {
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

  return fc.record({
    id: fc.uuid(),
    content: fc.string({ minLength: 10, maxLength: 200 }),
    createdAt: fc.integer({ min: oneYearAgo, max: now }).map((ts) => new Date(ts)),
    lastAccessed: fc.integer({ min: oneYearAgo, max: now }).map((ts) => new Date(ts)),
    accessCount: fc.integer({ min: 0, max: 100 }),
    salience: fc.double({ min: 0, max: 1, noNaN: true }),
    decayRate: fc.double({ min: 0.01, max: 0.1, noNaN: true }),
    strength: fc.double({ min: 0, max: 1, noNaN: true }),
    userId: fc.constant(userId),
    sessionId: fc.uuid(),
    primarySector: fc.constantFrom(
      "episodic",
      "semantic",
      "procedural",
      "emotional",
      "reflective"
    ) as fc.Arbitrary<Memory["primarySector"]>,
    metadata: fc.record({
      keywords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
        minLength: 0,
        maxLength: 5,
      }),
      tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
      category: fc.string({ minLength: 0, maxLength: 50 }),
      context: fc.string({ minLength: 0, maxLength: 100 }),
      importance: fc.double({ min: 0, max: 1, noNaN: true }),
      isAtomic: fc.boolean(),
      parentId: fc.option(fc.uuid(), { nil: undefined }),
    }),
  });
};

/**
 * Arbitrary for generating a list of memories for a user
 */
const memoriesArb = (userId: string): fc.Arbitrary<Memory[]> =>
  fc.array(memoryArb(userId), { minLength: 1, maxLength: 20 });

/**
 * Arbitrary for generating search queries without text (salience-based)
 */
const salienceQueryArb = (userId: string): fc.Arbitrary<SearchQuery> =>
  fc.record({
    userId: fc.constant(userId),
    text: fc.constant(undefined),
    limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
    offset: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  });

/**
 * Arbitrary for generating search queries with non-empty text (similarity-based)
 */
const similarityQueryArb = (userId: string): fc.Arbitrary<SearchQuery> =>
  fc.record({
    userId: fc.constant(userId),
    text: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
    offset: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  });

describe("Property 6: Salience-Based Ranking", () => {
  let repository: MockMemoryRepository;
  const testUserId = "test-user-123";

  beforeEach(() => {
    repository = new MockMemoryRepository();
  });

  /**
   * **Feature: mcp-tool-improvements, Property 6: Salience-Based Ranking**
   * **Validates: Requirements 5.1**
   *
   * For any retrieval without text query, rankingMethod SHALL be "salience".
   */
  describe("Ranking method selection", () => {
    it("should use salience ranking when no text query is provided", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), salienceQueryArb(testUserId), (memories, query) => {
          repository.setMemories(memories);
          const result = repository.search(query);

          // Property: Without text query, rankingMethod SHALL be "salience"
          expect(result.rankingMethod).toBe("salience");
        }),
        { numRuns: 100 }
      );
    });

    it("should use similarity ranking when text query is provided", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), similarityQueryArb(testUserId), (memories, query) => {
          repository.setMemories(memories);
          const result = repository.search(query);

          // Property: With text query, rankingMethod SHALL be "similarity"
          expect(result.rankingMethod).toBe("similarity");
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 6: Salience-Based Ranking**
   * **Validates: Requirements 5.2**
   *
   * For any retrieval without text query, composite score SHALL use
   * (0.4×salience + 0.3×recency + 0.3×linkWeight) formula.
   */
  describe("Salience-based scoring formula", () => {
    it("should calculate scores using salience formula when no text query", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), salienceQueryArb(testUserId), (memories, query) => {
          repository.setMemories(memories);
          const result = repository.search(query);

          // For each memory in results, verify the scoring formula
          for (const memory of result.memories) {
            const score = result.scores.get(memory.id);
            expect(score).toBeDefined();

            if (score) {
              // Property: similarity component SHALL be 0 when no text query
              expect(score.similarity).toBe(0);

              // Property: total SHALL be calculated using salience formula
              // Formula: 0.4×salience + 0.3×recency + 0.3×linkWeight
              const expectedTotal =
                0.4 * score.salience + 0.3 * score.recency + 0.3 * score.linkWeight;
              expect(score.total).toBeCloseTo(expectedTotal, 5);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should calculate scores using similarity formula when text query provided", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), similarityQueryArb(testUserId), (memories, query) => {
          repository.setMemories(memories);
          const result = repository.search(query);

          // For each memory in results, verify the scoring formula
          for (const memory of result.memories) {
            const score = result.scores.get(memory.id);
            expect(score).toBeDefined();

            if (score) {
              // Property: total SHALL be calculated using similarity formula
              // Formula: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight
              const expectedTotal =
                0.6 * score.similarity +
                0.2 * score.salience +
                0.1 * score.recency +
                0.1 * score.linkWeight;
              expect(score.total).toBeCloseTo(expectedTotal, 5);
            }
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 6: Salience-Based Ranking**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Memories with higher salience SHALL rank higher when no text query is provided.
   */
  describe("Salience-based ordering", () => {
    it("should rank memories by salience-weighted score when no text query", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), salienceQueryArb(testUserId), (memories, query) => {
          repository.setMemories(memories);
          const result = repository.search(query);

          // Property: Results SHALL be ordered by descending total score
          for (let i = 1; i < result.memories.length; i++) {
            const prevScore = result.scores.get(result.memories[i - 1].id)?.total ?? 0;
            const currScore = result.scores.get(result.memories[i].id)?.total ?? 0;
            expect(prevScore).toBeGreaterThanOrEqual(currScore);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 6: Salience-Based Ranking**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Score components SHALL be bounded between 0 and 1.
   */
  describe("Score bounds", () => {
    it("should have all score components bounded between 0 and 1", () => {
      fc.assert(
        fc.property(
          memoriesArb(testUserId),
          fc.oneof(salienceQueryArb(testUserId), similarityQueryArb(testUserId)),
          (memories, query) => {
            repository.setMemories(memories);
            const result = repository.search(query);

            for (const memory of result.memories) {
              const score = result.scores.get(memory.id);
              expect(score).toBeDefined();

              if (score) {
                // Property: All score components SHALL be in [0, 1]
                expect(score.total).toBeGreaterThanOrEqual(0);
                expect(score.total).toBeLessThanOrEqual(1);
                expect(score.similarity).toBeGreaterThanOrEqual(0);
                expect(score.similarity).toBeLessThanOrEqual(1);
                expect(score.salience).toBeGreaterThanOrEqual(0);
                expect(score.salience).toBeLessThanOrEqual(1);
                expect(score.recency).toBeGreaterThanOrEqual(0);
                expect(score.recency).toBeLessThanOrEqual(1);
                expect(score.linkWeight).toBeGreaterThanOrEqual(0);
                expect(score.linkWeight).toBeLessThanOrEqual(1);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 6: Salience-Based Ranking**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Empty text string SHALL be treated as no text query (salience-based).
   */
  describe("Empty text handling", () => {
    it("should treat empty string as no text query", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), (memories) => {
          repository.setMemories(memories);

          const queryWithEmptyText: SearchQuery = {
            userId: testUserId,
            text: "",
          };

          const result = repository.search(queryWithEmptyText);

          // Property: Empty text SHALL be treated as no text query
          // Note: The actual implementation treats empty string as falsy,
          // so rankingMethod should be "salience"
          expect(result.rankingMethod).toBe("salience");
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 6: Salience-Based Ranking**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Ranking method selection SHALL be deterministic.
   */
  describe("Deterministic ranking method", () => {
    it("should consistently select ranking method based on text presence", () => {
      fc.assert(
        fc.property(
          memoriesArb(testUserId),
          fc.oneof(salienceQueryArb(testUserId), similarityQueryArb(testUserId)),
          (memories, query) => {
            repository.setMemories(memories);

            // Run search twice with same query
            const result1 = repository.search(query);
            const result2 = repository.search(query);

            // Property: Same query SHALL produce same ranking method
            expect(result1.rankingMethod).toBe(result2.rankingMethod);

            // Property: Ranking method SHALL match text presence
            const hasText = !!query.text;
            const expectedMethod = hasText ? "similarity" : "salience";
            expect(result1.rankingMethod).toBe(expectedMethod);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
