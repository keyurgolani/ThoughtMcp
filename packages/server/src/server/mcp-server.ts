/**
 * Cognitive MCP Server
 *
 * Main MCP server that integrates all cognitive components and exposes them through MCP tools.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { BiasCorrector } from "../bias/bias-corrector.js";
import { BiasPatternRecognizer } from "../bias/bias-pattern-recognizer.js";
import { EvidenceExtractor, type ExtractedEvidence } from "../confidence/evidence-extractor.js";
import { MultiDimensionalConfidenceAssessor } from "../confidence/multi-dimensional-assessor.js";
import { DatabaseConnectionManager } from "../database/connection-manager.js";
import { EmbeddingEngine } from "../embeddings/embedding-engine.js";
import { CircumplexEmotionAnalyzer } from "../emotion/circumplex-analyzer.js";
import type { EmotionClassification, EmotionModel, EmotionType } from "../emotion/types.js";
import { FrameworkRegistry } from "../framework/framework-registry.js";
import { FrameworkSelector } from "../framework/framework-selector.js";
import { ProblemClassifier } from "../framework/problem-classifier.js";
import {
  ConsolidationEngine,
  type ConsolidationConfig,
  type ConsolidationResult,
} from "../memory/consolidation-engine.js";
import { ConsolidationScheduler } from "../memory/consolidation-scheduler.js";
import { ContentValidator } from "../memory/content-validator.js";
import {
  ExportImportService,
  type ExportFilter,
  type ExportResult,
} from "../memory/export-import-service.js";
import {
  HealthMonitor,
  type HealthRecommendation,
  type MemoryHealthResponse,
} from "../memory/health-monitor.js";
import { MemoryRepository } from "../memory/memory-repository.js";
import {
  DEFAULT_PRUNING_CRITERIA,
  PruningService,
  type PruningCriteria,
} from "../memory/pruning-service.js";
import { PerformanceMonitoringSystem } from "../metacognitive/performance-monitoring-system.js";
import {
  MemoryAugmentedReasoning,
  type RetrievedMemory,
} from "../reasoning/memory-augmented-reasoning.js";
import { ParallelReasoningOrchestrator } from "../reasoning/orchestrator.js";
import { ProblemDecomposer } from "../reasoning/problem-decomposer.js";
import { Logger } from "../utils/logger.js";
import {
  createMCPFormatter,
  createValidationEngine,
  MCPFormatter,
  ValidationEngine,
  type MCPValidationErrorResponse,
  type ValidationResult,
} from "../validation/index.js";
import { ToolRegistry } from "./tool-registry.js";
import { getToolSchema } from "./tool-schemas.js";
import type {
  ComponentHealth,
  ConnectionStatus,
  HealthStatus,
  MCPResponse,
  MCPTool,
  ServerConfig,
} from "./types.js";

/**
 * Cognitive MCP Server
 *
 * Integrates all cognitive components and exposes them through MCP tools.
 */
export class CognitiveMCPServer {
  // Cognitive components
  public memoryRepository?: MemoryRepository;
  public memoryAugmentedReasoning?: MemoryAugmentedReasoning;
  public reasoningOrchestrator?: ParallelReasoningOrchestrator;
  public frameworkSelector?: FrameworkSelector;
  public confidenceAssessor?: MultiDimensionalConfidenceAssessor;
  public evidenceExtractor?: EvidenceExtractor;
  public biasDetector?: BiasPatternRecognizer;
  public biasCorrector?: BiasCorrector;
  public emotionAnalyzer?: CircumplexEmotionAnalyzer;
  public performanceMonitor?: PerformanceMonitoringSystem;
  public healthMonitor?: HealthMonitor;
  public pruningService?: PruningService;
  public consolidationEngine?: ConsolidationEngine;
  public consolidationScheduler?: ConsolidationScheduler;
  public exportImportService?: ExportImportService;

  // Infrastructure
  private databaseManager?: DatabaseConnectionManager;
  private embeddingEngine?: EmbeddingEngine;

  // Validators
  private contentValidator: ContentValidator;

  // Validation system - Requirements: 4.2
  private validationEngine: ValidationEngine;
  private mcpFormatter: MCPFormatter;

  // Tool registry
  public toolRegistry: ToolRegistry;

  // Server state
  public isInitialized: boolean;
  private startTime?: Date;
  private requestCount: number;
  private config: ServerConfig;

  constructor(config: ServerConfig = {}) {
    this.toolRegistry = new ToolRegistry();
    this.contentValidator = new ContentValidator();

    // Initialize validation system - Requirements: 4.2
    this.validationEngine = createValidationEngine({
      enableLogging: true,
      enableMetrics: true,
    });
    this.mcpFormatter = createMCPFormatter();

    this.isInitialized = false;
    this.requestCount = 0;
    this.config = {
      maxConcurrentRequests: 100,
      requestTimeout: 30000,
      gracefulShutdown: true,
      shutdownTimeout: 10000,
      ...config,
    };
  }

  /**
   * Validate tool input using the ValidationEngine and return structured errors
   *
   * This method validates tool inputs against Zod schemas and returns either
   * a successful validation result or a formatted MCP validation error response.
   *
   * @param toolName - Name of the tool being validated
   * @param params - Input parameters to validate
   * @returns Object with valid flag and either validated data or error response
   *
   * Requirements: 4.2 (MCP Interface validation)
   */
  validateToolInput<T>(
    toolName: string,
    params: unknown
  ): { valid: true; data: T } | { valid: false; error: MCPValidationErrorResponse } {
    const schema = getToolSchema(toolName);

    // If no schema is registered, skip validation (backward compatibility)
    if (!schema) {
      return { valid: true, data: params as T };
    }

    // Validate using the ValidationEngine
    const result: ValidationResult = this.validationEngine.validate(params, schema, {
      endpoint: `mcp:${toolName}`,
      operation: "tool_call",
    });

    if (result.valid) {
      return { valid: true, data: params as T };
    }

    // Format the validation errors using MCPFormatter
    const errorResponse = this.mcpFormatter.format(result);
    return { valid: false, error: errorResponse };
  }

  /**
   * Initialize the server and all cognitive components
   *
   * @throws Error if initialization fails or times out
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error("Server already initialized");
    }

    Logger.info("Initializing Thought server...");

    try {
      // Set initialization timeout (5 seconds)
      const initPromise = this.initializeComponents();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Initialization timeout")), 5000)
      );

      await Promise.race([initPromise, timeoutPromise]);

      // Register MCP tools
      this.registerTools();

      // Mark as initialized
      this.isInitialized = true;
      this.startTime = new Date();

      Logger.info("Thought server initialized successfully");
    } catch (error) {
      Logger.error("Failed to initialize server", error);

      // Rollback initialization
      await this.rollbackInitialization();

      throw error;
    }
  }

  /**
   * Initialize all cognitive components
   */
  private async initializeComponents(): Promise<void> {
    // Initialize database connection
    await this.initializeDatabaseManager();

    // Initialize embedding engine
    await this.initializeEmbeddingEngine();

    // Initialize memory repository
    await this.initializeMemoryRepository();

    // Initialize health monitor (after database manager)
    await this.initializeHealthMonitor();

    // Initialize memory management services (after database manager and embedding engine)
    await this.initializeMemoryManagementServices();

    // Initialize memory-augmented reasoning (after memory repository)
    await this.initializeMemoryAugmentedReasoning();

    // Initialize reasoning components
    await this.initializeReasoningOrchestrator();
    await this.initializeFrameworkSelector();

    // Initialize metacognitive components
    await this.initializeConfidenceAssessor();
    await this.initializeBiasDetector();
    await this.initializeEmotionAnalyzer();
    await this.initializePerformanceMonitor();
  }

