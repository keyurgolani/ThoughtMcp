/**
 * Forgetting Audit System Implementation
 *
 * Provides comprehensive logging and tracking of all forgetting decisions,
 * user interactions, and system impacts for transparency and compliance.
 */

import {
  ForgettingActualImpact,
  ForgettingAuditEntry,
  ForgettingAuditQuery,
  ForgettingAuditSummary,
  ForgettingUserOverride,
  IForgettingAuditSystem,
  RecoveryAttemptRecord,
} from "../../interfaces/audit.js";
import {
  ForgettingDecision,
  ForgettingEvaluation,
} from "../../interfaces/forgetting.js";
export class ForgettingAuditSystem implements IForgettingAuditSystem {
  private auditEntries: Map<string, ForgettingAuditEntry> = new Map();
  private nextAuditId: number = 1;

  constructor() {
    // Initialization complete
  }

  async logForgettingDecision(
    memory_id: string,
    memory_type: "episodic" | "semantic",
    memory_content_summary: string,
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    execution_method: "automatic" | "manual" | "user_requested",
    privacy_level:
      | "public"
      | "private"
      | "confidential"
      | "restricted" = "private"
  ): Promise<string> {
    const audit_id = `audit_${this.nextAuditId++}_${Date.now()}`;
    const timestamp = Date.now();

    const auditEntry: ForgettingAuditEntry = {
      audit_id,
      timestamp,
      memory_id,
      memory_type,
      memory_content_summary,
      decision,
      evaluation,
      execution_status: "pending",
      execution_method,
      user_consent_requested: decision.user_consent_required || false,
      privacy_level,
      secure_deletion_applied: false,
      audit_trail_encrypted:
        privacy_level === "confidential" || privacy_level === "restricted",
    };

    this.auditEntries.set(audit_id, auditEntry);

    console.error(`Logged forgetting decision for memory ${memory_id}`, {
      audit_id,
      memory_type,
      execution_method,
      privacy_level,
      user_consent_required: decision.user_consent_required,
    });

    return audit_id;
  }

  async updateExecutionStatus(
    audit_id: string,
    status: "executed" | "cancelled" | "failed",
    actual_impact?: ForgettingActualImpact
  ): Promise<void> {
    const entry = this.auditEntries.get(audit_id);
    if (!entry) {
      throw new Error(`Audit entry not found: ${audit_id}`);
    }

    entry.execution_status = status;
    entry.execution_timestamp = Date.now();

    if (actual_impact) {
      entry.actual_impact = actual_impact;
    }

    // Mark secure deletion as applied if execution was successful
    if (status === "executed" && entry.privacy_level === "confidential") {
      entry.secure_deletion_applied = true;
    }

    console.error(`Updated execution status for ${audit_id}`, {
      audit_id,
      status,
      memory_id: entry.memory_id,
      actual_impact: actual_impact ? "provided" : "not_provided",
    });
  }

  async recordUserConsent(
    audit_id: string,
    consent_granted: boolean,
    user_feedback?: string
  ): Promise<void> {
    const entry = this.auditEntries.get(audit_id);
    if (!entry) {
      throw new Error(`Audit entry not found: ${audit_id}`);
    }

    entry.user_consent_granted = consent_granted;
    if (user_feedback) {
      entry.user_feedback = user_feedback;
    }

    console.error(`Recorded user consent for ${audit_id}`, {
      audit_id,
      consent_granted,
      memory_id: entry.memory_id,
      has_feedback: !!user_feedback,
    });
  }

  async recordUserOverride(
    audit_id: string,
    override: ForgettingUserOverride
  ): Promise<void> {
    const entry = this.auditEntries.get(audit_id);
    if (!entry) {
      throw new Error(`Audit entry not found: ${audit_id}`);
    }

    entry.user_override = override;

    console.error(`Recorded user override for ${audit_id}`, {
      audit_id,
      override_type: override.override_type,
      memory_id: entry.memory_id,
      override_reason: override.override_reason,
    });
  }

  async recordRecoveryAttempt(
    audit_id: string,
    recovery_record: RecoveryAttemptRecord
  ): Promise<void> {
    const entry = this.auditEntries.get(audit_id);
    if (!entry) {
      throw new Error(`Audit entry not found: ${audit_id}`);
    }

    if (!entry.recovery_attempts) {
      entry.recovery_attempts = [];
    }
    entry.recovery_attempts.push(recovery_record);

    console.error(`Recorded recovery attempt for ${audit_id}`, {
      audit_id,
      attempt_id: recovery_record.attempt_id,
      recovery_success: recovery_record.recovery_success,
      memory_id: entry.memory_id,
      user_initiated: recovery_record.user_initiated,
    });
  }

