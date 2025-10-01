/**
 * Integration tests for Forgetting Audit and Control System
 *
 * Tests the complete forgetting audit and control workflow including
 * audit logging, policy evaluation, user consent, and secure deletion.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ForgettingAuditSystem } from "../../cognitive/forgetting/ForgettingAuditSystem.js";
import { ForgettingControlSystem } from "../../cognitive/forgetting/ForgettingControlSystem.js";
import { ForgettingPolicyManager } from "../../cognitive/forgetting/ForgettingPolicyManager.js";
import { SecureDeletionManager } from "../../cognitive/forgetting/SecureDeletionManager.js";
import {
  ForgettingDecision,
  ForgettingEvaluation,
} from "../../interfaces/forgetting.js";

describe("Forgetting Audit and Control System Integration Tests", () => {
  let auditSystem: ForgettingAuditSystem;
  let policyManager: ForgettingPolicyManager;
  let secureDeletionManager: SecureDeletionManager;
  let controlSystem: ForgettingControlSystem;

  beforeEach(() => {
    auditSystem = new ForgettingAuditSystem();
    policyManager = new ForgettingPolicyManager();
    secureDeletionManager = new SecureDeletionManager();
    controlSystem = new ForgettingControlSystem();
  });

  afterEach(() => {
    // Cleanup any test data
  });

  describe("Audit System Integration", () => {
    it("should log and track complete forgetting workflow", async () => {
      // Create test forgetting decision and evaluation
      const decision: ForgettingDecision = {
        memory_id: "test_memory_001",
        action: "forget",
        confidence: 0.8,
        reasoning: "Memory is old and rarely accessed",
        user_consent_required: true,
        execution_priority: 5,
        estimated_benefit: {
          memory_space_freed: 1024,
          processing_speed_improvement: 50,
          interference_reduction: 0.3,
          focus_improvement: 0.2,
        },
      };

      const evaluation: ForgettingEvaluation = {
        memory_id: "test_memory_001",
        memory_type: "episodic",
        memory_content_summary: "Old conversation about weather",
        strategy_scores: [
          {
            strategy_name: "temporal_decay",
            score: 0.7,
            confidence: 0.8,
            reasoning: ["Memory is 30 days old", "Last accessed 15 days ago"],
            factors: [
              {
                name: "age",
                value: 30,
                weight: 0.5,
                description: "Days since creation",
              },
            ],
          },
        ],
        combined_score: 0.7,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "Memory meets forgetting criteria",
          alternative_actions: ["archive", "degrade"],
        },
        requires_user_consent: true,
        estimated_impact: {
          retrieval_loss_probability: 0.1,
          related_memories_affected: 2,
          knowledge_gap_risk: 0.2,
          recovery_difficulty: 0.4,
        },
      };

      // Log the forgetting decision
      const audit_id = await auditSystem.logForgettingDecision(
        "test_memory_001",
        "episodic",
        "Old conversation about weather",
        decision,
        evaluation,
        "automatic"
      );

      expect(audit_id).toBeDefined();
      expect(audit_id).toMatch(/^audit_\d+_\d+$/);

      // Verify audit entry was created
      const auditEntry = await auditSystem.getAuditEntry(audit_id);
      expect(auditEntry).toBeDefined();
      expect(auditEntry!.memory_id).toBe("test_memory_001");
      expect(auditEntry!.execution_status).toBe("pending");
      expect(auditEntry!.user_consent_requested).toBe(true);

      // Simulate user consent
      await auditSystem.recordUserConsent(
        audit_id,
        true,
        "Approved for deletion"
      );

      // Update execution status
      const actual_impact = {
        memory_space_freed_bytes: 1024,
        processing_speed_improvement_ms: 50,
        interference_reduction_score: 0.3,
        focus_improvement_score: 0.2,
        unexpected_consequences: [],
        user_satisfaction_rating: 0.8,
      };

      await auditSystem.updateExecutionStatus(
        audit_id,
        "executed",
        actual_impact
      );

      // Verify final audit entry state
      const finalEntry = await auditSystem.getAuditEntry(audit_id);
      expect(finalEntry!.execution_status).toBe("executed");
      expect(finalEntry!.user_consent_granted).toBe(true);
      expect(finalEntry!.actual_impact).toEqual(actual_impact);
    });

    it("should generate comprehensive audit summaries", async () => {
      // Create multiple audit entries
      const decisions = Array.from({ length: 5 }, (_, i) => ({
        memory_id: `test_memory_${i}`,
        action: "forget" as const,
        confidence: 0.7 + i * 0.05,
        reasoning: `Test reasoning ${i}`,
        user_consent_required: i % 2 === 0,
        execution_priority: i + 1,
        estimated_benefit: {
          memory_space_freed: 1000 + i * 100,
          processing_speed_improvement: 10 + i * 5,
          interference_reduction: 0.1 + i * 0.05,
          focus_improvement: 0.1 + i * 0.03,
        },
      }));

      const evaluations = decisions.map((decision, i) => ({
        memory_id: decision.memory_id,
        memory_type: "episodic" as const,
        memory_content_summary: `Test content ${i}`,
        strategy_scores: [],
        combined_score: 0.6 + i * 0.05,
        recommendation: {
          action: "forget" as const,
          confidence: 0.7,
          reasoning: "Test recommendation",
          alternative_actions: ["archive"],
        },
        requires_user_consent: decision.user_consent_required,
        estimated_impact: {
          retrieval_loss_probability: 0.1,
          related_memories_affected: 1,
          knowledge_gap_risk: 0.1,
          recovery_difficulty: 0.3,
        },
      }));

      // Log all decisions
      const audit_ids = [];
      for (let i = 0; i < decisions.length; i++) {
        const audit_id = await auditSystem.logForgettingDecision(
          decisions[i].memory_id,
          "episodic",
          evaluations[i].memory_content_summary,
          decisions[i],
          evaluations[i],
          "automatic"
        );
        audit_ids.push(audit_id);

        // Record consent for entries that require it
        if (decisions[i].user_consent_required) {
          await auditSystem.recordUserConsent(audit_id, true, "Test consent");
        }

        // Simulate some executions
        if (i < 3) {
          await auditSystem.updateExecutionStatus(audit_id, "executed", {
            memory_space_freed_bytes: 1000 + i * 100,
            processing_speed_improvement_ms: 10 + i * 5,
            interference_reduction_score: 0.1 + i * 0.05,
            focus_improvement_score: 0.1 + i * 0.03,
            unexpected_consequences: [],
            user_satisfaction_rating: 0.8,
          });
        }
      }

      // Get audit summary
      const summary = await auditSystem.getAuditSummary();

      expect(summary.total_entries).toBe(5);
      expect(summary.entries_by_status.pending).toBe(2);
      expect(summary.entries_by_status.executed).toBe(3);
      expect(summary.entries_by_method.automatic).toBe(5);
      expect(summary.user_consent_rate).toBeGreaterThan(0);
    });

    it("should export audit data in multiple formats", async () => {
      // Create test audit entry
      const decision: ForgettingDecision = {
        memory_id: "export_test_memory",
        action: "forget",
        confidence: 0.8,
        reasoning: "Test export",
        user_consent_required: false,
        execution_priority: 3,
        estimated_benefit: {
          memory_space_freed: 500,
          processing_speed_improvement: 25,
          interference_reduction: 0.2,
          focus_improvement: 0.1,
        },
      };

      const evaluation: ForgettingEvaluation = {
        memory_id: "export_test_memory",
        memory_type: "semantic",
        memory_content_summary: "Test export content",
        strategy_scores: [],
        combined_score: 0.8,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "Test export recommendation",
          alternative_actions: [],
        },
        requires_user_consent: false,
        estimated_impact: {
          retrieval_loss_probability: 0.05,
          related_memories_affected: 0,
          knowledge_gap_risk: 0.1,
          recovery_difficulty: 0.2,
        },
      };

      await auditSystem.logForgettingDecision(
        "export_test_memory",
        "semantic",
        "Test export content",
        decision,
        evaluation,
        "manual"
      );

      // Test JSON export
      const jsonExport = await auditSystem.exportAuditData({}, "json");
      expect(jsonExport).toContain("export_test_memory");
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      // Test CSV export
      const csvExport = await auditSystem.exportAuditData({}, "csv");
      expect(csvExport).toContain("audit_id,timestamp");
      expect(csvExport).toContain("export_test_memory");

      // Test XML export
      const xmlExport = await auditSystem.exportAuditData({}, "xml");
      expect(xmlExport).toContain("<?xml version");
      expect(xmlExport).toContain("<audit_entries>");
      expect(xmlExport).toContain("export_test_memory");
    });
  });

  describe("Policy Management Integration", () => {
    it("should create and evaluate custom policies", async () => {
      // Create a custom policy
      const policyData = {
        policy_name: "Test Strict Policy",
        description: "Strict policy for testing",
        active: true,
        rules: [
          {
            rule_name: "Protect Recent Memories",
            description: "Don't forget memories less than 1 day old",
            priority: 100,
            conditions: [
              {
                condition_type: "age_days" as const,
                operator: "less_than" as const,
                value: 1,
              },
            ],
            condition_logic: "AND" as const,
            action: "deny" as const,
          },
        ],
        user_preferences: {
          consent_required_by_default: true,
          protected_categories: ["important", "personal"],
          max_auto_forget_importance: 0.2,
          retention_period_days: 30,
          notification_preferences: {
            notify_before_forgetting: true,
            notification_delay_hours: 12,
            notify_after_forgetting: false,
            notification_methods: ["in_app"],
          },
          privacy_preferences: {
            default_privacy_level: "private" as const,
            secure_deletion_required: false,
            audit_encryption_required: false,
            data_retention_days: 365,
          },
        },
        execution_settings: {
          max_concurrent_operations: 3,
          batch_size: 5,
          execution_delay_ms: 500,
          retry_attempts: 2,
          rollback_enabled: true,
          backup_before_deletion: true,
        },
      };

      const policy_id = await policyManager.createPolicy(policyData);
      expect(policy_id).toBeDefined();

      // Test policy evaluation
      const decision: ForgettingDecision = {
        memory_id: "recent_memory",
        action: "forget",
        confidence: 0.9,
        reasoning: "Test recent memory",
        user_consent_required: false,
        execution_priority: 5,
        estimated_benefit: {
          memory_space_freed: 100,
          processing_speed_improvement: 10,
          interference_reduction: 0.1,
          focus_improvement: 0.05,
        },
      };

      const evaluation: ForgettingEvaluation = {
        memory_id: "recent_memory",
        memory_type: "episodic",
        memory_content_summary: "Recent test memory",
        strategy_scores: [],
        combined_score: 0.9,
        recommendation: {
          action: "forget",
          confidence: 0.9,
          reasoning: "High forgetting score",
          alternative_actions: [],
        },
        requires_user_consent: false,
        estimated_impact: {
          retrieval_loss_probability: 0.05,
          related_memories_affected: 0,
          knowledge_gap_risk: 0.05,
          recovery_difficulty: 0.1,
        },
      };

      const memory_metadata = {
        timestamp: Date.now(), // Recent memory
        category: "general",
        privacy_level: "private",
        access_frequency: 1,
      };

      const policy_results = await policyManager.evaluatePolicies(
        decision,
        evaluation,
        memory_metadata
      );

      expect(policy_results).toHaveLength(2); // Default + custom policy

      const effective_decision = await policyManager.getEffectivePolicyDecision(
        policy_results
      );
      expect(effective_decision.final_decision).toBe("deny"); // Should be denied due to recent age
    });

    it("should handle policy conflicts correctly", async () => {
      // Create conflicting policies
      const allowPolicy = {
        policy_name: "Allow Old Memories",
        description: "Allow forgetting of old memories",
        active: true,
        rules: [
          {
            rule_name: "Allow Old",
            description: "Allow forgetting memories older than 7 days",
            priority: 50,
            conditions: [
              {
                condition_type: "age_days" as const,
                operator: "greater_than" as const,
                value: 7,
              },
            ],
            condition_logic: "AND" as const,
            action: "allow" as const,
          },
        ],
        user_preferences: {
          consent_required_by_default: false,
          protected_categories: [],
          max_auto_forget_importance: 0.5,
          retention_period_days: 365,
          notification_preferences: {
            notify_before_forgetting: false,
            notification_delay_hours: 0,
            notify_after_forgetting: false,
            notification_methods: [],
          },
          privacy_preferences: {
            default_privacy_level: "public" as const,
            secure_deletion_required: false,
            audit_encryption_required: false,
            data_retention_days: 30,
          },
        },
        execution_settings: {
          max_concurrent_operations: 10,
          batch_size: 20,
          execution_delay_ms: 0,
          retry_attempts: 1,
          rollback_enabled: false,
          backup_before_deletion: false,
        },
      };

      const denyPolicy = {
        policy_name: "Deny Important Memories",
        description: "Deny forgetting of important memories",
        active: true,
        rules: [
          {
            rule_name: "Deny Important",
            description: "Deny forgetting important memories",
            priority: 80, // Higher priority than allow policy
            conditions: [
              {
                condition_type: "content_category" as const,
                operator: "equals" as const,
                value: "important",
              },
            ],
            condition_logic: "AND" as const,
            action: "deny" as const,
          },
        ],
        user_preferences: {
          consent_required_by_default: true,
          protected_categories: ["important"],
          max_auto_forget_importance: 0.1,
          retention_period_days: 1095, // 3 years
          notification_preferences: {
            notify_before_forgetting: true,
            notification_delay_hours: 48,
            notify_after_forgetting: true,
            notification_methods: ["email", "in_app"],
          },
          privacy_preferences: {
            default_privacy_level: "confidential" as const,
            secure_deletion_required: true,
            audit_encryption_required: true,
            data_retention_days: 2555, // 7 years
          },
        },
        execution_settings: {
          max_concurrent_operations: 1,
          batch_size: 1,
          execution_delay_ms: 5000,
          retry_attempts: 5,
          rollback_enabled: true,
          backup_before_deletion: true,
        },
      };

      await policyManager.createPolicy(allowPolicy);
      await policyManager.createPolicy(denyPolicy);

      // Test with old important memory (should be denied due to higher priority deny rule)
      const decision: ForgettingDecision = {
        memory_id: "old_important_memory",
        action: "forget",
        confidence: 0.8,
        reasoning: "Old memory",
        user_consent_required: false,
        execution_priority: 3,
        estimated_benefit: {
          memory_space_freed: 200,
          processing_speed_improvement: 20,
          interference_reduction: 0.15,
          focus_improvement: 0.1,
        },
      };

      const evaluation: ForgettingEvaluation = {
        memory_id: "old_important_memory",
        memory_type: "semantic",
        memory_content_summary: "Important old information",
        strategy_scores: [],
        combined_score: 0.8,
        recommendation: {
          action: "forget",
          confidence: 0.8,
          reasoning: "Old memory recommendation",
          alternative_actions: ["archive"],
        },
        requires_user_consent: false,
        estimated_impact: {
          retrieval_loss_probability: 0.1,
          related_memories_affected: 1,
          knowledge_gap_risk: 0.2,
          recovery_difficulty: 0.3,
        },
      };

      const memory_metadata = {
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days old
        category: "important",
        privacy_level: "confidential",
        access_frequency: 5,
      };

      const policy_results = await policyManager.evaluatePolicies(
        decision,
        evaluation,
        memory_metadata
      );

      const effective_decision = await policyManager.getEffectivePolicyDecision(
        policy_results
      );
      expect(effective_decision.final_decision).toBe("deny"); // Deny should win due to higher priority
    });
  });

  describe("Secure Deletion Integration", () => {
    it("should perform secure deletion with compliance attestation", async () => {
      const test_content = {
        id: "secure_test_001",
        data: "Sensitive information to be securely deleted",
        metadata: { category: "confidential", created: Date.now() },
      };

      const deletion_options = {
        deletion_method: "crypto_erase" as const,
        verification_required: true,
        certificate_generation: true,
        compliance_standards: ["GDPR", "CCPA", "HIPAA"],
      };

      const deletion_result = await secureDeletionManager.secureDelete(
        "secure_test_001",
        test_content,
        deletion_options
      );

      expect(deletion_result.success).toBe(true);
      expect(deletion_result.deletion_method).toBe("crypto_erase");
      expect(deletion_result.verification_passed).toBe(true);
      expect(deletion_result.recovery_impossible).toBe(true);
      expect(deletion_result.certificate_id).toBeDefined();
      expect(deletion_result.compliance_attestation.standards_met).toEqual([
        "GDPR",
        "CCPA",
        "HIPAA",
      ]);

      // Verify deletion
      const verification_result = await secureDeletionManager.verifyDeletion(
        deletion_result.deletion_id
      );
      expect(verification_result).toBe(true);

      // Generate compliance certificate
      const certificate =
        await secureDeletionManager.generateComplianceCertificate(
          deletion_result.deletion_id,
          ["GDPR", "CCPA"]
        );
      expect(certificate).toContain("Compliance Certificate");
      expect(certificate).toContain("GDPR");
      expect(certificate).toContain("CCPA");
    });

    it("should track deletion statistics and audit trails", async () => {
      // Perform multiple deletions with different methods
      const deletion_methods = [
        "overwrite",
        "crypto_erase",
        "physical_destroy",
      ] as const;
      const deletion_results = [];

      for (let i = 0; i < deletion_methods.length; i++) {
        const method = deletion_methods[i];
        const result = await secureDeletionManager.secureDelete(
          `test_memory_${i}`,
          { data: `Test data ${i}` },
          {
            deletion_method: method,
            verification_required: true,
            certificate_generation: false,
            compliance_standards: ["GDPR"],
          }
        );
        deletion_results.push(result);
      }

      // Get deletion statistics
      const stats = await secureDeletionManager.getDeletionStatistics();
      expect(stats.total_deletions).toBe(3);
      expect(stats.deletions_by_method.overwrite).toBe(1);
      expect(stats.deletions_by_method.crypto_erase).toBe(1);
      expect(stats.deletions_by_method.physical_destroy).toBe(1);
      expect(stats.verification_success_rate).toBe(1.0);
      expect(stats.recovery_impossible_rate).toBe(1.0);
      expect(stats.compliance_standards_coverage.GDPR).toBe(3);

      // Audit secure deletions
      const audit_results = await secureDeletionManager.auditSecureDeletions();
      expect(audit_results).toHaveLength(3);
      expect(audit_results.every((r) => r.verification_passed)).toBe(true);
    });
  });

  describe("Complete Control System Integration", () => {
    it("should process complete forgetting workflow with all components", async () => {
      const memory_content = {
        id: "integration_test_memory",
        content: "Test memory for complete workflow",
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days old
        category: "general",
        importance: 0.4,
      };

      const decision: ForgettingDecision = {
        memory_id: "integration_test_memory",
        action: "forget",
        confidence: 0.85,
        reasoning: "Memory meets all forgetting criteria",
        user_consent_required: true,
        execution_priority: 7,
        estimated_benefit: {
          memory_space_freed: 2048,
          processing_speed_improvement: 75,
          interference_reduction: 0.4,
          focus_improvement: 0.25,
        },
      };

      const evaluation: ForgettingEvaluation = {
        memory_id: "integration_test_memory",
        memory_type: "episodic",
        memory_content_summary: "Test memory for complete workflow",
        strategy_scores: [
          {
            strategy_name: "temporal_decay",
            score: 0.8,
            confidence: 0.9,
            reasoning: ["Memory is 5 days old", "Moderate access frequency"],
            factors: [
              { name: "age", value: 5, weight: 0.6, description: "Days old" },
              {
                name: "access",
                value: 3,
                weight: 0.4,
                description: "Access count",
              },
            ],
          },
        ],
        combined_score: 0.65,
        recommendation: {
          action: "forget",
          confidence: 0.85,
          reasoning: "Strong candidate for forgetting",
          alternative_actions: ["degrade", "archive"],
        },
        requires_user_consent: true,
        estimated_impact: {
          retrieval_loss_probability: 0.15,
          related_memories_affected: 2,
          knowledge_gap_risk: 0.1,
          recovery_difficulty: 0.3,
        },
      };

      // Process forgetting request through control system
      const control_result = await controlSystem.processForgettingRequest(
        "integration_test_memory",
        "episodic",
        memory_content,
        decision,
        evaluation,
        "manual"
      );

      expect(control_result.audit_id).toBeDefined();
      expect(control_result.execution_allowed).toBe(true);
      expect(control_result.consent_required).toBe(true);
      expect(control_result.next_steps).toContain(
        "User consent required before execution"
      );

      // Handle user consent
      await controlSystem.handleUserConsent(
        control_result.audit_id,
        true,
        "User approved deletion after review"
      );

      // Verify audit entry was updated
      const audit_entry = await controlSystem.audit_system.getAuditEntry(
        control_result.audit_id
      );
      expect(audit_entry!.user_consent_granted).toBe(true);
      expect(audit_entry!.execution_status).toBe("executed");

      // Get system status
      const system_status = await controlSystem.getSystemStatus();
      expect(system_status.audit_system_healthy).toBe(true);
      expect(system_status.policy_manager_healthy).toBe(true);
      expect(system_status.secure_deletion_healthy).toBe(true);
      expect(system_status.active_policies_count).toBeGreaterThan(0);
    });

    it("should handle user overrides correctly", async () => {
      const decision: ForgettingDecision = {
        memory_id: "override_test_memory",
        action: "forget",
        confidence: 0.9,
        reasoning: "High confidence forgetting",
        user_consent_required: false,
        execution_priority: 8,
        estimated_benefit: {
          memory_space_freed: 1500,
          processing_speed_improvement: 60,
          interference_reduction: 0.35,
          focus_improvement: 0.2,
        },
      };

      const evaluation: ForgettingEvaluation = {
        memory_id: "override_test_memory",
        memory_type: "semantic",
        memory_content_summary: "Memory for override testing",
        strategy_scores: [],
        combined_score: 0.9,
        recommendation: {
          action: "forget",
          confidence: 0.9,
          reasoning: "Strong forgetting recommendation",
          alternative_actions: [],
        },
        requires_user_consent: false,
        estimated_impact: {
          retrieval_loss_probability: 0.05,
          related_memories_affected: 0,
          knowledge_gap_risk: 0.05,
          recovery_difficulty: 0.2,
        },
      };

      // Process initial request
      const control_result = await controlSystem.processForgettingRequest(
        "override_test_memory",
        "semantic",
        { content: "Test override content" },
        decision,
        evaluation,
        "automatic"
      );

      // User decides to prevent forgetting
      const user_override = {
        override_type: "prevent_forgetting" as const,
        override_reason: "User wants to keep this memory",
        override_timestamp: Date.now(),
      };

      await controlSystem.processUserOverride(
        control_result.audit_id,
        user_override
      );

      // Verify override was recorded and execution was cancelled
      const audit_entry = await controlSystem.audit_system.getAuditEntry(
        control_result.audit_id
      );
      expect(audit_entry!.user_override).toEqual(user_override);
      expect(audit_entry!.execution_status).toBe("cancelled");
    });

    it("should demonstrate memory efficiency improvements", async () => {
      // Get initial system status
      const initial_status = await controlSystem.getSystemStatus();
      const initial_audit_count = initial_status.recent_audit_entries;

      // Process multiple forgetting operations
      const memory_operations = Array.from({ length: 10 }, (_, i) => ({
        memory_id: `efficiency_test_${i}`,
        content: `Test content ${i}`,
        size_bytes: 100 + i * 50,
      }));

      const processing_results = [];
      for (let i = 0; i < memory_operations.length; i++) {
        const memory = memory_operations[i];
        const decision: ForgettingDecision = {
          memory_id: memory.memory_id,
          action: "forget",
          confidence: 0.7 + i * 0.02,
          reasoning: `Efficiency test ${memory.memory_id}`,
          user_consent_required: false,
          execution_priority: 5,
          estimated_benefit: {
            memory_space_freed: memory.size_bytes,
            processing_speed_improvement: 10 + i * 2,
            interference_reduction: 0.1 + i * 0.01,
            focus_improvement: 0.05 + i * 0.005,
          },
        };

        const evaluation: ForgettingEvaluation = {
          memory_id: memory.memory_id,
          memory_type: "episodic",
          memory_content_summary: memory.content,
          strategy_scores: [],
          combined_score: 0.7,
          recommendation: {
            action: "forget",
            confidence: 0.7,
            reasoning: "Efficiency test recommendation",
            alternative_actions: [],
          },
          requires_user_consent: false,
          estimated_impact: {
            retrieval_loss_probability: 0.1,
            related_memories_affected: 0,
            knowledge_gap_risk: 0.05,
            recovery_difficulty: 0.2,
          },
        };

        const result = await controlSystem.processForgettingRequest(
          memory.memory_id,
          "episodic",
          memory,
          decision,
          evaluation,
          "automatic"
        );

        processing_results.push(result);

        // Handle consent and execute if allowed
        if (result.execution_allowed && result.consent_required) {
          await controlSystem.handleUserConsent(
            result.audit_id,
            true,
            "Efficiency test consent"
          );
        }
      }

      // Get audit summary to verify efficiency improvements
      const audit_summary = await controlSystem.audit_system.getAuditSummary();
      expect(audit_summary.total_entries).toBeGreaterThanOrEqual(10);
      expect(audit_summary.total_memory_freed_bytes).toBeGreaterThan(0);
      expect(audit_summary.average_processing_improvement_ms).toBeGreaterThan(
        0
      );

      // Verify system health after operations
      const final_status = await controlSystem.getSystemStatus();
      expect(final_status.audit_system_healthy).toBe(true);
      expect(final_status.recent_audit_entries).toBeGreaterThan(
        initial_audit_count
      );
      expect(final_status.system_load).toBeLessThan(1.0); // System should handle the load
    });
  });
});
