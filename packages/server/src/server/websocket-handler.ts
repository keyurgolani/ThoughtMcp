/**
 * WebSocket Handler for Live Activity
 *
 * Provides real-time cognitive activity updates via WebSocket connections.
 * Broadcasts cognitive activity events to connected clients including
 * active processes, memory operations, and reasoning events.
 *
 * Requirements: 7.1, 7.3, 3.1, 3.2, 3.3, 3.8
 */

import type { Server as HttpServer } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { Logger } from "../utils/logger.js";

/**
 * Activity event types for WebSocket broadcasts
 * Requirements: 7.1, 3.1, 3.2, 3.3
 */
export type ActivityEventType =
  | "memory_operation"
  | "reasoning_update"
  | "load_change"
  | "session_event"
  | "system_event"
  | "heartbeat"
  | "connection_established"
  | "memory_created"
  | "memory_updated"
  | "memory_deleted";

/**
 * Memory operation event data
 * Requirements: 7.1
 */
export interface MemoryOperationData {
  operation: "store" | "recall" | "update" | "delete" | "search";
  memoryId?: string;
  userId: string;
  sector?: string;
  success: boolean;
  duration?: number;
}

/**
 * Reasoning update event data
 * Requirements: 7.1
 */
export interface ReasoningUpdateData {
  sessionId: string;
  stage: string;
  progress: number;
  activeStreams?: string[];
  mode?: string;
}

/**
 * Cognitive load change event data
 * Requirements: 7.3
 */
export interface LoadChangeData {
  /** Current cognitive load level (0-1) */
  loadLevel: number;
  /** Active process count */
  activeProcesses: number;
  /** Memory operations per second */
  memoryOpsPerSecond: number;
  /** Reasoning sessions active */
  reasoningSessions: number;
  /** Suggested visual feedback intensity */
  visualIntensity: "low" | "medium" | "high";
}

/**
 * Session event data
 * Requirements: 7.1
 */
export interface SessionEventData {
  event: "created" | "updated" | "deleted";
  sessionId: string;
  userId?: string;
}

/**
 * System event data
 * Requirements: 7.1
 */
export interface SystemEventData {
  event: "startup" | "shutdown" | "health_change" | "config_change";
  status?: string;
  message?: string;
}

/**
 * Memory created event data
 * Requirements: 3.1, 3.8
 */
export interface MemoryCreatedEventData {
  /** The created memory object */
  memory: {
    id: string;
    content: string;
    primarySector: string;
    createdAt: string;
    embeddingStatus?: "pending" | "complete" | "failed";
    [key: string]: unknown;
  };
  /** User ID for scoped broadcasting */
  userId: string;
  /** Temporary ID for matching optimistic updates */
  tempId?: string;
}

/**
 * Memory updated event data
 * Requirements: 3.2, 3.8
 */
export interface MemoryUpdatedEventData {
  /** Memory ID that was updated */
  memoryId: string;
  /** User ID for scoped broadcasting */
  userId: string;
  /** Updated fields */
  updates: Record<string, unknown>;
  /** Reason for update (e.g., 'embedding_complete', 'user_edit') */
  reason: string;
}

/**
 * Memory deleted event data
 * Requirements: 3.3
 */
export interface MemoryDeletedEventData {
  /** Memory ID that was deleted */
  memoryId: string;
  /** User ID for scoped broadcasting */
  userId: string;
}

/**
 * Activity event structure for WebSocket broadcasts
 * Requirements: 7.1, 3.1, 3.2, 3.3
 */
export interface ActivityEvent {
  /** Event type identifier */
  type: ActivityEventType;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Event-specific data */
  data:
    | MemoryOperationData
    | ReasoningUpdateData
    | LoadChangeData
    | SessionEventData
    | SystemEventData
    | MemoryCreatedEventData
    | MemoryUpdatedEventData
    | MemoryDeletedEventData
    | { message: string };
}

/**
 * WebSocket client connection metadata
 * Requirements: 3.1, 3.2, 3.3
 */
interface WebSocketClient {
  /** WebSocket connection */
  ws: WebSocket;
  /** Client identifier */
  clientId: string;
  /** User ID for scoped broadcasting (set via subscribe message) */
  userId: string | null;
  /** Connection timestamp */
  connectedAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Subscribed event types (empty = all) */
  subscribedTypes: Set<ActivityEventType>;
}

