-- Rollback Migration 001: Drop Initial Schema
-- Removes all core tables (CASCADE will handle foreign keys)

DROP TABLE IF EXISTS memory_emotions CASCADE;
DROP TABLE IF EXISTS memory_metadata CASCADE;
DROP TABLE IF EXISTS memory_links CASCADE;
DROP TABLE IF EXISTS memory_embeddings CASCADE;
DROP TABLE IF EXISTS memories CASCADE;

-- Note: We don't drop the vector extension as it might be used by other systems
