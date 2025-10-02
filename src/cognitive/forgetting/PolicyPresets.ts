/**
 * Policy Presets for Simplified Forgetting Management
 *
 * Provides pre-configured forgetting policies that users can easily select
 * instead of creating complex custom rules.
 */

import { ForgettingPolicy } from "../../interfaces/audit.js";

export interface PolicyPreset {
  id: string;
  name: string;
  description: string;
  userFriendlyDescription: string;
  riskLevel: "low" | "medium" | "high";
  policy: Omit<
    ForgettingPolicy,
    "policy_id" | "created_timestamp" | "last_modified_timestamp"
  >;
}

export class PolicyPresets {
  static getAvailablePresets(): PolicyPreset[] {
    return [
      this.getConservativePreset(),
      this.getBalancedPreset(),
      this.getAggressivePreset(),
      this.getMinimalPreset(),
      this.getPrivacyFocusedPreset(),
    ];
  }

  static getPresetById(id: string): PolicyPreset | null {
    const presets = this.getAvailablePresets();
    return presets.find((preset) => preset.id === id) || null;
  }

  private static getConservativePreset(): PolicyPreset {
    return {
      id: "conservative",
      name: "Conservative",
      description: "Keep almost everything, ask permission for any changes",
      userFriendlyDescription:
        "🛡️ Maximum safety - keeps all important memories, asks permission for everything. Best for important work or personal data.",
      riskLevel: "low",
      policy: {
        policy_name: "Conservative Memory Management",
        description:
          "Conservative policy that preserves memories and requires consent",
        active: true,
        rules: [
          {
            rule_id: "protect_all_important",
            rule_name: "Protect All Important Memories",
            description: "Never forget memories with importance > 0.5",
            priority: 100,
            conditions: [
              {
                condition_type: "importance_threshold",
                operator: "greater_than",
                value: 0.5,
              },
            ],
            condition_logic: "AND",
            action: "deny",
          },
          {
            rule_id: "consent_for_all",
            rule_name: "Require Consent for Everything",
            description: "Ask permission before forgetting any memory",
            priority: 90,
            conditions: [
              {
                condition_type: "memory_type",
                operator: "in",
                value: ["episodic", "semantic"],
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
            "work",
          ],
          max_auto_forget_importance: 0.1,
          retention_period_days: 1095, // 3 years
          notification_preferences: {
            notify_before_forgetting: true,
            notification_delay_hours: 48,
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
          max_concurrent_operations: 1,
          batch_size: 5,
          execution_delay_ms: 5000,
          retry_attempts: 3,
          rollback_enabled: true,
          backup_before_deletion: true,
        },
      },
    };
  }

  private static getBalancedPreset(): PolicyPreset {
    return {
      id: "balanced",
      name: "Balanced",
      description: "Smart cleanup with safety checks",
      userFriendlyDescription:
        "⚖️ Recommended for most users - automatically cleans up unimportant memories while protecting valuable ones. Good balance of performance and safety.",
      riskLevel: "low",
      policy: {
        policy_name: "Balanced Memory Management",
        description: "Balanced policy with smart cleanup and safety checks",
        active: true,
        rules: [
          {
            rule_id: "protect_high_importance",
            rule_name: "Protect High Importance Memories",
            description: "Never forget memories with importance > 0.7",
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
            rule_id: "auto_forget_low_importance",
            rule_name: "Auto-forget Low Importance",
            description:
              "Automatically forget memories with importance < 0.2 after 30 days",
            priority: 80,
            conditions: [
              {
                condition_type: "importance_threshold",
                operator: "less_than",
                value: 0.2,
              },
              {
                condition_type: "age_days",
                operator: "greater_than",
                value: 30,
              },
            ],
            condition_logic: "AND",
            action: "allow",
          },
          {
            rule_id: "consent_for_recent",
            rule_name: "Protect Recent Memories",
            description: "Require consent for memories less than 7 days old",
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
        ],
        user_preferences: {
          consent_required_by_default: false,
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
            notify_after_forgetting: false,
            notification_methods: ["in_app"],
          },
          privacy_preferences: {
            default_privacy_level: "private",
            secure_deletion_required: true,
            audit_encryption_required: false,
            data_retention_days: 1095, // 3 years
          },
        },
        execution_settings: {
          max_concurrent_operations: 3,
          batch_size: 10,
          execution_delay_ms: 2000,
          retry_attempts: 2,
          rollback_enabled: true,
          backup_before_deletion: true,
        },
      },
    };
  }

  private static getAggressivePreset(): PolicyPreset {
    return {
      id: "aggressive",
      name: "Aggressive",
      description: "Maximum cleanup for performance",
      userFriendlyDescription:
        "🚀 Performance focused - aggressively removes old and unimportant memories to maximize thinking speed. Use with caution.",
      riskLevel: "medium",
      policy: {
        policy_name: "Aggressive Memory Optimization",
        description: "Aggressive policy focused on performance optimization",
        active: true,
        rules: [
          {
            rule_id: "protect_critical_only",
            rule_name: "Protect Only Critical Memories",
            description: "Only protect memories with importance > 0.8",
            priority: 100,
            conditions: [
              {
                condition_type: "importance_threshold",
                operator: "greater_than",
                value: 0.8,
              },
            ],
            condition_logic: "AND",
            action: "deny",
          },
          {
            rule_id: "auto_forget_old",
            rule_name: "Auto-forget Old Memories",
            description:
              "Automatically forget memories older than 60 days with importance < 0.5",
            priority: 80,
            conditions: [
              {
                condition_type: "age_days",
                operator: "greater_than",
                value: 60,
              },
              {
                condition_type: "importance_threshold",
                operator: "less_than",
                value: 0.5,
              },
            ],
            condition_logic: "AND",
            action: "allow",
          },
          {
            rule_id: "auto_forget_low_access",
            rule_name: "Auto-forget Rarely Accessed",
            description: "Forget memories with low access frequency",
            priority: 70,
            conditions: [
              {
                condition_type: "access_frequency",
                operator: "less_than",
                value: 0.1,
              },
              {
                condition_type: "age_days",
                operator: "greater_than",
                value: 14,
              },
            ],
            condition_logic: "AND",
            action: "allow",
          },
        ],
        user_preferences: {
          consent_required_by_default: false,
          protected_categories: ["confidential", "medical", "financial"],
          max_auto_forget_importance: 0.5,
          retention_period_days: 180,
          notification_preferences: {
            notify_before_forgetting: false,
            notification_delay_hours: 1,
            notify_after_forgetting: false,
            notification_methods: ["log"],
          },
          privacy_preferences: {
            default_privacy_level: "public",
            secure_deletion_required: false,
            audit_encryption_required: false,
            data_retention_days: 365,
          },
        },
        execution_settings: {
          max_concurrent_operations: 10,
          batch_size: 50,
          execution_delay_ms: 500,
          retry_attempts: 1,
          rollback_enabled: false,
          backup_before_deletion: false,
        },
      },
    };
  }

  private static getMinimalPreset(): PolicyPreset {
    return {
      id: "minimal",
      name: "Minimal",
      description: "Keep only essential memories",
      userFriendlyDescription:
        "🎯 Ultra-focused - keeps only the most important memories. Ideal for specific tasks or when memory is very limited.",
      riskLevel: "high",
      policy: {
        policy_name: "Minimal Memory Footprint",
        description: "Minimal policy keeping only essential memories",
        active: true,
        rules: [
          {
            rule_id: "keep_only_critical",
            rule_name: "Keep Only Critical Memories",
            description: "Only keep memories with importance > 0.9",
            priority: 100,
            conditions: [
              {
                condition_type: "importance_threshold",
                operator: "less_than",
                value: 0.9,
              },
            ],
            condition_logic: "AND",
            action: "allow",
          },
        ],
        user_preferences: {
          consent_required_by_default: false,
          protected_categories: ["medical", "financial"],
          max_auto_forget_importance: 0.8,
          retention_period_days: 30,
          notification_preferences: {
            notify_before_forgetting: false,
            notification_delay_hours: 0,
            notify_after_forgetting: false,
            notification_methods: [],
          },
          privacy_preferences: {
            default_privacy_level: "public",
            secure_deletion_required: false,
            audit_encryption_required: false,
            data_retention_days: 90,
          },
        },
        execution_settings: {
          max_concurrent_operations: 20,
          batch_size: 100,
          execution_delay_ms: 100,
          retry_attempts: 1,
          rollback_enabled: false,
          backup_before_deletion: false,
        },
      },
    };
  }

  private static getPrivacyFocusedPreset(): PolicyPreset {
    return {
      id: "privacy_focused",
      name: "Privacy Focused",
      description: "Enhanced privacy and security controls",
      userFriendlyDescription:
        "🔒 Privacy first - maximum security with encrypted storage and secure deletion. Perfect for sensitive or confidential information.",
      riskLevel: "low",
      policy: {
        policy_name: "Privacy-Focused Memory Management",
        description: "Privacy-focused policy with enhanced security controls",
        active: true,
        rules: [
          {
            rule_id: "protect_private_data",
            rule_name: "Protect All Private Data",
            description: "Never forget private or confidential memories",
            priority: 100,
            conditions: [
              {
                condition_type: "privacy_level",
                operator: "in",
                value: ["private", "confidential", "restricted"],
              },
            ],
            condition_logic: "AND",
            action: "deny",
          },
          {
            rule_id: "secure_delete_only",
            rule_name: "Require Secure Deletion",
            description: "All deletions must use secure deletion methods",
            priority: 95,
            conditions: [
              {
                condition_type: "memory_type",
                operator: "in",
                value: ["episodic", "semantic"],
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
            "work",
            "private",
          ],
          max_auto_forget_importance: 0.0,
          retention_period_days: 2555, // 7 years
          notification_preferences: {
            notify_before_forgetting: true,
            notification_delay_hours: 72,
            notify_after_forgetting: true,
            notification_methods: ["in_app", "log"],
          },
          privacy_preferences: {
            default_privacy_level: "confidential",
            secure_deletion_required: true,
            audit_encryption_required: true,
            data_retention_days: 3650, // 10 years
          },
        },
        execution_settings: {
          max_concurrent_operations: 1,
          batch_size: 1,
          execution_delay_ms: 10000,
          retry_attempts: 5,
          rollback_enabled: true,
          backup_before_deletion: true,
        },
      },
    };
  }

  static getPresetSummary(): Array<{
    id: string;
    name: string;
    description: string;
    riskLevel: string;
    emoji: string;
  }> {
    return [
      {
        id: "conservative",
        name: "Conservative",
        description: "Keep almost everything, ask permission for any changes",
        riskLevel: "low",
        emoji: "🛡️",
      },
      {
        id: "balanced",
        name: "Balanced",
        description: "Smart cleanup with safety checks (Recommended)",
        riskLevel: "low",
        emoji: "⚖️",
      },
      {
        id: "aggressive",
        name: "Aggressive",
        description: "Maximum cleanup for performance",
        riskLevel: "medium",
        emoji: "🚀",
      },
      {
        id: "minimal",
        name: "Minimal",
        description: "Keep only essential memories",
        riskLevel: "high",
        emoji: "🎯",
      },
      {
        id: "privacy_focused",
        name: "Privacy Focused",
        description: "Enhanced privacy and security controls",
        riskLevel: "low",
        emoji: "🔒",
      },
    ];
  }
}