/**
 * WebSocket handler configuration
 */
export interface WebSocketHandlerConfig {
  /** Path for WebSocket endpoint */
  path: string;
  /** Heartbeat interval in milliseconds */
  heartbeatIntervalMs: number;
  /** Client timeout in milliseconds (no activity) */
  clientTimeoutMs: number;
  /** Maximum clients allowed */
  maxClients: number;
}

/**
 * Default WebSocket handler configuration
 */
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketHandlerConfig = {
  path: "/api/v1/activity/live",
  heartbeatIntervalMs: 30000,
  clientTimeoutMs: 120000,
  maxClients: 100,
};

/**
 * Activity WebSocket Handler
 *
 * Manages WebSocket connections for real-time cognitive activity streaming.
 * Broadcasts activity events to all connected clients and handles
 * connection lifecycle including heartbeats and cleanup.
 *
 * Requirements: 7.1, 7.3, 3.1, 3.2, 3.3, 3.8
 */
export class ActivityWebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private config: WebSocketHandlerConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  /** Track recent events for deduplication (eventKey -> timestamp) */
  private recentEvents: Map<string, number> = new Map();
  /** Deduplication window in milliseconds */
  private readonly deduplicationWindowMs: number = 5000;

  constructor(config: Partial<WebSocketHandlerConfig> = {}) {
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };
  }

  /**
   * Attach WebSocket server to HTTP server
   * Requirements: 7.1
   *
   * @param server - HTTP server to attach to
   */
  attach(server: HttpServer): void {
    if (this.isRunning) {
      throw new Error("WebSocket handler is already running");
    }

    this.wss = new WebSocketServer({
      server,
      path: this.config.path,
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    this.startCleanup();
    this.isRunning = true;

    Logger.info(`WebSocket handler attached at ${this.config.path}`);
  }

  /**
   * Set up WebSocket server event handlers
   */
  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on("connection", (ws: WebSocket, req) => {
      this.handleConnection(ws, req);
    });

    this.wss.on("error", (error: Error) => {
      Logger.error("WebSocket server error", error);
    });

    this.wss.on("close", () => {
      Logger.info("WebSocket server closed");
    });
  }

  /**
   * Handle new WebSocket connection
   * Requirements: 7.1, 3.1, 3.2, 3.3
   */
  private handleConnection(ws: WebSocket, _req: { url?: string }): void {
    // Check max clients limit
    if (this.clients.size >= this.config.maxClients) {
      Logger.warn("WebSocket connection rejected: max clients reached");
      ws.close(1013, "Maximum clients reached");
      return;
    }

    const clientId = this.generateClientId();
    const client: WebSocketClient = {
      ws,
      clientId,
      userId: null,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscribedTypes: new Set(),
    };

    this.clients.set(clientId, client);
    Logger.debug(`WebSocket client connected: ${clientId}`);

    // Set up client event handlers
    ws.on("message", (data: Buffer | string) => {
      this.handleMessage(client, data);
    });

    ws.on("close", (code: number, reason: Buffer) => {
      this.handleDisconnect(client, code, reason.toString());
    });

    ws.on("error", (error: Error) => {
      Logger.error(`WebSocket client error: ${clientId}`, error);
      this.removeClient(clientId);
    });

    ws.on("pong", () => {
      client.lastActivity = new Date();
    });

    // Send connection established event
    this.sendToClient(client, {
      type: "connection_established",
      timestamp: new Date().toISOString(),
      data: {
        message: `Connected as ${clientId}`,
      },
    });
  }

  /**
   * Handle incoming message from client
   * Requirements: 3.1, 3.2, 3.3
   */
  private handleMessage(client: WebSocketClient, data: Buffer | string): void {
    client.lastActivity = new Date();

    try {
      const message = JSON.parse(data.toString());

      // Handle user subscription for scoped broadcasting
      if (message.action === "subscribe_user" && typeof message.userId === "string") {
        client.userId = message.userId;
        Logger.debug(`Client ${client.clientId} subscribed to user: ${message.userId}`);
      }

      // Handle subscription requests
      if (message.action === "subscribe" && Array.isArray(message.types)) {
        for (const type of message.types) {
          if (this.isValidEventType(type)) {
            client.subscribedTypes.add(type);
          }
        }
        Logger.debug(
          `Client ${client.clientId} subscribed to: ${[...client.subscribedTypes].join(", ")}`
        );
      }

      // Handle unsubscribe requests
      if (message.action === "unsubscribe" && Array.isArray(message.types)) {
        for (const type of message.types) {
          client.subscribedTypes.delete(type);
        }
      }

      // Handle ping
      if (message.action === "ping") {
        this.sendToClient(client, {
          type: "heartbeat",
          timestamp: new Date().toISOString(),
          data: { message: "pong" },
        });
      }
    } catch {
      // Ignore invalid JSON messages
      Logger.debug(`Invalid message from client ${client.clientId}`);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnect(client: WebSocketClient, code: number, reason: string): void {
    Logger.debug(
      `WebSocket client disconnected: ${client.clientId} (code: ${code}, reason: ${reason})`
    );
    this.removeClient(client.clientId);
  }

  /**
   * Remove a client from the connection pool
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1000, "Connection closed");
        }
      } catch {
        // Ignore errors during close
      }
      this.clients.delete(clientId);
    }
  }

  /**
   * Broadcast an activity event to all connected clients
   * Requirements: 7.1, 7.3, 3.1, 3.2, 3.3
   *
   * @param event - Activity event to broadcast
   */
  broadcast(event: ActivityEvent): void {
    if (!this.isRunning || this.clients.size === 0) return;

    const eventData = JSON.stringify(event);

    for (const client of this.clients.values()) {
      // Check if client is subscribed to this event type
      if (client.subscribedTypes.size > 0 && !client.subscribedTypes.has(event.type)) {
        continue;
      }

      this.sendRawToClient(client, eventData);
    }
  }

  /**
   * Broadcast a memory event to clients subscribed to a specific user
   * Requirements: 3.1, 3.2, 3.3, 3.8
   *
   * @param event - Memory event to broadcast
   * @param userId - User ID to scope the broadcast to
   * @param tempId - Optional temp ID for deduplication with optimistic updates
   */
  broadcastToUser(event: ActivityEvent, userId: string, tempId?: string): void {
    if (!this.isRunning || this.clients.size === 0) return;

    // Check for duplicate events
    const eventKey = this.generateEventKey(event, userId, tempId);
    if (this.isDuplicateEvent(eventKey)) {
      Logger.debug(`Skipping duplicate event: ${eventKey}`);
      return;
    }

    // Mark event as processed
    this.markEventProcessed(eventKey);

    const eventData = JSON.stringify(event);

    for (const client of this.clients.values()) {
      // Only send to clients subscribed to this user
      if (client.userId !== userId) {
        continue;
      }

      // Check if client is subscribed to this event type
      if (client.subscribedTypes.size > 0 && !client.subscribedTypes.has(event.type)) {
        continue;
      }

      this.sendRawToClient(client, eventData);
    }
  }

  /**
   * Generate a unique key for event deduplication
   * Requirements: 3.8
   */
  private generateEventKey(event: ActivityEvent, userId: string, tempId?: string): string {
    const data = event.data as Record<string, unknown>;
    const memoryId = data.memoryId ?? (data.memory as Record<string, unknown>)?.id ?? "";
    return `${event.type}:${userId}:${memoryId}:${tempId ?? ""}`;
  }

  /**
   * Check if an event is a duplicate within the deduplication window
   * Requirements: 3.8
   */
  private isDuplicateEvent(eventKey: string): boolean {
    const lastProcessed = this.recentEvents.get(eventKey);
    if (!lastProcessed) return false;

    const now = Date.now();
    return now - lastProcessed < this.deduplicationWindowMs;
  }

  /**
   * Mark an event as processed for deduplication
   * Requirements: 3.8
   */
  private markEventProcessed(eventKey: string): void {
    this.recentEvents.set(eventKey, Date.now());

    // Clean up old entries periodically
    if (this.recentEvents.size > 1000) {
      this.cleanupRecentEvents();
    }
  }

  /**
   * Clean up old entries from the recent events map
   */
  private cleanupRecentEvents(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.recentEvents) {
      if (now - timestamp > this.deduplicationWindowMs) {
        this.recentEvents.delete(key);
      }
    }
  }

  /**
   * Send an event to a specific client
   */
  private sendToClient(client: WebSocketClient, event: ActivityEvent): void {
    this.sendRawToClient(client, JSON.stringify(event));
  }

  /**
   * Send raw data to a specific client
   */
  private sendRawToClient(client: WebSocketClient, data: string): void {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    } catch (error) {
      Logger.error(`Failed to send to client ${client.clientId}`, error);
      this.removeClient(client.clientId);
    }
  }

  /**
   * Start heartbeat interval to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatEvent: ActivityEvent = {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        data: { message: "keepalive" },
      };

      for (const client of this.clients.values()) {
        try {
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping();
            this.sendToClient(client, heartbeatEvent);
          }
        } catch {
          this.removeClient(client.clientId);
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Start cleanup interval to remove stale connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = this.config.clientTimeoutMs;

      for (const [clientId, client] of this.clients) {
        if (now - client.lastActivity.getTime() > timeout) {
          Logger.debug(`Removing stale client: ${clientId}`);
          this.removeClient(clientId);
        }
      }
    }, this.config.clientTimeoutMs / 2);
  }

  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if a string is a valid event type
   * Requirements: 3.1, 3.2, 3.3
   */
  private isValidEventType(type: string): type is ActivityEventType {
    const validTypes: ActivityEventType[] = [
      "memory_operation",
      "reasoning_update",
      "load_change",
      "session_event",
      "system_event",
      "heartbeat",
      "connection_established",
      "memory_created",
      "memory_updated",
      "memory_deleted",
    ];
    return validTypes.includes(type as ActivityEventType);
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if the handler is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get client connection info
   * Requirements: 3.1, 3.2, 3.3
   */
  getClientInfo(): Array<{
    clientId: string;
    connectedAt: Date;
    subscribedTypes: string[];
    userId: string | null;
  }> {
    return Array.from(this.clients.values()).map((client) => ({
      clientId: client.clientId,
      connectedAt: client.connectedAt,
      subscribedTypes: [...client.subscribedTypes],
      userId: client.userId,
    }));
  }

  /**
   * Close all connections and stop the handler
   * Requirements: 7.1
   */
  close(): void {
    if (!this.isRunning) return;

    Logger.info("Closing WebSocket handler...");

    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1001, "Server shutting down");
        }
      } catch {
        // Ignore errors during shutdown
      }
    }
    this.clients.clear();
    this.recentEvents.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.isRunning = false;
    Logger.info("WebSocket handler closed");
  }
}

