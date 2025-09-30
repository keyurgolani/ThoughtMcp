/**
 * Real-Time Problem Decomposer
 *
 * Provides real-time problem decomposition with multiple strategies,
 * hierarchical problem structure representation, priority analysis,
 * dependency mapping, and critical path identification.
 */

import {
  PriorityItem,
  Problem,
  ProblemDependency,
} from "../interfaces/systematic-thinking.js";
import { Context } from "../types/core.js";

export interface DecompositionStrategy {
  name: string;
  description: string;
  apply(problem: Problem, context?: Context): Promise<Problem[]>;
  getApplicabilityScore(problem: Problem): number;
}

export interface HierarchicalProblemNode {
  id: string;
  problem: Problem;
  parent_id?: string;
  children_ids: string[];
  level: number;
  priority_score: number;
  critical_path_member: boolean;
}

export interface DecompositionResult {
  original_problem: Problem;
  hierarchical_structure: HierarchicalProblemNode[];
  dependencies: ProblemDependency[];
  critical_path: string[];
  priority_ranking: PriorityItem[];
  decomposition_strategies_used: string[];
  processing_time_ms: number;
  confidence: number;
}

export class RealTimeProblemDecomposer {
  private strategies: Map<string, DecompositionStrategy>;
  private initialized: boolean = false;

  constructor() {
    this.strategies = new Map();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize decomposition strategies
    this.strategies.set("functional", new FunctionalDecompositionStrategy());
    this.strategies.set("temporal", new TemporalDecompositionStrategy());
    this.strategies.set("stakeholder", new StakeholderDecompositionStrategy());
    this.strategies.set("component", new ComponentDecompositionStrategy());
    this.strategies.set("risk", new RiskBasedDecompositionStrategy());
    this.strategies.set("resource", new ResourceBasedDecompositionStrategy());
    this.strategies.set(
      "complexity",
      new ComplexityBasedDecompositionStrategy()
    );

    this.initialized = true;
  }

