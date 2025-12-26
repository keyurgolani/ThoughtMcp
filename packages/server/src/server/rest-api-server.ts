import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from "express";
import helmet from "helmet";
import { createServer, type Server } from "http";
import type { Socket } from "net";
import { Logger } from "../utils/logger.js";
import type { CognitiveCore } from "./cognitive-core.js";
import { createCorsMiddleware } from "./middleware/cors.js";
import { errorHandler } from "./middleware/error-handler.js";
import {
  createPerformanceMiddleware,
  getPerformanceStats,
  type PerformanceStats,
} from "./middleware/performance.js";
import { createRateLimitMiddleware } from "./middleware/rate-limit.js";
import {
  createResponseCacheMiddleware,
  getResponseCacheMetrics,
} from "./middleware/response-cache.js";
import { createActivityRoutes } from "./routes/activity.js";
import { createConfigRoutes } from "./routes/config.js";
import { createDocsRoutes } from "./routes/docs.js";
import { createEmotionRoutes } from "./routes/emotion.js";
import { createHealthRoutes } from "./routes/health.js";
import { createMemoryRoutes } from "./routes/memory.js";
import { createMetacognitionRoutes } from "./routes/metacognition.js";
import { createProblemRoutes } from "./routes/problem.js";
import { createReasoningRoutes } from "./routes/reasoning.js";
import { createSessionRoutes } from "./routes/session.js";
import { createUserRoutes } from "./routes/user.js";
import { ActivityWebSocketHandler, type WebSocketHandlerConfig } from "./websocket-handler.js";

/** REST API Server Configuration */
export interface RestApiServerConfig {
  port: number;
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  enableWebSocket: boolean;
  enableSSE: boolean;
  bodyLimit: string;
  requestTimeout: number;
  shutdownTimeout: number;
  /** WebSocket handler configuration */
  webSocketConfig?: Partial<WebSocketHandlerConfig>;
  /** Enable response caching for read-heavy endpoints */
  enableResponseCache: boolean;
  /** Response cache TTL in milliseconds */
  responseCacheTTL: number;
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  /** Slow request threshold in milliseconds */
  slowRequestThresholdMs: number;
}

/** Default REST API server configuration */
export const DEFAULT_REST_API_CONFIG: RestApiServerConfig = {
  port: 3000,
  corsOrigins: ["http://localhost:5173"],
  rateLimitWindow: 60000,
  rateLimitMax: 100,
  enableWebSocket: true,
  enableSSE: true,
  bodyLimit: "1mb",
  requestTimeout: 30000,
  shutdownTimeout: 10000,
  enableResponseCache: true,
  responseCacheTTL: 30000, // 30 seconds default
  enablePerformanceMonitoring: true,
  slowRequestThresholdMs: 200, // 200ms per requirement 17.1
};

/**
 * REST API Server - Provides HTTP endpoints for Thought's cognitive architecture.
 * Requirements: 16.1, 16.2
 */
export class RestApiServer {
  private app: Application;
  private server: Server | null = null;
  private cognitiveCore: CognitiveCore;
  private config: RestApiServerConfig;
  private isRunning: boolean = false;
  private isShuttingDown: boolean = false;
  private activeConnections: Set<Socket> = new Set();
  private startTime: Date | null = null;
  private webSocketHandler: ActivityWebSocketHandler | null = null;

