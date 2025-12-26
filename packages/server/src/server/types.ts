/**
 * MCP Server Types
 *
 * Type definitions for the MCP server, tools, and responses.
 */

/**
 * MCP Tool definition
 */
export interface MCPTool {
  /** Unique tool name */
  name: string;

  /** Human-readable description */
  description: string;

  /** JSON Schema for input validation */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };

  /** Tool handler function */
  handler: (params: unknown) => Promise<MCPResponse>;
}

/**
 * MCP Response format
 * @template T - Type of the response data, defaults to flexible record type
 */
export interface MCPResponse<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Whether the operation succeeded */
  success: boolean;

  /**
   * Response data (if successful) - shape varies by tool
   */
  data?: T;

  /** Error message (if failed) */
  error?: string;

  /** Suggestion for fixing error */
  suggestion?: string;

  /** Response metadata */
  metadata?: MCPResponseMetadata;
}

/**
 * Response metadata
 */
export interface MCPResponseMetadata {
  /** Response timestamp */
  timestamp: string;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Cognitive components used */
  componentsUsed: string[];

  /** Confidence level (0-1) */
  confidence?: number;

  /** Evidence source indicator for assess_confidence tool */
  evidenceSource?: "extracted" | "provided" | "none";

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Health status
 */
export interface HealthStatus {
  /** Overall health status */
  healthy: boolean;

  /** Whether server is ready to accept requests */
  ready: boolean;

  /** Whether server is in degraded mode */
  degraded?: boolean;

  /** Timestamp of health check */
  timestamp: string;

  /** Component health status */
  components: Record<string, ComponentHealth>;

  /** Unavailable components (if degraded) */
  unavailableComponents?: string[];

  /** Error messages */
  errors?: string[];

  /** Performance metrics */
  metrics: HealthMetrics;
}

/**
 * Component health status
 */
export type ComponentHealth = "healthy" | "unhealthy" | "degraded" | "unknown";

/**
 * Health metrics
 */
export interface HealthMetrics {
  /** Server uptime in milliseconds */
  uptime: number;

  /** Total request count */
  requestCount: number;

  /** Average response time in milliseconds */
  averageResponseTime?: number;

  /** Error rate (0-1) */
  errorRate?: number;

  /** Memory usage in bytes */
  memoryUsage?: number;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  /** Whether connected */
  connected: boolean;

  /** Connection state */
  state: "connected" | "disconnected" | "connecting" | "error";

  /** Last connection time */
  lastConnected?: string;

  /** Connection error (if any) */
  error?: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  /** Server port */
  port?: number;

  /** Server host */
  host?: string;

  /** Maximum concurrent requests */
  maxConcurrentRequests?: number;

  /** Request timeout in milliseconds */
  requestTimeout?: number;

  /** Enable graceful shutdown */
  gracefulShutdown?: boolean;

  /** Shutdown timeout in milliseconds */
  shutdownTimeout?: number;
}
