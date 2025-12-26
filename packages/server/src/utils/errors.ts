/**
 * Error Handling Module
 *
 * Comprehensive error hierarchy for Thought cognitive architecture
 * with support for error context, recovery strategies, and user-friendly messaging.
 */

/**
 * Error codes for different error types
 */
export const ErrorCodes = {
  // Database errors
  DB_CONNECTION_FAILED: "DB_CONNECTION_FAILED",
  DB_TRANSACTION_FAILED: "DB_TRANSACTION_FAILED",
  DB_QUERY_TIMEOUT: "DB_QUERY_TIMEOUT",
  DB_QUERY_FAILED: "DB_QUERY_FAILED",

  // Embedding errors
  EMBEDDING_TIMEOUT: "EMBEDDING_TIMEOUT",
  EMBEDDING_MODEL_UNAVAILABLE: "EMBEDDING_MODEL_UNAVAILABLE",
  EMBEDDING_GENERATION_FAILED: "EMBEDDING_GENERATION_FAILED",

  // Reasoning errors
  REASONING_FRAMEWORK_FAILED: "REASONING_FRAMEWORK_FAILED",
  REASONING_STREAM_TIMEOUT: "REASONING_STREAM_TIMEOUT",
  REASONING_SYNTHESIS_FAILED: "REASONING_SYNTHESIS_FAILED",

  // Validation errors
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_INPUT: "INVALID_INPUT",
  CONSTRAINT_VIOLATION: "CONSTRAINT_VIOLATION",

  // General errors
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
  OPERATION_FAILED: "OPERATION_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Context information for errors
 */
export interface ErrorContext {
  /** Component where error occurred */
  component?: string;
  /** Operation being performed */
  operation?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** User ID if applicable */
  userId?: string;
  /** Session ID if applicable */
  sessionId?: string;
}

/**
 * Base error class for all cognitive architecture errors
 */
export class CognitiveError extends Error {
  /** Error code for categorization */
  public readonly code: ErrorCode;
  /** Context information */
  public readonly context: ErrorContext;
  /** Whether error is recoverable */
  public readonly recoverable: boolean;
  /** Timestamp when error occurred */
  public readonly timestamp: Date;

  constructor(message: string, code: ErrorCode, context: ErrorContext = {}, recoverable = false) {
    super(message);
    this.name = "CognitiveError";
    this.code = code;
    this.context = context;
    this.recoverable = recoverable;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serialize error to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      recoverable: this.recoverable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    return this.message;
  }
}

/**
 * Database error options
 */
export interface DatabaseErrorOptions {
  message: string;
  code: ErrorCode;
  context?: ErrorContext;
  recoverable?: boolean;
  query?: string;
  params?: unknown[];
}

/**
 * Database-related errors
 */
export class DatabaseError extends CognitiveError {
  /** SQL query that failed (if applicable) */
  public readonly query?: string;
  /** Query parameters (if applicable) */
  public readonly params?: unknown[];

  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    recoverable = true,
    query?: string,
    params?: unknown[]
  ) {
    super(message, code, context, recoverable);
    this.name = "DatabaseError";
    this.query = query;
    this.params = params;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      query: this.query,
      params: this.params,
    };
  }

  getUserMessage(): string {
    if (this.code === ErrorCodes.DB_CONNECTION_FAILED) {
      return "Unable to connect to the database. Please try again in a moment.";
    }
    if (this.code === ErrorCodes.DB_QUERY_TIMEOUT) {
      return "The operation took too long. Please try again with a simpler query.";
    }
    if (this.code === ErrorCodes.DB_TRANSACTION_FAILED) {
      return "The operation could not be completed. Please try again.";
    }
    return "A database error occurred. Please try again.";
  }
}

/**
 * Embedding error options
 */
export interface EmbeddingErrorOptions {
  message: string;
  code: ErrorCode;
  model: string;
  inputLength: number;
  context?: ErrorContext;
  recoverable?: boolean;
}

/**
 * Embedding generation errors
 */
export class EmbeddingError extends CognitiveError {
  /** Model name that failed */
  public readonly model: string;
  /** Input length that caused the error */
  public readonly inputLength: number;

  constructor(
    message: string,
    code: ErrorCode,
    model: string,
    inputLength: number,
    context: ErrorContext = {},
    recoverable = true
  ) {
    super(message, code, context, recoverable);
    this.name = "EmbeddingError";
    this.model = model;
    this.inputLength = inputLength;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      model: this.model,
      inputLength: this.inputLength,
    };
  }

  getUserMessage(): string {
    if (this.code === ErrorCodes.EMBEDDING_TIMEOUT) {
      return "Embedding generation took too long. Using cached results.";
    }
    if (this.code === ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE) {
      return "The embedding model is temporarily unavailable. Trying an alternative.";
    }
    return "An error occurred while generating embeddings. Please try again.";
  }
}

