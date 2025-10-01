/**
 * Forgetting Policy Manager Implementation
 *
 * Manages user-defined policies for forgetting decisions, including
 * rule evaluation, policy conflicts resolution, and user preferences.
 */

import {
  ConditionEvaluationResult,
  ForgettingCondition,
  ForgettingPolicy,
  ForgettingPolicyRule,
  IForgettingPolicyManager,
  PolicyEvaluationResult,
  RuleEvaluationResult,
} from "../../interfaces/audit.js";
import {
  ForgettingDecision,
  ForgettingEvaluation,
} from "../../interfaces/forgetting.js";
export class ForgettingPolicyManager implements IForgettingPolicyManager {
  private policies: Map<string, ForgettingPolicy> = new Map();
  private nextPolicyId: number = 1;

  constructor() {
    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    // Create a default conservative policy
    const defaultPolicy: ForgettingPolicy = {
      policy_id: "default_conservative",
      policy_name: "Default Conservative Policy",
      description:
        "Conservative forgetting policy that requires consent for most operations",
      created_timestamp: Date.now(),
      last_modified_timestamp: Date.now(),
      active: true,
      rules: [
        {
          rule_id: "high_importance_protect",
          rule_name: "Protect High Importance Memories",
          description: "Deny forgetting for memories with importance > 0.7",
          priority: 100,
          conditions: [
            {
              condition_type: "importance_threshold",
              operator: "greater_than",
              value: 0.7,
            },
          ],
          condition_logic: "AND",
          action: "deny",
        },
        {
          rule_id: "recent_memories_consent",
          rule_name: "Require Consent for Recent Memories",
          description: "Require user consent for memories less than 7 days old",
          priority: 90,
          conditions: [
            {
              condition_type: "age_days",
              operator: "less_than",
              value: 7,
            },
          ],
          condition_logic: "AND",
          action: "require_consent",
        },
        {
          rule_id: "protected_categories",
          rule_name: "Protect Sensitive Categories",
          description: "Require consent for protected content categories",
          priority: 95,
          conditions: [
            {
              condition_type: "content_category",
              operator: "in",
              value: ["personal", "confidential", "medical", "financial"],
            },
          ],
          condition_logic: "AND",
          action: "require_consent",
        },
      ],
      user_preferences: {
        consent_required_by_default: true,
        protected_categories: [
          "personal",
          "confidential",
          "medical",
          "financial",
        ],
        max_auto_forget_importance: 0.3,
        retention_period_days: 365,
        notification_preferences: {
          notify_before_forgetting: true,
          notification_delay_hours: 24,
          notify_after_forgetting: true,
          notification_methods: ["in_app", "log"],
        },
        privacy_preferences: {
          default_privacy_level: "private",
          secure_deletion_required: true,
          audit_encryption_required: true,
          data_retention_days: 2555, // 7 years
        },
      },
      execution_settings: {
        max_concurrent_operations: 5,
        batch_size: 10,
        execution_delay_ms: 1000,
        retry_attempts: 3,
        rollback_enabled: true,
        backup_before_deletion: true,
      },
    };

    this.policies.set(defaultPolicy.policy_id, defaultPolicy);
    console.error("Initialized default conservative policy");
  }

  async createPolicy(
    policy: Omit<
      ForgettingPolicy,
      "policy_id" | "created_timestamp" | "last_modified_timestamp"
    >
  ): Promise<string> {
    const policy_id = `policy_${this.nextPolicyId++}_${Date.now()}`;
    const timestamp = Date.now();

    const newPolicy: ForgettingPolicy = {
      ...policy,
      policy_id,
      created_timestamp: timestamp,
      last_modified_timestamp: timestamp,
    };

    // Validate policy structure
    this.validatePolicy(newPolicy);

    this.policies.set(policy_id, newPolicy);

    console.error(`Created new policy: ${policy.policy_name}`, {
      policy_id,
      rules_count: policy.rules.length,
      active: policy.active,
    });

    return policy_id;
  }

