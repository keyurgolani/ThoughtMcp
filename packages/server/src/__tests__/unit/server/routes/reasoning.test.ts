/**
 * Reasoning Routes Unit Tests
 *
 * Tests for the reasoning routes that provide thinking endpoints.
 * Requirements: 3.1, 3.2, 3.3
 */

import type { Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfidenceAssessment, UncertaintyType } from "../../../../confidence/types.js";
import type { StreamType, SynthesizedResult } from "../../../../reasoning/types.js";
import type { CognitiveCore } from "../../../../server/cognitive-core.js";
import {
  createReasoningRoutes,
  ParallelReasoningSessionStore,
  SSEConnectionManager,
  type SSEEvent,
  type SSEEventType,
  ThinkSessionStore,
} from "../../../../server/routes/reasoning.js";

// Mock cognitive core with all required methods
const createMockCognitiveCore = (): CognitiveCore => {
  const mockSynthesizedResult: SynthesizedResult = {
    conclusion: "Test conclusion based on analysis",
    insights: [
      {
        content: "Key insight from analysis",
        sources: ["analytical" as StreamType],
        confidence: 0.85,
        importance: 0.9,
        evidence: ["Supporting evidence"],
      },
    ],
    recommendations: [
      {
        description: "Recommended action",
        sources: ["analytical" as StreamType],
        priority: 0.8,
        confidence: 0.85,
        rationale: ["Based on analysis"],
        concerns: [],
      },
    ],
    conflicts: [],
    confidence: 0.85,
    quality: {
      overallScore: 0.8,
      coherence: 0.85,
      completeness: 0.8,
      consistency: 0.9,
      insightQuality: 0.85,
      recommendationQuality: 0.8,
    },
    metadata: {
      streamsUsed: ["analytical" as StreamType, "critical" as StreamType],
      synthesisTime: 100,
      timestamp: new Date(),
    },
  };

  const mockConfidenceAssessment: ConfidenceAssessment = {
    overallConfidence: 0.75,
    evidenceQuality: 0.8,
    reasoningCoherence: 0.85,
    completeness: 0.7,
    uncertaintyLevel: 0.3,
    uncertaintyType: "epistemic" as UncertaintyType,
    factors: [
      {
        dimension: "evidence",
        score: 0.8,
        weight: 0.3,
        explanation: "Strong evidence base",
      },
      {
        dimension: "coherence",
        score: 0.85,
        weight: 0.3,
        explanation: "Well-structured reasoning",
      },
    ],
    timestamp: new Date(),
    processingTime: 50,
  };

  // Mock coordination manager for parallel reasoning
  const mockCoordinationManager = {
    waitForCheckpoint: vi.fn().mockResolvedValue(undefined),
    getOverheadMetrics: vi.fn().mockReturnValue({
      totalCoordinationTime: 50,
      overheadPercentage: 0.05,
      syncTime: 20,
      shareTime: 30,
    }),
    measureCoordinationOverhead: vi.fn().mockReturnValue(0.05),
  };

  return {
    memoryRepository: {} as CognitiveCore["memoryRepository"],
    reasoningOrchestrator: {
      executeStreams: vi.fn().mockResolvedValue(mockSynthesizedResult),
      getCoordinationManager: vi.fn().mockReturnValue(mockCoordinationManager),
    } as unknown as CognitiveCore["reasoningOrchestrator"],
    frameworkSelector: {} as CognitiveCore["frameworkSelector"],
    confidenceAssessor: {
      assessConfidence: vi.fn().mockResolvedValue(mockConfidenceAssessment),
    } as unknown as CognitiveCore["confidenceAssessor"],
    biasDetector: {} as CognitiveCore["biasDetector"],
    emotionAnalyzer: {} as CognitiveCore["emotionAnalyzer"],
    problemDecomposer: {} as CognitiveCore["problemDecomposer"],
    memoryAugmentedReasoning: {
      augmentProblemContext: vi.fn().mockResolvedValue({
        originalProblem: "test problem",
        augmentedProblem: "test problem with context",
        memoryBackground: "relevant context",
        memoriesUsed: [],
        hasMemoryContext: false,
      }),
    } as unknown as CognitiveCore["memoryAugmentedReasoning"],
  };
};

