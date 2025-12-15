/**
 * ThoughtMCP REST API Client
 *
 * Provides typed methods for all ThoughtMCP REST API endpoints.
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
} from '../types/api';
import { ApiError, NetworkError, TimeoutError } from '../types/api';

// ============================================================================
// Client Configuration
// ============================================================================

export interface ThoughtMCPClientConfig {
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

const DEFAULT_CONFIG: Required<Omit<ThoughtMCPClientConfig, 'baseUrl' | 'headers'>> = {
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

  throw lastError ?? new Error('Retry failed');
}

// ============================================================================
// HTTP Request Helper
// ============================================================================

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
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
  if (baseUrl === '' || baseUrl === '/') {
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
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json') === true;

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
    throw new ApiError('Invalid response format', 'INVALID_RESPONSE', response.status);
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiError(
      json.error?.message ?? 'Request failed',
      json.error?.code ?? 'UNKNOWN_ERROR',
      response.status,
      json.error?.details
    );
  }

  return json.data as T;
}

// ============================================================================
// ThoughtMCP API Client
// ============================================================================

/**
 * ThoughtMCP REST API Client
 *
 * Provides typed methods for all ThoughtMCP REST API endpoints.
 * Requirements: 5.5, 16.2-16.6
 */
export class ThoughtMCPClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly headers: Record<string, string>;

  constructor(config: ThoughtMCPClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    this.maxRetries = config.maxRetries ?? DEFAULT_CONFIG.maxRetries;
    this.retryDelay = config.retryDelay ?? DEFAULT_CONFIG.retryDelay;
    this.headers = {
      'Content-Type': 'application/json',
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
            if (error.name === 'AbortError') {
              throw new TimeoutError(`Request to ${path} timed out after ${String(timeout)}ms`);
            }
            throw new NetworkError(`Network error: ${error.message}`, error);
          }

          throw new NetworkError('Unknown network error');
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
      method: 'POST',
      path: '/api/v1/memory/store',
      body: request,
    });
  }

  /**
   * Recall memories based on search criteria
   */
  async recallMemories(request: RecallMemoryRequest): Promise<RecallMemoryResponse> {
    return this.request<RecallMemoryResponse>({
      method: 'POST',
      path: '/api/v1/memory/recall',
      body: request,
    });
  }

  /**
   * Update an existing memory
   */
  async updateMemory(request: UpdateMemoryRequest): Promise<UpdateMemoryResponse> {
    return this.request<UpdateMemoryResponse>({
      method: 'PUT',
      path: '/api/v1/memory/update',
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
      method: 'DELETE',
      path: `/api/v1/memory/${memoryId}`,
      query: { userId, soft },
    });
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<MemoryStatsResponse> {
    return this.request<MemoryStatsResponse>({
      method: 'GET',
      path: '/api/v1/memory/stats',
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
      method: 'GET',
      path: '/api/v1/memory/graph',
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
      method: 'GET',
      path: '/api/v1/memory/timeline',
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
      method: 'POST',
      path: '/api/v1/memory/batch/store',
      body: request,
    });
  }

  /**
   * Recall multiple memories by ID
   */
  async batchRecallMemories(request: BatchRecallRequest): Promise<BatchRecallResponse> {
    return this.request<BatchRecallResponse>({
      method: 'POST',
      path: '/api/v1/memory/batch/recall',
      body: request,
    });
  }

  /**
   * Delete multiple memories
   */
  async batchDeleteMemories(request: BatchDeleteRequest): Promise<BatchDeleteResponse> {
    return this.request<BatchDeleteResponse>({
      method: 'POST',
      path: '/api/v1/memory/batch/delete',
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
      method: 'POST',
      path: '/api/v1/memory/search',
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
    const rawResponse = await this.request<ThinkResponse>({
      method: 'POST',
      path: '/api/v1/think',
      body: request,
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
      mode: rawResponse.modeUsed as unknown as import('../types/api').ReasoningMode,
    };
  }

  /**
   * Perform parallel reasoning with all modes.
   * Includes proper error handling and response transformation.
   */
  async thinkParallel(request: ParallelThinkRequest): Promise<ParallelThinkResponse> {
    const { transformParallelResponse, createEmptyParallelResponse } = await import('../types/api');

    try {
      const timeout = request.timeout ?? 60000;
      const coordinationStrategy = request.coordinationStrategy ?? 'consensus';
      const serverResponse = await this.request<import('../types/api').ServerParallelResponse>({
        method: 'POST',
        path: '/api/v1/reasoning/parallel',
        body: {
          problem: request.problem,
          streams: request.streams,
          userId: request.userId,
          timeout,
          context: request.context,
          coordinationStrategy,
        },
        timeout,
      });

      // Transform server response to UI-friendly format
      return transformParallelResponse(serverResponse);
    } catch (error) {
      console.error('Parallel reasoning failed:', error);
      return createEmptyParallelResponse(error instanceof Error ? error.message : 'Unknown error');
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
    const { transformFrameworkSelectResponse } = await import('../types/api');
    const serverResponse = await this.request<import('../types/api').ServerFrameworkSelectResponse>(
      {
        method: 'POST',
        path: '/api/v1/problem/framework/select',
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
   * Alias for analyze() that returns just the framework selection.
   */
  async selectFramework(problem: string): Promise<import('../types/api').FrameworkSelectResponse> {
    return this.request<import('../types/api').FrameworkSelectResponse>({
      method: 'POST',
      path: '/api/v1/problem/framework/select',
      body: { problem },
      timeout: 30000,
    });
  }

  // ==========================================================================
  // Problem Decomposition (Requirements: 16.4)
  // ==========================================================================

  /**
   * Decompose problem into sub-problems.
   * Includes proper error handling to prevent UI crashes.
   */
  async decompose(request: DecomposeRequest): Promise<DecomposeResponse> {
    const { transformDecomposeResponse, createEmptyDecomposeResponse } =
      await import('../types/api');

    try {
      const maxDepth = request.maxDepth ?? 3;
      const strategy = request.strategy ?? 'recursive';
      const serverResponse = await this.request<import('../types/api').ServerDecomposeResponse>({
        method: 'POST',
        path: '/api/v1/problem/decompose',
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
      console.error('Problem decomposition failed:', error);
      return createEmptyDecomposeResponse(
        request.problem,
        error instanceof Error ? error.message : 'Unknown error'
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
   */
  async analyzeMetacognition(request: {
    reasoningChain: string;
    context?: string;
  }): Promise<import('../types/api').MetacognitionAnalyzeResponse> {
    const { transformMetacognitionResponse } = await import('../types/api');
    const serverResponse = await this.request<import('../types/api').ServerMetacognitionResponse>({
      method: 'POST',
      path: '/api/v1/metacognition/analyze',
      body: request,
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
   */
  async detectEmotion(request: DetectEmotionRequest): Promise<DetectEmotionResponse> {
    const { createEmptyEmotionResponse } = await import('../types/api');

    try {
      // Validate input
      if (request.text.trim().length === 0) {
        return createEmptyEmotionResponse('Empty text provided');
      }

      const includeDiscrete = request.includeDiscrete ?? true;
      const response = await this.request<DetectEmotionResponse>({
        method: 'POST',
        path: '/api/v1/emotion/detect',
        body: {
          text: request.text,
          includeDiscrete,
          context: request.context,
        },
      });

      return response;
    } catch (error) {
      console.error('Emotion detection failed:', error);
      return createEmptyEmotionResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Evaluate reasoning quality
   */
  async evaluate(request: EvaluateRequest): Promise<EvaluateResponse> {
    return this.request<EvaluateResponse>({
      method: 'POST',
      path: '/api/v1/metacognition/evaluate',
      body: request,
    });
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ThoughtMCP API client
 */
export function createThoughtMCPClient(config: ThoughtMCPClientConfig): ThoughtMCPClient {
  return new ThoughtMCPClient(config);
}

// ============================================================================
// Default Client Instance
// ============================================================================

let defaultClient: ThoughtMCPClient | null = null;

/**
 * Get or create the default API client
 */
export function getDefaultClient(): ThoughtMCPClient {
  if (defaultClient === null) {
    const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
    // Use empty string for relative URLs in development (Vite proxy handles /api)
    // In production, use the environment variable or default to localhost:3000
    const baseUrl = envBaseUrl ?? (import.meta.env.DEV ? '' : 'http://localhost:3000');
    defaultClient = createThoughtMCPClient({ baseUrl });
  }
  return defaultClient;
}

/**
 * Set the default API client
 */
export function setDefaultClient(client: ThoughtMCPClient): void {
  defaultClient = client;
}
