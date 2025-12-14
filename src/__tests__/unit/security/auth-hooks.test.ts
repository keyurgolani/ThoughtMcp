/**
 * Authentication Hooks Tests
 *
 * Tests for authentication and authorization functionality.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  AuthManager,
  createDefaultAuthManager,
  createRBACHook,
  createSessionValidationHook,
  createStrictAuthManager,
  createUserIdValidationHook,
} from "../../../security/auth-hooks.js";
import type { AuthContext, AuthHook } from "../../../security/types.js";

describe("AuthManager", () => {
  let manager: AuthManager;

  beforeEach(() => {
    manager = new AuthManager();
  });

  describe("authenticate()", () => {
    it("should allow by default when no hooks registered", async () => {
      const context: AuthContext = { userId: "user1" };
      const result = await manager.authenticate(context, "test_operation");

      expect(result.authenticated).toBe(true);
      expect(result.authorized).toBe(true);
    });

    it("should deny by default when configured", async () => {
      const strictManager = new AuthManager({ defaultAllow: false });
      const context: AuthContext = { userId: "user1" };
      const result = await strictManager.authenticate(context, "test_operation");

      expect(result.authenticated).toBe(false);
      expect(result.authorized).toBe(false);
    });

    it("should run registered auth hooks", async () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: { ...ctx, roles: ["user"] },
      });

      manager.registerAuthHook(hook);

      const context: AuthContext = { userId: "user1" };
      const result = await manager.authenticate(context, "test_operation");

      expect(result.authenticated).toBe(true);
      expect(result.context?.roles).toContain("user");
    });

    it("should fail if any hook fails authentication", async () => {
      const passingHook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: ctx,
      });

      const failingHook: AuthHook = async () => ({
        authenticated: false,
        authorized: false,
        error: "Authentication failed",
      });

      manager.registerAuthHook(passingHook);
      manager.registerAuthHook(failingHook);

      const context: AuthContext = { userId: "user1" };
      const result = await manager.authenticate(context, "test_operation");

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Authentication failed");
    });

    it("should handle hook errors gracefully", async () => {
      const errorHook: AuthHook = async () => {
        throw new Error("Hook error");
      };

      manager.registerAuthHook(errorHook);

      const context: AuthContext = { userId: "user1" };
      const result = await manager.authenticate(context, "test_operation");

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Hook error");
    });
  });

  describe("authorization rules", () => {
    it("should check required roles", async () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: { ...ctx, roles: ["user"] },
      });

      manager.registerAuthHook(hook);
      manager.registerRule({
        operation: "admin_operation",
        requiredRoles: ["admin"],
      });

      const context: AuthContext = { userId: "user1" };
      const result = await manager.authenticate(context, "admin_operation");

      expect(result.authenticated).toBe(true);
      expect(result.authorized).toBe(false);
    });

    it("should allow when user has required role", async () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: { ...ctx, roles: ["admin"] },
      });

      manager.registerAuthHook(hook);
      manager.registerRule({
        operation: "admin_operation",
        requiredRoles: ["admin"],
      });

      const context: AuthContext = { userId: "user1" };
      const result = await manager.authenticate(context, "admin_operation");

      expect(result.authenticated).toBe(true);
      expect(result.authorized).toBe(true);
    });

    it("should check required permissions", async () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: { ...ctx, permissions: ["read"] },
      });

      manager.registerAuthHook(hook);
      manager.registerRule({
        operation: "write_operation",
        requiredPermissions: ["write"],
      });

      const context: AuthContext = { userId: "user1" };
      const result = await manager.authenticate(context, "write_operation");

      expect(result.authenticated).toBe(true);
      expect(result.authorized).toBe(false);
    });

    it("should run custom check function", async () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: ctx,
      });

      manager.registerAuthHook(hook);
      manager.registerRule({
        operation: "custom_operation",
        customCheck: (ctx) => ctx.userId === "special_user",
      });

      const normalUser: AuthContext = { userId: "user1" };
      const specialUser: AuthContext = { userId: "special_user" };

      const normalResult = await manager.authenticate(normalUser, "custom_operation");
      const specialResult = await manager.authenticate(specialUser, "custom_operation");

      expect(normalResult.authorized).toBe(false);
      expect(specialResult.authorized).toBe(true);
    });
  });

  describe("hook management", () => {
    it("should remove auth hook", () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: ctx,
      });

      manager.registerAuthHook(hook);
      const removed = manager.removeAuthHook(hook);

      expect(removed).toBe(true);
    });

    it("should return false when removing non-existent hook", () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: ctx,
      });

      const removed = manager.removeAuthHook(hook);

      expect(removed).toBe(false);
    });

    it("should remove authorization rule", () => {
      manager.registerRule({
        operation: "test_operation",
        requiredRoles: ["admin"],
      });

      const removed = manager.removeRule("test_operation");

      expect(removed).toBe(true);
      expect(manager.getRules()).toHaveLength(0);
    });

    it("should clear all hooks and rules", () => {
      const hook: AuthHook = async (ctx) => ({
        authenticated: true,
        authorized: true,
        context: ctx,
      });

      manager.registerAuthHook(hook);
      manager.registerRule({
        operation: "test_operation",
        requiredRoles: ["admin"],
      });

      manager.clear();

      expect(manager.getRules()).toHaveLength(0);
    });
  });
});

describe("createUserIdValidationHook()", () => {
  it("should validate user ID presence", async () => {
    const hook = createUserIdValidationHook();

    const validContext: AuthContext = { userId: "user1" };
    const invalidContext: AuthContext = {};

    const validResult = await hook(validContext, "test");
    const invalidResult = await hook(invalidContext, "test");

    expect(validResult.authenticated).toBe(true);
    expect(invalidResult.authenticated).toBe(false);
    expect(invalidResult.error).toBe("User ID is required");
  });

  it("should reject empty user ID", async () => {
    const hook = createUserIdValidationHook();

    const context: AuthContext = { userId: "   " };
    const result = await hook(context, "test");

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Invalid user ID format");
  });
});

describe("createSessionValidationHook()", () => {
  it("should validate session ID presence", async () => {
    const hook = createSessionValidationHook();

    const validContext: AuthContext = { sessionId: "session1" };
    const invalidContext: AuthContext = {};

    const validResult = await hook(validContext, "test");
    const invalidResult = await hook(invalidContext, "test");

    expect(validResult.authenticated).toBe(true);
    expect(invalidResult.authenticated).toBe(false);
    expect(invalidResult.error).toBe("Session ID is required");
  });

  it("should reject empty session ID", async () => {
    const hook = createSessionValidationHook();

    const context: AuthContext = { sessionId: "   " };
    const result = await hook(context, "test");

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe("Invalid session ID format");
  });
});

describe("createRBACHook()", () => {
  it("should expand roles to permissions", async () => {
    const rolePermissions = new Map([
      ["admin", ["read", "write", "delete"]],
      ["user", ["read"]],
    ]);

    const hook = createRBACHook(rolePermissions);

    const context: AuthContext = { userId: "user1", roles: ["admin"] };
    const result = await hook(context, "test");

    expect(result.authenticated).toBe(true);
    expect(result.context?.permissions).toContain("read");
    expect(result.context?.permissions).toContain("write");
    expect(result.context?.permissions).toContain("delete");
  });

  it("should combine permissions from multiple roles", async () => {
    const rolePermissions = new Map([
      ["editor", ["edit"]],
      ["viewer", ["view"]],
    ]);

    const hook = createRBACHook(rolePermissions);

    const context: AuthContext = { userId: "user1", roles: ["editor", "viewer"] };
    const result = await hook(context, "test");

    expect(result.context?.permissions).toContain("edit");
    expect(result.context?.permissions).toContain("view");
  });

  it("should preserve existing permissions", async () => {
    const rolePermissions = new Map([["user", ["read"]]]);

    const hook = createRBACHook(rolePermissions);

    const context: AuthContext = {
      userId: "user1",
      roles: ["user"],
      permissions: ["special"],
    };
    const result = await hook(context, "test");

    expect(result.context?.permissions).toContain("special");
    expect(result.context?.permissions).toContain("read");
  });
});

describe("factory functions", () => {
  it("should create default auth manager with user ID validation", async () => {
    const manager = createDefaultAuthManager();

    const validContext: AuthContext = { userId: "user1" };
    const invalidContext: AuthContext = {};

    const validResult = await manager.authenticate(validContext, "test");
    const invalidResult = await manager.authenticate(invalidContext, "test");

    expect(validResult.authenticated).toBe(true);
    expect(invalidResult.authenticated).toBe(false);
  });

  it("should create strict auth manager requiring user and session", async () => {
    const manager = createStrictAuthManager();

    const validContext: AuthContext = { userId: "user1", sessionId: "session1" };
    const missingSession: AuthContext = { userId: "user1" };
    const missingUser: AuthContext = { sessionId: "session1" };

    const validResult = await manager.authenticate(validContext, "test");
    const missingSessionResult = await manager.authenticate(missingSession, "test");
    const missingUserResult = await manager.authenticate(missingUser, "test");

    expect(validResult.authenticated).toBe(true);
    expect(missingSessionResult.authenticated).toBe(false);
    expect(missingUserResult.authenticated).toBe(false);
  });
});
