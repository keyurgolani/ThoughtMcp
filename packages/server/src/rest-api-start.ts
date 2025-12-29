#!/usr/bin/env node

/**
 * REST API Server Entry Point
 *
 * Standalone entry point for starting the REST API server.
 * This script initializes the cognitive core and starts the REST API server
 * to run alongside the MCP server in the same Docker container.
 *
 * Requirements: 16.1, 16.2, 16.3
 *
 * Environment Variables:
 *   REST_API_PORT   - Port for REST API server (default: 3000)
 *   CORS_ORIGINS    - Comma-separated list of allowed CORS origins (default: http://localhost:5173)
 *   DB_HOST         - Database host (default: localhost)
 *   DB_PORT         - Database port (default: 5432)
 *   DB_NAME         - Database name (default: thought)
 *   DB_USER         - Database user (default: postgres)
 *   DB_PASSWORD     - Database password
 *   OLLAMA_HOST     - Ollama API URL (default: http://localhost:11434)
 *   EMBEDDING_MODEL - Embedding model name (default: nomic-embed-text)
 */

import { BiasPatternRecognizer } from "./bias/bias-pattern-recognizer.js";
import { MultiDimensionalConfidenceAssessor } from "./confidence/multi-dimensional-assessor.js";
import { DatabaseConnectionManager } from "./database/connection-manager.js";
import { GenericLRUCache } from "./embeddings/cache.js";
import { EmbeddingEngine } from "./embeddings/embedding-engine.js";
import { EmbeddingStorage } from "./embeddings/embedding-storage.js";
import { OllamaEmbeddingModel } from "./embeddings/models/ollama-model.js";
import { CircumplexEmotionAnalyzer } from "./emotion/circumplex-analyzer.js";
import type { EmotionModel } from "./emotion/types.js";
import { FrameworkRegistry } from "./framework/framework-registry.js";
import { FrameworkSelector } from "./framework/framework-selector.js";
import { ProblemClassifier } from "./framework/problem-classifier.js";
import { WaypointGraphBuilder } from "./graph/waypoint-builder.js";
import { MemoryRepository } from "./memory/memory-repository.js";
import { MemoryAugmentedReasoning } from "./reasoning/memory-augmented-reasoning.js";
import { ParallelReasoningOrchestrator } from "./reasoning/orchestrator.js";
import { ProblemDecomposer } from "./reasoning/problem-decomposer.js";
import {
  type CognitiveCore,
  initializeSharedCore,
  isSharedCoreInitialized,
} from "./server/cognitive-core.js";
import { RestApiServer, type RestApiServerConfig } from "./server/rest-api-server.js";
import { Logger } from "./utils/logger.js";

/**
 * Parse CORS origins from environment variable
 * Supports comma-separated list of origins
 */
function parseCorsOrigins(originsEnv: string | undefined): string[] {
  if (!originsEnv) {
    return ["http://localhost:5173"];
  }
  return originsEnv.split(",").map((origin) => origin.trim());
}

/**
 * Initialize the cognitive core with all components
 * Requirements: 16.2, 16.4
 */
