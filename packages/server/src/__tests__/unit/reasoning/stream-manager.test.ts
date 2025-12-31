import type { Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamManager } from "../../../reasoning/stream-manager";

/**
 * StreamManager Unit Tests
 *
 * Tests the Server-Sent Events (SSE) stream management functionality
 * including connection handling, broadcasting, and cleanup.
 */
describe("StreamManager", () => {
  let streamManager: StreamManager;
  let mockResponse: Response;
  let closeHandler: (() => void) | null = null;

  beforeEach(() => {
    // Reset singleton for each test
    // Access private static instance to reset it
    (StreamManager as unknown as { instance: StreamManager | undefined }).instance = undefined;
    streamManager = StreamManager.getInstance();

    // Create mock Response object
    mockResponse = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        if (event === "close") {
          closeHandler = handler;
        }
      }),
    } as unknown as Response;
  });

  afterEach(() => {
    closeHandler = null;
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = StreamManager.getInstance();
      const instance2 = StreamManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create instance on first call", () => {
      const instance = StreamManager.getInstance();
      expect(instance).toBeInstanceOf(StreamManager);
    });
  });

  describe("addConnection", () => {
    it("should set SSE headers on response", () => {
      streamManager.addConnection("stream-1", mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "no-cache");
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Connection", "keep-alive");
    });

    it("should flush headers after setting them", () => {
      streamManager.addConnection("stream-1", mockResponse);
      expect(mockResponse.flushHeaders).toHaveBeenCalled();
    });

    it("should send initial connection message", () => {
      streamManager.addConnection("stream-1", mockResponse);

      expect(mockResponse.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ type: "connected", streamId: "stream-1" })}\n\n`
      );
    });

    it("should register close event handler", () => {
      streamManager.addConnection("stream-1", mockResponse);
      expect(mockResponse.on).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("should add multiple connections to same stream", () => {
      const mockResponse2 = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        on: vi.fn(),
      } as unknown as Response;

      streamManager.addConnection("stream-1", mockResponse);
      streamManager.addConnection("stream-1", mockResponse2);

      // Broadcast to verify both connections exist
      streamManager.broadcast("stream-1", { type: "test" });

      expect(mockResponse.write).toHaveBeenCalledTimes(2); // Initial + broadcast
      expect(mockResponse2.write).toHaveBeenCalledTimes(2); // Initial + broadcast
    });

    it("should handle connections to different streams", () => {
      const mockResponse2 = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        on: vi.fn(),
      } as unknown as Response;

      streamManager.addConnection("stream-1", mockResponse);
      streamManager.addConnection("stream-2", mockResponse2);

      // Broadcast to stream-1 only
      streamManager.broadcast("stream-1", { type: "test" });

      expect(mockResponse.write).toHaveBeenCalledTimes(2); // Initial + broadcast
      expect(mockResponse2.write).toHaveBeenCalledTimes(1); // Initial only
    });
  });

  describe("removeConnection", () => {
    it("should remove connection from stream", () => {
      streamManager.addConnection("stream-1", mockResponse);

      // Simulate close event
      if (closeHandler) {
        closeHandler();
      }

      // Broadcast should not reach removed connection
      vi.clearAllMocks();
      streamManager.broadcast("stream-1", { type: "test" });

      expect(mockResponse.write).not.toHaveBeenCalled();
    });

    it("should handle removing connection from non-existent stream", () => {
      // Should not throw
      expect(() => {
        streamManager.removeConnection("non-existent", mockResponse);
      }).not.toThrow();
    });

    it("should keep other connections when one is removed", () => {
      const mockResponse2 = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        on: vi.fn(),
      } as unknown as Response;

      streamManager.addConnection("stream-1", mockResponse);
      streamManager.addConnection("stream-1", mockResponse2);

      // Remove first connection
      streamManager.removeConnection("stream-1", mockResponse);

      // Clear mocks and broadcast
      vi.clearAllMocks();
      streamManager.broadcast("stream-1", { type: "test" });

      expect(mockResponse.write).not.toHaveBeenCalled();
      expect(mockResponse2.write).toHaveBeenCalledTimes(1);
    });
  });

  describe("broadcast", () => {
    it("should broadcast data to all connections on stream", () => {
      const mockResponse2 = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        on: vi.fn(),
      } as unknown as Response;

      streamManager.addConnection("stream-1", mockResponse);
      streamManager.addConnection("stream-1", mockResponse2);

      vi.clearAllMocks();
      streamManager.broadcast("stream-1", { type: "token", content: "Hello" });

      const expectedPayload = `data: ${JSON.stringify({ type: "token", content: "Hello" })}\n\n`;
      expect(mockResponse.write).toHaveBeenCalledWith(expectedPayload);
      expect(mockResponse2.write).toHaveBeenCalledWith(expectedPayload);
    });

    it("should handle broadcast with metadata", () => {
      streamManager.addConnection("stream-1", mockResponse);

      vi.clearAllMocks();
      streamManager.broadcast("stream-1", {
        type: "progress",
        metadata: { percentage: 50, step: "analyzing" },
      });

      const expectedPayload = `data: ${JSON.stringify({
        type: "progress",
        metadata: { percentage: 50, step: "analyzing" },
      })}\n\n`;
      expect(mockResponse.write).toHaveBeenCalledWith(expectedPayload);
    });

    it("should not throw when broadcasting to non-existent stream", () => {
      expect(() => {
        streamManager.broadcast("non-existent", { type: "test" });
      }).not.toThrow();
    });

    it("should not broadcast to empty stream", () => {
      streamManager.addConnection("stream-1", mockResponse);
      streamManager.removeConnection("stream-1", mockResponse);

      vi.clearAllMocks();
      streamManager.broadcast("stream-1", { type: "test" });

      expect(mockResponse.write).not.toHaveBeenCalled();
    });

    it("should broadcast different event types", () => {
      streamManager.addConnection("stream-1", mockResponse);

      vi.clearAllMocks();

      // Test various event types
      streamManager.broadcast("stream-1", { type: "start" });
      streamManager.broadcast("stream-1", { type: "token", content: "word" });
      streamManager.broadcast("stream-1", { type: "complete" });

      expect(mockResponse.write).toHaveBeenCalledTimes(3);
    });
  });

  describe("Connection lifecycle", () => {
    it("should handle full connection lifecycle", () => {
      // Connect
      streamManager.addConnection("stream-1", mockResponse);
      expect(mockResponse.write).toHaveBeenCalledTimes(1);

      // Broadcast
      streamManager.broadcast("stream-1", { type: "data", content: "test" });
      expect(mockResponse.write).toHaveBeenCalledTimes(2);

      // Disconnect via close event
      if (closeHandler) {
        closeHandler();
      }

      // Broadcast after disconnect should not reach client
      vi.clearAllMocks();
      streamManager.broadcast("stream-1", { type: "data", content: "after close" });
      expect(mockResponse.write).not.toHaveBeenCalled();
    });

    it("should handle multiple streams independently", () => {
      const mockResponse2 = {
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        on: vi.fn(),
      } as unknown as Response;

      streamManager.addConnection("stream-1", mockResponse);
      streamManager.addConnection("stream-2", mockResponse2);

      vi.clearAllMocks();

      streamManager.broadcast("stream-1", { type: "event1" });
      streamManager.broadcast("stream-2", { type: "event2" });

      expect(mockResponse.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ type: "event1" })}\n\n`
      );
      expect(mockResponse2.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify({ type: "event2" })}\n\n`
      );
    });
  });
});
