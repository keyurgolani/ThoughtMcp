/**
 * Documentation Routes
 *
 * REST API endpoint for OpenAPI 3.0 specification.
 * Requirements: 14.1, 14.3
 */

import { Router, type Request, type Response } from "express";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/** Helper to extract request ID from request */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/** Supported API versions */
const SUPPORTED_VERSIONS = ["v1"];

/** Current API version */
const CURRENT_VERSION = "1.0.0";

/** OpenAPI 3.0 Schema object */
interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: (string | boolean)[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  default?: unknown;
  $ref?: string;
  allOf?: OpenApiSchema[];
}

/** OpenAPI 3.0 Parameter object */
interface OpenApiParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema: OpenApiSchema;
}

/** OpenAPI 3.0 Request Body object */
interface OpenApiRequestBody {
  required?: boolean;
  content: Record<string, { schema: OpenApiSchema }>;
}

/** OpenAPI 3.0 Response object */
interface OpenApiResponse {
  description?: string;
  $ref?: string;
  content?: Record<string, { schema: OpenApiSchema }>;
}

/** OpenAPI 3.0 Operation object */
interface OpenApiOperation {
  tags?: string[];
  summary: string;
  description?: string;
  operationId: string;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
}

/** OpenAPI 3.0 Path Item object */
interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  delete?: OpenApiOperation;
}

/** OpenAPI 3.0 Specification */
interface OpenApiSpec {
  openapi: string;
  info: { title: string; description: string; version: string };
  servers: Array<{ url: string; description?: string }>;
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, OpenApiPathItem>;
  components: {
    schemas?: Record<string, OpenApiSchema>;
    responses?: Record<string, OpenApiResponse>;
  };
}

/** Common schemas for API responses */
const commonSchemas: Record<string, OpenApiSchema> = {
  ApiSuccessResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", enum: [true] },
      data: { type: "object", description: "Response data payload" },
      metadata: { $ref: "#/components/schemas/ResponseMetadata" },
    },
    required: ["success", "data"],
  },
  ApiErrorResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", enum: [false] },
      error: { type: "string" },
      code: { type: "string" },
      suggestion: { type: "string" },
      details: { type: "object" },
    },
    required: ["success", "error", "code"],
  },
  ResponseMetadata: {
    type: "object",
    properties: {
      processingTime: { type: "number" },
      requestId: { type: "string" },
      timestamp: { type: "string", format: "date-time" },
    },
  },
};

/** Memory-related schemas */
const memorySchemas: Record<string, OpenApiSchema> = {
  MemorySector: {
    type: "string",
    enum: ["episodic", "semantic", "procedural", "emotional", "reflective"],
  },
  MemoryMetadata: {
    type: "object",
    properties: {
      keywords: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
      category: { type: "string" },
      importance: { type: "number", minimum: 0, maximum: 1 },
    },
  },
  MemoryStoreRequest: {
    type: "object",
    properties: {
      content: { type: "string", minLength: 10, maxLength: 100000 },
      userId: { type: "string" },
      sessionId: { type: "string" },
      primarySector: { $ref: "#/components/schemas/MemorySector" },
      metadata: { $ref: "#/components/schemas/MemoryMetadata" },
    },
    required: ["content", "userId", "sessionId", "primarySector"],
  },
};

/** Reasoning-related schemas */
const reasoningSchemas: Record<string, OpenApiSchema> = {
  ReasoningMode: {
    type: "string",
    enum: ["intuitive", "deliberative", "balanced", "creative", "analytical"],
  },
  ParallelStream: {
    type: "string",
    enum: ["analytical", "creative", "critical", "synthetic"],
  },
  ThinkRequest: {
    type: "object",
    properties: {
      problem: { type: "string", description: "Problem or question to reason about" },
      mode: { $ref: "#/components/schemas/ReasoningMode" },
      context: { type: "string" },
      userId: { type: "string" },
    },
    required: ["problem", "mode"],
  },
};

