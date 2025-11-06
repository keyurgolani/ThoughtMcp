/**
 * MCP-specific types and tool interfaces
 */

import { SystematicThinkingMode } from "../interfaces/systematic-thinking.js";
import {
  Context,
  MemoryChunk,
  ProcessingModeValue,
  ReasoningStep,
} from "./core.js";

// Tool argument types for MCP interface

export interface ThinkArgs {
  input: string;
  mode?: ProcessingModeValue;
  context?: Partial<Context>;
  enable_emotion?: boolean;
  enable_metacognition?: boolean;
  enable_systematic_thinking?: boolean;
  systematic_thinking_mode?: "auto" | "hybrid" | "manual";
  temperature?: number;
  max_depth?: number;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface RememberArgs {
  content: string;
  type: "episodic" | "semantic";
  importance?: number;
  context?: Partial<Context>;
  emotional_tags?: string[];
}

export interface RecallArgs {
  cue: string;
  type?: "episodic" | "semantic" | "both";
  threshold?: number;
  max_results?: number;
  context?: Partial<Context>;
}

export interface AnalyzeReasoningArgs {
  reasoning_steps: ReasoningStep[];
  context?: Partial<Context>;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface AnalyzeSystematicallyArgs {
  input: string;
  mode?: SystematicThinkingMode;
  context?: Partial<Context>;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface ThinkParallelArgs {
  input: string;
  context?: Partial<Context>;
  enable_coordination?: boolean;
  synchronization_interval?: number;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface DecomposeProblemArgs {
  input: string;
  context?: Partial<Context>;
  strategies?: string[];
  max_depth?: number;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface AnalyzeMemoryUsageArgs {
  analysis_depth?: "shallow" | "deep" | "comprehensive";
  include_recommendations?: boolean;
  context?: Partial<Context>;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface OptimizeMemoryArgs {
  optimization_mode?: "conservative" | "moderate" | "aggressive";
  target_memory_reduction?: number;
  enable_gradual_degradation?: boolean;
  require_user_consent?: boolean;
  preserve_important_memories?: boolean;
  context?: Partial<Context>;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface RecoverMemoryArgs {
  memory_id: string;
  recovery_cues: Array<{
    type: "semantic" | "temporal" | "contextual" | "associative" | "emotional";
    value: string;
    strength?: number;
  }>;
  recovery_strategies?: string[];
  max_recovery_attempts?: number;
  confidence_threshold?: number;
  context?: Partial<Context>;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface ForgettingAuditArgs {
  query?: {
    start_timestamp?: number;
    end_timestamp?: number;
    memory_ids?: string[];
    execution_status?: ("pending" | "executed" | "cancelled" | "failed")[];
    execution_method?: ("automatic" | "manual" | "user_requested")[];
    user_consent_granted?: boolean;
    privacy_level?: ("public" | "private" | "confidential" | "restricted")[];
    limit?: number;
    offset?: number;
  };
  include_summary?: boolean;
  export_format?: "json" | "csv" | "xml";
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface ThinkProbabilisticArgs {
  input: string;
  context?: Partial<Context>;
  enable_bayesian_updating?: boolean;
  uncertainty_threshold?: number;
  max_hypotheses?: number;
  evidence_weight_threshold?: number;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

export interface ForgettingPolicyArgs {
  action:
    | "list"
    | "get"
    | "create"
    | "update"
    | "delete"
    | "evaluate"
    | "import"
    | "export";
  policy_id?: string;
  policy_data?: {
    policy_name?: string;
    description?: string;
    active?: boolean;
    rules?: Array<{
      rule_name: string;
      description?: string;
      priority: number;
      conditions: Array<{
        condition_type:
          | "memory_type"
          | "importance_threshold"
          | "age_days"
          | "access_frequency"
          | "content_category"
          | "privacy_level"
          | "user_tag";
        operator:
          | "equals"
          | "not_equals"
          | "greater_than"
          | "less_than"
          | "contains"
          | "not_contains"
          | "in"
          | "not_in";
        value: unknown;
        weight?: number;
      }>;
      condition_logic: "AND" | "OR";
      action: "allow" | "deny" | "require_consent" | "delay" | "modify";
      action_parameters?: Record<string, unknown>;
    }>;
    user_preferences?: {
      consent_required_by_default?: boolean;
      protected_categories?: string[];
      max_auto_forget_importance?: number;
      retention_period_days?: number;
    };
  };
  evaluation_context?: {
    memory_id: string;
    memory_type: "episodic" | "semantic";
    decision: Record<string, unknown>;
    evaluation: Record<string, unknown>;
    memory_metadata: Record<string, unknown>;
  };
  active_only?: boolean;
  verbosity?: "summary" | "standard" | "detailed" | "technical";
  include_executive_summary?: boolean;
}

// Tool result types

export interface MemoryResult {
  success: boolean;
  memory_id: string;
  message: string;
}

export interface RecallResult {
  memories: MemoryChunk[];
  total_found: number;
  search_time_ms: number;
}

export interface AnalysisResult {
  coherence_score: number;
  confidence_assessment: string;
  detected_biases: string[];
  suggested_improvements: string[];
  reasoning_quality: {
    logical_consistency: number;
    evidence_support: number;
    completeness: number;
  };
}

// Re-export SystematicAnalysisResult from systematic-thinking interface
export type { SystematicAnalysisResult } from "../interfaces/systematic-thinking.js";

// Re-export ParallelReasoningResult from parallel-reasoning interface
export type { ParallelReasoningResult } from "../interfaces/parallel-reasoning.js";

// Re-export ProbabilisticReasoningResult from probabilistic-reasoning interface
export type { ProbabilisticReasoningResult } from "../interfaces/probabilistic-reasoning.js";

// Re-export DecompositionResult from RealTimeProblemDecomposer
export type { DecompositionResult } from "../cognitive/RealTimeProblemDecomposer.js";

// Re-export forgetting system types
// Import and re-export forgetting system types
import type {
  MemoryOptimizationRecommendation as IMemoryOptimizationRecommendation,
  MemoryUsageAnalysis as IMemoryUsageAnalysis,
} from "../interfaces/forgetting.js";

export type MemoryUsageAnalysis = IMemoryUsageAnalysis;
export type MemoryOptimizationRecommendation =
  IMemoryOptimizationRecommendation;

export interface MemoryUsageAnalysisResult {
  analysis:
    | MemoryUsageAnalysis
    | import("../utils/MemoryAnalysisFormatter.js").FormattedMemoryAnalysis;
  recommendations?:
    | MemoryOptimizationRecommendation[]
    | import("../utils/MemoryAnalysisFormatter.js").FormattedRecommendation[];
  analysis_time_ms: number;
}

export interface MemoryOptimizationResult {
  success: boolean;
  optimization_summary: {
    memories_processed: number;
    memories_degraded: number;
    memories_forgotten: number;
    memories_archived: number;
    total_space_freed_bytes: number;
    performance_improvement_estimate: number;
  };
  degradation_processes_started: string[]; // Process IDs
  user_consent_requests: {
    memory_id: string;
    action: string;
    reason: string;
    consent_required: boolean;
  }[];
  errors: string[];
  optimization_time_ms: number;
}

export interface MemoryRecoveryResult {
  success: boolean;
  memory_id: string;
  recovered_memory?: unknown;
  recovery_confidence: number;
  recovery_method: string;
  partial_recovery: boolean;
  missing_elements: string[];
  recovery_attempts: Array<{
    strategy_name: string;
    success: boolean;
    confidence: number;
    method_details: string;
  }>;
  quality_assessment: {
    overall_quality: number;
    content_coherence: number;
    contextual_consistency: number;
    quality_issues: string[];
  };
  recovery_time_ms: number;
}

export interface ForgettingAuditResult {
  success: boolean;
  audit_entries: Array<{
    audit_id: string;
    timestamp: number;
    memory_id: string;
    memory_type: "episodic" | "semantic";
    memory_content_summary: string;
    execution_status: "pending" | "executed" | "cancelled" | "failed";
    execution_method: "automatic" | "manual" | "user_requested";
    user_consent_requested: boolean;
    user_consent_granted?: boolean;
    privacy_level: "public" | "private" | "confidential" | "restricted";
    secure_deletion_applied: boolean;
  }>;
  summary?: {
    total_entries: number;
    entries_by_status: Record<string, number>;
    entries_by_method: Record<string, number>;
    total_memory_freed_bytes: number;
    average_processing_improvement_ms: number;
    user_consent_rate: number;
    recovery_attempt_rate: number;
    recovery_success_rate: number;
    time_period: {
      start_timestamp: number;
      end_timestamp: number;
    };
  };
  exported_data?: string;
  query_time_ms: number;
}

export interface ForgettingPolicyResult {
  success: boolean;
  action: string;
  policy_id?: string;
  policies?: Array<{
    policy_id: string;
    policy_name: string;
    description: string;
    active: boolean;
    created_timestamp: number;
    last_modified_timestamp: number;
    rules_count: number;
  }>;
  policy?: {
    policy_id: string;
    policy_name: string;
    description: string;
    active: boolean;
    rules: Array<{
      rule_id: string;
      rule_name: string;
      description: string;
      priority: number;
      action: string;
    }>;
    user_preferences: Record<string, unknown>;
  };
  evaluation_result?: {
    policy_id: string;
    final_decision: "allow" | "deny" | "require_consent" | "delay" | "modify";
    decision_confidence: number;
    consent_required: boolean;
    reasoning: string[];
  };
  exported_policy?: unknown;
  message?: string;
  processing_time_ms: number;
}

// Import improved schemas

// MCP tool schemas with user-friendly descriptions
export const TOOL_SCHEMAS = {
  think: {
    name: "think",
    description:
      "Think through problems like a human - considering different angles, checking for mistakes, and providing thoughtful responses. Perfect for decisions, analysis, and creative problem-solving.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "Your question or problem to think about",
        },
        mode: {
          type: "string",
          enum: [
            "intuitive",
            "deliberative",
            "balanced",
            "creative",
            "analytical",
          ],
          description:
            "How to think about it: 'intuitive' for quick answers, 'deliberative' for careful analysis, 'creative' for innovative ideas, 'analytical' for logical reasoning, 'balanced' for general use (default)",
          default: "balanced",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            previous_thoughts: { type: "array", items: { type: "string" } },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description:
            "Optional context to help with thinking (previous conversations, topic area, urgency level)",
        },
        enable_emotion: {
          type: "boolean",
          description:
            "Include emotional considerations in thinking (recommended for personal decisions)",
          default: true,
        },
        enable_metacognition: {
          type: "boolean",
          description:
            "Check the quality of thinking and suggest improvements (recommended for important decisions)",
          default: true,
        },
        enable_systematic_thinking: {
          type: "boolean",
          description:
            "Use structured problem-solving methods for complex issues",
          default: true,
        },
        systematic_thinking_mode: {
          type: "string",
          enum: ["auto", "hybrid", "manual"],
          description:
            "How to select thinking frameworks: 'auto' lets the system choose, 'manual' for specific control",
          default: "auto",
        },
        temperature: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description:
            "Creativity level: 0.3 for focused thinking, 0.7 for balanced, 1.2 for very creative",
          default: 0.7,
        },
        max_depth: {
          type: "number",
          minimum: 1,
          maximum: 20,
          description:
            "How deep to think: 5 for quick, 10 for normal, 15+ for very thorough",
          default: 10,
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["input"],
    },
  },

  remember: {
    name: "remember",
    description:
      "Save important information to memory so it can be recalled later. Like writing in a smart notebook that organizes itself and connects related ideas.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description:
            "The information to remember (insights, facts, experiences, decisions)",
        },
        type: {
          type: "string",
          enum: ["episodic", "semantic"],
          description:
            "Type of memory: 'episodic' for specific experiences/events, 'semantic' for general knowledge/facts",
        },
        importance: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "How important this is to remember: 0.3 for casual info, 0.7 for important, 0.9+ for critical",
          default: 0.5,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            timestamp: { type: "number" },
          },
          description:
            "Optional context about when/where this information came from",
        },
        emotional_tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Emotional context (e.g., 'exciting', 'concerning', 'positive') to help with recall",
        },
      },
      required: ["content", "type"],
    },
  },

  recall: {
    name: "recall",
    description:
      "Find information from memory based on what you're looking for. Searches through past experiences and knowledge to find relevant information.",
    inputSchema: {
      type: "object",
      properties: {
        cue: {
          type: "string",
          description:
            "What you're looking for (keywords, topics, or descriptions of what you remember)",
        },
        type: {
          type: "string",
          enum: ["episodic", "semantic", "both"],
          description:
            "What to search: 'episodic' for experiences, 'semantic' for facts/knowledge, 'both' for everything (default)",
          default: "both",
        },
        threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "How closely related results need to be: 0.2 for loose matches, 0.5 for good matches, 0.8 for very similar",
          default: 0.3,
        },
        max_results: {
          type: "number",
          minimum: 1,
          maximum: 50,
          description: "Maximum number of memories to return (default: 10)",
          default: 10,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context to help focus the search",
        },
      },
      required: ["cue"],
    },
  },

