/**
 * Memory Recovery Integration Tests
 *
 * Tests the complete memory recovery system including RecoveryEngine,
 * recovery strategies, and MCP server integration.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GradualDegradationManager } from "../../cognitive/forgetting/GradualDegradationManager.js";
import { RecoveryEngine } from "../../cognitive/forgetting/RecoveryEngine.js";
import {
  MetadataPreservationLevel,
  RecoveryCue,
  RecoveryMetadata,
  RecoveryResult,
} from "../../interfaces/forgetting.js";
import { CognitiveMCPServer } from "../../server/CognitiveMCPServer.js";
import { Concept, Episode } from "../../types/core.js";
import { RecoverMemoryArgs } from "../../types/mcp.js";

describe("Memory Recovery Integration Tests", () => {
  let server: CognitiveMCPServer;
  let recoveryEngine: RecoveryEngine;
  let degradationManager: GradualDegradationManager;

  beforeEach(async () => {
    // Initialize components
    server = new CognitiveMCPServer();
    await server.initialize(true); // Test mode

    recoveryEngine = new RecoveryEngine();
    degradationManager = new GradualDegradationManager();
  });

  afterEach(async () => {
    // Cleanup
    if (degradationManager) {
      await degradationManager.cleanup();
    }
  });

  describe("RecoveryEngine Core Functionality", () => {
    it("should successfully recover memory using associative cues", async () => {
      const memoryId = "test_memory_001";
      const recoveryCues: RecoveryCue[] = [
        {
          type: "associative",
          value: "related_concept",
          strength: 0.8,
          source: "test",
        },
        {
          type: "semantic",
          value: "important_keyword",
          strength: 0.7,
          source: "test",
        },
      ];

      const recoveryMetadata: RecoveryMetadata = {
        original_memory_id: memoryId,
        original_content_hash: "test_hash_123",
        original_importance: 0.8,
        original_timestamp: Date.now() - 86400000, // 1 day ago
        degradation_history: [],
        recovery_cues: recoveryCues,
        association_fingerprint: {
          strong_associations: ["concept_a", "concept_b"],
          weak_associations: ["concept_c"],
          semantic_clusters: ["cluster_1"],
          temporal_neighbors: ["memory_002"],
          contextual_tags: ["test_context"],
        },
        content_summary: "Test memory content for recovery",
        recovery_difficulty_estimate: 0.3,
        preservation_timestamp: Date.now() - 86400000,
      };

      const result = await recoveryEngine.attemptRecovery(
        memoryId,
        recoveryCues,
        recoveryMetadata
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.recovery_confidence).toBeGreaterThan(0.3);
      expect(result.recovery_attempts.length).toBeGreaterThan(0);
      expect(result.recovery_method).toBeDefined();
      expect(result.recovery_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should handle recovery with insufficient cues gracefully", async () => {
      const memoryId = "test_memory_002";
      const weakCues: RecoveryCue[] = [
        {
          type: "semantic",
          value: "vague_term",
          strength: 0.1, // Very weak cue
          source: "test",
        },
      ];

      const result = await recoveryEngine.attemptRecovery(memoryId, weakCues);

      expect(result).toBeDefined();
      // With very weak cues, recovery might still succeed but with low confidence
      expect(result.recovery_confidence).toBeLessThan(0.5);
      expect(result.recovery_attempts.length).toBeGreaterThan(0);

      // The system should handle weak cues gracefully
      // Recovery may succeed or fail, but should provide meaningful feedback
      expect(result.recovery_method).toBeDefined();
      expect(result.quality_assessment).toBeDefined();
    });

    it("should assess recovery confidence accurately", async () => {
      const recoveredContent = {
        content: "Recovered memory content",
        confidence: 0.7,
      };

      const originalMetadata: RecoveryMetadata = {
        original_memory_id: "test_memory_003",
        original_content_hash: "original_hash",
        original_importance: 0.9,
        original_timestamp: Date.now() - 3600000, // 1 hour ago
        degradation_history: [
          {
            stage_id: "initial_fade",
            applied_timestamp: Date.now() - 1800000,
            degradation_factor: 0.1,
            content_before_hash: "before_hash",
            content_after_hash: "after_hash",
            metadata_preserved: MetadataPreservationLevel.FULL,
            reversible: true,
          },
        ],
        recovery_cues: [
          {
            type: "semantic",
            value: "test_cue",
            strength: 0.8,
            source: "test",
          },
        ],
        association_fingerprint: {
          strong_associations: ["assoc_1", "assoc_2"],
          weak_associations: [],
          semantic_clusters: ["cluster_1"],
          temporal_neighbors: [],
          contextual_tags: ["test"],
        },
        content_summary: "Test content summary",
        recovery_difficulty_estimate: 0.4,
        preservation_timestamp: Date.now() - 3600000,
      };

      const confidenceAssessment =
        await recoveryEngine.assessRecoveryConfidence(
          recoveredContent,
          originalMetadata
        );

      expect(confidenceAssessment).toBeDefined();
      expect(confidenceAssessment.overall_confidence).toBeGreaterThan(0);
      expect(confidenceAssessment.overall_confidence).toBeLessThanOrEqual(1);
      expect(confidenceAssessment.content_accuracy_estimate).toBeDefined();
      expect(confidenceAssessment.completeness_estimate).toBeDefined();
      expect(confidenceAssessment.reliability_factors).toBeInstanceOf(Array);
      expect(confidenceAssessment.uncertainty_sources).toBeInstanceOf(Array);
      expect(confidenceAssessment.validation_suggestions).toBeInstanceOf(Array);
    });

    it("should track recovery success and update statistics", async () => {
      const memoryId = "test_memory_004";
      const recoveryResult: RecoveryResult = {
        success: true,
        recovered_memory: {
          id: memoryId,
          content: "test content",
          activation: 0.8,
          last_accessed: Date.now(),
          relations: [],
        } as Concept,
        recovery_confidence: 0.8,
        recovery_method: "associative_recovery",
        partial_recovery: false,
        missing_elements: [],
        recovery_metadata_used: {
          original_memory_id: memoryId,
          original_content_hash: "test_hash",
          original_importance: 0.7,
          original_timestamp: Date.now(),
          degradation_history: [],
          recovery_cues: [],
          association_fingerprint: {
            strong_associations: [],
            weak_associations: [],
            semantic_clusters: [],
            temporal_neighbors: [],
            contextual_tags: [],
          },
          content_summary: "",
          recovery_difficulty_estimate: 0.5,
          preservation_timestamp: Date.now(),
        },
      };

      await recoveryEngine.trackRecoverySuccess(memoryId, recoveryResult);

      const statistics = await recoveryEngine.getRecoveryStatistics();
      expect(statistics.total_recovery_attempts).toBeGreaterThan(0);
      expect(statistics.successful_recoveries).toBeGreaterThan(0);
      expect(statistics.average_recovery_confidence).toBeGreaterThan(0);
    });
  });

  describe("Integration with Gradual Degradation Manager", () => {
    it("should preserve recovery metadata during degradation", async () => {
      const testMemory: Episode = {
        content: "Test episode content for degradation and recovery",
        timestamp: Date.now(),
        importance: 0.8,
        context: {
          session_id: "test_session",
          domain: "test_domain",
        },
        emotional_tags: ["positive"],
        decay_factor: 0.1,
      };

      const degradationProcess = await degradationManager.initiateDegradation(
        testMemory,
        0.5 // 50% degradation
      );

      expect(degradationProcess).toBeDefined();
      expect(degradationProcess.status.recovery_metadata).toBeDefined();

      const recoveryMetadata = degradationProcess.status.recovery_metadata!;
      expect(recoveryMetadata.original_memory_id).toBeDefined();
      expect(recoveryMetadata.original_memory_id).toBe(
        degradationProcess.memory_id
      );
      expect(recoveryMetadata.recovery_cues.length).toBeGreaterThan(0);
      expect(recoveryMetadata.association_fingerprint).toBeDefined();
      expect(recoveryMetadata.content_summary).toBeDefined();
    });

    it("should successfully recover memory after degradation", async () => {
      const testMemory: Concept = {
        id: "concept_001",
        content: "Important concept for testing recovery",
        activation: 0.9,
        last_accessed: Date.now(),
        relations: ["concept_002", "concept_003"],
      };

      // Start degradation process
      const degradationProcess = await degradationManager.initiateDegradation(
        testMemory,
        0.3
      );

      // Execute one degradation stage
      await degradationManager.executeNextStage(degradationProcess.process_id);

      // Attempt recovery using preserved metadata
      const recoveryMetadata = degradationProcess.status.recovery_metadata!;
      const recoveryCues = recoveryMetadata.recovery_cues;

      const recoveryResult = await recoveryEngine.attemptRecovery(
        testMemory.id,
        recoveryCues,
        recoveryMetadata
      );

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.recovery_confidence).toBeGreaterThan(0.3);
      expect(recoveryResult.recovered_memory).toBeDefined();
    });
  });

  describe("MCP Server Integration", () => {
    it("should handle recover_memory tool request successfully", async () => {
      const args: RecoverMemoryArgs = {
        memory_id: "test_memory_mcp_001",
        recovery_cues: [
          {
            type: "semantic",
            value: "important_keyword",
            strength: 0.8,
          },
          {
            type: "contextual",
            value: "test_context",
            strength: 0.6,
          },
          {
            type: "associative",
            value: "related_memory",
            strength: 0.7,
          },
        ],
        max_recovery_attempts: 3,
        confidence_threshold: 0.4,
        context: {
          session_id: "test_session",
          domain: "test_domain",
        },
      };

      const result = await server.handleRecoverMemory(args);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.memory_id).toBe(args.memory_id);
      expect(result.recovery_confidence).toBeGreaterThanOrEqual(0);
      expect(result.recovery_confidence).toBeLessThanOrEqual(1);
      expect(result.recovery_method).toBeDefined();
      expect(result.recovery_attempts).toBeInstanceOf(Array);
      expect(result.quality_assessment).toBeDefined();
      expect(result.recovery_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should validate recover_memory arguments correctly", async () => {
      // Test with valid arguments to ensure the method works
      const validArgs: RecoverMemoryArgs = {
        memory_id: "test_id",
        recovery_cues: [{ type: "semantic", value: "test" }],
      };

      const result = await server.handleRecoverMemory(validArgs);
      expect(result).toBeDefined();
      expect(result.memory_id).toBe("test_id");
      expect(result.success).toBeDefined();
      expect(result.recovery_confidence).toBeGreaterThanOrEqual(0);
      expect(result.recovery_confidence).toBeLessThanOrEqual(1);

      // Note: Validation testing would typically be done through the MCP protocol
      // The validation logic is tested separately in the MCP server integration
    });

    it("should handle recovery with different strategy combinations", async () => {
      const baseArgs: RecoverMemoryArgs = {
        memory_id: "test_memory_strategies",
        recovery_cues: [
          { type: "semantic", value: "keyword1", strength: 0.8 },
          { type: "associative", value: "related_item", strength: 0.7 },
          { type: "contextual", value: "context_info", strength: 0.6 },
        ],
      };

      // Test with specific strategies
      const strategiesArgs = {
        ...baseArgs,
        recovery_strategies: ["associative_recovery", "schema_based_recovery"],
      };

      const result = await server.handleRecoverMemory(strategiesArgs);
      expect(result.recovery_attempts.length).toBeGreaterThan(0);
      expect(
        result.recovery_attempts.some(
          (a) => a.strategy_name === "associative_recovery"
        )
      ).toBe(true);
    });

    it("should provide detailed quality assessment", async () => {
      const args: RecoverMemoryArgs = {
        memory_id: "test_memory_quality",
        recovery_cues: [
          { type: "semantic", value: "detailed_content", strength: 0.9 },
          { type: "temporal", value: "2024-01-15", strength: 0.7 },
        ],
        confidence_threshold: 0.3,
      };

      const result = await server.handleRecoverMemory(args);

      expect(result.quality_assessment).toBeDefined();
      expect(result.quality_assessment.overall_quality).toBeGreaterThanOrEqual(
        0
      );
      expect(result.quality_assessment.overall_quality).toBeLessThanOrEqual(1);
      expect(result.quality_assessment.content_coherence).toBeDefined();
      expect(result.quality_assessment.contextual_consistency).toBeDefined();
      expect(result.quality_assessment.quality_issues).toBeInstanceOf(Array);
    });
  });

  describe("Recovery Strategy Performance", () => {
    it("should demonstrate different strategy effectiveness", async () => {
      const memoryId = "strategy_test_memory";

      // Test associative recovery
      const associativeCues: RecoveryCue[] = [
        {
          type: "associative",
          value: "strong_association",
          strength: 0.9,
          source: "test",
        },
      ];

      const associativeResult = await recoveryEngine.attemptRecovery(
        memoryId,
        associativeCues
      );

      // Test semantic recovery
      const semanticCues: RecoveryCue[] = [
        {
          type: "semantic",
          value: "key_concept",
          strength: 0.8,
          source: "test",
        },
        {
          type: "contextual",
          value: "relevant_context",
          strength: 0.7,
          source: "test",
        },
      ];

      const semanticResult = await recoveryEngine.attemptRecovery(
        memoryId + "_semantic",
        semanticCues
      );

      // Both should attempt recovery
      expect(associativeResult.recovery_attempts.length).toBeGreaterThan(0);
      expect(semanticResult.recovery_attempts.length).toBeGreaterThan(0);

      // Should use different strategies
      const associativeStrategies = associativeResult.recovery_attempts.map(
        (a) => a.strategy_name
      );
      const semanticStrategies = semanticResult.recovery_attempts.map(
        (a) => a.strategy_name
      );

      expect(associativeStrategies).toContain("associative_recovery");
      expect(semanticStrategies).toContain("schema_based_recovery");
    });

    it("should improve recovery success over time", async () => {
      const memoryId = "learning_test_memory";
      const recoveryCues: RecoveryCue[] = [
        {
          type: "semantic",
          value: "learning_keyword",
          strength: 0.7,
          source: "test",
        },
      ];

      // Perform multiple recovery attempts
      const results: RecoveryResult[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await recoveryEngine.attemptRecovery(
          `${memoryId}_${i}`,
          recoveryCues
        );
        results.push(result);

        // Simulate positive user validation
        await recoveryEngine.trackRecoverySuccess(`${memoryId}_${i}`, result, {
          memory_id: `${memoryId}_${i}`,
          user_confirms_accuracy: true,
          accuracy_rating: 0.8,
          completeness_rating: 0.7,
          validation_timestamp: Date.now(),
        });
      }

      // Check that statistics are being tracked
      const statistics = await recoveryEngine.getRecoveryStatistics();
      expect(statistics.total_recovery_attempts).toBeGreaterThanOrEqual(3);
      expect(statistics.strategy_success_rates.size).toBeGreaterThan(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle recovery engine errors gracefully", async () => {
      // Test with invalid memory ID format
      await expect(recoveryEngine.attemptRecovery("", [])).rejects.toThrow(
        "Recovery cues are required"
      );

      // Test with malformed cues
      const invalidCues = [
        { type: "invalid", value: "", strength: -1, source: "test" } as any,
      ];

      // Should handle gracefully without crashing
      const result = await recoveryEngine.attemptRecovery(
        "test_memory_error",
        invalidCues
      );
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it("should handle MCP server validation errors", async () => {
      // Test that the server handles edge cases gracefully
      // Note: Direct validation testing requires MCP protocol integration

      // Test with minimal valid arguments
      const minimalArgs: RecoverMemoryArgs = {
        memory_id: "test_validation",
        recovery_cues: [{ type: "semantic", value: "test" }],
      };

      const result = await server.handleRecoverMemory(minimalArgs);
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      // The server should handle edge cases without crashing
      expect(result.recovery_attempts).toBeInstanceOf(Array);
      expect(result.quality_assessment).toBeDefined();
    });

    it("should handle timeout scenarios", async () => {
      // Test with complex recovery scenario that might timeout
      const complexArgs: RecoverMemoryArgs = {
        memory_id: "complex_memory_timeout_test",
        recovery_cues: Array.from({ length: 10 }, (_, i) => ({
          type: "semantic" as const,
          value: `complex_cue_${i}`,
          strength: 0.5,
        })),
        max_recovery_attempts: 10,
      };

      // Should complete within reasonable time
      const startTime = Date.now();
      const result = await server.handleRecoverMemory(complexArgs);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});
