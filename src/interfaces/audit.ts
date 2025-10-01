/**
 * Forgetting Audit and Control System Interfaces
 *
 * Defines interfaces for comprehensive logging of forgetting decisions,
 * user control mechanisms, and privacy-preserving forgetting operations.
 */

import { ForgettingDecision, ForgettingEvaluation } from "./forgetting.js";

// Audit system interfaces

export interface ForgettingAuditEntry {
  audit_id: string;
  timestamp: number;
  session_id?: string;
  memory_id: string;
  memory_type: "episodic" | "semantic";
  memory_content_summary: string;

  // Decision details
  decision: ForgettingDecision;
  evaluation: ForgettingEvaluation;

  // Execution details
  execution_status: "pending" | "executed" | "cancelled" | "failed";
  execution_timestamp?: number;
  execution_method: "automatic" | "manual" | "user_requested";

  // User interaction
  user_consent_requested: boolean;
  user_consent_granted?: boolean;
  user_feedback?: string;
  user_override?: ForgettingUserOverride;

  // Impact tracking
  actual_impact?: ForgettingActualImpact;
  recovery_attempts?: RecoveryAttemptRecord[];

  // Privacy and security
  privacy_level: "public" | "private" | "confidential" | "restricted";
  secure_deletion_applied: boolean;
  audit_trail_encrypted: boolean;
}

export interface ForgettingUserOverride {
  override_type:
    | "prevent_forgetting"
    | "force_forgetting"
    | "modify_decision"
    | "delay_execution";
  override_reason: string;
  override_timestamp: number;
  modified_decision?: Partial<ForgettingDecision>;
  delay_until?: number;
}

export interface ForgettingActualImpact {
  memory_space_freed_bytes: number;
  processing_speed_improvement_ms: number;
  interference_reduction_score: number;
  focus_improvement_score: number;
  unexpected_consequences: string[];
  user_satisfaction_rating?: number;
}

export interface RecoveryAttemptRecord {
  attempt_id: string;
  attempt_timestamp: number;
  recovery_success: boolean;
  recovery_confidence: number;
  recovery_method: string;
  user_initiated: boolean;
}

export interface ForgettingAuditQuery {
  start_timestamp?: number;
  end_timestamp?: number;
  memory_ids?: string[];
  execution_status?: ("pending" | "executed" | "cancelled" | "failed")[];
  execution_method?: ("automatic" | "manual" | "user_requested")[];
  user_consent_granted?: boolean;
  privacy_level?: ("public" | "private" | "confidential" | "restricted")[];
  limit?: number;
  offset?: number;
}

export interface ForgettingAuditSummary {
  total_entries: number;
  entries_by_status: Record<string, number>;
  entries_by_method: Record<string, number>;
  total_memory_freed_bytes: number;
  average_processing_improvement_ms: number;
  user_consent_rate: number;
  recovery_attempt_rate: number;
  recovery_success_rate: number;
  time_period: {
    start_timestamp: number;
    end_timestamp: number;
  };
}

export interface IForgettingAuditSystem {
  /**
   * Log a forgetting decision and evaluation
   */
  logForgettingDecision(
    memory_id: string,
    memory_type: "episodic" | "semantic",
    memory_content_summary: string,
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    execution_method: "automatic" | "manual" | "user_requested",
    privacy_level?: "public" | "private" | "confidential" | "restricted"
  ): Promise<string>; // Returns audit_id

  /**
   * Update audit entry with execution results
   */
  updateExecutionStatus(
    audit_id: string,
    status: "executed" | "cancelled" | "failed",
    actual_impact?: ForgettingActualImpact
  ): Promise<void>;

  /**
   * Record user consent decision
   */
  recordUserConsent(
    audit_id: string,
    consent_granted: boolean,
    user_feedback?: string
  ): Promise<void>;

  /**
   * Record user override
   */
  recordUserOverride(
    audit_id: string,
    override: ForgettingUserOverride
  ): Promise<void>;

  /**
   * Record recovery attempt
   */
  recordRecoveryAttempt(
    audit_id: string,
    recovery_record: RecoveryAttemptRecord
  ): Promise<void>;