/**
 * Reasoning error options
 */
export interface ReasoningErrorOptions {
  message: string;
  code: ErrorCode;
  context?: ErrorContext;
  recoverable?: boolean;
  framework?: string;
  step?: string;
}

/**
 * Reasoning and framework errors
 */
export class ReasoningError extends CognitiveError {
  /** Framework that failed (if applicable) */
  public readonly framework?: string;
  /** Step in reasoning process that failed */
  public readonly step?: string;

  constructor(
    message: string,
    code: ErrorCode,
    context: ErrorContext = {},
    recoverable = true,
    framework?: string,
    step?: string
  ) {
    super(message, code, context, recoverable);
    this.name = "ReasoningError";
    this.framework = framework;
    this.step = step;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      framework: this.framework,
      step: this.step,
    };
  }

  getUserMessage(): string {
    if (this.code === ErrorCodes.REASONING_FRAMEWORK_FAILED) {
      return `The ${this.framework ?? "reasoning"} framework encountered an issue. Trying a simpler approach.`;
    }
    if (this.code === ErrorCodes.REASONING_STREAM_TIMEOUT) {
      return "Reasoning took longer than expected. Continuing with partial results.";
    }
    return "An error occurred during reasoning. Please try again.";
  }
}

/**
 * Validation errors
 */
export class ValidationError extends CognitiveError {
  /** Field that failed validation */
  public readonly field: string;
  /** Value that was invalid */
  public readonly value: unknown;
  /** Constraint that was violated */
  public readonly constraint: string;

  constructor(
    message: string,
    field: string,
    value: unknown,
    constraint: string,
    context: ErrorContext = {}
  ) {
    super(message, ErrorCodes.VALIDATION_FAILED, context, false);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
    this.constraint = constraint;
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
      constraint: this.constraint,
    };
  }

  getUserMessage(): string {
    return `Invalid ${this.field}: ${this.constraint}`;
  }
}

/**
 * Helper function to create database connection errors
 */
export function createConnectionError(message: string, context: ErrorContext = {}): DatabaseError {
  return new DatabaseError(message, ErrorCodes.DB_CONNECTION_FAILED, context, true);
}

/**
 * Helper function to create database transaction errors
 */
export function createTransactionError(
  message: string,
  context: ErrorContext = {},
  query?: string,
  params?: unknown[]
): DatabaseError {
  return new DatabaseError(message, ErrorCodes.DB_TRANSACTION_FAILED, context, true, query, params);
}

/**
 * Helper function to create query timeout errors
 */
export function createQueryTimeoutError(
  message: string,
  context: ErrorContext = {},
  query?: string
): DatabaseError {
  return new DatabaseError(message, ErrorCodes.DB_QUERY_TIMEOUT, context, true, query);
}

/**
 * Helper function to create embedding timeout errors
 */
export function createEmbeddingTimeoutError(
  message: string,
  model: string,
  inputLength: number,
  context: ErrorContext = {}
): EmbeddingError {
  return new EmbeddingError(message, ErrorCodes.EMBEDDING_TIMEOUT, model, inputLength, context);
}

/**
 * Helper function to create model unavailable errors
 */
export function createModelUnavailableError(
  message: string,
  model: string,
  inputLength: number,
  context: ErrorContext = {}
): EmbeddingError {
  return new EmbeddingError(
    message,
    ErrorCodes.EMBEDDING_MODEL_UNAVAILABLE,
    model,
    inputLength,
    context
  );
}

/**
 * Helper function to create framework failure errors
 */
export function createFrameworkFailureError(
  message: string,
  framework: string,
  context: ErrorContext = {}
): ReasoningError {
  return new ReasoningError(
    message,
    ErrorCodes.REASONING_FRAMEWORK_FAILED,
    context,
    true,
    framework
  );
}

/**
 * Helper function to create stream timeout errors
 */
export function createStreamTimeoutError(
  message: string,
  context: ErrorContext = {},
  step?: string
): ReasoningError {
  return new ReasoningError(
    message,
    ErrorCodes.REASONING_STREAM_TIMEOUT,
    context,
    true,
    undefined,
    step
  );
}

/**
 * Helper function to create validation errors
 */
export function createValidationError(
  field: string,
  value: unknown,
  constraint: string,
  context: ErrorContext = {}
): ValidationError {
  return new ValidationError(
    `Validation failed for ${field}: ${constraint}`,
    field,
    value,
    constraint,
    context
  );
}
