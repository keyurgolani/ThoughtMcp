/**
 * Problem Analyzer
 *
 * Analyzes problem structure, decomposes complex problems,
 * and identifies dependencies and priorities.
 */

import {
  IProblemAnalyzer,
  PriorityItem,
  Problem,
  ProblemDependency,
  ProblemStructure,
} from "../interfaces/systematic-thinking.js";

export class ProblemAnalyzer implements IProblemAnalyzer {
  async initialize(): Promise<void> {
    // Problem analyzer is ready to use immediately
  }

  async analyzeStructure(problem: Problem): Promise<ProblemStructure> {
    // Decompose the main problem into sub-problems
    const subProblems = await this.decomposeProblem(problem);

    // Identify dependencies between problems
    const dependencies = await this.identifyDependencies([
      problem,
      ...subProblems,
    ]);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(
      [problem, ...subProblems],
      dependencies
    );

    // Calculate priorities
    const priorities = await this.calculatePriorities(
      [problem, ...subProblems],
      dependencies
    );

    return {
      main_problem: problem,
      sub_problems: subProblems,
      dependencies,
      critical_path: criticalPath,
      priority_ranking: priorities,
    };
  }

  async decomposeProblem(problem: Problem): Promise<Problem[]> {
    const subProblems: Problem[] = [];

    // Identify decomposition patterns
    const decompositionStrategies = [
      this.decomposeByProcess(problem),
      this.decomposeByComponent(problem),
      this.decomposeByStakeholder(problem),
      this.decomposeByTimePhase(problem),
    ];

    // Apply each strategy and collect unique sub-problems
    for (const strategy of decompositionStrategies) {
      const strategyProblems = await strategy;
      for (const subProblem of strategyProblems) {
        // Avoid duplicates by checking description similarity
        if (!this.isDuplicateProblem(subProblem, subProblems)) {
          subProblems.push(subProblem);
        }
      }
    }

    // Limit to most relevant sub-problems (max 8)
    return subProblems.sort((a, b) => b.complexity - a.complexity).slice(0, 8);
  }

  async identifyDependencies(
    problems: Problem[]
  ): Promise<ProblemDependency[]> {
    const dependencies: ProblemDependency[] = [];

    for (let i = 0; i < problems.length; i++) {
      for (let j = 0; j < problems.length; j++) {
        if (i !== j) {
          const dependency = this.analyzeDependency(problems[i], problems[j]);
          if (dependency) {
            dependencies.push(dependency);
          }
        }
      }
    }

    return dependencies;
  }

  async calculatePriorities(
    problems: Problem[],
    dependencies: ProblemDependency[]
  ): Promise<PriorityItem[]> {
    const priorities: PriorityItem[] = [];

    for (const problem of problems) {
      const priorityScore = this.calculatePriorityScore(problem, dependencies);
      const reasoning = this.generatePriorityReasoning(problem, priorityScore);

      priorities.push({
        problem_id: this.generateProblemId(problem),
        priority_score: priorityScore,
        reasoning,
      });
    }

    return priorities.sort((a, b) => b.priority_score - a.priority_score);
  }

