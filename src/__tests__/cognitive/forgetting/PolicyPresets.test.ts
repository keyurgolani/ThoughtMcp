/**
 * Tests for PolicyPresets
 *
 * Ensures comprehensive coverage of policy preset functionality
 */

import { describe, expect, it } from "vitest";
import { PolicyPresets } from "../../../cognitive/forgetting/PolicyPresets.js";

describe("PolicyPresets", () => {
  describe("getAvailablePresets", () => {
    it("should return all available presets", () => {
      const presets = PolicyPresets.getAvailablePresets();

      expect(presets).toBeDefined();
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBe(5);

      // Check that all expected presets are present
      const presetIds = presets.map((p) => p.id);
      expect(presetIds).toContain("conservative");
      expect(presetIds).toContain("balanced");
      expect(presetIds).toContain("aggressive");
      expect(presetIds).toContain("minimal");
      expect(presetIds).toContain("privacy_focused");
    });

    it("should return presets with required properties", () => {
      const presets = PolicyPresets.getAvailablePresets();

      presets.forEach((preset) => {
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.userFriendlyDescription).toBeDefined();
        expect(preset.riskLevel).toMatch(/^(low|medium|high)$/);
        expect(preset.policy).toBeDefined();

        // Check policy structure
        expect(preset.policy.policy_name).toBeDefined();
        expect(preset.policy.description).toBeDefined();
        expect(preset.policy.active).toBe(true);
        expect(Array.isArray(preset.policy.rules)).toBe(true);
        expect(preset.policy.user_preferences).toBeDefined();
        expect(preset.policy.execution_settings).toBeDefined();
      });
    });
  });

  describe("getPresetById", () => {
    it("should return the correct preset for valid IDs", () => {
      const conservative = PolicyPresets.getPresetById("conservative");
      expect(conservative).toBeDefined();
      expect(conservative!.id).toBe("conservative");
      expect(conservative!.name).toBe("Conservative");

      const balanced = PolicyPresets.getPresetById("balanced");
      expect(balanced).toBeDefined();
      expect(balanced!.id).toBe("balanced");
      expect(balanced!.name).toBe("Balanced");

      const aggressive = PolicyPresets.getPresetById("aggressive");
      expect(aggressive).toBeDefined();
      expect(aggressive!.id).toBe("aggressive");
      expect(aggressive!.name).toBe("Aggressive");

      const minimal = PolicyPresets.getPresetById("minimal");
      expect(minimal).toBeDefined();
      expect(minimal!.id).toBe("minimal");
      expect(minimal!.name).toBe("Minimal");

      const privacyFocused = PolicyPresets.getPresetById("privacy_focused");
      expect(privacyFocused).toBeDefined();
      expect(privacyFocused!.id).toBe("privacy_focused");
      expect(privacyFocused!.name).toBe("Privacy Focused");
    });

    it("should return null for invalid IDs", () => {
      const invalid = PolicyPresets.getPresetById("nonexistent");
      expect(invalid).toBeNull();

      const empty = PolicyPresets.getPresetById("");
      expect(empty).toBeNull();
    });
  });

  describe("getPresetSummary", () => {
    it("should return summary information for all presets", () => {
      const summary = PolicyPresets.getPresetSummary();

      expect(summary).toBeDefined();
      expect(Array.isArray(summary)).toBe(true);
      expect(summary.length).toBe(5);

      summary.forEach((item) => {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.riskLevel).toMatch(/^(low|medium|high)$/);
        expect(item.emoji).toBeDefined();
        expect(item.emoji.length).toBeGreaterThan(0);
      });
    });

    it("should include correct emojis for each preset", () => {
      const summary = PolicyPresets.getPresetSummary();
      const summaryMap = Object.fromEntries(
        summary.map((s) => [s.id, s.emoji])
      );

      expect(summaryMap.conservative).toBe("🛡️");
      expect(summaryMap.balanced).toBe("⚖️");
      expect(summaryMap.aggressive).toBe("🚀");
      expect(summaryMap.minimal).toBe("🎯");
      expect(summaryMap.privacy_focused).toBe("🔒");
    });
  });

  describe("Conservative preset", () => {
    it("should have conservative settings", () => {
      const preset = PolicyPresets.getPresetById("conservative")!;

      expect(preset.riskLevel).toBe("low");
      expect(preset.policy.user_preferences.consent_required_by_default).toBe(
        true
      );
      expect(preset.policy.user_preferences.max_auto_forget_importance).toBe(
        0.1
      );
      expect(preset.policy.user_preferences.retention_period_days).toBe(1095); // 3 years

      // Should have rules to protect important memories
      const protectRule = preset.policy.rules.find((r) =>
        r.rule_name.includes("Important")
      );
      expect(protectRule).toBeDefined();
      expect(protectRule!.action).toBe("deny");

      // Should require consent for everything
      const consentRule = preset.policy.rules.find((r) =>
        r.rule_name.includes("Consent")
      );
      expect(consentRule).toBeDefined();
      expect(consentRule!.action).toBe("require_consent");
    });
  });

  describe("Balanced preset", () => {
    it("should have balanced settings", () => {
      const preset = PolicyPresets.getPresetById("balanced")!;

      expect(preset.riskLevel).toBe("low");
      expect(preset.policy.user_preferences.consent_required_by_default).toBe(
        false
      );
      expect(preset.policy.user_preferences.max_auto_forget_importance).toBe(
        0.3
      );
      expect(preset.policy.user_preferences.retention_period_days).toBe(365);

      // Should have rules for different importance levels
      const rules = preset.policy.rules;
      expect(rules.length).toBeGreaterThan(1);

      // Should protect high importance memories
      const protectRule = rules.find((r) => r.action === "deny");
      expect(protectRule).toBeDefined();

      // Should allow auto-forgetting of low importance memories
      const allowRule = rules.find((r) => r.action === "allow");
      expect(allowRule).toBeDefined();
    });
  });

  describe("Aggressive preset", () => {
    it("should have aggressive settings", () => {
      const preset = PolicyPresets.getPresetById("aggressive")!;

      expect(preset.riskLevel).toBe("medium");
      expect(preset.policy.user_preferences.consent_required_by_default).toBe(
        false
      );
      expect(preset.policy.user_preferences.max_auto_forget_importance).toBe(
        0.5
      );
      expect(preset.policy.user_preferences.retention_period_days).toBe(180);

      // Should have higher thresholds for protection
      const protectRule = preset.policy.rules.find((r) => r.action === "deny");
      expect(protectRule).toBeDefined();

      const importanceCondition = protectRule!.conditions.find(
        (c) => c.condition_type === "importance_threshold"
      );
      expect(importanceCondition).toBeDefined();
      expect(importanceCondition!.value).toBe(0.8); // Higher threshold

      // Should have more aggressive execution settings
      expect(
        preset.policy.execution_settings.max_concurrent_operations
      ).toBeGreaterThan(5);
      expect(preset.policy.execution_settings.batch_size).toBeGreaterThan(20);
      expect(preset.policy.execution_settings.execution_delay_ms).toBeLessThan(
        1000
      );
    });
  });

  describe("Minimal preset", () => {
    it("should have minimal settings", () => {
      const preset = PolicyPresets.getPresetById("minimal")!;

      expect(preset.riskLevel).toBe("high");
      expect(preset.policy.user_preferences.consent_required_by_default).toBe(
        false
      );
      expect(preset.policy.user_preferences.max_auto_forget_importance).toBe(
        0.8
      );
      expect(preset.policy.user_preferences.retention_period_days).toBe(30);

      // Should keep only critical memories (very high threshold)
      const rule = preset.policy.rules[0];
      expect(rule.action).toBe("allow");

      const importanceCondition = rule.conditions.find(
        (c) => c.condition_type === "importance_threshold"
      );
      expect(importanceCondition).toBeDefined();
      expect(importanceCondition!.value).toBe(0.9); // Very high threshold
      expect(importanceCondition!.operator).toBe("less_than"); // Forget if less than 0.9

      // Should have very aggressive execution settings
      expect(
        preset.policy.execution_settings.max_concurrent_operations
      ).toBeGreaterThanOrEqual(20);
      expect(
        preset.policy.execution_settings.batch_size
      ).toBeGreaterThanOrEqual(100);
      expect(preset.policy.execution_settings.rollback_enabled).toBe(false);
      expect(preset.policy.execution_settings.backup_before_deletion).toBe(
        false
      );
    });
  });

  describe("Privacy Focused preset", () => {
    it("should have privacy-focused settings", () => {
      const preset = PolicyPresets.getPresetById("privacy_focused")!;

      expect(preset.riskLevel).toBe("low");
      expect(preset.policy.user_preferences.consent_required_by_default).toBe(
        true
      );
      expect(preset.policy.user_preferences.max_auto_forget_importance).toBe(
        0.0
      );
      expect(preset.policy.user_preferences.retention_period_days).toBe(2555); // 7 years

      // Should protect private data
      const protectRule = preset.policy.rules.find((r) =>
        r.rule_name.includes("Private")
      );
      expect(protectRule).toBeDefined();
      expect(protectRule!.action).toBe("deny");

      // Should require secure deletion
      const secureRule = preset.policy.rules.find((r) =>
        r.rule_name.includes("Secure")
      );
      expect(secureRule).toBeDefined();
      expect(secureRule!.action).toBe("require_consent");

      // Should have privacy-focused preferences
      expect(
        preset.policy.user_preferences.privacy_preferences.default_privacy_level
      ).toBe("confidential");
      expect(
        preset.policy.user_preferences.privacy_preferences
          .secure_deletion_required
      ).toBe(true);
      expect(
        preset.policy.user_preferences.privacy_preferences
          .audit_encryption_required
      ).toBe(true);

      // Should have conservative execution settings
      expect(preset.policy.execution_settings.max_concurrent_operations).toBe(
        1
      );
      expect(preset.policy.execution_settings.batch_size).toBe(1);
      expect(
        preset.policy.execution_settings.execution_delay_ms
      ).toBeGreaterThanOrEqual(10000);
      expect(preset.policy.execution_settings.rollback_enabled).toBe(true);
      expect(preset.policy.execution_settings.backup_before_deletion).toBe(
        true
      );
    });
  });

  describe("Policy structure validation", () => {
    it("should have valid rule structures in all presets", () => {
      const presets = PolicyPresets.getAvailablePresets();

      presets.forEach((preset) => {
        preset.policy.rules.forEach((rule) => {
          expect(rule.rule_id).toBeDefined();
          expect(rule.rule_name).toBeDefined();
          expect(rule.description).toBeDefined();
          expect(typeof rule.priority).toBe("number");
          expect(Array.isArray(rule.conditions)).toBe(true);
          expect(rule.condition_logic).toMatch(/^(AND|OR)$/);
          expect(rule.action).toMatch(
            /^(allow|deny|require_consent|delay|modify)$/
          );

          // Validate conditions
          rule.conditions.forEach((condition) => {
            expect(condition.condition_type).toBeDefined();
            expect(condition.operator).toBeDefined();
            expect(condition.value).toBeDefined();
          });
        });
      });
    });

    it("should have valid user preferences in all presets", () => {
      const presets = PolicyPresets.getAvailablePresets();

      presets.forEach((preset) => {
        const prefs = preset.policy.user_preferences;

        expect(typeof prefs.consent_required_by_default).toBe("boolean");
        expect(Array.isArray(prefs.protected_categories)).toBe(true);
        expect(typeof prefs.max_auto_forget_importance).toBe("number");
        expect(typeof prefs.retention_period_days).toBe("number");

        expect(prefs.notification_preferences).toBeDefined();
        expect(prefs.privacy_preferences).toBeDefined();
      });
    });

    it("should have valid execution settings in all presets", () => {
      const presets = PolicyPresets.getAvailablePresets();

      presets.forEach((preset) => {
        const settings = preset.policy.execution_settings;

        expect(typeof settings.max_concurrent_operations).toBe("number");
        expect(typeof settings.batch_size).toBe("number");
        expect(typeof settings.execution_delay_ms).toBe("number");
        expect(typeof settings.retry_attempts).toBe("number");
        expect(typeof settings.rollback_enabled).toBe("boolean");
        expect(typeof settings.backup_before_deletion).toBe("boolean");

        // Validate reasonable ranges
        expect(settings.max_concurrent_operations).toBeGreaterThan(0);
        expect(settings.batch_size).toBeGreaterThan(0);
        expect(settings.execution_delay_ms).toBeGreaterThanOrEqual(0);
        expect(settings.retry_attempts).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("Risk level consistency", () => {
    it("should have consistent risk levels with policy settings", () => {
      const conservative = PolicyPresets.getPresetById("conservative")!;
      const aggressive = PolicyPresets.getPresetById("aggressive")!;
      const minimal = PolicyPresets.getPresetById("minimal")!;

      // Conservative should be low risk
      expect(conservative.riskLevel).toBe("low");
      expect(
        conservative.policy.user_preferences.consent_required_by_default
      ).toBe(true);

      // Aggressive should be medium risk
      expect(aggressive.riskLevel).toBe("medium");
      expect(aggressive.policy.execution_settings.rollback_enabled).toBe(false);

      // Minimal should be high risk
      expect(minimal.riskLevel).toBe("high");
      expect(minimal.policy.execution_settings.backup_before_deletion).toBe(
        false
      );
    });
  });
});
