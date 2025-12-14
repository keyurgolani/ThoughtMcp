/**
 * Docs Routes Unit Tests
 *
 * Tests for the OpenAPI documentation endpoint.
 * Requirements: 14.1, 14.3
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { CognitiveCore } from "../../../server/cognitive-core.js";
import {
  createDocsRoutes,
  CURRENT_VERSION,
  generateOpenApiSpec,
  SUPPORTED_VERSIONS,
} from "../../../server/routes/docs.js";

// Mock cognitive core with all required methods
const createMockCognitiveCore = (): CognitiveCore => {
  return {
    memoryRepository: {} as CognitiveCore["memoryRepository"],
    reasoningOrchestrator: {} as CognitiveCore["reasoningOrchestrator"],
    frameworkSelector: {} as CognitiveCore["frameworkSelector"],
    confidenceAssessor: {} as CognitiveCore["confidenceAssessor"],
    biasDetector: {} as CognitiveCore["biasDetector"],
    emotionAnalyzer: {} as CognitiveCore["emotionAnalyzer"],
    problemDecomposer: {} as CognitiveCore["problemDecomposer"],
    memoryAugmentedReasoning: {} as CognitiveCore["memoryAugmentedReasoning"],
  };
};

describe("Docs Routes", () => {
  let mockCore: CognitiveCore;

  beforeEach(() => {
    mockCore = createMockCognitiveCore();
  });

  describe("createDocsRoutes", () => {
    it("should create a router with routes", () => {
      const router = createDocsRoutes(mockCore);
      expect(router).toBeDefined();
      expect(router.stack).toBeDefined();
      expect(router.stack.length).toBeGreaterThan(0);
    });

    it("should have GET route for root docs endpoint", () => {
      const router = createDocsRoutes(mockCore);

      const hasDocsRoute = router.stack.some((layer: any) => {
        return layer.route?.path === "/" && layer.route?.methods?.get;
      });
      expect(hasDocsRoute).toBe(true);
    });
  });

  describe("generateOpenApiSpec - Requirements: 14.1", () => {
    it("should return valid OpenAPI 3.0 specification", () => {
      const spec = generateOpenApiSpec();
      expect(spec.openapi).toBe("3.0.3");
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe("ThoughtMCP REST API");
      expect(spec.info.version).toBe(CURRENT_VERSION);
    });

    it("should include all required sections", () => {
      const spec = generateOpenApiSpec();
      expect(spec.servers).toBeDefined();
      expect(spec.servers.length).toBeGreaterThan(0);
      expect(spec.tags).toBeDefined();
      expect(spec.paths).toBeDefined();
      expect(spec.components).toBeDefined();
    });

    it("should include memory endpoints", () => {
      const spec = generateOpenApiSpec();
      expect(spec.paths["/memory/store"]).toBeDefined();
      expect(spec.paths["/memory/recall"]).toBeDefined();
      expect(spec.paths["/memory/update"]).toBeDefined();
      expect(spec.paths["/memory/{memoryId}"]).toBeDefined();
      expect(spec.paths["/memory/stats"]).toBeDefined();
    });

    it("should include reasoning endpoints", () => {
      const spec = generateOpenApiSpec();
      expect(spec.paths["/think"]).toBeDefined();
      expect(spec.paths["/reasoning/parallel"]).toBeDefined();
    });

    it("should include health endpoints", () => {
      const spec = generateOpenApiSpec();
      expect(spec.paths["/health"]).toBeDefined();
      expect(spec.paths["/health/ready"]).toBeDefined();
      expect(spec.paths["/health/live"]).toBeDefined();
    });

    it("should include docs endpoint", () => {
      const spec = generateOpenApiSpec();
      expect(spec.paths["/docs"]).toBeDefined();
    });

    it("should include component schemas", () => {
      const spec = generateOpenApiSpec();
      expect(spec.components.schemas).toBeDefined();
      expect(spec.components.schemas?.ApiSuccessResponse).toBeDefined();
      expect(spec.components.schemas?.ApiErrorResponse).toBeDefined();
      expect(spec.components.schemas?.MemorySector).toBeDefined();
    });

    it("should include error responses", () => {
      const spec = generateOpenApiSpec();
      expect(spec.components.responses).toBeDefined();
      expect(spec.components.responses?.BadRequest).toBeDefined();
      expect(spec.components.responses?.NotFound).toBeDefined();
    });
  });

  describe("Version Constants", () => {
    it("should have supported versions defined", () => {
      expect(SUPPORTED_VERSIONS).toBeDefined();
      expect(SUPPORTED_VERSIONS).toContain("v1");
    });

    it("should have current version defined", () => {
      expect(CURRENT_VERSION).toBeDefined();
      expect(CURRENT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