  /**
   * Query audit entries
   */
  queryAuditEntries(
    query: ForgettingAuditQuery
  ): Promise<ForgettingAuditEntry[]>;

  /**
   * Get audit summary statistics
   */
  getAuditSummary(
    start_timestamp?: number,
    end_timestamp?: number
  ): Promise<ForgettingAuditSummary>;

  /**
   * Export audit data for compliance or analysis
   */
  exportAuditData(
    query: ForgettingAuditQuery,
    format: "json" | "csv" | "xml"
  ): Promise<string>;

  /**
   * Purge old audit entries (with retention policy compliance)
   */
  purgeOldEntries(
    retention_period_days: number,
    preserve_important: boolean
  ): Promise<number>; // Returns number of entries purged
}

// User control system interfaces

export interface ForgettingPolicy {
  policy_id: string;
  policy_name: string;
  description: string;
  created_timestamp: number;
  last_modified_timestamp: number;
  active: boolean;

  // Policy rules
  rules: ForgettingPolicyRule[];

  // User preferences
  user_preferences: ForgettingUserPreferences;

  // Execution settings
  execution_settings: ForgettingExecutionSettings;
}

export interface ForgettingPolicyRule {
  rule_id: string;
  rule_name: string;
  description: string;
  priority: number; // Higher number = higher priority

  // Conditions
  conditions: ForgettingCondition[];
  condition_logic: "AND" | "OR"; // How to combine conditions

  // Actions
  action: "allow" | "deny" | "require_consent" | "delay" | "modify";
  action_parameters?: Record<string, unknown>;
}

export interface ForgettingCondition {
  condition_type:
    | "memory_type"
    | "importance_threshold"
    | "age_days"
    | "access_frequency"
    | "content_category"
    | "privacy_level"
    | "user_tag";
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "not_contains"
    | "in"
    | "not_in";
  value: unknown;
  weight?: number; // For weighted condition evaluation
}

export interface ForgettingUserPreferences {
  consent_required_by_default: boolean;
  protected_categories: string[];
  max_auto_forget_importance: number;
  retention_period_days: number;
  notification_preferences: NotificationPreferences;
  privacy_preferences: PrivacyPreferences;
}

export interface NotificationPreferences {
  notify_before_forgetting: boolean;
  notification_delay_hours: number;
  notify_after_forgetting: boolean;
  notification_methods: ("email" | "in_app" | "log")[];
}

export interface PrivacyPreferences {
  default_privacy_level: "public" | "private" | "confidential" | "restricted";
  secure_deletion_required: boolean;
  audit_encryption_required: boolean;
  data_retention_days: number;
}

export interface ForgettingExecutionSettings {
  max_concurrent_operations: number;
  batch_size: number;
  execution_delay_ms: number;
  retry_attempts: number;
  rollback_enabled: boolean;
  backup_before_deletion: boolean;
}

export interface PolicyEvaluationResult {
  policy_id: string;
  rule_results: RuleEvaluationResult[];
  final_decision: "allow" | "deny" | "require_consent" | "delay" | "modify";
  decision_confidence: number;
  applied_modifications?: Partial<ForgettingDecision>;
  delay_until?: number;
  consent_required: boolean;
  reasoning: string[];
}

export interface RuleEvaluationResult {
  rule_id: string;
  rule_name: string;
  conditions_met: boolean;
  condition_results: ConditionEvaluationResult[];
  action_applied: boolean;
  priority: number;
}

export interface ConditionEvaluationResult {
  condition_type: string;
  operator: string;
  expected_value: unknown;
  actual_value: unknown;
  result: boolean;
  weight?: number;
}

export interface IForgettingPolicyManager {
  /**
   * Create a new forgetting policy
   */
  createPolicy(
    policy: Omit<
      ForgettingPolicy,
      "policy_id" | "created_timestamp" | "last_modified_timestamp"
    >
  ): Promise<string>; // Returns policy_id

  /**
   * Update an existing policy
   */
  updatePolicy(
    policy_id: string,
    updates: Partial<ForgettingPolicy>
  ): Promise<void>;

