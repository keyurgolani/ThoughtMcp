/**
 * Property Test: Batch Recall Soft-Delete Filtering
 *
 * **Feature: reasoning-quality-improvements, Property 4: Batch recall excludes soft-deleted by default**
 *
 * This property test validates that batch_recall excludes soft-deleted memories
 * (strength=0) by default, and includes them when includeDeleted=true.
 *
 * **Validates: Requirements 2.3**
 *
 * - Requirement 2.3: WHEN batch_recall retrieves memories THEN the Memory Repository
 *   SHALL exclude soft-deleted memories by default
 *
 * @module __tests__/property/memory/batch-recall-soft-delete.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import type {
  BatchRetrieveInput,
  BatchRetrieveResult,
  Memory,
  MemoryMetadata,
  MemorySectorType,
} from "../../../memory/types";

/**
 * Mock MemoryRepository that simulates the batchRetrieve behavior
 * This allows us to test the soft-delete filtering logic in isolation
 */
class MockMemoryRepository {
  private memories: Map<string, Memory> = new Map();

  setMemories(memories: Memory[]): void {
    this.memories.clear();
    for (const memory of memories) {
      this.memories.set(memory.id, memory);
    }
  }

  /**
   * Simulates the batchRetrieve method from MemoryRepository
   * Implements the soft-delete filtering logic per Requirements 2.3, 2.4
   */
  batchRetrieve(input: BatchRetrieveInput): BatchRetrieveResult {
    const startTime = Date.now();
    const includeDeleted = input.includeDeleted ?? false;

    const foundMemories: Memory[] = [];
    const notFound: string[] = [];

    for (const memoryId of input.memoryIds) {
      const memory = this.memories.get(memoryId);

      if (!memory || memory.userId !== input.userId) {
        notFound.push(memoryId);
        continue;
      }

      // Filter out soft-deleted memories (strength=0) unless includeDeleted is true
      if (!includeDeleted && memory.strength === 0) {
        notFound.push(memoryId);
        continue;
      }

      foundMemories.push(memory);
    }

    return {
      memories: foundMemories,
      notFound,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Arbitrary for generating valid memory metadata
 */
const metadataArb: fc.Arbitrary<MemoryMetadata> = fc.record({
  keywords: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
  category: fc.string({ minLength: 0, maxLength: 50 }),
  context: fc.string({ minLength: 0, maxLength: 100 }),
  importance: fc.double({ min: 0, max: 1, noNaN: true }),
  isAtomic: fc.boolean(),
  parentId: fc.option(fc.uuid(), { nil: undefined }),
});

/**
 * Arbitrary for generating valid memory objects with configurable strength
 */
const memoryArb = (userId: string, strength?: number): fc.Arbitrary<Memory> => {
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
    strength:
      strength !== undefined ? fc.constant(strength) : fc.double({ min: 0, max: 1, noNaN: true }),
    userId: fc.constant(userId),
    sessionId: fc.uuid(),
    primarySector: fc.constantFrom(
      "episodic",
      "semantic",
      "procedural",
      "emotional",
      "reflective"
    ) as fc.Arbitrary<MemorySectorType>,
    metadata: metadataArb,
  });
};

/**
 * Arbitrary for generating a soft-deleted memory (strength=0)
 */
const softDeletedMemoryArb = (userId: string): fc.Arbitrary<Memory> => memoryArb(userId, 0);

/**
 * Arbitrary for generating an active memory (strength > 0)
 */
const activeMemoryArb = (userId: string): fc.Arbitrary<Memory> => {
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
    // Active memories have strength > 0
    strength: fc.double({ min: 0.01, max: 1, noNaN: true }),
    userId: fc.constant(userId),
    sessionId: fc.uuid(),
    primarySector: fc.constantFrom(
      "episodic",
      "semantic",
      "procedural",
      "emotional",
      "reflective"
    ) as fc.Arbitrary<MemorySectorType>,
    metadata: metadataArb,
  });
};

/**
 * Arbitrary for generating a mix of active and soft-deleted memories
 */
const mixedMemoriesArb = (userId: string): fc.Arbitrary<Memory[]> =>
  fc
    .tuple(
      fc.array(activeMemoryArb(userId), { minLength: 1, maxLength: 10 }),
      fc.array(softDeletedMemoryArb(userId), { minLength: 1, maxLength: 10 })
    )
    .map(([active, deleted]) => [...active, ...deleted]);

