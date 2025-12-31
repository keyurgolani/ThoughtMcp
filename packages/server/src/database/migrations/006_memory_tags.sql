-- Migration 006: Memory Tags Tables
-- Creates tables for memory tagging and organization
-- Requirements: 5.1 (tag CRUD), 5.5 (hierarchical tags)
-- Idempotent: Safe to run multiple times

-- Memory Tags Table
-- Stores user-defined tags with hierarchical path support
CREATE TABLE IF NOT EXISTS memory_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_tag_path UNIQUE (user_id, path),
    CONSTRAINT valid_color CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Memory Tag Associations Junction Table
-- Links memories to tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS memory_tag_associations (
    memory_id TEXT NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (memory_id, tag_id),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES memory_tags(id) ON DELETE CASCADE
);

-- Indexes for memory_tags table
CREATE INDEX IF NOT EXISTS idx_memory_tags_user_id ON memory_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_tags_path ON memory_tags(path);
CREATE INDEX IF NOT EXISTS idx_memory_tags_path_prefix ON memory_tags(path text_pattern_ops);

-- Indexes for memory_tag_associations table
CREATE INDEX IF NOT EXISTS idx_memory_tag_assoc_memory_id ON memory_tag_associations(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_tag_assoc_tag_id ON memory_tag_associations(tag_id);

-- Comment on tables
COMMENT ON TABLE memory_tags IS 'User-defined tags for categorizing and organizing memories';
COMMENT ON TABLE memory_tag_associations IS 'Junction table linking memories to tags (many-to-many)';

-- Comment on columns
COMMENT ON COLUMN memory_tags.path IS 'Hierarchical tag path (e.g., "work/projects/alpha")';
COMMENT ON COLUMN memory_tags.color IS 'Optional hex color code for tag display (e.g., "#FF5733")';
