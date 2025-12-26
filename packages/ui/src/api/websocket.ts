/**
 * Thought WebSocket Client
 *
 * Provides real-time updates for memory operations via WebSocket connection.
 * Includes auto-reconnect, offline queue, and event subscription management.
 *
 * Requirements: 10.1-10.5
 */

import type {
  ActivityEvent,
  ActivityEventType,
  QueuedEvent,
  WebSocketClientConfig,
  WebSocketConnectionState,
} from "../types/api";

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<WebSocketClientConfig, "url">> = {
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
};

// ============================================================================
// Event Listener Types
// ============================================================================

export type ActivityEventListener = (event: ActivityEvent) => void;
export type ConnectionStateListener = (state: WebSocketConnectionState) => void;
export type ErrorListener = (error: Error) => void;

// ============================================================================
// WebSocket Client
// ============================================================================

/**
 * Thought WebSocket Client for real-time updates
 *
 * Requirements: 10.1-10.5
 */
export class ThoughtWebSocket {
  private readonly url: string;
  private readonly config: Required<Omit<WebSocketClientConfig, "url">>;

  private ws: WebSocket | null = null;
  private connectionState: WebSocketConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat: number = 0;

  // Event listeners
  private eventListeners: Map<ActivityEventType | "*", Set<ActivityEventListener>> = new Map();
  private connectionStateListeners: Set<ConnectionStateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();

  // Offline queue for missed updates
  private offlineQueue: QueuedEvent[] = [];
  private readonly maxQueueSize = 1000;

  // Subscribed event types (empty = all)
  private subscribedTypes: Set<ActivityEventType> = new Set();

  constructor(config: WebSocketClientConfig) {
    this.url = config.url;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.connectionState === "connected" || this.connectionState === "connecting") {
      return;
    }

