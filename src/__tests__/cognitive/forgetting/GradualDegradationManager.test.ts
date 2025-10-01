/**
 * Unit tests for GradualDegradationManager
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GradualDegradationManager } from "../../../cognitive/forgetting/GradualDegradationManager.js";
import {
  DegradationStage,
  MetadataPreservationLevel,
} from "../../../interfaces/forgetting.js";
import { Concept, Episode } from "../../../types/core.js";

describe("GradualDegradationManager", () => {
  let manager: GradualDegradationManager;
  let mockEpisode: Episode;
  let mockConcept: Concept;

  beforeEach(() => {
    // Initialize manager with test configuration
    manager = new GradualDegradationManager({
      auto_execution_enabled: false, // Disable auto execution for tests
      enable_degradation_logging: false, // Disable logging for cleaner test output
      max_concurrent_processes: 5,
      recovery_metadata_retention_days: 30,
    });

    // Create mock memory objects
    mockEpisode = {
      content: "Test episode content for degradation testing",
      context: {
        session_id: "test-session",
        domain: "testing",
        timestamp: Date.now(),
      },
      timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
      emotional_tags: ["neutral", "test"],
      importance: 0.7,
      decay_factor: 0.1,
    };

    mockConcept = {
      id: "test-concept-123",
      content: "Test concept for degradation",
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      relations: ["related-concept-1", "related-concept-2"],
      activation: 0.8,
      last_accessed: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
    };
  });

  afterEach(async () => {
    // Cleanup manager
    await manager.cleanup();
  });

  describe("Degradation Process Initiation", () => {
    it("should initiate degradation process with default stages", async () => {
      const process = await manager.initiateDegradation(mockEpisode, 0.5);

      expect(process).toBeDefined();
      expect(process.process_id).toMatch(/^degradation_\d+_\d+$/);
      expect(process.memory_id).toBeDefined();
      expect(process.target_degradation_level).toBe(0.5);
      expect(process.stages.length).toBeGreaterThan(0);
      expect(process.current_stage_index).toBe(0);
      expect(process.status.degradation_level).toBe(0);
      expect(process.status.is_paused).toBe(false);
      expect(process.status.is_reversible).toBe(true);
      expect(process.status.recovery_metadata).toBeDefined();
    });

    it("should initiate degradation with custom stages", async () => {
      const customStages: DegradationStage[] = [
        {
          stage_id: "custom_stage_1",
          name: "Custom Stage 1",
          description: "First custom degradation stage",
          degradation_factor: 0.2,
          duration_ms: 1000,
          reversible: true,
          metadata_preservation: MetadataPreservationLevel.FULL,
        },
        {
          stage_id: "custom_stage_2",
          name: "Custom Stage 2",
          description: "Second custom degradation stage",
          degradation_factor: 0.3,
          duration_ms: 2000,
          reversible: false,
          metadata_preservation: MetadataPreservationLevel.PARTIAL,
        },
      ];

      const process = await manager.initiateDegradation(
        mockConcept,
        0.4,
        customStages
      );

      expect(process.stages).toEqual(customStages);
      expect(process.target_degradation_level).toBe(0.4);
    });

    it("should validate target degradation level", async () => {
      await expect(
        manager.initiateDegradation(mockEpisode, -0.1)
      ).rejects.toThrow("Target degradation level must be between 0 and 1");

      await expect(
        manager.initiateDegradation(mockEpisode, 1.5)
      ).rejects.toThrow("Target degradation level must be between 0 and 1");
    });

    it("should enforce maximum concurrent processes", async () => {
      // Create manager with low limit
      const limitedManager = new GradualDegradationManager({
        max_concurrent_processes: 2,
        auto_execution_enabled: false,
        enable_degradation_logging: false,
      });

      // Start maximum number of processes
      await limitedManager.initiateDegradation(mockEpisode, 0.3);
      await limitedManager.initiateDegradation(mockConcept, 0.4);

      // Third process should fail
      await expect(
        limitedManager.initiateDegradation(mockEpisode, 0.5)
      ).rejects.toThrow("Maximum concurrent degradation processes reached");

      await limitedManager.cleanup();
    });
  });

  describe("Stage Execution", () => {
    it("should execute degradation stages sequentially", async () => {
      const process = await manager.initiateDegradation(mockEpisode, 0.8); // Higher target to allow multiple stages
      const processId = process.process_id;

      // Execute first stage
      const status1 = await manager.executeNextStage(processId);
      expect(status1.degradation_level).toBeGreaterThan(0);
      expect(status1.stages_completed.length).toBe(1);
      expect(status1.current_stage).toBeDefined();

      // Execute second stage
      const status2 = await manager.executeNextStage(processId);
      expect(status2.degradation_level).toBeGreaterThanOrEqual(
        status1.degradation_level
      );
      expect(status2.stages_completed.length).toBe(2);
    });

    it("should update reversibility based on completed stages", async () => {
      const irreversibleStages: DegradationStage[] = [
        {
          stage_id: "reversible_stage",
          name: "Reversible Stage",
          description: "This stage can be reversed",
          degradation_factor: 0.2,
          duration_ms: 1000,
          reversible: true,
          metadata_preservation: MetadataPreservationLevel.FULL,
        },
        {
          stage_id: "irreversible_stage",
          name: "Irreversible Stage",
          description: "This stage cannot be reversed",
          degradation_factor: 0.3,
          duration_ms: 2000,
          reversible: false,
          metadata_preservation: MetadataPreservationLevel.MINIMAL,
        },
      ];

      const process = await manager.initiateDegradation(
        mockEpisode,
        0.5,
        irreversibleStages
      );

      // After first stage, should still be reversible
      const status1 = await manager.executeNextStage(process.process_id);
      expect(status1.is_reversible).toBe(true);

      // After second stage, should not be reversible
      const status2 = await manager.executeNextStage(process.process_id);
      expect(status2.is_reversible).toBe(false);
    });

    it("should handle stage execution errors gracefully", async () => {
      const process = await manager.initiateDegradation(mockEpisode, 0.3);

      // Pause the process
      await manager.pauseDegradation(process.process_id);

      // Executing paused process should throw error
      await expect(
        manager.executeNextStage(process.process_id)
      ).rejects.toThrow("is paused");
    });

    it("should prevent execution beyond available stages", async () => {
      const singleStage: DegradationStage[] = [
        {
          stage_id: "only_stage",
          name: "Only Stage",
          description: "The only degradation stage",
          degradation_factor: 0.3,
          duration_ms: 1000,
          reversible: true,
          metadata_preservation: MetadataPreservationLevel.FULL,
        },
      ];

      const process = await manager.initiateDegradation(
        mockEpisode,
        0.3,
        singleStage
      );

      // Execute the only stage
      await manager.executeNextStage(process.process_id);

      // Attempting to execute another stage should fail
      await expect(
        manager.executeNextStage(process.process_id)
      ).rejects.toThrow("All degradation stages completed");
    });
  });

  describe("Process Control", () => {
    it("should pause and resume degradation processes", async () => {
      const process = await manager.initiateDegradation(mockEpisode, 0.5);
      const processId = process.process_id;

      // Pause the process
      await manager.pauseDegradation(processId);
      const pausedStatus = await manager.getDegradationStatus(processId);
      expect(pausedStatus.is_paused).toBe(true);

      // Resume the process
      await manager.resumeDegradation(processId);
      const resumedStatus = await manager.getDegradationStatus(processId);
      expect(resumedStatus.is_paused).toBe(false);
    });

    it("should cancel degradation and attempt recovery", async () => {
      const process = await manager.initiateDegradation(mockEpisode, 0.5);
      const processId = process.process_id;

      // Execute one stage
      await manager.executeNextStage(processId);

      // Cancel the degradation
      const recoveryResult = await manager.cancelDegradation(processId);

      expect(recoveryResult).toBeDefined();
      expect(recoveryResult.recovery_method).toBe("metadata_reconstruction");
      expect(recoveryResult.recovery_confidence).toBeGreaterThan(0);

      // Process should no longer exist
      await expect(manager.getDegradationStatus(processId)).rejects.toThrow(
        "not found"
      );
    });

    it("should get status of active processes", async () => {
      const process1 = await manager.initiateDegradation(mockEpisode, 0.3);
      const process2 = await manager.initiateDegradation(mockConcept, 0.4);

      const activeProcesses = await manager.getActiveDegradationProcesses();
      expect(activeProcesses.length).toBe(2);

      const processIds = activeProcesses.map((p) => p.process_id);
      expect(processIds).toContain(process1.process_id);
      expect(processIds).toContain(process2.process_id);
    });
  });

  describe("Recovery Metadata", () => {
    it("should preserve comprehensive recovery metadata", async () => {
      const recoveryMetadata = await manager.preserveRecoveryMetadata(
        mockEpisode,
        0.7
      );

      expect(recoveryMetadata).toBeDefined();
      expect(recoveryMetadata.original_memory_id).toBeDefined();
      expect(recoveryMetadata.original_content_hash).toBeDefined();
      expect(recoveryMetadata.original_importance).toBe(mockEpisode.importance);
      expect(recoveryMetadata.original_timestamp).toBe(mockEpisode.timestamp);
      expect(recoveryMetadata.recovery_cues.length).toBeGreaterThan(0);
      expect(recoveryMetadata.association_fingerprint).toBeDefined();
      expect(recoveryMetadata.content_summary).toBeDefined();
      expect(recoveryMetadata.recovery_difficulty_estimate).toBeGreaterThan(0);
      expect(recoveryMetadata.preservation_timestamp).toBeDefined();
    });

    it("should extract meaningful recovery cues", async () => {
      const recoveryMetadata = await manager.preserveRecoveryMetadata(
        mockEpisode,
        0.5
      );

      const cues = recoveryMetadata.recovery_cues;
      expect(cues.length).toBeGreaterThan(0);

      // Should have semantic cues from content
      const semanticCues = cues.filter((c) => c.type === "semantic");
      expect(semanticCues.length).toBeGreaterThan(0);

      // Should have temporal cues
      const temporalCues = cues.filter((c) => c.type === "temporal");
      expect(temporalCues.length).toBeGreaterThan(0);

      // Should have contextual cues
      const contextualCues = cues.filter((c) => c.type === "contextual");
      expect(contextualCues.length).toBeGreaterThan(0);

      // Should have emotional cues
      const emotionalCues = cues.filter((c) => c.type === "emotional");
      expect(emotionalCues.length).toBeGreaterThan(0);
    });

    it("should create association fingerprint", async () => {
      const recoveryMetadata = await manager.preserveRecoveryMetadata(
        mockConcept,
        0.6
      );

      const fingerprint = recoveryMetadata.association_fingerprint;
      expect(fingerprint).toBeDefined();
      expect(fingerprint.strong_associations).toBeDefined();
      expect(fingerprint.weak_associations).toBeDefined();
      expect(fingerprint.semantic_clusters).toBeDefined();
      expect(fingerprint.temporal_neighbors).toBeDefined();
      expect(fingerprint.contextual_tags).toBeDefined();

      // For concept with relations, should have associations
      expect(fingerprint.strong_associations.length).toBeGreaterThan(0);
    });

    it("should estimate recovery difficulty accurately", async () => {
      // High importance memory should have lower recovery difficulty
      const highImportanceEpisode = { ...mockEpisode, importance: 0.9 };
      const highImportanceMetadata = await manager.preserveRecoveryMetadata(
        highImportanceEpisode,
        0.5
      );

      // Low importance memory should have higher recovery difficulty
      const lowImportanceEpisode = { ...mockEpisode, importance: 0.1 };
      const lowImportanceMetadata = await manager.preserveRecoveryMetadata(
        lowImportanceEpisode,
        0.5
      );

      expect(highImportanceMetadata.recovery_difficulty_estimate).toBeLessThan(
        lowImportanceMetadata.recovery_difficulty_estimate
      );
    });
  });

  describe("Stage Filtering", () => {
    it("should filter stages to reach target degradation level", async () => {
      const stages: DegradationStage[] = [
        {
          stage_id: "stage_1",
          name: "Stage 1",
          description: "First stage",
          degradation_factor: 0.2,
          duration_ms: 1000,
          reversible: true,
          metadata_preservation: MetadataPreservationLevel.FULL,
        },
        {
          stage_id: "stage_2",
          name: "Stage 2",
          description: "Second stage",
          degradation_factor: 0.3,
          duration_ms: 2000,
          reversible: true,
          metadata_preservation: MetadataPreservationLevel.PARTIAL,
        },
        {
          stage_id: "stage_3",
          name: "Stage 3",
          description: "Third stage",
          degradation_factor: 0.4,
          duration_ms: 3000,
          reversible: false,
          metadata_preservation: MetadataPreservationLevel.MINIMAL,
        },
      ];

      // Target 0.4 should include first two stages (0.2 + 0.3 = 0.5 >= 0.4)
      const process = await manager.initiateDegradation(
        mockEpisode,
        0.4,
        stages
      );

      expect(process.stages.length).toBe(2);
      expect(process.stages[0].stage_id).toBe("stage_1");
      expect(process.stages[1].stage_id).toBe("stage_2");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid process IDs gracefully", async () => {
      await expect(
        manager.executeNextStage("invalid-process-id")
      ).rejects.toThrow("not found");

      await expect(
        manager.pauseDegradation("invalid-process-id")
      ).rejects.toThrow("not found");

      await expect(
        manager.resumeDegradation("invalid-process-id")
      ).rejects.toThrow("not found");

      await expect(
        manager.cancelDegradation("invalid-process-id")
      ).rejects.toThrow("not found");

      await expect(
        manager.getDegradationStatus("invalid-process-id")
      ).rejects.toThrow("not found");
    });

    it("should handle memory objects without required fields", async () => {
      const incompleteMemory = {
        content: "Incomplete memory",
        // Missing other required fields
      };

      // Should not throw error, but handle gracefully
      const process = await manager.initiateDegradation(
        incompleteMemory as any,
        0.3
      );

      expect(process).toBeDefined();
      expect(process.status.recovery_metadata).toBeDefined();
    });
  });

  describe("Cleanup", () => {
    it("should cleanup resources properly", async () => {
      // Create some processes
      await manager.initiateDegradation(mockEpisode, 0.3);
      await manager.initiateDegradation(mockConcept, 0.4);

      // Cleanup should not throw
      await expect(manager.cleanup()).resolves.not.toThrow();
    });
  });
});