  constructor(cognitiveCore: CognitiveCore, config: Partial<RestApiServerConfig> = {}) {
    this.cognitiveCore = cognitiveCore;
    this.config = { ...DEFAULT_REST_API_CONFIG, ...config };
    this.app = express();
    this.setupMiddleware();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security headers via helmet
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS middleware - Requirements: 18.1
    this.app.use(
      createCorsMiddleware({
        origins: this.config.corsOrigins,
      })
    );

    // Rate limiting middleware - Requirements: 18.2
    this.app.use(
      createRateLimitMiddleware({
        windowMs: this.config.rateLimitWindow,
        maxRequests: this.config.rateLimitMax,
        headers: true,
      })
    );

    // Performance monitoring middleware - Requirements: 17.1
    if (this.config.enablePerformanceMonitoring) {
      this.app.use(
        createPerformanceMiddleware({
          slowThresholdMs: this.config.slowRequestThresholdMs,
          logAllRequests: false,
        })
      );
    }

    // Response caching middleware - Requirements: 17.1
    if (this.config.enableResponseCache) {
      this.app.use(
        createResponseCacheMiddleware({
          defaultTTL: this.config.responseCacheTTL,
        })
      );
    }

    this.app.use(express.json({ limit: this.config.bodyLimit }));
    this.app.use(express.urlencoded({ extended: true, limit: this.config.bodyLimit }));

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.setTimeout(this.config.requestTimeout, () => {
        if (!res.headersSent) {
          res.status(408).json({
            success: false,
            error: "Request timeout",
            code: "REQUEST_TIMEOUT",
            suggestion: "Try reducing the complexity of your request",
          });
        }
      });
      next();
    });

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId =
        (req.headers["x-request-id"] as string | undefined) ?? this.generateRequestId();
      res.setHeader("X-Request-Id", requestId);
      (req as Request & { requestId: string }).requestId = requestId;
      next();
    });

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - startTime;
        Logger.debug(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  private setupErrorHandling(): void {
    // Error handlers mounted after routes via mountErrorHandlers()
  }

  /**
   * Mount all API routes
   * Should be called after middleware setup and before error handlers
   */
  mountRoutes(): void {
    // Memory routes - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
    this.app.use("/api/v1/memory", createMemoryRoutes(this.cognitiveCore));

    // Think routes - Requirements: 3.1, 3.2, 3.3
    this.app.use("/api/v1/think", createReasoningRoutes(this.cognitiveCore));

    // Reasoning routes - Requirements: 4.1, 4.2, 4.3, 4.4
    // Mount at /api/v1/reasoning for parallel reasoning endpoints
    this.app.use("/api/v1/reasoning", createReasoningRoutes(this.cognitiveCore));

    // Metacognition routes - Requirements: 5.1, 5.2, 5.3
    this.app.use("/api/v1/metacognition", createMetacognitionRoutes(this.cognitiveCore));

    // Problem routes - Requirements: 6.1, 6.2, 6.3
    this.app.use("/api/v1/problem", createProblemRoutes(this.cognitiveCore));

    // Activity routes - Requirements: 7.2
    this.app.use("/api/v1/activity", createActivityRoutes(this.cognitiveCore));

    // Emotion routes - Requirements: 8.1, 8.2, 8.3
    this.app.use("/api/v1/emotion", createEmotionRoutes(this.cognitiveCore));

    // Session routes - Requirements: 9.1, 9.2, 9.3
    this.app.use("/api/v1/session", createSessionRoutes(this.cognitiveCore));

    // Config routes - Requirements: 10.1, 10.2
    this.app.use("/api/v1/config", createConfigRoutes(this.cognitiveCore));

    // Health routes - Requirements: 13.1, 13.2, 13.3
    this.app.use("/api/v1/health", createHealthRoutes(this.cognitiveCore));

    // Docs routes - Requirements: 14.1, 14.3
    this.app.use("/api/v1/docs", createDocsRoutes(this.cognitiveCore));

    // User routes - Requirements: Phase 3
    this.app.use("/api/v1/user", createUserRoutes(this.cognitiveCore));

    Logger.debug("API routes mounted");
  }

  mountErrorHandlers(): void {
    // 404 handler for unmatched routes
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.path}`,
        code: "NOT_FOUND",
        suggestion: "Check the API documentation at /api/v1/docs",
      });
    });

    // Global error handler - uses centralized error handling middleware
    this.app.use(errorHandler);
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  getApp(): Application {
    return this.app;
  }
  getRouter(): Router {
    return express.Router();
  }
  getCognitiveCore(): CognitiveCore {
    return this.cognitiveCore;
  }
  getIsRunning(): boolean {
    return this.isRunning;
  }
  getUptime(): number {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }
  getConfig(): RestApiServerConfig {
    return { ...this.config };
  }
  getPort(): number {
    return this.config.port;
  }
  /**
   * Get the WebSocket handler for broadcasting activity events
   * Requirements: 7.1, 7.3
   */
  getWebSocketHandler(): ActivityWebSocketHandler | null {
    return this.webSocketHandler;
  }

  /**
   * Get performance statistics for monitoring
   * Requirements: 17.1
   */
  getPerformanceStats(): PerformanceStats {
    return getPerformanceStats();
  }

  /**
   * Get response cache metrics for monitoring
   * Requirements: 17.1
   */
  getCacheMetrics(): { hits: number; misses: number; hitRate: number; size: number } {
    return getResponseCacheMetrics();
  }

  async start(): Promise<void> {
    if (this.isRunning) throw new Error("REST API server is already running");
    if (this.isShuttingDown) throw new Error("REST API server is shutting down");

    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.app);

        this.server.on("connection", (socket: Socket) => {
          this.activeConnections.add(socket);
          socket.on("close", () => this.activeConnections.delete(socket));
        });

        this.server.on("error", (error: NodeJS.ErrnoException) => {
          if (error.code === "EADDRINUSE") {
            reject(new Error(`Port ${this.config.port} is already in use`));
          } else {
            reject(error);
          }
        });

        this.server.listen(this.config.port, () => {
          this.isRunning = true;
          this.startTime = new Date();

          // Attach WebSocket handler if enabled - Requirements: 7.1
          if (this.config.enableWebSocket && this.server) {
            this.webSocketHandler = new ActivityWebSocketHandler(this.config.webSocketConfig);
            this.webSocketHandler.attach(this.server);
            Logger.info("WebSocket handler attached for live activity");
          }

          Logger.info(`REST API server started on port ${this.config.port}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) throw new Error("REST API server is not running");
    if (this.isShuttingDown) throw new Error("REST API server is already shutting down");

    this.isShuttingDown = true;
    Logger.info("Initiating REST API server shutdown...");

    // Close WebSocket handler first - Requirements: 7.1
    if (this.webSocketHandler) {
      this.webSocketHandler.close();
      this.webSocketHandler = null;
      Logger.info("WebSocket handler closed");
    }

    return new Promise((resolve, reject) => {
      const shutdownTimer = setTimeout(() => {
        Logger.warn("Graceful shutdown timeout exceeded, forcing close");
        this.forceCloseConnections();
        this.finalizeShutdown(resolve);
      }, this.config.shutdownTimeout);

      if (this.server) {
        this.server.close((err?: Error) => {
          clearTimeout(shutdownTimer);
          if (err) {
            Logger.error("Error during server close", err);
            reject(err);
            return;
          }
          this.finalizeShutdown(resolve);
        });
      }

      this.closeConnectionsGracefully();
    });
  }

  private closeConnectionsGracefully(): void {
    for (const socket of this.activeConnections) socket.end();
  }

  private forceCloseConnections(): void {
    for (const socket of this.activeConnections) socket.destroy();
    this.activeConnections.clear();
  }

  private finalizeShutdown(resolve: () => void): void {
    this.isRunning = false;
    this.isShuttingDown = false;
    this.server = null;
    this.startTime = null;
    Logger.info("REST API server stopped");
    resolve();
  }

  setupGracefulShutdown(): void {
    const shutdown = async (signal: string): Promise<void> => {
      Logger.info(`Received ${signal}, initiating graceful shutdown...`);
      try {
        if (this.isRunning) await this.stop();
        process.exit(0);
      } catch (error) {
        Logger.error("Error during graceful shutdown", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });
    process.on("uncaughtException", (error) => {
      Logger.error("Uncaught exception", error);
      void shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason) => {
      Logger.error("Unhandled rejection", reason);
      void shutdown("unhandledRejection");
    });
  }
}
