/**
 * Property Test: Boolean Operators Excluded from matchedTerms
 *
 * **Feature: mcp-tool-fixes-phase2, Property 1: Boolean Operators Excluded from matchedTerms**
 *
 * This property test validates that when a search query contains boolean operators
 * (AND, OR in any case), the matchedTerms array (includeTerms) returned by the
 * QueryParser SHALL NOT contain "and" or "or".
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 *
 * - Requirement 1.1: WHEN a user searches with "term1 AND term2" THEN the matchedTerms
 *   array SHALL contain ["term1", "term2"] without "and"
 * - Requirement 1.2: WHEN a user searches with "term1 OR term2" THEN the matchedTerms
 *   array SHALL contain ["term1", "term2"] without "or"
 * - Requirement 1.3: WHEN a user searches with "term1 AND term2 OR term3" THEN the
 *   matchedTerms array SHALL contain ["term1", "term2", "term3"] without "and" or "or"
 * - Requirement 1.4: WHEN a user searches with case variations like "Term1 And Term2"
 *   THEN the matchedTerms array SHALL filter operators case-insensitively
 * - Requirement 1.5: WHEN the Query Parser extracts terms THEN the extractNotTerms method
 *   SHALL filter out "and" and "or" word forms in addition to "&", "|", "!" symbols
 *
 * @module __tests__/property/search/boolean-operator-filtering.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { QueryParser } from "../../../search/query-parser";

describe("Property 1: Boolean Operators Excluded from matchedTerms", () => {
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
   * Arbitrary for generating AND operator in various cases.
   */
  const andOperatorArb = fc.constantFrom("AND", "And", "and", "aNd", "anD", "ANd", "aND");

  /**
   * Arbitrary for generating OR operator in various cases.
   */
  const orOperatorArb = fc.constantFrom("OR", "Or", "or", "oR");

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 1: Boolean Operators Excluded from matchedTerms**
   * **Validates: Requirements 1.1, 1.4, 1.5**
   *
   * For any query with AND operator (any case), includeTerms SHALL NOT contain "and".
   */
  describe("AND operator filtering", () => {
    it("should exclude AND operator from includeTerms regardless of case", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, andOperatorArb, (term1, term2, andOp) => {
          // Skip if terms are the same
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} ${andOp} ${term2}`;
          const result = parser.parseQuery(query);

          // Property: includeTerms SHALL NOT contain "and" (case-insensitive)
          expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain("and");

          // Property: includeTerms SHALL contain both actual search terms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should exclude AND from extractTerms result", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, andOperatorArb, (term1, term2, andOp) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} ${andOp} ${term2}`;
          const terms = parser.extractTerms(query);

          // Property: extractTerms SHALL NOT contain "and"
          expect(terms.map((t) => t.toLowerCase())).not.toContain("and");

          // Property: extractTerms SHALL contain both actual search terms
          expect(terms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(terms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 1: Boolean Operators Excluded from matchedTerms**
   * **Validates: Requirements 1.2, 1.4, 1.5**
   *
   * For any query with OR operator (any case), includeTerms SHALL NOT contain "or".
   */
  describe("OR operator filtering", () => {
    it("should exclude OR operator from includeTerms regardless of case", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, orOperatorArb, (term1, term2, orOp) => {
          // Skip if terms are the same
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} ${orOp} ${term2}`;
          const result = parser.parseQuery(query);

          // Property: includeTerms SHALL NOT contain "or" (case-insensitive)
          expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain("or");

          // Property: includeTerms SHALL contain both actual search terms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should exclude OR from extractTerms result", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, orOperatorArb, (term1, term2, orOp) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} ${orOp} ${term2}`;
          const terms = parser.extractTerms(query);

          // Property: extractTerms SHALL NOT contain "or"
          expect(terms.map((t) => t.toLowerCase())).not.toContain("or");

          // Property: extractTerms SHALL contain both actual search terms
          expect(terms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(terms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 1: Boolean Operators Excluded from matchedTerms**
   * **Validates: Requirements 1.3, 1.5**
   *
   * For any query with mixed AND and OR operators, includeTerms SHALL NOT contain
   * either "and" or "or".
   */
  describe("Mixed AND/OR operator filtering", () => {
    it("should exclude both AND and OR from includeTerms in mixed queries", () => {
      fc.assert(
        fc.property(uniqueTermsArb(3, 5), andOperatorArb, orOperatorArb, (terms, andOp, orOp) => {
          // Build query: term1 AND term2 OR term3 ...
          const query = `${terms[0]} ${andOp} ${terms[1]} ${orOp} ${terms.slice(2).join(" ")}`;
          const result = parser.parseQuery(query);

          // Property: includeTerms SHALL NOT contain "and" or "or"
          expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain("and");
          expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain("or");

          // Property: includeTerms SHALL contain all actual search terms
          for (const term of terms) {
            expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term.toLowerCase());
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should exclude both AND and OR from extractTerms in mixed queries", () => {
      fc.assert(
        fc.property(uniqueTermsArb(3, 5), andOperatorArb, orOperatorArb, (terms, andOp, orOp) => {
          const query = `${terms[0]} ${andOp} ${terms[1]} ${orOp} ${terms.slice(2).join(" ")}`;
          const extractedTerms = parser.extractTerms(query);

          // Property: extractTerms SHALL NOT contain "and" or "or"
          expect(extractedTerms.map((t) => t.toLowerCase())).not.toContain("and");
          expect(extractedTerms.map((t) => t.toLowerCase())).not.toContain("or");

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 1: Boolean Operators Excluded from matchedTerms**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
   *
   * Universal property: For ANY query containing boolean operators,
   * includeTerms SHALL NEVER contain "and" or "or".
   */
  describe("Universal boolean operator exclusion", () => {
    const booleanOperatorArb = fc.constantFrom("AND", "And", "and", "aNd", "OR", "Or", "or", "oR");

    it("should never include boolean operators in includeTerms", () => {
      fc.assert(
        fc.property(
          fc.array(validTermArb, { minLength: 2, maxLength: 5 }),
          fc.array(booleanOperatorArb, { minLength: 1, maxLength: 4 }),
          (terms, operators) => {
            // Ensure unique terms
            const uniqueTerms = [...new Set(terms)];
            if (uniqueTerms.length < 2) {
              return true;
            }

            // Build query by interleaving terms and operators
            let query = uniqueTerms[0];
            for (let i = 0; i < Math.min(operators.length, uniqueTerms.length - 1); i++) {
              query += ` ${operators[i]} ${uniqueTerms[i + 1]}`;
            }

            const result = parser.parseQuery(query);

            // Property: includeTerms SHALL NEVER contain "and" or "or"
            const lowerTerms = result.includeTerms.map((t) => t.toLowerCase());
            expect(lowerTerms).not.toContain("and");
            expect(lowerTerms).not.toContain("or");

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should never include boolean operators in extractTerms result", () => {
      fc.assert(
        fc.property(
          fc.array(validTermArb, { minLength: 2, maxLength: 5 }),
          fc.array(booleanOperatorArb, { minLength: 1, maxLength: 4 }),
          (terms, operators) => {
            const uniqueTerms = [...new Set(terms)];
            if (uniqueTerms.length < 2) {
              return true;
            }

            let query = uniqueTerms[0];
            for (let i = 0; i < Math.min(operators.length, uniqueTerms.length - 1); i++) {
              query += ` ${operators[i]} ${uniqueTerms[i + 1]}`;
            }

            const extractedTerms = parser.extractTerms(query);

            // Property: extractTerms SHALL NEVER contain "and" or "or"
            const lowerTerms = extractedTerms.map((t) => t.toLowerCase());
            expect(lowerTerms).not.toContain("and");
            expect(lowerTerms).not.toContain("or");

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 1: Boolean Operators Excluded from matchedTerms**
   * **Validates: Requirements 1.5**
   *
   * Symbol operators (&, |) should also be filtered from includeTerms.
   */
  describe("Symbol operator filtering", () => {
    it("should filter & symbol from includeTerms", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (term1, term2) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} & ${term2}`;
          const result = parser.parseQuery(query);

          // Property: includeTerms SHALL NOT contain "&"
          expect(result.includeTerms).not.toContain("&");

          // Property: includeTerms SHALL contain both actual search terms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should filter | symbol from includeTerms", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (term1, term2) => {
          if (term1.toLowerCase() === term2.toLowerCase()) {
            return true;
          }

          const query = `${term1} | ${term2}`;
          const result = parser.parseQuery(query);

          // Property: includeTerms SHALL NOT contain "|"
          expect(result.includeTerms).not.toContain("|");

          // Property: includeTerms SHALL contain both actual search terms
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term1.toLowerCase());
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(term2.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-fixes-phase2, Property 1: Boolean Operators Excluded from matchedTerms**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
   *
   * Invariant: The count of includeTerms should equal the count of actual search terms
   * (not including operators).
   */
  describe("Term count invariant", () => {
    it("should have correct term count after filtering operators", () => {
      fc.assert(
        fc.property(uniqueTermsArb(2, 5), andOperatorArb, (terms, andOp) => {
          const query = terms.join(` ${andOp} `);
          const result = parser.parseQuery(query);

          // Property: includeTerms count SHALL equal the number of actual search terms
          expect(result.includeTerms.length).toBe(terms.length);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
