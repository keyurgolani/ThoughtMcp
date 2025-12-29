/**
 * Request Deduplication Module
 *
 * Provides request deduplication to prevent duplicate API requests for the same data.
 * When multiple components request the same data simultaneously, only one network
 * request is made and the result is shared among all callers.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Represents an in-flight request being tracked for deduplication
 */
export interface InFlightRequest<T> {
  /** The promise that will resolve with the request result */
  promise: Promise<T>;
  /** Timestamp when the request was initiated */
  timestamp: number;
}

/**
 * Options for the RequestDeduplicator
 */
export interface RequestDeduplicatorOptions {
  /** Maximum age in milliseconds for cached in-flight requests (default: 30000) */
  maxAge?: number;
}

// ============================================================================
// Request Key Generation
// ============================================================================

/**
 * Generate a deduplication key from endpoint and parameters.
 * The key is a deterministic string that uniquely identifies a request.
 *
 * @param endpoint - The API endpoint path
 * @param params - The request parameters (query params or body)
 * @returns A unique string key for the request
 *
 * Requirements: 5.2
 */
export function generateRequestKey(endpoint: string, params: Record<string, unknown> = {}): string {
  // Sort keys for deterministic ordering
  const sortedParams = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        const value = params[key];
        // Only include defined values
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>
    );

  // Create a stable JSON string representation
  const paramsString = JSON.stringify(sortedParams);

  return `${endpoint}:${paramsString}`;
}

// ============================================================================
// RequestDeduplicator Class
// ============================================================================

/**
 * RequestDeduplicator tracks in-flight requests and shares promises for duplicate requests.
 *
 * When multiple callers request the same data simultaneously:
 * 1. The first caller triggers the actual network request
 * 2. Subsequent callers receive the same promise
 * 3. All callers receive the same result (or error)
 * 4. The cache is cleared when the request completes
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export class RequestDeduplicator {
  /** Map of in-flight requests by key */
  private inFlightRequests: Map<string, InFlightRequest<unknown>> = new Map();

  /** Maximum age for cached requests in milliseconds */
  private readonly maxAge: number;

  constructor(options: RequestDeduplicatorOptions = {}) {
    this.maxAge = options.maxAge ?? 30000;
  }

  /**
   * Get or create a request for the given key.
   *
   * If a request with the same key is already in-flight, returns the existing promise.
   * Otherwise, creates a new request using the factory function.
   *
   * @param key - The deduplication key (use generateRequestKey to create)
   * @param factory - Function that creates the actual request promise
   * @returns Promise that resolves with the request result
   *
   * Requirements: 5.1, 5.2, 5.3
   */
  getOrCreate<T>(key: string, factory: () => Promise<T>): Promise<T> {
    // Check for existing in-flight request
    const existing = this.inFlightRequests.get(key) as InFlightRequest<T> | undefined;

    if (existing) {
      // Check if the existing request is still valid (not too old)
      const age = Date.now() - existing.timestamp;
      if (age < this.maxAge) {
        // Return the existing promise - all callers share the same result
        return existing.promise;
      }
      // Request is too old, remove it and create a new one
      this.inFlightRequests.delete(key);
    }

    // Create new request
    const promise = this.createTrackedRequest(key, factory);

    // Store the in-flight request
    this.inFlightRequests.set(key, {
      promise: promise as Promise<unknown>,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Force a new request, bypassing deduplication.
   *
   * This is useful for force refresh scenarios where the caller explicitly
   * wants fresh data regardless of any in-flight requests.
   *
   * @param key - The deduplication key
   * @param factory - Function that creates the actual request promise
   * @returns Promise that resolves with the request result
   *
   * Requirements: 5.6
   */
  forceNew<T>(key: string, factory: () => Promise<T>): Promise<T> {
    // Clear any existing request for this key
    this.inFlightRequests.delete(key);

    // Create new request
    const promise = this.createTrackedRequest(key, factory);

    // Store the in-flight request
    this.inFlightRequests.set(key, {
      promise: promise as Promise<unknown>,
      timestamp: Date.now(),
    });

    return promise;
  }

  /**
   * Clear a completed request from the cache.
   *
   * This is called automatically when requests complete, but can also be
   * called manually to force cache invalidation.
   *
   * @param key - The deduplication key to clear
   *
   * Requirements: 5.5
   */
  clear(key: string): void {
    this.inFlightRequests.delete(key);
  }

  /**
   * Clear all cached requests.
   *
   * Useful for cleanup or when the user context changes.
   */
  clearAll(): void {
    this.inFlightRequests.clear();
  }

  /**
   * Get the number of in-flight requests.
   *
   * Useful for debugging and monitoring.
   */
  getInFlightCount(): number {
    return this.inFlightRequests.size;
  }

  /**
   * Check if a request is currently in-flight.
   *
   * @param key - The deduplication key to check
   * @returns true if a request with this key is in-flight
   */
  isInFlight(key: string): boolean {
    const existing = this.inFlightRequests.get(key);
    if (!existing) {
      return false;
    }
    // Check if still valid
    const age = Date.now() - existing.timestamp;
    if (age >= this.maxAge) {
      this.inFlightRequests.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Create a tracked request that clears itself from the cache on completion.
   *
   * @param key - The deduplication key
   * @param factory - Function that creates the actual request promise
   * @returns Promise that resolves with the request result
   *
   * Requirements: 5.4, 5.5
   */
  private createTrackedRequest<T>(key: string, factory: () => Promise<T>): Promise<T> {
    // Create the actual request
    const requestPromise = factory();

    // Wrap the promise to clear cache on completion (success or failure)
    return requestPromise
      .then((result) => {
        // Clear from cache on success
        this.clear(key);
        return result;
      })
      .catch((error: unknown) => {
        // Clear from cache on failure - all waiting callers receive the same error
        this.clear(key);
        throw error;
      });
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default RequestDeduplicator instance for the application.
 * Use this for most cases to ensure consistent deduplication across components.
 */
let defaultDeduplicator: RequestDeduplicator | null = null;

/**
 * Get the default RequestDeduplicator instance.
 * Creates one if it doesn't exist.
 */
export function getDefaultDeduplicator(): RequestDeduplicator {
  if (!defaultDeduplicator) {
    defaultDeduplicator = new RequestDeduplicator();
  }
  return defaultDeduplicator;
}

/**
 * Set the default RequestDeduplicator instance.
 * Useful for testing or custom configuration.
 */
export function setDefaultDeduplicator(deduplicator: RequestDeduplicator | null): void {
  defaultDeduplicator = deduplicator;
}

/**
 * Create a new RequestDeduplicator instance.
 * Use this when you need a separate deduplication context.
 */
export function createRequestDeduplicator(
  options?: RequestDeduplicatorOptions
): RequestDeduplicator {
  return new RequestDeduplicator(options);
}
