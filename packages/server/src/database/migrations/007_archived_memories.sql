-- Migration 007: Archived Memories Table
-- Creates table for storing archived memories in cold storage
-- Requirements: 4.1 (archive by age threshold), 4.2 (retain metadata and embeddings)
-- Idempotent: Safe to run multiple times

-- Archived Memories Table
-- Stores memories that have been moved to cold storage
-- Retains all original data including content, metadata, embeddings, and tags
CREATE TABLE IF NOT EXISTS archived_memories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embeddings JSONB,
    original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags TEXT[] DEFAULT '{}',
    -- Store additional fields from original memory for complete restoration
    session_id TEXT,
    primary_sector TEXT NOT NULL,
    salience REAL DEFAULT 0.5,
    decay_rate REAL DEFAULT 0.02,
    strength REAL DEFAULT 1.0,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_archived_salience CHECK (salience >= 0 AND salience <= 1),
    CONSTRAINT valid_archived_strength CHECK (strength >= 0 AND strength <= 1)
);

-- Index for user_id to support efficient user-scoped queries
CREATE INDEX IF NOT EXISTS idx_archived_memories_user_id ON archived_memories(user_id);

-- Index for archived_at to support time-based queries
CREATE INDEX IF NOT EXISTS idx_archived_memories_archived_at ON archived_memories(archived_at);

-- Index for original_created_at to support age-based queries
CREATE INDEX IF NOT EXISTS idx_archived_memories_original_created_at ON archived_memories(original_created_at);

-- Index for primary_sector to support sector-based filtering
CREATE INDEX IF NOT EXISTS idx_archived_memories_primary_sector ON archived_memories(primary_sector);

-- GIN index for tags array to support tag-based searches
CREATE INDEX IF NOT EXISTS idx_archived_memories_tags ON archived_memories USING GIN(tags);

-- Comment on table
COMMENT ON TABLE archived_memories IS 'Cold storage for archived memories with full data preservation for restoration';

-- Comment on columns
COMMENT ON COLUMN archived_memories.id IS 'Original memory ID preserved for restoration';
COMMENT ON COLUMN archived_memories.user_id IS 'User who owns this memory';
COMMENT ON COLUMN archived_memories.content IS 'Original memory content';
COMMENT ON COLUMN archived_memories.metadata IS 'Original memory metadata as JSONB (keywords, tags, category, context, importance)';
COMMENT ON COLUMN archived_memories.embeddings IS 'Original sector embeddings as JSONB for searchability';
COMMENT ON COLUMN archived_memories.original_created_at IS 'When the memory was originally created';
COMMENT ON COLUMN archived_memories.archived_at IS 'When the memory was archived';
COMMENT ON COLUMN archived_memories.tags IS 'Tags associated with this memory';
COMMENT ON COLUMN archived_memories.primary_sector IS 'Primary memory sector (episodic, semantic, procedural, emotional, reflective)';
