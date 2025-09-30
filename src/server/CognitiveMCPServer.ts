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
import { ParallelReasoningProcessor } from "../cognitive/ParallelReasoningProcessor.js";
import {
  DecompositionResult,
  RealTimeProblemDecomposer,
} from "../cognitive/RealTimeProblemDecomposer.js";
import { SystematicThinkingOrchestrator } from "../cognitive/SystematicThinkingOrchestrator.js";
import { IMCPServer, IToolHandler } from "../interfaces/mcp.js";
import { ParallelReasoningResult } from "../interfaces/parallel-reasoning.js";
import {
  Problem,
  SystematicThinkingMode,
} from "../interfaces/systematic-thinking.js";
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
  AnalyzeSystematicallyArgs,
  DecomposeProblemArgs,
  MemoryResult,
  RecallArgs,
  RecallResult,
  RememberArgs,
  SystematicAnalysisResult,
  ThinkArgs,
  ThinkParallelArgs,
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
import { getVersion } from "../utils/version.js";

export class CognitiveMCPServer implements IMCPServer, IToolHandler {
  private server: Server;
  private initialized: boolean = false;
  private cognitiveOrchestrator: CognitiveOrchestrator;
  private memorySystem: MemorySystem;
  private performanceMonitor: PerformanceMonitor;
  private metacognitionModule: MetacognitionModule;
  private systematicThinkingOrchestrator: SystematicThinkingOrchestrator;
  private parallelReasoningProcessor: ParallelReasoningProcessor;
  private realTimeProblemDecomposer: RealTimeProblemDecomposer;
  private configManager: ConfigManager;

