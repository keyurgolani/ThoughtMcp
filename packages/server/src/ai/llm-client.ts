import { z } from "zod";
import { Logger } from "../utils/logger.js";

export interface LLMConfig {
  host: string;
  modelName: string;
  timeout?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Client for interacting with Ollama GenAI (Generation) API
 * Distinct from Embeddings client - this handles Text Generation and Reasoning
 */
export class LLMClient {
  private readonly baseUrl: string;
  private readonly modelName: string;
  private readonly timeout: number;

  constructor(configOverride?: Partial<LLMConfig>) {
    this.baseUrl = configOverride?.host ?? process.env.OLLAMA_HOST ?? "http://localhost:11434";
    this.modelName = configOverride?.modelName ?? "llama3"; // Default to llama3 or distinct reasoning model
    this.timeout = configOverride?.timeout ?? 30000;
  }

  /**
   * Generate text from a prompt
   */
  async generate(prompt: string, system?: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

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
            temperature: 0.7, // Balance creativity and adherence
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { response: string };
      return data.response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        Logger.error("LLM Generation Timed Out", `Timeout after ${this.timeout}ms`);
        throw new Error(`LLM generation timed out after ${this.timeout}ms`);
      }
      Logger.error("LLM Generation Failed", error instanceof Error ? error.message : String(error));
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

    try {
      // If schema provided, append enforcement instruction to system prompt
      const finalMessages = [...messages];

      // Note: Actual schema binding logic will belong in PromptBinder,
      // but here we ensure the request asks for JSON mode if needed.
      const format = schema ? "json" : undefined;

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
            temperature: 0.2, // Lower temp for structured output
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Chat API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { message: { content: string } };
      const content = data.message.content;

      if (schema) {
        try {
          // Clean markdown code blocks if present (common LLM quirk)
          const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
          const parsed = JSON.parse(jsonStr);
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
        throw new Error(`LLM chat timed out after ${this.timeout}ms`);
      }
      Logger.error("LLM Chat Failed", error instanceof Error ? error.message : String(error));
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

    try {
      const finalMessages = [...messages];
      const format = schema ? "json" : undefined;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.modelName,
          messages: finalMessages,
          stream: true, // Enable streaming
          format,
          options: {
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama Chat API error: ${response.statusText}`);
      }

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
        // Ollama sends JSON objects per line
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          const result = this.processStreamLine(line, onChunk);
          if (result.content) {
            fullContent += result.content;
          }
          if (result.done) {
            break;
          }
        }
      }

      return fullContent;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        Logger.error("LLM Streaming Failed", `Timeout after ${this.timeout}ms`);
        throw new Error(`LLM streaming timed out after ${this.timeout}ms`);
      }
      Logger.error("LLM Streaming Failed", error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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
