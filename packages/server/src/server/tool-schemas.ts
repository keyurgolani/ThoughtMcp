/**
 * Tool Input Schemas
 *
 * Zod schemas for validating MCP tool inputs.
 * These schemas are used by the ValidationEngine to provide structured validation errors.
 *
 * Requirements: 4.2 (MCP Interface validation)
 */

import { z } from "zod";

/**
 * Memory sector enum values
 */
const memorySectorEnum = z.enum(["episodic", "semantic", "procedural", "emotional", "reflective"]);

/**
 * Common metadata schema used across memory tools
 */
const metadataSchema = z
  .object({
    keywords: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    context: z.string().optional(),
    importance: z.number().min(0).max(1).optional(),
  })
  .optional();

/**
 * Date range schema for filtering
 */
const dateRangeSchema = z
  .object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  })
  .optional();

/**
 * Schema for remember (store_memory) tool
 *
 * Requirements: 4.2
 */
export const rememberSchema = z.object({
  content: z
    .string()
    .min(10, "Content must be at least 10 characters")
    .max(100000, "Content must not exceed 100,000 characters"),
  userId: z.string().min(1, "userId is required"),
  sessionId: z.string().min(1, "sessionId is required"),
  primarySector: memorySectorEnum,
  metadata: metadataSchema,
});

/**
 * Schema for recall (retrieve_memories) tool
 *
 * Requirements: 4.2
 */
export const recallSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  text: z.string().optional(),
  sectors: z.array(memorySectorEnum).optional(),
  primarySector: memorySectorEnum.optional(),
  minStrength: z.number().min(0).max(1).optional(),
  minSalience: z.number().min(0).max(1).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
  dateRange: dateRangeSchema,
  metadata: z
    .object({
      keywords: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

/**
 * Schema for update_memory tool
 *
 * Requirements: 4.2
 */
export const updateMemorySchema = z.object({
  memoryId: z.string().min(1, "memoryId is required"),
  userId: z.string().min(1, "userId is required"),
  content: z.string().min(10).max(100000).optional(),
  strength: z.number().min(0).max(1).optional(),
  salience: z.number().min(0).max(1).optional(),
  metadata: metadataSchema,
});

/**
 * Schema for forget (delete_memory) tool
 *
 * Requirements: 4.2
 */
export const forgetSchema = z.object({
  memoryId: z.string().min(1, "memoryId is required"),
  userId: z.string().min(1, "userId is required"),
  soft: z.boolean().optional(),
});

/**
 * Schema for search (search_memories) tool
 *
 * Requirements: 4.2
 */
export const searchSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  text: z.string().optional(),
  sectors: z.array(memorySectorEnum).optional(),
  primarySector: memorySectorEnum.optional(),
  minStrength: z.number().min(0).max(1).optional(),
  minSalience: z.number().min(0).max(1).optional(),
  dateRange: dateRangeSchema,
  metadata: z
    .object({
      keywords: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().optional(),
    })
    .optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

/**
 * Schema for batch_remember tool
 *
 * Requirements: 4.2
 */
export const batchRememberSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  sessionId: z.string().min(1, "sessionId is required"),
  memories: z
    .array(
      z.object({
        content: z.string().min(10).max(100000),
        primarySector: memorySectorEnum,
        metadata: metadataSchema,
      })
    )
    .min(1, "At least one memory is required"),
});

/**
 * Schema for batch_recall tool
 *
 * Requirements: 4.2
 */
export const batchRecallSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  memoryIds: z.array(z.string().min(1)).min(1, "At least one memoryId is required"),
  includeDeleted: z.boolean().optional(),
});

/**
 * Schema for batch_forget tool
 *
 * Requirements: 4.2
 */
export const batchForgetSchema = z.object({
  memoryIds: z.array(z.string().min(1)).min(1, "At least one memoryId is required"),
  soft: z.boolean().optional(),
});

/**
 * Schema for memory_health tool
 *
 * Requirements: 4.2
 */
export const memoryHealthSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

/**
 * Schema for prune_memories tool
 *
 * Requirements: 4.2
 */
export const pruneMemoriesSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  action: z.enum(["list", "preview", "prune", "prune_all"]),
  memoryIds: z.array(z.string().min(1)).optional(),
  criteria: z
    .object({
      minStrength: z.number().min(0).max(1).optional(),
      maxAgeDays: z.number().min(0).optional(),
      minAccessCount: z.number().min(0).optional(),
    })
    .optional(),
});

/**
 * Schema for consolidate_memories tool
 *
 * Requirements: 4.2
 */
