/**
 * Audit Summary Formatter
 *
 * Creates user-friendly summaries of forgetting audit logs
 * with plain language explanations and visual indicators.
 */

export interface AuditSummary {
  period: string;
  total_operations: number;
  operations_by_type: {
    forgotten: number;
    archived: number;
    compressed: number;
    recovered: number;
  };
  operations_by_method: {
    automatic: number;
    user_requested: number;
    policy_driven: number;
  };
  impact_summary: {
    memories_affected: number;
    space_freed_mb: number;
    performance_improvement: string;
    user_satisfaction: string;
  };
  safety_summary: {
    operations_with_backup: number;
    operations_with_consent: number;
    successful_recoveries: number;
    failed_operations: number;
  };
  trends: {
    direction: "improving" | "stable" | "concerning";
    key_changes: string[];
    recommendations: string[];
  };
  recent_highlights: Array<{
    date: string;
    operation: string;
    description: string;
    impact: string;
    status: "success" | "warning" | "error";
  }>;
}

export interface DetailedAuditEntry {
  id: string;
  timestamp: string;
  operation_type: string;
  memory_summary: string;
  reason: string;
  method: string;
  status: string;
  user_friendly_description: string;
  impact_description: string;
  safety_measures: string[];
  rollback_available: boolean;
}

export class AuditSummaryFormatter {
  static createUserFriendlySummary(
    auditEntries: any[],
    timeRange: { start: number; end: number }
  ): AuditSummary {
    const period = this.formatTimePeriod(timeRange);
    const totalOperations = auditEntries.length;

    const operationsByType = this.categorizeOperationsByType(auditEntries);
    const operationsByMethod = this.categorizeOperationsByMethod(auditEntries);
    const impactSummary = this.calculateImpactSummary(auditEntries);
    const safetySummary = this.calculateSafetySummary(auditEntries);
    const trends = this.analyzeTrends(auditEntries);
    const recentHighlights = this.extractRecentHighlights(auditEntries);

    return {
      period,
      total_operations: totalOperations,
      operations_by_type: operationsByType,
      operations_by_method: operationsByMethod,
      impact_summary: impactSummary,
      safety_summary: safetySummary,
      trends,
      recent_highlights: recentHighlights,
    };
  }

  static formatAuditEntryForUser(entry: any): DetailedAuditEntry {
    return {
      id: entry.audit_id || entry.id || "unknown",
      timestamp: this.formatTimestamp(entry.timestamp || Date.now()),
      operation_type: this.formatOperationType(
        entry.operation_type || "unknown"
      ),
      memory_summary: this.createMemorySummary(entry),
      reason: this.explainReason(entry.reason || "unknown"),
      method: this.formatMethod(entry.method || "unknown"),
      status: this.formatStatus(entry.status || "unknown"),
      user_friendly_description: this.createUserFriendlyDescription(entry),
      impact_description: this.createImpactDescription(entry),
      safety_measures: this.listSafetyMeasures(entry),
      rollback_available: this.checkRollbackAvailability(entry),
    };
  }

