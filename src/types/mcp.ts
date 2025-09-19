/**
 * MCP-specific types and tool interfaces
 */

import { MemoryChunk, ReasoningStep, ProcessingMode, Context } from './core.js';


// Tool argument types for MCP interface

export interface ThinkArgs {
  input: string;
  mode?: ProcessingMode;
  context?: Partial<Context>;
  enable_emotion?: boolean;
  enable_metacognition?: boolean;
  temperature?: number;
  max_depth?: number;
}

export interface RememberArgs {
  content: string;
  type: 'episodic' | 'semantic';
  importance?: number;
  context?: Partial<Context>;
  emotional_tags?: string[];
}

export interface RecallArgs {
  cue: string;
  type?: 'episodic' | 'semantic' | 'both';
  threshold?: number;
  max_results?: number;
  context?: Partial<Context>;
}

export interface AnalyzeReasoningArgs {
  reasoning_steps: ReasoningStep[];
  context?: Partial<Context>;
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

// MCP tool schemas
export const TOOL_SCHEMAS = {
  think: {
    name: 'think',
    description: 'Process input through human-like cognitive architecture with dual-process thinking, memory integration, and emotional processing',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'The input text or question to think about'
        },
        mode: {
          type: 'string',
          enum: ['intuitive', 'deliberative', 'balanced', 'creative', 'analytical'],
          description: 'Processing mode to use',
          default: 'balanced'
        },
        context: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            previous_thoughts: { type: 'array', items: { type: 'string' } },
            domain: { type: 'string' },
            urgency: { type: 'number', minimum: 0, maximum: 1 },
            complexity: { type: 'number', minimum: 0, maximum: 1 }
          },
          description: 'Contextual information for processing'
        },
        enable_emotion: {
          type: 'boolean',
          description: 'Whether to include emotional processing',
          default: true
        },
        enable_metacognition: {
          type: 'boolean',
          description: 'Whether to include metacognitive monitoring',
          default: true
        },
        temperature: {
          type: 'number',
          minimum: 0,
          maximum: 2,
          description: 'Randomness level for stochastic processing',
          default: 0.7
        },
        max_depth: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          description: 'Maximum reasoning depth',
          default: 10
        }
      },
      required: ['input']
    }
  },

  remember: {
    name: 'remember',
    description: 'Store information in episodic or semantic memory with contextual tagging',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content to store in memory'
        },
        type: {
          type: 'string',
          enum: ['episodic', 'semantic'],
          description: 'Type of memory to store in'
        },
        importance: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Importance score for memory consolidation',
          default: 0.5
        },
        context: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            domain: { type: 'string' },
            timestamp: { type: 'number' }
          },
          description: 'Contextual information for the memory'
        },
        emotional_tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Emotional tags for the memory'
        }
      },
      required: ['content', 'type']
    }
  },

  recall: {
    name: 'recall',
    description: 'Retrieve memories based on cues with similarity matching',
    inputSchema: {
      type: 'object',
      properties: {
        cue: {
          type: 'string',
          description: 'Search cue for memory retrieval'
        },
        type: {
          type: 'string',
          enum: ['episodic', 'semantic', 'both'],
          description: 'Type of memory to search',
          default: 'both'
        },
        threshold: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Minimum similarity threshold',
          default: 0.3
        },
        max_results: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          description: 'Maximum number of results to return',
          default: 10
        },
        context: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            domain: { type: 'string' }
          },
          description: 'Context for memory search'
        }
      },
      required: ['cue']
    }
  },

  analyze_reasoning: {
    name: 'analyze_reasoning',
    description: 'Analyze reasoning steps for coherence, biases, and quality with metacognitive assessment',
    inputSchema: {
      type: 'object',
      properties: {
        reasoning_steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              content: { type: 'string' },
              confidence: { type: 'number' },
              alternatives: { type: 'array' }
            },
            required: ['type', 'content', 'confidence']
          },
          description: 'Array of reasoning steps to analyze'
        },
        context: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            domain: { type: 'string' }
          },
          description: 'Context for the analysis'
        }
      },
      required: ['reasoning_steps']
    }
  }
} as const;