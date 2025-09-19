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

import { IMCPServer, IToolHandler } from "../interfaces/mcp.js";
import type { ReasoningStep, ThoughtResult } from "../types/core.js";
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
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.registerTools();
    this.setupRequestHandlers();

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

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

  // Tool handler implementations - these will be connected to cognitive components later
  async handleThink(args: ThinkArgs): Promise<ThoughtResult> {
    // Validate arguments first
    const validatedArgs = this.validateThinkArgs(
      args as unknown as Record<string, unknown>
    );
    const startTime = Date.now();

    try {
      console.error(
        `Processing think request: ${validatedArgs.input.substring(0, 100)}${
          validatedArgs.input.length > 100 ? "..." : ""
        }`
      );

      // Placeholder implementation - will be replaced with actual cognitive processing
      const result: ThoughtResult = {
        content: `Thinking about: ${validatedArgs.input}`,
        confidence: 0.5,
        reasoning_path: [],
        emotional_context: {
          valence: 0,
          arousal: 0,
          dominance: 0,
          specific_emotions: new Map(),
        },
        metadata: {
          processing_time_ms: Date.now() - startTime,
          components_used: ["placeholder"],
          memory_retrievals: 0,
          system_mode: validatedArgs.mode || ProcessingMode.BALANCED,
          temperature: validatedArgs.temperature || 0.7,
        },
      };

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

      // Placeholder implementation - will be replaced with actual memory storage
      const memoryId = `mem_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const result: MemoryResult = {
        success: true,
        memory_id: memoryId,
        message: `Successfully stored ${validatedArgs.type} memory with ID ${memoryId}`,
      };

      console.error(`Memory stored in ${Date.now() - startTime}ms`);
      return result;
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

      // Placeholder implementation - will be replaced with actual memory retrieval
      const searchTime = Date.now() - startTime;
      const result: RecallResult = {
        memories: [],
        total_found: 0,
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

      // Placeholder implementation - will be replaced with actual reasoning analysis
      const result: AnalysisResult = {
        coherence_score: 0.5,
        confidence_assessment: "Moderate confidence - placeholder analysis",
        detected_biases: [],
        suggested_improvements: [
          "This is a placeholder analysis - actual implementation pending",
        ],
        reasoning_quality: {
          logical_consistency: 0.5,
          evidence_support: 0.5,
          completeness: 0.5,
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
        // Future: Cleanup cognitive components, save state, etc.
        // For now, just mark as not initialized
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

  // Placeholder method for memory system access - will be implemented with actual memory system
  getMemorySystem(): unknown {
    // This is a placeholder that returns a mock memory system for testing
    return {
      store: async (_memory: unknown) => ({ success: true, id: "test_id" }),
      recall: async (_cue: string) => ({ memories: [], total: 0 }),
      consolidate: async () => true,
      simulateTimePassage: async (_ms: number) => {
        /* no-op for testing */
      },
    };
  }
}