  async queryAuditEntries(
    query: ForgettingAuditQuery
  ): Promise<ForgettingAuditEntry[]> {
    let entries = Array.from(this.auditEntries.values());

    // Apply filters
    if (query.start_timestamp) {
      entries = entries.filter(
        (entry) => entry.timestamp >= query.start_timestamp!
      );
    }

    if (query.end_timestamp) {
      entries = entries.filter(
        (entry) => entry.timestamp <= query.end_timestamp!
      );
    }

    if (query.memory_ids && query.memory_ids.length > 0) {
      entries = entries.filter((entry) =>
        query.memory_ids!.includes(entry.memory_id)
      );
    }

    if (query.execution_status && query.execution_status.length > 0) {
      entries = entries.filter((entry) =>
        query.execution_status!.includes(entry.execution_status)
      );
    }

    if (query.execution_method && query.execution_method.length > 0) {
      entries = entries.filter((entry) =>
        query.execution_method!.includes(entry.execution_method)
      );
    }

    if (query.user_consent_granted !== undefined) {
      entries = entries.filter(
        (entry) => entry.user_consent_granted === query.user_consent_granted
      );
    }

    if (query.privacy_level && query.privacy_level.length > 0) {
      entries = entries.filter((entry) =>
        query.privacy_level!.includes(entry.privacy_level)
      );
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    entries = entries.slice(offset, offset + limit);

    console.error(`Query returned ${entries.length} audit entries`, {
      total_entries: this.auditEntries.size,
      query_filters: Object.keys(query).length,
    });

    return entries;
  }

  async getAuditSummary(
    start_timestamp?: number,
    end_timestamp?: number
  ): Promise<ForgettingAuditSummary> {
    let entries = Array.from(this.auditEntries.values());

    // Apply time filters
    if (start_timestamp) {
      entries = entries.filter((entry) => entry.timestamp >= start_timestamp);
    }
    if (end_timestamp) {
      entries = entries.filter((entry) => entry.timestamp <= end_timestamp);
    }

    // Calculate summary statistics
    const total_entries = entries.length;

    const entries_by_status: Record<string, number> = {};
    const entries_by_method: Record<string, number> = {};

    let total_memory_freed_bytes = 0;
    let total_processing_improvement_ms = 0;
    let processing_improvement_count = 0;
    let consent_requested_count = 0;
    let consent_granted_count = 0;
    let recovery_attempt_count = 0;
    let recovery_success_count = 0;

    for (const entry of entries) {
      // Count by status
      entries_by_status[entry.execution_status] =
        (entries_by_status[entry.execution_status] || 0) + 1;

      // Count by method
      entries_by_method[entry.execution_method] =
        (entries_by_method[entry.execution_method] || 0) + 1;

      // Aggregate impact metrics
      if (entry.actual_impact) {
        total_memory_freed_bytes +=
          entry.actual_impact.memory_space_freed_bytes || 0;
        if (entry.actual_impact.processing_speed_improvement_ms) {
          total_processing_improvement_ms +=
            entry.actual_impact.processing_speed_improvement_ms;
          processing_improvement_count++;
        }
      }

      // Count consent metrics
      if (entry.user_consent_requested) {
        consent_requested_count++;
        if (entry.user_consent_granted) {
          consent_granted_count++;
        }
      }

      // Count recovery metrics
      if (entry.recovery_attempts) {
        recovery_attempt_count += entry.recovery_attempts.length;
        recovery_success_count += entry.recovery_attempts.filter(
          (attempt) => attempt.recovery_success
        ).length;
      }
    }

    const average_processing_improvement_ms =
      processing_improvement_count > 0
        ? total_processing_improvement_ms / processing_improvement_count
        : 0;

    const user_consent_rate =
      consent_requested_count > 0
        ? consent_granted_count / consent_requested_count
        : 0;

    const recovery_attempt_rate =
      total_entries > 0 ? recovery_attempt_count / total_entries : 0;

    const recovery_success_rate =
      recovery_attempt_count > 0
        ? recovery_success_count / recovery_attempt_count
        : 0;

    const time_period = {
      start_timestamp:
        start_timestamp ||
        (entries.length > 0
          ? Math.min(...entries.map((e) => e.timestamp))
          : Date.now()),
      end_timestamp:
        end_timestamp ||
        (entries.length > 0
          ? Math.max(...entries.map((e) => e.timestamp))
          : Date.now()),
    };

    return {
      total_entries,
      entries_by_status,
      entries_by_method,
      total_memory_freed_bytes,
      average_processing_improvement_ms,
      user_consent_rate,
      recovery_attempt_rate,
      recovery_success_rate,
      time_period,
    };
  }

  async exportAuditData(
    query: ForgettingAuditQuery,
    format: "json" | "csv" | "xml"
  ): Promise<string> {
    const entries = await this.queryAuditEntries(query);

    switch (format) {
      case "json":
        return JSON.stringify(entries, null, 2);

      case "csv":
        return this.exportToCsv(entries);

      case "xml":
        return this.exportToXml(entries);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCsv(entries: ForgettingAuditEntry[]): string {
    if (entries.length === 0) {
      return "No data to export";
    }

    const headers = [
      "audit_id",
      "timestamp",
      "memory_id",
      "memory_type",
      "execution_status",
      "execution_method",
      "user_consent_requested",
      "user_consent_granted",
      "privacy_level",
      "secure_deletion_applied",
    ];

    const csvRows = [headers.join(",")];

    for (const entry of entries) {
      const row = [
        entry.audit_id,
        new Date(entry.timestamp).toISOString(),
        entry.memory_id,
        entry.memory_type,
        entry.execution_status,
        entry.execution_method,
        entry.user_consent_requested.toString(),
        entry.user_consent_granted?.toString() || "",
        entry.privacy_level,
        entry.secure_deletion_applied.toString(),
      ];
      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  }

  private exportToXml(entries: ForgettingAuditEntry[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<audit_entries>\n';

    for (const entry of entries) {
      xml += "  <entry>\n";
      xml += `    <audit_id>${entry.audit_id}</audit_id>\n`;
      xml += `    <timestamp>${new Date(
        entry.timestamp
      ).toISOString()}</timestamp>\n`;
      xml += `    <memory_id>${entry.memory_id}</memory_id>\n`;
      xml += `    <memory_type>${entry.memory_type}</memory_type>\n`;
      xml += `    <execution_status>${entry.execution_status}</execution_status>\n`;
      xml += `    <execution_method>${entry.execution_method}</execution_method>\n`;
      xml += `    <user_consent_requested>${entry.user_consent_requested}</user_consent_requested>\n`;
      xml += `    <privacy_level>${entry.privacy_level}</privacy_level>\n`;
      xml += `    <secure_deletion_applied>${entry.secure_deletion_applied}</secure_deletion_applied>\n`;
      xml += "  </entry>\n";
    }

    xml += "</audit_entries>";
    return xml;
  }

  async purgeOldEntries(
    retention_period_days: number,
    preserve_important: boolean
  ): Promise<number> {
    const cutoff_timestamp =
      Date.now() - retention_period_days * 24 * 60 * 60 * 1000;
    let purged_count = 0;

    for (const [audit_id, entry] of this.auditEntries.entries()) {
      if (entry.timestamp < cutoff_timestamp) {
        // Check if we should preserve important entries
        if (preserve_important) {
          const is_important =
            entry.privacy_level === "confidential" ||
            entry.privacy_level === "restricted" ||
            entry.user_override ||
            entry.recovery_attempts?.length > 0;

          if (is_important) {
            continue;
          }
        }

        this.auditEntries.delete(audit_id);
        purged_count++;
      }
    }

    console.error(`Purged ${purged_count} old audit entries`, {
      retention_period_days,
      preserve_important,
      remaining_entries: this.auditEntries.size,
    });

    return purged_count;
  }

  // Additional utility methods

  /**
   * Get audit entry by ID
   */
  async getAuditEntry(audit_id: string): Promise<ForgettingAuditEntry | null> {
    return this.auditEntries.get(audit_id) || null;
  }

  /**
   * Get all audit entries for a specific memory
   */
  async getMemoryAuditHistory(
    memory_id: string
  ): Promise<ForgettingAuditEntry[]> {
    return Array.from(this.auditEntries.values())
      .filter((entry) => entry.memory_id === memory_id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<{
    total_entries: number;
    recent_entries_24h: number;
    pending_consent_requests: number;
    failed_executions_24h: number;
    average_processing_time_ms: number;
  }> {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    const all_entries = Array.from(this.auditEntries.values());
    const recent_entries = all_entries.filter(
      (entry) => entry.timestamp >= twentyFourHoursAgo
    );

    const pending_consent_requests = all_entries.filter(
      (entry) =>
        entry.user_consent_requested && entry.user_consent_granted === undefined
    ).length;

    const failed_executions_24h = recent_entries.filter(
      (entry) => entry.execution_status === "failed"
    ).length;

    // Calculate average processing time for executed entries
    const executed_entries = all_entries.filter(
      (entry) =>
        entry.execution_status === "executed" && entry.execution_timestamp
    );

    const average_processing_time_ms =
      executed_entries.length > 0
        ? executed_entries.reduce(
            (sum, entry) =>
              sum + (entry.execution_timestamp! - entry.timestamp),
            0
          ) / executed_entries.length
        : 0;

    return {
      total_entries: all_entries.length,
      recent_entries_24h: recent_entries.length,
      pending_consent_requests,
      failed_executions_24h,
      average_processing_time_ms,
    };
  }
}
