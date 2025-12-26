/**
 * Preview Panel Utility Functions
 *
 * Helper functions for the NeighborPreviewPanel component.
 * Requirements: 6.3
 */

import type { LinkType } from '../types/api';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the relationship description based on link type
 *
 * @param linkType - The type of link/connection
 * @returns Human-readable description of the relationship
 *
 * Requirements: 6.3
 */
export function getRelationshipDescription(linkType: LinkType): string {
  const descriptions: Record<LinkType, string> = {
    semantic: 'Shares meaning or concepts',
    causal: 'Cause and effect relationship',
    temporal: 'Related in time sequence',
    analogical: 'Similar pattern or structure',
  };
  return descriptions[linkType];
}
