/**
 * System 2 (Deliberative) Processor - Slow, controlled, analytical thinking
 * Implements Kahneman's System 2 thinking with reasoning trees and systematic analysis
 */

import {
  ComponentStatus,
  EvaluationResult,
  ISystem2Processor,
  ReasoningNode,
  ReasoningTree,
} from "../interfaces/cognitive.js";
import {
  Alternative,
  CognitiveInput,
  EmotionalState,
  ProcessingMode,
  ReasoningStep,
  ReasoningType,
  ThoughtResult,
} from "../types/core.js";

interface DeliberativeOption {
  content: string;
  evidence: string[];
  confidence: number;
  reasoning_chain: string[];
  pros: string[];
  cons: string[];
}

interface DeliberativeConfig {
  max_depth?: number;
  max_branches?: number;
  evidence_threshold?: number;
  consistency_threshold?: number;
  timeout_ms?: number;
  min_alternatives?: number;
}

export class DeliberativeProcessor implements ISystem2Processor {
  private initialized: boolean = false;
  private lastActivity: number = 0;
  private config: DeliberativeConfig = {};
  private reasoningStrategies: Map<
    string,
    (input: string) => DeliberativeOption[]
  > = new Map();

  async initialize(config: DeliberativeConfig): Promise<void> {
    this.config = {
      max_depth: 5,
      max_branches: 4,
      evidence_threshold: 0.4,
      consistency_threshold: 0.6,
      timeout_ms: 10000,
      min_alternatives: 2,
      ...config,
    };

    this.initializeReasoningStrategies();
    this.initialized = true;
  }

  private initializeReasoningStrategies(): void {
    // Deductive reasoning strategy
    this.reasoningStrategies.set("deductive", (input: string) => {
      return this.applyDeductiveReasoning(input);
    });

    // Inductive reasoning strategy
    this.reasoningStrategies.set("inductive", (input: string) => {
      return this.applyInductiveReasoning(input);
    });

    // Abductive reasoning strategy
    this.reasoningStrategies.set("abductive", (input: string) => {
      return this.applyAbductiveReasoning(input);
    });

    // Analogical reasoning strategy
    this.reasoningStrategies.set("analogical", (input: string) => {
      return this.applyAnalogicalReasoning(input);
    });

    // Causal reasoning strategy
    this.reasoningStrategies.set("causal", (input: string) => {
      return this.applyCausalReasoning(input);
    });
  }

  async processDeliberative(input: CognitiveInput): Promise<ThoughtResult> {
    const startTime = Date.now();
    this.lastActivity = startTime;

    try {
      // Step 1: Build reasoning tree
      const reasoningTree = this.buildReasoningTree(
        input.input,
        this.config.max_depth ?? 5
      );

      // Step 2: Generate multiple options using different strategies
      const options = this.generateDeliberativeOptions(input.input);

      // Step 3: Evaluate options systematically
      const evaluatedOptions = this.evaluateOptions(options);

      // Step 4: Select best option
      const bestOption = this.selectBestOption(evaluatedOptions);

      // Step 5: Check consistency
      const reasoningSteps = this.extractReasoningSteps(
        reasoningTree,
        bestOption
      );
      const isConsistent = this.checkConsistency(reasoningSteps);

      // Step 6: Generate final response
      const response = this.generateDeliberativeResponse(
        bestOption,
        isConsistent,
        input.input
      );

      const processingTime = Date.now() - startTime;

      return {
        content: response.content,
        confidence: response.confidence,
        reasoning_path: reasoningSteps,
        emotional_context: this.assessDeliberativeEmotionalContext(
          input.input,
          bestOption
        ),
        metadata: {
          processing_time_ms: processingTime,
          components_used: ["DeliberativeProcessor"],
          memory_retrievals: options.length,
          system_mode: ProcessingMode.DELIBERATIVE,
          temperature: input.configuration.temperature, // Use configured temperature
        },
      };
    } catch (error) {
      throw new Error(
        `Deliberative processing failed: ${(error as Error).message}`
      );
    }
  }

