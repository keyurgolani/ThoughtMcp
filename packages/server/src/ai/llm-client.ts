import { z } from "zod";
import { Logger } from "../utils/logger.js";

/**
 * Default inference model configuration
 * Uses environment variables with sensible defaults for local deployment
 * Requirements: 14.1, 14.5, 14.7
 */
export const DEFAULT_LLM_CONFIG = {
  /** Default model - small, efficient model suitable for local deployment */
  modelName: "llama3.2:1b",
  /** Default timeout in milliseconds - accounts for cold starts (model loading) */
  timeout: 60000,
  /** Default temperature for generation (0.0-1.0) */
  temperature: 0.7,
} as const;

export interface LLMConfig {
  host: string;
  modelName: string;
  timeout?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Status of the inference model
 * Requirements: 15.1
 */
export interface InferenceModelStatus {
  available: boolean;
  modelName: string;
  lastChecked: Date;
  averageLatencyMs: number;
  errorCount: number;
  error?: string;
}

/**
 * Client for interacting with Ollama GenAI (Generation) API
 * Distinct from Embeddings client - this handles Text Generation and Reasoning
 *
 * Configuration via environment variables:
 * - LLM_MODEL: Model name (default: llama3.2:1b)
 * - LLM_TIMEOUT: Request timeout in ms (default: 30000)
 * - LLM_TEMPERATURE: Generation temperature 0.0-1.0 (default: 0.7)
 * - OLLAMA_HOST: Ollama API URL (default: http://localhost:11434)
 *
 * Requirements: 14.1, 14.5, 14.7
 */
export class LLMClient {
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly timeout: number;
  private readonly temperature: number;

  /** Track model status for health checks */
  private modelStatus: InferenceModelStatus;

  constructor(configOverride?: Partial<LLMConfig>) {
    this.baseUrl = configOverride?.host ?? process.env.OLLAMA_HOST ?? "http://localhost:11434";
    this.modelName =
      configOverride?.modelName ?? process.env.LLM_MODEL ?? DEFAULT_LLM_CONFIG.modelName;
    this.timeout =
      configOverride?.timeout ??
      (process.env.LLM_TIMEOUT
        ? parseInt(process.env.LLM_TIMEOUT, 10)
        : DEFAULT_LLM_CONFIG.timeout);
    this.temperature =
      configOverride?.temperature ??
      (process.env.LLM_TEMPERATURE
        ? parseFloat(process.env.LLM_TEMPERATURE)
        : DEFAULT_LLM_CONFIG.temperature);

    // Initialize model status
    this.modelStatus = {
      available: false,
      modelName: this.modelName,
      lastChecked: new Date(0), // Never checked
      averageLatencyMs: 0,
      errorCount: 0,
    };
  }

  /**
   * Get the configured model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Get the configured temperature
   */
  getTemperature(): number {
    return this.temperature;
  }

  /**
   * Get the configured timeout
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Get the current model status for health checks
   * Requirements: 15.1
   */
  getModelStatus(): InferenceModelStatus {
    return { ...this.modelStatus };
  }

