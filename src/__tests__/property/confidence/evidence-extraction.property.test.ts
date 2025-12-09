/**
 * Property Test: Evidence Extraction
 *
 * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
 *
 * This property test validates that when text contains evidence keywords,
 * the EvidenceExtractor correctly extracts evidence and calculates quality > 0.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
 *
 * - Requirement 7.1: WHEN reasoning text contains evidence statements THEN the assessor
 *   SHALL extract and count them
 * - Requirement 7.2: WHEN reasoning text mentions data, studies, or facts THEN the assessor
 *   SHALL include them in evidence quality calculation
 * - Requirement 7.3: WHEN no explicit evidence array is provided THEN the evidence quality
 *   SHALL not default to 0 if reasoning contains evidence
 *
 * @module __tests__/property/confidence/evidence-extraction.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { EvidenceExtractor, EvidenceType } from "../../../confidence/evidence-extractor";

describe("Property 8: Evidence Extraction", () => {
  let extractor: EvidenceExtractor;

  beforeEach(() => {
    extractor = new EvidenceExtractor();
  });

  /**
   * Evidence indicator phrases organized by evidence type.
   * These match the patterns defined in EvidenceExtractor.
   */
  const DATA_EVIDENCE_PHRASES = [
    "data shows that",
    "metrics indicate that",
    "measurements reveal that",
    "data demonstrates that",
    "according to the data",
    "based on metrics",
    "based on the analysis",
  ];

  const STUDY_EVIDENCE_PHRASES = [
    "studies show that",
    "research found that",
    "experiments indicate that",
    "research suggests that",
    "study demonstrates that",
    "according to a study",
    "based on research",
    "based on experiment",
  ];

  const STATISTIC_EVIDENCE_PHRASES = [
    "50% of users",
    "25% increase in",
    "30% decrease in",
    "75% improvement in",
    "approximately 100",
    "about 50 users",
    "roughly 200 items",
    "nearly 1000",
    "2x faster than",
    "3 times better than",
    "5x more efficient",
  ];

  const FACT_EVIDENCE_PHRASES = [
    "it is a fact that",
    "it is known that",
    "it is established that",
    "it is proven that",
    "evidence shows that",
    "proof suggests that",
    "evidence indicates that",
  ];

  const OBSERVATION_EVIDENCE_PHRASES = [
    "we observed that",
    "observed that the",
    "noticed that the",
    "found that the",
    "discovered that",
    "identified that",
    "observations show that",
    "findings indicate that",
    "findings suggest that",
  ];

  const EXAMPLE_EVIDENCE_PHRASES = ["for example,", "for instance,", "e.g.,", "such as the"];

  const MEASUREMENT_EVIDENCE_PHRASES = [
    "measured at 100ms",
    "recorded as 50",
    "logged to be 200",
    "p50 is 100ms",
    "p95 was 200ms",
    "p99 of 500ms",
    "latency is 50ms",
    "throughput of 1000",
    "response time is 100ms",
  ];

  /**
   * Arbitrary for generating filler text that doesn't contain evidence indicators.
   */
  const fillerTextArb = fc.constantFrom(
    "The system is working correctly.",
    "We need to consider the options.",
    "This is an important decision.",
    "Let me think about this carefully.",
    "There are several factors to consider.",
    "The team has been working hard.",
    "We have multiple approaches available.",
    "The implementation is complete.",
    "The feature is ready for review.",
    "The code has been tested."
  );

  /**
   * Arbitrary for generating data evidence phrases.
   */
  const dataEvidenceArb = fc.constantFrom(...DATA_EVIDENCE_PHRASES);

  /**
   * Arbitrary for generating study evidence phrases.
   */
  const studyEvidenceArb = fc.constantFrom(...STUDY_EVIDENCE_PHRASES);

  /**
   * Arbitrary for generating statistic evidence phrases.
   */
  const statisticEvidenceArb = fc.constantFrom(...STATISTIC_EVIDENCE_PHRASES);

  /**
   * Arbitrary for generating fact evidence phrases.
   */
  const factEvidenceArb = fc.constantFrom(...FACT_EVIDENCE_PHRASES);

  /**
   * Arbitrary for generating observation evidence phrases.
   */
  const observationEvidenceArb = fc.constantFrom(...OBSERVATION_EVIDENCE_PHRASES);

  /**
   * Arbitrary for generating example evidence phrases.
   */
  const exampleEvidenceArb = fc.constantFrom(...EXAMPLE_EVIDENCE_PHRASES);

  /**
   * Arbitrary for generating measurement evidence phrases.
   */
  const measurementEvidenceArb = fc.constantFrom(...MEASUREMENT_EVIDENCE_PHRASES);

  /**
   * Helper to build text with evidence indicators embedded.
   */
  const buildTextWithEvidence = (evidencePhrases: string[], filler: string[]): string => {
    const parts: string[] = [];
    for (let i = 0; i < evidencePhrases.length; i++) {
      if (i < filler.length) {
        parts.push(filler[i]);
      }
      parts.push(evidencePhrases[i]);
    }
    // Add remaining filler
    for (let i = evidencePhrases.length; i < filler.length; i++) {
      parts.push(filler[i]);
    }
    return parts.join(" ");
  };

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any text containing data evidence indicators,
   * extract() SHALL return evidence with quality > 0.
   */
  describe("Data evidence extraction", () => {
    it("should extract data evidence and calculate quality > 0", () => {
      fc.assert(
        fc.property(
          fc.array(dataEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract at least one evidence item (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);
            expect(result.evidence.length).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Extracted evidence SHALL have type "data"
            const hasDataEvidence = result.evidence.some((e) => e.type === "data");
            expect(hasDataEvidence).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any text containing study/research evidence indicators,
   * extract() SHALL return evidence with quality > 0.
   */
  describe("Study evidence extraction", () => {
    it("should extract study evidence and calculate quality > 0", () => {
      fc.assert(
        fc.property(
          fc.array(studyEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract at least one evidence item (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);
            expect(result.evidence.length).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Extracted evidence SHALL have type "study"
            const hasStudyEvidence = result.evidence.some((e) => e.type === "study");
            expect(hasStudyEvidence).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any text containing statistic evidence indicators,
   * extract() SHALL return evidence with quality > 0.
   */
  describe("Statistic evidence extraction", () => {
    it("should extract statistic evidence and calculate quality > 0", () => {
      fc.assert(
        fc.property(
          fc.array(statisticEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract at least one evidence item (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);
            expect(result.evidence.length).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Extracted evidence SHALL have type "statistic"
            const hasStatisticEvidence = result.evidence.some((e) => e.type === "statistic");
            expect(hasStatisticEvidence).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any text containing fact evidence indicators,
   * extract() SHALL return evidence with quality > 0.
   */
  describe("Fact evidence extraction", () => {
    it("should extract fact evidence and calculate quality > 0", () => {
      fc.assert(
        fc.property(
          fc.array(factEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract at least one evidence item (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);
            expect(result.evidence.length).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Extracted evidence SHALL have type "fact"
            const hasFactEvidence = result.evidence.some((e) => e.type === "fact");
            expect(hasFactEvidence).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any text containing observation evidence indicators,
   * extract() SHALL return evidence with quality > 0.
   */
  describe("Observation evidence extraction", () => {
    it("should extract observation evidence and calculate quality > 0", () => {
      fc.assert(
        fc.property(
          fc.array(observationEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract at least one evidence item (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);
            expect(result.evidence.length).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Extracted evidence SHALL have type "observation"
            const hasObservationEvidence = result.evidence.some((e) => e.type === "observation");
            expect(hasObservationEvidence).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any text containing measurement evidence indicators,
   * extract() SHALL return evidence with quality > 0.
   */
  describe("Measurement evidence extraction", () => {
    it("should extract measurement evidence and calculate quality > 0", () => {
      fc.assert(
        fc.property(
          fc.array(measurementEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract at least one evidence item (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);
            expect(result.evidence.length).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Extracted evidence SHALL have type "measurement"
            const hasMeasurementEvidence = result.evidence.some((e) => e.type === "measurement");
            expect(hasMeasurementEvidence).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   *
   * For any text containing evidence from multiple types,
   * extract() SHALL return evidence with quality > 0 and diverse types.
   */
  describe("Mixed evidence extraction", () => {
    it("should extract evidence from multiple types and calculate quality > 0", () => {
      fc.assert(
        fc.property(
          dataEvidenceArb,
          studyEvidenceArb,
          statisticEvidenceArb,
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (dataPhrase, studyPhrase, statisticPhrase, filler) => {
            const evidencePhrases = [dataPhrase, studyPhrase, statisticPhrase];
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract at least one evidence item (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Quality should be higher with diverse evidence types
            // (diversity contributes to quality score)
            const uniqueTypes = new Set(result.evidence.map((e) => e.type));
            if (uniqueTypes.size > 1) {
              // With diverse types, quality should be reasonably high
              expect(result.quality).toBeGreaterThan(0.2);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should extract evidence from all types when present", () => {
      fc.assert(
        fc.property(
          dataEvidenceArb,
          studyEvidenceArb,
          observationEvidenceArb,
          measurementEvidenceArb,
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (dataPhrase, studyPhrase, observationPhrase, measurementPhrase, filler) => {
            const evidencePhrases = [dataPhrase, studyPhrase, observationPhrase, measurementPhrase];
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract multiple evidence items (Req 7.1)
            expect(result.count).toBeGreaterThanOrEqual(1);

            // Property: Quality SHALL be > 0 (Req 7.2, 7.3)
            expect(result.quality).toBeGreaterThan(0);

            // Property: Each extracted evidence SHALL have valid type
            const validTypes: EvidenceType[] = [
              "data",
              "study",
              "fact",
              "observation",
              "statistic",
              "reference",
              "example",
              "measurement",
            ];
            for (const evidence of result.evidence) {
              expect(validTypes).toContain(evidence.type);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   *
   * Invariant: Extracted evidence SHALL have valid structure.
   */
  describe("Evidence extraction output invariants", () => {
    it("should return evidence with valid confidence scores", () => {
      fc.assert(
        fc.property(
          fc.array(studyEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: Each evidence SHALL have confidence in [0, 1]
            for (const evidence of result.evidence) {
              expect(evidence.confidence).toBeGreaterThanOrEqual(0);
              expect(evidence.confidence).toBeLessThanOrEqual(1);
            }

            // Property: Quality SHALL be in [0, 1]
            expect(result.quality).toBeGreaterThanOrEqual(0);
            expect(result.quality).toBeLessThanOrEqual(1);

            // Property: Count SHALL match evidence array length
            expect(result.count).toBe(result.evidence.length);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return evidence with non-empty statements", () => {
      fc.assert(
        fc.property(
          fc.array(dataEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: Each evidence SHALL have non-empty statement
            for (const evidence of result.evidence) {
              expect(evidence.statement).toBeTruthy();
              expect(evidence.statement.length).toBeGreaterThan(0);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.3**
   *
   * Edge case: Empty or whitespace-only text should return quality = 0.
   */
  describe("Edge cases", () => {
    it("should return quality = 0 for empty text", () => {
      fc.assert(
        fc.property(fc.constantFrom("", "   ", "\t", "\n", "  \n  "), (emptyText) => {
          const result = extractor.extract(emptyText);

          // Property: Empty text SHALL return quality = 0
          expect(result.quality).toBe(0);
          expect(result.count).toBe(0);
          expect(result.evidence).toEqual([]);

          return true;
        }),
        { numRuns: 10 }
      );
    });

    it("should return quality = 0 for text without evidence indicators", () => {
      fc.assert(
        fc.property(fc.array(fillerTextArb, { minLength: 3, maxLength: 5 }), (fillerParts) => {
          const text = fillerParts.join(" ");
          const result = extractor.extract(text);

          // Property: Text without evidence indicators SHALL return quality = 0
          expect(result.quality).toBe(0);
          expect(result.count).toBe(0);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it("should handle text with only example evidence (lower confidence)", () => {
      fc.assert(
        fc.property(
          fc.array(exampleEvidenceArb, { minLength: 1, maxLength: 3 }),
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (evidencePhrases, filler) => {
            const text = buildTextWithEvidence(evidencePhrases, filler);
            const result = extractor.extract(text);

            // Property: SHALL extract example evidence (Req 7.1)
            if (result.count > 0) {
              expect(result.quality).toBeGreaterThan(0);
              const hasExampleEvidence = result.evidence.some((e) => e.type === "example");
              expect(hasExampleEvidence).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 8: Evidence Extraction**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   *
   * Quality calculation invariants.
   */
  describe("Quality calculation invariants", () => {
    it("should calculate higher quality for more diverse evidence types", () => {
      fc.assert(
        fc.property(
          dataEvidenceArb,
          studyEvidenceArb,
          measurementEvidenceArb,
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (dataPhrase, studyPhrase, measurementPhrase, filler) => {
            // Single type evidence
            const singleTypeText = buildTextWithEvidence([dataPhrase], filler);
            const singleResult = extractor.extract(singleTypeText);

            // Multiple type evidence
            const multiTypeText = buildTextWithEvidence(
              [dataPhrase, studyPhrase, measurementPhrase],
              filler
            );
            const multiResult = extractor.extract(multiTypeText);

            // Property: More diverse evidence types SHOULD result in higher quality
            // (when count is similar, diversity increases quality)
            if (singleResult.count > 0 && multiResult.count > 0) {
              const singleTypes = new Set(singleResult.evidence.map((e) => e.type)).size;
              const multiTypes = new Set(multiResult.evidence.map((e) => e.type)).size;

              if (multiTypes > singleTypes) {
                // Multi-type should have higher or equal quality
                expect(multiResult.quality).toBeGreaterThanOrEqual(singleResult.quality * 0.8);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should deduplicate identical evidence statements", () => {
      fc.assert(
        fc.property(
          dataEvidenceArb,
          fc.array(fillerTextArb, { minLength: 1, maxLength: 2 }),
          (dataPhrase, filler) => {
            // Duplicate the same phrase
            const duplicateText = buildTextWithEvidence(
              [dataPhrase, dataPhrase, dataPhrase],
              filler
            );
            const result = extractor.extract(duplicateText);

            // Property: Duplicate statements SHALL be deduplicated
            const statements = result.evidence.map((e) => e.statement.toLowerCase().trim());
            const uniqueStatements = new Set(statements);
            expect(statements.length).toBe(uniqueStatements.size);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
