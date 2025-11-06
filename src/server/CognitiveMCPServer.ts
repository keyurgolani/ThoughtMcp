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
import { ForgettingControlSystem } from "../cognitive/forgetting/ForgettingControlSystem.js";
import { GradualDegradationManager } from "../cognitive/forgetting/GradualDegradationManager.js";
import { MemoryUsageAnalyzer } from "../cognitive/forgetting/MemoryUsageAnalyzer.js";
import { RecoveryEngine } from "../cognitive/forgetting/RecoveryEngine.js";
import { MemorySystem } from "../cognitive/MemorySystem.js";
import { MetacognitionModule } from "../cognitive/MetacognitionModule.js";
import { ParallelReasoningProcessor } from "../cognitive/ParallelReasoningProcessor.js";
import { ProbabilisticReasoningEngine } from "../cognitive/ProbabilisticReasoningEngine.js";
import {
  DecompositionResult,
  RealTimeProblemDecomposer,
} from "../cognitive/RealTimeProblemDecomposer.js";
import { SystematicThinkingOrchestrator } from "../cognitive/SystematicThinkingOrchestrator.js";
import { ForgettingPolicy } from "../interfaces/audit.js";
import {
  ForgettingDecision,
  ForgettingEvaluation,
  MemoryOptimizationRecommendation,
} from "../interfaces/forgetting.js";
import { IMCPServer, IToolHandler } from "../interfaces/mcp.js";
import { ParallelReasoningResult } from "../interfaces/parallel-reasoning.js";
import type { ProbabilisticReasoningResult } from "../interfaces/probabilistic-reasoning.js";
import {
  Problem,
  SystematicThinkingMode,
} from "../interfaces/systematic-thinking.js";
import {
  ProcessingMode,
  type CognitiveConfig,
  type CognitiveInput,
  type Concept,
  type Context,
  type Episode,
  type MemoryChunk,
  type ReasoningStep,
  type ThoughtResult,
} from "../types/core.js";
import {
  AnalysisResult,
  AnalyzeMemoryUsageArgs,
  AnalyzeReasoningArgs,
  AnalyzeSystematicallyArgs,
  DecomposeProblemArgs,
  ForgettingAuditArgs,
  ForgettingAuditResult,
  ForgettingPolicyArgs,
  ForgettingPolicyResult,
  MemoryOptimizationResult,
  MemoryRecoveryResult,
  MemoryResult,
  MemoryUsageAnalysisResult,
  OptimizeMemoryArgs,
  RecallArgs,
  RecallResult,
  RecoverMemoryArgs,
  RememberArgs,
  SystematicAnalysisResult,
  ThinkArgs,
  ThinkParallelArgs,
  ThinkProbabilisticArgs,
  TOOL_SCHEMAS,
} from "../types/mcp.js";
import { ConfigManager } from "../utils/config.js";
import { ErrorHandler } from "../utils/ErrorHandler.js";
import { CognitiveLogger } from "../utils/logger.js";
import { ParameterValidator } from "../utils/ParameterValidator.js";
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
  private logger: CognitiveLogger;
  private cognitiveOrchestrator: CognitiveOrchestrator;
  private memorySystem: MemorySystem;
  private performanceMonitor: PerformanceMonitor;
  private metacognitionModule: MetacognitionModule;
  private systematicThinkingOrchestrator: SystematicThinkingOrchestrator;
  private parallelReasoningProcessor: ParallelReasoningProcessor;
  private probabilisticReasoningEngine: ProbabilisticReasoningEngine;
  private realTimeProblemDecomposer: RealTimeProblemDecomposer;
  private memoryUsageAnalyzer: MemoryUsageAnalyzer;
  private gradualDegradationManager: GradualDegradationManager;
  private recoveryEngine: RecoveryEngine;
  private forgettingControlSystem: ForgettingControlSystem;
  private configManager: ConfigManager;

  constructor(performanceThresholds?: Partial<PerformanceThresholds>) {
    this.logger = CognitiveLogger.getInstance();
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
    this.probabilisticReasoningEngine = new ProbabilisticReasoningEngine();
    this.realTimeProblemDecomposer = new RealTimeProblemDecomposer();
    this.memoryUsageAnalyzer = new MemoryUsageAnalyzer();
    this.gradualDegradationManager = new GradualDegradationManager();
    this.recoveryEngine = new RecoveryEngine();
    this.forgettingControlSystem = new ForgettingControlSystem();
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
    // Note: MemoryUsageAnalyzer and GradualDegradationManager don't need initialization as they're stateless/self-initializing

    this.registerTools();
    this.setupRequestHandlers();

    // Connect to stdio transport only if not in test mode
    if (!testMode) {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
    }

    this.initialized = true;
    this.logger.info(
      "CognitiveMCPServer",
      "Cognitive MCP Server initialized successfully"
    );
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

        this.logger.info(
          "CognitiveMCPServer",
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
                reasoningDepth: result.reasoning_path?.length ?? 0,
                memoryRetrievals: result.metadata?.memory_retrievals ?? 0,
                workingMemoryLoad:
                  (result.metadata?.working_memory_load as number) ?? 0,
                emotionalProcessingTime: result.metadata
                  ?.emotional_processing_time as number | undefined,
                metacognitionTime: result.metadata?.metacognition_time as
                  | number
                  | undefined,
              });
              const thinkMetrics = measurement.complete();
              // Use enhanced response format with improved reasoning presentation
              const thinkArgs = args as unknown as ThinkArgs;
              formattedResponse = ResponseFormatter.createEnhancedThinkResponse(
                result,
                thinkMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: thinkArgs.verbosity ?? "standard",
                  includeExecutiveSummary: thinkArgs.include_executive_summary,
                }
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
                memoryRetrievals: result.memories?.length ?? 0,
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
                confidenceScore: result.coherence_score ?? 0.5,
                reasoningDepth: result.detected_biases?.length ?? 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.7,
                metacognitionTime: 100,
              });
              const analyzeMetrics = measurement.complete();
              const analyzeArgs = args as unknown as AnalyzeReasoningArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "analyze_reasoning",
                analyzeMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: analyzeArgs.verbosity ?? "standard",
                  confidence: result.coherence_score,
                  includeExecutiveSummary:
                    analyzeArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      analyzeArgs.verbosity === "summary"
                        ? 5
                        : analyzeArgs.verbosity === "detailed"
                        ? 50
                        : 20,
                  },
                }
              );
              break;
            }
            case "analyze_systematically": {
              result = await this.handleAnalyzeSystematically(
                this.validateAnalyzeSystematicallyArgs(args)
              );
              const systematicResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: systematicResult.confidence ?? 0.7,
                reasoningDepth: systematicResult.analysis_steps?.length ?? 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.8,
                metacognitionTime: systematicResult.processing_time_ms ?? 0,
              });
              const systematicMetrics = measurement.complete();
              const systematicArgs =
                args as unknown as AnalyzeSystematicallyArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "analyze_systematically",
                systematicMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: systematicArgs.verbosity ?? "standard",
                  confidence: systematicResult.confidence,
                  includeExecutiveSummary:
                    systematicArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      systematicArgs.verbosity === "summary"
                        ? 3
                        : systematicArgs.verbosity === "detailed"
                        ? 20
                        : 10,
                  },
                }
              );
              break;
            }
            case "think_parallel": {
              result = await this.handleThinkParallel(
                this.validateThinkParallelArgs(args)
              );
              const parallelResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: parallelResult.confidence ?? 0.7,
                reasoningDepth: parallelResult.stream_results?.length ?? 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.9,
                metacognitionTime: parallelResult.processing_time_ms ?? 0,
              });
              const parallelMetrics = measurement.complete();
              const parallelArgs = args as unknown as ThinkParallelArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "think_parallel",
                parallelMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: parallelArgs.verbosity ?? "standard",
                  confidence: parallelResult.confidence,
                  includeExecutiveSummary:
                    parallelArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      parallelArgs.verbosity === "summary"
                        ? 4
                        : parallelArgs.verbosity === "detailed"
                        ? 12
                        : 8,
                  },
                }
              );
              break;
            }
            case "think_probabilistic": {
              result = await this.handleThinkProbabilistic(
                this.validateThinkProbabilisticArgs(args)
              );
              const probabilisticResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: probabilisticResult.confidence ?? 0.5,
                reasoningDepth:
                  probabilisticResult.reasoning_chain?.steps?.length ?? 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.8,
                metacognitionTime: probabilisticResult.processing_time_ms ?? 0,
              });
              const probabilisticMetrics = measurement.complete();
              const probabilisticArgs =
                args as unknown as ThinkProbabilisticArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "think_probabilistic",
                probabilisticMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: probabilisticArgs.verbosity ?? "standard",
                  confidence: probabilisticResult.confidence,
                  includeExecutiveSummary:
                    probabilisticArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      probabilisticArgs.verbosity === "summary"
                        ? 5
                        : probabilisticArgs.verbosity === "detailed"
                        ? 25
                        : 15,
                  },
                }
              );
              break;
            }
            case "decompose_problem": {
              result = await this.handleDecomposeProblem(
                this.validateDecomposeProblemArgs(args)
              );
              const decompositionResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: decompositionResult.confidence ?? 0.7,
                reasoningDepth:
                  decompositionResult.hierarchical_structure?.length ?? 0,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.8,
                metacognitionTime: decompositionResult.processing_time_ms ?? 0,
              });
              const decompositionMetrics = measurement.complete();
              const decompositionArgs = args as unknown as DecomposeProblemArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "decompose_problem",
                decompositionMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: decompositionArgs.verbosity ?? "standard",
                  confidence: decompositionResult.confidence,
                  includeExecutiveSummary:
                    decompositionArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      decompositionArgs.verbosity === "summary"
                        ? 5
                        : decompositionArgs.verbosity === "detailed"
                        ? 30
                        : 15,
                  },
                }
              );
              break;
            }
            case "analyze_memory_usage": {
              result = await this.handleAnalyzeMemoryUsage(
                this.validateAnalyzeMemoryUsageArgs(args)
              );
              const memoryAnalysisResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: 0.9, // High confidence for memory analysis
                reasoningDepth: 1,
                memoryRetrievals: 0,
                workingMemoryLoad: 0.3,
                metacognitionTime: memoryAnalysisResult.analysis_time_ms ?? 0,
              });
              const memoryAnalysisMetrics = measurement.complete();
              const memoryAnalysisArgs =
                args as unknown as AnalyzeMemoryUsageArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "analyze_memory_usage",
                memoryAnalysisMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: memoryAnalysisArgs.verbosity ?? "standard",
                  confidence: 0.9,
                  includeExecutiveSummary:
                    memoryAnalysisArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      memoryAnalysisArgs.verbosity === "summary"
                        ? 10
                        : memoryAnalysisArgs.verbosity === "detailed"
                        ? 100
                        : 50,
                    priorityThreshold:
                      memoryAnalysisArgs.verbosity === "summary" ? 0.7 : 0.3,
                  },
                }
              );
              break;
            }
            case "optimize_memory": {
              result = await this.handleOptimizeMemory(
                this.validateOptimizeMemoryArgs(args)
              );
              const memoryOptimizationResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: memoryOptimizationResult.success ? 0.8 : 0.3,
                reasoningDepth: 2, // Memory optimization involves decision-making
                memoryRetrievals:
                  memoryOptimizationResult.optimization_summary
                    .memories_processed,
                workingMemoryLoad: 0.7,
                metacognitionTime:
                  memoryOptimizationResult.optimization_time_ms ?? 0,
              });
              const memoryOptimizationMetrics = measurement.complete();
              const memoryOptimizationArgs =
                args as unknown as OptimizeMemoryArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "optimize_memory",
                memoryOptimizationMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel:
                    memoryOptimizationArgs.verbosity ?? "standard",
                  confidence: memoryOptimizationResult.success ? 0.8 : 0.3,
                  includeExecutiveSummary:
                    memoryOptimizationArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      memoryOptimizationArgs.verbosity === "summary"
                        ? 5
                        : memoryOptimizationArgs.verbosity === "detailed"
                        ? 50
                        : 20,
                  },
                }
              );
              break;
            }
            case "recover_memory": {
              result = await this.handleRecoverMemory(
                this.validateRecoverMemoryArgs(args)
              );
              const memoryRecoveryResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: memoryRecoveryResult.recovery_confidence,
                reasoningDepth: 3, // Memory recovery involves complex reasoning
                memoryRetrievals: memoryRecoveryResult.recovery_attempts.length,
                workingMemoryLoad: 0.8,
                metacognitionTime: memoryRecoveryResult.recovery_time_ms,
              });
              const memoryRecoveryMetrics = measurement.complete();
              const memoryRecoveryArgs = args as unknown as RecoverMemoryArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "recover_memory",
                memoryRecoveryMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: memoryRecoveryArgs.verbosity ?? "standard",
                  confidence: memoryRecoveryResult.recovery_confidence,
                  includeExecutiveSummary:
                    memoryRecoveryArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      memoryRecoveryArgs.verbosity === "summary"
                        ? 3
                        : memoryRecoveryArgs.verbosity === "detailed"
                        ? 15
                        : 8,
                  },
                }
              );
              break;
            }
            case "forgetting_audit": {
              result = await this.handleForgettingAudit(
                this.validateForgettingAuditArgs(args)
              );
              const forgettingAuditResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: 0.9, // High confidence for audit operations
                reasoningDepth: 1,
                memoryRetrievals: forgettingAuditResult.audit_entries.length,
                workingMemoryLoad: 0.4,
                metacognitionTime: forgettingAuditResult.query_time_ms,
              });
              const forgettingAuditMetrics = measurement.complete();
              const forgettingAuditArgs =
                args as unknown as ForgettingAuditArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "forgetting_audit",
                forgettingAuditMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: forgettingAuditArgs.verbosity ?? "standard",
                  confidence: 0.9,
                  includeExecutiveSummary:
                    forgettingAuditArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      forgettingAuditArgs.verbosity === "summary"
                        ? 10
                        : forgettingAuditArgs.verbosity === "detailed"
                        ? 100
                        : 50,
                  },
                }
              );
              break;
            }
            case "forgetting_policy": {
              result = await this.handleForgettingPolicy(
                this.validateForgettingPolicyArgs(args)
              );
              const forgettingPolicyResult = result;
              measurement.recordCognitiveMetrics({
                confidenceScore: 0.8, // High confidence for policy operations
                reasoningDepth: 2, // Policy evaluation involves reasoning
                memoryRetrievals: 0,
                workingMemoryLoad: 0.5,
                metacognitionTime: forgettingPolicyResult.processing_time_ms,
              });
              const forgettingPolicyMetrics = measurement.complete();
              const forgettingPolicyArgs =
                args as unknown as ForgettingPolicyArgs;
              formattedResponse = ResponseFormatter.createStandardizedResponse(
                result,
                "forgetting_policy",
                forgettingPolicyMetrics.responseTime,
                {
                  requestId,
                  verbosityLevel: forgettingPolicyArgs.verbosity ?? "standard",
                  confidence: 0.8,
                  includeExecutiveSummary:
                    forgettingPolicyArgs.include_executive_summary !== false,
                  filteringOptions: {
                    maxItems:
                      forgettingPolicyArgs.verbosity === "summary"
                        ? 5
                        : forgettingPolicyArgs.verbosity === "detailed"
                        ? 25
                        : 15,
                  },
                }
              );
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

      this.logger.info(
        "CognitiveMCPServer",
        "Tool registration completed successfully"
      );
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

  // Argument validation methods with enhanced error handling
  private validateThinkArgs(args: Record<string, unknown>): ThinkArgs {
    // Use enhanced validation
    const validationResult = ParameterValidator.validateThinkParameters(args);

    if (!validationResult.isValid) {
      const errorMessage = ParameterValidator.formatValidationErrors(
        validationResult,
        "think"
      );
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      const warningMessage =
        ParameterValidator.formatValidationWarnings(validationResult);
      this.logger.warn(
        "CognitiveMCPServer",
        `Think tool parameter warnings:\n${warningMessage}`
      );
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
    // Use enhanced validation
    const validationResult =
      ParameterValidator.validateRememberParameters(args);

    if (!validationResult.isValid) {
      const errorMessage = ParameterValidator.formatValidationErrors(
        validationResult,
        "remember"
      );
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      const warningMessage =
        ParameterValidator.formatValidationWarnings(validationResult);
      this.logger.warn(
        "CognitiveMCPServer",
        `Remember tool parameter warnings:\n${warningMessage}`
      );
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
    // Use enhanced validation
    const validationResult = ParameterValidator.validateRecallParameters(args);

    if (!validationResult.isValid) {
      const errorMessage = ParameterValidator.formatValidationErrors(
        validationResult,
        "recall"
      );
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      const warningMessage =
        ParameterValidator.formatValidationWarnings(validationResult);
      this.logger.warn(
        "CognitiveMCPServer",
        `Recall tool parameter warnings:\n${warningMessage}`
      );
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
      input: args.input,
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
      input: args.input,
      context: args.context as Record<string, unknown>,
      enable_coordination: args.enable_coordination as boolean,
      synchronization_interval: args.synchronization_interval as number,
    };
  }

  private validateThinkProbabilisticArgs(
    args: Record<string, unknown>
  ): ThinkProbabilisticArgs {
    if (!args.input || typeof args.input !== "string") {
      throw new Error("Think probabilistic tool requires a valid input string");
    }

    if (
      args.uncertainty_threshold !== undefined &&
      (typeof args.uncertainty_threshold !== "number" ||
        args.uncertainty_threshold < 0 ||
        args.uncertainty_threshold > 1)
    ) {
      throw new Error("Uncertainty threshold must be a number between 0 and 1");
    }

    if (
      args.max_hypotheses !== undefined &&
      (typeof args.max_hypotheses !== "number" ||
        args.max_hypotheses < 1 ||
        args.max_hypotheses > 10)
    ) {
      throw new Error("Max hypotheses must be a number between 1 and 10");
    }

    if (
      args.evidence_weight_threshold !== undefined &&
      (typeof args.evidence_weight_threshold !== "number" ||
        args.evidence_weight_threshold < 0 ||
        args.evidence_weight_threshold > 1)
    ) {
      throw new Error(
        "Evidence weight threshold must be a number between 0 and 1"
      );
    }

    return {
      input: args.input,
      context: args.context as Record<string, unknown>,
      enable_bayesian_updating: args.enable_bayesian_updating as boolean,
      uncertainty_threshold: args.uncertainty_threshold as number,
      max_hypotheses: args.max_hypotheses as number,
      evidence_weight_threshold: args.evidence_weight_threshold as number,
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
      for (const strategy of args.strategies) {
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
      input: args.input,
      context: args.context as Record<string, unknown>,
      strategies: args.strategies as string[],
      max_depth: args.max_depth as number,
    };
  }

  private validateAnalyzeMemoryUsageArgs(
    args: Record<string, unknown>
  ): AnalyzeMemoryUsageArgs {
    if (
      args.analysis_depth !== undefined &&
      !["shallow", "deep", "comprehensive"].includes(
        args.analysis_depth as string
      )
    ) {
      throw new Error(
        'Analysis depth must be "shallow", "deep", or "comprehensive"'
      );
    }

    if (
      args.include_recommendations !== undefined &&
      typeof args.include_recommendations !== "boolean"
    ) {
      throw new Error("Include recommendations must be a boolean");
    }

    return {
      analysis_depth: args.analysis_depth as
        | "shallow"
        | "deep"
        | "comprehensive",
      include_recommendations: args.include_recommendations as boolean,
      context: args.context as Record<string, unknown>,
    };
  }

  private validateOptimizeMemoryArgs(
    args: Record<string, unknown>
  ): OptimizeMemoryArgs {
    if (
      args.optimization_mode !== undefined &&
      !["conservative", "moderate", "aggressive"].includes(
        args.optimization_mode as string
      )
    ) {
      throw new Error(
        'Optimization mode must be "conservative", "moderate", or "aggressive"'
      );
    }

    if (
      args.target_memory_reduction !== undefined &&
      (typeof args.target_memory_reduction !== "number" ||
        args.target_memory_reduction < 0 ||
        args.target_memory_reduction > 0.5)
    ) {
      throw new Error(
        "Target memory reduction must be a number between 0 and 0.5"
      );
    }

    if (
      args.enable_gradual_degradation !== undefined &&
      typeof args.enable_gradual_degradation !== "boolean"
    ) {
      throw new Error("Enable gradual degradation must be a boolean");
    }

    if (
      args.require_user_consent !== undefined &&
      typeof args.require_user_consent !== "boolean"
    ) {
      throw new Error("Require user consent must be a boolean");
    }

    if (
      args.preserve_important_memories !== undefined &&
      typeof args.preserve_important_memories !== "boolean"
    ) {
      throw new Error("Preserve important memories must be a boolean");
    }

    return {
      optimization_mode: args.optimization_mode as
        | "conservative"
        | "moderate"
        | "aggressive",
      target_memory_reduction: args.target_memory_reduction as number,
      enable_gradual_degradation: args.enable_gradual_degradation as boolean,
      require_user_consent: args.require_user_consent as boolean,
      preserve_important_memories: args.preserve_important_memories as boolean,
      context: args.context as Record<string, unknown>,
    };
  }

  private validateRecoverMemoryArgs(
    args: Record<string, unknown>
  ): RecoverMemoryArgs {
    if (!args.memory_id || typeof args.memory_id !== "string") {
      throw new Error("Memory ID is required and must be a string");
    }

    if (!args.recovery_cues || !Array.isArray(args.recovery_cues)) {
      throw new Error("Recovery cues are required and must be an array");
    }

    if (args.recovery_cues.length === 0) {
      throw new Error("At least one recovery cue is required");
    }

    // Validate each recovery cue
    for (const cue of args.recovery_cues) {
      if (!cue || typeof cue !== "object") {
        throw new Error("Each recovery cue must be an object");
      }

      if (!cue.type || typeof cue.type !== "string") {
        throw new Error("Recovery cue type is required and must be a string");
      }

      if (
        ![
          "semantic",
          "temporal",
          "contextual",
          "associative",
          "emotional",
        ].includes(cue.type)
      ) {
        throw new Error(
          'Recovery cue type must be one of: "semantic", "temporal", "contextual", "associative", "emotional"'
        );
      }

      if (!cue.value || typeof cue.value !== "string") {
        throw new Error("Recovery cue value is required and must be a string");
      }

      if (cue.strength !== undefined) {
        if (
          typeof cue.strength !== "number" ||
          cue.strength < 0 ||
          cue.strength > 1
        ) {
          throw new Error(
            "Recovery cue strength must be a number between 0 and 1"
          );
        }
      }
    }

    if (args.recovery_strategies !== undefined) {
      if (!Array.isArray(args.recovery_strategies)) {
        throw new Error("Recovery strategies must be an array");
      }

      for (const strategy of args.recovery_strategies) {
        if (
          ![
            "associative_recovery",
            "schema_based_recovery",
            "partial_cue_recovery",
          ].includes(strategy)
        ) {
          throw new Error(
            'Recovery strategy must be one of: "associative_recovery", "schema_based_recovery", "partial_cue_recovery"'
          );
        }
      }
    }

    if (
      args.max_recovery_attempts !== undefined &&
      (typeof args.max_recovery_attempts !== "number" ||
        args.max_recovery_attempts < 1 ||
        args.max_recovery_attempts > 10)
    ) {
      throw new Error(
        "Max recovery attempts must be a number between 1 and 10"
      );
    }

    if (
      args.confidence_threshold !== undefined &&
      (typeof args.confidence_threshold !== "number" ||
        args.confidence_threshold < 0 ||
        args.confidence_threshold > 1)
    ) {
      throw new Error("Confidence threshold must be a number between 0 and 1");
    }

    return {
      memory_id: args.memory_id,
      recovery_cues: args.recovery_cues as Array<{
        type:
          | "semantic"
          | "temporal"
          | "contextual"
          | "associative"
          | "emotional";
        value: string;
        strength?: number;
      }>,
      recovery_strategies: args.recovery_strategies as string[],
      max_recovery_attempts: args.max_recovery_attempts as number,
      confidence_threshold: args.confidence_threshold as number,
      context: args.context as Record<string, unknown>,
    };
  }

  private validateForgettingAuditArgs(
    args: Record<string, unknown>
  ): ForgettingAuditArgs {
    const result: ForgettingAuditArgs = {};

    if (args.query && typeof args.query === "object") {
      const query = args.query as Record<string, unknown>;
      result.query = {};

      if (query.start_timestamp !== undefined) {
        if (typeof query.start_timestamp !== "number") {
          throw new Error("Start timestamp must be a number");
        }
        result.query.start_timestamp = query.start_timestamp;
      }

      if (query.end_timestamp !== undefined) {
        if (typeof query.end_timestamp !== "number") {
          throw new Error("End timestamp must be a number");
        }
        result.query.end_timestamp = query.end_timestamp;
      }

      if (query.memory_ids !== undefined) {
        if (!Array.isArray(query.memory_ids)) {
          throw new Error("Memory IDs must be an array");
        }
        result.query.memory_ids = query.memory_ids as string[];
      }

      if (query.execution_status !== undefined) {
        if (!Array.isArray(query.execution_status)) {
          throw new Error("Execution status must be an array");
        }
        const validStatuses = ["pending", "executed", "cancelled", "failed"];
        for (const status of query.execution_status) {
          if (!validStatuses.includes(status)) {
            throw new Error(`Invalid execution status: ${status}`);
          }
        }
        result.query.execution_status = query.execution_status as (
          | "pending"
          | "executed"
          | "cancelled"
          | "failed"
        )[];
      }

      if (query.limit !== undefined) {
        if (
          typeof query.limit !== "number" ||
          query.limit < 1 ||
          query.limit > 1000
        ) {
          throw new Error("Limit must be a number between 1 and 1000");
        }
        result.query.limit = query.limit;
      }

      if (query.offset !== undefined) {
        if (typeof query.offset !== "number" || query.offset < 0) {
          throw new Error("Offset must be a non-negative number");
        }
        result.query.offset = query.offset;
      }
    }

    if (args.include_summary !== undefined) {
      if (typeof args.include_summary !== "boolean") {
        throw new Error("Include summary must be a boolean");
      }
      result.include_summary = args.include_summary;
    }

    if (args.export_format !== undefined) {
      if (!["json", "csv", "xml"].includes(args.export_format as string)) {
        throw new Error("Export format must be one of: json, csv, xml");
      }
      result.export_format = args.export_format as "json" | "csv" | "xml";
    }

    return result;
  }

  private validateForgettingPolicyArgs(
    args: Record<string, unknown>
  ): ForgettingPolicyArgs {
    if (!args.action || typeof args.action !== "string") {
      throw new Error("Action is required and must be a string");
    }

    const validActions = [
      "list",
      "get",
      "create",
      "update",
      "delete",
      "evaluate",
      "import",
      "export",
    ];
    if (!validActions.includes(args.action)) {
      throw new Error(
        `Invalid action: ${args.action}. Valid actions: ${validActions.join(
          ", "
        )}`
      );
    }

    const result: ForgettingPolicyArgs = {
      action: args.action as
        | "list"
        | "get"
        | "create"
        | "update"
        | "delete"
        | "evaluate"
        | "import"
        | "export",
    };

    // Validate policy_id for actions that require it
    if (["get", "update", "delete", "export"].includes(args.action)) {
      if (!args.policy_id || typeof args.policy_id !== "string") {
        throw new Error(`Policy ID is required for ${args.action} action`);
      }
      result.policy_id = args.policy_id;
    }

    // Validate policy_data for create/update actions
    if (["create", "update"].includes(args.action) && args.policy_data) {
      if (typeof args.policy_data !== "object") {
        throw new Error("Policy data must be an object");
      }
      result.policy_data = args.policy_data as Record<string, unknown>; // Simplified validation for now
    }

    // Validate evaluation_context for evaluate action
    if (args.action === "evaluate") {
      if (
        !args.evaluation_context ||
        typeof args.evaluation_context !== "object"
      ) {
        throw new Error("Evaluation context is required for evaluate action");
      }
      const ctx = args.evaluation_context as Record<string, unknown>;
      if (!ctx.memory_id || typeof ctx.memory_id !== "string") {
        throw new Error("Memory ID is required in evaluation context");
      }
      if (
        !ctx.memory_type ||
        !["episodic", "semantic"].includes(ctx.memory_type as string)
      ) {
        throw new Error("Valid memory type is required in evaluation context");
      }
      result.evaluation_context = {
        memory_id: ctx.memory_id,
        memory_type: ctx.memory_type as "episodic" | "semantic",
        decision: ctx.decision as Record<string, unknown>,
        evaluation: ctx.evaluation as Record<string, unknown>,
        memory_metadata: ctx.memory_metadata as Record<string, unknown>,
      };
    }

    if (args.active_only !== undefined) {
      if (typeof args.active_only !== "boolean") {
        throw new Error("Active only must be a boolean");
      }
      result.active_only = args.active_only;
    }

    return result;
  }

  // Tool handler implementations
  async handleThink(args: ThinkArgs): Promise<ThoughtResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement with error handling
    let measurement;
    try {
      measurement = this.performanceMonitor.startMeasurement(
        requestId,
        "think"
      );
    } catch (error) {
      console.error("Performance monitoring failed:", error);
      measurement = null; // Continue without performance monitoring
    }

    try {
      // Validate arguments first
      const validatedArgs = this.validateThinkArgs(
        args as unknown as Record<string, unknown>
      );

      this.logger.info(
        "CognitiveMCPServer",
        `Processing think request: ${validatedArgs.input.substring(0, 100)}${
          validatedArgs.input.length > 100 ? "..." : ""
        }`
      );

      // Create cognitive input from validated arguments
      const cognitiveInput: CognitiveInput = {
        input: validatedArgs.input,
        context: this.createContext(validatedArgs.context),
        mode: validatedArgs.mode ?? ProcessingMode.BALANCED,
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
          this.logger.warn(
            "CognitiveMCPServer",
            "Think request completed with degraded functionality"
          );
          return operationResult.data;
        }
        throw operationResult.error ?? new Error("Think processing failed");
      }

      const result = operationResult.data;
      if (!result) {
        throw new Error("Think processing returned no data");
      }
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics if measurement is available
      if (measurement) {
        measurement.recordCognitiveMetrics({
          confidenceScore: result.confidence,
          reasoningDepth: result.reasoning_path?.length ?? 0,
          memoryRetrievals: result.metadata?.memory_retrievals ?? 0,
          workingMemoryLoad:
            (result.metadata?.working_memory_load as number) ?? 0,
          emotionalProcessingTime: result.metadata
            ?.emotional_processing_time as number | undefined,
          metacognitionTime: result.metadata?.metacognition_time as
            | number
            | undefined,
        });

        // Complete measurement
        measurement.complete();
      }

      this.logger.info(
        "CognitiveMCPServer",
        `Think request completed in ${processingTime}ms`
      );
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

      this.logger.info(
        "CognitiveMCPServer",
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
              emotional_tags: validatedArgs.emotional_tags ?? [],
              importance: validatedArgs.importance ?? 0.5,
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
            operationResult.error ?? new Error("Episodic memory storage failed")
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

        this.logger.info(
          "CognitiveMCPServer",
          `Episodic memory stored in ${processingTime}ms`
        );
        if (!operationResult.data) {
          throw new Error("Episodic memory storage returned no data");
        }
        return operationResult.data;
      } else {
        // Store as semantic memory through experience storage with error handling
        const operationResult = await ErrorHandler.withErrorHandling(
          async () => {
            const experience = {
              content: validatedArgs.content,
              context: this.createContext(validatedArgs.context),
              importance: validatedArgs.importance ?? 0.5,
              emotional_tags: validatedArgs.emotional_tags ?? [],
            };

            const storageResult = await this.memorySystem.storeExperience(
              experience
            );
            return {
              success: storageResult.success,
              memory_id: storageResult.semantic_id ?? storageResult.episodic_id,
              message: `Successfully stored semantic memory`,
            };
          },
          "MemorySystem",
          { enableFallbacks: true, maxRetries: 2 }
        );

        if (!operationResult.success) {
          throw (
            operationResult.error ?? new Error("Semantic memory storage failed")
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

        this.logger.info(
          "CognitiveMCPServer",
          `Semantic memory stored in ${processingTime}ms`
        );
        if (!operationResult.data) {
          throw new Error("Semantic memory storage returned no data");
        }
        return operationResult.data;
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
      this.logger.info(
        "CognitiveMCPServer",
        `Recalling memories for cue: ${validatedArgs.cue}`
      );

      const threshold = validatedArgs.threshold ?? 0.3;
      const maxResults = validatedArgs.max_results ?? 10;

      // Retrieve memories from the memory system with error handling
      const operationResult = await ErrorHandler.withErrorHandling(
        () => this.memorySystem.retrieveMemories(validatedArgs.cue, threshold),
        "MemorySystem",
        { enableFallbacks: true, maxRetries: 2 }
      );

      if (!operationResult.success) {
        // Provide fallback empty result
        const searchTime = Date.now() - startTime;
        this.logger.warn(
          "CognitiveMCPServer",
          "Memory recall failed, returning empty result"
        );
        return {
          memories: [],
          total_found: 0,
          search_time_ms: searchTime,
        };
      }

      const retrievalResult = operationResult.data;
      if (!retrievalResult) {
        throw new Error("Memory recall returned no data");
      }

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
        memoryRetrievals: result.memories?.length ?? 0,
        workingMemoryLoad: 0.3,
      });

      // Complete measurement
      measurement.complete();

      this.logger.info(
        "CognitiveMCPServer",
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
        coherence_score: assessment.coherence ?? 0.5,
        confidence_assessment: `Confidence: ${(
          assessment.confidence ?? 0.5
        ).toFixed(2)} - ${assessment.reasoning ?? "No reasoning provided"}`,
        detected_biases: assessment.biases_detected ?? [],
        suggested_improvements: assessment.suggestions ?? [],
        reasoning_quality: {
          logical_consistency: assessment.coherence ?? 0.5,
          evidence_support: assessment.confidence ?? 0.5,
          completeness: assessment.completeness ?? 0.5,
        },
      };

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: assessment.confidence ?? 0.5,
        reasoningDepth: validatedArgs.reasoning_steps.length,
        memoryRetrievals: 0,
        workingMemoryLoad: 0,
      });

      // Complete measurement
      measurement.complete();

      const processingTime = Date.now() - startTime;
      this.logger.info(
        "CognitiveMCPServer",
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

      this.logger.info(
        "CognitiveMCPServer",
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
            validatedArgs.mode ?? "auto",
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
          this.logger.warn(
            "CognitiveMCPServer",
            "Systematic analysis completed with degraded functionality"
          );
          return operationResult.data;
        }
        throw operationResult.error ?? new Error("Systematic analysis failed");
      }

      const result = operationResult.data;
      if (!result) {
        throw new Error("Systematic analysis returned no data");
      }
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.analysis_steps?.length ?? 0,
        memoryRetrievals: 0, // Systematic thinking is memory-independent
        workingMemoryLoad: 0.8,
        metacognitionTime: result.processing_time_ms,
      });

      // Complete measurement
      measurement.complete();

      this.logger.info(
        "CognitiveMCPServer",
        `Systematic analysis completed in ${processingTime}ms`
      );
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

      this.logger.info(
        "CognitiveMCPServer",
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
          this.logger.warn(
            "CognitiveMCPServer",
            "Parallel reasoning completed with degraded functionality"
          );
          return operationResult.data;
        }
        throw (
          operationResult.error ??
          new Error("Parallel reasoning processing failed")
        );
      }

      const result = operationResult.data;
      if (!result) {
        throw new Error("Parallel reasoning returned no data");
      }
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.stream_results?.length ?? 0,
        memoryRetrievals: 0,
        workingMemoryLoad: 0.9, // Higher load for parallel processing
        metacognitionTime: result.processing_time_ms,
      });

      // Complete measurement
      measurement.complete();

      this.logger.info(
        "CognitiveMCPServer",
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

  async handleThinkProbabilistic(
    args: ThinkProbabilisticArgs
  ): Promise<ProbabilisticReasoningResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "think_probabilistic"
    );

    try {
      this.logger.info(
        "CognitiveMCPServer",
        `Processing probabilistic reasoning request: ${args.input.substring(
          0,
          100
        )}${args.input.length > 100 ? "..." : ""}`
      );

      // Create context from arguments
      const context = this.createContext(args.context);

      // Process through probabilistic reasoning engine with error handling
      const operationResult = await ErrorHandler.withErrorHandling(
        () =>
          this.probabilisticReasoningEngine.processWithUncertainty(
            args.input,
            context
          ),
        "ProbabilisticReasoningEngine",
        {
          enableFallbacks: true,
          maxRetries: 2,
          retryDelayMs: 1000,
          timeoutMs: 30000,
          criticalComponents: ["ProbabilisticReasoningEngine"],
        }
      );

      if (!operationResult.success) {
        // Handle graceful degradation
        if (operationResult.data) {
          console.error(
            `Probabilistic reasoning completed with warnings: ${operationResult.error}`
          );
          return operationResult.data;
        }

        // Create fallback response
        console.error(
          `Probabilistic reasoning failed: ${operationResult.error}`
        );
        return {
          conclusion: `Unable to process probabilistic reasoning: ${operationResult.error}`,
          confidence: 0.1,
          uncertainty_assessment: {
            epistemic_uncertainty: 0.9,
            aleatoric_uncertainty: 0.5,
            combined_uncertainty: 0.95,
            confidence_interval: [0.05, 0.15],
            uncertainty_sources: [
              {
                type: "model_limitations",
                description: "Processing error occurred",
                impact: 0.9,
                mitigation_suggestions: [
                  "Retry with simpler input",
                  "Check input format",
                ],
              },
            ],
            reliability_assessment: 0.1,
          },
          belief_network: {
            nodes: new Map(),
            edges: new Map(),
            prior_probabilities: new Map(),
            conditional_probabilities: new Map(),
            evidence_nodes: [],
          },
          evidence_integration: {
            total_evidence_count: 0,
            evidence_quality_score: 0,
            conflicting_evidence: [],
            supporting_evidence: [],
            evidence_synthesis: "No evidence available due to processing error",
            reliability_weighted_score: 0,
          },
          alternative_hypotheses: [],
          reasoning_chain: {
            steps: [],
            logical_structure: "",
            confidence_propagation: [],
            uncertainty_propagation: [],
            branch_points: [],
          },
          processing_time_ms: Date.now() - startTime,
        };
      }

      const result = operationResult.data as ProbabilisticReasoningResult;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.reasoning_chain?.steps?.length ?? 0,
        memoryRetrievals: 0,
        workingMemoryLoad: 0.8,
        metacognitionTime: result.processing_time_ms,
      });

      this.logger.info(
        "CognitiveMCPServer",
        `Probabilistic reasoning completed successfully in ${result.processing_time_ms}ms with confidence ${result.confidence}`
      );

      return result;
    } catch (error) {
      // Record error metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: 0,
        reasoningDepth: 0,
        memoryRetrievals: 0,
        workingMemoryLoad: 0,
      });

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`Error in probabilistic reasoning: ${errorMessage}`);

      // Return error response
      return {
        conclusion: `Error in probabilistic reasoning: ${errorMessage}`,
        confidence: 0.0,
        uncertainty_assessment: {
          epistemic_uncertainty: 1.0,
          aleatoric_uncertainty: 0.5,
          combined_uncertainty: 1.0,
          confidence_interval: [0.0, 0.0],
          uncertainty_sources: [
            {
              type: "model_limitations",
              description: `Processing error: ${errorMessage}`,
              impact: 1.0,
              mitigation_suggestions: [
                "Check input format",
                "Retry with different parameters",
              ],
            },
          ],
          reliability_assessment: 0.0,
        },
        belief_network: {
          nodes: new Map(),
          edges: new Map(),
          prior_probabilities: new Map(),
          conditional_probabilities: new Map(),
          evidence_nodes: [],
        },
        evidence_integration: {
          total_evidence_count: 0,
          evidence_quality_score: 0,
          conflicting_evidence: [],
          supporting_evidence: [],
          evidence_synthesis: "No evidence available due to error",
          reliability_weighted_score: 0,
        },
        alternative_hypotheses: [],
        reasoning_chain: {
          steps: [],
          logical_structure: "",
          confidence_propagation: [],
          uncertainty_propagation: [],
          branch_points: [],
        },
        processing_time_ms: Date.now() - startTime,
      };
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

      this.logger.info(
        "CognitiveMCPServer",
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
          return operationResult.data;
        }
        throw (
          operationResult.error ??
          new Error("Problem decomposition processing failed")
        );
      }

      const result = operationResult.data;
      if (!result) {
        throw new Error("Problem decomposition returned no data");
      }
      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.confidence,
        reasoningDepth: result.hierarchical_structure?.length ?? 0,
        memoryRetrievals: 0,
        workingMemoryLoad: 0.8, // High load for decomposition processing
        metacognitionTime: result.processing_time_ms,
      });

      // Complete measurement
      measurement.complete();

      this.logger.info(
        "CognitiveMCPServer",
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

  async handleAnalyzeMemoryUsage(
    args: AnalyzeMemoryUsageArgs
  ): Promise<MemoryUsageAnalysisResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "analyze_memory_usage"
    );

    try {
      this.logger.info(
        "CognitiveMCPServer",
        "Processing memory usage analysis request"
      );

      // Perform memory usage analysis
      const analysis = await this.memoryUsageAnalyzer.analyzeMemoryUsage();

      let recommendations;
      if (args.include_recommendations !== false) {
        // Get optimization recommendations
        recommendations =
          await this.memoryUsageAnalyzer.getOptimizationRecommendations(
            analysis
          );
      }

      const processingTime = Date.now() - startTime;

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: 0.9, // High confidence for memory analysis
        reasoningDepth: 1,
        memoryRetrievals: 0,
        workingMemoryLoad: 0.3,
        metacognitionTime: processingTime,
      });

      // Complete measurement
      measurement.complete();

      // Format the analysis results with enhanced user experience
      const { MemoryAnalysisFormatter } = await import(
        "../utils/MemoryAnalysisFormatter.js"
      );
      const summaryLevel =
        args.analysis_depth === "shallow"
          ? "overview"
          : args.analysis_depth === "comprehensive"
          ? "full"
          : "detailed";

      const formattedAnalysis = MemoryAnalysisFormatter.formatAnalysis(
        analysis,
        recommendations ?? [],
        summaryLevel
      );

      const result: MemoryUsageAnalysisResult = {
        analysis: formattedAnalysis,
        recommendations: formattedAnalysis.prioritized_recommendations,
        analysis_time_ms: processingTime,
      };

      this.logger.info(
        "CognitiveMCPServer",
        `Memory usage analysis completed in ${processingTime}ms. Health score: ${formattedAnalysis.health_score.overall_score}/100 (${formattedAnalysis.health_score.health_status})`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleAnalyzeMemoryUsage after ${processingTime}ms:`,
        error
      );

      throw new Error(
        `Memory usage analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleOptimizeMemory(
    args: OptimizeMemoryArgs
  ): Promise<MemoryOptimizationResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "optimize_memory"
    );

    try {
      this.logger.info(
        "CognitiveMCPServer",
        "Processing memory optimization request"
      );

      // Set default values
      const optimizationMode = args.optimization_mode ?? "moderate";
      const targetReduction = args.target_memory_reduction ?? 0.1;
      const enableGradualDegradation =
        args.enable_gradual_degradation !== false;
      const requireUserConsent = args.require_user_consent !== false;
      const preserveImportant = args.preserve_important_memories !== false;

      // First, analyze current memory usage
      const analysis = await this.memoryUsageAnalyzer.analyzeMemoryUsage();
      const recommendations =
        await this.memoryUsageAnalyzer.getOptimizationRecommendations(analysis);

      // Initialize result tracking
      const result: MemoryOptimizationResult = {
        success: true,
        optimization_summary: {
          memories_processed: 0,
          memories_degraded: 0,
          memories_forgotten: 0,
          memories_archived: 0,
          total_space_freed_bytes: 0,
          performance_improvement_estimate: 0,
        },
        degradation_processes_started: [],
        user_consent_requests: [],
        errors: [],
        optimization_time_ms: 0,
      };

      // Filter recommendations based on optimization mode
      const filteredRecommendations = this.filterRecommendationsByMode(
        recommendations,
        optimizationMode,
        preserveImportant
      );

      // Calculate target number of memories to process
      const targetMemoryCount = Math.floor(
        analysis.total_memories * targetReduction
      );
      const memoriesToProcess = Math.min(
        targetMemoryCount,
        filteredRecommendations.length
      );

      this.logger.info(
        "CognitiveMCPServer",
        `Optimizing ${memoriesToProcess} memories out of ${
          analysis.total_memories
        } total (${(targetReduction * 100).toFixed(1)}% target reduction)`
      );

      // Process each recommendation
      for (let i = 0; i < memoriesToProcess; i++) {
        const recommendation = filteredRecommendations[i];
        result.optimization_summary.memories_processed++;

        try {
          // Check if user consent is required
          const needsConsent =
            requireUserConsent ?? recommendation.requires_user_consent;

          if (needsConsent) {
            // Add to consent requests (in a real implementation, this would prompt the user)
            result.user_consent_requests.push({
              memory_id: recommendation.target_memories[0] ?? `memory_${i}`,
              action: recommendation.type as string,
              reason: recommendation.description,
              consent_required: true,
            });

            // For this implementation, simulate user consent based on risk level
            const consentGranted = this.simulateUserConsent(recommendation);
            if (!consentGranted) {
              console.error(
                `User consent denied for ${recommendation.type} on memory ${recommendation.target_memories[0]}`
              );
              continue;
            }
          }

          // Execute the optimization based on type
          switch (recommendation.type) {
            case "forget":
              if (enableGradualDegradation) {
                // Use gradual degradation instead of immediate forgetting
                const processId = await this.initiateGradualDegradation(
                  recommendation.target_memories[0] ?? `memory_${i}`,
                  0.9 // High degradation level for forgetting
                );
                result.degradation_processes_started.push(processId);
                result.optimization_summary.memories_degraded++;
              } else {
                // Immediate forgetting (simplified)
                result.optimization_summary.memories_forgotten++;
              }
              break;

            case "compress":
              // Compression through gradual degradation
              if (enableGradualDegradation) {
                const processId = await this.initiateGradualDegradation(
                  recommendation.target_memories[0] ?? `memory_${i}`,
                  0.5 // Moderate degradation for compression
                );
                result.degradation_processes_started.push(processId);
                result.optimization_summary.memories_degraded++;
              }
              break;

            case "archive":
              // Archiving (simplified)
              result.optimization_summary.memories_archived++;
              break;

            case "consolidate":
              // Memory consolidation (simplified)
              result.optimization_summary.memories_processed++;
              break;
          }

          // Estimate space freed and performance improvement
          result.optimization_summary.total_space_freed_bytes +=
            recommendation.estimated_benefit.memory_space_freed ?? 0;
          result.optimization_summary.performance_improvement_estimate +=
            recommendation.estimated_benefit.processing_speed_improvement ?? 0;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push(
            `Failed to process recommendation ${i}: ${errorMessage}`
          );
          console.error(`Error processing recommendation ${i}:`, error);
        }
      }

      const processingTime = Date.now() - startTime;
      result.optimization_time_ms = processingTime;

      // Determine overall success
      result.success = result.errors.length < memoriesToProcess / 2; // Success if less than 50% errors

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.success ? 0.8 : 0.3,
        reasoningDepth: 2,
        memoryRetrievals: result.optimization_summary.memories_processed,
        workingMemoryLoad: 0.7,
        metacognitionTime: processingTime,
      });

      // Complete measurement
      measurement.complete();

      this.logger.info(
        "CognitiveMCPServer",
        `Memory optimization completed in ${processingTime}ms. ` +
          `Processed: ${result.optimization_summary.memories_processed}, ` +
          `Degraded: ${result.optimization_summary.memories_degraded}, ` +
          `Forgotten: ${result.optimization_summary.memories_forgotten}, ` +
          `Archived: ${result.optimization_summary.memories_archived}, ` +
          `Errors: ${result.errors.length}`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleOptimizeMemory after ${processingTime}ms:`,
        error
      );

      throw new Error(
        `Memory optimization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleRecoverMemory(
    args: RecoverMemoryArgs
  ): Promise<MemoryRecoveryResult> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Start performance measurement
    const measurement = this.performanceMonitor.startMeasurement(
      requestId,
      "recover_memory"
    );

    try {
      this.logger.info(
        "CognitiveMCPServer",
        `Processing memory recovery request for memory: ${args.memory_id}`
      );

      // Convert recovery cues to the format expected by RecoveryEngine
      const recoveryCues = args.recovery_cues.map((cue) => ({
        type: cue.type,
        value: cue.value,
        strength: cue.strength ?? 0.5,
        source: "user_provided",
      }));

      // Try to get recovery metadata from gradual degradation manager
      let recoveryMetadata;
      try {
        // Check if this memory has degradation processes
        const activeProcesses =
          await this.gradualDegradationManager.getActiveDegradationProcesses();
        const memoryProcess = activeProcesses.find(
          (p) => p.memory_id === args.memory_id
        );

        if (memoryProcess?.status.recovery_metadata) {
          recoveryMetadata = memoryProcess.status.recovery_metadata;
          this.logger.info(
            "CognitiveMCPServer",
            `Found recovery metadata for memory ${args.memory_id}`
          );
        } else {
          this.logger.warn(
            "CognitiveMCPServer",
            `No recovery metadata found for memory ${args.memory_id}, using cues only`
          );
        }
      } catch (error) {
        console.error(`Error retrieving recovery metadata: ${error}`);
      }

      // Configure recovery engine if needed
      if (args.max_recovery_attempts) {
        // Note: In a full implementation, we would configure the recovery engine
        // For now, we'll pass the parameters to the recovery attempt
      }

      // Attempt memory recovery
      const recoveryResult = await this.recoveryEngine.attemptRecovery(
        args.memory_id,
        recoveryCues,
        recoveryMetadata
      );

      // Assess recovery confidence if we have recovered content
      if (
        recoveryResult.success &&
        recoveryResult.recovered_memory &&
        recoveryMetadata
      ) {
        await this.recoveryEngine.assessRecoveryConfidence(
          recoveryResult.recovered_memory,
          recoveryMetadata
        );
      }

      // Track recovery success for learning
      await this.recoveryEngine.trackRecoverySuccess(
        args.memory_id,
        recoveryResult
      );

      const processingTime = Date.now() - startTime;

      // Create the result in the expected format
      const result: MemoryRecoveryResult = {
        success: recoveryResult.success,
        memory_id: args.memory_id,
        recovered_memory: recoveryResult.recovered_memory,
        recovery_confidence: recoveryResult.recovery_confidence,
        recovery_method: recoveryResult.recovery_method,
        partial_recovery: recoveryResult.partial_recovery,
        missing_elements: recoveryResult.missing_elements,
        recovery_attempts: recoveryResult.recovery_attempts.map((attempt) => ({
          strategy_name: attempt.strategy_name,
          success: attempt.success,
          confidence: attempt.confidence,
          method_details: attempt.recovery_method_details,
        })),
        quality_assessment: {
          overall_quality: recoveryResult.quality_assessment.overall_quality,
          content_coherence:
            recoveryResult.quality_assessment.content_coherence,
          contextual_consistency:
            recoveryResult.quality_assessment.contextual_consistency,
          quality_issues: recoveryResult.quality_assessment.quality_issues.map(
            (issue) => `${issue.issue_type}: ${issue.description}`
          ),
        },
        recovery_time_ms: processingTime,
      };

      // Record cognitive metrics
      measurement.recordCognitiveMetrics({
        confidenceScore: result.recovery_confidence,
        reasoningDepth: 3, // Memory recovery involves complex reasoning
        memoryRetrievals: result.recovery_attempts.length,
        workingMemoryLoad: 0.8,
        metacognitionTime: processingTime,
      });

      // Complete measurement
      measurement.complete();

      this.logger.info(
        "CognitiveMCPServer",
        `Memory recovery completed in ${processingTime}ms. ` +
          `Success: ${result.success}, ` +
          `Confidence: ${result.recovery_confidence.toFixed(2)}, ` +
          `Method: ${result.recovery_method}, ` +
          `Attempts: ${result.recovery_attempts.length}`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleRecoverMemory after ${processingTime}ms:`,
        error
      );

      throw new Error(
        `Memory recovery failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleForgettingAudit(
    args: ForgettingAuditArgs
  ): Promise<ForgettingAuditResult> {
    const startTime = Date.now();

    try {
      this.logger.info(
        "CognitiveMCPServer",
        "Processing forgetting audit request"
      );

      // Query audit entries
      const auditEntries =
        await this.forgettingControlSystem.audit_system.queryAuditEntries(
          args.query ?? {}
        );

      // Get summary if requested
      let summary;
      if (args.include_summary !== false) {
        summary =
          await this.forgettingControlSystem.audit_system.getAuditSummary(
            args.query?.start_timestamp,
            args.query?.end_timestamp
          );
      }

      // Export data if requested
      let exported_data;
      if (args.export_format) {
        exported_data =
          await this.forgettingControlSystem.audit_system.exportAuditData(
            args.query ?? {},
            args.export_format
          );
      }

      const processingTime = Date.now() - startTime;

      const result: ForgettingAuditResult = {
        success: true,
        audit_entries: auditEntries.map((entry) => ({
          audit_id: entry.audit_id,
          timestamp: entry.timestamp,
          memory_id: entry.memory_id,
          memory_type: entry.memory_type,
          memory_content_summary: entry.memory_content_summary,
          execution_status: entry.execution_status,
          execution_method: entry.execution_method,
          user_consent_requested: entry.user_consent_requested,
          user_consent_granted: entry.user_consent_granted,
          privacy_level: entry.privacy_level,
          secure_deletion_applied: entry.secure_deletion_applied,
        })),
        summary,
        exported_data,
        query_time_ms: processingTime,
      };

      this.logger.info(
        "CognitiveMCPServer",
        `Forgetting audit completed in ${processingTime}ms. ` +
          `Entries: ${result.audit_entries.length}, ` +
          `Summary included: ${!!summary}`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleForgettingAudit after ${processingTime}ms:`,
        error
      );

      throw new Error(
        `Forgetting audit failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleForgettingPolicy(
    args: ForgettingPolicyArgs
  ): Promise<ForgettingPolicyResult> {
    const startTime = Date.now();

    try {
      this.logger.info(
        "CognitiveMCPServer",
        `Processing forgetting policy request: ${args.action}`
      );

      const result: ForgettingPolicyResult = {
        success: true,
        action: args.action,
        processing_time_ms: 0,
      };

      switch (args.action) {
        case "list": {
          const policies =
            await this.forgettingControlSystem.policy_manager.listPolicies(
              args.active_only
            );
          result.policies = policies.map((policy) => ({
            policy_id: policy.policy_id,
            policy_name: policy.policy_name,
            description: policy.description,
            active: policy.active,
            created_timestamp: policy.created_timestamp,
            last_modified_timestamp: policy.last_modified_timestamp,
            rules_count: policy.rules.length,
          }));
          break;
        }

        case "get": {
          if (!args.policy_id) {
            throw new Error("Policy ID is required for get action");
          }
          const policy =
            await this.forgettingControlSystem.policy_manager.getPolicy(
              args.policy_id
            );
          if (!policy) {
            throw new Error(`Policy not found: ${args.policy_id}`);
          }
          result.policy = {
            policy_id: policy.policy_id,
            policy_name: policy.policy_name,
            description: policy.description,
            active: policy.active,
            rules: policy.rules.map((rule) => ({
              rule_id: rule.rule_id,
              rule_name: rule.rule_name,
              description: rule.description,
              priority: rule.priority,
              action: rule.action,
            })),
            user_preferences: policy.user_preferences as unknown as Record<
              string,
              unknown
            >,
          };
          break;
        }

        case "create": {
          if (!args.policy_data) {
            throw new Error("Policy data is required for create action");
          }
          const newPolicyId =
            await this.forgettingControlSystem.policy_manager.createPolicy(
              args.policy_data as Omit<
                ForgettingPolicy,
                "policy_id" | "created_timestamp" | "last_modified_timestamp"
              >
            );
          result.policy_id = newPolicyId;
          result.message = "Policy created successfully";
          break;
        }

        case "update": {
          if (!args.policy_id || !args.policy_data) {
            throw new Error(
              "Policy ID and policy data are required for update action"
            );
          }
          await this.forgettingControlSystem.policy_manager.updatePolicy(
            args.policy_id,
            args.policy_data as Record<string, unknown>
          );
          result.policy_id = args.policy_id;
          result.message = "Policy updated successfully";
          break;
        }

        case "delete": {
          if (!args.policy_id) {
            throw new Error("Policy ID is required for delete action");
          }
          await this.forgettingControlSystem.policy_manager.deletePolicy(
            args.policy_id
          );
          result.policy_id = args.policy_id;
          result.message = "Policy deleted successfully";
          break;
        }

        case "evaluate": {
          if (!args.evaluation_context) {
            throw new Error(
              "Evaluation context is required for evaluate action"
            );
          }
          const ctx = args.evaluation_context;
          const policyResults =
            await this.forgettingControlSystem.policy_manager.evaluatePolicies(
              ctx.decision as unknown as ForgettingDecision,
              ctx.evaluation as unknown as ForgettingEvaluation,
              ctx.memory_metadata
            );
          const effectiveDecision =
            await this.forgettingControlSystem.policy_manager.getEffectivePolicyDecision(
              policyResults
            );
          result.evaluation_result = {
            policy_id: effectiveDecision.policy_id,
            final_decision: effectiveDecision.final_decision,
            decision_confidence: effectiveDecision.decision_confidence,
            consent_required: effectiveDecision.consent_required,
            reasoning: effectiveDecision.reasoning,
          };
          break;
        }

        case "export": {
          if (!args.policy_id) {
            throw new Error("Policy ID is required for export action");
          }
          const exportedPolicy =
            await this.forgettingControlSystem.policy_manager.exportPolicy(
              args.policy_id
            );
          result.exported_policy = exportedPolicy;
          result.policy_id = args.policy_id;
          break;
        }

        case "import": {
          if (!args.policy_data) {
            throw new Error("Policy data is required for import action");
          }
          const importedPolicyId =
            await this.forgettingControlSystem.policy_manager.importPolicy(
              args.policy_data
            );
          result.policy_id = importedPolicyId;
          result.message = "Policy imported successfully";
          break;
        }

        default:
          throw new Error(`Unsupported action: ${args.action}`);
      }

      const processingTime = Date.now() - startTime;
      result.processing_time_ms = processingTime;

      this.logger.info(
        "CognitiveMCPServer",
        `Forgetting policy ${args.action} completed in ${processingTime}ms`
      );

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error in handleForgettingPolicy after ${processingTime}ms:`,
        error
      );

      throw new Error(
        `Forgetting policy operation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Helper methods for memory optimization

  private filterRecommendationsByMode(
    recommendations: MemoryOptimizationRecommendation[],
    mode: "conservative" | "moderate" | "aggressive",
    preserveImportant: boolean
  ): MemoryOptimizationRecommendation[] {
    let filtered = [...recommendations];

    // Filter by risk level based on mode
    switch (mode) {
      case "conservative":
        filtered = filtered.filter((r) => r.risk_level === "low");
        break;
      case "moderate":
        filtered = filtered.filter((r) => r.risk_level !== "high");
        break;
      case "aggressive":
        // Include all recommendations
        break;
    }

    // Filter out important memories if preservation is enabled
    if (preserveImportant) {
      filtered = filtered.filter(
        (r) =>
          !r.target_memories.some(
            (memId: string) =>
              memId.includes("important") ?? memId.includes("critical")
          )
      );
    }

    // Sort by estimated benefit (highest first)
    filtered.sort((a, b) => {
      const benefitA = a.estimated_benefit.processing_speed_improvement ?? 0;
      const benefitB = b.estimated_benefit.processing_speed_improvement ?? 0;
      return benefitB - benefitA;
    });

    return filtered;
  }

  private simulateUserConsent(
    recommendation: MemoryOptimizationRecommendation
  ): boolean {
    // Simulate user consent based on recommendation characteristics
    // In a real implementation, this would present a UI to the user

    let consentProbability = 0.7; // Base 70% consent rate

    // Adjust based on risk level
    switch (recommendation.risk_level) {
      case "low":
        consentProbability += 0.2;
        break;
      case "medium":
        // No adjustment
        break;
      case "high":
        consentProbability -= 0.3;
        break;
    }

    // Adjust based on estimated benefit
    const benefit =
      recommendation.estimated_benefit.processing_speed_improvement ?? 0;
    consentProbability += benefit * 0.5;

    // Add some randomness
    consentProbability += (Math.random() - 0.5) * 0.2;

    return Math.random() < Math.max(0.1, Math.min(0.9, consentProbability));
  }

  private async initiateGradualDegradation(
    memoryId: string,
    targetDegradationLevel: number
  ): Promise<string> {
    // Create a mock memory object for degradation
    // In a real implementation, this would retrieve the actual memory
    const mockMemory = {
      id: memoryId,
      content: `Mock memory content for ${memoryId}`,
      timestamp: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // Random age up to 30 days
      importance: Math.random(),
    };

    try {
      const process = await this.gradualDegradationManager.initiateDegradation(
        mockMemory as unknown as Episode | Concept,
        targetDegradationLevel
      );
      return process.process_id;
    } catch (error) {
      console.error(
        `Failed to initiate gradual degradation for memory ${memoryId}:`,
        error
      );
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.initialized) {
      this.logger.info(
        "CognitiveMCPServer",
        "Shutting down Cognitive MCP Server..."
      );

      try {
        // Cleanup cognitive components
        this.cognitiveOrchestrator.reset();
        await this.memorySystem.shutdown();
        this.metacognitionModule.reset();

        this.initialized = false;
        this.logger.info(
          "CognitiveMCPServer",
          "Cognitive MCP Server shutdown completed"
        );
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
      session_id: (contextArgs?.session_id as string) ?? "default",
      domain: contextArgs?.domain as string,
      urgency: (contextArgs?.urgency as number) ?? 0.5,
      complexity: (contextArgs?.complexity as number) ?? 0.5,
      previous_thoughts: (contextArgs?.previous_thoughts as string[]) ?? [],
      timestamp: Date.now(),
      user_id: (contextArgs?.user_id as string) ?? "anonymous",
      ...contextArgs,
    };
  }

  private createProblemFromInput(input: string, context: Context): Problem {
    // Simple problem creation from input - in a real implementation this would be more sophisticated
    const complexity = this.estimateComplexity(input);
    const uncertainty = this.estimateUncertainty(input);
    const domain = context.domain ?? this.identifyDomain(input);
    const constraints = this.extractConstraints(input);
    const stakeholders = this.identifyStakeholders(input);
    const timeSensitivity =
      context.urgency ?? this.assessTimeSensitivity(input);
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
      default_mode: args.mode ?? ProcessingMode.BALANCED,
      enable_emotion: args.enable_emotion !== false, // Default to true
      enable_metacognition: args.enable_metacognition !== false, // Default to true
      enable_prediction: true,
      working_memory_capacity: 7,
      episodic_memory_size: 1000,
      semantic_memory_size: 5000,
      consolidation_interval: 60000,
      noise_level: 0.3, // Increased for more variability
      temperature: args.temperature ?? 0.7, // Default temperature
      attention_threshold: 0.3,
      max_reasoning_depth: args.max_depth ?? 10,
      timeout_ms: 30000,
      max_concurrent_sessions: 100,
      confidence_threshold: 0.6,
      system2_activation_threshold: 0.7,
      memory_retrieval_threshold: 0.3,
      enable_systematic_thinking: args.enable_systematic_thinking !== false, // Default to true
      systematic_thinking_mode: args.systematic_thinking_mode ?? "auto",
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
