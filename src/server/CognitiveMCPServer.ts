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

export class CognitiveMCPServer implements IMCPServer, IToolHandler {
  private server: Server;
  private initialized: boolean = false;
  private cognitiveOrchestrator: CognitiveOrchestrator;
  private memorySystem: MemorySystem;
  private metacognitionModule: MetacognitionModule;

  constructor() {
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

    // Initialize cognitive components
    this.cognitiveOrchestrator = new CognitiveOrchestrator();
    this.memorySystem = new MemorySystem();
    this.metacognitionModule = new MetacognitionModule();
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

        // Validate tool name
        if (!Object.keys(TOOL_SCHEMAS).includes(name)) {
          throw new Error(
            `Unknown tool: ${name}. Available tools: ${Object.keys(
              TOOL_SCHEMAS
            ).join(", ")}`
          );
        }

        // Validate arguments exist
        if (!args) {
          throw new Error(`Missing arguments for tool: ${name}`);
        }

        try {
          let result;
          switch (name) {
            case "think":
              result = await this.handleThink(this.validateThinkArgs(args));
              break;
            case "remember":
              result = await this.handleRemember(
                this.validateRememberArgs(args)
              );
              break;
            case "recall":
              result = await this.handleRecall(this.validateRecallArgs(args));
              break;
            case "analyze_reasoning":
              result = await this.handleAnalyzeReasoning(
                this.validateAnalyzeReasoningArgs(args)
              );
              break;
            default:
              throw new Error(`Unhandled tool: ${name}`);
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
          console.error(`Error handling tool ${name}:`, errorMessage);

          // Return structured error response
          throw new Error(
            `Tool execution failed for '${name}': ${errorMessage}`
          );
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
    // Validate arguments first
    const validatedArgs = this.validateThinkArgs(
      args as unknown as Record<string, unknown>
    );
    try {
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

      // Process through cognitive orchestrator
      const result = await this.cognitiveOrchestrator.think(cognitiveInput);

      console.error(
        `Think request completed in ${result.metadata.processing_time_ms}ms`
      );
      return result;
    } catch (error) {
      console.error("Error in handleThink:", error);
      throw new Error(
        `Think processing failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleRemember(args: RememberArgs): Promise<MemoryResult> {
    // Validate arguments first
    const validatedArgs = this.validateRememberArgs(
      args as unknown as Record<string, unknown>
    );
    const startTime = Date.now();

    try {
      console.error(
        `Storing ${
          validatedArgs.type
        } memory: ${validatedArgs.content.substring(0, 50)}${
          validatedArgs.content.length > 50 ? "..." : ""
        }`
      );

      if (validatedArgs.type === "episodic") {
        // Store as episodic memory
        const episode: Episode = {
          content: validatedArgs.content,
          context: this.createContext(validatedArgs.context),
          timestamp: Date.now(),
          emotional_tags: validatedArgs.emotional_tags || [],
          importance: validatedArgs.importance || 0.5,
          decay_factor: 1.0,
        };

        const memoryId = this.memorySystem.storeEpisode(episode);

        const result: MemoryResult = {
          success: true,
          memory_id: memoryId,
          message: `Successfully stored episodic memory with ID ${memoryId}`,
        };

        console.error(`Episodic memory stored in ${Date.now() - startTime}ms`);
        return result;
      } else {
        // Store as semantic memory through experience storage
        const experience = {
          content: validatedArgs.content,
          context: this.createContext(validatedArgs.context),
          importance: validatedArgs.importance || 0.5,
          emotional_tags: validatedArgs.emotional_tags || [],
        };

        const storageResult = await this.memorySystem.storeExperience(
          experience
        );

        const result: MemoryResult = {
          success: storageResult.success,
          memory_id: storageResult.semantic_id || storageResult.episodic_id,
          message: `Successfully stored semantic memory`,
        };

        console.error(`Semantic memory stored in ${Date.now() - startTime}ms`);
        return result;
      }
    } catch (error) {
      console.error("Error in handleRemember:", error);
      throw new Error(
        `Memory storage failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleRecall(args: RecallArgs): Promise<RecallResult> {
    // Validate arguments first
    const validatedArgs = this.validateRecallArgs(
      args as unknown as Record<string, unknown>
    );
    const startTime = Date.now();

    try {
      console.error(`Recalling memories for cue: ${validatedArgs.cue}`);

      const threshold = validatedArgs.threshold || 0.3;
      const maxResults = validatedArgs.max_results || 10;

      // Retrieve memories from the memory system
      const retrievalResult = await this.memorySystem.retrieveMemories(
        validatedArgs.cue,
        threshold
      );

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

      console.error(
        `Memory recall completed in ${searchTime}ms, found ${result.total_found} memories`
      );
      return result;
    } catch (error) {
      console.error("Error in handleRecall:", error);
      throw new Error(
        `Memory recall failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async handleAnalyzeReasoning(
    args: AnalyzeReasoningArgs
  ): Promise<AnalysisResult> {
    // Validate arguments first
    const validatedArgs = this.validateAnalyzeReasoningArgs(
      args as unknown as Record<string, unknown>
    );
    const startTime = Date.now();

    try {
      console.error(
        `Analyzing ${validatedArgs.reasoning_steps.length} reasoning steps`
      );

      // Use metacognition module to analyze reasoning
      const assessment = this.metacognitionModule.assessReasoning(
        validatedArgs.reasoning_steps
      );

      const result: AnalysisResult = {
        coherence_score: assessment.coherence,
        confidence_assessment: `Confidence: ${assessment.confidence.toFixed(
          2
        )} - ${assessment.reasoning}`,
        detected_biases: assessment.biases_detected,
        suggested_improvements: assessment.suggestions,
        reasoning_quality: {
          logical_consistency: assessment.coherence,
          evidence_support: assessment.confidence,
          completeness: assessment.completeness,
        },
      };

      console.error(
        `Reasoning analysis completed in ${Date.now() - startTime}ms`
      );
      return result;
    } catch (error) {
      console.error("Error in handleAnalyzeReasoning:", error);
      throw new Error(
        `Reasoning analysis failed: ${
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
        this.memorySystem.shutdown();
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
      noise_level: 0.1,
      temperature: args.temperature || 0.7,
      attention_threshold: 0.3,
      max_reasoning_depth: args.max_depth || 10,
      timeout_ms: 30000,
      max_concurrent_sessions: 100,
      confidence_threshold: 0.6,
      system2_activation_threshold: 0.7,
      memory_retrieval_threshold: 0.3,
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
}