  async updatePolicy(
    policy_id: string,
    updates: Partial<ForgettingPolicy>
  ): Promise<void> {
    const existingPolicy = this.policies.get(policy_id);
    if (!existingPolicy) {
      throw new Error(`Policy not found: ${policy_id}`);
    }

    const updatedPolicy: ForgettingPolicy = {
      ...existingPolicy,
      ...updates,
      policy_id, // Ensure ID doesn't change
      created_timestamp: existingPolicy.created_timestamp, // Preserve creation time
      last_modified_timestamp: Date.now(),
    };

    // Validate updated policy
    this.validatePolicy(updatedPolicy);

    this.policies.set(policy_id, updatedPolicy);

    console.error(`Updated policy: ${updatedPolicy.policy_name}`, {
      policy_id,
      updated_fields: Object.keys(updates),
    });
  }

  async deletePolicy(policy_id: string): Promise<void> {
    if (policy_id === "default_conservative") {
      throw new Error("Cannot delete the default conservative policy");
    }

    const policy = this.policies.get(policy_id);
    if (!policy) {
      throw new Error(`Policy not found: ${policy_id}`);
    }

    this.policies.delete(policy_id);

    console.error(`Deleted policy: ${policy.policy_name}`, {
      policy_id,
    });
  }

  async getPolicy(policy_id: string): Promise<ForgettingPolicy | null> {
    return this.policies.get(policy_id) || null;
  }

  async listPolicies(
    active_only: boolean = false
  ): Promise<ForgettingPolicy[]> {
    let policies = Array.from(this.policies.values());

    if (active_only) {
      policies = policies.filter((policy) => policy.active);
    }

    return policies.sort(
      (a, b) => b.last_modified_timestamp - a.last_modified_timestamp
    );
  }

  async evaluatePolicies(
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    memory_metadata: Record<string, unknown>
  ): Promise<PolicyEvaluationResult[]> {
    const activePolicies = Array.from(this.policies.values()).filter(
      (policy) => policy.active
    );
    const results: PolicyEvaluationResult[] = [];

    for (const policy of activePolicies) {
      const result = await this.evaluatePolicy(
        policy,
        evaluation,
        memory_metadata
      );
      results.push(result);
    }

    console.error(`Evaluated ${activePolicies.length} policies`, {
      memory_id: decision.memory_id,
      results_count: results.length,
    });

    return results;
  }

  private async evaluatePolicy(
    policy: ForgettingPolicy,
    evaluation: ForgettingEvaluation,
    memory_metadata: Record<string, unknown>
  ): Promise<PolicyEvaluationResult> {
    const rule_results: RuleEvaluationResult[] = [];
    let final_decision:
      | "allow"
      | "deny"
      | "require_consent"
      | "delay"
      | "modify" = "allow";
    let decision_confidence = 1.0;
    let applied_modifications: Partial<ForgettingDecision> | undefined;
    let delay_until: number | undefined;
    let consent_required = false;
    const reasoning: string[] = [];

    // Sort rules by priority (highest first)
    const sortedRules = [...policy.rules].sort(
      (a, b) => b.priority - a.priority
    );

    for (const rule of sortedRules) {
      const rule_result = await this.evaluateRule(
        rule,
        evaluation,
        memory_metadata
      );
      rule_results.push(rule_result);

      if (rule_result.conditions_met && rule_result.action_applied) {
        // Apply the action from the highest priority matching rule
        switch (rule.action) {
          case "deny":
            final_decision = "deny";
            reasoning.push(`Denied by rule: ${rule.rule_name}`);
            decision_confidence = Math.min(decision_confidence, 0.9);
            break;

          case "require_consent":
            if (final_decision !== "deny") {
              final_decision = "require_consent";
              consent_required = true;
              reasoning.push(`Consent required by rule: ${rule.rule_name}`);
            }
            break;

          case "delay":
            if (
              final_decision !== "deny" &&
              final_decision !== "require_consent"
            ) {
              final_decision = "delay";
              delay_until =
                Date.now() +
                ((rule.action_parameters?.delay_hours as number) || 24) *
                  60 *
                  60 *
                  1000;
              reasoning.push(`Delayed by rule: ${rule.rule_name}`);
            }
            break;

          case "modify":
            if (final_decision === "allow") {
              final_decision = "modify";
              applied_modifications =
                rule.action_parameters as Partial<ForgettingDecision>;
              reasoning.push(`Modified by rule: ${rule.rule_name}`);
            }
            break;

          case "allow":
            if (final_decision === "allow") {
              reasoning.push(`Allowed by rule: ${rule.rule_name}`);
            }
            break;
        }

        // For deny actions, stop processing further rules
        if (rule.action === "deny") {
          break;
        }
      }
    }

    // Apply default user preferences if no specific rule matched
    if (
      rule_results.every((r) => !r.conditions_met) &&
      policy.user_preferences.consent_required_by_default
    ) {
      final_decision = "require_consent";
      consent_required = true;
      reasoning.push("Default policy requires consent");
    }

    return {
      policy_id: policy.policy_id,
      rule_results,
      final_decision,
      decision_confidence,
      applied_modifications,
      delay_until,
      consent_required,
      reasoning,
    };
  }