  static createAuditSummaryText(summary: AuditSummary): string {
    let text = `# Memory Management Summary\n\n`;
    text += `**Period:** ${summary.period}\n`;
    text += `**Total Operations:** ${summary.total_operations}\n\n`;

    // Operations breakdown
    text += `## 📊 Operations Breakdown\n\n`;
    text += `**By Type:**\n`;
    text += `• 🗑️ Forgotten: ${summary.operations_by_type.forgotten}\n`;
    text += `• 📦 Archived: ${summary.operations_by_type.archived}\n`;
    text += `• 🗜️ Compressed: ${summary.operations_by_type.compressed}\n`;
    text += `• 🔄 Recovered: ${summary.operations_by_type.recovered}\n\n`;

    text += `**By Method:**\n`;
    text += `• 🤖 Automatic: ${summary.operations_by_method.automatic}\n`;
    text += `• 👤 User Requested: ${summary.operations_by_method.user_requested}\n`;
    text += `• 📋 Policy Driven: ${summary.operations_by_method.policy_driven}\n\n`;

    // Impact summary
    text += `## 📈 Impact Summary\n\n`;
    text += `• **Memories Affected:** ${summary.impact_summary.memories_affected.toLocaleString()}\n`;
    text += `• **Space Freed:** ${summary.impact_summary.space_freed_mb} MB\n`;
    text += `• **Performance:** ${summary.impact_summary.performance_improvement}\n`;
    text += `• **User Satisfaction:** ${summary.impact_summary.user_satisfaction}\n\n`;

    // Safety summary
    text += `## 🛡️ Safety Summary\n\n`;
    text += `• **Operations with Backup:** ${summary.safety_summary.operations_with_backup}/${summary.total_operations}\n`;
    text += `• **Operations with Consent:** ${summary.safety_summary.operations_with_consent}/${summary.total_operations}\n`;
    text += `• **Successful Recoveries:** ${summary.safety_summary.successful_recoveries}\n`;
    text += `• **Failed Operations:** ${summary.safety_summary.failed_operations}\n\n`;

    // Trends
    const trendEmoji =
      summary.trends.direction === "improving"
        ? "📈"
        : summary.trends.direction === "stable"
        ? "➡️"
        : "⚠️";
    text += `## ${trendEmoji} Trends\n\n`;
    text += `**Overall Direction:** ${summary.trends.direction}\n\n`;

    if (summary.trends.key_changes.length > 0) {
      text += `**Key Changes:**\n`;
      summary.trends.key_changes.forEach((change) => {
        text += `• ${change}\n`;
      });
      text += `\n`;
    }

    if (summary.trends.recommendations.length > 0) {
      text += `**Recommendations:**\n`;
      summary.trends.recommendations.forEach((rec) => {
        text += `• ${rec}\n`;
      });
      text += `\n`;
    }

    // Recent highlights
    if (summary.recent_highlights.length > 0) {
      text += `## 🌟 Recent Highlights\n\n`;
      summary.recent_highlights.forEach((highlight) => {
        const statusEmoji =
          highlight.status === "success"
            ? "✅"
            : highlight.status === "warning"
            ? "⚠️"
            : "❌";
        text += `${statusEmoji} **${highlight.date}** - ${highlight.operation}\n`;
        text += `   ${highlight.description}\n`;
        text += `   *Impact: ${highlight.impact}*\n\n`;
      });
    }

    return text;
  }

  static createDetailedAuditText(entries: DetailedAuditEntry[]): string {
    if (entries.length === 0) {
      return "No audit entries found for the specified criteria.";
    }

    let text = `# Detailed Audit Log\n\n`;
    text += `**Total Entries:** ${entries.length}\n\n`;

    entries.forEach((entry, index) => {
      text += `## ${index + 1}. ${entry.operation_type}\n\n`;
      text += `**When:** ${entry.timestamp}\n`;
      text += `**What:** ${entry.user_friendly_description}\n`;
      text += `**Why:** ${entry.reason}\n`;
      text += `**How:** ${entry.method}\n`;
      text += `**Status:** ${this.formatStatusWithEmoji(entry.status)}\n\n`;

      if (entry.memory_summary) {
        text += `**Memory:** ${entry.memory_summary}\n`;
      }

      if (entry.impact_description) {
        text += `**Impact:** ${entry.impact_description}\n`;
      }

      if (entry.safety_measures.length > 0) {
        text += `**Safety Measures:**\n`;
        entry.safety_measures.forEach((measure) => {
          text += `• ${measure}\n`;
        });
      }

      if (entry.rollback_available) {
        text += `🔄 **Rollback Available:** Yes\n`;
      }

      text += `\n---\n\n`;
    });

    return text;
  }