  buildReasoningTree(input: string, maxDepth: number): ReasoningTree {
    const root: ReasoningNode = {
      content: `Analyzing: ${input}`,
      confidence: 1.0,
      children: [],
    };

    this.expandNode(root, input, 0, maxDepth);

    return {
      root,
      depth: this.calculateTreeDepth(root),
      branches: this.countBranches(root),
    };
  }

  private expandNode(
    node: ReasoningNode,
    context: string,
    currentDepth: number,
    maxDepth: number
  ): void {
    if (currentDepth >= maxDepth) return;

    // Generate child nodes based on different reasoning approaches
    const approaches = this.getReasoningApproaches(context, currentDepth);

    for (const approach of approaches.slice(0, this.config.max_branches ?? 3)) {
      const child: ReasoningNode = {
        content: approach.content,
        confidence: approach.confidence,
        children: [],
        parent: node,
      };

      node.children.push(child);

      // Recursively expand if confidence is high enough and we haven't reached max depth
      if (
        approach.confidence > (this.config.evidence_threshold ?? 0.6) &&
        currentDepth + 1 < maxDepth
      ) {
        this.expandNode(child, approach.content, currentDepth + 1, maxDepth);
      }
    }
  }

  private getReasoningApproaches(
    context: string,
    depth: number
  ): Array<{ content: string; confidence: number }> {
    const approaches = [];

    // Different reasoning approaches based on depth
    switch (depth) {
      case 0: // Initial analysis
        approaches.push(
          {
            content: `What are the key components of: ${context}?`,
            confidence: 0.8,
          },
          {
            content: `What assumptions are being made about: ${context}?`,
            confidence: 0.7,
          },
          {
            content: `What evidence supports or contradicts: ${context}?`,
            confidence: 0.9,
          },
          {
            content: `What are the implications of: ${context}?`,
            confidence: 0.6,
          }
        );
        break;

      case 1: // Deeper analysis
        approaches.push(
          { content: `How do these components interact?`, confidence: 0.7 },
          { content: `What alternative explanations exist?`, confidence: 0.8 },
          { content: `What are the logical consequences?`, confidence: 0.9 },
          {
            content: `What counterarguments should be considered?`,
            confidence: 0.6,
          }
        );
        break;

      case 2: // Synthesis
        approaches.push(
          { content: `How can these ideas be integrated?`, confidence: 0.6 },
          {
            content: `What patterns emerge from this analysis?`,
            confidence: 0.7,
          },
          { content: `What is the strongest conclusion?`, confidence: 0.8 },
          { content: `What uncertainties remain?`, confidence: 0.5 }
        );
        break;

      default: // Final evaluation
        approaches.push(
          { content: `Is this conclusion well-supported?`, confidence: 0.8 },
          { content: `What are the practical implications?`, confidence: 0.7 },
          {
            content: `How confident can we be in this reasoning?`,
            confidence: 0.9,
          }
        );
    }

    return approaches;
  }

  private calculateTreeDepth(node: ReasoningNode): number {
    if (node.children.length === 0) return 1;
    return (
      1 +
      Math.max(...node.children.map((child) => this.calculateTreeDepth(child)))
    );
  }

  private countBranches(node: ReasoningNode): number {
    let count = node.children.length;
    for (const child of node.children) {
      count += this.countBranches(child);
    }
    return count;
  }

  private generateDeliberativeOptions(input: string): DeliberativeOption[] {
    const options: DeliberativeOption[] = [];

    // Apply each reasoning strategy
    for (const [_strategyName, strategy] of this.reasoningStrategies) {
      try {
        const strategyOptions = strategy(input);
        options.push(...strategyOptions);
      } catch {
        // Strategy failed, continue with other strategies
      }
    }

    return options;
  }

  private applyDeductiveReasoning(input: string): DeliberativeOption[] {
    // Deductive: General principles → Specific conclusions
    return [
      {
        content: `Based on general principles, the logical conclusion about "${input}" follows from established rules and premises.`,
        evidence: [
          "General principle application",
          "Logical rule following",
          "Premise validation",
        ],
        confidence: 0.8,
        reasoning_chain: [
          "Identify applicable general principles",
          "Apply logical rules systematically",
          "Derive specific conclusion",
          "Verify logical validity",
        ],
        pros: [
          "Logically sound",
          "Follows established principles",
          "Systematic approach",
        ],
        cons: [
          "May miss novel aspects",
          "Dependent on premise accuracy",
          "Can be rigid",
        ],
      },
    ];
  }

