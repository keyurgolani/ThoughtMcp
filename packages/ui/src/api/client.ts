/**
 * Thought REST API Client
 *
 * Provides typed methods for all Thought REST API endpoints.
 * Includes error handling, retry logic, and request/response type definitions.
 *
 * Requirements: 5.5, 16.2-16.6
 */

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ApiResponse,
  AssessConfidenceRequest,
  AssessConfidenceResponse,
  BatchDeleteRequest,
  BatchDeleteResponse,
  BatchRecallRequest,
  BatchRecallResponse,
  BatchStoreRequest,
  BatchStoreResponse,
  DecomposeRequest,
  DecomposeResponse,
  DeleteMemoryResponse,
  DetectBiasRequest,
  DetectBiasResponse,
  DetectEmotionRequest,
  DetectEmotionResponse,
  EvaluateRequest,
  EvaluateResponse,
  GraphResponse,
  MemorySectorType,
  MemoryStatsResponse,
  ParallelThinkAsyncResponse,
  ParallelThinkRequest,
  ParallelThinkResponse,
  RecallMemoryRequest,
  RecallMemoryResponse,
  SearchRequest,
  SearchResponse,
  StoreMemoryRequest,
  StoreMemoryResponse,
  ThinkRequest,
  ThinkResponse,
  TimelineResponse,
  UpdateMemoryRequest,
  UpdateMemoryResponse,
} from "../types/api";
import { ApiError, MAX_MEMORY_RECALL_LIMIT, NetworkError, TimeoutError } from "../types/api";

// ============================================================================
// Demo ID Detection
// ============================================================================

/**
 * Prefix used for demo/mock memory IDs when API is not available
 */
export const DEMO_ID_PREFIX = "mem-";

/**
 * UUID v4 regex pattern for validating real memory IDs
 * Real memory IDs are UUIDs like: 550e8400-e29b-41d4-a716-446655440000
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a memory ID is a valid UUID (not a demo ID like 'mem-1')
 * @param id - The memory ID to validate
 * @returns true if the ID is a valid UUID, false if it's a demo ID
 */
export function isValidMemoryId(id: string): boolean {
  // Demo IDs start with 'mem-' prefix
  if (id.startsWith(DEMO_ID_PREFIX)) {
    return false;
  }
  // Valid IDs must match UUID format
  return UUID_PATTERN.test(id);
}

/**
 * Check if a memory ID is a demo ID
 * @param id - The memory ID to check
 * @returns true if the ID is a demo ID (starts with 'mem-')
 */
export function isDemoMemoryId(id: string): boolean {
  return id.startsWith(DEMO_ID_PREFIX);
}

// ============================================================================
// Client Configuration
// ============================================================================

export interface ThoughtClientConfig {
  /** Base URL for the API (e.g., 'http://localhost:3000') */
  baseUrl: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Custom headers to include in all requests */
  headers?: Record<string, string>;
}

const DEFAULT_CONFIG: Required<Omit<ThoughtClientConfig, "baseUrl" | "headers">> = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

// ============================================================================
// Retry Logic
// ============================================================================

interface RetryOptions {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
function defaultShouldRetry(error: Error, attempt: number): boolean {
  if (attempt >= 3) return false;

  // Retry on network errors
  if (error instanceof NetworkError) return true;

  // Retry on timeout errors
  if (error instanceof TimeoutError) return true;

  // Retry on server errors (5xx)
  if (error instanceof ApiError && error.status >= 500) return true;

  return false;
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries, retryDelay, shouldRetry = defaultShouldRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Exponential backoff with jitter
      const delay = retryDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Retry failed");
}

// ============================================================================
// HTTP Request Helper
// ============================================================================

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

/**
 * Build URL with query parameters
 */
function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  // Handle relative URLs (empty baseUrl) for development with Vite proxy
  let url: URL;
  if (baseUrl === "" || baseUrl === "/") {
    // Use window.location.origin for relative URLs
    url = new URL(path, window.location.origin);
  } else {
    url = new URL(path, baseUrl);
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Parse API response and handle errors
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json") === true;

  if (!response.ok) {
    let errorData: { code?: string; message?: string; details?: Record<string, string> } = {};

    if (isJson) {
      try {
        const json = (await response.json()) as ApiResponse<unknown>;
        errorData = json.error ?? {};
      } catch {
        // Ignore JSON parse errors for error responses
      }
    }

    throw new ApiError(
      errorData.message ?? `HTTP ${String(response.status)}: ${response.statusText}`,
      errorData.code ?? `HTTP_${String(response.status)}`,
      response.status,
      errorData.details
    );
  }

  if (!isJson) {
    throw new ApiError("Invalid response format", "INVALID_RESPONSE", response.status);
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiError(
      json.error?.message ?? "Request failed",
      json.error?.code ?? "UNKNOWN_ERROR",
      response.status,
      json.error?.details
    );
  }

  return json.data as T;
}

// ============================================================================
// Thought API Client
// ============================================================================

/**
 * Thought REST API Client
 *
 * Provides typed methods for all Thought REST API endpoints.
 * Requirements: 5.5, 16.2-16.6
 */
export class ThoughtClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly headers: Record<string, string>;