  /**
   * Check if the inference model is available
   * Makes a request to Ollama to verify the model is loaded and responding
   * Requirements: 14.1, 15.1
   */
  async checkModelAvailability(): Promise<InferenceModelStatus> {
    const startTime = Date.now();

    try {
      // First check if Ollama is responding
      const tagsResponse = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!tagsResponse.ok) {
        this.modelStatus = {
          available: false,
          modelName: this.modelName,
          lastChecked: new Date(),
          averageLatencyMs: Date.now() - startTime,
          errorCount: this.modelStatus.errorCount + 1,
          error: `Ollama API error: ${tagsResponse.statusText}`,
        };
        Logger.warn("LLM Model Availability Check Failed", {
          model: this.modelName,
          error: this.modelStatus.error,
        });
        return this.modelStatus;
      }

      const data = (await tagsResponse.json()) as { models?: Array<{ name: string }> };
      const models = data.models ?? [];

      // Check if our specific model is available
      const modelAvailable = models.some(
        (m) => m.name === this.modelName || m.name === `${this.modelName}:latest`
      );

      if (!modelAvailable) {
        this.modelStatus = {
          available: false,
          modelName: this.modelName,
          lastChecked: new Date(),
          averageLatencyMs: Date.now() - startTime,
          errorCount: this.modelStatus.errorCount + 1,
          error: `Model ${this.modelName} not found. Available models: ${models.map((m) => m.name).join(", ")}`,
        };
        Logger.warn("LLM Model Not Available", {
          model: this.modelName,
          availableModels: models.map((m) => m.name),
        });
        return this.modelStatus;
      }

      // Model is available
      const latency = Date.now() - startTime;
      this.modelStatus = {
        available: true,
        modelName: this.modelName,
        lastChecked: new Date(),
        averageLatencyMs:
          this.modelStatus.averageLatencyMs > 0
            ? (this.modelStatus.averageLatencyMs + latency) / 2
            : latency,
        errorCount: 0, // Reset error count on success
      };

      Logger.info("LLM Model Available", {
        model: this.modelName,
        latencyMs: latency,
      });

      return this.modelStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.modelStatus = {
        available: false,
        modelName: this.modelName,
        lastChecked: new Date(),
        averageLatencyMs: Date.now() - startTime,
        errorCount: this.modelStatus.errorCount + 1,
        error: errorMessage,
      };

      Logger.warn("LLM Model Availability Check Failed", {
        model: this.modelName,
        error: errorMessage,
      });

      return this.modelStatus;
    }
  }

  /**
   * Check if the model is currently available (based on last check)
   * Does not make a network request - use checkModelAvailability() for that
   */
  isModelAvailable(): boolean {
    return this.modelStatus.available;
  }

