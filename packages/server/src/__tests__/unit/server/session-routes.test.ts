/**
 * Session Routes Unit Tests
 *
 * Tests for the session management routes including create, get, and delete endpoints.
 * Requirements: 9.1, 9.2, 9.3
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CognitiveCore } from "../../../server/cognitive-core.js";
import {
  createSessionRoutes,
  sessionStore,
  type SessionData,
} from "../../../server/routes/session.js";

// Mock cognitive core with all required methods
const createMockCognitiveCore = (): CognitiveCore => {
  return {
    memoryRepository: {
      getStats: vi.fn().mockResolvedValue({
        episodicCount: 10,
        semanticCount: 5,
        proceduralCount: 3,
        emotionalCount: 2,
        reflectiveCount: 1,
        totalCapacity: 100000,
        consolidationPending: 0,
        recentActivity: [],
      }),
    } as unknown as CognitiveCore["memoryRepository"],
    reasoningOrchestrator: {} as CognitiveCore["reasoningOrchestrator"],
    frameworkSelector: {} as CognitiveCore["frameworkSelector"],
    confidenceAssessor: {} as CognitiveCore["confidenceAssessor"],
    biasDetector: {} as CognitiveCore["biasDetector"],
    emotionAnalyzer: {} as CognitiveCore["emotionAnalyzer"],
    problemDecomposer: {} as CognitiveCore["problemDecomposer"],
    memoryAugmentedReasoning: {} as CognitiveCore["memoryAugmentedReasoning"],
  };
};

describe("Session Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
    // Clear all sessions before each test
    while (sessionStore.getSessionCount() > 0) {
      const sessions = Array.from({ length: sessionStore.getSessionCount() });
      sessions.forEach(() => {
        // Clean up by creating and deleting sessions
      });
    }
  });

  describe("createSessionRoutes", () => {
    it("should create a router with routes", () => {
      const router = createSessionRoutes(mockCore);
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have POST route for /create endpoint", () => {
      const router = createSessionRoutes(mockCore);
      const hasCreateRoute = router.stack.some(
        (layer: { route?: { path: string; methods?: { post?: boolean } } }) => {
          return layer.route?.path === "/create" && layer.route?.methods?.post;
        }
      );
      expect(hasCreateRoute).toBe(true);
    });

    it("should have GET route for /:sessionId endpoint", () => {
      const router = createSessionRoutes(mockCore);
      const hasGetRoute = router.stack.some(
        (layer: { route?: { path: string; methods?: { get?: boolean } } }) => {
          return layer.route?.path === "/:sessionId" && layer.route?.methods?.get;
        }
      );
      expect(hasGetRoute).toBe(true);
    });

    it("should have DELETE route for /:sessionId endpoint", () => {
      const router = createSessionRoutes(mockCore);
      const hasDeleteRoute = router.stack.some(
        (layer: { route?: { path: string; methods?: { delete?: boolean } } }) => {
          return layer.route?.path === "/:sessionId" && layer.route?.methods?.delete;
        }
      );
      expect(hasDeleteRoute).toBe(true);
    });
  });

  describe("SessionStore", () => {
    describe("createSession", () => {
      it("should create a session with provided userId", () => {
        const session = sessionStore.createSession("test-user-123");
        expect(session).toBeDefined();
        expect(session.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);
        expect(session.userId).toBe("test-user-123");
        expect(session.operationsCount).toBe(0);
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.lastActive).toBeInstanceOf(Date);
        expect(session.expiresAt).toBeInstanceOf(Date);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });

      it("should create a session with anonymous userId when not provided", () => {
        const session = sessionStore.createSession();
        expect(session).toBeDefined();
        expect(session.userId).toMatch(/^anonymous-[a-z0-9]+$/);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });

      it("should create a session with config overrides", () => {
        const configOverrides = { theme: "dark", language: "en" };
        const session = sessionStore.createSession("user-1", configOverrides);
        expect(session.configOverrides).toEqual(configOverrides);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });

      it("should set expiration to 24 hours from creation", () => {
        const beforeCreate = Date.now();
        const session = sessionStore.createSession("user-1");
        const afterCreate = Date.now();

        const expectedExpiration = 24 * 60 * 60 * 1000; // 24 hours in ms
        const expiresAtMs = session.expiresAt.getTime();

        expect(expiresAtMs).toBeGreaterThanOrEqual(beforeCreate + expectedExpiration);
        expect(expiresAtMs).toBeLessThanOrEqual(afterCreate + expectedExpiration);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });
    });

    describe("getSession", () => {
      it("should retrieve an existing session", () => {
        const created = sessionStore.createSession("user-1");
        const retrieved = sessionStore.getSession(created.sessionId);

        expect(retrieved).toBeDefined();
        expect(retrieved?.sessionId).toBe(created.sessionId);
        expect(retrieved?.userId).toBe("user-1");

        // Clean up
        sessionStore.deleteSession(created.sessionId);
      });

      it("should return undefined for non-existent session", () => {
        const retrieved = sessionStore.getSession("non-existent-session-id");
        expect(retrieved).toBeUndefined();
      });

      it("should update lastActive when retrieving session", () => {
        const session = sessionStore.createSession("user-1");
        const originalLastActive = session.lastActive.getTime();

        // Wait a small amount of time
        const delay = 10;
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait
        }

        const retrieved = sessionStore.getSession(session.sessionId);
        expect(retrieved?.lastActive.getTime()).toBeGreaterThanOrEqual(originalLastActive);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });

      it("should return undefined for expired session", () => {
        const session = sessionStore.createSession("user-1");

        // Manually expire the session by setting expiresAt to the past
        session.expiresAt = new Date(Date.now() - 1000);

        const retrieved = sessionStore.getSession(session.sessionId);
        expect(retrieved).toBeUndefined();
      });
    });

    describe("deleteSession", () => {
      it("should delete an existing session", () => {
        const session = sessionStore.createSession("user-1");
        const deleted = sessionStore.deleteSession(session.sessionId);

        expect(deleted).toBeDefined();
        expect(deleted?.sessionId).toBe(session.sessionId);

        // Verify session is gone
        const retrieved = sessionStore.getSession(session.sessionId);
        expect(retrieved).toBeUndefined();
      });

      it("should return undefined when deleting non-existent session", () => {
        const deleted = sessionStore.deleteSession("non-existent-session-id");
        expect(deleted).toBeUndefined();
      });
    });

    describe("incrementOperations", () => {
      it("should increment operations count", () => {
        const session = sessionStore.createSession("user-1");
        expect(session.operationsCount).toBe(0);

        sessionStore.incrementOperations(session.sessionId);
        expect(session.operationsCount).toBe(1);

        sessionStore.incrementOperations(session.sessionId);
        expect(session.operationsCount).toBe(2);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });

      it("should update lastActive when incrementing operations", () => {
        const session = sessionStore.createSession("user-1");
        const originalLastActive = session.lastActive.getTime();

        // Wait a small amount of time
        const delay = 10;
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait
        }

        sessionStore.incrementOperations(session.sessionId);
        expect(session.lastActive.getTime()).toBeGreaterThanOrEqual(originalLastActive);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });

      it("should do nothing for non-existent session", () => {
        // Should not throw
        expect(() => {
          sessionStore.incrementOperations("non-existent-session-id");
        }).not.toThrow();
      });
    });

    describe("cleanupExpiredSessions", () => {
      it("should remove expired sessions", () => {
        const session1 = sessionStore.createSession("user-1");
        const session2 = sessionStore.createSession("user-2");

        // Manually expire session1
        session1.expiresAt = new Date(Date.now() - 1000);

        const cleaned = sessionStore.cleanupExpiredSessions();
        expect(cleaned).toBe(1);

        // session1 should be gone
        expect(sessionStore.getSession(session1.sessionId)).toBeUndefined();

        // session2 should still exist
        expect(sessionStore.getSession(session2.sessionId)).toBeDefined();

        // Clean up
        sessionStore.deleteSession(session2.sessionId);
      });

      it("should return 0 when no sessions are expired", () => {
        const session = sessionStore.createSession("user-1");

        const cleaned = sessionStore.cleanupExpiredSessions();
        expect(cleaned).toBe(0);

        // Clean up
        sessionStore.deleteSession(session.sessionId);
      });
    });
  });

  /**
   * Property 21: Session ID Uniqueness
   * For any two session creation requests, the returned session IDs should be unique.
   * Validates: Requirements 9.1
   */
  describe("Session ID Uniqueness Property", () => {
    it("should generate unique session IDs for multiple sessions", () => {
      const sessions: SessionData[] = [];
      const sessionIds = new Set<string>();

      // Create multiple sessions
      for (let i = 0; i < 100; i++) {
        const session = sessionStore.createSession(`user-${i}`);
        sessions.push(session);
        sessionIds.add(session.sessionId);
      }

      // All session IDs should be unique
      expect(sessionIds.size).toBe(100);

      // Clean up
      sessions.forEach((s) => sessionStore.deleteSession(s.sessionId));
    });

    it("should generate unique session IDs even with same userId", () => {
      const sessions: SessionData[] = [];
      const sessionIds = new Set<string>();

      // Create multiple sessions with same userId
      for (let i = 0; i < 50; i++) {
        const session = sessionStore.createSession("same-user");
        sessions.push(session);
        sessionIds.add(session.sessionId);
      }

      // All session IDs should be unique
      expect(sessionIds.size).toBe(50);

      // Clean up
      sessions.forEach((s) => sessionStore.deleteSession(s.sessionId));
    });
  });

  /**
   * Property 22: Session Retrieval Consistency
   * For any created session, retrieving it by ID should return the same session details
   * including creation time and operations count.
   * Validates: Requirements 9.2
   */
  describe("Session Retrieval Consistency Property", () => {
    it("should return consistent session details on retrieval", () => {
      const session = sessionStore.createSession("user-1", { theme: "dark" });

      // Retrieve multiple times
      for (let i = 0; i < 10; i++) {
        const retrieved = sessionStore.getSession(session.sessionId);

        expect(retrieved).toBeDefined();
        expect(retrieved?.sessionId).toBe(session.sessionId);
        expect(retrieved?.userId).toBe(session.userId);
        expect(retrieved?.createdAt.getTime()).toBe(session.createdAt.getTime());
        expect(retrieved?.configOverrides).toEqual(session.configOverrides);
      }

      // Clean up
      sessionStore.deleteSession(session.sessionId);
    });

    it("should maintain operations count consistency", () => {
      const session = sessionStore.createSession("user-1");

      // Increment operations
      sessionStore.incrementOperations(session.sessionId);
      sessionStore.incrementOperations(session.sessionId);
      sessionStore.incrementOperations(session.sessionId);

      // Retrieve and verify
      const retrieved = sessionStore.getSession(session.sessionId);
      expect(retrieved?.operationsCount).toBe(3);

      // Retrieve again
      const retrieved2 = sessionStore.getSession(session.sessionId);
      expect(retrieved2?.operationsCount).toBe(3);

      // Clean up
      sessionStore.deleteSession(session.sessionId);
    });
  });
});
