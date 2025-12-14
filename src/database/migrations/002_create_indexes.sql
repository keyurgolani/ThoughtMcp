-- Migration 002: Create Indexes
-- Creates all performance indexes for HMD memory system
-- Idempotent: Safe to run multiple times

-- Memories table indexes
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_memories_salience ON memories(salience DESC);
CREATE INDEX IF NOT EXISTS idx_memories_strength ON memories(strength DESC);

-- Memory embeddings vector index (IVFFlat for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON memory_embeddings
    USING ivfflat (embedding vector_cosine_ops);

-- Memory links indexes
CREATE INDEX IF NOT EXISTS idx_links_source ON memory_links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON memory_links(target_id);
CREATE INDEX IF NOT EXISTS idx_links_weight ON memory_links(weight DESC);

-- Memory metadata indexes (GIN for array operations)
CREATE INDEX IF NOT EXISTS idx_metadata_keywords ON memory_metadata USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_metadata_tags ON memory_metadata USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_metadata_category ON memory_metadata(category);