  constructor(performanceThresholds?: Partial<PerformanceThresholds>) {
    this.server = new Server(
      {
        name: "thoughtmcp",
        version: getVersion(),
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
    this.systematicThinkingOrchestrator = new SystematicThinkingOrchestrator();
    this.parallelReasoningProcessor = new ParallelReasoningProcessor();
    this.realTimeProblemDecomposer = new RealTimeProblemDecomposer();
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
    await this.systematicThinkingOrchestrator.initialize();
    await this.parallelReasoningProcessor.initialize();
    await this.realTimeProblemDecomposer.initialize();

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
                  version: getVersion(),
                  ...(requestId && { request_id: requestId }),
                },
              };
              break;
            }
            case "analyze_systematically": {
              result = await this.handleAnalyzeSystematically(
                this.validateAnalyzeSystematicallyArgs(args)
              );
              const systematicResult = result as SystematicAnalysisResult;
              measurement.recordCognitiveMetrics({
                confidenceScore: systematicResult.confidence || 0.7,
                reasoningDepth: systematicResult.analysis_steps?.length || 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.8,
                metacognitionTime: systematicResult.processing_time_ms ?? 0,
              });
              const systematicMetrics = measurement.complete();
              formattedResponse = {
                success: true,
                data: result,
                metadata: {
                  timestamp: Date.now(),
                  processing_time_ms: systematicMetrics.responseTime,
                  tool_name: "analyze_systematically",
                  version: getVersion(),
                  ...(requestId && { request_id: requestId }),
                },
              };
              break;
            }
            case "think_parallel": {
              result = await this.handleThinkParallel(
                this.validateThinkParallelArgs(args)
              );
              const parallelResult = result as ParallelReasoningResult;
              measurement.recordCognitiveMetrics({
                confidenceScore: parallelResult.confidence || 0.7,
                reasoningDepth: parallelResult.stream_results?.length || 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.9,
                metacognitionTime: parallelResult.processing_time_ms ?? 0,
              });
              const parallelMetrics = measurement.complete();
              formattedResponse = {
                success: true,
                data: result,
                metadata: {
                  timestamp: Date.now(),
                  processing_time_ms: parallelMetrics.responseTime,
                  tool_name: "think_parallel",
                  version: getVersion(),
                  ...(requestId && { request_id: requestId }),
                },
              };
              break;
            }
            case "decompose_problem": {
              result = await this.handleDecomposeProblem(
                this.validateDecomposeProblemArgs(args)
              );
              const decompositionResult = result as DecompositionResult;
              measurement.recordCognitiveMetrics({
                confidenceScore: decompositionResult.confidence || 0.7,
                reasoningDepth:
                  decompositionResult.hierarchical_structure?.length || 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.8,
                metacognitionTime: decompositionResult.processing_time_ms ?? 0,
              });
              const decompositionMetrics = measurement.complete();
              formattedResponse = {
                success: true,
                data: result,
                metadata: {
                  timestamp: Date.now(),
                  processing_time_ms: decompositionMetrics.responseTime,
                  tool_name: "decompose_problem",
                  version: getVersion(),
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
      args.systematic_thinking_mode &&
      !["auto", "hybrid", "manual"].includes(
        args.systematic_thinking_mode as string
      )
    ) {
      throw new Error(
        `Invalid systematic thinking mode: ${args.systematic_thinking_mode}. Valid modes: auto, hybrid, manual`
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
      enable_systematic_thinking: args.enable_systematic_thinking as boolean,
      systematic_thinking_mode: args.systematic_thinking_mode as
        | "auto"
        | "hybrid"
        | "manual",
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

  private validateAnalyzeSystematicallyArgs(
    args: Record<string, unknown>
  ): AnalyzeSystematicallyArgs {
    if (!args.input || typeof args.input !== "string") {
      throw new Error(
        "Analyze systematically tool requires a valid input string"
      );
    }

    if (
      args.mode &&
      !["auto", "hybrid", "manual"].includes(args.mode as string)
    ) {
      throw new Error(
        `Invalid systematic thinking mode: ${args.mode}. Valid modes: auto, hybrid, manual`
      );
    }

    return {
      input: args.input as string,
      mode: args.mode as SystematicThinkingMode,
      context: args.context as Record<string, unknown>,
    };
  }

  private validateThinkParallelArgs(
    args: Record<string, unknown>
  ): ThinkParallelArgs {
    if (!args.input || typeof args.input !== "string") {
      throw new Error("Think parallel tool requires a valid input string");
    }

    if (
      args.synchronization_interval !== undefined &&
      (typeof args.synchronization_interval !== "number" ||
        args.synchronization_interval < 100 ||
        args.synchronization_interval > 5000)
    ) {
      throw new Error(
        "Synchronization interval must be a number between 100 and 5000 milliseconds"
      );
    }

    return {
      input: args.input as string,
      context: args.context as Record<string, unknown>,
      enable_coordination: args.enable_coordination as boolean,
      synchronization_interval: args.synchronization_interval as number,
    };
  }

  private validateDecomposeProblemArgs(
    args: Record<string, unknown>
  ): DecomposeProblemArgs {
    if (!args.input || typeof args.input !== "string") {
      throw new Error("Decompose problem tool requires a valid input string");
    }

    if (
      args.strategies !== undefined &&
      (!Array.isArray(args.strategies) ||
        !args.strategies.every((s) => typeof s === "string"))
    ) {
      throw new Error("Strategies must be an array of strings");
    }

    if (
      args.max_depth !== undefined &&
      (typeof args.max_depth !== "number" ||
        args.max_depth < 1 ||
        args.max_depth > 5)
    ) {
      throw new Error("Max depth must be a number between 1 and 5");
    }

    const validStrategies = [
      "functional",
      "temporal",
      "stakeholder",
      "component",
      "risk",
      "resource",
      "complexity",
    ];

    if (args.strategies) {
      for (const strategy of args.strategies as string[]) {
        if (!validStrategies.includes(strategy)) {
          throw new Error(
            `Invalid strategy: ${strategy}. Valid strategies: ${validStrategies.join(
              ", "
            )}`
          );
        }
      }
    }

    return {
      input: args.input as string,
      context: args.context as Record<string, unknown>,
      strategies: args.strategies as string[],
      max_depth: args.max_depth as number,
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

  async handleAnalyzeSystematically(
    args: AnalyzeSystematicallyArgs
  ): Promise<SystematicAnalysisResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "analyze_systematically"
    );

    try {
      // Validate arguments first
      const validatedArgs = this.validateAnalyzeSystematicallyArgs(
        args as unknown as Record<string, unknown>
      );

      console.error(
        `Processing systematic analysis request: ${validatedArgs.input.substring(
          0,
          100
        )}${validatedArgs.input.length > 100 ? "..." : ""}`
      );

      // Process through systematic thinking orchestrator with error handling
      const operationResult = await ErrorHandler.withErrorHandling(
        () =>
          this.systematicThinkingOrchestrator.analyzeSystematically(
            validatedArgs.input,
            validatedArgs.mode || "auto",
            validatedArgs.context
              ? this.createContext(validatedArgs.context)
              : undefined
          ),
        "SystematicThinkingOrchestrator",
        {
          enableFallbacks: true,
          maxRetries: 2,
          retryDelayMs: 1000,
          timeoutMs: 30000,
          criticalComponents: ["SystematicThinkingOrchestrator"],
        }
      );

      if (!operationResult.success) {
        // Handle graceful degradation
        if (operationResult.data) {
          console.error(
            "Systematic analysis completed with degraded functionality"
          );
          return operationResult.data as SystematicAnalysisResult;
        }
        throw operationResult.error || new Error("Systematic analysis failed");
      }

      const result = operationResult.data!;
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.analysis_steps?.length || 0,
        memoryRetrievals: 0, // Systematic thinking is memory-independent
        workingMemoryLoad: 0.8,
        metacognitionTime: result.processing_time_ms,
      });

      // Complete measurement
      measurement.complete();

      console.error(`Systematic analysis completed in ${processingTime}ms`);
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleAnalyzeSystematically after ${processingTime}ms:`,
        error
      );

      // Handle error with graceful degradation
      const errorResult = await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "handleAnalyzeSystematically",
        { input: args.input, requestId },
        { enableFallbacks: true }
      );

      if (errorResult.canContinue && errorResult.fallbackData) {
        return errorResult.fallbackData as SystematicAnalysisResult;
      }

      throw new Error(
        `Systematic analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleThinkParallel(
    args: ThinkParallelArgs
  ): Promise<ParallelReasoningResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "think_parallel"
    );

    try {
      // Validate arguments first
      const validatedArgs = this.validateThinkParallelArgs(
        args as unknown as Record<string, unknown>
      );

      console.error(
        `Processing parallel reasoning request: ${validatedArgs.input.substring(
          0,
          100
        )}${validatedArgs.input.length > 100 ? "..." : ""}`
      );

      // Create problem structure from input
      const problem = this.createProblemFromInput(
        validatedArgs.input,
        this.createContext(validatedArgs.context)
      );

      // Process through parallel reasoning processor with error handling
      const operationResult = await ErrorHandler.withErrorHandling(
        () =>
          this.parallelReasoningProcessor.processParallel(
            problem,
            this.createContext(validatedArgs.context)
          ),
        "ParallelReasoningProcessor",
        {
          enableFallbacks: true,
          maxRetries: 2,
          retryDelayMs: 1000,
          timeoutMs: 45000, // Longer timeout for parallel processing
          criticalComponents: ["ParallelReasoningProcessor"],
        }
      );

      if (!operationResult.success) {
        // Handle graceful degradation
        if (operationResult.data) {
          console.error(
            "Parallel reasoning completed with degraded functionality"
          );
          return operationResult.data as ParallelReasoningResult;
        }
        throw (
          operationResult.error ||
          new Error("Parallel reasoning processing failed")
        );
      }

      const result = operationResult.data! as ParallelReasoningResult;
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.stream_results?.length || 0,
        memoryRetrievals: 0,
        workingMemoryLoad: 0.9, // Higher load for parallel processing
        metacognitionTime: result.processing_time_ms,
      });

      // Complete measurement
      measurement.complete();

      console.error(
        `Parallel reasoning completed in ${processingTime}ms with confidence ${result.confidence} across ${result.stream_results.length} streams`
      );
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleThinkParallel after ${processingTime}ms:`,
        error
      );

      // Handle error with graceful degradation
      const errorResult = await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "handleThinkParallel",
        { input: args.input, requestId },
        { enableFallbacks: true }
      );

      if (errorResult.canContinue && errorResult.fallbackData) {
        return errorResult.fallbackData as ParallelReasoningResult;
      }

      throw new Error(
        `Parallel reasoning failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleDecomposeProblem(
    args: DecomposeProblemArgs
  ): Promise<DecompositionResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "decompose_problem"
    );

    try {
      // Validate arguments first
      const validatedArgs = this.validateDecomposeProblemArgs(
        args as unknown as Record<string, unknown>
      );

      console.error(
        `Processing problem decomposition request: ${validatedArgs.input.substring(
          0,
          100
        )}${validatedArgs.input.length > 100 ? "..." : ""}`
      );

      // Create problem structure from input
      const problem = this.createProblemFromInput(
        validatedArgs.input,
        this.createContext(validatedArgs.context)
      );

      // Process through real-time problem decomposer with error handling
      const operationResult = await ErrorHandler.withErrorHandling(
        () =>
          this.realTimeProblemDecomposer.decomposeRealTime(
            problem,
            this.createContext(validatedArgs.context)
          ),
        "RealTimeProblemDecomposer",
        {
          enableFallbacks: true,
          maxRetries: 2,
          retryDelayMs: 1000,
          timeoutMs: 30000,
          criticalComponents: ["RealTimeProblemDecomposer"],
        }
      );

      if (!operationResult.success) {
        // Handle graceful degradation
        if (operationResult.data) {
          console.error(
            "Problem decomposition completed with degraded functionality"
          );
          return operationResult.data as DecompositionResult;
        }
        throw (
          operationResult.error ||
          new Error("Problem decomposition processing failed")
        );
      }

      const result = operationResult.data! as DecompositionResult;
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.hierarchical_structure?.length || 0,
        memoryRetrievals: 0,
        workingMemoryLoad: 0.8, // High load for decomposition processing
        metacognitionTime: result.processing_time_ms,
      });

