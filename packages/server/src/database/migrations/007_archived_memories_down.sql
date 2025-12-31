-- Rollback Migration 007: Drop Archived Memories Table
-- Removes archived memories table and indexes

-- Drop indexes first
DROP INDEX IF EXISTS idx_archived_memories_tags;
DROP INDEX IF EXISTS idx_archived_memories_primary_sector;
DROP INDEX IF EXISTS idx_archived_memories_original_created_at;
DROP INDEX IF EXISTS idx_archived_memories_archived_at;
DROP INDEX IF EXISTS idx_archived_memories_user_id;

-- Drop table
DROP TABLE IF EXISTS archived_memories CASCADE;
