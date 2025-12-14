/**
 * Metadata Merger
 *
 * Handles partial metadata updates by merging new values with existing metadata.
 * Supports field preservation, replacement, and removal (via null values).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { MemoryMetadata } from "./types.js";

/**
 * Partial metadata update input
 * - undefined: field not included in update (preserve existing)
 * - null: explicitly remove the field
 * - value: replace with new value
 */
export type MetadataUpdate = {
  [K in keyof MemoryMetadata]?: MemoryMetadata[K] | null;
};

/**
 * Result of metadata merge operation
 */
export interface MetadataMergeResult {
  /** The merged metadata object */
  merged: MemoryMetadata;
  /** Fields that were updated (replaced with new values) */
  updatedFields: string[];
  /** Fields that were removed (set to null in update) */
  removedFields: string[];
  /** Fields that were preserved (not in update) */
  preservedFields: string[];
  /** Fields that were added (new fields not in existing) */
  addedFields: string[];
}

/**
 * MetadataMerger class
 *
 * Merges partial metadata updates with existing metadata.
 * Implements the following rules:
 * - Fields not in update are preserved (Requirement 9.1)
 * - Fields in update replace existing values (Requirement 9.2)
 * - New fields are added to existing metadata (Requirement 9.3)
 * - Fields set to null are removed (Requirement 9.4)
 * - Empty update preserves all existing fields (Requirement 9.5)
 */
export class MetadataMerger {
  /**
   * Merge partial metadata update with existing metadata
   *
   * @param existing - The current metadata object
   * @param update - Partial update with fields to merge
   * @returns Merge result with merged metadata and change tracking
   *
   * Requirements:
   * - 9.1: Partial update merges with existing metadata
   * - 9.2: Existing fields are replaced with new values
   * - 9.3: New fields are added to existing metadata
   * - 9.4: Fields set to null are removed
   * - 9.5: Empty update preserves existing metadata
   */
  merge(existing: MemoryMetadata, update: MetadataUpdate): MetadataMergeResult {
    const updatedFields: string[] = [];
    const removedFields: string[] = [];
    const preservedFields: string[] = [];
    const addedFields: string[] = [];

    // Start with a deep copy of existing metadata to avoid mutation
    const merged: MemoryMetadata = this.deepCopy(existing);

    // Get all keys from existing metadata
    const existingKeys = new Set(Object.keys(existing));

    // Process each field in the update
    for (const [key, value] of Object.entries(update)) {
      const typedKey = key as keyof MemoryMetadata;

      if (value === null) {
        // Requirement 9.4: null means remove the field
        if (existingKeys.has(key)) {
          delete merged[typedKey];
          removedFields.push(key);
        }
        // If field doesn't exist, null is a no-op
      } else if (value !== undefined) {
        // Requirement 9.2 & 9.3: Replace or add field
        if (existingKeys.has(key)) {
          // Field exists - this is an update
          updatedFields.push(key);
        } else {
          // Field doesn't exist - this is an addition
          addedFields.push(key);
        }
        // Type assertion needed due to TypeScript's strict typing
        (merged as Record<string, unknown>)[key] = value;
      }
      // undefined values are ignored (field not in update)
    }

    // Track preserved fields (in existing but not modified)
    for (const key of Array.from(existingKeys)) {
      if (
        !updatedFields.includes(key) &&
        !removedFields.includes(key) &&
        !addedFields.includes(key)
      ) {
        preservedFields.push(key);
      }
    }

    return {
      merged,
      updatedFields,
      removedFields,
      preservedFields,
      addedFields,
    };
  }

  /**
   * Check if an update would result in any changes
   *
   * @param existing - The current metadata object
   * @param update - Partial update to check
   * @returns true if the update would change the metadata
   */
  hasChanges(existing: MemoryMetadata, update: MetadataUpdate): boolean {
    // Empty update means no changes
    if (Object.keys(update).length === 0) {
      return false;
    }

    for (const [key, value] of Object.entries(update)) {
      if (value === null) {
        // Removing a field that exists is a change
        if (key in existing) {
          return true;
        }
      } else if (value !== undefined) {
        // Adding or updating a field is a change
        const existingValue = existing[key as keyof MemoryMetadata];
        if (!this.deepEqual(existingValue, value)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Deep copy of metadata object
   * Handles arrays and nested objects
   */
  private deepCopy(obj: MemoryMetadata): MemoryMetadata {
    const copy: MemoryMetadata = {};

    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        (copy as Record<string, unknown>)[key] = [...value];
      } else if (typeof value === "object" && value !== null) {
        (copy as Record<string, unknown>)[key] = { ...value };
      } else {
        (copy as Record<string, unknown>)[key] = value;
      }
    }

    return copy;
  }

  /**
   * Deep equality check for metadata values
   * Handles arrays and primitive values
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) {
      return true;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) {
        return false;
      }
      return keysA.every((key) =>
        this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
      );
    }

    return false;
  }
}

/**
 * Create a default metadata merger instance
 */
export function createMetadataMerger(): MetadataMerger {
  return new MetadataMerger();
}
