/**
 * Tests for Health Checker
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { HealthChecker } from "../../../monitoring/health-checker.js";

describe("HealthChecker", () => {
  let checker: HealthChecker;

  beforeEach(() => {
    checker = new HealthChecker({ version: "1.0.0" });
  });

  describe("Health Check Registration", () => {
    it("should register a health check", () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 0,
      }));

      expect(checker.getCheckNames()).toContain("test");
    });

    it("should unregister a health check", () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 0,
      }));

      checker.unregisterCheck("test");
      expect(checker.getCheckNames()).not.toContain("test");
    });
  });

  describe("Running Health Checks", () => {
    it("should run a single health check", async () => {
      checker.registerCheck("database", async () => ({
        component: "database",
        status: "healthy",
        responseTimeMs: 0,
        details: { connections: 10 },
      }));

      const result = await checker.runCheck("database");
      expect(result.component).toBe("database");
      expect(result.status).toBe("healthy");
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.details).toEqual({ connections: 10 });
    });

    it("should return unhealthy for non-existent check", async () => {
      const result = await checker.runCheck("non_existent");
      expect(result.status).toBe("unhealthy");
      expect(result.error).toContain("not found");
    });

    it("should handle check errors gracefully", async () => {
      checker.registerCheck("failing", async () => {
        throw new Error("Check failed");
      });

      const result = await checker.runCheck("failing");
      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Check failed");
    });

    it("should run all health checks", async () => {
      checker.registerCheck("db", async () => ({
        component: "db",
        status: "healthy",
        responseTimeMs: 0,
      }));
      checker.registerCheck("cache", async () => ({
        component: "cache",
        status: "healthy",
        responseTimeMs: 0,
      }));

      const results = await checker.runAllChecks();
      expect(results.length).toBe(2);
      expect(results.map((r) => r.component)).toContain("db");
      expect(results.map((r) => r.component)).toContain("cache");
    });

    it("should track last successful check time", async () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 0,
      }));

      await checker.runCheck("test");
      const result = checker.getLastResult("test");
      expect(result?.lastSuccess).toBeDefined();
    });
  });

  describe("Health Report Generation", () => {
    it("should generate healthy report when all checks pass", async () => {
      checker.registerCheck("db", async () => ({
        component: "db",
        status: "healthy",
        responseTimeMs: 5,
      }));
      checker.registerCheck("cache", async () => ({
        component: "cache",
        status: "healthy",
        responseTimeMs: 2,
      }));

      const report = await checker.generateReport();
      expect(report.status).toBe("healthy");
      expect(report.components.length).toBe(2);
      expect(report.version).toBe("1.0.0");
      expect(report.uptimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should generate unhealthy report when any check fails", async () => {
      checker.registerCheck("db", async () => ({
        component: "db",
        status: "healthy",
        responseTimeMs: 5,
      }));
      checker.registerCheck("cache", async () => ({
        component: "cache",
        status: "unhealthy",
        responseTimeMs: 0,
        error: "Connection refused",
      }));

      const report = await checker.generateReport();
      expect(report.status).toBe("unhealthy");
    });

    it("should generate degraded report when checks are degraded", async () => {
      checker.registerCheck("db", async () => ({
        component: "db",
        status: "healthy",
        responseTimeMs: 5,
      }));
      checker.registerCheck("cache", async () => ({
        component: "cache",
        status: "degraded",
        responseTimeMs: 100,
      }));

      const report = await checker.generateReport();
      expect(report.status).toBe("degraded");
    });

    it("should include system metrics in report", async () => {
      const report = await checker.generateReport();
      expect(report.metrics).toBeDefined();
      expect(report.metrics.memoryUsed).toBeGreaterThan(0);
      expect(report.metrics.heapUsed).toBeGreaterThan(0);
    });
  });

  describe("Health Status Helpers", () => {
    it("should return true for isHealthy when all checks pass", async () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 0,
      }));

      expect(await checker.isHealthy()).toBe(true);
    });

    it("should return false for isHealthy when any check fails", async () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "unhealthy",
        responseTimeMs: 0,
      }));

      expect(await checker.isHealthy()).toBe(false);
    });

    it("should return true for isReady when healthy or degraded", async () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "degraded",
        responseTimeMs: 0,
      }));

      expect(await checker.isReady()).toBe(true);
    });

    it("should return false for isReady when unhealthy", async () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "unhealthy",
        responseTimeMs: 0,
      }));

      expect(await checker.isReady()).toBe(false);
    });
  });

  describe("Static Health Check Factories", () => {
    it("should create database health check", async () => {
      const check = HealthChecker.createDatabaseCheck(async () => true, "postgres");
      const result = await check();

      expect(result.component).toBe("postgres");
      expect(result.status).toBe("healthy");
    });

    it("should handle database check failure", async () => {
      const check = HealthChecker.createDatabaseCheck(async () => {
        throw new Error("Connection failed");
      });
      const result = await check();

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Connection failed");
    });

    it("should create memory health check", async () => {
      const check = HealthChecker.createMemoryCheck(90, "memory");
      const result = await check();

      expect(result.component).toBe("memory");
      expect(["healthy", "degraded", "unhealthy"]).toContain(result.status);
      expect(result.details).toHaveProperty("heapUsed");
      expect(result.details).toHaveProperty("heapTotal");
    });

    it("should create timeout health check", async () => {
      const check = HealthChecker.createTimeoutCheck(async () => true, 1000, "slow-service");
      const result = await check();

      expect(result.component).toBe("slow-service");
      expect(result.status).toBe("healthy");
    });

    it("should handle timeout in health check", async () => {
      const check = HealthChecker.createTimeoutCheck(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return true;
        },
        10, // Very short timeout
        "slow-service"
      );
      const result = await check();

      expect(result.status).toBe("unhealthy");
      expect(result.error).toContain("timeout");
    });
  });

  describe("Uptime Tracking", () => {
    it("should track uptime", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(checker.getUptimeMs()).toBeGreaterThan(0);
    });
  });

  describe("Last Results", () => {
    it("should store last result for each check", async () => {
      checker.registerCheck("test", async () => ({
        component: "test",
        status: "healthy",
        responseTimeMs: 5,
      }));

      await checker.runCheck("test");
      const lastResult = checker.getLastResult("test");

      expect(lastResult).toBeDefined();
      expect(lastResult!.status).toBe("healthy");
    });

    it("should get all last results", async () => {
      checker.registerCheck("db", async () => ({
        component: "db",
        status: "healthy",
        responseTimeMs: 0,
      }));
      checker.registerCheck("cache", async () => ({
        component: "cache",
        status: "healthy",
        responseTimeMs: 0,
      }));

      await checker.runAllChecks();
      const allResults = checker.getAllLastResults();

      expect(allResults.size).toBe(2);
    });
  });
});