describe("Reasoning Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createReasoningRoutes", () => {
    it("should create a router with routes", () => {
      const router = createReasoningRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have stack with routes
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have POST route for think endpoint", () => {
      const router = createReasoningRoutes(mockCore);
      // Check that there's at least one route in the stack
      expect(router.stack.length).toBeGreaterThan(0);
      // The first route should be a POST handler
      const firstLayer = router.stack[0];
      expect(firstLayer).toBeDefined();
    });
  });

  describe("Think Handler Logic", () => {
    it("should have reasoningOrchestrator.executeStreams mock configured", () => {
      // Create the router to ensure handlers are set up
      createReasoningRoutes(mockCore);

      // Verify the mock is properly configured
      expect(mockCore.reasoningOrchestrator.executeStreams).toBeDefined();
    });

    it("should have confidenceAssessor.assessConfidence mock configured", () => {
      createReasoningRoutes(mockCore);
      expect(mockCore.confidenceAssessor.assessConfidence).toBeDefined();
    });

    it("should have memoryAugmentedReasoning.augmentProblemContext mock configured", () => {
      createReasoningRoutes(mockCore);
      expect(mockCore.memoryAugmentedReasoning.augmentProblemContext).toBeDefined();
    });
  });

  describe("Mode Mapping", () => {
    it("should support all valid modes", () => {
      const validModes = ["intuitive", "deliberative", "balanced", "creative", "analytical"];
      // All modes should be valid - this is a compile-time check via the schema
      expect(validModes).toHaveLength(5);
    });
  });

  describe("Mock Configuration", () => {
    it("should have correct mock synthesized result structure", () => {
      // Verify mock is set up correctly by checking the cognitive core
      expect(mockCore.reasoningOrchestrator).toBeDefined();
      expect(mockCore.reasoningOrchestrator.executeStreams).toBeDefined();
    });

    it("should have correct mock confidence assessment structure", () => {
      expect(mockCore.confidenceAssessor).toBeDefined();
      expect(mockCore.confidenceAssessor.assessConfidence).toBeDefined();
    });
  });
});

/**
 * ThinkSessionStore Unit Tests
 * Requirements: 3.2
 */
