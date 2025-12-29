import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LLM_CONFIG, LLMClient, LLMConfig } from "../../../ai/llm-client.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("LLMClient", () => {
  let client: LLMClient;
  const defaultConfig: Partial<LLMConfig> = {
    host: "http://localhost:11434",
    modelName: "llama3.2:1b",
    timeout: 30000,
    temperature: 0.7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new LLMClient(defaultConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should create client with default config", () => {
      const minimalClient = new LLMClient({ host: "http://localhost:11434" });
      expect(minimalClient).toBeDefined();
      expect(minimalClient.getModelName()).toBe(DEFAULT_LLM_CONFIG.modelName);
    });

    it("should create client with custom config", () => {
      const customClient = new LLMClient({
        host: "http://custom:11434",
        modelName: "custom-model",
        timeout: 60000,
        temperature: 0.5,
      });
      expect(customClient).toBeDefined();
      expect(customClient.getModelName()).toBe("custom-model");
      expect(customClient.getTemperature()).toBe(0.5);
      expect(customClient.getTimeout()).toBe(60000);
    });
  });

  describe("chat", () => {
    it("should send chat request and return response", async () => {
      const mockResponse = {
        message: { content: "Hello, how can I help?" },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.chat([{ role: "user", content: "Hello" }]);

      expect(result).toBe("Hello, how can I help?");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/chat",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should handle empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: { content: "" } }),
      });

      const result = await client.chat([{ role: "user", content: "Hello" }]);
      expect(result).toBe("");
    });

    it("should throw error on network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.chat([{ role: "user", content: "Hello" }])).rejects.toThrow(
        "Network error"
      );
    });

    it("should throw error on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(client.chat([{ role: "user", content: "Hello" }])).rejects.toThrow(
        "Ollama Chat API error"
      );
    });

    it("should include system message in messages array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: { content: "Response" } }),
      });

      await client.chat([
        { role: "system", content: "You are a helpful assistant" },
        { role: "user", content: "Hello" },
      ]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0]).toEqual({
        role: "system",
        content: "You are a helpful assistant",
      });
    });

    it("should use configured temperature", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: { content: "Response" } }),
      });

      await client.chat([{ role: "user", content: "Hello" }]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.options.temperature).toBe(0.7);
    });
  });

  describe("streamChat", () => {
    it("should stream chat response", async () => {
      const chunks = [
        '{"message":{"content":"Hello"},"done":false}',
        '{"message":{"content":" world"},"done":false}',
        '{"message":{"content":"!"},"done":true}',
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => {
            controller.enqueue(encoder.encode(`${chunk}\n`));
          });
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const onChunk = vi.fn();
      const result = await client.streamChat([{ role: "user", content: "Hello" }], onChunk);
      expect(result).toBe("Hello world!");
    });

    it("should call onChunk callback for each chunk", async () => {
      const chunks = [
        '{"message":{"content":"Hello"},"done":false}',
        '{"message":{"content":" world"},"done":true}',
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => {
            controller.enqueue(encoder.encode(`${chunk}\n`));
          });
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const onChunk = vi.fn();
      await client.streamChat([{ role: "user", content: "Hello" }], onChunk);

      expect(onChunk).toHaveBeenCalledWith("Hello");
      expect(onChunk).toHaveBeenCalledWith(" world");
    });

    it("should throw error when response body is null", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const onChunk = vi.fn();
      await expect(
        client.streamChat([{ role: "user", content: "Hello" }], onChunk)
      ).rejects.toThrow("Response body is null");
    });

    it("should handle malformed JSON in stream gracefully", async () => {
      const chunks = [
        '{"message":{"content":"Hello"},"done":false}',
        "invalid json",
        '{"message":{"content":"!"},"done":true}',
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => {
            controller.enqueue(encoder.encode(`${chunk}\n`));
          });
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const onChunk = vi.fn();
      // Should not throw, just skip invalid chunks
      const result = await client.streamChat([{ role: "user", content: "Hello" }], onChunk);
      expect(result).toBe("Hello!");
    });
  });

  describe("checkModelAvailability", () => {
    it("should return available status when model is available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: "llama3.2:1b" }, { name: "other-model" }],
          }),
      });

      const result = await client.checkModelAvailability();
      expect(result.available).toBe(true);
      expect(result.modelName).toBe("llama3.2:1b");
    });

    it("should return unavailable status when model is not in list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: "other-model" }],
          }),
      });

      const result = await client.checkModelAvailability();
      expect(result.available).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return unavailable status when API call fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.checkModelAvailability();
      expect(result.available).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("should return unavailable status when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await client.checkModelAvailability();
      expect(result.available).toBe(false);
      expect(result.error).toContain("Ollama API error");
    });

    it("should return unavailable status when models list is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const result = await client.checkModelAvailability();
      expect(result.available).toBe(false);
    });
  });

  describe("isModelAvailable", () => {
    it("should return false initially", () => {
      expect(client.isModelAvailable()).toBe(false);
    });

    it("should return true after successful availability check", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: "llama3.2:1b" }],
          }),
      });

      await client.checkModelAvailability();
      expect(client.isModelAvailable()).toBe(true);
    });
  });

  describe("getModelStatus", () => {
    it("should return initial status", () => {
      const status = client.getModelStatus();
      expect(status.available).toBe(false);
      expect(status.modelName).toBe("llama3.2:1b");
      expect(status.errorCount).toBe(0);
    });

    it("should return updated status after availability check", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            models: [{ name: "llama3.2:1b" }],
          }),
      });

      await client.checkModelAvailability();
      const status = client.getModelStatus();
      expect(status.available).toBe(true);
      expect(status.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generate", () => {
    it("should generate text from prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "Generated text" }),
      });

      const result = await client.generate("Test prompt");
      expect(result).toBe("Generated text");
    });

    it("should include system prompt when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: "Generated text" }),
      });

      await client.generate("Test prompt", "System instructions");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.system).toBe("System instructions");
    });

    it("should throw error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(client.generate("Test prompt")).rejects.toThrow("Ollama API error");
    });
  });

  describe("accessor methods", () => {
    it("should return model name", () => {
      expect(client.getModelName()).toBe("llama3.2:1b");
    });

    it("should return temperature", () => {
      expect(client.getTemperature()).toBe(0.7);
    });

    it("should return timeout", () => {
      expect(client.getTimeout()).toBe(30000);
    });
  });
});
