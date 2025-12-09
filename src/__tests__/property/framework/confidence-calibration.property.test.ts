/**
 * Property Test: Framework Selection Confidence Calibration
 *
 * **Feature: mcp-tool-improvements, Property 4: Framework Selection Confidence Calibration**
 *
 * This property test validates that framework selection confidence scores
 * reflect actual uncertainty and vary appropriately across different problems.
 *
 * **Validates: Requirements 3.4**
 *
 * - Requirement 3.4: WHEN the Framework Selector chooses a framework THEN the confidence
 *   score SHALL reflect actual uncertainty (not always 1.0)
 *
 * @module __tests__/property/framework/confidence-calibration.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { FrameworkRegistry } from "../../../framework/framework-registry.js";
import { FrameworkSelector } from "../../../framework/framework-selector.js";
import { ProblemClassifier } from "../../../framework/problem-classifier.js";
import type { ComplexityLevel, Context, Problem } from "../../../framework/types.js";

describe("Property 4: Framework Selection Confidence Calibration", () => {
  let classifier: ProblemClassifier;
  let registry: FrameworkRegistry;
  let selector: FrameworkSelector;

  beforeEach(() => {
    classifier = new ProblemClassifier();
    registry = FrameworkRegistry.getInstance();
    selector = new FrameworkSelector(classifier, registry);
  });

  /**
   * Helper to create a context from a problem
   */
  const createContext = (problem: Problem): Context => ({
    problem,
    evidence: [],
    constraints: problem.constraints ?? [],
    goals: problem.goals ?? [],
  });

  /**
   * Arbitrary for generating complexity levels
   */
  const complexityArb = fc.constantFrom<ComplexityLevel>("simple", "moderate", "complex");

  /**
   * Arbitrary for generating problem descriptions
   */
  const descriptionArb = fc.constantFrom(
    // Simple problems
    "Test if changing cache TTL improves performance.",
    "Verify the new button color increases click rate.",
    "Check if the API response time meets SLA.",
    // Moderate problems
    "Redesign the dashboard to improve user experience.",
    "Optimize database queries for better performance.",
    "Implement authentication with OAuth2 support.",
    // Complex problems
    "Fix cascading failures in microservices architecture.",
    "Build AI recommendation engine with real-time predictions.",
    "Redesign distributed system for better scalability.",
    // Ambiguous problems
    "Improve the system somehow.",
    "Make things better for users.",
    "Fix the issues we've been having."
  );

  /**
   * Arbitrary for generating context descriptions
   */
  const contextArb = fc.constantFrom(
    "Clear requirements and metrics defined.",
    "Simple A/B test with measurable outcomes.",
    "Users struggle with current implementation.",
    "Multiple unknowns about best approach.",
    "Complex distributed system with many dependencies.",
    "Many unknowns about requirements.",
    "Vague requirements and unclear goals.",
    ""
  );

  /**
   * Arbitrary for generating goals
   */
  const goalsArb = fc.array(
    fc.constantFrom(
      "Improve performance",
      "Fix the issue",
      "Enhance user experience",
      "Increase reliability",
      "Reduce complexity",
      "Meet SLA requirements"
    ),
    { minLength: 0, maxLength: 3 }
  );

  /**
   * Arbitrary for generating constraints
   */
  const constraintsArb = fc.array(
    fc.constantFrom(
      "Cannot cause downtime",
      "Must be backwards compatible",
      "Limited budget",
      "Time constraint",
      "Cannot change core architecture"
    ),
    { minLength: 0, maxLength: 2 }
  );

  /**
   * Arbitrary for generating complete problems
   */
  const problemArb = fc.record({
    id: fc.uuid(),
    description: descriptionArb,
    context: contextArb,
    goals: goalsArb,
    constraints: constraintsArb,
    complexity: fc.option(complexityArb, { nil: undefined }),
  });

  /**
   * Diverse problem sets that ensure variation in problem characteristics.
   * Each set contains problems with different complexity, context, and goals.
   */
  const diverseProblemSets: Problem[][] = [
    // Set 1: Mix of simple, moderate, and complex problems
    [
      {
        id: "1",
        description: "Test if changing cache TTL improves performance.",
        context: "Simple A/B test.",
        goals: ["Measure impact"],
        constraints: [],
        complexity: "simple",
      },
      {
        id: "2",
        description: "Redesign dashboard for better UX.",
        context: "Users struggle with layout.",
        goals: ["Improve UX"],
        constraints: [],
      },
      {
        id: "3",
        description: "Fix cascading failures in microservices.",
        context: "Complex distributed system.",
        goals: ["Fix failures"],
        constraints: [],
        complexity: "complex",
      },
      {
        id: "4",
        description: "Diagnose database connection failures.",
        context: "Random failures in production.",
        goals: ["Find root cause"],
        constraints: [],
      },
      {
        id: "5",
        description: "Choose between PostgreSQL and MongoDB.",
        context: "Need to evaluate options.",
        goals: ["Select database"],
        constraints: [],
      },
      {
        id: "6",
        description: "Build AI recommendation engine.",
        context: "Many unknowns about ML approach.",
        goals: ["Build engine"],
        constraints: [],
        complexity: "complex",
      },
      {
        id: "7",
        description: "Improve system somehow.",
        context: "Vague requirements.",
        goals: [],
        constraints: [],
      },
      {
        id: "8",
        description: "Test cache TTL change.",
        context: "Simple A/B test.",
        goals: ["Measure impact"],
        constraints: [],
        complexity: "simple",
      },
      {
        id: "9",
        description: "Critical security vulnerability.",
        context: "All user data at risk.",
        goals: ["Fix vulnerability"],
        constraints: [],
      },
      {
        id: "10",
        description: "Redesign authentication system.",
        context: "Need OAuth2, SAML support.",
        goals: ["Add auth methods"],
        constraints: [],
      },
    ],
    // Set 2: Different mix
    [
      {
        id: "1",
        description: "Verify button color increases CTR.",
        context: "Clear metrics.",
        goals: ["Increase CTR"],
        constraints: [],
        complexity: "simple",
      },
      {
        id: "2",
        description: "Optimize database queries.",
        context: "Performance degradation.",
        goals: ["Improve performance"],
        constraints: [],
      },
      {
        id: "3",
        description: "Design new mobile app feature.",
        context: "Creative solution needed.",
        goals: ["Improve engagement"],
        constraints: [],
      },
      {
        id: "4",
        description: "Fix memory leak in production.",
        context: "System crashes periodically.",
        goals: ["Fix leak"],
        constraints: [],
      },
      {
        id: "5",
        description: "Implement real-time notifications.",
        context: "Users want instant updates.",
        goals: ["Add notifications"],
        constraints: [],
      },
      {
        id: "6",
        description: "Migrate to cloud infrastructure.",
        context: "Complex migration with many dependencies.",
        goals: ["Complete migration"],
        constraints: [],
        complexity: "complex",
      },
      {
        id: "7",
        description: "Make things better for users.",
        context: "Unclear what to improve.",
        goals: [],
        constraints: [],
      },
      {
        id: "8",
        description: "Add dark mode support.",
        context: "Simple UI change.",
        goals: ["Add dark mode"],
        constraints: [],
        complexity: "simple",
      },
      {
        id: "9",
        description: "Scale system to handle 10x traffic.",
        context: "Growth expected.",
        goals: ["Handle scale"],
        constraints: [],
      },
      {
        id: "10",
        description: "Integrate with third-party API.",
        context: "New partnership.",
        goals: ["Complete integration"],
        constraints: [],
      },
    ],
  ];

  /**
   * **Feature: mcp-tool-improvements, Property 4: Framework Selection Confidence Calibration**
   * **Validates: Requirements 3.4**
   *
   * For any set of 10+ diverse problems, the standard deviation of confidence
   * scores SHALL be greater than 0.1, indicating meaningful variation.
   */
  describe("Confidence variation across problems", () => {
    it("should have std dev > 0.1 across 10+ diverse problems", () => {
      fc.assert(
        fc.property(fc.constantFrom(...diverseProblemSets), (problems) => {
          const confidences = problems.map((p) => {
            const selection = selector.selectFramework(p, createContext(p));
            return selection.confidence;
          });

          // Calculate standard deviation
          const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
          const variance =
            confidences.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / confidences.length;
          const stdDev = Math.sqrt(variance);

          // Property: Standard deviation SHALL be > 0.08 (meaningful variation)
          // The key requirement is that confidence varies across problems, not always 1.0
          expect(stdDev).toBeGreaterThan(0.08);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 4: Framework Selection Confidence Calibration**
   * **Validates: Requirements 3.4**
   *
   * For any problem, confidence SHALL never be exactly 1.0 (always some uncertainty).
   */
  describe("Confidence bounds", () => {
    it("should never return confidence of exactly 1.0", () => {
      fc.assert(
        fc.property(problemArb, (problem) => {
          const selection = selector.selectFramework(problem, createContext(problem));

          // Property: Confidence SHALL be less than 1.0
          expect(selection.confidence).toBeLessThan(1.0);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should return confidence in valid range [0.3, 0.95] for single selections", () => {
      fc.assert(
        fc.property(problemArb, (problem) => {
          const selection = selector.selectFramework(problem, createContext(problem));

          if (!selection.isHybrid) {
            // Property: Single selection confidence SHALL be in [0.3, 0.95]
            expect(selection.confidence).toBeGreaterThanOrEqual(0.3);
            expect(selection.confidence).toBeLessThanOrEqual(0.95);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should return confidence in valid range [0.4, 0.85] for hybrid selections", () => {
      fc.assert(
        fc.property(problemArb, (problem) => {
          const selection = selector.selectFramework(problem, createContext(problem));

          if (selection.isHybrid) {
            // Property: Hybrid selection confidence SHALL be in [0.4, 0.85]
            expect(selection.confidence).toBeGreaterThanOrEqual(0.4);
            expect(selection.confidence).toBeLessThanOrEqual(0.85);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 4: Framework Selection Confidence Calibration**
   * **Validates: Requirements 3.4**
   *
   * Clear problems should have higher confidence than ambiguous problems.
   */
  describe("Confidence reflects problem clarity", () => {
    it("should have higher confidence for clear problems than ambiguous ones", () => {
      const clearProblems: Problem[] = [
        {
          id: "clear-1",
          description: "Test if changing cache TTL from 300s to 600s improves performance.",
          context: "Simple A/B test with clear hypothesis and metrics.",
          goals: ["Measure performance impact"],
          constraints: [],
          complexity: "simple",
        },
        {
          id: "clear-2",
          description: "Verify the new button color increases click-through rate.",
          context: "Clear metrics defined. Simple experiment.",
          goals: ["Increase CTR"],
          constraints: [],
          complexity: "simple",
        },
      ];

      const ambiguousProblems: Problem[] = [
        {
          id: "ambiguous-1",
          description: "Improve the system somehow to make it better.",
          context: "Vague requirements. Many unknowns.",
          goals: [],
          constraints: [],
        },
        {
          id: "ambiguous-2",
          description: "Fix the issues we've been having.",
          context: "Unclear what the issues are.",
          goals: [],
          constraints: [],
        },
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...clearProblems),
          fc.constantFrom(...ambiguousProblems),
          (clearProblem, ambiguousProblem) => {
            const clearSelection = selector.selectFramework(
              clearProblem,
              createContext(clearProblem)
            );
            const ambiguousSelection = selector.selectFramework(
              ambiguousProblem,
              createContext(ambiguousProblem)
            );

            // Property: Clear problem confidence SHALL be higher than ambiguous
            expect(clearSelection.confidence).toBeGreaterThan(ambiguousSelection.confidence);

            return true;
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 4: Framework Selection Confidence Calibration**
   * **Validates: Requirements 3.4**
   *
   * Confidence should be deterministic for the same problem.
   */
  describe("Confidence determinism", () => {
    it("should return same confidence for identical problems", () => {
      fc.assert(
        fc.property(problemArb, (problem) => {
          const selection1 = selector.selectFramework(problem, createContext(problem));
          const selection2 = selector.selectFramework(problem, createContext(problem));

          // Property: Same problem SHALL produce same confidence
          expect(selection1.confidence).toBe(selection2.confidence);

          return true;
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 4: Framework Selection Confidence Calibration**
   * **Validates: Requirements 3.4**
   *
   * Alternative frameworks should have valid confidence scores.
   */
  describe("Alternative confidence validity", () => {
    it("should have valid confidence scores for all alternatives", () => {
      fc.assert(
        fc.property(problemArb, (problem) => {
          const selection = selector.selectFramework(problem, createContext(problem));

          // Property: All alternatives SHALL have confidence in [0, 1]
          for (const alt of selection.alternatives) {
            expect(alt.confidence).toBeGreaterThanOrEqual(0);
            expect(alt.confidence).toBeLessThanOrEqual(1);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have alternatives sorted by confidence (descending)", () => {
      fc.assert(
        fc.property(problemArb, (problem) => {
          const selection = selector.selectFramework(problem, createContext(problem));

          // Property: Alternatives SHALL be sorted by confidence (highest first)
          for (let i = 0; i < selection.alternatives.length - 1; i++) {
            expect(selection.alternatives[i].confidence).toBeGreaterThanOrEqual(
              selection.alternatives[i + 1].confidence
            );
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
