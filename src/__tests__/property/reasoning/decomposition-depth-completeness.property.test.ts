/**
 * Property Test: Decomposition Depth Completeness
 *
 * **Feature: mcp-tool-improvements, Property 3: Decomposition Depth Completeness**
 *
 * This property test validates that when a problem is decomposed with maxDepth > 1,
 * at least one path SHALL reach the requested maxDepth.
 *
 * **Validates: Requirements 2.4**
 *
 * - Requirement 2.4: WHEN maxDepth is specified THEN the decomposition SHALL reach
 *   the requested depth with meaningful sub-problems at each level
 *
 * @module __tests__/property/reasoning/decomposition-depth-completeness.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ProblemDecomposer, SubProblem } from "../../../reasoning/problem-decomposer";

describe("Property 3: Decomposition Depth Completeness", () => {
  /**
   * Arbitrary for generating valid problem statements
   * These are realistic problem descriptions that should decompose well
   */
  const problemArb = fc.constantFrom(
    // E-commerce domain - rich decomposition potential
    "Build an e-commerce platform with user authentication, product catalog, and checkout",
    "Create an online store with shopping cart and payment processing",
    "Design a marketplace application with inventory management",
    // Web application domain
    "Develop a web application for project management with team collaboration",
    "Build a social media platform with user profiles and messaging",
    "Create a content management system with publishing workflow",
    // Mobile domain
    "Build a mobile app for fitness tracking with workout plans",
    "Create an iOS application for food delivery with real-time tracking",
    // Data domain
    "Design a data pipeline for analytics with ETL processing",
    "Build a data warehouse for business intelligence reporting",
    // API domain
    "Create a REST API for user management with authentication",
    "Design a GraphQL API for product catalog with search functionality",
    // Security domain
    "Implement security measures for user authentication and authorization",
    "Build an access control system with role-based permissions",
    // Performance domain
    "Optimize database performance for high-traffic application",
    "Improve application scalability with caching and load balancing",
    // Testing domain
    "Create a testing strategy for microservices architecture",
    "Build automated test suite for continuous integration",
    // DevOps domain
    "Set up CI/CD pipeline with Docker and Kubernetes deployment",
    "Design infrastructure for cloud-native application"
  );

  /**
   * Arbitrary for generating maxDepth values where depth > 1
   * We test depths 2-4 since depth 1 trivially satisfies the property
   */
  const maxDepthArb = fc.integer({ min: 2, max: 4 });

  const decomposer = new ProblemDecomposer();

  /**
   * Helper function to find the maximum depth reached in a decomposition
   */
  function findMaxDepthReached(subProblems: SubProblem[]): number {
    if (subProblems.length === 0) return 0;
    return Math.max(...subProblems.map((sp) => sp.depth));
  }

  /**
   * Helper function to count sub-problems at each depth level
   */
  function countByDepth(subProblems: SubProblem[]): Map<number, number> {
    const counts = new Map<number, number>();
    for (const sp of subProblems) {
      counts.set(sp.depth, (counts.get(sp.depth) || 0) + 1);
    }
    return counts;
  }

  /**
   * **Feature: mcp-tool-improvements, Property 3: Decomposition Depth Completeness**
   * **Validates: Requirements 2.4**
   *
   * For any decomposition with maxDepth > 1, at least one path SHALL reach maxDepth.
   */
  describe("Decomposition reaches requested depth", () => {
    it("should reach the requested maxDepth for complex problems", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: At least one sub-problem SHALL exist at maxDepth
          const maxDepthReached = findMaxDepthReached(result.subProblems);

          // The decomposition should reach the requested depth
          expect(maxDepthReached).toBe(maxDepth);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have sub-problems at every depth level from 1 to maxDepth", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);
          const depthCounts = countByDepth(result.subProblems);

          // Property: Every depth level from 1 to maxDepth SHALL have at least one sub-problem
          for (let depth = 1; depth <= maxDepth; depth++) {
            const count = depthCounts.get(depth) || 0;
            expect(count).toBeGreaterThan(0);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 3: Decomposition Depth Completeness**
   * **Validates: Requirements 2.4**
   *
   * For any decomposition, sub-problems at deeper levels SHALL have valid parent references.
   */
  describe("Depth hierarchy is valid", () => {
    it("should have valid parent-child depth relationships", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Create a map of id -> sub-problem for quick lookup
          const subProblemMap = new Map<string, SubProblem>();
          for (const sp of result.subProblems) {
            subProblemMap.set(sp.id, sp);
          }

          // Property: Each sub-problem with a parent SHALL have depth = parent.depth + 1
          for (const sp of result.subProblems) {
            if (sp.parent) {
              const parent = subProblemMap.get(sp.parent);
              if (parent) {
                expect(sp.depth).toBe(parent.depth + 1);
              }
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have root sub-problem at depth 1", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: The root sub-problem SHALL be at depth 1
          const rootProblems = result.subProblems.filter((sp) => sp.id === "root");
          expect(rootProblems.length).toBe(1);
          expect(rootProblems[0].depth).toBe(1);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 3: Decomposition Depth Completeness**
   * **Validates: Requirements 2.4**
   *
   * For any decomposition, no sub-problem SHALL exceed the requested maxDepth.
   */
  describe("Depth does not exceed maxDepth", () => {
    it("should not have sub-problems deeper than maxDepth", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: No sub-problem SHALL have depth > maxDepth
          for (const sp of result.subProblems) {
            expect(sp.depth).toBeLessThanOrEqual(maxDepth);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 3: Decomposition Depth Completeness**
   * **Validates: Requirements 2.4**
   *
   * For any decomposition with maxDepth = 1, only the root problem should exist.
   */
  describe("Edge case: maxDepth = 1", () => {
    it("should only have root problem when maxDepth is 1", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, async (problem) => {
          const result = decomposer.decompose(problem, 1);

          // Property: With maxDepth = 1, only root problem SHALL exist
          expect(result.subProblems.length).toBe(1);
          expect(result.subProblems[0].id).toBe("root");
          expect(result.subProblems[0].depth).toBe(1);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 3: Decomposition Depth Completeness**
   * **Validates: Requirements 2.4**
   *
   * For any decomposition, deeper levels should have meaningful sub-problems
   * (not just empty placeholders).
   */
  describe("Deep sub-problems are meaningful", () => {
    it("should have meaningful names at all depth levels", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: Sub-problems at all depths SHALL have meaningful names
          for (const sp of result.subProblems) {
            expect(sp.name.length).toBeGreaterThan(3);
            expect(sp.name).toMatch(/[a-zA-Z]/);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have meaningful descriptions at all depth levels", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: Sub-problems at all depths SHALL have meaningful descriptions
          for (const sp of result.subProblems) {
            expect(sp.description).toBeDefined();
            expect(sp.description.length).toBeGreaterThan(0);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
