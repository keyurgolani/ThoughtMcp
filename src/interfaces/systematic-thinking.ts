/**
 * Interfaces for systematic thinking framework
 */

import { Context } from "../types/core.js";

// Core systematic thinking types
export type ThinkingFrameworkType =
  | "scientific_method"
  | "design_thinking"
  | "systems_thinking"
  | "critical_thinking"
  | "creative_problem_solving"
  | "root_cause_analysis"
  | "first_principles"
  | "scenario_planning";

export type SystematicThinkingMode = "auto" | "hybrid" | "manual";

export interface Problem {
  description: string;
  domain: string;
  complexity: number; // 0-1 scale
  uncertainty: number; // 0-1 scale
  constraints: string[];
  stakeholders: string[];
  time_sensitivity: number; // 0-1 scale
  resource_requirements: string[];
}

export interface ProblemCharacteristics {
  is_well_defined: boolean;
  has_multiple_solutions: boolean;
  requires_creativity: boolean;
  involves_systems: boolean;
  needs_evidence: boolean;
  has_causal_elements: boolean;
  involves_scenarios: boolean;
  requires_root_cause: boolean;
}

// Framework interfaces
export interface ThinkingFramework {
  type: ThinkingFrameworkType;
  name: string;
  description: string;
  steps: FrameworkStep[];
  applicability_score: number;
  strengths: string[];
  limitations: string[];
}

export interface FrameworkStep {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  methods: string[];
}

// Framework selection interfaces
export interface FrameworkRecommendation {
  framework: ThinkingFramework;
  confidence: number;
  reasoning: string;
  alternative_frameworks: ThinkingFramework[];
}

export interface IDynamicFrameworkSelector {
  selectFramework(
    problem: Problem,
    context: Context
  ): Promise<FrameworkRecommendation>;

  analyzeProblemCharacteristics(problem: Problem): ProblemCharacteristics;

  evaluateFrameworkFit(
    framework: ThinkingFramework,
    characteristics: ProblemCharacteristics
  ): number;

  createHybridFramework(
    primary: ThinkingFramework,
    supporting: ThinkingFramework[]
  ): ThinkingFramework;

  getAvailableFrameworks(): ThinkingFramework[];

  initialize?(): Promise<void>;
}

// Problem analysis interfaces
export interface ProblemStructure {
  main_problem: Problem;
  sub_problems: Problem[];
  dependencies: ProblemDependency[];
  critical_path: string[];
  priority_ranking: PriorityItem[];
}

export interface ProblemDependency {
  from: string;
  to: string;
  type: "prerequisite" | "constraint" | "resource" | "temporal";
  strength: number;
}

export interface PriorityItem {
  problem_id: string;
  priority_score: number;
  reasoning: string;
}

export interface IProblemAnalyzer {
  analyzeStructure(problem: Problem): Promise<ProblemStructure>;

  decomposeProblem(problem: Problem): Promise<Problem[]>;

  identifyDependencies(problems: Problem[]): Promise<ProblemDependency[]>;

  calculatePriorities(
    problems: Problem[],
    dependencies: ProblemDependency[]
  ): Promise<PriorityItem[]>;

  initialize?(): Promise<void>;
}

// Systematic analysis result
export interface SystematicAnalysisResult {
  problem_structure: ProblemStructure;
  recommended_framework: FrameworkRecommendation;
  analysis_steps: AnalysisStep[];
  confidence: number;
  processing_time_ms: number;
  alternative_approaches: AlternativeApproach[];
}

export interface AnalysisStep {
  step_name: string;
  description: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  confidence: number;
  processing_time_ms: number;
}

export interface AlternativeApproach {
  framework: ThinkingFramework;
  expected_outcome: string;
  trade_offs: string[];
  confidence: number;
}

// Main systematic thinking orchestrator
export interface ISystematicThinkingOrchestrator {
  analyzeSystematically(
    input: string,
    mode: SystematicThinkingMode,
    context?: Context
  ): Promise<SystematicAnalysisResult>;

  initialize(): Promise<void>;

  getAvailableFrameworks(): ThinkingFramework[];

  validateFramework(framework: ThinkingFramework): boolean;
}