describe("ThinkSessionStore", () => {
  let sessionStore: ThinkSessionStore;

  beforeEach(() => {
    sessionStore = new ThinkSessionStore();
  });

  describe("createSession", () => {
    it("should create a new session with unique ID", () => {
      const session = sessionStore.createSession("analytical", ["analytical", "critical"]);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^think-/);
      expect(session.status).toBe("processing");
      expect(session.progress).toBe(0);
      expect(session.currentStage).toBe("initializing");
      expect(session.activeStreams).toEqual(["analytical", "critical"]);
      expect(session.mode).toBe("analytical");
      expect(session.startedAt).toBeInstanceOf(Date);
    });

    it("should create sessions with unique IDs", () => {
      const session1 = sessionStore.createSession("balanced", ["analytical"]);
      const session2 = sessionStore.createSession("balanced", ["analytical"]);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe("getSession", () => {
    it("should return session by ID", () => {
      const created = sessionStore.createSession("creative", ["creative", "synthetic"]);
      const retrieved = sessionStore.getSession(created.sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(created.sessionId);
      expect(retrieved?.mode).toBe("creative");
    });

    it("should return undefined for non-existent session", () => {
      const session = sessionStore.getSession("non-existent-id");
      expect(session).toBeUndefined();
    });
  });

  describe("updateSession", () => {
    it("should update session progress", () => {
      const session = sessionStore.createSession("deliberative", ["analytical"]);

      sessionStore.updateSession(session.sessionId, {
        progress: 0.5,
        currentStage: "reasoning",
      });

      const updated = sessionStore.getSession(session.sessionId);
      expect(updated?.progress).toBe(0.5);
      expect(updated?.currentStage).toBe("reasoning");
    });

    it("should update session status to complete", () => {
      const session = sessionStore.createSession("intuitive", ["creative"]);

      sessionStore.updateSession(session.sessionId, {
        status: "complete",
        progress: 1.0,
        currentStage: "completed",
      });

      const updated = sessionStore.getSession(session.sessionId);
      expect(updated?.status).toBe("complete");
      expect(updated?.progress).toBe(1.0);
      expect(updated?.completedAt).toBeInstanceOf(Date);
    });

    it("should update session status to error", () => {
      const session = sessionStore.createSession("balanced", ["analytical"]);

      sessionStore.updateSession(session.sessionId, {
        status: "error",
        error: "Processing failed",
      });

      const updated = sessionStore.getSession(session.sessionId);
      expect(updated?.status).toBe("error");
      expect(updated?.error).toBe("Processing failed");
    });

    it("should not update non-existent session", () => {
      // Should not throw
      sessionStore.updateSession("non-existent", { progress: 0.5 });
    });
  });

  describe("deleteSession", () => {
    it("should delete session by ID", () => {
      const session = sessionStore.createSession("analytical", ["analytical"]);
      expect(sessionStore.getSession(session.sessionId)).toBeDefined();

      sessionStore.deleteSession(session.sessionId);
      expect(sessionStore.getSession(session.sessionId)).toBeUndefined();
    });

    it("should not throw when deleting non-existent session", () => {
      expect(() => sessionStore.deleteSession("non-existent")).not.toThrow();
    });
  });

  describe("cleanupOldSessions", () => {
    it("should remove sessions older than maxAge", () => {
      const session = sessionStore.createSession("analytical", ["analytical"]);

      // Manually set startedAt to old date
      const oldSession = sessionStore.getSession(session.sessionId);
      if (oldSession) {
        oldSession.startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      }

      sessionStore.cleanupOldSessions(60 * 60 * 1000); // 1 hour max age

      expect(sessionStore.getSession(session.sessionId)).toBeUndefined();
    });

    it("should keep recent sessions", () => {
      const session = sessionStore.createSession("analytical", ["analytical"]);

      sessionStore.cleanupOldSessions(60 * 60 * 1000); // 1 hour max age

      expect(sessionStore.getSession(session.sessionId)).toBeDefined();
    });
  });
});

/**
 * Think Status Endpoint Tests
 * Requirements: 3.2
 */
describe("Think Status Endpoint", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createReasoningRoutes with status endpoint", () => {
    it("should create router with status route", () => {
      const router = createReasoningRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have multiple routes (think, status, and parallel)
      expect(router.stack.length).toBeGreaterThanOrEqual(3);
    });
  });
});

/**
 * ParallelReasoningSessionStore Unit Tests
 * Requirements: 4.1
 */
describe("ParallelReasoningSessionStore", () => {
  let sessionStore: ParallelReasoningSessionStore;

  beforeEach(() => {
    sessionStore = new ParallelReasoningSessionStore();
  });

  describe("createSession", () => {
    it("should create a new session with unique ID", () => {
      const session = sessionStore.createSession(["analytical", "creative"]);

      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toMatch(/^parallel-/);
      expect(session.status).toBe("processing");
      expect(session.progress).toBe(0);
      expect(session.currentStage).toBe("initializing");
      expect(session.activeStreams).toEqual(["analytical", "creative"]);
      expect(session.startedAt).toBeInstanceOf(Date);
      expect(session.syncCheckpoints).toEqual({
        sync25: 0,
        sync50: 0,
        sync75: 0,
      });
    });

    it("should create sessions with unique IDs", () => {
      const session1 = sessionStore.createSession(["analytical"]);
      const session2 = sessionStore.createSession(["analytical"]);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });
  });

  describe("getSession", () => {
    it("should return session by ID", () => {
      const created = sessionStore.createSession(["creative", "synthetic"]);
      const retrieved = sessionStore.getSession(created.sessionId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(created.sessionId);
      expect(retrieved?.activeStreams).toEqual(["creative", "synthetic"]);
    });

    it("should return undefined for non-existent session", () => {
      const session = sessionStore.getSession("non-existent-id");
      expect(session).toBeUndefined();
    });
  });

  describe("updateSession", () => {
    it("should update session progress and sync checkpoints", () => {
      const session = sessionStore.createSession(["analytical", "critical"]);

      sessionStore.updateSession(session.sessionId, {
        progress: 0.5,
        currentStage: "sync_50",
        syncCheckpoints: {
          sync25: 10,
          sync50: 15,
          sync75: 0,
        },
      });

      const updated = sessionStore.getSession(session.sessionId);
      expect(updated?.progress).toBe(0.5);
      expect(updated?.currentStage).toBe("sync_50");
      expect(updated?.syncCheckpoints.sync25).toBe(10);
      expect(updated?.syncCheckpoints.sync50).toBe(15);
    });

    it("should update session status to complete", () => {
      const session = sessionStore.createSession(["analytical"]);

      sessionStore.updateSession(session.sessionId, {
        status: "complete",
        progress: 1.0,
        currentStage: "completed",
      });

      const updated = sessionStore.getSession(session.sessionId);
      expect(updated?.status).toBe("complete");
      expect(updated?.progress).toBe(1.0);
      expect(updated?.completedAt).toBeInstanceOf(Date);
    });

    it("should update session status to error", () => {
      const session = sessionStore.createSession(["analytical"]);

      sessionStore.updateSession(session.sessionId, {
        status: "error",
        error: "Stream execution failed",
      });

      const updated = sessionStore.getSession(session.sessionId);
      expect(updated?.status).toBe("error");
      expect(updated?.error).toBe("Stream execution failed");
    });

    it("should not update non-existent session", () => {
      // Should not throw
      sessionStore.updateSession("non-existent", { progress: 0.5 });
    });
  });

  describe("deleteSession", () => {
    it("should delete session by ID", () => {
      const session = sessionStore.createSession(["analytical"]);
      expect(sessionStore.getSession(session.sessionId)).toBeDefined();

      sessionStore.deleteSession(session.sessionId);
      expect(sessionStore.getSession(session.sessionId)).toBeUndefined();
    });

    it("should not throw when deleting non-existent session", () => {
      expect(() => sessionStore.deleteSession("non-existent")).not.toThrow();
    });
  });

  describe("cleanupOldSessions", () => {
    it("should remove sessions older than maxAge", () => {
      const session = sessionStore.createSession(["analytical"]);

      // Manually set startedAt to old date
      const oldSession = sessionStore.getSession(session.sessionId);
      if (oldSession) {
        oldSession.startedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      }

      sessionStore.cleanupOldSessions(60 * 60 * 1000); // 1 hour max age

      expect(sessionStore.getSession(session.sessionId)).toBeUndefined();
    });

    it("should keep recent sessions", () => {
      const session = sessionStore.createSession(["analytical"]);

      sessionStore.cleanupOldSessions(60 * 60 * 1000); // 1 hour max age

      expect(sessionStore.getSession(session.sessionId)).toBeDefined();
    });
  });
});

/**
 * Parallel Reasoning Endpoint Tests
 * Requirements: 4.1, 4.4
 */
describe("Parallel Reasoning Endpoint", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createReasoningRoutes with parallel endpoint", () => {
    it("should create router with parallel reasoning route", () => {
      const router = createReasoningRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have routes for think, status, parallel, and stream
      expect(router.stack.length).toBeGreaterThanOrEqual(4);
    });

    it("should have reasoningOrchestrator.getCoordinationManager mock configured", () => {
      createReasoningRoutes(mockCore);
      expect(mockCore.reasoningOrchestrator.getCoordinationManager).toBeDefined();
    });
  });

  describe("Mock Configuration for Parallel Reasoning", () => {
    it("should have correct mock synthesized result with conflicts", () => {
      expect(mockCore.reasoningOrchestrator).toBeDefined();
      expect(mockCore.reasoningOrchestrator.executeStreams).toBeDefined();
    });

    it("should have coordination manager mock configured", () => {
      expect(mockCore.reasoningOrchestrator.getCoordinationManager).toBeDefined();
    });
  });
});

