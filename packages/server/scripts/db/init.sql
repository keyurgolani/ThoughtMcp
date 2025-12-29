-- Thought Database Initialization Script
-- This script creates the initial database schema for the cognitive architecture

-- ============================================================================
-- Memory Nodes Table
-- ============================================================================
-- Stores individual memory units with metadata and lifecycle information
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    salience REAL DEFAULT 0.5,
    decay_rate REAL DEFAULT 0.02,
    strength REAL DEFAULT 1.0,
    user_id TEXT NOT NULL,
    session_id TEXT,
    primary_sector TEXT NOT NULL,
    embedding_status TEXT DEFAULT 'pending',
    CONSTRAINT valid_salience CHECK (salience >= 0 AND salience <= 1),
    CONSTRAINT valid_strength CHECK (strength >= 0 AND strength <= 1),
    CONSTRAINT valid_decay_rate CHECK (decay_rate >= 0),
    CONSTRAINT valid_primary_sector CHECK (primary_sector IN ('episodic', 'semantic', 'procedural', 'emotional', 'reflective')),
    CONSTRAINT valid_embedding_status CHECK (embedding_status IN ('pending', 'processing', 'complete', 'failed'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_session ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_accessed ON memories(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_memories_salience ON memories(salience DESC);
CREATE INDEX IF NOT EXISTS idx_memories_strength ON memories(strength DESC);
CREATE INDEX IF NOT EXISTS idx_memories_sector ON memories(primary_sector);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_user_strength ON memories(user_id, strength DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_accessed ON memories(user_id, last_accessed DESC);

-- ============================================================================
-- Multi-Sector Embeddings Table
-- ============================================================================
-- Stores five-sector embeddings for each memory (HMD architecture)
-- Note: vector type will be created after pgvector extension is enabled
-- This table will be fully created in enable-pgvector.sql

-- ============================================================================
-- Waypoint Graph Links Table
-- ============================================================================
-- Stores sparse graph connections between memories (1-3 links per memory)
CREATE TABLE IF NOT EXISTS memory_links (
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    link_type TEXT NOT NULL,
    weight REAL DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    traversal_count INTEGER DEFAULT 0,
    PRIMARY KEY (source_id, target_id),
    FOREIGN KEY (source_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 1),
    CONSTRAINT no_self_links CHECK (source_id != target_id),
    CONSTRAINT valid_link_type CHECK (link_type IN ('semantic', 'temporal', 'causal', 'analogical'))
);

-- Indexes for graph traversal
CREATE INDEX IF NOT EXISTS idx_links_source ON memory_links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target ON memory_links(target_id);
CREATE INDEX IF NOT EXISTS idx_links_weight ON memory_links(weight DESC);
CREATE INDEX IF NOT EXISTS idx_links_type ON memory_links(link_type);

-- ============================================================================
-- Memory Metadata Table
-- ============================================================================
-- Stores searchable metadata for memories
CREATE TABLE IF NOT EXISTS memory_metadata (
    memory_id TEXT PRIMARY KEY,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    category TEXT,
    context TEXT,
    importance REAL DEFAULT 0.5,
    is_atomic BOOLEAN DEFAULT TRUE,
    parent_id TEXT,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES memories(id) ON DELETE SET NULL,
    CONSTRAINT valid_importance CHECK (importance >= 0 AND importance <= 1)
);

-- GIN indexes for array-based searching
CREATE INDEX IF NOT EXISTS idx_metadata_keywords ON memory_metadata USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_metadata_tags ON memory_metadata USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_metadata_category ON memory_metadata(category);
CREATE INDEX IF NOT EXISTS idx_metadata_importance ON memory_metadata(importance DESC);

-- ============================================================================
-- Emotional Annotations Table
-- ============================================================================
-- Stores emotional state information for memories
CREATE TABLE IF NOT EXISTS memory_emotions (
    memory_id TEXT PRIMARY KEY,
    valence REAL NOT NULL,
    arousal REAL NOT NULL,
    dominance REAL NOT NULL,
    discrete_emotions JSONB NOT NULL,
    primary_emotion TEXT NOT NULL,
    confidence REAL NOT NULL,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT valid_valence CHECK (valence >= -1 AND valence <= 1),
    CONSTRAINT valid_arousal CHECK (arousal >= 0 AND arousal <= 1),
    CONSTRAINT valid_dominance CHECK (dominance >= -1 AND dominance <= 1),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes for emotion-based queries
CREATE INDEX IF NOT EXISTS idx_emotions_valence ON memory_emotions(valence);
CREATE INDEX IF NOT EXISTS idx_emotions_arousal ON memory_emotions(arousal);
CREATE INDEX IF NOT EXISTS idx_emotions_primary ON memory_emotions(primary_emotion);

-- ============================================================================
-- Performance Metrics Table
-- ============================================================================
-- Stores performance and quality metrics for metacognitive monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metric_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    context JSONB,
    user_id TEXT,
    session_id TEXT
);

-- Indexes for metrics analysis
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_user ON performance_metrics(user_id);

-- ============================================================================
-- Confidence Calibration Table
-- ============================================================================
-- Stores prediction-outcome pairs for confidence calibration learning
CREATE TABLE IF NOT EXISTS confidence_calibration (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    predicted_confidence REAL NOT NULL,
    actual_outcome REAL NOT NULL,
    domain TEXT,
    context JSONB,
    user_id TEXT,
    CONSTRAINT valid_predicted CHECK (predicted_confidence >= 0 AND predicted_confidence <= 1),
    CONSTRAINT valid_outcome CHECK (actual_outcome >= 0 AND actual_outcome <= 1)
);

-- Indexes for calibration analysis
CREATE INDEX IF NOT EXISTS idx_calibration_timestamp ON confidence_calibration(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_calibration_domain ON confidence_calibration(domain);
CREATE INDEX IF NOT EXISTS idx_calibration_user ON confidence_calibration(user_id);

-- ============================================================================
-- Bias Detection Log Table
-- ============================================================================
-- Stores detected biases for learning and improvement
CREATE TABLE IF NOT EXISTS bias_detection_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    bias_type TEXT NOT NULL,
    severity REAL NOT NULL,
    context JSONB,
    corrected BOOLEAN DEFAULT FALSE,
    user_id TEXT,
    session_id TEXT,
    CONSTRAINT valid_severity CHECK (severity >= 0 AND severity <= 1)
);

-- Indexes for bias analysis
CREATE INDEX IF NOT EXISTS idx_bias_timestamp ON bias_detection_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bias_type ON bias_detection_log(bias_type);
CREATE INDEX IF NOT EXISTS idx_bias_severity ON bias_detection_log(severity DESC);
CREATE INDEX IF NOT EXISTS idx_bias_user ON bias_detection_log(user_id);

-- ============================================================================
-- Framework Selection Log Table
-- ============================================================================
-- Stores framework selection decisions for learning
CREATE TABLE IF NOT EXISTS framework_selection_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    problem_classification JSONB NOT NULL,
    selected_framework TEXT NOT NULL,
    selection_confidence REAL NOT NULL,
    outcome_quality REAL,
    user_id TEXT,
    session_id TEXT,
    CONSTRAINT valid_selection_confidence CHECK (selection_confidence >= 0 AND selection_confidence <= 1),
    CONSTRAINT valid_outcome_quality CHECK (outcome_quality IS NULL OR (outcome_quality >= 0 AND outcome_quality <= 1))
);

-- Indexes for framework learning
CREATE INDEX IF NOT EXISTS idx_framework_timestamp ON framework_selection_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_framework_selected ON framework_selection_log(selected_framework);
CREATE INDEX IF NOT EXISTS idx_framework_user ON framework_selection_log(user_id);

-- ============================================================================
-- Database Version Table
-- ============================================================================
-- Tracks database schema version for migrations
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Insert initial version
INSERT INTO schema_version (version, description)
VALUES (1, 'Initial schema creation with HMD memory system')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function to update last_accessed timestamp
CREATE OR REPLACE FUNCTION update_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = CURRENT_TIMESTAMP;
    NEW.access_count = OLD.access_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_accessed on memory retrieval
-- Note: This will be triggered by application logic, not by SELECT queries
-- The application should call a stored procedure to mark access

-- Function to clean up orphaned metadata
CREATE OR REPLACE FUNCTION cleanup_orphaned_metadata()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM memory_metadata
    WHERE memory_id NOT IN (SELECT id FROM memories);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get memory statistics
CREATE OR REPLACE FUNCTION get_memory_statistics(p_user_id TEXT)
RETURNS TABLE(
    total_memories BIGINT,
    avg_strength REAL,
    avg_salience REAL,
    total_links BIGINT,
    avg_links_per_memory REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_memories,
        AVG(m.strength)::REAL as avg_strength,
        AVG(m.salience)::REAL as avg_salience,
        (SELECT COUNT(*)::BIGINT FROM memory_links WHERE source_id IN (SELECT id FROM memories WHERE user_id = p_user_id)) as total_links,
        (SELECT COUNT(*)::REAL / NULLIF(COUNT(DISTINCT source_id), 0) FROM memory_links WHERE source_id IN (SELECT id FROM memories WHERE user_id = p_user_id)) as avg_links_per_memory
    FROM memories m
    WHERE m.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Completion Message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Thought database schema initialized successfully';
    RAISE NOTICE 'Next: pgvector extension will be enabled in the next initialization script';
END $$;
