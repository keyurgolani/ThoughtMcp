/**
 * Response formatting utilities for MCP tool outputs
 * Provides consistent, structured responses with proper error handling
 *
 * Note: This file uses 'any' types for flexible response formatting across different tool types.
 * The response formatting system needs to handle diverse response structures dynamically.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ReasoningStep,
  ReasoningTypeValue,
  ThoughtResult,
} from "../types/core.js";
import { AnalysisResult, MemoryResult, RecallResult } from "../types/mcp.js";
import {
  ParameterValidator,
  type ValidationResult,
} from "./ParameterValidator.js";
import { ProgressIndicator, type ProgressUpdate } from "./ProgressIndicator.js";
import { ProgressiveDisclosure } from "./ProgressiveDisclosure.js";
import { ThinkToolFormatter } from "./ThinkToolFormatter.js";
import { getVersion } from "./version.js";

export interface FormattedResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  metadata: ResponseMetadata;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  suggestions?: string[];
}

export interface ResponseMetadata {
  timestamp: number;
  processing_time_ms: number;
  tool_name: string;
  version: string;
  request_id?: string;
  progress_updates?: ProgressUpdate[];
  user_guidance?: UserGuidance;
  response_format?: ResponseFormatInfo;
}

export interface UserGuidance {
  complexity_level: "simple" | "moderate" | "complex" | "expert";
  suggested_next_steps?: string[];
  related_tools?: string[];
  learning_resources?: string[];
}

export interface ResponseFormatInfo {
  verbosity_level: "summary" | "standard" | "detailed" | "technical";
  has_executive_summary: boolean;
  confidence_interpretation?: ConfidenceInterpretation;
  filtering_applied?: string[];
}

export interface ConfidenceInterpretation {
  score: number;
  level: "very_low" | "low" | "moderate" | "high" | "very_high";
  meaning: string;
  actionable_advice: string[];
  reliability_factors: string[];
}

export interface ExecutiveSummary {
  key_findings: string[];
  main_recommendation: string;
  confidence_assessment: string;
  next_steps: string[];
  time_to_read: string;
}

export interface StandardizedResponse<T = unknown>
  extends FormattedResponse<T> {
  executive_summary?: ExecutiveSummary;
  filtered_data?: {
    total_items: number;
    shown_items: number;
    filter_criteria: string[];
    view_all_hint: string;
  };
}

export interface EnhancedThinkResponse
  extends StandardizedResponse<ThoughtResult> {
  enhanced_presentation?: {
    reasoning_narrative: string;
    metacognitive_advice: {
      key_insights: string[];
      potential_biases: string[];
      confidence_factors: string[];
      improvement_suggestions: string[];
      next_thinking_steps: string[];
    };
    emotional_integration: {
      emotional_summary: string;
      emotional_influence_on_reasoning: string;
      emotional_confidence_impact: string;
      emotional_recommendations: string[];
    };
  };
}

export class ResponseFormatter {
  private static readonly VERSION = getVersion();
  private static initialized = false;

  /**
   * Initialize progressive disclosure if not already done
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      ProgressiveDisclosure.initialize();
      this.initialized = true;
    }
  }

  /**
   * Format a successful ThoughtResult response
   */
  static formatThinkResponse(
    result: ThoughtResult,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<ThoughtResult> {
    return {
      success: true,
      data: {
        ...result,
        // Ensure emotional_context is properly serialized
        emotional_context: {
          valence: result.emotional_context.valence,
          arousal: result.emotional_context.arousal,
          dominance: result.emotional_context.dominance,
          specific_emotions: result.emotional_context.specific_emotions,
        },
        // Ensure reasoning_path is properly formatted
        reasoning_path: result.reasoning_path.map((step) =>
          this.formatReasoningStep(step)
        ),
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: "think",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a successful MemoryResult response
   */
  static formatRememberResponse(
    result: MemoryResult,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<MemoryResult> {
    return {
      success: true,
      data: result,
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: "remember",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a successful RecallResult response
   */
  static formatRecallResponse(
    result: RecallResult,
    requestId?: string
  ): FormattedResponse<RecallResult> {
    return {
      success: true,
      data: {
        ...result,
        // Memories are already properly typed, no need to serialize and cast
        memories: result.memories,
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: result.search_time_ms,
        tool_name: "recall",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a successful AnalysisResult response
   */
  static formatAnalyzeResponse(
    result: AnalysisResult,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<AnalysisResult> {
    return {
      success: true,
      data: result,
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: "analyze_reasoning",
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format an error response with appropriate error details
   */
  static formatErrorResponse(
    error: Error | string,
    toolName: string,
    processingTimeMs: number = 0,
    requestId?: string,
    additionalDetails?: Record<string, unknown>
  ): FormattedResponse<never> {
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorCode = this.categorizeError(errorMessage);

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: additionalDetails ?? {},
        suggestions: this.generateErrorSuggestions(errorCode, errorMessage),
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: toolName,
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a validation error response with user-friendly guidance
   */
  static formatValidationErrorResponse(
    validationResult: ValidationResult,
    toolName: string,
    processingTimeMs: number = 0,
    requestId?: string
  ): FormattedResponse<never> {
    const errorMessage = ParameterValidator.formatValidationErrors(
      validationResult,
      toolName
    );

    // Ensure progressive disclosure is initialized
    this.ensureInitialized();

    // Get progressive disclosure guidance for the tool
    const toolGuide = ProgressiveDisclosure.getGuide(toolName);
    const userGuidance: UserGuidance = {
      complexity_level: toolGuide?.complexity.level ?? "moderate",
      suggested_next_steps: [
        "Start with the basic example shown above",
        "Add one parameter at a time to build complexity",
        "Use the step-by-step guide if you're new to this tool",
      ],
      related_tools: this.getRelatedTools(toolName),
      learning_resources: [
        `Progressive guide for ${toolName}`,
        "Tool comparison matrix",
        "Parameter validation examples",
      ],
    };

    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Parameter validation failed",
        details: {
          validation_errors: validationResult.errors,
          validation_warnings: validationResult.warnings,
          user_friendly_message: errorMessage,
          progressive_guidance: toolGuide
            ? ProgressiveDisclosure.generateToolIntroduction(toolName)
            : undefined,
        },
        suggestions: [
          "📋 Check the parameter examples provided above",
          "🎯 Start simple - use only required parameters first",
          "📚 Refer to the progressive guide for step-by-step help",
          "🔍 Use the tool comparison matrix to understand when to use this tool",
        ],
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: toolName,
        version: this.VERSION,
        user_guidance: userGuidance,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format a graceful degradation response when components fail
   */
  static formatDegradedResponse<T>(
    partialResult: Partial<T>,
    failedComponents: string[],
    toolName: string,
    processingTimeMs: number,
    requestId?: string
  ): FormattedResponse<Partial<T>> {
    return {
      success: true,
      data: partialResult,
      error: {
        code: "PARTIAL_FAILURE",
        message: `Some components failed but partial results are available`,
        details: {
          failed_components: failedComponents,
          degraded_functionality: true,
        },
        suggestions: [
          "Results may be incomplete due to component failures",
          "Consider retrying the request",
          "Check system logs for detailed error information",
        ],
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: toolName,
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Format ReasoningStep for consistent output with enhanced presentation
   */
  private static formatReasoningStep(step: ReasoningStep): ReasoningStep & {
    presentation?: {
      formatted_content: string;
      confidence_indicator: string;
      reasoning_type_explanation: string;
      visual_indicator: string;
    };
  } {
    const baseStep = {
      type: step.type,
      content: step.content,
      confidence: step.confidence,
      alternatives: step.alternatives,
      metadata: step.metadata ?? {},
    };

    // Add enhanced presentation for better readability
    const presentation = {
      formatted_content: this.formatReasoningContent(step.content, step.type),
      confidence_indicator: this.getConfidenceIndicator(step.confidence),
      reasoning_type_explanation: this.getReasoningTypeExplanation(step.type),
      visual_indicator: this.getReasoningVisualIndicator(step.type),
    };

    return {
      ...baseStep,
      presentation,
    };
  }

  /**
   * Format reasoning content for better readability
   */
  private static formatReasoningContent(
    content: string,
    type: ReasoningTypeValue
  ): string {
    const prefix = this.getReasoningPrefix(type);

    // Break long content into readable chunks
    if (content.length > 150) {
      const sentences = content.split(/[.!?]+/).filter((s) => s.trim());
      if (sentences.length > 1) {
        return `${prefix}${sentences[0].trim()}.\n   → ${sentences
          .slice(1)
          .join(". ")
          .trim()}`;
      }
    }

    return `${prefix}${content}`;
  }

  /**
   * Get confidence indicator for reasoning steps
   */
  private static getConfidenceIndicator(confidence: number): string {
    if (confidence >= 0.9) return "🟢 Very High";
    if (confidence >= 0.7) return "🔵 High";
    if (confidence >= 0.5) return "🟡 Moderate";
    if (confidence >= 0.3) return "🟠 Low";
    return "🔴 Very Low";
  }

  /**
   * Get reasoning type explanation
   */
  private static getReasoningTypeExplanation(type: ReasoningTypeValue): string {
    const explanations: Record<string, string> = {
      pattern_match: "Recognizing familiar patterns from past experience",
      logical_inference: "Drawing logical conclusions from premises",
      analogical: "Comparing to similar situations or concepts",
      causal: "Identifying cause-and-effect relationships",
      probabilistic: "Weighing likelihood and uncertainty",
      metacognitive: "Thinking about the thinking process itself",
      deductive: "Reasoning from general principles to specific conclusions",
      inductive: "Generalizing from specific observations",
      abductive: "Finding the best explanation for observations",
      heuristic: "Using mental shortcuts and rules of thumb",
      contextual: "Considering situational factors and context",
    };
    return explanations[type] ?? "Applying reasoning strategy";
  }

  /**
   * Get visual indicator for reasoning type
   */
  private static getReasoningVisualIndicator(type: ReasoningTypeValue): string {
    const indicators: Record<string, string> = {
      pattern_match: "🔍",
      logical_inference: "⚡",
      analogical: "🔗",
      causal: "🎯",
      probabilistic: "🎲",
      metacognitive: "🤔",
      deductive: "📐",
      inductive: "📊",
      abductive: "💡",
      heuristic: "⚡",
      contextual: "🌍",
    };
    return indicators[type] ?? "💭";
  }

  /**
   * Get prefix for reasoning content
   */
  private static getReasoningPrefix(type: ReasoningTypeValue): string {
    const prefixes: Record<string, string> = {
      pattern_match: "I recognize that ",
      logical_inference: "Therefore, ",
      analogical: "This is similar to ",
      causal: "This happens because ",
      probabilistic: "It's likely that ",
      metacognitive: "I notice that my thinking ",
      deductive: "Given the principles, ",
      inductive: "Based on the evidence, ",
      abductive: "The best explanation is ",
      heuristic: "My intuition suggests ",
      contextual: "Considering the situation, ",
    };
    return prefixes[type] ?? "";
  }

  /**
   * Categorize errors for appropriate error codes
   */
  private static categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("requires")
    ) {
      return "VALIDATION_ERROR";
    }
    if (message.includes("timeout") || message.includes("time")) {
      return "TIMEOUT_ERROR";
    }
    if (message.includes("memory") || message.includes("capacity")) {
      return "MEMORY_ERROR";
    }
    if (message.includes("processing") || message.includes("cognitive")) {
      return "PROCESSING_ERROR";
    }
    if (message.includes("network") || message.includes("connection")) {
      return "NETWORK_ERROR";
    }
    if (message.includes("configuration") || message.includes("config")) {
      return "CONFIGURATION_ERROR";
    }

    return "UNKNOWN_ERROR";
  }

  /**
   * Generate helpful suggestions based on error type
   */
  private static generateErrorSuggestions(
    errorCode: string,
    errorMessage: string
  ): string[] {
    const suggestions: string[] = [];
    const message = errorMessage.toLowerCase();

    switch (errorCode) {
      case "VALIDATION_ERROR":
        suggestions.push(
          "💡 Double-check your parameters - something's not quite right"
        );
        suggestions.push(
          "📋 Look at the examples provided in the error message above"
        );
        suggestions.push(
          "🔍 Use the tool comparison matrix to understand parameter requirements"
        );

        // Add specific guidance based on error content
        if (message.includes("required")) {
          suggestions.push(
            "⚠️ You're missing a required parameter - check which ones are mandatory"
          );
        }
        if (
          message.includes("type") ||
          message.includes("string") ||
          message.includes("number")
        ) {
          suggestions.push(
            "🔧 Check the data type - make sure strings are in quotes and numbers aren't"
          );
        }
        if (message.includes("range") || message.includes("between")) {
          suggestions.push(
            "📏 Your value is outside the allowed range - check the min/max limits"
          );
        }
        break;

      case "TIMEOUT_ERROR":
        suggestions.push(
          "⏱️ Your request took too long - let's try a simpler approach"
        );
        suggestions.push(
          "✂️ Break complex problems into smaller, focused questions"
        );
        suggestions.push(
          "🎯 Try using 'mode: \"intuitive\"' for faster responses"
        );
        suggestions.push("📉 Reduce max_depth to 5-8 for quicker processing");

        if (message.includes("30")) {
          suggestions.push(
            "⚡ The 30-second limit was reached - this usually means the problem is too complex"
          );
        }
        break;

      case "MEMORY_ERROR":
        suggestions.push(
          "🧠 Memory system is getting full - time for some cleanup"
        );
        suggestions.push(
          "🗑️ Use the memory optimization tools to free up space"
        );
        suggestions.push(
          "📊 Check memory usage with 'analyze_memory_usage' tool"
        );
        suggestions.push(
          "🔄 Try your request again after clearing some old memories"
        );

        if (message.includes("capacity")) {
          suggestions.push(
            "📈 You've hit the memory limit - consider increasing capacity or cleaning up"
          );
        }
        break;

      case "PROCESSING_ERROR":
        suggestions.push(
          "⚙️ Something went wrong during thinking - let's troubleshoot"
        );
        suggestions.push(
          "🔄 Try the same request again (sometimes it's just a temporary glitch)"
        );
        suggestions.push(
          "🎛️ Switch to 'mode: \"balanced\"' for more stable processing"
        );
        suggestions.push(
          "📝 If it keeps failing, try rephrasing your question"
        );

        if (message.includes("cognitive")) {
          suggestions.push(
            "🧠 The thinking engine had an issue - try a simpler processing mode"
          );
        }
        if (message.includes("initialization")) {
          suggestions.push(
            "🚀 System startup issue - wait a moment and try again"
          );
        }
        break;

      case "CONFIGURATION_ERROR":
        suggestions.push(
          "⚙️ Configuration problem detected - let's fix the setup"
        );
        suggestions.push(
          "📄 Check your cognitive.config.json file for syntax errors"
        );
        suggestions.push(
          "🔧 Verify all environment variables are set correctly"
        );
        suggestions.push(
          "📖 Refer to the configuration guide in the documentation"
        );

        if (message.includes("missing")) {
          suggestions.push("❌ A required configuration setting is missing");
        }
        if (message.includes("invalid")) {
          suggestions.push("🚫 One of your configuration values is invalid");
        }
        break;

      case "NETWORK_ERROR":
        suggestions.push(
          "🌐 Network connectivity issue - check your connection"
        );
        suggestions.push("🔄 Wait a moment and try your request again");
        suggestions.push(
          "📡 If using external services, they might be temporarily unavailable"
        );
        break;

      case "PARTIAL_FAILURE":
        suggestions.push(
          "⚠️ Some parts worked, others didn't - you got partial results"
        );
        suggestions.push("🔄 Try the request again to get complete results");
        suggestions.push(
          "📊 The partial results might still be useful for your needs"
        );
        break;

      case "FORMATTING_ERROR":
        suggestions.push("🐛 This is a system error - not your fault!");
        suggestions.push(
          "📞 Please report this issue with your request details"
        );
        suggestions.push("🔄 Try a slightly different request as a workaround");
        break;

      default:
        suggestions.push(
          "🤔 Something unexpected happened - let's figure it out"
        );
        suggestions.push(
          "🔄 Try your request again (it might work the second time)"
        );
        suggestions.push(
          "📝 If the problem persists, try rephrasing your request"
        );
        suggestions.push("📞 Contact support if you keep seeing this error");
    }

    return suggestions;
  }

  /**
   * Validate response structure before sending
   */
  static validateResponse<T>(response: FormattedResponse<T>): boolean {
    try {
      // Check required fields
      if (typeof response.success !== "boolean") return false;
      if (!response.metadata || typeof response.metadata !== "object")
        return false;
      if (typeof response.metadata.timestamp !== "number") return false;
      if (typeof response.metadata.processing_time_ms !== "number")
        return false;
      if (typeof response.metadata.tool_name !== "string") return false;
      if (typeof response.metadata.version !== "string") return false;

      // Check success response structure
      if (response.success && !response.data) return false;

      // Check error response structure
      if (!response.success) {
        if (!response.error) return false;
        if (typeof response.error.code !== "string") return false;
        if (typeof response.error.message !== "string") return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a minimal fallback response when formatting fails
   */
  static createFallbackResponse(
    toolName: string,
    originalError: Error | string,
    requestId?: string
  ): FormattedResponse<never> {
    return {
      success: false,
      error: {
        code: "FORMATTING_ERROR",
        message: "Failed to format response properly",
        details: {
          original_error:
            typeof originalError === "string"
              ? originalError
              : originalError.message,
        },
        suggestions: [
          "🐛 This is a system error - not your fault!",
          "📞 Please report this issue with your request details",
          "🔄 Try a slightly different request as a workaround",
          "📋 Include the request ID in your support request if available",
        ],
      },
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: 0,
        tool_name: toolName,
        version: this.VERSION,
        ...(requestId && { request_id: requestId }),
      },
    };
  }

  /**
   * Add progress tracking to response metadata
   */
  static addProgressTracking(
    response: FormattedResponse<any>,
    progressIndicator: ProgressIndicator
  ): FormattedResponse<any> {
    return {
      ...response,
      metadata: {
        ...response.metadata,
        progress_updates: progressIndicator.getAllUpdates(),
      },
    };
  }

  /**
   * Add user guidance to response metadata
   */
  static addUserGuidance(
    response: FormattedResponse<any>,
    toolName: string,
    userLevel: "beginner" | "intermediate" | "advanced" = "beginner"
  ): FormattedResponse<any> {
    this.ensureInitialized();
    const toolGuide = ProgressiveDisclosure.getGuide(toolName);
    const userGuidance: UserGuidance = {
      complexity_level: toolGuide?.complexity.level ?? "moderate",
      suggested_next_steps: this.getSuggestedNextSteps(toolName, userLevel),
      related_tools: this.getRelatedTools(toolName),
      learning_resources: this.getLearningResources(toolName),
    };

    return {
      ...response,
      metadata: {
        ...response.metadata,
        user_guidance: userGuidance,
      },
    };
  }

  /**
   * Get suggested next steps based on tool and user level
   */
  private static getSuggestedNextSteps(
    toolName: string,
    userLevel: "beginner" | "intermediate" | "advanced"
  ): string[] {
    this.ensureInitialized();
    const toolGuide = ProgressiveDisclosure.getGuide(toolName);
    if (!toolGuide) {
      return ["Explore other available tools", "Check the documentation"];
    }

    const currentLevel = ProgressiveDisclosure.getDisclosureLevel(
      toolName,
      userLevel
    );
    if (currentLevel?.nextSteps) {
      return currentLevel.nextSteps;
    }

    // Default suggestions based on user level
    switch (userLevel) {
      case "beginner":
        return [
          "Try the same tool with different parameters",
          "Explore the intermediate features",
          "Check out related tools",
        ];
      case "intermediate":
        return [
          "Experiment with advanced parameters",
          "Combine with other tools for complex workflows",
          "Try the expert-level features",
        ];
      case "advanced":
        return [
          "Create custom workflows combining multiple tools",
          "Optimize parameters for your specific use case",
          "Share your expertise with the community",
        ];
      default:
        return [];
    }
  }

  /**
   * Get related tools based on tool category
   */
  private static getRelatedTools(toolName: string): string[] {
    const toolCategories: Record<string, string[]> = {
      // Thinking tools
      think: [
        "analyze_systematically",
        "think_parallel",
        "think_probabilistic",
      ],
      analyze_systematically: ["think", "decompose_problem", "think_parallel"],
      think_parallel: [
        "think",
        "analyze_systematically",
        "think_probabilistic",
      ],
      think_probabilistic: ["think", "analyze_reasoning", "think_parallel"],
      decompose_problem: ["analyze_systematically", "think", "think_parallel"],

      // Memory tools
      remember: ["recall", "analyze_memory_usage"],
      recall: ["remember", "analyze_memory_usage", "recover_memory"],
      analyze_memory_usage: ["optimize_memory", "remember", "recall"],
      optimize_memory: ["analyze_memory_usage", "forgetting_policy"],
      recover_memory: ["recall", "analyze_memory_usage"],

      // Analysis tools
      analyze_reasoning: ["think", "think_probabilistic"],
      analyze_task_dependencies: ["decompose_problem", "get_ready_tasks"],

      // Forgetting tools
      forgetting_policy: ["optimize_memory", "forgetting_audit"],
      forgetting_audit: ["forgetting_policy", "optimize_memory"],
    };

    return toolCategories[toolName] ?? [];
  }

  /**
   * Get learning resources for a tool
   */
  private static getLearningResources(toolName: string): string[] {
    return [
      `Progressive guide for ${toolName}`,
      "Tool comparison matrix",
      "Best practices documentation",
      "Example workflows",
      "Community tutorials",
    ];
  }

  /**
   * Format response with enhanced user experience features
   */
  static formatEnhancedResponse<T>(
    data: T,
    toolName: string,
    processingTimeMs: number,
    options: {
      requestId?: string;
      progressIndicator?: ProgressIndicator;
      userLevel?: "beginner" | "intermediate" | "advanced";
      includeGuidance?: boolean;
    } = {}
  ): FormattedResponse<T> {
    let response: FormattedResponse<T> = {
      success: true,
      data,
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: toolName,
        version: this.VERSION,
        ...(options.requestId && { request_id: options.requestId }),
      },
    };

    // Add progress tracking if available
    if (options.progressIndicator) {
      response = this.addProgressTracking(response, options.progressIndicator);
    }

    // Add user guidance if requested
    if (options.includeGuidance !== false) {
      response = this.addUserGuidance(response, toolName, options.userLevel);
    }

    return response;
  }

  /**
   * Create standardized response with executive summary and verbosity control
   */
  static createStandardizedResponse<T>(
    data: T,
    toolName: string,
    processingTimeMs: number,
    options: {
      requestId?: string;
      verbosityLevel?: "summary" | "standard" | "detailed" | "technical";
      confidence?: number;
      includeExecutiveSummary?: boolean;
      filteringOptions?: {
        maxItems?: number;
        priorityThreshold?: number;
        categories?: string[];
      };
      userLevel?: "beginner" | "intermediate" | "advanced";
    } = {}
  ): StandardizedResponse<T> {
    const verbosity = options.verbosityLevel ?? "standard";
    const shouldIncludeSummary = options.includeExecutiveSummary !== false;

    // Apply filtering if specified
    let processedData = data;
    let filteringInfo;
    if (options.filteringOptions) {
      const filtered = this.applyDataFiltering(
        data,
        options.filteringOptions,
        toolName
      );
      processedData = filtered.data;
      filteringInfo = filtered.info;
    }

    // Create base response
    let response: StandardizedResponse<T> = {
      success: true,
      data: processedData,
      metadata: {
        timestamp: Date.now(),
        processing_time_ms: processingTimeMs,
        tool_name: toolName,
        version: this.VERSION,
        response_format: {
          verbosity_level: verbosity,
          has_executive_summary: shouldIncludeSummary,
          filtering_applied: filteringInfo?.filter_criteria,
        },
        ...(options.requestId && { request_id: options.requestId }),
      },
    };

    // Add confidence interpretation if provided
    if (options.confidence !== undefined && response.metadata.response_format) {
      response.metadata.response_format.confidence_interpretation =
        this.interpretConfidence(options.confidence, toolName);
    }

    // Add executive summary if requested
    if (shouldIncludeSummary) {
      response.executive_summary = this.generateExecutiveSummary(
        processedData,
        toolName,
        options.confidence,
        processingTimeMs
      );
    }

    // Add filtering information if applied
    if (filteringInfo) {
      response.filtered_data = filteringInfo;
    }

    // Add user guidance
    response = this.addUserGuidance(
      response,
      toolName,
      options.userLevel
    ) as StandardizedResponse<T>;

    return response;
  }

  /**
   * Create enhanced standardized response specifically for the think tool
   * Includes improved reasoning presentation, metacognitive advice, and emotional integration
   */
  static createEnhancedThinkResponse(
    result: ThoughtResult,
    processingTimeMs: number,
    options: {
      requestId?: string;
      verbosityLevel?: "summary" | "standard" | "detailed" | "technical";
      includeExecutiveSummary?: boolean;
      userLevel?: "beginner" | "intermediate" | "advanced";
    } = {}
  ): EnhancedThinkResponse {
    // Create base standardized response
    const baseResponse = this.createStandardizedResponse(
      result,
      "think",
      processingTimeMs,
      {
        ...options,
        confidence: result.confidence,
      }
    ) as EnhancedThinkResponse;

    // Add enhanced presentation for think tool
    const verbosity = options.verbosityLevel ?? "standard";

    // Only add enhanced presentation for standard, detailed, or technical verbosity
    if (verbosity !== "summary") {
      const reasoningNarrative = ThinkToolFormatter.createReasoningNarrative(
        result.reasoning_path
      );

      const metacognitiveAdvice =
        ThinkToolFormatter.generateMetacognitiveAdvice(
          result,
          result.reasoning_path
        );

      const emotionalIntegration = ThinkToolFormatter.integrateEmotionalContext(
        result.emotional_context,
        result.reasoning_path
      );

      baseResponse.enhanced_presentation = {
        reasoning_narrative: reasoningNarrative,
        metacognitive_advice: metacognitiveAdvice,
        emotional_integration: emotionalIntegration,
      };
    }

    return baseResponse;
  }

  /**
   * Apply data filtering based on verbosity and options
   */
  private static applyDataFiltering<T>(
    data: T,
    options: NonNullable<
      Parameters<typeof ResponseFormatter.createStandardizedResponse>[3]
    >["filteringOptions"],
    _toolName: string
  ): { data: T; info: NonNullable<StandardizedResponse<T>["filtered_data"]> } {
    // This is a simplified implementation - in practice, this would be tool-specific
    let filteredData = data;
    let totalItems = 0;
    let shownItems = 0;
    const filterCriteria: string[] = [];

    // Handle array data (common case)
    if (Array.isArray(data)) {
      totalItems = data.length;
      let filtered = [...data];

      // Apply max items limit
      if (options?.maxItems && filtered.length > options.maxItems) {
        filtered = filtered.slice(0, options.maxItems);
        filterCriteria.push(`Limited to top ${options.maxItems} items`);
      }

      // Apply priority threshold (if items have priority/importance)
      if (options?.priorityThreshold !== undefined) {
        const originalLength = filtered.length;
        filtered = filtered.filter((item: any) => {
          const threshold = options.priorityThreshold ?? 0;
          return (
            item.priority >= threshold ||
            item.importance >= threshold ||
            item.confidence >= threshold
          );
        });
        if (filtered.length < originalLength) {
          filterCriteria.push(
            `Filtered by priority/importance threshold: ${options.priorityThreshold}`
          );
        }
      }

      // Apply category filtering
      if (options?.categories && options.categories.length > 0) {
        const originalLength = filtered.length;
        filtered = filtered.filter((item: any) => {
          return (
            options.categories?.some(
              (cat) =>
                item.category === cat ||
                item.type === cat ||
                item.tags?.includes(cat)
            ) ?? false
          );
        });
        if (filtered.length < originalLength) {
          filterCriteria.push(
            `Filtered by categories: ${options.categories.join(", ")}`
          );
        }
      }

      shownItems = filtered.length;
      filteredData = filtered as T;
    } else if (data && typeof data === "object") {
      // Handle object data
      totalItems = Object.keys(data).length;
      shownItems = totalItems; // For now, don't filter object properties
    }

    const viewAllHint =
      totalItems > shownItems
        ? `Use 'verbosity: "detailed"' or 'verbosity: "technical"' to see all ${totalItems} items`
        : "";

    return {
      data: filteredData,
      info: {
        total_items: totalItems,
        shown_items: shownItems,
        filter_criteria: filterCriteria,
        view_all_hint: viewAllHint,
      },
    };
  }

  /**
   * Interpret confidence scores with actionable advice
   */
  private static interpretConfidence(
    confidence: number,
    toolName: string
  ): ConfidenceInterpretation {
    const level =
      confidence >= 0.9
        ? "very_high"
        : confidence >= 0.7
        ? "high"
        : confidence >= 0.5
        ? "moderate"
        : confidence >= 0.3
        ? "low"
        : "very_low";

    const meanings = {
      very_high: "Extremely reliable - you can act on this with confidence",
      high: "Highly reliable - good basis for decision making",
      moderate: "Moderately reliable - consider additional validation",
      low: "Low reliability - use with caution and seek confirmation",
      very_low:
        "Very low reliability - requires significant additional validation",
    };

    const toolSpecificAdvice = this.getToolSpecificConfidenceAdvice(
      toolName,
      level
    );
    const generalAdvice = this.getGeneralConfidenceAdvice(level);
    const reliabilityFactors = this.getReliabilityFactors(toolName, confidence);

    return {
      score: confidence,
      level,
      meaning: meanings[level],
      actionable_advice: [...toolSpecificAdvice, ...generalAdvice],
      reliability_factors: reliabilityFactors,
    };
  }

  private static getToolSpecificConfidenceAdvice(
    toolName: string,
    level: ConfidenceInterpretation["level"]
  ): string[] {
    const advice: Record<string, Record<string, string[]>> = {
      think: {
        very_high: [
          "This reasoning is well-supported - proceed with the conclusion",
        ],
        high: ["Strong reasoning - good for most decisions"],
        moderate: [
          "Consider thinking through the problem again with different parameters",
        ],
        low: ["Try using 'mode: deliberative' for more thorough analysis"],
        very_low: [
          "Break down the problem further or try systematic thinking tools",
        ],
      },
      remember: {
        very_high: ["Memory stored successfully with high confidence"],
        high: ["Memory stored reliably"],
        moderate: ["Memory stored but consider adding more context"],
        low: ["Memory stored but may need reinforcement"],
        very_low: ["Consider re-storing with more detailed information"],
      },
      recall: {
        very_high: ["These memories are highly relevant to your query"],
        high: ["Good memory matches found"],
        moderate: ["Memories found but relevance may vary"],
        low: ["Limited relevant memories found - try broader search terms"],
        very_low: [
          "Few relevant memories - consider different search approach",
        ],
      },
    };

    return advice[toolName]?.[level] || [];
  }

  private static getGeneralConfidenceAdvice(
    level: ConfidenceInterpretation["level"]
  ): string[] {
    const advice: Record<string, string[]> = {
      very_high: ["You can rely on this result for important decisions"],
      high: ["This result is trustworthy for most purposes"],
      moderate: ["Consider cross-checking with additional sources"],
      low: ["Seek additional validation before making important decisions"],
      very_low: ["Use this as a starting point but verify independently"],
    };

    return advice[level] ?? [];
  }

  private static getReliabilityFactors(
    toolName: string,
    confidence: number
  ): string[] {
    const factors: string[] = [];

    if (confidence >= 0.8) {
      factors.push("High-quality input processing");
      factors.push("Strong pattern matching");
    }
    if (confidence >= 0.6) {
      factors.push("Adequate context available");
    }
    if (confidence < 0.5) {
      factors.push("Limited context or ambiguous input");
    }
    if (confidence < 0.3) {
      factors.push("Insufficient information for reliable analysis");
    }

    // Tool-specific factors
    switch (toolName) {
      case "think":
        if (confidence >= 0.7) factors.push("Coherent reasoning chain");
        if (confidence < 0.5) factors.push("Complex or contradictory problem");
        break;
      case "recall":
        if (confidence >= 0.7) factors.push("Strong memory matches");
        if (confidence < 0.5)
          factors.push("Weak or sparse memory associations");
        break;
    }

    return factors;
  }

  /**
   * Generate executive summary for any tool response
   */
  private static generateExecutiveSummary<T>(
    data: T,
    toolName: string,
    confidence?: number,
    _processingTimeMs?: number
  ): ExecutiveSummary {
    const keyFindings = this.extractKeyFindings(data, toolName);
    const mainRecommendation = this.extractMainRecommendation(data, toolName);
    const confidenceAssessment = confidence
      ? this.formatConfidenceAssessment(confidence)
      : "Confidence assessment not available";
    const nextSteps = this.suggestNextSteps(data, toolName);
    const timeToRead = this.estimateReadingTime(
      keyFindings,
      mainRecommendation
    );

    return {
      key_findings: keyFindings,
      main_recommendation: mainRecommendation,
      confidence_assessment: confidenceAssessment,
      next_steps: nextSteps,
      time_to_read: timeToRead,
    };
  }

  private static extractKeyFindings<T>(data: T, toolName: string): string[] {
    // Tool-specific key finding extraction
    switch (toolName) {
      case "think":
        if (data && typeof data === "object" && "content" in data) {
          const thought = data as any;
          const findings = [
            `Main conclusion: ${thought.content.substring(0, 80)}${
              thought.content.length > 80 ? "..." : ""
            }`,
            `Reasoning confidence: ${Math.round(
              (thought.confidence ?? 0) * 100
            )}%`,
            `${thought.reasoning_path?.length ?? 0} reasoning steps completed`,
          ];

          // Add emotional context if significant
          if (thought.emotional_context) {
            const emotion = this.interpretEmotionalContext(
              thought.emotional_context
            );
            if (emotion) findings.push(`Emotional tone: ${emotion}`);
          }

          return findings;
        }
        break;
      case "analyze_reasoning":
        if (data && typeof data === "object" && "coherence_score" in data) {
          const analysis = data as any;
          return [
            `Reasoning coherence: ${Math.round(
              analysis.coherence_score * 100
            )}%`,
            `${
              analysis.detected_biases?.length ?? 0
            } potential biases identified`,
            `${
              analysis.improvement_suggestions?.length ?? 0
            } improvement suggestions provided`,
          ];
        }
        break;
      case "analyze_systematically":
        if (data && typeof data === "object" && "selected_framework" in data) {
          const analysis = data as any;
          return [
            `Framework used: ${analysis.selected_framework}`,
            `${analysis.analysis_steps?.length ?? 0} analysis steps completed`,
            `Confidence: ${Math.round((analysis.confidence ?? 0) * 100)}%`,
          ];
        }
        break;
      case "think_parallel":
        if (data && typeof data === "object" && "stream_results" in data) {
          const parallel = data as any;
          return [
            `${
              parallel.stream_results?.length ?? 0
            } reasoning streams processed`,
            `Synthesis confidence: ${Math.round(
              (parallel.confidence ?? 0) * 100
            )}%`,
            `${
              parallel.conflicts_resolved ?? 0
            } conflicts resolved between streams`,
          ];
        }
        break;
      case "think_probabilistic":
        if (data && typeof data === "object" && "confidence" in data) {
          const prob = data as any;
          return [
            `Overall confidence: ${Math.round((prob.confidence ?? 0) * 100)}%`,
            `${prob.hypotheses?.length ?? 0} hypotheses evaluated`,
            `Uncertainty level: ${Math.round(
              (prob.uncertainty_level ?? 0) * 100
            )}%`,
          ];
        }
        break;
      case "decompose_problem":
        if (
          data &&
          typeof data === "object" &&
          "hierarchical_structure" in data
        ) {
          const decomp = data as any;
          return [
            `Problem broken into ${
              decomp.hierarchical_structure?.length ?? 0
            } main components`,
            `${decomp.total_subproblems ?? 0} total sub-problems identified`,
            `Critical path contains ${
              decomp.critical_path?.length ?? 0
            } dependencies`,
          ];
        }
        break;
      case "analyze_memory_usage":
        if (data && typeof data === "object" && "health_score" in data) {
          const analysis = data as any;
          return [
            `Memory health: ${analysis.health_score.health_status} (${analysis.health_score.overall_score}/100)`,
            `${analysis.key_metrics.total_memories.toLocaleString()} total memories using ${
              analysis.key_metrics.memory_size_mb
            }MB`,
            `${analysis.key_metrics.optimization_potential}% optimization potential`,
          ];
        }
        break;
      case "optimize_memory":
        if (
          data &&
          typeof data === "object" &&
          "optimization_summary" in data
        ) {
          const opt = data as any;
          return [
            `${opt.optimization_summary.memories_processed} memories processed`,
            `${opt.optimization_summary.memories_optimized} memories optimized`,
            `${Math.round(
              opt.optimization_summary.space_freed_mb ?? 0
            )}MB space freed`,
          ];
        }
        break;
      case "recover_memory":
        if (data && typeof data === "object" && "recovery_confidence" in data) {
          const recovery = data as any;
          return [
            `Recovery confidence: ${Math.round(
              (recovery.recovery_confidence ?? 0) * 100
            )}%`,
            `${recovery.recovery_attempts?.length ?? 0} recovery attempts made`,
            recovery.recovered_content
              ? "Memory successfully recovered"
              : "Memory recovery incomplete",
          ];
        }
        break;
      case "forgetting_audit":
        if (data && typeof data === "object" && "audit_entries" in data) {
          const audit = data as any;
          return [
            `${audit.audit_entries.length} audit entries found`,
            `Query completed in ${audit.query_time_ms}ms`,
            `${
              audit.summary?.total_forgotten ?? 0
            } memories forgotten in period`,
          ];
        }
        break;
      case "forgetting_policy":
        if (data && typeof data === "object" && "policies" in data) {
          const policy = data as any;
          return [
            `${policy.policies?.length ?? 0} policies managed`,
            policy.evaluation_result
              ? `Policy evaluation: ${policy.evaluation_result.decision}`
              : "Policy operation completed",
            `Processing time: ${policy.processing_time_ms}ms`,
          ];
        }
        break;
      case "recall":
        if (data && typeof data === "object" && "memories" in data) {
          const recall = data as any;
          return [
            `Found ${recall.memories.length} relevant memories`,
            `Search completed in ${recall.search_time_ms}ms`,
          ];
        }
        break;
    }

    return ["Analysis completed successfully"];
  }

  private static extractMainRecommendation<T>(
    data: T,
    toolName: string
  ): string {
    switch (toolName) {
      case "think":
        if (data && typeof data === "object" && "confidence" in data) {
          const thought = data as any;
          const confidence = thought.confidence ?? 0;

          if (confidence < 0.5) {
            return "Low confidence detected - consider exploring alternative approaches or gathering more information";
          } else if (confidence < 0.7) {
            return "Moderate confidence - validate key assumptions and consider potential counterarguments";
          } else if (confidence < 0.9) {
            return "Good reasoning quality - review the logic chain and proceed with implementation";
          } else {
            return "High confidence reasoning - excellent logical flow, ready for decision-making";
          }
        }
        return "Review the reasoning and consider the suggested next steps";
      case "analyze_reasoning":
        if (data && typeof data === "object" && "coherence_score" in data) {
          const score = (data as any).coherence_score;
          if (score < 0.6)
            return "Consider revising the reasoning - coherence could be improved";
          if (score < 0.8)
            return "Reasoning is solid but could benefit from refinement";
          return "Reasoning shows strong coherence - proceed with confidence";
        }
        return "Review the reasoning analysis and implement suggested improvements";
      case "analyze_systematically":
        return "Follow the systematic analysis framework and implement the recommended approach";
      case "think_parallel":
        return "Consider the synthesized insights from multiple reasoning perspectives";
      case "think_probabilistic":
        if (data && typeof data === "object" && "confidence" in data) {
          const confidence = (data as any).confidence;
          if (confidence < 0.5)
            return "High uncertainty detected - gather more evidence before deciding";
          if (confidence < 0.8)
            return "Moderate confidence - consider additional validation";
          return "High confidence in probabilistic analysis - proceed with decision";
        }
        return "Use the probabilistic insights to inform your decision-making";
      case "decompose_problem":
        return "Tackle the sub-problems in priority order, focusing on the critical path";
      case "analyze_memory_usage":
        if (data && typeof data === "object" && "key_metrics" in data) {
          return (data as any).key_metrics.top_recommendation;
        }
        return "Review memory optimization recommendations and implement high-priority improvements";
      case "optimize_memory":
        if (data && typeof data === "object" && "success" in data) {
          return (data as any).success
            ? "Memory optimization completed successfully - monitor performance improvements"
            : "Memory optimization encountered issues - review the detailed results";
        }
        return "Review optimization results and monitor memory performance";
      case "recover_memory":
        if (data && typeof data === "object" && "recovery_confidence" in data) {
          const confidence = (data as any).recovery_confidence;
          if (confidence < 0.3)
            return "Memory recovery unsuccessful - try different recovery cues";
          if (confidence < 0.7)
            return "Partial memory recovery - validate recovered content";
          return "Memory successfully recovered - verify accuracy and store if needed";
        }
        return "Review recovery results and validate any recovered content";
      case "forgetting_audit":
        return "Review the audit findings and restore any accidentally forgotten important memories";
      case "forgetting_policy":
        return "Review policy settings and adjust rules based on your memory management preferences";
      case "recall":
        return "Review the retrieved memories for relevant information";
      default:
        return "Review the results and take appropriate action";
    }
  }

  private static formatConfidenceAssessment(confidence: number): string {
    const percent = Math.round(confidence * 100);
    if (confidence >= 0.8)
      return `High confidence (${percent}%) - reliable for decision making`;
    if (confidence >= 0.6)
      return `Moderate confidence (${percent}%) - consider additional validation`;
    if (confidence >= 0.4)
      return `Low confidence (${percent}%) - use with caution`;
    return `Very low confidence (${percent}%) - requires significant validation`;
  }

  private static suggestNextSteps<T>(_data: T, toolName: string): string[] {
    switch (toolName) {
      case "think":
        if (_data && typeof _data === "object") {
          const thought = _data as any;
          const steps = [];

          // Confidence-based advice
          if (thought.confidence < 0.6) {
            steps.push(
              "🔍 Gather more evidence or information to strengthen your reasoning"
            );
            steps.push(
              "🤔 Try thinking about this from a different angle or perspective"
            );
          } else if (thought.confidence < 0.8) {
            steps.push(
              "✅ Validate your key assumptions with additional sources"
            );
            steps.push("🎯 Consider potential counterarguments or edge cases");
          } else {
            steps.push("🚀 Your reasoning is solid - proceed with confidence");
            steps.push(
              "📋 Document your decision rationale for future reference"
            );
          }

          // Reasoning path analysis
          if (thought.reasoning_path?.length > 5) {
            steps.push(
              "📝 Your reasoning was thorough - summarize the key points"
            );
          } else if (thought.reasoning_path?.length < 3) {
            steps.push("🔬 Consider exploring this topic in more depth");
          }

          // Emotional context integration
          if (thought.emotional_context) {
            const emotion = this.interpretEmotionalContext(
              thought.emotional_context
            );
            if (emotion?.includes("stress") || emotion?.includes("anxiety")) {
              steps.push(
                "😌 Take a moment to process any emotional aspects of this decision"
              );
            } else if (
              emotion?.includes("excitement") ||
              emotion?.includes("enthusiasm")
            ) {
              steps.push(
                "⚖️ Balance your enthusiasm with careful consideration of risks"
              );
            }
          }

          // Default fallback
          if (steps.length === 0) {
            steps.push("📊 Review the reasoning chain for logical consistency");
            steps.push(
              "🔄 Consider using systematic thinking tools for complex aspects"
            );
          }

          return steps;
        }
        return [
          "Evaluate the reasoning quality and confidence",
          "Consider alternative perspectives or approaches",
          "Use systematic thinking tools for complex problems",
        ];
      case "analyze_reasoning":
        return [
          "Address any identified biases in your reasoning",
          "Implement the improvement suggestions",
          "Re-analyze if coherence score is below 70%",
        ];
      case "analyze_systematically":
        return [
          "Follow the recommended systematic framework",
          "Work through each analysis step methodically",
          "Use parallel thinking for additional perspectives",
        ];
      case "think_parallel":
        return [
          "Synthesize insights from different reasoning streams",
          "Resolve any remaining conflicts between perspectives",
          "Apply the integrated solution to your problem",
        ];
      case "think_probabilistic":
        return [
          "Update your beliefs based on the probability analysis",
          "Gather additional evidence if uncertainty is high",
          "Make decisions based on the confidence levels provided",
        ];
      case "decompose_problem":
        return [
          "Start with the highest priority sub-problems",
          "Address dependencies in the critical path first",
          "Use systematic thinking for complex sub-problems",
        ];
      case "analyze_memory_usage":
        return [
          "Review the prioritized recommendations",
          "Consider implementing high-priority optimizations",
          "Monitor memory health regularly",
        ];
      case "optimize_memory":
        return [
          "Monitor system performance after optimization",
          "Review any user consent requests",
          "Schedule regular memory maintenance",
        ];
      case "recover_memory":
        return [
          "Validate any recovered content for accuracy",
          "Store recovered memories if they're valuable",
          "Try different recovery cues if unsuccessful",
        ];
      case "forgetting_audit":
        return [
          "Restore any accidentally forgotten important memories",
          "Review forgetting policies if needed",
          "Set up monitoring for future memory changes",
        ];
      case "forgetting_policy":
        return [
          "Test policy rules with sample memories",
          "Adjust policy settings based on results",
          "Monitor policy effectiveness over time",
        ];
      case "recall":
        return [
          "Review the retrieved memories for relevance",
          "Consider refining your search if needed",
          "Store new insights as memories",
        ];
      default:
        return [
          "Review the detailed results below",
          "Consider using related tools for additional insights",
        ];
    }
  }

  private static estimateReadingTime(
    keyFindings: string[],
    mainRecommendation: string
  ): string {
    const totalWords = [...keyFindings, mainRecommendation]
      .join(" ")
      .split(" ").length;
    const minutes = Math.max(1, Math.ceil(totalWords / 200)); // 200 words per minute
    return `~${minutes} min read`;
  }

  /**
   * Interpret emotional context for user-friendly presentation
   */
  private static interpretEmotionalContext(
    emotionalContext: any
  ): string | null {
    if (!emotionalContext) return null;

    const { valence, arousal, specific_emotions } = emotionalContext;

    // Convert specific emotions map to array if it exists
    let emotions: string[] = [];
    if (specific_emotions) {
      if (specific_emotions instanceof Map) {
        emotions = Array.from(specific_emotions.entries())
          .filter(([_, intensity]) => intensity > 0.3)
          .sort(([_, a], [__, b]) => b - a)
          .slice(0, 2)
          .map(([emotion, _]) => emotion);
      } else if (typeof specific_emotions === "object") {
        emotions = Object.entries(specific_emotions)
          .filter(([_, intensity]) => (intensity as number) > 0.3)
          .sort(([_, a], [__, b]) => (b as number) - (a as number))
          .slice(0, 2)
          .map(([emotion, _]) => emotion);
      }
    }

    // If we have specific emotions, use them
    if (emotions.length > 0) {
      return emotions.join(" and ");
    }

    // Otherwise, interpret from valence/arousal/dominance
    if (valence > 0.3 && arousal > 0.5) {
      return "excitement and enthusiasm";
    } else if (valence > 0.3 && arousal < 0.3) {
      return "calm and positive";
    } else if (valence < -0.3 && arousal > 0.5) {
      return "stress and concern";
    } else if (valence < -0.3 && arousal < 0.3) {
      return "disappointment";
    } else if (arousal > 0.7) {
      return "high energy";
    } else if (arousal < 0.3) {
      return "calm and measured";
    }

    return null;
  }
}
