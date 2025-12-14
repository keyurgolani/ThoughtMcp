# ThoughtMCP Database Guide

This guide covers PostgreSQL database setup, configuration, schema, and management for ThoughtMCP.

## Quick Start

### Using Docker (Recommended)

```bash
# Start PostgreSQL with pgvector
docker-compose up -d postgres

# Verify database is running
docker-compose ps

# Connect to database
docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev
```

### Manual PostgreSQL Setup

```bash
# macOS (Homebrew)
brew install postgresql@16
brew install pgvector
brew services start postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql-16 postgresql-16-pgvector
sudo systemctl start postgresql
```

```sql
-- Create database and user
CREATE USER thoughtmcp_dev WITH PASSWORD 'dev_password';
CREATE DATABASE thoughtmcp_dev OWNER thoughtmcp_dev;
GRANT ALL PRIVILEGES ON DATABASE thoughtmcp_dev TO thoughtmcp_dev;
```

```bash
# Initialize schema
npm run db:setup
```

## Database Schema

### Core Tables

#### `memories`

Stores individual memory units with lifecycle information.

```sql
CREATE TABLE memories (
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
```

**Indexes**:

- `idx_memories_user` on `user_id`
- `idx_memories_created` on `created_at DESC`
- `idx_memories_strength` on `strength DESC`

#### `memory_embeddings`

Stores five-sector embeddings for HMD architecture.

```sql
CREATE TABLE memory_embeddings (
    memory_id TEXT NOT NULL,
    sector TEXT NOT NULL,
    embedding vector(768),
    dimension INTEGER NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (memory_id, sector),
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);
```

**Indexes**:

- IVFFlat vector indexes for each sector (cosine similarity)

#### `memory_links`

Stores waypoint graph connections (1-3 links per memory).

```sql
CREATE TABLE memory_links (
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
```

#### `memory_metadata`

Stores searchable metadata.

```sql
CREATE TABLE memory_metadata (
    memory_id TEXT PRIMARY KEY,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    category TEXT,
    context TEXT,
    importance REAL DEFAULT 0.5,
    is_atomic BOOLEAN DEFAULT TRUE,
    parent_id TEXT,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE,
    CONSTRAINT valid_importance CHECK (importance >= 0 AND importance <= 1)
);
```

**Indexes**:

- GIN indexes on `keywords` and `tags` arrays

#### `memory_emotions`

Stores emotional annotations.

```sql
CREATE TABLE memory_emotions (
    memory_id TEXT PRIMARY KEY,
    valence REAL NOT NULL,
    arousal REAL NOT NULL,
    dominance REAL NOT NULL,
    discrete_emotions JSONB NOT NULL,
    primary_emotion TEXT NOT NULL,
    confidence REAL NOT NULL,
    FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);
```

### Full-Text Search

```sql
-- Full-text search vector column
ALTER TABLE memories ADD COLUMN search_vector tsvector;

-- GIN index for full-text search
CREATE INDEX idx_memories_search ON memories USING GIN(search_vector);

-- Trigger to update search vector
CREATE TRIGGER memories_search_update
    BEFORE INSERT OR UPDATE ON memories
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', content);
```

## Migrations

### Using TypeScript Migration CLI

```bash
# Show migration status
npx tsx scripts/migrate.ts status

# Apply pending migrations
npx tsx scripts/migrate.ts up

# Rollback to specific version
npx tsx scripts/migrate.ts down <version>

# Validate migration files
npx tsx scripts/migrate.ts validate

# Dry-run (preview changes)
npx tsx scripts/migrate.ts dry-run
```

### Migration File Structure

```
src/database/migrations/
├── 001_initial_schema.sql
├── 001_initial_schema_down.sql
├── 002_create_indexes.sql
├── 002_create_indexes_down.sql
├── 003_reinforcement_history.sql
├── 003_reinforcement_history_down.sql
├── 004_full_text_search.sql
└── 004_full_text_search_down.sql
```

### Creating New Migrations

1. Create up migration: `NNN_description.sql`
2. Create down migration: `NNN_description_down.sql`
3. Add to `SchemaMigrationSystem` in `src/database/schema-migration.ts`
4. Validate with `npx tsx scripts/migrate.ts validate`

## Vector Search

### Composite Scoring Formula

```
score = 0.6 × similarity + 0.2 × salience + 0.1 × recency + 0.1 × link_weight
```

### Vector Search Function

```sql
SELECT * FROM find_similar_memories(
    '[0.1, 0.2, ...]'::vector(768),
    'semantic',
    'user123',
    10,
    0.7
);
```

### IVFFlat Index Tuning

For optimal performance, set `lists` to approximately `sqrt(total_rows)`:

```sql
-- For 100k embeddings per sector
CREATE INDEX idx_embeddings_semantic_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WHERE sector = 'semantic'
WITH (lists = 316);
```

## Performance Optimization

### Index Maintenance

```sql
-- Analyze tables after bulk operations
ANALYZE memories;
ANALYZE memory_embeddings;

-- Rebuild vector indexes
SELECT rebuild_vector_indexes();

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Connection Pool Monitoring

```sql
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'thoughtmcp_dev';
```

### Query Performance

```sql
-- Monitor slow queries
EXPLAIN ANALYZE SELECT ...;

-- Check cache hit ratio
SELECT
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

## Backup and Restore

### Backup

```bash
# Full database backup
docker-compose exec postgres pg_dump -U thoughtmcp_dev thoughtmcp_dev > backup.sql

# Compressed backup
docker-compose exec postgres pg_dump -U thoughtmcp_dev thoughtmcp_dev | gzip > backup.sql.gz
```

### Restore

```bash
# Restore from SQL dump
docker-compose exec -T postgres psql -U thoughtmcp_dev thoughtmcp_dev < backup.sql
```

## Monitoring

### Health Checks

```bash
# Check database connectivity
docker-compose exec postgres pg_isready -U thoughtmcp_dev -d thoughtmcp_dev

# Check pgvector extension
psql -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Table Sizes

```sql
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Troubleshooting

### Connection Issues

```bash
docker-compose ps postgres
docker-compose logs postgres
docker-compose restart postgres
```

### Performance Issues

1. Rebuild vector indexes: `SELECT rebuild_vector_indexes();`
2. Increase connection pool size: `DB_POOL_SIZE=30`
3. Enable query caching: `CACHE_TTL=300`

### Data Issues

```sql
-- Clean orphaned metadata
SELECT cleanup_orphaned_metadata();

-- Check dimension consistency
SELECT DISTINCT dimension, model, count(*)
FROM memory_embeddings
GROUP BY dimension, model;
```

## Production Considerations

### Security

- Use strong passwords
- Enable SSL/TLS for connections
- Restrict network access
- Regular security updates

### High Availability

- Replication for read scaling
- Automated backups (daily minimum)
- Monitoring and alerting
- Connection pooling (PgBouncer)

### Scaling

- Vertical: Increase CPU, memory, storage
- Horizontal: Read replicas, sharding by user_id

## See Also

- **[Environment Configuration](./environment.md)** - Database settings
- **[Development Guide](./development.md)** - Development workflow
- **[Architecture Guide](./architecture.md)** - System design

---

**Last Updated**: December 2025
**Version**: 0.5.0
