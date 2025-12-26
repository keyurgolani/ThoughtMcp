-- Migration 004: Full-Text Search Support
-- Adds ts_vector column, trigger, and GIN index for fast full-text search
-- Idempotent: Safe to run multiple times

-- Add search_vector column to memories table
ALTER TABLE memories ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to automatically update search_vector
-- This function is called by the trigger on INSERT/UPDATE
CREATE OR REPLACE FUNCTION memories_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector on INSERT/UPDATE
DROP TRIGGER IF EXISTS memories_search_vector_trigger ON memories;
CREATE TRIGGER memories_search_vector_trigger
  BEFORE INSERT OR UPDATE OF content ON memories
  FOR EACH ROW
  EXECUTE FUNCTION memories_search_vector_update();

-- Create GIN index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS idx_memories_search_vector
  ON memories USING GIN(search_vector);

-- Update existing rows with search_vector values
-- This ensures all existing memories are searchable
UPDATE memories SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL;
