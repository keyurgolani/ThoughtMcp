-- Migration 004 Rollback: Remove Full-Text Search Support
-- Removes ts_vector column, trigger, function, and GIN index

-- Drop GIN index
DROP INDEX IF EXISTS idx_memories_search_vector;

-- Drop trigger
DROP TRIGGER IF EXISTS memories_search_vector_trigger ON memories;

-- Drop function
DROP FUNCTION IF EXISTS memories_search_vector_update();

-- Drop search_vector column
ALTER TABLE memories DROP COLUMN IF EXISTS search_vector;
