import { existsSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { LLMClient } from "../../ai/llm-client.js";
import { PromptBinder } from "../../ai/prompt-binder.js";
import { Logger } from "../../utils/logger.js";
import { KeyTermExtractor, type KeyTerms } from "../key-term-extractor.js";
import { createInsightGenerator, type InsightGenerator } from "../patterns/insight-generator.js";
import { createPatternMatcher, type PatternMatcher } from "../patterns/pattern-matcher.js";
import { createPatternRegistry, type PatternRegistry } from "../patterns/pattern-registry.js";
import {
  executeWithTimeout,
  FULL_REASONING_TIMEOUT_MS,
  PATTERN_MATCHING_TIMEOUT_MS,
} from "../patterns/timeout-utils.js";
import type { GeneratedInsights, PatternMatchResult } from "../patterns/types.js";
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
 * Options for AnalyticalStreamProcessor
 */
export interface AnalyticalStreamProcessorOptions {
  /** LLM client for AI-based reasoning */
  llm?: LLMClient;
  /** Pattern registry for rule-based reasoning */
  patternRegistry?: PatternRegistry;
  /** Enable deterministic mode for reproducible results (Requirements: 10.3) */
  deterministicMode?: boolean;
}

/**
 * Analytical stream processor
 *
 * Validates inputs and delegates specific reasoning tasks to the LLM.
 * Falls back to rule-based analysis when LLM is unavailable.
 * Uses externalized pattern configuration for domain-specific reasoning.
 *
 * Requirements: 1.1, 8.3, 8.4, 10.3
 */
export class AnalyticalStreamProcessor implements StreamProcessor {
  private readonly llm: LLMClient;
  private readonly keyTermExtractor: KeyTermExtractor;
  private readonly patternRegistry: PatternRegistry;
  private readonly patternMatcher: PatternMatcher;
  private readonly insightGenerator: InsightGenerator;
  private llmAvailable: boolean | null = null;
  private patternsLoaded: boolean = false;

  /** Deterministic mode flag for reproducible results (Requirements: 10.3) */
  private readonly deterministicMode: boolean;

  /** Counter for deterministic stream ID generation */
  private deterministicCounter: number = 0;

  /**
   * Default config directory for reasoning patterns.
   * Can be overridden via REASONING_PATTERNS_DIR environment variable.
   */
  private static readonly DEFAULT_CONFIG_DIR = "config/reasoning-patterns";

  // System prompt defining the persona and rules - simplified for smaller LLMs
  private readonly SYSTEM_PROMPT = `You are an Analytical Engine performing logical, systematic analysis.

METHODOLOGY:
1. Decompose the problem into components
2. Evaluate evidence strictly
3. Identify root causes and relationships
4. Deduce conclusions based on logic

Provide step-by-step reasoning, key insights, and a confidence score (0.0-1.0).`;

  /**
   * Create a new AnalyticalStreamProcessor
   *
   * @param llmOrOptions - Optional LLM client or options object
   * @param patternRegistry - Optional pattern registry (deprecated, use options object)
   *
   * Requirements: 1.1, 8.3, 8.4, 10.3
   */
  constructor(
    llmOrOptions?: LLMClient | AnalyticalStreamProcessorOptions,
    patternRegistry?: PatternRegistry
  ) {
    // Handle both old signature (llm, patternRegistry) and new signature (options)
    let llm: LLMClient | undefined;
    let registry: PatternRegistry | undefined;
    let deterministicMode = false;

    if (llmOrOptions && "deterministicMode" in llmOrOptions) {
      // New options object signature - TypeScript narrows the type based on the property check
      llm = llmOrOptions.llm;
      registry = llmOrOptions.patternRegistry;
      deterministicMode = llmOrOptions.deterministicMode ?? false;
    } else {
      // Old signature for backward compatibility
      llm = llmOrOptions as LLMClient | undefined;
      registry = patternRegistry;
    }

    // Use LLM_TIMEOUT from environment, default to 60 seconds for larger models
    // This allows time for model loading on first request
    const llmTimeout = process.env.LLM_TIMEOUT ? parseInt(process.env.LLM_TIMEOUT, 10) : 60000;

    // Use provided LLM client or create a new one
    this.llm = llm ?? new LLMClient({ timeout: llmTimeout });
    this.keyTermExtractor = new KeyTermExtractor();

    // Initialize PatternRegistry (Requirement 1.1)
    // Use provided registry or create a new one
    this.patternRegistry = registry ?? createPatternRegistry();

    // Initialize PatternMatcher and InsightGenerator (Requirements 2.1, 3.1)
    this.patternMatcher = createPatternMatcher(this.patternRegistry);
    this.insightGenerator = createInsightGenerator({
      maxHypotheses: 10,
      maxRecommendations: 10,
      includeFallback: true,
      minConfidence: 0.1,
      minHypothesesOnMatch: 2,
    });

    // Set deterministic mode (Requirement 10.3)
    this.deterministicMode = deterministicMode;
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

    // 2. Load patterns if not already loaded (Requirement 1.1, 8.3, 8.4)
    await this.ensurePatternsLoaded();

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
   * Ensure patterns are loaded from config directory
   *
   * Loads patterns on first call, subsequent calls are no-ops.
   * Uses REASONING_PATTERNS_DIR environment variable or default path.
   *
   * Requirements: 1.1, 8.3, 8.4
   */
  private async ensurePatternsLoaded(): Promise<void> {
    if (this.patternsLoaded) {
      return;
    }

    // Get config directory from environment or use default
    const configDir = this.getConfigDirectory();

    try {
      Logger.debug("AnalyticalStreamProcessor: Loading patterns from config directory", {
        configDir,
      });

      await this.patternRegistry.loadPatterns(configDir);

      const stats = this.patternRegistry.getStats();
      Logger.info("AnalyticalStreamProcessor: Patterns loaded successfully", {
        totalPatterns: stats.totalPatterns,
        totalDomains: stats.totalDomains,
        domains: Object.keys(stats.patternsPerDomain),
      });

      this.patternsLoaded = true;
    } catch (error) {
      // Log error but don't fail - we can still use fallback reasoning
      Logger.warn("AnalyticalStreamProcessor: Failed to load patterns, using fallback reasoning", {
        error: error instanceof Error ? error.message : String(error),
        configDir,
      });
      this.patternsLoaded = true; // Mark as loaded to avoid repeated attempts
    }
  }

  /**
   * Get the config directory for reasoning patterns
   *
   * Checks REASONING_PATTERNS_DIR environment variable first,
   * then falls back to default path relative to package root.
   *
   * @returns Absolute or relative path to config directory
   */
  private getConfigDirectory(): string {
    // Check environment variable first
    const envDir = process.env.REASONING_PATTERNS_DIR;
    if (envDir) {
      return envDir;
    }

    // Try to find config directory relative to common locations
    const possiblePaths = [
      // Relative to current working directory
      AnalyticalStreamProcessor.DEFAULT_CONFIG_DIR,
      // Relative to packages/server
      join("packages", "server", AnalyticalStreamProcessor.DEFAULT_CONFIG_DIR),
      // Absolute path from __dirname (for compiled code)
      join(process.cwd(), AnalyticalStreamProcessor.DEFAULT_CONFIG_DIR),
      join(process.cwd(), "packages", "server", AnalyticalStreamProcessor.DEFAULT_CONFIG_DIR),
    ];

    // Return first existing path, or default if none exist
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Return default path - PatternRegistry will bootstrap empty config if needed
    return AnalyticalStreamProcessor.DEFAULT_CONFIG_DIR;
  }

  /**
   * Get the pattern registry instance
   *
   * Useful for testing and integration with other components.
   *
   * @returns The PatternRegistry instance
   */
  getPatternRegistry(): PatternRegistry {
    return this.patternRegistry;
  }

  /**
   * Check if patterns have been loaded
   *
   * @returns True if patterns have been loaded (or attempted)
   */
  arePatternsLoaded(): boolean {
    return this.patternsLoaded;
  }

  /**
   * Check if deterministic mode is enabled
   *
   * @returns True if deterministic mode is enabled
   *
   * Requirements: 10.3
   */
  isDeterministicMode(): boolean {
    return this.deterministicMode;
  }

  /**
   * Generate a stream ID
   *
   * In deterministic mode, generates predictable IDs based on a counter.
   * In normal mode, uses timestamp-based IDs.
   *
   * @param prefix - Prefix for the stream ID (e.g., "analytical", "analytical-failed")
   * @returns Stream ID string
   *
   * Requirements: 10.3
   */
  private generateStreamId(prefix: string): string {
    if (this.deterministicMode) {
      // Use counter-based ID for deterministic results
      return `${prefix}-deterministic-${++this.deterministicCounter}`;
    }
    // Use timestamp-based ID for normal operation
    return `${prefix}-${Date.now()}`;
  }

  /**
   * Reset the deterministic counter
   *
   * Useful for testing to ensure consistent IDs across test runs.
   * Only has effect in deterministic mode.
   *
   * Requirements: 10.3
   */
  resetDeterministicCounter(): void {
    this.deterministicCounter = 0;
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
      streamId: this.generateStreamId("analytical"), // Temporary ID, will be managed by wrapper/manager
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
   *
   * Uses PatternMatcher to match patterns against the problem and
   * InsightGenerator to generate domain-specific hypotheses and recommendations.
   * Implements timeout protection for pattern matching (5s) and full reasoning (10s).
   *
   * Requirements: 2.1, 3.1, 9.2, 9.4, 9.5, 9.6
   */
  private async processWithRules(problem: Problem, startTime: number): Promise<StreamResult> {
    // Execute full reasoning with timeout protection (10s sanity check)
    const timeoutResult = await executeWithTimeout(
      () => this.executeRuleBasedReasoning(problem, startTime),
      FULL_REASONING_TIMEOUT_MS,
      this.createTimeoutResult(problem, startTime),
      "AnalyticalStreamProcessor.processWithRules"
    );

    // If timed out, return the timeout result
    if (timeoutResult.timedOut) {
      Logger.warn("AnalyticalStreamProcessor: Full reasoning timed out", {
        problemId: problem.id,
        timeoutMs: FULL_REASONING_TIMEOUT_MS,
        executionTimeMs: timeoutResult.executionTimeMs,
      });
      return timeoutResult.result;
    }

    return timeoutResult.result;
  }

  /**
   * Create a timeout result with partial/fallback data
   *
   * Returns a StreamResult with timeout status and minimal valid output.
   *
   * @param problem - The problem being analyzed
   * @param startTime - Start time for processing time calculation
   * @returns StreamResult with timeout indicator
   *
   * Requirements: 9.5, 9.6
   */
  private createTimeoutResult(problem: Problem, startTime: number): StreamResult {
    return {
      streamId: this.generateStreamId("analytical-timeout"),
      streamType: StreamType.ANALYTICAL,
      conclusion: "Analysis timed out - partial results may be available",
      reasoning: [
        `Analyzing problem: ${problem.description.substring(0, 100)}${problem.description.length > 100 ? "..." : ""}`,
        "Analysis exceeded timeout threshold - returning partial results",
      ],
      insights: [
        {
          content:
            "Analysis was interrupted due to timeout. Consider simplifying the problem or breaking it into smaller parts.",
          source: StreamType.ANALYTICAL,
          confidence: 0.3,
          importance: 0.5,
          referencedTerms: [],
        },
      ],
      confidence: 0.2,
      processingTime: Date.now() - startTime,
      status: StreamStatus.TIMEOUT,
    };
  }

  /**
   * Execute rule-based reasoning with pattern matching
   *
   * This is the core reasoning logic, separated from timeout handling.
   * Pattern matching has its own 5s timeout protection.
   *
   * @param problem - The problem to analyze
   * @param startTime - Start time for processing time calculation
   * @returns StreamResult with analysis results
   *
   * Requirements: 2.1, 3.1, 9.2
   */
  private async executeRuleBasedReasoning(
    problem: Problem,
    startTime: number
  ): Promise<StreamResult> {
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

      // Step 3: Match patterns using PatternMatcher with timeout protection (5s sanity check)
      // Requirements: 2.1, 3.1, 9.2
      const patternMatchResult = await executeWithTimeout(
        () =>
          Promise.resolve(
            this.patternMatcher.matchPatterns(problem.description, problem.context, keyTerms)
          ),
        PATTERN_MATCHING_TIMEOUT_MS,
        [] as PatternMatchResult[],
        "AnalyticalStreamProcessor.patternMatching"
      );

      const patternMatches = patternMatchResult.result;
      const patternMatchingTimedOut = patternMatchResult.timedOut;

      // Log pattern matching results
      if (patternMatchingTimedOut) {
        reasoning.push(
          "Pattern matching timed out - using fallback reasoning with partial results"
        );
        Logger.warn("AnalyticalStreamProcessor: Pattern matching timed out", {
          problemId: problem.id,
          timeoutMs: PATTERN_MATCHING_TIMEOUT_MS,
          executionTimeMs: patternMatchResult.executionTimeMs,
        });
      } else if (patternMatches.length > 0) {
        const matchedDomains = [...new Set(patternMatches.map((m) => m.domain))];
        reasoning.push(
          `Pattern matching identified ${patternMatches.length} relevant patterns across domains: ${matchedDomains.join(", ")}`
        );
      } else {
        reasoning.push("No specific domain patterns matched; using general analytical reasoning");
      }

      // Step 4: Generate insights using InsightGenerator (Requirements: 2.1, 3.1)
      const generatedInsights = this.insightGenerator.generateInsights(
        patternMatches,
        keyTerms,
        problem.description
      );

      // Mark if pattern matching timed out
      if (patternMatchingTimedOut) {
        generatedInsights.timedOut = true;
      }

      // Step 5: Convert generated insights to StreamResult format
      this.addGeneratedInsightsToResult(generatedInsights, insights, reasoning, keyTerms);

      // Step 6: Consider constraints
      if (problem.constraints && problem.constraints.length > 0) {
        reasoning.push(`Constraints considered: ${problem.constraints.join(", ")}`);
      }

      // Step 7: Generate conclusion from insights
      const conclusion = this.generateConclusionFromInsights(
        problem,
        keyTerms,
        generatedInsights,
        insights
      );
      reasoning.push(`Conclusion: ${conclusion}`);

      // Calculate confidence based on pattern matches and insights
      let confidence = this.calculateConfidenceFromInsights(problem, generatedInsights, insights);

      // Reduce confidence if pattern matching timed out
      if (patternMatchingTimedOut) {
        confidence = Math.max(0.2, confidence - 0.15);
      }

      return {
        streamId: this.generateStreamId("analytical"),
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
        streamId: this.generateStreamId("analytical-failed"),
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
   * Add generated insights from InsightGenerator to the result
   *
   * Converts hypotheses and recommendations to Insight format and adds
   * them to the insights array. Also adds relevant reasoning steps.
   *
   * @param generatedInsights - Insights from InsightGenerator
   * @param insights - Array to add insights to
   * @param reasoning - Array to add reasoning steps to
   * @param keyTerms - Key terms for referenced terms
   */
  private addGeneratedInsightsToResult(
    generatedInsights: GeneratedInsights,
    insights: Insight[],
    reasoning: string[],
    keyTerms: KeyTerms
  ): void {
    // Add root cause analysis as an insight
    if (generatedInsights.rootCauseAnalysis) {
      reasoning.push(`Root cause analysis: ${generatedInsights.rootCauseAnalysis}`);
      insights.push({
        content: generatedInsights.rootCauseAnalysis,
        source: StreamType.ANALYTICAL,
        confidence: generatedInsights.confidence,
        importance: 0.8,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(
          generatedInsights.rootCauseAnalysis,
          keyTerms
        ),
      });
    }

    // Add hypotheses as insights
    for (const hypothesis of generatedInsights.hypotheses) {
      const hypothesisContent = `Hypothesis: ${hypothesis.statement} (likelihood: ${Math.round(hypothesis.likelihood * 100)}%)`;
      reasoning.push(hypothesisContent);

      insights.push({
        content: hypothesis.statement,
        source: StreamType.ANALYTICAL,
        confidence: hypothesis.likelihood,
        importance: 0.75,
        referencedTerms: this.keyTermExtractor.findReferencedTerms(hypothesis.statement, keyTerms),
      });

      // Add investigation steps as reasoning
      if (hypothesis.investigationSteps.length > 0) {
        reasoning.push(
          `Investigation steps for "${hypothesis.id}": ${hypothesis.investigationSteps.slice(0, 2).join("; ")}`
        );
      }
    }

    // Add top recommendations as insights
    const topRecommendations = generatedInsights.recommendations.slice(0, 3);
    for (const recommendation of topRecommendations) {
      const recContent = `Recommendation (${recommendation.type}): ${recommendation.action}`;
      reasoning.push(recContent);

      insights.push({
        content: recommendation.action,
        source: StreamType.ANALYTICAL,
        confidence: 0.7,
        importance: recommendation.priority / 10, // Normalize priority to 0-1
        referencedTerms: this.keyTermExtractor.findReferencedTerms(recommendation.action, keyTerms),
      });
    }

    // Note if fallback was used
    if (generatedInsights.usedFallback) {
      reasoning.push(
        "Note: Using general analytical reasoning as no specific domain patterns matched"
      );
    }
  }

  /**
   * Generate conclusion from generated insights
   *
   * Uses the InsightGenerator's conclusion if available, otherwise
   * falls back to the original conclusion generation logic.
   *
   * @param problem - The problem being analyzed
   * @param keyTerms - Extracted key terms
   * @param generatedInsights - Insights from InsightGenerator
   * @param insights - Converted insights array
   * @returns Conclusion string
   */
  private generateConclusionFromInsights(
    problem: Problem,
    keyTerms: KeyTerms,
    generatedInsights: GeneratedInsights,
    insights: Insight[]
  ): string {
    // Use InsightGenerator's conclusion if it's meaningful
    if (generatedInsights.conclusion && generatedInsights.conclusion.length > 50) {
      return generatedInsights.conclusion;
    }

    // Fall back to original conclusion generation
    return this.generateConclusion(problem, keyTerms, insights);
  }

  /**
   * Calculate confidence from generated insights
   *
   * Uses the InsightGenerator's confidence as a base and adjusts
   * based on problem characteristics.
   *
   * @param problem - The problem being analyzed
   * @param generatedInsights - Insights from InsightGenerator
   * @param insights - Converted insights array
   * @returns Confidence score (0-1)
   */
  private calculateConfidenceFromInsights(
    problem: Problem,
    generatedInsights: GeneratedInsights,
    insights: Insight[]
  ): number {
    // Start with InsightGenerator's confidence
    let confidence = generatedInsights.confidence;

    // Boost for context availability
    if (problem.context && problem.context.length > 50) {
      confidence += 0.1;
    } else if (problem.context && problem.context.length > 20) {
      confidence += 0.05;
    }

    // Boost for multiple insights generated
    if (insights.length >= 5) {
      confidence += 0.05;
    }

    // Reduce for high constraint count
    if (problem.constraints && problem.constraints.length > 3) {
      confidence -= 0.05;
    }

    // Reduce slightly because this is rule-based, not LLM
    confidence -= 0.05;

    // Clamp to valid range
    return Math.max(0.2, Math.min(0.85, confidence));
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
}
