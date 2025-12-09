/**
 * Property Test: Full-Text Search Availability
 *
 * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
 *
 * This property test validates that full-text search with boolean operators
 * executes without errors and produces valid PostgreSQL ts_query format.
 *
 * **Validates: Requirements 1.1, 1.7**
 *
 * - Requirement 1.1: WHEN a user searches with boolean operators (AND, OR, NOT)
 *   THEN the search_memories tool SHALL execute full-text search without database errors
 * - Requirement 1.7: WHEN the database is initialized THEN the search_vector tsvector
 *   column SHALL exist in the memories table
 *
 * Note: This property test focuses on the QueryParser component which is the
 * foundation of full-text search. Database availability is tested separately
 * in integration tests.
 *
 * @module __tests__/property/search/full-text-search-availability.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { QueryParser } from "../../../search/query-parser";

describe("Property 13: Full-Text Search Availability", () => {
  let parser: QueryParser;

  beforeEach(() => {
    parser = new QueryParser();
  });

  /**
   * Arbitrary for generating valid search terms.
   * Terms must be alphanumeric, non-empty, and not be reserved operators.
   */
  const validTermArb = fc
    .stringMatching(/^[a-z][a-z0-9]{2,10}$/)
    .filter((term) => !["and", "or", "not"].includes(term.toLowerCase()));

  /**
   * Arbitrary for generating a list of unique valid terms.
   */
  const uniqueTermsArb = (minLength: number, maxLength: number) =>
    fc
      .array(validTermArb, { minLength, maxLength })
      .map((terms) => [...new Set(terms)])
      .filter((terms) => terms.length >= minLength);

  /**
   * Arbitrary for generating boolean operators.
   */
  const booleanOperatorArb = fc.constantFrom("AND", "OR", "NOT");

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * For any valid query with AND operator, parsing SHALL NOT throw an error
   * and SHALL produce a valid ts_query string.
   */
  describe("AND operator availability", () => {
    it("should parse queries with AND operator without errors", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (term1, term2) => {
          // Skip if terms are the same
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} AND ${term2}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();
          expect(result.tsQuery.length).toBeGreaterThan(0);

          // Property: tsQuery SHALL contain & operator (PostgreSQL AND)
          expect(result.tsQuery).toContain("&");

          // Property: Both terms SHALL be in includeTerms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should handle multiple AND operators", () => {
      fc.assert(
        fc.property(uniqueTermsArb(3, 5), (terms) => {
          const query = terms.join(" AND ");

          // Property: Parsing SHALL NOT throwor
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();

          // Property: All terms SHALL be in includeTerms
          for (const term of terms) {
            expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term.toLowerCase());
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * For any valid query with OR operator, parsing SHALL NOT throw an error
   * and SHALL produce a valid ts_query string.
   *
   * Note: The current QueryParser implementation treats OR as implicit AND.
   * This test validates availability (no errors), not conversion correctness.
   * Conversion correctness is a separate concern tracked in the implementation tasks.
   */
  describe("OR operator availability", () => {
    it("should parse queries with OR operator without errors", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (term1, term2) => {
          // Skip if terms are the same
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} OR ${term2}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();
          expect(result.tsQuery.length).toBeGreaterThan(0);

          // Property: Result SHALL have valid structure
          expect(result).toHaveProperty("tsQuery");
          expect(result).toHaveProperty("includeTerms");
          expect(result).toHaveProperty("excludeTerms");
          expect(Array.isArray(result.includeTerms)).toBe(true);
          expect(Array.isArray(result.excludeTerms)).toBe(true);

          // Property: Both terms SHALL be in includeTerms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should handle multiple OR operators", () => {
      fc.assert(
        fc.property(uniqueTermsArb(3, 5), (terms) => {
          const query = terms.join(" OR ");

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();

          // Property: All terms SHALL be in includeTerms
          for (const term of terms) {
            expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term.toLowerCase());
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * For any valid query with NOT operator, parsing SHALL NOT throw an error
   * and SHALL produce a valid ts_query string.
   */
  describe("NOT operator availability", () => {
    it("should parse queries with NOT operator without errors", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (term1, term2) => {
          // Skip if terms are the same
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} NOT ${term2}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();
          expect(result.tsQuery.length).toBeGreaterThan(0);

          // Property: tsQuery SHALL contain ! operator (PostgreSQL NOT)
          expect(result.tsQuery).toContain("!");

          // Property: Positive term SHALL be in includeTerms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());

          // Property: Negated term SHALL be in excludeTerms
          expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should handle multiple NOT operators", () => {
      fc.assert(
        fc.property(validTermArb, uniqueTermsArb(2, 4), (includeTerm, excludeTerms) => {
          // Filter out any overlap
          const filteredExcludeTerms = excludeTerms.filter(
            (et) => et.toLowerCase() !== includeTerm.toLowerCase()
          );

          if (filteredExcludeTerms.length === 0) {
            return true;
          }

          const excludePart = filteredExcludeTerms.map((t) => `NOT ${t}`).join(" ");
          const query = `${includeTerm} ${excludePart}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();

          // Property: All negated terms SHALL be in excludeTerms
          for (const term of filteredExcludeTerms) {
            expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(term.toLowerCase());
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * For any valid query with mixed boolean operators, parsing SHALL NOT throw
   * an error and SHALL produce a valid ts_query string.
   *
   * Note: The current QueryParser implementation treats AND/OR as implicit AND.
   * This test validates availability (no errors), not conversion correctness.
   */
  describe("Mixed boolean operators availability", () => {
    it("should parse queries with AND and OR operators without errors", () => {
      fc.assert(
        fc.property(uniqueTermsArb(3, 4), (terms) => {
          // Build query: term1 AND term2 OR term3
          const query = `${terms[0]} AND ${terms[1]} OR ${terms.slice(2).join(" ")}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();

          // Property: Result SHALL have valid structure
          expect(result).toHaveProperty("tsQuery");
          expect(result).toHaveProperty("includeTerms");
          expect(result).toHaveProperty("excludeTerms");

          // Property: tsQuery SHALL contain & operator (implicit AND)
          expect(result.tsQuery).toContain("&");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should parse queries with AND, OR, and NOT operators without errors", () => {
      fc.assert(
        fc.property(uniqueTermsArb(4, 5), (terms) => {
          // Build query: term1 AND term2 OR term3 NOT term4
          const query = `${terms[0]} AND ${terms[1]} OR ${terms[2]} NOT ${terms[3]}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();

          // Property: tsQuery SHALL contain & and ! operators
          expect(result.tsQuery).toContain("&");
          expect(result.tsQuery).toContain("!");

          // Property: Negated term SHALL be in excludeTerms
          expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(terms[3].toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * For any valid query, the tsQuery output SHALL be valid PostgreSQL ts_query format.
   *
   * Note: The current QueryParser implementation treats AND/OR keywords as terms.
   * This test validates that the output is valid ts_query format (no errors).
   */
  describe("Valid ts_query format", () => {
    it("should produce valid ts_query format for any boolean query", () => {
      fc.assert(
        fc.property(
          uniqueTermsArb(2, 4),
          fc.array(booleanOperatorArb, { minLength: 1, maxLength: 3 }),
          (terms, operators) => {
            // Build query by interleaving terms and operators
            let query = terms[0];
            for (let i = 0; i < Math.min(operators.length, terms.length - 1); i++) {
              query += ` ${operators[i]} ${terms[i + 1]}`;
            }

            // Property: Parsing SHALL NOT throw an error
            expect(() => parser.parseQuery(query)).not.toThrow();

            const result = parser.parseQuery(query);

            // Property: Result SHALL have a non-empty tsQuery
            expect(result.tsQuery).toBeTruthy();
            expect(result.tsQuery.length).toBeGreaterThan(0);

            // Property: NOT is converted to ! so it should not appear as literal
            expect(result.tsQuery).not.toMatch(/\bNOT\b/i);

            // Property: tsQuery SHALL only contain valid ts_query characters
            // Valid: alphanumeric, &, |, !, (, ), <, >, -, space, :, *
            // Note: AND/OR may appear as terms in current implementation
            const validTsQueryPattern = /^[a-zA-Z0-9&|!()<>\-\s:*]+$/;
            expect(result.tsQuery).toMatch(validTsQueryPattern);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * Case insensitivity: AND, And, and, OR, Or, or, NOT, Not, not should all work.
   */
  describe("Case insensitive boolean operators", () => {
    const andVariantsArb = fc.constantFrom("AND", "And", "and", "aNd", "anD");
    const orVariantsArb = fc.constantFrom("OR", "Or", "or", "oR");
    const notVariantsArb = fc.constantFrom("NOT", "Not", "not", "nOt", "noT");

    it("should handle AND operator case-insensitively", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, andVariantsArb, (term1, term2, andOp) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} ${andOp} ${term2}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: tsQuery SHALL contain & operator
          expect(result.tsQuery).toContain("&");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should handle OR operator case-insensitively", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, orVariantsArb, (term1, term2, orOp) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} ${orOp} ${term2}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have valid structure
          expect(result).toHaveProperty("tsQuery");
          expect(result.tsQuery).toBeTruthy();

          // Property: Both terms SHALL be in includeTerms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should handle NOT operator case-insensitively", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, notVariantsArb, (term1, term2, notOp) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} ${notOp} ${term2}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: tsQuery SHALL contain ! operator
          expect(result.tsQuery).toContain("!");

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * Implicit AND: Space between terms should be treated as AND.
   */
  describe("Implicit AND (space between terms)", () => {
    it("should treat space between terms as implicit AND", () => {
      fc.assert(
        fc.property(uniqueTermsArb(2, 4), (terms) => {
          const query = terms.join(" ");

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: tsQuery SHALL contain & operator for implicit AND
          expect(result.tsQuery).toContain("&");

          // Property: All terms SHALL be in includeTerms
          for (const term of terms) {
            expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term.toLowerCase());
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * Phrase queries with quotes should be handled correctly.
   */
  describe("Phrase query availability", () => {
    it("should parse phrase queries without errors", () => {
      fc.assert(
        fc.property(uniqueTermsArb(2, 3), (terms) => {
          const phrase = terms.join(" ");
          const query = `"${phrase}"`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();

          // Property: tsQuery SHALL contain <-> operator for phrase matching
          expect(result.tsQuery).toContain("<->");

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should parse phrase queries combined with boolean operators", () => {
      fc.assert(
        fc.property(uniqueTermsArb(2, 3), validTermArb, (phraseTerms, additionalTerm) => {
          // Skip if additional term is in phrase
          if (phraseTerms.some((t) => t.toLowerCase() === additionalTerm.toLowerCase())) {
            return true;
          }

          const phrase = phraseTerms.join(" ");
          const query = `"${phrase}" AND ${additionalTerm}`;

          // Property: Parsing SHALL NOT throw an error
          expect(() => parser.parseQuery(query)).not.toThrow();

          const result = parser.parseQuery(query);

          // Property: Result SHALL have a non-empty tsQuery
          expect(result.tsQuery).toBeTruthy();

          // Property: tsQuery SHALL contain both <-> and & operators
          expect(result.tsQuery).toContain("<->");
          expect(result.tsQuery).toContain("&");

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 13: Full-Text Search Availability**
   * **Validates: Requirements 1.1**
   *
   * The ! shorthand for NOT should work the same as NOT keyword.
   */
  describe("! shorthand for NOT", () => {
    it("should handle ! operator same as NOT keyword", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (term1, term2) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const queryWithNot = `${term1} NOT ${term2}`;
          const queryWithBang = `${term1} !${term2}`;

          // Property: Both queries SHALL parse without errors
          expect(() => parser.parseQuery(queryWithNot)).not.toThrow();
          expect(() => parser.parseQuery(queryWithBang)).not.toThrow();

          const resultNot = parser.parseQuery(queryWithNot);
          const resultBang = parser.parseQuery(queryWithBang);

          // Property: Both SHALL have the same excludeTerms
          expect(resultNot.excludeTerms.map((t) => t.toLowerCase()).sort()).toEqual(
            resultBang.excludeTerms.map((t) => t.toLowerCase()).sort()
          );

          // Property: Both SHALL have the same includeTerms
          expect(resultNot.includeTerms.map((t) => t.toLowerCase()).sort()).toEqual(
            resultBang.includeTerms.map((t) => t.toLowerCase()).sort()
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
