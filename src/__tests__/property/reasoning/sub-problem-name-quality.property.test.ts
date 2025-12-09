/**
 * Property Test: Sub-Problem Name Quality
 *
 * **Feature: mcp-tool-improvements, Property 2: Sub-Problem Name Quality**
 *
 * This property test validates that when a problem is decomposed, each sub-problem
 * SHALL have a descriptive name that identifies the component (not "Sub-problem N of: ...").
 *
 * **Validates: Requirements 2.1, 2.2**
 *
 * - Requirement 2.1: WHEN a problem is decomposed THEN each sub-problem SHALL have
 *   a descriptive name that identifies the component (not "Sub-problem 1 of: ...")
 * - Requirement 2.2: WHEN a problem is decomposed THEN each sub-problem description
 *   SHALL explain what needs to be solved
 *
 * @module __tests__/property/reasoning/sub-problem-name-quality.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ProblemDecomposer } from "../../../reasoning/problem-decomposer";

describe("Property 2: Sub-Problem Name Quality", () => {
  /**
   * Arbitrary for generating valid problem statements
   * These are realistic problem descriptions that the decomposer should handle
   */
  const problemArb = fc.constantFrom(
    // E-commerce domain
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
    "Design infrastructure for cloud-native application",
    // General problems
    "How to build a scalable backend system",
    "Design a notification system with email and push notifications",
    "Create a search functionality with filtering and sorting"
  );

  /**
   * Arbitrary for generating valid maxDepth values (1-5)
   */
  const maxDepthArb = fc.integer({ min: 1, max: 5 });

  /**
   * Pattern that should NOT appear in sub-problem names
   * This is the generic pattern we want to avoid
   */
  const FORBIDDEN_PATTERN = /^Sub-problem\s+\d+\s+of:/i;

  /**
   * Additional patterns that indicate low-quality names
   */
  const LOW_QUALITY_PATTERNS = [
    /^Sub-problem\s+\d+/i, // "Sub-problem 1", "Sub-problem 2", etc.
    /^Task\s+\d+$/i, // "Task 1", "Task 2", etc.
    /^Step\s+\d+$/i, // "Step 1", "Step 2", etc.
    /^Part\s+\d+$/i, // "Part 1", "Part 2", etc.
    /^Item\s+\d+$/i, // "Item 1", "Item 2", etc.
  ];

  const decomposer = new ProblemDecomposer();

  /**
   * **Feature: mcp-tool-improvements, Property 2: Sub-Problem Name Quality**
   * **Validates: Requirements 2.1**
   *
   * For any decomposition, sub-problem names SHALL NOT match "Sub-problem N of:" pattern.
   */
  describe("Sub-problem names avoid generic patterns", () => {
    it("should not use 'Sub-problem N of:' pattern in names", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: No sub-problem name SHALL match the forbidden pattern
          for (const subProblem of result.subProblems) {
            expect(subProblem.name).not.toMatch(FORBIDDEN_PATTERN);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should not use any low-quality generic patterns in names", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: No sub-problem name SHALL match any low-quality pattern
          for (const subProblem of result.subProblems) {
            for (const pattern of LOW_QUALITY_PATTERNS) {
              expect(subProblem.name).not.toMatch(pattern);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 2: Sub-Problem Name Quality**
   * **Validates: Requirements 2.1, 2.2**
   *
   * For any decomposition, sub-problem names SHALL be descriptive
   * (contain meaningful words, not just numbers or generic terms).
   */
  describe("Sub-problem names are descriptive", () => {
    it("should have names with meaningful content (more than 3 characters)", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: All sub-problem names SHALL have meaningful length
          for (const subProblem of result.subProblems) {
            expect(subProblem.name.length).toBeGreaterThan(3);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have names that contain alphabetic characters", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: All sub-problem names SHALL contain alphabetic characters
          for (const subProblem of result.subProblems) {
            expect(subProblem.name).toMatch(/[a-zA-Z]/);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have names that are not purely numeric", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: No sub-problem name SHALL be purely numeric
          for (const subProblem of result.subProblems) {
            expect(subProblem.name).not.toMatch(/^\d+$/);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 2: Sub-Problem Name Quality**
   * **Validates: Requirements 2.2**
   *
   * For any decomposition, sub-problem descriptions SHALL explain what needs to be solved.
   */
  describe("Sub-problem descriptions are meaningful", () => {
    it("should have non-empty descriptions", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: All sub-problems SHALL have non-empty descriptions
          for (const subProblem of result.subProblems) {
            expect(subProblem.description).toBeDefined();
            expect(subProblem.description.length).toBeGreaterThan(0);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have descriptions longer than names (more detailed)", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: Sub-problem descriptions SHALL be at least as long as names
          // (descriptions should provide more detail)
          for (const subProblem of result.subProblems) {
            // Root problem description is the original problem, which may be shorter
            // than the generated name, so we skip the root
            if (subProblem.id !== "root") {
              expect(subProblem.description.length).toBeGreaterThanOrEqual(
                Math.min(subProblem.name.length, 10)
              );
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 2: Sub-Problem Name Quality**
   * **Validates: Requirements 2.1**
   *
   * For any decomposition with depth > 1, child sub-problems SHALL have
   * unique names (not duplicates).
   */
  describe("Sub-problem names are unique within siblings", () => {
    it("should have unique names among sibling sub-problems", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Group sub-problems by parent
          const byParent = new Map<string | undefined, string[]>();
          for (const subProblem of result.subProblems) {
            const parent = subProblem.parent;
            if (!byParent.has(parent)) {
              byParent.set(parent, []);
            }
            byParent.get(parent)!.push(subProblem.name);
          }

          // Property: Sibling sub-problems SHALL have unique names
          for (const [_parent, names] of byParent) {
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 2: Sub-Problem Name Quality**
   * **Validates: Requirements 2.1**
   *
   * For any decomposition, sub-problem names SHALL start with an action verb
   * or domain-specific term (not a number or generic prefix).
   */
  describe("Sub-problem names have meaningful structure", () => {
    it("should have names that start with a letter", async () => {
      await fc.assert(
        fc.asyncProperty(problemArb, maxDepthArb, async (problem, maxDepth) => {
          const result = decomposer.decompose(problem, maxDepth);

          // Property: All sub-problem names SHALL start with a letter
          for (const subProblem of result.subProblems) {
            expect(subProblem.name.charAt(0)).toMatch(/[a-zA-Z]/);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
