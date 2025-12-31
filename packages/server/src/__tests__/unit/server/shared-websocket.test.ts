import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSharedWebSocketHandler,
  isWebSocketHandlerAvailable,
  resetSharedWebSocketHandler,
  setSharedWebSocketHandler,
} from "../../../server/shared-websocket.js";
import type { ActivityWebSocketHandler } from "../../../server/websocket-handler.js";

/**
 * Shared WebSocket Handler Unit Tests
 *
 * Tests the singleton pattern for WebSocket handler access.
 * Requirements: 3.1, 3.2, 3.3
 */
describe("Shared WebSocket Handler", () => {
  let mockHandler: ActivityWebSocketHandler;

  beforeEach(() => {
    // Reset the singleton before each test
    resetSharedWebSocketHandler();

    // Create mock handler
    mockHandler = {
      getIsRunning: vi.fn().mockReturnValue(true),
      broadcastToUser: vi.fn(),
      getClientInfo: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    } as unknown as ActivityWebSocketHandler;
  });

  afterEach(() => {
    resetSharedWebSocketHandler();
    vi.clearAllMocks();
  });

  describe("getSharedWebSocketHandler", () => {
    it("should return null when no handler is set", () => {
      const handler = getSharedWebSocketHandler();
      expect(handler).toBeNull();
    });

    it("should return the handler after it is set", () => {
      setSharedWebSocketHandler(mockHandler);
      const handler = getSharedWebSocketHandler();
      expect(handler).toBe(mockHandler);
    });

    it("should return the same instance on multiple calls", () => {
      setSharedWebSocketHandler(mockHandler);
      const handler1 = getSharedWebSocketHandler();
      const handler2 = getSharedWebSocketHandler();
      expect(handler1).toBe(handler2);
    });
  });

  describe("setSharedWebSocketHandler", () => {
    it("should set the handler instance", () => {
      setSharedWebSocketHandler(mockHandler);
      expect(getSharedWebSocketHandler()).toBe(mockHandler);
    });

    it("should allow setting handler to null", () => {
      setSharedWebSocketHandler(mockHandler);
      setSharedWebSocketHandler(null);
      expect(getSharedWebSocketHandler()).toBeNull();
    });

    it("should replace existing handler", () => {
      const anotherHandler = {
        getIsRunning: vi.fn().mockReturnValue(false),
      } as unknown as ActivityWebSocketHandler;

      setSharedWebSocketHandler(mockHandler);
      setSharedWebSocketHandler(anotherHandler);
      expect(getSharedWebSocketHandler()).toBe(anotherHandler);
    });
  });

  describe("resetSharedWebSocketHandler", () => {
    it("should clear the handler instance", () => {
      setSharedWebSocketHandler(mockHandler);
      resetSharedWebSocketHandler();
      expect(getSharedWebSocketHandler()).toBeNull();
    });

    it("should not throw when called with no handler set", () => {
      expect(() => resetSharedWebSocketHandler()).not.toThrow();
    });

    it("should allow setting a new handler after reset", () => {
      setSharedWebSocketHandler(mockHandler);
      resetSharedWebSocketHandler();

      const newHandler = {
        getIsRunning: vi.fn().mockReturnValue(true),
      } as unknown as ActivityWebSocketHandler;

      setSharedWebSocketHandler(newHandler);
      expect(getSharedWebSocketHandler()).toBe(newHandler);
    });
  });

  describe("isWebSocketHandlerAvailable", () => {
    it("should return false when no handler is set", () => {
      expect(isWebSocketHandlerAvailable()).toBe(false);
    });

    it("should return true when handler is set and running", () => {
      mockHandler.getIsRunning = vi.fn().mockReturnValue(true);
      setSharedWebSocketHandler(mockHandler);
      expect(isWebSocketHandlerAvailable()).toBe(true);
      expect(mockHandler.getIsRunning).toHaveBeenCalled();
    });

    it("should return false when handler is set but not running", () => {
      mockHandler.getIsRunning = vi.fn().mockReturnValue(false);
      setSharedWebSocketHandler(mockHandler);
      expect(isWebSocketHandlerAvailable()).toBe(false);
      expect(mockHandler.getIsRunning).toHaveBeenCalled();
    });

    it("should handle handler returning undefined for isRunning", () => {
      mockHandler.getIsRunning = vi.fn().mockReturnValue(undefined);
      setSharedWebSocketHandler(mockHandler);
      expect(isWebSocketHandlerAvailable()).toBe(false);
    });
  });

  describe("Singleton Pattern - Requirements: 3.1, 3.2, 3.3", () => {
    it("should maintain single instance across module", () => {
      setSharedWebSocketHandler(mockHandler);

      // Multiple gets should return same instance
      const instance1 = getSharedWebSocketHandler();
      const instance2 = getSharedWebSocketHandler();
      const instance3 = getSharedWebSocketHandler();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it("should allow components to check availability before use", () => {
      // Initially not available
      expect(isWebSocketHandlerAvailable()).toBe(false);

      // Set handler
      setSharedWebSocketHandler(mockHandler);

      // Now available
      expect(isWebSocketHandlerAvailable()).toBe(true);

      // Reset
      resetSharedWebSocketHandler();

      // No longer available
      expect(isWebSocketHandlerAvailable()).toBe(false);
    });
  });
});
