/**
 * Integration tests for SensoryProcessor
 * Tests integration with the broader cognitive architecture
 */

import { beforeEach, describe, expect, it } from "vitest";
import { SensoryProcessor } from "../../cognitive/SensoryProcessor.js";
import { ISensoryProcessor } from "../../interfaces/cognitive.js";

describe("SensoryProcessor Integration", () => {
  let processor: ISensoryProcessor;

  beforeEach(async () => {
    processor = new SensoryProcessor();
    await processor.initialize({
      attention_threshold: 0.3,
      buffer_size: 10,
    });
  });

  describe("Interface Compliance", () => {
    it("should implement ISensoryProcessor interface correctly", () => {
      expect(processor).toBeDefined();
      expect(typeof processor.initialize).toBe("function");
      expect(typeof processor.process).toBe("function");
      expect(typeof processor.tokenize).toBe("function");
      expect(typeof processor.filterAttention).toBe("function");
      expect(typeof processor.detectPatterns).toBe("function");
      expect(typeof processor.computeSalience).toBe("function");
      expect(typeof processor.reset).toBe("function");
      expect(typeof processor.getStatus).toBe("function");
    });

    it("should return correct component status", () => {
      const status = processor.getStatus();

      expect(status.name).toBe("SensoryProcessor");
      expect(status.initialized).toBe(true);
      expect(status.active).toBe(true);
      expect(typeof status.last_activity).toBe("number");
    });
  });

  describe("Cognitive Architecture Integration", () => {
    it("should process cognitive input for downstream components", async () => {
      const cognitiveInput =
        "The human brain processes information through multiple layers of neural networks, integrating sensory data with memory and emotional context to generate intelligent responses.";

      const result = await processor.process(cognitiveInput);

      // Should produce structured output suitable for working memory
      expect((result as any).tokens.length).toBeGreaterThan(0);
      expect((result as any).patterns.length).toBeGreaterThan(0);
      expect((result as any).semantic_chunks.length).toBeGreaterThan(0);

      // Should identify cognitive/neural patterns
      const cognitivePatterns = (result as any).patterns.filter((p: any) =>
        p.content.some((word: any) =>
          ["brain", "neural", "cognitive", "memory"].includes(word)
        )
      );
      expect(cognitivePatterns.length).toBeGreaterThan(0);

      // Should have high-salience tokens for important concepts
      const highSalienceTokens = (result as any).salience_map.attention_focus;
      expect(
        highSalienceTokens.some((token: any) =>
          ["brain", "neural", "information", "memory"].includes(token)
        )
      ).toBe(true);
    });

    it("should handle technical AI/ML content appropriately", async () => {
      const technicalInput =
        "Machine learning algorithms use artificial neural networks to process data, implementing backpropagation for training deep learning models with gradient descent optimization.";

      const result = await processor.process(technicalInput);

      // Should detect technical patterns
      const technicalPatterns = (result as any).patterns.filter((p: any) =>
        p.content.some((word: any) =>
          ["machine", "learning", "neural", "algorithms"].includes(word)
        )
      );
      expect(technicalPatterns.length).toBeGreaterThan(0);

      // Should create semantic chunks for related concepts
      const mlChunk = (result as any).semantic_chunks.find((chunk: any) =>
        chunk.tokens.some((t: any) => ["machine", "learning"].includes(t.text))
      );
      expect(mlChunk).toBeDefined();
      expect(mlChunk?.importance).toBeGreaterThan(0.5);
    });

    it("should provide consistent output format for memory systems", async () => {
      const inputs = [
        "Simple test input.",
        "Complex cognitive processing involves multiple interconnected systems working together.",
        "The quick brown fox jumps over the lazy dog.",
      ];

      for (const input of inputs) {
        const result = await processor.process(input);

        // Consistent structure for memory integration
        expect(result).toHaveProperty("tokens");
        expect(result).toHaveProperty("patterns");
        expect(result).toHaveProperty("salience_map");
        expect(result).toHaveProperty("semantic_chunks");
        expect(result).toHaveProperty("attention_filtered");

        // All tokens should have required properties
        (result as any).tokens.forEach((token: any) => {
          expect(token).toHaveProperty("text");
          expect(token).toHaveProperty("position");
          expect(token).toHaveProperty("semantic_weight");
          expect(token).toHaveProperty("attention_score");
          expect(token).toHaveProperty("context_tags");
        });

        // All patterns should have required properties
        (result as any).patterns.forEach((pattern: any) => {
          expect(pattern).toHaveProperty("type");
          expect(pattern).toHaveProperty("content");
          expect(pattern).toHaveProperty("confidence");
          expect(pattern).toHaveProperty("salience");
        });
      }
    });

    it("should handle emotional content for emotional processor integration", async () => {
      const emotionalInput =
        "I feel excited and happy about this amazing breakthrough in artificial intelligence research!";

      const result = await processor.process(emotionalInput);

      // Should detect emotional tokens
      const emotionalTokens = (result as any).tokens.filter((t: any) =>
        ["excited", "happy", "amazing"].includes(t.text)
      );
      expect(emotionalTokens.length).toBeGreaterThan(0);

      // Emotional tokens should have high attention scores
      emotionalTokens.forEach((token: any) => {
        expect(token.attention_score).toBeGreaterThan(0.5);
      });

      // Should appear in attention focus
      expect(
        (result as any).salience_map.attention_focus.some((token: any) =>
          ["excited", "happy", "amazing"].includes(token)
        )
      ).toBe(true);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle concurrent processing requests", async () => {
      const inputs = [
        "First concurrent input for processing.",
        "Second concurrent input with different content.",
        "Third concurrent input testing parallel processing.",
      ];

      const promises = inputs.map((input) => processor.process(input));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect((result as any).tokens.length).toBeGreaterThan(0);
        expect(
          (result as any).tokens.some((t: any) =>
            t.text.includes(
              index === 0 ? "first" : index === 1 ? "second" : "third"
            )
          )
        ).toBe(true);
      });
    });

    it("should maintain performance with repeated processing", async () => {
      const input = "Repeated processing test for performance measurement.";
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await processor.process(input);
        const end = Date.now();
        times.push(end - start);
      }

      // Performance should be consistent (no significant degradation)
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(avgTime).toBeLessThan(100); // Should be fast
      expect(maxTime).toBeLessThan(200); // No outliers
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should recover from processing errors", async () => {
      // Test with potentially problematic input
      const problematicInputs = [
        "", // Empty
        "   ", // Whitespace only
        "!@#$%^&*()", // Special characters only
        "a".repeat(10000), // Very long single word
      ];

      for (const input of problematicInputs) {
        const result = await processor.process(input);
        expect(result).toBeDefined();
        expect((result as any).tokens).toBeDefined();
        expect((result as any).patterns).toBeDefined();
        expect((result as any).salience_map).toBeDefined();
        expect((result as any).semantic_chunks).toBeDefined();
      }
    });

    it("should maintain state consistency after errors", async () => {
      const validInput = "Valid input for testing state consistency.";

      // Process valid input
      const result1 = await processor.process(validInput);
      expect((result1 as any).tokens.length).toBeGreaterThan(0);

      // Process empty input (edge case)
      const result2 = await processor.process("");
      expect((result2 as any).tokens.length).toBe(0);

      // Process valid input again - should work normally
      const result3 = await processor.process(validInput);
      expect((result3 as any).tokens.length).toBeGreaterThan(0);
      expect((result3 as any).tokens.length).toBe(
        (result1 as any).tokens.length
      );
    });
  });
});