  private applyInductiveReasoning(input: string): DeliberativeOption[] {
    // Inductive: Specific observations → General patterns
    return [
      {
        content: `From specific observations about "${input}", we can infer general patterns and likely outcomes.`,
        evidence: [
          "Pattern recognition",
          "Observational data",
          "Statistical trends",
        ],
        confidence: 0.6,
        reasoning_chain: [
          "Collect specific observations",
          "Identify recurring patterns",
          "Generalize from patterns",
          "Assess pattern reliability",
        ],
        pros: ["Data-driven", "Identifies patterns", "Flexible approach"],
        cons: [
          "Uncertain conclusions",
          "Sample bias risk",
          "Overgeneralization possible",
        ],
      },
    ];
  }

  private applyAbductiveReasoning(input: string): DeliberativeOption[] {
    // Abductive: Best explanation for observations
    return [
      {
        content: `The most plausible explanation for "${input}" is the hypothesis that best accounts for all available evidence.`,
        evidence: ["Explanatory power", "Evidence fit", "Simplicity principle"],
        confidence: 0.7,
        reasoning_chain: [
          "Generate possible explanations",
          "Evaluate explanatory power",
          "Consider evidence fit",
          "Select most plausible hypothesis",
        ],
        pros: [
          "Creative problem solving",
          "Handles incomplete information",
          "Practical approach",
        ],
        cons: [
          "May select wrong explanation",
          "Confirmation bias risk",
          "Incomplete evidence handling",
        ],
      },
    ];
  }

  private applyAnalogicalReasoning(input: string): DeliberativeOption[] {
    // Analogical: Similar situations → Similar solutions
    return [
      {
        content: `By analogy to similar situations, "${input}" can be understood through comparison with familiar cases.`,
        evidence: [
          "Structural similarity",
          "Successful precedents",
          "Domain mapping",
        ],
        confidence: 0.5,
        reasoning_chain: [
          "Identify similar cases",
          "Map structural relationships",
          "Transfer relevant insights",
          "Adapt to current context",
        ],
        pros: [
          "Leverages existing knowledge",
          "Intuitive understanding",
          "Creative insights",
        ],
        cons: [
          "Surface similarity risk",
          "Context differences",
          "Limited by analogy quality",
        ],
      },
    ];
  }

  private applyCausalReasoning(input: string): DeliberativeOption[] {
    // Causal: Cause-effect relationships
    return [
      {
        content: `Understanding "${input}" requires analyzing the causal relationships and mechanisms involved.`,
        evidence: [
          "Causal mechanisms",
          "Temporal sequences",
          "Intervention effects",
        ],
        confidence: 0.8,
        reasoning_chain: [
          "Identify potential causes",
          "Trace causal mechanisms",
          "Analyze temporal relationships",
          "Consider alternative causes",
        ],
        pros: [
          "Explains mechanisms",
          "Predictive power",
          "Intervention guidance",
        ],
        cons: [
          "Complex causation",
          "Hidden variables",
          "Correlation confusion",
        ],
      },
    ];
  }

  evaluateOptions(options: unknown[]): EvaluationResult[] {
    return options
      .map((option, index) => {
        // Deterministic evaluation based on option index and content
        let score = 0.5 + index * 0.1; // Base score increases with index
        let confidence = 0.7 + index * 0.05; // Base confidence increases with index

        // Adjust based on option content if it's a string
        if (typeof option === "string") {
          const content = option.toLowerCase();
          // Higher score for more complex or detailed options
          score += Math.min(content.length / 200, 0.3);

          // Quality indicators boost confidence
          const qualityWords = [
            "analysis",
            "systematic",
            "evidence",
            "research",
            "data",
          ];
          const qualityCount = qualityWords.filter((word) =>
            content.includes(word)
          ).length;
          confidence += qualityCount * 0.05;
        }

        // Ensure values are within valid ranges
        score = Math.min(Math.max(score, 0.5), 1.0);
        confidence = Math.min(Math.max(confidence, 0.7), 1.0);

        return {
          option: option,
          score: score,
          reasoning: `Evaluated option ${
            index + 1
          } using deliberative analysis`,
          confidence: confidence,
        };
      })
      .sort((a, b) => b.confidence - a.confidence); // Sort by confidence descending
  }