    this.setConnectionState("connecting");
    this.createWebSocket();
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.stopReconnect();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setConnectionState("disconnected");
  }

  /**
   * Get current connection state
   */
  getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  // ==========================================================================
  // Event Subscription
  // ==========================================================================

  /**
   * Subscribe to specific event types
   * Call with no arguments to receive all events
   */
  subscribe(types?: ActivityEventType[]): void {
    if (types && types.length > 0) {
      for (const type of types) {
        this.subscribedTypes.add(type);
      }
    } else {
      this.subscribedTypes.clear();
    }

    // Send subscription to server if connected
    if (this.isConnected() && this.ws) {
      this.sendMessage({
        action: "subscribe",
        types: types ?? [],
      });
    }
  }

  /**
   * Unsubscribe from specific event types
   */
  unsubscribe(types: ActivityEventType[]): void {
    for (const type of types) {
      this.subscribedTypes.delete(type);
    }

    // Send unsubscription to server if connected
    if (this.isConnected() && this.ws) {
      this.sendMessage({
        action: "unsubscribe",
        types,
      });
    }
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  /**
   * Add listener for activity events
   * Use '*' to listen to all event types
   */
  onEvent(type: ActivityEventType | "*", listener: ActivityEventListener): () => void {
    let listeners = this.eventListeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(type, listeners);
    }
    listeners.add(listener);

    // Return unsubscribe function
    return (): void => {
      listeners.delete(listener);
    };
  }

  /**
   * Add listener for connection state changes
   */
  onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(listener);
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  /**
   * Add listener for errors
   */
  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.eventListeners.clear();
    this.connectionStateListeners.clear();
    this.errorListeners.clear();
  }

  // ==========================================================================
  // Offline Queue
  // ==========================================================================

  /**
   * Get queued events that were received while offline
   */
  getOfflineQueue(): QueuedEvent[] {
    return [...this.offlineQueue];
  }

  /**
   * Clear the offline queue
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
  }

  /**
   * Get the number of queued events
   */
  getQueueSize(): number {
    return this.offlineQueue.length;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private createWebSocket(): void {
    try {
      this.ws = new WebSocket(this.url);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error("Failed to create WebSocket"));
      this.scheduleReconnect();
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (): void => {
      this.reconnectAttempts = 0;
      this.setConnectionState("connected");
      this.startHeartbeat();

      // Re-send subscriptions
      if (this.subscribedTypes.size > 0) {
        this.sendMessage({
          action: "subscribe",
          types: Array.from(this.subscribedTypes),
        });
      }
    };

    this.ws.onclose = (event): void => {
      this.stopHeartbeat();

      if (event.code !== 1000) {
        // Abnormal close
        this.handleError(
          new Error(`WebSocket closed: ${event.reason !== "" ? event.reason : "Unknown reason"}`)
        );
      }

      if (this.config.autoReconnect && this.connectionState !== "disconnected") {
        this.scheduleReconnect();
      } else {
        this.setConnectionState("disconnected");
      }
    };

    this.ws.onerror = (): void => {
      this.handleError(new Error("WebSocket error"));
    };

    this.ws.onmessage = (event): void => {
      this.handleMessage(event.data as string | ArrayBuffer | Blob);
    };
  }

  private handleMessage(data: string | ArrayBuffer | Blob): void {
    try {
      let message: string;
      if (typeof data === "string") {
        message = data;
      } else if (data instanceof ArrayBuffer) {
        message = new TextDecoder().decode(data);
      } else {
        // Blob - we can't synchronously convert, so skip
        return;
      }
      const event = JSON.parse(message) as ActivityEvent;

      // Update last heartbeat time
      if (event.type === "heartbeat") {
        this.lastHeartbeat = Date.now();
      }

      // Emit to listeners
      this.emitEvent(event);
    } catch {
      // Ignore invalid messages
    }
  }

  private emitEvent(event: ActivityEvent): void {
    // Emit to specific type listeners
    const typeListeners = this.eventListeners.get(event.type);
    if (typeListeners) {
      for (const listener of typeListeners) {
        try {
          listener(event);
        } catch {
          // Ignore listener errors
        }
      }
    }

    // Emit to wildcard listeners
    const wildcardListeners = this.eventListeners.get("*");
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        try {
          listener(event);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  private setConnectionState(state: WebSocketConnectionState): void {
    if (this.connectionState === state) return;

    this.connectionState = state;

    for (const listener of this.connectionStateListeners) {
      try {
        listener(state);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private handleError(error: Error): void {
    for (const listener of this.errorListeners) {
      try {
        listener(error);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setConnectionState("disconnected");
      this.handleError(new Error("Max reconnection attempts reached"));
      return;
    }

    this.setConnectionState("reconnecting");
    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.config.reconnectDelay *
        Math.pow(2, this.reconnectAttempts - 1) *
        (0.5 + Math.random() * 0.5),
      this.config.maxReconnectDelay
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.createWebSocket();
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = 0;
  }

  private startHeartbeat(): void {
    this.lastHeartbeat = Date.now();

    this.heartbeatInterval = setInterval(() => {
      // Send ping
      this.sendMessage({ action: "ping" });

      // Check for stale connection
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
        // Connection seems dead, force reconnect
        this.ws?.close(4000, "Heartbeat timeout");
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendMessage(message: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Queue an event for later processing (used when offline)
   */
  queueEvent(event: ActivityEvent): void {
    if (this.offlineQueue.length >= this.maxQueueSize) {
      // Remove oldest event
      this.offlineQueue.shift();
    }

    this.offlineQueue.push({
      event,
      timestamp: Date.now(),
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Thought WebSocket client
 */
export function createThoughtWebSocket(config: WebSocketClientConfig): ThoughtWebSocket {
  return new ThoughtWebSocket(config);
}

// ============================================================================
// Default Client Instance
// ============================================================================

let defaultWebSocket: ThoughtWebSocket | null = null;

/**
 * Get or create the default WebSocket client
 */
export function getDefaultWebSocket(): ThoughtWebSocket {
  if (defaultWebSocket === null) {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    const baseUrl = envBaseUrl ?? "http://localhost:3000";
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/api/v1/activity/live";
    defaultWebSocket = createThoughtWebSocket({ url: wsUrl });
  }
  return defaultWebSocket;
}

/**
 * Set the default WebSocket client
 */
export function setDefaultWebSocket(client: ThoughtWebSocket): void {
  defaultWebSocket = client;
}