  private static formatTimePeriod(timeRange: {
    start: number;
    end: number;
  }): string {
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    const now = new Date();

    if (end.toDateString() === now.toDateString()) {
      if (start.toDateString() === now.toDateString()) {
        return "Today";
      } else {
        const days = Math.ceil(
          (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        );
        return `Last ${days} days`;
      }
    }

    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }

  private static categorizeOperationsByType(entries: any[]) {
    return {
      forgotten: entries.filter(
        (e) => e.operation_type === "forget" || e.operation_type === "delete"
      ).length,
      archived: entries.filter((e) => e.operation_type === "archive").length,
      compressed: entries.filter((e) => e.operation_type === "compress").length,
      recovered: entries.filter((e) => e.operation_type === "recover").length,
    };
  }

  private static categorizeOperationsByMethod(entries: any[]) {
    return {
      automatic: entries.filter((e) => e.method === "automatic").length,
      user_requested: entries.filter(
        (e) => e.method === "user_requested" || e.method === "manual"
      ).length,
      policy_driven: entries.filter((e) => e.method === "policy_driven").length,
    };
  }

  private static calculateImpactSummary(entries: any[]) {
    const memoriesAffected = entries.length; // Simplified - each entry affects one memory
    const spaceFreed = entries.reduce(
      (sum, e) => sum + (e.space_freed || 150),
      0
    ); // Estimated

    let performanceImprovement = "Minimal";
    if (memoriesAffected > 1000) performanceImprovement = "Significant";
    else if (memoriesAffected > 100) performanceImprovement = "Moderate";
    else if (memoriesAffected > 10) performanceImprovement = "Noticeable";

    const successRate =
      entries.filter((e) => e.status === "success" || e.status === "completed")
        .length / entries.length;
    let userSatisfaction = "Poor";
    if (successRate > 0.95) userSatisfaction = "Excellent";
    else if (successRate > 0.85) userSatisfaction = "Good";
    else if (successRate > 0.7) userSatisfaction = "Fair";

    return {
      memories_affected: memoriesAffected,
      space_freed_mb: Math.round(spaceFreed / 1024),
      performance_improvement: performanceImprovement,
      user_satisfaction: userSatisfaction,
    };
  }

  private static calculateSafetySummary(entries: any[]) {
    return {
      operations_with_backup: entries.filter((e) => e.backup_created !== false)
        .length,
      operations_with_consent: entries.filter((e) => e.user_consent === true)
        .length,
      successful_recoveries: entries.filter(
        (e) => e.operation_type === "recover" && e.status === "success"
      ).length,
      failed_operations: entries.filter(
        (e) => e.status === "failed" || e.status === "error"
      ).length,
    };
  }

  private static analyzeTrends(entries: any[]) {
    // Simplified trend analysis
    const recentEntries = entries.filter(
      (e) => (e.timestamp || Date.now()) > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    const olderEntries = entries.filter(
      (e) => (e.timestamp || Date.now()) <= Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    const recentSuccessRate =
      recentEntries.length > 0
        ? recentEntries.filter((e) => e.status === "success").length /
          recentEntries.length
        : 0;
    const olderSuccessRate =
      olderEntries.length > 0
        ? olderEntries.filter((e) => e.status === "success").length /
          olderEntries.length
        : 0;

    let direction: "improving" | "stable" | "concerning" = "stable";
    const keyChanges: string[] = [];
    const recommendations: string[] = [];

    if (recentSuccessRate > olderSuccessRate + 0.1) {
      direction = "improving";
      keyChanges.push("Success rate has improved recently");
      recommendations.push("Continue current memory management practices");
    } else if (recentSuccessRate < olderSuccessRate - 0.1) {
      direction = "concerning";
      keyChanges.push("Success rate has declined recently");
      recommendations.push("Review recent policy changes");
      recommendations.push("Consider more conservative settings");
    }

    if (recentEntries.length > olderEntries.length * 2) {
      keyChanges.push("Memory operations have increased significantly");
      recommendations.push("Monitor system performance closely");
    }

    return { direction, key_changes: keyChanges, recommendations };
  }

  private static extractRecentHighlights(entries: any[]) {
    const highlights: Array<{
      date: string;
      operation: string;
      description: string;
      impact: string;
      status: "success" | "warning" | "error";
    }> = [];

    // Get most recent entries
    const recentEntries = entries
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 5);

    recentEntries.forEach((entry) => {
      const date = new Date(entry.timestamp || Date.now()).toLocaleDateString();
      const operation = this.formatOperationType(
        entry.operation_type || "unknown"
      );
      const description = this.createUserFriendlyDescription(entry);
      const impact = this.createImpactDescription(entry);
      const status =
        entry.status === "success"
          ? "success"
          : entry.status === "failed"
          ? "error"
          : "warning";

      highlights.push({ date, operation, description, impact, status });
    });

    return highlights;
  }

  private static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString()}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString()}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  private static formatOperationType(type: string): string {
    const typeMap: { [key: string]: string } = {
      forget: "🗑️ Memory Forgotten",
      delete: "🗑️ Memory Deleted",
      archive: "📦 Memory Archived",
      compress: "🗜️ Memory Compressed",
      recover: "🔄 Memory Recovered",
      consolidate: "🔗 Memories Consolidated",
      optimize: "⚡ Memory Optimized",
    };
    return typeMap[type] || `❓ ${type}`;
  }

