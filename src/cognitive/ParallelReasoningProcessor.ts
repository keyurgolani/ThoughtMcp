/**
 * Parallel Reasoning Processor
 *
 * Coordinates multiple reasoning streams to process problems concurrently
 */

import {
  AlternativePerspective,
  ConflictDetection,
  ConflictResolution,
  ConsensusBuilding,
  InformationSharing,
  IParallelReasoningProcessor,
  ParallelReasoningResult,
  ReasoningStream,
  StreamCoordination,
  StreamResult,
  SynchronizationPoint,
} from "../interfaces/parallel-reasoning.js";
import { Problem } from "../interfaces/systematic-thinking.js";
import { Context } from "../types/core.js";
import { AnalyticalReasoningStream } from "./streams/AnalyticalReasoningStream.js";
import { CreativeReasoningStream } from "./streams/CreativeReasoningStream.js";
import { CriticalReasoningStream } from "./streams/CriticalReasoningStream.js";
import { SyntheticReasoningStream } from "./streams/SyntheticReasoningStream.js";

export class ParallelReasoningProcessor implements IParallelReasoningProcessor {
  private streams: Map<string, ReasoningStream> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize all stream types
    const analyticalStream = new AnalyticalReasoningStream();
    const creativeStream = new CreativeReasoningStream();
    const criticalStream = new CriticalReasoningStream();
    const syntheticStream = new SyntheticReasoningStream();

    // Store streams
    this.streams.set(analyticalStream.id, analyticalStream);
    this.streams.set(creativeStream.id, creativeStream);
    this.streams.set(criticalStream.id, criticalStream);
    this.streams.set(syntheticStream.id, syntheticStream);

    // Initialize all streams
    await Promise.all(
      Array.from(this.streams.values()).map((stream) => stream.initialize())
    );

