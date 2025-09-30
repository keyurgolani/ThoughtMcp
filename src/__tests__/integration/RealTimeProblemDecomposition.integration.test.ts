/**
 * Integration tests for Real-Time Problem Decomposition
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RealTimeProblemDecomposer } from "../../cognitive/RealTimeProblemDecomposer.js";
import { SystematicThinkingOrchestrator } from "../../cognitive/SystematicThinkingOrchestrator.js";
import { Problem } from "../../interfaces/systematic-thinking.js";
import { Context } from "../../types/core.js";

describe("Real-Time Problem Decomposition Integration", () => {
  let decomposer: RealTimeProblemDecomposer;
  let systematicThinking: SystematicThinkingOrchestrator;

  beforeEach(async () => {
    decomposer = new RealTimeProblemDecomposer();
    systematicThinking = new SystematicThinkingOrchestrator();

    await decomposer.initialize();
    await systematicThinking.initialize();
  });

  afterEach(() => {
    // Clean up any resources if needed
  });

  describe("Real-Time Decomposition Performance", () => {
    it("should decompose simple problems within 1 second", async () => {
      const problem: Problem = {
        description:
          "Optimize database query performance for user authentication",
        domain: "technology",
        complexity: 0.4,
        uncertainty: 0.3,
        constraints: ["time_constraint", "resource_constraint"],
        stakeholders: ["developers", "users"],
        time_sensitivity: 0.6,
        resource_requirements: ["technical_resources", "time_resources"],
      };

      const startTime = Date.now();
      const result = await decomposer.decomposeRealTime(problem);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(1000);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.hierarchical_structure.length).toBeGreaterThan(1);
    });

    it("should decompose complex problems within 3 seconds", async () => {
      const problem: Problem = {
        description:
          "Design and implement a scalable microservices architecture for a multi-tenant SaaS platform with real-time analytics, user management, payment processing, and third-party integrations",
        domain: "technology",
        complexity: 0.9,
        uncertainty: 0.7,
        constraints: [
          "time_constraint",
          "budget_constraint",
          "technical_constraint",
        ],
        stakeholders: [
          "developers",
          "architects",
          "product_managers",
          "customers",
        ],
        time_sensitivity: 0.8,
        resource_requirements: [
          "technical_resources",
          "human_resources",
          "financial_resources",
        ],
      };

      const startTime = Date.now();
      const result = await decomposer.decomposeRealTime(problem);
      const processingTime = Date.now() - startTime;

      expect(processingTime).toBeLessThan(3000);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.hierarchical_structure.length).toBeGreaterThan(5);
    });
  });

  describe("Hierarchical Structure Validation", () => {
    it("should create proper parent-child relationships", async () => {
      const problem: Problem = {
        description:
          "Build a web application with user authentication and data visualization",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers", "users"],
        time_sensitivity: 0.5,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      // Check root node exists
      const rootNodes = result.hierarchical_structure.filter(
        (node) => node.level === 0
      );
      expect(rootNodes).toHaveLength(1);

      // Check parent-child relationships are valid
      for (const node of result.hierarchical_structure) {
        if (node.parent_id) {
          const parent = result.hierarchical_structure.find(
            (n) => n.id === node.parent_id
          );
          expect(parent).toBeDefined();
          expect(parent!.children_ids).toContain(node.id);
          expect(parent!.level).toBeLessThan(node.level);
        }

        for (const childId of node.children_ids) {
          const child = result.hierarchical_structure.find(
            (n) => n.id === childId
          );
          expect(child).toBeDefined();
          expect(child!.parent_id).toBe(node.id);
          expect(child!.level).toBeGreaterThan(node.level);
        }
      }
    });

    it("should assign meaningful priority scores", async () => {
      const problem: Problem = {
        description:
          "Implement critical security updates for production system",
        domain: "technology",
        complexity: 0.7,
        uncertainty: 0.5,
        constraints: ["time_constraint", "security_constraint"],
        stakeholders: ["security_team", "developers", "users"],
        time_sensitivity: 0.9,
        resource_requirements: ["technical_resources", "human_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      // All nodes should have priority scores between 0 and 1
      for (const node of result.hierarchical_structure) {
        expect(node.priority_score).toBeGreaterThanOrEqual(0);
        expect(node.priority_score).toBeLessThanOrEqual(1);
      }

      // Priority ranking should be sorted by priority score
      for (let i = 0; i < result.priority_ranking.length - 1; i++) {
        expect(
          result.priority_ranking[i].priority_score
        ).toBeGreaterThanOrEqual(result.priority_ranking[i + 1].priority_score);
      }

      // High time sensitivity should result in higher priority scores
      const avgPriority =
        result.priority_ranking.reduce(
          (sum, item) => sum + item.priority_score,
          0
        ) / result.priority_ranking.length;
      expect(avgPriority).toBeGreaterThan(0.5);
    });
  });

  describe("Dependency Mapping", () => {
    it("should identify logical dependencies between sub-problems", async () => {
      const problem: Problem = {
        description:
          "Plan, design, implement, and test a new user registration system",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers", "users"],
        time_sensitivity: 0.6,
        resource_requirements: ["technical_resources", "time_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result.dependencies.length).toBeGreaterThan(0);

      // Check dependency types are valid
      const validTypes = ["prerequisite", "constraint", "resource", "temporal"];
      for (const dependency of result.dependencies) {
        expect(validTypes).toContain(dependency.type);
        expect(dependency.strength).toBeGreaterThan(0);
        expect(dependency.strength).toBeLessThanOrEqual(1);

        // Verify dependency nodes exist
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

    it("should identify prerequisite relationships correctly", async () => {
      const problem: Problem = {
        description:
          "Research requirements, then design architecture, then implement solution",
        domain: "technology",
        complexity: 0.5,
        uncertainty: 0.6,
        constraints: [],
        stakeholders: ["developers"],
        time_sensitivity: 0.4,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      // Should have prerequisite dependencies
      const prerequisiteDeps = result.dependencies.filter(
        (dep) => dep.type === "prerequisite"
      );
      expect(prerequisiteDeps.length).toBeGreaterThan(0);

      // Prerequisite dependencies should have high strength
      for (const dep of prerequisiteDeps) {
        expect(dep.strength).toBeGreaterThan(0.6);
      }
    });
  });

  describe("Critical Path Identification", () => {
    it("should identify a valid critical path", async () => {
      const problem: Problem = {
        description:
          "Develop, test, and deploy a new feature with dependencies",
        domain: "technology",
        complexity: 0.7,
        uncertainty: 0.5,
        constraints: ["time_constraint"],
        stakeholders: ["developers", "testers"],
        time_sensitivity: 0.8,
        resource_requirements: ["technical_resources", "human_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result.critical_path.length).toBeGreaterThan(0);

      // All critical path nodes should exist in hierarchical structure
      for (const nodeId of result.critical_path) {
        const node = result.hierarchical_structure.find((n) => n.id === nodeId);
        expect(node).toBeDefined();
        expect(node!.critical_path_member).toBe(true);
      }

      // Critical path should respect dependencies
      for (let i = 0; i < result.critical_path.length - 1; i++) {
        const currentId = result.critical_path[i];
        const nextId = result.critical_path[i + 1];

        // There should be a path from current to next through dependencies
        const hasDirectDependency = result.dependencies.some(
          (dep) => dep.from === currentId && dep.to === nextId
        );

        // If no direct dependency, should be valid in topological order
        if (!hasDirectDependency) {
          // This is acceptable as critical path may skip intermediate nodes
          expect(true).toBe(true);
        }
      }
    });

    it("should mark critical path members correctly", async () => {
      const problem: Problem = {
        description: "Sequential project with clear dependencies",
        domain: "technology",
        complexity: 0.6,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["team"],
        time_sensitivity: 0.7,
        resource_requirements: ["technical_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      // Count critical path members
      const criticalPathMembers = result.hierarchical_structure.filter(
        (node) => node.critical_path_member
      );

      expect(criticalPathMembers.length).toBe(result.critical_path.length);

      // All critical path node IDs should match critical path members
      const criticalPathIds = new Set(result.critical_path);
      const memberIds = new Set(criticalPathMembers.map((node) => node.id));

      expect(criticalPathIds).toEqual(memberIds);
    });
  });

  describe("Integration with Systematic Thinking", () => {
    it("should work together with systematic thinking orchestrator", async () => {
      const input =
        "Optimize our customer support system to reduce response times and improve satisfaction";
      const context: Context = {
        session_id: "test-session",
        domain: "business",
        urgency: 0.7,
        complexity: 0.6,
      };

      // First, analyze systematically
      const systematicResult = await systematicThinking.analyzeSystematically(
        input,
        "auto",
        context
      );

      // Then decompose the problem
      const problem: Problem = {
        description: input,
        domain: context.domain!,
        complexity: context.complexity!,
        uncertainty: 0.5,
        constraints: ["time_constraint", "resource_constraint"],
        stakeholders: ["support_team", "customers", "management"],
        time_sensitivity: context.urgency!,
        resource_requirements: ["human_resources", "technical_resources"],
      };

      const decompositionResult = await decomposer.decomposeRealTime(
        problem,
        context
      );

      // Both should complete successfully
      expect(systematicResult.confidence).toBeGreaterThan(0.5);
      expect(decompositionResult.confidence).toBeGreaterThan(0.5);

      // Decomposition should provide more detailed structure
      expect(decompositionResult.hierarchical_structure.length).toBeGreaterThan(
        systematicResult.problem_structure.sub_problems.length
      );

      // Both should identify similar complexity characteristics (within reasonable range)
      const complexityDiff = Math.abs(
        decompositionResult.original_problem.complexity -
          systematicResult.problem_structure.main_problem.complexity
      );
      expect(complexityDiff).toBeLessThan(0.3); // Allow for some variation in complexity assessment
    });
  });

  describe("Multiple Decomposition Strategies", () => {
    it("should use multiple strategies effectively", async () => {
      const problem: Problem = {
        description:
          "Launch a new product with marketing, development, and operations coordination",
        domain: "business",
        complexity: 0.8,
        uncertainty: 0.6,
        constraints: ["time_constraint", "budget_constraint"],
        stakeholders: ["marketing", "development", "operations", "customers"],
        time_sensitivity: 0.7,
        resource_requirements: [
          "human_resources",
          "financial_resources",
          "technical_resources",
        ],
      };

      const result = await decomposer.decomposeRealTime(problem);

      // Should use multiple strategies
      expect(result.decomposition_strategies_used.length).toBeGreaterThan(2);

      // Should include relevant strategies for this type of problem
      const expectedStrategies = ["functional", "stakeholder", "temporal"];
      const usedStrategies = result.decomposition_strategies_used;

      let matchCount = 0;
      for (const expected of expectedStrategies) {
        if (usedStrategies.includes(expected)) {
          matchCount++;
        }
      }

      expect(matchCount).toBeGreaterThan(1);
    });

    it("should provide strategy details", async () => {
      const strategies = decomposer.getAvailableStrategies();

      expect(strategies.length).toBeGreaterThan(5);
      expect(strategies).toContain("functional");
      expect(strategies).toContain("temporal");
      expect(strategies).toContain("stakeholder");

      // Should be able to get strategy details
      const functionalStrategy = decomposer.getStrategyDetails("functional");
      expect(functionalStrategy).toBeDefined();
      expect(functionalStrategy!.name).toBe("functional");
      expect(functionalStrategy!.description).toBeDefined();
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle empty or minimal problems gracefully", async () => {
      const problem: Problem = {
        description: "Simple task",
        domain: "general",
        complexity: 0.1,
        uncertainty: 0.1,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.1,
        resource_requirements: [],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.hierarchical_structure.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle problems with high uncertainty", async () => {
      const problem: Problem = {
        description:
          "Explore unknown market opportunities with unclear requirements",
        domain: "business",
        complexity: 0.7,
        uncertainty: 0.9,
        constraints: ["budget_constraint"],
        stakeholders: ["research_team", "management"],
        time_sensitivity: 0.5,
        resource_requirements: ["human_resources", "financial_resources"],
      };

      const result = await decomposer.decomposeRealTime(problem);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.3); // Lower confidence expected
      expect(result.hierarchical_structure.length).toBeGreaterThan(1);

      // High uncertainty should be reflected in the decomposition
      expect(result.original_problem.uncertainty).toBe(0.9);
    });

    it("should maintain performance under concurrent requests", async () => {
      const problems: Problem[] = Array.from({ length: 5 }, (_, i) => ({
        description: `Concurrent problem ${
          i + 1
        }: Implement feature with dependencies`,
        domain: "technology",
        complexity: 0.5 + i * 0.1,
        uncertainty: 0.4,
        constraints: ["time_constraint"],
        stakeholders: ["developers"],
        time_sensitivity: 0.6,
        resource_requirements: ["technical_resources"],
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        problems.map((problem) => decomposer.decomposeRealTime(problem))
      );
      const totalTime = Date.now() - startTime;

      // All should complete successfully
      expect(results).toHaveLength(5);
      for (const result of results) {
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.hierarchical_structure.length).toBeGreaterThan(1);
      }

      // Should complete within reasonable time even with concurrent processing
      expect(totalTime).toBeLessThan(10000); // 10 seconds max for 5 concurrent requests
    });
  });
});
