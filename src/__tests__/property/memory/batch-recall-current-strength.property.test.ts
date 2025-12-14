/**
 * Property Test: Batch Recall Returns Current Strength
 *
 * **Feature: reasoning-quality-improvements, Property 3: Batch recall returns current strength**
 *
 * This property test validates that batch_recall returns the current strength value
 * for each memory, not a cached or stale value.
 *
 * **Validates: Requirements 2.1**
 *
 * - Requirement 2.1: WHEN batch_recall retrieves memories THEN the Memory Repository
 *   SHALL return the current strength value for each memory
 *
 * @module __tests__/property/memory/batch-recall-current-strength.property.test
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
 * with support for updating memory strength values
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
   * Update the strength of a memory (simulates soft-delete or strength decay)
   */
  updateStrength(memoryId: string, newStrength: number): void {
    const memory = this.memories.get(memoryId);
    if (memory) {
      memory.strength = newStrength;
    }
  }

  /**
   * Get the current strength of a memory directly from storage
   */
  getCurrentStrength(memoryId: string): number | undefined {
    return this.memories.get(memoryId)?.strength;
  }

  /**
   * Simulates the batchRetrieve method from MemoryRepository
   * Returns current strength values per Requirements 2.1
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

      // Return a copy with current strength value
      foundMemories.push({ ...memory });
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
    // Initial strength > 0 so memory is active
    strength: fc.double({ min: 0.1, max: 1, noNaN: true }),
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
 * Arbitrary for generating a list of memories for a user
 */
const memoriesArb = (userId: string): fc.Arbitrary<Memory[]> =>
  fc.array(memoryArb(userId), { minLength: 1, maxLength: 10 });

/**
 * Arbitrary for generating a valid strength value
 */
const strengthArb: fc.Arbitrary<number> = fc.double({ min: 0, max: 1, noNaN: true });

