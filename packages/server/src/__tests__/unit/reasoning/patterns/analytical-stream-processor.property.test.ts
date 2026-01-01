/**
 * AnalyticalStreamProcessor Property-Based Tests
 *
 * Property tests for AnalyticalStreamProcessor functionality using fast-check.
 * Tests universal properties that should hold for all valid inputs.
 *
 * Property 12: Deterministic Mode Idempotence
 * For any problem input, running the Reasoning_Engine in deterministic mode
 * twice with the same input should produce identical output.
 *
 * **Validates: Requirements 10.3**
 */

import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import { AnalyticalStreamProcessor } from "../../../../reasoning/streams/analytical-stream-processor.js";
import type { Problem } from "../../../../reasoning/types.js";

// Mock LLM client to force rule-based processing
vi.mock("../../../../ai/llm-client.js", async () => {
  const actual = await vi.importActual("../../../../ai/llm-client.js");
  return {
    ...actual,
    LLMClient: class MockLLMClient {
      async streamChat() {
        // Always throw to force rule-based fallback
        throw new Error("LLM unavailable - forcing rule-based processing");
      }
    },
  };
});

// Mock fetch to prevent LLM availability checks
vi.mock("node-fetch", () => ({
  default: vi.fn().mockImplementation(() => {
    throw new Error("Network unavailable - forcing rule-based processing");
  }),
}));

describe("AnalyticalStreamProcessor Property Tests", () => {
  /**
   * Property 12: Deterministic Mode Idempotence
   *
   * For any problem input, running the Reasoning_Engine in deterministic mode
   * twice with the same input should produce identical output.
   *
   * **Validates: Requirements 10.3**
   */
  describe("Property 12: Deterministic Mode Idempotence", () => {
    it("should produce identical output when run twice in deterministic mode", async () => {
      // Create processor in deterministic mode
      const processor = new AnalyticalStreamProcessor({
        deterministicMode: true,
      });

      // Since we're testing deterministic mode, we need to ensure patterns are loaded
      // but we're mocking LLM to force rule-based processing

      await fc.assert(
        fc.asyncProperty(
          // Generate a problem
          fc.record({
            id: fc
              .string({ minLength: 1, maxLength: 30 })
              .filter((s) => /^[a-zA-Z0-9-_]+$/.test(s)),
            description: fc.string({ minLength: 10, maxLength: 200 }),
            context: fc.option(fc.string({ minLength: 0, maxLength: 100 })),
            constraints: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
            goals: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }),
            urgency: fc.option(fc.constantFrom("low", "medium", "high")),
            complexity: fc.option(fc.constantFrom("simple", "moderate", "complex")),
          }),
          async (problemData) => {
            // Create problem object - convert null to undefined for optional fields
            // context is required, so provide a default empty string if null
            const problem: Problem = {
              id: problemData.id,
              description: problemData.description,
              context: problemData.context ?? "",
              constraints: problemData.constraints.length > 0 ? problemData.constraints : undefined,
              goals: problemData.goals.length > 0 ? problemData.goals : undefined,
              urgency: problemData.urgency ?? undefined,
              complexity: problemData.complexity ?? undefined,
            };

            // Reset deterministic counter to ensure consistent IDs
            // @ts-ignore - accessing private method for testing
            processor.resetDeterministicCounter();

            // Process the problem twice
            const result1 = await processor.process(problem);

            // Reset deterministic counter again for second run
            // @ts-ignore - accessing private method for testing
            processor.resetDeterministicCounter();

            const result2 = await processor.process(problem);

            // Compare results - exclude processingTime as it's inherently non-deterministic
            // (depends on actual execution time which varies between runs)

            // Check specific fields that should be identical in deterministic mode
            expect(result1.streamId).toBe(result2.streamId);
            expect(result1.streamType).toBe(result2.streamType);
            expect(result1.conclusion).toBe(result2.conclusion);
            expect(result1.confidence).toBe(result2.confidence);
            expect(result1.status).toBe(result2.status);

            // Check reasoning arrays
            expect(result1.reasoning).toEqual(result2.reasoning);

            // Check insights arrays (compare content, confidence, importance - not source which may vary)
            expect(result1.insights.length).toBe(result2.insights.length);
            for (let i = 0; i < result1.insights.length; i++) {
              expect(result1.insights[i].content).toBe(result2.insights[i].content);
              expect(result1.insights[i].confidence).toBe(result2.insights[i].confidence);
              expect(result1.insights[i].importance).toBe(result2.insights[i].importance);
            }

            // Note: processingTime is intentionally NOT compared as it measures actual
            // execution time which varies between runs even in deterministic mode

            return true;
          }
        ),
        {
          numRuns: 10, // Reduced for faster test runs
          timeout: 10000, // Allow more time for processing
        }
      );
    });

    it("should produce different stream IDs in non-deterministic mode", async () => {
      // Create processor in non-deterministic mode
      const processor = new AnalyticalStreamProcessor({
        deterministicMode: false,
      });

      // Generate a simple problem
      const problem: Problem = {
        id: "test-problem",
        description: "Test problem for deterministic mode testing",
        context: "Test context",
      };

      // Process the problem twice with a delay to ensure different timestamps
      const result1 = await processor.process(problem);
      // Add a small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 5));
      const result2 = await processor.process(problem);

      // In non-deterministic mode, stream IDs should be different (timestamp-based)
      expect(result1.streamId).not.toBe(result2.streamId);
    });
  });
});
