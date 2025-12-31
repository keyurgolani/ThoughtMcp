-- Rollback Migration 006: Drop Memory Tags Tables
-- Removes memory tagging tables and indexes

-- Drop indexes first
DROP INDEX IF EXISTS idx_memory_tag_assoc_tag_id;
DROP INDEX IF EXISTS idx_memory_tag_assoc_memory_id;
DROP INDEX IF EXISTS idx_memory_tags_path_prefix;
DROP INDEX IF EXISTS idx_memory_tags_path;
DROP INDEX IF EXISTS idx_memory_tags_user_id;

-- Drop tables (CASCADE will handle foreign key constraints)
DROP TABLE IF EXISTS memory_tag_associations CASCADE;
DROP TABLE IF EXISTS memory_tags CASCADE;
