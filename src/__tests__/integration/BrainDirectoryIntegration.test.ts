/**
 * Brain Directory Integration Tests
 *
 * Tests the integration of brain directory configuration with the cognitive
 * architecture components, focusing on configuration validation and path resolution.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MemorySystem } from "../../cognitive/MemorySystem.js";
import { ConfigManager } from "../../utils/config.js";

describe("Brain Directory Integration", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear brain directory related env vars
    delete process.env.COGNITIVE_BRAIN_DIR;
    delete process.env.HOME;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("ConfigManager integration", () => {
    it("should create correct memory file paths for different brain directories", () => {
      const testCases = [
        {
          home: "/Users/testuser",
          brainDir: "~/.brain",
          expected: "/Users/testuser/.brain/memory.json",
        },
        {
          home: "/home/user",
          brainDir: "~/custom-brain",
          expected: "/home/user/custom-brain/memory.json",
        },
        {
          home: "/Users/testuser",
          brainDir: "/absolute/brain/path",
          expected: "/absolute/brain/path/memory.json",
        },
        {
          home: "/Users/testuser",
          brainDir: "./relative-brain",
          expected: "relative-brain/memory.json",
        },
      ];

      for (const testCase of testCases) {
        process.env.HOME = testCase.home;
        process.env.COGNITIVE_BRAIN_DIR = testCase.brainDir;

        const configManager = new ConfigManager();
        const memoryFilePath = configManager.getMemoryFilePath();

        expect(memoryFilePath).toBe(testCase.expected);
      }
    });

    it("should handle domain-specific brain directories", () => {
      const domains = ["web-dev", "data-science", "mobile-dev"];
      process.env.HOME = "/Users/testuser";

      for (const domain of domains) {
        process.env.COGNITIVE_BRAIN_DIR = `~/.brain/${domain}`;

        const configManager = new ConfigManager();
        const memoryFilePath = configManager.getMemoryFilePath();

        expect(memoryFilePath).toBe(
          `/Users/testuser/.brain/${domain}/memory.json`
        );
      }
    });
  });

  describe("MemorySystem configuration integration", () => {
    it("should create memory system with brain directory configuration", async () => {
      process.env.HOME = "/tmp";
      process.env.COGNITIVE_BRAIN_DIR = "/tmp/test-brain";

      const configManager = new ConfigManager();
      const memoryFilePath = configManager.getMemoryFilePath();

      expect(memoryFilePath).toBe("/tmp/test-brain/memory.json");

      // Create memory system with memory provider (no file system operations)
      const memorySystem = new MemorySystem({
        persistence: {
          storage_type: "memory", // Use memory provider to avoid file system
        },
        persistence_enabled: true,
        auto_save_enabled: false,
        auto_recovery_enabled: false,
      });

      await memorySystem.initialize();

      // Verify memory system is initialized
      const status = memorySystem.getStatus();
      expect(status.initialized).toBe(true);

      // Verify persistence configuration
      const persistenceStatus = memorySystem.getPersistenceStatus();
      expect(persistenceStatus.enabled).toBe(true);
      expect(persistenceStatus.provider_type).toBe("memory");

      await memorySystem.shutdown();
    });

    it("should handle memory operations with different brain directories", async () => {
      const testConfigs = [
        { brainDir: "/tmp/brain1", domain: "test1" },
        { brainDir: "/tmp/brain2", domain: "test2" },
        { brainDir: "/tmp/brain3", domain: "test3" },
      ];

      const memorySystems: MemorySystem[] = [];

      try {
        for (const config of testConfigs) {
          process.env.COGNITIVE_BRAIN_DIR = config.brainDir;

          const configManager = new ConfigManager();
          const memoryFilePath = configManager.getMemoryFilePath();

          expect(memoryFilePath).toBe(`${config.brainDir}/memory.json`);

          const memorySystem = new MemorySystem({
            persistence: {
              storage_type: "memory",
            },
            persistence_enabled: true,
            auto_save_enabled: false,
            auto_recovery_enabled: false,
          });

          await memorySystem.initialize();
          memorySystems.push(memorySystem);

          // Store domain-specific memory
          const episode = {
            content: { text: `${config.domain} specific knowledge` },
            context: { session_id: "test", domain: config.domain },
            importance: 0.7,
            emotional_tags: [config.domain],
          };

          const result = await memorySystem.storeExperience(episode);
          expect(result.success).toBe(true);
        }

        // Verify each memory system has its own memories
        for (let i = 0; i < memorySystems.length; i++) {
          const memorySystem = memorySystems[i];
          const config = testConfigs[i];

          const retrievalResult = await memorySystem.retrieveMemories(
            config.domain,
            0.1
          );
          expect(retrievalResult.episodic_memories.length).toBeGreaterThan(0);

          // Verify it contains the domain-specific memory
          const hasDomainMemory = retrievalResult.episodic_memories.some(
            (memory) =>
              memory.content &&
              typeof memory.content === "object" &&
              "text" in memory.content &&
              (memory.content as any).text.includes(config.domain)
          );
          expect(hasDomainMemory).toBe(true);
        }
      } finally {
        // Clean up all memory systems
        for (const memorySystem of memorySystems) {
          await memorySystem.shutdown();
        }
      }
    });
  });

  describe("configuration validation", () => {
    it("should validate brain directory paths in memory system configuration", () => {
      const validConfigs = [
        "~/.brain",
        "/absolute/path/brain",
        "./relative/brain",
        "~/domain-specific/brain",
      ];

      for (const brainDir of validConfigs) {
        process.env.COGNITIVE_BRAIN_DIR = brainDir;

        const configManager = new ConfigManager();
        const config = configManager.getConfig();

        expect(config.brain_dir).toBe(brainDir);
        expect(typeof config.brain_dir).toBe("string");
        expect(config.brain_dir.length).toBeGreaterThan(0);
      }
    });

    it("should handle edge cases in brain directory configuration", () => {
      const edgeCases = [
        { env: "", expected: "~/.brain" }, // Empty falls back to default
        { env: "   ", expected: "~/.brain" }, // Whitespace falls back to default
      ];

      for (const testCase of edgeCases) {
        process.env.COGNITIVE_BRAIN_DIR = testCase.env;

        const configManager = new ConfigManager();
        const config = configManager.getConfig();

        expect(config.brain_dir).toBe(testCase.expected);
      }
    });
  });

  describe("cross-project scenarios", () => {
    it("should support different brain directories for different project types", () => {
      const projectTypes = [
        { type: "web", brainDir: "~/.brain/web-projects" },
        { type: "mobile", brainDir: "~/.brain/mobile-apps" },
        { type: "data", brainDir: "~/.brain/data-science" },
        { type: "ai", brainDir: "~/.brain/ai-research" },
      ];

      process.env.HOME = "/Users/developer";

      for (const project of projectTypes) {
        process.env.COGNITIVE_BRAIN_DIR = project.brainDir;

        const configManager = new ConfigManager();
        const memoryFilePath = configManager.getMemoryFilePath();

        const expectedPath = `/Users/developer/.brain/${
          project.type === "web"
            ? "web-projects"
            : project.type === "mobile"
            ? "mobile-apps"
            : project.type === "data"
            ? "data-science"
            : "ai-research"
        }/memory.json`;

        expect(memoryFilePath).toBe(expectedPath);
      }
    });

    it("should maintain configuration consistency across multiple instances", () => {
      process.env.HOME = "/Users/testuser";
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain/shared";

      // Create multiple config managers
      const configManager1 = new ConfigManager();
      const configManager2 = new ConfigManager();
      const configManager3 = new ConfigManager();

      // All should have the same configuration
      const config1 = configManager1.getConfig();
      const config2 = configManager2.getConfig();
      const config3 = configManager3.getConfig();

      expect(config1.brain_dir).toBe(config2.brain_dir);
      expect(config2.brain_dir).toBe(config3.brain_dir);
      expect(config1.brain_dir).toBe("~/.brain/shared");

      // All should generate the same memory file path
      const path1 = configManager1.getMemoryFilePath();
      const path2 = configManager2.getMemoryFilePath();
      const path3 = configManager3.getMemoryFilePath();

      expect(path1).toBe(path2);
      expect(path2).toBe(path3);
      expect(path1).toBe("/Users/testuser/.brain/shared/memory.json");
    });
  });

  describe("error handling and resilience", () => {
    it("should handle missing HOME environment variable gracefully", () => {
      delete process.env.HOME;
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain";

      const configManager = new ConfigManager();
      const brainPath = configManager.getBrainDirectoryPath();

      // Should handle missing HOME gracefully (results in /.brain)
      expect(brainPath).toBe("/.brain");

      const memoryFilePath = configManager.getMemoryFilePath();
      expect(memoryFilePath).toBe("/.brain/memory.json");
    });

    it("should handle unusual but valid brain directory paths", () => {
      const unusualPaths = [
        "/tmp/brain-with-hyphens",
        "/tmp/brain_with_underscores",
        "/tmp/brain.with.dots",
        "/tmp/brain@special#chars",
        "/tmp/very/deep/nested/brain/directory",
      ];

      for (const brainDir of unusualPaths) {
        process.env.COGNITIVE_BRAIN_DIR = brainDir;

        const configManager = new ConfigManager();
        const config = configManager.getConfig();

        expect(config.brain_dir).toBe(brainDir);

        const memoryFilePath = configManager.getMemoryFilePath();
        expect(memoryFilePath).toBe(`${brainDir}/memory.json`);
      }
    });

    it("should maintain configuration integrity under concurrent access", () => {
      process.env.HOME = "/Users/testuser";
      process.env.COGNITIVE_BRAIN_DIR = "~/.brain/concurrent-test";

      // Simulate concurrent access
      const configManagers = Array.from(
        { length: 10 },
        () => new ConfigManager()
      );

      // All should have consistent configuration
      const configs = configManagers.map((cm) => cm.getConfig());
      const memoryPaths = configManagers.map((cm) => cm.getMemoryFilePath());

      // Verify all configurations are identical
      for (let i = 1; i < configs.length; i++) {
        expect(configs[i].brain_dir).toBe(configs[0].brain_dir);
        expect(memoryPaths[i]).toBe(memoryPaths[0]);
      }

      expect(configs[0].brain_dir).toBe("~/.brain/concurrent-test");
      expect(memoryPaths[0]).toBe(
        "/Users/testuser/.brain/concurrent-test/memory.json"
      );
    });
  });
});
