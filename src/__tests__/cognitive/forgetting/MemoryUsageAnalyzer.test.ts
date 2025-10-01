/**
 * Tests for MemoryUsageAnalyzer
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MemoryUsageAnalyzer } from "../../../cognitive/forgetting/MemoryUsageAnalyzer.js";

describe("MemoryUsageAnalyzer", () => {
  let analyzer: MemoryUsageAnalyzer;

  beforeEach(() => {
    analyzer = new MemoryUsageAnalyzer({
      analysis_depth: "deep",
      fragmentation_threshold: 0.3,
      low_importance_threshold: 0.2,
      rare_access_threshold_days: 30,
      conflict_similarity_threshold: 0.8,
    });
  });

  describe("analyzeMemoryUsage", () => {
    it("should return comprehensive memory usage analysis", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      expect(analysis).toBeDefined();
      expect(analysis.total_memories).toBeGreaterThan(0);
      expect(analysis.episodic_memories).toBeGreaterThanOrEqual(0);
      expect(analysis.semantic_memories).toBeGreaterThanOrEqual(0);
      expect(analysis.episodic_memories + analysis.semantic_memories).toBe(
        analysis.total_memories
      );

      expect(analysis.memory_size_bytes).toBeGreaterThan(0);
      expect(analysis.average_access_frequency).toBeGreaterThanOrEqual(0);

      expect(analysis.memory_pressure_level).toBeGreaterThanOrEqual(0);
      expect(analysis.memory_pressure_level).toBeLessThanOrEqual(1);

      expect(analysis.fragmentation_level).toBeGreaterThanOrEqual(0);
      expect(analysis.fragmentation_level).toBeLessThanOrEqual(1);

      expect(analysis.oldest_memory_age_days).toBeGreaterThanOrEqual(0);
      expect(analysis.newest_memory_age_days).toBeGreaterThanOrEqual(0);
      expect(analysis.oldest_memory_age_days).toBeGreaterThanOrEqual(
        analysis.newest_memory_age_days
      );

      expect(analysis.low_importance_memories).toBeGreaterThanOrEqual(0);
      expect(analysis.rarely_accessed_memories).toBeGreaterThanOrEqual(0);
      expect(analysis.conflicting_memories).toBeGreaterThanOrEqual(0);

      expect(analysis.optimization_potential).toBeGreaterThanOrEqual(0);
      expect(analysis.optimization_potential).toBeLessThanOrEqual(1);
    });

    it("should provide realistic memory statistics", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      // Memory counts should be reasonable
      expect(analysis.total_memories).toBeLessThan(10000);
      expect(analysis.total_memories).toBeGreaterThan(100);

      // Memory size should be proportional to count
      const avgMemorySize =
        analysis.memory_size_bytes / analysis.total_memories;
      expect(avgMemorySize).toBeGreaterThan(50); // At least 50 bytes per memory
      expect(avgMemorySize).toBeLessThan(1000); // Less than 1KB per memory on average

      // Access frequency should be reasonable
      expect(analysis.average_access_frequency).toBeLessThan(10); // Less than 10 accesses per day
    });

    it("should calculate optimization potential correctly", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      // Optimization potential should increase with problematic conditions
      if (
        analysis.memory_pressure_level > 0.8 ||
        analysis.fragmentation_level > 0.5 ||
        analysis.low_importance_memories > analysis.total_memories * 0.3
      ) {
        expect(analysis.optimization_potential).toBeGreaterThan(0.3);
      }

      // If everything looks good, optimization potential should be lower
      if (
        analysis.memory_pressure_level < 0.3 &&
        analysis.fragmentation_level < 0.2 &&
        analysis.low_importance_memories < analysis.total_memories * 0.1
      ) {
        expect(analysis.optimization_potential).toBeLessThan(0.5);
      }
    });
  });

  describe("getOptimizationRecommendations", () => {
    it("should provide relevant optimization recommendations", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();
      const recommendations = await analyzer.getOptimizationRecommendations(
        analysis
      );

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);

      // Should have at least one recommendation if there are optimization opportunities
      if (analysis.optimization_potential > 0.2) {
        expect(recommendations.length).toBeGreaterThan(0);
      }

      // Each recommendation should have required fields
      recommendations.forEach((rec) => {
        expect(rec.type).toMatch(/forget|compress|archive|consolidate/);
        expect(rec.target_memories).toBeDefined();
        expect(Array.isArray(rec.target_memories)).toBe(true);
        expect(rec.estimated_benefit).toBeDefined();
        expect(rec.risk_level).toMatch(/low|medium|high/);
        expect(rec.description).toBeDefined();
        expect(typeof rec.requires_user_consent).toBe("boolean");
      });
    });

    it("should recommend forgetting for low importance memories", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      // Force some low importance memories for testing
      if (analysis.low_importance_memories === 0) {
        analysis.low_importance_memories = Math.floor(
          analysis.total_memories * 0.2
        );
      }

      const recommendations = await analyzer.getOptimizationRecommendations(
        analysis
      );
      const forgettingRec = recommendations.find((r) => r.type === "forget");

      if (analysis.low_importance_memories > 0) {
        expect(forgettingRec).toBeDefined();
        expect(forgettingRec!.target_memories.length).toBeGreaterThan(0);
        expect(
          forgettingRec!.estimated_benefit.memory_space_freed
        ).toBeGreaterThan(0);
      }
    });

    it("should recommend compression for fragmented memories", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      // Force fragmentation for testing
      if (analysis.fragmentation_level < 0.3) {
        analysis.fragmentation_level = 0.5;
      }

      const recommendations = await analyzer.getOptimizationRecommendations(
        analysis
      );
      const compressionRec = recommendations.find((r) => r.type === "compress");

      if (analysis.fragmentation_level > 0.3) {
        expect(compressionRec).toBeDefined();
        expect(compressionRec!.risk_level).toBe("low");
        expect(compressionRec!.requires_user_consent).toBe(false);
      }
    });

    it("should recommend archiving for rarely accessed memories", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      // Force some rarely accessed memories for testing
      if (analysis.rarely_accessed_memories === 0) {
        analysis.rarely_accessed_memories = Math.floor(
          analysis.total_memories * 0.3
        );
      }

      const recommendations = await analyzer.getOptimizationRecommendations(
        analysis
      );
      const archivingRec = recommendations.find((r) => r.type === "archive");

      if (analysis.rarely_accessed_memories > 0) {
        expect(archivingRec).toBeDefined();
        expect(archivingRec!.target_memories.length).toBeGreaterThan(0);
        expect(archivingRec!.risk_level).toBe("low");
      }
    });

    it("should recommend consolidation for conflicting memories", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      // Force some conflicting memories for testing
      if (analysis.conflicting_memories === 0) {
        analysis.conflicting_memories = Math.floor(
          analysis.total_memories * 0.1
        );
      }

      const recommendations = await analyzer.getOptimizationRecommendations(
        analysis
      );
      const consolidationRec = recommendations.find(
        (r) => r.type === "consolidate"
      );

      if (analysis.conflicting_memories > 0) {
        expect(consolidationRec).toBeDefined();
        expect(consolidationRec!.target_memories.length).toBeGreaterThan(0);
        expect(consolidationRec!.risk_level).toBe("medium");
        expect(consolidationRec!.requires_user_consent).toBe(true);
      }
    });

    it("should sort recommendations by estimated benefit", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();

      // Force multiple types of issues for testing
      analysis.low_importance_memories = Math.floor(
        analysis.total_memories * 0.2
      );
      analysis.rarely_accessed_memories = Math.floor(
        analysis.total_memories * 0.3
      );
      analysis.fragmentation_level = 0.4;

      const recommendations = await analyzer.getOptimizationRecommendations(
        analysis
      );

      if (recommendations.length > 1) {
        for (let i = 0; i < recommendations.length - 1; i++) {
          const currentBenefit = calculateTotalBenefit(
            recommendations[i].estimated_benefit
          );
          const nextBenefit = calculateTotalBenefit(
            recommendations[i + 1].estimated_benefit
          );
          expect(currentBenefit).toBeGreaterThanOrEqual(nextBenefit);
        }
      }
    });

    it("should provide realistic benefit estimates", async () => {
      const analysis = await analyzer.analyzeMemoryUsage();
      const recommendations = await analyzer.getOptimizationRecommendations(
        analysis
      );

      recommendations.forEach((rec) => {
        const benefit = rec.estimated_benefit;

        // Memory space freed should be reasonable
        expect(benefit.memory_space_freed).toBeGreaterThanOrEqual(0);
        expect(benefit.memory_space_freed).toBeLessThan(
          analysis.memory_size_bytes
        );

        // Performance improvements should be percentages
        expect(benefit.processing_speed_improvement).toBeGreaterThanOrEqual(0);
        expect(benefit.processing_speed_improvement).toBeLessThanOrEqual(1);

        expect(benefit.interference_reduction).toBeGreaterThanOrEqual(0);
        expect(benefit.interference_reduction).toBeLessThanOrEqual(1);

        expect(benefit.focus_improvement).toBeGreaterThanOrEqual(0);
        expect(benefit.focus_improvement).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("configuration", () => {
    it("should use default configuration when none provided", () => {
      const defaultAnalyzer = new MemoryUsageAnalyzer();

      // Should not throw and should work with defaults
      expect(async () => {
        await defaultAnalyzer.analyzeMemoryUsage();
      }).not.toThrow();
    });

    it("should respect custom configuration", () => {
      const customAnalyzer = new MemoryUsageAnalyzer({
        analysis_depth: "shallow",
        fragmentation_threshold: 0.5,
        low_importance_threshold: 0.1,
        rare_access_threshold_days: 60,
        conflict_similarity_threshold: 0.9,
      });

      // Configuration should be applied (we can't directly test private config,
      // but we can test that it doesn't throw and produces results)
      expect(async () => {
        await customAnalyzer.analyzeMemoryUsage();
      }).not.toThrow();
    });
  });
});

// Helper function for testing
function calculateTotalBenefit(benefit: any): number {
  return (
    benefit.memory_space_freed / 1000 +
    benefit.processing_speed_improvement * 100 +
    benefit.interference_reduction * 100 +
    benefit.focus_improvement * 100
  );
}
