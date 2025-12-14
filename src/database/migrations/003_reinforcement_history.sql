-- Migration 003: Create reinforcement history table
-- Tracks all reinforcement events for memories

CREATE TABLE IF NOT EXISTS memory_reinforcement_history (
    id SERIAL PRIMARY KEY,
    memory_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL CHECK (type IN ('access', 'explicit', 'importance')),
    boost REAL NOT NULL CHECK (boost >= 0 AND boost <= 1),
    strength_before REAL NOT NULL CHECK (strength_before >= 0 AND strength_before <= 1),
    strength_after REAL NOT NULL CHECK (strength_after >= 0 AND strength_after <= 1),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reinforcement_history_memory
    ON memory_reinforcement_history(memory_id);

CREATE INDEX IF NOT EXISTS idx_reinforcement_history_timestamp
    ON memory_reinforcement_history(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_reinforcement_history_type
    ON memory_reinforcement_history(type);
