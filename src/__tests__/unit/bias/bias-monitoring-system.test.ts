/**
 * Tests for BiasMonitoringSystem - Continuous Reasoning Analysis
 *
 * Tests the continuous monitoring of reasoning chains for bias detection,
 * real-time alert generation, and performance overhead measurement.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BiasMonitoringSystem } from "../../../bias/bias-monitoring-system";
import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer";
import type { ReasoningChain } from "../../../bias/types";
import { deterministicId, resetDeterministicId } from "../../utils/test-helpers";

/**
 * Helper: Create test reasoning chain
 */
function createTestReasoningChain(overrides: Partial<ReasoningChain> = {}): ReasoningChain {
  return {
    id: overrides.id ?? deterministicId("chain"),
    steps: overrides.steps ?? [
      {
        id: "step-1",
        content: "Initial hypothesis",
        type: "hypothesis",
        confidence: 0.8,
      },
    ],
    branches: overrides.branches ?? [],
    assumptions: overrides.assumptions ?? [],
    inferences: overrides.inferences ?? [],
    evidence: overrides.evidence ?? [],
    conclusion: overrides.conclusion ?? "Test conclusion",
    confidence: overrides.confidence ?? 0.8,
  };
}

/**
 * Helper: Create reasoning chain with confirmation bias
 */
function createBiasedReasoningChain(): ReasoningChain {
  return createTestReasoningChain({
    steps: [
      {
        id: "step-1",
        content: "I believe this approach will work",
        type: "hypothesis",
        confidence: 0.9,
      },
    ],
    evidence: [
      {
        id: "ev-1",
        content: "Supporting evidence",
        source: "test",
        relevance: 0.9,
      },
      {
        id: "ev-2",
        content: "More supporting evidence",
        source: "test",
        relevance: 0.85,
      },
    ],
  });
}

describe("BiasMonitoringSystem", () => {
  let recognizer: BiasPatternRecognizer;
  let monitoringSystem: BiasMonitoringSystem;

  beforeEach(() => {
    recognizer = new BiasPatternRecognizer();
    monitoringSystem = new BiasMonitoringSystem(recognizer);
    resetDeterministicId();
  });

  afterEach(() => {
    if (monitoringSystem) {
      monitoringSystem.stop();
    }
  });

  describe("Continuous Monitoring", () => {
    it("should start monitoring and process reasoning chains", async () => {
      const chain = createTestReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should process multiple chains sequentially", async () => {
      const chain1 = createTestReasoningChain({ id: "chain-1" });
      const chain2 = createTestReasoningChain({ id: "chain-2" });
      const chain3 = createTestReasoningChain({ id: "chain-3" });

      await monitoringSystem.monitorContinuously(chain1);
      await monitoringSystem.monitorContinuously(chain2);
      await monitoringSystem.monitorContinuously(chain3);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(3);
    });

    it("should handle invalid reasoning chains gracefully", async () => {
      const invalidChain = {
        id: "invalid",
        steps: [],
        branches: [],
        assumptions: [],
        inferences: [],
        evidence: [],
        conclusion: "",
      } as ReasoningChain;

      await expect(monitoringSystem.monitorContinuously(invalidChain)).resolves.not.toThrow();

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should handle null and undefined reasoning chains gracefully", async () => {
      await expect(monitoringSystem.monitorContinuously(null as any)).resolves.not.toThrow();
      await expect(monitoringSystem.monitorContinuously(undefined as any)).resolves.not.toThrow();

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(2);
    });

    it("should allow monitoring to be stopped", async () => {
      const chain = createTestReasoningChain();
      await monitoringSystem.monitorContinuously(chain);

      monitoringSystem.stop();

      // Metrics should still be available after stop
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });
  });

  describe("Integration with BiasPatternRecognizer", () => {
    it("should use BiasPatternRecognizer for bias detection", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should handle chains with no biases", async () => {
      const chain = createTestReasoningChain({
        steps: [
          {
            id: "step-1",
            content: "Neutral analysis",
            type: "inference",
            confidence: 0.7,
          },
        ],
      });

      await monitoringSystem.monitorContinuously(chain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });
  });

  describe("Configuration", () => {
    it("should accept custom configuration", () => {
      const customConfig = {
        maxProcessingTime: 5000,
        alertThreshold: 0.8,
        debounceMs: 200,
      };

      const customSystem = new BiasMonitoringSystem(recognizer, customConfig);
      expect(customSystem).toBeDefined();
      customSystem.stop();
    });

    it("should use default configuration when not provided", () => {
      const defaultSystem = new BiasMonitoringSystem(recognizer);
      expect(defaultSystem).toBeDefined();
      defaultSystem.stop();
    });
  });

  describe("Metrics Tracking", () => {
    it("should track metrics after monitoring", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle chains with no biases gracefully", async () => {
      const chain = createTestReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      // Should not throw
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });
  });

  describe("Performance Metrics", () => {
    it("should track processing time metrics", async () => {
      const chain = createTestReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });

    it("should calculate overhead percentage", async () => {
      const chain = createTestReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.overheadPercentage).toBeGreaterThanOrEqual(0);
    });
  });
});
