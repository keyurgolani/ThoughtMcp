/**
 * Tests for ProblemClassifier
 *
 * Following TDD methodology - these tests are written first and should fail
 * until the ProblemClassifier implementation is complete.
 *
 * Tests cover all four classification dimensions:
 * - Complexity (simple/moderate/complex)
 * - Uncertainty (low/medium/high)
 * - Stakes (routine/important/critical)
 * - Time Pressure (none/moderate/high)
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ProblemClassifier } from "../../../framework/problem-classifier.js";
import type { Problem } from "../../../framework/types.js";

describe("ProblemClassifier", () => {
  let classifier: ProblemClassifier;

  beforeEach(() => {
    classifier = new ProblemClassifier();
  });

  describe("Complexity Assessment", () => {
    it("should classify simple problems correctly", () => {
      const problem: Problem = {
        id: "test-1",
        description: "Calculate the sum of two numbers",
        context: "Basic arithmetic operation",
        goals: ["Add two numbers"],
        constraints: [],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.complexity).toBe("simple");
      expect(classification.reasoning.complexityReason).toContain("single");
      expect(classification.confidence).toBeGreaterThan(0.7);
    });

    it("should classify moderate problems correctly", () => {
      const problem: Problem = {
        id: "test-2",
        description: "Design a user authentication system with email and password",
        context: "Web application security",
        goals: ["Secure login", "Password hashing", "Session management"],
        constraints: ["Must use HTTPS", "Password requirements"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.complexity).toBe("moderate");
      expect(classification.reasoning.complexityReason).toContain("multiple");
      expect(classification.confidence).toBeGreaterThan(0.6);
    });

    it("should classify complex problems correctly", () => {
      const problem: Problem = {
        id: "test-3",
        description:
          "Build a distributed microservices architecture with event sourcing, CQRS, and eventual consistency",
        context: "Large-scale enterprise system with multiple teams and services",
        goals: [
          "High availability",
          "Scalability",
          "Data consistency",
          "Service isolation",
          "Event replay",
          "Monitoring",
        ],
        constraints: [
          "Must handle 10k requests/sec",
          "99.99% uptime",
          "Cross-region deployment",
          "Legacy system integration",
          "Compliance requirements",
        ],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.complexity).toBe("complex");
      expect(classification.reasoning.complexityReason).toContain("interdependent");
      expect(classification.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Uncertainty Evaluation", () => {
    it("should classify low uncertainty problems correctly", () => {
      const problem: Problem = {
        id: "test-4",
        description: "Implement a sorting algorithm for a known dataset",
        context: "Well-defined problem with clear requirements",
        goals: ["Sort array in ascending order"],
        constraints: ["Use O(n log n) algorithm"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.uncertainty).toBe("low");
      expect(classification.reasoning.uncertaintyReason).toContain("known");
      expect(classification.confidence).toBeGreaterThan(0.7);
    });

    it("should classify medium uncertainty problems correctly", () => {
      const problem: Problem = {
        id: "test-5",
        description: "Optimize database query performance for user dashboard",
        context:
          "Some performance issues reported, unclear root cause, need to investigate and improve",
        goals: ["Reduce query time", "Improve user experience"],
        constraints: ["Cannot change database schema"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.uncertainty).toBe("medium");
      expect(classification.reasoning.uncertaintyReason).toContain("uncertainty");
      expect(classification.confidence).toBeGreaterThan(0.5);
    });

    it("should classify high uncertainty problems correctly", () => {
      const problem: Problem = {
        id: "test-6",
        description: "Predict user behavior in a new market with limited data",
        context: "Entering unfamiliar market, unclear user preferences, unknown competitors",
        goals: ["Understand user needs", "Predict adoption rate"],
        constraints: ["Limited budget for research"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.uncertainty).toBe("high");
      expect(classification.reasoning.uncertaintyReason).toContain("unknown");
      expect(classification.confidence).toBeGreaterThan(0.4);
    });
  });

  describe("Stakes Assessment", () => {
    it("should classify routine stakes problems correctly", () => {
      const problem: Problem = {
        id: "test-7",
        description: "Update documentation for internal tool",
        context: "Minor documentation improvements",
        goals: ["Clarify usage instructions"],
        constraints: [],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.stakes).toBe("routine");
      expect(classification.reasoning.stakesReason).toContain("low impact");
      expect(classification.confidence).toBeGreaterThan(0.7);
    });

    it("should classify important stakes problems correctly", () => {
      const problem: Problem = {
        id: "test-8",
        description: "Redesign customer onboarding flow",
        context: "Important improvement for user experience affecting all new customers and teams",
        goals: ["Reduce onboarding time", "Increase completion rate"],
        constraints: ["Must maintain existing features"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.stakes).toBe("important");
      expect(classification.reasoning.stakesReason).toContain("moderate impact");
      expect(classification.confidence).toBeGreaterThan(0.6);
    });

    it("should classify critical stakes problems correctly", () => {
      const problem: Problem = {
        id: "test-9",
        description: "Fix critical security vulnerability in payment system",
        context:
          "Active exploit detected, all customer data at risk, affects all users and teams, regulatory implications, permanent damage possible",
        goals: ["Patch vulnerability", "Protect customer data", "Avoid fines"],
        constraints: ["Must deploy within 24 hours"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.stakes).toBe("critical");
      expect(classification.reasoning.stakesReason).toContain("high impact");
      expect(classification.confidence).toBeGreaterThan(0.7);
    });
  });

  describe("Time Pressure Evaluation", () => {
    it("should classify no time pressure problems correctly", () => {
      const problem: Problem = {
        id: "test-10",
        description: "Research new technology for future projects",
        context: "Long-term planning, no immediate deadline",
        goals: ["Evaluate options", "Create recommendation"],
        constraints: [],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.timePressure).toBe("none");
      expect(classification.reasoning.timePressureReason).toContain("no deadline");
      expect(classification.confidence).toBeGreaterThan(0.7);
    });

    it("should classify moderate time pressure problems correctly", () => {
      const problem: Problem = {
        id: "test-11",
        description: "Prepare quarterly business review presentation",
        context: "Presentation due in 2 weeks",
        goals: ["Summarize Q3 results", "Present recommendations"],
        constraints: ["Must include all departments"],
        urgency: "medium",
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.timePressure).toBe("moderate");
      expect(classification.reasoning.timePressureReason).toContain("medium");
      expect(classification.confidence).toBeGreaterThan(0.6);
    });

    it("should classify high time pressure problems correctly", () => {
      const problem: Problem = {
        id: "test-12",
        description: "Respond to production outage affecting all users",
        context: "System down, customers unable to access service",
        goals: ["Restore service", "Identify root cause"],
        constraints: ["Must resolve within 1 hour SLA"],
        urgency: "high",
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.timePressure).toBe("high");
      expect(classification.reasoning.timePressureReason).toContain("high");
      expect(classification.confidence).toBeGreaterThan(0.6);
    });
  });

  describe("Complete Classification", () => {
    it("should provide complete classification with all dimensions", () => {
      const problem: Problem = {
        id: "test-13",
        description: "Implement new feature for mobile app",
        context: "User-requested feature with moderate complexity",
        goals: ["Add feature", "Maintain performance"],
        constraints: ["iOS and Android support"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification).toHaveProperty("complexity");
      expect(classification).toHaveProperty("uncertainty");
      expect(classification).toHaveProperty("stakes");
      expect(classification).toHaveProperty("timePressure");
      expect(classification).toHaveProperty("confidence");
      expect(classification).toHaveProperty("reasoning");
      expect(classification).toHaveProperty("timestamp");

      expect(classification.reasoning).toHaveProperty("complexityReason");
      expect(classification.reasoning).toHaveProperty("uncertaintyReason");
      expect(classification.reasoning).toHaveProperty("stakesReason");
      expect(classification.reasoning).toHaveProperty("timePressureReason");

      expect(classification.confidence).toBeGreaterThanOrEqual(0);
      expect(classification.confidence).toBeLessThanOrEqual(1);
      expect(classification.timestamp).toBeInstanceOf(Date);
    });
  });

  describe("Confidence Scoring", () => {
    it("should have high confidence for well-defined problems", () => {
      const problem: Problem = {
        id: "test-14",
        description: "Calculate monthly revenue from sales data",
        context: "Standard financial reporting",
        goals: ["Sum all sales", "Generate report"],
        constraints: ["Use existing data format"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.confidence).toBeGreaterThanOrEqual(0.75);
    });

    it("should have lower confidence for vague problems", () => {
      const problem: Problem = {
        id: "test-15",
        description: "Make the system better",
        context: "General improvement needed",
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.confidence).toBeLessThanOrEqual(0.7);
    });

    it("should have medium confidence for partially defined problems", () => {
      const problem: Problem = {
        id: "test-16",
        description: "Improve application performance",
        context: "Users reporting slowness",
        goals: ["Reduce load time"],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.confidence).toBeGreaterThan(0.5);
      expect(classification.confidence).toBeLessThan(0.8);
    });
  });

  describe("Performance", () => {
    it("should classify problems in less than 1-2 seconds", () => {
      const problem: Problem = {
        id: "test-17",
        description: "Complex problem with many goals and constraints for performance testing",
        context: "Testing classification speed",
        goals: Array(10).fill("Goal"),
        constraints: Array(10).fill("Constraint"),
      };

      const startTime = Date.now();
      classifier.classifyProblem(problem);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(2000); // Less than 2 seconds
    });

    it("should handle batch classification efficiently", () => {
      const problems: Problem[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `test-batch-${i}`,
          description: `Problem ${i}`,
          context: "Batch testing",
          goals: ["Goal 1", "Goal 2"],
        }));

      const startTime = Date.now();
      problems.forEach((problem) => classifier.classifyProblem(problem));
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Less than 5 seconds for 10 problems
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty problem description", () => {
      const problem: Problem = {
        id: "test-18",
        description: "",
        context: "",
      };

      expect(() => {
        classifier.classifyProblem(problem);
      }).toThrow("Problem must have id and description");
    });

    it("should handle minimal problem information", () => {
      const problem: Problem = {
        id: "test-19",
        description: "Do something",
        context: "",
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification).toBeDefined();
      expect(classification.complexity).toBeDefined();
      expect(classification.uncertainty).toBeDefined();
      expect(classification.stakes).toBeDefined();
      expect(classification.timePressure).toBeDefined();
    });

    it("should handle problems with only description", () => {
      const problem: Problem = {
        id: "test-20",
        description: "Solve the problem",
        context: "",
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification).toBeDefined();
      expect(classification.confidence).toBeLessThan(0.7);
    });

    it("should handle problems with missing optional fields", () => {
      const problem: Problem = {
        id: "test-21",
        description: "Complete the task",
        context: "Some context",
        // No goals, constraints, urgency, complexity
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification).toBeDefined();
      expect(classification.complexity).toBeDefined();
      expect(classification.uncertainty).toBeDefined();
      expect(classification.stakes).toBeDefined();
      expect(classification.timePressure).toBeDefined();
    });
  });

  describe("Caching", () => {
    it("should cache classification results for identical problems", () => {
      const problem: Problem = {
        id: "test-22",
        description: "Same problem for caching test",
        context: "Testing cache",
        goals: ["Goal 1"],
      };

      const firstClassification = classifier.classifyProblem(problem);
      const secondClassification = classifier.classifyProblem(problem);

      expect(firstClassification.complexity).toBe(secondClassification.complexity);
      expect(firstClassification.uncertainty).toBe(secondClassification.uncertainty);
      expect(firstClassification.stakes).toBe(secondClassification.stakes);
      expect(firstClassification.timePressure).toBe(secondClassification.timePressure);
    });

    it("should return different results for different problems", () => {
      const problem1: Problem = {
        id: "test-23",
        description: "Simple problem",
        context: "Easy task",
        goals: ["One goal"],
      };

      const problem2: Problem = {
        id: "test-24",
        description: "Complex problem with many interdependent goals and constraints",
        context: "Difficult task",
        goals: ["Goal 1", "Goal 2", "Goal 3", "Goal 4"],
        constraints: ["Constraint 1", "Constraint 2", "Constraint 3"],
      };

      const classification1 = classifier.classifyProblem(problem1);
      const classification2 = classifier.classifyProblem(problem2);

      expect(classification1.complexity).not.toBe(classification2.complexity);
    });
  });

  describe("Error Handling", () => {
    it("should handle null or undefined gracefully", () => {
      expect(() => {
        classifier.classifyProblem(null as any);
      }).toThrow();
    });

    it("should handle invalid problem structure", () => {
      const invalidProblem = {
        // Missing required fields
        description: "Test",
      } as any;

      expect(() => {
        classifier.classifyProblem(invalidProblem);
      }).toThrow();
    });
  });

  describe("Time Pressure Edge Cases", () => {
    it("should detect urgency negation keywords", () => {
      const problem: Problem = {
        id: "test-negation-1",
        description: "This is not urgent and no immediate action needed",
        context: "Long-term planning with no urgent requirements",
        goals: ["Plan for future"],
      };

      const classification = classifier.classifyProblem(problem);

      // Should not classify as high pressure due to negation
      expect(classification.timePressure).not.toBe("high");
      expect(classification.reasoning.timePressureReason).toBeDefined();
    });

    it("should handle 'not immediate' negation", () => {
      const problem: Problem = {
        id: "test-negation-2",
        description: "This task is not immediate, we can take our time",
        context: "Future consideration",
        goals: ["Research options"],
      };

      const classification = classifier.classifyProblem(problem);

      // Should not classify as high pressure due to negation
      expect(classification.timePressure).not.toBe("high");
    });

    it("should handle 'long-term' keyword", () => {
      const problem: Problem = {
        id: "test-negation-3",
        description: "This is a long-term strategic initiative",
        context: "Future planning",
        goals: ["Develop strategy"],
      };

      const classification = classifier.classifyProblem(problem);

      // Long-term should reduce urgency
      expect(classification.timePressure).not.toBe("high");
    });

    it("should handle 'future' keyword", () => {
      const problem: Problem = {
        id: "test-negation-4",
        description: "This is for future consideration",
        context: "No current deadline",
        goals: ["Evaluate options"],
      };

      const classification = classifier.classifyProblem(problem);

      // Future keyword should reduce urgency
      expect(classification.timePressure).not.toBe("high");
    });

    it("should detect deadline negation keywords", () => {
      const problem: Problem = {
        id: "test-deadline-negation-1",
        description: "Complete this task with no deadline",
        context: "Flexible timeline",
        goals: ["Complete when possible"],
      };

      const classification = classifier.classifyProblem(problem);

      // No deadline should result in low time pressure
      expect(classification.reasoning.timePressureReason).toContain("no deadline");
    });

    it("should detect 'no immediate deadline' negation", () => {
      const problem: Problem = {
        id: "test-deadline-negation-2",
        description: "This has no immediate deadline",
        context: "Can be done later",
        goals: ["Complete eventually"],
      };

      const classification = classifier.classifyProblem(problem);

      // No immediate deadline should reduce urgency
      expect(classification.timePressure).not.toBe("high");
    });

    it("should detect 'no specific deadline' negation", () => {
      const problem: Problem = {
        id: "test-deadline-negation-3",
        description: "There is no specific deadline for this",
        context: "Flexible schedule",
        goals: ["Complete when ready"],
      };

      const classification = classifier.classifyProblem(problem);

      // No specific deadline should reduce urgency
      expect(classification.timePressure).not.toBe("high");
    });

    it("should calculate days until deadline for 'immediate' keyword", () => {
      const problem: Problem = {
        id: "test-days-1",
        description: "This needs immediate attention with critical deadline",
        context: "Critical issue requiring immediate action",
        goals: ["Fix now"],
        urgency: "high",
      };

      const classification = classifier.classifyProblem(problem);

      // Immediate with explicit high urgency should be high pressure
      expect(classification.timePressure).toBe("high");
    });

    it("should calculate days until deadline for 'now' keyword", () => {
      const problem: Problem = {
        id: "test-days-2",
        description: "We need this now with urgent deadline",
        context: "Urgent request requiring immediate completion",
        goals: ["Complete immediately"],
        urgency: "high",
      };

      const classification = classifier.classifyProblem(problem);

      // Now with explicit high urgency should be high pressure
      expect(classification.timePressure).toBe("high");
    });

    it("should calculate days until deadline for 'outage' keyword", () => {
      const problem: Problem = {
        id: "test-days-3",
        description: "System outage affecting users",
        context: "Production issue",
        goals: ["Restore service"],
      };

      const classification = classifier.classifyProblem(problem);

      // Outage keyword should be detected
      expect(classification.reasoning.timePressureReason).toBeDefined();
    });

    it("should calculate days until deadline for 'today' keyword", () => {
      const problem: Problem = {
        id: "test-days-4",
        description: "This must be done today with urgent deadline",
        context: "Same-day deadline requiring immediate action",
        goals: ["Complete today"],
        urgency: "high",
      };

      const classification = classifier.classifyProblem(problem);

      // Today with explicit high urgency should be high pressure
      expect(classification.timePressure).toBe("high");
    });

    it("should calculate days until deadline for 'within 24 hours' keyword", () => {
      const problem: Problem = {
        id: "test-days-5",
        description: "Complete within 24 hours with urgent deadline",
        context: "Tight deadline requiring immediate action",
        goals: ["Finish quickly"],
        urgency: "high",
      };

      const classification = classifier.classifyProblem(problem);

      // Within 24 hours with explicit high urgency should be high pressure
      expect(classification.timePressure).toBe("high");
    });

    it("should calculate days until deadline for 'week' keyword", () => {
      const problem: Problem = {
        id: "test-days-6",
        description: "This is due in a week",
        context: "One week deadline",
        goals: ["Complete in 7 days"],
      };

      const classification = classifier.classifyProblem(problem);

      // Week deadline should be moderate or none
      expect(["none", "moderate"]).toContain(classification.timePressure);
    });

    it("should calculate days until deadline for '2 weeks' keyword", () => {
      const problem: Problem = {
        id: "test-days-7",
        description: "Deadline is in 2 weeks",
        context: "Two week timeline",
        goals: ["Complete in 14 days"],
      };

      const classification = classifier.classifyProblem(problem);

      // 2 weeks deadline should be moderate or none
      expect(["none", "moderate"]).toContain(classification.timePressure);
    });

    it("should calculate days until deadline for 'month' keyword", () => {
      const problem: Problem = {
        id: "test-days-8",
        description: "This is due in a month",
        context: "Monthly deadline",
        goals: ["Complete in 30 days"],
      };

      const classification = classifier.classifyProblem(problem);

      // Month deadline should be none or moderate
      expect(["none", "moderate"]).toContain(classification.timePressure);
    });
  });

  describe("Uncertainty Edge Cases", () => {
    it("should assess consistency for high uncertainty with no factors", () => {
      const problem: Problem = {
        id: "test-consistency-1",
        description: "Unclear problem with unknown requirements",
        context: "Very uncertain situation with unclear goals",
        goals: [],
      };

      const classification = classifier.classifyProblem(problem);

      expect(classification.uncertainty).toBe("high");
      // Confidence should be defined and reasonable
      expect(classification.confidence).toBeGreaterThan(0);
      expect(classification.confidence).toBeLessThanOrEqual(1);
    });
  });
});
