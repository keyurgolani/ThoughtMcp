import { Home, Layers } from "lucide-react";
import type { ReactElement } from "react";
import React from "react";
import {
  BiasIcon,
  DecomposeIcon,
  EmotionIcon,
  FrameworkIcon,
  MemoriesIcon,
  ReasoningIcon,
  type IconSize,
} from "../icons";

// ============================================================================
// Types
// ============================================================================

export type ScreenId =
  | "dashboard"
  | "memory-graph"
  | "memory-explorer"
  | "reasoning-console"
  | "framework-analysis"
  | "problem-decomposition"
  | "confidence-bias"
  | "emotion-analysis";

export interface NavItem {
  /** Unique screen identifier */
  id: ScreenId;
  /** Display label */
  label: string;
  /** Short label for mobile */
  shortLabel: string;
  /** Icon component getter */
  getIcon: (size: IconSize) => ReactElement;
  /** Description for tooltip */
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    getIcon: (size) =>
      React.createElement(Home, { size: size === "sm" ? 14 : size === "lg" ? 20 : 16 }),
    description: "Overview of your knowledge base",
  },
  {
    id: "memory-explorer",
    label: "Memory Explorer",
    shortLabel: "Memory",
    getIcon: (size) =>
      React.createElement(Layers, { size: size === "sm" ? 14 : size === "lg" ? 20 : 16 }),
    description: "Search and manage memories",
  },
  {
    id: "reasoning-console",
    label: "Reasoning Console",
    shortLabel: "Reason",
    getIcon: (size) => React.createElement(ReasoningIcon, { size: size }),
    description: "Perform systematic reasoning analysis",
  },
  {
    id: "framework-analysis",
    label: "Framework Analysis",
    shortLabel: "Frame",
    getIcon: (size) => React.createElement(FrameworkIcon, { size: size }),
    description: "Analyze problems using thinking frameworks",
  },
  {
    id: "problem-decomposition",
    label: "Problem Decomposition",
    shortLabel: "Split",
    getIcon: (size) => React.createElement(DecomposeIcon, { size: size }),
    description: "Break down complex problems",
  },
  {
    id: "confidence-bias",
    label: "Confidence & Bias",
    shortLabel: "Bias",
    getIcon: (size) => React.createElement(BiasIcon, { size: size }),
    description: "Assess confidence and detect biases",
  },
  {
    id: "emotion-analysis",
    label: "Emotion Analysis",
    shortLabel: "Feel",
    getIcon: (size) => React.createElement(EmotionIcon, { size: size }),
    description: "Analyze emotional content",
  },
  {
    id: "memory-graph",
    label: "Memory Graph",
    shortLabel: "Graph",
    getIcon: (size) => React.createElement(MemoriesIcon, { size: size }),
    description: "Explore the 3D memory graph",
  },
];
