/**
 * Shared WebSocket Handler
 *
 * Provides a singleton pattern for accessing the WebSocket handler
 * from any component that needs to broadcast events.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import type { ActivityWebSocketHandler } from "./websocket-handler.js";

/** Singleton instance of the shared WebSocket handler */
let sharedWebSocketHandler: ActivityWebSocketHandler | null = null;

/**
 * Get the shared WebSocket handler instance
 *
 * This function returns the singleton instance of the WebSocket handler.
 * Returns null if no handler has been set (WebSocket not enabled).
 *
 * @returns The shared WebSocket handler instance or null
 */
export function getSharedWebSocketHandler(): ActivityWebSocketHandler | null {
  return sharedWebSocketHandler;
}

/**
 * Set the shared WebSocket handler
 *
 * This function sets the singleton instance of the WebSocket handler.
 * Should be called when the REST API server initializes the WebSocket handler.
 *
 * @param handler - The WebSocket handler instance to share
 */
export function setSharedWebSocketHandler(handler: ActivityWebSocketHandler | null): void {
  sharedWebSocketHandler = handler;
}

/**
 * Reset the shared WebSocket handler (for testing purposes)
 *
 * This function clears the singleton instance of the WebSocket handler.
 * Should only be used in tests.
 */
export function resetSharedWebSocketHandler(): void {
  sharedWebSocketHandler = null;
}

/**
 * Check if the shared WebSocket handler is available
 *
 * @returns true if the WebSocket handler has been set and is running
 */
export function isWebSocketHandlerAvailable(): boolean {
  return sharedWebSocketHandler?.getIsRunning() ?? false;
}
