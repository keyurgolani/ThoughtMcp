/**
 * Session management for cognitive MCP server
 * Tracks client sessions and maintains session-specific state
 */

import { CognitiveConfig, Context, ProcessingMode } from "../types/core.js";
import { ConfigManager } from "./config.js";

export interface SessionState {
  session_id: string;
  created_at: number;
  last_accessed: number;
  client_info?: {
    name?: string;
    version?: string;
    capabilities?: string[];
  };
  cognitive_config: CognitiveConfig;
  context_history: Context[];
  memory_context: {
    working_memory_state?: unknown;
    recent_thoughts: string[];
    emotional_state?: unknown;
  };
  performance_metrics: {
    total_requests: number;
    average_response_time: number;
    error_count: number;
    last_error?: string;
  };
  preferences: {
    preferred_mode?: ProcessingMode;
    temperature_adjustment?: number;
    enable_detailed_reasoning?: boolean;
  };
}

export interface SessionMetrics {
  total_sessions: number;
  active_sessions: number;
  average_session_duration: number;
  total_requests: number;
  average_requests_per_session: number;
}

export class SessionManager {
  private sessions: Map<string, SessionState> = new Map();
  private config_manager: ConfigManager;
  private cleanup_interval: NodeJS.Timeout;
  private session_timeout_ms: number = 30 * 60 * 1000; // 30 minutes
  private max_sessions: number;

  constructor(config_manager: ConfigManager) {
    this.config_manager = config_manager;
    this.max_sessions = config_manager.get("max_concurrent_sessions");

    // Start cleanup process
    this.cleanup_interval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Create or retrieve a session
   */
  getOrCreateSession(
    session_id: string,
    client_info?: SessionState["client_info"]
  ): SessionState {
    let session = this.sessions.get(session_id);

    if (!session) {
      // Check session limits
      if (this.sessions.size >= this.max_sessions) {
        this.cleanupOldestSessions(1);
      }

      // Create new session
      session = this.createNewSession(session_id, client_info);
      this.sessions.set(session_id, session);
    } else {
      // Update last accessed time
      session.last_accessed = Date.now();

      // Update client info if provided
      if (client_info) {
        session.client_info = { ...session.client_info, ...client_info };
      }
    }

    return session;
  }

  /**
   * Create a new session with default state
   */
  private createNewSession(
    session_id: string,
    client_info?: SessionState["client_info"]
  ): SessionState {
    const now = Date.now();

    return {
      session_id,
      created_at: now,
      last_accessed: now,
      client_info: client_info ?? {},
      cognitive_config: this.config_manager.getConfig(),
      context_history: [],
      memory_context: {
        recent_thoughts: [],
      },
      performance_metrics: {
        total_requests: 0,
        average_response_time: 0,
        error_count: 0,
      },
      preferences: {},
    };
  }

  /**
   * Update session configuration
   */
  updateSessionConfig(
    session_id: string,
    config_updates: Partial<CognitiveConfig>
  ): void {
    const session = this.sessions.get(session_id);
    if (session) {
      session.cognitive_config = {
        ...session.cognitive_config,
        ...config_updates,
      };
      session.last_accessed = Date.now();
    }
  }

  /**
   * Update session preferences
   */
  updateSessionPreferences(
    session_id: string,
    preferences: Partial<SessionState["preferences"]>
  ): void {
    const session = this.sessions.get(session_id);
    if (session) {
      session.preferences = { ...session.preferences, ...preferences };
      session.last_accessed = Date.now();
    }
  }

  /**
   * Add context to session history
   */
  addContextToHistory(session_id: string, context: Context): void {
    const session = this.sessions.get(session_id);
    if (session) {
      session.context_history.push(context);

      // Keep only last 10 contexts to prevent memory bloat
      if (session.context_history.length > 10) {
        session.context_history = session.context_history.slice(-10);
      }

      session.last_accessed = Date.now();
    }
  }

  /**
   * Update session performance metrics
   */
  updatePerformanceMetrics(
    session_id: string,
    response_time: number,
    error?: string
  ): void {
    const session = this.sessions.get(session_id);
    if (session) {
      const metrics = session.performance_metrics;

      // Update request count
      metrics.total_requests++;

      // Update average response time
      metrics.average_response_time =
        (metrics.average_response_time * (metrics.total_requests - 1) +
          response_time) /
        metrics.total_requests;

      // Update error tracking
      if (error) {
        metrics.error_count++;
        metrics.last_error = error;
      }

      session.last_accessed = Date.now();
    }
  }

  /**
   * Update session memory context
   */
  updateMemoryContext(
    session_id: string,
    updates: Partial<SessionState["memory_context"]>
  ): void {
    const session = this.sessions.get(session_id);
    if (session) {
      session.memory_context = { ...session.memory_context, ...updates };

      // Limit recent thoughts to prevent memory bloat
      if (session.memory_context.recent_thoughts.length > 20) {
        session.memory_context.recent_thoughts =
          session.memory_context.recent_thoughts.slice(-20);
      }

      session.last_accessed = Date.now();
    }
  }

  /**
   * Get session by ID
   */
  getSession(session_id: string): SessionState | undefined {
    const session = this.sessions.get(session_id);
    if (session) {
      session.last_accessed = Date.now();
    }
    return session;
  }

  /**
   * Remove a session
   */
  removeSession(session_id: string): boolean {
    return this.sessions.delete(session_id);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(): SessionMetrics {
    const sessions = Array.from(this.sessions.values());
    const now = Date.now();

    const total_requests = sessions.reduce(
      (sum, session) => sum + session.performance_metrics.total_requests,
      0
    );

    const total_duration = sessions.reduce(
      (sum, session) => sum + (now - session.created_at),
      0
    );

    return {
      total_sessions: sessions.length,
      active_sessions: sessions.filter(
        (s) => now - s.last_accessed < this.session_timeout_ms
      ).length,
      average_session_duration:
        sessions.length > 0 ? total_duration / sessions.length : 0,
      total_requests,
      average_requests_per_session:
        sessions.length > 0 ? total_requests / sessions.length : 0,
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expired_sessions: string[] = [];

    for (const [session_id, session] of this.sessions.entries()) {
      if (now - session.last_accessed > this.session_timeout_ms) {
        expired_sessions.push(session_id);
      }
    }

    expired_sessions.forEach((session_id) => {
      this.sessions.delete(session_id);
    });

    if (expired_sessions.length > 0) {
      // Cleaned up expired sessions
    }
  }

  /**
   * Clean up oldest sessions when limit is reached
   */
  private cleanupOldestSessions(count: number): void {
    const sessions = Array.from(this.sessions.entries())
      .sort(([, a], [, b]) => a.last_accessed - b.last_accessed)
      .slice(0, count);

    sessions.forEach(([session_id]) => {
      this.sessions.delete(session_id);
    });

    // Cleaned up oldest sessions due to limit
  }

  /**
   * Set session timeout
   */
  setSessionTimeout(timeout_ms: number): void {
    this.session_timeout_ms = timeout_ms;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanup_interval) {
      clearInterval(this.cleanup_interval);
    }
    this.sessions.clear();
  }
}
