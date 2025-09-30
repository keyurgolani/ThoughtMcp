// Test compilation of handleAnalyzeReasoning method
import { AnalysisResult, AnalyzeReasoningArgs } from "./src/types/mcp.js";

class TestClass {
  async handleAnalyzeReasoning(
    args: AnalyzeReasoningArgs
  ): Promise<AnalysisResult> {
    console.error(
      `[DEBUG] handleAnalyzeReasoning called at ${new Date().toISOString()}`
    );

    return {
      coherence_score: 0.5,
      confidence_assessment: "Test",
      detected_biases: [],
      suggested_improvements: [],
      reasoning_quality: {
        logical_consistency: 0.5,
        evidence_support: 0.5,
        completeness: 0.5,
      },
    };
  }
}