export const consolidateMemoriesSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  config: z
    .object({
      similarityThreshold: z.number().min(0).max(1).optional(),
      minClusterSize: z.number().min(2).optional(),
      batchSize: z.number().min(1).optional(),
      strengthReductionFactor: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

/**
 * Schema for export_memories tool
 *
 * Requirements: 4.2
 */
export const exportMemoriesSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  filter: z
    .object({
      dateRange: dateRangeSchema,
      sectors: z.array(memorySectorEnum).optional(),
      tags: z.array(z.string()).optional(),
      minStrength: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

/**
 * Schema for think tool
 *
 * Requirements: 4.2
 */
export const thinkSchema = z.object({
  problem: z.string().min(1, "problem is required"),
  mode: z.enum(["analytical", "creative", "critical", "synthetic", "parallel"]),
  userId: z.string().optional(),
  context: z
    .object({
      background: z.string().optional(),
      constraints: z.array(z.string()).optional(),
      goals: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Schema for analyze (analyze_systematically) tool
 *
 * Requirements: 4.2
 */
export const analyzeSchema = z.object({
  problem: z.string().min(1, "problem is required"),
  userId: z.string().optional(),
  preferredFramework: z
    .enum([
      "scientific-method",
      "design-thinking",
      "systems-thinking",
      "critical-thinking",
      "creative-problem-solving",
      "root-cause-analysis",
      "first-principles",
      "scenario-planning",
    ])
    .optional(),
  context: z
    .object({
      background: z.string().optional(),
      constraints: z.array(z.string()).optional(),
      goals: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Schema for ponder (think_parallel) tool
 *
 * Requirements: 4.2
 */
export const ponderSchema = z.object({
  problem: z.string().min(1, "problem is required"),
  userId: z.string().optional(),
  timeout: z.number().min(1000).max(60000).optional(),
  context: z
    .object({
      background: z.string().optional(),
      constraints: z.array(z.string()).optional(),
      goals: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Schema for breakdown (decompose_problem) tool
 *
 * Requirements: 4.2
 */
export const breakdownSchema = z.object({
  problem: z.string().min(1, "problem is required"),
  userId: z.string().optional(),
  maxDepth: z.number().min(1).max(5).optional(),
  context: z
    .object({
      background: z.string().optional(),
      constraints: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * Schema for assess_confidence tool
 *
 * Requirements: 4.2
 */
export const assessConfidenceSchema = z.object({
  reasoning: z.string().min(1, "reasoning is required"),
  evidence: z.array(z.string()).optional(),
  context: z.string().optional(),
});

/**
 * Schema for detect_bias tool
 *
 * Requirements: 4.2
 */
export const detectBiasSchema = z.object({
  reasoning: z.string().min(1, "reasoning is required"),
  context: z.string().optional(),
  monitorContinuously: z.boolean().optional(),
});

/**
 * Schema for detect_emotion tool
 *
 * Requirements: 4.2
 */
export const detectEmotionSchema = z.object({
  text: z.string().min(1, "text is required"),
  includeDiscrete: z.boolean().optional(),
  context: z.string().optional(),
});

/**
 * Schema for evaluate (analyze_reasoning) tool
 *
 * Requirements: 4.2
 */
export const evaluateSchema = z.object({
  reasoning: z.string().min(1, "reasoning is required"),
  context: z.string().optional(),
  includeConfidence: z.boolean().optional(),
  includeBias: z.boolean().optional(),
  includeEmotion: z.boolean().optional(),
});

/**
 * Map of tool names to their Zod schemas
 *
 * Requirements: 4.2
 */
export const toolSchemas: Record<string, z.ZodSchema> = {
  remember: rememberSchema,
  recall: recallSchema,
  update_memory: updateMemorySchema,
  forget: forgetSchema,
  search: searchSchema,
  batch_remember: batchRememberSchema,
  batch_recall: batchRecallSchema,
  batch_forget: batchForgetSchema,
  memory_health: memoryHealthSchema,
  prune_memories: pruneMemoriesSchema,
  consolidate_memories: consolidateMemoriesSchema,
  export_memories: exportMemoriesSchema,
  think: thinkSchema,
  analyze: analyzeSchema,
  ponder: ponderSchema,
  breakdown: breakdownSchema,
  assess_confidence: assessConfidenceSchema,
  detect_bias: detectBiasSchema,
  detect_emotion: detectEmotionSchema,
  evaluate: evaluateSchema,
};

/**
 * Get the Zod schema for a tool by name
 *
 * @param toolName - Name of the tool
 * @returns Zod schema or undefined if not found
 */
export function getToolSchema(toolName: string): z.ZodSchema | undefined {
  return toolSchemas[toolName];
}