  private async evaluateRule(
    rule: ForgettingPolicyRule,
    evaluation: ForgettingEvaluation,
    memory_metadata: Record<string, unknown>
  ): Promise<RuleEvaluationResult> {
    const condition_results: ConditionEvaluationResult[] = [];

    for (const condition of rule.conditions) {
      const result = await this.evaluateCondition(
        condition,
        evaluation,
        memory_metadata
      );
      condition_results.push(result);
    }

    // Determine if conditions are met based on logic
    let conditions_met: boolean;
    if (rule.condition_logic === "AND") {
      conditions_met = condition_results.every((r) => r.result);
    } else {
      // OR
      conditions_met = condition_results.some((r) => r.result);
    }

    return {
      rule_id: rule.rule_id,
      rule_name: rule.rule_name,
      conditions_met,
      condition_results,
      action_applied: conditions_met,
      priority: rule.priority,
    };
  }

  private async evaluateCondition(
    condition: ForgettingCondition,
    evaluation: ForgettingEvaluation,
    memory_metadata: Record<string, unknown>
  ): Promise<ConditionEvaluationResult> {
    let actual_value: unknown;
    let result = false;

    // Get the actual value based on condition type
    switch (condition.condition_type) {
      case "memory_type":
        actual_value = evaluation.memory_type;
        break;

      case "importance_threshold":
        actual_value = evaluation.combined_score || 0;
        break;

      case "age_days":
        const memory_timestamp =
          (memory_metadata.timestamp as number) || Date.now();
        actual_value = (Date.now() - memory_timestamp) / (24 * 60 * 60 * 1000);
        break;

      case "access_frequency":
        actual_value = memory_metadata.access_frequency || 0;
        break;

      case "content_category":
        actual_value = memory_metadata.category || "unknown";
        break;

      case "privacy_level":
        actual_value = memory_metadata.privacy_level || "public";
        break;

      case "user_tag":
        actual_value = memory_metadata.user_tags || [];
        break;

      default:
        actual_value = null;
    }

    // Evaluate the condition based on operator
    switch (condition.operator) {
      case "equals":
        result = actual_value === condition.value;
        break;

      case "not_equals":
        result = actual_value !== condition.value;
        break;

      case "greater_than":
        result =
          typeof actual_value === "number" &&
          typeof condition.value === "number" &&
          actual_value > condition.value;
        break;

      case "less_than":
        result =
          typeof actual_value === "number" &&
          typeof condition.value === "number" &&
          actual_value < condition.value;
        break;

      case "contains":
        result =
          typeof actual_value === "string" &&
          typeof condition.value === "string" &&
          actual_value.includes(condition.value);
        break;

      case "not_contains":
        result =
          typeof actual_value === "string" &&
          typeof condition.value === "string" &&
          !actual_value.includes(condition.value);
        break;

      case "in":
        result =
          Array.isArray(condition.value) &&
          condition.value.includes(actual_value);
        break;

      case "not_in":
        result =
          Array.isArray(condition.value) &&
          !condition.value.includes(actual_value);
        break;
    }

    return {
      condition_type: condition.condition_type,
      operator: condition.operator,
      expected_value: condition.value,
      actual_value,
      result,
      weight: condition.weight,
    };
  }

