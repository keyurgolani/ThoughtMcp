# Database Setup and Management Guide

This guide covers PostgreSQL database setup, configuration, and management for ThoughtMCP.

## Quick Start

### Using Docker (Recommended for Development)

1. **Start PostgreSQL with Docker Compose:**

   ```bash
   docker-compose up -d postgres
   ```

2. **Verify database is running:**

   ```bash
   docker-compose ps
   docker-compose logs postgres
   ```

3. **Connect to database:**
   ```bash
   docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev
   ```

### Manual PostgreSQL Setup

If you prefer to install PostgreSQL manually:

1. **Install PostgreSQL 16+ with pgvector:**

   **macOS (Homebrew):**

   ```bash
   brew install postgresql@16
   brew install pgvector
   brew services start postgresql@16
   ```

   **Ubuntu/Debian:**

   ```bash
   sudo apt-get install postgresql-16 postgresql-16-pgvector
   sudo systemctl start postgresql
   ```

2. **Create database and user:**

   ```bash
   sudo -u postgres psql
   ```

   ```sql
   CREATE USER thoughtmcp_dev WITH PASSWORD 'dev_password';
   CREATE DATABASE thoughtmcp_dev OWNER thoughtmcp_dev;
   GRANT ALL PRIVILEGES ON DATABASE thoughtmcp_dev TO thoughtmcp_dev;
   \q
   ```

3. **Initialize schema:**
   ```bash
   psql -U thoughtmcp_dev -d thoughtmcp_dev -f scripts/db/init.sql
   psql -U thoughtmcp_dev -d thoughtmcp_dev -f scripts/db/enable-pgvector.sql
   ```

## Database Schema

### Core Tables

#### `memories`

Stores individual memory units with lifecycle information.

**Columns:**

- `id` (TEXT, PK): Unique memory identifier
- `content` (TEXT): Memory content
- `created_at` (TIMESTAMP): Creation timestamp
- `last_accessed` (TIMESTAMP): Last access timestamp
- `access_count` (INTEGER): Number of times accessed
- `salience` (REAL, 0-1): Memory importance/salience
- `decay_rate` (REAL): Sector-specific decay rate
- `strength` (REAL, 0-1): Current memory strength
- `user_id` (TEXT): User identifier
- `session_id` (TEXT): Session identifier
- `primary_sector` (TEXT): Primary memory sector (episodic/semantic/procedural/emotional/reflective)

**Indexes:**

- User, session, timestamps, salience, strength
- Composite indexes for common query patterns

#### `memory_embeddings`

Stores five-sector embeddings for HMD architecture.

**Columns:**

- `memory_id` (TEXT, FK): Reference to memory
- `sector` (TEXT): Memory sector
- `embedding` (vector(768)): Vector embedding
- `dimension` (INTEGER): Vector dimension
- `model` (TEXT): Embedding model used
- `created_at`, `updated_at` (TIMESTAMP): Timestamps

**Indexes:**

- IVFFlat vector indexes for each sector (cosine similarity)
- Memory ID, sector, model indexes

#### `memory_links`

Stores waypoint graph connections (1-3 links per memory).

**Columns:**

- `source_id`, `target_id` (TEXT, PK): Memory IDs
- `link_type` (TEXT): semantic/temporal/causal/analogical
- `weight` (REAL, 0-1): Connection strength
- `created_at` (TIMESTAMP): Creation timestamp
- `traversal_count` (INTEGER): Usage counter

**Indexes:**

- Source, target, weight, type indexes

#### `memory_metadata`

Stores searchable metadata.

**Columns:**

- `memory_id` (TEXT, PK, FK): Reference to memory
- `keywords` (TEXT[]): Keyword array
- `tags` (TEXT[]): Tag array
- `category` (TEXT): Category
- `context` (TEXT): Context information
- `importance` (REAL, 0-1): Importance score
- `is_atomic` (BOOLEAN): Atomic memory flag
- `parent_id` (TEXT, FK): Parent memory reference

**Indexes:**

- GIN indexes for array-based searching (keywords, tags)
- Category, importance indexes

