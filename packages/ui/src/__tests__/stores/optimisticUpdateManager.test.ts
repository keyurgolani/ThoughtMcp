/**
 * OptimisticUpdateManager Tests
 *
 * Tests for the optimistic update management store.
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateTempId,
  selectHasPendingOptimistic,
  selectHasRejectedEntries,
  selectOptimisticCount,
  selectOptimisticEntries,
  selectRejectedEntries,
  useOptimisticUpdateStore,
  type MemoryContent,
} from "../../stores/optimisticUpdateManager";
import type { Memory } from "../../types/api";

describe("OptimisticUpdateManager", () => {
  // Reset store state before each test
  beforeEach(() => {
    useOptimisticUpdateStore.setState({
      optimisticEntries: new Map(),
      rejectedEntries: new Map(),
    });
  });

  afterEach(() => {
    useOptimisticUpdateStore.getState().clearAll();
  });

  describe("generateTempId", () => {
    it("should generate temp ID with correct format", () => {
      const tempId = generateTempId();
      // UUID v4 format: temp-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(tempId.startsWith("temp-")).toBe(true);
      const uuidPart = tempId.substring(5);
      // Check UUID format
      expect(uuidPart).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate unique temp IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTempId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("addOptimistic", () => {
    it("should add optimistic memory and return temp ID", () => {
      const { addOptimistic } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
        metadata: { tags: ["test"] },
      };

      const tempId = addOptimistic(content);

      expect(tempId).toMatch(/^temp-/);
      expect(useOptimisticUpdateStore.getState().optimisticEntries.size).toBe(1);
    });

    it("should create optimistic memory with correct fields", () => {
      const { addOptimistic, getOptimisticMemory } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory content",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
        metadata: { importance: 0.8, tags: ["important"] },
      };

      const tempId = addOptimistic(content);
      const memory = getOptimisticMemory(tempId);

      expect(memory).toBeDefined();
      expect(memory?.id).toBe(tempId);
      expect(memory?.tempId).toBe(tempId);
      expect(memory?.content).toBe("Test memory content");
      expect(memory?.userId).toBe("user-123");
      expect(memory?.sessionId).toBe("session-456");
      expect(memory?.primarySector).toBe("semantic");
      expect(memory?.isPending).toBe(true);
      expect(memory?.salience).toBe(0.8);
      expect(memory?.strength).toBe(1.0);
      expect(memory?.metadata.tags).toEqual(["important"]);
      expect(memory?.optimisticCreatedAt).toBeGreaterThan(0);
    });

    it("should use default salience when importance not provided", () => {
      const { addOptimistic, getOptimisticMemory } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "procedural",
      };

      const tempId = addOptimistic(content);
      const memory = getOptimisticMemory(tempId);

      expect(memory?.salience).toBe(0.5);
    });

    it("should add multiple optimistic entries", () => {
      const { addOptimistic } = useOptimisticUpdateStore.getState();

      const content1: MemoryContent = {
        content: "Memory 1",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const content2: MemoryContent = {
        content: "Memory 2",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      const tempId1 = addOptimistic(content1);
      const tempId2 = addOptimistic(content2);

      expect(tempId1).not.toBe(tempId2);
      expect(useOptimisticUpdateStore.getState().optimisticEntries.size).toBe(2);
    });
  });

  describe("confirmOptimistic", () => {
    it("should remove optimistic entry on confirmation", () => {
      const { addOptimistic, confirmOptimistic } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      expect(useOptimisticUpdateStore.getState().optimisticEntries.size).toBe(1);

      const realMemory: Memory = {
        id: "real-memory-id-123",
        content: "Test memory",
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        salience: 0.5,
        strength: 1.0,
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
        metadata: {},
      };

      confirmOptimistic(tempId, realMemory);

      expect(useOptimisticUpdateStore.getState().optimisticEntries.size).toBe(0);
      expect(useOptimisticUpdateStore.getState().optimisticEntries.has(tempId)).toBe(false);
    });

    it("should clear rejection error on confirmation", () => {
      const { addOptimistic, rejectOptimistic, confirmOptimistic } =
        useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      rejectOptimistic(tempId, new Error("Test error"));

      // Re-add and confirm
      const tempId2 = addOptimistic(content);

      const realMemory: Memory = {
        id: "real-id",
        content: "Test memory",
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        salience: 0.5,
        strength: 1.0,
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
        metadata: {},
      };

      confirmOptimistic(tempId2, realMemory);

      expect(useOptimisticUpdateStore.getState().rejectedEntries.has(tempId2)).toBe(false);
    });

    it("should handle confirmation of non-existent entry gracefully", () => {
      const { confirmOptimistic } = useOptimisticUpdateStore.getState();

      const realMemory: Memory = {
        id: "real-id",
        content: "Test",
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        salience: 0.5,
        strength: 1.0,
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
        metadata: {},
      };

      // Should not throw
      expect(() => confirmOptimistic("non-existent-temp-id", realMemory)).not.toThrow();
    });
  });

  describe("rejectOptimistic", () => {
    it("should remove optimistic entry and store error", () => {
      const { addOptimistic, rejectOptimistic, getRejectionError } =
        useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      const error = new Error("Server error: Failed to create memory");

      rejectOptimistic(tempId, error);

      expect(useOptimisticUpdateStore.getState().optimisticEntries.size).toBe(0);
      expect(getRejectionError(tempId)).toBe(error);
    });

    it("should handle rejection of non-existent entry gracefully", () => {
      const { rejectOptimistic } = useOptimisticUpdateStore.getState();

      // Should not throw
      expect(() => rejectOptimistic("non-existent", new Error("Test"))).not.toThrow();
    });
  });

  describe("isPending", () => {
    it("should return true for pending optimistic entry", () => {
      const { addOptimistic, isPending } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);

      expect(isPending(tempId)).toBe(true);
    });

    it("should return false for non-existent entry", () => {
      const { isPending } = useOptimisticUpdateStore.getState();

      expect(isPending("non-existent-id")).toBe(false);
    });

    it("should return false after confirmation", () => {
      const { addOptimistic, confirmOptimistic, isPending } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);

      const realMemory: Memory = {
        id: "real-id",
        content: "Test memory",
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        salience: 0.5,
        strength: 1.0,
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
        metadata: {},
      };

      confirmOptimistic(tempId, realMemory);

      expect(isPending(tempId)).toBe(false);
    });

    it("should return false after rejection", () => {
      const { addOptimistic, rejectOptimistic, isPending } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      rejectOptimistic(tempId, new Error("Failed"));

      expect(isPending(tempId)).toBe(false);
    });
  });

  describe("getAllOptimisticMemories", () => {
    it("should return all optimistic memories", () => {
      const { addOptimistic, getAllOptimisticMemories } = useOptimisticUpdateStore.getState();

      const content1: MemoryContent = {
        content: "Memory 1",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const content2: MemoryContent = {
        content: "Memory 2",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "semantic",
      };

      addOptimistic(content1);
      addOptimistic(content2);

      const memories = getAllOptimisticMemories();

      expect(memories.length).toBe(2);
      expect(memories.map((m) => m.content)).toContain("Memory 1");
      expect(memories.map((m) => m.content)).toContain("Memory 2");
    });

    it("should return empty array when no optimistic entries", () => {
      const { getAllOptimisticMemories } = useOptimisticUpdateStore.getState();

      expect(getAllOptimisticMemories()).toEqual([]);
    });
  });

  describe("clearAll", () => {
    it("should clear all optimistic and rejected entries", () => {
      const { addOptimistic, rejectOptimistic, clearAll } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId1 = addOptimistic(content);
      addOptimistic(content);
      rejectOptimistic(tempId1, new Error("Test"));

      clearAll();

      expect(useOptimisticUpdateStore.getState().optimisticEntries.size).toBe(0);
      expect(useOptimisticUpdateStore.getState().rejectedEntries.size).toBe(0);
    });
  });

  describe("clearRejectionError", () => {
    it("should clear specific rejection error", () => {
      const { addOptimistic, rejectOptimistic, clearRejectionError, getRejectionError } =
        useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test memory",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      rejectOptimistic(tempId, new Error("Test error"));

      expect(getRejectionError(tempId)).toBeDefined();

      clearRejectionError(tempId);

      expect(getRejectionError(tempId)).toBeUndefined();
    });
  });

  describe("selectors", () => {
    it("selectOptimisticEntries should return entries map", () => {
      const { addOptimistic } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      addOptimistic(content);

      const entries = selectOptimisticEntries(useOptimisticUpdateStore.getState());
      expect(entries.size).toBe(1);
    });

    it("selectOptimisticCount should return correct count", () => {
      const { addOptimistic } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      expect(selectOptimisticCount(useOptimisticUpdateStore.getState())).toBe(0);

      addOptimistic(content);
      addOptimistic(content);

      expect(selectOptimisticCount(useOptimisticUpdateStore.getState())).toBe(2);
    });

    it("selectHasPendingOptimistic should return correct boolean", () => {
      const { addOptimistic, confirmOptimistic } = useOptimisticUpdateStore.getState();

      expect(selectHasPendingOptimistic(useOptimisticUpdateStore.getState())).toBe(false);

      const content: MemoryContent = {
        content: "Test",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      expect(selectHasPendingOptimistic(useOptimisticUpdateStore.getState())).toBe(true);

      const realMemory: Memory = {
        id: "real-id",
        content: "Test",
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        salience: 0.5,
        strength: 1.0,
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
        metadata: {},
      };

      confirmOptimistic(tempId, realMemory);
      expect(selectHasPendingOptimistic(useOptimisticUpdateStore.getState())).toBe(false);
    });

    it("selectRejectedEntries should return rejected entries map", () => {
      const { addOptimistic, rejectOptimistic } = useOptimisticUpdateStore.getState();

      const content: MemoryContent = {
        content: "Test",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      rejectOptimistic(tempId, new Error("Test error"));

      const rejected = selectRejectedEntries(useOptimisticUpdateStore.getState());
      expect(rejected.size).toBe(1);
    });

    it("selectHasRejectedEntries should return correct boolean", () => {
      const { addOptimistic, rejectOptimistic, clearRejectionError } =
        useOptimisticUpdateStore.getState();

      expect(selectHasRejectedEntries(useOptimisticUpdateStore.getState())).toBe(false);

      const content: MemoryContent = {
        content: "Test",
        userId: "user-123",
        sessionId: "session-456",
        primarySector: "episodic",
      };

      const tempId = addOptimistic(content);
      rejectOptimistic(tempId, new Error("Test"));

      expect(selectHasRejectedEntries(useOptimisticUpdateStore.getState())).toBe(true);

      clearRejectionError(tempId);
      expect(selectHasRejectedEntries(useOptimisticUpdateStore.getState())).toBe(false);
    });
  });
});