  constructor(config: ThoughtClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this.maxRetries = config.maxRetries ?? DEFAULT_CONFIG.maxRetries;
    this.retryDelay = config.retryDelay ?? DEFAULT_CONFIG.retryDelay;
    this.headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body, query, timeout = this.timeout } = options;
    const url = buildUrl(this.baseUrl, path, query);

    return withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, timeout);

        try {
          const fetchOptions: RequestInit = {
            method,
            headers: this.headers,
            signal: controller.signal,
          };

          if (body !== undefined) {
            fetchOptions.body = JSON.stringify(body);
          }

          const response = await fetch(url, fetchOptions);

          return await parseResponse<T>(response);
        } catch (error) {
          if (error instanceof ApiError) {
            throw error;
          }

          if (error instanceof Error) {
            if (error.name === "AbortError") {
              throw new TimeoutError(`Request to ${path} timed out after ${String(timeout)}ms`);
            }
            throw new NetworkError(`Network error: ${error.message}`, error);
          }

          throw new NetworkError("Unknown network error");
        } finally {
          clearTimeout(timeoutId);
        }
      },
      {
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
      }
    );
  }

  // ==========================================================================
  // Memory Operations (Requirements: 5.5)
  // ==========================================================================

  /**
   * Store a new memory
   */
  async storeMemory(request: StoreMemoryRequest): Promise<StoreMemoryResponse> {
    return this.request<StoreMemoryResponse>({
      method: "POST",
      path: "/api/v1/memory/store",
      body: request,
    });
  }

  /**
   * Recall memories based on search criteria.
   * Note: The server enforces a maximum limit of 100 memories per request.
   * Any limit value exceeding MAX_MEMORY_RECALL_LIMIT (100) will be capped.
   *
   * @param request - The recall request parameters
   * @param forceRefresh - If true, bypasses server-side cache for fresh results
   */
  async recallMemories(
    request: RecallMemoryRequest,
    forceRefresh: boolean = false
  ): Promise<RecallMemoryResponse> {
    // Cap the limit to the server-side maximum constraint
    const cappedRequest: RecallMemoryRequest = { ...request };
    if (request.limit !== undefined) {
      cappedRequest.limit = Math.min(request.limit, MAX_MEMORY_RECALL_LIMIT);
    }

    const requestOptions: RequestOptions = {
      method: "POST",
      path: "/api/v1/memory/recall",
      body: cappedRequest,
    };

    if (forceRefresh) {
      requestOptions.query = { forceRefresh: "true" };
    }

    return this.request<RecallMemoryResponse>(requestOptions);
  }

  /**
   * Update an existing memory
   * @throws ApiError with code 'DEMO_MEMORY_UPDATE' if attempting to update a demo memory
   */
  async updateMemory(request: UpdateMemoryRequest): Promise<UpdateMemoryResponse> {
    // Validate that the memory ID is not a demo ID
    if (isDemoMemoryId(request.memoryId)) {
      throw new ApiError(
        "Cannot update demo memories. Demo data is read-only and used for demonstration purposes when the API is unavailable.",
        "DEMO_MEMORY_UPDATE",
        400,
        { memoryId: request.memoryId }
      );
    }

    // Validate that the memory ID is a valid UUID format
    if (!isValidMemoryId(request.memoryId)) {
      throw new ApiError(
        "Invalid memory ID format. Expected a valid UUID.",
        "INVALID_MEMORY_ID",
        400,
        { memoryId: request.memoryId }
      );
    }

    return this.request<UpdateMemoryResponse>({
      method: "PUT",
      path: "/api/v1/memory/update",
      body: request,
    });
  }

  /**
   * Delete a memory
   */
  async deleteMemory(
    memoryId: string,
    userId: string,
    soft: boolean = false
  ): Promise<DeleteMemoryResponse> {
    return this.request<DeleteMemoryResponse>({
      method: "DELETE",
      path: `/api/v1/memory/${memoryId}`,
      query: { userId, soft },
    });
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<MemoryStatsResponse> {
    return this.request<MemoryStatsResponse>({
      method: "GET",
      path: "/api/v1/memory/stats",
      query: { userId },
    });
  }

  /**
   * Get memory graph data
   */
  async getMemoryGraph(
    userId: string,
    options?: {
      centerMemoryId?: string;
      depth?: number;
      typeFilter?: MemorySectorType;
    }
  ): Promise<GraphResponse> {
    return this.request<GraphResponse>({
      method: "GET",
      path: "/api/v1/memory/graph",
      query: {
        userId,
        center_memory_id: options?.centerMemoryId,
        depth: options?.depth,
        type: options?.typeFilter,
      },
    });
  }

  /**
   * Get memory timeline
   */
  async getMemoryTimeline(
    userId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      minValence?: number;
      maxValence?: number;
      minArousal?: number;
      maxArousal?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<TimelineResponse> {
    return this.request<TimelineResponse>({
      method: "GET",
      path: "/api/v1/memory/timeline",
      query: {
        userId,
        start_date: options?.startDate,
        end_date: options?.endDate,
        min_valence: options?.minValence,
        max_valence: options?.maxValence,
        min_arousal: options?.minArousal,
        max_arousal: options?.maxArousal,
        limit: options?.limit,
        offset: options?.offset,
      },
    });
  }

  // ==========================================================================
  // Batch Operations
  // ==========================================================================

  /**
   * Store multiple memories in a batch
   */
  async batchStoreMemories(request: BatchStoreRequest): Promise<BatchStoreResponse> {
    return this.request<BatchStoreResponse>({
      method: "POST",
      path: "/api/v1/memory/batch/store",
      body: request,
    });
  }

  /**
   * Recall multiple memories by ID
   */
  async batchRecallMemories(request: BatchRecallRequest): Promise<BatchRecallResponse> {
    return this.request<BatchRecallResponse>({
      method: "POST",
      path: "/api/v1/memory/batch/recall",
      body: request,
    });
  }

  /**
   * Delete multiple memories
   */
  async batchDeleteMemories(request: BatchDeleteRequest): Promise<BatchDeleteResponse> {
    return this.request<BatchDeleteResponse>({
      method: "POST",
      path: "/api/v1/memory/batch/delete",
      body: request,
    });
  }

  // ==========================================================================
  // Search Operations
  // ==========================================================================

  /**
   * Advanced search with boolean operators
   */
  async searchMemories(request: SearchRequest): Promise<SearchResponse> {
    return this.request<SearchResponse>({
      method: "POST",
      path: "/api/v1/memory/search",
      body: request,
    });
  }

  // ==========================================================================
  // Reasoning Operations (Requirements: 16.2)
  // ==========================================================================

  /**
   * Perform reasoning with specified mode
   */
  async think(request: ThinkRequest): Promise<ThinkResponse> {
    // Transform request to match server's expected format
    // Server expects 'problem' and 'context' as strings
    const serverRequest = {
      problem: request.input,
      mode: request.mode,
      userId: request.userId,
      context: request.context, // Server expects context as a plain string
    };

    const rawResponse = await this.request<ThinkResponse>({
      method: "POST",
      path: "/api/v1/think",
      body: serverRequest,
      timeout: 60000, // Reasoning can take longer
    });

    // Transform server response to include legacy fields for backward compatibility
    const insights = rawResponse.thoughts.map((t) => t.content);
    return {
      ...rawResponse,
      // Legacy fields for UI components that expect old format
      analysis: rawResponse.conclusion,
      insights,
      biases: [], // Server doesn't return biases in think response
      mode: rawResponse.modeUsed as unknown as import("../types/api").ReasoningMode,
    };
  }

  /**
   * Perform parallel reasoning with all modes.
   * Includes proper error handling and response transformation.
   */
  async thinkParallel(
    request: ParallelThinkRequest
  ): Promise<ParallelThinkResponse | ParallelThinkAsyncResponse> {
    const { transformParallelResponse, createEmptyParallelResponse } = await import("../types/api");

    try {
      const timeout = request.timeout ?? 60000;
      const coordinationStrategy = request.coordinationStrategy ?? "consensus";

      const serverResponse = await this.request<
        | import("../types/api").ServerParallelResponse
        | import("../types/api").ParallelThinkAsyncResponse
      >({
        method: "POST",
        path: "/api/v1/reasoning/parallel",
        body: {
          problem: request.problem,
          streams: request.streams,
          userId: request.userId,
          timeout,
          context: request.context,
          coordinationStrategy,
          async: request.async,
        },
        timeout,
      });

      // Handle async response
      if ("status" in serverResponse) {
        return serverResponse;
      }

      // Transform server response to UI-friendly format
      return transformParallelResponse(serverResponse);
    } catch (error) {
      console.error("Parallel reasoning failed:", error);
      return createEmptyParallelResponse(error instanceof Error ? error.message : "Unknown error");
    }
  }

  // ==========================================================================
  // Framework Analysis (Requirements: 16.3)
  // ==========================================================================

  /**
   * Select and analyze problem using systematic thinking framework.
   *
   * Note: There is NO /api/v1/problem/analyze endpoint.
   * Use /api/v1/problem/framework/select for framework recommendation.
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const { transformFrameworkSelectResponse } = await import("../types/api");
    const serverResponse = await this.request<import("../types/api").ServerFrameworkSelectResponse>(
      {
        method: "POST",
        path: "/api/v1/problem/framework/select",
        body: {
          problem: request.problem,
          preferredFramework: request.preferredFramework,
          context: request.context,
        },
        timeout: 60000,
      }
    );
    return transformFrameworkSelectResponse(serverResponse, request.problem);
  }

  /**
   * Get framework recommendation for a problem.
   * Transforms server response to UI-friendly format with steps and interpretation.
   */
  async selectFramework(problem: string): Promise<import("../types/api").FrameworkSelectResponse> {
    const { transformToFrameworkSelectResponse } = await import("../types/api");
    const serverResponse = await this.request<import("../types/api").ServerFrameworkSelectResponse>(
      {
        method: "POST",
        path: "/api/v1/problem/framework/select",
        body: { problem },
        timeout: 30000,
      }
    );
    return transformToFrameworkSelectResponse(serverResponse);
  }

  // ==========================================================================
  // Problem Decomposition (Requirements: 16.4)
  // ==========================================================================

  /**
   * Decompose problem into sub-problems.
   * Includes proper error handling to prevent UI crashes.
   *
   * Valid strategies: 'functional', 'temporal', 'stakeholder', 'component'
   * Default strategy is 'functional' (most general-purpose).
   */
  async decompose(request: DecomposeRequest): Promise<DecomposeResponse> {
    const { transformDecomposeResponse, createEmptyDecomposeResponse } =
      await import("../types/api");

    try {
      const maxDepth = request.maxDepth ?? 3;
      const strategy = request.strategy ?? "functional";
      const serverResponse = await this.request<import("../types/api").ServerDecomposeResponse>({
        method: "POST",
        path: "/api/v1/problem/decompose",
        body: {
          problem: request.problem,
          maxDepth,
          userId: request.userId,
          context: request.context,
          strategy,
        },
        timeout: 60000,
      });

      return transformDecomposeResponse(serverResponse);
    } catch (error) {
      // Return empty response on error to prevent UI crashes
      console.error("Problem decomposition failed:", error);
      return createEmptyDecomposeResponse(
        request.problem,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // ==========================================================================
  // Metacognition Operations (Requirements: 16.5, 16.6)
  // ==========================================================================

  /**
   * Analyze reasoning using the unified metacognition endpoint.
   * This is the primary endpoint that returns both confidence and bias data.
   *
   * Note: There is NO separate /api/v1/metacognition/confidence or /api/v1/metacognition/bias endpoint.
   * Use this method and extract the relevant fields from the response.
   *
   * The server expects reasoningChain as an object with a steps array, not a string.
   * This method transforms the string input into the required object format.
   *
   * The reasoning text is parsed to extract multiple steps if possible,
   * providing richer data for bias detection and confidence assessment.
   */
  async analyzeMetacognition(request: {
    reasoningChain: string;
    context?: string;
  }): Promise<import("../types/api").MetacognitionAnalyzeResponse> {
    const { transformMetacognitionResponse } = await import("../types/api");

    // Parse the reasoning text into multiple steps for better analysis
    // Split by common delimiters: numbered lists, bullet points, sentences
    const reasoningText = request.reasoningChain.trim();
    const steps: Array<{
      id: string;
      content: string;
      type: "hypothesis" | "evidence" | "inference" | "conclusion" | "assumption";
      confidence?: number;
      evidence?: string[];
    }> = [];

    // Try to split by numbered items (1. 2. 3. or 1) 2) 3))
    const numberedPattern = /(?:^|\n)\s*(?:\d+[.)]\s*)/;
    const bulletPattern = /(?:^|\n)\s*[-•*]\s*/;

    let parts: string[];
    if (numberedPattern.test(reasoningText)) {
      parts = reasoningText.split(/\n\s*\d+[.)]\s*/).filter((p) => p.trim().length > 0);
    } else if (bulletPattern.test(reasoningText)) {
      parts = reasoningText.split(/\n\s*[-•*]\s*/).filter((p) => p.trim().length > 0);
    } else {
      // Split by sentences, keeping meaningful chunks
      parts = reasoningText.split(/(?<=[.!?])\s+/).filter((p) => p.trim().length > 10);
      // If still just one part, use the whole text
      if (parts.length <= 1) {
        parts = [reasoningText];
      }
    }

    // Create steps from parsed parts
    parts.forEach((part, index) => {
      const content = part.trim();
      if (content.length === 0) return;

      // Determine step type based on content and position
      // Valid types: hypothesis, evidence, inference, conclusion, assumption
      let type: "hypothesis" | "evidence" | "inference" | "conclusion" | "assumption" = "inference";
      const lowerContent = content.toLowerCase();

      if (
        index === 0 ||
        lowerContent.includes("hypothesis") ||
        lowerContent.includes("propose") ||
        lowerContent.includes("suggest that")
      ) {
        type = "hypothesis";
      } else if (
        index === parts.length - 1 ||
        lowerContent.includes("therefore") ||
        lowerContent.includes("thus") ||
        lowerContent.includes("conclude")
      ) {
        type = "conclusion";
      } else if (
        lowerContent.includes("evidence") ||
        lowerContent.includes("data shows") ||
        lowerContent.includes("research") ||
        lowerContent.includes("study") ||
        lowerContent.includes("findings")
      ) {
        type = "evidence";
      } else if (
        lowerContent.includes("assume") ||
        lowerContent.includes("assuming") ||
        lowerContent.includes("if we") ||
        lowerContent.includes("given that") ||
        lowerContent.includes("suppose")
      ) {
        type = "assumption";
      }

      steps.push({
        id: `step-${String(index + 1)}`,
        content,
        type,
        confidence: 0.5 + Math.random() * 0.3, // Slight variation for more realistic analysis
      });
    });

    // Ensure at least one step
    if (steps.length === 0) {
      steps.push({
        id: "step-1",
        content: reasoningText,
        type: "inference",
        confidence: 0.5,
      });
    }

    // Extract potential evidence from the text
    const evidencePatterns = [
      /(?:evidence|data|research|study|studies|findings?|results?)\s*(?:shows?|indicates?|suggests?|demonstrates?)[:\s]+([^.!?]+[.!?])/gi,
      /(?:according to|based on)\s+([^,]+)/gi,
    ];
    const evidence: string[] = [];
    for (const pattern of evidencePatterns) {
      const matches = reasoningText.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          evidence.push(match[1].trim());
        }
      }
    }

    // Build the reasoning chain object
    const reasoningChainObject = {
      steps,
      evidence,
      assumptions: [] as Array<{
        id: string;
        content: string;
        explicit: boolean;
        confidence?: number;
      }>,
      inferences: steps
        .filter((s) => s.type === "inference")
        .map((s, i) => ({
          id: `inference-${String(i + 1)}`,
          content: s.content,
          premises: steps.filter((p) => p.type === "hypothesis").map((p) => p.id),
          confidence: s.confidence,
          type: "inductive" as const,
        })),
    };

    const serverResponse = await this.request<import("../types/api").ServerMetacognitionResponse>({
      method: "POST",
      path: "/api/v1/metacognition/analyze",
      body: {
        reasoningChain: reasoningChainObject,
        context: request.context,
      },
    });
    return transformMetacognitionResponse(serverResponse);
  }

  /**
   * Assess confidence in reasoning.
   * Uses the unified /api/v1/metacognition/analyze endpoint and extracts confidence data.
   */
  async assessConfidence(request: AssessConfidenceRequest): Promise<AssessConfidenceResponse> {
    const analyzeRequest: { reasoningChain: string; context?: string } = {
      reasoningChain: request.reasoning,
    };
    if (request.context !== undefined) {
      analyzeRequest.context = request.context;
    }
    const response = await this.analyzeMetacognition(analyzeRequest);
    return response.confidence;
  }

  /**
   * Detect cognitive biases in reasoning.
   * Uses the unified /api/v1/metacognition/analyze endpoint and extracts bias data.
   */
  async detectBias(request: DetectBiasRequest): Promise<DetectBiasResponse> {
    const analyzeRequest: { reasoningChain: string; context?: string } = {
      reasoningChain: request.reasoning,
    };
    if (request.context !== undefined) {
      analyzeRequest.context = request.context;
    }
    const response = await this.analyzeMetacognition(analyzeRequest);
    return response.biases;
  }

  /**
   * Detect emotions in text.
   * Includes proper error handling to prevent UI crashes.
   * Transforms server response to UI-friendly format.
   */
  async detectEmotion(request: DetectEmotionRequest): Promise<DetectEmotionResponse> {
    const { createEmptyEmotionResponse, transformEmotionResponse } = await import("../types/api");
    type ServerEmotionDetectResponse = import("../types/api").ServerEmotionDetectResponse;

    try {
      // Validate input
      if (request.text.trim().length === 0) {
        return createEmptyEmotionResponse("Empty text provided");
      }

      const includeDiscrete = request.includeDiscrete ?? true;
      const startTime = Date.now();

      const serverResponse = await this.request<ServerEmotionDetectResponse>({
        method: "POST",
        path: "/api/v1/emotion/detect",
        body: {
          text: request.text,
          includeDiscrete,
          context: request.context,
        },
      });

      const processingTimeMs = Date.now() - startTime;

      // Transform server response to UI-friendly format
      return transformEmotionResponse(serverResponse, processingTimeMs);
    } catch (error) {
      console.error("Emotion detection failed:", error);
      return createEmptyEmotionResponse(error instanceof Error ? error.message : "Unknown error");
    }
  }

  /**
   * Evaluate reasoning quality
   */
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    return this.request<EvaluateResponse>({
      method: "POST",
      path: "/api/v1/metacognition/evaluate",
      body: request,
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new Thought API client
 */
export function createThoughtClient(config: ThoughtClientConfig): ThoughtClient {
  return new ThoughtClient(config);
}

// ============================================================================
// Default Client Instance
// ============================================================================

let defaultClient: ThoughtClient | null = null;

/**
 * Get or create the default API client
 */
export function getDefaultClient(): ThoughtClient {
  if (defaultClient === null) {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    // Use empty string for relative URLs - works in both development and production:
    // - Development: Vite proxy handles /api requests
    // - Production: nginx proxy handles /api requests to backend server
    const baseUrl = envBaseUrl ?? "";
    defaultClient = createThoughtClient({ baseUrl });
  }
  return defaultClient;
}

/**
 * Set the default API client
 */
export function setDefaultClient(client: ThoughtClient): void {
  defaultClient = client;
}
