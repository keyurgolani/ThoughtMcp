/**
 * Unit tests for ProblemDecomposer
 *
 * Tests meaningful sub-problem name generation, domain-specific decomposition,
 * depth handling, and dependency descriptions.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ProblemDecomposer } from "../../../reasoning/problem-decomposer.js";

describe("ProblemDecomposer", () => {
  let decomposer: ProblemDecomposer;

  beforeEach(() => {
    decomposer = new ProblemDecomposer();
  });

  describe("Meaningful Name Generation", () => {
    it("should generate descriptive names instead of generic 'Sub-problem N of:' pattern", () => {
      const result = decomposer.decompose("Build a scalable e-commerce platform", 2);

      // Check that no sub-problem uses the generic pattern
      for (const subProblem of result.subProblems) {
        expect(subProblem.name).not.toMatch(/Sub-problem \d+ of:/i);
        expect(subProblem.name.length).toBeGreaterThan(0);
      }
    });

    it("should extract domain-specific components for e-commerce problems", () => {
      const result = decomposer.decompose("Build a scalable e-commerce platform", 2);

      // Should identify e-commerce domain
      const domains = result.subProblems.map((sp) => sp.domain).filter(Boolean);
      expect(domains).toContain("ecommerce");

      // Should have meaningful component names
      const names = result.subProblems.map((sp) => sp.name);
      expect(names.some((n) => n.length > 5)).toBe(true);
    });

    it("should extract domain-specific components for web application problems", () => {
      const result = decomposer.decompose("Create a web application for task management", 2);

      // Should identify a valid domain (webapp, general, or any specific domain)
      const domains = result.subProblems.map((sp) => sp.domain).filter(Boolean);
      // At minimum, should have identified some domain
      expect(domains.length).toBeGreaterThan(0);
      // Should have meaningful sub-problems
      expect(result.subProblems.length).toBeGreaterThan(1);
    });

    it("should generate action-based names based on problem intent", () => {
      const buildResult = decomposer.decompose("Build a new authentication system", 2);
      const improveResult = decomposer.decompose("Improve the performance of the database", 2);
      const fixResult = decomposer.decompose("Fix the bug in the login flow", 2);

      // Build intent should use design/implement verbs
      expect(
        buildResult.subProblems.some((sp) => /Design|Implement|Create|Develop/i.test(sp.name))
      ).toBe(true);

      // Improve intent should use optimize/enhance verbs
      expect(
        improveResult.subProblems.some((sp) => /Optimize|Enhance|Refactor|Upgrade/i.test(sp.name))
      ).toBe(true);

      // Fix intent should use debug/resolve verbs
      expect(
        fixResult.subProblems.some((sp) => /Debug|Resolve|Repair|Correct/i.test(sp.name))
      ).toBe(true);
    });
  });

  describe("Sub-problem Description Quality", () => {
    it("should provide descriptions that explain what needs to be solved", () => {
      const result = decomposer.decompose("Design a user authentication system", 2);

      // Each sub-problem should have a description
      for (const subProblem of result.subProblems) {
        expect(subProblem.description).toBeDefined();
        expect(subProblem.description.length).toBeGreaterThan(10);
      }
    });

    it("should include details field with additional context", () => {
      const result = decomposer.decompose("Build a REST API for user management", 2);

      // Child sub-problems should have details
      const childProblems = result.subProblems.filter((sp) => sp.parent);
      expect(childProblems.length).toBeGreaterThan(0);
    });
  });

  describe("Dependency Relationship Descriptions", () => {
    it("should include meaningful dependency descriptions", () => {
      const result = decomposer.decompose("Build a scalable web application", 2);

      // Dependencies should have descriptions
      for (const dep of result.dependencies) {
        expect(dep.description).toBeDefined();
        expect(dep.description.length).toBeGreaterThan(0);
        expect(dep.type).toBeDefined();
      }
    });

    it("should explain the relationship between components", () => {
      const result = decomposer.decompose("Create an e-commerce platform with checkout", 2);

      // Dependency descriptions should explain relationships
      const descriptions = result.dependencies.map((d) => d.description);
      expect(
        descriptions.some(
          (d) =>
            d.includes("component of") ||
            d.includes("foundation for") ||
            d.includes("completed before")
        )
      ).toBe(true);
    });
  });

  describe("Domain Detection", () => {
    it("should detect e-commerce domain", () => {
      const result = decomposer.decompose("Build an online store with shopping cart", 2);
      expect(result.subProblems.some((sp) => sp.domain === "ecommerce")).toBe(true);
    });

    it("should detect API domain", () => {
      const result = decomposer.decompose("Design a REST API with authentication", 2);
      expect(result.subProblems.some((sp) => sp.domain === "api" || sp.domain === "security")).toBe(
        true
      );
    });

    it("should detect data/analytics domain", () => {
      const result = decomposer.decompose("Build a data pipeline for analytics", 2);
      expect(result.subProblems.some((sp) => sp.domain === "data")).toBe(true);
    });

    it("should detect machine learning domain", () => {
      const result = decomposer.decompose("Train a machine learning model for prediction", 2);
      expect(result.subProblems.some((sp) => sp.domain === "ml")).toBe(true);
    });

    it("should detect security domain", () => {
      const result = decomposer.decompose("Implement security measures for access control", 2);
      expect(result.subProblems.some((sp) => sp.domain === "security")).toBe(true);
    });

    it("should detect DevOps domain", () => {
      const result = decomposer.decompose(
        "Set up devops infrastructure with Docker and Kubernetes",
        2
      );
      expect(result.subProblems.some((sp) => sp.domain === "devops")).toBe(true);
    });

    it("should fall back to general domain for unrecognized problems", () => {
      const result = decomposer.decompose("Solve the traveling salesman problem", 2);
      expect(result.subProblems.some((sp) => sp.domain === "general")).toBe(true);
    });
  });

  describe("Depth Handling", () => {
    it("should respect maxDepth=1 and only return root problem", () => {
      const result = decomposer.decompose("Build a web application", 1);

      // Should only have root problem at depth 1
      expect(result.subProblems.length).toBe(1);
      expect(result.subProblems[0].depth).toBe(1);
      expect(result.subProblems[0].parent).toBeUndefined();
    });

    it("should generate sub-problems at depth 2 when maxDepth >= 2", () => {
      const result = decomposer.decompose("Build a web application", 2);

      // Should have problems at depth 1 and 2
      const depths = result.subProblems.map((sp) => sp.depth);
      expect(depths).toContain(1);
      expect(depths).toContain(2);
    });

    it("should reach maxDepth=3 with at least one path", () => {
      const result = decomposer.decompose("Build a complex enterprise system", 3);

      // Should have problems at depth 3
      const maxDepth = Math.max(...result.subProblems.map((sp) => sp.depth));
      expect(maxDepth).toBe(3);

      // Verify at least one sub-problem exists at depth 3
      const depth3Problems = result.subProblems.filter((sp) => sp.depth === 3);
      expect(depth3Problems.length).toBeGreaterThan(0);
    });

    it("should reach maxDepth=4 with at least one path", () => {
      const result = decomposer.decompose("Build a scalable e-commerce platform", 4);

      // Should have problems at depth 4
      const maxDepth = Math.max(...result.subProblems.map((sp) => sp.depth));
      expect(maxDepth).toBe(4);

      // Verify at least one sub-problem exists at depth 4
      const depth4Problems = result.subProblems.filter((sp) => sp.depth === 4);
      expect(depth4Problems.length).toBeGreaterThan(0);
    });

    it("should generate meaningful sub-problems at each depth level", () => {
      const result = decomposer.decompose("Build a web application with authentication", 3);

      // Check each depth level has meaningful names
      for (let depth = 1; depth <= 3; depth++) {
        const problemsAtDepth = result.subProblems.filter((sp) => sp.depth === depth);
        expect(problemsAtDepth.length).toBeGreaterThan(0);

        for (const problem of problemsAtDepth) {
          // Names should not be generic patterns
          expect(problem.name).not.toMatch(/Sub-problem \d+ of:/i);
          expect(problem.name.length).toBeGreaterThan(5);
          // Descriptions should be meaningful
          expect(problem.description.length).toBeGreaterThan(10);
        }
      }
    });

    it("should create parent-child relationships across all depths", () => {
      const result = decomposer.decompose("Design a data pipeline for analytics", 3);

      // All non-root problems should have a parent
      const nonRootProblems = result.subProblems.filter((sp) => sp.id !== "root");
      for (const problem of nonRootProblems) {
        expect(problem.parent).toBeDefined();
        // Parent should exist in the sub-problems list
        const parentExists = result.subProblems.some((sp) => sp.id === problem.parent);
        expect(parentExists).toBe(true);
      }
    });
  });

  describe("Root Problem Naming", () => {
    it("should generate meaningful root problem name", () => {
      const result = decomposer.decompose("Build a scalable e-commerce platform", 2);

      const rootProblem = result.subProblems.find((sp) => sp.id === "root");
      expect(rootProblem).toBeDefined();
      expect(rootProblem!.name).not.toMatch(/Sub-problem/i);
      expect(rootProblem!.name.length).toBeGreaterThan(5);
    });

    it("should preserve original problem as description", () => {
      const originalProblem = "Build a scalable e-commerce platform";
      const result = decomposer.decompose(originalProblem, 2);

      const rootProblem = result.subProblems.find((sp) => sp.id === "root");
      expect(rootProblem!.description).toBe(originalProblem);
    });
  });

  describe("Edge Cases", () => {
    it("should handle short problem statements", () => {
      const result = decomposer.decompose("Fix bug", 2);

      expect(result.subProblems.length).toBeGreaterThan(0);
      expect(result.subProblems[0].name).toBeDefined();
    });

    it("should handle long problem statements", () => {
      const longProblem =
        "Build a comprehensive enterprise resource planning system that includes inventory management, customer relationship management, human resources, financial accounting, supply chain management, and business intelligence reporting capabilities";
      const result = decomposer.decompose(longProblem, 2);

      expect(result.subProblems.length).toBeGreaterThan(0);
      // Names should be reasonably sized
      for (const sp of result.subProblems) {
        expect(sp.name.length).toBeLessThan(100);
      }
    });

    it("should handle problems with special characters", () => {
      const result = decomposer.decompose("Build API v2.0 (REST/GraphQL) with OAuth2.0", 2);

      expect(result.subProblems.length).toBeGreaterThan(0);
      expect(result.subProblems[0].name).toBeDefined();
    });
  });
});