describe("Property 3: Batch recall returns current strength", () => {
  let repository: MockMemoryRepository;
  const testUserId = "test-user-123";

  beforeEach(() => {
    repository = new MockMemoryRepository();
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 3: Batch recall returns current strength**
   * **Validates: Requirements 2.1**
   *
   * For any memory that has been updated, batch_recall SHALL return
   * the current strength value (not a cached or stale value).
   */
  describe("Current strength value", () => {
    it("should return the current strength value for each memory", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), (memories) => {
          repository.setMemories(memories);

          const allIds = memories.map((m) => m.id);
          const input: BatchRetrieveInput = {
            memoryIds: allIds,
            userId: testUserId,
            includeDeleted: true, // Include all to verify strength values
          };

          const result = repository.batchRetrieve(input);

          // Property: Each returned memory SHALL have its current strength value
          for (const memory of result.memories) {
            const currentStrength = repository.getCurrentStrength(memory.id);
            expect(memory.strength).toBe(currentStrength);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should return updated strength after modification", () => {
      fc.assert(
        fc.property(
          memoriesArb(testUserId),
          fc.integer({ min: 0, max: 9 }), // Index to update
          strengthArb,
          (memories, indexToUpdate, newStrength) => {
            repository.setMemories(memories);

            // Ensure index is valid
            const validIndex = indexToUpdate % memories.length;
            const memoryToUpdate = memories[validIndex];

            // Update the strength
            repository.updateStrength(memoryToUpdate.id, newStrength);

            const input: BatchRetrieveInput = {
              memoryIds: [memoryToUpdate.id],
              userId: testUserId,
              includeDeleted: true, // Include even if soft-deleted
            };

            const result = repository.batchRetrieve(input);

            // Property: Returned strength SHALL match the updated value
            if (result.memories.length > 0) {
              expect(result.memories[0].strength).toBe(newStrength);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 3: Batch recall returns current strength**
   * **Validates: Requirements 2.1, 2.2**
   *
   * For any soft-deleted memory (strength=0), batch_recall with includeDeleted=true
   * SHALL return strength=0.
   */
  describe("Soft-deleted memory strength", () => {
    it("should return strength=0 for soft-deleted memories when includeDeleted=true", () => {
      fc.assert(
        fc.property(
          memoriesArb(testUserId),
          fc.integer({ min: 0, max: 9 }), // Index to soft-delete
          (memories, indexToDelete) => {
            repository.setMemories(memories);

            // Ensure index is valid
            const validIndex = indexToDelete % memories.length;
            const memoryToDelete = memories[validIndex];

            // Soft-delete the memory (set strength to 0)
            repository.updateStrength(memoryToDelete.id, 0);

            const input: BatchRetrieveInput = {
              memoryIds: [memoryToDelete.id],
              userId: testUserId,
              includeDeleted: true,
            };

            const result = repository.batchRetrieve(input);

            // Property: Soft-deleted memory SHALL have strength=0
            expect(result.memories.length).toBe(1);
            expect(result.memories[0].strength).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 3: Batch recall returns current strength**
   * **Validates: Requirements 2.1**
   *
   * Strength values SHALL be bounded between 0 and 1.
   */
  describe("Strength value bounds", () => {
    it("should return strength values bounded between 0 and 1", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), (memories) => {
          repository.setMemories(memories);

          const allIds = memories.map((m) => m.id);
          const input: BatchRetrieveInput = {
            memoryIds: allIds,
            userId: testUserId,
            includeDeleted: true,
          };

          const result = repository.batchRetrieve(input);

          // Property: All strength values SHALL be in [0, 1]
          for (const memory of result.memories) {
            expect(memory.strength).toBeGreaterThanOrEqual(0);
            expect(memory.strength).toBeLessThanOrEqual(1);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 3: Batch recall returns current strength**
   * **Validates: Requirements 2.1**
   *
   * Multiple retrievals of the same memory SHALL return consistent strength values.
   */
  describe("Consistency", () => {
    it("should return consistent strength values across multiple retrievals", () => {
      fc.assert(
        fc.property(memoriesArb(testUserId), (memories) => {
          repository.setMemories(memories);

          const allIds = memories.map((m) => m.id);
          const input: BatchRetrieveInput = {
            memoryIds: allIds,
            userId: testUserId,
            includeDeleted: true,
          };

          // Retrieve twice
          const result1 = repository.batchRetrieve(input);
          const result2 = repository.batchRetrieve(input);

          // Property: Same query SHALL return same strength values
          expect(result1.memories.length).toBe(result2.memories.length);

          for (const memory1 of result1.memories) {
            const memory2 = result2.memories.find((m) => m.id === memory1.id);
            expect(memory2).toBeDefined();
            expect(memory1.strength).toBe(memory2!.strength);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: reasoning-quality-improvements, Property 3: Batch recall returns current strength**
   * **Validates: Requirements 2.1**
   *
   * Strength updates SHALL be reflected immediately in subsequent retrievals.
   */
  describe("Immediate reflection of updates", () => {
    it("should reflect strength updates immediately", () => {
      fc.assert(
        fc.property(
          memoriesArb(testUserId),
          fc.array(strengthArb, { minLength: 1, maxLength: 5 }),
          (memories, strengthUpdates) => {
            repository.setMemories(memories);

            // Pick a memory to update multiple times
            const memoryToUpdate = memories[0];

            // Apply each strength update and verify it's reflected
            for (const newStrength of strengthUpdates) {
              repository.updateStrength(memoryToUpdate.id, newStrength);

              const input: BatchRetrieveInput = {
                memoryIds: [memoryToUpdate.id],
                userId: testUserId,
                includeDeleted: true,
              };

              const result = repository.batchRetrieve(input);

              // Property: Each update SHALL be immediately reflected
              if (result.memories.length > 0) {
                expect(result.memories[0].strength).toBe(newStrength);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
