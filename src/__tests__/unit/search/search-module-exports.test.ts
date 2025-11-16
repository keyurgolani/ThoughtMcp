/**
 * Tests for search module exports
 *
 * Verifies that all search components are properly exported from the module.
 */

import { describe, it, expect } from "vitest";

describe("Search Module Exports", () => {
  it("should export FullTextSearchEngine", async () => {
    const { FullTextSearchEngine } = await import("../../../search/index");
    expect(FullTextSearchEngine).toBeDefined();
    expect(typeof FullTextSearchEngine).toBe("function");
  });

  it("should export MemorySearchEngine", async () => {
    const { MemorySearchEngine } = await import("../../../search/index");
    expect(MemorySearchEngine).toBeDefined();
    expect(typeof MemorySearchEngine).toBe("function");
  });

  it("should export MetadataFilterEngine", async () => {
    const { MetadataFilterEngine } = await import("../../../search/index");
    expect(MetadataFilterEngine).toBeDefined();
    expect(typeof MetadataFilterEngine).toBe("function");
  });

  it("should export QueryParser", async () => {
    const { QueryParser } = await import("../../../search/index");
    expect(QueryParser).toBeDefined();
    expect(typeof QueryParser).toBe("function");
  });

  it("should export ResultCache", async () => {
    const { ResultCache } = await import("../../../search/index");
    expect(ResultCache).toBeDefined();
    expect(typeof ResultCache).toBe("function");
  });

  it("should export SimilarMemoryFinder", async () => {
    const { SimilarMemoryFinder } = await import("../../../search/index");
    expect(SimilarMemoryFinder).toBeDefined();
    expect(typeof SimilarMemoryFinder).toBe("function");
  });

  it("should export VectorSearchEngine", async () => {
    const { VectorSearchEngine } = await import("../../../search/index");
    expect(VectorSearchEngine).toBeDefined();
    expect(typeof VectorSearchEngine).toBe("function");
  });

  it("should export SearchAnalyticsTracker", async () => {
    const { SearchAnalyticsTracker } = await import("../../../search/index");
    expect(SearchAnalyticsTracker).toBeDefined();
    expect(typeof SearchAnalyticsTracker).toBe("function");
  });

  it("should export integrated search types", async () => {
    const exports = await import("../../../search/index");

    // These are type exports, so we can't test them directly at runtime
    // But we can verify the module loads without errors
    expect(exports).toBeDefined();
  });

  it("should export all required types from types.ts", async () => {
    const exports = await import("../../../search/index");

    // Verify module structure
    expect(exports).toBeDefined();
    expect(Object.keys(exports).length).toBeGreaterThan(0);
  });
});