/** Other schemas */
const otherSchemas: Record<string, OpenApiSchema> = {
  HealthStatus: { type: "string", enum: ["healthy", "degraded", "unhealthy"] },
  DecompositionStrategy: {
    type: "string",
    enum: ["functional", "temporal", "stakeholder", "component"],
  },
  DiscreteEmotion: {
    type: "string",
    enum: [
      "joy",
      "sadness",
      "anger",
      "fear",
      "disgust",
      "surprise",
      "pride",
      "shame",
      "guilt",
      "gratitude",
      "awe",
    ],
  },
};

/** Common error responses */
const errorResponses: Record<string, OpenApiResponse> = {
  BadRequest: {
    description: "Invalid request parameters",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
  },
  NotFound: {
    description: "Resource not found",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
  },
  RateLimited: {
    description: "Rate limit exceeded",
    content: { "application/json": { schema: { $ref: "#/components/schemas/ApiErrorResponse" } } },
  },
};

/** Memory endpoint paths - data definition function */
// eslint-disable-next-line max-lines-per-function
function getMemoryPaths(): Record<string, OpenApiPathItem> {
  return {
    "/memory/store": {
      post: {
        tags: ["Memory"],
        summary: "Store a new memory",
        operationId: "storeMemory",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/MemoryStoreRequest" } },
          },
        },
        responses: {
          "201": { description: "Memory created successfully" },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/memory/recall": {
      post: {
        tags: ["Memory"],
        summary: "Recall memories",
        operationId: "recallMemories",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  userId: { type: "string" },
                  text: { type: "string" },
                  limit: { type: "integer", default: 10 },
                },
                required: ["userId"],
              },
            },
          },
        },
        responses: { "200": { description: "Memories retrieved" } },
      },
    },
    "/memory/update": {
      put: {
        tags: ["Memory"],
        summary: "Update a memory",
        operationId: "updateMemory",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { memoryId: { type: "string" }, userId: { type: "string" } },
                required: ["memoryId", "userId"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Memory updated" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/memory/{memoryId}": {
      delete: {
        tags: ["Memory"],
        summary: "Delete a memory",
        operationId: "deleteMemory",
        parameters: [
          { name: "memoryId", in: "path", required: true, schema: { type: "string" } },
          { name: "userId", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Memory deleted" } },
      },
    },
    "/memory/stats": {
      get: {
        tags: ["Memory"],
        summary: "Get memory statistics",
        operationId: "getMemoryStats",
        parameters: [{ name: "userId", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Statistics retrieved" } },
      },
    },
    "/memory/graph": {
      get: {
        tags: ["Memory"],
        summary: "Get memory graph",
        operationId: "getMemoryGraph",
        parameters: [
          { name: "userId", in: "query", required: true, schema: { type: "string" } },
          { name: "depth", in: "query", schema: { type: "integer", default: 2 } },
        ],
        responses: { "200": { description: "Graph retrieved" } },
      },
    },
    "/memory/timeline": {
      get: {
        tags: ["Memory"],
        summary: "Get memory timeline",
        operationId: "getMemoryTimeline",
        parameters: [{ name: "userId", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Timeline retrieved" } },
      },
    },
    "/memory/search": {
      post: {
        tags: ["Search"],
        summary: "Advanced memory search",
        operationId: "searchMemories",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { userId: { type: "string" }, text: { type: "string" } },
                required: ["userId"],
              },
            },
          },
        },
        responses: { "200": { description: "Search results" } },
      },
    },
  };
}

/** Batch endpoint paths */
function getBatchPaths(): Record<string, OpenApiPathItem> {
  return {
    "/memory/batch/store": {
      post: {
        tags: ["Batch"],
        summary: "Batch store memories",
        operationId: "batchStoreMemories",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { userId: { type: "string" }, memories: { type: "array" } },
                required: ["userId", "memories"],
              },
            },
          },
        },
        responses: { "200": { description: "Batch completed" } },
      },
    },
    "/memory/batch/recall": {
      post: {
        tags: ["Batch"],
        summary: "Batch recall memories",
        operationId: "batchRecallMemories",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { userId: { type: "string" }, memoryIds: { type: "array" } },
                required: ["userId", "memoryIds"],
              },
            },
          },
        },
        responses: { "200": { description: "Memories retrieved" } },
      },
    },
    "/memory/batch": {
      delete: {
        tags: ["Batch"],
        summary: "Batch delete memories",
        operationId: "batchDeleteMemories",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { userId: { type: "string" }, memoryIds: { type: "array" } },
                required: ["userId", "memoryIds"],
              },
            },
          },
        },
        responses: { "200": { description: "Batch deletion completed" } },
      },
    },
  };
}