async function initializeCognitiveCore(): Promise<CognitiveCore> {
  Logger.info("Initializing cognitive core for REST API...");

  // Initialize database connection
  const databaseManager = new DatabaseConnectionManager({
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "5432"),
    database: process.env.DB_NAME ?? "thought",
    user: process.env.DB_USER ?? "postgres",
    password: process.env.DB_PASSWORD ?? "",
    poolSize: parseInt(process.env.DB_POOL_SIZE ?? "20"),
    connectionTimeout: 5000,
    idleTimeout: 30000,
  });

  await databaseManager.connect();
  Logger.info("Database connection established");

  // Initialize embedding engine
  const embeddingModel = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
  const embeddingDimension = parseInt(process.env.EMBEDDING_DIMENSION ?? "768");
  const embeddingTimeout = parseInt(process.env.EMBEDDING_TIMEOUT ?? "60000");

  const model = new OllamaEmbeddingModel({
    host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
    modelName: embeddingModel,
    dimension: embeddingDimension,
    timeout: embeddingTimeout,
    maxRetries: 3,
  });

  const cache = new GenericLRUCache<number[]>(10000, 3600000);
  const embeddingEngine = new EmbeddingEngine(model, cache);
  Logger.info("Embedding engine initialized");

  // Initialize embedding storage and graph builder
  const embeddingStorage = new EmbeddingStorage(databaseManager);
  const graphBuilder = new WaypointGraphBuilder(databaseManager, embeddingStorage, {
    similarityThreshold: 0.7,
    maxLinksPerNode: 3,
    minLinksPerNode: 1,
    enableBidirectional: true,
  });

  // Initialize memory repository
  const memoryRepository = new MemoryRepository(
    databaseManager,
    embeddingEngine,
    graphBuilder,
    embeddingStorage
  );
  Logger.info("Memory repository initialized");

  // Initialize reasoning components
  const reasoningOrchestrator = new ParallelReasoningOrchestrator();
  const problemDecomposer = new ProblemDecomposer();
  const memoryAugmentedReasoning = new MemoryAugmentedReasoning(memoryRepository, {
    minSalience: 0.5,
    maxMemories: 10,
    minStrength: 0.3,
  });
  Logger.info("Reasoning components initialized");

  // Initialize framework selector
  const classifier = new ProblemClassifier();
  const registry = FrameworkRegistry.getInstance();
  const frameworkSelector = new FrameworkSelector(classifier, registry);
  Logger.info("Framework selector initialized");

  // Initialize metacognitive components
  const confidenceAssessor = new MultiDimensionalConfidenceAssessor();
  const biasDetector = new BiasPatternRecognizer();
  Logger.info("Metacognitive components initialized");

  // Initialize emotion analyzer
  const emotionModel: EmotionModel = {
    name: "circumplex-v1",
    version: "1.0.0",
  };
  const emotionAnalyzer = new CircumplexEmotionAnalyzer(emotionModel);
  Logger.info("Emotion analyzer initialized");

  // Create cognitive core
  const cognitiveCore: CognitiveCore = {
    memoryRepository,
    reasoningOrchestrator,
    frameworkSelector,
    confidenceAssessor,
    biasDetector,
    emotionAnalyzer,
    problemDecomposer,
    memoryAugmentedReasoning,
  };

  // Initialize shared core singleton
  if (!isSharedCoreInitialized()) {
    initializeSharedCore(cognitiveCore);
  }

  Logger.info("Cognitive core initialized successfully");
  return cognitiveCore;
}

/**
 * Main entry point for REST API server
 * Requirements: 16.1, 16.3
 */
async function main(): Promise<void> {
  Logger.info("Starting REST API server...");

  try {
    // Initialize cognitive core first (Requirements: 16.2)
    const cognitiveCore = await initializeCognitiveCore();

    // Parse configuration from environment
    const port = parseInt(process.env.REST_API_PORT ?? "3000");
    const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

    const config: Partial<RestApiServerConfig> = {
      port,
      corsOrigins,
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW ?? "60000"),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? "100"),
      enableWebSocket: process.env.ENABLE_WEBSOCKET !== "false",
      enableSSE: process.env.ENABLE_SSE !== "false",
    };

    Logger.info(`REST API configuration: port=${port}, corsOrigins=${corsOrigins.join(",")}`);

    // Create and start REST API server
    const server = new RestApiServer(cognitiveCore, config);

    // Mount routes and error handlers
    server.mountRoutes();
    server.mountErrorHandlers();

    // Setup graceful shutdown
    server.setupGracefulShutdown();

    // Start the server
    await server.start();

    Logger.info(`REST API server started successfully on port ${port}`);
    Logger.info("REST API is ready to accept connections");
  } catch (error) {
    Logger.error("Failed to start REST API server:", error);
    process.exit(1);
  }
}

// Run main if executed directly
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  (process.argv[1]?.endsWith("rest-api-start.js") ?? false);

if (isMainModule) {
  main().catch((error) => {
    Logger.error("Fatal error:", error);
    process.exit(1);
  });
}

export { initializeCognitiveCore, main, parseCorsOrigins };
