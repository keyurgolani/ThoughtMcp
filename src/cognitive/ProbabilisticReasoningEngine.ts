/**
 * Probabilistic Reasoning Engine with Bayesian belief updating and uncertainty quantification
 */

import {
  BeliefEdge,
  BeliefNetwork,
  BeliefNode,
  BranchPoint,
  ConditionalProbability,
  Evidence,
  EvidenceIntegration,
  Hypothesis,
  ProbabilisticReasoningEngine as IProbabilisticReasoningEngine,
  ProbabilisticReasoningResult,
  ReasoningChain,
  ReasoningStep,
  UncertaintyAssessment,
  UncertaintyPropagation,
  UncertaintySource,
} from "../interfaces/probabilistic-reasoning.js";
import { Context } from "../types/core.js";

interface PropagationPathStep {
  from_node: string;
  to_node: string;
  uncertainty_transfer: number;
  amplification_factor: number;
  method: string;
}

export class ProbabilisticReasoningEngine
  implements IProbabilisticReasoningEngine
{
  async processWithUncertainty(
    input: string,
    context?: Context
  ): Promise<ProbabilisticReasoningResult> {
    const startTime = Date.now();

    try {
      // Step 1: Parse input and extract key concepts
      const concepts = this.extractConcepts(input);

      // Step 2: Generate initial hypotheses
      const hypotheses = this.generateHypotheses(input, concepts);

      // Step 3: Collect and evaluate evidence
      const evidence = this.collectEvidence(input, concepts, context);

      // Step 4: Build belief network
      const beliefNetwork = this.buildBeliefNetwork(hypotheses, evidence);

      // Step 5: Perform Bayesian updating
      const updatedNetwork = await this.updateBeliefs(
        evidence[0],
        beliefNetwork
      );

      // Step 6: Generate reasoning chain
      const reasoningChain = this.buildReasoningChain(
        hypotheses,
        evidence,
        updatedNetwork
      );

      // Step 7: Quantify uncertainty
      const uncertaintyAssessment = this.quantifyUncertainty(reasoningChain);

      // Step 8: Integrate evidence
      const evidenceIntegration = this.integrateEvidence(evidence);

      // Step 9: Select best hypothesis and generate conclusion
      const bestHypothesis = this.selectBestHypothesis(
        hypotheses,
        updatedNetwork
      );
      const conclusion = this.generateConclusion(
        bestHypothesis,
        evidenceIntegration
      );

      const processingTime = Date.now() - startTime;

      return {
        conclusion,
        confidence: bestHypothesis.confidence,
        uncertainty_assessment: uncertaintyAssessment,
        belief_network: updatedNetwork,
        evidence_integration: evidenceIntegration,
        alternative_hypotheses: hypotheses.filter(
          (h) => h.id !== bestHypothesis.id
        ),
        reasoning_chain: reasoningChain,
        processing_time_ms: processingTime,
      };
    } catch (error) {
      // Fallback response with high uncertainty
      return {
        conclusion: `Unable to process with high confidence due to: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        confidence: 0.1,
        uncertainty_assessment: {
          epistemic_uncertainty: 0.9,
          aleatoric_uncertainty: 0.5,
          combined_uncertainty: 0.95,
          confidence_interval: [0.05, 0.15],
          uncertainty_sources: [
            {
              type: "model_limitations",
              description: "Processing error occurred",
              impact: 0.9,
              mitigation_suggestions: [
                "Retry with simpler input",
                "Check input format",
              ],
            },
          ],
          reliability_assessment: 0.1,
        },
        belief_network: this.createEmptyBeliefNetwork(),
        evidence_integration: this.createEmptyEvidenceIntegration(),
        alternative_hypotheses: [],
        reasoning_chain: {
          steps: [],
          logical_structure: "",
          confidence_propagation: [],
          uncertainty_propagation: [],
          branch_points: [],
        },
        processing_time_ms: Date.now() - startTime,
      };
    }
  }

  async updateBeliefs(
    evidence: Evidence,
    priorBeliefs: BeliefNetwork
  ): Promise<BeliefNetwork> {
    const updatedNetwork: BeliefNetwork = {
      nodes: new Map(priorBeliefs.nodes),
      edges: new Map(priorBeliefs.edges),
      prior_probabilities: new Map(priorBeliefs.prior_probabilities),
      conditional_probabilities: new Map(
        priorBeliefs.conditional_probabilities
      ),
      evidence_nodes: [...priorBeliefs.evidence_nodes],
    };

    // Apply Bayesian updating to relevant nodes
    for (const [, node] of updatedNetwork.nodes) {
      if (this.isRelevantToEvidence(node, evidence)) {
        const prior = node.probability;
        const likelihood = this.calculateLikelihood(evidence, node);
        const marginalLikelihood = this.calculateMarginalLikelihood(
          evidence,
          updatedNetwork
        );

        // Bayes' theorem: P(H|E) = P(E|H) * P(H) / P(E)
        const posterior = (likelihood * prior) / marginalLikelihood;

        node.probability = Math.max(0.01, Math.min(0.99, posterior));
        node.evidence_support.push(evidence);

        // Update uncertainty based on evidence quality
        node.uncertainty = this.updateUncertainty(
          node.uncertainty,
          evidence.reliability
        );
      }
    }

    return updatedNetwork;
  }

  quantifyUncertainty(reasoning: ReasoningChain): UncertaintyAssessment {
    const epistemicUncertainty = this.calculateEpistemicUncertainty(reasoning);
    const aleatoricUncertainty = this.calculateAleatoricUncertainty(reasoning);
    const combinedUncertainty = this.combineUncertainties(
      epistemicUncertainty,
      aleatoricUncertainty
    );

    const uncertaintySources = this.identifyUncertaintySources(reasoning);
    const reliabilityAssessment = this.assessReliability(reasoning);

    const avgConfidence =
      reasoning.confidence_propagation.reduce((a, b) => a + b, 0) /
      reasoning.confidence_propagation.length;
    const confidenceInterval: [number, number] = [
      Math.max(0, avgConfidence - combinedUncertainty),
      Math.min(1, avgConfidence + combinedUncertainty),
    ];

    return {
      epistemic_uncertainty: epistemicUncertainty,
      aleatoric_uncertainty: aleatoricUncertainty,
      combined_uncertainty: combinedUncertainty,
      confidence_interval: confidenceInterval,
      uncertainty_sources: uncertaintySources,
      reliability_assessment: reliabilityAssessment,
    };
  }

  propagateUncertainty(
    beliefs: BeliefNetwork,
    evidence: Evidence[]
  ): UncertaintyPropagation {
    const initialUncertainty = new Map<string, number>();
    const finalUncertainty = new Map<string, number>();

    // Initialize uncertainty values
    for (const [nodeId, node] of beliefs.nodes) {
      initialUncertainty.set(nodeId, node.uncertainty);
    }

    // Propagate uncertainty through the network
    const propagationPath = this.calculatePropagationPath(beliefs, evidence);

    // Update final uncertainty values
    for (const [nodeId, node] of beliefs.nodes) {
      finalUncertainty.set(nodeId, node.uncertainty);
    }

    const uncertaintyAmplification = this.calculateUncertaintyAmplification(
      initialUncertainty,
      finalUncertainty
    );
    const criticalNodes = this.identifyCriticalNodes(beliefs, propagationPath);

    return {
      initial_uncertainty: initialUncertainty,
      final_uncertainty: finalUncertainty,
      propagation_path: propagationPath,
      uncertainty_amplification: uncertaintyAmplification,
      critical_nodes: criticalNodes,
    };
  }

  // Private helper methods
  private extractConcepts(input: string): string[] {
    // Simple concept extraction - in a real implementation, this would use NLP
    const words = input.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
    ]);
    return words.filter((word) => word.length > 3 && !stopWords.has(word));
  }

  private generateHypotheses(input: string, concepts: string[]): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    // Generate primary hypothesis
    hypotheses.push({
      id: "h1",
      description: `Primary interpretation: ${input}`,
      probability: 0.6,
      evidence_support: [],
      alternative_explanations: [],
      testable_predictions: [
        `If true, we should observe evidence related to: ${concepts.join(
          ", "
        )}`,
      ],
      confidence: 0.7,
    });

    // Generate alternative hypotheses
    hypotheses.push({
      id: "h2",
      description: `Alternative interpretation with different emphasis`,
      probability: 0.3,
      evidence_support: [],
      alternative_explanations: [
        "Different causal relationship",
        "Different context interpretation",
      ],
      testable_predictions: ["Alternative evidence patterns should emerge"],
      confidence: 0.5,
    });

    hypotheses.push({
      id: "h3",
      description: `Null hypothesis: No significant pattern`,
      probability: 0.1,
      evidence_support: [],
      alternative_explanations: [
        "Random occurrence",
        "Insufficient information",
      ],
      testable_predictions: ["No consistent evidence patterns"],
      confidence: 0.3,
    });

    return hypotheses;
  }

  private collectEvidence(
    input: string,
    concepts: string[],
    context?: Context
  ): Evidence[] {
    const evidence: Evidence[] = [];

    // Generate evidence based on input analysis
    evidence.push({
      id: "e1",
      content: `Direct textual evidence from input: "${input}"`,
      type: "observational",
      reliability: 0.8,
      relevance: 0.9,
      timestamp: Date.now(),
      source: "input_analysis",
      weight: 1.0,
    });

    // Generate contextual evidence if available
    if (context) {
      evidence.push({
        id: "e2",
        content: `Contextual information: domain=${
          context.domain ?? "unknown"
        }`,
        type: "testimonial",
        reliability: 0.6,
        relevance: 0.7,
        timestamp: Date.now(),
        source: "context",
        weight: 0.7,
      });
    }

    // Generate concept-based evidence
    if (concepts.length > 0) {
      evidence.push({
        id: "e3",
        content: `Conceptual analysis reveals key terms: ${concepts.join(
          ", "
        )}`,
        type: "logical",
        reliability: 0.7,
        relevance: 0.8,
        timestamp: Date.now(),
        source: "concept_extraction",
        weight: 0.8,
      });
    }

    return evidence;
  }

  private buildBeliefNetwork(
    hypotheses: Hypothesis[],
    evidence: Evidence[]
  ): BeliefNetwork {
    const nodes = new Map<string, BeliefNode>();
    const edges = new Map<string, BeliefEdge>();
    const priorProbabilities = new Map<string, number>();
    const conditionalProbabilities = new Map<string, ConditionalProbability>();
    const evidenceNodes: string[] = [];

    // Add hypothesis nodes
    for (const hypothesis of hypotheses) {
      nodes.set(hypothesis.id, {
        id: hypothesis.id,
        name: hypothesis.description,
        type: "hypothesis",
        probability: hypothesis.probability,
        uncertainty: 1 - hypothesis.confidence,
        dependencies: [],
        evidence_support: hypothesis.evidence_support,
      });
      priorProbabilities.set(hypothesis.id, hypothesis.probability);
    }

    // Add evidence nodes
    for (const evidenceItem of evidence) {
      nodes.set(evidenceItem.id, {
        id: evidenceItem.id,
        name: evidenceItem.content,
        type: "evidence",
        probability: evidenceItem.reliability,
        uncertainty: 1 - evidenceItem.reliability,
        dependencies: [],
        evidence_support: [evidenceItem],
      });
      evidenceNodes.push(evidenceItem.id);
    }

    // Create edges between evidence and hypotheses
    for (const evidenceItem of evidence) {
      for (const hypothesis of hypotheses) {
        const relevanceScore = this.calculateRelevance(
          evidenceItem,
          hypothesis
        );
        if (relevanceScore > 0.3) {
          const edgeId = `${evidenceItem.id}->${hypothesis.id}`;
          edges.set(edgeId, {
            from: evidenceItem.id,
            to: hypothesis.id,
            strength: relevanceScore,
            type: "evidential",
            confidence: evidenceItem.reliability * hypothesis.confidence,
          });
        }
      }
    }

    return {
      nodes,
      edges,
      prior_probabilities: priorProbabilities,
      conditional_probabilities: conditionalProbabilities,
      evidence_nodes: evidenceNodes,
    };
  }

  private buildReasoningChain(
    hypotheses: Hypothesis[],
    evidence: Evidence[],
    _network: BeliefNetwork
  ): ReasoningChain {
    const steps: ReasoningStep[] = [];
    const confidencePropagation: number[] = [];
    const uncertaintyPropagation: number[] = [];
    const branchPoints: BranchPoint[] = [];

    // Add premise steps for evidence
    for (const evidenceItem of evidence) {
      steps.push({
        id: `step_${evidenceItem.id}`,
        type: "premise",
        content: evidenceItem.content,
        confidence: evidenceItem.reliability,
        uncertainty: 1 - evidenceItem.reliability,
        evidence_basis: [evidenceItem],
        logical_form: "premise",
        alternatives: [],
      });
      confidencePropagation.push(evidenceItem.reliability);
      uncertaintyPropagation.push(1 - evidenceItem.reliability);
    }

    // Add inference steps
    const bestHypothesis = hypotheses.reduce((best, current) =>
      current.probability > best.probability ? current : best
    );

    steps.push({
      id: "inference_step",
      type: "inference",
      content: `Based on the evidence, the most likely explanation is: ${bestHypothesis.description}`,
      confidence: bestHypothesis.confidence,
      uncertainty: 1 - bestHypothesis.confidence,
      evidence_basis: evidence,
      logical_form: "abductive_inference",
      alternatives: hypotheses
        .filter((h) => h.id !== bestHypothesis.id)
        .map((h) => h.description),
    });
    confidencePropagation.push(bestHypothesis.confidence);
    uncertaintyPropagation.push(1 - bestHypothesis.confidence);

    // Add conclusion step
    steps.push({
      id: "conclusion_step",
      type: "conclusion",
      content: `Therefore, ${bestHypothesis.description}`,
      confidence: bestHypothesis.probability,
      uncertainty: 1 - bestHypothesis.probability,
      evidence_basis: evidence,
      logical_form: "conclusion",
      alternatives: [],
    });
    confidencePropagation.push(bestHypothesis.probability);
    uncertaintyPropagation.push(1 - bestHypothesis.probability);

    // Add branch point for hypothesis selection
    if (hypotheses.length > 1) {
      branchPoints.push({
        step_id: "inference_step",
        alternatives: hypotheses.map((h) => ({
          description: h.description,
          probability: h.probability,
          consequences: h.testable_predictions,
          evidence_requirements: [`Evidence supporting: ${h.description}`],
        })),
        selection_rationale:
          "Selected hypothesis with highest posterior probability",
        confidence_impact: bestHypothesis.confidence - 0.5,
      });
    }

    return {
      steps,
      logical_structure: "premise -> inference -> conclusion",
      confidence_propagation: confidencePropagation,
      uncertainty_propagation: uncertaintyPropagation,
      branch_points: branchPoints,
    };
  }

  private selectBestHypothesis(
    hypotheses: Hypothesis[],
    network: BeliefNetwork
  ): Hypothesis {
    return hypotheses.reduce((best, current) => {
      const currentNode = network.nodes.get(current.id);
      const bestNode = network.nodes.get(best.id);

      if (!currentNode || !bestNode) return best;

      return currentNode.probability > bestNode.probability ? current : best;
    });
  }

  private generateConclusion(
    hypothesis: Hypothesis,
    evidenceIntegration: EvidenceIntegration
  ): string {
    const confidenceLevel =
      hypothesis.confidence > 0.8
        ? "high"
        : hypothesis.confidence > 0.6
        ? "moderate"
        : "low";

    return (
      `With ${confidenceLevel} confidence (${(
        hypothesis.confidence * 100
      ).toFixed(1)}%), ` +
      `the analysis suggests: ${hypothesis.description}. ` +
      `This conclusion is based on ${evidenceIntegration.total_evidence_count} pieces of evidence ` +
      `with an overall quality score of ${(
        evidenceIntegration.evidence_quality_score * 100
      ).toFixed(1)}%.`
    );
  }

  private integrateEvidence(evidence: Evidence[]): EvidenceIntegration {
    const totalCount = evidence.length;
    const qualityScore =
      evidence.reduce((sum, e) => sum + e.reliability, 0) / totalCount;
    const conflictingEvidence = evidence.filter((e) => e.reliability < 0.5);
    const supportingEvidence = evidence.filter((e) => e.reliability >= 0.5);
    const reliabilityWeightedScore =
      evidence.reduce((sum, e) => sum + e.reliability * e.weight, 0) /
      evidence.reduce((sum, e) => sum + e.weight, 0);

    return {
      total_evidence_count: totalCount,
      evidence_quality_score: qualityScore,
      conflicting_evidence: conflictingEvidence,
      supporting_evidence: supportingEvidence,
      evidence_synthesis: `Integrated ${totalCount} pieces of evidence with average quality ${(
        qualityScore * 100
      ).toFixed(1)}%`,
      reliability_weighted_score: reliabilityWeightedScore,
    };
  }

  // Uncertainty calculation methods
  private calculateEpistemicUncertainty(reasoning: ReasoningChain): number {
    // Epistemic uncertainty comes from lack of knowledge
    const knowledgeGaps = reasoning.steps.filter(
      (step) => step.type === "assumption"
    ).length;
    const totalSteps = reasoning.steps.length;
    return Math.min(0.9, knowledgeGaps / totalSteps + 0.1);
  }

  private calculateAleatoricUncertainty(reasoning: ReasoningChain): number {
    // Aleatoric uncertainty comes from inherent randomness
    const avgUncertainty =
      reasoning.uncertainty_propagation.reduce((a, b) => a + b, 0) /
      reasoning.uncertainty_propagation.length;
    return Math.min(0.9, avgUncertainty);
  }

  private combineUncertainties(epistemic: number, aleatoric: number): number {
    // Combine uncertainties using quadrature sum
    return Math.sqrt(epistemic * epistemic + aleatoric * aleatoric);
  }

  private identifyUncertaintySources(
    reasoning: ReasoningChain
  ): UncertaintySource[] {
    const sources: UncertaintySource[] = [];

    // Check for data quality issues
    const lowConfidenceSteps = reasoning.steps.filter(
      (step) => step.confidence < 0.6
    );
    if (lowConfidenceSteps.length > 0) {
      sources.push({
        type: "data_quality",
        description: `${lowConfidenceSteps.length} reasoning steps have low confidence`,
        impact: lowConfidenceSteps.length / reasoning.steps.length,
        mitigation_suggestions: [
          "Gather additional evidence",
          "Verify low-confidence claims",
        ],
      });
    }

    // Check for incomplete information
    const assumptionSteps = reasoning.steps.filter(
      (step) => step.type === "assumption"
    );
    if (assumptionSteps.length > 0) {
      sources.push({
        type: "incomplete_information",
        description: `${assumptionSteps.length} assumptions made due to missing information`,
        impact: assumptionSteps.length / reasoning.steps.length,
        mitigation_suggestions: [
          "Research missing information",
          "Validate assumptions",
        ],
      });
    }

    return sources;
  }

  private assessReliability(reasoning: ReasoningChain): number {
    const avgConfidence =
      reasoning.confidence_propagation.reduce((a, b) => a + b, 0) /
      reasoning.confidence_propagation.length;
    const consistencyScore = this.calculateConsistency(reasoning);
    return (avgConfidence + consistencyScore) / 2;
  }

  private calculateConsistency(reasoning: ReasoningChain): number {
    // Simple consistency check based on confidence variance
    const confidences = reasoning.confidence_propagation;
    const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const variance =
      confidences.reduce((sum, conf) => sum + Math.pow(conf - mean, 2), 0) /
      confidences.length;
    return Math.max(0, 1 - variance); // Lower variance = higher consistency
  }

  // Helper methods for Bayesian updating
  private isRelevantToEvidence(node: BeliefNode, evidence: Evidence): boolean {
    return node.type === "hypothesis" && evidence.relevance > 0.3;
  }

  private calculateLikelihood(evidence: Evidence, _node: BeliefNode): number {
    // Simplified likelihood calculation based on evidence relevance and reliability
    return evidence.relevance * evidence.reliability;
  }

  private calculateMarginalLikelihood(
    evidence: Evidence,
    network: BeliefNetwork
  ): number {
    // Simplified marginal likelihood calculation
    let marginal = 0;
    for (const [_, node] of network.nodes) {
      if (node.type === "hypothesis") {
        marginal += this.calculateLikelihood(evidence, node) * node.probability;
      }
    }
    return Math.max(0.01, marginal); // Avoid division by zero
  }

  private updateUncertainty(
    currentUncertainty: number,
    evidenceReliability: number
  ): number {
    // Evidence reduces uncertainty proportionally to its reliability
    const reductionFactor = evidenceReliability * 0.5;
    return Math.max(0.01, currentUncertainty * (1 - reductionFactor));
  }

  private calculateRelevance(
    evidence: Evidence,
    hypothesis: Hypothesis
  ): number {
    // Simple relevance calculation based on content overlap
    const evidenceWords = evidence.content.toLowerCase().split(/\s+/);
    const hypothesisWords = hypothesis.description.toLowerCase().split(/\s+/);
    const overlap = evidenceWords.filter((word) =>
      hypothesisWords.includes(word)
    ).length;
    return Math.min(
      1,
      overlap / Math.min(evidenceWords.length, hypothesisWords.length)
    );
  }

  private calculatePropagationPath(
    _network: BeliefNetwork,
    evidence: Evidence[]
  ): PropagationPathStep[] {
    // Simplified propagation path calculation
    return evidence.map((e) => ({
      from_node: e.id,
      to_node: "hypothesis_nodes",
      uncertainty_transfer: 1 - e.reliability,
      amplification_factor: 1.0,
      method: "bayesian_update",
    }));
  }

  private calculateUncertaintyAmplification(
    initial: Map<string, number>,
    final: Map<string, number>
  ): number {
    let totalAmplification = 0;
    let count = 0;

    for (const [nodeId, initialUncertainty] of initial) {
      const finalUncertainty = final.get(nodeId) ?? initialUncertainty;
      totalAmplification += finalUncertainty / initialUncertainty;
      count++;
    }

    return count > 0 ? totalAmplification / count : 1.0;
  }

  private identifyCriticalNodes(
    network: BeliefNetwork,
    _propagationPath: PropagationPathStep[]
  ): string[] {
    // Identify nodes with high impact on uncertainty propagation
    const criticalNodes: string[] = [];

    for (const [nodeId, node] of network.nodes) {
      if (node.uncertainty > 0.7 && node.type === "hypothesis") {
        criticalNodes.push(nodeId);
      }
    }

    return criticalNodes;
  }

  private createEmptyBeliefNetwork(): BeliefNetwork {
    return {
      nodes: new Map(),
      edges: new Map(),
      prior_probabilities: new Map(),
      conditional_probabilities: new Map(),
      evidence_nodes: [],
    };
  }

  private createEmptyEvidenceIntegration(): EvidenceIntegration {
    return {
      total_evidence_count: 0,
      evidence_quality_score: 0,
      conflicting_evidence: [],
      supporting_evidence: [],
      evidence_synthesis: "No evidence available",
      reliability_weighted_score: 0,
    };
  }
}
