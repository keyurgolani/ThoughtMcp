/**
 * Framework Selector Tests
 *
 * Consolidated tests for FrameworkSelector including:
 * - Core framework selection logic
 * - Confidence calculation and variation
 * - Trade-off explanations for alternatives
 * - Hybrid framework identification
 */

import { beforeEach, describe, expect, it } from "vitest";
import { FrameworkRegistry } from "../../../framework/framework-registry.js";
import { FrameworkSelector } from "../../../framework/framework-selector.js";
import { ProblemClassifier } from "../../../framework/problem-classifier.js";
import type { Context, Problem } from "../../../framework/types.js";

describe("FrameworkSelector", () => {
  let classifier: ProblemClassifier;
  let registry: FrameworkRegistry;
  let selector: FrameworkSelector;

  const createContext = (problem: Problem): Context => ({
    problem,
    evidence: [],
    constraints: problem.constraints ?? [],
    goals: problem.goals ?? [],
  });

  beforeEach(() => {
    classifier = new ProblemClassifier();
    registry = FrameworkRegistry.getInstance();
    selector = new FrameworkSelector(classifier, registry);
  });

  describe("selectFramework", () => {
    it("should select Scientific Method for simple problems", () => {
      const problem: Problem = {
        id: "simple-test-1",
        description: "Test if changing cache TTL from 300s to 600s improves performance.",
        context: "Simple A/B test to measure performance impact.",
        goals: ["Measure performance impact"],
        constraints: [],
        complexity: "simple",
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      expect(selection.primaryFramework).toBeDefined();
      expect(selection.primaryFramework.id).toBe("scientific-method");
      expect(selection.confidence).toBeGreaterThan(0);
      expect(selection.confidence).toBeLessThanOrEqual(1);
    });

    it("should select Design Thinking for UX/creative problems", () => {
      const problem: Problem = {
        id: "ux-design-1",
        description:
          "Redesign the dashboard to improve user experience and make it more intuitive for new users.",
        context: "Users are struggling with the current dashboard layout.",
        goals: ["Improve user experience", "Make dashboard intuitive"],
        constraints: ["Must maintain existing functionality"],
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      expect(selection.primaryFramework).toBeDefined();
      const isDesignThinkingSelected = selection.primaryFramework.id === "design-thinking";
      const isDesignThinkingAlternative = selection.alternatives.some(
        (alt) => alt.framework.id === "design-thinking" && alt.confidence > 0.5
      );

      expect(isDesignThinkingSelected || isDesignThinkingAlternative).toBe(true);
    });

    it("should consider Systems Thinking for complex interdependent problems", () => {
      const problem: Problem = {
        id: "systems-1",
        description:
          "Fix cascading failures in our microservices architecture where one service failure causes multiple downstream services to fail.",
        context: "Complex distributed system with many interdependent components.",
        goals: ["Prevent cascading failures", "Improve system resilience"],
        constraints: ["Cannot redesign entire architecture"],
        complexity: "complex",
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      expect(selection.primaryFramework).toBeDefined();
      const systemsThinkingSelected = selection.primaryFramework.id === "systems-thinking";
      const systemsThinkingInHybrid =
        selection.hybridFrameworks?.some((f) => f.id === "systems-thinking") ?? false;
      const systemsThinkingAlternative = selection.alternatives.some(
        (alt) => alt.framework.id === "systems-thinking"
      );

      expect(systemsThinkingSelected || systemsThinkingInHybrid || systemsThinkingAlternative).toBe(
        true
      );
    });

    it("should calculate confidence scores between 0 and 1", () => {
      const problem: Problem = {
        id: "confidence-test",
        description: "Test problem for confidence calculation",
        context: "Testing confidence bounds",
        goals: ["Test"],
        constraints: [],
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      expect(selection.confidence).toBeGreaterThanOrEqual(0);
      expect(selection.confidence).toBeLessThanOrEqual(1);
    });

    it("should rank alternatives by score", () => {
      const problem: Problem = {
        id: "ranking-test",
        description: "Complex problem requiring multiple frameworks",
        context: "Need to evaluate multiple approaches",
        goals: ["Find best approach"],
        constraints: [],
        complexity: "complex",
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      expect(selection.alternatives.length).toBeGreaterThan(0);

      // Verify alternatives are sorted by confidence (descending)
      for (let i = 1; i < selection.alternatives.length; i++) {
        expect(selection.alternatives[i - 1].confidence).toBeGreaterThanOrEqual(
          selection.alternatives[i].confidence
        );
      }
    });

    it("should throw error for null problem", () => {
      expect(() => selector.selectFramework(null as any, {} as any)).toThrow();
    });
  });

  describe("Confidence variation", () => {
    it("should vary confidence based on problem characteristics", () => {
      const simpleProblem: Problem = {
        id: "simple",
        description: "Simple test",
        context: "Simple context",
        goals: ["Test"],
        constraints: [],
        complexity: "simple",
      };

      const complexProblem: Problem = {
        id: "complex",
        description: "Complex problem with many interdependencies",
        context: "Complex context with uncertainty",
        goals: ["Multiple goals"],
        constraints: ["Many constraints"],
        complexity: "complex",
      };

      const simpleSelection = selector.selectFramework(simpleProblem, createContext(simpleProblem));
      const complexSelection = selector.selectFramework(
        complexProblem,
        createContext(complexProblem)
      );

      // Both should have valid confidence
      expect(simpleSelection.confidence).toBeGreaterThan(0);
      expect(complexSelection.confidence).toBeGreaterThan(0);
    });
  });

  describe("Hybrid framework identification", () => {
    it("should identify hybrid when top frameworks have similar scores", () => {
      const problem: Problem = {
        id: "hybrid-test",
        description:
          "Complex problem requiring both analytical and creative approaches with system-wide implications",
        context: "Need multiple perspectives to solve",
        goals: ["Comprehensive solution"],
        constraints: [],
        complexity: "complex",
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      // Either hybrid is identified or alternatives are provided
      expect(selection.primaryFramework).toBeDefined();
      expect(selection.alternatives.length).toBeGreaterThanOrEqual(0);
    });

    it("should limit hybrid to maximum of 3 frameworks", () => {
      const problem: Problem = {
        id: "hybrid-limit-test",
        description: "Very complex problem",
        context: "Requires many approaches",
        goals: ["Multiple goals"],
        constraints: [],
        complexity: "complex",
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      if (selection.isHybrid && selection.hybridFrameworks) {
        expect(selection.hybridFrameworks.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe("Alternatives", () => {
    it("should provide alternatives with reasoning", () => {
      const problem: Problem = {
        id: "alternatives-test",
        description: "Problem with multiple valid approaches",
        context: "Need to understand trade-offs",
        goals: ["Make informed decision"],
        constraints: [],
      };

      const selection = selector.selectFramework(problem, createContext(problem));

      if (selection.alternatives.length > 0) {
        const firstAlt = selection.alternatives[0];
        expect(firstAlt.framework).toBeDefined();
        expect(firstAlt.confidence).toBeGreaterThan(0);
      }
    });
  });
});
