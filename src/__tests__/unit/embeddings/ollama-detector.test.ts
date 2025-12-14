/**
 * Tests for Ollama Detector Utility
 *
 * Verifies the Ollama availability detection works correctly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkOllamaAvailability,
  clearOllamaStatusCache,
  DEFAULT_OLLAMA_HOST,
  getCachedOllamaStatus,
  getEmbeddingModelConfig,
  isModelAvailable,
  shouldUseRealOllama,
} from "../../utils/ollama-detector";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Ollama Detector", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    clearOllamaStatusCache();
    delete process.env.USE_MOCK_EMBEDDINGS;
    delete process.env.USE_REAL_OLLAMA;
    delete process.env.OLLAMA_HOST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("checkOllamaAvailability", () => {
    it("should return available when Ollama responds successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: "nomic-embed-text:latest" }, { name: "llama2:latest" }],
        }),
      } as Response);

      const status = await checkOllamaAvailability();

      expect(status.available).toBe(true);
      expect(status.host).toBe(DEFAULT_OLLAMA_HOST);
      expect(status.models).toContain("nomic-embed-text:latest");
      expect(status.latencyMs).toBeDefined();
    });

    it("should return unavailable when Ollama returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      const status = await checkOllamaAvailability();

      expect(status.available).toBe(false);
      expect(status.error).toContain("500");
    });

    it("should return unavailable when fetch fails", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const status = await checkOllamaAvailability();

      expect(status.available).toBe(false);
      expect(status.error).toContain("Connection refused");
    });

    it("should use custom host when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      const customHost = "http://custom-host:11434";
      const status = await checkOllamaAvailability(customHost);

      expect(status.host).toBe(customHost);
      expect(mockFetch).toHaveBeenCalledWith(`${customHost}/api/tags`, expect.any(Object));
    });
  });

  describe("isModelAvailable", () => {
    it("should return true when model is available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: "nomic-embed-text:latest" }],
        }),
      } as Response);

      const available = await isModelAvailable("nomic-embed-text");

      expect(available).toBe(true);
    });

    it("should return true for exact model name match", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: "nomic-embed-text" }],
        }),
      } as Response);

      const available = await isModelAvailable("nomic-embed-text");

      expect(available).toBe(true);
    });

    it("should return false when model is not available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: "llama2:latest" }],
        }),
      } as Response);

      const available = await isModelAvailable("nomic-embed-text");

      expect(available).toBe(false);
    });

    it("should return false when Ollama is unavailable", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const available = await isModelAvailable("nomic-embed-text");

      expect(available).toBe(false);
    });
  });

  describe("shouldUseRealOllama", () => {
    it("should return false when USE_MOCK_EMBEDDINGS is true", async () => {
      process.env.USE_MOCK_EMBEDDINGS = "true";

      const result = await shouldUseRealOllama();

      expect(result).toBe(false);
    });

    it("should return true when USE_REAL_OLLAMA is true", async () => {
      process.env.USE_REAL_OLLAMA = "true";

      const result = await shouldUseRealOllama();

      expect(result).toBe(true);
    });

    it("should auto-detect when no env vars set and Ollama available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      const result = await shouldUseRealOllama();

      expect(result).toBe(true);
    });

    it("should auto-detect when no env vars set and Ollama unavailable", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const result = await shouldUseRealOllama();

      expect(result).toBe(false);
    });
  });

  describe("getEmbeddingModelConfig", () => {
    it("should return mock config when USE_MOCK_EMBEDDINGS is true", async () => {
      process.env.USE_MOCK_EMBEDDINGS = "true";

      const config = await getEmbeddingModelConfig();

      expect(config.useRealOllama).toBe(false);
      expect(config.reason).toBe("USE_MOCK_EMBEDDINGS=true");
    });

    it("should return real config when USE_REAL_OLLAMA is true", async () => {
      process.env.USE_REAL_OLLAMA = "true";

      const config = await getEmbeddingModelConfig();

      expect(config.useRealOllama).toBe(true);
      expect(config.reason).toBe("USE_REAL_OLLAMA=true");
    });

    it("should return mock config when Ollama unavailable", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      const config = await getEmbeddingModelConfig();

      expect(config.useRealOllama).toBe(false);
      expect(config.reason).toContain("Ollama not available");
    });

    it("should return mock config when model not found", async () => {
      // First call for availability check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: "llama2:latest" }] }),
      } as Response);
      // Second call for model check
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [{ name: "llama2:latest" }] }),
      } as Response);

      const config = await getEmbeddingModelConfig("nomic-embed-text");

      expect(config.useRealOllama).toBe(false);
      expect(config.reason).toContain("not found");
    });

    it("should return real config when Ollama and model available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: "nomic-embed-text:latest" }] }),
      } as Response);

      const config = await getEmbeddingModelConfig("nomic-embed-text");

      expect(config.useRealOllama).toBe(true);
      expect(config.reason).toContain("Ollama available");
    });
  });

  describe("getCachedOllamaStatus", () => {
    it("should cache status for subsequent calls", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      // First call
      await getCachedOllamaStatus();
      // Second call should use cache
      await getCachedOllamaStatus();

      // Should only have called fetch once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should refresh cache when forceRefresh is true", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      await getCachedOllamaStatus();
      await getCachedOllamaStatus(undefined, true);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should clear cache with clearOllamaStatusCache", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      } as Response);

      await getCachedOllamaStatus();
      clearOllamaStatusCache();
      await getCachedOllamaStatus();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