/**
 * Helper functions for creating activity events
 */

/**
 * Create a memory operation event
 * Requirements: 7.1
 */
export function createMemoryOperationEvent(data: MemoryOperationData): ActivityEvent {
  return {
    type: "memory_operation",
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create a reasoning update event
 * Requirements: 7.1
 */
export function createReasoningUpdateEvent(data: ReasoningUpdateData): ActivityEvent {
  return {
    type: "reasoning_update",
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create a cognitive load change event
 * Requirements: 7.3
 */
export function createLoadChangeEvent(data: LoadChangeData): ActivityEvent {
  return {
    type: "load_change",
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create a session event
 * Requirements: 7.1
 */
export function createSessionEvent(data: SessionEventData): ActivityEvent {
  return {
    type: "session_event",
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create a system event
 * Requirements: 7.1
 */
export function createSystemEvent(data: SystemEventData): ActivityEvent {
  return {
    type: "system_event",
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create a memory created event
 * Requirements: 3.1, 3.8
 */
export function createMemoryCreatedEvent(data: MemoryCreatedEventData): ActivityEvent {
  return {
    type: "memory_created",
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create a memory updated event
 * Requirements: 3.2, 3.8
 */
export function createMemoryUpdatedEvent(data: MemoryUpdatedEventData): ActivityEvent {
  return {
    type: "memory_updated",
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Create a memory deleted event
 * Requirements: 3.3
 */
export function createMemoryDeletedEvent(data: MemoryDeletedEventData): ActivityEvent {
  return {
    type: "memory_deleted",
    timestamp: new Date().toISOString(),
    data,
  };
}
