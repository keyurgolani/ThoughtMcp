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

// Re-export DecompositionResult from RealTimeProblemDecomposer
export type { DecompositionResult } from "../cognitive/RealTimeProblemDecomposer.js";

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
} as const;