  async decomposeRealTime(
    problem: Problem,
    context?: Context
  ): Promise<DecompositionResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      await this.initialize();
    }

    // Ensure minimum processing time for measurement accuracy
    await new Promise((resolve) => setTimeout(resolve, 1));

    // Step 1: Select optimal decomposition strategies
    const selectedStrategies = this.selectOptimalStrategies(problem);

    // Step 2: Apply strategies in parallel for real-time performance
    const decompositionResults = await Promise.all(
      selectedStrategies.map(async (strategy) => ({
        strategy: strategy.name,
        problems: await strategy.apply(problem, context),
      }))
    );

    // Step 3: Merge and deduplicate results
    const allSubProblems =
      this.mergeAndDeduplicateProblems(decompositionResults);

    // Step 4: Build hierarchical structure
    const hierarchicalStructure = this.buildHierarchicalStructure(
      problem,
      allSubProblems
    );

    // Step 5: Identify dependencies in real-time
    const dependencies = await this.identifyDependenciesRealTime(
      hierarchicalStructure
    );

    // Step 6: Calculate critical path
    const criticalPath = this.calculateCriticalPathRealTime(
      hierarchicalStructure,
      dependencies
    );

    // Step 7: Perform priority analysis
    const priorityRanking = this.performPriorityAnalysis(
      hierarchicalStructure,
      dependencies,
      criticalPath
    );

    // Step 8: Update critical path membership
    this.updateCriticalPathMembership(hierarchicalStructure, criticalPath);

    const processingTime = Date.now() - startTime;

    return {
      original_problem: problem,
      hierarchical_structure: hierarchicalStructure,
      dependencies,
      critical_path: criticalPath,
      priority_ranking: priorityRanking,
      decomposition_strategies_used: selectedStrategies.map((s) => s.name),
      processing_time_ms: processingTime,
      confidence: this.calculateDecompositionConfidence(
        hierarchicalStructure,
        dependencies,
        processingTime
      ),
    };
  }

  private selectOptimalStrategies(problem: Problem): DecompositionStrategy[] {
    const strategies: Array<{
      strategy: DecompositionStrategy;
      score: number;
    }> = [];

    for (const strategy of this.strategies.values()) {
      const score = strategy.getApplicabilityScore(problem);
      if (score > 0.3) {
        // Only use strategies with reasonable applicability
        strategies.push({ strategy, score });
      }
    }

    // Sort by score and select top 3-4 strategies for optimal performance
    return strategies
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.strategy);
  }

  private mergeAndDeduplicateProblems(
    decompositionResults: Array<{ strategy: string; problems: Problem[] }>
  ): Problem[] {
    const allProblems: Problem[] = [];
    const seenDescriptions = new Set<string>();

    for (const result of decompositionResults) {
      for (const problem of result.problems) {
        const normalizedDesc = this.normalizeDescription(problem.description);
        if (!seenDescriptions.has(normalizedDesc)) {
          seenDescriptions.add(normalizedDesc);
          allProblems.push(problem);
        }
      }
    }

    return allProblems;
  }

  private normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private buildHierarchicalStructure(
    rootProblem: Problem,
    subProblems: Problem[]
  ): HierarchicalProblemNode[] {
    const nodes: HierarchicalProblemNode[] = [];

    // Create root node
    const rootId = this.generateProblemId(rootProblem);
    const rootNode: HierarchicalProblemNode = {
      id: rootId,
      problem: rootProblem,
      children_ids: [],
      level: 0,
      priority_score: 0, // Will be calculated later
      critical_path_member: false,
    };
    nodes.push(rootNode);

    // Create sub-problem nodes and establish parent-child relationships
    for (const subProblem of subProblems) {
      const subId = this.generateProblemId(subProblem);
      const subNode: HierarchicalProblemNode = {
        id: subId,
        problem: subProblem,
        parent_id: rootId,
        children_ids: [],
        level: 1,
        priority_score: 0, // Will be calculated later
        critical_path_member: false,
      };
      nodes.push(subNode);
      rootNode.children_ids.push(subId);
    }

    // Identify potential sub-sub-problems and create deeper hierarchy
    this.buildDeeperHierarchy(nodes, subProblems);

    return nodes;
  }

  private buildDeeperHierarchy(
    nodes: HierarchicalProblemNode[],
    problems: Problem[]
  ): void {
    // Look for problems that could be sub-problems of other sub-problems
    const level1Nodes = nodes.filter((n) => n.level === 1);

    for (const parentNode of level1Nodes) {
      for (const problem of problems) {
        const problemId = this.generateProblemId(problem);

        // Skip if this problem is already in the hierarchy
        if (nodes.some((n) => n.id === problemId)) {
          continue;
        }

        // Check if this problem could be a child of the parent node
        if (this.isSubProblemOf(problem, parentNode.problem)) {
          const childId = this.generateProblemId(problem);
          const childNode: HierarchicalProblemNode = {
            id: childId,
            problem,
            parent_id: parentNode.id,
            children_ids: [],
            level: 2,
            priority_score: 0,
            critical_path_member: false,
          };
          nodes.push(childNode);
          parentNode.children_ids.push(childId);
        }
      }
    }
  }

  private isSubProblemOf(candidate: Problem, parent: Problem): boolean {
    const candidateDesc = candidate.description.toLowerCase();
    const parentDesc = parent.description.toLowerCase();

    // Check if candidate description contains key terms from parent
    const parentKeywords = parentDesc
      .split(/\s+/)
      .filter((word) => word.length > 3);
    const matchingKeywords = parentKeywords.filter((keyword) =>
      candidateDesc.includes(keyword)
    );

    // Also check domain and complexity relationship
    const sameOrRelatedDomain = candidate.domain === parent.domain;
    const lowerComplexity = candidate.complexity <= parent.complexity;

    return (
      matchingKeywords.length >= 2 && sameOrRelatedDomain && lowerComplexity
    );
  }

  private async identifyDependenciesRealTime(
    nodes: HierarchicalProblemNode[]
  ): Promise<ProblemDependency[]> {
    const dependencies: ProblemDependency[] = [];

    // Use parallel processing for dependency identification
    const dependencyPromises: Promise<ProblemDependency | null>[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i !== j) {
          dependencyPromises.push(
            this.analyzeDependencyRealTime(nodes[i], nodes[j])
          );
        }
      }
    }

    const results = await Promise.all(dependencyPromises);

    for (const dependency of results) {
      if (dependency) {
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  private async analyzeDependencyRealTime(
    node1: HierarchicalProblemNode,
    node2: HierarchicalProblemNode
  ): Promise<ProblemDependency | null> {
    const problem1 = node1.problem;
    const problem2 = node2.problem;

    // Quick dependency analysis optimized for real-time performance
    const dependencyType = this.identifyDependencyType(problem1, problem2);

    if (dependencyType) {
      return {
        from: node1.id,
        to: node2.id,
        type: dependencyType.type,
        strength: dependencyType.strength,
      };
    }

    return null;
  }

  private identifyDependencyType(
    problem1: Problem,
    problem2: Problem
  ): { type: ProblemDependency["type"]; strength: number } | null {
    const desc1 = problem1.description.toLowerCase();
    const desc2 = problem2.description.toLowerCase();

    // Prerequisite patterns (optimized for speed)
    const prerequisitePatterns = [
      { pattern: /plan.*implement/, strength: 0.9 },
      { pattern: /design.*build/, strength: 0.8 },
      { pattern: /research.*develop/, strength: 0.7 },
      { pattern: /analyze.*solve/, strength: 0.8 },
    ];

    for (const { pattern, strength } of prerequisitePatterns) {
      if (pattern.test(`${desc1} ${desc2}`)) {
        return { type: "prerequisite", strength };
      }
    }

    // Resource dependencies
    const sharedResources = problem1.resource_requirements.filter((r) =>
      problem2.resource_requirements.includes(r)
    );
    if (sharedResources.length > 0) {
      return {
        type: "resource",
        strength: Math.min(0.8, sharedResources.length * 0.3),
      };
    }

    // Constraint dependencies
    const sharedConstraints = problem1.constraints.filter((c) =>
      problem2.constraints.includes(c)
    );
    if (sharedConstraints.length > 0) {
      return {
        type: "constraint",
        strength: Math.min(0.7, sharedConstraints.length * 0.25),
      };
    }

    // Temporal dependencies
    if (
      problem1.time_sensitivity > 0.7 &&
      problem2.time_sensitivity > 0.7 &&
      problem1.domain === problem2.domain
    ) {
      return { type: "temporal", strength: 0.6 };
    }

    return null;
  }

  private calculateCriticalPathRealTime(
    nodes: HierarchicalProblemNode[],
    dependencies: ProblemDependency[]
  ): string[] {
    // If no dependencies, return a simple path through high-priority nodes
    if (dependencies.length === 0) {
      // Sort nodes by priority and time sensitivity, return top nodes as critical path
      const sortedNodes = [...nodes].sort((a, b) => {
        const priorityA =
          a.problem.time_sensitivity * 0.6 + a.problem.complexity * 0.4;
        const priorityB =
          b.problem.time_sensitivity * 0.6 + b.problem.complexity * 0.4;
        return priorityB - priorityA;
      });

      // Return top 3 nodes or all nodes if less than 3
      return sortedNodes
        .slice(0, Math.min(3, sortedNodes.length))
        .map((n) => n.id);
    }

    // Optimized critical path calculation using topological sort
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
    }

    // Build adjacency list and calculate in-degrees
    for (const dep of dependencies) {
      adjList.get(dep.from)?.push(dep.to);
      inDegree.set(dep.to, (inDegree.get(dep.to) || 0) + 1);
    }

    // Find nodes with no incoming edges (starting points)
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const criticalPath: string[] = [];

    // Process nodes in topological order
    while (queue.length > 0) {
      const current = queue.shift()!;
      criticalPath.push(current);

      // Process neighbors
      const neighbors = adjList.get(current) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          queue.push(neighbor);
        }
      }
    }

    // If critical path is empty or too short, ensure we have at least the root node
    if (criticalPath.length === 0) {
      const rootNode = nodes.find((n) => n.level === 0);
      if (rootNode) {
        criticalPath.push(rootNode.id);
      }
    }

    return criticalPath;
  }

  private performPriorityAnalysis(
    nodes: HierarchicalProblemNode[],
    dependencies: ProblemDependency[],
    criticalPath: string[]
  ): PriorityItem[] {
    const priorities: PriorityItem[] = [];

    for (const node of nodes) {
      const priorityScore = this.calculateNodePriority(
        node,
        dependencies,
        criticalPath
      );

      node.priority_score = priorityScore; // Update node with calculated priority

      priorities.push({
        problem_id: node.id,
        priority_score: priorityScore,
        reasoning: this.generatePriorityReasoning(
          node,
          dependencies,
          criticalPath
        ),
      });
    }

    return priorities.sort((a, b) => b.priority_score - a.priority_score);
  }

  private calculateNodePriority(
    node: HierarchicalProblemNode,
    dependencies: ProblemDependency[],
    criticalPath: string[]
  ): number {
    let score = 0.3; // Base score

    const problem = node.problem;

    // Factor in problem characteristics
    score += problem.complexity * 0.2;
    score += problem.time_sensitivity * 0.25;
    score += problem.uncertainty * 0.15;

    // Factor in hierarchical level (higher level = higher priority)
    score += (3 - node.level) * 0.1;

    // Factor in dependency count
    const dependencyCount = dependencies.filter(
      (dep) => dep.from === node.id || dep.to === node.id
    ).length;
    score += Math.min(dependencyCount * 0.05, 0.2);

    // Critical path bonus
    if (criticalPath.includes(node.id)) {
      score += 0.3;
    }

    // Stakeholder count factor
    score += Math.min(problem.stakeholders.length * 0.03, 0.15);

    return Math.min(score, 1.0);
  }

  private generatePriorityReasoning(
    node: HierarchicalProblemNode,
    dependencies: ProblemDependency[],
    criticalPath: string[]
  ): string {
    const reasons: string[] = [];
    const problem = node.problem;

    reasons.push(`Priority: ${(node.priority_score * 100).toFixed(0)}%`);

    if (criticalPath.includes(node.id)) {
      reasons.push("On critical path");
    }

    if (problem.time_sensitivity > 0.7) {
      reasons.push("Time-sensitive");
    }

    if (problem.complexity > 0.7) {
      reasons.push("High complexity");
    }

    if (node.level === 0) {
      reasons.push("Root problem");
    }

    const dependencyCount = dependencies.filter(
      (dep) => dep.from === node.id || dep.to === node.id
    ).length;
    if (dependencyCount > 2) {
      reasons.push(`${dependencyCount} dependencies`);
    }

    return reasons.join(", ");
  }

  private updateCriticalPathMembership(
    nodes: HierarchicalProblemNode[],
    criticalPath: string[]
  ): void {
    for (const node of nodes) {
      node.critical_path_member = criticalPath.includes(node.id);
    }
  }

  private calculateDecompositionConfidence(
    nodes: HierarchicalProblemNode[],
    dependencies: ProblemDependency[],
    processingTime: number
  ): number {
    let confidence = 0.7; // Base confidence

    // Factor in number of nodes (more nodes = more thorough decomposition)
    const nodeCount = nodes.length;
    if (nodeCount > 3) confidence += 0.1;
    if (nodeCount > 6) confidence += 0.1;

    // Factor in dependency identification
    const avgDependencyStrength =
      dependencies.length > 0
        ? dependencies.reduce((sum, dep) => sum + dep.strength, 0) /
          dependencies.length
        : 0;
    confidence += avgDependencyStrength * 0.1;

    // Factor in processing time (faster = higher confidence in real-time context)
    if (processingTime < 1000) confidence += 0.1; // Under 1 second
    if (processingTime < 500) confidence += 0.1; // Under 0.5 seconds

    // Factor in problem characteristics - simpler problems should have higher confidence
    if (nodes.length > 0) {
      const rootNode = nodes.find((n) => n.level === 0);
      if (rootNode) {
        const problem = rootNode.problem;
        // Lower complexity and uncertainty = higher confidence
        confidence += (1 - problem.complexity) * 0.1;
        confidence += (1 - problem.uncertainty) * 0.1;

        // Fewer constraints = higher confidence
        if (problem.constraints.length <= 2) confidence += 0.05;
      }
    }

    return Math.min(confidence, 1.0);
  }

  private generateProblemId(problem: Problem): string {
    // Generate a consistent ID from problem description
    const hash = problem.description
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 16);
    return `prob_${hash}_${Date.now().toString(36)}`;
  }

  // Public method to get available strategies
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  // Public method to get strategy details
  getStrategyDetails(strategyName: string): DecompositionStrategy | undefined {
    return this.strategies.get(strategyName);
  }
}

