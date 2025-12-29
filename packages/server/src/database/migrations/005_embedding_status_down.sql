-- Rollback: Remove embedding_status column from memories table

-- Drop indexes first
DROP INDEX IF EXISTS idx_memories_user_embedding_status;
DROP INDEX IF EXISTS idx_memories_embedding_status;

-- Drop constraint
ALTER TABLE memories
DROP CONSTRAINT IF EXISTS chk_embedding_status;

-- Drop column
ALTER TABLE memories
DROP COLUMN IF EXISTS embedding_status;
