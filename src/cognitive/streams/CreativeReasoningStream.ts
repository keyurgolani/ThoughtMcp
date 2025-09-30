/**
 * Creative Reasoning Stream
 *
 * Focuses on generating novel alternatives, unconventional approaches, and innovative solutions
 */

import {
  CreativeAlternative,
  Evidence,
  ICreativeReasoningStream,
  NovelSolution,
  UnconventionalApproach,
} from "../../interfaces/parallel-reasoning.js";
import { Problem } from "../../interfaces/systematic-thinking.js";
import { Context, ReasoningStep, ReasoningType } from "../../types/core.js";
import { BaseReasoningStream } from "./BaseReasoningStream.js";

export class CreativeReasoningStream
  extends BaseReasoningStream
  implements ICreativeReasoningStream
{
  // Creative techniques available for use
  // private readonly creativeTechniques: string[] = [
  //   "brainstorming",
  //   "lateral_thinking",
  //   "analogical_reasoning",
  //   "reverse_thinking",
  //   "random_stimulation",
  //   "morphological_analysis",
  //   "scamper_method",
  //   "six_thinking_hats",
  // ];

  constructor(id?: string) {
    super(
      "creative",
      "Creative Reasoning Stream",
      "Innovative thinking and novel solution generation",
      id
    );
  }

  protected async doInitialize(): Promise<void> {
    // Initialize creative reasoning components
    // This could include loading creative patterns, innovation frameworks, etc.
  }

  protected async doProcess(
    problem: Problem,
    context?: Context
  ): Promise<{
    reasoning_steps: ReasoningStep[];
    conclusions: string[];
    confidence: number;
    insights: string[];
    evidence: Evidence[];
    assumptions: string[];
  }> {
    const reasoningSteps: ReasoningStep[] = [];
    const evidence: Evidence[] = [];
    const assumptions: string[] = [];

    // Step 1: Generate creative alternatives
    const alternatives = await this.generateAlternatives(problem);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.ANALOGICAL,
        `Generated ${alternatives.length} creative alternatives`,
        this.calculateAlternativesConfidence(alternatives),
        { alternatives }
      )
    );

    // Step 2: Explore unconventional approaches
    const unconventionalApproaches = await this.exploreUnconventional(problem);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.HEURISTIC,
        `Explored ${unconventionalApproaches.length} unconventional approaches`,
        this.calculateUnconventionalConfidence(unconventionalApproaches),
        { unconventional_approaches: unconventionalApproaches }
      )
    );

    // Step 3: Synthesize novel solutions
    const insights = this.generateCreativeInsights(
      problem,
      alternatives,
      unconventionalApproaches
    );
    const novelSolutions = await this.synthesizeNovelSolutions(insights);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.ANALOGICAL,
        `Synthesized ${novelSolutions.length} novel solutions`,
        this.calculateNovelSolutionsConfidence(novelSolutions),
        { novel_solutions: novelSolutions }
      )
    );

    // Step 4: Apply creative techniques
    const techniqueResults = this.applyCreativeTechniques(problem, context);
    reasoningSteps.push(
      this.createReasoningStep(
        ReasoningType.HEURISTIC,
        `Applied creative techniques: ${techniqueResults.techniques_used.join(
          ", "
        )}`,
        techniqueResults.effectiveness,
        { technique_results: techniqueResults }
      )
    );

    // Generate evidence from creative exploration
    evidence.push(
      ...this.generateCreativeEvidence(
        alternatives,
        unconventionalApproaches,
        novelSolutions
      )
    );

    // Identify creative assumptions
    assumptions.push(...this.identifyCreativeAssumptions(problem));

    // Generate conclusions
    const conclusions = this.generateCreativeConclusions(
      alternatives,
      unconventionalApproaches,
      novelSolutions
    );

    // Calculate overall confidence
    const confidence = this.calculateCreativeConfidence(
      alternatives,
      unconventionalApproaches,
      novelSolutions
    );

    return {
      reasoning_steps: reasoningSteps,
      conclusions,
      confidence,
      insights,
      evidence,
      assumptions,
    };
  }

  protected doReset(): void {
    // Reset creative reasoning state
  }

  async generateAlternatives(problem: Problem): Promise<CreativeAlternative[]> {
    const alternatives: CreativeAlternative[] = [];

    // Brainstorming-based alternatives
    const brainstormingAlternatives = this.brainstormAlternatives(problem);
    alternatives.push(...brainstormingAlternatives);

    // Analogical alternatives
    const analogicalAlternatives = this.generateAnalogicalAlternatives(problem);
    alternatives.push(...analogicalAlternatives);

    // Reverse thinking alternatives
    const reverseAlternatives =
      this.generateReverseThinkingAlternatives(problem);
    alternatives.push(...reverseAlternatives);

    // Random stimulation alternatives
    const randomAlternatives =
      this.generateRandomStimulationAlternatives(problem);
    alternatives.push(...randomAlternatives);

    return alternatives;
  }

  async exploreUnconventional(
    problem: Problem
  ): Promise<UnconventionalApproach[]> {
    const approaches: UnconventionalApproach[] = [];

    // Challenge assumptions approach
    approaches.push({
      approach: "Challenge fundamental assumptions about the problem",
      rationale: "Questioning basic assumptions can reveal new solution paths",
      risks: [
        "May lead to impractical solutions",
        "Could ignore important constraints",
      ],
      benefits: [
        "Opens new possibilities",
        "Breaks conventional thinking patterns",
      ],
    });

    // Extreme scenarios approach
    if (problem.uncertainty > 0.5) {
      approaches.push({
        approach: "Design for extreme scenarios first",
        rationale: "Extreme cases often reveal robust solutions",
        risks: ["Over-engineering", "Resource intensive"],
        benefits: ["Robust solutions", "Handles edge cases well"],
      });
    }

    // Cross-domain inspiration
    approaches.push({
      approach: `Apply solutions from ${this.getRandomDomain(
        problem.domain
      )} domain`,
      rationale: "Cross-pollination of ideas from different domains",
      risks: ["Domain mismatch", "Implementation complexity"],
      benefits: ["Novel perspectives", "Proven solutions in other contexts"],
    });

    // Constraint removal approach
    if (problem.constraints.length > 0) {
      approaches.push({
        approach: "Temporarily ignore all constraints to explore possibilities",
        rationale: "Constraints can limit creative thinking",
        risks: ["Impractical solutions", "Ignores real limitations"],
        benefits: ["Unlimited creativity", "May find ways around constraints"],
      });
    }

    return approaches;
  }

  async synthesizeNovelSolutions(insights: string[]): Promise<NovelSolution[]> {
    const solutions: NovelSolution[] = [];

    // Combine insights into novel solutions
    if (insights.length >= 2) {
      solutions.push({
        solution: `Hybrid approach combining ${insights
          .slice(0, 2)
          .join(" and ")}`,
        innovation_level: 0.8,
        implementation_complexity: 0.6,
        expected_outcomes: [
          "Leverages strengths of multiple approaches",
          "Addresses different aspects of the problem",
          "Provides fallback options",
        ],
      });
    }

    // Technology-inspired solutions
    if (
      insights.some(
        (insight) =>
          insight.includes("technology") || insight.includes("digital")
      )
    ) {
      solutions.push({
        solution: "Technology-augmented solution with human oversight",
        innovation_level: 0.7,
        implementation_complexity: 0.8,
        expected_outcomes: [
          "Scales efficiently",
          "Reduces human error",
          "Provides data-driven insights",
        ],
      });
    }

    // Community-based solutions
    solutions.push({
      solution: "Crowdsourced collaborative solution approach",
      innovation_level: 0.6,
      implementation_complexity: 0.5,
      expected_outcomes: [
        "Leverages collective intelligence",
        "Distributes workload",
        "Increases buy-in and adoption",
      ],
    });

    return solutions;
  }

  private brainstormAlternatives(problem: Problem): CreativeAlternative[] {
    const alternatives: CreativeAlternative[] = [];

    // Generate alternatives based on problem characteristics
    if (problem.complexity > 0.7) {
      alternatives.push({
        alternative:
          "Divide and conquer: Break into smaller, manageable pieces",
        novelty_score: 0.4,
        feasibility: 0.9,
        potential_impact: 0.8,
      });
    }

    if (problem.time_sensitivity > 0.7) {
      alternatives.push({
        alternative: "Rapid prototyping with iterative refinement",
        novelty_score: 0.6,
        feasibility: 0.8,
        potential_impact: 0.7,
      });
    }

    if (problem.stakeholders.length > 2) {
      alternatives.push({
        alternative: "Stakeholder co-creation workshop approach",
        novelty_score: 0.7,
        feasibility: 0.7,
        potential_impact: 0.9,
      });
    }

    return alternatives;
  }

  private generateAnalogicalAlternatives(
    problem: Problem
  ): CreativeAlternative[] {
    const alternatives: CreativeAlternative[] = [];

    // Nature-inspired analogies
    alternatives.push({
      alternative: "Biomimetic approach: Learn from natural systems",
      novelty_score: 0.8,
      feasibility: 0.6,
      potential_impact: 0.7,
    });

    // Historical analogies
    alternatives.push({
      alternative:
        "Historical precedent analysis: How were similar problems solved before?",
      novelty_score: 0.5,
      feasibility: 0.8,
      potential_impact: 0.6,
    });

    // Cross-industry analogies
    alternatives.push({
      alternative: `Apply ${this.getRandomDomain(
        problem.domain
      )} industry best practices`,
      novelty_score: 0.7,
      feasibility: 0.7,
      potential_impact: 0.8,
    });

    return alternatives;
  }

  private generateReverseThinkingAlternatives(
    _problem: Problem
  ): CreativeAlternative[] {
    const alternatives: CreativeAlternative[] = [];

    alternatives.push({
      alternative:
        "Reverse engineering: Start from desired outcome and work backwards",
      novelty_score: 0.6,
      feasibility: 0.8,
      potential_impact: 0.7,
    });

    alternatives.push({
      alternative:
        "Opposite approach: Do the exact opposite of conventional wisdom",
      novelty_score: 0.9,
      feasibility: 0.4,
      potential_impact: 0.6,
    });

    return alternatives;
  }

  private generateRandomStimulationAlternatives(
    _problem: Problem
  ): CreativeAlternative[] {
    const randomWords = [
      "cloud",
      "mirror",
      "bridge",
      "garden",
      "symphony",
      "puzzle",
      "dance",
      "river",
    ];
    const randomWord =
      randomWords[Math.floor(Math.random() * randomWords.length)];

    return [
      {
        alternative: `${randomWord}-inspired approach: Use ${randomWord} as metaphor for solution`,
        novelty_score: 0.9,
        feasibility: 0.3,
        potential_impact: 0.5,
      },
    ];
  }

  private applyCreativeTechniques(
    problem: Problem,
    _context?: Context
  ): {
    techniques_used: string[];
    effectiveness: number;
    insights: string[];
  } {
    const techniques_used: string[] = [];
    const insights: string[] = [];

    // Select techniques based on problem characteristics
    if (problem.complexity > 0.6) {
      techniques_used.push("morphological_analysis");
      insights.push(
        "Break problem into independent dimensions for systematic exploration"
      );
    }

    if (problem.uncertainty > 0.5) {
      techniques_used.push("scenario_planning");
      insights.push(
        "Consider multiple future scenarios to build robust solutions"
      );
    }

    if (problem.stakeholders.length > 1) {
      techniques_used.push("six_thinking_hats");
      insights.push(
        "Explore problem from multiple perspectives systematically"
      );
    }

    // Always include brainstorming
    techniques_used.push("brainstorming");
    insights.push("Generate many ideas without initial judgment");

    const effectiveness = techniques_used.length > 0 ? 0.7 : 0.3;

    return {
      techniques_used,
      effectiveness,
      insights,
    };
  }

  private generateCreativeEvidence(
    alternatives: CreativeAlternative[],
    unconventionalApproaches: UnconventionalApproach[],
    novelSolutions: NovelSolution[]
  ): Evidence[] {
    const evidence: Evidence[] = [];

    // Evidence from alternatives
    if (alternatives.length > 0) {
      const avgNovelty =
        alternatives.reduce((sum, alt) => sum + alt.novelty_score, 0) /
        alternatives.length;
      evidence.push(
        this.createEvidence(
          `Generated ${
            alternatives.length
          } alternatives with average novelty ${avgNovelty.toFixed(2)}`,
          "creative_generation",
          0.8,
          0.9
        )
      );
    }

    // Evidence from unconventional approaches
    if (unconventionalApproaches.length > 0) {
      evidence.push(
        this.createEvidence(
          `Explored ${unconventionalApproaches.length} unconventional approaches`,
          "unconventional_exploration",
          0.7,
          0.8
        )
      );
    }

    // Evidence from novel solutions
    if (novelSolutions.length > 0) {
      const avgInnovation =
        novelSolutions.reduce((sum, sol) => sum + sol.innovation_level, 0) /
        novelSolutions.length;
      evidence.push(
        this.createEvidence(
          `Synthesized ${
            novelSolutions.length
          } novel solutions with average innovation ${avgInnovation.toFixed(
            2
          )}`,
          "solution_synthesis",
          0.75,
          0.85
        )
      );
    }

    return evidence;
  }

  private identifyCreativeAssumptions(problem: Problem): string[] {
    const assumptions: string[] = [];

    assumptions.push("Novel solutions are valuable even if unconventional");
    assumptions.push("Creative exploration time is available");
    assumptions.push("Stakeholders are open to innovative approaches");

    if (problem.constraints.length > 0) {
      assumptions.push("Some constraints may be negotiable or removable");
    }

    return assumptions;
  }

  private generateCreativeConclusions(
    alternatives: CreativeAlternative[],
    unconventionalApproaches: UnconventionalApproach[],
    novelSolutions: NovelSolution[]
  ): string[] {
    const conclusions: string[] = [];

    if (alternatives.length > 0) {
      const highNoveltyAlts = alternatives.filter(
        (alt) => alt.novelty_score > 0.7
      );
      if (highNoveltyAlts.length > 0) {
        conclusions.push(
          `${highNoveltyAlts.length} highly novel alternatives identified`
        );
      }
    }

    if (unconventionalApproaches.length > 0) {
      conclusions.push(
        "Unconventional approaches offer breakthrough potential"
      );
    }

    if (novelSolutions.length > 0) {
      const highInnovationSols = novelSolutions.filter(
        (sol) => sol.innovation_level > 0.7
      );
      if (highInnovationSols.length > 0) {
        conclusions.push(
          `${highInnovationSols.length} highly innovative solutions synthesized`
        );
      }
    }

    conclusions.push("Creative exploration reveals multiple solution pathways");

    return conclusions;
  }

  private generateCreativeInsights(
    problem: Problem,
    alternatives: CreativeAlternative[],
    unconventionalApproaches: UnconventionalApproach[]
  ): string[] {
    const insights: string[] = [];

    // Insights from alternatives
    if (alternatives.length > 3) {
      insights.push("Multiple creative pathways available");
    }

    // Insights from unconventional approaches
    if (unconventionalApproaches.length > 0) {
      insights.push("Challenging assumptions opens new possibilities");
    }

    // Problem-specific insights
    if (problem.complexity > 0.7) {
      insights.push("Complex problems benefit from creative decomposition");
    }

    if (problem.uncertainty > 0.6) {
      insights.push("Uncertainty creates space for innovative solutions");
    }

    // Add base insights
    insights.push(...this.generateInsights(problem, []));

    return insights;
  }

  private calculateAlternativesConfidence(
    alternatives: CreativeAlternative[]
  ): number {
    if (alternatives.length === 0) return 0.3;

    const avgFeasibility =
      alternatives.reduce((sum, alt) => sum + alt.feasibility, 0) /
      alternatives.length;
    const avgImpact =
      alternatives.reduce((sum, alt) => sum + alt.potential_impact, 0) /
      alternatives.length;

    return (avgFeasibility + avgImpact) / 2;
  }

  private calculateUnconventionalConfidence(
    approaches: UnconventionalApproach[]
  ): number {
    return approaches.length > 0 ? 0.6 : 0.3;
  }

  private calculateNovelSolutionsConfidence(
    solutions: NovelSolution[]
  ): number {
    if (solutions.length === 0) return 0.3;

    const avgInnovation =
      solutions.reduce((sum, sol) => sum + sol.innovation_level, 0) /
      solutions.length;
    const avgComplexity =
      solutions.reduce(
        (sum, sol) => sum + (1 - sol.implementation_complexity),
        0
      ) / solutions.length;

    return (avgInnovation + avgComplexity) / 2;
  }

  private calculateCreativeConfidence(
    alternatives: CreativeAlternative[],
    unconventionalApproaches: UnconventionalApproach[],
    novelSolutions: NovelSolution[]
  ): number {
    const altConfidence = this.calculateAlternativesConfidence(alternatives);
    const unconventionalConfidence = this.calculateUnconventionalConfidence(
      unconventionalApproaches
    );
    const novelConfidence =
      this.calculateNovelSolutionsConfidence(novelSolutions);

    return (altConfidence + unconventionalConfidence + novelConfidence) / 3;
  }

  private getRandomDomain(currentDomain: string): string {
    const domains = [
      "biology",
      "architecture",
      "music",
      "sports",
      "cooking",
      "transportation",
      "art",
      "gaming",
    ];
    const otherDomains = domains.filter((d) => d !== currentDomain);
    return otherDomains[Math.floor(Math.random() * otherDomains.length)];
  }
}
