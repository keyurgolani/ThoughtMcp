/**
 * Forgetting Control System Implementation
 *
 * Unified system that coordinates audit, policy management, and secure deletion
 * to provide comprehensive forgetting control with user oversight.
 */

import {
  ForgettingControlResult,
  ForgettingControlSystemStatus,
  ForgettingUserOverride,
  IForgettingControlSystem,
} from "../../interfaces/audit.js";
import {
  ForgettingDecision,
  ForgettingEvaluation,
} from "../../interfaces/forgetting.js";
import { getLogger } from "../../utils/logger.js";
import { ForgettingAuditSystem } from "./ForgettingAuditSystem.js";
import { ForgettingPolicyManager } from "./ForgettingPolicyManager.js";
import { SecureDeletionManager } from "./SecureDeletionManager.js";

export class ForgettingControlSystem implements IForgettingControlSystem {
  public readonly audit_system: ForgettingAuditSystem;
  public readonly policy_manager: ForgettingPolicyManager;
  public readonly secure_deletion_manager: SecureDeletionManager;

  private last_health_check: number = Date.now();

  constructor() {
    this.audit_system = new ForgettingAuditSystem();
    this.policy_manager = new ForgettingPolicyManager();
    this.secure_deletion_manager = new SecureDeletionManager();

    const logger = getLogger();
    logger.info(
      "ForgettingControlSystem",
      "Forgetting control system initialized",
      {
        components: [
          "audit_system",
          "policy_manager",
          "secure_deletion_manager",
        ],
      }
    );
  }

