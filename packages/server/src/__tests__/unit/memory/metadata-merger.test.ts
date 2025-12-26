/**
 * Metadata Merger - Unit Tests
 *
 * Tests for MetadataMerger class following TDD principles.
 * These tests validate specific examples and edge cases for metadata merge operations.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  createMetadataMerger,
  MetadataMerger,
  MetadataUpdate,
} from "../../../memory/metadata-merger";
import { MemoryMetadata } from "../../../memory/types";

describe("MetadataMerger - Unit Tests", () => {
  let merger: MetadataMerger;

  const createBaseMetadata = (): MemoryMetadata => ({
    keywords: ["test", "memory"],
    tags: ["important", "work"],
    category: "general",
    context: "test context",
    importance: 0.5,
    isAtomic: true,
    parentId: undefined,
  });

  beforeEach(() => {
    merger = new MetadataMerger();
  });

  describe("Partial field update (Requirement 9.1)", () => {
    it("should merge partial update with existing metadata", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: "updated-category",
      };

      const result = merger.merge(existing, update);

      expect(result.merged.category).toBe("updated-category");
      expect(result.merged.keywords).toEqual(["test", "memory"]);
      expect(result.merged.tags).toEqual(["important", "work"]);
      expect(result.merged.importance).toBe(0.5);
    });

    it("should track updated fields correctly", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: "new-category",
        importance: 0.8,
      };

      const result = merger.merge(existing, update);

      expect(result.updatedFields).toContain("category");
      expect(result.updatedFields).toContain("importance");
      expect(result.updatedFields).toHaveLength(2);
    });

    it("should preserve fields not in update", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: "new-category",
      };

      const result = merger.merge(existing, update);

      expect(result.preservedFields).toContain("keywords");
      expect(result.preservedFields).toContain("tags");
      expect(result.preservedFields).toContain("context");
      expect(result.preservedFields).toContain("importance");
      expect(result.preservedFields).toContain("isAtomic");
    });
  });

  describe("Field replacement (Requirement 9.2)", () => {
    it("should replace existing field with new value", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        keywords: ["new", "keywords", "list"],
      };

      const result = merger.merge(existing, update);

      expect(result.merged.keywords).toEqual(["new", "keywords", "list"]);
      expect(result.updatedFields).toContain("keywords");
    });

    it("should replace array field completely", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        tags: ["single-tag"],
      };

      const result = merger.merge(existing, update);

      expect(result.merged.tags).toEqual(["single-tag"]);
      expect(result.merged.tags).not.toContain("important");
      expect(result.merged.tags).not.toContain("work");
    });

    it("should replace numeric field", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        importance: 0.9,
      };

      const result = merger.merge(existing, update);

      expect(result.merged.importance).toBe(0.9);
    });

    it("should replace boolean field", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        isAtomic: false,
      };

      const result = merger.merge(existing, update);

      expect(result.merged.isAtomic).toBe(false);
    });
  });

  describe("New field addition (Requirement 9.3)", () => {
    it("should add new field to existing metadata", () => {
      const existing: MemoryMetadata = {
        keywords: ["test"],
        importance: 0.5,
      };
      const update: MetadataUpdate = {
        category: "new-category",
        context: "new context",
      };

      const result = merger.merge(existing, update);

      expect(result.merged.category).toBe("new-category");
      expect(result.merged.context).toBe("new context");
      expect(result.addedFields).toContain("category");
      expect(result.addedFields).toContain("context");
    });

    it("should track added fields separately from updated fields", () => {
      const existing: MemoryMetadata = {
        keywords: ["test"],
      };
      const update: MetadataUpdate = {
        keywords: ["updated"],
        category: "new-category",
      };

      const result = merger.merge(existing, update);

      expect(result.updatedFields).toContain("keywords");
      expect(result.addedFields).toContain("category");
      expect(result.updatedFields).not.toContain("category");
      expect(result.addedFields).not.toContain("keywords");
    });
  });

  describe("Null field removal (Requirement 9.4)", () => {
    it("should remove field when set to null", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: null,
      };

      const result = merger.merge(existing, update);

      expect(result.merged.category).toBeUndefined();
      expect(result.removedFields).toContain("category");
    });

    it("should remove multiple fields when set to null", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: null,
        context: null,
      };

      const result = merger.merge(existing, update);

      expect(result.merged.category).toBeUndefined();
      expect(result.merged.context).toBeUndefined();
      expect(result.removedFields).toContain("category");
      expect(result.removedFields).toContain("context");
    });

    it("should ignore null for non-existent field", () => {
      const existing: MemoryMetadata = {
        keywords: ["test"],
      };
      const update: MetadataUpdate = {
        category: null,
      };

      const result = merger.merge(existing, update);

      expect(result.removedFields).not.toContain("category");
      expect(result.merged.category).toBeUndefined();
    });

    it("should handle mix of null and value updates", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: null,
        importance: 0.9,
        context: "new context",
      };

      const result = merger.merge(existing, update);

      expect(result.merged.category).toBeUndefined();
      expect(result.merged.importance).toBe(0.9);
      expect(result.merged.context).toBe("new context");
      expect(result.removedFields).toContain("category");
      expect(result.updatedFields).toContain("importance");
      expect(result.updatedFields).toContain("context");
    });
  });

  describe("Empty update preservation (Requirement 9.5)", () => {
    it("should preserve all fields when update is empty", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {};

      const result = merger.merge(existing, update);

      expect(result.merged).toEqual(existing);
      expect(result.updatedFields).toHaveLength(0);
      expect(result.removedFields).toHaveLength(0);
      expect(result.addedFields).toHaveLength(0);
    });

    it("should track all fields as preserved for empty update", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {};

      const result = merger.merge(existing, update);

      expect(result.preservedFields).toContain("keywords");
      expect(result.preservedFields).toContain("tags");
      expect(result.preservedFields).toContain("category");
      expect(result.preservedFields).toContain("context");
      expect(result.preservedFields).toContain("importance");
      expect(result.preservedFields).toContain("isAtomic");
    });
  });

  describe("hasChanges method", () => {
    it("should return false for empty update", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {};

      expect(merger.hasChanges(existing, update)).toBe(false);
    });

    it("should return true when field is updated", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: "new-category",
      };

      expect(merger.hasChanges(existing, update)).toBe(true);
    });

    it("should return true when field is removed", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: null,
      };

      expect(merger.hasChanges(existing, update)).toBe(true);
    });

    it("should return false when update value equals existing", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: "general",
        importance: 0.5,
      };

      expect(merger.hasChanges(existing, update)).toBe(false);
    });

    it("should return false when removing non-existent field", () => {
      const existing: MemoryMetadata = {
        keywords: ["test"],
      };
      const update: MetadataUpdate = {
        category: null,
      };

      expect(merger.hasChanges(existing, update)).toBe(false);
    });

    it("should detect array changes", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        keywords: ["different", "keywords"],
      };

      expect(merger.hasChanges(existing, update)).toBe(true);
    });

    it("should return false for identical arrays", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        keywords: ["test", "memory"],
      };

      expect(merger.hasChanges(existing, update)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty existing metadata", () => {
      const existing: MemoryMetadata = {};
      const update: MetadataUpdate = {
        category: "new-category",
        keywords: ["new"],
      };

      const result = merger.merge(existing, update);

      expect(result.merged.category).toBe("new-category");
      expect(result.merged.keywords).toEqual(["new"]);
      expect(result.addedFields).toContain("category");
      expect(result.addedFields).toContain("keywords");
    });

    it("should handle undefined values in update (ignored)", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        category: undefined,
        importance: 0.9,
      };

      const result = merger.merge(existing, update);

      expect(result.merged.category).toBe("general");
      expect(result.merged.importance).toBe(0.9);
      expect(result.preservedFields).toContain("category");
      expect(result.updatedFields).toContain("importance");
    });

    it("should handle empty arrays", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        keywords: [],
        tags: [],
      };

      const result = merger.merge(existing, update);

      expect(result.merged.keywords).toEqual([]);
      expect(result.merged.tags).toEqual([]);
    });

    it("should handle parentId field", () => {
      const existing = createBaseMetadata();
      const update: MetadataUpdate = {
        parentId: "parent-123",
      };

      const result = merger.merge(existing, update);

      expect(result.merged.parentId).toBe("parent-123");
    });
  });

  describe("Factory function", () => {
    it("should create merger instance", () => {
      const factoryMerger = createMetadataMerger();

      expect(factoryMerger).toBeInstanceOf(MetadataMerger);
    });

    it("should create functional merger", () => {
      const factoryMerger = createMetadataMerger();
      const existing = createBaseMetadata();
      const update: MetadataUpdate = { category: "test" };

      const result = factoryMerger.merge(existing, update);

      expect(result.merged.category).toBe("test");
    });
  });
});
