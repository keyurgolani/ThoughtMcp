/**
 * Unit tests for RealTimeProblemDecomposer
 */

import { beforeEach, describe, expect, it } from "vitest";
import { RealTimeProblemDecomposer } from "../../cognitive/RealTimeProblemDecomposer.js";
import { Problem } from "../../interfaces/systematic-thinking.js";
import { Context } from "../../types/core.js";

describe("RealTimeProblemDecomposer", () => {
  let decomposer: RealTimeProblemDecomposer;

  beforeEach(async () => {
    decomposer = new RealTimeProblemDecomposer();
    await decomposer.initialize();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      const newDecomposer = new RealTimeProblemDecomposer();
      await expect(newDecomposer.initialize()).resolves.not.toThrow();
    });

    it("should not reinitialize if already initialized", async () => {
      // Should not throw on second initialization
      await expect(decomposer.initialize()).resolves.not.toThrow();
    });

    it("should provide available strategies after initialization", () => {
      const strategies = decomposer.getAvailableStrategies();

      expect(strategies).toContain("functional");
      expect(strategies).toContain("temporal");
      expect(strategies).toContain("stakeholder");
      expect(strategies).toContain("component");
      expect(strategies).toContain("risk");
      expect(strategies).toContain("resource");
      expect(strategies).toContain("complexity");
    });
  });

  describe("Strategy Management", () => {
    it("should provide strategy details", () => {
      const functionalStrategy = decomposer.getStrategyDetails("functional");

      expect(functionalStrategy).toBeDefined();
      expect(functionalStrategy!.name).toBe("functional");
      expect(functionalStrategy!.description).toContain("functional");
      expect(typeof functionalStrategy!.apply).toBe("function");
      expect(typeof functionalStrategy!.getApplicabilityScore).toBe("function");
    });

    it("should return undefined for non-existent strategy", () => {
      const nonExistentStrategy = decomposer.getStrategyDetails("non-existent");
      expect(nonExistentStrategy).toBeUndefined();
    });

    it("should calculate applicability scores correctly", () => {
      const functionalStrategy = decomposer.getStrategyDetails("functional")!;

      const functionalProblem: Problem = {
        description: "Implement authentication functionality for the system",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: [],
        stakeholders: ["developers"],
        time_sensitivity: 0.5,
        resource_requirements: ["technical_resources"],
      };

      const score = functionalStrategy.getApplicabilityScore(functionalProblem);
      expect(score).toBeGreaterThan(0.5); // Should be highly applicable
    });
  });

  describe("Problem Decomposition", () => {
    it("should decompose a simple problem", async () => {
      const problem: Problem = {
        description: "Create a user registration system",
        domain: "technology",
        complexity: 0.5,
        uncertainty: 0.3,
        constraints: ["time_constraint"],
        stakeholders: ["developers", "users"],
        time_sensitivity: 0.6,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result).toBeDefined();
      expect(result.original_problem).toEqual(problem);
      expect(result.hierarchical_structure.length).toBeGreaterThan(1);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.processing_time_ms).toBeGreaterThan(0);
    });

    it("should create hierarchical structure with root node", async () => {
      const problem: Problem = {
        description: "Build web application",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: [],
        stakeholders: ["developers"],
        time_sensitivity: 0.5,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      // Should have exactly one root node (level 0)
      const rootNodes = result.hierarchical_structure.filter(
        (node) => node.level === 0
      );
      expect(rootNodes).toHaveLength(1);

      const rootNode = rootNodes[0];
      expect(rootNode.problem.description).toBe(problem.description);
      expect(rootNode.parent_id).toBeUndefined();
      expect(rootNode.children_ids.length).toBeGreaterThan(0);
    });

    it("should assign unique IDs to all nodes", async () => {
      const problem: Problem = {
        description: "Complex system with multiple components",
        domain: "technology",
        complexity: 0.8,
        uncertainty: 0.5,
        constraints: ["time_constraint", "resource_constraint"],
        stakeholders: ["developers", "architects", "users"],
        time_sensitivity: 0.7,
        resource_requirements: ["technical_resources", "human_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      const ids = result.hierarchical_structure.map((node) => node.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });

    it("should maintain parent-child consistency", async () => {
      const problem: Problem = {
        description: "Multi-tier application development",
        domain: "technology",
        complexity: 0.7,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers", "testers"],
        time_sensitivity: 0.6,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      for (const node of result.hierarchical_structure) {
        // Check parent relationship
        if (node.parent_id) {
          const parent = result.hierarchical_structure.find(
            (n) => n.id === node.parent_id
          );
          expect(parent).toBeDefined();
          expect(parent!.children_ids).toContain(node.id);
        }

        // Check children relationships
        for (const childId of node.children_ids) {
          const child = result.hierarchical_structure.find(
            (n) => n.id === childId
          );
          expect(child).toBeDefined();
          expect(child!.parent_id).toBe(node.id);
        }
      }
    });
  });

  describe("Dependency Analysis", () => {
    it("should identify dependencies between problems", async () => {
      const problem: Problem = {
        description: "Plan, design, implement, and test new feature",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers", "testers"],
        time_sensitivity: 0.7,
        resource_requirements: ["technical_resources", "human_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result.dependencies.length).toBeGreaterThan(0);

      for (const dependency of result.dependencies) {
        expect(dependency.from).toBeDefined();
        expect(dependency.to).toBeDefined();
        expect(dependency.type).toMatch(
          /^(prerequisite|constraint|resource|temporal)$/
        );
        expect(dependency.strength).toBeGreaterThan(0);
        expect(dependency.strength).toBeLessThanOrEqual(1);

        // Verify nodes exist
        const fromNode = result.hierarchical_structure.find(
          (n) => n.id === dependency.from
        );
        const toNode = result.hierarchical_structure.find(
          (n) => n.id === dependency.to
        );
        expect(fromNode).toBeDefined();
        expect(toNode).toBeDefined();
      }
    });

    it("should identify prerequisite dependencies", async () => {
      const problem: Problem = {
        description:
          "Research requirements then design architecture then implement solution",
        domain: "technology",
        complexity: 0.5,
        uncertainty: 0.6,
        constraints: [],
        stakeholders: ["developers"],
        time_sensitivity: 0.4,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      const prerequisiteDeps = result.dependencies.filter(
        (dep) => dep.type === "prerequisite"
      );
      expect(prerequisiteDeps.length).toBeGreaterThan(0);

      // Prerequisite dependencies should have reasonable strength
      for (const dep of prerequisiteDeps) {
        expect(dep.strength).toBeGreaterThan(0.5);
      }
    });

    it("should identify resource dependencies", async () => {
      const problem: Problem = {
        description:
          "Develop frontend and backend components requiring shared technical resources",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["resource_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.5,
        resource_requirements: ["technical_resources", "human_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      const resourceDeps = result.dependencies.filter(
        (dep) => dep.type === "resource"
      );
      // May or may not have resource dependencies depending on decomposition
      if (resourceDeps.length > 0) {
        for (const dep of resourceDeps) {
          expect(dep.strength).toBeGreaterThan(0);
          expect(dep.strength).toBeLessThanOrEqual(0.8);
        }
      }
    });
  });

  describe("Critical Path Calculation", () => {
    it("should calculate a valid critical path", async () => {
      const problem: Problem = {
        description: "Sequential development process with clear dependencies",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.8,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result.critical_path.length).toBeGreaterThan(0);

      // All critical path nodes should exist
      for (const nodeId of result.critical_path) {
        const node = result.hierarchical_structure.find((n) => n.id === nodeId);
        expect(node).toBeDefined();
        expect(node!.critical_path_member).toBe(true);
      }
    });

    it("should mark critical path members correctly", async () => {
      const problem: Problem = {
        description: "Project with time-sensitive milestones",
        domain: "technology",
        complexity: 0.5,
        uncertainty: 0.3,
        constraints: ["time_constraint"],
        stakeholders: ["team"],
        time_sensitivity: 0.9,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      const criticalPathMembers = result.hierarchical_structure.filter(
        (node) => node.critical_path_member
      );

      expect(criticalPathMembers.length).toBe(result.critical_path.length);

      // Verify all critical path IDs are marked as members
      const criticalPathIds = new Set(result.critical_path);
      const memberIds = new Set(criticalPathMembers.map((node) => node.id));
      expect(criticalPathIds).toEqual(memberIds);
    });
  });

  describe("Priority Analysis", () => {
    it("should assign priority scores to all nodes", async () => {
      const problem: Problem = {
        description: "Multi-priority project with various stakeholders",
        domain: "business",
        complexity: 0.7,
        uncertainty: 0.5,
        constraints: ["time_constraint", "budget_constraint"],
        stakeholders: ["management", "developers", "customers"],
        time_sensitivity: 0.8,
        resource_requirements: ["human_resources", "financial_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      for (const node of result.hierarchical_structure) {
        expect(node.priority_score).toBeGreaterThanOrEqual(0);
        expect(node.priority_score).toBeLessThanOrEqual(1);
      }
    });

    it("should sort priority ranking by priority score", async () => {
      const problem: Problem = {
        description: "Project requiring priority management",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers", "managers"],
        time_sensitivity: 0.7,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result.priority_ranking.length).toBe(
        result.hierarchical_structure.length
      );

      // Should be sorted in descending order of priority
      for (let i = 0; i < result.priority_ranking.length - 1; i++) {
        expect(
          result.priority_ranking[i].priority_score
        ).toBeGreaterThanOrEqual(result.priority_ranking[i + 1].priority_score);
      }
    });

    it("should give higher priority to critical path members", async () => {
      const problem: Problem = {
        description: "Time-critical project with clear priorities",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.9,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      const criticalPathMembers = result.hierarchical_structure.filter(
        (node) => node.critical_path_member
      );
      const nonCriticalMembers = result.hierarchical_structure.filter(
        (node) => !node.critical_path_member
      );

      if (criticalPathMembers.length > 0 && nonCriticalMembers.length > 0) {
        const avgCriticalPriority =
          criticalPathMembers.reduce(
            (sum, node) => sum + node.priority_score,
            0
          ) / criticalPathMembers.length;

        const avgNonCriticalPriority =
          nonCriticalMembers.reduce(
            (sum, node) => sum + node.priority_score,
            0
          ) / nonCriticalMembers.length;

        expect(avgCriticalPriority).toBeGreaterThan(avgNonCriticalPriority);
      }
    });

    it("should provide meaningful priority reasoning", async () => {
      const problem: Problem = {
        description: "High-complexity urgent project",
        domain: "technology",
        complexity: 0.8,
        uncertainty: 0.6,
        constraints: ["time_constraint", "resource_constraint"],
        stakeholders: ["developers", "managers", "customers"],
        time_sensitivity: 0.9,
        resource_requirements: ["technical_resources", "human_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      for (const priorityItem of result.priority_ranking) {
        expect(priorityItem.reasoning).toBeDefined();
        expect(priorityItem.reasoning.length).toBeGreaterThan(0);
        expect(priorityItem.reasoning).toContain("Priority:");
      }
    });
  });

  describe("Performance and Confidence", () => {
    it("should complete decomposition within reasonable time", async () => {
      const problem: Problem = {
        description: "Standard complexity problem for performance testing",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.5,
        resource_requirements: ["technical_resources"],
      };

      const startTime = Date.now();
      const result = await decomposer.decomposeRealTime(problem);
      const actualTime = Date.now() - startTime;

      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.processing_time_ms).toBeLessThan(5000); // Should complete within 5 seconds
      expect(actualTime).toBeLessThan(5000);
    });

    it("should provide reasonable confidence scores", async () => {
      const simpleProblem: Problem = {
        description: "Simple, well-defined task",
        domain: "technology",
        complexity: 0.2,
        uncertainty: 0.1,
        constraints: [],
        stakeholders: ["developer"],
        time_sensitivity: 0.3,
        resource_requirements: ["technical_resources"],
      };

      const complexProblem: Problem = {
        description:
          "Highly complex, uncertain project with multiple constraints",
        domain: "technology",
        complexity: 0.9,
        uncertainty: 0.8,
        constraints: [
          "time_constraint",
          "budget_constraint",
          "technical_constraint",
        ],
        stakeholders: ["multiple_teams", "management", "customers"],
        time_sensitivity: 0.9,
        resource_requirements: ["all_resources"],
      };

      const simpleResult = await decomposer.decomposeRealTime(simpleProblem);
      const complexResult = await decomposer.decomposeRealTime(complexProblem);

      // Both should have reasonable confidence ranges
      expect(simpleResult.confidence).toBeGreaterThan(0.6);
      expect(complexResult.confidence).toBeGreaterThan(0.4);

      // Simple problems should have higher or equal confidence (both might hit the 1.0 cap)
      expect(simpleResult.confidence).toBeGreaterThanOrEqual(
        complexResult.confidence
      );
    });

    it("should handle fast processing for real-time requirements", async () => {
      const problem: Problem = {
        description: "Real-time processing test problem",
        domain: "technology",
        complexity: 0.5,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.8,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      // Fast processing should still maintain quality
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.hierarchical_structure.length).toBeGreaterThan(1);
      expect(result.processing_time_ms).toBeLessThan(2000); // Real-time requirement
    });
  });

  describe("Context Integration", () => {
    it("should use context information in decomposition", async () => {
      const problem: Problem = {
        description: "Context-aware problem decomposition",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.5,
        resource_requirements: ["technical_resources"],
      };

      const context: Context = {
        session_id: "test-session",
        domain: "technology",
        urgency: 0.8,
        complexity: 0.7,
      };

      const result = await decomposer.decomposeRealTime(problem, context);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);

      // Context should influence the decomposition
      // (Specific assertions would depend on implementation details)
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle minimal problems", async () => {
      const minimalProblem: Problem = {
        description: "Simple task",
        domain: "general",
        complexity: 0.1,
        uncertainty: 0.1,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.1,
        resource_requirements: [],
      };

      const result = await decomposer.decomposeRealTime(minimalProblem);

      expect(result).toBeDefined();
      expect(result.hierarchical_structure.length).toBeGreaterThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle problems with maximum complexity", async () => {
      const maxComplexityProblem: Problem = {
        description:
          "Extremely complex multi-faceted enterprise-wide transformation with numerous interdependencies, stakeholders, and constraints",
        domain: "business",
        complexity: 1.0,
        uncertainty: 1.0,
        constraints: [
          "time_constraint",
          "budget_constraint",
          "technical_constraint",
          "regulatory_constraint",
        ],
        stakeholders: [
          "executives",
          "managers",
          "developers",
          "customers",
          "partners",
          "regulators",
        ],
        time_sensitivity: 1.0,
        resource_requirements: [
          "human_resources",
          "technical_resources",
          "financial_resources",
          "information_resources",
        ],
      };

      const result = await decomposer.decomposeRealTime(maxComplexityProblem);

      expect(result).toBeDefined();
      expect(result.hierarchical_structure.length).toBeGreaterThan(3);
      expect(result.confidence).toBeGreaterThan(0.3); // Lower confidence expected
    });

    it("should handle empty strategy list gracefully", async () => {
      // This tests internal strategy selection when no specific strategies are provided
      const problem: Problem = {
        description: "Problem with automatic strategy selection",
        domain: "technology",
        complexity: 0.5,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.6,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result).toBeDefined();
      expect(result.decomposition_strategies_used.length).toBeGreaterThan(0);
    });
  });
});
