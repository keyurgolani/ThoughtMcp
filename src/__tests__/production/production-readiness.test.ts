/**
 * Production Readiness Tests
 *
 * Essential production readiness checks for deployment validation.
 * Focuses on core system health, error handling, and security.
 *
 * Requirements: All requirements
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DatabaseConnectionManager } from "../../database/connection-manager";
import { ErrorTracker } from "../../monitoring/error-tracker";
import { HealthChecker } from "../../monitoring/health-checker";
import { CognitiveError, DatabaseError, ErrorCodes, ValidationError } from "../../utils/errors";

describe("Production Readiness Tests", () => {
  let dbManager: DatabaseConnectionManager;

  beforeAll(async () => {
    dbManager = new DatabaseConnectionManager({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "thoughtmcp_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      poolSize: 20,
      connectionTimeout: 5000,
      idleTimeout: 30000,
    });

    await dbManager.connect();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  describe("Core System Health", () => {
    it("should verify database connectivity", async () => {
      const isHealthy = await dbManager.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it("should validate database connection pool", async () => {
      const stats = dbManager.getPoolStats();
      expect(stats).toBeDefined();
      expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
    });

    it("should perform health checks correctly", async () => {
      const healthChecker = new HealthChecker({ version: "0.5.0" });

      healthChecker.registerCheck("database", async () => ({
        component: "database",
        status: "healthy",
        responseTimeMs: 0,
      }));

      const report = await healthChecker.generateReport();
      expect(report.status).toBe("healthy");
      expect(report.version).toBe("0.5.0");
    });

    it("should detect unhealthy components", async () => {
      const healthChecker = new HealthChecker();

      healthChecker.registerCheck("failing-component", async () => ({
        component: "failing-component",
        status: "unhealthy",
        responseTimeMs: 0,
        error: "Component is down",
      }));

      const report = await healthChecker.generateReport();
      expect(report.status).toBe("unhealthy");
    });
  });

  describe("Error Handling", () => {
    it("should track errors correctly", () => {
      const tracker = new ErrorTracker({ maxErrors: 100 });

      const testError = new CognitiveError("Test error", ErrorCodes.UNKNOWN_ERROR, {
        component: "test",
      });

      tracker.trackError(testError, {
        component: "test-component",
        operation: "test-operation",
      });

      const summary = tracker.exportSummary();
      expect(summary.totalErrorCount).toBe(1);
      expect(summary.errorsByComponent["test-component"]).toBe(1);
    });

    it("should handle validation errors correctly", () => {
      const validationError = new ValidationError("Invalid input", "content", null, "required");
      expect(validationError.field).toBe("content");
      expect(validationError.constraint).toBe("required");
    });

    it("should handle database errors correctly", () => {
      const dbError = new DatabaseError(
        "Query failed",
        ErrorCodes.DB_QUERY_FAILED,
        {},
        true,
        "SELECT * FROM test",
        ["param1"]
      );

      expect(dbError.query).toBe("SELECT * FROM test");
      expect(dbError.recoverable).toBe(true);
    });

    it("should handle transaction rollback correctly", async () => {
      const client = await dbManager.beginTransaction();

      try {
        await client.query(
          `INSERT INTO memories (id, user_id, session_id, content, primary_sector, strength, salience, importance, decay_rate)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            "prod-test-rollback",
            "prod-test-user",
            "prod-test-session",
            "Rollback test memory",
            "semantic",
            1.0,
            0.5,
            0.5,
            0.1,
          ]
        );

        await dbManager.rollbackTransaction(client);

        const result = await dbManager.getConnection();
        try {
          const check = await result.query("SELECT * FROM memories WHERE id = $1", [
            "prod-test-rollback",
          ]);
          expect(check.rows.length).toBe(0);
        } finally {
          dbManager.releaseConnection(result);
        }
      } catch {
        await dbManager.rollbackTransaction(client);
        throw new Error("Transaction test failed");
      }
    });
  });

  describe("Security Validation", () => {
    it("should not expose sensitive information in errors", () => {
      const dbError = new DatabaseError(
        "Query failed",
        "DB_QUERY_FAILED",
        {},
        true,
        "SELECT * FROM users WHERE password = $1",
        ["secret123"]
      );

      expect(dbError.message).not.toContain("secret123");
    });

    it("should handle SQL injection attempts safely", async () => {
      const maliciousInput = "'; DROP TABLE memories; --";

      const client = await dbManager.getConnection();
      try {
        const result = await client.query("SELECT $1::text as input", [maliciousInput]);
        expect(result.rows[0].input).toBe(maliciousInput);
      } finally {
        dbManager.releaseConnection(client);
      }
    });

    it("should validate input parameters", () => {
      const validationError = new ValidationError(
        "Invalid input",
        "userId",
        "<script>alert('xss')</script>",
        "alphanumeric"
      );

      expect(validationError.field).toBe("userId");
      expect(validationError.constraint).toBe("alphanumeric");
    });
  });
});
