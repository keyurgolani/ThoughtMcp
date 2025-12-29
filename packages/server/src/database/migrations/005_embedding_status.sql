-- Migration: Add embedding_status column to memories table
-- Requirements: 8.3 - Track embedding generation status for background processing

-- Add embedding_status column with default 'complete' for existing memories
ALTER TABLE memories
ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(20) DEFAULT 'complete';

-- Add check constraint for valid status values
ALTER TABLE memories
ADD CONSTRAINT chk_embedding_status
CHECK (embedding_status IN ('pending', 'complete', 'failed'));

-- Create index for querying by embedding status
CREATE INDEX IF NOT EXISTS idx_memories_embedding_status
ON memories(embedding_status);

-- Create composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_memories_user_embedding_status
ON memories(user_id, embedding_status);

-- Comment on column
COMMENT ON COLUMN memories.embedding_status IS 'Status of embedding generation: pending, complete, or failed';