#### `memory_emotions`

Stores emotional annotations.

**Columns:**

- `memory_id` (TEXT, PK, FK): Reference to memory
- `valence` (REAL, -1 to +1): Emotional valence
- `arousal` (REAL, 0 to 1): Arousal level
- `dominance` (REAL, -1 to +1): Dominance dimension
- `discrete_emotions` (JSONB): Discrete emotion scores
- `primary_emotion` (TEXT): Primary emotion
- `confidence` (REAL, 0-1): Detection confidence

**Indexes:**

- Valence, arousal, primary emotion indexes

### Monitoring Tables

#### `performance_metrics`

Tracks system performance metrics.

#### `confidence_calibration`

Stores prediction-outcome pairs for calibration learning.

#### `bias_detection_log`

Logs detected biases for analysis.

#### `framework_selection_log`

Tracks framework selection decisions.

#### `schema_version`

Tracks database schema version for migrations.

## Database Functions

### Vector Search

#### `find_similar_memories()`

Finds similar memories using vector similarity with composite scoring.

**Parameters:**

- `p_query_embedding`: Query vector
- `p_sector`: Memory sector to search
- `p_user_id`: User identifier
- `p_limit`: Maximum results (default: 10)
- `p_similarity_threshold`: Minimum similarity (default: 0.7)

**Returns:**

- Memory ID, content, similarity, salience, recency, composite score, timestamps

**Composite Score Formula:**

```
0.6 × similarity + 0.2 × salience + 0.1 × recency + 0.1 × link_weight
```

**Example:**

```sql
SELECT * FROM find_similar_memories(
    '[0.1, 0.2, ...]'::vector(768),
    'semantic',
    'user123',
    10,
    0.7
);
```

### Utility Functions

#### `get_memory_statistics(p_user_id)`

Returns memory statistics for a user.

#### `cleanup_orphaned_metadata()`

Removes metadata for deleted memories.

#### `rebuild_vector_indexes()`

Rebuilds vector indexes (useful after bulk inserts).

#### `get_vector_index_stats()`

Returns vector index statistics.

## Migrations

### Using the Migration Tool

The migration tool (`scripts/db/migrate.sh`) manages schema changes.

**Check migration status:**

```bash
./scripts/db/migrate.sh status
```

**Apply pending migrations:**

```bash
./scripts/db/migrate.sh migrate
```

**Create new migration:**

```bash
./scripts/db/migrate.sh create "add_new_feature"
```

**Rollback to version:**

```bash
./scripts/db/migrate.sh rollback 1
```

### Migration File Format

Migrations are stored in `scripts/db/migrations/` with format: `<version>_<description>.sql`

Example: `002_add_emotion_tracking.sql`

```sql
-- Migration 2: add_emotion_tracking
-- Created: 2024-01-15

BEGIN;

-- Add new columns or tables
ALTER TABLE memories ADD COLUMN emotion_score REAL;

-- Update schema version is handled automatically

COMMIT;
```

## Performance Optimization

### Index Maintenance

**Analyze tables after bulk operations:**

```sql
ANALYZE memories;
ANALYZE memory_embeddings;
```

**Rebuild vector indexes:**

```sql
SELECT rebuild_vector_indexes();
```

**Check index usage:**

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Query Optimization

**Monitor slow queries:**

```sql
-- Enable query logging in postgresql.conf
log_min_duration_statement = 1000  -- Log queries > 1 second

-- View slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Connection pool monitoring:**

```sql
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active,
    count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
