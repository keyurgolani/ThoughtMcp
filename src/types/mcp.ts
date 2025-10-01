/**
 * MCP-specific types and tool interfaces
 */

import { SystematicThinkingMode } from "../interfaces/systematic-thinking.js";
import { Context, MemoryChunk, ProcessingMode, ReasoningStep } from "./core.js";

// Tool argument types for MCP interface

export interface ThinkArgs {
  input: string;
  mode?: ProcessingMode;
  context?: Partial<Context>;
  enable_emotion?: boolean;
  enable_metacognition?: boolean;
  enable_systematic_thinking?: boolean;
  systematic_thinking_mode?: "auto" | "hybrid" | "manual";
  temperature?: number;
  max_depth?: number;
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
}

export interface AnalyzeSystematicallyArgs {
  input: string;
  mode?: SystematicThinkingMode;
  context?: Partial<Context>;
}

export interface ThinkParallelArgs {
  input: string;
  context?: Partial<Context>;
  enable_coordination?: boolean;
  synchronization_interval?: number;
}

export interface DecomposeProblemArgs {
  input: string;
  context?: Partial<Context>;
  strategies?: string[];
  max_depth?: number;
}

export interface AnalyzeMemoryUsageArgs {
  analysis_depth?: "shallow" | "deep" | "comprehensive";
  include_recommendations?: boolean;
  context?: Partial<Context>;
}

export interface OptimizeMemoryArgs {
  optimization_mode?: "conservative" | "moderate" | "aggressive";
  target_memory_reduction?: number;
  enable_gradual_degradation?: boolean;
  require_user_consent?: boolean;
  preserve_important_memories?: boolean;
  context?: Partial<Context>;
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
}

