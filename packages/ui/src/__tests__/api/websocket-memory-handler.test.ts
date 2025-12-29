/**
 * WebSocket Memory Handler Tests
 *
 * Tests for the WebSocket memory event handler.
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WebSocketMemoryHandler,
  createWebSocketMemoryHandler,
  type MemoryCreatedEventData,
  type MemoryDeletedEventData,
  type MemoryEventCallbacks,
  type MemoryUpdatedEventData,
} from "../../api/websocket-memory-handler";
import type { ActivityEvent, Memory, WebSocketConnectionState } from "../../types/api";

// ============================================================================
// Mock WebSocket
// ============================================================================

type EventCallback = (event: ActivityEvent) => void;
type ConnectionCallback = (state: WebSocketConnectionState) => void;
type ErrorCallback = (error: Error) => void;

class MockThoughtWebSocket {
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private errorListeners: Set<ErrorCallback> = new Set();
  private connectionState: WebSocketConnectionState = "disconnected";
  private subscribedTypes: Set<string> = new Set();

  connect(): void {
    this.connectionState = "connected";
    this.notifyConnectionListeners();
  }

  disconnect(): void {
    this.connectionState = "disconnected";
    this.notifyConnectionListeners();
  }

  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  subscribe(types: string[]): void {
    for (const type of types) {
      this.subscribedTypes.add(type);
    }
  }

  unsubscribe(types: string[]): void {
    for (const type of types) {
      this.subscribedTypes.delete(type);
    }
  }

  onEvent(type: string, listener: EventCallback): () => void {
    let listeners = this.eventListeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(type, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  onConnectionStateChange(listener: ConnectionCallback): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  onError(listener: ErrorCallback): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  // Test helpers
  simulateEvent(event: ActivityEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  simulateConnectionChange(state: WebSocketConnectionState): void {
    this.connectionState = state;
    this.notifyConnectionListeners();
  }

  simulateError(error: Error): void {
    for (const listener of this.errorListeners) {
      listener(error);
    }
  }

  private notifyConnectionListeners(): void {
    for (const listener of this.connectionListeners) {
      listener(this.connectionState);
    }
  }

  getSubscribedTypes(): Set<string> {
    return this.subscribedTypes;
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "test-memory-id",
    content: "Test memory content",
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    accessCount: 0,
    salience: 0.5,
    strength: 1.0,
    userId: "test-user-id",
    sessionId: "test-session-id",
    primarySector: "episodic",
    metadata: {},
    ...overrides,
  };
}

function createMemoryCreatedEvent(memory: Memory, tempId?: string): ActivityEvent {
  const data: MemoryCreatedEventData =
    tempId !== undefined
      ? { memory, userId: memory.userId, tempId }
      : { memory, userId: memory.userId };
  return {
    type: "memory_created",
    timestamp: new Date().toISOString(),
    data,
  };
}

function createMemoryUpdatedEvent(
  memoryId: string,
  userId: string,
  updates: Partial<Memory>,
  reason: string = "user_edit"
): ActivityEvent {
  const data: MemoryUpdatedEventData = {
    memoryId,
    userId,
    updates,
    reason,
  };
  return {
    type: "memory_updated",
    timestamp: new Date().toISOString(),
    data,
  };
}

function createMemoryDeletedEvent(memoryId: string, userId: string): ActivityEvent {
  const data: MemoryDeletedEventData = {
    memoryId,
    userId,
  };
  return {
    type: "memory_deleted",
    timestamp: new Date().toISOString(),
    data,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("WebSocketMemoryHandler", () => {
  let mockWs: MockThoughtWebSocket;
  let handler: WebSocketMemoryHandler;

  beforeEach(() => {
    mockWs = new MockThoughtWebSocket();
    handler = createWebSocketMemoryHandler(
      mockWs as unknown as Parameters<typeof createWebSocketMemoryHandler>[0]
    );
  });

  afterEach(() => {
    handler.unsubscribe();
  });

  describe("subscribeToMemoryEvents", () => {
    it("should subscribe to memory event types", () => {
      handler.subscribeToMemoryEvents("test-user-id");

      const subscribedTypes = mockWs.getSubscribedTypes();
      expect(subscribedTypes.has("memory_created")).toBe(true);
      expect(subscribedTypes.has("memory_updated")).toBe(true);
      expect(subscribedTypes.has("memory_deleted")).toBe(true);
    });

    it("should unsubscribe from previous user when subscribing to new user", () => {
      const callbacks1: MemoryEventCallbacks = {
        onMemoryCreated: vi.fn(),
      };
      const callbacks2: MemoryEventCallbacks = {
        onMemoryCreated: vi.fn(),
      };

      handler.subscribeToMemoryEvents("user-1", callbacks1);
      handler.subscribeToMemoryEvents("user-2", callbacks2);

      // Simulate event for user-1 (should not trigger callback)
      const memory1 = createTestMemory({ userId: "user-1" });
      mockWs.connect();
      mockWs.simulateEvent(createMemoryCreatedEvent(memory1));

      expect(callbacks1.onMemoryCreated).not.toHaveBeenCalled();

      // Simulate event for user-2 (should trigger callback)
      const memory2 = createTestMemory({ userId: "user-2" });
      mockWs.simulateEvent(createMemoryCreatedEvent(memory2));

      expect(callbacks2.onMemoryCreated).toHaveBeenCalledWith(memory2, undefined);
    });
  });

  describe("memory_created events", () => {
    it("should call onMemoryCreated callback when memory is created", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });
      mockWs.connect();

      const memory = createTestMemory({ userId: "test-user-id" });
      mockWs.simulateEvent(createMemoryCreatedEvent(memory));

      expect(onMemoryCreated).toHaveBeenCalledWith(memory, undefined);
    });

    it("should pass tempId when provided", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });
      mockWs.connect();

      const memory = createTestMemory({ userId: "test-user-id" });
      mockWs.simulateEvent(createMemoryCreatedEvent(memory, "temp-123"));

      expect(onMemoryCreated).toHaveBeenCalledWith(memory, "temp-123");
    });

    it("should not call callback for different user", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });
      mockWs.connect();

      const memory = createTestMemory({ userId: "other-user-id" });
      mockWs.simulateEvent(createMemoryCreatedEvent(memory));

      expect(onMemoryCreated).not.toHaveBeenCalled();
    });
  });

  describe("memory_updated events", () => {
    it("should call onMemoryUpdated callback when memory is updated", () => {
      const onMemoryUpdated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryUpdated });
      mockWs.connect();

      const updates = { content: "Updated content" };
      mockWs.simulateEvent(
        createMemoryUpdatedEvent("memory-123", "test-user-id", updates, "user_edit")
      );

      expect(onMemoryUpdated).toHaveBeenCalledWith("memory-123", updates, "user_edit");
    });

    it("should handle embedding_complete reason", () => {
      const onMemoryUpdated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryUpdated });
      mockWs.connect();

      const updates: Partial<Memory> = { content: "Updated content after embedding" };
      mockWs.simulateEvent(
        createMemoryUpdatedEvent("memory-123", "test-user-id", updates, "embedding_complete")
      );

      expect(onMemoryUpdated).toHaveBeenCalledWith("memory-123", updates, "embedding_complete");
    });
  });

  describe("memory_deleted events", () => {
    it("should call onMemoryDeleted callback when memory is deleted", () => {
      const onMemoryDeleted = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryDeleted });
      mockWs.connect();

      mockWs.simulateEvent(createMemoryDeletedEvent("memory-123", "test-user-id"));

      expect(onMemoryDeleted).toHaveBeenCalledWith("memory-123");
    });
  });

  describe("event queuing during disconnection", () => {
    it("should queue events when disconnected", () => {
      handler.subscribeToMemoryEvents("test-user-id");
      // Don't connect - stay disconnected

      const memory = createTestMemory({ userId: "test-user-id" });
      const event = createMemoryCreatedEvent(memory);

      // Manually queue the event (simulating what would happen during disconnection)
      handler.queueEvent({
        type: event.type as "memory_created",
        timestamp: event.timestamp,
        data: event.data as MemoryCreatedEventData,
      });

      expect(handler.getQueueSize()).toBe(1);
    });

    it("should enforce max queue size", () => {
      const smallQueueHandler = createWebSocketMemoryHandler(
        mockWs as unknown as Parameters<typeof createWebSocketMemoryHandler>[0],
        { maxQueueSize: 3 }
      );
      smallQueueHandler.subscribeToMemoryEvents("test-user-id");

      // Queue 5 events
      for (let i = 0; i < 5; i++) {
        const memory = createTestMemory({ id: `memory-${i}`, userId: "test-user-id" });
        smallQueueHandler.queueEvent({
          type: "memory_created",
          timestamp: new Date().toISOString(),
          data: { memory, userId: "test-user-id" },
        });
      }

      // Should only have 3 events (max queue size)
      expect(smallQueueHandler.getQueueSize()).toBe(3);
    });
  });

  describe("reconcileQueue", () => {
    it("should process queued events on reconciliation", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });

      // Queue some events
      const memory1 = createTestMemory({ id: "memory-1", userId: "test-user-id" });
      const memory2 = createTestMemory({ id: "memory-2", userId: "test-user-id" });

      handler.queueEvent({
        type: "memory_created",
        timestamp: new Date(Date.now() - 1000).toISOString(),
        data: { memory: memory1, userId: "test-user-id" },
      });
      handler.queueEvent({
        type: "memory_created",
        timestamp: new Date().toISOString(),
        data: { memory: memory2, userId: "test-user-id" },
      });

      expect(handler.getQueueSize()).toBe(2);

      // Reconcile
      handler.reconcileQueue();

      expect(onMemoryCreated).toHaveBeenCalledTimes(2);
      expect(handler.getQueueSize()).toBe(0);
    });

    it("should process events in timestamp order", () => {
      const processedOrder: string[] = [];
      const onMemoryCreated = vi.fn((memory: Memory) => {
        processedOrder.push(memory.id);
      });
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });

      // Queue events out of order
      const memory1 = createTestMemory({ id: "memory-1", userId: "test-user-id" });
      const memory2 = createTestMemory({ id: "memory-2", userId: "test-user-id" });

      // Add memory-2 first with later timestamp
      handler.queueEvent({
        type: "memory_created",
        timestamp: new Date(Date.now() + 1000).toISOString(),
        data: { memory: memory2, userId: "test-user-id" },
      });

      // Add memory-1 second with earlier timestamp
      handler.queueEvent({
        type: "memory_created",
        timestamp: new Date(Date.now() - 1000).toISOString(),
        data: { memory: memory1, userId: "test-user-id" },
      });

      handler.reconcileQueue();

      // Should be processed in timestamp order (memory-1 first)
      expect(processedOrder).toEqual(["memory-1", "memory-2"]);
    });
  });

  describe("connection state changes", () => {
    it("should call onConnectionStateChange callback", () => {
      const onConnectionStateChange = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onConnectionStateChange });

      mockWs.simulateConnectionChange("connected");
      expect(onConnectionStateChange).toHaveBeenCalledWith("connected");

      mockWs.simulateConnectionChange("disconnected");
      expect(onConnectionStateChange).toHaveBeenCalledWith("disconnected");
    });

    it("should reconcile queue on reconnection", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });

      // Queue an event
      const memory = createTestMemory({ userId: "test-user-id" });
      handler.queueEvent({
        type: "memory_created",
        timestamp: new Date().toISOString(),
        data: { memory, userId: "test-user-id" },
      });

      expect(handler.getQueueSize()).toBe(1);

      // Simulate reconnection - reconciliation happens synchronously
      mockWs.simulateConnectionChange("connected");

      expect(onMemoryCreated).toHaveBeenCalledWith(memory, undefined);
      expect(handler.getQueueSize()).toBe(0);
    });
  });

  describe("event deduplication", () => {
    it("should deduplicate identical events within window", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });
      mockWs.connect();

      const memory = createTestMemory({ userId: "test-user-id" });
      const event = createMemoryCreatedEvent(memory);

      // Simulate same event twice
      mockWs.simulateEvent(event);
      mockWs.simulateEvent(event);

      // Should only be called once
      expect(onMemoryCreated).toHaveBeenCalledTimes(1);
    });

    it("should not deduplicate events for different memories", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });
      mockWs.connect();

      const memory1 = createTestMemory({ id: "memory-1", userId: "test-user-id" });
      const memory2 = createTestMemory({ id: "memory-2", userId: "test-user-id" });

      mockWs.simulateEvent(createMemoryCreatedEvent(memory1));
      mockWs.simulateEvent(createMemoryCreatedEvent(memory2));

      expect(onMemoryCreated).toHaveBeenCalledTimes(2);
    });
  });

  describe("error handling", () => {
    it("should call onError callback when error occurs", () => {
      const onError = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onError });

      const error = new Error("WebSocket error");
      mockWs.simulateError(error);

      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe from memory event types", () => {
      handler.subscribeToMemoryEvents("test-user-id");
      handler.unsubscribe();

      const subscribedTypes = mockWs.getSubscribedTypes();
      expect(subscribedTypes.has("memory_created")).toBe(false);
      expect(subscribedTypes.has("memory_updated")).toBe(false);
      expect(subscribedTypes.has("memory_deleted")).toBe(false);
    });

    it("should not receive events after unsubscribe", () => {
      const onMemoryCreated = vi.fn();
      handler.subscribeToMemoryEvents("test-user-id", { onMemoryCreated });
      mockWs.connect();

      handler.unsubscribe();

      const memory = createTestMemory({ userId: "test-user-id" });
      mockWs.simulateEvent(createMemoryCreatedEvent(memory));

      expect(onMemoryCreated).not.toHaveBeenCalled();
    });
  });

  describe("getConnectionState", () => {
    it("should return current connection state", () => {
      expect(handler.getConnectionState()).toBe("disconnected");

      mockWs.connect();
      expect(handler.getConnectionState()).toBe("connected");

      mockWs.disconnect();
      expect(handler.getConnectionState()).toBe("disconnected");
    });
  });

  describe("isConnected", () => {
    it("should return true when connected", () => {
      expect(handler.isConnected()).toBe(false);

      mockWs.connect();
      expect(handler.isConnected()).toBe(true);
    });
  });

  describe("clearQueue", () => {
    it("should clear all queued events", () => {
      handler.subscribeToMemoryEvents("test-user-id");

      const memory = createTestMemory({ userId: "test-user-id" });
      handler.queueEvent({
        type: "memory_created",
        timestamp: new Date().toISOString(),
        data: { memory, userId: "test-user-id" },
      });

      expect(handler.getQueueSize()).toBe(1);

      handler.clearQueue();

      expect(handler.getQueueSize()).toBe(0);
    });
  });
});
