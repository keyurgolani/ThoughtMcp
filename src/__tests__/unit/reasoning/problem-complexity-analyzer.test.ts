/**
 * Unit tests for ProblemComplexityAnalyzer
 *
 * Tests complexity analysis based on word count and patterns,
 * and scaling of analysis depth based on complexity.
 *
 * Requirements: 15.1, 15.2
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  ComplexityLevel,
  ProblemComplexityAnalyzer,
} from "../../../reasoning/problem-complexity-analyzer.js";

describe("ProblemComplexityAnalyzer", () => {
  let analyzer: ProblemComplexityAnalyzer;

  beforeEach(() => {
    analyzer = new ProblemComplexityAnalyzer();
  });

  describe("Trivial Problem Detection", () => {
    it("should classify 'What is 2+2?' as trivial", () => {
      const result = analyzer.analyze("What is 2+2?");

      expect(result.level).toBe(ComplexityLevel.TRIVIAL);
      expect(result.score).toBeLessThan(0.2);
      expect(result.recommendedDepth).toBe(1);
      expect(result.recommendedSteps).toBe(1);
      expect(result.shouldDecompose).toBe(false);
    });

    it("should classify simple arithmetic questions as trivial", () => {
      const trivialProblems = [
        "What is 5 + 3?",
        "How much is 10 - 4?",
        "What is 6 * 7?",
        "What's the sum of 15 and 20?",
      ];

      for (const problem of trivialProblems) {
        const result = analyzer.analyze(problem);
        expect(result.level).toBe(ComplexityLevel.TRIVIAL);
        expect(result.shouldDecompose).toBe(false);
      }
    });

    it("should classify simple definition questions as trivial", () => {
      const result = analyzer.analyze("Define recursion.");

      expect(result.level).toBe(ComplexityLevel.TRIVIAL);
      expect(result.recommendedSteps).toBeLessThanOrEqual(2);
    });

    it("should classify yes/no questions as trivial", () => {
      const result = analyzer.analyze("Is JavaScript a programming language?");

      expect(result.level).toBe(ComplexityLevel.TRIVIAL);
    });
  });

  describe("Simple Problem Detection", () => {
    it("should classify short single-question problems as simple or trivial", () => {
      const result = analyzer.analyze("How do I create a new file in Python?");

      // Short how-to questions can be trivial or simple depending on word count
      expect([ComplexityLevel.TRIVIAL, ComplexityLevel.SIMPLE]).toContain(result.level);
      expect(result.recommendedDepth).toBeLessThanOrEqual(2);
    });

    it("should classify basic how-to questions as simple or trivial", () => {
      const simpleProblems = [
        "How do I install npm packages?",
        "What is the difference between let and const?",
        "Explain what a function is.",
      ];

      for (const problem of simpleProblems) {
        const result = analyzer.analyze(problem);
        expect([ComplexityLevel.TRIVIAL, ComplexityLevel.SIMPLE]).toContain(result.level);
        expect(result.recommendedDepth).toBeLessThanOrEqual(2);
      }
    });
  });

  describe("Moderate Problem Detection", () => {
    it("should classify multi-part questions with technical terms as moderate or higher", () => {
      const result = analyzer.analyze(
        "How do I set up a Node.js project with TypeScript, configure ESLint for code quality, and implement a CI/CD pipeline with automated testing and deployment to production?"
      );

      expect([ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]).toContain(result.level);
      expect(result.score).toBeGreaterThanOrEqual(0.35);
    });

    it("should classify problems with multiple technical terms as at least simple", () => {
      const result = analyzer.analyze(
        "How do I implement authentication with JWT tokens in a REST API, including refresh token rotation, secure cookie storage, and OAuth2 integration?"
      );

      // Problems with technical terms should be at least simple, possibly moderate or complex
      expect([ComplexityLevel.SIMPLE, ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]).toContain(
        result.level
      );
      expect(result.factors.technicalDensity).toBeGreaterThan(0);
    });
  });

  describe("Complex Problem Detection", () => {
    it("should classify system design problems as moderate or complex", () => {
      const result = analyzer.analyze(
        "Design a scalable microservices architecture for an e-commerce platform that handles millions of users, with considerations for database sharding, caching strategies, and fault tolerance."
      );

      // System design problems should be at least moderate
      expect([ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]).toContain(result.level);
      expect(result.score).toBeGreaterThanOrEqual(0.35);
      expect(result.recommendedDepth).toBeGreaterThanOrEqual(3);
    });

    it("should classify problems with trade-offs as moderate or complex", () => {
      const result = analyzer.analyze(
        "Compare and contrast SQL vs NoSQL databases, analyzing the trade-offs between consistency, availability, and partition tolerance for different use cases."
      );

      expect([ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]).toContain(result.level);
      expect(result.factors.hasTradeoffs).toBe(true);
    });

    it("should classify multi-domain problems as moderate or complex", () => {
      const result = analyzer.analyze(
        "Build a customer-facing dashboard that displays real-time analytics data with proper authentication, considering both user experience and system performance."
      );

      expect([ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]).toContain(result.level);
      expect(result.factors.multiDomain).toBe(true);
    });
  });

  describe("Complexity Factors", () => {
    it("should count meaningful words correctly", () => {
      const result = analyzer.analyze("Build a scalable web application");

      expect(result.factors.wordCount).toBeGreaterThan(0);
      // Should exclude stop words like "a"
      expect(result.factors.wordCount).toBeLessThan(5);
    });

    it("should detect multiple questions", () => {
      const result = analyzer.analyze(
        "What is the best approach? How should I implement it? What are the risks?"
      );

      expect(result.factors.questionCount).toBeGreaterThanOrEqual(3);
    });

    it("should calculate technical density", () => {
      const technicalProblem = analyzer.analyze(
        "Implement a microservice with Kubernetes deployment, API gateway, and database connection pooling."
      );
      const nonTechnicalProblem = analyzer.analyze(
        "Write a story about a cat who goes on an adventure."
      );

      expect(technicalProblem.factors.technicalDensity).toBeGreaterThan(
        nonTechnicalProblem.factors.technicalDensity
      );
    });

    it("should detect nested clauses", () => {
      const result = analyzer.analyze(
        "If the user is authenticated, and if they have admin permissions, then show the dashboard, otherwise redirect to login."
      );

      expect(result.factors.nestedClauseCount).toBeGreaterThan(0);
    });

    it("should detect temporal reasoning requirements", () => {
      const result = analyzer.analyze(
        "First, set up the database. Then, create the API endpoints. Finally, implement the frontend."
      );

      expect(result.factors.temporalReasoning).toBe(true);
    });
  });

  describe("Recommended Depth Scaling", () => {
    it("should recommend depth 1 for trivial problems", () => {
      const result = analyzer.analyze("What is 2+2?");
      expect(result.recommendedDepth).toBe(1);
    });

    it("should recommend depth 2 or less for simple problems", () => {
      const result = analyzer.analyze("How do I create a React component?");
      expect(result.recommendedDepth).toBeLessThanOrEqual(2);
    });

    it("should recommend higher depth for more complex problems", () => {
      const simple = analyzer.analyze("How do I create a file?");
      const complex = analyzer.analyze(
        "Design and implement a distributed system for real-time data processing with fault tolerance, horizontal scaling, exactly-once semantics, and comprehensive monitoring."
      );
      expect(complex.recommendedDepth).toBeGreaterThan(simple.recommendedDepth);
    });

    it("should recommend depth 3+ for complex problems", () => {
      const result = analyzer.analyze(
        "Design and implement a distributed system for real-time data processing with fault tolerance, horizontal scaling, and exactly-once semantics."
      );
      expect(result.recommendedDepth).toBeGreaterThanOrEqual(3);
    });

    it("should increase depth for multi-domain problems", () => {
      const singleDomain = analyzer.analyze("Optimize database query performance.");
      const multiDomain = analyzer.analyze(
        "Optimize database performance while improving user experience and maintaining security compliance."
      );

      expect(multiDomain.recommendedDepth).toBeGreaterThanOrEqual(singleDomain.recommendedDepth);
    });
  });

  describe("Recommended Steps Scaling", () => {
    it("should recommend 1 step for trivial problems", () => {
      const result = analyzer.analyze("What is 5+5?");
      expect(result.recommendedSteps).toBe(1);
    });

    it("should recommend more steps for complex problems", () => {
      const trivial = analyzer.analyze("What is 2+2?");
      const complex = analyzer.analyze(
        "Design a microservices architecture with service discovery, load balancing, circuit breakers, and distributed tracing."
      );

      expect(complex.recommendedSteps).toBeGreaterThan(trivial.recommendedSteps);
    });

    it("should add steps for multiple questions", () => {
      const singleQuestion = analyzer.analyze("How do I deploy to AWS?");
      const multipleQuestions = analyzer.analyze(
        "How do I deploy to AWS? What are the costs? How do I monitor it?"
      );

      expect(multipleQuestions.recommendedSteps).toBeGreaterThan(singleQuestion.recommendedSteps);
    });
  });

  describe("Decomposition Decision", () => {
    it("should not decompose trivial problems", () => {
      const result = analyzer.analyze("What is 2+2?");
      expect(result.shouldDecompose).toBe(false);
    });

    it("should decompose moderate or complex problems", () => {
      const result = analyzer.analyze(
        "Build a complete e-commerce platform with user authentication, product catalog, shopping cart, checkout, order management, payment processing, inventory tracking, and customer support integration."
      );
      // Moderate and complex problems should decompose
      expect([ComplexityLevel.MODERATE, ComplexityLevel.COMPLEX]).toContain(result.level);
      expect(result.shouldDecompose).toBe(true);
    });

    it("should not decompose simple problems", () => {
      const simple = analyzer.analyze("How do I create a file?");

      expect(simple.shouldDecompose).toBe(false);
    });
  });

  describe("Context Integration", () => {
    it("should consider context in complexity analysis", () => {
      const withoutContext = analyzer.analyze("Fix the bug");
      const withContext = analyzer.analyze(
        "Fix the bug",
        "The bug occurs in the authentication module when users try to log in with OAuth2. It affects the token refresh mechanism and causes session timeouts."
      );

      expect(withContext.factors.wordCount).toBeGreaterThan(withoutContext.factors.wordCount);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty problem gracefully", () => {
      const result = analyzer.analyze("");

      expect(result.level).toBe(ComplexityLevel.TRIVIAL);
      expect(result.factors.wordCount).toBe(0);
    });

    it("should handle very long problems", () => {
      const longProblem = "Design a system ".repeat(100);
      const result = analyzer.analyze(longProblem);

      expect(result.level).toBe(ComplexityLevel.COMPLEX);
      expect(result.recommendedDepth).toBeLessThanOrEqual(5);
      expect(result.recommendedSteps).toBeLessThanOrEqual(10);
    });

    it("should handle problems with special characters", () => {
      const result = analyzer.analyze("What is the O(n²) complexity of this algorithm?");

      expect(result).toBeDefined();
      expect(result.level).toBeDefined();
    });

    it("should handle problems with only stop words", () => {
      const result = analyzer.analyze("the a an and or but");

      expect(result.factors.wordCount).toBe(0);
      expect(result.level).toBe(ComplexityLevel.TRIVIAL);
    });
  });
});