  /**
   * Generate text from a prompt
   */
  async generate(prompt: string, system?: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          system,
          stream: false,
          options: {
            temperature: this.temperature,
          },
        }),
      });

      if (!response.ok) {
        this.modelStatus.errorCount++;
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { response: string };

      // Update latency tracking
      const latency = Date.now() - startTime;
      this.modelStatus.averageLatencyMs =
        this.modelStatus.averageLatencyMs > 0
          ? (this.modelStatus.averageLatencyMs + latency) / 2
          : latency;

      // Log warning if latency exceeds threshold (5 seconds)
      if (latency > 5000) {
        Logger.warn("LLM Generation High Latency", {
          model: this.modelName,
          latencyMs: latency,
          threshold: 5000,
        });
      }

      return data.response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        Logger.error("LLM Generation Timed Out", `Timeout after ${this.timeout}ms`);
        this.modelStatus.errorCount++;
        throw new Error(`LLM generation timed out after ${this.timeout}ms`);
      }
      Logger.error("LLM Generation Failed", error instanceof Error ? error.message : String(error));
      this.modelStatus.errorCount++;
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Chat completion with JSON Schema enforcement
   * @param messages Conversation history
   * @param schema Optional Zod schema to enforce valid JSON output
   */
  async chat<T>(messages: ChatMessage[], schema?: z.ZodSchema<T>): Promise<T | string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const startTime = Date.now();

    try {
      // If schema provided, append enforcement instruction to system prompt
      const finalMessages = [...messages];

      // Note: Actual schema binding logic will belong in PromptBinder,
      // but here we ensure the request asks for JSON mode if needed.
      const format = schema ? "json" : undefined;

      // Use lower temperature for structured output
      const chatTemperature = schema ? Math.min(this.temperature, 0.2) : this.temperature;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelName,
          messages: finalMessages,
          stream: false,
          format, // Force JSON mode if schema exists
          options: {
            temperature: chatTemperature,
          },
        }),
      });

      if (!response.ok) {
        this.modelStatus.errorCount++;
        throw new Error(`Ollama Chat API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { message: { content: string } };
      const content = data.message.content;

      // Update latency tracking
      const latency = Date.now() - startTime;
      this.modelStatus.averageLatencyMs =
        this.modelStatus.averageLatencyMs > 0
          ? (this.modelStatus.averageLatencyMs + latency) / 2
          : latency;

      // Log warning if latency exceeds threshold (5 seconds)
      if (latency > 5000) {
        Logger.warn("LLM Chat High Latency", {
          model: this.modelName,
          latencyMs: latency,
          threshold: 5000,
        });
      }

      if (schema) {
        try {
          // Repair and clean the response before parsing
          const repairedContent = this.repairJsonResponse(content);
          const parsed = JSON.parse(repairedContent);
          // @ts-ignore - schema.parse supports unknown
          return schema.parse(parsed);
        } catch (validationError) {
          Logger.error("LLM Output Validation Failed", { content, error: String(validationError) });
          throw new Error(`LLM failed to generate valid JSON: ${String(validationError)}`);
        }
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        Logger.error("LLM Chat Timed Out", `Timeout after ${this.timeout}ms`);
        this.modelStatus.errorCount++;
        throw new Error(`LLM chat timed out after ${this.timeout}ms`);
      }
      Logger.error("LLM Chat Failed", error instanceof Error ? error.message : String(error));
      this.modelStatus.errorCount++;
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  /**
   * Stream chat completion
   * @param messages Conversation history
   * @param onChunk Callback for each token/chunk received
   * @param schema Optional Zod schema (only used for final prompt instruction, not validation during stream)
   */
  async streamChat<T>(
    messages: ChatMessage[],
    onChunk: (content: string) => void,
    schema?: z.ZodSchema<T>
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const startTime = Date.now();

    try {
      const response = await this.makeStreamRequest(messages, controller.signal, schema);
      const fullContent = await this.processStreamResponse(response, onChunk);
      this.updateLatencyMetrics(startTime, "LLM Streaming High Latency");
      return fullContent;
    } catch (error) {
      this.handleStreamError(error);
      throw error; // Re-throw after handling
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Make the streaming request to Ollama
   */
  private async makeStreamRequest<T>(
    messages: ChatMessage[],
    signal: AbortSignal,
    schema?: z.ZodSchema<T>
  ): Promise<Response> {
    const format = schema ? "json" : undefined;
    const chatTemperature = schema ? Math.min(this.temperature, 0.2) : this.temperature;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: this.modelName,
        messages: [...messages],
        stream: true,
        format,
        options: { temperature: chatTemperature },
      }),
    });

    if (!response.ok) {
      this.modelStatus.errorCount++;
      throw new Error(`Ollama Chat API error: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    return response;
  }

  /**
   * Process the streaming response and accumulate content
   */
  private async processStreamResponse(
    response: Response,
    onChunk: (content: string) => void
  ): Promise<string> {
    if (!response.body) {
      throw new Error("Response body is null");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        const result = this.processStreamLine(line, onChunk);
        if (result.content) {
          fullContent += result.content;
        }
        if (result.done) {
          return fullContent;
        }
      }
    }

    return fullContent;
  }

  /**
   * Update latency metrics and log warnings if threshold exceeded
   */
  private updateLatencyMetrics(startTime: number, warningMessage: string): void {
    const latency = Date.now() - startTime;
    this.modelStatus.averageLatencyMs =
      this.modelStatus.averageLatencyMs > 0
        ? (this.modelStatus.averageLatencyMs + latency) / 2
        : latency;

    if (latency > 5000) {
      Logger.warn(warningMessage, {
        model: this.modelName,
        latencyMs: latency,
        threshold: 5000,
      });
    }
  }

  /**
   * Handle streaming errors with appropriate logging
   */
  private handleStreamError(error: unknown): never {
    if (error instanceof Error && error.name === "AbortError") {
      Logger.error("LLM Streaming Failed", `Timeout after ${this.timeout}ms`);
      this.modelStatus.errorCount++;
      throw new Error(`LLM streaming timed out after ${this.timeout}ms`);
    }
    Logger.error("LLM Streaming Failed", error instanceof Error ? error.message : String(error));
    this.modelStatus.errorCount++;
    throw error;
  }

  /**
   * Repair malformed JSON responses from LLMs
   * Handles common issues like markdown code blocks, schema echoing, and formatting problems
   *
   * @param content - Raw LLM response content
   * @returns Cleaned JSON string ready for parsing
   */
  private repairJsonResponse(content: string): string {
    let cleaned = content;

    // Step 1: Remove markdown code blocks (common LLM quirk)
    cleaned = cleaned
      .replace(/```json\n?/gi, "")
      .replace(/\n?```/g, "")
      .trim();

    // Step 2: Remove any leading/trailing whitespace and newlines
    cleaned = cleaned.trim();

    // Step 3: Handle schema echoing - if model echoed the schema structure
    if (cleaned.includes('"$ref"') || cleaned.includes('"definitions"')) {
      cleaned = this.extractDataFromSchemaEcho(cleaned);
    }

    // Step 4: Fix common JSON issues
    cleaned = this.fixCommonJsonIssues(cleaned);

    // Step 5: If still not valid JSON, try to extract JSON object
    if (!this.isValidJson(cleaned)) {
      const extracted = this.extractJsonObject(cleaned);
      if (extracted) {
        cleaned = extracted;
      }
    }

    return cleaned;
  }

  /**
   * Extract actual data from a response where the model echoed the schema
   *
   * @param content - Content with schema echoing
   * @returns Extracted data or original content
   */
  private extractDataFromSchemaEcho(content: string): string {
    try {
      const parsed = JSON.parse(content);

      // If it has $ref and definitions, try to extract actual data
      if (parsed.$ref && parsed.definitions) {
        const extractedData = this.extractFromDefinitions(parsed.definitions);
        if (extractedData) {
          return JSON.stringify(extractedData);
        }
      }

      // If we can't extract, return original
      return content;
    } catch {
      return content;
    }
  }

  /**
   * Extract data from schema definitions
   *
   * @param definitions - Schema definitions object
   * @returns Extracted data or null
   */
  private extractFromDefinitions(
    definitions: Record<string, unknown>
  ): Record<string, unknown> | null {
    for (const key of Object.keys(definitions)) {
      const def = definitions[key] as Record<string, unknown>;
      if (def.properties) {
        const extractedData = this.extractDataFromProperties(
          def.properties as Record<string, unknown>
        );
        if (Object.keys(extractedData).length > 0) {
          return extractedData;
        }
      }
    }
    return null;
  }

  /**
   * Extract data from schema properties
   *
   * @param properties - Properties object from schema
   * @returns Extracted data object
   */
  private extractDataFromProperties(properties: Record<string, unknown>): Record<string, unknown> {
    const extractedData: Record<string, unknown> = {};

    for (const [propKey, propValue] of Object.entries(properties)) {
      const prop = propValue as Record<string, unknown>;
      // If the property value is an array with actual content, extract it
      if (Array.isArray(prop)) {
        extractedData[propKey] = prop;
      } else if (prop && typeof prop === "object" && !("type" in prop)) {
        // If it's an object without 'type' field, it might be actual data
        extractedData[propKey] = prop;
      }
    }

    return extractedData;
  }

  /**
   * Fix common JSON formatting issues
   *
   * @param content - JSON string with potential issues
   * @returns Fixed JSON string
   */
  private fixCommonJsonIssues(content: string): string {
    let fixed = content;

    // Remove trailing commas before closing brackets/braces
    fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

    // Fix unquoted property names (simple cases)
    fixed = fixed.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

    // Remove any BOM or invisible characters at the start
    fixed = fixed.replace(/^\uFEFF/, "");

    // Handle escaped newlines that shouldn't be escaped
    fixed = fixed.replace(/\\n/g, " ");

    return fixed;
  }

  /**
   * Check if a string is valid JSON
   *
   * @param str - String to check
   * @returns True if valid JSON
   */
  private isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Try to extract a JSON object from a string that may contain extra content
   *
   * @param content - String potentially containing JSON
   * @returns Extracted JSON string or null
   */
  private extractJsonObject(content: string): string | null {
    // Find the first { and last }
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = content.substring(firstBrace, lastBrace + 1);
      if (this.isValidJson(extracted)) {
        return extracted;
      }
    }

    // Try to find JSON array
    const firstBracket = content.indexOf("[");
    const lastBracket = content.lastIndexOf("]");

    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const extracted = content.substring(firstBracket, lastBracket + 1);
      if (this.isValidJson(extracted)) {
        return extracted;
      }
    }

    return null;
  }

  private processStreamLine(
    line: string,
    onChunk: (content: string) => void
  ): { content?: string; done?: boolean } {
    try {
      const data = JSON.parse(line);
      if (data.message?.content) {
        onChunk(data.message.content);
      }
      return { content: data.message?.content, done: data.done };
    } catch {
      return {};
    }
  }
}
