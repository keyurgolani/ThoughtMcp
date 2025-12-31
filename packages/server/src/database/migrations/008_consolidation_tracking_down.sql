-- Rollback Migration 008: Drop Consolidation Tracking
-- Removes consolidation history table and columns from memories table

-- Drop indexes first
DROP INDEX IF EXISTS idx_memories_consolidated_into;
DROP INDEX IF EXISTS idx_memories_is_archived;
DROP INDEX IF EXISTS idx_memories_tags;
DROP INDEX IF EXISTS idx_consolidation_history_consolidated_at;
DROP INDEX IF EXISTS idx_consolidation_history_summary_id;
DROP INDEX IF EXISTS idx_consolidation_history_user_id;

-- Drop foreign key constraint from memories table
ALTER TABLE memories DROP CONSTRAINT IF EXISTS fk_memories_consolidated_into;

-- Drop columns from memories table
ALTER TABLE memories DROP COLUMN IF EXISTS consolidated_from;
ALTER TABLE memories DROP COLUMN IF EXISTS consolidated_into;
ALTER TABLE memories DROP COLUMN IF EXISTS is_archived;
ALTER TABLE memories DROP COLUMN IF EXISTS tags;

-- Drop consolidation_history table
DROP TABLE IF EXISTS consolidation_history CASCADE;