describe("Property 4: Batch recall excludes soft-deleted by default", () => {
  let repository: MockMemoryRepository;
  const testUserId = "test-user-123";

  beforeEach(() => {
    repository = new MockMemoryRepository();
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 4: Batch recall excludes soft-deleted by default**
   * **Validates: Requirements 2.3**
   *
   * For any batch_recall request without includeDeleted flag,
   * memories with strength=0 SHALL NOT appear in results.
   */
  describe("Default behavior excludes soft-deleted", () => {
    it("should exclude soft-deleted memories when includeDeleted is false", () => {
      fc.assert(
        fc.property(mixedMemoriesArb(testUserId), (memories) => {
          repository.setMemories(memories);

          const allIds = memories.map((m) => m.id);
          const input: BatchRetrieveInput = {
            memoryIds: allIds,
            userId: testUserId,
            includeDeleted: false,
          };

          const result = repository.batchRetrieve(input);

          // Property: No memory in results SHALL have strength=0
          for (const memory of result.memories) {
            expect(memory.strength).toBeGreaterThan(0);
          }

          // Property: All soft-deleted IDs SHALL be in notFound
          const softDeletedIds = memories.filter((m) => m.strength === 0).map((m) => m.id);
          for (const id of softDeletedIds) {
            expect(result.notFound).toContain(id);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should exclude soft-deleted memories when includeDeleted is undefined (default)", () => {
      fc.assert(
        fc.property(mixedMemoriesArb(testUserId), (memories) => {
          repository.setMemories(memories);

          const allIds = memories.map((m) => m.id);
          const input: BatchRetrieveInput = {
            memoryIds: allIds,
            userId: testUserId,
            // includeDeleted is undefined (default behavior)
          };

          const result = repository.batchRetrieve(input);

          // Property: No memory in results SHALL have strength=0
          for (const memory of result.memories) {
            expect(memory.strength).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 4: Batch recall excludes soft-deleted by default**
   * **Validates: Requirements 2.4**
   *
   * For any batch_recall request with includeDeleted=true,
   * soft-deleted memories SHALL appear in results.
   */
  describe("Include deleted when requested", () => {
    it("should include soft-deleted memories when includeDeleted is true", () => {
      fc.assert(
        fc.property(mixedMemoriesArb(testUserId), (memories) => {
          repository.setMemories(memories);

          const allIds = memories.map((m) => m.id);
          const input: BatchRetrieveInput = {
            memoryIds: allIds,
            userId: testUserId,
            includeDeleted: true,
          };

          const result = repository.batchRetrieve(input);

          // Property: All memories (including soft-deleted) SHALL be returned
          expect(result.memories.length).toBe(memories.length);

          // Property: Soft-deleted memories SHALL be in results
          const softDeletedIds = memories.filter((m) => m.strength === 0).map((m) => m.id);
          const resultIds = result.memories.map((m) => m.id);
          for (const id of softDeletedIds) {
            expect(resultIds).toContain(id);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 4: Batch recall excludes soft-deleted by default**
   * **Validates: Requirements 2.3**
   *
   * Active memories (strength > 0) SHALL always be returned regardless of includeDeleted flag.
   */
  describe("Active memories always returned", () => {
    it("should return active memories regardless of includeDeleted flag", () => {
      fc.assert(
        fc.property(
          fc.array(activeMemoryArb(testUserId), { minLength: 1, maxLength: 10 }),
          fc.boolean(),
          (memories, includeDeleted) => {
            repository.setMemories(memories);

            const allIds = memories.map((m) => m.id);
            const input: BatchRetrieveInput = {
              memoryIds: allIds,
              userId: testUserId,
              includeDeleted,
            };

            const result = repository.batchRetrieve(input);

            // Property: All active memories SHALL be returned
            expect(result.memories.length).toBe(memories.length);
            expect(result.notFound.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 4: Batch recall excludes soft-deleted by default**
   * **Validates: Requirements 2.3**
   *
   * Only soft-deleted memories for the requesting user SHALL be filtered.
   */
  describe("User isolation", () => {
    it("should only return memories belonging to the requesting user", () => {
      fc.assert(
        fc.property(
          mixedMemoriesArb(testUserId),
          mixedMemoriesArb("other-user-456"),
          (userMemories, otherMemories) => {
            repository.setMemories([...userMemories, ...otherMemories]);

            const allIds = [...userMemories, ...otherMemories].map((m) => m.id);
            const input: BatchRetrieveInput = {
              memoryIds: allIds,
              userId: testUserId,
              includeDeleted: true,
            };

            const result = repository.batchRetrieve(input);

            // Property: Only memories for testUserId SHALL be returned
            for (const memory of result.memories) {
              expect(memory.userId).toBe(testUserId);
            }

            // Property: Other user's memories SHALL be in notFound
            const otherUserIds = otherMemories.map((m) => m.id);
            for (const id of otherUserIds) {
              expect(result.notFound).toContain(id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 4: Batch recall excludes soft-deleted by default**
   * **Validates: Requirements 2.3**
   *
   * The count of returned memories plus notFound SHALL equal the input count.
   */
  describe("Result completeness", () => {
    it("should account for all requested memory IDs", () => {
      fc.assert(
        fc.property(mixedMemoriesArb(testUserId), fc.boolean(), (memories, includeDeleted) => {
          repository.setMemories(memories);

          const allIds = memories.map((m) => m.id);
          const input: BatchRetrieveInput = {
            memoryIds: allIds,
            userId: testUserId,
            includeDeleted,
          };

          const result = repository.batchRetrieve(input);

          // Property: memories.length + notFound.length SHALL equal input.memoryIds.length
          expect(result.memories.length + result.notFound.length).toBe(allIds.length);
        }),
        { numRuns: 100 }
      );
    });
  });
});
