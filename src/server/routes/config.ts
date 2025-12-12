/**
 * Config Routes
 *
 * REST API endpoints for system configuration management.
 * Requirements: 10.1, 10.2
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler, ValidationApiError } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Helper to extract request ID from request
 */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/**
 * Helper to parse Zod validation errors into field errors
 */
function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

/**
 * Cognitive mode options
 */
type CognitiveMode = "balanced" | "analytical" | "creative" | "intuitive" | "deliberative";

/**
 * Memory limits configuration
 */
interface MemoryLimits {
  /** Maximum memories per user */
  maxMemoriesPerUser: number;
  /** Maximum memory content length in characters */
  maxContentLength: number;
  /** Maximum batch size for batch operations */
  maxBatchSize: number;
  /** Memory retention period in days (0 = infinite) */
  retentionDays: number;
}

/**
 * Processing parameters configuration
 */
interface ProcessingParameters {
  /** Embedding dimension size */
  embeddingDimension: number;
  /** Minimum similarity threshold for recall */
  minSimilarityThreshold: number;
  /** Maximum parallel reasoning streams */
  maxParallelStreams: number;
  /** Reasoning timeout in milliseconds */
  reasoningTimeoutMs: number;
  /** Default recall limit */
  defaultRecallLimit: number;
}

/**
 * Feature flags configuration
 */
interface FeatureFlags {
  /** Enable parallel reasoning */
  parallelReasoningEnabled: boolean;
  /** Enable emotion detection */
  emotionDetectionEnabled: boolean;
  /** Enable bias detection */
  biasDetectionEnabled: boolean;
  /** Enable memory consolidation */
  memoryConsolidationEnabled: boolean;
  /** Enable waypoint graph */
  waypointGraphEnabled: boolean;
}

/**
 * Full system configuration
 * Requirements: 10.1
 */
interface SystemConfig {
  /** Current cognitive processing mode */
  cognitiveMode: CognitiveMode;
  /** Memory system limits */
  memoryLimits: MemoryLimits;
  /** Processing parameters */
  processingParameters: ProcessingParameters;
  /** Feature flags */
  featureFlags: FeatureFlags;
}

/**
 * Response type for GET /api/v1/config
 * Requirements: 10.1
 */
interface ConfigGetResponse extends SystemConfig {
  /** Configuration version for tracking changes */
  version: string;
  /** Last updated timestamp */
  lastUpdated: string;
}

/**
 * Response type for PUT /api/v1/config
 * Requirements: 10.2
 */
interface ConfigUpdateResponse {
  /** Updated configuration */
  config: SystemConfig;
  /** Fields that were updated */
  updatedFields: string[];
  /** Whether a restart is required for changes to take effect */
  restartRequired: boolean;
  /** Configuration version after update */
  version: string;
}

/**
 * In-memory configuration store
 * In production, this would be backed by a database or configuration service
 */
class ConfigStore {
  private config: SystemConfig;
  private version: number = 1;
  private lastUpdated: Date = new Date();

  constructor() {
    // Initialize with default configuration
    this.config = this.getDefaultConfig();
  }

