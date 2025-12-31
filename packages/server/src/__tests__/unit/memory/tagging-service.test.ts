/**
 * Tagging Service - Unit Tests
 *
 * Tests for TaggingService class following TDD principles.
 * These tests validate tag CRUD operations, search with AND/OR operators,
 * and hierarchical tag path support.
 *
 * Requirements: 5.1 (tag CRUD), 5.2 (search operators), 5.5 (hierarchical tags)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaggingError, TaggingService } from "../../../memory/tagging-service";

// Mock database connection manager
const createMockDb = () => ({
  getConnection: vi.fn(),
  releaseConnection: vi.fn(),
  beginTransaction: vi.fn(),
  commitTransaction: vi.fn(),
  rollbackTransaction: vi.fn(),
});

// Mock pool client
const createMockClient = () => ({
  query: vi.fn(),
  release: vi.fn(),
});

describe("TaggingService - Unit Tests", () => {
  let service: TaggingService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockClient = createMockClient();
    mockDb.getConnection.mockResolvedValue(mockClient);
    mockDb.beginTransaction.mockResolvedValue(mockClient);
    service = new TaggingService(mockDb as any);
  });

  describe("addTags (Requirement 5.1)", () => {
    it("should add tags to a memory", async () => {
      // Memory exists
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] }) // Memory check
        .mockResolvedValueOnce({ rows: [] }) // Tag doesn't exist
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] }) // Create tag
        .mockResolvedValueOnce({ rows: [] }); // Create association

      await service.addTags("memory-1", "user-1", ["work"]);

      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(4);
    });

    it("should handle multiple tags", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] }) // Memory check
        .mockResolvedValueOnce({ rows: [] }) // Tag 1 doesn't exist
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] }) // Create tag 1
        .mockResolvedValueOnce({ rows: [] }) // Create association 1
        .mockResolvedValueOnce({ rows: [] }) // Tag 2 doesn't exist
        .mockResolvedValueOnce({ rows: [{ id: "tag-2" }] }) // Create tag 2
        .mockResolvedValueOnce({ rows: [] }); // Create association 2

      await service.addTags("memory-1", "user-1", ["work", "important"]);

      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should reuse existing tags", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] }) // Memory check
        .mockResolvedValueOnce({ rows: [{ id: "existing-tag" }] }) // Tag exists
        .mockResolvedValueOnce({ rows: [] }); // Create association

      await service.addTags("memory-1", "user-1", ["existing"]);

      // Should not create a new tag
      expect(mockClient.query).toHaveBeenCalledTimes(3);
    });

    it("should throw error if memory not found", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Memory not found

      await expect(service.addTags("nonexistent", "user-1", ["tag"])).rejects.toThrow(TaggingError);
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });

    it("should throw error if memoryId is missing", async () => {
      await expect(service.addTags("", "user-1", ["tag"])).rejects.toThrow(TaggingError);
    });

    it("should throw error if userId is missing", async () => {
      await expect(service.addTags("memory-1", "", ["tag"])).rejects.toThrow(TaggingError);
    });

    it("should do nothing if tags array is empty", async () => {
      await service.addTags("memory-1", "user-1", []);

      expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    });

    it("should normalize tag paths", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.addTags("memory-1", "user-1", ["  Work/Projects  "]);

      // Should normalize to "work/projects"
      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        "user-1",
        "work/projects",
      ]);
    });
  });

  describe("removeTags (Requirement 5.1)", () => {
    it("should remove tags from a memory", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] }) // Memory check
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] }) // Find tag
        .mockResolvedValueOnce({ rows: [] }); // Delete association

      await service.removeTags("memory-1", "user-1", ["work"]);

      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should handle non-existent tags gracefully", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] }) // Memory check
        .mockResolvedValueOnce({ rows: [] }); // Tag not found

      await service.removeTags("memory-1", "user-1", ["nonexistent"]);

      expect(mockDb.commitTransaction).toHaveBeenCalled();
    });

    it("should throw error if memory not found", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.removeTags("nonexistent", "user-1", ["tag"])).rejects.toThrow(
        TaggingError
      );
    });

    it("should do nothing if tags array is empty", async () => {
      await service.removeTags("memory-1", "user-1", []);

      expect(mockDb.beginTransaction).not.toHaveBeenCalled();
    });
  });

  describe("getTags (Requirement 5.1)", () => {
    it("should return tags for a memory", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] }) // Memory check
        .mockResolvedValueOnce({
          rows: [
            { id: "tag-1", name: "work", path: "work", color: "#FF0000", created_at: new Date() },
            {
              id: "tag-2",
              name: "alpha",
              path: "work/projects/alpha",
              color: null,
              created_at: new Date(),
            },
          ],
        });

      const tags = await service.getTags("memory-1", "user-1");

      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe("work");
      expect(tags[0].path).toBe("work");
      expect(tags[0].color).toBe("#FF0000");
      expect(tags[1].path).toBe("work/projects/alpha");
    });

    it("should return empty array if memory has no tags", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] })
        .mockResolvedValueOnce({ rows: [] });

      const tags = await service.getTags("memory-1", "user-1");

      expect(tags).toHaveLength(0);
    });

    it("should throw error if memory not found", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getTags("nonexistent", "user-1")).rejects.toThrow(TaggingError);
    });
  });

  describe("searchByTags with OR operator (Requirement 5.2)", () => {
    it("should return memories with any of the specified tags", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "memory-1",
            content: "Test content 1",
            created_at: new Date(),
            last_accessed: new Date(),
            access_count: 0,
            salience: "0.5",
            decay_rate: "0.01",
            strength: "1.0",
            user_id: "user-1",
            session_id: "session-1",
            primary_sector: "semantic",
            keywords: [],
            tags: [],
            category: null,
            context: null,
            importance: null,
            is_atomic: true,
            parent_id: null,
          },
          {
            id: "memory-2",
            content: "Test content 2",
            created_at: new Date(),
            last_accessed: new Date(),
            access_count: 0,
            salience: "0.5",
            decay_rate: "0.01",
            strength: "1.0",
            user_id: "user-1",
            session_id: "session-1",
            primary_sector: "episodic",
            keywords: [],
            tags: [],
            category: null,
            context: null,
            importance: null,
            is_atomic: true,
            parent_id: null,
          },
        ],
      });

      const memories = await service.searchByTags("user-1", ["work", "personal"], "OR");

      expect(memories).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("ANY"),
        expect.arrayContaining(["user-1", ["work", "personal"]])
      );
    });

    it("should return empty array if no tags provided", async () => {
      const memories = await service.searchByTags("user-1", [], "OR");

      expect(memories).toHaveLength(0);
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe("searchByTags with AND operator (Requirement 5.2)", () => {
    it("should return memories with all specified tags", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "memory-1",
            content: "Test content",
            created_at: new Date(),
            last_accessed: new Date(),
            access_count: 0,
            salience: "0.5",
            decay_rate: "0.01",
            strength: "1.0",
            user_id: "user-1",
            session_id: "session-1",
            primary_sector: "semantic",
            keywords: [],
            tags: [],
            category: null,
            context: null,
            importance: null,
            is_atomic: true,
            parent_id: null,
          },
        ],
      });

      const memories = await service.searchByTags("user-1", ["work", "important"], "AND");

      expect(memories).toHaveLength(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("HAVING COUNT"),
        expect.arrayContaining(["user-1", ["work", "important"], 2])
      );
    });
  });

  describe("searchByTagPrefix (Requirement 5.5)", () => {
    it("should return memories with tags matching prefix", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          {
            id: "memory-1",
            content: "Test content",
            created_at: new Date(),
            last_accessed: new Date(),
            access_count: 0,
            salience: "0.5",
            decay_rate: "0.01",
            strength: "1.0",
            user_id: "user-1",
            session_id: "session-1",
            primary_sector: "semantic",
            keywords: [],
            tags: [],
            category: null,
            context: null,
            importance: null,
            is_atomic: true,
            parent_id: null,
          },
        ],
      });

      const memories = await service.searchByTagPrefix("user-1", "work");

      expect(memories).toHaveLength(1);
      // Should search for exact match OR prefix match
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining("LIKE"), [
        "user-1",
        "work",
        "work/%",
      ]);
    });

    it("should return empty array for empty prefix", async () => {
      const memories = await service.searchByTagPrefix("user-1", "");

      expect(memories).toHaveLength(0);
    });
  });

  describe("getAllTags", () => {
    it("should return all tags for a user", async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { id: "tag-1", name: "work", path: "work", color: null, created_at: new Date() },
          {
            id: "tag-2",
            name: "projects",
            path: "work/projects",
            color: "#00FF00",
            created_at: new Date(),
          },
        ],
      });

      const tags = await service.getAllTags("user-1");

      expect(tags).toHaveLength(2);
      expect(tags[0].path).toBe("work");
      expect(tags[1].path).toBe("work/projects");
    });

    it("should throw error if userId is missing", async () => {
      await expect(service.getAllTags("")).rejects.toThrow(TaggingError);
    });
  });

  describe("Path normalization", () => {
    it("should normalize paths to lowercase", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.addTags("memory-1", "user-1", ["WORK"]);

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), ["user-1", "work"]);
    });

    it("should remove leading and trailing slashes", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.addTags("memory-1", "user-1", ["/work/projects/"]);

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        "user-1",
        "work/projects",
      ]);
    });

    it("should collapse multiple slashes", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] })
        .mockResolvedValueOnce({ rows: [] });

      await service.addTags("memory-1", "user-1", ["work//projects///alpha"]);

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        "user-1",
        "work/projects/alpha",
      ]);
    });

    it("should skip empty paths after normalization", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: "memory-1" }] });

      await service.addTags("memory-1", "user-1", ["   ", "///"]);

      // Should only have the memory check query, no tag operations
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handling", () => {
    it("should rollback transaction on database error during addTags", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] })
        .mockRejectedValueOnce(new Error("Database error"));

      await expect(service.addTags("memory-1", "user-1", ["tag"])).rejects.toThrow(TaggingError);
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });

    it("should rollback transaction on database error during removeTags", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "memory-1" }] })
        .mockRejectedValueOnce(new Error("Database error"));

      await expect(service.removeTags("memory-1", "user-1", ["tag"])).rejects.toThrow(TaggingError);
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("getTagStats (Requirement 5.6)", () => {
    it("should return tag statistics with memory counts", async () => {
      const now = new Date();
      mockClient.query.mockResolvedValueOnce({
        rows: [
          { tag: "work", memory_count: "5", last_used: now },
          { tag: "work/projects", memory_count: "3", last_used: now },
          { tag: "personal", memory_count: "0", last_used: now },
        ],
      });

      const stats = await service.getTagStats("user-1");

      expect(stats).toHaveLength(3);
      expect(stats[0].tag).toBe("work");
      expect(stats[0].memoryCount).toBe(5);
      expect(stats[0].lastUsed).toBeInstanceOf(Date);
      expect(stats[1].tag).toBe("work/projects");
      expect(stats[1].memoryCount).toBe(3);
      expect(stats[2].tag).toBe("personal");
      expect(stats[2].memoryCount).toBe(0);
    });

    it("should return empty array if user has no tags", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const stats = await service.getTagStats("user-1");

      expect(stats).toHaveLength(0);
    });

    it("should throw error if userId is missing", async () => {
      await expect(service.getTagStats("")).rejects.toThrow(TaggingError);
    });

    it("should throw TaggingError on database error", async () => {
      mockClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(service.getTagStats("user-1")).rejects.toThrow(TaggingError);
    });
  });

  describe("deleteTag (Requirement 5.4)", () => {
    it("should delete tag and cascade remove from all memories", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] }) // Tag check
        .mockResolvedValueOnce({ rows: [] }) // Delete associations
        .mockResolvedValueOnce({ rows: [] }); // Delete tag

      await service.deleteTag("user-1", "tag-1");

      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commitTransaction).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(3);

      // Verify associations are deleted first
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        "DELETE FROM memory_tag_associations WHERE tag_id = $1",
        ["tag-1"]
      );

      // Verify tag is deleted
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
        "DELETE FROM memory_tags WHERE id = $1 AND user_id = $2",
        ["tag-1", "user-1"]
      );
    });

    it("should throw error if tag not found", async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // Tag not found

      await expect(service.deleteTag("user-1", "nonexistent")).rejects.toThrow(TaggingError);
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });

    it("should throw error if userId is missing", async () => {
      await expect(service.deleteTag("", "tag-1")).rejects.toThrow(TaggingError);
    });

    it("should throw error if tagId is missing", async () => {
      await expect(service.deleteTag("user-1", "")).rejects.toThrow(TaggingError);
    });

    it("should rollback transaction on database error", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: "tag-1" }] }) // Tag check
        .mockRejectedValueOnce(new Error("Database error")); // Delete associations fails

      await expect(service.deleteTag("user-1", "tag-1")).rejects.toThrow(TaggingError);
      expect(mockDb.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
