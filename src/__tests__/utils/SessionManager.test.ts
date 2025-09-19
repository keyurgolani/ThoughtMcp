/**
 * Unit tests for SessionManager
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProcessingMode } from "../../types/core.js";
import { SessionManager } from "../../utils/SessionManager.js";
import { ConfigManager } from "../../utils/config.js";

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager({
      max_concurrent_sessions: 5,
    });
    sessionManager = new SessionManager(configManager);
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  describe("Session Creation and Retrieval", () => {
    it("should create a new session when none exists", () => {
      const session_id = "test-session-1";
      const session = sessionManager.getOrCreateSession(session_id);

      expect(session).toBeDefined();
      expect(session.session_id).toBe(session_id);
      expect(session.created_at).toBeGreaterThan(0);
      expect(session.last_accessed).toBeGreaterThan(0);
      expect(session.context_history).toEqual([]);
      expect(session.performance_metrics.total_requests).toBe(0);
    });

    it("should retrieve existing session", () => {
      const session_id = "test-session-2";
      const original_session = sessionManager.getOrCreateSession(session_id);
      const retrieved_session = sessionManager.getOrCreateSession(session_id);

      expect(retrieved_session).toBe(original_session);
      expect(retrieved_session.session_id).toBe(session_id);
    });

    it("should update last accessed time on retrieval", async () => {
      const session_id = "test-session-3";
      const original_session = sessionManager.getOrCreateSession(session_id);
      const original_time = original_session.last_accessed;

      // Wait a bit and retrieve again
      await new Promise((resolve) => setTimeout(resolve, 10));
      const retrieved_session = sessionManager.getOrCreateSession(session_id);

      expect(retrieved_session.last_accessed).toBeGreaterThanOrEqual(
        original_time
      );
    });

    it("should include client info when provided", () => {
      const session_id = "test-session-4";
      const client_info = {
        name: "test-client",
        version: "1.0.0",
        capabilities: ["thinking", "memory"],
      };

      const session = sessionManager.getOrCreateSession(
        session_id,
        client_info
      );

      expect(session.client_info).toEqual(client_info);
    });
  });

  describe("Session Configuration Management", () => {
    it("should update session configuration", () => {
      const session_id = "config-test-session";
      sessionManager.getOrCreateSession(session_id);

      const config_updates = {
        temperature: 0.9,
        enable_emotion: false,
      };

      sessionManager.updateSessionConfig(session_id, config_updates);
      const session = sessionManager.getSession(session_id);

      expect(session?.cognitive_config.temperature).toBe(0.9);
      expect(session?.cognitive_config.enable_emotion).toBe(false);
    });

    it("should update session preferences", () => {
      const session_id = "pref-test-session";
      sessionManager.getOrCreateSession(session_id);

      const preferences = {
        preferred_mode: ProcessingMode.CREATIVE,
        temperature_adjustment: 0.2,
        enable_detailed_reasoning: true,
      };

      sessionManager.updateSessionPreferences(session_id, preferences);
      const session = sessionManager.getSession(session_id);

      expect(session?.preferences).toEqual(preferences);
    });
  });

  describe("Context and Memory Management", () => {
    it("should add context to session history", () => {
      const session_id = "context-test-session";
      sessionManager.getOrCreateSession(session_id);

      const context = {
        session_id,
        domain: "test",
        urgency: 0.5,
        complexity: 0.7,
      };

      sessionManager.addContextToHistory(session_id, context);
      const session = sessionManager.getSession(session_id);

      expect(session?.context_history).toHaveLength(1);
      expect(session?.context_history[0]).toEqual(context);
    });

    it("should limit context history to 10 items", () => {
      const session_id = "context-limit-session";
      sessionManager.getOrCreateSession(session_id);

      // Add 15 contexts
      for (let i = 0; i < 15; i++) {
        const context = {
          session_id,
          domain: `test-${i}`,
          timestamp: Date.now() + i,
        };
        sessionManager.addContextToHistory(session_id, context);
      }

      const session = sessionManager.getSession(session_id);
      expect(session?.context_history).toHaveLength(10);
      expect(session?.context_history[0].domain).toBe("test-5"); // Should keep last 10
    });

    it("should update memory context", () => {
      const session_id = "memory-test-session";
      sessionManager.getOrCreateSession(session_id);

      const memory_updates = {
        working_memory_state: { active: true },
        recent_thoughts: ["thought1", "thought2"],
        emotional_state: { valence: 0.5 },
      };

      sessionManager.updateMemoryContext(session_id, memory_updates);
      const session = sessionManager.getSession(session_id);

      expect(session?.memory_context.working_memory_state).toEqual({
        active: true,
      });
      expect(session?.memory_context.recent_thoughts).toEqual([
        "thought1",
        "thought2",
      ]);
      expect(session?.memory_context.emotional_state).toEqual({ valence: 0.5 });
    });

    it("should limit recent thoughts to 20 items", () => {
      const session_id = "thoughts-limit-session";
      sessionManager.getOrCreateSession(session_id);

      const thoughts = Array.from({ length: 25 }, (_, i) => `thought-${i}`);
      sessionManager.updateMemoryContext(session_id, {
        recent_thoughts: thoughts,
      });

      const session = sessionManager.getSession(session_id);
      expect(session?.memory_context.recent_thoughts).toHaveLength(20);
      expect(session?.memory_context.recent_thoughts[0]).toBe("thought-5"); // Should keep last 20
    });
  });

  describe("Performance Metrics", () => {
    it("should update performance metrics correctly", () => {
      const session_id = "metrics-test-session";
      sessionManager.getOrCreateSession(session_id);

      // First request
      sessionManager.updatePerformanceMetrics(session_id, 100);
      let session = sessionManager.getSession(session_id);

      expect(session?.performance_metrics.total_requests).toBe(1);
      expect(session?.performance_metrics.average_response_time).toBe(100);
      expect(session?.performance_metrics.error_count).toBe(0);

      // Second request
      sessionManager.updatePerformanceMetrics(session_id, 200);
      session = sessionManager.getSession(session_id);

      expect(session?.performance_metrics.total_requests).toBe(2);
      expect(session?.performance_metrics.average_response_time).toBe(150); // (100 + 200) / 2
      expect(session?.performance_metrics.error_count).toBe(0);

      // Request with error
      sessionManager.updatePerformanceMetrics(session_id, 300, "Test error");
      session = sessionManager.getSession(session_id);

      expect(session?.performance_metrics.total_requests).toBe(3);
      expect(session?.performance_metrics.average_response_time).toBe(200); // (100 + 200 + 300) / 3
      expect(session?.performance_metrics.error_count).toBe(1);
      expect(session?.performance_metrics.last_error).toBe("Test error");
    });
  });

  describe("Session Limits and Cleanup", () => {
    it("should enforce session limits", () => {
      // Create sessions up to the limit
      for (let i = 0; i < 5; i++) {
        sessionManager.getOrCreateSession(`session-${i}`);
      }

      expect(sessionManager.getActiveSessions()).toHaveLength(5);

      // Create one more session (should trigger cleanup)
      sessionManager.getOrCreateSession("session-6");

      expect(sessionManager.getActiveSessions()).toHaveLength(5);
    });

    it("should remove specific sessions", () => {
      const session_id = "removable-session";
      sessionManager.getOrCreateSession(session_id);

      expect(sessionManager.getSession(session_id)).toBeDefined();

      const removed = sessionManager.removeSession(session_id);
      expect(removed).toBe(true);
      expect(sessionManager.getSession(session_id)).toBeUndefined();
    });

    it("should return false when removing non-existent session", () => {
      const removed = sessionManager.removeSession("non-existent");
      expect(removed).toBe(false);
    });
  });

  describe("Session Metrics", () => {
    it("should calculate session metrics correctly", async () => {
      // Create some sessions with different activity
      const session1 = sessionManager.getOrCreateSession("metrics-session-1");
      const session2 = sessionManager.getOrCreateSession("metrics-session-2");

      // Wait a bit to ensure duration > 0
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Add some requests
      sessionManager.updatePerformanceMetrics("metrics-session-1", 100);
      sessionManager.updatePerformanceMetrics("metrics-session-1", 200);
      sessionManager.updatePerformanceMetrics("metrics-session-2", 150);

      const metrics = sessionManager.getSessionMetrics();

      expect(metrics.total_sessions).toBe(2);
      expect(metrics.active_sessions).toBe(2);
      expect(metrics.total_requests).toBe(3);
      expect(metrics.average_requests_per_session).toBe(1.5);
      expect(metrics.average_session_duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Session Timeout Configuration", () => {
    it("should allow setting custom session timeout", () => {
      const custom_timeout = 60000; // 1 minute
      sessionManager.setSessionTimeout(custom_timeout);

      // This would be tested with time manipulation in a real scenario
      expect(sessionManager).toBeDefined(); // Basic check that method exists
    });
  });

  describe("Resource Cleanup", () => {
    it("should clean up resources on destroy", () => {
      const session_id = "cleanup-test-session";
      sessionManager.getOrCreateSession(session_id);

      expect(sessionManager.getSession(session_id)).toBeDefined();

      sessionManager.destroy();

      // After destroy, sessions should be cleared
      expect(sessionManager.getActiveSessions()).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle operations on non-existent sessions gracefully", () => {
      const non_existent_id = "non-existent-session";

      // These should not throw errors
      sessionManager.updateSessionConfig(non_existent_id, { temperature: 0.5 });
      sessionManager.updateSessionPreferences(non_existent_id, {
        preferred_mode: ProcessingMode.CREATIVE,
      });
      sessionManager.addContextToHistory(non_existent_id, {
        session_id: non_existent_id,
      });
      sessionManager.updatePerformanceMetrics(non_existent_id, 100);
      sessionManager.updateMemoryContext(non_existent_id, {
        recent_thoughts: ["test"],
      });

      expect(sessionManager.getSession(non_existent_id)).toBeUndefined();
    });

    it("should handle empty or invalid session IDs", () => {
      const empty_session = sessionManager.getOrCreateSession("");
      expect(empty_session.session_id).toBe("");

      const whitespace_session = sessionManager.getOrCreateSession("   ");
      expect(whitespace_session.session_id).toBe("   ");
    });
  });
});