  private async decomposeByProcess(problem: Problem): Promise<Problem[]> {
    const subProblems: Problem[] = [];
    const description = problem.description.toLowerCase();

    // Look for process indicators
    const processKeywords = [
      "plan",
      "design",
      "implement",
      "test",
      "deploy",
      "analyze",
      "develop",
      "create",
      "build",
      "execute",
      "research",
      "prototype",
      "validate",
      "optimize",
    ];

    for (const keyword of processKeywords) {
      if (description.includes(keyword)) {
        subProblems.push({
          description: `${
            keyword.charAt(0).toUpperCase() + keyword.slice(1)
          } phase of ${problem.description}`,
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

  private async decomposeByComponent(problem: Problem): Promise<Problem[]> {
    const subProblems: Problem[] = [];
    const description = problem.description.toLowerCase();

    // Look for component indicators
    const componentPatterns = [
      /frontend|ui|interface|user experience/i,
      /backend|server|database|api/i,
      /security|authentication|authorization/i,
      /performance|optimization|scalability/i,
      /testing|quality|validation/i,
      /documentation|training|support/i,
    ];

    for (const pattern of componentPatterns) {
      if (pattern.test(description)) {
        const match = description.match(pattern);
        if (match) {
          subProblems.push({
            description: `${match[0]} component of ${problem.description}`,
            domain: problem.domain,
            complexity: problem.complexity * 0.7,
            uncertainty: problem.uncertainty * 0.9,
            constraints: problem.constraints,
            stakeholders: problem.stakeholders,
            time_sensitivity: problem.time_sensitivity,
            resource_requirements: problem.resource_requirements,
          });
        }
      }
    }

    return subProblems;
  }

  private async decomposeByStakeholder(problem: Problem): Promise<Problem[]> {
    const subProblems: Problem[] = [];

    // Create stakeholder-specific sub-problems
    for (const stakeholder of problem.stakeholders) {
      subProblems.push({
        description: `Address ${stakeholder} requirements for ${problem.description}`,
        domain: problem.domain,
        complexity: problem.complexity * 0.5,
        uncertainty: problem.uncertainty * 0.7,
        constraints: problem.constraints,
        stakeholders: [stakeholder],
        time_sensitivity: problem.time_sensitivity,
        resource_requirements: problem.resource_requirements,
      });
    }

    return subProblems;
  }

  private async decomposeByTimePhase(problem: Problem): Promise<Problem[]> {
    const subProblems: Problem[] = [];

    // Create time-based phases
    const phases = ["immediate", "short-term", "long-term"];

    for (const phase of phases) {
      subProblems.push({
        description: `${
          phase.charAt(0).toUpperCase() + phase.slice(1)
        } solution for ${problem.description}`,
        domain: problem.domain,
        complexity:
          problem.complexity *
          (phase === "immediate" ? 0.4 : phase === "short-term" ? 0.7 : 1.0),
        uncertainty:
          problem.uncertainty *
          (phase === "immediate" ? 0.5 : phase === "short-term" ? 0.8 : 1.2),
        constraints: problem.constraints,
        stakeholders: problem.stakeholders,
        time_sensitivity:
          phase === "immediate" ? 1.0 : phase === "short-term" ? 0.7 : 0.3,
        resource_requirements: problem.resource_requirements,
      });
    }

    return subProblems;
  }

  private isDuplicateProblem(
    problem: Problem,
    existingProblems: Problem[]
  ): boolean {
    const threshold = 0.95; // Similarity threshold - increased to allow more variation

    for (const existing of existingProblems) {
      const similarity = this.calculateDescriptionSimilarity(
        problem.description,
        existing.description
      );
      if (similarity > threshold) {
        return true;
      }
    }

    return false;
  }

  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    // Simple word-based similarity calculation
    const words1 = desc1.toLowerCase().split(/\s+/);
    const words2 = desc2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = new Set([...words1, ...words2]).size;

    return commonWords.length / totalWords;
  }

  private analyzeDependency(
    problem1: Problem,
    problem2: Problem
  ): ProblemDependency | null {
    const desc1 = problem1.description.toLowerCase();
    const desc2 = problem2.description.toLowerCase();

    // Check for prerequisite relationships
    if (this.isPrerequisite(desc1, desc2)) {
      return {
        from: this.generateProblemId(problem1),
        to: this.generateProblemId(problem2),
        type: "prerequisite",
        strength: 0.8,
      };
    }

    // Check for constraint relationships
    if (this.isConstraint(problem1, problem2)) {
      return {
        from: this.generateProblemId(problem1),
        to: this.generateProblemId(problem2),
        type: "constraint",
        strength: 0.6,
      };
    }

    // Check for resource dependencies
    if (this.hasResourceDependency(problem1, problem2)) {
      return {
        from: this.generateProblemId(problem1),
        to: this.generateProblemId(problem2),
        type: "resource",
        strength: 0.7,
      };
    }

    // Check for temporal dependencies
    if (this.hasTemporalDependency(problem1, problem2)) {
      return {
        from: this.generateProblemId(problem1),
        to: this.generateProblemId(problem2),
        type: "temporal",
        strength: 0.5,
      };
    }

    return null;
  }

  private isPrerequisite(desc1: string, desc2: string): boolean {
    const prerequisitePatterns = [
      /plan.*implement/i,
      /design.*build/i,
      /research.*develop/i,
      /analyze.*solve/i,
    ];

    return prerequisitePatterns.some((pattern) => {
      const match = `${desc1} ${desc2}`.match(pattern);
      return match !== null;
    });
  }

  private isConstraint(problem1: Problem, problem2: Problem): boolean {
    // Check if problems share constraints
    const sharedConstraints = problem1.constraints.filter((c) =>
      problem2.constraints.includes(c)
    );

    return sharedConstraints.length > 0;
  }

  private hasResourceDependency(problem1: Problem, problem2: Problem): boolean {
    // Check if problems share resource requirements
    const sharedResources = problem1.resource_requirements.filter((r) =>
      problem2.resource_requirements.includes(r)
    );

    return sharedResources.length > 0;
  }

  private hasTemporalDependency(problem1: Problem, problem2: Problem): boolean {
    // Check if one problem is time-sensitive and affects the other
    return (
      problem1.time_sensitivity > 0.7 &&
      problem2.time_sensitivity > 0.7 &&
      problem1.domain === problem2.domain
    );
  }

  private calculateCriticalPath(
    problems: Problem[],
    dependencies: ProblemDependency[]
  ): string[] {
    // Simple critical path calculation
    // In a full implementation, this would use proper critical path method (CPM)

    const problemIds = problems.map((p) => this.generateProblemId(p));
    const criticalPath: string[] = [];

    // Find problems with no dependencies (starting points)
    const noDependencies = problemIds.filter(
      (id) => !dependencies.some((dep) => dep.to === id)
    );

    // Build path from starting points
    for (const startId of noDependencies) {
      criticalPath.push(startId);
      this.buildPathRecursive(startId, dependencies, criticalPath);
    }

    return criticalPath;
  }

  private buildPathRecursive(
    currentId: string,
    dependencies: ProblemDependency[],
    path: string[]
  ): void {
    const nextDependencies = dependencies.filter(
      (dep) => dep.from === currentId
    );

    for (const dep of nextDependencies) {
      if (!path.includes(dep.to)) {
        path.push(dep.to);
        this.buildPathRecursive(dep.to, dependencies, path);
      }
    }
  }

  private calculatePriorityScore(
    problem: Problem,
    dependencies: ProblemDependency[]
  ): number {
    let score = 0.5; // Base score

    // Factor in complexity
    score += problem.complexity * 0.2;

    // Factor in time sensitivity
    score += problem.time_sensitivity * 0.3;

    // Factor in number of stakeholders
    score += (problem.stakeholders.length / 10) * 0.1;

    // Factor in dependency count (problems with more dependencies are higher priority)
    const dependencyCount = dependencies.filter(
      (dep) =>
        dep.from === this.generateProblemId(problem) ||
        dep.to === this.generateProblemId(problem)
    ).length;
    score += (dependencyCount / 10) * 0.2;

    // Factor in uncertainty (higher uncertainty = higher priority to resolve)
    score += problem.uncertainty * 0.2;

    return Math.min(score, 1.0);
  }

  private generatePriorityReasoning(problem: Problem, score: number): string {
    const reasons: string[] = [];

    reasons.push(`Priority score: ${(score * 100).toFixed(0)}%`);

    if (problem.complexity > 0.7) {
      reasons.push("High complexity requires early attention");
    }

    if (problem.time_sensitivity > 0.7) {
      reasons.push("Time-sensitive problem needs immediate focus");
    }

    if (problem.stakeholders.length > 2) {
      reasons.push("Multiple stakeholders involved");
    }

    if (problem.uncertainty > 0.7) {
      reasons.push("High uncertainty needs resolution");
    }

    return reasons.join(". ");
  }

  private generateProblemId(problem: Problem): string {
    // Generate a simple hash-like ID from the problem description
    const hash = problem.description
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20);

    return `problem_${hash}`;
  }
}
