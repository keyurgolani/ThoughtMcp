/**
 * Tests for standardized response formatting
 */

import { describe, expect, it } from "vitest";
import { ResponseFormatter } from "../../utils/ResponseFormatter.js";

describe("Standardized Response Format", () => {
  const mockData = {
    content: "This is a test response with some content",
    confidence: 0.85,
    reasoning_path: [
      { type: "analysis", content: "First step", confidence: 0.8 },
      { type: "synthesis", content: "Second step", confidence: 0.9 },
    ],
  };

  describe("createStandardizedResponse", () => {
    it("should create response with summary verbosity", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        150,
        {
          verbosityLevel: "summary",
          confidence: 0.85,
          includeExecutiveSummary: true,
        }
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.executive_summary).toBeDefined();
      expect(response.executive_summary!.key_findings.length).toBeGreaterThan(
        0
      );
      expect(response.executive_summary!.time_to_read).toContain("min read");
      expect(response.metadata.response_format?.verbosity_level).toBe(
        "summary"
      );
      expect(response.metadata.response_format?.has_executive_summary).toBe(
        true
      );
    });

    it("should create response with detailed verbosity", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        150,
        {
          verbosityLevel: "detailed",
          confidence: 0.85,
          includeExecutiveSummary: false,
        }
      );

      expect(response.metadata.response_format?.verbosity_level).toBe(
        "detailed"
      );
      expect(response.metadata.response_format?.has_executive_summary).toBe(
        false
      );
      expect(response.executive_summary).toBeUndefined();
    });

    it("should include confidence interpretation", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        150,
        {
          confidence: 0.85,
        }
      );

      const confidenceInterp =
        response.metadata.response_format?.confidence_interpretation;
      expect(confidenceInterp).toBeDefined();
      expect(confidenceInterp!.score).toBe(0.85);
      expect(confidenceInterp!.level).toBe("high");
      expect(confidenceInterp!.meaning).toContain("reliable");
      expect(confidenceInterp!.actionable_advice.length).toBeGreaterThan(0);
      expect(confidenceInterp!.reliability_factors.length).toBeGreaterThan(0);
    });

    it("should apply data filtering when specified", () => {
      const arrayData = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        content: `Item ${i}`,
        priority: Math.random(),
      }));

      const response = ResponseFormatter.createStandardizedResponse(
        arrayData,
        "test_tool",
        100,
        {
          filteringOptions: {
            maxItems: 5,
            priorityThreshold: 0.5,
          },
        }
      );

      expect(response.filtered_data).toBeDefined();
      expect(response.filtered_data!.total_items).toBe(20);
      expect(response.filtered_data!.shown_items).toBeLessThanOrEqual(5);
      expect(response.filtered_data!.filter_criteria.length).toBeGreaterThan(0);
      expect(response.filtered_data!.view_all_hint).toContain("verbosity");
    });
  });

  describe("confidence interpretation", () => {
    it("should interpret very high confidence correctly", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100,
        { confidence: 0.95 }
      );

      const interp =
        response.metadata.response_format?.confidence_interpretation;
      expect(interp?.level).toBe("very_high");
      expect(interp?.meaning).toContain("Extremely reliable");
    });

    it("should interpret low confidence correctly", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100,
        { confidence: 0.25 }
      );

      const interp =
        response.metadata.response_format?.confidence_interpretation;
      expect(interp?.level).toBe("very_low");
      expect(interp?.meaning).toContain("Very low reliability");
      expect(
        interp?.actionable_advice.some((advice) =>
          advice.includes("verify independently")
        )
      ).toBe(true);
    });

    it("should provide tool-specific advice", () => {
      const thinkResponse = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100,
        { confidence: 0.3 }
      );

      const recallResponse = ResponseFormatter.createStandardizedResponse(
        mockData,
        "recall",
        100,
        { confidence: 0.3 }
      );

      const thinkAdvice =
        thinkResponse.metadata.response_format?.confidence_interpretation
          ?.actionable_advice;
      const recallAdvice =
        recallResponse.metadata.response_format?.confidence_interpretation
          ?.actionable_advice;

      expect(thinkAdvice).not.toEqual(recallAdvice);
      expect(
        thinkAdvice?.some((advice) => advice.includes("deliberative"))
      ).toBe(true);
      expect(recallAdvice?.some((advice) => advice.includes("search"))).toBe(
        true
      );
    });
  });

  describe("executive summary generation", () => {
    it("should generate appropriate executive summary for think tool", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        150,
        {
          verbosityLevel: "standard",
          confidence: 0.75,
          includeExecutiveSummary: true,
        }
      );

      const summary = response.executive_summary!;
      expect(summary.key_findings.length).toBeGreaterThan(0);
      expect(summary.main_recommendation).toContain("review");
      expect(summary.confidence_assessment).toContain("75%");
      expect(summary.next_steps.length).toBeGreaterThan(0);
      expect(summary.time_to_read).toMatch(/\d+ min read/);
    });

    it("should generate different summaries for different tools", () => {
      const thinkSummary = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100,
        { includeExecutiveSummary: true }
      ).executive_summary!;

      const recallSummary = ResponseFormatter.createStandardizedResponse(
        { memories: [{ id: "1", content: "test" }], search_time_ms: 50 },
        "recall",
        100,
        { includeExecutiveSummary: true }
      ).executive_summary!;

      expect(thinkSummary.main_recommendation).not.toBe(
        recallSummary.main_recommendation
      );
      expect(thinkSummary.next_steps).not.toEqual(recallSummary.next_steps);
    });
  });

  describe("user guidance integration", () => {
    it("should include user guidance by default", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100
      );

      expect(response.metadata.user_guidance).toBeDefined();
      expect(response.metadata.user_guidance?.complexity_level).toBeDefined();
      expect(
        response.metadata.user_guidance?.suggested_next_steps
      ).toBeDefined();
      expect(response.metadata.user_guidance?.related_tools).toBeDefined();
    });

    it("should adapt guidance to user level", () => {
      const beginnerResponse = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100,
        { userLevel: "beginner" }
      );

      const advancedResponse = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100,
        { userLevel: "advanced" }
      );

      const beginnerSteps =
        beginnerResponse.metadata.user_guidance?.suggested_next_steps;
      const advancedSteps =
        advancedResponse.metadata.user_guidance?.suggested_next_steps;

      expect(beginnerSteps).not.toEqual(advancedSteps);
    });
  });

  describe("response format metadata", () => {
    it("should include complete format metadata", () => {
      const response = ResponseFormatter.createStandardizedResponse(
        mockData,
        "think",
        100,
        {
          verbosityLevel: "detailed",
          confidence: 0.8,
          includeExecutiveSummary: true,
        }
      );

      const format = response.metadata.response_format!;
      expect(format.verbosity_level).toBe("detailed");
      expect(format.has_executive_summary).toBe(true);
      expect(format.confidence_interpretation).toBeDefined();
    });

    it("should track filtering when applied", () => {
      const arrayData = Array.from({ length: 10 }, (_, i) => ({ id: i }));

      const response = ResponseFormatter.createStandardizedResponse(
        arrayData,
        "test_tool",
        100,
        {
          filteringOptions: { maxItems: 5 },
        }
      );

      expect(response.metadata.response_format?.filtering_applied).toContain(
        "Limited to top 5 items"
      );
    });
  });
});