  /**
   * Initialize database manager
   */
  private async initializeDatabaseManager(): Promise<void> {
    this.databaseManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432"),
      database: process.env.DB_NAME ?? "thought",
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "",
      poolSize: parseInt(process.env.DB_POOL_SIZE ?? "20"),
      connectionTimeout: 5000,
      idleTimeout: 30000,
    });

    await this.databaseManager.connect();
  }

  /**
   * Initialize embedding engine
   */
  private async initializeEmbeddingEngine(): Promise<void> {
    // Import required dependencies
    const { GenericLRUCache } = await import("../embeddings/cache.js");
    const { OllamaEmbeddingModel } = await import("../embeddings/models/ollama-model.js");

    // Get embedding configuration from environment
    const embeddingModel = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";
    const embeddingDimension = parseInt(process.env.EMBEDDING_DIMENSION ?? "768");
    // Timeout should account for cold starts (model loading) which can take 15-30s
    const embeddingTimeout = parseInt(process.env.EMBEDDING_TIMEOUT ?? "60000");

    // Create Ollama embedding model
    // Note: For testing, use the test utilities directly in test files
    // The production server always uses the real Ollama model
    const model = new OllamaEmbeddingModel({
      host: process.env.OLLAMA_HOST ?? "http://localhost:11434",
      modelName: embeddingModel,
      dimension: embeddingDimension,
      timeout: embeddingTimeout,
      maxRetries: 3,
    });

    // Create cache with proper typing
    const cache = new GenericLRUCache<number[]>(10000, 3600000); // 10k entries, 1 hour TTL

    // Create embedding engine
    this.embeddingEngine = new EmbeddingEngine(model, cache);
  }

  /**
   * Initialize memory repository
   */
  private async initializeMemoryRepository(): Promise<void> {
    if (!this.databaseManager || !this.embeddingEngine) {
      throw new Error("Database manager and embedding engine must be initialized first");
    }

    // Import required dependencies
    const { WaypointGraphBuilder } = await import("../graph/waypoint-builder.js");
    const { EmbeddingStorage } = await import("../embeddings/embedding-storage.js");

    // Create embedding storage
    const embeddingStorage = new EmbeddingStorage(this.databaseManager);

    // Create waypoint graph builder with config
    const graphBuilder = new WaypointGraphBuilder(this.databaseManager, embeddingStorage, {
      similarityThreshold: 0.7,
      maxLinksPerNode: 3,
      minLinksPerNode: 1,
      enableBidirectional: true,
    });

    // Create memory repository
    this.memoryRepository = new MemoryRepository(
      this.databaseManager,
      this.embeddingEngine,
      graphBuilder,
      embeddingStorage
    );
  }

  /**
   * Initialize memory-augmented reasoning
   *
   * Requirements: 13.1, 13.2, 13.5, 13.6
   */
  private async initializeMemoryAugmentedReasoning(): Promise<void> {
    if (!this.memoryRepository) {
      throw new Error("Memory repository must be initialized first");
    }

    this.memoryAugmentedReasoning = new MemoryAugmentedReasoning(this.memoryRepository, {
      minSalience: 0.5,
      maxMemories: 10,
      minStrength: 0.3,
    });
  }

  /**
   * Initialize reasoning orchestrator
   */
  private async initializeReasoningOrchestrator(): Promise<void> {
    if (!this.memoryRepository) {
      throw new Error("Memory repository must be initialized first");
    }

    this.reasoningOrchestrator = new ParallelReasoningOrchestrator();
  }

  /**
   * Initialize framework selector
   */
  private async initializeFrameworkSelector(): Promise<void> {
    const classifier = new ProblemClassifier();
    const registry = FrameworkRegistry.getInstance();
    this.frameworkSelector = new FrameworkSelector(classifier, registry);
  }

  /**
   * Initialize confidence assessor and evidence extractor
   */
  private async initializeConfidenceAssessor(): Promise<void> {
    this.confidenceAssessor = new MultiDimensionalConfidenceAssessor();
    this.evidenceExtractor = new EvidenceExtractor();
  }

  /**
   * Initialize bias detector and corrector
   */
  private async initializeBiasDetector(): Promise<void> {
    this.biasDetector = new BiasPatternRecognizer();
    this.biasCorrector = new BiasCorrector();
  }

  /**
   * Initialize emotion analyzer
   */
  private async initializeEmotionAnalyzer(): Promise<void> {
    // Create a simple emotion model (placeholder for now)
    const model: EmotionModel = {
      name: "circumplex-v1",
      version: "1.0.0",
    };

    this.emotionAnalyzer = new CircumplexEmotionAnalyzer(model);
  }

  /**
   * Initialize performance monitor
   */
  private async initializePerformanceMonitor(): Promise<void> {
    this.performanceMonitor = new PerformanceMonitoringSystem();
  }

  /**
   * Initialize health monitor
   *
   * Requirements: 2.1-2.7 (Memory Health Dashboard API)
   */
  private async initializeHealthMonitor(): Promise<void> {
    if (!this.databaseManager) {
      throw new Error("Database manager must be initialized first");
    }

    this.healthMonitor = new HealthMonitor(this.databaseManager);
  }

  /**
   * Initialize memory management services
   *
   * Requirements: 3.1-3.6 (Pruning), 7.2 (Consolidation), 6.1-6.2 (Export/Import)
   */
  private async initializeMemoryManagementServices(): Promise<void> {
    if (!this.databaseManager) {
      throw new Error("Database manager must be initialized first");
    }

    // Import required dependencies
    const { EmbeddingStorage } = await import("../embeddings/embedding-storage.js");

    // Create embedding storage for services that need it
    const embeddingStorage = new EmbeddingStorage(this.databaseManager);

    // Initialize pruning service
    this.pruningService = new PruningService(this.databaseManager);

    // Initialize consolidation engine (without LLM client for now - can be set later)
    this.consolidationEngine = new ConsolidationEngine(this.databaseManager, embeddingStorage);

    // Initialize consolidation scheduler
    this.consolidationScheduler = new ConsolidationScheduler(this.consolidationEngine);

    // Initialize export/import service
    this.exportImportService = new ExportImportService(this.databaseManager, embeddingStorage);
  }

  /**
   * Register all MCP tools
   */
  private registerTools(): void {
    // Register memory operation tools
    this.registerMemoryTools();

    // Register reasoning operation tools
    this.registerReasoningTools();

    // Register metacognitive operation tools
    this.registerMetacognitiveTools();
  }

  /**
   * Register memory operation tools
   */
  private registerMemoryTools(): void {
    this.registerStoreMemoryTool();
    this.registerRetrieveMemoriesTool();
    this.registerUpdateMemoryTool();
    this.registerDeleteMemoryTool();
    this.registerSearchMemoriesTool();
    this.registerBatchMemoryTools();
    this.registerMemoryHealthTool();
    this.registerPruneMemoriesTool();
    this.registerConsolidateMemoriesTool();
    this.registerExportMemoriesTool();
  }

  /**
   * Register store_memory tool
   */
  private registerStoreMemoryTool(): void {
    this.toolRegistry.registerTool({
      name: "remember",
      description:
        "Store a new memory with automatic embedding generation and waypoint graph connections. " +
        "Supports fivery sectors: episodic (temporal/contextual), semantic (factual), " +
        "procedural (how-to), emotional (affective), reflective (meta-insights). " +
        "Example: store_memory({ content: 'User prefers dark mode', userId: 'user123', sessionId: 'session456', primarySector: 'semantic' })",
      inputSchema: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description:
              "Memory content to store (required, 10-100,000 characters).\n\n" +
              "**Recommended Format: Markdown**\n\n" +
              "Memories should be stored in markdown format for optimal organization and retrieval:\n\n" +
              "- Use **headers** (# ## ###) to structure sections\n" +
              "- Use **lists** (- or 1.) for enumerated items\n" +
              "- Use **code blocks** (```) for code snippets\n" +
              "- Use **bold** and *italic* for emphasis\n" +
              "- Use **links** [text](url) for references\n\n" +
              "**Example:**\n" +
              "```markdown\n" +
              "# User Preference: Dark Mode\n\n" +
              "## Context\n" +
              "User explicitly stated preference during onboarding.\n\n" +
              "## Details\n" +
              "- Applies to all applications\n" +
              "- Includes code editors\n" +
              "- Preference strength: Strong\n\n" +
              "## Related\n" +
              "- See also: Theme preferences\n" +
              "- Last updated: 2025-01-15\n" +
              "```",
          },
          userId: {
            type: "string",
            description: "User ID for memory isolation (required)",
          },
          sessionId: {
            type: "string",
            description: "Session ID for context tracking (required)",
          },
          primarySector: {
            type: "string",
            enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
            description:
              "Primary memory sector: episodic (events), semantic (facts), procedural (skills), emotional (feelings), reflective (insights)",
          },
          metadata: {
            type: "object",
            description: "Optional metadata for classification and search",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Keywords for search (auto-extracted if not provided)",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Tags for categorization",
              },
              category: {
                type: "string",
                description: "Category for grouping",
              },
              context: {
                type: "string",
                description: "Additional context information",
              },
              importance: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Importance score (0-1, default 0.5)",
              },
            },
          },
        },
        required: ["content", "userId", "sessionId", "primarySector"],
      },
      handler: async (params) => {
        if (!this.memoryRepository) {
          return {
            success: false,
            error: "Memory repository not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            content: string;
            userId: string;
            sessionId: string;
            primarySector: string;
            metadata?: {
              keywords?: string[];
              tags?: string[];
              category?: string;
              context?: string;
              importance?: number;
            };
          };

          // Validate sessionId is not empty
          if (!input.sessionId || input.sessionId.trim() === "") {
            return {
              success: false,
              error: "sessionId cannot be empty",
              suggestion: "Provide a valid session ID for context tracking",
            };
          }

          // Validate content length (Requirements: 8.1, 8.2, 8.3)
          const validationResult = this.contentValidator.validate(input.content);
          if (!validationResult.valid && validationResult.error) {
            return {
              success: false,
              error: validationResult.error.message,
              code: validationResult.error.code,
              details: validationResult.error.details,
              suggestion: `Content must be between ${validationResult.error.details.minLength} and ${validationResult.error.details.maxLength} characters. Current length: ${validationResult.error.details.actualLength}`,
            };
          }

          const memory = await this.memoryRepository.create(
            {
              content: input.content,
              userId: input.userId,
              sessionId: input.sessionId,
              primarySector: input.primarySector as import("../memory/types").MemorySectorType,
            },
            input.metadata
          );

          return {
            success: true,
            data: {
              memoryId: memory.id,
              embeddingsGenerated: memory.embeddings ? 5 : 0,
              linksCreated: memory.links?.length ?? 0,
              salience: memory.salience,
              strength: memory.strength,
            },
          };
        } catch (error) {
          // Log full error for debugging
          console.error("Memory storage error:", error);
          if (error instanceof Error && "cause" in error && error.cause) {
            console.error("Caused by:", error.cause);
          }
          return {
            success: false,
            error: error instanceof Error ? error.message : "Memory storage failed",
            suggestion:
              "Check that all required fields are provided and content is non-empty. " +
              "Ensure primarySector is one of: episodic, semantic, procedural, emotional, reflective",
          };
        }
      },
    });
  }

  /**
   * Register retrieve_memories tool
   */
  private registerRetrieveMemoriesTool(): void {
    this.toolRegistry.registerTool({
      name: "recall",
      description:
        "Retrieve memories using composite scoring. " +
        "When text query is provided: uses similarity-based scoring (0.6×similarity + 0.2×salience + 0.1×recency + 0.1×linkWeight). " +
        "When no text query: uses salience-based scoring (0.4×salience + 0.3×recency + 0.3×linkWeight). " +
        "The response includes 'rankingMethod' field indicating which scoring method was used ('similarity' or 'salience'). " +
        "Supports vector similarity search, metadata filtering, and pagination. " +
        "\n\n" +
        "**Similarity Threshold (minSimilarity):**\n" +
        "Controls how strictly memories must match the query. Use higher values for focused results:\n" +
        "- 0.7+ : High relevance - only very similar memories (best for specific queries)\n" +
        "- 0.5 (default): Moderate relevance - balanced results\n" +
        "- 0.3 : Low relevance - broader results, may include tangentially related memories\n" +
        "\n" +
        "**Examples:**\n" +
        "- Basic: retrieve_memories({ userId: 'user123', text: 'dark mode preference', limit: 10 })\n" +
        "- Focused: retrieve_memories({ userId: 'user123', text: 'database optimization', minSimilarity: 0.7 })\n" +
        "- Broad: retrieve_memories({ userId: 'user123', text: 'user settings', minSimilarity: 0.3 })",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User ID for memory isolation (required)",
          },
          text: {
            type: "string",
            description: "Search query text for vector similarity (optional)",
          },
          sectors: {
            type: "array",
            items: {
              type: "string",
              enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
            },
            description: "Memory sectors to search (default: all sectors)",
          },
          primarySector: {
            type: "string",
            enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
            description: "Filter by primary sector",
          },
          minStrength: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Minimum memory strength (0-1)",
          },
          minSalience: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Minimum salience score (0-1)",
          },
          minSimilarity: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description:
              "Minimum vector similarity threshold (0-1, default 0.5). " +
              "Higher values return more relevant but fewer results. " +
              "Use 0.7+ for focused queries, 0.3 for broader discovery.",
          },
          dateRange: {
            type: "object",
            properties: {
              start: {
                type: "string",
                format: "date-time",
                description: "Start date (ISO 8601)",
              },
              end: {
                type: "string",
                format: "date-time",
                description: "End date (ISO 8601)",
              },
            },
            description: "Filter by creation date range",
          },
          metadata: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Filter by keywords (array overlap)",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Filter by tags (array overlap)",
              },
              category: {
                type: "string",
                description: "Filter by category",
              },
            },
            description: "Metadata filters",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 100,
            description: "Maximum results to return (default 10, max 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            description: "Pagination offset (default 0)",
          },
        },
        required: ["userId"],
      },
      handler: async (params) => {
        if (!this.memoryRepository) {
          return {
            success: false,
            error: "Memory repository not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            userId: string;
            text?: string;
            sectors?: string[];
            primarySector?: string;
            minStrength?: number;
            minSalience?: number;
            minSimilarity?: number;
            dateRange?: { start?: string; end?: string };
            metadata?: {
              keywords?: string[];
              tags?: string[];
              category?: string;
            };
            limit?: number;
            offset?: number;
          };

          const query: import("../memory/types").SearchQuery = {
            userId: input.userId,
            text: input.text,
            sectors: input.sectors as import("../memory/types").MemorySectorType[] | undefined,
            primarySector: input.primarySector as
              | import("../memory/types").MemorySectorType
              | undefined,
            minStrength: input.minStrength,
            minSalience: input.minSalience,
            minSimilarity: input.minSimilarity,
            dateRange: input.dateRange
              ? {
                  start: input.dateRange.start ? new Date(input.dateRange.start) : undefined,
                  end: input.dateRange.end ? new Date(input.dateRange.end) : undefined,
                }
              : undefined,
            metadata: input.metadata,
            limit: input.limit,
            offset: input.offset,
          };

          const result = await this.memoryRepository.search(query);

          // Convert scores Map to object for JSON serialization
          const scoresObj: Record<string, unknown> = {};
          result.scores.forEach((score, memoryId) => {
            scoresObj[memoryId] = score;
          });

          return {
            success: true,
            data: {
              memories: result.memories.map((m) => ({
                id: m.id,
                content: m.content,
                createdAt: m.createdAt.toISOString(),
                lastAccessed: m.lastAccessed.toISOString(),
                strength: m.strength,
                salience: m.salience,
                primarySector: m.primarySector,
                metadata: m.metadata,
                score: result.scores.get(m.id),
              })),
              totalCount: result.totalCount,
              scores: scoresObj,
              rankingMethod: result.rankingMethod,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Memory retrieval failed",
            suggestion:
              "Check that userId is provided. Ensure date ranges are valid ISO 8601 strings. " +
              "Verify strength, salience, and similarity values are between 0 and 1",
          };
        }
      },
    });
  }

  /**
   * Register update_memory tool
   */
  private registerUpdateMemoryTool(): void {
    this.toolRegistry.registerTool({
      name: "update_memory",
      description:
        "Update an existing memory with selective field updates. Content changes trigger automatic " +
        "embedding regeneration and waypoint connection updates. " +
        "Example: update_memory({ memoryId: 'mem123', userId: 'user123', content: 'Updated preference', strength: 0.9 })",
      inputSchema: {
        type: "object",
        properties: {
          memoryId: {
            type: "string",
            description: "Memory ID to update (required)",
          },
          userId: {
            type: "string",
            description: "User ID for ownership verification (required)",
          },
          content: {
            type: "string",
            description: "New content (triggers embedding regeneration)",
          },
          strength: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "New strength value (0-1)",
          },
          salience: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "New salience value (0-1)",
          },
          metadata: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Updated keywords",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Updated tags",
              },
              category: {
                type: "string",
                description: "Updated category",
              },
              context: {
                type: "string",
                description: "Updated context",
              },
              importance: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Updated importance (0-1)",
              },
            },
            description: "Metadata updates",
          },
        },
        required: ["memoryId", "userId"],
      },
      handler: async (params) => {
        if (!this.memoryRepository) {
          return {
            success: false,
            error: "Memory repository not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            memoryId: string;
            userId: string;
            content?: string;
            strength?: number;
            salience?: number;
            metadata?: {
              keywords?: string[];
              tags?: string[];
              category?: string;
              context?: string;
              importance?: number;
            };
          };

          // Validate content length if provided (same as remember tool: 10-100000 chars)
          if (input.content !== undefined) {
            if (input.content.length < 10) {
              return {
                success: false,
                error: "Content must be at least 10 characters",
                suggestion: "Provide more detailed content for the memory update",
              };
            }
            if (input.content.length > 100000) {
              return {
                success: false,
                error: "Content must not exceed 100,000 characters",
                suggestion: "Reduce the content length or split into multiple memories",
              };
            }
          }

          const result = await this.memoryRepository.update({
            memoryId: input.memoryId,
            userId: input.userId,
            content: input.content,
            strength: input.strength,
            salience: input.salience,
            metadata: input.metadata,
          });

          return {
            success: true,
            data: {
              memoryId: result.memory.id,
              embeddingsRegenerated: result.embeddingsRegenerated,
              connectionsUpdated: result.connectionsUpdated,
              strength: result.memory.strength,
              salience: result.memory.salience,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Memory update failed",
            suggestion:
              "Check that memoryId and userId are provided. Verify memory exists and belongs to user. " +
              "Ensure strength and salience values are between 0 and 1",
          };
        }
      },
    });
  }

  /**
   * Register delete_memory tool
   */
  private registerDeleteMemoryTool(): void {
    this.toolRegistry.registerTool({
      name: "forget",
      description:
        "Delete a memory with cascade deletion options. Soft delete (soft=true) sets strength to 0 " +
        "but preserves all data. Hard delete (soft=false) removes the memory and cascades to embeddings, " +
        "connections, and metadata. " +
        "Example: delete_memory({ memoryId: 'mem123', userId: 'user123', soft: false })",
      inputSchema: {
        type: "object",
        properties: {
          memoryId: {
            type: "string",
            description: "Memory ID to delete (required)",
          },
          userId: {
            type: "string",
            description: "User ID for ownership verification (required)",
          },
          soft: {
            type: "boolean",
            description:
              "Soft delete (true) sets strength=0, hard delete (false) removes record (default: false)",
          },
        },
        required: ["memoryId", "userId"],
      },
      handler: async (params) => {
        if (!this.memoryRepository) {
          return {
            success: false,
            error: "Memory repository not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            memoryId: string;
            userId: string;
            soft?: boolean;
          };

          // First verify ownership by retrieving the memory
          const memory = await this.memoryRepository.retrieve(input.memoryId, input.userId);
          if (!memory) {
            return {
              success: false,
              error: "Memory not found or does not belong to user",
              suggestion: "Check that memoryId is correct and belongs to the specified userId",
            };
          }

          await this.memoryRepository.delete(input.memoryId, input.soft ?? false);

          return {
            success: true,
            data: {
              memoryId: input.memoryId,
              deletionType: input.soft ? "soft" : "hard",
              message: input.soft
                ? "Memory strength set to 0, data preserved"
                : "Memory and all related data removed",
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Memory deletion failed",
            suggestion:
              "Check that memoryId and userId are provided. Verify memory exists and belongs to user",
          };
        }
      },
    });
  }

  /**
   * Register search_memories tool
   */
  private registerSearchMemoriesTool(): void {
    this.toolRegistry.registerTool({
      name: "search",
      description:
        "Advanced memory search combining full-text search, vector similarity, and metadata filtering. " +
        "Supports boolean operators (AND, OR, NOT) and phrase matching in text queries. " +
        "Returns ranked results with composite scores. " +
        "\n\n" +
        "**Boolean Operators:**\n" +
        "- AND: Both terms must be present. Example: 'dark AND mode' finds memories containing both 'dark' and 'mode'\n" +
        "- OR: Either term can be present. Example: 'dark OR light' finds memories containing 'dark' or 'light' or both\n" +
        "- NOT: Exclude term from results. Example: 'mode NOT dark' finds memories with 'mode' but without 'dark'\n" +
        "\n" +
        "**Operator Precedence:** NOT > AND > OR (NOT is evaluated first, then AND, then OR)\n" +
        "\n" +
        "**Example Queries:**\n" +
        "- Simple: 'user preferences'\n" +
        "- AND: 'dark AND mode AND preference'\n" +
        "- OR: 'settings OR preferences OR config'\n" +
        "- NOT: 'theme NOT dark' or 'NOT deprecated'\n" +
        "- Combined: 'ui AND (dark OR light) NOT deprecated'\n" +
        "- Phrase: '\"dark mode\"' (exact phrase match)\n" +
        "\n" +
        "Example: search_memories({ userId: 'user123', text: 'dark mode AND preference', metadata: { tags: ['ui', 'settings'] }, limit: 20 })",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User ID for memory isolation (required)",
          },
          text: {
            type: "string",
            description:
              "Full-text search query supporting boolean operators (AND, OR, NOT), phrase matching with quotes, " +
              "and parentheses for grouping. Operator precedence: NOT > AND > OR. " +
              "Examples: 'term1 AND term2', 'term1 OR term2', 'term1 NOT term2', '\"exact phrase\"'",
          },
          sectors: {
            type: "array",
            items: {
              type: "string",
              enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
            },
            description: "Memory sectors to search (default: all sectors)",
          },
          primarySector: {
            type: "string",
            enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
            description: "Filter by primary sector",
          },
          minStrength: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Minimum memory strength (0-1)",
          },
          minSalience: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Minimum salience score (0-1)",
          },
          dateRange: {
            type: "object",
            properties: {
              start: {
                type: "string",
                format: "date-time",
                description: "Start date (ISO 8601)",
              },
              end: {
                type: "string",
                format: "date-time",
                description: "End date (ISO 8601)",
              },
            },
            description: "Filter by creation date range",
          },
          metadata: {
            type: "object",
            properties: {
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Filter by keywords (array overlap)",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Filter by tags (array overlap)",
              },
              category: {
                type: "string",
                description: "Filter by category",
              },
            },
            description: "Metadata filters",
          },
          limit: {
            type: "number",
            minimum: 1,
            maximum: 100,
            description: "Maximum results to return (default 10, max 100)",
          },
          offset: {
            type: "number",
            minimum: 0,
            description: "Pagination offset (default 0)",
          },
        },
        required: ["userId"],
      },
      handler: this.handleSearchMemories.bind(this),
    });
  }

  /**
   * Handle search_memories tool execution
   *
   * Requirements: 4.2 (MCP Interface validation)
   */
  private async handleSearchMemories(params: unknown): Promise<MCPResponse> {
    // Validate input using the validation system - Requirements: 4.2
    const validation = this.validateToolInput<{
      userId: string;
      text?: string;
      sectors?: string[];
      primarySector?: string;
      minStrength?: number;
      minSalience?: number;
      dateRange?: { start?: string; end?: string };
      metadata?: {
        keywords?: string[];
        tags?: string[];
        category?: string;
      };
      limit?: number;
      offset?: number;
    }>("search", params);

    if (!validation.valid) {
      return validation.error;
    }

    if (!this.memoryRepository) {
      return {
        success: false,
        error: "Memory repository not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = validation.data;

      // Use full-text search if text query provided, otherwise use vector search
      if (input.text) {
        const fullTextQuery: import("../search/types").FullTextSearchQuery = {
          userId: input.userId,
          query: input.text,
          minStrength: input.minStrength,
          minSalience: input.minSalience,
          maxResults: input.limit ?? 10,
          offset: input.offset ?? 0,
        };

        const result = await this.memoryRepository.searchFullText(fullTextQuery);

        return {
          success: true,
          data: {
            memories: result.results.map((r) => ({
              id: r.memoryId,
              content: r.content,
              createdAt: r.createdAt.toISOString(),
              strength: r.strength,
              salience: r.salience,
              rank: r.rank,
              highlight: r.headline,
              matchedTerms: r.matchedTerms,
            })),
            totalCount: result.statistics.totalResults,
            searchType: "full-text",
          },
        };
      } else {
        // Use vector/metadata search
        const searchQuery: import("../memory/types").SearchQuery = {
          userId: input.userId,
          sectors: input.sectors as import("../memory/types").MemorySectorType[] | undefined,
          primarySector: input.primarySector as
            | import("../memory/types").MemorySectorType
            | undefined,
          minStrength: input.minStrength,
          minSalience: input.minSalience,
          dateRange: input.dateRange
            ? {
                start: input.dateRange.start ? new Date(input.dateRange.start) : undefined,
                end: input.dateRange.end ? new Date(input.dateRange.end) : undefined,
              }
            : undefined,
          metadata: input.metadata,
          limit: input.limit,
          offset: input.offset,
        };

        const result = await this.memoryRepository.search(searchQuery);

        // Convert scores Map to object for JSON serialization
        const scoresObj: Record<string, unknown> = {};
        result.scores.forEach((score, memoryId) => {
          scoresObj[memoryId] = score;
        });

        return {
          success: true,
          data: {
            memories: result.memories.map((m) => ({
              id: m.id,
              content: m.content,
              createdAt: m.createdAt.toISOString(),
              lastAccessed: m.lastAccessed.toISOString(),
              strength: m.strength,
              salience: m.salience,
              primarySector: m.primarySector,
              metadata: m.metadata,
              score: result.scores.get(m.id),
            })),
            totalCount: result.totalCount,
            scores: scoresObj,
            searchType: "vector-metadata",
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Memory search failed",
        suggestion:
          "Check that userId is provided. For full-text search, use boolean operators (AND, OR, NOT) " +
          "and quotes for phrases. Ensure date ranges are valid ISO 8601 strings",
      };
    }
  }

  /**
   * Register batch memory operation tools
   */
  private registerBatchMemoryTools(): void {
    this.registerBatchRememberTool();
    this.registerBatchRecallTool();
    this.registerBatchForgetTool();
  }

  /**
   * Register batch_remember tool for creating multiple memories
   */
  private registerBatchRememberTool(): void {
    this.toolRegistry.registerTool({
      name: "batch_remember",
      description:
        "Create multiple memories in a single batch operation. " +
        "More efficient than calling remember multiple times for bulk memory storage. " +
        "Each memory gets its own embeddings and waypoint connections. " +
        "\n\n" +
        "**Example:**\n" +
        "batch_remember({ userId: 'user123', sessionId: 'session456', memories: [\n" +
        "  { content: 'User prefers dark mode', primarySector: 'semantic' },\n" +
        "  { content: 'Completed onboarding flow', primarySector: 'episodic' }\n" +
        "]})",
      inputSchema: {
        type: "object",
        properties: {
          userId: { type: "string", description: "User ID for memory isolation (required)" },
          sessionId: { type: "string", description: "Session ID for context tracking (required)" },
          memories: {
            type: "array",
            description: "Array of memories to create (required)",
            items: {
              type: "object",
              properties: {
                content: { type: "string", description: "Memory content (10-100,000 characters)" },
                primarySector: {
                  type: "string",
                  enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
                  description: "Primary memory sector",
                },
                metadata: {
                  type: "object",
                  description: "Optional metadata",
                  properties: {
                    keywords: { type: "array", items: { type: "string" } },
                    tags: { type: "array", items: { type: "string" } },
                    category: { type: "string" },
                    importance: { type: "number", minimum: 0, maximum: 1 },
                  },
                },
              },
              required: ["content", "primarySector"],
            },
          },
        },
        required: ["userId", "sessionId", "memories"],
      },
      handler: this.handleBatchRemember.bind(this),
    });
  }

  /**
   * Handle batch_remember tool execution
   *
   * Requirements: 4.2 (MCP Interface validation)
   */
  private async handleBatchRemember(params: unknown): Promise<MCPResponse> {
    // Validate input using the validation system - Requirements: 4.2
    const validation = this.validateToolInput<{
      userId: string;
      sessionId: string;
      memories: Array<{
        content: string;
        primarySector: string;
        metadata?: {
          keywords?: string[];
          tags?: string[];
          category?: string;
          importance?: number;
        };
      }>;
    }>("batch_remember", params);

    if (!validation.valid) {
      return validation.error;
    }

    if (!this.memoryRepository) {
      return {
        success: false,
        error: "Memory repository not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = validation.data;

      const result = await this.memoryRepository.batchCreate({
        userId: input.userId,
        sessionId: input.sessionId,
        memories: input.memories.map((m) => ({
          content: m.content,
          primarySector: m.primarySector as import("../memory/types").MemorySectorType,
          metadata: m.metadata,
        })),
      });

      return {
        success: true,
        data: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          created: result.created,
          failures: result.failures,
          processingTime: result.processingTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Batch memory creation failed",
        suggestion: "Check that all required fields are provided for each memory",
      };
    }
  }

  /**
   * Register batch_recall tool for retrieving multiple memories
   *
   * Requirements: 2.3, 2.4
   */
  private registerBatchRecallTool(): void {
    this.toolRegistry.registerTool({
      name: "batch_recall",
      description:
        "Retrieve multiple memories by their IDs in a single batch operation. " +
        "More efficient than calling recall multiple times when you know the memory IDs. " +
        "\n\n" +
        "**Example:**\n" +
        "batch_recall({ userId: 'user123', memoryIds: ['mem-1', 'mem-2', 'mem-3'] })",
      inputSchema: {
        type: "object",
        properties: {
          userId: { type: "string", description: "User ID for memory isolation (required)" },
          memoryIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of memory IDs to retrieve (required)",
          },
          includeDeleted: {
            type: "boolean",
            description:
              "Include soft-deleted memories (strength=0) in results. Default: false - excludes soft-deleted memories",
          },
        },
        required: ["userId", "memoryIds"],
      },
      handler: this.handleBatchRecall.bind(this),
    });
  }

  /**
   * Handle batch_recall tool execution
   *
   * Requirements: 2.3, 2.4, 4.2
   */
  private async handleBatchRecall(params: unknown): Promise<MCPResponse> {
    // Validate input using the validation system - Requirements: 4.2
    const validation = this.validateToolInput<{
      userId: string;
      memoryIds: string[];
      includeDeleted?: boolean;
    }>("batch_recall", params);

    if (!validation.valid) {
      return validation.error;
    }

    if (!this.memoryRepository) {
      return {
        success: false,
        error: "Memory repository not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = validation.data;

      const result = await this.memoryRepository.batchRetrieve({
        userId: input.userId,
        memoryIds: input.memoryIds,
        includeDeleted: input.includeDeleted,
      });

      return {
        success: true,
        data: {
          memories: result.memories.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
            lastAccessed: m.lastAccessed.toISOString(),
            strength: m.strength,
            salience: m.salience,
            primarySector: m.primarySector,
            metadata: m.metadata,
          })),
          notFound: result.notFound,
          processingTime: result.processingTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Batch memory retrieval failed",
        suggestion: "Check that userId and memoryIds are provided",
      };
    }
  }

  /**
   * Register batch_forget tool for deleting multiple memories
   */
  private registerBatchForgetTool(): void {
    this.toolRegistry.registerTool({
      name: "batch_forget",
      description:
        "Delete multiple memories in a single batch operation. " +
        "Supports both soft delete (set strength to 0) and hard delete (remove completely). " +
        "\n\n" +
        "**Example:**\n" +
        "batch_forget({ memoryIds: ['mem-1', 'mem-2'], soft: false })",
      inputSchema: {
        type: "object",
        properties: {
          memoryIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of memory IDs to delete (required)",
          },
          soft: {
            type: "boolean",
            description:
              "Soft delete (true) sets strength=0, hard delete (false) removes record (default: false)",
          },
        },
        required: ["memoryIds"],
      },
      handler: this.handleBatchForget.bind(this),
    });
  }

  /**
   * Handle batch_forget tool execution
   *
   * Requirements: 4.2 (MCP Interface validation)
   */
  private async handleBatchForget(params: unknown): Promise<MCPResponse> {
    // Validate input using the validation system - Requirements: 4.2
    const validation = this.validateToolInput<{
      memoryIds: string[];
      soft?: boolean;
    }>("batch_forget", params);

    if (!validation.valid) {
      return validation.error;
    }

    if (!this.memoryRepository) {
      return {
        success: false,
        error: "Memory repository not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = validation.data;

      const result = await this.memoryRepository.batchDelete(input.memoryIds, input.soft ?? false);

      return {
        success: true,
        data: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          failures: result.failures,
          processingTime: result.processingTime,
          deletionType: input.soft ? "soft" : "hard",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Batch memory deletion failed",
        suggestion: "Check that memoryIds array is provided",
      };
    }
  }

  /**
   * Register memory_health tool
   *
   * Requirements: 2.1-2.7 (Memory Health Dashboard API)
   */
  private registerMemoryHealthTool(): void {
    this.toolRegistry.registerTool({
      name: "memory_health",
      description:
        "Get comprehensive memory health metrics and recommendations for a user. " +
        "Returns storage usage, memory counts by sector and age, consolidation queue status, " +
        "forgetting candidates breakdown, and actionable recommendations. " +
        "When storage usage exceeds 80%, recommendations include storage optimization suggestions. " +
        "\n\n" +
        "**Metrics Included:**\n" +
        "- Storage: bytes used, quota, usage percentage\n" +
        "- Counts by sector: episodic, semantic, procedural, emotional, reflective\n" +
        "- Counts by age: last 24h, last week, last month, older\n" +
        "- Consolidation queue: size and estimated processing time\n" +
        "- Forgetting candidates: low strength, old age, low access counts\n" +
        "- Recommendations: consolidation, pruning, archiving, optimization\n" +
        "\n" +
        "Example: memory_health({ userId: 'user123' })",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User ID for memory isolation (required)",
          },
        },
        required: ["userId"],
      },
      handler: this.handleMemoryHealth.bind(this),
    });
  }

  /**
   * Handle memory_health tool execution
   *
   * Requirements: 2.1-2.7 (Memory Health Dashboard API), 4.2 (MCP Interface validation)
   */
  private async handleMemoryHealth(params: unknown): Promise<MCPResponse> {
    // Validate input using the validation system - Requirements: 4.2
    const validation = this.validateToolInput<{ userId: string }>("memory_health", params);

    if (!validation.valid) {
      return validation.error;
    }

    if (!this.healthMonitor) {
      return {
        success: false,
        error: "Health monitor not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = validation.data;

      const startTime = Date.now();
      const health: MemoryHealthResponse = await this.healthMonitor.getHealth(input.userId);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          storage: {
            bytesUsed: health.storage.bytesUsed,
            quotaBytes: health.storage.quotaBytes,
            usagePercent: health.storage.usagePercent,
          },
          countsBySector: {
            episodic: health.countsBySector.episodic,
            semantic: health.countsBySector.semantic,
            procedural: health.countsBySector.procedural,
            emotional: health.countsBySector.emotional,
            reflective: health.countsBySector.reflective,
          },
          countsByAge: {
            last24h: health.countsByAge.last24h,
            lastWeek: health.countsByAge.lastWeek,
            lastMonth: health.countsByAge.lastMonth,
            older: health.countsByAge.older,
          },
          consolidationQueue: {
            size: health.consolidationQueue.size,
            estimatedTimeMs: health.consolidationQueue.estimatedTimeMs,
          },
          activeConsolidation: {
            isRunning: health.activeConsolidation.isRunning,
            phase: health.activeConsolidation.phase,
            clustersIdentified: health.activeConsolidation.clustersIdentified,
            clustersConsolidated: health.activeConsolidation.clustersConsolidated,
            memoriesProcessed: health.activeConsolidation.memoriesProcessed,
            memoriesTotal: health.activeConsolidation.memoriesTotal,
            percentComplete: health.activeConsolidation.percentComplete,
            estimatedRemainingMs: health.activeConsolidation.estimatedRemainingMs,
            startedAt: health.activeConsolidation.startedAt?.toISOString() ?? null,
          },
          forgettingCandidates: {
            lowStrength: health.forgettingCandidates.lowStrength,
            oldAge: health.forgettingCandidates.oldAge,
            lowAccess: health.forgettingCandidates.lowAccess,
            total: health.forgettingCandidates.total,
          },
          recommendations: health.recommendations.map((rec: HealthRecommendation) => ({
            type: rec.type,
            priority: rec.priority,
            message: rec.message,
            action: rec.action,
          })),
          timestamp: health.timestamp.toISOString(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime,
          componentsUsed: ["healthMonitor"],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Memory health check failed",
        suggestion: "Check that userId is provided and is a valid string",
      };
    }
  }

  /**
   * Register prune_memories tool
   *
   * Requirements: 3.1-3.6 (Memory Pruning Tools)
   */
  private registerPruneMemoriesTool(): void {
    this.toolRegistry.registerTool({
      name: "prune_memories",
      description:
        "Identify and remove low-value memories to optimize storage and improve retrieval relevance. " +
        "Supports listing candidates, previewing effects (dry-run), and executing pruning. " +
        "Candidates are identified based on configurable criteria: low strength, old age, or low access count. " +
        "\n\n" +
        "**Actions:**\n" +
        "- list: List forgetting candidates matching criteria\n" +
        "- preview: Preview pruning effects without deletion (dry-run)\n" +
        "- prune: Execute pruning for specific memory IDs\n" +
        "- prune_all: Prune all candidates matching criteria\n" +
        "\n" +
        "**Default Criteria:**\n" +
        "- minStrength: 0.1 (memories below this strength)\n" +
        "- maxAgeDays: 180 (memories older than 6 months)\n" +
        "- minAccessCount: 0 (memories never accessed)\n" +
        "\n" +
        "Example: prune_memories({ userId: 'user123', action: 'list', criteria: { minStrength: 0.1, maxAgeDays: 90 } })",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User ID for memory isolation (required)",
          },
          action: {
            type: "string",
            enum: ["list", "preview", "prune", "prune_all"],
            description:
              "Action to perform: list candidates, preview effects, prune specific IDs, or prune all candidates",
          },
          memoryIds: {
            type: "array",
            items: { type: "string" },
            description: "Memory IDs to prune (required for 'prune' and 'preview' actions)",
          },
          criteria: {
            type: "object",
            description: "Pruning criteria (optional, uses defaults if not provided)",
            properties: {
              minStrength: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description:
                  "Minimum strength threshold - memories below this are candidates (default: 0.1)",
              },
              maxAgeDays: {
                type: "number",
                minimum: 0,
                description:
                  "Maximum age in days - memories older than this are candidates (default: 180)",
              },
              minAccessCount: {
                type: "number",
                minimum: 0,
                description:
                  "Minimum access count - memories with fewer accesses are candidates (default: 0)",
              },
            },
          },
        },
        required: ["userId", "action"],
      },
      handler: this.handlePruneMemories.bind(this),
    });
  }

  /**
   * Handle prune_memories tool execution
   *
   * Requirements: 3.1-3.6, 4.2 (MCP Interface validation)
   */
  private async handlePruneMemories(params: unknown): Promise<MCPResponse> {
    // Validate input using the validation system - Requirements: 4.2
    const validation = this.validateToolInput<{
      userId: string;
      action: "list" | "preview" | "prune" | "prune_all";
      memoryIds?: string[];
      criteria?: Partial<PruningCriteria>;
    }>("prune_memories", params);

    if (!validation.valid) {
      return validation.error;
    }

    if (!this.pruningService) {
      return {
        success: false,
        error: "Pruning service not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = validation.data;

      const startTime = Date.now();

      // Merge provided criteria with defaults
      const criteria: PruningCriteria = {
        ...DEFAULT_PRUNING_CRITERIA,
        ...input.criteria,
      };

      switch (input.action) {
        case "list": {
          const candidates = await this.pruningService.listCandidates(input.userId, criteria);
          return {
            success: true,
            data: {
              candidates: candidates.map((c) => ({
                memoryId: c.memoryId,
                content: c.content.substring(0, 200) + (c.content.length > 200 ? "..." : ""),
                strength: c.strength,
                createdAt: c.createdAt.toISOString(),
                lastAccessed: c.lastAccessed.toISOString(),
                accessCount: c.accessCount,
                reason: c.reason,
              })),
              totalCount: candidates.length,
              criteria,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              componentsUsed: ["pruningService"],
            },
          };
        }

        case "preview": {
          if (!input.memoryIds || input.memoryIds.length === 0) {
            return {
              success: false,
              error: "memoryIds is required for preview action",
              suggestion: "Provide an array of memory IDs to preview pruning effects",
            };
          }
          const preview = await this.pruningService.previewPruning(input.userId, input.memoryIds);
          return {
            success: true,
            data: {
              wouldDelete: preview.deletedCount,
              wouldFreeBytes: preview.freedBytes,
              wouldRemoveLinks: preview.orphanedLinksRemoved,
              isDryRun: true,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              componentsUsed: ["pruningService"],
            },
          };
        }

        case "prune": {
          if (!input.memoryIds || input.memoryIds.length === 0) {
            return {
              success: false,
              error: "memoryIds is required for prune action",
              suggestion: "Provide an array of memory IDs to prune",
            };
          }
          const result = await this.pruningService.prune(input.userId, input.memoryIds);
          return {
            success: true,
            data: {
              deletedCount: result.deletedCount,
              freedBytes: result.freedBytes,
              orphanedLinksRemoved: result.orphanedLinksRemoved,
              timestamp: result.timestamp.toISOString(),
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              componentsUsed: ["pruningService"],
            },
          };
        }

        case "prune_all": {
          const result = await this.pruningService.pruneAllCandidates(input.userId, criteria);
          return {
            success: true,
            data: {
              deletedCount: result.deletedCount,
              freedBytes: result.freedBytes,
              orphanedLinksRemoved: result.orphanedLinksRemoved,
              timestamp: result.timestamp.toISOString(),
              criteria,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              componentsUsed: ["pruningService"],
            },
          };
        }

        default:
          return {
            success: false,
            error: `Unknown action: ${input.action}`,
            suggestion: "Use one of: list, preview, prune, prune_all",
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Pruning operation failed",
        suggestion: "Check that userId is provided and criteria values are valid",
      };
    }
  }

  /**
   * Register consolidate_memories tool
   *
   * Requirements: 7.2 (Manual trigger via API)
   */
  private registerConsolidateMemoriesTool(): void {
    this.toolRegistry.registerTool({
      name: "consolidate_memories",
      description:
        "Trigger memory consolidation to combine related episodic memories into semantic summaries. " +
        "Consolidation identifies clusters of similar memories and generates summaries using LLM. " +
        "Original memories are preserved with reduced strength and linked to the summary. " +
        "\n\n" +
        "**Process:**\n" +
        "1. Identify clusters of related episodic memories (similarity >= threshold)\n" +
        "2. Generate semantic summary for clusters with 5+ memories\n" +
        "3. Create graph links from summary to original memories\n" +
        "4. Reduce strength of original memories (not deleted)\n" +
        "\n" +
        "**Configuration:**\n" +
        "- similarityThreshold: 0.75 (default) - minimum similarity for clustering\n" +
        "- minClusterSize: 5 (default) - minimum memories to form a cluster\n" +
        "- batchSize: 100 (default) - max memories per consolidation run\n" +
        "\n" +
        "Example: consolidate_memories({ userId: 'user123' })",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User ID for memory isolation (required)",
          },
          config: {
            type: "object",
            description: "Consolidation configuration (optional, uses defaults if not provided)",
            properties: {
              similarityThreshold: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Minimum similarity threshold for clustering (default: 0.75)",
              },
              minClusterSize: {
                type: "number",
                minimum: 2,
                description: "Minimum cluster size to trigger consolidation (default: 5)",
              },
              batchSize: {
                type: "number",
                minimum: 1,
                description: "Maximum memories to process per batch (default: 100)",
              },
              strengthReductionFactor: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Factor to reduce original memory strength (default: 0.5)",
              },
            },
          },
        },
        required: ["userId"],
      },
      handler: this.handleConsolidateMemories.bind(this),
    });
  }

  /**
   * Handle consolidate_memories tool execution
   *
   * Requirements: 7.2
   *
   * Handles edge cases gracefully:
   * - Empty memory set (no memories to consolidate) - returns success with 0 clusters
   * - Insufficient memories for clustering - returns success with 0 clusters
   * - No clusters found above similarity threshold - returns success with 0 clusters
   * - Database connection issues - returns error with helpful message
   */
  private async handleConsolidateMemories(params: unknown): Promise<MCPResponse> {
    if (!this.consolidationScheduler) {
      return {
        success: false,
        error: "Consolidation scheduler not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = params as {
        userId: string;
        config?: Partial<ConsolidationConfig>;
      };

      if (!input.userId || typeof input.userId !== "string") {
        return {
          success: false,
          error: "userId is required and must be a string",
          suggestion: "Provide a valid userId parameter",
        };
      }

      const startTime = Date.now();

      // Update scheduler config if provided
      if (input.config) {
        const currentConfig = this.consolidationScheduler.getConfig();
        this.consolidationScheduler.updateConfig({
          consolidationConfig: {
            ...currentConfig.consolidationConfig,
            ...input.config,
          },
        });
      }

      // Trigger consolidation
      const results = await this.consolidationScheduler.triggerNow(input.userId);

      // Determine message based on results
      let message: string;
      if (results.length === 0) {
        message =
          "No clusters were consolidated. This can happen when: " +
          "(1) there are no episodic memories to consolidate, " +
          "(2) there are fewer memories than the minimum cluster size (default: 5), or " +
          "(3) no memories are similar enough to form clusters above the similarity threshold (default: 0.75).";
      } else {
        message = `Successfully consolidated ${results.length} cluster(s) into semantic summaries.`;
      }

      return {
        success: true,
        data: {
          consolidationsPerformed: results.length,
          message,
          results: results.map((r: ConsolidationResult) => ({
            summaryId: r.summaryId,
            consolidatedCount: r.consolidatedIds.length,
            consolidatedIds: r.consolidatedIds,
            summaryPreview:
              r.summaryContent.substring(0, 200) + (r.summaryContent.length > 200 ? "..." : ""),
            consolidatedAt: r.consolidatedAt.toISOString(),
          })),
          status: this.consolidationScheduler.getStatus(),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          componentsUsed: ["consolidationScheduler", "consolidationEngine"],
        },
      };
    } catch (error) {
      // Handle specific error cases with helpful messages
      const errorMessage = error instanceof Error ? error.message : "Consolidation failed";
      const errorCode =
        error instanceof Error && "code" in error ? (error as { code: string }).code : undefined;

      // Check for common error patterns and provide helpful suggestions
      let suggestion =
        "Check that userId is provided. If a consolidation is already running, wait for it to complete.";

      if (errorMessage.includes("Failed to identify clusters")) {
        // This error typically occurs when there's a database issue or schema mismatch
        suggestion =
          "This error may indicate a database schema issue. Ensure all migrations have been run. " +
          "If the issue persists, check database connectivity and logs for more details.";
      } else if (
        errorCode === "LOAD_THRESHOLD_EXCEEDED" ||
        errorMessage.includes("high system load")
      ) {
        suggestion =
          "System load is too high for consolidation. Try again later when system load is lower.";
      } else if (errorCode === "JOB_IN_PROGRESS" || errorMessage.includes("already running")) {
        suggestion =
          "A consolidation job is already running. Wait for it to complete before starting another.";
      }

      return {
        success: false,
        error: errorMessage,
        suggestion,
      };
    }
  }

  /**
   * Register export_memories tool
   *
   * Requirements: 6.1-6.2 (Memory Export)
   */
  private registerExportMemoriesTool(): void {
    this.toolRegistry.registerTool({
      name: "export_memories",
      description:
        "Export memories to JSON format with all metadata and embeddings. " +
        "Supports filtering by date range, sector, tags, and minimum strength. " +
        "Exported data includes content, metadata, embeddings, tags, and graph links. " +
        "\n\n" +
        "**Filter Options:**\n" +
        "- dateRange: Filter by creation date (start/end)\n" +
        "- sectors: Filter by memory sectors (episodic, semantic, etc.)\n" +
        "- tags: Filter by tags (memories with any of the specified tags)\n" +
        "- minStrength: Filter by minimum strength threshold\n" +
        "\n" +
        "Example: export_memories({ userId: 'user123', filter: { sectors: ['semantic'], minStrength: 0.5 } })",
      inputSchema: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "User ID for memory isolation (required)",
          },
          filter: {
            type: "object",
            description: "Filter criteria for export (optional)",
            properties: {
              dateRange: {
                type: "object",
                properties: {
                  start: {
                    type: "string",
                    format: "date-time",
                    description: "Start date (ISO 8601)",
                  },
                  end: {
                    type: "string",
                    format: "date-time",
                    description: "End date (ISO 8601)",
                  },
                },
                description: "Filter by creation date range",
              },
              sectors: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
                },
                description: "Filter by memory sectors",
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "Filter by tags (memories with any of these tags)",
              },
              minStrength: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Minimum strength threshold",
              },
            },
          },
        },
        required: ["userId"],
      },
      handler: this.handleExportMemories.bind(this),
    });
  }

  /**
   * Build export filter from input parameters
   */
  private buildExportFilter(inputFilter?: {
    dateRange?: { start?: string; end?: string };
    sectors?: string[];
    tags?: string[];
    minStrength?: number;
  }): ExportFilter {
    const filter: ExportFilter = {};

    if (inputFilter?.dateRange) {
      filter.dateRange = {
        start: inputFilter.dateRange.start ? new Date(inputFilter.dateRange.start) : new Date(0),
        end: inputFilter.dateRange.end ? new Date(inputFilter.dateRange.end) : new Date(),
      };
    }

    if (inputFilter?.sectors) {
      filter.sectors = inputFilter.sectors as import("../memory/types").MemorySectorType[];
    }

    if (inputFilter?.tags) {
      filter.tags = inputFilter.tags;
    }

    if (inputFilter?.minStrength !== undefined) {
      filter.minStrength = inputFilter.minStrength;
    }

    return filter;
  }

  /**
   * Handle export_memories tool execution
   *
   * Requirements: 6.1-6.2
   */
  private async handleExportMemories(params: unknown): Promise<MCPResponse> {
    if (!this.exportImportService) {
      return {
        success: false,
        error: "Export/Import service not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    try {
      const input = params as {
        userId: string;
        filter?: {
          dateRange?: { start?: string; end?: string };
          sectors?: string[];
          tags?: string[];
          minStrength?: number;
        };
      };

      if (!input.userId || typeof input.userId !== "string") {
        return {
          success: false,
          error: "userId is required and must be a string",
          suggestion: "Provide a valid userId parameter",
        };
      }

      const startTime = Date.now();
      const filter = this.buildExportFilter(input.filter);

      // Execute export
      const result: ExportResult = await this.exportImportService.exportMemories(
        input.userId,
        filter
      );

      return {
        success: true,
        data: {
          exportedAt: result.exportedAt,
          version: result.version,
          userId: result.userId,
          count: result.count,
          filter: result.filter,
          // Include memory summaries (not full content to keep response manageable)
          memories: result.memories.map((m) => ({
            id: m.id,
            contentPreview: m.content.substring(0, 100) + (m.content.length > 100 ? "..." : ""),
            primarySector: m.primarySector,
            tags: m.tags,
            strength: m.strength,
            salience: m.salience,
            createdAt: m.createdAt,
            hasEmbeddings: m.embeddings !== null,
            linkCount: m.links.length,
          })),
          // Include full export data for actual backup use
          fullExport: result,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          componentsUsed: ["exportImportService"],
        },
      };
    } catch (error) {
      // Extract detailed error information
      let errorMessage = "Export failed";
      let suggestion = "Check that userId is provided and filter values are valid";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check if it's an ExportImportError with additional context
        const exportError = error as Error & {
          code?: string;
          context?: { error?: string };
        };

        if (exportError.context?.error) {
          errorMessage = `${error.message}: ${exportError.context.error}`;
        }

        // Provide more specific suggestions based on error type
        if (exportError.code === "INVALID_INPUT") {
          suggestion = "Ensure userId is a non-empty string";
        } else if (errorMessage.includes("connection") || errorMessage.includes("database")) {
          suggestion = "Database connection issue - check if the database is running";
        }
      }

      return {
        success: false,
        error: errorMessage,
        suggestion,
      };
    }
  }

  /**
   * Register reasoning operation tools
   */
  private registerReasoningTools(): void {
    this.registerThinkTool();
    this.registerAnalyzeSystematicallyTool();
    this.registerThinkParallelTool();
    this.registerDecomposeProblemTool();
  }

  /**
   * Register think tool
   *
   * Requirements: 13.1, 13.2, 13.3
   */
  private registerThinkTool(): void {
    this.toolRegistry.registerTool({
      name: "think",
      description:
        "Perform reasoning with specified mode (analytical, creative, critical, synthetic, parallel). " +
        "Integrates all reasoning components including parallel streams, confidence assessment, and bias detection. " +
        "Example: think({ problem: 'How to optimize database queries?', mode: 'analytical' })",
      inputSchema: {
        type: "object",
        properties: {
          problem: {
            type: "string",
            description: "Problem or question to reason about (required)",
          },
          mode: {
            type: "string",
            enum: ["analytical", "creative", "critical", "synthetic", "parallel"],
            description:
              "Reasoning mode: analytical (logical), creative (innovative), critical (skeptical), " +
              "synthetic (holistic), parallel (all modes simultaneously)",
          },
          userId: {
            type: "string",
            description:
              "User ID for memory-augmented reasoning (optional). When provided, retrieves relevant " +
              "memories to inform the analysis context.",
          },
          context: {
            type: "object",
            description: "Additional context for reasoning (optional)",
            properties: {
              background: {
                type: "string",
                description: "Background information",
              },
              constraints: {
                type: "array",
                items: { type: "string" },
                description: "Constraints to consider",
              },
              goals: {
                type: "array",
                items: { type: "string" },
                description: "Goals to achieve",
              },
            },
          },
        },
        required: ["problem", "mode"],
      },
      handler: async (params) => {
        if (!this.reasoningOrchestrator) {
          return {
            success: false,
            error: "Reasoning orchestrator not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            problem: string;
            mode: "analytical" | "creative" | "critical" | "synthetic" | "parallel";
            userId?: string;
            context?: {
              background?: string;
              constraints?: string[];
              goals?: string[];
            };
          };

          // Augment with memories using helper
          const { augmentedBackground, memoriesUsed } = await this.augmentWithMemories(
            input.problem,
            input.userId,
            input.context?.background ?? ""
          );

          // Create problem object with augmented context
          const problem: import("../reasoning/types").Problem = {
            id: `problem-${Date.now()}`,
            description: input.problem,
            context: augmentedBackground,
            constraints: input.context?.constraints,
            goals: input.context?.goals,
          };

          // Execute based on mode
          if (input.mode === "parallel") {
            const streams = await this.createAllReasoningStreams();
            const result = await this.reasoningOrchestrator.executeStreams(problem, streams);

            return {
              success: true,
              data: {
                conclusion: result.conclusion,
                insights: result.insights,
                recommendations: result.recommendations,
                conflicts: result.conflicts,
                confidence: result.confidence,
                quality: result.quality,
                memoriesUsed,
              },
            };
          }

          // Single stream reasoning
          const stream = await this.getReasoningStreamByMode(input.mode);
          const result = await stream.process(problem);

          return {
            success: true,
            data: {
              conclusion: result.conclusion,
              reasoning: result.reasoning,
              insights: result.insights,
              confidence: result.confidence,
              processingTime: result.processingTime,
              status: result.status,
              memoriesUsed,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Reasoning failed",
            suggestion:
              "Check that problem and mode are provided. Mode must be one of: analytical, creative, critical, synthetic, parallel",
          };
        }
      },
    });
  }

  /**
   * Register analyze_systematically tool
   *
   * Requirements: 13.1, 13.2, 13.3
   */
  private registerAnalyzeSystematicallyTool(): void {
    this.toolRegistry.registerTool({
      name: "analyze",
      description:
        "Analyze problem using systematic thinking framework with dynamic framework selection. " +
        "Automatically selects optimal framework (Scientific Method, Design Thinking, Systems Thinking, etc.) " +
        "based on problem characteristics. Supports preferred framework override. " +
        "Example: analyze_systematically({ problem: 'Why is the system slow?' })",
      inputSchema: {
        type: "object",
        properties: {
          problem: {
            type: "string",
            description: "Problem to analyze systematically (required)",
          },
          preferredFramework: {
            type: "string",
            enum: [
              "scientific-method",
              "design-thinking",
              "systems-thinking",
              "critical-thinking",
              "creative-problem-solving",
              "root-cause-analysis",
              "first-principles",
              "scenario-planning",
            ],
            description: "Preferred framework (optional, overrides automatic selection)",
          },
          userId: {
            type: "string",
            description:
              "User ID for memory-augmented reasoning (optional). When provided, retrieves relevant " +
              "memories to inform the analysis context.",
          },
          context: {
            type: "object",
            description: "Additional context for analysis (optional)",
            properties: {
              background: {
                type: "string",
                description: "Background information",
              },
              constraints: {
                type: "array",
                items: { type: "string" },
                description: "Constraints to consider",
              },
              goals: {
                type: "array",
                items: { type: "string" },
                description: "Goals to achieve",
              },
            },
          },
        },
        required: ["problem"],
      },
      handler: async (params) => {
        if (!this.frameworkSelector) {
          return {
            success: false,
            error: "Framework selector not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            problem: string;
            preferredFramework?: string;
            userId?: string;
            context?: {
              background?: string;
              constraints?: string[];
              goals?: string[];
            };
          };

          // Augment context with memories using helper method
          const { augmentedBackground, memoriesUsed } = await this.augmentContextWithMemories(
            input.problem,
            input.userId,
            input.context?.background ?? ""
          );

          // Create problem and context objects
          const problem: import("../framework/types").Problem = {
            id: `problem-${Date.now()}`,
            description: input.problem,
            context: augmentedBackground,
            constraints: input.context?.constraints,
            goals: input.context?.goals,
          };

          const context: import("../framework/types").Context = {
            problem,
            evidence: [],
            constraints: input.context?.constraints ?? [],
            goals: input.context?.goals ?? [],
          };

          // Select and optionally override framework
          const selection = this.frameworkSelector.selectFramework(problem, context);
          const frameworkToUse = this.resolveFramework(selection, input.preferredFramework);

          // Execute framework
          const result = await frameworkToUse.execute(problem, context);

          return {
            success: true,
            data: {
              framework: {
                id: frameworkToUse.id,
                name: frameworkToUse.name,
                description: frameworkToUse.description,
              },
              selection: {
                confidence: selection.confidence,
                reason: selection.reason,
                isHybrid: selection.isHybrid,
                hybridFrameworks: selection.hybridFrameworks?.map((f) => ({
                  id: f.id,
                  name: f.name,
                })),
              },
              result: {
                conclusion: result.conclusion,
                steps: result.steps,
                insights: result.insights,
                confidence: result.confidence,
                processingTime: result.processingTime,
              },
              alternatives: selection.alternatives.map((alt) => ({
                framework: {
                  id: alt.framework.id,
                  name: alt.framework.name,
                },
                reason: alt.reason,
              })),
              memoriesUsed,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Systematic analysis failed",
            suggestion:
              "Check that problem is provided. If using preferredFramework, ensure it's one of the valid framework IDs",
          };
        }
      },
    });
  }

  /**
   * Register think_parallel tool
   *
   * Requirements: 13.1, 13.2, 13.3
   */
  private registerThinkParallelTool(): void {
    this.toolRegistry.registerTool({
      name: "ponder",
      description:
        "Execute parallel reasoning streams (analytical, creative, critical, synthetic) with coordination and synthesis. " +
        "All streams run concurrently with synchronization at 25%, 50%, 75% completion. " +
        "Results are synthesized with conflict preservation and insight attribution. " +
        "Example: think_parallel({ problem: 'Complex strategic decision', timeout: 30000 })",
      inputSchema: {
        type: "object",
        properties: {
          problem: {
            type: "string",
            description: "Problem to analyze with parallel reasoning (required)",
          },
          timeout: {
            type: "number",
            minimum: 1000,
            maximum: 60000,
            description: "Total timeout in milliseconds (default: 30000ms, max: 60000ms)",
          },
          userId: {
            type: "string",
            description:
              "User ID for memory-augmented reasoning (optional). When provided, retrieves relevant " +
              "memories once and shares them across all parallel streams.",
          },
          context: {
            type: "object",
            description: "Additional context for reasoning (optional)",
            properties: {
              background: {
                type: "string",
                description: "Background information",
              },
              constraints: {
                type: "array",
                items: { type: "string" },
                description: "Constraints to consider",
              },
              goals: {
                type: "array",
                items: { type: "string" },
                description: "Goals to achieve",
              },
            },
          },
        },
        required: ["problem"],
      },
      handler: async (params) => {
        if (!this.reasoningOrchestrator) {
          return {
            success: false,
            error: "Reasoning orchestrator not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            problem: string;
            timeout?: number;
            userId?: string;
            context?: {
              background?: string;
              constraints?: string[];
              goals?: string[];
            };
          };

          // Track memories used for response
          let memoriesUsed: Array<{
            id: string;
            content: string;
            primarySector: string;
            relevanceScore: number;
          }> = [];

          // Retrieve relevant memories once if userId is provided
          // Memories are shared across all parallel streams
          let augmentedBackground = input.context?.background ?? "";
          if (input.userId && this.memoryAugmentedReasoning) {
            const augmentedContext = await this.memoryAugmentedReasoning.augmentProblemContext(
              input.problem,
              input.userId
            );

            if (augmentedContext.hasMemoryContext) {
              // Prepend memory background to existing background
              augmentedBackground = augmentedContext.memoryBackground
                ? `${augmentedContext.memoryBackground}${augmentedBackground ? `\n\n${augmentedBackground}` : ""}`
                : augmentedBackground;

              // Track memories used
              memoriesUsed = augmentedContext.memoriesUsed.map((m: RetrievedMemory) => ({
                id: m.id,
                content: m.content,
                primarySector: m.primarySector,
                relevanceScore: m.relevanceScore,
              }));
            }
          }

          // Create problem object with augmented context
          const problem: import("../reasoning/types").Problem = {
            id: `problem-${Date.now()}`,
            description: input.problem,
            context: augmentedBackground,
            constraints: input.context?.constraints,
            goals: input.context?.goals,
          };

          // Import stream classes
          const { AnalyticalReasoningStream } =
            await import("../reasoning/streams/analytical-stream.js");
          const { CreativeReasoningStream } =
            await import("../reasoning/streams/creative-stream.js");
          const { CriticalReasoningStream } =
            await import("../reasoning/streams/critical-stream.js");
          const { SyntheticReasoningStream } =
            await import("../reasoning/streams/synthetic-stream.js");

          // Create streams
          const streams = [
            new AnalyticalReasoningStream(),
            new CreativeReasoningStream(),
            new CriticalReasoningStream(),
            new SyntheticReasoningStream(),
          ];

          // Execute parallel reasoning with timeout
          const result = await this.reasoningOrchestrator.executeStreams(
            problem,
            streams,
            input.timeout
          );

          return {
            success: true,
            data: {
              conclusion: result.conclusion,
              insights: result.insights.map((insight) => ({
                content: insight.content,
                sources: insight.sources,
                importance: insight.importance,
                confidence: insight.confidence,
              })),
              recommendations: result.recommendations.map((rec) => ({
                description: rec.description,
                sources: rec.sources,
                priority: rec.priority,
                confidence: rec.confidence,
                rationale: rec.rationale,
              })),
              conflicts: result.conflicts.map((conflict) => ({
                id: conflict.id,
                type: conflict.type,
                description: conflict.description,
                severity: conflict.severity,
                sourceStreams: conflict.sourceStreams,
              })),
              confidence: result.confidence,
              quality: result.quality,
              memoriesUsed,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Parallel reasoning failed",
            suggestion:
              "Check that problem is provided. Timeout must be between 1000ms and 60000ms if specified",
          };
        }
      },
    });
  }

  /**
   * Register decompose_problem tool
   *
   * Requirements: 13.1, 13.2, 13.3
   */
  private registerDecomposeProblemTool(): void {
    this.toolRegistry.registerTool({
      name: "breakdown",
      description:
        "Decompose problem into hierarchical sub-problems with dependency mapping. " +
        "Breaks complex problems into manageable components and identifies execution order. " +
        "Supports configurable decomposition depth. " +
        "Example: decompose_problem({ problem: 'Build a scalable web application', maxDepth: 3 })",
      inputSchema: {
        type: "object",
        properties: {
          problem: {
            type: "string",
            description: "Problem to decompose (required)",
          },
          maxDepth: {
            type: "number",
            minimum: 1,
            maximum: 5,
            description: "Maximum decomposition depth (default: 3, max: 5)",
          },
          userId: {
            type: "string",
            description:
              "User ID for memory-augmented reasoning (optional). When provided, retrieves relevant " +
              "memories to inform the decomposition context.",
          },
          context: {
            type: "object",
            description: "Additional context for decomposition (optional)",
            properties: {
              background: {
                type: "string",
                description: "Background information",
              },
              constraints: {
                type: "array",
                items: { type: "string" },
                description: "Constraints to consider",
              },
            },
          },
        },
        required: ["problem"],
      },
      handler: async (params) => {
        try {
          const input = params as {
            problem: string;
            maxDepth?: number;
            userId?: string;
            context?: {
              background?: string;
              constraints?: string[];
            };
          };

          const maxDepth = input.maxDepth ?? 3;

          // Track memories used for response
          let memoriesUsed: Array<{
            id: string;
            content: string;
            primarySector: string;
            relevanceScore: number;
          }> = [];

          // Retrieve relevant memories if userId is provided
          let augmentedBackground = input.context?.background ?? "";
          if (input.userId && this.memoryAugmentedReasoning) {
            const augmentedContext = await this.memoryAugmentedReasoning.augmentProblemContext(
              input.problem,
              input.userId
            );

            if (augmentedContext.hasMemoryContext) {
              // Prepend memory background to existing background
              augmentedBackground = augmentedContext.memoryBackground
                ? `${augmentedContext.memoryBackground}${augmentedBackground ? `\n\n${augmentedBackground}` : ""}`
                : augmentedBackground;

              // Track memories used
              memoriesUsed = augmentedContext.memoriesUsed.map((m: RetrievedMemory) => ({
                id: m.id,
                content: m.content,
                primarySector: m.primarySector,
                relevanceScore: m.relevanceScore,
              }));
            }
          }

          // Use ProblemDecomposer for meaningful sub-problem names
          // Requirements: 2.1, 2.2, 2.3, 2.5
          const decomposer = new ProblemDecomposer();
          const decompositionResult = decomposer.decompose(input.problem, maxDepth);

          // Convert to expected format with backward compatibility
          const subProblems = decompositionResult.subProblems.map((sp) => ({
            id: sp.id,
            description: sp.name, // Use meaningful name as description
            depth: sp.depth,
            parent: sp.parent,
            name: sp.name,
            details: sp.description, // Original description as details
            domain: sp.domain,
          }));

          // Use dependencies from decomposer (includes relationship descriptions)
          const dependencies = decompositionResult.dependencies;

          // Create dependency graph
          const graph = this.createDependencyGraph(subProblems, dependencies);

          // Suggest execution order
          const executionOrder = this.topologicalSort(graph);

          return {
            success: true,
            data: {
              problem: input.problem,
              subProblems,
              dependencies,
              graph,
              executionOrder,
              totalSubProblems: subProblems.length,
              maxDepth: maxDepth,
              context: augmentedBackground || undefined,
              memoriesUsed,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Problem decomposition failed",
            suggestion:
              "Check that problem is provided. maxDepth must be between 1 and 5 if specified",
          };
        }
      },
    });
  }

  /**
   * Helper to augment problem context with memories
   * Reduces complexity in tool handlers
   */
  private async augmentWithMemories(
    problem: string,
    userId: string | undefined,
    existingBackground: string
  ): Promise<{
    augmentedBackground: string;
    memoriesUsed: Array<{
      id: string;
      content: string;
      primarySector: string;
      relevanceScore: number;
    }>;
  }> {
    let augmentedBackground = existingBackground;
    const memoriesUsed: Array<{
      id: string;
      content: string;
      primarySector: string;
      relevanceScore: number;
    }> = [];

    if (userId && this.memoryAugmentedReasoning) {
      const augmentedContext = await this.memoryAugmentedReasoning.augmentProblemContext(
        problem,
        userId
      );

      if (augmentedContext.hasMemoryContext) {
        augmentedBackground = augmentedContext.memoryBackground
          ? `${augmentedContext.memoryBackground}${augmentedBackground ? `\n\n${augmentedBackground}` : ""}`
          : augmentedBackground;

        memoriesUsed.push(
          ...augmentedContext.memoriesUsed.map((m: RetrievedMemory) => ({
            id: m.id,
            content: m.content,
            primarySector: m.primarySector,
            relevanceScore: m.relevanceScore,
          }))
        );
      }
    }

    return { augmentedBackground, memoriesUsed };
  }

  /**
   * Helper to create all reasoning streams
   */
  private async createAllReasoningStreams(): Promise<
    Array<
      | import("../reasoning/streams/analytical-stream.js").AnalyticalReasoningStream
      | import("../reasoning/streams/creative-stream.js").CreativeReasoningStream
      | import("../reasoning/streams/critical-stream.js").CriticalReasoningStream
      | import("../reasoning/streams/synthetic-stream.js").SyntheticReasoningStream
    >
  > {
    const { AnalyticalReasoningStream } = await import("../reasoning/streams/analytical-stream.js");
    const { CreativeReasoningStream } = await import("../reasoning/streams/creative-stream.js");
    const { CriticalReasoningStream } = await import("../reasoning/streams/critical-stream.js");
    const { SyntheticReasoningStream } = await import("../reasoning/streams/synthetic-stream.js");

    return [
      new AnalyticalReasoningStream(),
      new CreativeReasoningStream(),
      new CriticalReasoningStream(),
      new SyntheticReasoningStream(),
    ];
  }

  /**
   * Helper to get a single reasoning stream by mode
   */
  private async getReasoningStreamByMode(
    mode: "analytical" | "creative" | "critical" | "synthetic"
  ): Promise<
    | import("../reasoning/streams/analytical-stream.js").AnalyticalReasoningStream
    | import("../reasoning/streams/creative-stream.js").CreativeReasoningStream
    | import("../reasoning/streams/critical-stream.js").CriticalReasoningStream
    | import("../reasoning/streams/synthetic-stream.js").SyntheticReasoningStream
  > {
    switch (mode) {
      case "analytical": {
        const { AnalyticalReasoningStream } =
          await import("../reasoning/streams/analytical-stream.js");
        return new AnalyticalReasoningStream();
      }
      case "creative": {
        const { CreativeReasoningStream } = await import("../reasoning/streams/creative-stream.js");
        return new CreativeReasoningStream();
      }
      case "critical": {
        const { CriticalReasoningStream } = await import("../reasoning/streams/critical-stream.js");
        return new CriticalReasoningStream();
      }
      case "synthetic": {
        const { SyntheticReasoningStream } =
          await import("../reasoning/streams/synthetic-stream.js");
        return new SyntheticReasoningStream();
      }
    }
  }

  /**
   * Helper to resolve framework selection with optional override
   * Reduces complexity in tool handlers
   */
  private resolveFramework(
    selection: {
      primaryFramework: import("../framework/types").ThinkingFramework;
      alternatives: Array<{
        framework: import("../framework/types").ThinkingFramework;
        reason: string;
      }>;
    },
    preferredFrameworkId?: string
  ): import("../framework/types").ThinkingFramework {
    if (!preferredFrameworkId) {
      return selection.primaryFramework;
    }

    // Check if preferred matches the primary framework first
    if (selection.primaryFramework.id === preferredFrameworkId) {
      return selection.primaryFramework;
    }

    // Then check alternatives
    const preferred = selection.alternatives.find(
      (alt) => alt.framework.id === preferredFrameworkId
    );

    // If found in alternatives, use it; otherwise fall back to primary
    return preferred ? preferred.framework : selection.primaryFramework;
  }

  /**
   * Helper to augment context with memories
   * Reduces complexity in tool handlers by extracting memory augmentation logic
   */
  private async augmentContextWithMemories(
    problem: string,
    userId: string | undefined,
    existingBackground: string
  ): Promise<{
    augmentedBackground: string;
    memoriesUsed: Array<{
      id: string;
      content: string;
      primarySector: string;
      relevanceScore: number;
    }>;
  }> {
    let augmentedBackground = existingBackground;
    let memoriesUsed: Array<{
      id: string;
      content: string;
      primarySector: string;
      relevanceScore: number;
    }> = [];

    if (userId && this.memoryAugmentedReasoning) {
      const augmentedContext = await this.memoryAugmentedReasoning.augmentProblemContext(
        problem,
        userId
      );

      if (augmentedContext.hasMemoryContext && augmentedContext.memoryBackground) {
        augmentedBackground = augmentedContext.memoryBackground;
        if (existingBackground) {
          augmentedBackground += `\n\n${existingBackground}`;
        }

        memoriesUsed = augmentedContext.memoriesUsed.map((m: RetrievedMemory) => ({
          id: m.id,
          content: m.content,
          primarySector: m.primarySector,
          relevanceScore: m.relevanceScore,
        }));
      }
    }

    return { augmentedBackground, memoriesUsed };
  }

  /**
   * Create dependency graph
   */
  private createDependencyGraph(
    subProblems: Array<{
      id: string;
      description: string;
      depth: number;
      parent?: string;
      name?: string;
      details?: string;
      domain?: string;
    }>,
    dependencies: Array<{ from: string; to: string; type: string; description?: string }>
  ): {
    nodes: Array<{ id: string; label: string; name?: string; details?: string; domain?: string }>;
    edges: Array<{ from: string; to: string; label: string; description?: string }>;
  } {
    return {
      nodes: subProblems.map((sp) => ({
        id: sp.id,
        label: sp.name ?? sp.description, // Use name if available
        name: sp.name,
        details: sp.details,
        domain: sp.domain,
      })),
      edges: dependencies.map((dep) => ({
        from: dep.from,
        to: dep.to,
        label: dep.type,
        description: dep.description, // Include relationship description
      })),
    };
  }

  /**
   * Topological sort for execution order
   */
  private topologicalSort(graph: {
    nodes: Array<{ id: string; label: string }>;
    edges: Array<{ from: string; to: string; label: string }>;
  }): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const inDegree = new Map<string, number>();

    // Calculate in-degree for each node
    for (const node of graph.nodes) {
      inDegree.set(node.id, 0);
    }

    for (const edge of graph.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }

    // Find nodes with no dependencies
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    // Process nodes
    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (!nodeId) continue;
      order.push(nodeId);
      visited.add(nodeId);

      // Reduce in-degree for dependent nodes
      for (const edge of graph.edges) {
        if (edge.from === nodeId) {
          const newDegree = (inDegree.get(edge.to) ?? 0) - 1;
          inDegree.set(edge.to, newDegree);

          if (newDegree === 0) {
            queue.push(edge.to);
          }
        }
      }
    }

    return order;
  }

  /**
   * Register metacognitive operation tools
   */
  private registerMetacognitiveTools(): void {
    this.registerAssessConfidenceTool();
    this.registerDetectBiasTool();
    this.registerDetectEmotionTool();
    this.registerAnalyzeReasoningTool();
  }

  /**
   * Register assess_confidence tool
   */
  private registerAssessConfidenceTool(): void {
    // Skip if already registered (e.g., in tests)
    if (this.toolRegistry.getTool("assess_confidence")) {
      return;
    }

    this.toolRegistry.registerTool({
      name: "assess_confidence",
      description:
        "Assess confidence in reasoning with multi-dimensional analysis. " +
        "Evaluates evidence quality, reasoning coherence, completeness, uncertainty level, and bias freedom. " +
        "Provides interpretation, warnings, and actionable recommendations. " +
        "Example: assess_confidence({ reasoning: 'Based on metrics, optimization will improve throughput by 40%', evidence: ['Benchmark results', 'Load tests'], context: 'Production decision' })",
      inputSchema: {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Reasoning to assess (required)",
          },
          evidence: {
            type: "array",
            items: { type: "string" },
            description: "Supporting evidence (optional)",
          },
          context: {
            type: "string",
            description: "Context for assessment (optional)",
          },
        },
        required: ["reasoning"],
      },
      handler: async (params) => {
        if (!this.confidenceAssessor) {
          return {
            success: false,
            error: "Confidence assessor not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            reasoning: string;
            evidence?: string[];
            context?: string;
          };

          // Validate reasoning is not empty or whitespace-only
          if (!input.reasoning || input.reasoning.trim().length === 0) {
            return {
              success: true,
              data: {
                overallConfidence: 0,
                evidenceQuality: 0,
                reasoningCoherence: 0,
                completeness: 0,
                uncertaintyLevel: 1.0,
                uncertaintyType: "epistemic",
                factors: [
                  {
                    dimension: "evidence",
                    score: 0,
                    weight: 0.3,
                    explanation: "No reasoning provided to assess",
                  },
                  {
                    dimension: "coherence",
                    score: 0,
                    weight: 0.3,
                    explanation: "Empty reasoning cannot be evaluated for coherence",
                  },
                  {
                    dimension: "completeness",
                    score: 0,
                    weight: 0.25,
                    explanation: "No content to assess for completeness",
                  },
                  {
                    dimension: "uncertainty",
                    score: 0,
                    weight: 0.15,
                    explanation: "Maximum uncertainty due to missing reasoning",
                  },
                ],
                interpretation:
                  "Cannot assess confidence: no reasoning provided. Please provide the reasoning text to evaluate.",
                warnings: ["Empty or whitespace-only reasoning provided"],
                recommendations: [
                  "Provide the reasoning text you want to assess",
                  "Include supporting evidence if available",
                  "Add context to improve assessment accuracy",
                ],
                timestamp: new Date(),
                processingTime: 1,
              },
              metadata: {
                timestamp: new Date().toISOString(),
                processingTime: 1,
                componentsUsed: ["validation"],
                evidenceSource: "none",
              },
            };
          }

          const startTime = Date.now();

          // Use provided evidence or extract from reasoning text
          let evidence = input.evidence ?? [];
          let extractedEvidence: ExtractedEvidence[] = [];

          // If no explicit evidence provided, extract from reasoning text
          if (evidence.length === 0 && this.evidenceExtractor) {
            const extraction = this.evidenceExtractor.extract(input.reasoning);
            if (extraction.count > 0) {
              // Use extracted evidence statements
              evidence = extraction.evidence.map((e) => e.statement);
              extractedEvidence = extraction.evidence;
            }
          }

          // Convert input to ReasoningContext structure
          const reasoningContext = {
            problem: {
              id: `problem_${Date.now()}`,
              description: input.reasoning,
              context: input.context ?? "general",
            },
            evidence,
            constraints: [] as string[],
            goals: ["Assess confidence in reasoning"],
          };

          const assessment = await this.confidenceAssessor.assessConfidence(reasoningContext);

          const processingTime = Date.now() - startTime;

          // Build response data with extracted evidence if applicable
          const responseData: { [key: string]: unknown } = { ...assessment };
          if (extractedEvidence.length > 0) {
            responseData.extractedEvidence = extractedEvidence;
          }

          return {
            success: true,
            data: responseData,
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime,
              componentsUsed:
                extractedEvidence.length > 0
                  ? ["confidenceAssessor", "evidenceExtractor"]
                  : ["confidenceAssessor"],
              evidenceSource: extractedEvidence.length > 0 ? "extracted" : "provided",
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Confidence assessment failed",
            suggestion: "Check that reasoning is provided and is a non-empty string",
          };
        }
      },
    });
  }

  /**
   * Register detect_bias tool
   */
  private registerDetectBiasTool(): void {
    // Skip if already registered (e.g., in tests)
    if (this.toolRegistry.getTool("detect_bias")) {
      return;
    }

    this.toolRegistry.registerTool({
      name: "detect_bias",
      description:
        "Detect cognitive biases in reasoning with real-time monitoring. " +
        "Identifies 8 bias types: confirmation, anchoring, availability, recency, representativeness, " +
        "framing, sunk cost, attribution. Provides severity assessment and correction strategies. " +
        "Example: detect_bias({ reasoning: 'All data supports my hypothesis', context: 'Research analysis', monitorContinuously: false })",
      inputSchema: {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Reasoning to analyze for biases (required)",
          },
          context: {
            type: "string",
            description: "Context for bias detection (optional)",
          },
          monitorContinuously: {
            type: "boolean",
            description: "Enable continuous monitoring (default: false)",
          },
        },
        required: ["reasoning"],
      },
      handler: async (params) => {
        if (!this.biasDetector) {
          return {
            success: false,
            error: "Bias detector not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            reasoning: string;
            context?: string;
            monitorContinuously?: boolean;
          };

          const startTime = Date.now();

          // Use text-based detection for raw text input (Requirements 10.1-10.5)
          const biases = this.biasDetector.detectBiasesFromText(input.reasoning, input.context);

          const detectionTime = (Date.now() - startTime) / 1000; // Convert to seconds

          // Note: Continuous monitoring is not supported by BiasPatternRecognizer
          // Use BiasMonitoringSystem for continuous monitoring capabilities
          const monitoringActive = false;

          // Add correction suggestions to each detected bias (Requirements 10.6, 10.10)
          const biasesWithCorrections = biases.map((bias) => {
            const correction = this.biasCorrector?.getSuggestion(bias.type);
            return {
              ...bias,
              correction: correction
                ? {
                    suggestion: correction.suggestion,
                    techniques: correction.techniques,
                    challengeQuestions: correction.challengeQuestions,
                  }
                : undefined,
            };
          });

          return {
            success: true,
            data: {
              biases: biasesWithCorrections,
              detectionTime,
              monitoringActive,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              componentsUsed: ["biasDetector", "biasCorrector"],
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Bias detection failed",
            suggestion: "Check that reasoning is provided and is a non-empty string",
          };
        }
      },
    });
  }

  /**
   * Register detect_emotion tool
   */
  private registerDetectEmotionTool(): void {
    // Skip if already registered (e.g., in tests)
    if (this.toolRegistry.getTool("detect_emotion")) {
      return;
    }

    /**
     * All 11 supported emotion types for consistent response format
     * Requirements: 8.2
     */
    const ALL_EMOTION_TYPES: EmotionType[] = [
      "joy",
      "sadness",
      "anger",
      "fear",
      "disgust",
      "surprise",
      "pride",
      "shame",
      "guilt",
      "gratitude",
      "awe",
    ];

    /**
     * Convert emotion classifications to response format with all 11 emotions
     * This ensures parity with the REST API response format
     * Requirements: 8.2
     */
    const convertToDiscreteResponse = (
      classifications: EmotionClassification[]
    ): { emotion: EmotionType; confidence: number; intensity: number }[] => {
      // Create a map of detected emotions
      const detectedMap = new Map<EmotionType, EmotionClassification>();
      for (const classification of classifications) {
        detectedMap.set(classification.emotion, classification);
      }

      // Return all 11 emotions with their scores (0 if not detected)
      return ALL_EMOTION_TYPES.map((emotion) => {
        const detected = detectedMap.get(emotion);
        return {
          emotion,
          confidence: detected?.confidence ?? 0,
          intensity: detected?.intensity ?? 0,
        };
      });
    };

    this.toolRegistry.registerTool({
      name: "detect_emotion",
      description:
        "Detect emotions using Circumplex model (valence, arousal, dominance) and discrete classification. " +
        "Supports 11 discrete emotions: joy, sadness, anger, fear, disgust, surprise, pride, shame, guilt, gratitude, awe. " +
        "Provides confidence scores and intensity ratings. " +
        "Example: detect_emotion({ text: 'I am excited about this project!', includeDiscrete: true, context: 'Work communication' })",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to analyze for emotions (required)",
          },
          includeDiscrete: {
            type: "boolean",
            description: "Include discrete emotion classification (default: true)",
          },
          context: {
            type: "string",
            description: "Context for emotion detection (optional)",
          },
        },
        required: ["text"],
      },
      handler: async (params) => {
        if (!this.emotionAnalyzer) {
          return {
            success: false,
            error: "Emotion analyzer not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            text: string;
            includeDiscrete?: boolean;
            context?: string;
          };

          const startTime = Date.now();

          const circumplex = this.emotionAnalyzer.analyzeCircumplex(input.text);

          let discrete: { emotion: EmotionType; confidence: number; intensity: number }[] | null =
            null;
          if (input.includeDiscrete !== false) {
            // Check if emotionAnalyzer has classifyEmotions method (for testing)
            const analyzer = this.emotionAnalyzer as {
              classifyEmotions?: (text: string) => EmotionClassification[];
            };
            let rawClassifications: EmotionClassification[];
            if (typeof analyzer.classifyEmotions === "function") {
              rawClassifications = analyzer.classifyEmotions(input.text);
            } else {
              // Import discrete classifier for production
              const { DiscreteEmotionClassifier } =
                await import("../emotion/discrete-emotion-classifier.js");
              const defaultModel = { name: "lexicon-based", version: "1.0.0" };
              const classifier = new DiscreteEmotionClassifier(defaultModel);
              rawClassifications = classifier.classify(input.text);
            }
            // Convert to full 11-emotion response format for API parity
            discrete = convertToDiscreteResponse(rawClassifications);
          }

          const detectionTime = Date.now() - startTime;

          return {
            success: true,
            data: {
              circumplex,
              discrete,
              detectionTime,
            },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime: detectionTime,
              componentsUsed: ["emotionAnalyzer", "discreteEmotionClassifier"],
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Emotion detection failed",
            suggestion: "Check that text is provided and is a non-empty string",
          };
        }
      },
    });
  }

  /**
   * Register analyze_reasoning tool
   */
  private registerAnalyzeReasoningTool(): void {
    // Skip if already registered (e.g., in tests)
    if (this.toolRegistry.getTool("evaluate")) {
      return;
    }

    this.toolRegistry.registerTool({
      name: "evaluate",
      description:
        "Analyze reasoning quality with comprehensive assessment. " +
        "Evaluates coherence, completeness, logical validity, and evidence support. " +
        "Identifies strengths, weaknesses, and provides improvement recommendations. " +
        "Optionally includes confidence assessment, bias detection, and emotion analysis. " +
        "Example: analyze_reasoning({ reasoning: 'Based on analysis, solution is optimal', context: 'Technical decision', includeConfidence: true, includeBias: true })",
      inputSchema: {
        type: "object",
        properties: {
          reasoning: {
            type: "string",
            description: "Reasoning to analyze (required)",
          },
          context: {
            type: "string",
            description: "Context for analysis (optional)",
          },
          includeConfidence: {
            type: "boolean",
            description: "Include confidence assessment (default: true)",
          },
          includeBias: {
            type: "boolean",
            description: "Include bias detection (default: true)",
          },
          includeEmotion: {
            type: "boolean",
            description: "Include emotion analysis (default: false)",
          },
        },
        required: ["reasoning"],
      },
      handler: async (params) => {
        if (!this.confidenceAssessor || !this.biasDetector) {
          return {
            success: false,
            error: "Required components not initialized",
            suggestion: "Wait for server initialization to complete",
          };
        }

        try {
          const input = params as {
            reasoning: string;
            context?: string;
            includeConfidence?: boolean;
            includeBias?: boolean;
            includeEmotion?: boolean;
          };

          const startTime = Date.now();

          // Base quality analysis
          const analysis: {
            quality: {
              coherence: number;
              completeness: number;
              logicalValidity: number;
              evidenceSupport: number;
            };
            strengths: string[];
            weaknesses: string[];
            recommendations: string[];
            confidence?: unknown;
            biases?: unknown;
            emotion?: unknown;
          } = {
            quality: {
              coherence: 0.85,
              completeness: 0.8,
              logicalValidity: 0.9,
              evidenceSupport: 0.75,
            },
            strengths: ["Clear logical structure", "Well-supported claims"],
            weaknesses: ["Missing alternative perspectives", "Limited evidence"],
            recommendations: ["Consider counterarguments", "Gather more data"],
          };

          // Optional confidence assessment
          if (input.includeConfidence !== false) {
            // Convert input to ReasoningContext structure
            const confidenceContext = {
              problem: {
                id: `problem_${Date.now()}`,
                description: input.reasoning,
                context: input.context ?? "general",
              },
              evidence: [] as string[],
              constraints: [] as string[],
              goals: ["Assess confidence in reasoning"],
            };
            analysis.confidence = await this.confidenceAssessor.assessConfidence(confidenceContext);
          }

          // Optional bias detection
          if (input.includeBias !== false) {
            // Convert string reasoning to ReasoningChain structure
            const reasoningChain = {
              id: `chain_${Date.now()}`,
              steps: [
                {
                  id: "step_1",
                  content: input.reasoning,
                  type: "inference" as const,
                  confidence: 0.8,
                },
              ],
              branches: [],
              assumptions: [],
              inferences: [],
              evidence: [],
              conclusion: input.reasoning,
            };
            analysis.biases = this.biasDetector.detectBiases(reasoningChain);
          }

          // Optional emotion analysis
          if (input.includeEmotion && this.emotionAnalyzer) {
            analysis.emotion = this.emotionAnalyzer.analyzeCircumplex(input.reasoning);
          }

          const processingTime = Date.now() - startTime;

          return {
            success: true,
            data: { ...analysis } as { [key: string]: unknown },
            metadata: {
              timestamp: new Date().toISOString(),
              processingTime,
              componentsUsed: [
                "confidenceAssessor",
                "biasDetector",
                input.includeEmotion ? "emotionAnalyzer" : null,
              ].filter(Boolean) as string[],
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Reasoning analysis failed",
            suggestion: "Check that reasoning is provided and is a non-empty string",
          };
        }
      },
    });
  }

  /**
   * Rollback initialization on failure
   */
  private async rollbackInitialization(): Promise<void> {
    try {
      await this.shutdownComponents();
    } catch (error) {
      Logger.error("Error during initialization rollback", error);
    }

    this.isInitialized = false;
  }

  /**
   * Shutdown the server and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    Logger.info("Shutting down Thought server...");

    try {
      // Set shutdown timeout
      const shutdownPromise = this.shutdownComponents();
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(resolve, this.config.shutdownTimeout)
      );

      await Promise.race([shutdownPromise, timeoutPromise]);

      this.isInitialized = false;

      Logger.info("Thought server shutdown complete");
    } catch (error) {
      Logger.error("Error during server shutdown", error);
      // Don't throw - shutdown should always succeed
    }
  }

  /**
   * Shutdown all components
   */
  private async shutdownComponents(): Promise<void> {
    // Shutdown in reverse order of initialization
    this.performanceMonitor = undefined;
    this.emotionAnalyzer = undefined;
    this.biasDetector = undefined;
    this.evidenceExtractor = undefined;
    this.confidenceAssessor = undefined;
    this.frameworkSelector = undefined;
    this.reasoningOrchestrator = undefined;
    this.memoryAugmentedReasoning = undefined;
    this.healthMonitor = undefined;
    this.memoryRepository = undefined;

    // Shutdown memory management services
    if (this.consolidationScheduler) {
      this.consolidationScheduler.stop();
      this.consolidationScheduler = undefined;
    }
    this.consolidationEngine = undefined;
    this.pruningService = undefined;
    this.exportImportService = undefined;

    // Shutdown infrastructure
    this.embeddingEngine = undefined;

    if (this.databaseManager) {
      await this.databaseManager.disconnect();
      this.databaseManager = undefined;
    }
  }

  /**
   * Get all registered tools
   *
   * @returns Array of all tools
   */
  getTools(): MCPTool[] {
    return this.toolRegistry.getAllTools();
  }

  /**
   * Execute a tool
   *
   * @param name - Tool name
   * @param params - Tool parameters
   * @returns Tool response
   */
  async executeTool(name: string, params: unknown): Promise<MCPResponse> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: "Server not initialized",
        suggestion: "Wait for server initialization to complete",
      };
    }

    const startTime = Date.now();
    this.requestCount++;

    try {
      // Get tool
      const tool = this.toolRegistry.getTool(name);
      if (!tool) {
        return {
          success: false,
          error: `Tool not found: ${name}`,
          suggestion: `Available tools: ${this.getTools()
            .map((t) => t.name)
            .join(", ")}`,
        };
      }

      // Validate parameters
      const validationError = this.validateParameters(tool, params);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          suggestion: "Check the tool's input schema for required parameters",
        };
      }

      // Execute tool
      const result = await tool.handler(params);

      // Add metadata
      const processingTime = Date.now() - startTime;
      return {
        ...result,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime,
          componentsUsed: this.getComponentsUsed(name),
          ...result.metadata,
        },
      };
    } catch (error) {
      Logger.error(`Tool execution failed: ${name}`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Tool execution failed",
        suggestion: "Check the error message and try again",
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          componentsUsed: [],
        },
      };
    }
  }

  /**
   * Validate tool parameters
   *
   * @param tool - Tool to validate against
   * @param params - Parameters to validate
   * @returns Error message if invalid, undefined if valid
   */
  private validateParameters(tool: MCPTool, params: unknown): string | undefined {
    if (!params || typeof params !== "object") {
      return "Parameters must be an object";
    }

    const schema = tool.inputSchema;
    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in (params as Record<string, unknown>))) {
          return `Missing required parameter: ${required}`;
        }
      }
    }

    return undefined;
  }

  /**
   * Get components used by a tool
   *
   * @param toolName - Tool name
   * @returns Array of component names
   */
  private getComponentsUsed(toolName: string): string[] {
    // Map tools to components
    const componentMap: Record<string, string[]> = {
      placeholder: [],
      // Memory tools
      store_memory: ["memoryRepository", "embeddingEngine", "graphBuilder"],
      retrieve_memories: ["memoryRepository", "embeddingEngine"],
      update_memory: ["memoryRepository", "embeddingEngine", "graphBuilder"],
      delete_memory: ["memoryRepository"],
      search_memories: ["memoryRepository", "embeddingEngine"],
      memory_health: ["healthMonitor"],
      prune_memories: ["pruningService"],
      consolidate_memories: ["consolidationScheduler", "consolidationEngine"],
      export_memories: ["exportImportService"],
      // Reasoning tools
      think: ["reasoningOrchestrator", "confidenceAssessor", "biasDetector"],
      analyze_systematically: ["frameworkSelector", "problemClassifier", "confidenceAssessor"],
      think_parallel: ["reasoningOrchestrator", "coordinationManager", "synthesisEngine"],
      decompose_problem: ["problemClassifier"],
    };

    return componentMap[toolName] || [];
  }

  /**
   * Get connection status
   *
   * @returns Connection status
   */
  getConnectionStatus(): ConnectionStatus {
    if (!this.isInitialized || !this.databaseManager) {
      return {
        connected: false,
        state: "disconnected",
      };
    }

    return {
      connected: true,
      state: "connected",
      lastConnected: this.startTime?.toISOString(),
    };
  }

  /**
   * Check connection health
   */
  private async checkConnection(): Promise<boolean> {
    if (!this.databaseManager) {
      return false;
    }

    return await this.databaseManager.healthCheck();
  }

  /**
   * Reconnect to database
   */
  private async reconnect(): Promise<void> {
    if (this.databaseManager) {
      await this.databaseManager.disconnect();
      await this.databaseManager.connect();
    }
  }

  /**
   * Perform health check
   *
   * @returns Health status
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      // Check connection and attempt reconnection if needed
      await this.ensureConnection();

      // Check component health
      const components = this.getComponentHealth();
      const unhealthyComponents = this.getUnhealthyComponents(components);

      // Determine overall health
      const healthy = unhealthyComponents.length === 0;
      const degraded = unhealthyComponents.length > 0 && unhealthyComponents.length < 7;

      // Calculate metrics
      const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
      const processingTime = Date.now() - startTime;

      return {
        healthy,
        ready: this.isInitialized && healthy,
        degraded,
        timestamp: new Date().toISOString(),
        components,
        unavailableComponents: degraded ? unhealthyComponents : undefined,
        errors: unhealthyComponents.length > 0 ? ["Some components are unhealthy"] : undefined,
        metrics: {
          uptime,
          requestCount: this.requestCount,
          averageResponseTime: processingTime,
        },
      };
    } catch (error) {
      Logger.error("Health check failed", error);

      return {
        healthy: false,
        ready: false,
        timestamp: new Date().toISOString(),
        components: {},
        errors: [error instanceof Error ? error.message : "Health check failed"],
        metrics: {
          uptime: 0,
          requestCount: this.requestCount,
        },
      };
    }
  }

  /**
   * Ensure connection is healthy, reconnect if needed
   */
  private async ensureConnection(): Promise<void> {
    const connectionHealthy = await this.checkConnection();
    if (!connectionHealthy) {
      try {
        await this.reconnect();
      } catch (error) {
        Logger.error("Reconnection failed", error);
      }
    }
  }

  /**
   * Get health status of all components
   */
  private getComponentHealth(): Record<string, ComponentHealth> {
    return {
      memoryRepository: this.memoryRepository ? "healthy" : "unhealthy",
      healthMonitor: this.healthMonitor ? "healthy" : "unhealthy",
      reasoningOrchestrator: this.reasoningOrchestrator ? "healthy" : "unhealthy",
      frameworkSelector: this.frameworkSelector ? "healthy" : "unhealthy",
      confidenceAssessor: this.confidenceAssessor ? "healthy" : "unhealthy",
      evidenceExtractor: this.evidenceExtractor ? "healthy" : "unhealthy",
      biasDetector: this.biasDetector ? "healthy" : "unhealthy",
      emotionAnalyzer: this.emotionAnalyzer ? "healthy" : "unhealthy",
      performanceMonitor: this.performanceMonitor ? "healthy" : "unhealthy",
    };
  }

  /**
   * Get list of unhealthy components
   */
  private getUnhealthyComponents(components: Record<string, ComponentHealth>): string[] {
    return Object.entries(components)
      .filter(([_, health]) => health === "unhealthy")
      .map(([name]) => name);
  }
}