    this.initialized = true;
  }

  async processParallel(
    problem: Problem,
    context?: Context
  ): Promise<ParallelReasoningResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    // Step 1: Initialize streams for this problem
    const activeStreams = await this.initializeStreams(problem);

    // Step 2: Process problem in parallel across all streams
    const streamPromises = activeStreams.map((stream) =>
      this.processStreamWithErrorHandling(stream, problem, context)
    );

    const streamResults = await Promise.all(streamPromises);

    // Step 3: Coordinate streams and handle synchronization
    const coordination = await this.coordinateStreams(activeStreams, problem);

    // Step 4: Detect and resolve conflicts
    const conflicts = this.detectConflicts(streamResults);
    const conflictResolutions = await this.resolveConflicts(conflicts);

    // Step 5: Build consensus
    const consensus = await this.buildConsensus(streamResults);

    // Step 6: Update coordination with conflict resolutions and consensus
    const finalCoordination: StreamCoordination = {
      ...coordination,
      conflict_resolutions: conflictResolutions,
      consensus_building: consensus,
    };

    // Step 7: Synthesize final result
    const processingTime = Date.now() - startTime;
    const result = this.synthesizeResults(
      streamResults,
      finalCoordination,
      problem,
      processingTime
    );

    return result;
  }

  async initializeStreams(_problem: Problem): Promise<ReasoningStream[]> {
    const activeStreams: ReasoningStream[] = [];

    // Always include all stream types for comprehensive analysis
    for (const stream of this.streams.values()) {
      // Ensure stream is initialized and active
      if (stream.getStatus().active) {
        activeStreams.push(stream);
      }
    }

    // If no streams are active, reinitialize
    if (activeStreams.length === 0) {
      await this.initialize();
      activeStreams.push(...Array.from(this.streams.values()));
    }

    return activeStreams;
  }

  async coordinateStreams(
    streams: ReasoningStream[],
    _problem: Problem
  ): Promise<StreamCoordination> {
    // Create synchronization points
    const synchronizationPoints = await this.synchronizeStreams(streams);

    // Initialize information sharing (will be populated during processing)
    const informationSharing: InformationSharing[] = [];

    // Create initial coordination structure
    return {
      synchronization_points: synchronizationPoints,
      conflict_resolutions: [], // Will be populated later
      consensus_building: {
        participating_streams: streams.map((s) => s.id),
        consensus_points: [],
        disagreement_points: [],
        final_consensus: "",
        consensus_confidence: 0,
      },
      information_sharing: informationSharing,
    };
  }

  async synchronizeStreams(
    streams: ReasoningStream[]
  ): Promise<SynchronizationPoint[]> {
    const synchronizationPoints: SynchronizationPoint[] = [];

    // Create initial synchronization point
    synchronizationPoints.push({
      timestamp: Date.now(),
      participating_streams: streams.map((s) => s.id),
      shared_insights: [
        "All streams initialized for parallel processing",
        "Problem analysis distributed across reasoning approaches",
      ],
      coordination_type: "information_exchange",
    });

    return synchronizationPoints;
  }

  detectConflicts(results: StreamResult[]): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];

    // Check for conclusion conflicts
    const conclusions = results.flatMap((r) => r.conclusions);
    const conclusionConflicts = this.findConclusionConflicts(
      results,
      conclusions
    );
    conflicts.push(...conclusionConflicts);

    // Check for confidence conflicts
    const confidenceConflicts = this.findConfidenceConflicts(results);
    conflicts.push(...confidenceConflicts);

    // Check for assumption conflicts
    const assumptionConflicts = this.findAssumptionConflicts(results);
    conflicts.push(...assumptionConflicts);

    return conflicts;
  }

  async resolveConflicts(
    conflicts: ConflictDetection[]
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution = await this.resolveIndividualConflict(conflict);
      resolutions.push(resolution);
    }

    return resolutions;
  }

  async buildConsensus(results: StreamResult[]): Promise<ConsensusBuilding> {
    const participating_streams = results.map((r) => r.stream_id);

    // Find consensus points
    const consensus_points = this.findConsensusPoints(results);

    // Find disagreement points
    const disagreement_points = this.findDisagreementPoints(results);

    // Build final consensus
    const final_consensus = this.buildFinalConsensus(results, consensus_points);

    // Calculate consensus confidence
    const consensus_confidence = this.calculateConsensusConfidence(
      results,
      consensus_points
    );

    return {
      participating_streams,
      consensus_points,
      disagreement_points,
      final_consensus,
      consensus_confidence,
    };
  }

  synthesizeResults(
    results: StreamResult[],
    coordination: StreamCoordination,
    originalProblem?: Problem,
    processingTime?: number
  ): ParallelReasoningResult {
    // Use original problem if provided, otherwise extract from results
    const problem = originalProblem ?? this.extractProblemFromResults(results);

    // Synthesize conclusion from all streams
    const synthesized_conclusion = this.synthesizeConclusion(
      results,
      coordination
    );

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(results, coordination);

    // Gather insights from all streams
    const insights = this.gatherInsights(results);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, coordination);

    // Create alternative perspectives
    const alternative_perspectives =
      this.createAlternativePerspectives(results);

    return {
      problem,
      stream_results: results,
      coordination,
      synthesized_conclusion,
      confidence,
      processing_time_ms: processingTime ?? 0,
      insights,
      recommendations,
      alternative_perspectives,
    };
  }

  reset(): void {
    // Reset all streams
    for (const stream of this.streams.values()) {
      stream.reset();
    }
  }

  private async processStreamWithErrorHandling(
    stream: ReasoningStream,
    problem: Problem,
    context?: Context
  ): Promise<StreamResult> {
    try {
      return await stream.process(problem, context);
    } catch {
      // Stream failed, return fallback result
      return {
        stream_id: stream.id,
        stream_type: stream.type,
        reasoning_steps: [],
        conclusions: [`Stream ${stream.type} encountered an error`],
        confidence: 0.1,
        processing_time_ms: 0,
        insights: [],
        evidence: [],
        assumptions: [],
      };
    }
  }

  private findConclusionConflicts(
    results: StreamResult[],
    _conclusions: string[]
  ): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];

    // Simple conflict detection: look for contradictory keywords
    const contradictoryPairs = [
      ["should", "should not"],
      ["recommend", "not recommend"],
      ["feasible", "infeasible"],
      ["possible", "impossible"],
    ];

    for (const [positive, negative] of contradictoryPairs) {
      const positiveStreams = results.filter((r) =>
        r.conclusions.some((c) => c.toLowerCase().includes(positive))
      );
      const negativeStreams = results.filter((r) =>
        r.conclusions.some((c) => c.toLowerCase().includes(negative))
      );

      if (positiveStreams.length > 0 && negativeStreams.length > 0) {
        conflicts.push({
          stream_ids: [
            ...positiveStreams.map((s) => s.stream_id),
            ...negativeStreams.map((s) => s.stream_id),
          ],
          conflict_type: "conclusion",
          description: `Contradictory conclusions regarding ${positive}/${negative}`,
          severity: 0.7,
        });
      }
    }

    return conflicts;
  }

  private findConfidenceConflicts(
    results: StreamResult[]
  ): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];

    // Check for significant confidence variations
    const confidences = results.map((r) => r.confidence);
    const maxConfidence = Math.max(...confidences);
    const minConfidence = Math.min(...confidences);

    if (maxConfidence - minConfidence > 0.5) {
      const highConfidenceStreams = results.filter((r) => r.confidence > 0.7);
      const lowConfidenceStreams = results.filter((r) => r.confidence < 0.4);

      if (highConfidenceStreams.length > 0 && lowConfidenceStreams.length > 0) {
        conflicts.push({
          stream_ids: [
            ...highConfidenceStreams.map((s) => s.stream_id),
            ...lowConfidenceStreams.map((s) => s.stream_id),
          ],
          conflict_type: "conclusion",
          description: "Significant confidence variation between streams",
          severity: 0.5,
        });
      }
    }

    return conflicts;
  }

  private findAssumptionConflicts(
    results: StreamResult[]
  ): ConflictDetection[] {
    const conflicts: ConflictDetection[] = [];

    // Check for conflicting assumptions
    const allAssumptions = results.flatMap((r) => r.assumptions);
    const assumptionCounts = allAssumptions.reduce((counts, assumption) => {
      counts[assumption] = (counts[assumption] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Look for assumptions that appear in some streams but are contradicted in others
    const contradictoryAssumptions = Object.keys(assumptionCounts).filter(
      (assumption) => {
        const negations = [`not ${assumption}`, `${assumption} is false`];
        return allAssumptions.some((a) =>
          negations.some((neg) => a.includes(neg))
        );
      }
    );

    if (contradictoryAssumptions.length > 0) {
      conflicts.push({
        stream_ids: results.map((r) => r.stream_id),
        conflict_type: "assumption",
        description: `Contradictory assumptions: ${contradictoryAssumptions
          .slice(0, 2)
          .join(", ")}`,
        severity: 0.6,
      });
    }

    return conflicts;
  }

  private async resolveIndividualConflict(
    conflict: ConflictDetection
  ): Promise<ConflictResolution> {
    let resolution_strategy: string;
    let resolved_conclusion: string;
    let confidence: number;

    switch (conflict.conflict_type) {
      case "conclusion":
        resolution_strategy = "Weighted consensus based on stream confidence";
        resolved_conclusion = "Balanced approach considering all perspectives";
        confidence = 0.6;
        break;
      case "evidence":
        resolution_strategy = "Evidence quality assessment and validation";
        resolved_conclusion = "Prioritize higher quality evidence sources";
        confidence = 0.7;
        break;
      case "assumption":
        resolution_strategy = "Assumption validation and risk assessment";
        resolved_conclusion =
          "Identify critical assumptions requiring validation";
        confidence = 0.5;
        break;
      default:
        resolution_strategy = "General conflict mediation";
        resolved_conclusion = "Seek common ground and compromise";
        confidence = 0.4;
    }

    return {
      conflicting_streams: conflict.stream_ids,
      conflict_description: conflict.description,
      resolution_strategy,
      resolved_conclusion,
      confidence,
    };
  }

  private findConsensusPoints(results: StreamResult[]): string[] {
    const consensus_points: string[] = [];

    // Find common insights
    const allInsights = results.flatMap((r) => r.insights);
    const insightCounts = allInsights.reduce((counts, insight) => {
      counts[insight] = (counts[insight] ?? 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Insights that appear in multiple streams
    const commonInsights = Object.entries(insightCounts)
      .filter(([_, count]) => count > 1)
      .map(([insight, _]) => insight);

    consensus_points.push(...commonInsights);

    // Find common conclusion themes
    const allConclusions = results.flatMap((r) => r.conclusions);
    if (
      allConclusions.some((c) => c.includes("systematic")) &&
      allConclusions.some((c) => c.includes("approach"))
    ) {
      consensus_points.push("Systematic approach is beneficial");
    }

    if (
      allConclusions.some((c) => c.includes("multiple")) &&
      allConclusions.some((c) => c.includes("perspective"))
    ) {
      consensus_points.push("Multiple perspectives add value");
    }

    return consensus_points;
  }

  private findDisagreementPoints(results: StreamResult[]): string[] {
    const disagreement_points: string[] = [];

    // Find areas where streams disagree
    const streamTypes = results.map((r) => r.stream_type);

    if (
      streamTypes.includes("analytical") &&
      streamTypes.includes("creative")
    ) {
      const analyticalConclusions =
        results.find((r) => r.stream_type === "analytical")?.conclusions ?? [];
      const creativeConclusions =
        results.find((r) => r.stream_type === "creative")?.conclusions ?? [];

      if (
        analyticalConclusions.some((c) => c.includes("systematic")) &&
        creativeConclusions.some((c) => c.includes("innovative"))
      ) {
        disagreement_points.push(
          "Balance between systematic vs. innovative approaches"
        );
      }
    }

    if (streamTypes.includes("critical") && streamTypes.includes("creative")) {
      disagreement_points.push("Risk tolerance vs. innovation appetite");
    }

    return disagreement_points;
  }

  private buildFinalConsensus(
    results: StreamResult[],
    consensus_points: string[]
  ): string {
    const streamCount = results.length;
    const consensusCount = consensus_points.length;

    if (consensusCount === 0) {
      return `${streamCount} reasoning streams provide diverse perspectives requiring integration`;
    }

    return `${streamCount} reasoning streams achieve consensus on ${consensusCount} key points: ${consensus_points
      .slice(0, 3)
      .join(
        ", "
      )}. Integration of diverse perspectives provides comprehensive solution approach.`;
  }

  private calculateConsensusConfidence(
    results: StreamResult[],
    consensus_points: string[]
  ): number {
    const avgConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const consensusBonus = Math.min(0.2, consensus_points.length * 0.05);

    return Math.min(1.0, avgConfidence + consensusBonus);
  }

  private extractProblemFromResults(_results: StreamResult[]): Problem {
    // Since all streams process the same problem, we need to reconstruct it
    // This is a simplified version - in practice, we'd store the original problem
    return {
      description: "Parallel reasoning problem analysis",
      domain: "general",
      complexity: 0.7,
      uncertainty: 0.5,
      constraints: [],
      stakeholders: [],
      time_sensitivity: 0.5,
      resource_requirements: [],
    };
  }

  private synthesizeConclusion(
    results: StreamResult[],
    coordination: StreamCoordination
  ): string {
    const allConclusions = results.flatMap((r) => r.conclusions);
    const streamTypes = results.map((r) => r.stream_type);

    const consensusPoints = coordination.consensus_building.consensus_points;
    const conflictCount = coordination.conflict_resolutions.length;

    return `Parallel reasoning across ${streamTypes.join(
      ", "
    )} streams yields ${allConclusions.length} conclusions with ${
      consensusPoints.length
    } consensus points and ${conflictCount} resolved conflicts. Integrated analysis provides comprehensive understanding with balanced perspectives.`;
  }

  private calculateOverallConfidence(
    results: StreamResult[],
    coordination: StreamCoordination
  ): number {
    // Base confidence from stream average
    const avgStreamConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    // Consensus bonus
    const consensusBonus =
      coordination.consensus_building.consensus_confidence * 0.2;

    // Conflict penalty
    const conflictPenalty = coordination.conflict_resolutions.length * 0.05;

    const confidence = avgStreamConfidence + consensusBonus - conflictPenalty;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private gatherInsights(results: StreamResult[]): string[] {
    const allInsights = results.flatMap((r) => r.insights);

    // Remove duplicates and add synthesis insights
    const uniqueInsights = [...new Set(allInsights)];

    // Add parallel processing insights
    uniqueInsights.push(
      "Parallel reasoning reveals multiple valid perspectives"
    );
    uniqueInsights.push("Stream coordination enables comprehensive analysis");

    return uniqueInsights;
  }

  private generateRecommendations(
    results: StreamResult[],
    coordination: StreamCoordination
  ): string[] {
    const recommendations: string[] = [];

    // Based on consensus
    if (coordination.consensus_building.consensus_points.length > 2) {
      recommendations.push(
        "Leverage areas of consensus for implementation foundation"
      );
    }

    // Based on conflicts
    if (coordination.conflict_resolutions.length > 0) {
      recommendations.push(
        "Address identified conflicts through stakeholder engagement"
      );
    }

    // Based on stream diversity
    const streamTypes = results.map((r) => r.stream_type);
    if (streamTypes.length > 3) {
      recommendations.push(
        "Maintain diverse perspective integration throughout implementation"
      );
    }

    // Based on confidence levels
    const avgConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    if (avgConfidence > 0.7) {
      recommendations.push("High confidence enables decisive action");
    } else {
      recommendations.push(
        "Moderate confidence suggests iterative validation approach"
      );
    }

    return recommendations;
  }

  private createAlternativePerspectives(
    results: StreamResult[]
  ): AlternativePerspective[] {
    return results.map((result) => ({
      stream_type: result.stream_type,
      perspective: result.conclusions.join("; "),
      supporting_evidence: result.evidence,
      confidence: result.confidence,
    }));
  }
}