  analyze_reasoning: {
    name: "analyze_reasoning",
    description:
      "Check the quality of thinking and reasoning to spot mistakes, biases, and areas for improvement. Like having a thinking coach review your logic.",
    inputSchema: {
      type: "object",
      properties: {
        reasoning_steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description:
                  "Type of reasoning step (premise, conclusion, assumption, etc.)",
              },
              content: {
                type: "string",
                description: "The actual reasoning or statement",
              },
              confidence: {
                type: "number",
                description: "How confident you are in this step (0-1)",
              },
              alternatives: {
                type: "array",
                description: "Other ways to think about this",
              },
            },
            required: ["type", "content", "confidence"],
          },
          description:
            "The reasoning steps to analyze (from a decision or thought process)",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context about the reasoning situation",
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["reasoning_steps"],
    },
  },

  analyze_systematically: {
    name: "analyze_systematically",
    description:
      "Apply proven problem-solving methods (like Design Thinking, Scientific Method, Root Cause Analysis) to tackle complex issues systematically.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The complex problem or challenge to analyze systematically",
        },
        mode: {
          type: "string",
          enum: ["auto", "hybrid", "manual"],
          description:
            "Framework selection: 'auto' chooses the best method automatically (recommended)",
          default: "auto",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description:
            "Context about the problem (domain, urgency, complexity level)",
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["input"],
    },
  },

  think_parallel: {
    name: "think_parallel",
    description:
      "Think about problems from multiple perspectives simultaneously - analytical, creative, critical, and synthetic viewpoints working together for comprehensive insights.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The problem or question to analyze from multiple perspectives",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description: "Context about the problem for better analysis",
        },
        enable_coordination: {
          type: "boolean",
          description:
            "Allow different thinking streams to share insights and resolve conflicts (recommended)",
          default: true,
        },
        synchronization_interval: {
          type: "number",
          minimum: 100,
          maximum: 5000,
          description:
            "How often thinking streams coordinate (milliseconds, default: 1000)",
          default: 1000,
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["input"],
    },
  },

  decompose_problem: {
    name: "decompose_problem",
    description:
      "Break down big, overwhelming problems into smaller, manageable pieces with clear priorities and dependencies. Perfect for large projects or complex challenges.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The large or complex problem to break down into manageable parts",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description:
            "Context about the problem (domain, urgency, complexity)",
        },
        strategies: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "functional",
              "temporal",
              "stakeholder",
              "component",
              "risk",
              "resource",
              "complexity",
            ],
          },
          description:
            "Specific breakdown approaches to use (leave empty for automatic selection)",
        },
        max_depth: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description:
            "How many levels deep to break down the problem (2-3 usually works well)",
          default: 3,
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["input"],
    },
  },

  analyze_memory_usage: {
    name: "analyze_memory_usage",
    description:
      "Check how memory is being used and get suggestions for optimization. Like running a health check on your memory system to keep it running smoothly.",
    inputSchema: {
      type: "object",
      properties: {
        analysis_depth: {
          type: "string",
          enum: ["shallow", "deep", "comprehensive"],
          description:
            "Analysis level: 'shallow' for quick check, 'deep' for detailed analysis (recommended), 'comprehensive' for full audit",
          default: "deep",
        },
        include_recommendations: {
          type: "boolean",
          description: "Include suggestions for improving memory performance",
          default: true,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context for the analysis",
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
    },
  },

  optimize_memory: {
    name: "optimize_memory",
    description:
      "Clean up memory by removing or archiving less important information while preserving valuable memories. Helps improve thinking performance and reduces clutter.",
    inputSchema: {
      type: "object",
      properties: {
        optimization_mode: {
          type: "string",
          enum: ["conservative", "moderate", "aggressive"],
          description:
            "Cleanup level: 'conservative' for minimal changes, 'moderate' for balanced cleanup (recommended), 'aggressive' for maximum cleanup",
          default: "moderate",
        },
        target_memory_reduction: {
          type: "number",
          minimum: 0,
          maximum: 0.5,
          description:
            "Percentage of memory to optimize (0.1 = 10%, recommended maximum 0.3 = 30%)",
          default: 0.1,
        },
        enable_gradual_degradation: {
          type: "boolean",
          description:
            "Gradually fade memories instead of deleting immediately (safer, allows recovery)",
          default: true,
        },
        require_user_consent: {
          type: "boolean",
          description: "Ask permission before removing important memories",
          default: true,
        },
        preserve_important_memories: {
          type: "boolean",
          description:
            "Always keep high-importance memories (strongly recommended)",
          default: true,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context for optimization",
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
    },
  },

  recover_memory: {
    name: "recover_memory",
    description:
      "Try to restore forgotten or degraded memories using partial clues and associations. Like trying to remember something that's 'on the tip of your tongue'.",
    inputSchema: {
      type: "object",
      properties: {
        memory_id: {
          type: "string",
          description:
            "The ID of the memory to recover (from memory analysis or audit logs)",
        },
        recovery_cues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "semantic",
                  "temporal",
                  "contextual",
                  "associative",
                  "emotional",
                ],
                description:
                  "Type of clue: 'semantic' for topic/content, 'temporal' for when, 'contextual' for situation, 'associative' for related ideas, 'emotional' for feelings",
              },
              value: {
                type: "string",
                description: "The actual clue or hint you remember",
              },
              strength: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description:
                  "How confident you are in this clue (0.5 = somewhat sure, 0.8 = very sure)",
                default: 0.5,
              },
            },
            required: ["type", "value"],
          },
          description:
            "Clues to help recover the memory (the more clues, the better chance of recovery)",
          minItems: 1,
        },
        recovery_strategies: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "associative_recovery",
              "schema_based_recovery",
              "partial_cue_recovery",
            ],
          },
          description:
            "Recovery methods to try (leave empty for automatic selection)",
        },
        max_recovery_attempts: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description:
            "Maximum number of recovery attempts (more attempts = better chance but slower)",
          default: 5,
        },
        confidence_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "Minimum confidence needed to consider recovery successful (0.3 = accept partial recovery)",
          default: 0.3,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Optional context for recovery",
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["memory_id", "recovery_cues"],
    },
  },

  forgetting_audit: {
    name: "forgetting_audit",
    description:
      "Review what memories have been forgotten, archived, or modified. Provides transparency and allows you to restore accidentally forgotten information.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "object",
          properties: {
            start_timestamp: {
              type: "number",
              description:
                "Show changes after this time (Unix timestamp, leave empty for all time)",
            },
            end_timestamp: {
              type: "number",
              description:
                "Show changes before this time (Unix timestamp, leave empty for now)",
            },
            memory_ids: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific memory IDs to check (leave empty for all memories)",
            },
            execution_status: {
              type: "array",
              items: {
                type: "string",
                enum: ["pending", "executed", "cancelled", "failed"],
              },
              description:
                "Filter by what happened: 'executed' for completed, 'pending' for scheduled",
            },
            execution_method: {
              type: "array",
              items: {
                type: "string",
                enum: ["automatic", "manual", "user_requested"],
              },
              description:
                "Filter by how it happened: 'automatic' for system cleanup, 'user_requested' for manual",
            },
            user_consent_granted: {
              type: "boolean",
              description:
                "Show only changes you approved (true) or didn't approve (false)",
            },
            privacy_level: {
              type: "array",
              items: {
                type: "string",
                enum: ["public", "private", "confidential", "restricted"],
              },
              description: "Filter by privacy level of forgotten memories",
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 1000,
              description: "Maximum number of results to show (default: 100)",
              default: 100,
            },
            offset: {
              type: "number",
              minimum: 0,
              description:
                "Skip this many results (for pagination, default: 0)",
              default: 0,
            },
          },
          description:
            "Filters for what to show in the audit (leave empty to see recent changes)",
        },
        include_summary: {
          type: "boolean",
          description: "Include summary statistics about memory changes",
          default: true,
        },
        export_format: {
          type: "string",
          enum: ["json", "csv", "xml"],
          description: "Format for exporting audit data (optional)",
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
    },
  },

  think_probabilistic: {
    name: "think_probabilistic",
    description:
      "Handle uncertain situations by working with probabilities, updating beliefs based on evidence, and quantifying confidence levels. Great for risk assessment and decisions with incomplete information.",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The uncertain situation or question to analyze probabilistically",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description: "Context about the uncertain situation",
        },
        enable_bayesian_updating: {
          type: "boolean",
          description:
            "Update beliefs as new evidence comes in (recommended for evolving situations)",
          default: true,
        },
        uncertainty_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "When to flag high uncertainty (0.1 = flag if >10% uncertain)",
          default: 0.1,
        },
        max_hypotheses: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "Maximum number of possible explanations to consider",
          default: 3,
        },
        evidence_weight_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "Minimum strength of evidence to consider (0.3 = ignore weak evidence)",
          default: 0.3,
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["input"],
    },
  },

  forgetting_policy: {
    name: "forgetting_policy",
    description:
      "Create and manage rules for what types of memories should be kept, forgotten, or require permission before removal. Like setting up automatic memory management preferences.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "list",
            "get",
            "create",
            "update",
            "delete",
            "evaluate",
            "import",
            "export",
          ],
          description:
            "What to do: 'list' to see policies, 'create' to make new policy, 'get' to see specific policy details",
        },
        policy_id: {
          type: "string",
          description:
            "Policy ID (needed for 'get', 'update', 'delete', 'export' actions)",
        },
        policy_data: {
          type: "object",
          description:
            "Policy details (needed for 'create' and 'update' actions)",
          properties: {
            policy_name: { type: "string" },
            description: { type: "string" },
            active: { type: "boolean" },
            rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_name: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "number" },
                  conditions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        condition_type: {
                          type: "string",
                          enum: [
                            "memory_type",
                            "importance_threshold",
                            "age_days",
                            "access_frequency",
                            "content_category",
                            "privacy_level",
                            "user_tag",
                          ],
                        },
                        operator: {
                          type: "string",
                          enum: [
                            "equals",
                            "not_equals",
                            "greater_than",
                            "less_than",
                            "contains",
                            "not_contains",
                            "in",
                            "not_in",
                          ],
                        },
                        value: {},
                        weight: { type: "number" },
                      },
                      required: ["condition_type", "operator", "value"],
                    },
                  },
                  condition_logic: {
                    type: "string",
                    enum: ["AND", "OR"],
                  },
                  action: {
                    type: "string",
                    enum: [
                      "allow",
                      "deny",
                      "require_consent",
                      "delay",
                      "modify",
                    ],
                  },
                  action_parameters: { type: "object" },
                },
                required: [
                  "rule_name",
                  "conditions",
                  "condition_logic",
                  "action",
                ],
              },
            },
            user_preferences: {
              type: "object",
              properties: {
                consent_required_by_default: { type: "boolean" },
                protected_categories: {
                  type: "array",
                  items: { type: "string" },
                },
                max_auto_forget_importance: { type: "number" },
                retention_period_days: { type: "number" },
              },
            },
          },
        },
        evaluation_context: {
          type: "object",
          description:
            "Context for policy evaluation (required for evaluate action)",
          properties: {
            memory_id: { type: "string" },
            memory_type: {
              type: "string",
              enum: ["episodic", "semantic"],
            },
            decision: { type: "object" },
            evaluation: { type: "object" },
            memory_metadata: { type: "object" },
          },
        },
        active_only: {
          type: "boolean",
          description: "Whether to list only active policies (for list action)",
          default: false,
        },
        verbosity: {
          type: "string",
          enum: ["summary", "standard", "detailed", "technical"],
          description:
            "Response detail level: 'summary' for key points only, 'standard' for balanced output, 'detailed' for comprehensive analysis, 'technical' for full diagnostic info",
          default: "standard",
        },
        include_executive_summary: {
          type: "boolean",
          description:
            "Include a brief executive summary with key findings and recommendations",
          default: true,
        },
      },
      required: ["action"],
    },
  },
} as const;