/** Reasoning endpoint paths */
function getReasoningPaths(): Record<string, OpenApiPathItem> {
  return {
    "/think": {
      post: {
        tags: ["Reasoning"],
        summary: "Initiate thinking",
        operationId: "think",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ThinkRequest" } },
          },
        },
        responses: { "200": { description: "Thinking completed" } },
      },
    },
    "/think/status/{sessionId}": {
      get: {
        tags: ["Reasoning"],
        summary: "Get thinking status",
        operationId: "getThinkStatus",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Status retrieved" } },
      },
    },
    "/reasoning/parallel": {
      post: {
        tags: ["Reasoning"],
        summary: "Start parallel reasoning",
        operationId: "parallelReasoning",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { problem: { type: "string" }, streams: { type: "array" } },
                required: ["problem", "streams"],
              },
            },
          },
        },
        responses: { "200": { description: "Parallel reasoning completed" } },
      },
    },
    "/reasoning/parallel/{sessionId}/stream": {
      get: {
        tags: ["Reasoning"],
        summary: "Stream reasoning updates (SSE)",
        operationId: "streamReasoningUpdates",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "SSE stream established" } },
      },
    },
    "/reasoning/chain/{sessionId}": {
      get: {
        tags: ["Reasoning"],
        summary: "Get reasoning chain",
        operationId: "getReasoningChain",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Chain retrieved" } },
      },
    },
  };
}

/** Other endpoint paths (metacognition, problem, activity, emotion, session, config, health) - data definition function */
// eslint-disable-next-line max-lines-per-function
function getOtherPaths(): Record<string, OpenApiPathItem> {
  return {
    "/metacognition/analyze": {
      post: {
        tags: ["Metacognition"],
        summary: "Analyze reasoning quality",
        operationId: "analyzeReasoning",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reasoningChain: { type: "object" } },
                required: ["reasoningChain"],
              },
            },
          },
        },
        responses: { "200": { description: "Analysis completed" } },
      },
    },
    "/metacognition/biases": {
      get: {
        tags: ["Metacognition"],
        summary: "Get bias library",
        operationId: "getBiasLibrary",
        responses: { "200": { description: "Bias library retrieved" } },
      },
    },
    "/problem/decompose": {
      post: {
        tags: ["Problem"],
        summary: "Decompose problem",
        operationId: "decomposeProblem",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { problem: { type: "string" } },
                required: ["problem"],
              },
            },
          },
        },
        responses: { "200": { description: "Decomposition completed" } },
      },
    },
    "/problem/framework/select": {
      post: {
        tags: ["Problem"],
        summary: "Select framework",
        operationId: "selectFramework",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { problem: { type: "string" } },
                required: ["problem"],
              },
            },
          },
        },
        responses: { "200": { description: "Framework selected" } },
      },
    },
    "/activity/live": {
      get: {
        tags: ["Activity"],
        summary: "Live activity stream (WebSocket)",
        operationId: "liveActivity",
        responses: { "101": { description: "WebSocket connection established" } },
      },
    },
    "/activity/dashboard": {
      get: {
        tags: ["Activity"],
        summary: "Get dashboard metrics",
        operationId: "getDashboard",
        responses: { "200": { description: "Dashboard data retrieved" } },
      },
    },
    "/emotion/detect": {
      post: {
        tags: ["Emotion"],
        summary: "Detect emotions",
        operationId: "detectEmotion",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { text: { type: "string" } },
                required: ["text"],
              },
            },
          },
        },
        responses: { "200": { description: "Emotions detected" } },
      },
    },
    "/session/create": {
      post: {
        tags: ["Session"],
        summary: "Create session",
        operationId: "createSession",
        responses: { "201": { description: "Session created" } },
      },
    },
    "/session/{sessionId}": {
      get: {
        tags: ["Session"],
        summary: "Get session",
        operationId: "getSession",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Session retrieved" } },
      },
      delete: {
        tags: ["Session"],
        summary: "Delete session",
        operationId: "deleteSession",
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Session deleted" } },
      },
    },
    "/config": {
      get: {
        tags: ["Config"],
        summary: "Get configuration",
        operationId: "getConfig",
        responses: { "200": { description: "Configuration retrieved" } },
      },
      put: {
        tags: ["Config"],
        summary: "Update configuration",
        operationId: "updateConfig",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "200": { description: "Configuration updated" } },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Full health check",
        operationId: "getHealth",
        responses: {
          "200": { description: "System healthy" },
          "503": { description: "System unhealthy" },
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Health"],
        summary: "Readiness probe",
        operationId: "getReadiness",
        responses: {
          "200": { description: "System ready" },
          "503": { description: "System not ready" },
        },
      },
    },
    "/health/live": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        operationId: "getLiveness",
        responses: { "200": { description: "System alive" } },
      },
    },
    "/docs": {
      get: {
        tags: ["Docs"],
        summary: "Get API documentation",
        description: "Returns OpenAPI 3.0 specification describing all endpoints",
        operationId: "getDocs",
        responses: { "200": { description: "OpenAPI specification" } },
      },
    },
  };
}

