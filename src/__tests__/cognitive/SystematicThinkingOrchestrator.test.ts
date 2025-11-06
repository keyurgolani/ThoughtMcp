/**
 * Tests for SystematicThinkingOrchestrator
 */

import { beforeEach, describe, expect, it } from "vitest";
import { SystematicThinkingOrchestrator } from "../../cognitive/SystematicThinkingOrchestrator.js";
import { SystematicThinkingMode } from "../../interfaces/systematic-thinking.js";

describe("SystematicThinkingOrchestrator", () => {
  let orchestrator: SystematicThinkingOrchestrator;

  beforeEach(async () => {
    orchestrator = new SystematicThinkingOrchestrator();
    await orchestrator.initialize();
  });

  describe("initialization", () => {
    it("should initialize successfully", async () => {
      const newOrchestrator = new SystematicThinkingOrchestrator();
      await expect(newOrchestrator.initialize()).resolves.not.toThrow();
    });

    it("should handle multiple initialization calls", async () => {
      await expect(orchestrator.initialize()).resolves.not.toThrow();
      await expect(orchestrator.initialize()).resolves.not.toThrow();
    });
  });

  describe("analyzeSystematically", () => {
    it("should analyze a simple problem", async () => {
      const input = "How can I improve my software development process?";
      const result = await orchestrator.analyzeSystematically(input, "auto");

      expect(result).toBeDefined();
      expect(result.problem_structure).toBeDefined();
      expect(result.recommended_framework).toBeDefined();
      expect(result.analysis_steps).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeGreaterThan(0);
      expect(result.alternative_approaches).toBeDefined();
    });

    it("should handle different thinking modes", async () => {
      const input = "Design a user authentication system";
      const modes: SystematicThinkingMode[] = ["auto", "hybrid", "manual"];

      for (const mode of modes) {
        const result = await orchestrator.analyzeSystematically(input, mode);
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it("should analyze complex technical problems", async () => {
      const input =
        "Build a scalable microservices architecture for an e-commerce platform with high availability requirements";
      const result = await orchestrator.analyzeSystematically(input, "auto");

      expect(result.problem_structure.main_problem.complexity).toBeGreaterThan(
        0.5
      );
      expect(result.problem_structure.sub_problems.length).toBeGreaterThan(0);
      expect(result.analysis_steps.length).toBeGreaterThan(0);
    });

    it("should handle business problems", async () => {
      const input = "Increase customer retention and reduce churn rate";
      const result = await orchestrator.analyzeSystematically(input, "auto");

      expect(result.problem_structure.main_problem.domain).toBe("business");
      expect(result.recommended_framework).toBeDefined();
      expect(result.alternative_approaches.length).toBeGreaterThan(0);
    });

    it("should provide context-aware analysis", async () => {
      const input = "Solve performance issues";
      const context = {
        domain: "technology",
        urgency: 0.8,
        complexity: 0.7,
        session_id: "test-session",
      };

      const result = await orchestrator.analyzeSystematically(
        input,
        "auto",
        context
      );

      expect(result.problem_structure.main_problem.domain).toBe("technology");
      expect(
        result.problem_structure.main_problem.time_sensitivity
      ).toBeGreaterThan(0.5);
    });
  });

  describe("getAvailableFrameworks", () => {
    it("should return available frameworks", () => {
      const frameworks = orchestrator.getAvailableFrameworks();
      expect(frameworks).toBeDefined();
      expect(frameworks.length).toBeGreaterThan(0);

      // Check for expected framework types
      const frameworkTypes = frameworks.map((f) => f.type);
      expect(frameworkTypes).toContain("scientific_method");
      expect(frameworkTypes).toContain("design_thinking");
      expect(frameworkTypes).toContain("systems_thinking");
    });
  });

  describe("validateFramework", () => {
    it("should validate correct framework structure", () => {
      const validFramework = {
        type: "scientific_method" as const,
        name: "Scientific Method",
        description: "Test framework",
        steps: [
          {
            name: "Test Step",
            description: "Test description",
            inputs: ["input1"],
            outputs: ["output1"],
            methods: ["method1"],
          },
        ],
        applicability_score: 0.8,
        strengths: ["strength1"],
        limitations: ["limitation1"],
      };

      expect(orchestrator.validateFramework(validFramework)).toBe(true);
    });

    it("should reject invalid framework structure", () => {
      const invalidFramework = {
        type: "scientific_method" as const,
        name: "Scientific Method",
        description: "Test framework",
        steps: [], // Empty steps should be invalid
        applicability_score: 0.8,
        strengths: ["strength1"],
        limitations: ["limitation1"],
      };

      expect(orchestrator.validateFramework(invalidFramework)).toBe(false);
    });
  });

  describe("problem parsing", () => {
    it("should estimate complexity correctly", async () => {
      const simpleInput = "Fix a bug";
      const complexInput =
        "Design a complex distributed system with multiple interconnected components, various stakeholders, and uncertain requirements";

      const simpleResult = await orchestrator.analyzeSystematically(
        simpleInput,
        "auto"
      );
      const complexResult = await orchestrator.analyzeSystematically(
        complexInput,
        "auto"
      );

      expect(
        complexResult.problem_structure.main_problem.complexity
      ).toBeGreaterThan(simpleResult.problem_structure.main_problem.complexity);
    });

    it("should identify domain correctly", async () => {
      const techInput = "Optimize database performance";
      const businessInput = "Increase market share and revenue";

      const techResult = await orchestrator.analyzeSystematically(
        techInput,
        "auto"
      );
      const businessResult = await orchestrator.analyzeSystematically(
        businessInput,
        "auto"
      );

      expect(techResult.problem_structure.main_problem.domain).toBe(
        "technology"
      );
      expect(businessResult.problem_structure.main_problem.domain).toBe(
        "business"
      );
    });

    it("should detect constraints", async () => {
      const constrainedInput =
        "Build a system quickly with limited budget and tight deadline";
      const result = await orchestrator.analyzeSystematically(
        constrainedInput,
        "auto"
      );

      const constraints = result.problem_structure.main_problem.constraints;
      expect(constraints).toContain("time_constraint");
      expect(constraints).toContain("budget_constraint");
    });
  });

  describe("error handling", () => {
    it("should handle empty input gracefully", async () => {
      await expect(
        orchestrator.analyzeSystematically("", "auto")
      ).resolves.toBeDefined();
    });

    it("should handle invalid mode gracefully", async () => {
      const input = "Test problem";
      await expect(
        orchestrator.analyzeSystematically(input, "invalid_mode" as any)
      ).resolves.toBeDefined();
    });
  });

  describe("performance", () => {
    it("should complete analysis within reasonable time", async () => {
      const input = "Optimize system performance";
      const startTime = Date.now();

      const result = await orchestrator.analyzeSystematically(input, "auto");
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
      expect(result.processing_time_ms).toBeLessThan(10000);
    });

    it("should handle concurrent analyses", async () => {
      const inputs = [
        "Problem 1: Design a system",
        "Problem 2: Optimize performance",
        "Problem 3: Improve user experience",
      ];

      const promises = inputs.map((input) =>
        orchestrator.analyzeSystematically(input, "auto")
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });
});
