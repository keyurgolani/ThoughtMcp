/**
 * Security Module
 *
 * Exports all security components including input validation,
 * rate limiting, authentication, and secrets management.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

// Types
export type {
  AuthContext,
  AuthHook,
  AuthResult,
  AuthorizationRule,
  DatabaseSSLConfig,
  RateLimitConfig,
  RateLimitContext,
  RateLimitEntry,
  RateLimitResult,
  SecretValue,
  SecretsConfig,
  SecurityAuditResult,
  SecurityEvent,
  SecurityEventType,
  SecurityVulnerability,
  ValidationOptions,
  ValidationResult,
} from "./types.js";

// Input Validator
export { InputValidator, createInputValidator } from "./input-validator.js";

// Rate Limiter
export {
  RateLimiter,
  createMemoryRateLimiter,
  createRateLimiter,
  createToolRateLimiter,
} from "./rate-limiter.js";

// Authentication
export {
  AuthManager,
  createDefaultAuthManager,
  createRBACHook,
  createSessionValidationHook,
  createStrictAuthManager,
  createUserIdValidationHook,
} from "./auth-hooks.js";

// Secrets Manager
export {
  SecretsManager,
  createEnvSecretsManager,
  createFileSecretsManager,
  getSecretsManager,
} from "./secrets-manager.js";
