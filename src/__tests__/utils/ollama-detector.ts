/**
 * Ollama Server Detection Utility
 *
 * Provides utilities to detect if Ollama server is running
 * and available for embedding generation.
 */

/**
 * Result of Ollama availability check
 */
export interface OllamaStatus {
  available: boolean;
  host: string;
  models?: string[];
  error?: string;
  latencyMs?: number;
}

/**
 * Default Ollama host
 */
export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

/**
 * Check if Ollama server is available
 *
 * @param host - Ollama host URL (defaults to OLLAMA_HOST env or localhost:11434)
 * @param timeoutMs - Timeout in milliseconds (default: 2000)
 * @returns Promise resolving to OllamaStatus
 */
export async function checkOllamaAvailability(
  host?: string,
  timeoutMs: number = 2000
): Promise<OllamaStatus> {
  const ollamaHost = host ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(`${ollamaHost}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        available: false,
        host: ollamaHost,
        error: `HTTP ${response.status}: ${response.statusText}`,
        latencyMs: Date.now() - startTime,
      };
    }

    const data = (await response.json()) as { models?: Array<{ name: string }> };
    const models = data.models?.map((m) => m.name) ?? [];

    return {
      available: true,
      host: ollamaHost,
      models,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.name === "AbortError"
          ? `Connection timeout after ${timeoutMs}ms`
          : error.message
        : String(error);

    return {
      available: false,
      host: ollamaHost,
      error: errorMessage,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Check if a specific model is available in Ollama
 *
 * @param modelName - Name of the model to check
 * @param host - Ollama host URL
 * @returns Promise resolving to boolean
 */
export async function isModelAvailable(modelName: string, host?: string): Promise<boolean> {
  const status = await checkOllamaAvailability(host);

  if (!status.available || !status.models) {
    return false;
  }

  // Check for exact match or partial match (e.g., "nomic-embed-text" matches "nomic-embed-text:latest")
  return status.models.some((m) => m === modelName || m.startsWith(`${modelName}:`));
}

/**
 * Cached Ollama availability status
 */
let cachedStatus: OllamaStatus | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Get cached Ollama availability status
 * Caches result for 30 seconds to avoid repeated network calls
 *
 * @param host - Ollama host URL
 * @param forceRefresh - Force refresh the cache
 * @returns Promise resolving to OllamaStatus
 */
export async function getCachedOllamaStatus(
  host?: string,
  forceRefresh: boolean = false
): Promise<OllamaStatus> {
  const now = Date.now();

  if (!forceRefresh && cachedStatus && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedStatus;
  }

  cachedStatus = await checkOllamaAvailability(host);
  cacheTimestamp = now;

  return cachedStatus;
}

/**
 * Clear the cached status (useful for testing)
 */
export function clearOllamaStatusCache(): void {
  cachedStatus = null;
  cacheTimestamp = 0;
}

/**
 * Check if we should use real Ollama or mock embeddings
 *
 * Decision logic:
 * 1. If USE_MOCK_EMBEDDINGS env is set to "true", always use mock
 * 2. If USE_REAL_OLLAMA env is set to "true", always try real Ollama
 * 3. Otherwise, check if Ollama is available and use it if so
 *
 * @param host - Ollama host URL
 * @returns Promise resolving to boolean (true = use real Ollama)
 */
export async function shouldUseRealOllama(host?: string): Promise<boolean> {
  // Explicit mock mode
  if (process.env.USE_MOCK_EMBEDDINGS === "true") {
    return false;
  }

  // Explicit real mode
  if (process.env.USE_REAL_OLLAMA === "true") {
    return true;
  }

  // Auto-detect
  const status = await getCachedOllamaStatus(host);
  return status.available;
}

/**
 * Get embedding model configuration based on availability
 *
 * @param preferredModel - Preferred model name
 * @param host - Ollama host URL
 * @returns Promise resolving to model configuration
 */
export async function getEmbeddingModelConfig(
  preferredModel: string = "nomic-embed-text",
  host?: string
): Promise<{
  useRealOllama: boolean;
  model: string;
  host: string;
  reason: string;
}> {
  const ollamaHost = host ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;

  // Check explicit overrides
  if (process.env.USE_MOCK_EMBEDDINGS === "true") {
    return {
      useRealOllama: false,
      model: preferredModel,
      host: ollamaHost,
      reason: "USE_MOCK_EMBEDDINGS=true",
    };
  }

  if (process.env.USE_REAL_OLLAMA === "true") {
    return {
      useRealOllama: true,
      model: preferredModel,
      host: ollamaHost,
      reason: "USE_REAL_OLLAMA=true",
    };
  }

  // Auto-detect
  const status = await getCachedOllamaStatus(ollamaHost);

  if (!status.available) {
    return {
      useRealOllama: false,
      model: preferredModel,
      host: ollamaHost,
      reason: `Ollama not available: ${status.error}`,
    };
  }

  // Check if preferred model is available
  const modelAvailable = await isModelAvailable(preferredModel, ollamaHost);

  if (!modelAvailable) {
    return {
      useRealOllama: false,
      model: preferredModel,
      host: ollamaHost,
      reason: `Model '${preferredModel}' not found in Ollama`,
    };
  }

  return {
    useRealOllama: true,
    model: preferredModel,
    host: ollamaHost,
    reason: "Ollama available with requested model",
  };
}
