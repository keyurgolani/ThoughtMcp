import type { ReactElement } from "react";
import React from "react";
import { Compass, Link2, MessageCircle, Search } from "../components/icons/Icons";

// ============================================================================
// Types
// ============================================================================

/** Action types that can be suggested */
export type SuggestedActionType = "explore" | "reason" | "analyze" | "connect";

/** Suggested action data structure */
export interface SuggestedAction {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: SuggestedActionType;
  /** Action title */
  title: string;
  /** Action description */
  description: string;
  /** Target memory ID (optional) */
  targetMemoryId?: string;
  /** Priority for sorting (higher = more important) */
  priority?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Icons for each action type */
export const ACTION_ICONS: Record<SuggestedActionType, ReactElement> = {
  explore: React.createElement(Compass, { size: 16 }),
  reason: React.createElement(MessageCircle, { size: 16 }),
  analyze: React.createElement(Search, { size: 16 }),
  connect: React.createElement(Link2, { size: 16 }),
};

/** Labels for each action type */
export const ACTION_LABELS: Record<SuggestedActionType, string> = {
  explore: "Explore",
  reason: "Reason",
  analyze: "Analyze",
  connect: "Connect",
};

/** Screen routes for each action type */
export const ACTION_ROUTES: Record<SuggestedActionType, string> = {
  explore: "/explorer",
  reason: "/reasoning",
  analyze: "/confidence-bias",
  connect: "/explorer",
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default set of suggested actions
 * Useful for initial state or when no AI suggestions are available
 */
export function createDefaultSuggestedActions(): SuggestedAction[] {
  return [
    {
      id: "default-explore",
      type: "explore",
      title: "Explore Memories",
      description: "Navigate through your memory graph in 3D space",
      priority: 4,
    },
    {
      id: "default-reason",
      type: "reason",
      title: "Start Reasoning",
      description: "Use parallel reasoning to analyze problems",
      priority: 3,
    },
    {
      id: "default-analyze",
      type: "analyze",
      title: "Analyze Content",
      description: "Assess confidence and detect biases in your thinking",
      priority: 2,
    },
    {
      id: "default-connect",
      type: "connect",
      title: "Create Connections",
      description: "Link related memories to build your knowledge graph",
      priority: 1,
    },
  ];
}

/**
 * Get the route for a given action type
 */
export function getActionRoute(actionType: SuggestedActionType): string {
  return ACTION_ROUTES[actionType];
}

/**
 * Get the icon for a given action type
 */
export function getActionIcon(actionType: SuggestedActionType): ReactElement {
  return ACTION_ICONS[actionType];
}

/**
 * Get the label for a given action type
 */
export function getActionLabel(actionType: SuggestedActionType): string {
  return ACTION_LABELS[actionType];
}