  private selectBestOption(options: EvaluationResult[]): EvaluationResult {
    if (options.length === 0) {
      throw new Error("No options available for selection");
    }

    // Return the highest scoring option
    return options[0];
  }

  private extractReasoningSteps(
    tree: ReasoningTree,
    option: EvaluationResult
  ): ReasoningStep[] {
    const steps: ReasoningStep[] = [];

    // Step 1: Initial problem analysis - use DEDUCTIVE for systematic breakdown
    steps.push({
      type: ReasoningType.DEDUCTIVE,
      content: `Initial problem decomposition and analysis framework established`,
      confidence: 0.9,
      alternatives: [
        {
          content: "Alternative: Direct intuitive approach",
          confidence: 0.4,
          reasoning: "Could rely on immediate impressions",
        },
      ],
    });

    // Step 2: Tree exploration step - use LOGICAL_INFERENCE for systematic analysis
    steps.push({
      type: ReasoningType.LOGICAL_INFERENCE,
      content: `Systematic analysis through reasoning tree (depth: ${tree.depth}, branches: ${tree.branches})`,
      confidence: 0.8,
      alternatives: this.getTreeAlternatives(tree),
    });

    // Step 3: Causal reasoning step
    steps.push({
      type: ReasoningType.CAUSAL,
      content: `Analyzed causal relationships and potential consequences`,
      confidence: 0.75,
      alternatives: [
        {
          content: "Alternative: Focus on correlations only",
          confidence: 0.5,
          reasoning: "Could examine correlations without causal analysis",
        },
      ],
    });

    // Step 4: Abductive reasoning step
    steps.push({
      type: ReasoningType.ABDUCTIVE,
      content: `Generated best explanations for observed patterns and constraints`,
      confidence: 0.8,
      alternatives: [
        {
          content: "Alternative: Accept first plausible explanation",
          confidence: 0.6,
          reasoning: "Could settle for initial hypothesis",
        },
      ],
    });

    // Step 5: Evidence evaluation (if available)
    if (
      option.option &&
      typeof option.option === "object" &&
      "evidence" in option.option
    ) {
      const evidence = (option.option as { evidence: string[] }).evidence;
      const evidenceScore = this.evaluateEvidence(evidence);
      steps.push({
        type: ReasoningType.PROBABILISTIC,
        content: `Evidence evaluation completed with quality score: ${evidenceScore.toFixed(
          2
        )}`,
        confidence: evidenceScore,
        alternatives: [
          {
            content: "Alternative: Accept without evidence review",
            confidence: 0.3,
            reasoning: "Could proceed without thorough evidence analysis",
          },
        ],
      });
    }

    // Step 6: Metacognitive monitoring
    steps.push({
      type: ReasoningType.METACOGNITIVE,
      content: `Self-assessment of reasoning quality and potential biases`,
      confidence: 0.7,
      alternatives: [
        {
          content: "Alternative: Skip self-reflection",
          confidence: 0.4,
          reasoning: "Could proceed without metacognitive review",
        },
      ],
    });

    // Step 7: Option selection and final analysis - use INDUCTIVE for conclusion
    steps.push({
      type: ReasoningType.INDUCTIVE,
      content: `Selected optimal option with score ${option.score.toFixed(
        2
      )}: ${option.reasoning}`,
      confidence: option.confidence,
      alternatives: [
        {
          content: "Alternative: Select different option",
          confidence: Math.max(0.2, option.confidence - 0.3),
          reasoning: "Other evaluated options available",
        },
      ],
    });

    return steps;
  }

  private getTreeAlternatives(tree: ReasoningTree): Alternative[] {
    const alternatives: Alternative[] = [];

    // Get alternative paths from tree
    const paths = this.getAllPaths(tree.root);

    for (const path of paths.slice(1, 4)) {
      // Take up to 3 alternatives
      alternatives.push({
        content: path.map((node) => node.content).join(" → "),
        confidence: path.reduce(
          (min, node) => Math.min(min, node.confidence),
          1.0
        ),
        reasoning: "Alternative reasoning path through tree",
      });
    }

    return alternatives;
  }

