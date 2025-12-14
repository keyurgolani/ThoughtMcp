/**
 * Consolidated tests for all Reasoning Streams
 *
 * Tests the four reasoning stream types:
 * - Analytical: Logical, systematic analysis
 * - Creative: Innovative, divergent thinking
 * - Critical: Skeptical, evaluative thinking
 * - Synthetic: Integrative, holistic thinking
 *
 * Each stream is tested for: initialization, processing, progress, cancellation, errors
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { ReasoningStream } from "../../../../reasoning/stream";
import { AnalyticalReasoningStream } from "../../../../reasoning/streams/analytical-stream";
import { CreativeReasoningStream } from "../../../../reasoning/streams/creative-stream";
import { CriticalReasoningStream } from "../../../../reasoning/streams/critical-stream";
import { SyntheticReasoningStream } from "../../../../reasoning/streams/synthetic-stream";
import type { Problem } from "../../../../reasoning/types";

// Shared test problem factory
const createTestProblem = (
  complexity: "simple" | "moderate" | "complex" = "moderate"
): Problem => ({
  id: "test-problem-1",
  description: "Analyze the root causes of declining user engagement",
  context: "User engagement has dropped 30% over the last quarter",
  constraints: ["Limited budget", "Must maintain current features"],
  goals: ["Identify root causes", "Propose actionable solutions"],
  complexity,
  urgency: "high",
});

const createInvalidProblem = (): Problem => ({
  id: "",
  description: "",
  context: "",
  constraints: [],
  goals: [],
  complexity: "simple",
  urgency: "low",
});

describe("AnalyticalReasoningStream", () => {
  let stream: ReasoningStream;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    stream = new AnalyticalReasoningStream();
  });

  describe("Initialization", () => {
    it("should create analytical stream with correct type and timeout", () => {
      expect(stream.type).toBe("analytical");
      expect(stream.id).toContain("analytical");
      expect(stream.timeout).toBe(10000);
      expect(stream.processor.getStreamType()).toBe("analytical");
    });

    it("should start analytical stream with progress at 0", () => {
      expect(stream.getProgress()).toBe(0);
    });
  });

  describe("Processing", () => {
    it("should process problem and return complete result", async () => {
      const result = await stream.process(testProblem);

      expect(result.streamType).toBe("analytical");
      expect(result.status).toBe("completed");
      expect(result.conclusion).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it("should perform logical step-by-step analysis", async () => {
      const result = await stream.process(testProblem);

      // Should have multiple reasoning steps showing logical progression
      expect(result.reasoning.length).toBeGreaterThan(3);
      const hasLogicalFlow = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("analyze") ||
          step.toLowerCase().includes("examine") ||
          step.toLowerCase().includes("consider")
      );
      expect(hasLogicalFlow).toBe(true);
    });
  });

  describe("Progress Tracking", () => {
    it("should reach analytical stream progress 1.0 on completion", async () => {
      await stream.process(testProblem);
      expect(stream.getProgress()).toBe(1);
    });
  });

  describe("Cancellation", () => {
    it("should return cancelled status when cancelled", async () => {
      const processPromise = stream.process(testProblem);
      stream.cancel();
      const result = await processPromise;

      expect(result.status).toBe("cancelled");
      expect(result.conclusion).toBe("");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for invalid problem", async () => {
      const invalidProblem = createInvalidProblem();
      await expect(stream.process(invalidProblem)).rejects.toThrow();
    });

    it("should throw error when processing already in progress", async () => {
      const firstProcess = stream.process(testProblem);
      await expect(stream.process(testProblem)).rejects.toThrow("Stream is already processing");
      await firstProcess;
    });
  });
});

describe("CreativeReasoningStream", () => {
  let stream: ReasoningStream;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    stream = new CreativeReasoningStream();
  });

  describe("Initialization", () => {
    it("should create creative stream with correct type and timeout", () => {
      expect(stream.type).toBe("creative");
      expect(stream.id).toContain("creative");
      expect(stream.timeout).toBe(10000);
    });

    it("should start creative stream with progress at 0", () => {
      expect(stream.getProgress()).toBe(0);
    });
  });

  describe("Processing", () => {
    it("should process problem and generate creative insights", async () => {
      const result = await stream.process(testProblem);

      expect(result.streamType).toBe("creative");
      expect(result.status).toBe("completed");
      expect(result.insights.length).toBeGreaterThanOrEqual(3);
    });

    it("should apply creative thinking techniques", async () => {
      const result = await stream.process(testProblem);

      const usesCreativeTechniques = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("analogy") ||
          step.toLowerCase().includes("metaphor") ||
          step.toLowerCase().includes("reframe") ||
          step.toLowerCase().includes("lateral") ||
          step.toLowerCase().includes("creative")
      );
      expect(usesCreativeTechniques).toBe(true);
    });
  });

  describe("Progress Tracking", () => {
    it("should reach creative stream progress 1.0 on completion", async () => {
      await stream.process(testProblem);
      expect(stream.getProgress()).toBe(1);
    });
  });

  describe("Cancellation", () => {
    it("should support creative stream cancellation", async () => {
      const processPromise = stream.process(testProblem);
      stream.cancel();
      const result = await processPromise;
      expect(result).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should throw error for invalid problem in creative stream", async () => {
      const invalidProblem = createInvalidProblem();
      await expect(stream.process(invalidProblem)).rejects.toThrow(
        "Invalid problem: missing required fields"
      );
    });
  });
});

describe("CriticalReasoningStream", () => {
  let stream: ReasoningStream;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    stream = new CriticalReasoningStream();
  });

  describe("Initialization", () => {
    it("should create critical stream with correct type and timeout", () => {
      expect(stream.type).toBe("critical");
      expect(stream.id).toContain("critical");
      expect(stream.timeout).toBe(10000);
    });

    it("should start critical stream with progress at 0", () => {
      expect(stream.getProgress()).toBe(0);
    });
  });

  describe("Processing", () => {
    it("should identify weaknesses and risks", async () => {
      const result = await stream.process(testProblem);

      expect(result.streamType).toBe("critical");
      expect(result.status).toBe("completed");

      const identifiesIssues = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("weakness") ||
          step.toLowerCase().includes("risk") ||
          step.toLowerCase().includes("assumption") ||
          step.toLowerCase().includes("flaw")
      );
      expect(identifiesIssues).toBe(true);
    });

    it("should challenge assumptions", async () => {
      const result = await stream.process(testProblem);

      const challengesAssumptions = result.reasoning.some(
        (step) =>
          step.toLowerCase().includes("assumption") ||
          step.toLowerCase().includes("assume") ||
          step.toLowerCase().includes("presume")
      );
      expect(challengesAssumptions).toBe(true);
    });
  });

  describe("Progress Tracking", () => {
    it("should reach critical stream progress 1.0 on completion", async () => {
      await stream.process(testProblem);
      expect(stream.getProgress()).toBe(1);
    });
  });

  describe("Cancellation", () => {
    it("should support critical stream cancellation", async () => {
      const processPromise = stream.process(testProblem);
      stream.cancel();
      const result = await processPromise;
      expect(result).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should throw error for invalid problem in critical stream", async () => {
      const invalidProblem = createInvalidProblem();
      await expect(stream.process(invalidProblem)).rejects.toThrow(
        "Invalid problem: missing required fields"
      );
    });
  });
});

describe("SyntheticReasoningStream", () => {
  let stream: SyntheticReasoningStream;
  let testProblem: Problem;

  beforeEach(() => {
    testProblem = createTestProblem();
    stream = new SyntheticReasoningStream();
  });

  describe("Initialization", () => {
    it("should create synthetic stream with correct type and timeout", () => {
      expect(stream.type).toBe("synthetic");
      expect(stream.id).toContain("synthetic");
      expect(stream.timeout).toBe(10000);
    });

    it("should start synthetic stream with progress at 0", () => {
      expect(stream.getProgress()).toBe(0);
    });
  });

  describe("Processing", () => {
    it("should identify patterns and connections", async () => {
      const problem: Problem = {
        id: "test-1",
        description: "System shows recurring failures and cascading effects",
        context: "Multiple components fail in sequence, suggesting systemic issues",
        constraints: [],
        goals: [],
      };

      const result = await stream.process(problem);

      expect(result.streamType).toBe("synthetic");
      expect(result.status).toBe("completed");
      expect(result.reasoning.some((r) => r.toLowerCase().includes("pattern"))).toBe(true);
    });

    it("should extract themes and synthesize insights", async () => {
      const problem: Problem = {
        id: "test-2",
        description: "Multiple issues around communication and collaboration",
        context: "Teams struggle with information sharing and coordination",
        constraints: [],
        goals: [],
      };

      const result = await stream.process(problem);

      expect(result.status).toBe("completed");
      expect(result.insights.length).toBeGreaterThan(0);
    });
  });

  describe("Progress Tracking", () => {
    it("should reach synthetic stream progress 1.0 on completion", async () => {
      await stream.process(testProblem);
      expect(stream.getProgress()).toBe(1);
    });
  });

  describe("Cancellation", () => {
    it("should support synthetic stream cancellation", async () => {
      const processPromise = stream.process(testProblem);
      stream.cancel();
      const result = await processPromise;
      expect(result).toBeDefined();
    });
  });
});
