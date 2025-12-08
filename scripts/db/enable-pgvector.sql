-- ThoughtMCP pgvector Extension Setup
-- This script enables pgvector and creates vector-based tables and indexes

-- ============================================================================
-- Enable pgvector Extension
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is loaded
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'pgvector extension failed to load';
    END IF;
    RAISE NOTICE 'pgvector extension enabled successfully';
END $$;

-- ============================================================================
-- Multi-Sector Embeddings Table
-- ============================================================================
-- Stores five-sector embeddings for each memory (HMD architecture)
-- Default dimension is 768 (Ollama nomic-embed-text), but can be adjusted
CREATE TABLE IF NOT EXISTS memory_embeddings (
    memory_id TEXT NOT NULL,
    sector TEXT NOT NULL,
    embedding vector(768),  -- Default dimension, will support configurable sizes
    dimension INTEGER NOT NULL DEFAULT 768,
    model TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (memory_id, sector),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT valid_sector CHECK (sector IN ('episodic', 'semantic', 'procedural', 'emotional', 'reflective')),
    CONSTRAINT valid_dimension CHECK (dimension > 0)
);

-- ============================================================================
-- Vector Similarity Indexes
-- ============================================================================
-- IVFFlat indexes for fast approximate nearest neighbor search
-- Lists parameter: sqrt(total_rows) is a good starting point
-- For 100k memories × 5 sectors = 500k embeddings, lists ≈ 707

-- Episodic sector index (temporal, event-based memories)
-- Note: WITH clause must come before WHERE clause in PostgreSQL
CREATE INDEX IF NOT EXISTS idx_embeddings_episodic_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE sector = 'episodic';

-- Semantic sector index (factual, conceptual knowledge)
CREATE INDEX IF NOT EXISTS idx_embeddings_semantic_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE sector = 'semantic';

-- Procedural sector index (how-to, process knowledge)
CREATE INDEX IF NOT EXISTS idx_embeddings_procedural_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE sector = 'procedural';

-- Emotional sector index (affective content)
CREATE INDEX IF NOT EXISTS idx_embeddings_emotional_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE sector = 'emotional';

-- Reflective sector index (meta-cognitive insights)
CREATE INDEX IF NOT EXISTS idx_embeddings_reflective_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100)
WHERE sector = 'reflective';

-- Additional indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_embeddings_memory ON memory_embeddings(memory_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_sector ON memory_embeddings(sector);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON memory_embeddings(model);
CREATE INDEX IF NOT EXISTS idx_embeddings_updated ON memory_embeddings(updated_at DESC);

-- ============================================================================
-- Vector Search Functions
-- ============================================================================

-- Function to find similar memories using vector similarity
-- Returns memories ranked by composite score: 0.6×similarity + 0.2×salience + 0.1×recency + 0.1×link_weight
CREATE OR REPLACE FUNCTION find_similar_memories(
    p_query_embedding vector(768),
    p_sector TEXT,
    p_user_id TEXT,
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE(
    memory_id TEXT,
    content TEXT,
    similarity REAL,
    salience REAL,
    recency_score REAL,
    composite_score REAL,
    created_at TIMESTAMP WITH TIME ZONE,
    last_accessed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH similarity_scores AS (
        SELECT
            e.memory_id,
            1 - (e.embedding <=> p_query_embedding) AS similarity_score
        FROM memory_embeddings e
        WHERE e.sector = p_sector
        AND 1 - (e.embedding <=> p_query_embedding) >= p_similarity_threshold
    ),
    recency_scores AS (
        SELECT
            m.id,
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - m.last_accessed)) / 86400.0 AS days_since_access,
            EXP(-0.01 * EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - m.last_accessed)) / 86400.0) AS recency_score
        FROM memories m
        WHERE m.user_id = p_user_id
    ),
    link_weights AS (
        SELECT
            ml.target_id AS memory_id,
            AVG(ml.weight) AS avg_link_weight
        FROM memory_links ml
        GROUP BY ml.target_id
    )
    SELECT
        m.id AS memory_id,
        m.content,
        ss.similarity_score AS similarity,
        m.salience,
        rs.recency_score,
        (0.6 * ss.similarity_score +
         0.2 * m.salience +
         0.1 * rs.recency_score +
         0.1 * COALESCE(lw.avg_link_weight, 0.0)) AS composite_score,
        m.created_at,
        m.last_accessed
    FROM memories m
    INNER JOIN similarity_scores ss ON m.id = ss.memory_id
    INNER JOIN recency_scores rs ON m.id = rs.id
    LEFT JOIN link_weights lw ON m.id = lw.memory_id
    WHERE m.user_id = p_user_id
    ORDER BY composite_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar memories across multiple sectors
CREATE OR REPLACE FUNCTION find_similar_memories_multi_sector(
    p_query_embeddings JSONB,  -- JSON object with sector names as keys and embeddings as arrays
    p_sector_weights JSONB,    -- JSON object with sector names as keys and weights as values
    p_user_id TEXT,
    p_limit INTEGER DEFAULT 10,
    p_similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE(
    memory_id TEXT,
    content TEXT,
    weighted_similarity REAL,
    composite_score REAL
) AS $$
DECLARE
    sector_name TEXT;
    sector_weight REAL;
    query_embedding vector(768);
BEGIN
    -- This is a placeholder for multi-sector search
    -- Full implementation will aggregate scores across sectors
    RAISE NOTICE 'Multi-sector search function placeholder';
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to update embedding updated_at timestamp
CREATE OR REPLACE FUNCTION update_embedding_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update embedding timestamp
CREATE TRIGGER trigger_update_embedding_timestamp
    BEFORE UPDATE ON memory_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_embedding_timestamp();

-- ============================================================================
-- Index Maintenance Functions
-- ============================================================================

-- Function to rebuild vector indexes (useful after bulk inserts)
CREATE OR REPLACE FUNCTION rebuild_vector_indexes()
RETURNS TEXT AS $$
BEGIN
    REINDEX INDEX CONCURRENTLY idx_embeddings_episodic_vector;
    REINDEX INDEX CONCURRENTLY idx_embeddings_semantic_vector;
    REINDEX INDEX CONCURRENTLY idx_embeddings_procedural_vector;
    REINDEX INDEX CONCURRENTLY idx_embeddings_emotional_vector;
    REINDEX INDEX CONCURRENTLY idx_embeddings_reflective_vector;

    RETURN 'Vector indexes rebuilt successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error rebuilding indexes: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Function to get vector index statistics
CREATE OR REPLACE FUNCTION get_vector_index_stats()
RETURNS TABLE(
    index_name TEXT,
    index_size TEXT,
    tuples BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.indexrelname::TEXT AS index_name,
        pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
        s.n_tup_ins AS tuples
    FROM pg_stat_user_indexes s
    JOIN pg_index i ON s.indexrelid = i.indexrelid
    WHERE i.indexrelname LIKE 'idx_embeddings_%_vector'
    ORDER BY pg_relation_size(i.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Performance Optimization
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE memories;
ANALYZE memory_embeddings;
ANALYZE memory_links;
ANALYZE memory_metadata;

-- ============================================================================
-- Completion Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'pgvector extension configured successfully';
    RAISE NOTICE 'Vector indexes created for all five memory sectors';
    RAISE NOTICE 'Database is ready for HMD memory operations';
END $$;
