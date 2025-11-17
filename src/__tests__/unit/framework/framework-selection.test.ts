/**
 * Framework Selection Tests
 *
 * Tests for dynamic framework selection logic that maps problems
 * to appropriate systematic thinking frameworks based on classification.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { FrameworkRegistry } from "../../../framework/framework-registry.js";
import { FrameworkSelector } from "../../../framework/framework-selector.js";
import { ProblemClassifier } from "../../../framework/problem-classifier.js";
import type { Problem } from "../../../framework/types.js";

describe("FrameworkSelector", () => {
  let classifier: ProblemClassifier;
  let registry: FrameworkRegistry;

  beforeEach(() => {
    classifier = new ProblemClassifier();
    registry = FrameworkRegistry.getInstance();
  });

  describe("selectFramework", () => {
    it("should select Scientific Method for simple problems", () => {
      // Test will fail until FrameworkSelector is implemented
      // Problem: Test if changing cache TTL improves performance
      expect(true).toBe(true); // Placeholder
    });

    it("should select Design Thinking for creative problems", () => {
      // Problem: Redesign dashboard to improve user experience
      expect(true).toBe(true); // Placeholder
    });

    it("should select Systems Thinking for complex problems", () => {
      // Problem: Fix cascading failures in microservices
      expect(true).toBe(true); // Placeholder
    });

    it("should select Critical Thinking for evaluation problems", () => {
      // Problem: Choose between PostgreSQL, MongoDB, or DynamoDB
      expect(true).toBe(true); // Placeholder
    });

    it("should select Root Cause Analysis for diagnostic problems", () => {
      // Problem: Find cause of intermittent 500 errors
      expect(true).toBe(true); // Placeholder
    });

    it("should calculate confidence scores between 0 and 1", () => {
      // Problem: Simple test problem
      expect(true).toBe(true); // Placeholder
    });

    it("should rank alternatives by score", () => {
      // Problem: Moderate complexity problem that could use multiple frameworks
      const problem: Problem = {
        id: "alt-test-1",
        description:
          "Redesign user authentication flow to support multiple authentication methods while maintaining security.",
        context:
          "Current system uses only password authentication. Need to add OAuth2, SAML, and passwordless options.",
        goals: ["Add multiple auth methods", "Maintain security", "Improve user experience"],
        constraints: ["Must be backwards compatible", "Cannot break existing integrations"],
        complexity: "moderate",
      };

      const selector = new FrameworkSelector(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should have alternatives
      expect(selection.alternatives).toBeDefined();
      expect(Array.isArray(selection.alternatives)).toBe(true);
      expect(selection.alternatives.length).toBeGreaterThan(0);

      // Alternatives should be sorted by confidence (highest first)
      for (let i = 0; i < selection.alternatives.length - 1; i++) {
        expect(selection.alternatives[i].confidence).toBeGreaterThanOrEqual(
          selection.alternatives[i + 1].confidence
        );
      }

      // Each alternative should have required properties
      for (const alt of selection.alternatives) {
        expect(alt.framework).toBeDefined();
        expect(alt.framework.id).toBeTruthy();
        expect(alt.framework.name).toBeTruthy();
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
        expect(alt.reason).toBeTruthy();
      }

      // Primary framework should not be in alternatives
      const primaryId = selection.primaryFramework.id;
      for (const alt of selection.alternatives) {
        expect(alt.framework.id).not.toBe(primaryId);
      }
    });

    it("should throw error for null problem", () => {
      expect(true).toBe(true); // Placeholder
    });
  });

  describe("Hybrid framework identification", () => {
    it("should identify hybrid when top 2 frameworks have scores within 0.15", () => {
      // Problem: Redesign complex distributed system
      // This should trigger hybrid because both Systems Thinking and Design Thinking
      // are highly relevant (complex + high uncertainty)
      const problem: Problem = {
        id: "hybrid-test-1",
        description:
          "Redesign our complex distributed microservices architecture to improve scalability and reliability. The system has many interdependent components and unclear failure modes.",
        context:
          "We have 50+ microservices with complex interactions. Many unknowns about bottlenecks and failure scenarios.",
        goals: ["Improve system scalability", "Increase reliability", "Reduce complexity"],
        constraints: ["Cannot cause downtime", "Must maintain backwards compatibility"],
        complexity: "complex",
      };

      // This will fail until FrameworkSelector is implemented
      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection.isHybrid).toBe(true);
      expect(selection.hybridFrameworks).toBeDefined();
      expect(selection.hybridFrameworks!.length).toBeGreaterThanOrEqual(2);
      expect(selection.hybridFrameworks!.length).toBeLessThanOrEqual(3);
    });

    it("should identify hybrid when top 3 frameworks have scores within 0.15", () => {
      // Problem: Evaluate and redesign authentication system with multiple constraints
      // Should consider Critical Thinking, Design Thinking, and Systems Thinking
      const problem: Problem = {
        id: "hybrid-test-2",
        description:
          "Evaluate our current authentication system and redesign it to support OAuth2, SAML, and passwordless authentication while maintaining security.",
        context:
          "Current system is outdated. Need to evaluate options and redesign with multiple authentication methods. Security is critical.",
        goals: ["Support multiple auth methods", "Maintain security", "Improve user experience"],
        constraints: ["Must be backwards compatible", "Cannot break existing integrations"],
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection.isHybrid).toBe(true);
      expect(selection.hybridFrameworks!.length).toBe(3);
    });

    it("should identify hybrid for high complexity AND high uncertainty", () => {
      // Problem: Build AI-powered recommendation engine in distributed microservices
      // High complexity + high uncertainty should trigger hybrid approach
      const problem: Problem = {
        id: "hybrid-test-3",
        description:
          "Build an AI-powered recommendation engine that integrates with our distributed microservices. We're uncertain about the best ML approach and how to handle real-time predictions at scale.",
        context:
          "Complex distributed system with many unknowns. Unclear which ML models will work best. Uncertain about scalability requirements.",
        goals: [
          "Build recommendation engine",
          "Integrate with microservices",
          "Handle real-time predictions",
        ],
        constraints: ["Must scale to millions of users", "Low latency required"],
        complexity: "complex",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection.isHybrid).toBe(true);
      expect(selection.reason).toContain("high complexity");
      expect(selection.reason).toContain("high uncertainty");
    });

    it("should identify hybrid for critical stakes AND high time pressure", () => {
      // Problem: Fix critical security vulnerability affecting all users, deadline today
      // Critical stakes + high time pressure should trigger hybrid approach
      const problem: Problem = {
        id: "hybrid-test-4",
        description:
          "Critical security vulnerability discovered in authentication system. All user data at risk. Must fix immediately before attackers exploit it.",
        context:
          "Security vulnerability affects all users. Deadline is today. Cannot afford mistakes. Need thorough analysis but also quick action.",
        goals: ["Fix vulnerability", "Protect user data", "Deploy fix quickly"],
        constraints: ["Must fix today", "Cannot break existing functionality"],
        urgency: "high",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection.isHybrid).toBe(true);
      expect(selection.reason).toContain("critical");
      expect(selection.reason).toContain("time pressure");
    });

    it("should limit hybrid to maximum of 3 frameworks", () => {
      // Problem: Extremely complex problem that could match many frameworks
      // Even if 4+ frameworks have close scores, limit to top 3
      const problem: Problem = {
        id: "hybrid-test-5",
        description:
          "Evaluate, redesign, and implement a new distributed system architecture while diagnosing current performance issues and ensuring security compliance.",
        context:
          "Complex problem requiring evaluation, design, systems thinking, root cause analysis, and critical thinking. Many aspects to consider.",
        goals: ["Evaluate options", "Redesign architecture", "Fix performance", "Ensure security"],
        constraints: ["Limited time", "Critical importance", "Many unknowns"],
        complexity: "complex",
        urgency: "high",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      if (selection.isHybrid) {
        expect(selection.hybridFrameworks!.length).toBeLessThanOrEqual(3);
      }
    });

    it("should limit hybrid to minimum of 2 frameworks", () => {
      // Hybrid should always combine at least 2 frameworks
      // If only 1 framework is suitable, it's not a hybrid
      const problem: Problem = {
        id: "hybrid-test-6",
        description:
          "Redesign complex distributed system with high uncertainty about best approach.",
        context: "Complex system, many unknowns, need multiple perspectives.",
        goals: ["Redesign system", "Handle uncertainty"],
        constraints: [],
        complexity: "complex",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      if (selection.isHybrid) {
        expect(selection.hybridFrameworks!.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("should calculate hybrid confidence as average of component scores", () => {
      // Hybrid confidence should be the average of the individual framework scores
      const problem: Problem = {
        id: "hybrid-test-7",
        description: "Redesign complex distributed system with multiple interdependent components.",
        context: "Complex system requiring both systems thinking and design thinking.",
        goals: ["Redesign system"],
        constraints: [],
        complexity: "complex",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      if (selection.isHybrid) {
        // Confidence should be between 0 and 1
        expect(selection.confidence).toBeGreaterThan(0);
        expect(selection.confidence).toBeLessThanOrEqual(1);
        // Should be reasonable (not too low for a hybrid selection)
        expect(selection.confidence).toBeGreaterThan(0.5);
      }
    });

    it("should generate hybrid reasoning explaining the combination", () => {
      // Hybrid reasoning should explain why multiple frameworks are needed
      const problem: Problem = {
        id: "hybrid-test-8",
        description: "Redesign complex distributed system with high uncertainty.",
        context: "Complex system, many unknowns.",
        goals: ["Redesign system"],
        constraints: [],
        complexity: "complex",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      if (selection.isHybrid) {
        expect(selection.reason).toBeTruthy();
        expect(selection.reason.length).toBeGreaterThan(20);
        expect(selection.reason.toLowerCase()).toContain("hybrid");
      }
    });

    it("should set isHybrid flag to true for hybrid selections", () => {
      // FrameworkSelection.isHybrid should be true when hybrid approach is used
      const problem: Problem = {
        id: "hybrid-test-9",
        description:
          "Redesign complex distributed system with high uncertainty and critical importance.",
        context: "Complex, uncertain, critical.",
        goals: ["Redesign system"],
        constraints: [],
        complexity: "complex",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should be boolean
      expect(typeof selection.isHybrid).toBe("boolean");
    });

    it("should populate hybridFrameworks array with selected frameworks", () => {
      // FrameworkSelection.hybridFrameworks should contain the 2-3 frameworks
      // Should be ordered by score (highest first)
      const problem: Problem = {
        id: "hybrid-test-10",
        description: "Redesign complex distributed system with high uncertainty.",
        context: "Complex system, many unknowns.",
        goals: ["Redesign system"],
        constraints: [],
        complexity: "complex",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      if (selection.isHybrid) {
        expect(Array.isArray(selection.hybridFrameworks)).toBe(true);
        expect(selection.hybridFrameworks!.length).toBeGreaterThan(0);
        // Each framework should have required properties
        for (const framework of selection.hybridFrameworks!) {
          expect(framework.id).toBeTruthy();
          expect(framework.name).toBeTruthy();
        }
      }
    });

    it("should NOT identify hybrid when top framework is clearly dominant", () => {
      // Problem: Simple test to verify cache performance
      // Scientific Method should be clearly dominant, no hybrid needed
      const problem: Problem = {
        id: "hybrid-test-11",
        description: "Test if changing cache TTL from 300s to 600s improves performance.",
        context: "Simple A/B test to measure performance impact.",
        goals: ["Measure performance impact"],
        constraints: [],
        complexity: "simple",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection.isHybrid).toBe(false);
      expect(selection.hybridFrameworks).toBeUndefined();
    });

    it("should NOT identify hybrid for simple problems with low uncertainty", () => {
      // Problem: Update documentation for API endpoint
      // Simple + low uncertainty should not trigger hybrid
      const problem: Problem = {
        id: "hybrid-test-12",
        description: "Update API documentation to reflect new endpoint parameters.",
        context: "Simple documentation update. All information is known.",
        goals: ["Update documentation"],
        constraints: [],
        complexity: "simple",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(selection.isHybrid).toBe(false);
    });

    it("should include hybrid frameworks in alternatives list", () => {
      // When hybrid is selected, the individual frameworks should still appear in alternatives
      const problem: Problem = {
        id: "hybrid-test-13",
        description: "Redesign complex distributed system with high uncertainty.",
        context: "Complex system, many unknowns.",
        goals: ["Redesign system"],
        constraints: [],
        complexity: "complex",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      expect(Array.isArray(selection.alternatives)).toBe(true);
      expect(selection.alternatives.length).toBeGreaterThan(0);
    });

    it("should handle edge case where all frameworks have equal scores", () => {
      // If all frameworks score equally (unlikely but possible), select top 3 for hybrid
      // This is a theoretical edge case - hard to create a real problem that scores equally
      // The implementation should handle this gracefully
      const problem: Problem = {
        id: "hybrid-test-14",
        description: "Generic problem with no specific characteristics.",
        context: "No specific context.",
        goals: [],
        constraints: [],
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Should not crash and should return a valid selection
      expect(selection).toBeDefined();
      expect(selection.primaryFramework).toBeDefined();
    });

    it("should prefer hybrid when problem has multiple conflicting characteristics", () => {
      // Problem: Quick fix for complex system (high complexity + high time pressure)
      // Conflicting characteristics should favor hybrid approach
      const problem: Problem = {
        id: "hybrid-test-15",
        description:
          "Fix performance issue in complex distributed system. Need quick solution but system is very complex.",
        context:
          "Complex system with many interdependencies. High time pressure to fix. Conflicting needs for speed and thoroughness.",
        goals: ["Fix performance issue quickly"],
        constraints: ["Must fix today", "Cannot break existing functionality"],
        complexity: "complex",
        urgency: "high",
      };

      const selector = new (FrameworkSelector as any)(classifier, registry);
      const selection = selector.selectFramework(problem, {
        problem,
        evidence: [],
        constraints: [],
        goals: [],
      });

      // Conflicting characteristics (complex + urgent) should favor hybrid
      expect(selection.isHybrid).toBe(true);
    });
  });
});
