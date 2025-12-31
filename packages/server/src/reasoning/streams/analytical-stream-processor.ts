import { z } from "zod";
import { LLMClient } from "../../ai/llm-client.js";
import { PromptBinder } from "../../ai/prompt-binder.js";
import { Logger } from "../../utils/logger.js";
import { KeyTermExtractor, type KeyTerms } from "../key-term-extractor.js";
import { StreamManager } from "../stream-manager.js";
import type { StreamProcessor } from "../stream.types.js";
import {
  StreamStatus,
  StreamType,
  type Insight,
  type Problem,
  type StreamResult,
} from "../types.js";

// -- Schemas for AI Output --

const InsightSchema = z.object({
  content: z.string().describe("The insight text"),
  confidence: z.number().min(0).max(1).describe("Confidence in this specific insight"),
  importance: z.number().min(0).max(1).describe("Importance of this insight"),
});

const AnalyticalOutputSchema = z.object({
  reasoning: z.array(z.string()).describe("Step-by-step deduction steps"),
  conclusion: z.string().describe("Final analytical conclusion"),
  insights: z.array(InsightSchema).describe("Key insights derived from analysis"),
  confidence: z.number().min(0).max(1).describe("Overall confidence score"),
});

type AnalyticalOutput = z.infer<typeof AnalyticalOutputSchema>;

/**
 * Analytical stream processor
 *
 * Validates inputs and delegates specific reasoning tasks to the LLM.
 * Falls back to rule-based analysis when LLM is unavailable.
 */
export class AnalyticalStreamProcessor implements StreamProcessor {
  private readonly llm: LLMClient;
  private readonly keyTermExtractor: KeyTermExtractor;
  private llmAvailable: boolean | null = null;

  // System prompt defining the persona and rules - simplified for smaller LLMs
  private readonly SYSTEM_PROMPT = `You are an Analytical Engine performing logical, systematic analysis.

METHODOLOGY:
1. Decompose the problem into components
2. Evaluate evidence strictly
3. Identify root causes and relationships
4. Deduce conclusions based on logic

Provide step-by-step reasoning, key insights, and a confidence score (0.0-1.0).`;

  constructor(llm?: LLMClient) {
    // Use LLM_TIMEOUT from environment, default to 60 seconds for larger models
    // This allows time for model loading on first request
    const llmTimeout = process.env.LLM_TIMEOUT ? parseInt(process.env.LLM_TIMEOUT, 10) : 60000;

    // Use provided LLM client or create a new one
    this.llm = llm ?? new LLMClient({ timeout: llmTimeout });
    this.keyTermExtractor = new KeyTermExtractor();
  }

  getStreamType(): StreamType {
    return StreamType.ANALYTICAL;
  }

