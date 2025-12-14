-- Rollback Migration 002: Drop Indexes
-- Removes all performance indexes

DROP INDEX IF EXISTS idx_metadata_category;
DROP INDEX IF EXISTS idx_metadata_tags;
DROP INDEX IF EXISTS idx_metadata_keywords;
DROP INDEX IF EXISTS idx_links_weight;
DROP INDEX IF EXISTS idx_links_target;
DROP INDEX IF EXISTS idx_links_source;
DROP INDEX IF EXISTS idx_embeddings_vector;
DROP INDEX IF EXISTS idx_memories_strength;
DROP INDEX IF EXISTS idx_memories_salience;
DROP INDEX IF EXISTS idx_memories_accessed;
DROP INDEX IF EXISTS idx_memories_created;
DROP INDEX IF EXISTS idx_memories_user;
