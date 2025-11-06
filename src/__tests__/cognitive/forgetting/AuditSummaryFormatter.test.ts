/**
 * Tests for AuditSummaryFormatter
 *
 * Ensures comprehensive coverage of audit summary formatting functionality
 */

import { beforeEach, describe, expect, it } from "vitest";
import { AuditSummaryFormatter } from "../../../cognitive/forgetting/AuditSummaryFormatter.js";

describe("AuditSummaryFormatter", () => {
  let mockAuditEntries: any[];
  let timeRange: { start: number; end: number };

  beforeEach(() => {
    const now = Date.now();
    timeRange = {
      start: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
      end: now,
    };

    mockAuditEntries = [
      {
        audit_id: "audit_1",
        timestamp: now - 2 * 24 * 60 * 60 * 1000,
        operation_type: "forget",
        execution_method: "automatic",
        method: "automatic",
        status: "success",
        execution_status: "success",
        memory_id: "mem_1",
        memory_content: "Test memory content",
        reason: "low_importance",
        decision: { reason: "low_importance" },
        space_freed: 1024,
        importance: 0.2,
        backup_created: true,
        user_consent: false,
      },
      {
        audit_id: "audit_2",
        timestamp: now - 1 * 24 * 60 * 60 * 1000,
        operation_type: "archive",
        execution_method: "user_requested",
        method: "user_requested",
        status: "success",
        memory_id: "mem_2",
        memory_content: "Important memory content",
        reason: "user_request",
        space_freed: 2048,
        importance: 0.8,
        backup_created: true,
        user_consent: true,
      },
      {
        audit_id: "audit_3",
        timestamp: now - 6 * 60 * 60 * 1000,
        operation_type: "recover",
        execution_method: "manual",
        method: "user_requested",
        status: "failed",
        memory_id: "mem_3",
        reason: "recovery_attempt",
        importance: 0.6,
        backup_created: false,
      },
    ];
  });

  describe("createUserFriendlySummary", () => {
    it("should create a comprehensive summary from audit entries", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        timeRange
      );

      expect(summary).toBeDefined();
      expect(summary.total_operations).toBe(3);
      expect(summary.period).toMatch(/Last \d+ days/);

      // Check operations by type
      expect(summary.operations_by_type.forgotten).toBe(1);
      expect(summary.operations_by_type.archived).toBe(1);
      expect(summary.operations_by_type.recovered).toBe(1);
      expect(summary.operations_by_type.compressed).toBe(0);

      // Check operations by method
      expect(summary.operations_by_method.automatic).toBe(1);
      expect(summary.operations_by_method.user_requested).toBe(2);
      expect(summary.operations_by_method.policy_driven).toBe(0);

      // Check impact summary
      expect(summary.impact_summary.memories_affected).toBe(3);
      expect(summary.impact_summary.space_freed_mb).toBeGreaterThan(0);
      expect(summary.impact_summary.performance_improvement).toBeDefined();
      expect(summary.impact_summary.user_satisfaction).toBeDefined();

      // Check safety summary
      expect(summary.safety_summary.operations_with_backup).toBe(2);
      expect(summary.safety_summary.operations_with_consent).toBe(1);
      expect(summary.safety_summary.failed_operations).toBe(1);

      // Check trends
      expect(summary.trends.direction).toMatch(/improving|stable|concerning/);
      expect(Array.isArray(summary.trends.key_changes)).toBe(true);
      expect(Array.isArray(summary.trends.recommendations)).toBe(true);

      // Check recent highlights
      expect(Array.isArray(summary.recent_highlights)).toBe(true);
      expect(summary.recent_highlights.length).toBeGreaterThan(0);
    });

    it("should handle empty audit entries", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        [],
        timeRange
      );

      expect(summary.total_operations).toBe(0);
      expect(summary.operations_by_type.forgotten).toBe(0);
      expect(summary.operations_by_type.archived).toBe(0);
      expect(summary.operations_by_type.compressed).toBe(0);
      expect(summary.operations_by_type.recovered).toBe(0);
    });

    it("should format time period correctly for today", () => {
      const todayRange = {
        start: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        end: Date.now(),
      };

      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        todayRange
      );

      expect(summary.period).toBe("Today");
    });
  });

  describe("formatAuditEntryForUser", () => {
    it("should format a single audit entry for user display", () => {
      const entry = mockAuditEntries[0];
      const formatted = AuditSummaryFormatter.formatAuditEntryForUser(entry);

      expect(formatted.id).toBe("audit_1");
      expect(formatted.operation_type).toContain("Memory Forgotten");
      expect(formatted.memory_summary).toContain("Test memory content");
      expect(formatted.reason).toContain("low importance");
      expect(formatted.method).toContain("Automatic");
      expect(formatted.status).toContain("successfully");
      expect(formatted.user_friendly_description).toBeDefined();
      expect(formatted.impact_description).toBeDefined();
      expect(Array.isArray(formatted.safety_measures)).toBe(true);
      expect(typeof formatted.rollback_available).toBe("boolean");
    });

    it("should handle entries with missing fields gracefully", () => {
      const incompleteEntry = {
        audit_id: "incomplete_audit",
      };

      const formatted =
        AuditSummaryFormatter.formatAuditEntryForUser(incompleteEntry);

      expect(formatted.id).toBe("incomplete_audit");
      expect(formatted.operation_type).toContain("unknown");
      expect(formatted.memory_summary).toContain("Memory unknown");
      expect(formatted.reason).toBeDefined();
      expect(formatted.method).toBeDefined();
      expect(formatted.status).toBeDefined();
    });
  });

  describe("createAuditSummaryText", () => {
    it("should create formatted text summary", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        timeRange
      );

      const text = AuditSummaryFormatter.createAuditSummaryText(summary);

      expect(text).toContain("# Memory Management Summary");
      expect(text).toContain("📊 Operations Breakdown");
      expect(text).toContain("📈 Impact Summary");
      expect(text).toContain("🛡️ Safety Summary");
      expect(text).toContain("Trends");
      expect(text).toContain("🌟 Recent Highlights");

      // Check for emoji usage
      expect(text).toContain("🗑️");
      expect(text).toContain("📦");
      expect(text).toContain("🤖");
      expect(text).toContain("👤");
    });

    it("should handle summaries with no highlights", () => {
      const emptySummary = AuditSummaryFormatter.createUserFriendlySummary(
        [],
        timeRange
      );

      const text = AuditSummaryFormatter.createAuditSummaryText(emptySummary);

      expect(text).toContain("# Memory Management Summary");
      expect(text).toContain("**Total Operations:** 0");
    });
  });

  describe("createDetailedAuditText", () => {
    it("should create detailed text for audit entries", () => {
      const formattedEntries = mockAuditEntries.map((entry) =>
        AuditSummaryFormatter.formatAuditEntryForUser(entry)
      );

      const text =
        AuditSummaryFormatter.createDetailedAuditText(formattedEntries);

      expect(text).toContain("# Detailed Audit Log");
      expect(text).toContain("**Total Entries:** 3");
      expect(text).toContain("## 1. ");
      expect(text).toContain("## 2. ");
      expect(text).toContain("## 3. ");
      expect(text).toContain("**When:**");
      expect(text).toContain("**What:**");
      expect(text).toContain("**Why:**");
      expect(text).toContain("**How:**");
      expect(text).toContain("**Status:**");
    });

    it("should handle empty entries list", () => {
      const text = AuditSummaryFormatter.createDetailedAuditText([]);

      expect(text).toBe("No audit entries found for the specified criteria.");
    });
  });

  describe("private method functionality through public interface", () => {
    it("should correctly categorize operations by type", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        timeRange
      );

      expect(summary.operations_by_type.forgotten).toBe(1);
      expect(summary.operations_by_type.archived).toBe(1);
      expect(summary.operations_by_type.recovered).toBe(1);
      expect(summary.operations_by_type.compressed).toBe(0);
    });

    it("should correctly categorize operations by method", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        timeRange
      );

      expect(summary.operations_by_method.automatic).toBe(1);
      expect(summary.operations_by_method.user_requested).toBe(2);
      expect(summary.operations_by_method.policy_driven).toBe(0);
    });

    it("should calculate impact summary correctly", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        timeRange
      );

      expect(summary.impact_summary.memories_affected).toBe(3);
      expect(summary.impact_summary.space_freed_mb).toBeGreaterThan(0);
      expect(summary.impact_summary.performance_improvement).toMatch(
        /Minimal|Noticeable|Moderate|Significant/
      );
      expect(summary.impact_summary.user_satisfaction).toMatch(
        /Poor|Fair|Good|Excellent/
      );
    });

    it("should calculate safety summary correctly", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        timeRange
      );

      expect(summary.safety_summary.operations_with_backup).toBe(2);
      expect(summary.safety_summary.operations_with_consent).toBe(1);
      expect(summary.safety_summary.successful_recoveries).toBe(0);
      expect(summary.safety_summary.failed_operations).toBe(1);
    });

    it("should analyze trends correctly", () => {
      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        mockAuditEntries,
        timeRange
      );

      expect(summary.trends.direction).toMatch(/improving|stable|concerning/);
      expect(Array.isArray(summary.trends.key_changes)).toBe(true);
      expect(Array.isArray(summary.trends.recommendations)).toBe(true);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle entries with null/undefined timestamps", () => {
      const entriesWithNullTimestamps = [
        { ...mockAuditEntries[0], timestamp: null },
        { ...mockAuditEntries[1], timestamp: undefined },
      ];

      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        entriesWithNullTimestamps,
        timeRange
      );

      expect(summary.total_operations).toBe(2);
      expect(summary.recent_highlights.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle entries with unknown operation types", () => {
      const entriesWithUnknownTypes = [
        { ...mockAuditEntries[0], operation_type: "unknown_operation" },
      ];

      const formatted = AuditSummaryFormatter.formatAuditEntryForUser(
        entriesWithUnknownTypes[0]
      );

      expect(formatted.operation_type).toContain("unknown_operation");
      expect(formatted.user_friendly_description).toContain(
        "unknown_operation"
      );
    });

    it("should handle very large numbers of entries", () => {
      const largeEntrySet = Array.from({ length: 1500 }, (_, i) => ({
        ...mockAuditEntries[0],
        audit_id: `audit_${i}`,
        timestamp: Date.now() - i * 60 * 1000,
      }));

      const summary = AuditSummaryFormatter.createUserFriendlySummary(
        largeEntrySet,
        timeRange
      );

      expect(summary.total_operations).toBe(1500);
      expect(summary.impact_summary.performance_improvement).toBe(
        "Significant"
      );
      expect(summary.recent_highlights.length).toBeLessThanOrEqual(5);
    });
  });
});
