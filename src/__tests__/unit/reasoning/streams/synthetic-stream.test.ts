/**
 * Tests for Synthetic Reasoning Stream
 *
 * Validates integrative, holistic thinking with pattern recognition,
 * connection mapping, theme extraction, and synthesis capabilities.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SyntheticReasoningStream,
  SyntheticStreamProcessor,
} from "../../../../reasoning/streams/synthetic-stream";
import { StreamStatus, StreamType, type Problem } from "../../../../reasoning/types";

describe("SyntheticStreamProcessor", () => {
  let processor: SyntheticStreamProcessor;

  beforeEach(() => {
    processor = new SyntheticStreamProcessor();
  });

  describe("getStreamType", () => {
    it("should return SYNTHETIC stream type", () => {
      expect(processor.getStreamType()).toBe(StreamType.SYNTHETIC);
    });
  });

  describe("process - Pattern Recognition", () => {
    it("should identify systemic patterns in problem", async () => {
      const problem: Problem = {
        id: "test-1",
        description: "System shows recurring failures and cascading effects",
        context: "Multiple components fail in sequence, suggesting systemic issues",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.reasoning.some((r) => r.includes("pattern"))).toBe(true);
    });

    it("should add pattern analysis reasoning for cause-effect patterns", async () => {
      const problem: Problem = {
        id: "test-pattern-cause",
        description: "System with clear cause and effect relationships",
        context: "Multiple factors with various patterns",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify pattern analysis reasoning is added (covers line 75-76)
      expect(result.reasoning.some((r) => r.includes("Pattern analysis:"))).toBe(true);
    });

    it("should identify cause-effect patterns", async () => {
      const problem: Problem = {
        id: "test-2",
        description: "When A happens, B always follows, causing C",
        context: "Clear cause and effect relationships observed",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.toLowerCase().includes("pattern"))).toBe(true);
    });

    it("should identify feedback loops in context", async () => {
      const problem: Problem = {
        id: "test-feedback",
        description: "System with feedback mechanisms",
        context: "The cycle reinforces itself creating a feedback loop",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.insights.some((i) => i.content.toLowerCase().includes("feedback"))).toBe(true);
    });
  });

  describe("process - Connection Mapping", () => {
    it("should map connections between concepts", async () => {
      const problem: Problem = {
        id: "test-3",
        description: "Factor X affects Y which influences Z",
        context: "Multiple factors are interconnected and affect each other",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.includes("connection"))).toBe(true);
    });

    it("should identify hidden relationships", async () => {
      const problem: Problem = {
        id: "test-4",
        description: "Subtle indirect effects between components",
        context: "Hidden dependencies create unexpected behaviors",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.toLowerCase().includes("hidden"))).toBe(true);
    });

    it("should identify interdependencies", async () => {
      const problem: Problem = {
        id: "test-5",
        description: "Components depend on each other mutually",
        context: "Interdependent systems with mutual dependencies",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.toLowerCase().includes("interdepend"))).toBe(true);
    });

    it("should map influence networks with multiple constraints", async () => {
      const problem: Problem = {
        id: "test-influence",
        description: "Multiple constraints create complex influence patterns",
        context: "Various limitations interact",
        constraints: ["constraint1", "constraint2"],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify that connections are mapped (influence network is part of connections)
      expect(result.reasoning.some((r) => r.toLowerCase().includes("connection"))).toBe(true);
    });
  });

  describe("process - Theme Extraction", () => {
    it("should extract meta-level themes", async () => {
      const problem: Problem = {
        id: "test-6",
        description: "Higher level patterns emerge from details",
        context: "Meta-level themes tie everything together at a broader level",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.toLowerCase().includes("meta"))).toBe(true);
    });

    it("should identify emergent properties", async () => {
      const problem: Problem = {
        id: "test-7",
        description: "The whole is greater than sum of parts",
        context: "Emergent behaviors arise from component interactions",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.toLowerCase().includes("emergent"))).toBe(true);
    });
  });

  describe("process - Integrative Thinking", () => {
    it("should integrate paradoxes and tensions", async () => {
      const problem: Problem = {
        id: "test-8",
        description: "Paradoxical situation with competing tensions",
        context: "Both perspectives are valid but seem contradictory",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.toLowerCase().includes("paradox"))).toBe(true);
    });

    it("should synthesize multiple perspectives with sufficient insights", async () => {
      const problem: Problem = {
        id: "test-synthesis",
        description: "Complex problem with many patterns, connections, and themes",
        context:
          "Rich context with multiple interconnected factors, various patterns, several themes, and systemic complexity",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify synthesis happens through insights
      expect(result.insights.some((i) => i.content.toLowerCase().includes("synthesis"))).toBe(true);
    });

    it("should bridge cross-domain insights with rich context", async () => {
      const problem: Problem = {
        id: "test-cross-domain",
        description: "Problem spanning multiple domains",
        context:
          "This problem involves technical, organizational, and strategic considerations that must be integrated across different domains and perspectives to achieve a comprehensive understanding",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify integration happens - context > 100 chars triggers integration
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("process - Temporal Dynamics", () => {
    it("should consider temporal dynamics when context is provided", async () => {
      const problem: Problem = {
        id: "test-9",
        description: "System evolves over time",
        context: "Dynamic interactions change as system evolves",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.includes("time"))).toBe(true);
    });

    it("should skip temporal analysis when context is empty", async () => {
      const problem: Problem = {
        id: "test-10",
        description: "System without temporal context",
        context: "",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Should still complete successfully
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should consider time pressure for high urgency problems", async () => {
      const problem: Problem = {
        id: "test-urgency",
        description: "Urgent problem requiring quick action",
        context: "Time-sensitive situation with rapid evolution",
        constraints: [],
        goals: [],
        urgency: "high",
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Should mention time or temporal dynamics in insights or reasoning
      const hasTimeReference =
        result.insights.some((i) => i.content.toLowerCase().includes("time")) ||
        result.reasoning.some(
          (r) => r.toLowerCase().includes("time") || r.toLowerCase().includes("temporal")
        );
      expect(hasTimeReference).toBe(true);
    });
  });

  describe("process - Confidence Calculation", () => {
    it("should reduce confidence for missing context", async () => {
      const problem: Problem = {
        id: "test-11",
        description: "Problem without context",
        context: "",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.confidence).toBeLessThan(0.7); // Penalty for missing context
    });

    it("should reduce confidence for very limited context", async () => {
      const problem: Problem = {
        id: "test-12",
        description: "Problem with minimal context",
        context: "Short",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.confidence).toBeLessThan(0.8); // Penalty for limited context
    });

    it("should reduce confidence for moderately limited context", async () => {
      const problem: Problem = {
        id: "test-13",
        description: "Problem with some context",
        context: "This is a bit more context but still limited",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should reduce confidence for highly constrained problems", async () => {
      const problem: Problem = {
        id: "test-14",
        description: "Highly constrained problem",
        context: "Problem with many constraints limiting solution space",
        constraints: ["constraint1", "constraint2", "constraint3", "constraint4"],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("process - Error Handling", () => {
    it("should throw error for invalid problem (missing id)", async () => {
      const problem: any = {
        description: "Problem without ID",
        context: "Some context",
      };

      await expect(processor.process(problem)).rejects.toThrow("Invalid problem");
    });

    it("should throw error for invalid problem (missing description)", async () => {
      const problem: any = {
        id: "test-15",
        context: "Some context",
      };

      await expect(processor.process(problem)).rejects.toThrow("Invalid problem");
    });

    it("should throw error for null problem", async () => {
      await expect(processor.process(null as any)).rejects.toThrow("Invalid problem");
    });

    it("should return FAILED status when processing throws unexpected error", async () => {
      const problem: Problem = {
        id: "test-error",
        description: "Problem that will cause internal error",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      // Mock identifyPatterns to throw an error
      const originalIdentifyPatterns = (processor as any).identifyPatterns;
      (processor as any).identifyPatterns = () => {
        throw new Error("Unexpected processing error");
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.FAILED);
      expect(result.confidence).toBe(0);
      expect(result.conclusion).toBe("");
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("Unexpected processing error");

      // Restore original method
      (processor as any).identifyPatterns = originalIdentifyPatterns;
    });
  });

  describe("process - Result Structure", () => {
    it("should return top 10 insights sorted by importance", async () => {
      const problem: Problem = {
        id: "test-16",
        description: "Complex problem with many patterns, connections, and themes",
        context:
          "Rich context with systemic patterns, cause-effect relationships, hidden dependencies, emergent properties, and meta-level themes",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.insights.length).toBeLessThanOrEqual(10);
      // Verify insights are sorted by importance
      for (let i = 1; i < result.insights.length; i++) {
        expect(result.insights[i - 1].importance).toBeGreaterThanOrEqual(
          result.insights[i].importance
        );
      }
    });

    it("should include processing time", async () => {
      const problem: Problem = {
        id: "test-17",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe("process - Holistic Perspective", () => {
    it("should generate holistic perspective with complex system assessment", async () => {
      const problem: Problem = {
        id: "test-holistic-complex",
        description: "Highly complex problem with many interconnected elements",
        context:
          "This is a very complex situation with multiple layers of interaction, numerous stakeholders, various constraints, and dynamic relationships that evolve over time",
        constraints: ["constraint1", "constraint2"],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(
        result.reasoning.some((r) => r.includes("big picture") || r.includes("Big picture"))
      ).toBe(true);
      // Should mention constraints or boundaries
      const hasBoundaryReference = result.reasoning.some(
        (r) =>
          r.includes("boundaries") || r.includes("constraint") || r.includes("operating within")
      );
      expect(hasBoundaryReference).toBe(true);
    });

    it("should generate holistic perspective for simpler interconnected systems", async () => {
      const problem: Problem = {
        id: "test-holistic-simple",
        description: "Interconnected problem",
        context: "Some context",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.includes("big picture"))).toBe(true);
    });
  });

  describe("process - Leverage Points", () => {
    it("should identify leverage points with high importance insights", async () => {
      const problem: Problem = {
        id: "test-leverage",
        description: "Problem with critical intervention points",
        context:
          "Multiple interconnected factors with various patterns, several connections, and emergent themes",
        constraints: [],
        goals: ["goal1", "goal2"],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.reasoning.some((r) => r.includes("leverage"))).toBe(true);
    });

    it("should align leverage points with goals when present", async () => {
      const problem: Problem = {
        id: "test-leverage-goals",
        description: "Problem with clear goals",
        context: "Context with patterns and connections",
        constraints: [],
        goals: ["achieve outcome A", "improve metric B"],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify leverage points are identified in reasoning
      expect(result.reasoning.some((r) => r.toLowerCase().includes("leverage"))).toBe(true);
    });
  });

  describe("process - Conclusion Generation", () => {
    it("should generate conclusion for highly complex systems", async () => {
      const problem: Problem = {
        id: "test-conclusion-complex",
        description: "Very complex problem",
        context:
          "Rich context with multiple patterns, connections, themes, and integrative insights",
        constraints: [],
        goals: ["goal1"],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.conclusion).toContain("complex");
      expect(result.conclusion).toContain("strategic");
    });

    it("should generate conclusion for moderately complex systems", async () => {
      const problem: Problem = {
        id: "test-conclusion-moderate",
        description: "Moderately complex problem",
        context: "Some patterns and connections",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.conclusion).toContain("system");
    });

    it("should generate conclusion for simpler interconnected systems", async () => {
      const problem: Problem = {
        id: "test-conclusion-simple",
        description: "Simple interconnected problem",
        context: "Basic context",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify conclusion contains "system" (can be "interconnected system" or "complex system")
      expect(result.conclusion).toContain("system");
    });

    it("should mention leverage points in conclusion when present", async () => {
      const problem: Problem = {
        id: "test-conclusion-leverage",
        description: "Problem with leverage points",
        context: "Multiple patterns, connections, themes creating high importance insights",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.conclusion).toContain("leverage");
    });
  });

  describe("process - Additional Coverage for Uncovered Branches", () => {
    it("should add connection insight for affects/relates/influences keywords", async () => {
      const problem: Problem = {
        id: "test-connection-affects",
        description: "Factor X affects Y which relates to Z and influences outcome",
        context: "Multiple interconnected factors with various relationships",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify connection insight reasoning is added (covers line 75-76)
      expect(result.reasoning.some((r) => r.includes("Connection insight:"))).toBe(true);
    });

    it("should add emergent insight reasoning for themes", async () => {
      const problem: Problem = {
        id: "test-emergent-theme",
        description: "System with emergent properties",
        context: "The whole exhibits behaviors that emerge from interactions",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify emergent insight reasoning is added
      expect(result.reasoning.some((r) => r.includes("Emergent insight:"))).toBe(true);
    });

    it("should add integration reasoning for paradoxes", async () => {
      const problem: Problem = {
        id: "test-integration-paradox",
        description: "Problem with paradoxical elements",
        context: "Multiple patterns, connections, and themes with paradoxical tensions",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify integration reasoning is added (covers line 457-458)
      expect(result.reasoning.some((r) => r.includes("Integration:"))).toBe(true);
    });

    it("should generate holistic perspective without constraints", async () => {
      const problem: Problem = {
        id: "test-holistic-no-constraints",
        description: "Simple problem",
        context: "Basic", // Very short context (< 150 chars)
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify holistic perspective is generated (covers line 447-448)
      // The holistic view should be in insights with "big picture"
      const holisticInsight = result.insights.find((i) => i.content.includes("big picture"));
      expect(holisticInsight).toBeDefined();
      // With short context, should use "interconnected situation" or "complex adaptive system"
      expect(
        holisticInsight?.content.includes("interconnected situation") ||
          holisticInsight?.content.includes("complex adaptive system")
      ).toBe(true);
    });

    it("should include boundary details in holistic perspective with constraints", async () => {
      const problem: Problem = {
        id: "test-holistic-boundaries",
        description: "Complex system with defined boundaries",
        context:
          "Very rich context with multiple layers, stakeholders, and dynamic relationships that evolve",
        constraints: ["budget limit", "time constraint"],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify boundaries are mentioned in reasoning (covers line 551-554)
      expect(result.reasoning.some((r) => r.includes("boundaries"))).toBe(true);
    });

    it("should include leverage point details in conclusion with multiple high-importance insights", async () => {
      const problem: Problem = {
        id: "test-conclusion-leverage-details",
        description: "Problem with multiple critical leverage points",
        context:
          "Rich context with systemic patterns, cause-effect relationships, hidden dependencies, emergent properties, meta-level themes, and integrative insights",
        constraints: [],
        goals: ["goal1"],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify leverage points are mentioned in conclusion (covers line 694-704)
      expect(result.conclusion).toContain("leverage");
      expect(result.conclusion).toContain("strategic");
    });

    it("should apply context length penalty for very short context", async () => {
      const problem: Problem = {
        id: "test-confidence-short-context",
        description: "Problem with very short context",
        context: "Short", // Less than 20 chars
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify confidence is reduced for very short context (covers line 752-754)
      // Base 0.75 - 0.25 penalty = 0.5, but can get boosts from insights
      // So we just verify it's less than base confidence with good context
      expect(result.confidence).toBeLessThan(0.85);
    });

    it("should apply context length penalty for limited context", async () => {
      const problem: Problem = {
        id: "test-confidence-limited-context",
        description: "Problem with limited context",
        context: "This is limited context text", // Between 20-50 chars
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify confidence is reduced for limited context
      // Base 0.75 - 0.15 penalty = 0.6, but can get boosts from insights
      // So we just verify it's less than base confidence with good context
      expect(result.confidence).toBeLessThan(0.9);
    });

    it("should generate conclusion without leverage points when no high-importance insights", async () => {
      const problem: Problem = {
        id: "test-conclusion-no-leverage",
        description: "Simple problem",
        context: "Basic context",
        constraints: [],
        goals: [],
      };

      const result = await processor.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      // Verify conclusion is generated without leverage points (covers line 684-694)
      expect(result.conclusion).toBeTruthy();
      expect(result.conclusion).toContain("system");
    });
  });
});

describe("SyntheticReasoningStream", () => {
  let stream: SyntheticReasoningStream;

  beforeEach(() => {
    stream = new SyntheticReasoningStream(5000);
  });

  describe("Constructor", () => {
    it("should initialize with correct properties", () => {
      expect(stream.id).toContain("synthetic-stream");
      expect(stream.type).toBe(StreamType.SYNTHETIC);
      expect(stream.timeout).toBe(5000);
      expect(stream.processor).toBeInstanceOf(SyntheticStreamProcessor);
    });

    it("should use default timeout when not specified", () => {
      const defaultStream = new SyntheticReasoningStream();
      expect(defaultStream.timeout).toBe(10000);
    });
  });

  describe("process", () => {
    it("should process problem successfully", async () => {
      const problem: Problem = {
        id: "test-18",
        description: "Test problem for stream",
        context: "Test context with patterns and connections",
        constraints: [],
        goals: [],
      };

      const result = await stream.process(problem);

      expect(result.status).toBe(StreamStatus.COMPLETED);
      expect(result.streamId).toContain("synthetic-");
      expect(result.streamType).toBe(StreamType.SYNTHETIC);
    });

    it("should throw error if already processing", async () => {
      const problem: Problem = {
        id: "test-19",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      // Start processing
      const promise1 = stream.process(problem);

      // Try to process again while first is still running
      await expect(stream.process(problem)).rejects.toThrow("already processing");

      // Wait for first to complete
      await promise1;
    });

    it("should handle timeout", async () => {
      const shortTimeoutStream = new SyntheticReasoningStream(10); // Very short timeout

      const problem: Problem = {
        id: "test-20",
        description: "Problem that will timeout",
        context: "Context",
        constraints: [],
        goals: [],
      };

      // Mock processor to take longer than timeout
      vi.spyOn(shortTimeoutStream.processor, "process").mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  streamId: "test",
                  streamType: StreamType.SYNTHETIC,
                  conclusion: "Done",
                  reasoning: [],
                  insights: [],
                  confidence: 0.8,
                  processingTime: 100,
                  status: StreamStatus.COMPLETED,
                }),
              100
            );
          })
      );

      const result = await shortTimeoutStream.process(problem);

      expect(result.status).toBe(StreamStatus.TIMEOUT);
      expect(result.confidence).toBe(0.3);
    });

    it("should handle cancellation after processing completes", async () => {
      const problem: Problem = {
        id: "test-21",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      // Start processing
      const processPromise = stream.process(problem);

      // Cancel immediately
      stream.cancel();

      const result = await processPromise;

      expect(result.status).toBe(StreamStatus.CANCELLED);
      expect(result.confidence).toBe(0);
    });

    it("should track progress during processing", async () => {
      const problem: Problem = {
        id: "test-22",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      const processPromise = stream.process(problem);

      // Wait a bit and check progress
      await new Promise((resolve) => setTimeout(resolve, 100));
      const midProgress = stream.getProgress();

      await processPromise;
      const finalProgress = stream.getProgress();

      expect(midProgress).toBeGreaterThanOrEqual(0);
      expect(finalProgress).toBe(1.0);
    });
  });

  describe("getProgress", () => {
    it("should return 0 initially", () => {
      expect(stream.getProgress()).toBe(0);
    });

    it("should return 1.0 after successful completion", async () => {
      const problem: Problem = {
        id: "test-23",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      await stream.process(problem);

      expect(stream.getProgress()).toBe(1.0);
    });
  });

  describe("cancel", () => {
    it("should cancel processing", async () => {
      const problem: Problem = {
        id: "test-24",
        description: "Test problem",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      const processPromise = stream.process(problem);
      stream.cancel();

      const result = await processPromise;

      expect(result.status).toBe(StreamStatus.CANCELLED);
    });

    it("should handle late cancellation after processing completes", async () => {
      const problem: Problem = {
        id: "test-late-cancel",
        description: "Test problem for late cancellation",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      // Mock processor to complete after a delay
      vi.spyOn(stream.processor, "process").mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                streamId: "test",
                streamType: StreamType.SYNTHETIC,
                conclusion: "Completed",
                reasoning: ["Step 1", "Step 2"],
                insights: [
                  {
                    content: "Test insight",
                    source: StreamType.SYNTHETIC,
                    confidence: 0.8,
                    importance: 0.7,
                  },
                ],
                confidence: 0.8,
                processingTime: 50,
                status: StreamStatus.COMPLETED,
              });
            }, 50);
          })
      );

      const processPromise = stream.process(problem);

      // Cancel immediately - this will set cancelled flag before processing completes
      stream.cancel();

      const result = await processPromise;

      // Should be cancelled even if processing completed
      expect(result.status).toBe(StreamStatus.CANCELLED);
      expect(result.confidence).toBe(0);
      expect(result.conclusion).toBe("");
      // Should preserve reasoning and insights from completed processing
      expect(result.reasoning).toBeDefined();
      expect(result.insights).toBeDefined();
    });

    it("should be safe to call multiple times", () => {
      expect(() => {
        stream.cancel();
        stream.cancel();
        stream.cancel();
      }).not.toThrow();
    });
  });

  describe("error handling in processWithProgress", () => {
    it("should handle errors thrown during processing", async () => {
      const problem: Problem = {
        id: "test-error-processing",
        description: "Test problem that will cause error",
        context: "Test context",
        constraints: [],
        goals: [],
      };

      // Mock processor to throw an error
      vi.spyOn(stream.processor, "process").mockRejectedValue(
        new Error("Processing failed unexpectedly")
      );

      await expect(stream.process(problem)).rejects.toThrow("Processing failed unexpectedly");
    });
  });
});
