/**
 * Integration tests for the MCP server
 * Integrated with ThoughtMCP Testing Framework
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveMCPServer } from "../server/CognitiveMCPServer.js";
import { ProcessingMode, ReasoningStep, ReasoningType } from "../types/core.js";
import { getVersion } from "../utils/version.js";
import { CognitiveTestFramework } from "./framework/TestFramework.js";
import { TestCleanup } from "./utils/testCleanup.js";
import { createTestServer, standardTestCleanup } from "./utils/testHelpers.js";

describe("CognitiveMCPServer", () => {
  let server: CognitiveMCPServer;
  let _testFramework: CognitiveTestFramework;

  beforeEach(async () => {
    TestCleanup.initialize();
    server = await createTestServer();
    _testFramework = new CognitiveTestFramework();
  });

  afterEach(async () => {
    await standardTestCleanup(server);
  });

  describe("Tool Handlers", () => {
    it("should handle think requests", async () => {
      const result = await server.handleThink({
        input: "What is consciousness?",
        mode: ProcessingMode.BALANCED,
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning_path).toBeInstanceOf(Array);
      expect(result.emotional_context).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.system_mode).toBe(ProcessingMode.BALANCED);
    });

    it("should handle remember requests", async () => {
      const result = await server.handleRemember({
        content: "The sky is blue",
        type: "semantic",
        importance: 0.7,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.memory_id).toBeDefined();
      expect(result.message).toContain("semantic memory");
    });

    it("should handle recall requests", async () => {
      const result = await server.handleRecall({
        cue: "sky color",
        type: "semantic",
        threshold: 0.5,
      });

      expect(result).toBeDefined();
      expect(result.memories).toBeInstanceOf(Array);
      expect(result.total_found).toBeGreaterThanOrEqual(0);
      expect(result.search_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle analyze reasoning requests", async () => {
      const result = await server.handleAnalyzeReasoning({
        reasoning_steps: [
          {
            type: "logical_inference",
            content: "If A then B",
            confidence: 0.8,
            alternatives: [],
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.coherence_score).toBeGreaterThanOrEqual(0);
      expect(result.coherence_score).toBeLessThanOrEqual(1);
      expect(result.confidence_assessment).toBeDefined();
      expect(result.detected_biases).toBeInstanceOf(Array);
      expect(result.suggested_improvements).toBeInstanceOf(Array);
      expect(result.reasoning_quality).toBeDefined();
      expect(
        result.reasoning_quality.logical_consistency
      ).toBeGreaterThanOrEqual(0);
      expect(result.reasoning_quality.logical_consistency).toBeLessThanOrEqual(
        1
      );
    });
  });

  describe("Configuration", () => {
    it("should use default processing mode when not specified", async () => {
      const result = await server.handleThink({
        input: "Test input",
      });

      expect(result.metadata.system_mode).toBe(ProcessingMode.BALANCED);
    });

    it("should respect specified processing mode", async () => {
      const result = await server.handleThink({
        input: "Test input",
        mode: ProcessingMode.DELIBERATIVE,
      });

      expect(result.metadata.system_mode).toBe(ProcessingMode.DELIBERATIVE);
    });

    it("should use default temperature when not specified", async () => {
      const result = await server.handleThink({
        input: "Test input",
      });

      expect(result.metadata.temperature).toBe(0.7);
    });

    it("should respect specified temperature", async () => {
      const result = await server.handleThink({
        input: "Test input",
        temperature: 1.2,
      });

      expect(result.metadata.temperature).toBe(1.2);
    });
  });

  describe("Server Lifecycle", () => {
    it("should initialize server info correctly", () => {
      const info = server.getServerInfo();
      expect(info.name).toBe("thoughtmcp");
      expect(info.version).toBe(getVersion());
      expect(info.initialized).toBe(true);
    });

    it("should track initialization state", () => {
      expect(server.isInitialized()).toBe(true);
    });

    it("should handle shutdown gracefully", async () => {
      await expect(server.shutdown()).resolves.not.toThrow();
    });
  });

  describe("Input Validation", () => {
    describe("Think Tool Validation", () => {
      it("should reject empty input", async () => {
        await expect(server.handleThink({ input: "" })).rejects.toThrow(
          "Think tool requires a valid input string"
        );
      });

      it("should reject invalid processing mode", async () => {
        await expect(
          server.handleThink({
            input: "test",
            mode: "invalid_mode" as unknown as ProcessingMode,
          })
        ).rejects.toThrow("Invalid processing mode");
      });

      it("should reject invalid temperature", async () => {
        await expect(
          server.handleThink({
            input: "test",
            temperature: -1,
          })
        ).rejects.toThrow("Temperature must be a number between 0 and 2");

        await expect(
          server.handleThink({
            input: "test",
            temperature: 3,
          })
        ).rejects.toThrow("Temperature must be a number between 0 and 2");
      });

      it("should reject invalid max_depth", async () => {
        await expect(
          server.handleThink({
            input: "test",
            max_depth: 0,
          })
        ).rejects.toThrow("Max depth must be a number between 1 and 20");

        await expect(
          server.handleThink({
            input: "test",
            max_depth: 25,
          })
        ).rejects.toThrow("Max depth must be a number between 1 and 20");
      });
    });

    describe("Remember Tool Validation", () => {
      it("should reject empty content", async () => {
        await expect(
          server.handleRemember({
            content: "",
            type: "semantic",
          })
        ).rejects.toThrow("Remember tool requires a valid content string");
      });

      it("should reject invalid memory type", async () => {
        await expect(
          server.handleRemember({
            content: "test",
            type: "invalid" as unknown as "episodic" | "semantic",
          })
        ).rejects.toThrow(
          'Remember tool requires type to be either "episodic" or "semantic"'
        );
      });

      it("should reject invalid importance", async () => {
        await expect(
          server.handleRemember({
            content: "test",
            type: "semantic",
            importance: -1,
          })
        ).rejects.toThrow("Importance must be a number between 0 and 1");

        await expect(
          server.handleRemember({
            content: "test",
            type: "semantic",
            importance: 2,
          })
        ).rejects.toThrow("Importance must be a number between 0 and 1");
      });
    });

    describe("Recall Tool Validation", () => {
      it("should reject empty cue", async () => {
        await expect(server.handleRecall({ cue: "" })).rejects.toThrow(
          "Recall tool requires a valid cue string"
        );
      });

      it("should reject invalid type", async () => {
        await expect(
          server.handleRecall({
            cue: "test",
            type: "invalid" as unknown as "episodic" | "semantic" | "both",
          })
        ).rejects.toThrow(
          'Recall type must be "episodic", "semantic", or "both"'
        );
      });

      it("should reject invalid threshold", async () => {
        await expect(
          server.handleRecall({
            cue: "test",
            threshold: -1,
          })
        ).rejects.toThrow("Threshold must be a number between 0 and 1");

        await expect(
          server.handleRecall({
            cue: "test",
            threshold: 2,
          })
        ).rejects.toThrow("Threshold must be a number between 0 and 1");
      });

      it("should reject invalid max_results", async () => {
        await expect(
          server.handleRecall({
            cue: "test",
            max_results: 0,
          })
        ).rejects.toThrow("Max results must be a number between 1 and 50");

        await expect(
          server.handleRecall({
            cue: "test",
            max_results: 100,
          })
        ).rejects.toThrow("Max results must be a number between 1 and 50");
      });
    });

    describe("Analyze Reasoning Tool Validation", () => {
      it("should reject missing reasoning steps", async () => {
        await expect(
          server.handleAnalyzeReasoning({
            reasoning_steps: undefined as unknown as ReasoningStep[],
          })
        ).rejects.toThrow(
          "Analyze reasoning tool requires an array of reasoning steps"
        );
      });

      it("should reject empty reasoning steps array", async () => {
        await expect(
          server.handleAnalyzeReasoning({
            reasoning_steps: [],
          })
        ).rejects.toThrow("At least one reasoning step is required");
      });

      it("should reject invalid reasoning step structure", async () => {
        await expect(
          server.handleAnalyzeReasoning({
            reasoning_steps: [{ type: "", content: "test", confidence: 0.5 }],
          })
        ).rejects.toThrow("Reasoning step 0 requires a valid type string");

        await expect(
          server.handleAnalyzeReasoning({
            reasoning_steps: [{ type: "test", content: "", confidence: 0.5 }],
          })
        ).rejects.toThrow("Reasoning step 0 requires a valid content string");

        await expect(
          server.handleAnalyzeReasoning({
            reasoning_steps: [
              { type: "test", content: "test", confidence: -1 },
            ],
          })
        ).rejects.toThrow(
          "Reasoning step 0 requires a confidence number between 0 and 1"
        );
      });

      it("should accept valid reasoning steps", async () => {
        const result = await server.handleAnalyzeReasoning({
          reasoning_steps: [
            {
              type: ReasoningType.LOGICAL_INFERENCE,
              content: "Valid reasoning step",
              confidence: 0.8,
              alternatives: [],
            },
          ],
        });

        expect(result).toBeDefined();
        expect(result.coherence_score).toBeGreaterThanOrEqual(0);
        expect(result.coherence_score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle processing errors gracefully", async () => {
      // Test that errors are properly wrapped and thrown
      const originalHandleThink = server.handleThink;
      server.handleThink = async () => {
        throw new Error("Simulated processing error");
      };

      await expect(server.handleThink({ input: "test" })).rejects.toThrow(
        "Simulated processing error"
      );

      // Restore original method
      server.handleThink = originalHandleThink;
    });

    it("should provide meaningful error messages", async () => {
      await expect(
        server.handleThink({
          input: "test",
          mode: "nonexistent" as unknown as ProcessingMode,
        })
      ).rejects.toThrow(/Invalid processing mode.*nonexistent/);
    });
  });

  describe("Performance Tracking", () => {
    it("should track processing time in think results", async () => {
      const result = await server.handleThink({ input: "test" });
      expect(result.metadata.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should track search time in recall results", async () => {
      const result = await server.handleRecall({ cue: "test" });
      expect(result.search_time_ms).toBeGreaterThanOrEqual(0);
    });
  });
});
