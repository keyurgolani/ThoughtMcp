/**
 * API Module Exports
 *
 * Re-exports all API client functionality.
 */

export {
  ThoughtClient,
  createThoughtClient,
  getDefaultClient,
  setDefaultClient,
  type ThoughtClientConfig,
} from "./client";

export {
  ThoughtWebSocket,
  createThoughtWebSocket,
  getDefaultWebSocket,
  setDefaultWebSocket,
  type ActivityEventListener,
  type ConnectionStateListener,
  type ErrorListener,
} from "./websocket";

export {
  RequestDeduplicator,
  createRequestDeduplicator,
  generateRequestKey,
  getDefaultDeduplicator,
  setDefaultDeduplicator,
  type InFlightRequest,
  type RequestDeduplicatorOptions,
} from "./request-deduplicator";

export {
  WebSocketMemoryHandler,
  createWebSocketMemoryHandler,
  getDefaultMemoryHandler,
  setDefaultMemoryHandler,
  type MemoryCreatedEventData,
  type MemoryDeletedEventData,
  type MemoryEvent,
  type MemoryEventCallbacks,
  type MemoryEventType,
  type MemoryUpdatedEventData,
  type QueuedMemoryEvent,
  type WebSocketMemoryHandlerConfig,
} from "./websocket-memory-handler";