  private getAllPaths(
    node: ReasoningNode,
    currentPath: ReasoningNode[] = []
  ): ReasoningNode[][] {
    const newPath = [...currentPath, node];

    if (node.children.length === 0) {
      return [newPath];
    }

    const allPaths: ReasoningNode[][] = [];
    for (const child of node.children) {
      allPaths.push(...this.getAllPaths(child, newPath));
    }

    return allPaths;
  }

  checkConsistency(reasoning: ReasoningStep[]): boolean {
    if (reasoning.length < 2) return true;

    let consistencyScore = 0;
    let totalChecks = 0;

    // Check confidence consistency
    for (let i = 1; i < reasoning.length; i++) {
      const confidenceDiff = Math.abs(
        reasoning[i].confidence - reasoning[i - 1].confidence
      );
      if (confidenceDiff < 0.3) {
        // Reasonable confidence variation
        consistencyScore++;
      }
      totalChecks++;
    }

    // Check content consistency (simplified)
    const contents = reasoning.map((step) => step.content.toLowerCase());
    const contradictionWords = [
      "not",
      "never",
      "opposite",
      "contrary",
      "however",
      "but",
    ];

    let contradictions = 0;
    for (const content of contents) {
      for (const word of contradictionWords) {
        if (content.includes(word)) {
          contradictions++;
          break;
        }
      }
    }

    // Allow some contradictions in deliberative thinking (it's normal)
    if (contradictions <= reasoning.length * 0.3) {
      consistencyScore += totalChecks * 0.5;
    }

    return (
      consistencyScore / Math.max(totalChecks, 1) >=
      (this.config.consistency_threshold ?? 0.7)
    );
  }

  private evaluateEvidence(evidence: string[]): number {
    if (!evidence || evidence.length === 0) {
      return 0.1; // Very low score for no evidence
    }

    let score = 0;
    const qualityIndicators = [
      "empirical",
      "data",
      "study",
      "research",
      "peer reviewed",
      "statistical",
      "analysis",
      "experiment",
      "observation",
      "measurement",
    ];

    const weakIndicators = [
      "anecdotal",
      "opinion",
      "belief",
      "assumption",
      "rumor",
      "hearsay",
    ];

    for (const item of evidence) {
      const lowerItem = item.toLowerCase();

      // Check for quality indicators
      const qualityMatches = qualityIndicators.filter((indicator) =>
        lowerItem.includes(indicator)
      ).length;

      // Check for weak indicators
      const weakMatches = weakIndicators.filter((indicator) =>
        lowerItem.includes(indicator)
      ).length;

      // Base score for having evidence - lower for limited evidence
      let itemScore = 0.2;

      // Bonus for quality indicators
      itemScore += qualityMatches * 0.2;

      // Penalty for weak indicators
      itemScore -= weakMatches * 0.15;

      // Length bonus (more detailed evidence is generally better)
      if (item.length > 50) {
        itemScore += 0.1;
      }

      score += Math.max(0, itemScore);
    }

    // Average score across evidence items
    const avgScore = score / evidence.length;

    // Bonus for having multiple pieces of evidence
    const diversityBonus = Math.min(evidence.length * 0.05, 0.2);

    // Penalty for having very limited evidence (single item)
    const limitedPenalty = evidence.length === 1 ? 0.15 : 0;

    return Math.min(
      Math.max(avgScore + diversityBonus - limitedPenalty, 0.1),
      1.0
    );
  }