  async getEffectivePolicyDecision(
    policy_results: PolicyEvaluationResult[]
  ): Promise<PolicyEvaluationResult> {
    if (policy_results.length === 0) {
      throw new Error("No policy results to evaluate");
    }

    // Priority order: deny > require_consent > delay > modify > allow
    const priority_order = [
      "deny",
      "require_consent",
      "delay",
      "modify",
      "allow",
    ];

    let effective_decision = policy_results[0];

    for (const result of policy_results) {
      const current_priority = priority_order.indexOf(result.final_decision);
      const effective_priority = priority_order.indexOf(
        effective_decision.final_decision
      );

      if (current_priority < effective_priority) {
        effective_decision = result;
      }
    }

    // Combine reasoning from all policies
    const combined_reasoning = policy_results.flatMap((r) => r.reasoning);
    effective_decision.reasoning = combined_reasoning;

    console.error(
      `Effective policy decision: ${effective_decision.final_decision}`,
      {
        policies_evaluated: policy_results.length,
        final_decision: effective_decision.final_decision,
        consent_required: effective_decision.consent_required,
      }
    );

    return effective_decision;
  }

  async importPolicy(policy_config: unknown): Promise<string> {
    if (!this.isValidPolicyConfig(policy_config)) {
      throw new Error("Invalid policy configuration format");
    }

    const policy = policy_config as Omit<
      ForgettingPolicy,
      "policy_id" | "created_timestamp" | "last_modified_timestamp"
    >;
    return await this.createPolicy(policy);
  }

  async exportPolicy(policy_id: string): Promise<unknown> {
    const policy = await this.getPolicy(policy_id);
    if (!policy) {
      throw new Error(`Policy not found: ${policy_id}`);
    }

    // Remove internal fields for export
    const {
      policy_id: _,
      created_timestamp: __,
      last_modified_timestamp: ___,
      ...exportPolicy
    } = policy;
    return exportPolicy;
  }

  private validatePolicy(policy: ForgettingPolicy): void {
    if (!policy.policy_name || policy.policy_name.trim().length === 0) {
      throw new Error("Policy name is required");
    }

    if (!policy.rules || policy.rules.length === 0) {
      throw new Error("Policy must have at least one rule");
    }

    for (const rule of policy.rules) {
      this.validateRule(rule);
    }
  }

  private validateRule(rule: ForgettingPolicyRule): void {
    if (!rule.rule_name || rule.rule_name.trim().length === 0) {
      throw new Error("Rule name is required");
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      throw new Error("Rule must have at least one condition");
    }

    if (
      !["allow", "deny", "require_consent", "delay", "modify"].includes(
        rule.action
      )
    ) {
      throw new Error(`Invalid rule action: ${rule.action}`);
    }

    if (!["AND", "OR"].includes(rule.condition_logic)) {
      throw new Error(`Invalid condition logic: ${rule.condition_logic}`);
    }

    for (const condition of rule.conditions) {
      this.validateCondition(condition);
    }
  }

  private validateCondition(condition: ForgettingCondition): void {
    const valid_types = [
      "memory_type",
      "importance_threshold",
      "age_days",
      "access_frequency",
      "content_category",
      "privacy_level",
      "user_tag",
    ];
    if (!valid_types.includes(condition.condition_type)) {
      throw new Error(`Invalid condition type: ${condition.condition_type}`);
    }

    const valid_operators = [
      "equals",
      "not_equals",
      "greater_than",
      "less_than",
      "contains",
      "not_contains",
      "in",
      "not_in",
    ];
    if (!valid_operators.includes(condition.operator)) {
      throw new Error(`Invalid condition operator: ${condition.operator}`);
    }

    if (condition.value === undefined || condition.value === null) {
      throw new Error("Condition value is required");
    }
  }

  private isValidPolicyConfig(
    config: unknown
  ): config is Omit<
    ForgettingPolicy,
    "policy_id" | "created_timestamp" | "last_modified_timestamp"
  > {
    return (
      typeof config === "object" &&
      config !== null &&
      "policy_name" in config &&
      "rules" in config &&
      "user_preferences" in config &&
      "execution_settings" in config
    );
  }
}
