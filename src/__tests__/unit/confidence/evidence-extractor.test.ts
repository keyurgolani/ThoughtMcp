/**
 * Evidence Extractor Unit Tests
 *
 * Tests for the EvidenceExtractor component that extracts evidence
 * statements from reasoning text.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { EvidenceExtractor } from "../../../confidence/evidence-extractor";

describe("EvidenceExtractor", () => {
  let extractor: EvidenceExtractor;

  beforeEach(() => {
    extractor = new EvidenceExtractor();
  });

  describe("extract", () => {
    it("should return empty result for empty text", () => {
      const result = extractor.extract("");
      expect(result.evidence).toEqual([]);
      expect(result.quality).toBe(0);
      expect(result.count).toBe(0);
    });

    it("should return empty result for null/undefined text", () => {
      const result1 = extractor.extract(null as unknown as string);
      expect(result1.evidence).toEqual([]);
      expect(result1.count).toBe(0);

      const result2 = extractor.extract(undefined as unknown as string);
      expect(result2.evidence).toEqual([]);
      expect(result2.count).toBe(0);
    });

    it("should extract data-based evidence", () => {
      const text = "The data shows a 40% improvement in performance.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "data" || e.type === "statistic")).toBe(true);
    });

    it("should extract study-based evidence", () => {
      const text =
        "Research shows that this approach is effective. Studies found significant improvements.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "study")).toBe(true);
    });

    it("should extract statistical evidence", () => {
      const text = "We observed a 25% increase in throughput. The system is 3x faster than before.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "statistic")).toBe(true);
    });

    it("should extract observation-based evidence", () => {
      const text =
        "We observed that the system performs better under load. Our findings show consistent results.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "observation")).toBe(true);
    });

    it("should extract measurement-based evidence", () => {
      const text = "The p95 latency is 150ms. Response time was measured at 50ms.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "measurement")).toBe(true);
    });

    it("should extract reference-based evidence", () => {
      const text = "According to the documentation, this is the recommended approach.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "reference")).toBe(true);
    });

    it("should extract example-based evidence", () => {
      const text = "For example, when we increased the cache size, performance improved.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "example")).toBe(true);
    });

    it("should extract fact-based evidence", () => {
      const text =
        "It is a fact that caching improves performance. Evidence shows that latency decreases.";
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThan(0);
      expect(result.evidence.some((e) => e.type === "fact")).toBe(true);
    });

    it("should handle text with no evidence", () => {
      const text = "This is just a simple statement without any evidence.";
      const result = extractor.extract(text);

      expect(result.count).toBe(0);
      expect(result.quality).toBe(0);
    });

    it("should deduplicate identical evidence", () => {
      const text = "The data shows improvement. The data shows improvement.";
      const result = extractor.extract(text);

      // Should only have one unique evidence item
      expect(result.count).toBe(1);
    });

    it("should extract multiple types of evidence", () => {
      const text = `
        Research shows this approach works well.
        The data indicates a 30% improvement.
        We observed consistent behavior across tests.
        The p99 latency is 200ms.
      `;
      const result = extractor.extract(text);

      expect(result.count).toBeGreaterThanOrEqual(3);

      // Check for diversity of evidence types
      const types = new Set(result.evidence.map((e) => e.type));
      expect(types.size).toBeGreaterThanOrEqual(2);
    });

    it("should list extracted evidence items in response (Req 7.4)", () => {
      const text = "Studies show that this approach is effective. The p95 latency is 150ms.";
      const result = extractor.extract(text);

      // Verify evidence items are listed with required properties
      expect(result.evidence).toBeInstanceOf(Array);
      expect(result.evidence.length).toBeGreaterThan(0);

      for (const item of result.evidence) {
        expect(item).toHaveProperty("statement");
        expect(item).toHaveProperty("type");
        expect(item).toHaveProperty("confidence");
        expect(item.statement).toBeTruthy();
        expect(typeof item.confidence).toBe("number");
      }
    });

    it("should include evidence in quality calculation (Req 7.2)", () => {
      const textWithEvidence = "Research shows significant improvements. Data indicates 50% gains.";
      const textWithoutEvidence = "This is a simple statement without any evidence indicators.";

      const resultWithEvidence = extractor.extract(textWithEvidence);
      const resultWithoutEvidence = extractor.extract(textWithoutEvidence);

      // Text with evidence should have quality > 0
      expect(resultWithEvidence.quality).toBeGreaterThan(0);
      // Text without evidence should have quality = 0
      expect(resultWithoutEvidence.quality).toBe(0);
    });
  });

  describe("calculateQuality", () => {
    it("should return 0 for empty evidence array", () => {
      const quality = extractor.calculateQuality([]);
      expect(quality).toBe(0);
    });

    it("should return higher quality for more evidence", () => {
      const singleEvidence = [{ statement: "Test", type: "data" as const, confidence: 0.8 }];
      const multipleEvidence = [
        { statement: "Test 1", type: "data" as const, confidence: 0.8 },
        { statement: "Test 2", type: "study" as const, confidence: 0.9 },
        { statement: "Test 3", type: "observation" as const, confidence: 0.75 },
      ];

      const singleQuality = extractor.calculateQuality(singleEvidence);
      const multipleQuality = extractor.calculateQuality(multipleEvidence);

      expect(multipleQuality).toBeGreaterThan(singleQuality);
    });

    it("should return higher quality for diverse evidence types", () => {
      const sameType = [
        { statement: "Test 1", type: "data" as const, confidence: 0.8 },
        { statement: "Test 2", type: "data" as const, confidence: 0.8 },
        { statement: "Test 3", type: "data" as const, confidence: 0.8 },
      ];
      const diverseTypes = [
        { statement: "Test 1", type: "data" as const, confidence: 0.8 },
        { statement: "Test 2", type: "study" as const, confidence: 0.8 },
        { statement: "Test 3", type: "observation" as const, confidence: 0.8 },
      ];

      const sameQuality = extractor.calculateQuality(sameType);
      const diverseQuality = extractor.calculateQuality(diverseTypes);

      expect(diverseQuality).toBeGreaterThan(sameQuality);
    });

    it("should return higher quality for higher confidence evidence", () => {
      const lowConfidence = [{ statement: "Test", type: "data" as const, confidence: 0.5 }];
      const highConfidence = [{ statement: "Test", type: "data" as const, confidence: 0.95 }];

      const lowQuality = extractor.calculateQuality(lowConfidence);
      const highQuality = extractor.calculateQuality(highConfidence);

      expect(highQuality).toBeGreaterThan(lowQuality);
    });

    it("should cap quality at 1.0", () => {
      const manyEvidence = Array.from({ length: 10 }, (_, i) => ({
        statement: `Test ${i}`,
        type: ["data", "study", "observation", "measurement"][i % 4] as
          | "data"
          | "study"
          | "observation"
          | "measurement",
        confidence: 0.95,
      }));

      const quality = extractor.calculateQuality(manyEvidence);
      expect(quality).toBeLessThanOrEqual(1.0);
    });
  });
});
