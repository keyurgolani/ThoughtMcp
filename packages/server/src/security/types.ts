/**
 * Security Types
 *
 * Type definitions for security components including input validation,
 * rate limiting, authentication, and secrets management.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

/**
 * Input validation result
 */
export interface ValidationResult {
  valid: boolean;
  sanitized: string;
  errors: string[];
  warnings: string[];
}

/**
 * Input validation options
 */
export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowHtml?: boolean;
  allowSpecialChars?: boolean;
  trimWhitespace?: boolean;
  normalizeUnicode?: boolean;
  stripNullBytes?: boolean;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (context: RateLimitContext) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

/**
 * Rate limit context for key generation
 */
export interface RateLimitContext {
  userId?: string;
  sessionId?: string;
  ip?: string;
  toolName?: string;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // Seconds until retry allowed
}

/**
 * Rate limit entry for tracking
 */
export interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastRequest: number;
}

/**
 * Authentication context
 */
export interface AuthContext {
  userId?: string;
  sessionId?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  authorized: boolean;
  context?: AuthContext;
  error?: string;
}

/**
 * Authentication hook function type
 */
export type AuthHook = (context: AuthContext, operation: string) => Promise<AuthResult>;

/**
 * Authorization rule
 */
export interface AuthorizationRule {
  operation: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  customCheck?: (context: AuthContext) => boolean;
}

/**
 * Secrets configuration
 */
export interface SecretsConfig {
  provider: "env" | "file" | "vault";
  envPrefix?: string;
  filePath?: string;
  vaultUrl?: string;
  vaultToken?: string;
  cacheEnabled?: boolean;
  cacheTtl?: number;
}

/**
 * Secret value with metadata
 */
export interface SecretValue {
  value: string;
  source: string;
  cachedAt?: Date;
  expiresAt?: Date;
}

/**
 * Database SSL configuration
 */
export interface DatabaseSSLConfig {
  enabled: boolean;
  rejectUnauthorized?: boolean;
  ca?: string;
  cert?: string;
  key?: string;
}

/**
 * Security audit result
 */
export interface SecurityAuditResult {
  timestamp: Date;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
  score: number; // 0-100
}

/**
 * Security vulnerability
 */
export interface SecurityVulnerability {
  severity: "low" | "moderate" | "high" | "critical";
  title: string;
  description: string;
  package?: string;
  version?: string;
  fixAvailable?: boolean;
  recommendation?: string;
}

/**
 * Security event for logging
 */
export interface SecurityEvent {
  timestamp: Date;
  type: SecurityEventType;
  severity: "info" | "warning" | "error" | "critical";
  userId?: string;
  sessionId?: string;
  ip?: string;
  operation?: string;
  details: Record<string, unknown>;
}

/**
 * Security event types
 */
export type SecurityEventType =
  | "authentication_success"
  | "authentication_failure"
  | "authorization_denied"
  | "rate_limit_exceeded"
  | "input_validation_failed"
  | "suspicious_activity"
  | "secret_access"
  | "configuration_change";