      // Complete measurement
      measurement.complete();

      console.error(
        `Problem decomposition completed in ${processingTime}ms with confidence ${result.confidence} and ${result.hierarchical_structure.length} nodes`
      );
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleDecomposeProblem after ${processingTime}ms:`,
        error
      );

      // Handle error with graceful degradation
      const errorResult = await ErrorHandler.handleError(
        error instanceof Error ? error : new Error(String(error)),
        "handleDecomposeProblem",
        { input: args.input, requestId },
        { enableFallbacks: true }
      );

      if (errorResult.canContinue && errorResult.fallbackData) {
        return errorResult.fallbackData as DecompositionResult;
      }

      throw new Error(
        `Problem decomposition failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      name: "thoughtmcp",
      version: getVersion(),
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

  private createProblemFromInput(input: string, context: Context): Problem {
    // Simple problem creation from input - in a real implementation this would be more sophisticated
    const complexity = this.estimateComplexity(input);
    const uncertainty = this.estimateUncertainty(input);
    const domain = context.domain || this.identifyDomain(input);
    const constraints = this.extractConstraints(input);
    const stakeholders = this.identifyStakeholders(input);
    const timeSensitivity =
      context.urgency || this.assessTimeSensitivity(input);
    const resourceRequirements = this.identifyResourceRequirements(input);

    return {
      description: input,
      domain,
      complexity,
      uncertainty,
      constraints,
      stakeholders,
      time_sensitivity: timeSensitivity,
      resource_requirements: resourceRequirements,
    };
  }

