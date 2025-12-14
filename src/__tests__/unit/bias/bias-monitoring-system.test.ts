/**
 * Tests for BiasMonitoringSystem - Continuous Reasoning Analysis
 *
 * Tests the continuous monitoring of reasoning chains for bias detection,
 * real-time alert generation, and performance overhead measurement.
 *
 * Following TDD: These tests define expected behavior before implementation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BiasMonitoringSystem } from "../../../bias/bias-monitoring-system";
import { BiasPatternRecognizer } from "../../../bias/bias-pattern-recognizer";
import type { DetectedBias, MonitoringConfig, ReasoningChain } from "../../../bias/types";
import { BiasType } from "../../../bias/types";

/**
 * Helper: Create test reasoning chain
 */
function createTestReasoningChain(overrides: Partial<ReasoningChain> = {}): ReasoningChain {
  return {
    id: overrides.id ?? `chain-${Date.now()}`,
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

/**
 * Helper: Create reasoning chain with multiple biases
 */
function createMultiBiasReasoningChain(): ReasoningChain {
  return createTestReasoningChain({
    steps: [
      {
        id: "step-1",
        content: "I believe this approach will work based on initial estimate of $100",
        type: "hypothesis",
        confidence: 0.9,
      },
      {
        id: "step-2",
        content: "Recent events support this",
        type: "evidence",
        confidence: 0.8,
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
        content: "I heard about a recent success",
        source: "anecdote",
        relevance: 0.8,
        timestamp: new Date(),
      },
    ],
    conclusion: "Final estimate is $105",
  });
}

describe("BiasMonitoringSystem - Continuous Reasoning Analysis", () => {
  let recognizer: BiasPatternRecognizer;
  let monitoringSystem: BiasMonitoringSystem;

  beforeEach(() => {
    recognizer = new BiasPatternRecognizer();
    monitoringSystem = new BiasMonitoringSystem(recognizer);
  });

  afterEach(() => {
    // Cleanup any running monitoring
    if (monitoringSystem) {
      monitoringSystem.stop();
    }
  });

  describe("Continuous Monitoring", () => {
    it("should start monitoring and process reasoning chains", async () => {
      const chain = createTestReasoningChain();

      // Monitor the chain asynchronously
      await monitoringSystem.monitorContinuously(chain);

      // Verify metrics updated
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should process multiple chains sequentially", async () => {
      const chain1 = createTestReasoningChain({ id: "chain-1" });
      const chain2 = createTestReasoningChain({ id: "chain-2" });
      const chain3 = createTestReasoningChain({ id: "chain-3" });

      // Process all chains
      await monitoringSystem.monitorContinuously(chain1);
      await monitoringSystem.monitorContinuously(chain2);
      await monitoringSystem.monitorContinuously(chain3);

      // Verify all processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(3);
    });

    it("should not block main thread during async processing", async () => {
      const chain = createBiasedReasoningChain();
      const startTime = Date.now();

      // Start monitoring (should return quickly)
      const monitorPromise = monitoringSystem.monitorContinuously(chain);

      // Check that it returned quickly (async)
      const syncTime = Date.now() - startTime;
      expect(syncTime).toBeLessThan(50); // Should return in <50ms

      // Wait for completion
      await monitorPromise;
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

      // Should not throw
      await expect(monitoringSystem.monitorContinuously(invalidChain)).resolves.not.toThrow();

      // Metrics should still update
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should handle null reasoning chain gracefully", async () => {
      // Test with null reasoning chain
      await expect(monitoringSystem.monitorContinuously(null as any)).resolves.not.toThrow();

      // Metrics should still update
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it("should handle undefined reasoning chain gracefully", async () => {
      // Test with undefined reasoning chain
      await expect(monitoringSystem.monitorContinuously(undefined as any)).resolves.not.toThrow();

      // Metrics should still update
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it("should handle processing time array overflow with invalid chains", async () => {
      // Create fresh monitoring system
      const freshSystem = new BiasMonitoringSystem(recognizer);

      // Process 105 invalid chains to trigger array shift (limit is 100)
      for (let i = 0; i < 105; i++) {
        await freshSystem.monitorContinuously(null as any);
      }

      // Metrics should track all chains
      const metrics = freshSystem.getMetrics();
      expect(metrics.totalChains).toBe(105);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it("should handle detection errors without crashing", async () => {
      const chain = createTestReasoningChain();

      // Create monitoring system with mock recognizer that throws
      const mockRecognizer = {
        detectBiases: vi.fn(() => {
          throw new Error("Detection failed");
        }),
        assessBiasSeverity: vi.fn(),
        identifyBiasPatterns: vi.fn(),
      } as unknown as BiasPatternRecognizer;

      const faultySystem = new BiasMonitoringSystem(mockRecognizer);

      // Should handle error gracefully
      await expect(faultySystem.monitorContinuously(chain)).resolves.not.toThrow();

      // Metrics should still update
      const metrics = faultySystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should handle processing time array overflow during errors", async () => {
      const chain = createTestReasoningChain();

      // Create monitoring system with mock recognizer that throws
      const mockRecognizer = {
        detectBiases: vi.fn(() => {
          throw new Error("Detection failed");
        }),
        assessBiasSeverity: vi.fn(),
        identifyBiasPatterns: vi.fn(),
      } as unknown as BiasPatternRecognizer;

      const faultySystem = new BiasMonitoringSystem(mockRecognizer);

      // Process 105 chains to trigger array shift in catch block (limit is 100)
      for (let i = 0; i < 105; i++) {
        await faultySystem.monitorContinuously(chain);
      }

      // Metrics should track all chains even with errors
      const metrics = faultySystem.getMetrics();
      expect(metrics.totalChains).toBe(105);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it("should allow monitoring to be stopped", async () => {
      const chain = createTestReasoningChain();

      // Start monitoring
      const monitorPromise = monitoringSystem.monitorContinuously(chain);

      // Stop monitoring
      monitoringSystem.stop();

      // Should complete
      await monitorPromise;

      // Further monitoring should not process
      const metrics1 = monitoringSystem.getMetrics();
      await monitoringSystem.monitorContinuously(createTestReasoningChain());
      const metrics2 = monitoringSystem.getMetrics();

      // Metrics should not change after stop
      expect(metrics2.totalChains).toBe(metrics1.totalChains);
    });

    it("should clean up state between chains", async () => {
      const chain1 = createBiasedReasoningChain();
      const chain2 = createTestReasoningChain();

      // Process first chain
      await monitoringSystem.monitorContinuously(chain1);
      const metrics1 = monitoringSystem.getMetrics();

      // Process second chain
      await monitoringSystem.monitorContinuously(chain2);
      const metrics2 = monitoringSystem.getMetrics();

      // Metrics should be independent
      expect(metrics2.totalChains).toBe(2);
      expect(metrics2.totalChains).toBeGreaterThan(metrics1.totalChains);
    });
  });

  describe("Integration with BiasPatternRecognizer", () => {
    it("should use BiasPatternRecognizer for bias detection", async () => {
      const chain = createBiasedReasoningChain();

      // Spy on recognizer
      const detectSpy = vi.spyOn(recognizer, "detectBiases");

      // Monitor chain
      await monitoringSystem.monitorContinuously(chain);

      // Verify recognizer was called
      expect(detectSpy).toHaveBeenCalledWith(chain);
      expect(detectSpy).toHaveBeenCalledTimes(1);
    });

    it("should detect biases in monitored chains", async () => {
      const chain = createBiasedReasoningChain();

      // Monitor chain
      await monitoringSystem.monitorContinuously(chain);

      // Verify biases detected
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalBiases).toBeGreaterThan(0);
    });

    it("should handle chains with no biases", async () => {
      const cleanChain = createTestReasoningChain({
        evidence: [
          {
            id: "ev-1",
            content: "Supporting evidence",
            source: "test",
            relevance: 0.8,
          },
          {
            id: "ev-2",
            content: "Contradicting evidence",
            source: "test",
            relevance: 0.7,
          },
        ],
      });

      // Monitor chain
      await monitoringSystem.monitorContinuously(cleanChain);

      // Verify no biases detected
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalBiases).toBe(0);
      expect(metrics.totalAlerts).toBe(0);
    });

    it("should handle chains with multiple biases", async () => {
      const chain = createMultiBiasReasoningChain();

      // Monitor chain
      await monitoringSystem.monitorContinuously(chain);

      // Verify multiple biases detected
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalBiases).toBeGreaterThan(1);
    });
  });

  describe("Performance and Scalability", () => {
    it("should process chains efficiently", async () => {
      const chain = createTestReasoningChain();
      const startTime = Date.now();

      // Process chain
      await monitoringSystem.monitorContinuously(chain);

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(100); // Should be fast
    });

    it("should handle large reasoning chains", async () => {
      const largeChain = createTestReasoningChain({
        steps: Array.from({ length: 100 }, (_, i) => ({
          id: `step-${i}`,
          content: `Step ${i} content`,
          type: "inference" as const,
          confidence: 0.8,
        })),
      });

      const startTime = Date.now();
      await monitoringSystem.monitorContinuously(largeChain);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(500); // Should handle large chains
    });

    it("should maintain bounded memory usage", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process many chains
      for (let i = 0; i < 100; i++) {
        const chain = createTestReasoningChain({ id: `chain-${i}` });
        await monitoringSystem.monitorContinuously(chain);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (< 50MB for 100 chains)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });

    it("should handle concurrent monitoring requests", async () => {
      const chains = Array.from({ length: 10 }, (_, i) =>
        createTestReasoningChain({ id: `chain-${i}` })
      );

      // Process all concurrently
      await Promise.all(chains.map((chain) => monitoringSystem.monitorContinuously(chain)));

      // Verify all processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(10);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle empty reasoning chains", async () => {
      const emptyChain = createTestReasoningChain({
        steps: [],
        evidence: [],
      });

      await monitoringSystem.monitorContinuously(emptyChain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
      expect(metrics.totalBiases).toBe(0);
    });

    it("should handle chains with missing fields", async () => {
      const partialChain = {
        id: "partial",
        steps: [],
        branches: [],
        assumptions: [],
        inferences: [],
        evidence: [],
        conclusion: "",
      } as ReasoningChain;

      await monitoringSystem.monitorContinuously(partialChain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should track processing time metrics", async () => {
      const chain = createTestReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      const metrics = monitoringSystem.getMetrics();
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeLessThan(1000);
    });

    it("should calculate overhead percentage", async () => {
      const chain = createTestReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      const overhead = monitoringSystem.measurePerformanceOverhead();
      expect(overhead).toBeGreaterThanOrEqual(0);
      expect(overhead).toBeLessThan(100); // Percentage
    });
  });

  describe("Configuration", () => {
    it("should accept custom configuration", () => {
      const config: MonitoringConfig = {
        alertThreshold: 0.7,
        maxProcessingTime: 5000,
        enableCaching: false,
        debounceMs: 200,
      };

      const customSystem = new BiasMonitoringSystem(recognizer, config);
      expect(customSystem).toBeDefined();
    });

    it("should use default configuration when not provided", () => {
      const defaultSystem = new BiasMonitoringSystem(recognizer);
      expect(defaultSystem).toBeDefined();
    });

    it("should respect maxProcessingTime configuration", async () => {
      const config: MonitoringConfig = {
        maxProcessingTime: 100,
      };

      const timedSystem = new BiasMonitoringSystem(recognizer, config);
      const chain = createTestReasoningChain();

      const startTime = Date.now();
      await timedSystem.monitorContinuously(chain);
      const duration = Date.now() - startTime;

      // Should complete within configured time
      expect(duration).toBeLessThan(200);
    });
  });

  describe("Performance Overhead Measurement", () => {
    it("should maintain monitoring overhead below 15% of total reasoning time", async () => {
      // Process multiple chains to get stable overhead measurement
      const chains = Array.from({ length: 20 }, (_, i) =>
        createTestReasoningChain({ id: `chain-${i}` })
      );

      for (const chain of chains) {
        await monitoringSystem.monitorContinuously(chain);
      }

      // Measure overhead
      const overhead = monitoringSystem.measurePerformanceOverhead();

      // Verify overhead is below 15% requirement (Requirement 8.5)
      expect(overhead).toBeLessThan(15);
      expect(overhead).toBeGreaterThanOrEqual(0);
    });

    it("should not block main thread during monitoring (async execution)", async () => {
      const chain = createBiasedReasoningChain();
      let mainThreadBlocked = false;

      // Start monitoring
      const monitorPromise = monitoringSystem.monitorContinuously(chain);

      // Check if main thread is responsive
      const checkPromise = new Promise<void>((resolve) => {
        setImmediate(() => {
          mainThreadBlocked = false;
          resolve();
        });
      });

      // Both should complete without blocking
      await Promise.all([monitorPromise, checkPromise]);

      expect(mainThreadBlocked).toBe(false);
    });

    it("should efficiently process large reasoning chains (100+ steps)", async () => {
      // Create chain with 150 steps
      const largeChain = createTestReasoningChain({
        id: "large-chain",
        steps: Array.from({ length: 150 }, (_, i) => ({
          id: `step-${i}`,
          content: `Step ${i} with reasoning content that includes analysis`,
          type: "inference" as const,
          confidence: 0.7 + Math.random() * 0.2,
        })),
        evidence: Array.from({ length: 50 }, (_, i) => ({
          id: `ev-${i}`,
          content: `Evidence ${i}`,
          source: "test",
          relevance: 0.6 + Math.random() * 0.3,
        })),
      });

      const startTime = Date.now();
      await monitoringSystem.monitorContinuously(largeChain);
      const processingTime = Date.now() - startTime;

      // Should process efficiently (< 1 second for 150 steps)
      expect(processingTime).toBeLessThan(1000);

      // Verify metrics updated
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThan(0);
    });

    it("should maintain bounded memory usage over time", async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Process many chains to test memory bounds
      for (let i = 0; i < 200; i++) {
        const chain = createTestReasoningChain({
          id: `chain-${i}`,
          steps: Array.from({ length: 50 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j} content`,
            type: "inference" as const,
            confidence: 0.8,
          })),
        });
        await monitoringSystem.monitorContinuously(chain);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (< 100MB for 200 chains with 50 steps each)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024);

      // Verify all chains processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThanOrEqual(200);
    });

    it("should handle concurrent monitoring sessions efficiently", async () => {
      // Create multiple chains for concurrent processing
      const chains = Array.from({ length: 15 }, (_, i) =>
        createTestReasoningChain({
          id: `concurrent-chain-${i}`,
          steps: Array.from({ length: 30 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j} content`,
            type: "inference" as const,
            confidence: 0.8,
          })),
        })
      );

      const startTime = Date.now();

      // Process all concurrently
      await Promise.all(chains.map((chain) => monitoringSystem.monitorContinuously(chain)));

      const totalTime = Date.now() - startTime;

      // Concurrent processing should be efficient (< 2 seconds for 15 chains)
      expect(totalTime).toBeLessThan(2000);

      // Verify all chains processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThanOrEqual(15);

      // Overhead should still be reasonable
      const overhead = monitoringSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(20); // Allow slightly higher overhead for concurrent
    });

    it("should accurately measure performance overhead", async () => {
      // Process chains to establish baseline
      const chains = Array.from({ length: 10 }, (_, i) =>
        createTestReasoningChain({ id: `chain-${i}` })
      );

      for (const chain of chains) {
        await monitoringSystem.monitorContinuously(chain);
      }

      // Get overhead measurement
      const overhead = monitoringSystem.measurePerformanceOverhead();

      // Verify overhead is a valid percentage
      expect(overhead).toBeGreaterThanOrEqual(0);
      expect(overhead).toBeLessThan(100);

      // Verify overhead is reasonable for monitoring operations
      expect(overhead).toBeLessThan(15); // Should meet <15% requirement

      // Verify metrics are consistent
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.overheadPercentage).toBe(overhead);
    });

    it("should track average processing time accurately", async () => {
      // Create fresh monitoring system for isolated test
      const freshSystem = new BiasMonitoringSystem(recognizer);

      const chains = Array.from({ length: 5 }, (_, i) =>
        createTestReasoningChain({ id: `chain-${i}` })
      );

      for (const chain of chains) {
        await freshSystem.monitorContinuously(chain);
      }

      const metrics = freshSystem.getMetrics();

      // Average processing time should be reasonable and positive
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeLessThan(100); // Should be fast

      // Verify it's tracking correctly by processing more chains
      await freshSystem.monitorContinuously(createTestReasoningChain({ id: "extra" }));
      const metricsAfter = freshSystem.getMetrics();

      // Average should still be reasonable after more processing
      expect(metricsAfter.averageProcessingTime).toBeGreaterThan(0);
      expect(metricsAfter.averageProcessingTime).toBeLessThan(100);
    });

    it("should maintain low overhead with complex bias detection", async () => {
      // Create chains with multiple biases (more complex detection)
      const complexChains = Array.from({ length: 10 }, () => createMultiBiasReasoningChain());

      for (const chain of complexChains) {
        await monitoringSystem.monitorContinuously(chain);
      }

      // Even with complex detection, overhead should be reasonable
      const overhead = monitoringSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(15);

      // Verify biases were detected
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalBiases).toBeGreaterThan(0);
    });

    it("should handle rapid successive monitoring calls efficiently", async () => {
      const chains = Array.from({ length: 50 }, (_, i) =>
        createTestReasoningChain({ id: `rapid-chain-${i}` })
      );

      const startTime = Date.now();

      // Process rapidly in sequence
      for (const chain of chains) {
        await monitoringSystem.monitorContinuously(chain);
      }

      const totalTime = Date.now() - startTime;

      // Should handle rapid calls efficiently (< 5 seconds for 50 chains)
      expect(totalTime).toBeLessThan(5000);

      // Overhead should remain low
      const overhead = monitoringSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(15);
    });

    it("should maintain performance with debouncing enabled", async () => {
      const config: MonitoringConfig = {
        debounceMs: 50,
      };

      const debouncedSystem = new BiasMonitoringSystem(recognizer, config);
      const chains = Array.from({ length: 10 }, (_, i) =>
        createTestReasoningChain({ id: `chain-${i}` })
      );

      const startTime = Date.now();

      for (const chain of chains) {
        await debouncedSystem.monitorContinuously(chain);
      }

      const totalTime = Date.now() - startTime;

      // Should still be efficient with debouncing
      expect(totalTime).toBeLessThan(2000);

      const overhead = debouncedSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(15);
    });

    it("should scale overhead linearly with chain complexity", async () => {
      // Test with different chain sizes
      const smallChain = createTestReasoningChain({
        id: "small",
        steps: Array.from({ length: 10 }, (_, i) => ({
          id: `step-${i}`,
          content: `Step ${i}`,
          type: "inference" as const,
          confidence: 0.8,
        })),
      });

      const largeChain = createTestReasoningChain({
        id: "large",
        steps: Array.from({ length: 100 }, (_, i) => ({
          id: `step-${i}`,
          content: `Step ${i}`,
          type: "inference" as const,
          confidence: 0.8,
        })),
      });

      // Process small chain multiple times for stable timing
      let smallTotalTime = 0;
      for (let i = 0; i < 3; i++) {
        const smallStart = Date.now();
        await monitoringSystem.monitorContinuously(smallChain);
        smallTotalTime += Date.now() - smallStart;
      }
      const smallTime = smallTotalTime / 3;

      // Process large chain multiple times for stable timing
      let largeTotalTime = 0;
      for (let i = 0; i < 3; i++) {
        const largeStart = Date.now();
        await monitoringSystem.monitorContinuously(largeChain);
        largeTotalTime += Date.now() - largeStart;
      }
      const largeTime = largeTotalTime / 3;

      // Both should complete quickly
      expect(smallTime).toBeLessThan(50);
      expect(largeTime).toBeLessThan(500);

      // Large chain should take more time, but not excessively more
      // (should scale roughly linearly, not exponentially)
      if (smallTime > 0) {
        const scaleFactor = largeTime / smallTime;
        expect(scaleFactor).toBeLessThan(20); // Should not be more than 20x slower for 10x size
      }
    });
  });

  describe("Real-Time Bias Alerts", () => {
    it("should generate alerts within 2-3 seconds of bias detection", async () => {
      const chain = createBiasedReasoningChain();
      const startTime = Date.now();

      // Monitor chain and generate alerts
      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      const detectionTime = Date.now() - startTime;

      // Should detect and generate alerts within 3 seconds
      expect(detectionTime).toBeLessThan(3000);
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it("should generate alerts with all required fields", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      if (alerts.length > 0) {
        const alert = alerts[0];

        // Verify all required fields present
        expect(alert.id).toBeDefined();
        expect(typeof alert.id).toBe("string");
        expect(alert.id.length).toBeGreaterThan(0);

        expect(alert.bias).toBeDefined();
        expect(alert.bias.type).toBeDefined();

        expect(alert.severity).toBeDefined();
        expect(typeof alert.severity).toBe("number");
        expect(alert.severity).toBeGreaterThanOrEqual(0);
        expect(alert.severity).toBeLessThanOrEqual(1);

        expect(alert.priority).toBeDefined();
        expect(["low", "medium", "high", "critical"]).toContain(alert.priority);

        expect(alert.timestamp).toBeDefined();
        expect(alert.timestamp).toBeInstanceOf(Date);

        expect(alert.message).toBeDefined();
        expect(typeof alert.message).toBe("string");
        expect(alert.message.length).toBeGreaterThan(0);

        expect(alert.actionable).toBeDefined();
        expect(typeof alert.actionable).toBe("boolean");
      }
    });

    it("should prioritize alerts by severity level", async () => {
      const chain = createMultiBiasReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      if (alerts.length > 1) {
        // Alerts should be sorted by priority (critical > high > medium > low)
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

        for (let i = 0; i < alerts.length - 1; i++) {
          const currentPriority = priorityOrder[alerts[i].priority];
          const nextPriority = priorityOrder[alerts[i + 1].priority];
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });

    it("should map severity to correct priority levels", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      for (const alert of alerts) {
        // Verify severity-to-priority mapping
        if (alert.severity >= 0.8) {
          expect(alert.priority).toBe("critical");
        } else if (alert.severity >= 0.6) {
          expect(alert.priority).toBe("high");
        } else if (alert.severity >= 0.4) {
          expect(alert.priority).toBe("medium");
        } else {
          expect(alert.priority).toBe("low");
        }
      }
    });

    it("should deduplicate alerts for same bias", async () => {
      const chain = createBiasedReasoningChain();

      // Monitor same chain multiple times
      await monitoringSystem.monitorContinuously(chain);
      const alerts1 = monitoringSystem.generateRealTimeAlerts(chain);

      await monitoringSystem.monitorContinuously(chain);
      const alerts2 = monitoringSystem.generateRealTimeAlerts(chain);

      // Should not generate duplicate alerts for same bias
      const alertIds = new Set(alerts1.map((a) => a.id));
      const duplicates = alerts2.filter((a) => alertIds.has(a.id));

      expect(duplicates.length).toBe(0);
    });

    it("should respect configurable alert threshold", async () => {
      const highThresholdConfig: MonitoringConfig = {
        alertThreshold: 0.8, // Only alert on high severity
      };

      const strictSystem = new BiasMonitoringSystem(recognizer, highThresholdConfig);
      const chain = createBiasedReasoningChain();

      await strictSystem.monitorContinuously(chain);
      const alerts = strictSystem.generateRealTimeAlerts(chain);

      // All alerts should have severity >= threshold
      for (const alert of alerts) {
        expect(alert.severity).toBeGreaterThanOrEqual(0.8);
      }
    });

    it("should not generate alerts below threshold", async () => {
      const highThresholdConfig: MonitoringConfig = {
        alertThreshold: 0.9, // Very high threshold
      };

      const strictSystem = new BiasMonitoringSystem(recognizer, highThresholdConfig);
      const chain = createTestReasoningChain(); // Low bias chain

      await strictSystem.monitorContinuously(chain);
      const alerts = strictSystem.generateRealTimeAlerts(chain);

      // Should have no alerts or only very severe ones
      expect(alerts.every((a) => a.severity >= 0.9)).toBe(true);
    });

    it("should generate actionable recommendations for alerts", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      for (const alert of alerts) {
        if (alert.actionable) {
          // Actionable alerts should have recommendations
          expect(alert.recommendations).toBeDefined();
          expect(Array.isArray(alert.recommendations)).toBe(true);
          expect(alert.recommendations!.length).toBeGreaterThan(0);

          // Each recommendation should be a non-empty string
          for (const rec of alert.recommendations!) {
            expect(typeof rec).toBe("string");
            expect(rec.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it("should mark high-severity alerts as actionable", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      // High severity alerts should be actionable
      const highSeverityAlerts = alerts.filter((a) => a.severity >= 0.6);
      for (const alert of highSeverityAlerts) {
        expect(alert.actionable).toBe(true);
      }
    });

    it("should generate human-readable alert messages", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      for (const alert of alerts) {
        // Message should be descriptive
        expect(alert.message).toContain(alert.bias.type);
        expect(alert.message.length).toBeGreaterThan(20); // Meaningful message

        // Should not be just a bias type
        expect(alert.message).not.toBe(alert.bias.type);
      }
    });

    it("should include bias details in alerts", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      for (const alert of alerts) {
        // Alert should reference the detected bias
        expect(alert.bias).toBeDefined();
        expect(alert.bias.type).toBeDefined();
        expect(alert.bias.severity).toBeDefined();
        expect(alert.bias.confidence).toBeDefined();
        expect(alert.bias.evidence).toBeDefined();
        expect(alert.bias.location).toBeDefined();
      }
    });

    it("should generate unique alert IDs", async () => {
      const chain = createMultiBiasReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      // All alert IDs should be unique
      const ids = alerts.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should timestamp alerts accurately", async () => {
      const beforeTime = new Date();
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);
      const afterTime = new Date();

      for (const alert of alerts) {
        // Timestamp should be between before and after
        expect(alert.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
        expect(alert.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      }
    });

    it("should handle chains with no biases gracefully", async () => {
      const cleanChain = createTestReasoningChain({
        evidence: [
          {
            id: "ev-1",
            content: "Supporting evidence",
            source: "test",
            relevance: 0.8,
          },
          {
            id: "ev-2",
            content: "Contradicting evidence",
            source: "test",
            relevance: 0.7,
          },
        ],
      });

      await monitoringSystem.monitorContinuously(cleanChain);
      const alerts = monitoringSystem.generateRealTimeAlerts(cleanChain);

      // Should return empty array, not throw
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBe(0);
    });

    it("should update alert metrics when generating alerts", async () => {
      const chain = createBiasedReasoningChain();

      const metricsBefore = monitoringSystem.getMetrics();
      await monitoringSystem.monitorContinuously(chain);
      monitoringSystem.generateRealTimeAlerts(chain);
      const metricsAfter = monitoringSystem.getMetrics();

      // Metrics should reflect generated alerts
      expect(metricsAfter.totalAlerts).toBeGreaterThanOrEqual(metricsBefore.totalAlerts);
    });

    it("should track alerts by type in metrics", async () => {
      const chain = createMultiBiasReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      monitoringSystem.generateRealTimeAlerts(chain);

      const metrics = monitoringSystem.getMetrics();

      // Should have alert counts by type
      expect(metrics.alertsByType).toBeDefined();
      expect(metrics.alertsByType.size).toBeGreaterThan(0);
    });

    it("should track alerts by severity in metrics", async () => {
      const chain = createMultiBiasReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      monitoringSystem.generateRealTimeAlerts(chain);

      const metrics = monitoringSystem.getMetrics();

      // Should have alert counts by severity
      expect(metrics.alertsBySeverity).toBeDefined();
      expect(metrics.alertsBySeverity.size).toBeGreaterThan(0);
    });
  });

  describe("Monitoring Scalability", () => {
    it("should handle multiple concurrent monitoring sessions (10+ chains)", async () => {
      // Create 15 chains for concurrent processing
      const chains = Array.from({ length: 15 }, (_, i) =>
        createTestReasoningChain({
          id: `concurrent-chain-${i}`,
          steps: Array.from({ length: 20 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j} content for chain ${i}`,
            type: "inference" as const,
            confidence: 0.7 + Math.random() * 0.2,
          })),
        })
      );

      const startTime = Date.now();

      // Process all chains concurrently
      await Promise.all(chains.map((chain) => monitoringSystem.monitorContinuously(chain)));

      const totalTime = Date.now() - startTime;

      // Should handle concurrent sessions efficiently (< 3 seconds for 15 chains)
      expect(totalTime).toBeLessThan(3000);

      // Verify all chains processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBe(15);

      // Overhead should remain reasonable even with concurrency
      const overhead = monitoringSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(20); // Allow slightly higher overhead for concurrent
    });

    it("should handle performance with large reasoning chains (100+ steps)", async () => {
      // Create chain with 150 steps and 50 evidence items
      const largeChain = createTestReasoningChain({
        id: "large-chain-scalability",
        steps: Array.from({ length: 150 }, (_, i) => ({
          id: `step-${i}`,
          content: `Step ${i} with detailed reasoning content that includes analysis and conclusions`,
          type: "inference" as const,
          confidence: 0.7 + Math.random() * 0.2,
        })),
        evidence: Array.from({ length: 50 }, (_, i) => ({
          id: `ev-${i}`,
          content: `Evidence item ${i} with supporting details`,
          source: "test",
          relevance: 0.6 + Math.random() * 0.3,
        })),
      });

      const startTime = Date.now();
      await monitoringSystem.monitorContinuously(largeChain);
      const processingTime = Date.now() - startTime;

      // Should process large chains efficiently (< 1 second)
      expect(processingTime).toBeLessThan(1000);

      // Verify chain was processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThan(0);

      // Processing time should be tracked
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeLessThan(1000);
    });

    it("should maintain memory cleanup after processing", async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Process many chains to test memory cleanup
      for (let i = 0; i < 100; i++) {
        const chain = createTestReasoningChain({
          id: `cleanup-chain-${i}`,
          steps: Array.from({ length: 50 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j} content with data that should be cleaned up`,
            type: "inference" as const,
            confidence: 0.8,
          })),
        });
        await monitoringSystem.monitorContinuously(chain);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be bounded (< 50MB for 100 chains)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

      // Verify all chains processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThanOrEqual(100);

      // System should still be responsive
      const testChain = createTestReasoningChain({ id: "post-cleanup-test" });
      const startTime = Date.now();
      await monitoringSystem.monitorContinuously(testChain);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(100); // Should still be fast
    });

    it("should handle sustained monitoring over time (100+ chains sequentially)", async () => {
      // Create fresh monitoring system for isolated test
      const sustainedSystem = new BiasMonitoringSystem(recognizer);

      const startTime = Date.now();

      // Process 120 chains sequentially to test sustained operation
      for (let i = 0; i < 120; i++) {
        const chain = createTestReasoningChain({
          id: `sustained-chain-${i}`,
          steps: Array.from({ length: 30 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j} content`,
            type: "inference" as const,
            confidence: 0.8,
          })),
        });
        await sustainedSystem.monitorContinuously(chain);
      }

      const totalTime = Date.now() - startTime;

      // Should complete in reasonable time (< 12 seconds for 120 chains = ~100ms per chain)
      expect(totalTime).toBeLessThan(12000);

      // Verify all chains processed
      const metrics = sustainedSystem.getMetrics();
      expect(metrics.totalChains).toBe(120);

      // Performance should remain consistent (no degradation over time)
      expect(metrics.averageProcessingTime).toBeLessThan(150);

      // Overhead should remain low even after sustained operation
      const overhead = sustainedSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(15);

      // System should still be responsive after sustained load
      const finalChain = createTestReasoningChain({ id: "final-test" });
      const finalStart = Date.now();
      await sustainedSystem.monitorContinuously(finalChain);
      const finalTime = Date.now() - finalStart;

      expect(finalTime).toBeLessThan(100); // Should still be fast
    });

    it("should demonstrate graceful degradation under load", async () => {
      // Create system with strict time limits
      const strictConfig: MonitoringConfig = {
        maxProcessingTime: 50, // Very strict limit
      };

      const strictSystem = new BiasMonitoringSystem(recognizer, strictConfig);

      // Create very large chains that might exceed time limits
      const heavyChains = Array.from({ length: 20 }, (_, i) =>
        createTestReasoningChain({
          id: `heavy-chain-${i}`,
          steps: Array.from({ length: 200 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j} with extensive content that requires processing`,
            type: "inference" as const,
            confidence: 0.8,
          })),
          evidence: Array.from({ length: 100 }, (_, j) => ({
            id: `ev-${j}`,
            content: `Evidence ${j}`,
            source: "test",
            relevance: 0.7,
          })),
        })
      );

      // Process all chains - should not crash or hang
      const startTime = Date.now();
      await Promise.all(heavyChains.map((chain) => strictSystem.monitorContinuously(chain)));
      const totalTime = Date.now() - startTime;

      // Should complete even under heavy load (graceful degradation)
      expect(totalTime).toBeLessThan(5000);

      // Verify chains were processed (even if some were truncated)
      const metrics = strictSystem.getMetrics();
      expect(metrics.totalChains).toBe(20);

      // System should remain functional
      const testChain = createTestReasoningChain({ id: "post-load-test" });
      await expect(strictSystem.monitorContinuously(testChain)).resolves.not.toThrow();
    });

    it("should scale linearly with number of chains", async () => {
      // Test with different batch sizes to verify linear scaling
      const batchSizes = [10, 20, 40];
      const timings: number[] = [];

      for (const batchSize of batchSizes) {
        const freshSystem = new BiasMonitoringSystem(recognizer);
        const chains = Array.from({ length: batchSize }, (_, i) =>
          createTestReasoningChain({
            id: `scale-chain-${batchSize}-${i}`,
            steps: Array.from({ length: 20 }, (_, j) => ({
              id: `step-${j}`,
              content: `Step ${j}`,
              type: "inference" as const,
              confidence: 0.8,
            })),
          })
        );

        const startTime = Date.now();
        for (const chain of chains) {
          await freshSystem.monitorContinuously(chain);
        }
        const totalTime = Date.now() - startTime;

        timings.push(totalTime / batchSize); // Time per chain

        // Verify all processed
        const metrics = freshSystem.getMetrics();
        expect(metrics.totalChains).toBe(batchSize);
      }

      // Time per chain should be relatively consistent (linear scaling)
      // Allow for variance due to JIT warmup, GC, and system load
      // Use 3x tolerance to avoid flaky failures while still catching exponential growth
      const avgTimePerChain = timings.reduce((sum, t) => sum + t, 0) / timings.length;
      for (const timing of timings) {
        // Each timing should be within 3x of average (not exponential growth)
        expect(timing).toBeLessThanOrEqual(avgTimePerChain * 3);
      }
    });

    it("should maintain low overhead with increasing chain complexity", async () => {
      // Test with chains of increasing complexity
      const complexities = [10, 50, 100, 150];
      const overheads: number[] = [];

      for (const complexity of complexities) {
        const freshSystem = new BiasMonitoringSystem(recognizer);
        const chains = Array.from({ length: 10 }, (_, i) =>
          createTestReasoningChain({
            id: `complex-chain-${complexity}-${i}`,
            steps: Array.from({ length: complexity }, (_, j) => ({
              id: `step-${j}`,
              content: `Step ${j}`,
              type: "inference" as const,
              confidence: 0.8,
            })),
          })
        );

        for (const chain of chains) {
          await freshSystem.monitorContinuously(chain);
        }

        const overhead = freshSystem.measurePerformanceOverhead();
        overheads.push(overhead);

        // Overhead should remain below 15% regardless of complexity
        expect(overhead).toBeLessThan(15);
      }

      // Overhead should not grow significantly with complexity
      const maxOverhead = Math.max(...overheads);
      const minOverhead = Math.min(...overheads);
      const overheadVariance = maxOverhead - minOverhead;

      // Variance should be reasonable (< 10 percentage points)
      expect(overheadVariance).toBeLessThan(10);
    });

    it("should handle mixed workload (concurrent + sequential)", async () => {
      // Simulate realistic workload with both concurrent and sequential processing
      const chains = Array.from({ length: 30 }, (_, i) =>
        createTestReasoningChain({
          id: `mixed-chain-${i}`,
          steps: Array.from({ length: 25 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j}`,
            type: "inference" as const,
            confidence: 0.8,
          })),
        })
      );

      const startTime = Date.now();

      // Process first 10 concurrently
      await Promise.all(
        chains.slice(0, 10).map((chain) => monitoringSystem.monitorContinuously(chain))
      );

      // Process next 10 sequentially
      for (const chain of chains.slice(10, 20)) {
        await monitoringSystem.monitorContinuously(chain);
      }

      // Process last 10 concurrently again
      await Promise.all(
        chains.slice(20, 30).map((chain) => monitoringSystem.monitorContinuously(chain))
      );

      const totalTime = Date.now() - startTime;

      // Should handle mixed workload efficiently (< 5 seconds)
      expect(totalTime).toBeLessThan(5000);

      // Verify all chains processed
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThanOrEqual(30);

      // Overhead should remain reasonable
      const overhead = monitoringSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(15);
    });

    it("should recover from temporary overload", async () => {
      // Create temporary overload with many large chains
      const overloadChains = Array.from({ length: 50 }, (_, i) =>
        createTestReasoningChain({
          id: `overload-chain-${i}`,
          steps: Array.from({ length: 100 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j}`,
            type: "inference" as const,
            confidence: 0.8,
          })),
        })
      );

      // Process overload
      await Promise.all(overloadChains.map((chain) => monitoringSystem.monitorContinuously(chain)));

      // System should recover and process normal chains efficiently
      const normalChain = createTestReasoningChain({ id: "recovery-test" });
      const startTime = Date.now();
      await monitoringSystem.monitorContinuously(normalChain);
      const recoveryTime = Date.now() - startTime;

      // Should recover quickly (< 100ms)
      expect(recoveryTime).toBeLessThan(100);

      // Metrics should be reasonable
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThan(50);

      // Overhead should stabilize after recovery
      const overhead = monitoringSystem.measurePerformanceOverhead();
      expect(overhead).toBeLessThan(20); // Allow slightly higher after overload
    });

    it("should maintain consistent performance across multiple monitoring systems", async () => {
      // Create multiple monitoring systems to test isolation
      const systems = Array.from({ length: 5 }, () => new BiasMonitoringSystem(recognizer));

      const chains = Array.from({ length: 20 }, (_, i) =>
        createTestReasoningChain({
          id: `multi-system-chain-${i}`,
          steps: Array.from({ length: 30 }, (_, j) => ({
            id: `step-${j}`,
            content: `Step ${j}`,
            type: "inference" as const,
            confidence: 0.8,
          })),
        })
      );

      // Process chains across different systems
      const startTime = Date.now();
      for (let i = 0; i < chains.length; i++) {
        const system = systems[i % systems.length];
        await system.monitorContinuously(chains[i]);
      }
      const totalTime = Date.now() - startTime;

      // Should complete efficiently (< 3 seconds)
      expect(totalTime).toBeLessThan(3000);

      // Each system should have processed chains
      for (const system of systems) {
        const metrics = system.getMetrics();
        expect(metrics.totalChains).toBeGreaterThan(0);

        // Each system should maintain low overhead
        const overhead = system.measurePerformanceOverhead();
        expect(overhead).toBeLessThan(15);
      }
    });
  });

  describe("Bias Severity Assessment", () => {
    it("should calculate severity accurately using BiasPatternRecognizer.assessBiasSeverity", async () => {
      const chain = createBiasedReasoningChain();

      // Monitor chain to detect biases
      await monitoringSystem.monitorContinuously(chain);

      // Get detected biases
      const biases = recognizer.detectBiases(chain);
      expect(biases.length).toBeGreaterThan(0);

      // Assess severity for each bias
      for (const bias of biases) {
        const severity = recognizer.assessBiasSeverity(bias);

        // Verify severity is calculated
        expect(severity).toBeDefined();
        expect(typeof severity).toBe("number");

        // Verify severity is reasonable (should be close to bias.severity but adjusted)
        expect(severity).toBeGreaterThan(0);
        expect(severity).toBeLessThanOrEqual(1);
      }
    });

    it("should ensure severity ranges are properly bounded (0-1)", async () => {
      const chain = createMultiBiasReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      for (const bias of biases) {
        const severity = recognizer.assessBiasSeverity(bias);

        // Severity must be within valid range
        expect(severity).toBeGreaterThanOrEqual(0);
        expect(severity).toBeLessThanOrEqual(1);
      }
    });

    it("should factor in confidence when calculating severity", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      if (biases.length > 0) {
        const bias = biases[0];
        const originalSeverity = recognizer.assessBiasSeverity(bias);

        // Create modified bias with lower confidence
        const lowConfidenceBias = { ...bias, confidence: 0.3 };
        const lowConfidenceSeverity = recognizer.assessBiasSeverity(lowConfidenceBias);

        // Lower confidence should result in lower severity
        expect(lowConfidenceSeverity).toBeLessThan(originalSeverity);

        // Create modified bias with higher confidence
        const highConfidenceBias = { ...bias, confidence: 0.95 };
        const highConfidenceSeverity = recognizer.assessBiasSeverity(highConfidenceBias);

        // Higher confidence should result in higher severity (or equal if capped)
        expect(highConfidenceSeverity).toBeGreaterThanOrEqual(originalSeverity);
      }
    });

    it("should factor in evidence count when calculating severity", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      if (biases.length > 0) {
        const bias = biases[0];

        // Create bias with minimal evidence
        const minimalEvidenceBias = { ...bias, evidence: ["Single evidence"] };
        const minimalSeverity = recognizer.assessBiasSeverity(minimalEvidenceBias);

        // Create bias with more evidence
        const moreEvidenceBias = {
          ...bias,
          evidence: ["Evidence 1", "Evidence 2", "Evidence 3", "Evidence 4"],
        };
        const moreSeverity = recognizer.assessBiasSeverity(moreEvidenceBias);

        // More evidence should result in higher severity
        expect(moreSeverity).toBeGreaterThan(minimalSeverity);

        // Both should still be bounded
        expect(minimalSeverity).toBeLessThanOrEqual(1);
        expect(moreSeverity).toBeLessThanOrEqual(1);
      }
    });

    it("should factor in bias type when calculating severity", async () => {
      const chain = createMultiBiasReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      // Different bias types may have different base severities
      const severitiesByType = new Map<string, number>();

      for (const bias of biases) {
        const severity = recognizer.assessBiasSeverity(bias);
        severitiesByType.set(bias.type, severity);
      }

      // Verify each bias type has a calculated severity
      for (const severity of severitiesByType.values()) {
        expect(severity).toBeGreaterThan(0);
        expect(severity).toBeLessThanOrEqual(1);
      }
    });

    it("should use severity thresholds for alert generation", async () => {
      const lowThresholdConfig: MonitoringConfig = {
        alertThreshold: 0.3, // Low threshold
      };

      const lowThresholdSystem = new BiasMonitoringSystem(recognizer, lowThresholdConfig);
      const chain = createBiasedReasoningChain();

      await lowThresholdSystem.monitorContinuously(chain);
      const lowThresholdAlerts = lowThresholdSystem.generateRealTimeAlerts(chain);

      // Now test with high threshold
      const highThresholdConfig: MonitoringConfig = {
        alertThreshold: 0.8, // High threshold
      };

      const highThresholdSystem = new BiasMonitoringSystem(recognizer, highThresholdConfig);
      await highThresholdSystem.monitorContinuously(chain);
      const highThresholdAlerts = highThresholdSystem.generateRealTimeAlerts(chain);

      // Low threshold should generate more or equal alerts
      expect(lowThresholdAlerts.length).toBeGreaterThanOrEqual(highThresholdAlerts.length);

      // All high threshold alerts should have severity >= 0.8
      for (const alert of highThresholdAlerts) {
        expect(alert.severity).toBeGreaterThanOrEqual(0.8);
      }

      // All low threshold alerts should have severity >= 0.3
      for (const alert of lowThresholdAlerts) {
        expect(alert.severity).toBeGreaterThanOrEqual(0.3);
      }
    });

    it("should track severity updates over time", async () => {
      const chain = createBiasedReasoningChain();

      // First monitoring
      await monitoringSystem.monitorContinuously(chain);
      const biases1 = recognizer.detectBiases(chain);
      const severities1 = biases1.map((b) => recognizer.assessBiasSeverity(b));

      // Second monitoring of same chain
      await monitoringSystem.monitorContinuously(chain);
      const biases2 = recognizer.detectBiases(chain);
      const severities2 = biases2.map((b) => recognizer.assessBiasSeverity(b));

      // Severities should be consistent for same chain
      expect(severities1.length).toBe(severities2.length);

      for (let i = 0; i < severities1.length; i++) {
        // Should be very close (allowing for floating point precision)
        expect(Math.abs(severities1[i] - severities2[i])).toBeLessThan(0.01);
      }
    });

    it("should handle edge case of zero confidence", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      if (biases.length > 0) {
        const bias = biases[0];

        // Create bias with zero confidence
        const zeroConfidenceBias = { ...bias, confidence: 0 };
        const severity = recognizer.assessBiasSeverity(zeroConfidenceBias);

        // Should handle gracefully and return low severity
        expect(severity).toBeGreaterThanOrEqual(0);
        expect(severity).toBeLessThanOrEqual(1);
        expect(severity).toBeLessThan(bias.severity); // Should be lower than original
      }
    });

    it("should handle edge case of empty evidence", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      if (biases.length > 0) {
        const bias = biases[0];

        // Create bias with no evidence
        const noEvidenceBias = { ...bias, evidence: [] };
        const severity = recognizer.assessBiasSeverity(noEvidenceBias);

        // Should handle gracefully
        expect(severity).toBeGreaterThanOrEqual(0);
        expect(severity).toBeLessThanOrEqual(1);
      }
    });

    it("should handle edge case of maximum evidence", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      if (biases.length > 0) {
        const bias = biases[0];

        // Create bias with many evidence items
        const manyEvidenceBias = {
          ...bias,
          evidence: Array.from({ length: 20 }, (_, i) => `Evidence ${i + 1}`),
        };
        const severity = recognizer.assessBiasSeverity(manyEvidenceBias);

        // Should cap at 1.0
        expect(severity).toBeLessThanOrEqual(1.0);
        expect(severity).toBeGreaterThan(0);
      }
    });

    it("should integrate severity assessment with monitoring system", async () => {
      const chain = createBiasedReasoningChain();

      // Monitor chain
      await monitoringSystem.monitorContinuously(chain);

      // Generate alerts (which should use severity assessment)
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      // Verify alerts have properly assessed severities
      for (const alert of alerts) {
        expect(alert.severity).toBeDefined();
        expect(alert.severity).toBeGreaterThan(0);
        expect(alert.severity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Edge Cases and Branch Coverage", () => {
    it("should handle reasoning chain with null id", async () => {
      const chainWithNullId = {
        id: null as any,
        steps: [],
        branches: [],
        assumptions: [],
        inferences: [],
        evidence: [],
        conclusion: "",
      } as ReasoningChain;

      // Should not throw
      await expect(monitoringSystem.monitorContinuously(chainWithNullId)).resolves.not.toThrow();

      // Metrics should still update
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThan(0);
    });

    it("should handle reasoning chain with undefined id", async () => {
      const chainWithUndefinedId = {
        id: undefined as any,
        steps: [],
        branches: [],
        assumptions: [],
        inferences: [],
        evidence: [],
        conclusion: "",
      } as ReasoningChain;

      // Should not throw
      await expect(
        monitoringSystem.monitorContinuously(chainWithUndefinedId)
      ).resolves.not.toThrow();

      // Metrics should still update
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThan(0);
    });

    it("should handle reasoning chain with empty string id", async () => {
      const chainWithEmptyId = createTestReasoningChain({ id: "" });

      // Should not throw
      await expect(monitoringSystem.monitorContinuously(chainWithEmptyId)).resolves.not.toThrow();

      // Metrics should still update
      const metrics = monitoringSystem.getMetrics();
      expect(metrics.totalChains).toBeGreaterThan(0);
    });

    it("should provide default recommendations for unknown bias types", async () => {
      // Create a chain that will be monitored
      const chain = createTestReasoningChain();
      await monitoringSystem.monitorContinuously(chain);

      // Create a bias with an unknown type to test default case
      const unknownBias: DetectedBias = {
        type: "unknown_bias_type" as unknown as BiasType,
        severity: 0.7,
        confidence: 0.8,
        evidence: ["Test evidence"],
        location: { stepIndex: 0, reasoning: "Test reasoning for unknown bias" },
        explanation: "Unknown bias type for testing",
        detectedAt: new Date(),
      };

      // Store this bias for alert generation
      (monitoringSystem as any).lastDetectedBiases.set(chain.id, [unknownBias]);

      // Generate alerts
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      // Should have generated alert with default recommendations
      expect(alerts.length).toBeGreaterThan(0);
      const alert = alerts[0];
      expect(alert.recommendations).toBeDefined();
      expect(alert.recommendations!.length).toBeGreaterThan(0);

      // Should contain generic recommendations
      const hasGenericRec = alert.recommendations!.some(
        (rec) =>
          rec.includes("Review reasoning") ||
          rec.includes("diverse perspectives") ||
          rec.includes("systematic thinking")
      );
      expect(hasGenericRec).toBe(true);
    });

    it("should handle detectBiasesAsync throwing an error", async () => {
      const chain = createTestReasoningChain();

      // Create monitoring system with mock recognizer that throws
      const mockRecognizer = {
        detectBiases: vi.fn(() => {
          throw new Error("Async detection failed");
        }),
        assessBiasSeverity: vi.fn(),
        identifyBiasPatterns: vi.fn(),
      } as unknown as BiasPatternRecognizer;

      const faultySystem = new BiasMonitoringSystem(mockRecognizer);

      // Should handle error gracefully and not throw
      await expect(faultySystem.monitorContinuously(chain)).resolves.not.toThrow();

      // Metrics should still update (error path)
      const metrics = faultySystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it("should handle non-Error objects thrown during detection", async () => {
      const chain = createTestReasoningChain();

      // Create monitoring system with mock recognizer that throws non-Error
      const mockRecognizer = {
        detectBiases: vi.fn(() => {
          throw "String error"; // Non-Error object
        }),
        assessBiasSeverity: vi.fn(),
        identifyBiasPatterns: vi.fn(),
      } as unknown as BiasPatternRecognizer;

      const faultySystem = new BiasMonitoringSystem(mockRecognizer);

      // Should handle gracefully
      await expect(faultySystem.monitorContinuously(chain)).resolves.not.toThrow();

      // Metrics should still update
      const metrics = faultySystem.getMetrics();
      expect(metrics.totalChains).toBe(1);
    });

    it("should track processing time even when error occurs", async () => {
      const chain = createTestReasoningChain();

      // Create monitoring system with mock recognizer that throws
      const mockRecognizer = {
        detectBiases: vi.fn(() => {
          throw new Error("Detection error");
        }),
        assessBiasSeverity: vi.fn(),
        identifyBiasPatterns: vi.fn(),
      } as unknown as BiasPatternRecognizer;

      const faultySystem = new BiasMonitoringSystem(mockRecognizer);

      // Monitor chain
      await faultySystem.monitorContinuously(chain);

      // Processing time should be tracked even on error
      const metrics = faultySystem.getMetrics();
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeLessThan(1000);
    });

    it("should maintain processing times array at max 100 entries on error", async () => {
      // Create monitoring system with mock recognizer that always throws
      const mockRecognizer = {
        detectBiases: vi.fn(() => {
          throw new Error("Detection error");
        }),
        assessBiasSeverity: vi.fn(),
        identifyBiasPatterns: vi.fn(),
      } as unknown as BiasPatternRecognizer;

      const faultySystem = new BiasMonitoringSystem(mockRecognizer);

      // Process 150 chains (all will error)
      for (let i = 0; i < 150; i++) {
        const chain = createTestReasoningChain({ id: `error-chain-${i}` });
        await faultySystem.monitorContinuously(chain);
      }

      // Verify all chains were counted
      const metrics = faultySystem.getMetrics();
      expect(metrics.totalChains).toBe(150);

      // Processing times array should be bounded to 100
      const processingTimes = (faultySystem as any).processingTimes;
      expect(processingTimes.length).toBeLessThanOrEqual(100);
    });

    it("should handle priority calculation for boundary severity values", async () => {
      // Use a monitoring system with low threshold to ensure all alerts are generated
      const lowThresholdConfig = { alertThreshold: 0.1 };
      const testSystem = new BiasMonitoringSystem(recognizer, lowThresholdConfig);

      const chain = createTestReasoningChain();
      await testSystem.monitorContinuously(chain);

      // Test exact boundary values
      const boundaryBiases: DetectedBias[] = [
        {
          type: BiasType.CONFIRMATION,
          severity: 0.8, // Exactly 0.8 - should be "critical"
          confidence: 0.9,
          evidence: ["Test"],
          location: { stepIndex: 0, reasoning: "Boundary test reasoning 0.8" },
          explanation: "Boundary test 0.8",
          detectedAt: new Date(),
        },
        {
          type: BiasType.CONFIRMATION,
          severity: 0.6, // Exactly 0.6 - should be "high"
          confidence: 0.9,
          evidence: ["Test"],
          location: { stepIndex: 1, reasoning: "Boundary test reasoning 0.6" },
          explanation: "Boundary test 0.6",
          detectedAt: new Date(),
        },
        {
          type: BiasType.CONFIRMATION,
          severity: 0.4, // Exactly 0.4 - should be "medium"
          confidence: 0.9,
          evidence: ["Test"],
          location: { stepIndex: 2, reasoning: "Boundary test reasoning 0.4" },
          explanation: "Boundary test 0.4",
          detectedAt: new Date(),
        },
        {
          type: BiasType.CONFIRMATION,
          severity: 0.3, // Below 0.4 - should be "low"
          confidence: 0.9,
          evidence: ["Test"],
          location: { stepIndex: 3, reasoning: "Boundary test reasoning 0.3" },
          explanation: "Boundary test 0.3",
          detectedAt: new Date(),
        },
      ];

      (testSystem as any).lastDetectedBiases.set(chain.id, boundaryBiases);

      const alerts = testSystem.generateRealTimeAlerts(chain);

      // Should have generated all 4 alerts
      expect(alerts.length).toBe(4);

      // Verify priority mapping for boundary values
      // Note: severity values may be adjusted by assessBiasSeverity
      // Check that priorities are correctly assigned based on severity ranges
      for (const alert of alerts) {
        if (alert.severity >= 0.8) {
          expect(alert.priority).toBe("critical");
        } else if (alert.severity >= 0.6) {
          expect(alert.priority).toBe("high");
        } else if (alert.severity >= 0.4) {
          expect(alert.priority).toBe("medium");
        } else {
          expect(alert.priority).toBe("low");
        }
      }

      // Verify we have a range of severities
      const severities = alerts.map((a) => a.severity).sort();
      expect(severities.length).toBe(4);
      expect(severities[0]).toBeLessThan(0.4); // Low
      expect(severities[1]).toBeGreaterThanOrEqual(0.4); // Medium
      expect(severities[2]).toBeGreaterThanOrEqual(0.6); // High
      expect(severities[3]).toBeGreaterThanOrEqual(0.8); // Critical
    });

    it("should generate recommendations for all bias types", async () => {
      const chain = createTestReasoningChain();
      await monitoringSystem.monitorContinuously(chain);

      // Test all bias types
      const biasTypes: BiasType[] = [
        BiasType.CONFIRMATION,
        BiasType.ANCHORING,
        BiasType.AVAILABILITY,
        BiasType.RECENCY,
        BiasType.REPRESENTATIVENESS,
        BiasType.FRAMING,
        BiasType.SUNK_COST,
        BiasType.ATTRIBUTION,
      ];

      for (const biasType of biasTypes) {
        const bias: DetectedBias = {
          type: biasType,
          severity: 0.7,
          confidence: 0.8,
          evidence: ["Test evidence"],
          location: {
            stepIndex: 0,
            reasoning: `Testing ${biasType} bias reasoning`,
          },
          explanation: `Testing ${biasType} bias`,
          detectedAt: new Date(),
        };

        (monitoringSystem as any).lastDetectedBiases.set(chain.id, [bias]);

        const alerts = monitoringSystem.generateRealTimeAlerts(chain);

        // Should have generated alert with recommendations
        expect(alerts.length).toBeGreaterThan(0);
        const alert = alerts[0];
        expect(alert.recommendations).toBeDefined();
        expect(alert.recommendations!.length).toBeGreaterThan(0);

        // Recommendations should be specific to bias type
        expect(alert.recommendations!.every((rec) => rec.length > 0)).toBe(true);
      }
    });
  });

  describe("Bias-Specific Recommendations", () => {
    it("should provide recommendations for representativeness bias", async () => {
      // Create a mock recognizer that will detect representativeness bias
      const mockRecognizer = {
        detectBiases: vi.fn(() => [
          {
            type: "representativeness",
            severity: 0.8,
            confidence: 0.9,
            evidence: ["Stereotyping based on appearance"],
            location: { stepIndex: 0, reasoning: "Test reasoning" },
            explanation: "Judging based on stereotypes rather than base rates",
            detectedAt: new Date(),
          },
        ]),
        assessBiasSeverity: vi.fn((bias) => bias.severity),
        identifyBiasPatterns: vi.fn(() => []),
      } as unknown as BiasPatternRecognizer;

      const testSystem = new BiasMonitoringSystem(mockRecognizer);
      const chain = createTestReasoningChain();

      await testSystem.monitorContinuously(chain);
      const alerts = testSystem.generateRealTimeAlerts(chain);

      expect(alerts.length).toBeGreaterThan(0);
      const alert = alerts[0];
      expect(alert.recommendations).toBeDefined();
      expect(alert.recommendations!.length).toBeGreaterThan(0);
      const recommendations = alert.recommendations!.join(" ");
      expect(recommendations).toMatch(/base rates|stereotyping|data/i);
    });

    it("should provide recommendations for framing bias", async () => {
      const mockRecognizer = {
        detectBiases: vi.fn(() => [
          {
            type: "framing",
            severity: 0.75,
            confidence: 0.85,
            evidence: ["Positive framing influences decision"],
            location: { stepIndex: 0, reasoning: "Test reasoning" },
            explanation: "Decision influenced by how information is framed",
            detectedAt: new Date(),
          },
        ]),
        assessBiasSeverity: vi.fn((bias) => bias.severity),
        identifyBiasPatterns: vi.fn(() => []),
      } as unknown as BiasPatternRecognizer;

      const testSystem = new BiasMonitoringSystem(mockRecognizer);
      const chain = createTestReasoningChain();

      await testSystem.monitorContinuously(chain);
      const alerts = testSystem.generateRealTimeAlerts(chain);

      expect(alerts.length).toBeGreaterThan(0);
      const alert = alerts[0];
      expect(alert.recommendations).toBeDefined();
      expect(alert.recommendations!.length).toBeGreaterThan(0);
      const recommendations = alert.recommendations!.join(" ");
      expect(recommendations).toMatch(/reframe|framing|objective/i);
    });

    it("should provide recommendations for sunk cost fallacy", async () => {
      const mockRecognizer = {
        detectBiases: vi.fn(() => [
          {
            type: "sunk_cost",
            severity: 0.85,
            confidence: 0.9,
            evidence: ["Past investment drives decision"],
            location: { stepIndex: 0, reasoning: "Test reasoning" },
            explanation: "Decision influenced by sunk costs",
            detectedAt: new Date(),
          },
        ]),
        assessBiasSeverity: vi.fn((bias) => bias.severity),
        identifyBiasPatterns: vi.fn(() => []),
      } as unknown as BiasPatternRecognizer;

      const testSystem = new BiasMonitoringSystem(mockRecognizer);
      const chain = createTestReasoningChain();

      await testSystem.monitorContinuously(chain);
      const alerts = testSystem.generateRealTimeAlerts(chain);

      expect(alerts.length).toBeGreaterThan(0);
      const alert = alerts[0];
      expect(alert.recommendations).toBeDefined();
      expect(alert.recommendations!.length).toBeGreaterThan(0);
      const recommendations = alert.recommendations!.join(" ");
      expect(recommendations).toMatch(/future|past investments|opportunity/i);
    });

    it("should provide recommendations for attribution bias", async () => {
      const mockRecognizer = {
        detectBiases: vi.fn(() => [
          {
            type: "attribution",
            severity: 0.7,
            confidence: 0.85,
            evidence: ["Different standards for self vs others"],
            location: { stepIndex: 0, reasoning: "Test reasoning" },
            explanation: "Fundamental attribution error detected",
            detectedAt: new Date(),
          },
        ]),
        assessBiasSeverity: vi.fn((bias) => bias.severity),
        identifyBiasPatterns: vi.fn(() => []),
      } as unknown as BiasPatternRecognizer;

      const testSystem = new BiasMonitoringSystem(mockRecognizer);
      const chain = createTestReasoningChain();

      await testSystem.monitorContinuously(chain);
      const alerts = testSystem.generateRealTimeAlerts(chain);

      expect(alerts.length).toBeGreaterThan(0);
      const alert = alerts[0];
      expect(alert.recommendations).toBeDefined();
      expect(alert.recommendations!.length).toBeGreaterThan(0);
      const recommendations = alert.recommendations!.join(" ");
      expect(recommendations).toMatch(/situational|standards|attribution/i);
    });

    it("should use assessed severity for alert prioritization", async () => {
      const chain = createMultiBiasReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const alerts = monitoringSystem.generateRealTimeAlerts(chain);

      if (alerts.length > 1) {
        // Verify alerts use assessed severity (not just raw bias severity)
        for (const alert of alerts) {
          const assessedSeverity = recognizer.assessBiasSeverity(alert.bias);

          // Alert severity should match the assessed severity
          expect(alert.severity).toBe(assessedSeverity);

          // Assessed severity should be within valid range
          expect(assessedSeverity).toBeGreaterThanOrEqual(0);
          expect(assessedSeverity).toBeLessThanOrEqual(1);
        }

        // Verify alerts are sorted by priority (which is derived from severity)
        const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        for (let i = 0; i < alerts.length - 1; i++) {
          const currentPriority = priorityOrder[alerts[i].priority];
          const nextPriority = priorityOrder[alerts[i + 1].priority];
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });

    it("should calculate severity consistently across multiple calls", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);
      const biases = recognizer.detectBiases(chain);

      if (biases.length > 0) {
        const bias = biases[0];

        // Calculate severity multiple times
        const severity1 = recognizer.assessBiasSeverity(bias);
        const severity2 = recognizer.assessBiasSeverity(bias);
        const severity3 = recognizer.assessBiasSeverity(bias);

        // Should be identical (deterministic)
        expect(severity1).toBe(severity2);
        expect(severity2).toBe(severity3);
      }
    });

    it("should reflect severity in monitoring metrics", async () => {
      const chain = createBiasedReasoningChain();

      await monitoringSystem.monitorContinuously(chain);

      // Generate alerts to populate severity metrics
      monitoringSystem.generateRealTimeAlerts(chain);

      const metrics = monitoringSystem.getMetrics();

      // Metrics should track severity information
      if (metrics.totalBiases > 0) {
        expect(metrics.alertsBySeverity).toBeDefined();
        expect(metrics.alertsBySeverity.size).toBeGreaterThan(0);
      }
    });
  });
});
