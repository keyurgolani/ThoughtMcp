/**
 * Property Test: Problem Complexity Scaling
 *
 * **Feature: mcp-tool-improvements, Property 17: Problem Complexity Scaling**
 *
 * This property test validates that the ProblemComplexityAnalyzer correctly
 * scales analysis depth based on problem complexity. Simple problems should
 * get concise responses, complex problems should get thorough analysis.
 *
 * **Validates: Requirements 15.1, 15.2**
 *
 * - Requirement 15.1: WHEN a simple problem is provided (e.g., "What is 2+2?")
 *   THEN the think tool SHALL provide a concise response without over-analysis
 * - Requirement 15.2: WHEN a complex problem is provided THEN the think tool
 *   SHALL provide thorough multi-step analysis
 *
 * @module __tests__/property/reasoning/problem-complexity-scaling.property.test
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ComplexityLevel,
  ProblemComplexityAnalyzer,
} from "../../../reasoning/problem-complexity-analyzer";

describe("Property 17: Problem Complexity Scaling", () => {
  const analyzer = new ProblemComplexityAnalyzer();

  /**
   * Arbitrary for generating trivial problems
   * These are simple, direct questions that should get minimal analysis
   */
  const trivialProblemArb = fc.constantFrom(
    "What is 2+2?",
    "What is 5*3?",
    "What is 10-4?",
    "What is 100/5?",
    "What is the sum of 3 and 7?",
    "What is the difference of 10 and 3?",
    "Define variable.",
    "What does API mean?",
    "What is a function?",
    "Is true correct?",
    "Yes or no: is 5 greater than 3?",
    "True or false: water is wet."
  );

  /**
   * Arbitrary for generating complex problems
   * These require thorough multi-step analysis
   */
  const complexProblemArb = fc.constantFrom(
    "Design and architect a scalable microservices system for an e-commerce platform that handles 1M daily users, considering trade-offs between consistency and availability, while maintaining backward compatibility with existing REST APIs and implementing proper authentication and authorization mechanisms.",
    "Compare and contrast different database architectures for a real-time analytics dashboard, evaluating the pros and cons of PostgreSQL, MongoDB, and ClickHouse, considering factors like query performance, scalability, cost, and operational complexity.",
    "Analyze the security vulnerabilities in our authentication system and design a comprehensive solution that implements rate limiting, multi-factor authentication, and OAuth2 integration, while ensuring minimal impact on user experience and maintaining compliance with GDPR requirements.",
    "First, evaluate our current CI/CD pipeline performance. Second, identify bottlenecks in the build process. Third, design improvements for parallel test execution. Finally, implement a strategy for gradual rollout of changes without downtime.",
    "Considering the trade-offs between development speed and code quality, design a testing strategy for our microservices architecture that balances unit tests, integration tests, and end-to-end tests, while keeping CI pipeline execution under 15 minutes and maintaining 90% code coverage.",
    "Given our current infrastructure constraints and budget limitations, optimize the data pipeline to handle 10x traffic increase while maintaining sub-second latency, implementing proper monitoring and alerting, and ensuring disaster recovery capabilities."
  );

  /**
   * Arbitrary for generating simple problems (between trivial and complex)
   */
  const simpleProblemArb = fc.constantFrom(
    "How do I sort an array in JavaScript?",
    "What is the best way to handle errors in Python?",
    "Explain the difference between let and const.",
    "How do I connect to a database?",
    "What is a REST API?",
    "How do I write a unit test?"
  );

  /**
   * Arbitrary for generating moderate problems
   */
  const moderateProblemArb = fc.constantFrom(
    "Design a caching strategy for our API endpoints to improve response times.",
    "Implement user authentication with JWT tokens and refresh token rotation.",
    "Create a logging system that captures errors and performance metrics.",
    "Build a notification service that supports email, SMS, and push notifications.",
    "Develop a search feature with filtering, sorting, and pagination support."
  );

  /**
   * **Feature: mcp-tool-improvements, Property 17: Problem Complexity Scaling**
   * **Validates: Requirement 15.1**
   *
   * Trivial problems SHALL receive minimal analysis depth
   */
  describe("Trivial problem analysis", () => {
    it("should classify trivial problems as TRIVIAL complexity level", () => {
      fc.assert(
        fc.property(trivialProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          expect(analysis.level).toBe(ComplexityLevel.TRIVIAL);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should recommend minimal steps for trivial problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          // Trivial problems should have 1-2 recommended steps
          expect(analysis.recommendedSteps).toBeLessThanOrEqual(2);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should recommend minimal depth for trivial problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          // Trivial problems should have depth 1
          expect(analysis.recommendedDepth).toBe(1);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should not recommend decomposition for trivial problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          expect(analysis.shouldDecompose).toBe(false);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have low complexity score for trivial problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          // Trivial problems should have score < 0.2
          expect(analysis.score).toBeLessThan(0.2);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 17: Problem Complexity Scaling**
   * **Validates: Requirement 15.2**
   *
   * Complex problems SHALL receive thorough multi-step analysis
   */
  describe("Complex problem analysis", () => {
    it("should classify complex problems as COMPLEX or MODERATE complexity level", () => {
      fc.assert(
        fc.property(complexProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          // Complex problems should be classified as COMPLEX or at least MODERATE
          expect([ComplexityLevel.COMPLEX, ComplexityLevel.MODERATE]).toContain(analysis.level);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should recommend multiple steps for complex problems", () => {
      fc.assert(
        fc.property(complexProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          // Complex problems should have 4+ recommended steps
          expect(analysis.recommendedSteps).toBeGreaterThanOrEqual(4);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should recommend higher depth for complex problems", () => {
      fc.assert(
        fc.property(complexProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          // Complex problems should have depth >= 3
          expect(analysis.recommendedDepth).toBeGreaterThanOrEqual(3);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should recommend decomposition for complex problems", () => {
      fc.assert(
        fc.property(complexProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          expect(analysis.shouldDecompose).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should have high complexity score for complex problems", () => {
      fc.assert(
        fc.property(complexProblemArb, (problem) => {
          const analysis = analyzer.analyze(problem);
          // Complex problems should have score >= 0.5
          expect(analysis.score).toBeGreaterThanOrEqual(0.5);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 17: Problem Complexity Scaling**
   * **Validates: Requirements 15.1, 15.2**
   *
   * Trivial problems SHALL have fewer steps than complex problems
   */
  describe("Comparative scaling", () => {
    it("trivial problems should have fewer recommended steps than complex problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, complexProblemArb, (trivialProblem, complexProblem) => {
          const trivialAnalysis = analyzer.analyze(trivialProblem);
          const complexAnalysis = analyzer.analyze(complexProblem);

          expect(trivialAnalysis.recommendedSteps).toBeLessThan(complexAnalysis.recommendedSteps);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("trivial problems should have lower depth than complex problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, complexProblemArb, (trivialProblem, complexProblem) => {
          const trivialAnalysis = analyzer.analyze(trivialProblem);
          const complexAnalysis = analyzer.analyze(complexProblem);

          expect(trivialAnalysis.recommendedDepth).toBeLessThan(complexAnalysis.recommendedDepth);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("trivial problems should have lower complexity score than complex problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, complexProblemArb, (trivialProblem, complexProblem) => {
          const trivialAnalysis = analyzer.analyze(trivialProblem);
          const complexAnalysis = analyzer.analyze(complexProblem);

          expect(trivialAnalysis.score).toBeLessThan(complexAnalysis.score);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("simple problems should have fewer steps than complex problems", () => {
      fc.assert(
        fc.property(simpleProblemArb, complexProblemArb, (simpleProblem, complexProblem) => {
          const simpleAnalysis = analyzer.analyze(simpleProblem);
          const complexAnalysis = analyzer.analyze(complexProblem);

          expect(simpleAnalysis.recommendedSteps).toBeLessThanOrEqual(
            complexAnalysis.recommendedSteps
          );
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 17: Problem Complexity Scaling**
   * **Validates: Requirements 15.1, 15.2**
   *
   * Complexity levels should form a proper ordering
   */
  describe("Complexity level ordering", () => {
    it("trivial problems should have lower scores than complex problems", () => {
      fc.assert(
        fc.property(trivialProblemArb, complexProblemArb, (trivial, complex) => {
          const trivialAnalysis = analyzer.analyze(trivial);
          const complexAnalysis = analyzer.analyze(complex);

          // Trivial should have lower score than complex
          expect(trivialAnalysis.score).toBeLessThan(complexAnalysis.score);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("moderate problems should have lower scores than complex problems", () => {
      fc.assert(
        fc.property(moderateProblemArb, complexProblemArb, (moderate, complex) => {
          const moderateAnalysis = analyzer.analyze(moderate);
          const complexAnalysis = analyzer.analyze(complex);

          // Moderate should have lower or equal score than complex
          expect(moderateAnalysis.score).toBeLessThanOrEqual(complexAnalysis.score);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("recommended steps should increase with complexity", () => {
      fc.assert(
        fc.property(trivialProblemArb, complexProblemArb, (trivialProblem, complexProblem) => {
          const trivialAnalysis = analyzer.analyze(trivialProblem);
          const complexAnalysis = analyzer.analyze(complexProblem);

          // Complex problems should have at least 2x the steps of trivial
          expect(complexAnalysis.recommendedSteps).toBeGreaterThanOrEqual(
            trivialAnalysis.recommendedSteps * 2
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 17: Problem Complexity Scaling**
   * **Validates: Requirements 15.1, 15.2**
   *
   * Complexity factors should be properly calculated
   */
  describe("Complexity factors", () => {
    it("complex problems should have higher word count factor", () => {
      fc.assert(
        fc.property(trivialProblemArb, complexProblemArb, (trivialProblem, complexProblem) => {
          const trivialAnalysis = analyzer.analyze(trivialProblem);
          const complexAnalysis = analyzer.analyze(complexProblem);

          expect(trivialAnalysis.factors.wordCount).toBeLessThan(complexAnalysis.factors.wordCount);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("complex problems should have higher technical density", () => {
      fc.assert(
        fc.property(trivialProblemArb, complexProblemArb, (trivialProblem, complexProblem) => {
          const trivialAnalysis = analyzer.analyze(trivialProblem);
          const complexAnalysis = analyzer.analyze(complexProblem);

          expect(trivialAnalysis.factors.technicalDensity).toBeLessThanOrEqual(
            complexAnalysis.factors.technicalDensity
          );
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("problems mentioning trade-off patterns should detect hasTradeoffs", () => {
      // Test with problems that explicitly contain trade-off patterns
      // Note: The analyzer uses specific regex patterns for trade-off detection
      const tradeoffProblems = fc.constantFrom(
        "Compare the trade-off between speed and accuracy in this algorithm.",
        "Evaluate the pros and cons of using microservices architecture.",
        "Balance performance versus maintainability in the codebase.",
        "On one hand we need speed, on the other hand we need reliability.",
        "Optimize latency while maintaining data consistency."
      );

      fc.assert(
        fc.property(tradeoffProblems, (problem) => {
          const analysis = analyzer.analyze(problem);
          expect(analysis.factors.hasTradeoffs).toBe(true);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 17: Problem Complexity Scaling**
   * **Validates: Requirements 15.1, 15.2**
   *
   * Analysis should be deterministic
   */
  describe("Determinism", () => {
    it("same problem should always produce same analysis", () => {
      fc.assert(
        fc.property(
          fc.oneof(trivialProblemArb, simpleProblemArb, moderateProblemArb, complexProblemArb),
          (problem) => {
            const analysis1 = analyzer.analyze(problem);
            const analysis2 = analyzer.analyze(problem);

            expect(analysis1.level).toBe(analysis2.level);
            expect(analysis1.score).toBe(analysis2.score);
            expect(analysis1.recommendedSteps).toBe(analysis2.recommendedSteps);
            expect(analysis1.recommendedDepth).toBe(analysis2.recommendedDepth);
            expect(analysis1.shouldDecompose).toBe(analysis2.shouldDecompose);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