  /**
   * Get default configuration values
   */
  private getDefaultConfig(): SystemConfig {
    return {
      cognitiveMode: "balanced",
      memoryLimits: {
        maxMemoriesPerUser: 100000,
        maxContentLength: 100000,
        maxBatchSize: 100,
        retentionDays: 0, // 0 = infinite retention
      },
      processingParameters: {
        embeddingDimension: 768,
        minSimilarityThreshold: 0.5,
        maxParallelStreams: 4,
        reasoningTimeoutMs: 30000,
        defaultRecallLimit: 10,
      },
      featureFlags: {
        parallelReasoningEnabled: true,
        emotionDetectionEnabled: true,
        biasDetectionEnabled: true,
        memoryConsolidationEnabled: true,
        waypointGraphEnabled: true,
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ConfigGetResponse {
    return {
      ...this.config,
      version: `v${this.version}`,
      lastUpdated: this.lastUpdated.toISOString(),
    };
  }

  /**
   * Update configuration with partial values
   * Returns the updated fields and whether restart is required
   */
  updateConfig(updates: Partial<SystemConfig>): {
    config: SystemConfig;
    updatedFields: string[];
    restartRequired: boolean;
    version: string;
  } {
    const updatedFields: string[] = [];
    let restartRequired = false;

    // Track which fields are being updated
    if (
      updates.cognitiveMode !== undefined &&
      updates.cognitiveMode !== this.config.cognitiveMode
    ) {
      this.config.cognitiveMode = updates.cognitiveMode;
      updatedFields.push("cognitiveMode");
    }

    if (updates.memoryLimits !== undefined) {
      const memoryUpdates = this.updateMemoryLimits(updates.memoryLimits);
      updatedFields.push(...memoryUpdates.fields);
      if (memoryUpdates.restartRequired) {
        restartRequired = true;
      }
    }

    if (updates.processingParameters !== undefined) {
      const processingUpdates = this.updateProcessingParameters(updates.processingParameters);
      updatedFields.push(...processingUpdates.fields);
      if (processingUpdates.restartRequired) {
        restartRequired = true;
      }
    }

    if (updates.featureFlags !== undefined) {
      const featureUpdates = this.updateFeatureFlags(updates.featureFlags);
      updatedFields.push(...featureUpdates.fields);
    }

    // Update version and timestamp if any changes were made
    if (updatedFields.length > 0) {
      this.version++;
      this.lastUpdated = new Date();
    }

    return {
      config: { ...this.config },
      updatedFields,
      restartRequired,
      version: `v${this.version}`,
    };
  }

  /**
   * Update memory limits
   */
  private updateMemoryLimits(updates: Partial<MemoryLimits>): {
    fields: string[];
    restartRequired: boolean;
  } {
    const fields: string[] = [];
    let restartRequired = false;

    if (
      updates.maxMemoriesPerUser !== undefined &&
      updates.maxMemoriesPerUser !== this.config.memoryLimits.maxMemoriesPerUser
    ) {
      this.config.memoryLimits.maxMemoriesPerUser = updates.maxMemoriesPerUser;
      fields.push("memoryLimits.maxMemoriesPerUser");
    }

    if (
      updates.maxContentLength !== undefined &&
      updates.maxContentLength !== this.config.memoryLimits.maxContentLength
    ) {
      this.config.memoryLimits.maxContentLength = updates.maxContentLength;
      fields.push("memoryLimits.maxContentLength");
    }

    if (
      updates.maxBatchSize !== undefined &&
      updates.maxBatchSize !== this.config.memoryLimits.maxBatchSize
    ) {
      this.config.memoryLimits.maxBatchSize = updates.maxBatchSize;
      fields.push("memoryLimits.maxBatchSize");
    }

    if (
      updates.retentionDays !== undefined &&
      updates.retentionDays !== this.config.memoryLimits.retentionDays
    ) {
      this.config.memoryLimits.retentionDays = updates.retentionDays;
      fields.push("memoryLimits.retentionDays");
      // Changing retention policy requires restart to apply to existing memories
      restartRequired = true;
    }

    return { fields, restartRequired };
  }

  /**
   * Update processing parameters
   */
  private updateProcessingParameters(updates: Partial<ProcessingParameters>): {
    fields: string[];
    restartRequired: boolean;
  } {
    const fields: string[] = [];
    let restartRequired = false;

    if (
      updates.embeddingDimension !== undefined &&
      updates.embeddingDimension !== this.config.processingParameters.embeddingDimension
    ) {
      this.config.processingParameters.embeddingDimension = updates.embeddingDimension;
      fields.push("processingParameters.embeddingDimension");
      // Changing embedding dimension requires restart and re-embedding
      restartRequired = true;
    }

    if (
      updates.minSimilarityThreshold !== undefined &&
      updates.minSimilarityThreshold !== this.config.processingParameters.minSimilarityThreshold
    ) {
      this.config.processingParameters.minSimilarityThreshold = updates.minSimilarityThreshold;
      fields.push("processingParameters.minSimilarityThreshold");
    }

    if (
      updates.maxParallelStreams !== undefined &&
      updates.maxParallelStreams !== this.config.processingParameters.maxParallelStreams
    ) {
      this.config.processingParameters.maxParallelStreams = updates.maxParallelStreams;
      fields.push("processingParameters.maxParallelStreams");
    }

    if (
      updates.reasoningTimeoutMs !== undefined &&
      updates.reasoningTimeoutMs !== this.config.processingParameters.reasoningTimeoutMs
    ) {
      this.config.processingParameters.reasoningTimeoutMs = updates.reasoningTimeoutMs;
      fields.push("processingParameters.reasoningTimeoutMs");
    }

    if (
      updates.defaultRecallLimit !== undefined &&
      updates.defaultRecallLimit !== this.config.processingParameters.defaultRecallLimit
    ) {
      this.config.processingParameters.defaultRecallLimit = updates.defaultRecallLimit;
      fields.push("processingParameters.defaultRecallLimit");
    }

    return { fields, restartRequired };
  }

  /**
   * Update feature flags
   */
  private updateFeatureFlags(updates: Partial<FeatureFlags>): {
    fields: string[];
    restartRequired: boolean;
  } {
    const fields: string[] = [];

    if (
      updates.parallelReasoningEnabled !== undefined &&
      updates.parallelReasoningEnabled !== this.config.featureFlags.parallelReasoningEnabled
    ) {
      this.config.featureFlags.parallelReasoningEnabled = updates.parallelReasoningEnabled;
      fields.push("featureFlags.parallelReasoningEnabled");
    }

    if (
      updates.emotionDetectionEnabled !== undefined &&
      updates.emotionDetectionEnabled !== this.config.featureFlags.emotionDetectionEnabled
    ) {
      this.config.featureFlags.emotionDetectionEnabled = updates.emotionDetectionEnabled;
      fields.push("featureFlags.emotionDetectionEnabled");
    }

    if (
      updates.biasDetectionEnabled !== undefined &&
      updates.biasDetectionEnabled !== this.config.featureFlags.biasDetectionEnabled
    ) {
      this.config.featureFlags.biasDetectionEnabled = updates.biasDetectionEnabled;
      fields.push("featureFlags.biasDetectionEnabled");
    }

    if (
      updates.memoryConsolidationEnabled !== undefined &&
      updates.memoryConsolidationEnabled !== this.config.featureFlags.memoryConsolidationEnabled
    ) {
      this.config.featureFlags.memoryConsolidationEnabled = updates.memoryConsolidationEnabled;
      fields.push("featureFlags.memoryConsolidationEnabled");
    }

    if (
      updates.waypointGraphEnabled !== undefined &&
      updates.waypointGraphEnabled !== this.config.featureFlags.waypointGraphEnabled
    ) {
      this.config.featureFlags.waypointGraphEnabled = updates.waypointGraphEnabled;
      fields.push("featureFlags.waypointGraphEnabled");
    }

    return { fields, restartRequired: false };
  }

  /**
   * Reset configuration to defaults (for testing)
   */
  resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.version = 1;
    this.lastUpdated = new Date();
  }
}

// Singleton config store instance
const configStore = new ConfigStore();

// Export for testing
export { configStore, ConfigStore };
export type {
  CognitiveMode,
  ConfigGetResponse,
  ConfigUpdateResponse,
  FeatureFlags,
  MemoryLimits,
  ProcessingParameters,
  SystemConfig,
};

/**
 * Zod schema for memory limits validation
 */
const memoryLimitsSchema = z.object({
  maxMemoriesPerUser: z
    .number()
    .int()
    .min(1, "maxMemoriesPerUser must be at least 1")
    .max(10000000, "maxMemoriesPerUser cannot exceed 10,000,000")
    .optional(),
  maxContentLength: z
    .number()
    .int()
    .min(10, "maxContentLength must be at least 10")
    .max(1000000, "maxContentLength cannot exceed 1,000,000")
    .optional(),
  maxBatchSize: z
    .number()
    .int()
    .min(1, "maxBatchSize must be at least 1")
    .max(1000, "maxBatchSize cannot exceed 1,000")
    .optional(),
  retentionDays: z
    .number()
    .int()
    .min(0, "retentionDays cannot be negative")
    .max(3650, "retentionDays cannot exceed 10 years (3650 days)")
    .optional(),
});

/**
 * Zod schema for processing parameters validation
 */
const processingParametersSchema = z.object({
  embeddingDimension: z
    .number()
    .int()
    .refine((val) => [384, 512, 768, 1024, 1536].includes(val), {
      message: "embeddingDimension must be one of: 384, 512, 768, 1024, 1536",
    })
    .optional(),
  minSimilarityThreshold: z
    .number()
    .min(0, "minSimilarityThreshold must be at least 0")
    .max(1, "minSimilarityThreshold cannot exceed 1")
    .optional(),
  maxParallelStreams: z
    .number()
    .int()
    .min(1, "maxParallelStreams must be at least 1")
    .max(8, "maxParallelStreams cannot exceed 8")
    .optional(),
  reasoningTimeoutMs: z
    .number()
    .int()
    .min(1000, "reasoningTimeoutMs must be at least 1000ms")
    .max(300000, "reasoningTimeoutMs cannot exceed 300,000ms (5 minutes)")
    .optional(),
  defaultRecallLimit: z
    .number()
    .int()
    .min(1, "defaultRecallLimit must be at least 1")
    .max(1000, "defaultRecallLimit cannot exceed 1,000")
    .optional(),
});

/**
 * Zod schema for feature flags validation
 */
const featureFlagsSchema = z.object({
  parallelReasoningEnabled: z.boolean().optional(),
  emotionDetectionEnabled: z.boolean().optional(),
  biasDetectionEnabled: z.boolean().optional(),
  memoryConsolidationEnabled: z.boolean().optional(),
  waypointGraphEnabled: z.boolean().optional(),
});

/**
 * Zod schema for config update request validation
 * Requirements: 10.2
 */
const configUpdateRequestSchema = z.object({
  cognitiveMode: z
    .enum(["balanced", "analytical", "creative", "intuitive", "deliberative"], {
      errorMap: () => ({
        message:
          "cognitiveMode must be one of: balanced, analytical, creative, intuitive, deliberative",
      }),
    })
    .optional(),
  memoryLimits: memoryLimitsSchema.optional(),
  processingParameters: processingParametersSchema.optional(),
  featureFlags: featureFlagsSchema.optional(),
});

/**
 * Handler for GET /api/v1/config
 * Requirements: 10.1
 *
 * Returns current cognitive mode, memory limits, processing parameters,
 * and enabled feature flags.
 */
function createConfigGetHandler(
  _cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    // Get current configuration
    const config = configStore.getConfig();

    res.status(200).json(buildSuccessResponse(config, { requestId, startTime }));
  });
}

/**
 * Handler for PUT /api/v1/config
 * Requirements: 10.2
 *
 * Updates configuration with partial values and indicates if restart is required.
 */
function createConfigUpdateHandler(
  _cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();

    // Validate request body
    const parseResult = configUpdateRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const updates = parseResult.data;

    // Check if any updates were provided
    if (Object.keys(updates).length === 0) {
      throw new ValidationApiError({
        request: "At least one configuration field must be provided for update",
      });
    }

    // Update configuration
    // Cast to Partial<SystemConfig> since Zod schema validates the structure
    const result = configStore.updateConfig(updates as Partial<SystemConfig>);

    // Build response
    const responseData: ConfigUpdateResponse = {
      config: result.config,
      updatedFields: result.updatedFields,
      restartRequired: result.restartRequired,
      version: result.version,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create config routes
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with config endpoints
 */
export function createConfigRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // GET /api/v1/config - Get current configuration
  // Requirements: 10.1
  router.get("/", createConfigGetHandler(cognitiveCore));

  // PUT /api/v1/config - Update configuration
  // Requirements: 10.2
  router.put("/", createConfigUpdateHandler(cognitiveCore));

  return router;
}
