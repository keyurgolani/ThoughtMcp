/**
 * API Module Exports
 *
 * Re-exports all API client functionality.
 */

export {
  ThoughtMCPClient,
  createThoughtMCPClient,
  getDefaultClient,
  setDefaultClient,
  type ThoughtMCPClientConfig,
} from './client';

export {
  ThoughtMCPWebSocket,
  createThoughtMCPWebSocket,
  getDefaultWebSocket,
  setDefaultWebSocket,
  type ActivityEventListener,
  type ConnectionStateListener,
  type ErrorListener,
} from './websocket';
