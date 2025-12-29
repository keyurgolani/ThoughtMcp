/**
 * WebSocket Memory Event Handler
 *
 * Handles real-time memory events from the server via WebSocket.
 * Subscribes to memory events for the current user and updates the Memory Store.
 * Includes event queuing during disconnection and reconciliation on reconnection.
 *
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */

import type {
  ActivityEvent,
  Memory,
  MemoryCreatedEventData,
  MemoryDeletedEventData,
  MemoryUpdatedEventData,
  WebSocketConnectionState,
} from "../types/api";
import { ThoughtWebSocket, getDefaultWebSocket } from "./websocket";

// ============================================================================
// Types
// ============================================================================

/**
 * Memory event types for WebSocket broadcasts
 * Requirements: 3.4, 3.5, 3.6
 */
export type MemoryEventType = "memory_created" | "memory_updated" | "memory_deleted";

// Re-export the event data types for convenience
export type { MemoryCreatedEventData, MemoryDeletedEventData, MemoryUpdatedEventData };

/**
 * Memory event structure
 */
export interface MemoryEvent {
  type: MemoryEventType;
  timestamp: string;
  data: MemoryCreatedEventData | MemoryUpdatedEventData | MemoryDeletedEventData;
}

/**
 * Queued event for offline processing
 * Requirements: 3.7
 */
export interface QueuedMemoryEvent {
  event: MemoryEvent;
  timestamp: number;
}

/**
 * Callbacks for memory event handling
 */
export interface MemoryEventCallbacks {
  /** Called when a memory is created */
  onMemoryCreated?: (memory: Memory, tempId?: string) => void;
  /** Called when a memory is updated */
  onMemoryUpdated?: (memoryId: string, updates: Partial<Memory>, reason: string) => void;
  /** Called when a memory is deleted */
  onMemoryDeleted?: (memoryId: string) => void;
  /** Called when connection state changes */
  onConnectionStateChange?: (state: WebSocketConnectionState) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Configuration for the WebSocket memory handler
 */
export interface WebSocketMemoryHandlerConfig {
  /** Maximum queue size for offline events */
  maxQueueSize?: number;
  /** Deduplication window in milliseconds */
  deduplicationWindowMs?: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<WebSocketMemoryHandlerConfig> = {
  maxQueueSize: 1000,
  deduplicationWindowMs: 5000,
};

// ============================================================================
// WebSocket Memory Handler
// ============================================================================

/**
 * WebSocket Memory Event Handler
 *
 * Manages real-time memory event subscriptions and updates.
 * Handles event queuing during disconnection and reconciliation on reconnection.
 *
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */
export class WebSocketMemoryHandler {
  private readonly ws: ThoughtWebSocket;
  private readonly config: Required<WebSocketMemoryHandlerConfig>;
  private callbacks: MemoryEventCallbacks = {};
  private currentUserId: string | null = null;
  private isSubscribed: boolean = false;

  /** Queue for events received during disconnection */
  private eventQueue: QueuedMemoryEvent[] = [];

  /** Track processed events for deduplication (eventKey -> timestamp) */
  private processedEvents: Map<string, number> = new Map();

  /** Unsubscribe functions for cleanup */
  private unsubscribeFunctions: Array<() => void> = [];