  async process(problem: Problem): Promise<StreamResult> {
    const startTime = Date.now();

    // 1. Validation
    if (!problem.description) {
      throw new Error("Problem description is required");
    }

    // Try LLM-based analysis first, fall back to rule-based if unavailable
    try {
      // Check if LLM is available (only check once)
      this.llmAvailable ??= await this.checkLLMAvailability();

      if (this.llmAvailable) {
        return await this.processWithLLM(problem, startTime);
      } else {
        Logger.debug("AnalyticalStreamProcessor: LLM unavailable, using rule-based fallback");
        return await this.processWithRules(problem, startTime);
      }
    } catch (error) {
      // If LLM fails, try rule-based fallback
      Logger.warn("AnalyticalStreamProcessor: LLM failed, falling back to rule-based analysis", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.llmAvailable = false;
      return await this.processWithRules(problem, startTime);
    }
  }

  /**
   * Check if LLM is available by making a simple test request
   */
  private async checkLLMAvailability(): Promise<boolean> {
    try {
      const baseUrl = process.env.OLLAMA_HOST ?? "http://localhost:11434";
      const modelName = process.env.LLM_MODEL ?? "llama3.2:1b";

      Logger.debug("AnalyticalStreamProcessor: Checking LLM availability", {
        baseUrl,
        modelName,
      });

      const response = await fetch(`${baseUrl}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        Logger.warn("AnalyticalStreamProcessor: Ollama API not responding", {
          status: response.status,
        });
        return false;
      }

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models ?? [];

      // Check if any chat model is available (not just embedding models)
      const chatModels = models.filter(
        (m) =>
          !m.name.includes("embed") &&
          !m.name.includes("nomic") &&
          !m.name.includes("bge") &&
          !m.name.includes("all-minilm")
      );

      Logger.debug("AnalyticalStreamProcessor: LLM availability check complete", {
        chatModelsAvailable: chatModels.length,
        modelNames: chatModels.map((m) => m.name).slice(0, 5),
      });

      return chatModels.length > 0;
    } catch (error) {
      Logger.warn("AnalyticalStreamProcessor: LLM availability check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Process using LLM-based analysis
   */
  private async processWithLLM(problem: Problem, startTime: number): Promise<StreamResult> {
    // 2. Prepare Prompt
    const modelName = process.env.LLM_MODEL ?? "llama3.2:1b";
    const timeout = process.env.LLM_TIMEOUT ? parseInt(process.env.LLM_TIMEOUT, 10) : 60000;

    Logger.info("AnalyticalStreamProcessor: Starting LLM-based analysis", {
      problemId: problem.id,
      model: modelName,
      timeout,
    });

    const systemInstruction = PromptBinder.bindSchemaToPrompt(
      this.SYSTEM_PROMPT,
      AnalyticalOutputSchema
    );

    const streamId = problem.id; // Use problem ID as session ID for broadcasting

    // Stream updates logic
    const onChunk = (token: string): void => {
      // Broadcast token for Glass Box Observability
      StreamManager.getInstance().broadcast(streamId, {
        type: "token",
        // @ts-ignore
        streamType: StreamType.ANALYTICAL,
        content: token,
      });
    };

    const userMessage = `
Problem: "${problem.description}"
Context: "${problem.context || "No additional context provided"}"
Constraints: ${problem.constraints?.join(", ") ?? "None"}

Perform a systematic analysis.
`;

    // 3. Call LLM
    Logger.debug("AnalyticalStreamProcessor: Calling LLM");

    const aiResponseContent = await this.llm.streamChat(
      [
        { role: "system", content: systemInstruction },
        { role: "user", content: userMessage },
      ],
      onChunk,
      AnalyticalOutputSchema
    );

    Logger.info("AnalyticalStreamProcessor: LLM response received", {
      problemId: problem.id,
      responseLength: aiResponseContent.length,
      processingTime: Date.now() - startTime,
    });

    // 4. Parse Output
    // LLMClient.streamChat with schema returns a string that *should* be JSON.
    // However, if we pass a schema, does it validate and return the object?
    // Looking at LLMClient implementation (implied), streamChat usually returns string.
    // We parse it here.

    let parsedOutput: AnalyticalOutput;
    try {
      parsedOutput = JSON.parse(aiResponseContent) as AnalyticalOutput;
      // Optional: runtime validation again using Zod if we don't trust the LLM fully despite schema prompting
      parsedOutput = AnalyticalOutputSchema.parse(parsedOutput);
    } catch (parseError) {
      Logger.error("AnalyticalStreamProcessor: Failed to parse AI response", {
        error: parseError,
        response: aiResponseContent,
      });
      throw new Error("Invalid response format from AI");
    }

    // 3. Transform to StreamResult
    const insights = parsedOutput.insights.map((i) => ({
      ...i,
      source: StreamType.ANALYTICAL,
      referencedTerms: [],
    }));

    return {
      streamId: `analytical-${Date.now()}`, // Temporary ID, will be managed by wrapper/manager
      streamType: StreamType.ANALYTICAL,
      conclusion: parsedOutput.conclusion,
      reasoning: parsedOutput.reasoning,
      insights: insights,
      confidence: parsedOutput.confidence,
      processingTime: Date.now() - startTime,
      status: StreamStatus.COMPLETED,
    };
  }

  /**
   * Process using rule-based analysis (fallback when LLM unavailable)
   */
  private async processWithRules(problem: Problem, startTime: number): Promise<StreamResult> {
    const reasoning: string[] = [];
    const insights: Insight[] = [];

    try {
      // Extract key terms for problem-specific analysis
      const keyTerms = this.keyTermExtractor.extract(problem.description, problem.context);

      // Step 1: Problem decomposition
      reasoning.push(
        `Analyzing problem: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`
      );

      // Step 2: Identify key components
      const components = this.identifyComponents(problem, keyTerms);
      reasoning.push(`Identified ${components.length} key components: ${components.join(", ")}`);

      // Step 3: Analyze relationships
      const relationships = this.analyzeRelationships(problem, keyTerms);
      reasoning.push(`Analyzed structural relationships: ${relationships}`);
      insights.push({
        content: relationships,
        source: StreamType.ANALYTICAL,
        confidence: 0.7,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(relationships, keyTerms),
      });

      // Step 4: Evaluate evidence
      const evidenceAnalysis = this.evaluateEvidence(problem, keyTerms);
      reasoning.push(`Evidence evaluation: ${evidenceAnalysis}`);
      insights.push({
        content: evidenceAnalysis,
        source: StreamType.ANALYTICAL,
        confidence: 0.65,
        importance: 0.7,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(evidenceAnalysis, keyTerms),
      });

      // Step 5: Identify root causes
      const rootCauses = this.identifyRootCauses(problem, keyTerms);
      reasoning.push(`Root cause analysis: ${rootCauses}`);
      insights.push({
        content: rootCauses,
        source: StreamType.ANALYTICAL,
        confidence: 0.6,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(rootCauses, keyTerms),
      });

      // Step 6: Consider constraints
      if (problem.constraints && problem.constraints.length > 0) {
        reasoning.push(`Constraints considered: ${problem.constraints.join(", ")}`);
      }

      // Step 7: Generate conclusion
      const conclusion = this.generateConclusion(problem, keyTerms, insights);
      reasoning.push(`Conclusion: ${conclusion}`);

      // Calculate confidence
      const confidence = this.calculateConfidence(problem, insights);

      return {
        streamId: `analytical-${Date.now()}`,
        streamType: StreamType.ANALYTICAL,
        conclusion,
        reasoning,
        insights,
        confidence,
        processingTime: Date.now() - startTime,
        status: StreamStatus.COMPLETED,
      };
    } catch (error) {
      return {
        streamId: `analytical-failed-${Date.now()}`,
        streamType: StreamType.ANALYTICAL,
        conclusion: "Analysis failed",
        reasoning: [String(error)],
        insights: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
        status: StreamStatus.FAILED,
        error: error as Error,
      };
    }
  }

  /**
   * Identify key components of the problem
   */
  private identifyComponents(problem: Problem, keyTerms: KeyTerms): string[] {
    const components: string[] = [];

    // Add primary subject
    if (keyTerms.primarySubject) {
      components.push(keyTerms.primarySubject);
    }

    // Add domain terms
    components.push(...keyTerms.domainTerms.slice(0, 3));

    // Add action verbs as process components
    if (keyTerms.actionVerbs.length > 0) {
      components.push(`${keyTerms.actionVerbs[0]} process`);
    }

    // Add goal-related components
    if (problem.goals && problem.goals.length > 0) {
      components.push(`goal: ${problem.goals[0]}`);
    }

    return components.length > 0 ? components : ["main subject", "context", "constraints"];
  }

  /**
   * Analyze relationships between components
   */
  private analyzeRelationships(problem: Problem, keyTerms: KeyTerms): string {
    const primaryTerm = keyTerms.primarySubject ?? keyTerms.terms[0] ?? "the subject";
    const domainTerm = keyTerms.domainTerms[0] ?? "the domain";

    if (problem.context && problem.context.length > 20) {
      return `${primaryTerm} is structurally connected to ${domainTerm} through the described context, suggesting a causal relationship`;
    }

    return `${primaryTerm} appears to be the central element, with ${domainTerm} serving as a supporting factor`;
  }

  /**
   * Evaluate available evidence
   */
  private evaluateEvidence(problem: Problem, keyTerms: KeyTerms): string {
    const primaryTerm = keyTerms.primarySubject ?? "the problem";

    if (problem.context && problem.context.length > 50) {
      return `Sufficient context provided for ${primaryTerm} analysis; evidence supports systematic evaluation`;
    } else if (problem.context && problem.context.length > 0) {
      return `Limited context available for ${primaryTerm}; analysis based on available information`;
    }

    return `Minimal evidence provided for ${primaryTerm}; conclusions should be considered preliminary`;
  }

  /**
   * Check for specific context indicators and return hypothesis if found
   */
  private checkContextIndicator(
    context: string,
    indicators: string[],
    hypothesis: string
  ): string | null {
    const lowerContext = context.toLowerCase();
    for (const indicator of indicators) {
      if (lowerContext.includes(indicator)) {
        return hypothesis;
      }
    }
    return null;
  }

  /**
   * Identify potential root causes with specific hypotheses
   */
  private identifyRootCauses(problem: Problem, keyTerms: KeyTerms): string {
    const primaryTerm = keyTerms.primarySubject ?? "the issue";
    const actionVerb = keyTerms.actionVerbs[0] ?? "address";
    const context = problem.context ?? "";

    // Generate specific root cause hypotheses based on context analysis
    const hypotheses = this.generateRootCauseHypotheses(context);

    // Build specific root cause statement
    if (hypotheses.length > 0) {
      return this.buildRootCauseStatement(hypotheses, primaryTerm, actionVerb, problem.constraints);
    }

    // Fallback with actionable next steps
    return this.buildFallbackRootCause(primaryTerm, actionVerb, problem.constraints, keyTerms);
  }

  /**
   * Generate hypotheses based on context indicators
   */
  private generateRootCauseHypotheses(context: string): string[] {
    const hypotheses: string[] = [];

    const indicatorMap: Array<{ indicators: string[]; hypothesis: string }> = [
      {
        indicators: ["slow", "latency", "performance"],
        hypothesis: "resource contention or inefficient algorithms",
      },
      {
        indicators: ["user", "engagement", "retention"],
        hypothesis: "user experience friction points or unmet user needs",
      },
      {
        indicators: ["error", "fail", "crash"],
        hypothesis: "system instability or inadequate error handling",
      },
      {
        indicators: ["process", "workflow", "manual"],
        hypothesis: "process inefficiencies or lack of automation",
      },
      {
        indicators: ["data", "inconsistent", "quality"],
        hypothesis: "data quality issues or inconsistent data sources",
      },
    ];

    for (const { indicators, hypothesis } of indicatorMap) {
      const result = this.checkContextIndicator(context, indicators, hypothesis);
      if (result) {
        hypotheses.push(result);
      }
    }

    return hypotheses;
  }

  /**
   * Build root cause statement from hypotheses
   */
  private buildRootCauseStatement(
    hypotheses: string[],
    primaryTerm: string,
    actionVerb: string,
    constraints: string[] | undefined
  ): string {
    const primaryHypothesis = hypotheses[0];
    const secondaryHypothesis = hypotheses[1];

    if (constraints && constraints.length > 0) {
      return `Root cause hypothesis for ${primaryTerm}: ${primaryHypothesis}, compounded by constraint "${constraints[0]}". To ${actionVerb} this, prioritize addressing ${primaryHypothesis} first${secondaryHypothesis ? `, then investigate ${secondaryHypothesis}` : ""}`;
    }

    return `Root cause hypothesis for ${primaryTerm}: ${primaryHypothesis}${secondaryHypothesis ? `. Secondary factor: ${secondaryHypothesis}` : ""}. Recommended investigation: gather metrics to validate this hypothesis`;
  }

  /**
   * Build fallback root cause when no specific hypotheses found
   */
  private buildFallbackRootCause(
    primaryTerm: string,
    actionVerb: string,
    constraints: string[] | undefined,
    keyTerms: KeyTerms
  ): string {
    if (constraints && constraints.length > 0) {
      return `Root cause of ${primaryTerm} likely relates to ${constraints[0]}; to ${actionVerb} this, conduct stakeholder interviews and analyze historical data to identify specific triggers`;
    }

    if (keyTerms.domainTerms.length > 1) {
      return `Root cause analysis suggests ${primaryTerm} stems from interaction between ${keyTerms.domainTerms.slice(0, 2).join(" and ")}. Next step: map dependencies between these components to identify failure points`;
    }

    return `Root cause of ${primaryTerm} requires structured investigation. Recommended approach: (1) gather baseline metrics, (2) identify recent changes, (3) interview stakeholders to surface hidden factors`;
  }

  /**
   * Generate analytical conclusion with specific recommendations
   */
  private generateConclusion(problem: Problem, keyTerms: KeyTerms, insights: Insight[]): string {
    const primaryTerm = keyTerms.primarySubject ?? "the problem";
    const actionVerb = keyTerms.actionVerbs[0] ?? "address";

    const parts: string[] = [];

    // Main finding with specificity
    parts.push(`Systematic analysis of ${primaryTerm} reveals`);

    // Key insight summary with actionable detail
    if (insights.length > 0) {
      const topInsight = insights.sort((a, b) => b.importance - a.importance)[0];
      parts.push(topInsight.content.toLowerCase());
    } else {
      parts.push("structural patterns requiring attention");
    }

    // Generate specific recommendations based on problem characteristics
    const recommendations: string[] = [];

    if (problem.goals && problem.goals.length > 0) {
      recommendations.push(`align efforts with goal: ${problem.goals[0].toLowerCase()}`);
    }

    if (problem.constraints && problem.constraints.length > 0) {
      recommendations.push(`work within constraint: ${problem.constraints[0]}`);
    }

    if (problem.urgency === "high") {
      recommendations.push("prioritize quick wins that demonstrate progress");
    }

    if (problem.complexity === "complex") {
      recommendations.push("break into smaller, manageable phases");
    }

    // Build recommendation section
    if (recommendations.length > 0) {
      parts.push(`Recommended approach: ${recommendations.slice(0, 2).join("; ")}`);
    } else {
      parts.push(
        `To ${actionVerb} this effectively, implement systematic intervention with measurable milestones`
      );
    }

    return parts.join(". ");
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(problem: Problem, insights: Insight[]): number {
    let confidence = 0.6; // Base confidence for rule-based analysis

    // Boost for context availability
    if (problem.context && problem.context.length > 50) {
      confidence += 0.15;
    } else if (problem.context && problem.context.length > 20) {
      confidence += 0.1;
    }

    // Boost for insights generated
    if (insights.length >= 3) {
      confidence += 0.1;
    }

    // Reduce for high constraint count
    if (problem.constraints && problem.constraints.length > 3) {
      confidence -= 0.1;
    }

    // Reduce slightly because this is rule-based, not LLM
    confidence -= 0.05;

    return Math.max(0.3, Math.min(0.85, confidence));
  }
}
