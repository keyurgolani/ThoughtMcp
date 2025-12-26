/**
 * MCP Server Module
 *
 * Exports for the MCP server, REST API server, and related components.
 */

export {
  getSharedCore,
  initializeSharedCore,
  isSharedCoreInitialized,
  resetSharedCore,
  type CognitiveCore,
} from "./cognitive-core";
export { CognitiveMCPServer } from "./mcp-server";
export {
  createCorsMiddleware,
  createRateLimitMiddleware,
  createRateLimiterInstance,
  parseCorsOrigins,
  type CorsConfig,
  type RateLimitMiddlewareConfig,
} from "./middleware/index.js";
export {
  DEFAULT_REST_API_CONFIG,
  RestApiServer,
  type RestApiServerConfig,
} from "./rest-api-server";
export { ToolRegistry } from "./tool-registry";
export type {
  ComponentHealth,
  ConnectionStatus,
  HealthMetrics,
  HealthStatus,
  MCPResponse,
  MCPResponseMetadata,
  MCPTool,
  ServerConfig,
} from "./types";
export {
  ActivityWebSocketHandler,
  DEFAULT_WEBSOCKET_CONFIG,
  createLoadChangeEvent,
  createMemoryOperationEvent,
  createReasoningUpdateEvent,
  createSessionEvent,
  createSystemEvent,
  type ActivityEvent,
  type ActivityEventType,
  type LoadChangeData,
  type MemoryOperationData,
  type ReasoningUpdateData,
  type SessionEventData,
  type SystemEventData,
  type WebSocketHandlerConfig,
} from "./websocket-handler.js";
