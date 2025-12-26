/**
 * WebSocket Handler Unit Tests
 *
 * Tests for the ActivityWebSocketHandler class that provides real-time
 * cognitive activity updates via WebSocket connections.
 * Requirements: 7.1, 7.3
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ActivityWebSocketHandler,
  createLoadChangeEvent,
  createMemoryOperationEvent,
  createReasoningUpdateEvent,
  createSessionEvent,
  createSystemEvent,
  DEFAULT_WEBSOCKET_CONFIG,
  type ActivityEvent,
  type LoadChangeData,
  type MemoryOperationData,
  type ReasoningUpdateData,
  type SessionEventData,
  type SystemEventData,
} from "../../../server/websocket-handler.js";

describe("ActivityWebSocketHandler", () => {
  let handler: ActivityWebSocketHandler;

  beforeEach(() => {
    handler = new ActivityWebSocketHandler();
  });

  afterEach(() => {
    if (handler.getIsRunning()) {
      handler.close();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create handler with default configuration", () => {
      expect(handler.getIsRunning()).toBe(false);
      expect(handler.getClientCount()).toBe(0);
    });

    it("should accept custom configuration", () => {
      const customHandler = new ActivityWebSocketHandler({
        path: "/custom/path",
        heartbeatIntervalMs: 60000,
        clientTimeoutMs: 240000,
        maxClients: 50,
      });
      expect(customHandler.getIsRunning()).toBe(false);
    });
  });

  describe("Default Configuration", () => {
    it("should have correct default path", () => {
      expect(DEFAULT_WEBSOCKET_CONFIG.path).toBe("/api/v1/activity/live");
    });

    it("should have correct default heartbeat interval", () => {
      expect(DEFAULT_WEBSOCKET_CONFIG.heartbeatIntervalMs).toBe(30000);
    });

    it("should have correct default client timeout", () => {
      expect(DEFAULT_WEBSOCKET_CONFIG.clientTimeoutMs).toBe(120000);
    });

    it("should have correct default max clients", () => {
      expect(DEFAULT_WEBSOCKET_CONFIG.maxClients).toBe(100);
    });
  });

  describe("Handler State", () => {
    it("should report not running before attach", () => {
      expect(handler.getIsRunning()).toBe(false);
    });

    it("should report zero clients initially", () => {
      expect(handler.getClientCount()).toBe(0);
    });

    it("should return empty client info initially", () => {
      expect(handler.getClientInfo()).toEqual([]);
    });
  });

  describe("Broadcast Without Clients", () => {
    it("should handle broadcast when no clients connected", () => {
      const event: ActivityEvent = {
        type: "memory_operation",
        timestamp: new Date().toISOString(),
        data: {
          operation: "store",
          userId: "user-123",
          success: true,
        } as MemoryOperationData,
      };

      // Should not throw
      expect(() => handler.broadcast(event)).not.toThrow();
    });

    it("should handle broadcast when handler not running", () => {
      const event: ActivityEvent = {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        data: { message: "test" },
      };

      // Should not throw
      expect(() => handler.broadcast(event)).not.toThrow();
    });
  });

  describe("Close Handler", () => {
    it("should handle close when not running", () => {
      expect(() => handler.close()).not.toThrow();
    });
  });
});

describe("Activity Event Helpers", () => {
  describe("createMemoryOperationEvent", () => {
    it("should create memory operation event with correct type", () => {
      const data: MemoryOperationData = {
        operation: "store",
        memoryId: "mem-123",
        userId: "user-456",
        sector: "episodic",
        success: true,
        duration: 150,
      };

      const event = createMemoryOperationEvent(data);

      expect(event.type).toBe("memory_operation");
      expect(event.timestamp).toBeDefined();
      expect(event.data).toEqual(data);
    });

    it("should create event with valid ISO timestamp", () => {
      const data: MemoryOperationData = {
        operation: "recall",
        userId: "user-123",
        success: true,
      };

      const event = createMemoryOperationEvent(data);
      const timestamp = new Date(event.timestamp);

      expect(timestamp.toISOString()).toBe(event.timestamp);
    });

    it("should handle all operation types", () => {
      const operations: MemoryOperationData["operation"][] = [
        "store",
        "recall",
        "update",
        "delete",
        "search",
      ];

      for (const operation of operations) {
        const event = createMemoryOperationEvent({
          operation,
          userId: "user-123",
          success: true,
        });
        expect((event.data as MemoryOperationData).operation).toBe(operation);
      }
    });
  });

  describe("createReasoningUpdateEvent", () => {
    it("should create reasoning update event with correct type", () => {
      const data: ReasoningUpdateData = {
        sessionId: "session-123",
        stage: "analyzing",
        progress: 0.5,
        activeStreams: ["analytical", "creative"],
        mode: "balanced",
      };

      const event = createReasoningUpdateEvent(data);

      expect(event.type).toBe("reasoning_update");
      expect(event.timestamp).toBeDefined();
      expect(event.data).toEqual(data);
    });

    it("should handle minimal data", () => {
      const data: ReasoningUpdateData = {
        sessionId: "session-456",
        stage: "complete",
        progress: 1.0,
      };

      const event = createReasoningUpdateEvent(data);

      expect(event.type).toBe("reasoning_update");
      expect((event.data as ReasoningUpdateData).sessionId).toBe("session-456");
    });
  });

  describe("createLoadChangeEvent", () => {
    it("should create load change event with correct type", () => {
      const data: LoadChangeData = {
        loadLevel: 0.75,
        activeProcesses: 5,
        memoryOpsPerSecond: 10,
        reasoningSessions: 2,
        visualIntensity: "high",
      };

      const event = createLoadChangeEvent(data);

      expect(event.type).toBe("load_change");
      expect(event.timestamp).toBeDefined();
      expect(event.data).toEqual(data);
    });

    it("should handle all visual intensity levels", () => {
      const intensities: LoadChangeData["visualIntensity"][] = ["low", "medium", "high"];

      for (const visualIntensity of intensities) {
        const event = createLoadChangeEvent({
          loadLevel: 0.5,
          activeProcesses: 1,
          memoryOpsPerSecond: 5,
          reasoningSessions: 1,
          visualIntensity,
        });
        expect((event.data as LoadChangeData).visualIntensity).toBe(visualIntensity);
      }
    });
  });

  describe("createSessionEvent", () => {
    it("should create session event with correct type", () => {
      const data: SessionEventData = {
        event: "created",
        sessionId: "session-789",
        userId: "user-123",
      };

      const event = createSessionEvent(data);

      expect(event.type).toBe("session_event");
      expect(event.timestamp).toBeDefined();
      expect(event.data).toEqual(data);
    });

    it("should handle all session event types", () => {
      const eventTypes: SessionEventData["event"][] = ["created", "updated", "deleted"];

      for (const eventType of eventTypes) {
        const event = createSessionEvent({
          event: eventType,
          sessionId: "session-123",
        });
        expect((event.data as SessionEventData).event).toBe(eventType);
      }
    });
  });

  describe("createSystemEvent", () => {
    it("should create system event with correct type", () => {
      const data: SystemEventData = {
        event: "startup",
        status: "healthy",
        message: "System started successfully",
      };

      const event = createSystemEvent(data);

      expect(event.type).toBe("system_event");
      expect(event.timestamp).toBeDefined();
      expect(event.data).toEqual(data);
    });

    it("should handle all system event types", () => {
      const eventTypes: SystemEventData["event"][] = [
        "startup",
        "shutdown",
        "health_change",
        "config_change",
      ];

      for (const eventType of eventTypes) {
        const event = createSystemEvent({
          event: eventType,
        });
        expect((event.data as SystemEventData).event).toBe(eventType);
      }
    });

    it("should handle optional fields", () => {
      const event = createSystemEvent({
        event: "health_change",
      });

      expect(event.type).toBe("system_event");
      expect((event.data as SystemEventData).status).toBeUndefined();
      expect((event.data as SystemEventData).message).toBeUndefined();
    });
  });
});

describe("ActivityEvent Type Validation", () => {
  it("should have correct event type for memory_operation", () => {
    const event = createMemoryOperationEvent({
      operation: "store",
      userId: "user-123",
      success: true,
    });
    expect(event.type).toBe("memory_operation");
  });

  it("should have correct event type for reasoning_update", () => {
    const event = createReasoningUpdateEvent({
      sessionId: "session-123",
      stage: "processing",
      progress: 0.5,
    });
    expect(event.type).toBe("reasoning_update");
  });

  it("should have correct event type for load_change", () => {
    const event = createLoadChangeEvent({
      loadLevel: 0.5,
      activeProcesses: 3,
      memoryOpsPerSecond: 8,
      reasoningSessions: 1,
      visualIntensity: "medium",
    });
    expect(event.type).toBe("load_change");
  });

  it("should have correct event type for session_event", () => {
    const event = createSessionEvent({
      event: "created",
      sessionId: "session-123",
    });
    expect(event.type).toBe("session_event");
  });

  it("should have correct event type for system_event", () => {
    const event = createSystemEvent({
      event: "startup",
    });
    expect(event.type).toBe("system_event");
  });
});