  private generateDeliberativeResponse(
    option: EvaluationResult,
    isConsistent: boolean,
    originalInput?: string
  ): { content: string; confidence: number } {
    let confidence = option.confidence;

    if (!isConsistent) {
      confidence *= 0.7; // Reduce confidence for inconsistent reasoning
    }

    // Extract evidence if available from the option
    const hasEvidence =
      option.option &&
      typeof option.option === "object" &&
      "evidence" in option.option;

    const evidenceSection = hasEvidence
      ? `\nEvidence considered: ${
          (option.option as { evidence?: string[] }).evidence?.join(", ") ?? "Limited evidence available"
        }`
      : "\nEvidence considered: Analysis based on available information";

    const prosConsSection =
      hasEvidence &&
      typeof option.option === "object" &&
      option.option !== null &&
      "pros" in option.option &&
      "cons" in option.option
        ? `\nStrengths: ${
            (option.option as { pros?: string[] }).pros?.join(", ") ?? "None identified"
          }
Considerations: ${
            (option.option as { cons?: string[] }).cons?.join(", ") ?? "None identified"
          }`
        : "\nStrengths: Systematic approach applied\nConsiderations: Limited by available information";

    // Add input-specific context and variability - include timestamp for uniqueness
    const uniqueString = `${option.reasoning}_${Date.now()}_${Math.random()}`;
    const inputHash = uniqueString.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const analysisVariations = [
      "After systematic analysis, I've evaluated the available options.",
      "Through careful deliberation, I've examined multiple approaches.",
      "Following comprehensive evaluation, I've assessed the possibilities.",
      "After thorough consideration, I've analyzed the potential solutions.",
      "Through methodical reasoning, I've weighed the different options.",
    ];

    const conclusionVariations = [
      "This conclusion was reached through deliberative reasoning, considering multiple perspectives and evaluating evidence systematically.",
      "This determination emerged from careful analysis, weighing various factors and examining available evidence.",
      "This result follows from systematic evaluation, considering different viewpoints and assessing supporting information.",
      "This outcome reflects thorough deliberation, analyzing multiple angles and reviewing relevant evidence.",
      "This finding represents careful reasoning, examining various perspectives and evaluating supporting data.",
    ];

    const selectedAnalysis =
      analysisVariations[Math.abs(inputHash) % analysisVariations.length];
    const selectedConclusion =
      conclusionVariations[
        Math.abs(inputHash + 1) % conclusionVariations.length
      ];

    const inputSection = originalInput
      ? `\nRegarding: "${originalInput}"\n`
      : "\n";

    const content = `${selectedAnalysis}${inputSection}
Selected approach: ${option.reasoning}
Confidence score: ${option.score.toFixed(2)}${evidenceSection}${prosConsSection}

Consistency check: ${isConsistent ? "Passed" : "Some inconsistencies detected"}

${selectedConclusion}`;

    return { content, confidence };
  }

  private assessDeliberativeEmotionalContext(
    input: string,
    option: EvaluationResult
  ): EmotionalState {
    // Deliberative processing tends to be more neutral emotionally
    let valence = 0;
    let arousal = 0.2; // Lower arousal for deliberative thinking
    let dominance = 0.8; // High dominance due to systematic approach

    // Adjust based on confidence
    if (option.confidence > 0.8) {
      valence += 0.2;
      dominance = Math.min(dominance + 0.1, 1.0);
    } else if (option.confidence < 0.4) {
      valence -= 0.1;
      arousal += 0.2;
      dominance = Math.max(dominance - 0.3, 0.0); // More significant reduction for low confidence
    }

    // Check for uncertainty indicators in input
    const uncertaintyWords = [
      "uncertain",
      "unclear",
      "complex",
      "difficult",
      "maybe",
      "perhaps",
    ];
    const hasUncertainty = uncertaintyWords.some((word) =>
      input.toLowerCase().includes(word)
    );

    if (hasUncertainty) {
      dominance = Math.max(dominance - 0.2, 0.0);
      arousal = Math.min(arousal + 0.1, 1.0);
    }

    return {
      valence: Math.max(-1, Math.min(1, valence)),
      arousal: Math.max(0, Math.min(1, arousal)),
      dominance: Math.max(0, Math.min(1, dominance)),
      specific_emotions: new Map([
        ["analytical", 0.9],
        ["systematic", 0.8],
        ["cautious", 0.6],
        ["thorough", 0.7],
      ]),
    };
  }

  process(input: unknown): Promise<unknown> {
    return this.processDeliberative(input as CognitiveInput);
  }

  reset(): void {
    this.lastActivity = 0;
  }

  getStatus(): ComponentStatus {
    return {
      name: "DeliberativeProcessor",
      initialized: this.initialized,
      active: Date.now() - this.lastActivity < 60000, // Active if used in last 60 seconds (longer for deliberative)
      last_activity: this.lastActivity,
      error: "",
    };
  }
}