// Decomposition Strategy Implementations

class FunctionalDecompositionStrategy implements DecompositionStrategy {
  name = "functional";
  description =
    "Decomposes problems by functional requirements and capabilities";

  async apply(problem: Problem, _context?: Context): Promise<Problem[]> {
    const subProblems: Problem[] = [];
    const description = problem.description.toLowerCase();

    const functionalKeywords = [
      "authentication",
      "authorization",
      "validation",
      "processing",
      "storage",
      "retrieval",
      "analysis",
      "reporting",
      "monitoring",
      "logging",
      "caching",
      "optimization",
      "integration",
      "communication",
    ];

    for (const keyword of functionalKeywords) {
      if (description.includes(keyword)) {
        subProblems.push({
          description: `Implement ${keyword} functionality for ${problem.description}`,
          domain: problem.domain,
          complexity: problem.complexity * 0.6,
          uncertainty: problem.uncertainty * 0.8,
          constraints: problem.constraints,
          stakeholders: problem.stakeholders,
          time_sensitivity: problem.time_sensitivity,
          resource_requirements: problem.resource_requirements,
        });
      }
    }

    return subProblems;
  }

  getApplicabilityScore(problem: Problem): number {
    const description = problem.description.toLowerCase();
    const functionalIndicators = [
      /function|feature|capability|requirement/i,
      /implement|develop|build|create/i,
      /system|application|platform|service/i,
    ];

    let score = 0.3;
    for (const indicator of functionalIndicators) {
      if (indicator.test(description)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }
}

class TemporalDecompositionStrategy implements DecompositionStrategy {
  name = "temporal";
  description = "Decomposes problems by time phases and milestones";

  async apply(problem: Problem, _context?: Context): Promise<Problem[]> {
    const phases = [
      { name: "immediate", factor: 0.3, urgency: 1.0 },
      { name: "short-term", factor: 0.6, urgency: 0.7 },
      { name: "medium-term", factor: 0.8, urgency: 0.5 },
      { name: "long-term", factor: 1.0, urgency: 0.3 },
    ];

    return phases.map((phase) => ({
      description: `${
        phase.name.charAt(0).toUpperCase() + phase.name.slice(1)
      } phase: ${problem.description}`,
      domain: problem.domain,
      complexity: problem.complexity * phase.factor,
      uncertainty: problem.uncertainty * (phase.factor + 0.2),
      constraints: problem.constraints,
      stakeholders: problem.stakeholders,
      time_sensitivity: phase.urgency,
      resource_requirements: problem.resource_requirements,
    }));
  }

  getApplicabilityScore(problem: Problem): number {
    let score = 0.4; // Base score for temporal applicability

    if (problem.time_sensitivity > 0.5) score += 0.3;
    if (problem.description.toLowerCase().includes("phase")) score += 0.2;
    if (problem.description.toLowerCase().includes("timeline")) score += 0.2;

    return Math.min(score, 1.0);
  }
}

class StakeholderDecompositionStrategy implements DecompositionStrategy {
  name = "stakeholder";
  description = "Decomposes problems by stakeholder needs and perspectives";

  async apply(problem: Problem, _context?: Context): Promise<Problem[]> {
    return problem.stakeholders.map((stakeholder) => ({
      description: `Address ${stakeholder} needs for ${problem.description}`,
      domain: problem.domain,
      complexity: problem.complexity * 0.5,
      uncertainty: problem.uncertainty * 0.7,
      constraints: problem.constraints,
      stakeholders: [stakeholder],
      time_sensitivity: problem.time_sensitivity,
      resource_requirements: problem.resource_requirements,
    }));
  }

  getApplicabilityScore(problem: Problem): number {
    let score = 0.2;

    score += problem.stakeholders.length * 0.15;
    if (problem.description.toLowerCase().includes("user")) score += 0.2;
    if (problem.description.toLowerCase().includes("stakeholder")) score += 0.3;

    return Math.min(score, 1.0);
  }
}

class ComponentDecompositionStrategy implements DecompositionStrategy {
  name = "component";
  description = "Decomposes problems by system components and modules";

  async apply(problem: Problem, _context?: Context): Promise<Problem[]> {
    const subProblems: Problem[] = [];
    const description = problem.description.toLowerCase();

    const componentPatterns = [
      { pattern: /frontend|ui|interface/, name: "Frontend" },
      { pattern: /backend|server|api/, name: "Backend" },
      { pattern: /database|storage|data/, name: "Data Layer" },
      { pattern: /security|auth/, name: "Security" },
      { pattern: /performance|optimization/, name: "Performance" },
      { pattern: /testing|quality/, name: "Quality Assurance" },
    ];

    for (const { pattern, name } of componentPatterns) {
      if (pattern.test(description)) {
        subProblems.push({
          description: `${name} component for ${problem.description}`,
          domain: problem.domain,
          complexity: problem.complexity * 0.7,
          uncertainty: problem.uncertainty * 0.8,
          constraints: problem.constraints,
          stakeholders: problem.stakeholders,
          time_sensitivity: problem.time_sensitivity,
          resource_requirements: problem.resource_requirements,
        });
      }
    }

    return subProblems;
  }

  getApplicabilityScore(problem: Problem): number {
    const description = problem.description.toLowerCase();
    const componentIndicators = [
      /component|module|service|layer/i,
      /architecture|system|platform/i,
      /frontend|backend|database/i,
    ];

    let score = 0.3;
    for (const indicator of componentIndicators) {
      if (indicator.test(description)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }
}

class RiskBasedDecompositionStrategy implements DecompositionStrategy {
  name = "risk";
  description = "Decomposes problems by risk factors and mitigation strategies";

  async apply(problem: Problem, _context?: Context): Promise<Problem[]> {
    const riskFactors = [
      "technical_risk",
      "timeline_risk",
      "resource_risk",
      "quality_risk",
      "integration_risk",
      "user_acceptance_risk",
    ];

    return riskFactors.map((risk) => ({
      description: `Mitigate ${risk.replace("_", " ")} for ${
        problem.description
      }`,
      domain: problem.domain,
      complexity: problem.complexity * 0.6,
      uncertainty: problem.uncertainty * 1.2, // Risk increases uncertainty
      constraints: [...problem.constraints, "risk_mitigation"],
      stakeholders: problem.stakeholders,
      time_sensitivity: problem.time_sensitivity * 1.1,
      resource_requirements: [
        ...problem.resource_requirements,
        "risk_analysis",
      ],
    }));
  }

  getApplicabilityScore(problem: Problem): number {
    let score = 0.2;

    if (problem.uncertainty > 0.6) score += 0.3;
    if (problem.complexity > 0.7) score += 0.2;
    if (problem.description.toLowerCase().includes("risk")) score += 0.4;

    return Math.min(score, 1.0);
  }
}

class ResourceBasedDecompositionStrategy implements DecompositionStrategy {
  name = "resource";
  description = "Decomposes problems by resource requirements and constraints";

  async apply(problem: Problem, _context?: Context): Promise<Problem[]> {
    return problem.resource_requirements.map((resource) => ({
      description: `Manage ${resource} for ${problem.description}`,
      domain: problem.domain,
      complexity: problem.complexity * 0.5,
      uncertainty: problem.uncertainty * 0.9,
      constraints: problem.constraints,
      stakeholders: problem.stakeholders,
      time_sensitivity: problem.time_sensitivity,
      resource_requirements: [resource],
    }));
  }

  getApplicabilityScore(problem: Problem): number {
    let score = 0.1;

    score += problem.resource_requirements.length * 0.15;
    if (problem.constraints.includes("resource_constraint")) score += 0.3;

    return Math.min(score, 1.0);
  }
}

class ComplexityBasedDecompositionStrategy implements DecompositionStrategy {
  name = "complexity";
  description = "Decomposes problems by complexity levels and simplification";

  async apply(problem: Problem, _context?: Context): Promise<Problem[]> {
    if (problem.complexity < 0.5) {
      return []; // Not applicable for simple problems
    }

    const complexityLevels = [
      { name: "core", factor: 0.4 },
      { name: "extended", factor: 0.7 },
      { name: "advanced", factor: 1.0 },
    ];

    return complexityLevels.map((level) => ({
      description: `${
        level.name.charAt(0).toUpperCase() + level.name.slice(1)
      } complexity level for ${problem.description}`,
      domain: problem.domain,
      complexity: problem.complexity * level.factor,
      uncertainty: problem.uncertainty * level.factor,
      constraints: problem.constraints,
      stakeholders: problem.stakeholders,
      time_sensitivity: problem.time_sensitivity,
      resource_requirements: problem.resource_requirements,
    }));
  }

  getApplicabilityScore(problem: Problem): number {
    let score = 0.1;

    if (problem.complexity > 0.5) score += 0.3;
    if (problem.complexity > 0.8) score += 0.4;

    return Math.min(score, 1.0);
  }
}
