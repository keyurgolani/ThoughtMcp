/**
 * Tests for MemoryAnalysisFormatter
 */

import { describe, expect, it } from "vitest";
import {
  MemoryOptimizationRecommendation,
  MemoryUsageAnalysis,
} from "../../interfaces/forgetting.js";
import { MemoryAnalysisFormatter } from "../../utils/MemoryAnalysisFormatter.js";

describe("MemoryAnalysisFormatter", () => {
  const mockAnalysis: MemoryUsageAnalysis = {
    total_memories: 2500,
    episodic_memories: 1500,
    semantic_memories: 1000,
    memory_size_bytes: 5242880, // 5MB
    average_access_frequency: 1.5,
    memory_pressure_level: 0.6,
    fragmentation_level: 0.3,
    oldest_memory_age_days: 180,
    newest_memory_age_days: 1,
    low_importance_memories: 500,
    rarely_accessed_memories: 800,
    conflicting_memories: 150,
    optimization_potential: 0.4,
  };

  const mockRecommendations: MemoryOptimizationRecommendation[] = [
    {
      type: "forget",
      target_memories: Array.from(
        { length: 500 },
        (_, i) => `low_importance_${i}`
      ),
      estimated_benefit: {
        memory_space_freed: 75000,
        processing_speed_improvement: 0.05,
        interference_reduction: 0.08,
        focus_improvement: 0.06,
      },
      risk_level: "low",
      description: "Forget 500 low-importance memories to reduce clutter",
      requires_user_consent: true,
    },
    {
      type: "archive",
      target_memories: Array.from(
        { length: 200 },
        (_, i) => `rarely_accessed_${i}`
      ),
      estimated_benefit: {
        memory_space_freed: 20000,
        processing_speed_improvement: 0.02,
        interference_reduction: 0.03,
        focus_improvement: 0.02,
      },
      risk_level: "low",
      description: "Archive 200 rarely accessed memories",
      requires_user_consent: false,
    },
  ];

  describe("formatAnalysis", () => {
    it("should format analysis with overview level", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      expect(result).toBeDefined();
      expect(result.health_score).toBeDefined();
      expect(result.health_score.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.health_score.overall_score).toBeLessThanOrEqual(100);
      expect(result.summary).toContain("Memory Health:");
      expect(result.key_metrics.total_memories).toBe(2500);
      expect(result.key_metrics.memory_size_mb).toBe(5.0);
      expect(result.prioritized_recommendations).toHaveLength(2);
      expect(result.detailed_analysis).toBeUndefined();
      expect(result.trends).toBeUndefined();
    });

    it("should format analysis with detailed level", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "detailed"
      );

      expect(result.detailed_analysis).toBeDefined();
      expect(result.detailed_analysis).toEqual(mockAnalysis);
      expect(
        result.prioritized_recommendations[0].sample_memory_ids
      ).toBeDefined();
      expect(
        result.prioritized_recommendations[0].sample_memory_ids
      ).toHaveLength(5);
      expect(result.trends).toBeUndefined();
    });

    it("should format analysis with full level", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "full"
      );

      expect(result.detailed_analysis).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(result.trends.growth_rate).toMatch(/increasing|stable|decreasing/);
      expect(result.trends.access_patterns).toMatch(
        /healthy|declining|irregular/
      );
    });
  });

  describe("health score calculation", () => {
    it("should calculate health scores correctly", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      const healthScore = result.health_score;
      expect(healthScore.overall_score).toBeGreaterThanOrEqual(0);
      expect(healthScore.overall_score).toBeLessThanOrEqual(100);
      expect(healthScore.category_scores.efficiency).toBeGreaterThanOrEqual(0);
      expect(healthScore.category_scores.organization).toBeGreaterThanOrEqual(
        0
      );
      expect(healthScore.category_scores.performance).toBeGreaterThanOrEqual(0);
      expect(healthScore.category_scores.maintenance).toBeGreaterThanOrEqual(0);
      expect(healthScore.health_status).toMatch(
        /excellent|good|fair|poor|critical/
      );
    });

    it("should identify concerns for poor health", () => {
      const poorAnalysis: MemoryUsageAnalysis = {
        ...mockAnalysis,
        memory_pressure_level: 0.9,
        fragmentation_level: 0.8,
        conflicting_memories: 500,
        low_importance_memories: 1000,
        rarely_accessed_memories: 1500,
        optimization_potential: 0.8,
      };

      const result = MemoryAnalysisFormatter.formatAnalysis(
        poorAnalysis,
        mockRecommendations,
        "overview"
      );

      expect(result.health_score.primary_concerns.length).toBeGreaterThan(0);
      expect(
        result.health_score.primary_concerns.some(
          (concern) =>
            concern.includes("pressure") || concern.includes("fragmentation")
        )
      ).toBe(true);
    });

    it("should identify strengths for good health", () => {
      const goodAnalysis: MemoryUsageAnalysis = {
        ...mockAnalysis,
        memory_pressure_level: 0.2,
        fragmentation_level: 0.1,
        conflicting_memories: 50,
        low_importance_memories: 100,
        rarely_accessed_memories: 200,
        optimization_potential: 0.1,
        average_access_frequency: 3.0,
      };

      const result = MemoryAnalysisFormatter.formatAnalysis(
        goodAnalysis,
        mockRecommendations,
        "overview"
      );

      expect(result.health_score.strengths.length).toBeGreaterThan(0);
    });
  });

  describe("recommendation formatting", () => {
    it("should format recommendations with priorities", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      const recommendations = result.prioritized_recommendations;
      expect(recommendations).toHaveLength(2);

      const firstRec = recommendations[0];
      expect(firstRec.priority).toMatch(/high|medium|low/);
      expect(firstRec.title).toContain("🗑️");
      expect(firstRec.memory_count).toBe(500);
      expect(firstRec.impact_summary).toContain("KB");
      expect(firstRec.estimated_benefit).toContain("Free");
    });

    it("should limit sample memory IDs appropriately", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "detailed"
      );

      const firstRec = result.prioritized_recommendations[0];
      expect(firstRec.sample_memory_ids).toBeDefined();
      expect(firstRec.sample_memory_ids!.length).toBeLessThanOrEqual(5);
    });

    it("should not include sample memory IDs for overview level", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      const firstRec = result.prioritized_recommendations[0];
      expect(firstRec.sample_memory_ids).toBeUndefined();
    });
  });

  describe("summary generation", () => {
    it("should generate appropriate summary with health status", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      expect(result.summary).toContain("Memory Health:");
      expect(result.summary).toContain("2,500 memories");
      expect(result.summary).toContain("5.0MB");
      expect(result.summary).toMatch(/🟢|🟡|🟠|🔴|🚨/);
    });

    it("should include optimization guidance", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      expect(result.summary).toContain("Optimization Potential");
      expect(result.summary).toContain("40%");
    });

    it("should include tip for overview level", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      expect(result.summary).toContain("Quick Tip");
      expect(result.summary).toContain("detailed");
    });
  });

  describe("key metrics extraction", () => {
    it("should extract correct key metrics", () => {
      const result = MemoryAnalysisFormatter.formatAnalysis(
        mockAnalysis,
        mockRecommendations,
        "overview"
      );

      const metrics = result.key_metrics;
      expect(metrics.total_memories).toBe(2500);
      expect(metrics.memory_size_mb).toBe(5.0);
      expect(metrics.optimization_potential).toBe(40);
      expect(metrics.top_recommendation).toContain("Remove");
    });
  });

  describe("progress message creation", () => {
    it("should create appropriate progress messages", () => {
      const message1 = MemoryAnalysisFormatter.createProgressMessage(
        "Analyzing",
        0.3
      );
      expect(message1).toContain("🔍");
      expect(message1).toContain("30%");

      const message2 = MemoryAnalysisFormatter.createProgressMessage(
        "Complete",
        1.0
      );
      expect(message2).toContain("✅");
      expect(message2).toContain("100%");
    });
  });
});