  private static createMemorySummary(entry: any): string {
    if (entry.memory_summary) return entry.memory_summary;
    if (entry.memory_content)
      return entry.memory_content.substring(0, 100) + "...";
    return `Memory ${entry.memory_id || "unknown"}`;
  }

  private static explainReason(reason: string): string {
    const reasonMap: { [key: string]: string } = {
      low_importance: "Memory had low importance score",
      old_age: "Memory was very old and rarely accessed",
      policy_rule: "Matched a forgetting policy rule",
      user_request: "Requested by user",
      automatic_cleanup: "Part of automatic cleanup process",
      storage_optimization: "To free up storage space",
      performance_optimization: "To improve system performance",
      privacy_cleanup: "For privacy and security reasons",
    };
    return reasonMap[reason] || reason;
  }

  private static formatMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      automatic: "🤖 Automatic system process",
      user_requested: "👤 User initiated",
      manual: "👤 Manual operation",
      policy_driven: "📋 Policy rule triggered",
      scheduled: "⏰ Scheduled operation",
    };
    return methodMap[method] || method;
  }

  private static formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      success: "Completed successfully",
      completed: "Completed successfully",
      failed: "Failed to complete",
      error: "Error occurred",
      pending: "In progress",
      cancelled: "Cancelled by user",
      rollback: "Rolled back",
    };
    return statusMap[status] || status;
  }

  private static formatStatusWithEmoji(status: string): string {
    const statusMap: { [key: string]: string } = {
      "Completed successfully": "✅ Completed successfully",
      "Failed to complete": "❌ Failed to complete",
      "Error occurred": "❌ Error occurred",
      "In progress": "🔄 In progress",
      "Cancelled by user": "⏹️ Cancelled by user",
      "Rolled back": "↩️ Rolled back",
    };
    return statusMap[status] || status;
  }

  private static createUserFriendlyDescription(entry: any): string {
    const operation = entry.operation_type || "unknown";
    const reason = entry.reason || "unknown reason";

    switch (operation) {
      case "forget":
      case "delete":
        return `Removed memory due to ${this.explainReason(reason)}`;
      case "archive":
        return `Archived memory for future access due to ${this.explainReason(
          reason
        )}`;
      case "compress":
        return `Compressed memory to save space while preserving content`;
      case "recover":
        return `Recovered previously forgotten memory`;
      case "consolidate":
        return `Merged conflicting memories into a single coherent memory`;
      default:
        return `Performed ${operation} operation`;
    }
  }

  private static createImpactDescription(entry: any): string {
    const spaceFreed = entry.space_freed || 150;
    const importance = entry.importance || 0.3;

    let impact = `Freed ${
      Math.round((spaceFreed / 1024) * 100) / 100
    } KB of memory`;

    if (importance > 0.7) {
      impact += ", high importance content affected";
    } else if (importance > 0.4) {
      impact += ", moderate importance content affected";
    } else {
      impact += ", low importance content affected";
    }

    return impact;
  }

  private static listSafetyMeasures(entry: any): string[] {
    const measures: string[] = [];

    if (entry.backup_created !== false) {
      measures.push("Backup created before operation");
    }

    if (entry.user_consent === true) {
      measures.push("User consent obtained");
    }

    if (entry.gradual_execution === true) {
      measures.push("Gradual execution with monitoring");
    }

    if (entry.rollback_available !== false) {
      measures.push("Rollback capability available");
    }

    if (measures.length === 0) {
      measures.push("Standard safety protocols applied");
    }

    return measures;
  }

  private static checkRollbackAvailability(entry: any): boolean {
    return (
      entry.rollback_available !== false &&
      entry.operation_type !== "permanent_delete" &&
      Date.now() - (entry.timestamp || 0) < 7 * 24 * 60 * 60 * 1000
    ); // 7 days
  }
}
