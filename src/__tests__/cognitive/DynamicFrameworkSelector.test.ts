/**
 * Tests for DynamicFrameworkSelector
 */

import { beforeEach, describe, expect, it } from "vitest";
import { DynamicFrameworkSelector } from "../../cognitive/DynamicFrameworkSelector.js";
import {
  Problem,
  ProblemCharacteristics,
} from "../../interfaces/systematic-thinking.js";

describe("DynamicFrameworkSelector", () => {
  let selector: DynamicFrameworkSelector;

  beforeEach(() => {
    selector = new DynamicFrameworkSelector();
  });

  describe("framework selection", () => {
    it("should select scientific method for evidence-based problems", async () => {
      const problem: Problem = {
        description:
          "Test hypothesis about user behavior with data analysis and experiments",
        domain: "science",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: [],
        stakeholders: ["researchers"],
        time_sensitivity: 0.3,
        resource_requirements: ["data", "analysis_tools"],
      };

      const recommendation = await selector.selectFramework(problem, { session_id: "test-session" });

      expect(recommendation.framework.type).toBe("scientific_method");
      expect(recommendation.confidence).toBeGreaterThan(0.5);
      expect(recommendation.reasoning).toContain("Scientific Method");
    });

    it("should select design thinking for creative problems", async () => {
      const problem: Problem = {
        description: "Create innovative user interface design for mobile app",
        domain: "design",
        complexity: 0.7,
        uncertainty: 0.8,
        constraints: [],
        stakeholders: ["users", "designers"],
        time_sensitivity: 0.5,
        resource_requirements: ["creative_resources"],
      };

      const recommendation = await selector.selectFramework(problem, { session_id: "test-session" });

      expect(recommendation.framework.type).toBe("design_thinking");
      expect(recommendation.confidence).toBeGreaterThan(0.5);
    });

    it("should select systems thinking for complex system problems", async () => {
      const problem: Problem = {
        description:
          "Optimize interconnected network of microservices with complex relationships",
        domain: "technology",
        complexity: 0.9,
        uncertainty: 0.6,
        constraints: [],
        stakeholders: ["developers", "operations"],
        time_sensitivity: 0.4,
        resource_requirements: ["system_resources"],
      };

      const recommendation = await selector.selectFramework(problem, { session_id: "test-session" });

      expect(recommendation.framework.type).toBe("systems_thinking");
      expect(recommendation.confidence).toBeGreaterThan(0.5);
    });

    it("should select root cause analysis for problem-solving", async () => {
      const problem: Problem = {
        description: "Fix recurring system failures and prevent future issues",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.5,
        constraints: [],
        stakeholders: ["engineers"],
        time_sensitivity: 0.8,
        resource_requirements: ["technical_resources"],
      };

      const recommendation = await selector.selectFramework(problem, { session_id: "test-session" });

      expect(recommendation.framework.type).toBe("root_cause_analysis");
      expect(recommendation.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("problem characteristics analysis", () => {
    it("should identify well-defined problems", () => {
      const problem: Problem = {
        description:
          "Implement specific user authentication requirements with clear criteria",
        domain: "technology",
        complexity: 0.5,
        uncertainty: 0.3,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const characteristics = selector.analyzeProblemCharacteristics(problem);

      expect(characteristics.is_well_defined).toBe(true);
    });

    it("should identify creative problems", () => {
      const problem: Problem = {
        description:
          "Design innovative and creative solution for user engagement",
        domain: "design",
        complexity: 0.6,
        uncertainty: 0.7,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const characteristics = selector.analyzeProblemCharacteristics(problem);

      expect(characteristics.requires_creativity).toBe(true);
    });

    it("should identify systems problems", () => {
      const problem: Problem = {
        description:
          "Optimize complex interconnected system with multiple stakeholders",
        domain: "technology",
        complexity: 0.8,
        uncertainty: 0.6,
        constraints: [],
        stakeholders: ["multiple", "stakeholders"],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const characteristics = selector.analyzeProblemCharacteristics(problem);

      expect(characteristics.involves_systems).toBe(true);
    });

    it("should identify evidence-based problems", () => {
      const problem: Problem = {
        description:
          "Analyze data and research to validate hypothesis with evidence",
        domain: "science",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const characteristics = selector.analyzeProblemCharacteristics(problem);

      expect(characteristics.needs_evidence).toBe(true);
    });

    it("should identify causal problems", () => {
      const problem: Problem = {
        description: "Understand what causes system failures and their effects",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.5,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const characteristics = selector.analyzeProblemCharacteristics(problem);

      expect(characteristics.has_causal_elements).toBe(true);
    });

    it("should identify scenario-based problems", () => {
      const problem: Problem = {
        description: "Plan for future scenarios and predict potential outcomes",
        domain: "business",
        complexity: 0.7,
        uncertainty: 0.8,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const characteristics = selector.analyzeProblemCharacteristics(problem);

      expect(characteristics.involves_scenarios).toBe(true);
    });

    it("should identify root cause problems", () => {
      const problem: Problem = {
        description: "Fix the underlying problem and prevent recurrence",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.5,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const characteristics = selector.analyzeProblemCharacteristics(problem);

      expect(characteristics.requires_root_cause).toBe(true);
    });
  });

  describe("framework evaluation", () => {
    it("should score frameworks appropriately", () => {
      const characteristics: ProblemCharacteristics = {
        is_well_defined: true,
        has_multiple_solutions: false,
        requires_creativity: false,
        involves_systems: false,
        needs_evidence: true,
        has_causal_elements: true,
        involves_scenarios: false,
        requires_root_cause: false,
      };

      const frameworks = selector.getAvailableFrameworks?.() || [];
      const scientificFramework = frameworks.find(
        (f) => f.type === "scientific_method"
      );
      const designFramework = frameworks.find(
        (f) => f.type === "design_thinking"
      );

      if (scientificFramework && designFramework) {
        const scientificScore = selector.evaluateFrameworkFit(
          scientificFramework,
          characteristics
        );
        const designScore = selector.evaluateFrameworkFit(
          designFramework,
          characteristics
        );

        expect(scientificScore).toBeGreaterThan(designScore);
      }
    });

    it("should return scores between 0 and 1", () => {
      const characteristics: ProblemCharacteristics = {
        is_well_defined: true,
        has_multiple_solutions: true,
        requires_creativity: true,
        involves_systems: true,
        needs_evidence: true,
        has_causal_elements: true,
        involves_scenarios: true,
        requires_root_cause: true,
      };

      const frameworks = selector.getAvailableFrameworks?.() || [];

      frameworks.forEach((framework) => {
        const score = selector.evaluateFrameworkFit(framework, characteristics);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("hybrid framework creation", () => {
    it("should create hybrid framework", () => {
      const frameworks = selector.getAvailableFrameworks?.() || [];
      const primary = frameworks.find((f) => f.type === "design_thinking");
      const supporting = frameworks
        .filter((f) => f.type !== "design_thinking")
        .slice(0, 2);

      if (primary && supporting.length > 0) {
        const hybrid = selector.createHybridFramework(primary, supporting);

        expect(hybrid.name).toContain("Hybrid");
        expect(hybrid.steps.length).toBeGreaterThan(primary.steps.length);
        expect(hybrid.strengths).toContain("Combines multiple perspectives");
      }
    });
  });

  describe("available frameworks", () => {
    it("should return all expected frameworks", () => {
      const frameworks = selector.getAvailableFrameworks?.() || [];

      expect(frameworks.length).toBeGreaterThan(0);

      const frameworkTypes = frameworks.map((f) => f.type);
      const expectedTypes = [
        "scientific_method",
        "design_thinking",
        "systems_thinking",
        "critical_thinking",
        "creative_problem_solving",
        "root_cause_analysis",
        "first_principles",
        "scenario_planning",
      ];

      expectedTypes.forEach((type) => {
        expect(frameworkTypes).toContain(type);
      });
    });

    it("should have valid framework structures", () => {
      const frameworks = selector.getAvailableFrameworks?.() || [];

      frameworks.forEach((framework) => {
        expect(framework.type).toBeDefined();
        expect(framework.name).toBeDefined();
        expect(framework.description).toBeDefined();
        expect(framework.steps).toBeDefined();
        expect(framework.steps.length).toBeGreaterThan(0);
        expect(framework.applicability_score).toBeGreaterThan(0);
        expect(framework.strengths).toBeDefined();
        expect(framework.limitations).toBeDefined();

        framework.steps.forEach((step) => {
          expect(step.name).toBeDefined();
          expect(step.description).toBeDefined();
          expect(step.inputs).toBeDefined();
          expect(step.outputs).toBeDefined();
          expect(step.methods).toBeDefined();
        });
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty problem description", async () => {
      const problem: Problem = {
        description: "",
        domain: "general",
        complexity: 0.5,
        uncertainty: 0.5,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const recommendation = await selector.selectFramework(problem, { session_id: "test-session" });

      expect(recommendation).toBeDefined();
      expect(recommendation.framework).toBeDefined();
      expect(recommendation.confidence).toBeGreaterThan(0);
    });

    it("should handle problems with all characteristics", async () => {
      const problem: Problem = {
        description:
          "Complex creative innovative system design with evidence research scenarios causes",
        domain: "technology",
        complexity: 0.9,
        uncertainty: 0.9,
        constraints: ["time", "budget"],
        stakeholders: ["users", "developers", "managers"],
        time_sensitivity: 0.9,
        resource_requirements: ["all_resources"],
      };

      const recommendation = await selector.selectFramework(problem, { session_id: "test-session" });

      expect(recommendation).toBeDefined();
      expect(recommendation.alternative_frameworks.length).toBeGreaterThan(0);
    });
  });
});
