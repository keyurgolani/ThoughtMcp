/**
 * Problem Routes
 *
 * REST API endpoints for problem decomposition and framework selection.
 * Requirements: 6.1, 6.2, 6.3
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { CognitiveCore } from "../cognitive-core.js";
import { asyncHandler, ValidationApiError } from "../middleware/error-handler.js";
import { buildSuccessResponse } from "../types/api-response.js";

/**
 * Helper to extract request ID from request
 */
function getRequestId(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

/**
 * Helper to parse Zod validation errors into field errors
 */
function parseZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".") || "request";
    fieldErrors[path] = issue.message;
  }
  return fieldErrors;
}

/**
 * Valid decomposition strategies
 * Requirements: 6.1
 */
const VALID_STRATEGIES = ["functional", "temporal", "stakeholder", "component"] as const;
type DecompositionStrategy = (typeof VALID_STRATEGIES)[number];

/**
 * Zod schema for problem decompose request validation
 * Requirements: 6.1, 6.3
 */
const problemDecomposeRequestSchema = z.object({
  problem: z
    .string()
    .min(1, "problem is required")
    .max(10000, "problem must be at most 10,000 characters"),
  strategy: z
    .enum(VALID_STRATEGIES, {
      errorMap: () => ({
        message: `strategy must be one of: ${VALID_STRATEGIES.join(", ")}`,
      }),
    })
    .optional(),
  maxDepth: z.number().int().min(1).max(5).optional(),
  userId: z.string().min(1, "userId must be non-empty if provided").optional(),
  context: z.string().max(5000, "context must be at most 5,000 characters").optional(),
});

/**
 * Sub-problem node in decomposition tree
 * Requirements: 6.1
 */
interface ProblemNode {
  id: string;
  name: string;
  description: string;
  depth: number;
  parent?: string;
  domain?: string;
  children: ProblemNode[];
}

/**
 * Dependency between sub-problems
 * Requirements: 6.1
 */
interface DependencyResponse {
  from: string;
  to: string;
  type: string;
  description: string;
}

/**
 * Response type for problem decompose endpoint
 * Requirements: 6.1, 6.3
 */
interface ProblemDecomposeResponse {
  decompositionTree: ProblemNode;
  dependencies: DependencyResponse[];
  priorityOrder: string[];
  criticalPath: string[];
  recommendedApproach: string;
  processingTimeMs: number;
}

/**
 * Build decomposition tree from flat sub-problems
 */
function buildDecompositionTree(
  subProblems: Array<{
    id: string;
    name: string;
    description: string;
    depth: number;
    parent?: string;
    domain?: string;
  }>
): ProblemNode {
  // Create a map for quick lookup
  const nodeMap = new Map<string, ProblemNode>();

  // Initialize all nodes
  for (const sp of subProblems) {
    nodeMap.set(sp.id, {
      id: sp.id,
      name: sp.name,
      description: sp.description,
      depth: sp.depth,
      parent: sp.parent,
      domain: sp.domain,
      children: [],
    });
  }

  // Build tree structure
  let root: ProblemNode | undefined;
  for (const sp of subProblems) {
    const node = nodeMap.get(sp.id);
    if (!node) continue;

    if (sp.parent) {
      const parent = nodeMap.get(sp.parent);
      if (parent) {
        parent.children.push(node);
      }
    } else if (sp.id === "root") {
      root = node;
    }
  }

  // Return root or create a default one
  return (
    root ?? {
      id: "root",
      name: "Problem",
      description: "Root problem",
      depth: 1,
      children: [],
    }
  );
}

/**
 * Calculate priority order based on dependencies
 */
function calculatePriorityOrder(
  subProblems: Array<{ id: string; depth: number; parent?: string }>,
  dependencies: Array<{ from: string; to: string; type: string }>
): string[] {
  // Simple topological sort based on depth and dependencies
  const sorted = [...subProblems].sort((a, b) => {
    // First by depth (shallower first)
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    // Then by dependency count (fewer dependencies first)
    const aDeps = dependencies.filter((d) => d.to === a.id).length;
    const bDeps = dependencies.filter((d) => d.to === b.id).length;
    return aDeps - bDeps;
  });

  return sorted.map((sp) => sp.id);
}