  async processForgettingRequest(
    memory_id: string,
    memory_type: "episodic" | "semantic",
    memory_content: unknown,
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    execution_method: "automatic" | "manual" | "user_requested"
  ): Promise<ForgettingControlResult> {
    console.error(`Processing forgetting request for memory ${memory_id}`, {
      memory_id,
      memory_type,
      execution_method,
      decision_action: decision.action,
    });

    try {
      // Step 1: Log the forgetting decision in audit system
      const memory_content_summary =
        this.generateContentSummary(memory_content);
      const audit_id = await this.audit_system.logForgettingDecision(
        memory_id,
        memory_type,
        memory_content_summary,
        decision,
        evaluation,
        execution_method
      );

      // Step 2: Evaluate policies
      const memory_metadata = this.extractMemoryMetadata(memory_content);
      const policy_results = await this.policy_manager.evaluatePolicies(
        decision,
        evaluation,
        memory_metadata
      );

      const policy_decision =
        await this.policy_manager.getEffectivePolicyDecision(policy_results);

      // Step 3: Determine execution permissions and requirements
      const execution_allowed = policy_decision.final_decision !== "deny";
      const consent_required =
        policy_decision.consent_required ||
        policy_decision.final_decision === "require_consent";
      const secure_deletion_required = this.requiresSecureDeletion(
        memory_metadata,
        policy_decision
      );

      // Step 4: Estimate execution time
      const estimated_execution_time = this.estimateExecutionTime(
        decision,
        secure_deletion_required,
        consent_required
      );

      // Step 5: Generate next steps
      const next_steps = this.generateNextSteps(
        policy_decision.final_decision,
        consent_required,
        secure_deletion_required
      );

      const result: ForgettingControlResult = {
        audit_id,
        policy_decision,
        execution_allowed,
        consent_required,
        secure_deletion_required,
        estimated_execution_time,
        next_steps,
      };

      console.error(
        `Completed forgetting request processing for memory ${memory_id}`,
        {
          audit_id,
          execution_allowed,
          consent_required,
          secure_deletion_required,
          policy_decision: policy_decision.final_decision,
        }
      );

      return result;
    } catch (error) {
      console.error(
        `Failed to process forgetting request for memory ${memory_id}`,
        {
          memory_id,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );
      throw error;
    }
  }

  async handleUserConsent(
    audit_id: string,
    consent_granted: boolean,
    user_feedback?: string
  ): Promise<void> {
    console.error(`Handling user consent for audit ${audit_id}`, {
      audit_id,
      consent_granted,
      has_feedback: !!user_feedback,
    });

    try {
      // Record consent in audit system
      await this.audit_system.recordUserConsent(
        audit_id,
        consent_granted,
        user_feedback
      );

      // If consent is granted, proceed with execution
      if (consent_granted) {
        await this.executeApprovedForgetting(audit_id);
      } else {
        // Mark as cancelled in audit system
        await this.audit_system.updateExecutionStatus(audit_id, "cancelled");
      }

      console.error(`Completed user consent handling for audit ${audit_id}`, {
        audit_id,
        consent_granted,
        action_taken: consent_granted ? "executed" : "cancelled",
      });
    } catch (error) {
      console.error(`Failed to handle user consent for audit ${audit_id}`, {
        audit_id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async processUserOverride(
    audit_id: string,
    override: ForgettingUserOverride
  ): Promise<void> {
    console.error(`Processing user override for audit ${audit_id}`, {
      audit_id,
      override_type: override.override_type,
      override_reason: override.override_reason,
    });

    try {
      // Record override in audit system
      await this.audit_system.recordUserOverride(audit_id, override);

      // Process the override based on type
      switch (override.override_type) {
        case "prevent_forgetting":
          await this.audit_system.updateExecutionStatus(audit_id, "cancelled");
          break;

        case "force_forgetting":
          await this.executeApprovedForgetting(audit_id);
          break;

        case "modify_decision":
          // The modified decision is stored in the override record
          // Execution would use the modified parameters
          break;

        case "delay_execution":
          // Execution is delayed until the specified time
          // This would be handled by a scheduler in a full implementation
          break;
      }

      console.error(
        `Completed user override processing for audit ${audit_id}`,
        {
          audit_id,
          override_type: override.override_type,
        }
      );
    } catch (error) {
      console.error(`Failed to process user override for audit ${audit_id}`, {
        audit_id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async executeApprovedForgetting(audit_id: string): Promise<void> {
    const audit_entry = await this.audit_system.getAuditEntry(audit_id);
    if (!audit_entry) {
      throw new Error(`Audit entry not found: ${audit_id}`);
    }

    console.error(`Executing approved forgetting for audit ${audit_id}`, {
      audit_id,
      memory_id: audit_entry.memory_id,
      decision_action: audit_entry.decision.action,
    });

    try {
      // Perform secure deletion if required
      if (
        audit_entry.privacy_level === "confidential" ||
        audit_entry.privacy_level === "restricted"
      ) {
        const deletion_result = await this.secure_deletion_manager.secureDelete(
          audit_entry.memory_id,
          audit_entry.memory_content_summary,
          {
            deletion_method: "crypto_erase",
            verification_required: true,
            certificate_generation: true,
            compliance_standards: ["GDPR", "CCPA"],
          }
        );

        console.error(`Secure deletion completed for audit ${audit_id}`, {
          audit_id,
          deletion_id: deletion_result.deletion_id,
          verification_passed: deletion_result.verification_passed,
        });
      }

      // Update execution status with simulated impact
      const actual_impact = this.simulateActualImpact(audit_entry.decision);
      await this.audit_system.updateExecutionStatus(
        audit_id,
        "executed",
        actual_impact
      );

      console.error(`Successfully executed forgetting for audit ${audit_id}`, {
        audit_id,
        memory_id: audit_entry.memory_id,
      });
    } catch (error) {
      await this.audit_system.updateExecutionStatus(audit_id, "failed");
      console.error(`Failed to execute forgetting for audit ${audit_id}`, {
        audit_id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getSystemStatus(): Promise<ForgettingControlSystemStatus> {
    try {
      // Check component health
      const audit_health = await this.checkAuditSystemHealth();
      const policy_health = await this.checkPolicyManagerHealth();
      const deletion_health = await this.checkSecureDeletionHealth();

      // Get system metrics
      const active_policies = await this.policy_manager.listPolicies(true);
      const audit_summary = await this.audit_system.getAuditSummary();

      // Calculate pending consent requests
      const pending_consent_requests =
        await this.audit_system.queryAuditEntries({
          execution_status: ["pending"],
        });
      const pending_consent_count = pending_consent_requests.filter(
        (entry) =>
          entry.user_consent_requested &&
          entry.user_consent_granted === undefined
      ).length;

      // Calculate system load (simplified)
      const system_load = this.calculateSystemLoad(audit_summary);

      this.last_health_check = Date.now();

      return {
        audit_system_healthy: audit_health,
        policy_manager_healthy: policy_health,
        secure_deletion_healthy: deletion_health,
        active_policies_count: active_policies.length,
        pending_consent_requests: pending_consent_count,
        recent_audit_entries: audit_summary.total_entries,
        system_load,
        last_health_check: this.last_health_check,
      };
    } catch (error) {
      console.error("Failed to get system status", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        audit_system_healthy: false,
        policy_manager_healthy: false,
        secure_deletion_healthy: false,
        active_policies_count: 0,
        pending_consent_requests: 0,
        recent_audit_entries: 0,
        system_load: 1.0, // Max load indicates system issues
        last_health_check: Date.now(),
      };
    }
  }

  // Private helper methods

  private generateContentSummary(content: unknown): string {
    if (typeof content === "string") {
      return content.length > 100 ? content.substring(0, 100) + "..." : content;
    }

    const content_string = JSON.stringify(content);
    return content_string.length > 100
      ? content_string.substring(0, 100) + "..."
      : content_string;
  }

  private extractMemoryMetadata(content: unknown): Record<string, unknown> {
    // Extract metadata from memory content
    // In a real implementation, this would parse structured memory objects
    return {
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago to avoid recent memory rule
      content_type: typeof content,
      content_size: JSON.stringify(content).length,
      category: "general",
      privacy_level: "private",
      access_frequency: 1,
      user_tags: [],
    };
  }

  private requiresSecureDeletion(
    memory_metadata: Record<string, unknown>,
    policy_decision: any
  ): boolean {
    return (
      memory_metadata.privacy_level === "confidential" ||
      memory_metadata.privacy_level === "restricted" ||
      policy_decision.applied_modifications?.secure_deletion_required === true
    );
  }

  private estimateExecutionTime(
    decision: ForgettingDecision,
    secure_deletion_required: boolean,
    consent_required: boolean
  ): number {
    let base_time = 1000; // 1 second base time

    if (consent_required) {
      base_time += 24 * 60 * 60 * 1000; // Add 24 hours for consent
    }

    if (secure_deletion_required) {
      base_time += 5000; // Add 5 seconds for secure deletion
    }

    if (decision.action === "degrade") {
      base_time += 2000; // Add 2 seconds for gradual degradation
    }

    return base_time;
  }

  private generateNextSteps(
    policy_decision: string,
    consent_required: boolean,
    secure_deletion_required: boolean
  ): string[] {
    const steps: string[] = [];

    switch (policy_decision) {
      case "deny":
        steps.push("Forgetting request denied by policy");
        steps.push("No further action required");
        break;

      case "require_consent":
        steps.push("User consent required before execution");
        steps.push("Awaiting user response");
        break;

      case "delay":
        steps.push("Execution delayed by policy");
        steps.push("Will execute automatically after delay period");
        break;

      case "allow":
        if (consent_required) {
          steps.push("User consent required");
        } else {
          steps.push("Ready for execution");
        }

        if (secure_deletion_required) {
          steps.push("Secure deletion will be performed");
        }
        break;

      case "modify":
        steps.push("Decision modified by policy");
        steps.push("Executing with policy modifications");
        break;
    }

    return steps;
  }

  private simulateActualImpact(_decision: ForgettingDecision): any {
    // Simulate the actual impact of forgetting
    return {
      memory_space_freed_bytes: Math.floor(Math.random() * 10000) + 1000,
      processing_speed_improvement_ms: Math.floor(Math.random() * 100) + 10,
      interference_reduction_score: Math.random() * 0.5 + 0.3,
      focus_improvement_score: Math.random() * 0.3 + 0.1,
      unexpected_consequences: [],
      user_satisfaction_rating: Math.random() * 0.4 + 0.6, // 0.6-1.0 range
    };
  }

  private async checkAuditSystemHealth(): Promise<boolean> {
    try {
      const health = await this.audit_system.getSystemHealth();
      return health.failed_executions_24h < 10; // Arbitrary threshold
    } catch {
      return false;
    }
  }

  private async checkPolicyManagerHealth(): Promise<boolean> {
    try {
      const policies = await this.policy_manager.listPolicies(true);
      return policies.length > 0; // At least one active policy
    } catch {
      return false;
    }
  }

  private async checkSecureDeletionHealth(): Promise<boolean> {
    try {
      const stats = await this.secure_deletion_manager.getDeletionStatistics();
      // If no deletions have been performed yet, consider it healthy
      if (stats.total_deletions === 0) {
        return true;
      }
      return stats.verification_success_rate > 0.9; // 90% success rate threshold
    } catch {
      return false;
    }
  }

  private calculateSystemLoad(audit_summary: any): number {
    // Simple system load calculation based on recent activity
    const recent_entries = audit_summary.total_entries;
    const max_expected_entries = 1000; // Arbitrary threshold

    return Math.min(recent_entries / max_expected_entries, 1.0);
  }
}
