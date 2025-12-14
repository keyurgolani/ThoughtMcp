/**
 * Property Test: Metadata Merge Preservation
 *
 * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
 *
 * This property test validates that the MetadataMerger correctly preserves
 * existing fields not included in partial updates, replaces fields that are
 * included, adds new fields, and removes fields set to null.
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
 *
 * - Requirement 9.1: WHEN metadata update contains only some fields THEN the
 *   update SHALL merge with existing metadata
 * - Requirement 9.2: WHEN metadata update contains a field that exists THEN
 *   the new value SHALL replace the old value
 * - Requirement 9.3: WHEN metadata update contains a new field THEN the field
 *   SHALL be added to existing metadata
 * - Requirement 9.5: WHEN metadata update is an empty object THEN the existing
 *   metadata SHALL remain unchanged
 *
 * @module __tests__/property/memory/metadata-merge-preservation.property.test
 */

import * as fc from "fast-check";
import { beforeEach, describe, expect, it } from "vitest";

import { MetadataMerger, MetadataUpdate } from "../../../memory/metadata-merger";
import { MemoryMetadata } from "../../../memory/types";

describe("Property 10: Metadata Merge Preservation", () => {
  let merger: MetadataMerger;

  beforeEach(() => {
    merger = new MetadataMerger();
  });

  // All possible metadata field names
  const allFields = [
    "keywords",
    "tags",
    "category",
    "context",
    "importance",
    "isAtomic",
    "parentId",
  ] as const;

  type MetadataField = (typeof allFields)[number];

  /**
   * Generate a value for a specific metadata field
   */
  const fieldValueArb = (field: MetadataField): fc.Arbitrary<unknown> => {
    switch (field) {
      case "keywords":
        return fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 });
      case "tags":
        return fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 });
      case "category":
        return fc.string({ minLength: 1, maxLength: 50 });
      case "context":
        return fc.string({ minLength: 1, maxLength: 100 });
      case "importance":
        return fc.float({ min: 0, max: 1, noNaN: true });
      case "isAtomic":
        return fc.boolean();
      case "parentId":
        return fc.uuid();
    }
  };

  /**
   * Arbitrary for generating valid MemoryMetadata objects.
   * Only includes keys that have actual values (no undefined).
   */
  const metadataArb: fc.Arbitrary<MemoryMetadata> = fc
    .subarray([...allFields], { minLength: 0 })
    .chain((selectedFields) => {
      if (selectedFields.length === 0) {
        return fc.constant({} as MemoryMetadata);
      }

      // Build a record with only the selected fields
      const arbitraries: Record<string, fc.Arbitrary<unknown>> = {};
      for (const field of selectedFields) {
        arbitraries[field] = fieldValueArb(field);
      }

      return fc.record(arbitraries) as fc.Arbitrary<MemoryMetadata>;
    });

  /**
   * Arbitrary for generating non-empty MemoryMetadata (at least one field defined)
   */
  const nonEmptyMetadataArb: fc.Arbitrary<MemoryMetadata> = fc
    .subarray([...allFields], { minLength: 1 })
    .chain((selectedFields) => {
      const arbitraries: Record<string, fc.Arbitrary<unknown>> = {};
      for (const field of selectedFields) {
        arbitraries[field] = fieldValueArb(field);
      }
      return fc.record(arbitraries) as fc.Arbitrary<MemoryMetadata>;
    });

  /**
   * Arbitrary for generating partial metadata updates.
   * Values can be actual values or null (for removal).
   * Only includes keys that are explicitly in the update.
   */
  const metadataUpdateArb: fc.Arbitrary<MetadataUpdate> = fc
    .subarray([...allFields], { minLength: 0 })
    .chain((selectedFields) => {
      if (selectedFields.length === 0) {
        return fc.constant({} as MetadataUpdate);
      }

      const arbitraries: Record<string, fc.Arbitrary<unknown>> = {};
      for (const field of selectedFields) {
        // Each field can be either a value or null (for removal)
        arbitraries[field] = fc.oneof(fieldValueArb(field), fc.constant(null));
      }

      return fc.record(arbitraries) as fc.Arbitrary<MetadataUpdate>;
    });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.5**
   *
   * For any existing metadata and an empty update, the merged result SHALL
   * be identical to the existing metadata.
   */
  describe("Empty update preservation", () => {
    it("should preserve all existing fields when update is empty", () => {
      fc.assert(
        fc.property(nonEmptyMetadataArb, (existing) => {
          const emptyUpdate: MetadataUpdate = {};
          const result = merger.merge(existing, emptyUpdate);

          // Property: Empty update SHALL preserve all existing fields
          const existingKeys = Object.keys(existing);

          for (const key of existingKeys) {
            const typedKey = key as keyof MemoryMetadata;
            expect(result.merged[typedKey]).toEqual(existing[typedKey]);
          }

          // Property: All existing fields SHALL be in preservedFields
          expect(result.preservedFields.sort()).toEqual(existingKeys.sort());

          // Property: No fields SHALL be updated, removed, or added
          expect(result.updatedFields).toHaveLength(0);
          expect(result.removedFields).toHaveLength(0);
          expect(result.addedFields).toHaveLength(0);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.1**
   *
   * For any partial update, fields not included in the update SHALL be preserved.
   */
  describe("Partial update field preservation", () => {
    it("should preserve fields not included in update", () => {
      fc.assert(
        fc.property(nonEmptyMetadataArb, metadataUpdateArb, (existing, update) => {
          const result = merger.merge(existing, update);

          // Get keys that exist in existing but are not in update
          const existingKeys = Object.keys(existing);
          const updateKeys = Object.keys(update);

          // Property: Fields not in update SHALL be preserved
          for (const key of existingKeys) {
            if (!updateKeys.includes(key)) {
              const typedKey = key as keyof MemoryMetadata;
              expect(result.merged[typedKey]).toEqual(existing[typedKey]);
              expect(result.preservedFields).toContain(key);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.2**
   *
   * For any update containing a field that exists, the new value SHALL replace
   * the old value.
   */
  describe("Field replacement", () => {
    it("should replace existing fields with new values", () => {
      fc.assert(
        fc.property(nonEmptyMetadataArb, metadataUpdateArb, (existing, update) => {
          const result = merger.merge(existing, update);

          const existingKeys = new Set(Object.keys(existing));

          for (const [key, value] of Object.entries(update)) {
            const typedKey = key as keyof MemoryMetadata;

            // Skip null values (removal, tested separately)
            if (value === null) continue;

            // Property: Non-null update values SHALL replace existing values
            expect(result.merged[typedKey]).toEqual(value);

            // Property: Replaced fields SHALL be in updatedFields (if existed)
            if (existingKeys.has(key)) {
              expect(result.updatedFields).toContain(key);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.3**
   *
   * For any update containing a new field, the field SHALL be added to
   * existing metadata.
   */
  describe("New field addition", () => {
    it("should add new fields from update", () => {
      fc.assert(
        fc.property(metadataArb, metadataUpdateArb, (existing, update) => {
          const result = merger.merge(existing, update);

          const existingKeys = new Set(Object.keys(existing));

          for (const [key, value] of Object.entries(update)) {
            const typedKey = key as keyof MemoryMetadata;

            // Skip null values (removal, tested separately)
            if (value === null) continue;

            // Property: New fields SHALL be added to merged result
            expect(result.merged[typedKey]).toEqual(value);

            // Property: New fields SHALL be in addedFields (if didn't exist)
            if (!existingKeys.has(key)) {
              expect(result.addedFields).toContain(key);
            }
          }

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
   *
   * Invariant: The union of preservedFields, updatedFields, removedFields,
   * and addedFields SHALL equal the union of existing and update keys.
   */
  describe("Field tracking completeness", () => {
    it("should track all field changes correctly", () => {
      fc.assert(
        fc.property(nonEmptyMetadataArb, metadataUpdateArb, (existing, update) => {
          const result = merger.merge(existing, update);

          const existingKeys = new Set(Object.keys(existing));
          const updateKeys = new Set(Object.keys(update));

          // All existing keys should be tracked (preserved, updated, or removed)
          for (const key of existingKeys) {
            const isTracked =
              result.preservedFields.includes(key) ||
              result.updatedFields.includes(key) ||
              result.removedFields.includes(key);
            expect(isTracked).toBe(true);
          }

          // All new keys from update should be tracked (added)
          for (const key of updateKeys) {
            if (!existingKeys.has(key) && update[key as keyof MetadataUpdate] !== null) {
              expect(result.addedFields).toContain(key);
            }
          }

          // Property: No field SHALL appear in multiple tracking arrays
          const allFields = [
            ...result.preservedFields,
            ...result.updatedFields,
            ...result.removedFields,
            ...result.addedFields,
          ];
          const uniqueFields = new Set(allFields);
          expect(allFields.length).toBe(uniqueFields.size);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
   *
   * Merge operation SHALL be deterministic - same inputs always produce
   * same outputs.
   */
  describe("Deterministic merge", () => {
    it("should produce consistent results for same inputs", () => {
      fc.assert(
        fc.property(nonEmptyMetadataArb, metadataUpdateArb, (existing, update) => {
          const result1 = merger.merge(existing, update);
          const result2 = merger.merge(existing, update);

          // Property: Same inputs SHALL produce same merged result
          expect(result1.merged).toEqual(result2.merged);

          // Property: Same inputs SHALL produce same field tracking
          expect(result1.preservedFields.sort()).toEqual(result2.preservedFields.sort());
          expect(result1.updatedFields.sort()).toEqual(result2.updatedFields.sort());
          expect(result1.removedFields.sort()).toEqual(result2.removedFields.sort());
          expect(result1.addedFields.sort()).toEqual(result2.addedFields.sort());

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.1, 9.5**
   *
   * Merge SHALL not mutate the original existing metadata object.
   */
  describe("Immutability", () => {
    it("should not mutate existing metadata", () => {
      fc.assert(
        fc.property(nonEmptyMetadataArb, metadataUpdateArb, (existing, update) => {
          // Deep copy existing to compare after merge
          const existingCopy = JSON.parse(JSON.stringify(existing));

          merger.merge(existing, update);

          // Property: Original existing metadata SHALL not be mutated
          expect(existing).toEqual(existingCopy);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mcp-tool-improvements, Property 10: Metadata Merge Preservation**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
   *
   * The merged result SHALL contain exactly the expected fields:
   * - All preserved fields from existing
   * - All updated fields with new values
   * - All added fields from update
   * - No removed fields
   */
  describe("Merged result completeness", () => {
    it("should contain exactly the expected fields", () => {
      fc.assert(
        fc.property(nonEmptyMetadataArb, metadataUpdateArb, (existing, update) => {
          const result = merger.merge(existing, update);

          // Calculate expected keys in merged result
          const expectedKeys = new Set(Object.keys(existing));

          // Process update: add new keys, remove null keys
          for (const [key, value] of Object.entries(update)) {
            if (value === null) {
              expectedKeys.delete(key);
            } else {
              expectedKeys.add(key);
            }
          }

          // Property: Merged result SHALL have exactly expected keys
          const mergedKeys = new Set(Object.keys(result.merged));

          expect(mergedKeys).toEqual(expectedKeys);

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