/** Generate the OpenAPI 3.0 specification - Requirements: 14.1 */
function generateOpenApiSpec(): OpenApiSpec {
  return {
    openapi: "3.0.3",
    info: {
      title: "Thought REST API",
      description: "REST API for Thought cognitive architecture",
      version: CURRENT_VERSION,
    },
    servers: [{ url: "/api/v1", description: "API v1 (current)" }],
    tags: [
      { name: "Memory", description: "Memory CRUD operations" },
      { name: "Search", description: "Advanced memory search" },
      { name: "Batch", description: "Batch memory operations" },
      { name: "Reasoning", description: "Thinking and parallel reasoning" },
      { name: "Metacognition", description: "Reasoning quality analysis" },
      { name: "Problem", description: "Problem decomposition" },
      { name: "Activity", description: "Real-time activity monitoring" },
      { name: "Emotion", description: "Emotion detection" },
      { name: "Session", description: "Session management" },
      { name: "Config", description: "System configuration" },
      { name: "Health", description: "Health monitoring" },
      { name: "Docs", description: "API documentation" },
    ],
    paths: {
      ...getMemoryPaths(),
      ...getBatchPaths(),
      ...getReasoningPaths(),
      ...getOtherPaths(),
    },
    components: {
      schemas: { ...commonSchemas, ...memorySchemas, ...reasoningSchemas, ...otherSchemas },
      responses: errorResponses,
    },
  };
}

/** Pre-generated spec for performance */
const cachedSpec = generateOpenApiSpec();

/** Handler for GET /api/v1/docs - Requirements: 14.1 */
function createDocsHandler(): (
  req: Request,
  res: Response,
  next: import("express").NextFunction
) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = getRequestId(req);
    const startTime = Date.now();
    res.status(200).json(buildSuccessResponse(cachedSpec, { requestId, startTime }));
  });
}

/**
 * Create docs routes
 * Requirements: 14.1, 14.3
 *
 * @param _cognitiveCore - Shared cognitive core instance (unused but kept for consistency)
 * @returns Express router with docs endpoints
 */
export function createDocsRoutes(_cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // GET /api/v1/docs - OpenAPI specification
  // Requirements: 14.1
  router.get("/", createDocsHandler());

  return router;
}

/** Export for testing */
export {
  CURRENT_VERSION,
  generateOpenApiSpec,
  SUPPORTED_VERSIONS,
  type OpenApiOperation,
  type OpenApiParameter,
  type OpenApiPathItem,
  type OpenApiRequestBody,
  type OpenApiResponse,
  type OpenApiSchema,
  type OpenApiSpec,
};
