/**
 * Authentication and Authorization Hooks
 *
 * Provides an extensible framework for authentication and authorization.
 * Supports custom auth providers and role-based access control.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import type { AuthContext, AuthHook, AuthorizationRule, AuthResult } from "./types.js";

/**
 * Authentication Manager
 *
 * Manages authentication hooks and authorization rules
 */
export class AuthManager {
  private authHooks: AuthHook[] = [];
  private authorizationRules: Map<string, AuthorizationRule> = new Map();
  private defaultAllow: boolean;

  constructor(options: { defaultAllow?: boolean } = {}) {
    this.defaultAllow = options.defaultAllow ?? true;
  }

  /**
   * Register an authentication hook
   */
  registerAuthHook(hook: AuthHook): void {
    this.authHooks.push(hook);
  }

  /**
   * Remove an authentication hook
   */
  removeAuthHook(hook: AuthHook): boolean {
    const index = this.authHooks.indexOf(hook);
    if (index !== -1) {
      this.authHooks.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Register an authorization rule for an operation
   */
  registerRule(rule: AuthorizationRule): void {
    this.authorizationRules.set(rule.operation, rule);
  }

  /**
   * Remove an authorization rule
   */
  removeRule(operation: string): boolean {
    return this.authorizationRules.delete(operation);
  }

  /**
   * Authenticate and authorize a request
   */
  async authenticate(context: AuthContext, operation: string): Promise<AuthResult> {
    // If no hooks registered, use default behavior
    if (this.authHooks.length === 0) {
      return this.defaultAllow
        ? { authenticated: true, authorized: true, context }
        : { authenticated: false, authorized: false, error: "No authentication configured" };
    }

    // Run all auth hooks
    for (const hook of this.authHooks) {
      try {
        const result = await hook(context, operation);

        // If any hook fails authentication, return immediately
        if (!result.authenticated) {
          return result;
        }

        // Update context with any additional info from hook
        if (result.context) {
          Object.assign(context, result.context);
        }
      } catch (error) {
        return {
          authenticated: false,
          authorized: false,
          error: error instanceof Error ? error.message : "Authentication error",
        };
      }
    }

    // Check authorization rules
    const authorized = this.checkAuthorization(context, operation);

    return {
      authenticated: true,
      authorized,
      context,
      error: authorized ? undefined : `Not authorized for operation: ${operation}`,
    };
  }

  /**
   * Check authorization based on rules
   */
  private checkAuthorization(context: AuthContext, operation: string): boolean {
    const rule = this.authorizationRules.get(operation);

    // If no rule defined, use default
    if (!rule) {
      return this.defaultAllow;
    }

    // Check required roles
    if (rule.requiredRoles && rule.requiredRoles.length > 0) {
      const hasRole = rule.requiredRoles.some((role) => context.roles?.includes(role));
      if (!hasRole) {
        return false;
      }
    }

    // Check required permissions
    if (rule.requiredPermissions && rule.requiredPermissions.length > 0) {
      const hasPermission = rule.requiredPermissions.some((perm) =>
        context.permissions?.includes(perm)
      );
      if (!hasPermission) {
        return false;
      }
    }

    // Run custom check if provided
    if (rule.customCheck && !rule.customCheck(context)) {
      return false;
    }

    return true;
  }

  /**
   * Get all registered rules
   */
  getRules(): AuthorizationRule[] {
    return Array.from(this.authorizationRules.values());
  }

  /**
   * Clear all hooks and rules
   */
  clear(): void {
    this.authHooks = [];
    this.authorizationRules.clear();
  }
}

/**
 * Create a simple user ID validation hook
 */
export function createUserIdValidationHook(): AuthHook {
  return async (context: AuthContext, _operation: string): Promise<AuthResult> => {
    if (!context.userId) {
      return {
        authenticated: false,
        authorized: false,
        error: "User ID is required",
      };
    }

    // Basic user ID format validation
    if (typeof context.userId !== "string" || context.userId.trim().length === 0) {
      return {
        authenticated: false,
        authorized: false,
        error: "Invalid user ID format",
      };
    }

    return {
      authenticated: true,
      authorized: true,
      context,
    };
  };
}

/**
 * Create a session validation hook
 */
export function createSessionValidationHook(): AuthHook {
  return async (context: AuthContext, _operation: string): Promise<AuthResult> => {
    if (!context.sessionId) {
      return {
        authenticated: false,
        authorized: false,
        error: "Session ID is required",
      };
    }

    // Basic session ID format validation
    if (typeof context.sessionId !== "string" || context.sessionId.trim().length === 0) {
      return {
        authenticated: false,
        authorized: false,
        error: "Invalid session ID format",
      };
    }

    return {
      authenticated: true,
      authorized: true,
      context,
    };
  };
}

/**
 * Create a role-based access control hook
 */
export function createRBACHook(rolePermissions: Map<string, string[]>): AuthHook {
  return async (context: AuthContext, _operation: string): Promise<AuthResult> => {
    // Expand roles to permissions
    const permissions = new Set<string>(context.permissions ?? []);

    for (const role of context.roles ?? []) {
      const rolePerms = rolePermissions.get(role);
      if (rolePerms) {
        rolePerms.forEach((perm) => permissions.add(perm));
      }
    }

    return {
      authenticated: true,
      authorized: true,
      context: {
        ...context,
        permissions: Array.from(permissions),
      },
    };
  };
}

/**
 * Create a default auth manager with basic validation
 */
export function createDefaultAuthManager(): AuthManager {
  const manager = new AuthManager({ defaultAllow: true });

  // Register basic user ID validation
  manager.registerAuthHook(createUserIdValidationHook());

  return manager;
}

/**
 * Create a strict auth manager requiring both user and session
 */
export function createStrictAuthManager(): AuthManager {
  const manager = new AuthManager({ defaultAllow: false });

  // Register user ID validation
  manager.registerAuthHook(createUserIdValidationHook());

  // Register session validation
  manager.registerAuthHook(createSessionValidationHook());

  return manager;
}