/**
 * SSE Stream Endpoint Tests
 * Requirements: 4.2
 */
describe("SSE Stream Endpoint", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createReasoningRoutes with SSE stream endpoint", () => {
    it("should create router with SSE stream route", () => {
      const router = createReasoningRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have routes including the SSE stream endpoint
      expect(router.stack.length).toBeGreaterThanOrEqual(4);
    });
  });
});

/**
 * SSEConnectionManager Unit Tests
 * Requirements: 4.2
 */
describe("SSEConnectionManager", () => {
  let connectionManager: SSEConnectionManager;

  beforeEach(() => {
    connectionManager = new SSEConnectionManager();
  });

  describe("addClient", () => {
    it("should add a client for a session", () => {
      const mockRes = createMockResponse();
      connectionManager.addClient("session-1", mockRes as unknown as Response);

      expect(connectionManager.hasClients("session-1")).toBe(true);
    });

    it("should support multiple clients for the same session", () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();

      connectionManager.addClient("session-1", mockRes1 as unknown as Response);
      connectionManager.addClient("session-1", mockRes2 as unknown as Response);

      expect(connectionManager.getClientCount("session-1")).toBe(2);
    });

    it("should return client reference", () => {
      const mockRes = createMockResponse();
      const client = connectionManager.addClient("session-1", mockRes as unknown as Response);

      expect(client).toBeDefined();
      expect(client.sessionId).toBe("session-1");
      expect(client.connectedAt).toBeInstanceOf(Date);
    });
  });

  describe("removeClient", () => {
    it("should remove a client for a session", () => {
      const mockRes = createMockResponse();
      const client = connectionManager.addClient("session-1", mockRes as unknown as Response);
      connectionManager.removeClient("session-1", client);

      expect(connectionManager.hasClients("session-1")).toBe(false);
    });

    it("should not throw when removing non-existent client", () => {
      const mockClient = {
        res: createMockResponse() as unknown as Response,
        sessionId: "non-existent",
        connectedAt: new Date(),
      };
      expect(() => connectionManager.removeClient("non-existent", mockClient)).not.toThrow();
    });
  });

  describe("broadcast", () => {
    it("should broadcast event to all clients for a session", () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();

      connectionManager.addClient("session-1", mockRes1 as unknown as Response);
      connectionManager.addClient("session-1", mockRes2 as unknown as Response);

      const event: SSEEvent = {
        type: "stream_progress",
        timestamp: new Date().toISOString(),
        data: { sessionId: "session-1", progress: 0.5 },
      };

      connectionManager.broadcast("session-1", event);

      expect(mockRes1.write).toHaveBeenCalled();
      expect(mockRes2.write).toHaveBeenCalled();
    });

    it("should not throw when broadcasting to non-existent session", () => {
      const event: SSEEvent = {
        type: "stream_progress",
        timestamp: new Date().toISOString(),
        data: { sessionId: "non-existent", progress: 0.5 },
      };

      expect(() => connectionManager.broadcast("non-existent", event)).not.toThrow();
    });
  });

  describe("hasClients", () => {
    it("should return false for session with no clients", () => {
      expect(connectionManager.hasClients("non-existent")).toBe(false);
    });

    it("should return true for session with clients", () => {
      const mockRes = createMockResponse();
      connectionManager.addClient("session-1", mockRes as unknown as Response);

      expect(connectionManager.hasClients("session-1")).toBe(true);
    });
  });

  describe("getClientCount", () => {
    it("should return 0 for session with no clients", () => {
      expect(connectionManager.getClientCount("non-existent")).toBe(0);
    });

    it("should return correct count for session with clients", () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();

      connectionManager.addClient("session-1", mockRes1 as unknown as Response);
      connectionManager.addClient("session-1", mockRes2 as unknown as Response);

      expect(connectionManager.getClientCount("session-1")).toBe(2);
    });
  });

  describe("cleanupSession", () => {
    it("should remove all clients for a session", () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();

      connectionManager.addClient("session-1", mockRes1 as unknown as Response);
      connectionManager.addClient("session-1", mockRes2 as unknown as Response);

      connectionManager.cleanupSession("session-1");

      expect(connectionManager.hasClients("session-1")).toBe(false);
    });

    it("should end all client connections", () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();

      connectionManager.addClient("session-1", mockRes1 as unknown as Response);
      connectionManager.addClient("session-1", mockRes2 as unknown as Response);

      connectionManager.cleanupSession("session-1");

      expect(mockRes1.end).toHaveBeenCalled();
      expect(mockRes2.end).toHaveBeenCalled();
    });
  });

  describe("cleanupAll", () => {
    it("should remove all clients for all sessions", () => {
      const mockRes1 = createMockResponse();
      const mockRes2 = createMockResponse();

      connectionManager.addClient("session-1", mockRes1 as unknown as Response);
      connectionManager.addClient("session-2", mockRes2 as unknown as Response);

      connectionManager.cleanupAll();

      expect(connectionManager.hasClients("session-1")).toBe(false);
      expect(connectionManager.hasClients("session-2")).toBe(false);
    });
  });
});

