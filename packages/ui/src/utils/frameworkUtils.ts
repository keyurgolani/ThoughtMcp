import React from "react";
import {
  CreativeProblemSolvingIcon,
  CriticalThinkingIcon,
  DesignThinkingIcon,
  FirstPrinciplesIcon,
  RootCauseAnalysisIcon,
  ScenarioPlanningIcon,
  ScientificMethodIcon,
  SystemsThinkingIcon,
} from "../components/icons/Icons";
import type { FrameworkType } from "../types/api";

/**
 * Framework definitions with metadata for display and recommendation
 * Requirements: 18.1
 */
export const FRAMEWORKS: Array<{
  value: FrameworkType;
  label: string;
  description: string;
  getIcon: () => React.ReactElement;
  keywords: string[];
}> = [
  {
    value: "scientific-method",
    label: "Scientific Method",
    description: "Hypothesis-driven approach with observation, experimentation, and analysis",
    getIcon: () => React.createElement(ScientificMethodIcon, { size: "xl" }),
    keywords: ["test", "hypothesis", "experiment", "data", "research", "verify", "measure"],
  },
  {
    value: "design-thinking",
    label: "Design Thinking",
    description: "Human-centered approach focusing on empathy, ideation, and prototyping",
    getIcon: () => React.createElement(DesignThinkingIcon, { size: "xl" }),
    keywords: ["user", "design", "prototype", "empathy", "creative", "innovation", "experience"],
  },
  {
    value: "systems-thinking",
    label: "Systems Thinking",
    description: "Holistic analysis of interconnected components and feedback loops",
    getIcon: () => React.createElement(SystemsThinkingIcon, { size: "xl" }),
    keywords: ["system", "complex", "interconnected", "feedback", "holistic", "ecosystem"],
  },
  {
    value: "critical-thinking",
    label: "Critical Thinking",
    description: "Rigorous evaluation of arguments, evidence, and logical validity",
    getIcon: () => React.createElement(CriticalThinkingIcon, { size: "xl" }),
    keywords: ["evaluate", "argument", "logic", "evidence", "analyze", "assess", "validity"],
  },
  {
    value: "creative-problem-solving",
    label: "Creative Problem Solving",
    description: "Divergent thinking to generate novel solutions and alternatives",
    getIcon: () => React.createElement(CreativeProblemSolvingIcon, { size: "xl" }),
    keywords: ["creative", "brainstorm", "innovative", "novel", "alternative", "idea"],
  },
  {
    value: "root-cause-analysis",
    label: "Root Cause Analysis",
    description: "Systematic investigation to identify underlying causes of problems",
    getIcon: () => React.createElement(RootCauseAnalysisIcon, { size: "xl" }),
    keywords: ["cause", "why", "root", "investigate", "failure", "issue", "problem"],
  },
  {
    value: "first-principles",
    label: "First Principles",
    description: "Breaking down problems to fundamental truths and building up from there",
    getIcon: () => React.createElement(FirstPrinciplesIcon, { size: "xl" }),
    keywords: ["fundamental", "basic", "assumption", "foundation", "core", "essential"],
  },
  {
    value: "scenario-planning",
    label: "Scenario Planning",
    description: "Exploring multiple future scenarios to prepare for uncertainty",
    getIcon: () => React.createElement(ScenarioPlanningIcon, { size: "xl" }),
    keywords: ["future", "scenario", "plan", "uncertainty", "strategy", "forecast", "prepare"],
  },
];

/**
 * Recommend a framework based on problem text
 * Requirements: 18.2
 */
export function recommendFramework(problemText: string): FrameworkType | null {
  if (problemText.trim().length === 0) return null;

  const lowerText = problemText.toLowerCase();
  const scores: Record<FrameworkType, number> = {
    "scientific-method": 0,
    "design-thinking": 0,
    "systems-thinking": 0,
    "critical-thinking": 0,
    "creative-problem-solving": 0,
    "root-cause-analysis": 0,
    "first-principles": 0,
    "scenario-planning": 0,
  };

  // Score each framework based on keyword matches
  for (const framework of FRAMEWORKS) {
    for (const keyword of framework.keywords) {
      if (lowerText.includes(keyword)) {
        scores[framework.value] += 1;
      }
    }
  }

  // Find the framework with the highest score
  let bestFramework: FrameworkType | null = null;
  let bestScore = 0;

  for (const [framework, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestFramework = framework as FrameworkType;
    }
  }

  // Return null if no keywords matched
  return bestScore > 0 ? bestFramework : null;
}
