/**
 * Main MCP server implementation for cognitive architecture
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { CognitiveOrchestrator } from "../cognitive/CognitiveOrchestrator.js";
import { MemorySystem } from "../cognitive/MemorySystem.js";
import { MetacognitionModule } from "../cognitive/MetacognitionModule.js";
import { IMCPServer, IToolHandler } from "../interfaces/mcp.js";
import type {
  CognitiveConfig,
  CognitiveInput,
  Context,
  Episode,
  MemoryChunk,
  ReasoningStep,
  ThoughtResult,
} from "../types/core.js";
import { ProcessingMode } from "../types/core.js";
import {
  AnalysisResult,
  AnalyzeReasoningArgs,
  MemoryResult,
  RecallArgs,
  RecallResult,
  RememberArgs,
  ThinkArgs,
  TOOL_SCHEMAS,
} from "../types/mcp.js";
import { ConfigManager } from "../utils/config.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import {
  PerformanceMonitor,
  PerformanceThresholds,
} from "../utils/PerformanceMonitor.js";
import {
  FormattedResponse,
  ResponseFormatter,
} from "../utils/ResponseFormatter.js";

export class CognitiveMCPServer implements IMCPServer, IToolHandler {
  private server: Server;
  private initialized: boolean = false;
  private cognitiveOrchestrator: CognitiveOrchestrator;
  private memorySystem: MemorySystem;
  private performanceMonitor: PerformanceMonitor;
  private metacognitionModule: MetacognitionModule;
  private configManager: ConfigManager;

  constructor(performanceThresholds?: Partial<PerformanceThresholds>) {
    this.server = new Server(
      {
        name: "thought-mcp",
        version: "1.0.0",
        description:
          "MCP server implementing human-like cognitive architecture for enhanced AI reasoning",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize configuration manager
    this.configManager = new ConfigManager();

    // Initialize cognitive components
    this.cognitiveOrchestrator = new CognitiveOrchestrator();

    // Initialize memory system with brain directory configuration
    const memoryFilePath = this.configManager.getMemoryFilePath();
    this.memorySystem = new MemorySystem({
      persistence: {
        storage_type: "file",
        file_path: memoryFilePath,
      },
      persistence_enabled: true,
      auto_save_enabled: true,
      auto_recovery_enabled: true,
    });

    this.metacognitionModule = new MetacognitionModule();
    this.performanceMonitor = new PerformanceMonitor(performanceThresholds);
  }

  async initialize(testMode: boolean = false): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize cognitive components first
    await this.cognitiveOrchestrator.initialize();
    await this.memorySystem.initialize();
    await this.metacognitionModule.initialize({});

    this.registerTools();
    this.setupRequestHandlers();

    // Connect to stdio transport only if not in test mode
    if (!testMode) {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
    }

    this.initialized = true;
    console.error("Cognitive MCP Server initialized successfully");
  }

  registerTools(): void {
    try {
      // Register list_tools handler
      this.server.setRequestHandler(ListToolsRequestSchema, async () => {
        const tools: Tool[] = Object.values(TOOL_SCHEMAS).map((schema) => ({
          name: schema.name,
          description: schema.description,
          inputSchema: schema.inputSchema,
        }));

        console.error(
          `Registered ${tools.length} cognitive tools: ${tools
            .map((t) => t.name)
            .join(", ")}`
        );
        return { tools };
      });

      // Register call_tool handler with enhanced error handling and validation
      this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const requestId = this.generateRequestId();

        // Start performance measurement
        const measurement = this.performanceMonitor.startMeasurement(
          requestId,
          name
        );

        // Validate tool name
        if (!Object.keys(TOOL_SCHEMAS).includes(name)) {
          measurement.recordCognitiveMetrics({
            confidenceScore: 0,
            reasoningDepth: 0,
            memoryRetrievals: 0,
            workingMemoryLoad: 0,
          });
          const metrics = measurement.complete();

          const errorResponse = ResponseFormatter.formatErrorResponse(
            `Unknown tool: ${name}. Available tools: ${Object.keys(
              TOOL_SCHEMAS
            ).join(", ")}`,
            name,
            metrics.responseTime,
            requestId
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(errorResponse, null, 2),
              },
            ],
          };
        }

        // Validate arguments exist
        if (!args) {
          measurement.recordCognitiveMetrics({
            confidenceScore: 0,
            reasoningDepth: 0,
            memoryRetrievals: 0,
            workingMemoryLoad: 0,
          });
          const metrics = measurement.complete();

          const errorResponse = ResponseFormatter.formatErrorResponse(
            `Missing arguments for tool: ${name}`,
            name,
            metrics.responseTime,
            requestId
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(errorResponse, null, 2),
              },
            ],
          };
        }

        try {
          let result;
          let formattedResponse: FormattedResponse<unknown>;

          switch (name) {
            case "think": {
              result = await this.handleThink(this.validateThinkArgs(args));
              measurement.recordCognitiveMetrics({
                confidenceScore: result.confidence,
                reasoningDepth: result.reasoning_path?.length || 0,
                memoryRetrievals: result.metadata?.memory_retrievals || 0,
                workingMemoryLoad:
                  (result.metadata?.working_memory_load as number) || 0,
                emotionalProcessingTime: result.metadata
                  ?.emotional_processing_time as number | undefined,
                metacognitionTime: result.metadata?.metacognition_time as
                  | number
                  | undefined,
              });
              const thinkMetrics = measurement.complete();
              formattedResponse = ResponseFormatter.formatThinkResponse(
                result,
                thinkMetrics.responseTime,
                requestId
              );
              break;
            }
            case "remember": {
              result = await this.handleRemember(
                this.validateRememberArgs(args)
              );
              measurement.recordCognitiveMetrics({
                confidenceScore: 1.0, // Memory storage is typically successful
                reasoningDepth: 1,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.5,
              });
              const rememberMetrics = measurement.complete();
              formattedResponse = ResponseFormatter.formatRememberResponse(
                result,
                rememberMetrics.responseTime,
                requestId
              );
              break;
            }
            case "recall": {
              result = await this.handleRecall(this.validateRecallArgs(args));
              measurement.recordCognitiveMetrics({
                confidenceScore: result.memories?.length > 0 ? 0.8 : 0.3,
                reasoningDepth: 1,
                memoryRetrievals: result.memories?.length || 0,
                workingMemoryLoad: 0.3,
              });
              measurement.complete();
              formattedResponse = ResponseFormatter.formatRecallResponse(
                result,
                requestId
              );
              break;
            }
            case "analyze_reasoning": {
              result = await this.handleAnalyzeReasoning(
                this.validateAnalyzeReasoningArgs(args)
              );
              measurement.recordCognitiveMetrics({
                confidenceScore:
                  (result as AnalysisResult).coherence_score || 0.5,
                reasoningDepth:
                  (result as AnalysisResult).detected_biases?.length || 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.7,
                metacognitionTime: 100,
              });
              const analyzeMetrics = measurement.complete();
              formattedResponse = {
                success: true,
                data: result,
                metadata: {
                  timestamp: Date.now(),
                  processing_time_ms: analyzeMetrics.responseTime,
                  tool_name: "analyze_reasoning",
                  version: "1.0.0",
                  ...(requestId && { request_id: requestId }),
                },
              };
              break;
            }
            default:
              throw new Error(`Unhandled tool: ${name}`);
          }

          // Validate response structure
          if (!ResponseFormatter.validateResponse(formattedResponse)) {
            console.error(`Invalid response structure for tool ${name}`);
            formattedResponse = ResponseFormatter.createFallbackResponse(
              name,
              "Invalid response structure",
              requestId
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(formattedResponse, null, 2),
              },
            ],
          };
        } catch (error) {
          // Record error metrics
          measurement.recordCognitiveMetrics({
            confidenceScore: 0,
            reasoningDepth: 0,
            memoryRetrievals: 0,
            workingMemoryLoad: 0,
          });
          const errorMetrics = measurement.complete();

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          console.error(`Error handling tool ${name}:`, errorMessage);

          // Create formatted error response
          const errorResponse = ResponseFormatter.formatErrorResponse(
            error instanceof Error ? error : errorMessage,
            name,
            errorMetrics.responseTime,
            requestId,
            { tool_args: args }
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(errorResponse, null, 2),
              },
            ],
          };
        }
      });

      console.error("Tool registration completed successfully");
    } catch (error) {
      console.error("Failed to register tools:", error);
      throw new Error(
        `Tool registration failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private setupRequestHandlers(): void {
    // Handle server errors with detailed logging
    this.server.onerror = (error) => {
      console.error("MCP Server error:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
    };

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.error(`Received ${signal}, initiating graceful shutdown...`);
      try {
        await this.shutdown();
        console.error("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Promise Rejection:", {
        reason,
        promise,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      // Don't exit immediately, let the server handle it
    });
  }

  async handleRequest(
    _method: string,
    _params: Record<string, unknown>
  ): Promise<unknown> {
    // This will be implemented when we add the cognitive orchestrator
    throw new Error("Request handling not yet implemented");
  }

  // Argument validation methods
  private validateThinkArgs(args: Record<string, unknown>): ThinkArgs {
    if (!args.input || typeof args.input !== "string") {
      throw new Error("Think tool requires a valid input string");
    }

    if (
      args.mode &&
      !Object.values(ProcessingMode).includes(args.mode as ProcessingMode)
    ) {
      throw new Error(
        `Invalid processing mode: ${args.mode}. Valid modes: ${Object.values(
          ProcessingMode
        ).join(", ")}`
      );
    }

    if (
      args.temperature !== undefined &&
      (typeof args.temperature !== "number" ||
        args.temperature < 0 ||
        args.temperature > 2)
    ) {
      throw new Error("Temperature must be a number between 0 and 2");
    }

    if (
      args.max_depth !== undefined &&
      (typeof args.max_depth !== "number" ||
        args.max_depth < 1 ||
        args.max_depth > 20)
    ) {
      throw new Error("Max depth must be a number between 1 and 20");
    }

    return {
      input: args.input as string,
      mode: args.mode as ProcessingMode,
      context: args.context as Record<string, unknown>,
      enable_emotion: args.enable_emotion as boolean,
      enable_metacognition: args.enable_metacognition as boolean,
      max_depth: args.max_depth as number,
      temperature: args.temperature as number,
    };
  }

  private validateRememberArgs(args: Record<string, unknown>): RememberArgs {
    if (!args.content || typeof args.content !== "string") {
      throw new Error("Remember tool requires a valid content string");
    }

    if (!args.type || !["episodic", "semantic"].includes(args.type as string)) {
      throw new Error(
        'Remember tool requires type to be either "episodic" or "semantic"'
      );
    }

    if (
      args.importance !== undefined &&
      (typeof args.importance !== "number" ||
        args.importance < 0 ||
        args.importance > 1)
    ) {
      throw new Error("Importance must be a number between 0 and 1");
    }

    return {
      content: args.content as string,
      type: args.type as "episodic" | "semantic",
      importance: args.importance as number,
      emotional_tags: args.emotional_tags as string[],
      context: args.context as Record<string, unknown>,
    };
  }

  private validateRecallArgs(args: Record<string, unknown>): RecallArgs {
    if (!args.cue || typeof args.cue !== "string") {
      throw new Error("Recall tool requires a valid cue string");
    }

    if (
      args.type &&
      !["episodic", "semantic", "both"].includes(args.type as string)
    ) {
      throw new Error('Recall type must be "episodic", "semantic", or "both"');
    }

    if (
      args.threshold !== undefined &&
      (typeof args.threshold !== "number" ||
        args.threshold < 0 ||
        args.threshold > 1)
    ) {
      throw new Error("Threshold must be a number between 0 and 1");
    }

    if (
      args.max_results !== undefined &&
      (typeof args.max_results !== "number" ||
        args.max_results < 1 ||
        args.max_results > 50)
    ) {
      throw new Error("Max results must be a number between 1 and 50");
    }

    return {
      cue: args.cue as string,
      type: args.type as "episodic" | "semantic" | "both",
      max_results: args.max_results as number,
      threshold: args.threshold as number,
      context: args.context as Record<string, unknown>,
    };
  }

  private validateAnalyzeReasoningArgs(
    args: Record<string, unknown>
  ): AnalyzeReasoningArgs {
    if (!args.reasoning_steps || !Array.isArray(args.reasoning_steps)) {
      throw new Error(
        "Analyze reasoning tool requires an array of reasoning steps"
      );
    }

    if (args.reasoning_steps.length === 0) {
      throw new Error("At least one reasoning step is required");
    }

    // Validate each reasoning step
    for (let i = 0; i < args.reasoning_steps.length; i++) {
      const step = args.reasoning_steps[i];
      if (!step.type || typeof step.type !== "string") {
        throw new Error(`Reasoning step ${i} requires a valid type string`);
      }
      if (!step.content || typeof step.content !== "string") {
        throw new Error(`Reasoning step ${i} requires a valid content string`);
      }
      if (
        step.confidence === undefined ||
        typeof step.confidence !== "number" ||
        step.confidence < 0 ||
        step.confidence > 1
      ) {
        throw new Error(
          `Reasoning step ${i} requires a confidence number between 0 and 1`
        );
      }
    }

    return {
      reasoning_steps: args.reasoning_steps as ReasoningStep[],
      context: args.context as Record<string, unknown>,
    };
  }

  // Tool handler implementations
  async handleThink(args: ThinkArgs): Promise<ThoughtResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "think"
    );

    try {
      // Validate arguments first
      const validatedArgs = this.validateThinkArgs(
        args as unknown as Record<string, unknown>
      );

      console.error(
        `Processing think request: ${validatedArgs.input.substring(0, 100)}${
          validatedArgs.input.length > 100 ? "..." : ""
        }`
      );

      // Create cognitive input from validated arguments
      const cognitiveInput: CognitiveInput = {
        input: validatedArgs.input,
        context: this.createContext(validatedArgs.context),
        mode: validatedArgs.mode || ProcessingMode.BALANCED,
        configuration: this.createCognitiveConfig(validatedArgs),
      };

      // Process through cognitive orchestrator with error handling
      const operationResult = await ErrorHandler.withErrorHandling(
        () => this.cognitiveOrchestrator.think(cognitiveInput),
        "CognitiveOrchestrator",
        {
          enableFallbacks: true,
          maxRetries: 2,
          retryDelayMs: 1000,
          timeoutMs: 30000,
          criticalComponents: ["CognitiveOrchestrator"],
        }
      );

      if (!operationResult.success) {
        // Handle graceful degradation
        if (operationResult.data) {
          console.error("Think request completed with degraded functionality");
          return operationResult.data as ThoughtResult;
        }
        throw operationResult.error || new Error("Think processing failed");
      }

      const result = operationResult.data!;
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.reasoning_path?.length || 0,
        memoryRetrievals: result.metadata?.memory_retrievals || 0,
        workingMemoryLoad:
          (result.metadata?.working_memory_load as number) || 0,
        emotionalProcessingTime: result.metadata?.emotional_processing_time as
          | number
          | undefined,
        metacognitionTime: result.metadata?.metacognition_time as
          | number
          | undefined,
      });

      // Complete measurement
      measurement.complete();

      console.error(`Think request completed in ${processingTime}ms`);
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Error in handleThink after ${processingTime}ms:`, error);

      // Handle error with graceful degradation
      const errorResult = await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "handleThink",
        { input: args.input, requestId },
        { enableFallbacks: true }
      );

      if (errorResult.canContinue && errorResult.fallbackData) {
        return errorResult.fallbackData as ThoughtResult;
      }

      throw new Error(
        `Think processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleRemember(args: RememberArgs): Promise<MemoryResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "remember"
    );

    try {
      // Validate arguments first
      const validatedArgs = this.validateRememberArgs(
        args as unknown as Record<string, unknown>
      );

      console.error(
        `Storing ${
          validatedArgs.type
        } memory: ${validatedArgs.content.substring(0, 50)}${
          validatedArgs.content.length > 50 ? "..." : ""
        }`
      );

      if (validatedArgs.type === "episodic") {
        // Store as episodic memory with error handling
        const operationResult = await ErrorHandler.withErrorHandling(
          async () => {
            const episode: Episode = {
              content: validatedArgs.content,
              context: this.createContext(validatedArgs.context),
              timestamp: Date.now(),
              emotional_tags: validatedArgs.emotional_tags || [],
              importance: validatedArgs.importance || 0.5,
              decay_factor: 1.0,
            };

            const memoryId = this.memorySystem.storeEpisode(episode);
            return {
              success: true,
              memory_id: memoryId,
              message: `Successfully stored episodic memory with ID ${memoryId}`,
            };
          },
          "MemorySystem",
          { enableFallbacks: true, maxRetries: 2 }
        );

        if (!operationResult.success) {
          throw (
            operationResult.error || new Error("Episodic memory storage failed")
          );
        }

        const processingTime = Date.now() - startTime;

        // Record cognitive metrics
        measurement.recordCognitiveMetrics({
          confidenceScore: 1.0, // Memory storage is typically successful
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        });

        // Complete measurement
        measurement.complete();

        console.error(`Episodic memory stored in ${processingTime}ms`);
        return operationResult.data!;
      } else {
        // Store as semantic memory through experience storage with error handling
        const operationResult = await ErrorHandler.withErrorHandling(
          async () => {
            const experience = {
              content: validatedArgs.content,
              context: this.createContext(validatedArgs.context),
              importance: validatedArgs.importance || 0.5,
              emotional_tags: validatedArgs.emotional_tags || [],
            };

            const storageResult = await this.memorySystem.storeExperience(
              experience
            );
            return {
              success: storageResult.success,
              memory_id: storageResult.semantic_id || storageResult.episodic_id,
              message: `Successfully stored semantic memory`,
            };
          },
          "MemorySystem",
          { enableFallbacks: true, maxRetries: 2 }
        );

        if (!operationResult.success) {
          throw (
            operationResult.error || new Error("Semantic memory storage failed")
          );
        }

        const processingTime = Date.now() - startTime;

        // Record cognitive metrics
        measurement.recordCognitiveMetrics({
          confidenceScore: 1.0, // Memory storage is typically successful
          reasoningDepth: 1,
          memoryRetrievals: 0,
          workingMemoryLoad: 0.5,
        });

        // Complete measurement
        measurement.complete();

        console.error(`Semantic memory stored in ${processingTime}ms`);
        return operationResult.data!;
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleRemember after ${processingTime}ms:`,
        error
      );

      // Handle error with graceful degradation
      await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "handleRemember",
        { content: args.content, type: args.type, requestId },
        { enableFallbacks: false } // Memory operations shouldn't have fallbacks
      );

      throw new Error(
        `Memory storage failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleRecall(args: RecallArgs): Promise<RecallResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "recall"
    );

    // Validate arguments first (outside try-catch to let validation errors throw)
    const validatedArgs = this.validateRecallArgs(
      args as unknown as Record<string, unknown>
    );

    try {
      console.error(`Recalling memories for cue: ${validatedArgs.cue}`);

      const threshold = validatedArgs.threshold || 0.3;
      const maxResults = validatedArgs.max_results || 10;

      // Retrieve memories from the memory system with error handling
      const operationResult = await ErrorHandler.withErrorHandling(
        () => this.memorySystem.retrieveMemories(validatedArgs.cue, threshold),
        "MemorySystem",
        { enableFallbacks: true, maxRetries: 2 }
      );

      if (!operationResult.success) {
        // Provide fallback empty result
        const searchTime = Date.now() - startTime;
        console.error("Memory recall failed, returning empty result");
        return {
          memories: [],
          total_found: 0,
          search_time_ms: searchTime,
        };
      }

      const retrievalResult = operationResult.data!;

      // Format memories for response
      const memories: MemoryChunk[] = [];

      // Add episodic memories
      for (const episode of retrievalResult.episodic_memories.slice(
        0,
        maxResults
      )) {
        memories.push({
          content: episode.content,
          activation: episode.importance,
          timestamp: episode.timestamp,
          associations: new Set<string>(),
          emotional_valence: episode.emotional_tags.length > 0 ? 0.5 : 0,
          importance: episode.importance,
          context_tags: episode.emotional_tags,
        });
      }

      // Add semantic memories if requested
      if (validatedArgs.type === "both" || validatedArgs.type === "semantic") {
        for (const concept of retrievalResult.semantic_concepts.slice(
          0,
          maxResults - memories.length
        )) {
          memories.push({
            content: concept.content,
            activation: concept.activation,
            timestamp: concept.last_accessed,
            associations: new Set<string>(),
            emotional_valence: 0,
            importance: concept.activation,
            context_tags: [],
          });
        }
      }

      const searchTime = Date.now() - startTime;
      const result: RecallResult = {
        memories: memories,
        total_found:
          retrievalResult.episodic_memories.length +
          retrievalResult.semantic_concepts.length,
        search_time_ms: searchTime,
      };

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.memories?.length > 0 ? 0.8 : 0.3,
        reasoningDepth: 1,
        memoryRetrievals: result.memories?.length || 0,
        workingMemoryLoad: 0.3,
      });

      // Complete measurement
      measurement.complete();

      console.error(
        `Memory recall completed in ${searchTime}ms, found ${result.total_found} memories`
      );
      return result;
    } catch (error) {
      const searchTime = Date.now() - startTime;
      console.error("Error in handleRecall:", error);

      // Handle error with graceful degradation
      const errorResult = await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "handleRecall",
        { cue: args.cue, requestId },
        { enableFallbacks: true }
      );

      if (errorResult.canContinue) {
        // Return empty result as fallback
        return {
          memories: [],
          total_found: 0,
          search_time_ms: searchTime,
        };
      }

      throw new Error(
        `Memory recall failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  testMethod(): string {
    return "test";
  }

  async handleAnalyzeReasoning(
    args: AnalyzeReasoningArgs
  ): Promise<AnalysisResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "analyze_reasoning"
    );

    try {
      // Validate arguments first - let validation errors throw
      const validatedArgs = this.validateAnalyzeReasoningArgs(
        args as unknown as Record<string, unknown>
      );

      const assessment = this.metacognitionModule.assessReasoning(
        validatedArgs.reasoning_steps
      );

      const result = {
        coherence_score: assessment.coherence || 0.5,
        confidence_assessment: `Confidence: ${(
          assessment.confidence || 0.5
        ).toFixed(2)} - ${assessment.reasoning || "No reasoning provided"}`,
        detected_biases: assessment.biases_detected || [],
        suggested_improvements: assessment.suggestions || [],
        reasoning_quality: {
          logical_consistency: assessment.coherence || 0.5,
          evidence_support: assessment.confidence || 0.5,
          completeness: assessment.completeness || 0.5,
        },
      };

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: assessment.confidence || 0.5,
        reasoningDepth: validatedArgs.reasoning_steps.length,
        memoryRetrievals: 0,
        workingMemoryLoad: 0,
      });

      // Complete measurement
      measurement.complete();

      const processingTime = Date.now() - startTime;
      console.error(
        `Analyze reasoning request completed in ${processingTime}ms`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleAnalyzeReasoning after ${processingTime}ms:`,
        error
      );

      // Re-throw validation errors to maintain expected behavior
      if (
        error instanceof Error &&
        (error.message.includes("requires") ||
          error.message.includes("At least one"))
      ) {
        throw error;
      }

      return {
        coherence_score: 0.5,
        confidence_assessment:
          "Confidence: 0.50 - Error occurred during analysis",
        detected_biases: ["Analysis failed due to error"],
        suggested_improvements: ["Check system logs for details"],
        reasoning_quality: {
          logical_consistency: 0.5,
          evidence_support: 0.5,
          completeness: 0.5,
        },
      };
    }
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      console.error("Shutting down Cognitive MCP Server...");

      try {
        // Cleanup cognitive components
        this.cognitiveOrchestrator.reset();
        await this.memorySystem.shutdown();
        this.metacognitionModule.reset();

        this.initialized = false;
        console.error("Cognitive MCP Server shutdown completed");
      } catch (error) {
        console.error("Error during server shutdown:", error);
        throw error;
      }
    } else {
      console.error("Server was not initialized, skipping shutdown");
    }
  }

  // Utility method to check if server is ready
  isInitialized(): boolean {
    return this.initialized;
  }

  // Utility method to get server info
  getServerInfo(): { name: string; version: string; initialized: boolean } {
    return {
      name: "thought-mcp",
      version: "1.0.0",
      initialized: this.initialized,
    };
  }

  // Helper methods for creating cognitive inputs
  private createContext(contextArgs?: Record<string, unknown>): Context {
    return {
      session_id: (contextArgs?.session_id as string) || "default",
      domain: contextArgs?.domain as string,
      urgency: (contextArgs?.urgency as number) || 0.5,
      complexity: (contextArgs?.complexity as number) || 0.5,
      previous_thoughts: (contextArgs?.previous_thoughts as string[]) || [],
      timestamp: Date.now(),
      ...contextArgs,
    };
  }

  private createCognitiveConfig(args: ThinkArgs): CognitiveConfig {
    return {
      default_mode: args.mode || ProcessingMode.BALANCED,
      enable_emotion: args.enable_emotion !== false, // Default to true
      enable_metacognition: args.enable_metacognition !== false, // Default to true
      enable_prediction: true,
      working_memory_capacity: 7,
      episodic_memory_size: 1000,
      semantic_memory_size: 5000,
      consolidation_interval: 60000,
      noise_level: 0.3, // Increased for more variability
      temperature: args.temperature || 0.7, // Default temperature
      attention_threshold: 0.3,
      max_reasoning_depth: args.max_depth || 10,
      timeout_ms: 30000,
      max_concurrent_sessions: 100,
      confidence_threshold: 0.6,
      system2_activation_threshold: 0.7,
      memory_retrieval_threshold: 0.3,
      brain_dir: "~/.brain",
    };
  }

  // Access to memory system for testing
  getMemorySystem(): MemorySystem {
    return this.memorySystem;
  }

  // Access to cognitive orchestrator for testing
  getCognitiveOrchestrator(): CognitiveOrchestrator {
    return this.cognitiveOrchestrator;
  }

  // Access to metacognition module for testing
  getMetacognitionModule(): MetacognitionModule {
    return this.metacognitionModule;
  }

  // Generate unique request ID for tracking
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(timeWindow?: number) {
    return this.performanceMonitor.getStatistics(timeWindow);
  }

  /**
   * Get recent performance alerts
   */
  getPerformanceAlerts(limit?: number) {
    return this.performanceMonitor.getAlerts(limit);
  }

  /**
   * Export performance metrics
   */
  exportPerformanceMetrics() {
    return this.performanceMonitor.exportMetrics();
  }

  /**
   * Clear performance metrics history
   */
  clearPerformanceMetrics() {
    this.performanceMonitor.clearMetrics();
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    return this.performanceMonitor.getMemoryUsage();
  }
}
