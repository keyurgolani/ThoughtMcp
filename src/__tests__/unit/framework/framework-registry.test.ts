/**
 * Framework Registry Tests
 *
 * Tests for the FrameworkRegistry singleton that manages all available
 * systematic thinking frameworks.
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { ThinkingFramework } from "../../../framework/types.js";

describe("FrameworkRegistry", () => {
  let FrameworkRegistry: any;

  beforeEach(async () => {
    // Dynamic import to get fresh instance for each test
    const module = await import("../../../framework/framework-registry.js");
    FrameworkRegistry = module.FrameworkRegistry;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", async () => {
      const instance1 = FrameworkRegistry.getInstance();
      const instance2 = FrameworkRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should have private constructor (compile-time check)", () => {
      // TypeScript enforces private constructor at compile time
      // At runtime, we can only verify the singleton pattern works
      const instance = FrameworkRegistry.getInstance();
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(FrameworkRegistry);
    });
  });

  describe("Framework Registration", () => {
    it("should have all 5 frameworks registered", () => {
      const registry = FrameworkRegistry.getInstance();
      const frameworks = registry.getAllFrameworks();

      expect(frameworks).toHaveLength(5);
    });

    it("should register Scientific Method framework", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("scientific-method");

      expect(framework).toBeDefined();
      expect(framework.id).toBe("scientific-method");
      expect(framework.name).toBe("Scientific Method");
    });

    it("should register Design Thinking framework", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("design-thinking");

      expect(framework).toBeDefined();
      expect(framework.id).toBe("design-thinking");
      expect(framework.name).toBe("Design Thinking");
    });

    it("should register Systems Thinking framework", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("systems-thinking");

      expect(framework).toBeDefined();
      expect(framework.id).toBe("systems-thinking");
      expect(framework.name).toBe("Systems Thinking");
    });

    it("should register Critical Thinking framework", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("critical-thinking");

      expect(framework).toBeDefined();
      expect(framework.id).toBe("critical-thinking");
      expect(framework.name).toBe("Critical Thinking");
    });

    it("should register Root Cause Analysis framework", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("root-cause-analysis");

      expect(framework).toBeDefined();
      expect(framework.id).toBe("root-cause-analysis");
      expect(framework.name).toBe("Root Cause Analysis");
    });
  });

  describe("Framework Lookup", () => {
    it("should return framework by id", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("scientific-method");

      expect(framework).toBeDefined();
      expect(framework.id).toBe("scientific-method");
    });

    it("should return undefined for non-existent framework", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("non-existent");

      expect(framework).toBeUndefined();
    });

    it("should handle empty string id", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework("");

      expect(framework).toBeUndefined();
    });
  });

  describe("Framework Metadata", () => {
    it("should return all framework IDs", () => {
      const registry = FrameworkRegistry.getInstance();
      const ids = registry.getFrameworkIds();

      expect(ids).toHaveLength(5);
      expect(ids).toContain("scientific-method");
      expect(ids).toContain("design-thinking");
      expect(ids).toContain("systems-thinking");
      expect(ids).toContain("critical-thinking");
      expect(ids).toContain("root-cause-analysis");
    });

    it("should return framework metadata", () => {
      const registry = FrameworkRegistry.getInstance();
      const metadata = registry.getFrameworkMetadata("scientific-method");

      expect(metadata).toBeDefined();
      expect(metadata.id).toBe("scientific-method");
      expect(metadata.name).toBe("Scientific Method");
      expect(metadata.description).toBeDefined();
      expect(metadata.description.length).toBeGreaterThan(20);
    });

    it("should return undefined metadata for non-existent framework", () => {
      const registry = FrameworkRegistry.getInstance();
      const metadata = registry.getFrameworkMetadata("non-existent");

      expect(metadata).toBeUndefined();
    });

    it("should return all frameworks metadata", () => {
      const registry = FrameworkRegistry.getInstance();
      const allMetadata = registry.getAllFrameworksMetadata();

      expect(allMetadata).toHaveLength(5);
      allMetadata.forEach((metadata: any) => {
        expect(metadata.id).toBeDefined();
        expect(metadata.name).toBeDefined();
        expect(metadata.description).toBeDefined();
      });
    });
  });

  describe("Framework Validation", () => {
    it("should validate that all frameworks have required properties", () => {
      const registry = FrameworkRegistry.getInstance();
      const frameworks = registry.getAllFrameworks();

      frameworks.forEach((framework: ThinkingFramework) => {
        expect(framework.id).toBeDefined();
        expect(framework.name).toBeDefined();
        expect(framework.description).toBeDefined();
        expect(framework.steps).toBeDefined();
        expect(framework.steps.length).toBeGreaterThan(0);
        expect(framework.bestSuitedFor).toBeDefined();
      });
    });

    it("should validate that all framework IDs are unique", () => {
      const registry = FrameworkRegistry.getInstance();
      const frameworks = registry.getAllFrameworks();
      const ids = frameworks.map((f: ThinkingFramework) => f.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should validate that all frameworks have execute method", () => {
      const registry = FrameworkRegistry.getInstance();
      const frameworks = registry.getAllFrameworks();

      frameworks.forEach((framework: ThinkingFramework) => {
        expect(typeof framework.execute).toBe("function");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle null id gracefully", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework(null as any);

      expect(framework).toBeUndefined();
    });

    it("should handle undefined id gracefully", () => {
      const registry = FrameworkRegistry.getInstance();
      const framework = registry.getFramework(undefined as any);

      expect(framework).toBeUndefined();
    });
  });
});