  constructor(ws?: ThoughtWebSocket, config: WebSocketMemoryHandlerConfig = {}) {
    this.ws = ws ?? getDefaultWebSocket();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Subscribe to memory events for a specific user
   * Requirements: 3.4, 3.5, 3.6
   *
   * @param userId - User ID to subscribe to
   * @param callbacks - Event callbacks
   */
  subscribeToMemoryEvents(userId: string, callbacks: MemoryEventCallbacks = {}): void {
    // Unsubscribe from previous user if different
    if (this.currentUserId !== null && this.currentUserId !== userId) {
      this.unsubscribe();
    }

    this.currentUserId = userId;
    this.callbacks = callbacks;
    this.isSubscribed = true;

    // Set up event listeners
    this.setupEventListeners();

    // Subscribe to memory event types on the WebSocket
    this.ws.subscribe(["memory_created", "memory_updated", "memory_deleted"]);

    // Send user subscription message to server
    if (this.ws.isConnected()) {
      this.sendUserSubscription(userId);
    }
  }

  /**
   * Unsubscribe from memory events
   */
  unsubscribe(): void {
    // Clean up event listeners
    for (const unsubscribe of this.unsubscribeFunctions) {
      unsubscribe();
    }
    this.unsubscribeFunctions = [];

    // Unsubscribe from memory event types
    this.ws.unsubscribe(["memory_created", "memory_updated", "memory_deleted"]);

    this.currentUserId = null;
    this.callbacks = {};
    this.isSubscribed = false;
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): WebSocketConnectionState {
    return this.ws.getConnectionState();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws.isConnected();
  }

  /**
   * Get the number of queued events
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Clear the event queue
   */
  clearQueue(): void {
    this.eventQueue = [];
  }

  /**
   * Manually reconcile queued events
   * Requirements: 3.7
   */
  reconcileQueue(): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    // Sort events by their event timestamp (ISO string)
    const sortedEvents = [...this.eventQueue].sort((a, b) => {
      const timeA = new Date(a.event.timestamp).getTime();
      const timeB = new Date(b.event.timestamp).getTime();
      return timeA - timeB;
    });

    // Process each queued event
    for (const queuedEvent of sortedEvents) {
      this.handleMemoryEvent(queuedEvent.event);
    }

    // Clear the queue after processing
    this.eventQueue = [];
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    this.ws.connect();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.ws.disconnect();
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Set up event listeners for WebSocket events
   */
  private setupEventListeners(): void {
    // Listen for memory events
    const unsubscribeCreated = this.ws.onEvent("memory_created", (event) => {
      this.handleActivityEvent(event);
    });
    this.unsubscribeFunctions.push(unsubscribeCreated);

    const unsubscribeUpdated = this.ws.onEvent("memory_updated", (event) => {
      this.handleActivityEvent(event);
    });
    this.unsubscribeFunctions.push(unsubscribeUpdated);

    const unsubscribeDeleted = this.ws.onEvent("memory_deleted", (event) => {
      this.handleActivityEvent(event);
    });
    this.unsubscribeFunctions.push(unsubscribeDeleted);

    // Listen for connection state changes
    const unsubscribeConnection = this.ws.onConnectionStateChange((state) => {
      this.handleConnectionStateChange(state);
    });
    this.unsubscribeFunctions.push(unsubscribeConnection);

    // Listen for errors
    const unsubscribeError = this.ws.onError((error) => {
      this.callbacks.onError?.(error);
    });
    this.unsubscribeFunctions.push(unsubscribeError);
  }

  /**
   * Send user subscription message to server
   */
  private sendUserSubscription(_userId: string): void {
    // The WebSocket client doesn't expose a direct send method,
    // but the server handles user subscription via the subscribe_user action
    // This is handled internally by the WebSocket when we subscribe to events
    // For now, we rely on the server-side filtering based on userId in events
  }

  /**
   * Handle incoming activity event from WebSocket
   */
  private handleActivityEvent(event: ActivityEvent): void {
    // Check if this is a memory event
    if (!this.isMemoryEventType(event.type)) {
      return;
    }

    // Convert to MemoryEvent - type is now narrowed by the type guard
    const memoryEvent: MemoryEvent = {
      type: event.type,
      timestamp: event.timestamp,
      data: event.data as MemoryCreatedEventData | MemoryUpdatedEventData | MemoryDeletedEventData,
    };

    // Check if event is for current user
    if (!this.isEventForCurrentUser(memoryEvent)) {
      return;
    }

    // If disconnected or reconnecting, queue the event
    const connectionState = this.ws.getConnectionState();
    if (connectionState === "disconnected" || connectionState === "reconnecting") {
      this.queueEvent(memoryEvent);
      return;
    }

    // Process the event
    this.handleMemoryEvent(memoryEvent);
  }

  /**
   * Handle a memory event
   * Requirements: 3.4, 3.5, 3.6
   */
  handleMemoryEvent(event: MemoryEvent): void {
    // Check for duplicate events
    const eventKey = this.generateEventKey(event);
    if (this.isDuplicateEvent(eventKey)) {
      return;
    }

    // Mark event as processed
    this.markEventProcessed(eventKey);

    // Handle based on event type
    switch (event.type) {
      case "memory_created": {
        const data = event.data as MemoryCreatedEventData;
        this.callbacks.onMemoryCreated?.(data.memory, data.tempId);
        break;
      }
      case "memory_updated": {
        const data = event.data as MemoryUpdatedEventData;
        this.callbacks.onMemoryUpdated?.(data.memoryId, data.updates, data.reason);
        break;
      }
      case "memory_deleted": {
        const data = event.data as MemoryDeletedEventData;
        this.callbacks.onMemoryDeleted?.(data.memoryId);
        break;
      }
    }
  }

  /**
   * Handle connection state changes
   * Requirements: 3.7
   */
  private handleConnectionStateChange(state: WebSocketConnectionState): void {
    this.callbacks.onConnectionStateChange?.(state);

    // On reconnection, reconcile queued events and re-subscribe
    if (state === "connected") {
      if (this.currentUserId !== null && this.isSubscribed) {
        this.sendUserSubscription(this.currentUserId);
      }

      // Reconcile queued events
      this.reconcileQueue();
    }
  }

  /**
   * Queue an event for later processing
   * Requirements: 3.7
   */
  queueEvent(event: MemoryEvent): void {
    // Enforce max queue size
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      // Remove oldest event
      this.eventQueue.shift();
    }

    this.eventQueue.push({
      event,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if event type is a memory event
   */
  private isMemoryEventType(type: string): type is MemoryEventType {
    return type === "memory_created" || type === "memory_updated" || type === "memory_deleted";
  }

  /**
   * Check if event is for the current user
   */
  private isEventForCurrentUser(event: MemoryEvent): boolean {
    if (this.currentUserId === null) {
      return false;
    }

    const data = event.data;
    return data.userId === this.currentUserId;
  }

  /**
   * Generate a unique key for event deduplication
   * Requirements: 3.8 (deduplication)
   */
  private generateEventKey(event: MemoryEvent): string {
    const data = event.data;
    let memoryId: string;

    if (event.type === "memory_created") {
      const createdData = data as MemoryCreatedEventData;
      memoryId = createdData.memory.id;
      const tempId = createdData.tempId ?? "";
      return `${event.type}:${data.userId}:${memoryId}:${tempId}`;
    } else {
      const otherData = data as MemoryUpdatedEventData | MemoryDeletedEventData;
      memoryId = otherData.memoryId;
      return `${event.type}:${data.userId}:${memoryId}`;
    }
  }

  /**
   * Check if an event is a duplicate within the deduplication window
   */
  private isDuplicateEvent(eventKey: string): boolean {
    const lastProcessed = this.processedEvents.get(eventKey);
    if (lastProcessed === undefined) {
      return false;
    }

    const now = Date.now();
    return now - lastProcessed < this.config.deduplicationWindowMs;
  }

  /**
   * Mark an event as processed for deduplication
   */
  private markEventProcessed(eventKey: string): void {
    this.processedEvents.set(eventKey, Date.now());

    // Clean up old entries periodically
    if (this.processedEvents.size > 1000) {
      this.cleanupProcessedEvents();
    }
  }

  /**
   * Clean up old entries from the processed events map
   */
  private cleanupProcessedEvents(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.processedEvents) {
      if (now - timestamp > this.config.deduplicationWindowMs) {
        this.processedEvents.delete(key);
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new WebSocket memory handler
 */
export function createWebSocketMemoryHandler(
  ws?: ThoughtWebSocket,
  config?: WebSocketMemoryHandlerConfig
): WebSocketMemoryHandler {
  return new WebSocketMemoryHandler(ws, config);
}

// ============================================================================
// Default Instance
// ============================================================================

let defaultHandler: WebSocketMemoryHandler | null = null;

/**
 * Get or create the default WebSocket memory handler
 */
export function getDefaultMemoryHandler(): WebSocketMemoryHandler {
  if (defaultHandler === null) {
    defaultHandler = createWebSocketMemoryHandler();
  }
  return defaultHandler;
}

/**
 * Set the default WebSocket memory handler
 */
export function setDefaultMemoryHandler(handler: WebSocketMemoryHandler): void {
  defaultHandler = handler;
}