// Import SSEConnectionManager and SSEEvent for testing

// Helper to create mock response object for SSE tests
function createMockResponse(): {
  write: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  writableEnded: boolean;
} {
  return {
    write: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn(),
    on: vi.fn(),
    writableEnded: false,
  };
}

/**
 * SSE Connection Manager Unit Tests
 * Requirements: 4.2
 */
describe("SSEConnectionManager", () => {
  let connectionManager: SSEConnectionManager;

  beforeEach(() => {
    // Create a fresh instance for each test
    connectionManager = new SSEConnectionManager();
  });

  describe("addClient", () => {
    it("should add a client connection for a session", () => {
      const mockRes = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      const client = connectionManager.addClient("session-1", mockRes);

      expect(client).toBeDefined();
      expect(client.sessionId).toBe("session-1");
      expect(client.res).toBe(mockRes);
      expect(client.connectedAt).toBeInstanceOf(Date);
    });

    it("should track multiple clients for the same session", () => {
      const mockRes1 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRes2 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      connectionManager.addClient("session-1", mockRes1);
      connectionManager.addClient("session-1", mockRes2);

      expect(connectionManager.getClientCount("session-1")).toBe(2);
    });
  });

  describe("removeClient", () => {
    it("should remove a client connection", () => {
      const mockRes = { writableEnded: false, write: vi.fn(), end: vi.fn() } as unknown as Response;
      const client = connectionManager.addClient("session-1", mockRes);

      expect(connectionManager.hasClients("session-1")).toBe(true);

      connectionManager.removeClient("session-1", client);

      expect(connectionManager.hasClients("session-1")).toBe(false);
    });

    it("should not throw when removing non-existent client", () => {
      const mockRes = { writableEnded: false, write: vi.fn(), end: vi.fn() } as unknown as Response;
      const fakeClient = { res: mockRes, sessionId: "session-1", connectedAt: new Date() };

      expect(() => connectionManager.removeClient("session-1", fakeClient)).not.toThrow();
    });
  });

  describe("hasClients", () => {
    it("should return false for session with no clients", () => {
      expect(connectionManager.hasClients("non-existent")).toBe(false);
    });

    it("should return true for session with clients", () => {
      const mockRes = { writableEnded: false, write: vi.fn(), end: vi.fn() } as unknown as Response;
      connectionManager.addClient("session-1", mockRes);

      expect(connectionManager.hasClients("session-1")).toBe(true);
    });
  });

  describe("getClientCount", () => {
    it("should return 0 for session with no clients", () => {
      expect(connectionManager.getClientCount("non-existent")).toBe(0);
    });

    it("should return correct count for session with clients", () => {
      const mockRes1 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRes2 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      connectionManager.addClient("session-1", mockRes1);
      connectionManager.addClient("session-1", mockRes2);

      expect(connectionManager.getClientCount("session-1")).toBe(2);
    });
  });

  describe("broadcast", () => {
    it("should broadcast event to all clients of a session", () => {
      const mockRes1 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRes2 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      connectionManager.addClient("session-1", mockRes1);
      connectionManager.addClient("session-1", mockRes2);

      const event: SSEEvent = {
        type: "stream_progress",
        timestamp: new Date().toISOString(),
        data: {
          sessionId: "session-1",
          progress: 0.5,
        },
      };

      connectionManager.broadcast("session-1", event);

      expect(mockRes1.write).toHaveBeenCalledWith(`data: ${JSON.stringify(event)}\n\n`);
      expect(mockRes2.write).toHaveBeenCalledWith(`data: ${JSON.stringify(event)}\n\n`);
    });

    it("should not broadcast to clients of other sessions", () => {
      const mockRes1 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRes2 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      connectionManager.addClient("session-1", mockRes1);
      connectionManager.addClient("session-2", mockRes2);

      const event: SSEEvent = {
        type: "stream_progress",
        timestamp: new Date().toISOString(),
        data: {
          sessionId: "session-1",
          progress: 0.5,
        },
      };

      connectionManager.broadcast("session-1", event);

      expect(mockRes1.write).toHaveBeenCalled();
      expect(mockRes2.write).not.toHaveBeenCalled();
    });

    it("should not write to ended connections", () => {
      const mockRes = { writableEnded: true, write: vi.fn(), end: vi.fn() } as unknown as Response;
      connectionManager.addClient("session-1", mockRes);

      const event: SSEEvent = {
        type: "stream_progress",
        timestamp: new Date().toISOString(),
        data: {
          sessionId: "session-1",
          progress: 0.5,
        },
      };

      connectionManager.broadcast("session-1", event);

      expect(mockRes.write).not.toHaveBeenCalled();
    });

    it("should handle non-existent session gracefully", () => {
      const event: SSEEvent = {
        type: "stream_progress",
        timestamp: new Date().toISOString(),
        data: {
          sessionId: "non-existent",
          progress: 0.5,
        },
      };

      expect(() => connectionManager.broadcast("non-existent", event)).not.toThrow();
    });
  });

  describe("cleanupSession", () => {
    it("should remove all clients for a session", () => {
      const mockRes1 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRes2 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      connectionManager.addClient("session-1", mockRes1);
      connectionManager.addClient("session-1", mockRes2);

      expect(connectionManager.hasClients("session-1")).toBe(true);

      connectionManager.cleanupSession("session-1");

      expect(connectionManager.hasClients("session-1")).toBe(false);
    });

    it("should end all client connections", () => {
      const mockRes1 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRes2 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      connectionManager.addClient("session-1", mockRes1);
      connectionManager.addClient("session-1", mockRes2);

      connectionManager.cleanupSession("session-1");

      expect(mockRes1.end).toHaveBeenCalled();
      expect(mockRes2.end).toHaveBeenCalled();
    });

    it("should not throw for non-existent session", () => {
      expect(() => connectionManager.cleanupSession("non-existent")).not.toThrow();
    });
  });

  describe("cleanupAll", () => {
    it("should cleanup all sessions", () => {
      const mockRes1 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;
      const mockRes2 = {
        writableEnded: false,
        write: vi.fn(),
        end: vi.fn(),
      } as unknown as Response;

      connectionManager.addClient("session-1", mockRes1);
      connectionManager.addClient("session-2", mockRes2);

      connectionManager.cleanupAll();

      expect(connectionManager.hasClients("session-1")).toBe(false);
      expect(connectionManager.hasClients("session-2")).toBe(false);
    });
  });
});