export interface ThinkProbabilisticArgs {
  input: string;
  context?: Partial<Context>;
  enable_bayesian_updating?: boolean;
  uncertainty_threshold?: number;
  max_hypotheses?: number;
  evidence_weight_threshold?: number;
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
  analysis: MemoryUsageAnalysis;
  recommendations?: MemoryOptimizationRecommendation[];
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

// MCP tool schemas
export const TOOL_SCHEMAS = {
  think: {
    name: "think",
    description:
      "Process input through human-like cognitive architecture with dual-process thinking, systematic thinking frameworks, memory integration, and emotional processing",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "The input text or question to think about",
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
          description: "Processing mode to use",
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
          description: "Contextual information for processing",
        },
        enable_emotion: {
          type: "boolean",
          description: "Whether to include emotional processing",
          default: true,
        },
        enable_metacognition: {
          type: "boolean",
          description: "Whether to include metacognitive monitoring",
          default: true,
        },
        enable_systematic_thinking: {
          type: "boolean",
          description:
            "Whether to use systematic thinking frameworks for complex problems",
          default: true,
        },
        systematic_thinking_mode: {
          type: "string",
          enum: ["auto", "hybrid", "manual"],
          description: "Mode for systematic thinking framework selection",
          default: "auto",
        },
        temperature: {
          type: "number",
          minimum: 0,
          maximum: 2,
          description: "Randomness level for stochastic processing",
          default: 0.7,
        },
        max_depth: {
          type: "number",
          minimum: 1,
          maximum: 20,
          description: "Maximum reasoning depth",
          default: 10,
        },
      },
      required: ["input"],
    },
  },

  remember: {
    name: "remember",
    description:
      "Store information in episodic or semantic memory with contextual tagging",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "Content to store in memory",
        },
        type: {
          type: "string",
          enum: ["episodic", "semantic"],
          description: "Type of memory to store in",
        },
        importance: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Importance score for memory consolidation",
          default: 0.5,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            timestamp: { type: "number" },
          },
          description: "Contextual information for the memory",
        },
        emotional_tags: {
          type: "array",
          items: { type: "string" },
          description: "Emotional tags for the memory",
        },
      },
      required: ["content", "type"],
    },
  },

  recall: {
    name: "recall",
    description: "Retrieve memories based on cues with similarity matching",
    inputSchema: {
      type: "object",
      properties: {
        cue: {
          type: "string",
          description: "Search cue for memory retrieval",
        },
        type: {
          type: "string",
          enum: ["episodic", "semantic", "both"],
          description: "Type of memory to search",
          default: "both",
        },
        threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Minimum similarity threshold",
          default: 0.3,
        },
        max_results: {
          type: "number",
          minimum: 1,
          maximum: 50,
          description: "Maximum number of results to return",
          default: 10,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Context for memory search",
        },
      },
      required: ["cue"],
    },
  },

  analyze_reasoning: {
    name: "analyze_reasoning",
    description:
      "Analyze reasoning steps for coherence, biases, and quality with metacognitive assessment",
    inputSchema: {
      type: "object",
      properties: {
        reasoning_steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string" },
              content: { type: "string" },
              confidence: { type: "number" },
              alternatives: { type: "array" },
            },
            required: ["type", "content", "confidence"],
          },
          description: "Array of reasoning steps to analyze",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Context for the analysis",
        },
      },
      required: ["reasoning_steps"],
    },
  },

  analyze_systematically: {
    name: "analyze_systematically",
    description:
      "Analyze problems using systematic thinking frameworks with automatic framework selection and structured problem decomposition",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "The problem or question to analyze systematically",
        },
        mode: {
          type: "string",
          enum: ["auto", "hybrid", "manual"],
          description: "Framework selection mode",
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
          description: "Contextual information for systematic analysis",
        },
      },
      required: ["input"],
    },
  },

  think_parallel: {
    name: "think_parallel",
    description:
      "Process problems through parallel reasoning streams (analytical, creative, critical, synthetic) with real-time coordination and conflict resolution",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The problem or question to process through parallel reasoning streams",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description: "Contextual information for parallel processing",
        },
        enable_coordination: {
          type: "boolean",
          description: "Whether to enable real-time stream coordination",
          default: true,
        },
        synchronization_interval: {
          type: "number",
          minimum: 100,
          maximum: 5000,
          description: "Synchronization interval in milliseconds",
          default: 1000,
        },
      },
      required: ["input"],
    },
  },

  decompose_problem: {
    name: "decompose_problem",
    description:
      "Decompose complex problems into hierarchical structures with dependency mapping, priority analysis, and critical path identification using multiple decomposition strategies",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "The problem or challenge to decompose",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description: "Contextual information for problem decomposition",
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
            "Specific decomposition strategies to use (optional, auto-selected if not provided)",
        },
        max_depth: {
          type: "number",
          minimum: 1,
          maximum: 5,
          description: "Maximum depth for hierarchical decomposition",
          default: 3,
        },
      },
      required: ["input"],
    },
  },

  analyze_memory_usage: {
    name: "analyze_memory_usage",
    description:
      "Analyze current memory usage patterns and identify optimization opportunities for selective forgetting and memory management",
    inputSchema: {
      type: "object",
      properties: {
        analysis_depth: {
          type: "string",
          enum: ["shallow", "deep", "comprehensive"],
          description: "Depth of memory analysis to perform",
          default: "deep",
        },
        include_recommendations: {
          type: "boolean",
          description: "Whether to include optimization recommendations",
          default: true,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Context for memory analysis",
        },
      },
    },
  },

  optimize_memory: {
    name: "optimize_memory",
    description:
      "Execute memory optimization through gradual degradation, selective forgetting, and memory consolidation with user consent management",
    inputSchema: {
      type: "object",
      properties: {
        optimization_mode: {
          type: "string",
          enum: ["conservative", "moderate", "aggressive"],
          description: "Level of optimization to apply",
          default: "moderate",
        },
        target_memory_reduction: {
          type: "number",
          minimum: 0,
          maximum: 0.5,
          description: "Target percentage of memory to optimize (0-50%)",
          default: 0.1,
        },
        enable_gradual_degradation: {
          type: "boolean",
          description:
            "Whether to use gradual degradation instead of immediate forgetting",
          default: true,
        },
        require_user_consent: {
          type: "boolean",
          description:
            "Whether to require user consent for optimization decisions",
          default: true,
        },
        preserve_important_memories: {
          type: "boolean",
          description: "Whether to preserve high-importance memories",
          default: true,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Context for memory optimization",
        },
      },
    },
  },

  recover_memory: {
    name: "recover_memory",
    description:
      "Attempt to recover degraded or forgotten memories using associative, schema-based, and partial cue recovery strategies with confidence assessment",
    inputSchema: {
      type: "object",
      properties: {
        memory_id: {
          type: "string",
          description: "Unique identifier of the memory to recover",
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
                description: "Type of recovery cue",
              },
              value: {
                type: "string",
                description: "The cue value or content",
              },
              strength: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Strength of the cue for recovery (0-1)",
                default: 0.5,
              },
            },
            required: ["type", "value"],
          },
          description: "Array of recovery cues to guide memory reconstruction",
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
            "Specific recovery strategies to use (optional, auto-selected if not provided)",
        },
        max_recovery_attempts: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "Maximum number of recovery attempts to make",
          default: 5,
        },
        confidence_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Minimum confidence threshold for successful recovery",
          default: 0.3,
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
          },
          description: "Context for memory recovery",
        },
      },
      required: ["memory_id", "recovery_cues"],
    },
  },

  forgetting_audit: {
    name: "forgetting_audit",
    description:
      "Query and analyze forgetting audit logs with comprehensive filtering and reporting capabilities",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "object",
          properties: {
            start_timestamp: {
              type: "number",
              description: "Start timestamp for audit query (Unix timestamp)",
            },
            end_timestamp: {
              type: "number",
              description: "End timestamp for audit query (Unix timestamp)",
            },
            memory_ids: {
              type: "array",
              items: { type: "string" },
              description: "Filter by specific memory IDs",
            },
            execution_status: {
              type: "array",
              items: {
                type: "string",
                enum: ["pending", "executed", "cancelled", "failed"],
              },
              description: "Filter by execution status",
            },
            execution_method: {
              type: "array",
              items: {
                type: "string",
                enum: ["automatic", "manual", "user_requested"],
              },
              description: "Filter by execution method",
            },
            user_consent_granted: {
              type: "boolean",
              description: "Filter by user consent status",
            },
            privacy_level: {
              type: "array",
              items: {
                type: "string",
                enum: ["public", "private", "confidential", "restricted"],
              },
              description: "Filter by privacy level",
            },
            limit: {
              type: "number",
              minimum: 1,
              maximum: 1000,
              description: "Maximum number of results to return",
              default: 100,
            },
            offset: {
              type: "number",
              minimum: 0,
              description: "Number of results to skip for pagination",
              default: 0,
            },
          },
          description: "Query parameters for filtering audit entries",
        },
        include_summary: {
          type: "boolean",
          description: "Whether to include audit summary statistics",
          default: true,
        },
        export_format: {
          type: "string",
          enum: ["json", "csv", "xml"],
          description: "Format for exporting audit data (optional)",
        },
      },
    },
  },

  think_probabilistic: {
    name: "think_probabilistic",
    description:
      "Process input through probabilistic reasoning with Bayesian belief updating and uncertainty quantification",
    inputSchema: {
      type: "object",
      properties: {
        input: {
          type: "string",
          description:
            "The input text or question to process with probabilistic reasoning",
        },
        context: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            domain: { type: "string" },
            urgency: { type: "number", minimum: 0, maximum: 1 },
            complexity: { type: "number", minimum: 0, maximum: 1 },
          },
          description: "Contextual information for probabilistic processing",
        },
        enable_bayesian_updating: {
          type: "boolean",
          description: "Whether to enable Bayesian belief updating",
          default: true,
        },
        uncertainty_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Threshold for uncertainty reporting",
          default: 0.1,
        },
        max_hypotheses: {
          type: "number",
          minimum: 1,
          maximum: 10,
          description: "Maximum number of hypotheses to generate",
          default: 3,
        },
        evidence_weight_threshold: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Minimum weight for evidence to be considered",
          default: 0.3,
        },
      },
      required: ["input"],
    },
  },

  forgetting_policy: {
    name: "forgetting_policy",
    description:
      "Manage forgetting policies including creation, modification, evaluation, and user preference configuration",
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
          description: "Action to perform on forgetting policies",
        },
        policy_id: {
          type: "string",
          description:
            "Policy ID (required for get, update, delete, export actions)",
        },
        policy_data: {
          type: "object",
          description: "Policy data for create/update actions",
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
      },
      required: ["action"],
    },
  },
} as const;