  private estimateComplexity(input: string): number {
    let complexity = 0.3; // Base complexity
    const complexityIndicators = [
      /multiple|various|several|many/i,
      /system|network|interconnected/i,
      /complex|complicated|intricate/i,
      /interdependent|interrelated/i,
    ];

    for (const indicator of complexityIndicators) {
      if (indicator.test(input)) {
        complexity += 0.15;
      }
    }

    if (input.length > 100) complexity += 0.1;
    if (input.length > 200) complexity += 0.1;

    return Math.min(complexity, 1.0);
  }

  private estimateUncertainty(input: string): number {
    let uncertainty = 0.2; // Base uncertainty
    const uncertaintyIndicators = [
      /uncertain|unclear|unknown/i,
      /might|could|possibly|perhaps/i,
      /estimate|approximate|roughly/i,
      /future|predict|forecast/i,
    ];

    for (const indicator of uncertaintyIndicators) {
      if (indicator.test(input)) {
        uncertainty += 0.15;
      }
    }

    return Math.min(uncertainty, 1.0);
  }

  private identifyDomain(input: string): string {
    const domainKeywords = {
      technology: /software|code|system|technical|IT|computer|database/i,
      business: /business|strategy|market|revenue|profit|customer/i,
      science: /research|experiment|hypothesis|scientific|study/i,
      design: /design|user|interface|experience|creative/i,
    };

    for (const [domain, pattern] of Object.entries(domainKeywords)) {
      if (pattern.test(input)) {
        return domain;
      }
    }

    return "general";
  }

  private extractConstraints(input: string): string[] {
    const constraints: string[] = [];

    if (/deadline|urgent|quickly|time/i.test(input)) {
      constraints.push("time_constraint");
    }
    if (/budget|cost|cheap|expensive/i.test(input)) {
      constraints.push("budget_constraint");
    }
    if (/resource|limited|shortage/i.test(input)) {
      constraints.push("resource_constraint");
    }

    return constraints;
  }

  private identifyStakeholders(input: string): string[] {
    const stakeholders: string[] = [];
    const stakeholderPatterns = {
      users: /user|customer|client/i,
      team: /team|colleague|developer/i,
      management: /manager|executive|leadership/i,
    };

    for (const [stakeholder, pattern] of Object.entries(stakeholderPatterns)) {
      if (pattern.test(input)) {
        stakeholders.push(stakeholder);
      }
    }

    return stakeholders;
  }

  private assessTimeSensitivity(input: string): number {
    let sensitivity = 0.3; // Base sensitivity
    const urgencyIndicators = [
      /urgent|asap|immediately|quickly/i,
      /deadline|due|schedule/i,
      /critical|important|priority/i,
    ];

    for (const indicator of urgencyIndicators) {
      if (indicator.test(input)) {
        sensitivity += 0.2;
      }
    }

    return Math.min(sensitivity, 1.0);
  }

  private identifyResourceRequirements(input: string): string[] {
    const resources: string[] = [];
    const resourcePatterns = {
      human_resources: /people|team|staff|developer/i,
      technical_resources: /server|software|tool|platform/i,
      financial_resources: /budget|funding|investment/i,
      time_resources: /time|schedule|deadline/i,
    };

    for (const [resource, pattern] of Object.entries(resourcePatterns)) {
      if (pattern.test(input)) {
        resources.push(resource);
      }
    }

    return resources;
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
      enable_systematic_thinking: args.enable_systematic_thinking !== false, // Default to true
      systematic_thinking_mode: args.systematic_thinking_mode || "auto",
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
