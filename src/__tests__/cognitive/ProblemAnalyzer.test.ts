/**
 * Tests for ProblemAnalyzer
 */

import { beforeEach, describe, expect, it } from "vitest";
import { ProblemAnalyzer } from "../../cognitive/ProblemAnalyzer.js";
import { Problem } from "../../interfaces/systematic-thinking.js";

describe("ProblemAnalyzer", () => {
  let analyzer: ProblemAnalyzer;

  beforeEach(() => {
    analyzer = new ProblemAnalyzer();
  });

  describe("problem structure analysis", () => {
    it("should analyze problem structure", async () => {
      const problem: Problem = {
        description:
          "Build a scalable web application with user authentication and data analytics",
        domain: "technology",
        complexity: 0.7,
        uncertainty: 0.5,
        constraints: ["time_constraint", "budget_constraint"],
        stakeholders: ["users", "developers", "managers"],
        time_sensitivity: 0.6,
        resource_requirements: ["technical_resources", "human_resources"],
      };

      const structure = await analyzer.analyzeStructure(problem);

      expect(structure).toBeDefined();
      expect(structure.main_problem).toEqual(problem);
      expect(structure.sub_problems).toBeDefined();
      expect(structure.dependencies).toBeDefined();
      expect(structure.critical_path).toBeDefined();
      expect(structure.priority_ranking).toBeDefined();
    });

    it("should decompose complex problems into sub-problems", async () => {
      const complexProblem: Problem = {
        description:
          "Design and implement a comprehensive e-commerce platform with payment processing, inventory management, and user analytics",
        domain: "technology",
        complexity: 0.9,
        uncertainty: 0.6,
        constraints: ["time_constraint"],
        stakeholders: ["customers", "merchants", "developers"],
        time_sensitivity: 0.7,
        resource_requirements: ["technical_resources", "financial_resources"],
      };

      const subProblems = await analyzer.decomposeProblem(complexProblem);

      expect(subProblems.length).toBeGreaterThan(0);
      expect(subProblems.length).toBeLessThanOrEqual(8); // Max limit

      // Check that sub-problems have lower complexity
      subProblems.forEach((subProblem) => {
        expect(subProblem.complexity).toBeLessThanOrEqual(
          complexProblem.complexity
        );
        expect(subProblem.domain).toBe(complexProblem.domain);
      });
    });

    it("should identify dependencies between problems", async () => {
      const problems: Problem[] = [
        {
          description: "Plan the system architecture",
          domain: "technology",
          complexity: 0.6,
          uncertainty: 0.4,
          constraints: [],
          stakeholders: ["architects"],
          time_sensitivity: 0.8,
          resource_requirements: ["planning_resources"],
        },
        {
          description: "Implement the system",
          domain: "technology",
          complexity: 0.8,
          uncertainty: 0.5,
          constraints: [],
          stakeholders: ["developers"],
          time_sensitivity: 0.7,
          resource_requirements: ["development_resources"],
        },
      ];

      const dependencies = await analyzer.identifyDependencies(problems);

      expect(dependencies).toBeDefined();
      // Should identify that planning comes before implementation
      const planningDep = dependencies.find(
        (dep) =>
          dep.type === "prerequisite" &&
          dep.from.includes("plan") &&
          dep.to.includes("implement")
      );
      expect(planningDep).toBeDefined();
    });

    it("should calculate priorities correctly", async () => {
      const problems: Problem[] = [
        {
          description: "Low priority task",
          domain: "general",
          complexity: 0.3,
          uncertainty: 0.2,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.2,
          resource_requirements: [],
        },
        {
          description: "High priority urgent task",
          domain: "technology",
          complexity: 0.8,
          uncertainty: 0.7,
          constraints: ["time_constraint"],
          stakeholders: ["multiple", "stakeholders"],
          time_sensitivity: 0.9,
          resource_requirements: ["critical_resources"],
        },
      ];

      const priorities = await analyzer.calculatePriorities(problems, []);

      expect(priorities.length).toBe(2);
      expect(priorities[0].priority_score).toBeGreaterThan(
        priorities[1].priority_score
      );
      expect(priorities[0].reasoning).toContain("Priority score");
    });
  });

  describe("problem decomposition strategies", () => {
    it("should decompose by process", async () => {
      const problem: Problem = {
        description: "Plan, design, implement, test, and deploy a new system",
        domain: "technology",
        complexity: 0.7,
        uncertainty: 0.5,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const subProblems = await analyzer.decomposeProblem(problem);

      expect(subProblems.length).toBeGreaterThan(0);

      const processKeywords = ["plan", "design", "implement", "test", "deploy"];
      const foundKeywords = subProblems.some((sub) =>
        processKeywords.some((keyword) =>
          sub.description.toLowerCase().includes(keyword)
        )
      );
      expect(foundKeywords).toBe(true);
    });

    it("should decompose by component", async () => {
      const problem: Problem = {
        description:
          "Build frontend interface, backend API, and database system",
        domain: "technology",
        complexity: 0.8,
        uncertainty: 0.6,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const subProblems = await analyzer.decomposeProblem(problem);

      expect(subProblems.length).toBeGreaterThan(0);

      const componentKeywords = ["frontend", "backend", "database"];
      const foundComponents = subProblems.some((sub) =>
        componentKeywords.some((keyword) =>
          sub.description.toLowerCase().includes(keyword)
        )
      );
      expect(foundComponents).toBe(true);
    });

    it("should decompose by stakeholder", async () => {
      const problem: Problem = {
        description: "Address requirements for users, developers, and managers",
        domain: "business",
        complexity: 0.6,
        uncertainty: 0.5,
        constraints: [],
        stakeholders: ["users", "developers", "managers"],
        time_sensitivity: 0.5,
        resource_requirements: [],
      };

      const subProblems = await analyzer.decomposeProblem(problem);

      expect(subProblems.length).toBeGreaterThan(0);

      // Should create stakeholder-specific sub-problems
      const stakeholderProblems = subProblems.filter(
        (sub) => sub.stakeholders.length === 1
      );
      expect(stakeholderProblems.length).toBeGreaterThan(0);
    });

    it("should decompose by time phase", async () => {
      const problem: Problem = {
        description:
          "Solve system issues with immediate, short-term, and long-term solutions",
        domain: "technology",
        complexity: 0.7,
        uncertainty: 0.6,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.8,
        resource_requirements: [],
      };

      const subProblems = await analyzer.decomposeProblem(problem);

      expect(subProblems.length).toBeGreaterThan(0);

      const timePhases = ["immediate", "short-term", "long-term"];
      const foundPhases = subProblems.some((sub) =>
        timePhases.some((phase) =>
          sub.description.toLowerCase().includes(phase)
        )
      );
      expect(foundPhases).toBe(true);
    });
  });

  describe("dependency analysis", () => {
    it("should identify prerequisite dependencies", async () => {
      const problems: Problem[] = [
        {
          description: "Research and analyze requirements",
          domain: "technology",
          complexity: 0.5,
          uncertainty: 0.4,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.6,
          resource_requirements: [],
        },
        {
          description: "Develop solution based on analysis",
          domain: "technology",
          complexity: 0.7,
          uncertainty: 0.5,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.7,
          resource_requirements: [],
        },
      ];

      const dependencies = await analyzer.identifyDependencies(problems);

      const prerequisiteDeps = dependencies.filter(
        (dep) => dep.type === "prerequisite"
      );
      expect(prerequisiteDeps.length).toBeGreaterThan(0);
    });

    it("should identify constraint dependencies", async () => {
      const problems: Problem[] = [
        {
          description: "Task with budget constraint",
          domain: "business",
          complexity: 0.5,
          uncertainty: 0.4,
          constraints: ["budget_constraint"],
          stakeholders: [],
          time_sensitivity: 0.5,
          resource_requirements: [],
        },
        {
          description: "Another task with budget constraint",
          domain: "business",
          complexity: 0.6,
          uncertainty: 0.5,
          constraints: ["budget_constraint"],
          stakeholders: [],
          time_sensitivity: 0.6,
          resource_requirements: [],
        },
      ];

      const dependencies = await analyzer.identifyDependencies(problems);

      const constraintDeps = dependencies.filter(
        (dep) => dep.type === "constraint"
      );
      expect(constraintDeps.length).toBeGreaterThan(0);
    });

    it("should identify resource dependencies", async () => {
      const problems: Problem[] = [
        {
          description: "Task requiring technical resources",
          domain: "technology",
          complexity: 0.6,
          uncertainty: 0.5,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.5,
          resource_requirements: ["technical_resources"],
        },
        {
          description: "Another task requiring technical resources",
          domain: "technology",
          complexity: 0.7,
          uncertainty: 0.6,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.6,
          resource_requirements: ["technical_resources"],
        },
      ];

      const dependencies = await analyzer.identifyDependencies(problems);

      const resourceDeps = dependencies.filter(
        (dep) => dep.type === "resource"
      );
      expect(resourceDeps.length).toBeGreaterThan(0);
    });

    it("should identify temporal dependencies", async () => {
      const problems: Problem[] = [
        {
          description: "Urgent task in same domain",
          domain: "technology",
          complexity: 0.6,
          uncertainty: 0.5,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.9,
          resource_requirements: [],
        },
        {
          description: "Another urgent task in same domain",
          domain: "technology",
          complexity: 0.7,
          uncertainty: 0.6,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.8,
          resource_requirements: [],
        },
      ];

      const dependencies = await analyzer.identifyDependencies(problems);

      const temporalDeps = dependencies.filter(
        (dep) => dep.type === "temporal"
      );
      expect(temporalDeps.length).toBeGreaterThan(0);
    });
  });

  describe("priority calculation", () => {
    it("should prioritize complex problems higher", async () => {
      const problems: Problem[] = [
        {
          description: "Simple task",
          domain: "general",
          complexity: 0.2,
          uncertainty: 0.3,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.3,
          resource_requirements: [],
        },
        {
          description: "Complex task",
          domain: "technology",
          complexity: 0.9,
          uncertainty: 0.7,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.3,
          resource_requirements: [],
        },
      ];

      const priorities = await analyzer.calculatePriorities(problems, []);

      expect(priorities[0].priority_score).toBeGreaterThan(
        priorities[1].priority_score
      );
    });

    it("should prioritize time-sensitive problems higher", async () => {
      const problems: Problem[] = [
        {
          description: "Non-urgent task",
          domain: "general",
          complexity: 0.5,
          uncertainty: 0.5,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.2,
          resource_requirements: [],
        },
        {
          description: "Urgent task",
          domain: "general",
          complexity: 0.5,
          uncertainty: 0.5,
          constraints: [],
          stakeholders: [],
          time_sensitivity: 0.9,
          resource_requirements: [],
        },
      ];

      const priorities = await analyzer.calculatePriorities(problems, []);

      expect(priorities[0].priority_score).toBeGreaterThan(
        priorities[1].priority_score
      );
    });

    it("should provide reasoning for priorities", async () => {
      const problem: Problem = {
        description: "Complex urgent task with multiple stakeholders",
        domain: "technology",
        complexity: 0.8,
        uncertainty: 0.7,
        constraints: [],
        stakeholders: ["user1", "user2", "user3"],
        time_sensitivity: 0.9,
        resource_requirements: [],
      };

      const priorities = await analyzer.calculatePriorities([problem], []);

      expect(priorities[0].reasoning).toBeDefined();
      expect(priorities[0].reasoning).toContain("Priority score");
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

      const structure = await analyzer.analyzeStructure(problem);
      expect(structure).toBeDefined();
    });

    it("should handle single problem", async () => {
      const problem: Problem = {
        description: "Single simple task",
        domain: "general",
        complexity: 0.3,
        uncertainty: 0.3,
        constraints: [],
        stakeholders: [],
        time_sensitivity: 0.3,
        resource_requirements: [],
      };

      const structure = await analyzer.analyzeStructure(problem);
      expect(structure.main_problem).toEqual(problem);
      expect(structure.sub_problems).toBeDefined();
    });

    it("should limit sub-problems to maximum", async () => {
      const complexProblem: Problem = {
        description:
          "Extremely complex problem with plan design implement test deploy analyze optimize monitor maintain upgrade scale secure backup restore document train support market sell distribute manage coordinate supervise evaluate improve",
        domain: "technology",
        complexity: 1.0,
        uncertainty: 1.0,
        constraints: ["time", "budget", "resource", "technical"],
        stakeholders: [
          "users",
          "developers",
          "managers",
          "customers",
          "partners",
        ],
        time_sensitivity: 1.0,
        resource_requirements: [
          "human",
          "technical",
          "financial",
          "time",
          "information",
        ],
      };

      const subProblems = await analyzer.decomposeProblem(complexProblem);
      expect(subProblems.length).toBeLessThanOrEqual(8);
    });
  });
});
