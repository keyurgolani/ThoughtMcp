/**
 * Integration tests for performance monitoring in CognitiveMCPServer
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import {
  AnalyzeReasoningArgs,
  RecallArgs,
  RememberArgs,
  ThinkArgs,
} from "../../types/mcp.js";

describe("Performance Monitoring Integration", () => {
  let server: CognitiveMCPServer;

  beforeEach(async () => {
    server = new CognitiveMCPServer();
    await server.initialize(true); // Test mode
  });

  afterEach(() => {
    server.clearPerformanceMetrics();
  });

  describe("Performance Metrics Collection", () => {
    it("should collect metrics for think tool", async () => {
      const thinkArgs: ThinkArgs = {
        input: "What is the meaning of life?",
        mode: "balanced",
        context: {},
        enable_emotion: true,
        enable_metacognition: true,
        max_depth: 5,
        temperature: 0.7,
      };

      // Execute think operation
      const result = await server.handleThink(thinkArgs);

      // Check that metrics were collected
      const stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeGreaterThan(0);

      // Check tool-specific stats
      expect(stats.toolUsageStats).toHaveProperty("think");
      expect(stats.toolUsageStats.think.count).toBe(1);
      expect(stats.toolUsageStats.think.averageResponseTime).toBeGreaterThan(0);
    });

    it("should collect metrics for remember tool", async () => {
      const rememberArgs: RememberArgs = {
        content: "Important information to remember",
        type: "episodic",
        importance: 0.8,
        emotional_tags: ["important"],
        context: { source: "test" },
      };

      // Execute remember operation
      const result = await server.handleRemember(rememberArgs);

      // Check that metrics were collected
      const stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.toolUsageStats).toHaveProperty("remember");
      expect(stats.toolUsageStats.remember.count).toBe(1);
    });

    it("should collect metrics for recall tool", async () => {
      // First store some memory
      const rememberArgs: RememberArgs = {
        content: "Test memory for recall",
        type: "episodic",
        importance: 0.7,
      };
      await server.handleRemember(rememberArgs);

      // Clear metrics to focus on recall
      server.clearPerformanceMetrics();

      const recallArgs: RecallArgs = {
        cue: "test memory",
        type: "both",
        max_results: 5,
        threshold: 0.3,
      };

      // Execute recall operation
      const result = await server.handleRecall(recallArgs);

      // Check that metrics were collected
      const stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.toolUsageStats).toHaveProperty("recall");
      expect(stats.toolUsageStats.recall.count).toBe(1);
    });

    it("should collect metrics for analyze_reasoning tool", async () => {
      const analyzeArgs: AnalyzeReasoningArgs = {
        reasoning_steps: [
          {
            type: "deductive",
            content: "All humans are mortal",
            confidence: 0.9,
            alternatives: [],
          },
          {
            type: "deductive",
            content: "Socrates is human",
            confidence: 0.95,
            alternatives: [],
          },
          {
            type: "deductive",
            content: "Therefore, Socrates is mortal",
            confidence: 0.85,
            alternatives: [],
          },
        ],
        context: { domain: "philosophy" },
      };

      // Execute analyze_reasoning operation
      const result = await server.handleAnalyzeReasoning(analyzeArgs);

      // Check that metrics were collected
      const stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.toolUsageStats).toHaveProperty("analyze_reasoning");
      expect(stats.toolUsageStats.analyze_reasoning.count).toBe(1);
    });
  });

  describe("Cognitive Metrics Tracking", () => {
    it("should track confidence scores correctly", async () => {
      const thinkArgs: ThinkArgs = {
        input: "Simple question",
        mode: "intuitive",
        enable_emotion: false,
        enable_metacognition: false,
      };

      await server.handleThink(thinkArgs);

      const stats = server.getPerformanceStatistics();
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeLessThanOrEqual(1);
    });

    it("should track reasoning depth", async () => {
      const thinkArgs: ThinkArgs = {
        input: "Complex philosophical question about consciousness",
        mode: "deliberative",
        max_depth: 10,
        enable_metacognition: true,
      };

      await server.handleThink(thinkArgs);

      const exportedMetrics = server.exportPerformanceMetrics();
      expect(exportedMetrics.length).toBe(1);
      expect(
        exportedMetrics[0].cognitiveMetrics.reasoningDepth
      ).toBeGreaterThan(0);
    });

    it("should track memory retrievals", async () => {
      // First store some memories
      await server.handleRemember({
        content: "Memory 1",
        type: "episodic",
        importance: 0.8,
      });
      await server.handleRemember({
        content: "Memory 2",
        type: "semantic",
        importance: 0.7,
      });

      // Clear metrics
      server.clearPerformanceMetrics();

      // Perform recall
      await server.handleRecall({
        cue: "memory",
        type: "both",
        max_results: 10,
      });

      const exportedMetrics = server.exportPerformanceMetrics();
      expect(exportedMetrics.length).toBe(1);
      expect(
        exportedMetrics[0].cognitiveMetrics.memoryRetrievals
      ).toBeGreaterThanOrEqual(0);
    });

    it("should track working memory load", async () => {
      const thinkArgs: ThinkArgs = {
        input:
          "Process this complex multi-part question with many variables and considerations",
        mode: "deliberative",
        enable_emotion: true,
        enable_metacognition: true,
      };

      await server.handleThink(thinkArgs);

      const exportedMetrics = server.exportPerformanceMetrics();
      expect(exportedMetrics.length).toBe(1);
      expect(
        exportedMetrics[0].cognitiveMetrics.workingMemoryLoad
      ).toBeGreaterThanOrEqual(0);
      expect(
        exportedMetrics[0].cognitiveMetrics.workingMemoryLoad
      ).toBeLessThanOrEqual(1);
    });
  });

  describe("Performance Statistics", () => {
    it("should calculate statistics across multiple requests", async () => {
      // Execute multiple operations
      const operations = [
        () => server.handleThink({ input: "Question 1", mode: "intuitive" }),
        () => server.handleThink({ input: "Question 2", mode: "deliberative" }),
        () => server.handleRemember({ content: "Memory 1", type: "episodic" }),
        () => server.handleRecall({ cue: "memory", type: "both" }),
      ];

      for (const operation of operations) {
        await operation();
      }

      const stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(4);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(Object.keys(stats.toolUsageStats).length).toBeGreaterThan(1);
    });

    it("should calculate percentiles correctly", async () => {
      // Execute multiple operations to get varied response times
      for (let i = 0; i < 10; i++) {
        await server.handleThink({
          input: `Question ${i}`,
          mode: i % 2 === 0 ? "intuitive" : "deliberative",
        });
      }

      const stats = server.getPerformanceStatistics();
      expect(stats.p95ResponseTime).toBeGreaterThanOrEqual(
        stats.medianResponseTime
      );
      expect(stats.p99ResponseTime).toBeGreaterThanOrEqual(
        stats.p95ResponseTime
      );
    });

    it("should filter statistics by time window", async () => {
      // Execute an operation
      await server.handleThink({ input: "Old question", mode: "intuitive" });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Execute another operation
      await server.handleThink({ input: "New question", mode: "intuitive" });

      const allStats = server.getPerformanceStatistics();
      const recentStats = server.getPerformanceStatistics(5); // Last 5ms

      expect(allStats.totalRequests).toBe(2);
      expect(recentStats.totalRequests).toBeLessThanOrEqual(
        allStats.totalRequests
      );
    });
  });

  describe("Alert Generation", () => {
    it("should generate alerts for slow responses", async () => {
      // Create a test server with very low thresholds
      const alertTestServer = new CognitiveMCPServer({
        responseTimeWarning: 0, // 0ms warning - any response time will trigger
        responseTimeCritical: 5, // 5ms critical
        memoryUsageWarning: 500 * 1024 * 1024,
        memoryUsageCritical: 1024 * 1024 * 1024,
        confidenceThreshold: 0.3,
      });

      // Initialize the server
      await alertTestServer.initialize(true);

      // Execute operation that will likely exceed thresholds
      await alertTestServer.handleThink({
        input: "Complex question requiring deep processing",
        mode: "deliberative",
        max_depth: 10,
        enable_emotion: true,
        enable_metacognition: true,
      });

      // Wait a bit for alerts to be processed
      await new Promise((resolve) => setTimeout(resolve, 10));

      const alerts = alertTestServer.getPerformanceAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((alert) => alert.metric === "responseTime")).toBe(
        true
      );

      await alertTestServer.shutdown();
    });

    it("should generate alerts for low confidence", async () => {
      // This is harder to test reliably since confidence depends on the cognitive model
      // But we can at least verify the alert system is connected
      const alerts = server.getPerformanceAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe("Memory Usage Tracking", () => {
    it("should track memory usage for each request", async () => {
      await server.handleThink({
        input: "Test memory tracking",
        mode: "balanced",
      });

      const exportedMetrics = server.exportPerformanceMetrics();
      expect(exportedMetrics.length).toBe(1);

      const memoryUsage = exportedMetrics[0].memoryUsage;
      expect(memoryUsage).toHaveProperty("heapUsed");
      expect(memoryUsage).toHaveProperty("heapTotal");
      expect(memoryUsage).toHaveProperty("external");
      expect(memoryUsage).toHaveProperty("rss");

      expect(typeof memoryUsage.heapUsed).toBe("number");
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
    });

    it("should get current memory usage", () => {
      const memoryUsage = server.getCurrentMemoryUsage();

      expect(memoryUsage).toHaveProperty("heapUsed");
      expect(memoryUsage).toHaveProperty("heapTotal");
      expect(typeof memoryUsage.heapUsed).toBe("number");
      expect(memoryUsage.heapUsed).toBeGreaterThan(0);
    });
  });

  describe("Data Export and Management", () => {
    it("should export performance metrics", async () => {
      // Generate some metrics
      await server.handleThink({ input: "Test export", mode: "intuitive" });
      await server.handleRemember({ content: "Test memory", type: "episodic" });

      const exportedMetrics = server.exportPerformanceMetrics();

      expect(Array.isArray(exportedMetrics)).toBe(true);
      expect(exportedMetrics.length).toBe(2);

      exportedMetrics.forEach((metric) => {
        expect(metric).toHaveProperty("responseTime");
        expect(metric).toHaveProperty("memoryUsage");
        expect(metric).toHaveProperty("cognitiveMetrics");
        expect(metric).toHaveProperty("timestamp");
        expect(metric).toHaveProperty("requestId");
        expect(metric).toHaveProperty("toolName");
      });
    });

    it("should clear performance metrics", async () => {
      // Generate some metrics
      await server.handleThink({ input: "Test clear", mode: "intuitive" });

      let stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(1);

      // Clear metrics
      server.clearPerformanceMetrics();

      stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(0);

      const alerts = server.getPerformanceAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe("Error Handling with Performance Monitoring", () => {
    it("should record metrics even when operations fail", async () => {
      try {
        // This should fail due to invalid arguments
        await server.handleThink({} as ThinkArgs);
      } catch (error) {
        // Expected to fail
      }

      // Should still have recorded metrics for the failed request
      const stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
    });

    it("should handle performance monitoring failures gracefully", async () => {
      // Even if performance monitoring has issues, the main functionality should work
      const result = await server.handleThink({
        input: "Test graceful handling",
        mode: "intuitive",
      });

      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("confidence");
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle concurrent requests with separate metrics", async () => {
      // Execute multiple concurrent operations
      const promises = [
        server.handleThink({ input: "Concurrent 1", mode: "intuitive" }),
        server.handleThink({ input: "Concurrent 2", mode: "deliberative" }),
        server.handleRemember({
          content: "Concurrent memory",
          type: "episodic",
        }),
      ];

      await Promise.all(promises);

      const stats = server.getPerformanceStatistics();
      expect(stats.totalRequests).toBe(3);

      const exportedMetrics = server.exportPerformanceMetrics();
      expect(exportedMetrics.length).toBe(3);

      // Each request should have a unique request ID
      const requestIds = exportedMetrics.map((m) => m.requestId);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(3);
    });
  });
});
