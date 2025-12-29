/**
 * Visualization Utility Tests
 *
 * Tests for visualization utility functions.
 * Requirements: 1.2, 2.1-2.4, 3.2-3.3, 13.3, 43.1, 43.2
 */

import type { GraphEdge, LinkType, MemorySectorType } from "@types";
import {
  calculateConnectionCounts,
  calculateEdgeThickness,
  calculateFibonacciSpherePositions,
  calculateHubAndSpokePositions,
  calculateHubCentricPositions,
  calculateHubEdgeThickness,
  calculateNodeOpacity,
  calculateNodeSize,
  calculateRadialNeighborPositions,
  getHubEdgeEmissiveMultiplier,
  getHubEdgeGlowMultiplier,
  getLinkTypeColor,
  getSectorColor,
  isHubNode,
} from "@utils/visualization";
import { describe, expect, it } from "vitest";

// ============================================================================
// Fibonacci Sphere Position Calculator Tests (Requirements: 1.2)
// ============================================================================

describe("calculateFibonacciSpherePositions", () => {
  it("should return empty array for zero or negative node count", () => {
    expect(calculateFibonacciSpherePositions(0)).toEqual([]);
    expect(calculateFibonacciSpherePositions(-1)).toEqual([]);
  });

  it("should return single position for node count of 1", () => {
    const positions = calculateFibonacciSpherePositions(1, 5);
    expect(positions).toHaveLength(1);
    expect(positions[0]).toHaveLength(3);
  });

  it("should return correct number of positions", () => {
    expect(calculateFibonacciSpherePositions(10, 5)).toHaveLength(10);
    expect(calculateFibonacciSpherePositions(50, 5)).toHaveLength(50);
    expect(calculateFibonacciSpherePositions(100, 5)).toHaveLength(100);
  });

  it("should clamp node count to maximum of 1000", () => {
    const positions = calculateFibonacciSpherePositions(2000, 5);
    expect(positions).toHaveLength(1000);
  });

  it("should generate positions on sphere surface with correct radius", () => {
    const radius = 5;
    const positions = calculateFibonacciSpherePositions(20, radius);

    for (const pos of positions) {
      const [x, y, z] = pos;
      const distance = Math.sqrt(x * x + y * y + z * z);
      expect(distance).toBeCloseTo(radius, 5);
    }
  });

  it("should use default radius of 5 when not specified", () => {
    const positions = calculateFibonacciSpherePositions(10);
    const firstPos = positions[0];
    expect(firstPos).toBeDefined();
    if (firstPos === undefined) return;
    const [x, y, z] = firstPos;
    const distance = Math.sqrt(x * x + y * y + z * z);
    expect(distance).toBeCloseTo(5, 5);
  });

  it("should distribute positions evenly across sphere", () => {
    const positions = calculateFibonacciSpherePositions(100, 5);

    // Check that y values span from approximately -radius to +radius
    const yValues = positions.map(([, y]) => y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    expect(minY).toBeLessThan(-4);
    expect(maxY).toBeGreaterThan(4);
  });

  it("should handle fractional node counts by flooring", () => {
    const positions = calculateFibonacciSpherePositions(5.7, 5);
    expect(positions).toHaveLength(5);
  });

  it("should handle very small radius", () => {
    const positions = calculateFibonacciSpherePositions(10, 0.05);
    // Should clamp to minimum radius of 0.1
    const firstPos = positions[0];
    expect(firstPos).toBeDefined();
    if (firstPos === undefined) return;
    const [x, y, z] = firstPos;
    const distance = Math.sqrt(x * x + y * y + z * z);
    expect(distance).toBeCloseTo(0.1, 5);
  });
});

// ============================================================================
// Sector Color Mapping Tests (Requirements: 2.1, 2.2, 13.3)
// ============================================================================

describe("getSectorColor", () => {
  const sectors: MemorySectorType[] = [
    "episodic",
    "semantic",
    "procedural",
    "emotional",
    "reflective",
  ];

  it("should return correct standard colors for each sector", () => {
    // Theme-agnostic colors - consistent across all themes
    expect(getSectorColor("episodic")).toBe("#d97706"); // Amber
    expect(getSectorColor("semantic")).toBe("#0891b2"); // Cyan
    expect(getSectorColor("procedural")).toBe("#7c3aed"); // Purple
    expect(getSectorColor("emotional")).toBe("#e11d48"); // Rose
    expect(getSectorColor("reflective")).toBe("#64748b"); // Slate
  });

  it("should return correct high contrast colors for each sector", () => {
    // Brighter versions for accessibility
    expect(getSectorColor("episodic", true)).toBe("#f59e0b"); // Brighter amber
    expect(getSectorColor("semantic", true)).toBe("#06b6d4"); // Brighter cyan
    expect(getSectorColor("procedural", true)).toBe("#8b5cf6"); // Brighter purple
    expect(getSectorColor("emotional", true)).toBe("#f43f5e"); // Brighter rose
    expect(getSectorColor("reflective", true)).toBe("#94a3b8"); // Brighter slate
  });

  it("should return correct light mode colors for each sector", () => {
    // Light mode returns same theme-agnostic colors (deprecated behavior)
    expect(getSectorColor("episodic", false, true)).toBe("#d97706"); // Same as standard
    expect(getSectorColor("semantic", false, true)).toBe("#0891b2"); // Same as standard
    expect(getSectorColor("procedural", false, true)).toBe("#7c3aed"); // Same as standard
    expect(getSectorColor("emotional", false, true)).toBe("#e11d48"); // Same as standard
    expect(getSectorColor("reflective", false, true)).toBe("#64748b"); // Same as standard
  });

  it("should return consistent colors for the same sector", () => {
    for (const sector of sectors) {
      const color1 = getSectorColor(sector);
      const color2 = getSectorColor(sector);
      expect(color1).toBe(color2);
    }
  });

  it("should return different colors for different sectors", () => {
    const colors = sectors.map((s) => getSectorColor(s));
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(sectors.length);
  });

  it("should default to standard colors when highContrast is false", () => {
    expect(getSectorColor("episodic", false)).toBe("#d97706");
  });

  it("should prioritize light mode over high contrast", () => {
    // Light mode takes precedence - returns theme-agnostic colors
    expect(getSectorColor("episodic", true, true)).toBe("#d97706");
  });
});

// ============================================================================
// Link Type Color Mapping Tests (Requirements: 3.2)
// ============================================================================

describe("getLinkTypeColor", () => {
  const linkTypes: LinkType[] = ["semantic", "causal", "temporal", "analogical"];

  it("should return correct colors for each link type in dark mode", () => {
    expect(getLinkTypeColor("semantic")).toBe("#5B8FA8"); // Muted blue
    expect(getLinkTypeColor("causal")).toBe("#C9896B"); // Muted orange
    expect(getLinkTypeColor("temporal")).toBe("#6B9E7A"); // Muted green
    expect(getLinkTypeColor("analogical")).toBe("#8B7BB5"); // Muted purple
  });

  it("should return correct colors for each link type in light mode", () => {
    expect(getLinkTypeColor("semantic", true)).toBe("#0077B6"); // Bold blue
    expect(getLinkTypeColor("causal", true)).toBe("#D62828"); // Bold red-orange
    expect(getLinkTypeColor("temporal", true)).toBe("#2D6A4F"); // Bold green
    expect(getLinkTypeColor("analogical", true)).toBe("#7B2CBF"); // Bold purple
  });

  it("should return consistent colors for the same link type", () => {
    for (const linkType of linkTypes) {
      const color1 = getLinkTypeColor(linkType);
      const color2 = getLinkTypeColor(linkType);
      expect(color1).toBe(color2);
    }
  });

  it("should return different colors for different link types", () => {
    const colors = linkTypes.map((lt) => getLinkTypeColor(lt));
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(linkTypes.length);
  });

  it("should return different colors in light mode vs dark mode", () => {
    for (const linkType of linkTypes) {
      const darkColor = getLinkTypeColor(linkType, false);
      const lightColor = getLinkTypeColor(linkType, true);
      expect(darkColor).not.toBe(lightColor);
    }
  });
});

// ============================================================================
// Node Size Calculator Tests (Requirements: 2.3)
// ============================================================================

describe("calculateNodeSize", () => {
  it("should return minimum size for salience of 0", () => {
    expect(calculateNodeSize(0)).toBe(0.08); // Updated default min
    expect(calculateNodeSize(0, 0.5, 2.0)).toBe(0.5);
  });

  it("should return maximum size for salience of 1", () => {
    expect(calculateNodeSize(1)).toBe(0.4); // Updated default max
    expect(calculateNodeSize(1, 0.5, 2.0)).toBe(2.0);
  });

  it("should return proportional size for intermediate salience", () => {
    expect(calculateNodeSize(0.5)).toBeCloseTo(0.24, 5); // Updated for new range
    expect(calculateNodeSize(0.5, 0, 2)).toBeCloseTo(1, 5);
  });

  it("should be monotonically increasing with salience", () => {
    const sizes = [0, 0.25, 0.5, 0.75, 1].map((s) => calculateNodeSize(s));
    for (let i = 1; i < sizes.length; i++) {
      const current = sizes[i];
      const previous = sizes[i - 1];
      expect(current).toBeDefined();
      expect(previous).toBeDefined();
      if (current === undefined || previous === undefined) continue;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it("should clamp salience values below 0", () => {
    expect(calculateNodeSize(-0.5)).toBe(calculateNodeSize(0));
  });

  it("should clamp salience values above 1", () => {
    expect(calculateNodeSize(1.5)).toBe(calculateNodeSize(1));
  });

  it("should use custom min/max sizes when provided", () => {
    expect(calculateNodeSize(0, 1, 5)).toBe(1);
    expect(calculateNodeSize(1, 1, 5)).toBe(5);
  });
});

// ============================================================================
// Node Opacity Calculator Tests (Requirements: 2.4)
// ============================================================================

describe("calculateNodeOpacity", () => {
  it("should return minimum opacity for strength of 0", () => {
    expect(calculateNodeOpacity(0)).toBe(0.3);
    expect(calculateNodeOpacity(0, 0.2, 1.0)).toBe(0.2);
  });

  it("should return maximum opacity for strength of 1", () => {
    expect(calculateNodeOpacity(1)).toBe(1.0);
    expect(calculateNodeOpacity(1, 0.2, 0.9)).toBeCloseTo(0.9, 5);
  });

  it("should return proportional opacity for intermediate strength", () => {
    expect(calculateNodeOpacity(0.5)).toBeCloseTo(0.65, 5);
    expect(calculateNodeOpacity(0.5, 0, 1)).toBeCloseTo(0.5, 5);
  });

  it("should be monotonically increasing with strength", () => {
    const opacities = [0, 0.25, 0.5, 0.75, 1].map((s) => calculateNodeOpacity(s));
    for (let i = 1; i < opacities.length; i++) {
      const current = opacities[i];
      const previous = opacities[i - 1];
      expect(current).toBeDefined();
      expect(previous).toBeDefined();
      if (current === undefined || previous === undefined) continue;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it("should clamp strength values below 0", () => {
    expect(calculateNodeOpacity(-0.5)).toBe(calculateNodeOpacity(0));
  });

  it("should clamp strength values above 1", () => {
    expect(calculateNodeOpacity(1.5)).toBe(calculateNodeOpacity(1));
  });

  it("should use custom min/max opacity when provided", () => {
    expect(calculateNodeOpacity(0, 0.1, 0.8)).toBe(0.1);
    expect(calculateNodeOpacity(1, 0.1, 0.8)).toBe(0.8);
  });
});

// ============================================================================
// Edge Thickness Calculator Tests (Requirements: 3.3)
// ============================================================================

describe("calculateEdgeThickness", () => {
  it("should return minimum thickness for weight of 0", () => {
    // Default range is 0.01 to 0.05 for cleaner visual appearance
    expect(calculateEdgeThickness(0)).toBe(0.01);
    expect(calculateEdgeThickness(0, 0.01, 0.2)).toBe(0.01);
  });

  it("should return maximum thickness for weight of 1", () => {
    // Default range is 0.01 to 0.05 for cleaner visual appearance
    expect(calculateEdgeThickness(1)).toBe(0.05);
    expect(calculateEdgeThickness(1, 0.01, 0.2)).toBe(0.2);
  });

  it("should return proportional thickness for intermediate weight", () => {
    // Default range is 0.01 to 0.05, so 0.5 weight = 0.01 + 0.5 * (0.05 - 0.01) = 0.03
    expect(calculateEdgeThickness(0.5)).toBeCloseTo(0.03, 5);
    expect(calculateEdgeThickness(0.5, 0, 0.2)).toBeCloseTo(0.1, 5);
  });

  it("should be monotonically increasing with weight", () => {
    const thicknesses = [0, 0.25, 0.5, 0.75, 1].map((w) => calculateEdgeThickness(w));
    for (let i = 1; i < thicknesses.length; i++) {
      const current = thicknesses[i];
      const previous = thicknesses[i - 1];
      expect(current).toBeDefined();
      expect(previous).toBeDefined();
      if (current === undefined || previous === undefined) continue;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it("should clamp weight values below 0", () => {
    expect(calculateEdgeThickness(-0.5)).toBe(calculateEdgeThickness(0));
  });

  it("should clamp weight values above 1", () => {
    expect(calculateEdgeThickness(1.5)).toBe(calculateEdgeThickness(1));
  });

  it("should use custom min/max thickness when provided", () => {
    expect(calculateEdgeThickness(0, 0.05, 0.25)).toBe(0.05);
    expect(calculateEdgeThickness(1, 0.05, 0.25)).toBe(0.25);
  });
});

// ============================================================================
// Hub Node Detection Tests (Requirements: 39.2, 43.5)
// ============================================================================

describe("isHubNode", () => {
  it("should return false for nodes with 5 or fewer connections", () => {
    expect(isHubNode(0)).toBe(false);
    expect(isHubNode(1)).toBe(false);
    expect(isHubNode(5)).toBe(false);
  });

  it("should return true for nodes with more than 5 connections", () => {
    expect(isHubNode(6)).toBe(true);
    expect(isHubNode(10)).toBe(true);
    expect(isHubNode(100)).toBe(true);
  });
});

// ============================================================================
// Connection Count Calculator Tests (Requirements: 43.1, 43.2)
// ============================================================================

describe("calculateConnectionCounts", () => {
  it("should return empty map for empty inputs", () => {
    const counts = calculateConnectionCounts([], []);
    expect(counts.size).toBe(0);
  });

  it("should return zero counts for nodes with no edges", () => {
    const nodeIds = ["node1", "node2", "node3"];
    const counts = calculateConnectionCounts(nodeIds, []);

    expect(counts.get("node1")).toBe(0);
    expect(counts.get("node2")).toBe(0);
    expect(counts.get("node3")).toBe(0);
  });

  it("should correctly count connections from edges", () => {
    const nodeIds = ["node1", "node2", "node3"];
    const edges: GraphEdge[] = [
      { source: "node1", target: "node2", linkType: "semantic", weight: 0.5 },
      { source: "node1", target: "node3", linkType: "causal", weight: 0.7 },
    ];

    const counts = calculateConnectionCounts(nodeIds, edges);

    expect(counts.get("node1")).toBe(2); // Connected to node2 and node3
    expect(counts.get("node2")).toBe(1); // Connected to node1
    expect(counts.get("node3")).toBe(1); // Connected to node1
  });

  it("should count bidirectional edges correctly", () => {
    const nodeIds = ["node1", "node2"];
    const edges: GraphEdge[] = [
      { source: "node1", target: "node2", linkType: "semantic", weight: 0.5 },
      { source: "node2", target: "node1", linkType: "semantic", weight: 0.5 },
    ];

    const counts = calculateConnectionCounts(nodeIds, edges);

    expect(counts.get("node1")).toBe(2);
    expect(counts.get("node2")).toBe(2);
  });

  it("should ignore edges with unknown node IDs", () => {
    const nodeIds = ["node1", "node2"];
    const edges: GraphEdge[] = [
      { source: "node1", target: "unknown", linkType: "semantic", weight: 0.5 },
    ];

    const counts = calculateConnectionCounts(nodeIds, edges);

    expect(counts.get("node1")).toBe(1);
    expect(counts.get("node2")).toBe(0);
    expect(counts.has("unknown")).toBe(false);
  });
});

// ============================================================================
// Radial Neighbor Positions Tests (Requirements: 43.2)
// =======================================================================

describe("calculateRadialNeighborPositions", () => {
  it("should position hub at center", () => {
    const positions = calculateRadialNeighborPositions("hub", ["n1", "n2"]);
    const hubPos = positions.get("hub");

    expect(hubPos).toBeDefined();
    expect(hubPos?.[0]).toBe(0);
    expect(hubPos?.[2]).toBe(0);
  });

  it("should return only hub position when no neighbors", () => {
    const positions = calculateRadialNeighborPositions("hub", []);

    expect(positions.size).toBe(1);
    expect(positions.has("hub")).toBe(true);
  });

  it("should distribute neighbors evenly in a circle", () => {
    const neighborIds = ["n1", "n2", "n3", "n4"];
    const positions = calculateRadialNeighborPositions("hub", neighborIds, { radius: 6 });

    // All neighbors should be at the same distance from center
    for (const id of neighborIds) {
      const pos = positions.get(id);
      expect(pos).toBeDefined();
      if (!pos) continue;

      const distance = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]);
      expect(distance).toBeCloseTo(6, 1);
    }
  });

  it("should position neighbors at equal angular intervals", () => {
    const neighborIds = ["n1", "n2", "n3", "n4"];
    const positions = calculateRadialNeighborPositions("hub", neighborIds, {
      radius: 6,
      addYVariation: false,
    });

    // Calculate angles for each neighbor
    const angles: number[] = [];
    for (const id of neighborIds) {
      const pos = positions.get(id);
      if (!pos) continue;
      angles.push(Math.atan2(pos[2], pos[0]));
    }

    // Check that angles are evenly spaced (90 degrees apart for 4 neighbors)
    const expectedAngleDiff = (2 * Math.PI) / 4;
    for (let i = 1; i < angles.length; i++) {
      const currentAngle = angles[i];
      const prevAngle = angles[i - 1];
      if (currentAngle === undefined || prevAngle === undefined) continue;
      let diff = currentAngle - prevAngle;
      // Normalize to positive
      if (diff < 0) diff += 2 * Math.PI;
      expect(diff).toBeCloseTo(expectedAngleDiff, 1);
    }
  });

  it("should respect custom radius", () => {
    const positions = calculateRadialNeighborPositions("hub", ["n1"], { radius: 10 });
    const pos = positions.get("n1");

    expect(pos).toBeDefined();
    if (!pos) return;

    const distance = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]);
    expect(distance).toBeCloseTo(10, 1);
  });

  it("should respect yOffset configuration", () => {
    const positions = calculateRadialNeighborPositions("hub", ["n1"], {
      yOffset: 5,
      addYVariation: false,
    });

    const hubPos = positions.get("hub");
    const neighborPos = positions.get("n1");

    expect(hubPos?.[1]).toBe(5);
    expect(neighborPos?.[1]).toBe(5);
  });
});

// ============================================================================
// Hub-Centric Positions Tests (Requirements: 43.1)
// ============================================================================

describe("calculateHubCentricPositions", () => {
  it("should return empty map for empty nodes", () => {
    const positions = calculateHubCentricPositions([]);
    expect(positions.size).toBe(0);
  });

  it("should position hub nodes more centrally than non-hub nodes", () => {
    const nodes = [
      { id: "hub1", connectionCount: 10 }, // Hub
      { id: "regular1", connectionCount: 2 }, // Non-hub
      { id: "regular2", connectionCount: 3 }, // Non-hub
    ];

    const positions = calculateHubCentricPositions(nodes);

    const hubPos = positions.get("hub1");
    const reg1Pos = positions.get("regular1");
    const reg2Pos = positions.get("regular2");

    expect(hubPos).toBeDefined();
    expect(reg1Pos).toBeDefined();
    expect(reg2Pos).toBeDefined();

    if (!hubPos || !reg1Pos || !reg2Pos) return;

    // Hub should be at or very close to center (X=0, Z=0)
    // Using full 3D distance for hub
    const hubDist = Math.sqrt(hubPos[0] ** 2 + hubPos[2] ** 2);
    expect(hubDist).toBeCloseTo(0, 1);

    // Non-hub nodes should be on the outer sphere (further from center)
    // Using full 3D distance for regular nodes
    const reg1Dist = Math.sqrt(reg1Pos[0] ** 2 + reg1Pos[1] ** 2 + reg1Pos[2] ** 2);
    const reg2Dist = Math.sqrt(reg2Pos[0] ** 2 + reg2Pos[1] ** 2 + reg2Pos[2] ** 2);

    // Regular nodes should be at the outer radius (default 5)
    expect(reg1Dist).toBeGreaterThan(0);
    expect(reg2Dist).toBeGreaterThan(0);
  });

  it("should prioritize current node as primary hub when specified", () => {
    const nodes = [
      { id: "hub1", connectionCount: 10 },
      { id: "hub2", connectionCount: 15 }, // More connections but not current
    ];

    const positions = calculateHubCentricPositions(nodes, "hub1", {
      prioritizeCurrentNode: true,
    });

    const hub1Pos = positions.get("hub1");
    const hub2Pos = positions.get("hub2");

    expect(hub1Pos).toBeDefined();
    expect(hub2Pos).toBeDefined();

    if (!hub1Pos || !hub2Pos) return;

    // hub1 should be at center (0, y, 0) since it's the current node
    expect(hub1Pos[0]).toBeCloseTo(0, 1);
    expect(hub1Pos[2]).toBeCloseTo(0, 1);
  });

  it("should use most connected hub as primary when no current node", () => {
    const nodes = [
      { id: "hub1", connectionCount: 10 },
      { id: "hub2", connectionCount: 15 }, // Most connected
    ];

    const positions = calculateHubCentricPositions(nodes, undefined, {
      prioritizeCurrentNode: false,
    });

    const hub2Pos = positions.get("hub2");

    expect(hub2Pos).toBeDefined();
    if (!hub2Pos) return;

    // hub2 should be at center since it has most connections
    expect(hub2Pos[0]).toBeCloseTo(0, 1);
    expect(hub2Pos[2]).toBeCloseTo(0, 1);
  });
});

// ============================================================================
// Hub-and-Spoke Positions Tests (Requirements: 43.1, 43.2)
// ============================================================================

describe("calculateHubAndSpokePositions", () => {
  it("should use radial layout when current node is a hub", () => {
    const positions = calculateHubAndSpokePositions("hub", 10, ["n1", "n2", "n3"]);

    // Hub should be at center
    const hubPos = positions.get("hub");
    expect(hubPos).toBeDefined();
    expect(hubPos?.[0]).toBe(0);
    expect(hubPos?.[1]).toBe(0);
    expect(hubPos?.[2]).toBe(0);

    // Neighbors should be arranged radially
    for (const id of ["n1", "n2", "n3"]) {
      const pos = positions.get(id);
      expect(pos).toBeDefined();
      if (!pos) continue;

      const distance = Math.sqrt(pos[0] ** 2 + pos[2] ** 2);
      expect(distance).toBeGreaterThan(0);
    }
  });

  it("should use Fibonacci sphere when current node is not a hub", () => {
    const positions = calculateHubAndSpokePositions("regular", 3, ["n1", "n2", "n3"]);

    // Current node should be at center
    const currentPos = positions.get("regular");
    expect(currentPos).toBeDefined();
    expect(currentPos?.[0]).toBe(0);
    expect(currentPos?.[1]).toBe(0);
    expect(currentPos?.[2]).toBe(0);

    // Neighbors should be on sphere surface
    for (const id of ["n1", "n2", "n3"]) {
      const pos = positions.get(id);
      expect(pos).toBeDefined();
    }
  });

  it("should use radial layout when forceRadial is true", () => {
    const positions = calculateHubAndSpokePositions("regular", 2, ["n1", "n2"], {
      forceRadial: true,
    });

    // Should use radial layout even though connection count is low
    const currentPos = positions.get("regular");
    expect(currentPos).toBeDefined();
    expect(currentPos?.[0]).toBe(0);
    expect(currentPos?.[2]).toBe(0);
  });

  it("should respect custom radius", () => {
    const positions = calculateHubAndSpokePositions("hub", 10, ["n1"], { radius: 10 });

    const neighborPos = positions.get("n1");
    expect(neighborPos).toBeDefined();
    if (!neighborPos) return;

    const distance = Math.sqrt(neighborPos[0] ** 2 + neighborPos[2] ** 2);
    expect(distance).toBeCloseTo(10, 1);
  });

  it("should handle empty neighbor list", () => {
    const positions = calculateHubAndSpokePositions("hub", 10, []);

    expect(positions.size).toBe(1);
    expect(positions.has("hub")).toBe(true);
  });
});

// ============================================================================
// Hub Edge Enhancement Tests (Requirements: 43.3)
// ============================================================================

describe("calculateHubEdgeThickness", () => {
  it("should return base thickness for non-hub connections", () => {
    const baseThickness = calculateEdgeThickness(0.5);
    const hubEdgeThickness = calculateHubEdgeThickness(0.5, false);

    expect(hubEdgeThickness).toBe(baseThickness);
  });

  it("should return thicker edges for hub connections", () => {
    const baseThickness = calculateEdgeThickness(0.5);
    const hubEdgeThickness = calculateHubEdgeThickness(0.5, true);

    expect(hubEdgeThickness).toBeGreaterThan(baseThickness);
  });

  it("should apply multiplier consistently across weight values", () => {
    const weights = [0, 0.25, 0.5, 0.75, 1];

    for (const weight of weights) {
      const baseThickness = calculateEdgeThickness(weight);
      const hubEdgeThickness = calculateHubEdgeThickness(weight, true);

      // Hub edges should be thicker than base
      expect(hubEdgeThickness).toBeGreaterThan(baseThickness);
      // The ratio should be consistent (1.8x multiplier)
      expect(hubEdgeThickness / baseThickness).toBeCloseTo(1.8, 1);
    }
  });

  it("should be monotonically increasing with weight for hub connections", () => {
    const thicknesses = [0, 0.25, 0.5, 0.75, 1].map((w) => calculateHubEdgeThickness(w, true));

    for (let i = 1; i < thicknesses.length; i++) {
      const current = thicknesses[i];
      const previous = thicknesses[i - 1];
      expect(current).toBeDefined();
      expect(previous).toBeDefined();
      if (current === undefined || previous === undefined) continue;
      expect(current).toBeGreaterThan(previous);
    }
  });

  it("should use custom min/max thickness when provided", () => {
    const hubThickness = calculateHubEdgeThickness(0.5, true, 0.1, 0.3);
    const baseThickness = calculateEdgeThickness(0.5, 0.1, 0.3);

    expect(hubThickness).toBeGreaterThan(baseThickness);
  });
});

describe("getHubEdgeEmissiveMultiplier", () => {
  it("should return 1.0 for non-hub connections", () => {
    expect(getHubEdgeEmissiveMultiplier(false)).toBe(1.0);
  });

  it("should return multiplier greater than 1.0 for hub connections", () => {
    const multiplier = getHubEdgeEmissiveMultiplier(true);
    expect(multiplier).toBeGreaterThan(1.0);
  });

  it("should return consistent value for hub connections", () => {
    // Call multiple times to ensure consistency
    const multiplier1 = getHubEdgeEmissiveMultiplier(true);
    const multiplier2 = getHubEdgeEmissiveMultiplier(true);
    expect(multiplier1).toBe(multiplier2);
    expect(multiplier1).toBe(1.5); // Expected multiplier value
  });
});

describe("getHubEdgeGlowMultiplier", () => {
  it("should return 1.0 for non-hub connections", () => {
    expect(getHubEdgeGlowMultiplier(false)).toBe(1.0);
  });

  it("should return multiplier greater than 1.0 for hub connections", () => {
    const multiplier = getHubEdgeGlowMultiplier(true);
    expect(multiplier).toBeGreaterThan(1.0);
  });

  it("should return consistent value for hub connections", () => {
    // Call multiple times to ensure consistency
    const multiplier1 = getHubEdgeGlowMultiplier(true);
    const multiplier2 = getHubEdgeGlowMultiplier(true);
    expect(multiplier1).toBe(multiplier2);
    expect(multiplier1).toBe(1.4); // Expected multiplier value
  });
});