/**
 * Calculate critical path through decomposition
 */
function calculateCriticalPath(
  subProblems: Array<{ id: string; depth: number; parent?: string }>,
  dependencies: Array<{ from: string; to: string; type: string }>
): string[] {
  // Find the longest path from root to leaf
  const maxDepth = Math.max(...subProblems.map((sp) => sp.depth));

  // Get nodes at each depth level
  const criticalPath: string[] = [];

  // Start from root
  const root = subProblems.find((sp) => sp.id === "root");
  if (root) {
    criticalPath.push(root.id);
  }

  // Follow the path with most dependencies at each level
  let currentId = "root";
  for (let depth = 2; depth <= maxDepth; depth++) {
    const childrenAtDepth = subProblems.filter(
      (sp) => sp.depth === depth && sp.parent === currentId
    );

    if (childrenAtDepth.length === 0) {
      // Try to find any node at this depth that depends on current
      const dependentNodes = dependencies
        .filter((d) => d.from === currentId)
        .map((d) => subProblems.find((sp) => sp.id === d.to))
        .filter((sp): sp is NonNullable<typeof sp> => sp?.depth === depth);

      if (dependentNodes.length > 0) {
        currentId = dependentNodes[0].id;
        criticalPath.push(currentId);
      }
    } else {
      // Pick the first child (could be enhanced with more sophisticated selection)
      currentId = childrenAtDepth[0].id;
      criticalPath.push(currentId);
    }
  }

  return criticalPath;
}

/**
 * Generate recommended approach based on decomposition
 */
function generateRecommendedApproach(
  subProblems: Array<{ id: string; name: string; depth: number; domain?: string }>,
  strategy?: DecompositionStrategy
): string {
  const domain = subProblems.find((sp) => sp.domain)?.domain ?? "general";
  const depth = Math.max(...subProblems.map((sp) => sp.depth));
  const componentCount = subProblems.length;

  const strategyDescriptions: Record<DecompositionStrategy, string> = {
    functional: "breaking down by functional areas",
    temporal: "organizing by time phases",
    stakeholder: "grouping by stakeholder concerns",
    component: "decomposing by system components",
  };

  const strategyDesc = strategy ? strategyDescriptions[strategy] : "hierarchical decomposition";

  return (
    `Recommended approach: Use ${strategyDesc} with ${componentCount} sub-problems ` +
    `across ${depth} levels. Focus on the ${domain} domain. ` +
    `Start with foundation components and progress through the critical path.`
  );
}

/**
 * Handler for POST /api/v1/problem/decompose
 * Requirements: 6.1, 6.3
 *
 * Decomposes a problem into sub-problems with dependencies,
 * priority order, and critical path.
 */
function createProblemDecomposeHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Validate request body
    const parseResult = problemDecomposeRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { problem, strategy, maxDepth, userId, context } = parseResult.data;

    // Build problem description with optional context
    let problemDescription = problem;

    // If userId provided, augment with memory context
    if (userId && context) {
      problemDescription = `${problem}\n\nContext: ${context}`;
    } else if (userId) {
      const augmentedContext = await cognitiveCore.memoryAugmentedReasoning.augmentProblemContext(
        problem,
        userId
      );
      if (augmentedContext.hasMemoryContext) {
        problemDescription = augmentedContext.augmentedProblem;
      }
    } else if (context) {
      problemDescription = `${problem}\n\nContext: ${context}`;
    }

    // Decompose the problem
    const decompositionResult = cognitiveCore.problemDecomposer.decompose(
      problemDescription,
      maxDepth ?? 3
    );

    // Build response
    const decompositionTree = buildDecompositionTree(decompositionResult.subProblems);
    const dependencies: DependencyResponse[] = decompositionResult.dependencies.map((dep) => ({
      from: dep.from,
      to: dep.to,
      type: dep.type,
      description: dep.description,
    }));
    const priorityOrder = calculatePriorityOrder(
      decompositionResult.subProblems,
      decompositionResult.dependencies
    );
    const criticalPath = calculateCriticalPath(
      decompositionResult.subProblems,
      decompositionResult.dependencies
    );
    const recommendedApproach = generateRecommendedApproach(
      decompositionResult.subProblems,
      strategy
    );

    const processingTimeMs = Date.now() - startTime;

    const responseData: ProblemDecomposeResponse = {
      decompositionTree,
      dependencies,
      priorityOrder,
      criticalPath,
      recommendedApproach,
      processingTimeMs,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Zod schema for framework select request validation
 * Requirements: 6.2
 */
const frameworkSelectRequestSchema = z.object({
  problem: z
    .string()
    .min(1, "problem is required")
    .max(10000, "problem must be at most 10,000 characters"),
  context: z.string().max(5000, "context must be at most 5,000 characters").optional(),
  preferredFramework: z.string().optional(),
});

/**
 * Framework in response
 * Requirements: 6.2
 */
interface FrameworkResponse {
  id: string;
  name: string;
  description: string;
}

/**
 * Alternative framework in response
 * Requirements: 6.2
 */
interface FrameworkAlternativeResponse {
  framework: FrameworkResponse;
  confidence: number;
  reason: string;
}

/**
 * Response type for framework select endpoint
 * Requirements: 6.2
 */
interface FrameworkSelectResponse {
  recommendedFramework: FrameworkResponse;
  reasoning: string;
  alternatives: FrameworkAlternativeResponse[];
  confidence: number;
  isHybrid: boolean;
  hybridFrameworks?: FrameworkResponse[];
  processingTimeMs: number;
}

/**
 * Handler for POST /api/v1/problem/framework/select
 * Requirements: 6.2
 *
 * Selects the most appropriate framework for a problem.
 * Returns recommended framework, reasoning, alternatives, and confidence.
 */
function createFrameworkSelectHandler(
  cognitiveCore: CognitiveCore
): (req: Request, res: Response, next: import("express").NextFunction) => void {
  return asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const requestId = getRequestId(req);

    // Validate request body
    const parseResult = frameworkSelectRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationApiError(parseZodErrors(parseResult.error));
    }

    const { problem, context, preferredFramework } = parseResult.data;

    // Build problem object for framework selector
    const problemObj = {
      id: `problem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      description: problem,
      context: context ?? "",
    };

    // Build selection options
    const selectionOptions = {
      context: {
        problem: problemObj,
        evidence: [],
        constraints: [],
        goals: [],
      },
      preferredFrameworkId: preferredFramework,
    };

    // Select framework
    const selection = cognitiveCore.frameworkSelector.selectFramework(problemObj, selectionOptions);

    // Build response
    const recommendedFramework: FrameworkResponse = {
      id: selection.primaryFramework.id,
      name: selection.primaryFramework.name,
      description: selection.primaryFramework.description,
    };

    const alternatives: FrameworkAlternativeResponse[] = selection.alternatives.map((alt) => ({
      framework: {
        id: alt.framework.id,
        name: alt.framework.name,
        description: alt.framework.description,
      },
      confidence: alt.confidence,
      reason: alt.reason,
    }));

    const hybridFrameworks = selection.hybridFrameworks?.map((fw) => ({
      id: fw.id,
      name: fw.name,
      description: fw.description,
    }));

    const processingTimeMs = Date.now() - startTime;

    const responseData: FrameworkSelectResponse = {
      recommendedFramework,
      reasoning: selection.reason,
      alternatives,
      confidence: selection.confidence,
      isHybrid: selection.isHybrid,
      hybridFrameworks,
      processingTimeMs,
    };

    res.status(200).json(buildSuccessResponse(responseData, { requestId, startTime }));
  });
}

/**
 * Create problem routes
 *
 * @param cognitiveCore - Shared cognitive core instance
 * @returns Express router with problem endpoints
 */
export function createProblemRoutes(cognitiveCore: CognitiveCore): Router {
  const router = Router();

  // POST /api/v1/problem/decompose - Decompose problem
  // Requirements: 6.1, 6.3
  router.post("/decompose", createProblemDecomposeHandler(cognitiveCore));

  // POST /api/v1/problem/framework/select - Select framework
  // Requirements: 6.2
  router.post("/framework/select", createFrameworkSelectHandler(cognitiveCore));

  return router;
}

// Export types for testing
export type {
  DecompositionStrategy,
  DependencyResponse,
  FrameworkAlternativeResponse,
  FrameworkResponse,
  FrameworkSelectResponse,
  ProblemDecomposeResponse,
  ProblemNode,
};