  /**
   * Delete a policy
   */
  deletePolicy(policy_id: string): Promise<void>;

  /**
   * Get a policy by ID
   */
  getPolicy(policy_id: string): Promise<ForgettingPolicy | null>;

  /**
   * List all policies
   */
  listPolicies(active_only?: boolean): Promise<ForgettingPolicy[]>;

  /**
   * Evaluate policies against a forgetting decision
   */
  evaluatePolicies(
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    memory_metadata: Record<string, unknown>
  ): Promise<PolicyEvaluationResult[]>;

  /**
   * Get effective policy decision (combining all policy results)
   */
  getEffectivePolicyDecision(
    policy_results: PolicyEvaluationResult[]
  ): Promise<PolicyEvaluationResult>;

  /**
   * Import policy from configuration
   */
  importPolicy(policy_config: unknown): Promise<string>;

  /**
   * Export policy to configuration
   */
  exportPolicy(policy_id: string): Promise<unknown>;
}

// Privacy-preserving forgetting interfaces

export interface SecureDeletionOptions {
  deletion_method: "overwrite" | "crypto_erase" | "physical_destroy";
  overwrite_passes?: number;
  verification_required: boolean;
  certificate_generation: boolean;
  compliance_standards: string[]; // e.g., ["GDPR", "CCPA", "HIPAA"]
}

export interface SecureDeletionResult {
  deletion_id: string;
  deletion_timestamp: number;
  deletion_method: string;
  success: boolean;
  verification_passed: boolean;
  certificate_id?: string;
  compliance_attestation: ComplianceAttestation;
  recovery_impossible: boolean;
}

export interface ComplianceAttestation {
  standards_met: string[];
  attestation_timestamp: number;
  attestation_authority: string;
  verification_hash: string;
  audit_trail_preserved: boolean;
}

export interface ISecureDeletionManager {
  /**
   * Perform secure deletion of memory content
   */
  secureDelete(
    memory_id: string,
    content: unknown,
    options: SecureDeletionOptions
  ): Promise<SecureDeletionResult>;

  /**
   * Verify deletion completeness
   */
  verifyDeletion(deletion_id: string): Promise<boolean>;

  /**
   * Generate compliance certificate
   */
  generateComplianceCertificate(
    deletion_id: string,
    standards: string[]
  ): Promise<string>; // Returns certificate content

  /**
   * Audit secure deletion operations
   */
  auditSecureDeletions(
    start_timestamp?: number,
    end_timestamp?: number
  ): Promise<SecureDeletionResult[]>;
}

// Combined forgetting control system

export interface IForgettingControlSystem {
  audit_system: IForgettingAuditSystem;
  policy_manager: IForgettingPolicyManager;
  secure_deletion_manager: ISecureDeletionManager;

  /**
   * Process a forgetting request through the complete control system
   */
  processForgettingRequest(
    memory_id: string,
    memory_type: "episodic" | "semantic",
    memory_content: unknown,
    decision: ForgettingDecision,
    evaluation: ForgettingEvaluation,
    execution_method: "automatic" | "manual" | "user_requested"
  ): Promise<ForgettingControlResult>;

  /**
   * Handle user consent workflow
   */
  handleUserConsent(
    audit_id: string,
    consent_granted: boolean,
    user_feedback?: string
  ): Promise<void>;

  /**
   * Process user override
   */
  processUserOverride(
    audit_id: string,
    override: ForgettingUserOverride
  ): Promise<void>;

  /**
   * Get system status and health
   */
  getSystemStatus(): Promise<ForgettingControlSystemStatus>;
}

export interface ForgettingControlResult {
  audit_id: string;
  policy_decision: PolicyEvaluationResult;
  execution_allowed: boolean;
  consent_required: boolean;
  secure_deletion_required: boolean;
  estimated_execution_time?: number;
  next_steps: string[];
}

export interface ForgettingControlSystemStatus {
  audit_system_healthy: boolean;
  policy_manager_healthy: boolean;
  secure_deletion_healthy: boolean;
  active_policies_count: number;
  pending_consent_requests: number;
  recent_audit_entries: number;
  system_load: number; // 0-1
  last_health_check: number;
}
