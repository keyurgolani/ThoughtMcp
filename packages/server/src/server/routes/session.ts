/**
 * Session Routes
 *
 * REST API endpoints for session management operations.
 * Requirements: 9.1, 9.2, 9.3
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler, NotFoundError, ValidationApiError } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Helper to extract request ID from request
 */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/**
 * Helper to parse Zod validation errors into field errors
 */
function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

/**
 * Generate a unique session ID
 * Format: session-{timestamp}-{random}
 */
function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `session-${timestamp}-${random}`;
}

/**
 * Session data stored in memory
 */
interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActive: Date;
  operationsCount: number;
  expiresAt: Date;
  configOverrides?: Record<string, unknown>;
}

/**
 * In-memory session store
 * In production, this would be backed by Redis or similar
 */
class SessionStore {
  private sessions: Map<string, SessionData> = new Map();
  private readonly defaultExpirationMs: number = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create a new session
   */
  createSession(userId?: string, configOverrides?: Record<string, unknown>): SessionData {
    const sessionId = generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultExpirationMs);

    const session: SessionData = {
      sessionId,
      userId: userId ?? `anonymous-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      lastActive: now,
      operationsCount: 0,
      expiresAt,
      configOverrides,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Check if session has expired
      if (new Date() > session.expiresAt) {
        this.sessions.delete(sessionId);
        return undefined;
      }
      // Update last active time
      session.lastActive = new Date();
    }
    return session;
  }

  /**
   * Delete a session
   * Returns the session data if it existed
   */
  deleteSession(sessionId: string): SessionData | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
    }
    return session;
  }

  /**
   * Increment operations count for a session
   */
  incrementOperations(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.operationsCount++;
      session.lastActive = new Date();
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): number {
    const now = new Date();
    let cleaned = 0;
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Get total session count (for testing)
   */
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// Singleton session store instance
const sessionStore = new SessionStore();

// Export for testing
export { sessionStore, SessionStore, type SessionData };

/**
 * Zod schema for session create request validation
 * Requirements: 9.1
 */
const sessionCreateRequestSchema = z.object({
  userId: z.string().min(1, "userId cannot be empty").optional(),
  configOverrides: z.record(z.unknown()).optional(),
});

/**
 * Response type for session create endpoint
 * Requirements: 9.1
 */
interface SessionCreateResponse {
  sessionId: string;
  expiresAt: string;
}

/**
 * Memory snapshot for session response
 * Requirements: 9.2
 */
interface MemorySnapshot {
  totalMemories: number;
  bySector: {
    episodic: number;
    semantic: number;
    procedural: number;
    emotional: number;
    reflective: number;
  };
}

/**
 * Response type for session get endpoint
 * Requirements: 9.2
 */
interface SessionResponse {
  sessionId: string;
  userId: string;
  createdAt: string;
  lastActive: string;
  operationsCount: number;
  expiresAt: string;
  memorySnapshot: MemorySnapshot;
}

/**
 * Response type for session delete endpoint
 * Requirements: 9.3
 */
interface SessionDeleteResponse {
  sessionId: string;
  deleted: boolean;
  freedMemoryBytes: number;
}

/**
 * Handler for POST /api/v1/session/create
 * Requirements: 9.1
 *
 * Creates a new session with optional userId and config overrides.
 * Returns session ID and expiration timestamp.
 */
function createSessionCreateHandler(
  _cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    // Validate request body (default to empty object if body is undefined/null)
    const parseResult = sessionCreateRequestSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { userId, configOverrides } = parseResult.data;

    // Create session
    const session = sessionStore.createSession(userId, configOverrides);

    // Build response
    const responseData: SessionCreateResponse = {
      sessionId: session.sessionId,
      expiresAt: session.expiresAt.toISOString(),
    };

    res.status(201).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for GET /api/v1/session/:sessionId
 * Requirements: 9.2
 *
 * Returns session details including creation time, last active time,
 * operations count, and memory snapshot.
 */
function createSessionGetHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    const { sessionId } = req.params;

    // Validate sessionId parameter
    if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
      throw new ValidationApiError({ sessionId: "sessionId is required" });
    }

    // Get session from store
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      throw new NotFoundError("Session", sessionId);
    }

    // Get memory snapshot for the session's user
    let memorySnapshot: MemorySnapshot = {
      totalMemories: 0,
      bySector: {
        episodic: 0,
        semantic: 0,
        procedural: 0,
        emotional: 0,
        reflective: 0,
      },
    };

    try {
      const stats = await cognitiveCore.memoryRepository.getStats(session.userId);
      memorySnapshot = {
        totalMemories:
          stats.episodicCount +
          stats.semanticCount +
          stats.proceduralCount +
          stats.emotionalCount +
          stats.reflectiveCount,
        bySector: {
          episodic: stats.episodicCount,
          semantic: stats.semanticCount,
          procedural: stats.proceduralCount,
          emotional: stats.emotionalCount,
          reflective: stats.reflectiveCount,
        },
      };
    } catch {
      // If memory stats fail, return empty snapshot
      // This allows session retrieval to succeed even if memory system is unavailable
    }

    // Build response
    const responseData: SessionResponse = {
      sessionId: session.sessionId,
      userId: session.userId,
      createdAt: session.createdAt.toISOString(),
      lastActive: session.lastActive.toISOString(),
      operationsCount: session.operationsCount,
      expiresAt: session.expiresAt.toISOString(),
      memorySnapshot,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Handler for DELETE /api/v1/session/:sessionId
 * Requirements: 9.3
 *
 * Clears the session and returns confirmation with freed memory amount.
 */
function createSessionDeleteHandler(
  _cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    const { sessionId } = req.params;

    // Validate sessionId parameter
    if (!sessionId || typeof sessionId !== "string" || sessionId.trim() === "") {
      throw new ValidationApiError({ sessionId: "sessionId is required" });
    }

    // Delete session from store
    const deletedSession = sessionStore.deleteSession(sessionId);

    if (!deletedSession) {
      throw new NotFoundError("Session", sessionId);
    }

    // Calculate approximate freed memory
    // This is an estimate based on session data size
    const sessionDataSize = JSON.stringify(deletedSession).length;
    const freedMemoryBytes = sessionDataSize + 1024; // Add overhead estimate

    // Build response
    const responseData: SessionDeleteResponse = {
      sessionId,
      deleted: true,
      freedMemoryBytes,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create session routes
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with session endpoints
 */
export function createSessionRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/session/create - Create a new session
  // Requirements: 9.1
  router.post("/create", createSessionCreateHandler(cognitiveCore));

  // GET /api/v1/session/:sessionId - Get session details
  // Requirements: 9.2
  router.get("/:sessionId", createSessionGetHandler(cognitiveCore));

  // DELETE /api/v1/session/:sessionId - Delete a session
  // Requirements: 9.3
  router.delete("/:sessionId", createSessionDeleteHandler(cognitiveCore));

  return router;
}

// Export types for testing
export type { MemorySnapshot, SessionCreateResponse, SessionDeleteResponse, SessionResponse };
