/**
 * Property Test: NOT Operator Exclusion
 *
 * **Feature: mcp-tool-improvements, Property 1: NOT Operator Exclusion**
 *
 * This property test validates that when a search query contains "NOT term",
 * the QueryParser correctly excludes the negated term from includeTerms
 * and places it in excludeTerms.
 *
 * **Validates: Requirements 1.2, 1.3, 1.5**
 *
 * - Requirement 1.2: WHEN a user searches with "term1 NOT term2" THEN the Query Parser
 *   SHALL exclude results containing term2
 * - Requirement 1.3: WHEN a user searches with multiple NOT operators THEN the Query Parser
 *   SHALL exclude results containing any of the negated terms
 * - Requirement 1.5: WHEN the NOT operator is used THEN the matchedTerms array SHALL not
 *   include the negated terms
 *
 * @module __tests__/property/search/not-operator-exclusion.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { QueryParser } from "../../../search/query-parser";

describe("Property 1: NOT Operator Exclusion", () => {
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
   * **Feature: mcp-tool-improvements, Property 1: NOT Operator Exclusion**
   * **Validates: Requirements 1.2, 1.5**
   *
   * For any query "term1 NOT term2", the excludeTerms SHALL contain term2
   * and includeTerms SHALL NOT contain term2.
   */
  describe("Single NOT operator exclusion", () => {
    it("should place NOT term in excludeTerms and exclude from includeTerms", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (includeTerm, excludeTerm) => {
          // Skip if terms are the same
          if (includeTerm.toLowerCase() === excludeTerm.toLowerCase()) {
            return true;
          }

          const query = `${includeTerm} NOT ${excludeTerm}`;
          const result = parser.parseQuery(query);

          // Property: excludeTerms SHALL contain the negated term
          expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(
            excludeTerm.toLowerCase()
          );

          // Property: includeTerms SHALL NOT contain the negated term
          expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain(
            excludeTerm.toLowerCase()
          );

          // Property: includeTerms SHALL contain the positive term
          expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(
            includeTerm.toLowerCase()
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should handle ! operator same as NOT", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (includeTerm, excludeTerm) => {
          // Skip if terms are the same
          if (includeTerm.toLowerCase() === excludeTerm.toLowerCase()) {
            return true;
          }

          const query = `${includeTerm} !${excludeTerm}`;
          const result = parser.parseQuery(query);

          // Property: excludeTerms SHALL contain the negated term
          expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(
            excludeTerm.toLowerCase()
          );

          // Property: includeTerms SHALL NOT contain the negated term
          expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain(
            excludeTerm.toLowerCase()
          );

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 1: NOT Operator Exclusion**
   * **Validates: Requirements 1.3**
   *
   * For any query with multiple NOT operators, ALL negated terms SHALL be
   * in excludeTerms and NONE shall be in includeTerms.
   */
  describe("Multiple NOT operators exclusion", () => {
    it("should exclude all NOT terms from includeTerms", () => {
      fc.assert(
        fc.property(
          uniqueTermsArb(1, 3), // Include terms
          uniqueTermsArb(1, 3), // Exclude terms
          (includeTerms, excludeTerms) => {
            // Filter out any overlap between include and exclude terms
            const filteredExcludeTerms = excludeTerms.filter(
              (et) => !includeTerms.some((it) => it.toLowerCase() === et.toLowerCase())
            );

            // Skip if no valid exclude terms remain
            if (filteredExcludeTerms.length === 0) {
              return true;
            }

            // Build query: "term1 term2 NOT exclude1 NOT exclude2"
            const includesPart = includeTerms.join(" ");
            const excludesPart = filteredExcludeTerms.map((t) => `NOT ${t}`).join(" ");
            const query = `${includesPart} ${excludesPart}`;

            const result = parser.parseQuery(query);

            // Property: ALL negated terms SHALL be in excludeTerms
            for (const excludeTerm of filteredExcludeTerms) {
              expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(
                excludeTerm.toLowerCase()
              );
            }

            // Property: NO negated terms SHALL be in includeTerms
            for (const excludeTerm of filteredExcludeTerms) {
              expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain(
                excludeTerm.toLowerCase()
              );
            }

            // Property: ALL positive terms SHALL be in includeTerms
            for (const includeTerm of includeTerms) {
              expect(result.includeTerms.map((t) => t.toLowerCase())).toContain(
                includeTerm.toLowerCase()
              );
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle mixed ! and NOT operators", () => {
      fc.assert(
        fc.property(
          validTermArb,
          validTermArb,
          validTermArb,
          (includeTerm, excludeTerm1, excludeTerm2) => {
            // Skip if any terms are the same
            const terms = [includeTerm, excludeTerm1, excludeTerm2].map((t) => t.toLowerCase());
            if (new Set(terms).size !== 3) {
              return true;
            }

            const query = `${includeTerm} NOT ${excludeTerm1} !${excludeTerm2}`;
            const result = parser.parseQuery(query);

            // Property: Both negated terms SHALL be in excludeTerms
            expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(
              excludeTerm1.toLowerCase()
            );
            expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(
              excludeTerm2.toLowerCase()
            );

            // Property: Neither negated term SHALL be in includeTerms
            expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain(
              excludeTerm1.toLowerCase()
            );
            expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain(
              excludeTerm2.toLowerCase()
            );

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 1: NOT Operator Exclusion**
   * **Validates: Requirements 1.5**
   *
   * The extractTerms() method SHALL NOT include negated terms.
   * This validates that matchedTerms (derived from extractTerms) excludes NOT terms.
   */
  describe("extractTerms excludes NOT terms", () => {
    it("should not include NOT terms in extractTerms result", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (includeTerm, excludeTerm) => {
          // Skip if terms are the same
          if (includeTerm.toLowerCase() === excludeTerm.toLowerCase()) {
            return true;
          }

          const query = `${includeTerm} NOT ${excludeTerm}`;
          const terms = parser.extractTerms(query);

          // Property: extractTerms SHALL NOT include the negated term
          expect(terms.map((t) => t.toLowerCase())).not.toContain(excludeTerm.toLowerCase());

          // Property: extractTerms SHALL include the positive term
          expect(terms.map((t) => t.toLowerCase())).toContain(includeTerm.toLowerCase());

          return true;
        }),
        { numRuns: 100 }
      );
    });

    it("should not include any NOT terms when multiple are present", () => {
      fc.assert(
        fc.property(
          uniqueTermsArb(1, 2), // Include terms
          uniqueTermsArb(1, 3), // Exclude terms
          (includeTerms, excludeTerms) => {
            // Filter out any overlap
            const filteredExcludeTerms = excludeTerms.filter(
              (et) => !includeTerms.some((it) => it.toLowerCase() === et.toLowerCase())
            );

            if (filteredExcludeTerms.length === 0) {
              return true;
            }

            const includesPart = includeTerms.join(" ");
            const excludesPart = filteredExcludeTerms.map((t) => `NOT ${t}`).join(" ");
            const query = `${includesPart} ${excludesPart}`;

            const terms = parser.extractTerms(query);

            // Property: extractTerms SHALL NOT include ANY negated terms
            for (const excludeTerm of filteredExcludeTerms) {
              expect(terms.map((t) => t.toLowerCase())).not.toContain(excludeTerm.toLowerCase());
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 1: NOT Operator Exclusion**
   * **Validates: Requirements 1.2, 1.3, 1.5**
   *
   * Case insensitivity: NOT, Not, not should all work the same.
   */
  describe("Case insensitive NOT handling", () => {
    const notVariantsArb = fc.constantFrom("NOT", "Not", "not", "nOt", "noT");

    it("should handle NOT operator case-insensitively", () => {
      fc.assert(
        fc.property(
          validTermArb,
          validTermArb,
          notVariantsArb,
          (includeTerm, excludeTerm, notOp) => {
            // Skip if terms are the same
            if (includeTerm.toLowerCase() === excludeTerm.toLowerCase()) {
              return true;
            }

            const query = `${includeTerm} ${notOp} ${excludeTerm}`;
            const result = parser.parseQuery(query);

            // Property: excludeTerms SHALL contain the negated term regardless of NOT case
            expect(result.excludeTerms.map((t) => t.toLowerCase())).toContain(
              excludeTerm.toLowerCase()
            );

            // Property: includeTerms SHALL NOT contain the negated term
            expect(result.includeTerms.map((t) => t.toLowerCase())).not.toContain(
              excludeTerm.toLowerCase()
            );

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 1: NOT Operator Exclusion**
   * **Validates: Requirements 1.2, 1.3, 1.5**
   *
   * Invariant: The union of includeTerms and excludeTerms should cover all terms,
   * and they should be disjoint (no overlap).
   */
  describe("Include/Exclude term invariants", () => {
    it("should have disjoint includeTerms and excludeTerms", () => {
      fc.assert(
        fc.property(uniqueTermsArb(1, 3), uniqueTermsArb(1, 3), (includeTerms, excludeTerms) => {
          // Filter out overlap for valid test input
          const filteredExcludeTerms = excludeTerms.filter(
            (et) => !includeTerms.some((it) => it.toLowerCase() === et.toLowerCase())
          );

          if (filteredExcludeTerms.length === 0) {
            return true;
          }

          const includesPart = includeTerms.join(" ");
          const excludesPart = filteredExcludeTerms.map((t) => `NOT ${t}`).join(" ");
          const query = `${includesPart} ${excludesPart}`;

          const result = parser.parseQuery(query);

          // Property: includeTerms and excludeTerms SHALL be disjoint
          const includeSet = new Set(result.includeTerms.map((t) => t.toLowerCase()));
          const excludeSet = new Set(result.excludeTerms.map((t) => t.toLowerCase()));

          for (const term of includeSet) {
            expect(excludeSet.has(term)).toBe(false);
          }

          for (const term of excludeSet) {
            expect(includeSet.has(term)).toBe(false);
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 1: NOT Operator Exclusion**
   * **Validates: Requirements 1.2, 1.3, 1.5**
   *
   * The tsQuery output should contain ! for negated terms.
   */
  describe("tsQuery contains negation operator", () => {
    it("should convert NOT to ! in tsQuery output", () => {
      fc.assert(
        fc.property(validTermArb, validTermArb, (includeTerm, excludeTerm) => {
          // Skip if terms are the same
          if (includeTerm.toLowerCase() === excludeTerm.toLowerCase()) {
            return true;
          }

          const query = `${includeTerm} NOT ${excludeTerm}`;
          const result = parser.parseQuery(query);

          // Property: tsQuery SHALL contain ! operator
          expect(result.tsQuery).toContain("!");

          // Property: tsQuery SHALL NOT contain literal "NOT" (case insensitive)
          expect(result.tsQuery).not.toMatch(/\bNOT\b/i);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
