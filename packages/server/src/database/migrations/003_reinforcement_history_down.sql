-- Migration 003 Down: Drop reinforcement history table

DROP INDEX IF EXISTS idx_reinforcement_history_type;
DROP INDEX IF EXISTS idx_reinforcement_history_timestamp;
DROP INDEX IF EXISTS idx_reinforcement_history_memory;
DROP TABLE IF EXISTS memory_reinforcement_history;
