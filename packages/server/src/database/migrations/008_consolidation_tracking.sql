-- Migration 008: Consolidation Tracking
-- Creates table for tracking consolidation history and adds columns to memories table
-- Requirements: 1.3 (link summary to originals via graph), 1.4 (reduce strength but preserve originals)
-- Idempotent: Safe to run multiple times

-- Consolidation History Table
-- Tracks all consolidation operations for auditing and potential rollback
CREATE TABLE IF NOT EXISTS consolidation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    summary_memory_id TEXT,
    consolidated_memory_ids TEXT[] NOT NULL,
    similarity_threshold REAL NOT NULL DEFAULT 0.75,
    cluster_size INTEGER NOT NULL,
    consolidated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (summary_memory_id) REFERENCES memories(id) ON DELETE SET NULL,
    CONSTRAINT valid_similarity_threshold CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1),
    CONSTRAINT valid_cluster_size CHECK (cluster_size >= 1)
);

-- Add consolidation-related columns to memories table
-- tags: Array of tag strings for categorization (supports GIN indexing)
-- is_archived: Flag indicating if memory is archived to cold storage
-- consolidated_into: Reference to summary memory if this memory was consolidated
-- consolidated_from: Array of original memory IDs if this is a summary memory

-- Add tags column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'tags'
    ) THEN
        ALTER TABLE memories ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Add is_archived column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE memories ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add consolidated_into column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'consolidated_into'
    ) THEN
        ALTER TABLE memories ADD COLUMN consolidated_into TEXT;
    END IF;
END $$;

-- Add consolidated_from column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'memories' AND column_name = 'consolidated_from'
    ) THEN
        ALTER TABLE memories ADD COLUMN consolidated_from TEXT[];
    END IF;
END $$;

-- Add foreign key constraint for consolidated_into after column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_memories_consolidated_into'
    ) THEN
        ALTER TABLE memories
        ADD CONSTRAINT fk_memories_consolidated_into
        FOREIGN KEY (consolidated_into) REFERENCES memories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for consolidation_history table
CREATE INDEX IF NOT EXISTS idx_consolidation_history_user_id ON consolidation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_history_summary_id ON consolidation_history(summary_memory_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_history_consolidated_at ON consolidation_history(consolidated_at);

-- GIN index for tags array to support efficient tag-based searches
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);

-- Index for is_archived to support efficient filtering of archived memories
CREATE INDEX IF NOT EXISTS idx_memories_is_archived ON memories(is_archived) WHERE is_archived = TRUE;

-- Index for consolidated_into to find memories that were consolidated
CREATE INDEX IF NOT EXISTS idx_memories_consolidated_into ON memories(consolidated_into) WHERE consolidated_into IS NOT NULL;

-- Comment on table
COMMENT ON TABLE consolidation_history IS 'Tracks memory consolidation operations for auditing and potential rollback';

-- Comment on columns for consolidation_history
COMMENT ON COLUMN consolidation_history.id IS 'Unique identifier for the consolidation event';
COMMENT ON COLUMN consolidation_history.user_id IS 'User who owns the consolidated memories';
COMMENT ON COLUMN consolidation_history.summary_memory_id IS 'ID of the generated summary memory';
COMMENT ON COLUMN consolidation_history.consolidated_memory_ids IS 'Array of original memory IDs that were consolidated';
COMMENT ON COLUMN consolidation_history.similarity_threshold IS 'Similarity threshold used for clustering';
COMMENT ON COLUMN consolidation_history.cluster_size IS 'Number of memories in the consolidated cluster';
COMMENT ON COLUMN consolidation_history.consolidated_at IS 'Timestamp when consolidation occurred';

-- Comment on new columns in memories table
COMMENT ON COLUMN memories.tags IS 'Array of tag strings for categorization and organization';
COMMENT ON COLUMN memories.is_archived IS 'Flag indicating if memory is archived to cold storage';
COMMENT ON COLUMN memories.consolidated_into IS 'Reference to summary memory if this memory was consolidated';
COMMENT ON COLUMN memories.consolidated_from IS 'Array of original memory IDs if this is a summary memory';
