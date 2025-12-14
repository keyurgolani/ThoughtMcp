# ThoughtMCP Production Deployment Guide

This guide covers deploying ThoughtMCP to production environments with best practices for security, performance, and reliability.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [PostgreSQL Setup](#postgresql-setup)
- [Embedding Model Setup](#embedding-model-setup)
- [Configuration](#configuration)
- [Security Best Practices](#security-best-practices)
- [Scaling and High Availability](#scaling-and-high-availability)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 16.0 or higher with pgvector extension
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: 10GB+ for database (scales with memory count)
- **CPU**: 2+ cores recommended

### Software Dependencies

```bash
# Verify Node.js version
node --version  # Should be 18+

# Verify npm version
npm --version   # Should be 8+
```

---

## Quick Start

### 1. Clone and Build

```bash
# Clone repository
git clone https://github.com/keyurgolani/ThoughtMcp.git
cd ThoughtMcp

# Install dependencies
npm ci --production=false

# Build for production
npm run build
```

### 2. Configure Environment

```bash
# Copy production template
cp .env.production.example .env.production

# Edit configuration
nano .env.production
```

### 3. Validate Configuration

```bash
# Run configuration validator
npm run config:validate
```

### 4. Initialize Database

```bash
# Validate migrations first
npx tsx scripts/migrate.ts validate

# Run database migrations
npx tsx scripts/migrate.ts up
```

### 5. Start Server

```bash
# Start in production mode
npm run start:prod
```

---

## PostgreSQL Setup

### Option 1: Managed PostgreSQL (Recommended)

Use a managed PostgreSQL service for production:

- **AWS RDS for PostgreSQL**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **DigitalOcean Managed Databases**
- **Supabase**

#### Requirements

1. PostgreSQL 16+ with pgvector extension
2. SSL/TLS enabled
3. Adequate storage (10GB+ initial)
4. Connection pooling (PgBouncer recommended)

#### Configuration Example (AWS RDS)

```bash
DATABASE_URL=postgresql://thoughtmcp:password@mydb.xxx.us-east-1.rds.amazonaws.com:5432/thoughtmcp?sslmode=require
```

### Option 2: Self-Hosted PostgreSQL

#### Install PostgreSQL with pgvector

**Ubuntu/Debian:**

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update

# Install PostgreSQL 16 and pgvector
sudo apt-get install postgresql-16 postgresql-16-pgvector

# Start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

**macOS (Homebrew):**

```bash
brew install postgresql@16 pgvector
brew services start postgresql@16
```

#### Create Database and User

```bash
sudo -u postgres psql
```

```sql
-- Create production user with strong password
CREATE USER thoughtmcp_prod WITH PASSWORD 'your_strong_password_here';

-- Create production database
CREATE DATABASE thoughtmcp_prod OWNER thoughtmcp_prod;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE thoughtmcp_prod TO thoughtmcp_prod;

-- Connect to database
\c thoughtmcp_prod

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### PostgreSQL Tuning for Production

Edit `postgresql.conf`:

```ini
# Memory Settings (adjust based on available RAM)
shared_buffers = 256MB              # 25% of RAM
effective_cache_size = 1GB          # 75% of RAM
work_mem = 64MB                     # Per-operation memory
maintenance_work_mem = 256MB        # For maintenance operations

# Connection Settings
max_connections = 100               # Adjust based on pool size × instances
listen_addresses = '*'              # Or specific IP

# Write-Ahead Log
wal_level = replica                 # For replication
max_wal_size = 1GB
min_wal_size = 80MB

# Query Planner
random_page_cost = 1.1              # For SSD storage
effective_io_concurrency = 200      # For SSD storage

# Logging
log_min_duration_statement = 1000   # Log queries > 1 second
log_statement = 'ddl'               # Log DDL statements
```

Edit `pg_hba.conf` for secure access:

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
host    thoughtmcp_prod thoughtmcp_prod 10.0.0.0/8              scram-sha-256
hostssl thoughtmcp_prod thoughtmcp_prod 0.0.0.0/0               scram-sha-256
```

---

## Database Migration Strategy

ThoughtMCP uses a versioned migration system for managing database schema changes. This section covers production migration best practices.

### Migration CLI Tool

The TypeScript migration CLI provides production-ready migration management:

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

# Reset database (development only)
npx tsx scripts/migrate.ts reset
```

### Pre-Migration Checklist

Before running migrations in production:

1. **Backup the database**

   ```bash
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Validate migrations**

   ```bash
   npx tsx scripts/migrate.ts validate
   ```

3. **Review pending changes**

   ```bash
   npx tsx scripts/migrate.ts dry-run
   ```

4. **Test in staging environment first**
   ```bash
   # Run migrations in staging
   DB_NAME=thoughtmcp_staging npx tsx scripts/migrate.ts up
   ```

### Running Migrations

#### Fresh Database Setup

```bash
# 1. Create database (if not exists)
psql -U postgres -c "CREATE DATABASE thoughtmcp_prod OWNER thoughtmcp_prod;"

# 2. Enable pgvector extension
psql -U thoughtmcp_prod -d thoughtmcp_prod -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Run all migrations
npx tsx scripts/migrate.ts up
```

#### Applying Updates

```bash
# 1. Check current status
npx tsx scripts/migrate.ts status

# 2. Preview changes
npx tsx scripts/migrate.ts dry-run

# 3. Apply migrations
npx tsx scripts/migrate.ts up
```

### Rollback Procedures

If a migration causes issues:

```bash
# 1. Check current version
npx tsx scripts/migrate.ts status

# 2. Rollback to previous version
npx tsx scripts/migrate.ts down <target_version>

# Example: Rollback from version 4 to version 3
npx tsx scripts/migrate.ts down 3
```

**⚠️ Warning**: Rollbacks may result in data loss. Always backup before rolling back.

### Migration Best Practices

1. **Always use transactions**: Migrations are wrapped in transactions automatically
2. **Make migrations idempotent**: Use `IF NOT EXISTS` and `IF EXISTS` clauses
3. **Test rollbacks**: Verify down migrations work before deploying
4. **Keep migrations small**: One logical change per migration
5. **Never modify applied migrations**: Create new migrations for changes
6. **Document breaking changes**: Note any data transformations

### Migration File Structure

Migrations are stored in `src/database/migrations/`:

```
src/database/migrations/
├── 001_initial_schema.sql        # Up migration
├── 001_initial_schema_down.sql   # Down migration
├── 002_create_indexes.sql
├── 002_create_indexes_down.sql
├── 003_reinforcement_history.sql
├── 003_reinforcement_history_down.sql
├── 004_full_text_search.sql
└── 004_full_text_search_down.sql
```

### Creating New Migrations

1. Create up migration file: `NNN_description.sql`
2. Create down migration file: `NNN_description_down.sql`
3. Add migration to `SchemaMigrationSystem` in `src/database/schema-migration.ts`
4. Test both up and down migrations
5. Validate with `npx tsx scripts/migrate.ts validate`

### Troubleshooting Migrations

#### Migration Failed Mid-Way

```bash
# Check current state
npx tsx scripts/migrate.ts status

# Migrations are transactional - failed migrations are rolled back
# Fix the issue and retry
npx tsx scripts/migrate.ts up
```

#### Version Mismatch

```bash
# Check schema_migrations table
psql -d $DB_NAME -c "SELECT * FROM schema_migrations ORDER BY version;"

# Compare with expected migrations
npx tsx scripts/migrate.ts status
```

#### Corrupted State

```bash
# In extreme cases, reset and re-migrate (DEVELOPMENT ONLY)
npx tsx scripts/migrate.ts reset

# For production, restore from backup
psql -d $DB_NAME < backup.sql
```

---

## Embedding Model Setup

### Option 1: Ollama (Recommended)

Ollama provides local embedding generation with zero API costs.

#### Install Ollama

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
brew install ollama

# Start Ollama service
ollama serve
```

#### Pull Embedding Model

```bash
# Pull nomic-embed-text (768 dimensions)
ollama pull nomic-embed-text

# Verify model
ollama list
```

#### Configure ThoughtMCP

```bash
EMBEDDING_MODEL=ollama
EMBEDDING_DIMENSION=768
OLLAMA_HOST=http://localhost:11434
```

#### Ollama Production Tips

1. **Run as systemd service:**

```bash
sudo tee /etc/systemd/system/ollama.service << EOF
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=ollama
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable ollama
sudo systemctl start ollama
```

2. **Configure for network access:**

```bash
# Allow external connections
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

3. **GPU acceleration (if available):**

```bash
# Ollama automatically uses GPU if available
# Verify with:
ollama run nomic-embed-text --verbose
```

### Option 2: E5/BGE Models

For self-hosted sentence-transformers models:

```bash
EMBEDDING_MODEL=e5
EMBEDDING_DIMENSION=1024
```

---

## Configuration

### Required Environment Variables

| Variable              | Description                  | Example                                               |
| --------------------- | ---------------------------- | ----------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `EMBEDDING_MODEL`     | Embedding model type         | `ollama`, `e5`, `bge`                                 |
| `EMBEDDING_DIMENSION` | Vector dimension             | `768`, `1024`, `1536`                                 |
| `NODE_ENV`            | Environment mode             | `production`                                          |

### Optional Environment Variables

| Variable              | Default | Description                   |
| --------------------- | ------- | ----------------------------- |
| `DB_POOL_SIZE`        | `20`    | Database connection pool size |
| `LOG_LEVEL`           | `WARN`  | Logging verbosity             |
| `CACHE_TTL`           | `300`   | Query cache TTL (seconds)     |
| `MAX_PROCESSING_TIME` | `30000` | Max operation time (ms)       |
| `ENABLE_CACHE`        | `true`  | Enable query caching          |
| `ENABLE_MONITORING`   | `true`  | Enable performance monitoring |

### Configuration Validation

Always validate configuration before deployment:

```bash
npm run config:validate
```

This checks:

- Required variables are set
- Values are valid
- Database connection works
- Embedding service is accessible

---

## Security Best Practices

### 1. Database Security

```bash
# Use SSL/TLS for database connections
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Enable SSL verification
DB_SSL_ENABLED=true
DB_SSL_CA=/path/to/ca-certificate.crt
```

### 2. Credential Management

**Never commit credentials to version control.**

Use environment variables or secrets management:

```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id thoughtmcp/prod

# HashiCorp Vault
vault kv get secret/thoughtmcp/prod

# Kubernetes Secrets
kubectl create secret generic thoughtmcp-secrets \
  --from-literal=DATABASE_URL='postgresql://...'
```

### 3. Network Security

```bash
# Restrict database access to application servers only
# In pg_hba.conf:
hostssl thoughtmcp_prod thoughtmcp_prod 10.0.1.0/24 scram-sha-256

# Use firewall rules
ufw allow from 10.0.1.0/24 to any port 5432
```

### 4. Input Validation

ThoughtMCP validates all inputs, but additional measures:

```bash
# Enable rate limiting
ENABLE_RATE_LIMITING=true
RATE_LIMIT_RPM=100
```

### 5. Logging Security

```bash
# Use WARN level in production (no sensitive data in logs)
LOG_LEVEL=WARN

# Use structured logging for log aggregation
LOG_FORMAT=json
```

### 6. Regular Updates

```bash
# Check for security vulnerabilities
npm audit

# Update dependencies
npm update

# Rebuild and test
npm run build
npm test
```

---

## Scaling and High Availability

### Horizontal Scaling

ThoughtMCP supports horizontal scaling with multiple instances:

```yaml
# docker-compose.yml for multiple instances
services:
  thoughtmcp:
    image: thoughtmcp:latest
    deploy:
      replicas: 3
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - DB_POOL_SIZE=10 # Per instance
```

**Connection Pool Sizing:**

```
Total connections = DB_POOL_SIZE × number_of_instances
Example: 10 pool × 3 instances = 30 max connections
```

### Load Balancing

Use a load balancer for multiple instances:

```nginx
# nginx.conf
upstream thoughtmcp {
    least_conn;
    server 10.0.1.1:3000;
    server 10.0.1.2:3000;
    server 10.0.1.3:3000;
}

server {
    listen 80;
    location / {
        proxy_pass http://thoughtmcp;
    }
}
```

### Database High Availability

1. **Read Replicas**: Distribute read queries
2. **Connection Pooling**: Use PgBouncer
3. **Automated Backups**: Daily minimum
4. **Point-in-Time Recovery**: Enable WAL archiving

```bash
# PgBouncer configuration
[databases]
thoughtmcp = host=primary.db.local port=5432 dbname=thoughtmcp

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

---

## Monitoring

### Health Checks

```bash
# Enable health check endpoint
ENABLE_HEALTH_CHECK=true
HEALTH_CHECK_PORT=8080

# Check health
curl http://localhost:8080/health
```

### Metrics

```bash
# Enable Prometheus metrics
ENABLE_METRICS=true
METRICS_FORMAT=prometheus

# Scrape metrics
curl http://localhost:8080/metrics
```

### Key Metrics to Monitor

| Metric               | Warning Threshold | Critical Threshold |
| -------------------- | ----------------- | ------------------ |
| Memory retrieval p95 | >200ms            | >500ms             |
| Database connections | >80% pool         | >95% pool          |
| Error rate           | >1%               | >5%                |
| Memory usage         | >80%              | >95%               |
| CPU usage            | >70%              | >90%               |

### Alerting

Set up alerts for:

1. **Database connection failures**
2. **High error rates**
3. **Slow query performance**
4. **Memory/CPU exhaustion**
5. **Embedding service unavailable**

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check logs
sudo journalctl -u postgresql
```

#### Embedding Generation Failed

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
sudo systemctl restart ollama

# Check model is available
ollama list
```

#### High Memory Usage

```bash
# Check memory usage
free -h

# Reduce pool size
DB_POOL_SIZE=10

# Enable query caching
ENABLE_CACHE=true
```

#### Slow Performance

```bash
# Enable debug logging temporarily
LOG_LEVEL=DEBUG

# Check database query performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Rebuild indexes
psql $DATABASE_URL -c "SELECT rebuild_vector_indexes();"
```

### Getting Help

1. Check [Troubleshooting Guide](./troubleshooting.md)
2. Search [GitHub Issues](https://github.com/keyurgolani/ThoughtMcp/issues)
3. Enable debug logging: `LOG_LEVEL=DEBUG`
4. Create issue with:
   - Error message and stack trace
   - Configuration (without credentials)
   - Steps to reproduce

---

## Deployment Checklist

Before going live:

- [ ] Configuration validated (`npm run config:validate`)
- [ ] Database migrations applied (`npm run db:migrate`)
- [ ] SSL/TLS enabled for database
- [ ] Credentials stored securely (not in code)
- [ ] Logging configured appropriately
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit passed (`npm audit`)
- [ ] Documentation reviewed

---

**Last Updated**: December 2025
**Version**: 0.5.0
