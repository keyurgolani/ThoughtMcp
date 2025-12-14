-- Migration 001: Initial Schema
-- Creates all core tables for HMD memory system
-- Idempotent: Safe to run multiple times

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Memory Nodes Table
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    salience REAL DEFAULT 0.5,
    decay_rate REAL DEFAULT 0.02,
    strength REAL DEFAULT 1.0,
    user_id TEXT NOT NULL,
    session_id TEXT,
    primary_sector TEXT NOT NULL,
    CONSTRAINT valid_salience CHECK (salience >= 0 AND salience <= 1),
    CONSTRAINT valid_strength CHECK (strength >= 0 AND strength <= 1)
);

-- Multi-Sector Embeddings Table
-- Note: vector dimension should match EMBEDDING_DIMENSION env var (default 768 for nomic-embed-text)
CREATE TABLE IF NOT EXISTS memory_embeddings (
    memory_id TEXT NOT NULL,
    sector TEXT NOT NULL,
    embedding vector(768), -- pgvector type, matches nomic-embed-text model
    dimension INTEGER NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (memory_id, sector),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Waypoint Graph Links Table
CREATE TABLE IF NOT EXISTS memory_links (
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    link_type TEXT NOT NULL,
    weight REAL DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    traversal_count INTEGER DEFAULT 0,
    PRIMARY KEY (source_id, target_id),
    FOREIGN KEY (source_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT valid_weight CHECK (weight >= 0 AND weight <= 1),
    CONSTRAINT no_self_links CHECK (source_id != target_id)
);

-- Memory Metadata Table
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
    FOREIGN KEY (parent_id) REFERENCES memories(id),
    CONSTRAINT valid_importance CHECK (importance >= 0 AND importance <= 1)
);

-- Emotional Annotations Table
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