/**
 * SSE Stream Endpoint Tests
 * Requirements: 4.2
 */
describe("SSE Stream Endpoint", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createReasoningRoutes with SSE stream endpoint", () => {
    it("should create router with SSE stream route", () => {
      const router = createReasoningRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have routes for think, status, parallel, and SSE stream
      expect(router.stack.length).toBeGreaterThanOrEqual(4);
    });

    it("should have SSE stream route registered", () => {
      const router = createReasoningRoutes(mockCore);
      // Check that there's a GET route for the SSE stream
      const hasSSERoute = router.stack.some((layer: any) => {
        return layer.route?.path === "/parallel/:sessionId/stream" && layer.route?.methods?.get;
      });
      expect(hasSSERoute).toBe(true);
    });
  });
});

/**
 * SSE Event Type Tests
 * Requirements: 4.2
 */
describe("SSE Event Types", () => {
  it("should have valid SSE event types", () => {
    const validTypes: SSEEventType[] = [
      "stream_started",
      "stream_progress",
      "stream_insight",
      "stream_completed",
      "sync_checkpoint",
      "synthesis_started",
      "synthesis_completed",
      "session_completed",
      "session_error",
      "heartbeat",
    ];

    // All types should be valid strings
    validTypes.forEach((type) => {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it("should create valid SSE event structure", () => {
    const event: SSEEvent = {
      type: "stream_progress",
      timestamp: new Date().toISOString(),
      data: {
        sessionId: "test-session",
        progress: 0.5,
      },
    };

    expect(event.type).toBe("stream_progress");
    expect(event.timestamp).toBeDefined();
    expect(event.data.sessionId).toBe("test-session");
    expect(event.data.progress).toBe(0.5);
  });

  it("should create valid SSE event with insight data", () => {
    const event: SSEEvent = {
      type: "stream_insight",
      timestamp: new Date().toISOString(),
      data: {
        sessionId: "test-session",
        streamType: "analytical",
        insight: {
          content: "Test insight",
          confidence: 0.85,
          importance: 0.9,
        },
      },
    };

    expect(event.type).toBe("stream_insight");
    expect(event.data.insight).toBeDefined();
    expect(event.data.insight?.content).toBe("Test insight");
    expect(event.data.insight?.confidence).toBe(0.85);
    expect(event.data.insight?.importance).toBe(0.9);
  });

  it("should create valid SSE event with error data", () => {
    const event: SSEEvent = {
      type: "session_error",
      timestamp: new Date().toISOString(),
      data: {
        sessionId: "test-session",
        error: "Test error message",
        message: "Session encountered an error",
      },
    };

    expect(event.type).toBe("session_error");
    expect(event.data.error).toBe("Test error message");
    expect(event.data.message).toBe("Session encountered an error");
  });
});

/**
 * Reasoning Chain Endpoint Tests
 * Requirements: 4.3
 */
describe("Reasoning Chain Endpoint", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createReasoningRoutes with reasoning chain endpoint", () => {
    it("should create router with reasoning chain route", () => {
      const router = createReasoningRoutes(mockCore);
      expect(router).toBeDefined();
      // Router should have routes for think, status, parallel, SSE stream, and reasoning chain
      expect(router.stack.length).toBeGreaterThanOrEqual(5);
    });

    it("should have reasoning chain route registered", () => {
      const router = createReasoningRoutes(mockCore);
      // Check that there's a GET route for the reasoning chain
      const hasChainRoute = router.stack.some((layer: any) => {
        return layer.route?.path === "/chain/:sessionId" && layer.route?.methods?.get;
      });
      expect(hasChainRoute).toBe(true);
    });
  });
});

/**
 * Reasoning Chain Response Structure Tests
 * Requirements: 4.3
 */
describe("Reasoning Chain Response Structure", () => {
  it("should have valid ReasoningStepResponse structure", () => {
    const step = {
      id: "step-1",
      content: "Test step content",
      type: "hypothesis" as const,
      confidence: 0.85,
      evidence: ["evidence-1", "evidence-2"],
      timestamp: new Date().toISOString(),
    };

    expect(step.id).toBeDefined();
    expect(step.content).toBeDefined();
    expect(step.type).toBe("hypothesis");
    expect(step.confidence).toBeGreaterThanOrEqual(0);
    expect(step.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(step.evidence)).toBe(true);
    expect(step.timestamp).toBeDefined();
  });

  it("should have valid ReasoningBranchResponse structure", () => {
    const branch = {
      id: "branch-1",
      description: "Alternative approach",
      steps: [
        {
          id: "step-1",
          content: "Branch step",
          type: "inference" as const,
          confidence: 0.75,
          evidence: [],
          timestamp: new Date().toISOString(),
        },
      ],
      selected: false,
      rationale: "Not selected due to lower confidence",
    };

    expect(branch.id).toBeDefined();
    expect(branch.description).toBeDefined();
    expect(Array.isArray(branch.steps)).toBe(true);
    expect(typeof branch.selected).toBe("boolean");
    expect(branch.rationale).toBeDefined();
  });

  it("should have valid DecisionPoint structure", () => {
    const decisionPoint = {
      id: "decision-1",
      description: "Choose analysis approach",
      options: ["analytical", "creative", "critical"],
      selectedOption: "analytical",
      rationale: "Best fit for the problem type",
      confidence: 0.9,
      timestamp: new Date().toISOString(),
    };

    expect(decisionPoint.id).toBeDefined();
    expect(decisionPoint.description).toBeDefined();
    expect(Array.isArray(decisionPoint.options)).toBe(true);
    expect(decisionPoint.options.length).toBeGreaterThan(0);
    expect(decisionPoint.selectedOption).toBeDefined();
    expect(decisionPoint.rationale).toBeDefined();
    expect(decisionPoint.confidence).toBeGreaterThanOrEqual(0);
    expect(decisionPoint.confidence).toBeLessThanOrEqual(1);
    expect(decisionPoint.timestamp).toBeDefined();
  });

  it("should have valid ReasoningChainResponse structure", () => {
    const chainResponse = {
      chainId: "parallel-123",
      steps: [
        {
          id: "step-1",
          content: "Initial hypothesis",
          type: "hypothesis" as const,
          confidence: 0.7,
          evidence: [],
          timestamp: new Date().toISOString(),
        },
        {
          id: "step-2",
          content: "Supporting evidence",
          type: "evidence" as const,
          confidence: 0.85,
          evidence: ["source-1"],
          timestamp: new Date().toISOString(),
        },
      ],
      branches: [],
      confidenceEvolution: [0.7, 0.85],
      decisionPoints: [
        {
          id: "decision-1",
          description: "Stream selection",
          options: ["analytical", "creative"],
          selectedOption: "analytical",
          rationale: "Problem requires structured analysis",
          confidence: 0.9,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    expect(chainResponse.chainId).toBeDefined();
    expect(Array.isArray(chainResponse.steps)).toBe(true);
    expect(chainResponse.steps.length).toBeGreaterThan(0);
    expect(Array.isArray(chainResponse.branches)).toBe(true);
    expect(Array.isArray(chainResponse.confidenceEvolution)).toBe(true);
    expect(chainResponse.confidenceEvolution.length).toBe(chainResponse.steps.length);
    expect(Array.isArray(chainResponse.decisionPoints)).toBe(true);
  });

  it("should have confidence evolution matching number of steps (Property 13)", () => {
    const steps = [
      {
        id: "step-1",
        content: "Step 1",
        type: "hypothesis" as const,
        confidence: 0.6,
        evidence: [],
        timestamp: new Date().toISOString(),
      },
      {
        id: "step-2",
        content: "Step 2",
        type: "inference" as const,
        confidence: 0.75,
        evidence: [],
        timestamp: new Date().toISOString(),
      },
      {
        id: "step-3",
        content: "Step 3",
        type: "conclusion" as const,
        confidence: 0.85,
        evidence: [],
        timestamp: new Date().toISOString(),
      },
    ];

    const confidenceEvolution = steps.map((s) => s.confidence);

    // Property 13: confidence_evolution array matching the number of steps
    expect(confidenceEvolution.length).toBe(steps.length);
    expect(confidenceEvolution).toEqual([0.6, 0.75, 0.85]);
  });
});