WHERE datname = 'thoughtmcp_dev';
```

### Vector Index Tuning

**Adjust IVFFlat lists parameter:**

For optimal performance, set `lists` to approximately `sqrt(total_rows)`:

```sql
-- For 100k embeddings per sector
CREATE INDEX idx_embeddings_semantic_vector
ON memory_embeddings USING ivfflat (embedding vector_cosine_ops)
WHERE sector = 'semantic'
WITH (lists = 316);  -- sqrt(100000) ≈ 316
```

**Rebuild indexes after significant data growth:**

```bash
docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev -c "SELECT rebuild_vector_indexes();"
```

## Backup and Restore

### Backup

**Full database backup:**

```bash
docker-compose exec postgres pg_dump -U thoughtmcp_dev thoughtmcp_dev > backup.sql
```

**Compressed backup:**

```bash
docker-compose exec postgres pg_dump -U thoughtmcp_dev thoughtmcp_dev | gzip > backup.sql.gz
```

**Backup with Docker volume:**

```bash
docker run --rm -v thoughtmcp_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres-backup.tar.gz /data
```

### Restore

**Restore from SQL dump:**

```bash
docker-compose exec -T postgres psql -U thoughtmcp_dev thoughtmcp_dev < backup.sql
```

**Restore from compressed backup:**

```bash
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U thoughtmcp_dev thoughtmcp_dev
```

## Monitoring

### Health Checks

**Check database connectivity:**

```bash
docker-compose exec postgres pg_isready -U thoughtmcp_dev -d thoughtmcp_dev
```

**Check pgvector extension:**

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Check table sizes:**

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Performance Metrics

**Memory statistics:**

```sql
SELECT * FROM get_memory_statistics('user123');
```

**Vector index statistics:**

```sql
SELECT * FROM get_vector_index_stats();
```

**Cache hit ratio:**

```sql
SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to database

**Solutions:**

1. Check PostgreSQL is running:

   ```bash
   docker-compose ps postgres
   ```

2. Check logs:

   ```bash
   docker-compose logs postgres
   ```

3. Verify credentials in `.env.development`

4. Test connection:
   ```bash
   docker-compose exec postgres psql -U thoughtmcp_dev -d thoughtmcp_dev -c "SELECT 1"
   ```

### Performance Issues

**Problem:** Slow vector similarity searches

**Solutions:**

1. Rebuild vector indexes:

   ```sql
   SELECT rebuild_vector_indexes();
   ```

2. Adjust IVFFlat lists parameter based on data size

3. Increase connection pool size in `.env.development`:

   ```
   DB_POOL_SIZE=30
   ```

4. Enable query caching:
   ```
   ENABLE_CACHE=true
   CACHE_TTL=300
   ```

**Problem:** High memory usage

**Solutions:**

1. Reduce connection pool size
2. Tune PostgreSQL memory settings in `docker-compose.yml`:
   ```yaml
   command: postgres -c shared_buffers=256MB -c effective_cache_size=1GB
   ```

### Data Issues

**Problem:** Orphaned metadata

**Solution:**

```sql
SELECT cleanup_orphaned_metadata();
```

**Problem:** Inconsistent vector dimensions

**Solution:**

```sql
-- Check for dimension mismatches
SELECT DISTINCT dimension, model, count(*)
FROM memory_embeddings
GROUP BY dimension, model;

-- Delete inconsistent embeddings (backup first!)
DELETE FROM memory_embeddings WHERE dimension != 768;
```

## Production Considerations

### Security

1. **Use strong passwords** for database users
2. **Enable SSL/TLS** for connections:
   ```yaml
   environment:
     POSTGRES_HOST_AUTH_METHOD: scram-sha-256
   ```
3. **Restrict network access** using firewall rules
4. **Regular security updates** for PostgreSQL
5. **Audit logging** for sensitive operations

### High Availability

1. **Replication** for read scaling
2. **Automated backups** (daily minimum)
3. **Monitoring and alerting** for failures
4. **Connection pooling** (PgBouncer recommended)
5. **Load balancing** for multiple replicas

### Scaling

**Vertical Scaling:**

- Increase CPU, memory, storage
- Tune PostgreSQL configuration
- Optimize queries and indexes

**Horizontal Scaling:**

- Read replicas for query distribution
- Sharding by user_id for write scaling
- Separate databases for different environments

## See Also

- [Environment Configuration](./ENVIRONMENT.md) - Database connection settings
- [Development Guide](./DEVELOPMENT.md) - Development workflow
- [Testing Guide](./TESTING.md) - Database testing practices
