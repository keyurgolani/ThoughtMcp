# Environment Configuration Guide

This document describes all environment variables used by ThoughtMCP and their purposes.

## Quick Start

1. Copy `.env.example` to `.env.development`:

   ```bash
   cp .env.example .env.development
   ```

2. Update the database credentials and other settings as needed

3. Start the development environment (see [DEVELOPMENT.md](./DEVELOPMENT.md))

## Environment Files

- `.env.example` - Template with all available variables and documentation
- `.env.development` - Local development configuration (not committed)
- `.env.test` - Test environment configuration (not committed)
- `.env.production` - Production configuration (not committed, deploy separately)

## Required Variables

### PostgreSQL Database

#### `DATABASE_URL`

- **Type**: String (PostgreSQL connection URL)
- **Required**: Yes
- **Default**: None
- **Example**: `postgresql://user:password@localhost:5432/thoughtmcp`
- **Description**: Complete PostgreSQL connection string. Can be used instead of individual DB\_\* variables.

#### `DB_HOST`

- **Type**: String
- **Required**: Yes (if DATABASE_URL not provided)
- **Default**: `localhost`
- **Description**: PostgreSQL server hostname or IP address

#### `DB_PORT`

- **Type**: Number
- **Required**: Yes (if DATABASE_URL not provided)
- **Default**: `5432`
- **Description**: PostgreSQL server port

#### `DB_NAME`

- **Type**: String
- **Required**: Yes (if DATABASE_URL not provided)
- **Default**: `thoughtmcp`
- **Description**: Database name to connect to

#### `DB_USER`

- **Type**: String
- **Required**: Yes (if DATABASE_URL not provided)
- **Default**: None
- **Description**: Database user for authentication

#### `DB_PASSWORD`

- **Type**: String
- **Required**: Yes (if DATABASE_URL not provided)
- **Default**: None
- **Description**: Database password for authentication

#### `DB_POOL_SIZE`

- **Type**: Number
- **Required**: No
- **Default**: `20`
- **Description**: Maximum number of database connections in the pool. Adjust based on expected concurrent operations.
- **Recommendations**:
  - Development: 5-10
  - Production: 20-50
  - Test: 5

### Embedding Model

#### `EMBEDDING_MODEL`

- **Type**: String (enum)
- **Required**: Yes
- **Default**: `ollama`
- **Options**: `ollama`, `e5`, `bge`, `openai`
- **Description**: Embedding model to use for vector generation
- **Details**:
  - `ollama`: Local Ollama models (recommended for development, zero cost)
  - `e5`: Sentence-transformers E5 models (local, zero cost)
  - `bge`: BAAI BGE models (local, zero cost)
  - `openai`: OpenAI API (requires API key, incurs costs)

#### `EMBEDDING_DIMENSION`

- **Type**: Number
- **Required**: Yes
- **Default**: Depends on model
- **Description**: Vector dimension size (must match selected model)
- **Model-specific values**:
  - `ollama` (nomic-embed-text): 768
  - `e5-large`: 1024
  - `bge-large`: 1024
  - `openai` (text-embedding-3-small): 1536

#### `OLLAMA_HOST`

- **Type**: String (URL)
- **Required**: Only if `EMBEDDING_MODEL=ollama`
- **Default**: `http://localhost:11434`
- **Description**: Ollama server URL

#### `OPENAI_API_KEY`

- **Type**: String
- **Required**: Only if `EMBEDDING_MODEL=openai`
- **Default**: None
- **Description**: OpenAI API key for embedding generation

## Optional Variables

### Logging

#### `LOG_LEVEL`

- **Type**: String (enum)
- **Required**: No
- **Default**: `WARN`
- **Options**: `DEBUG`, `INFO`, `WARN`, `ERROR`
- **Description**: Logging verbosity level
- **Recommendations**:
  - Development: `DEBUG`
  - Production: `WARN`
  - Test: `ERROR`

### Environment

#### `NODE_ENV`

- **Type**: String (enum)
- **Required**: No
- **Default**: `production`
- **Options**: `development`, `production`, `test`
- **Description**: Application environment mode

### Performance

#### `CACHE_TTL`

- **Type**: Number (seconds)
- **Required**: No
- **Default**: `300` (5 minutes)
- **Description**: Query result cache time-to-live in seconds
- **Recommendations**:
  - Development: 60 (1 minute)
  - Production: 300 (5 minutes)
  - Test: 10 (10 seconds)

#### `MAX_PROCESSING_TIME`

- **Type**: Number (milliseconds)
- **Required**: No
- **Default**: `30000` (30 seconds)
- **Description**: Maximum time allowed for processing operations before timeout

### Feature Flags

#### `ENABLE_CACHE`

- **Type**: Boolean
- **Required**: No
- **Default**: `true`
- **Description**: Enable/disable query result caching

#### `ENABLE_MONITORING`

- **Type**: Boolean
- **Required**: No
- **Default**: `true`
- **Description**: Enable/disable performance monitoring

#### `ENABLE_BIAS_DETECTION`

- **Type**: Boolean
- **Required**: No
- **Default**: `true`
- **Description**: Enable/disable bias detection in reasoning

#### `ENABLE_EMOTION_DETECTION`

- **Type**: Boolean
- **Required**: No
- **Default**: `true`
- **Description**: Enable/disable emotion detection in input

## Environment-Specific Configurations

### Development

```bash
# Optimized for local development
LOG_LEVEL=DEBUG
NODE_ENV=development
DB_POOL_SIZE=10
CACHE_TTL=60
EMBEDDING_MODEL=ollama
```

### Test

```bash
# Optimized for automated testing
LOG_LEVEL=ERROR
NODE_ENV=test
DB_POOL_SIZE=5
CACHE_TTL=10
EMBEDDING_MODEL=ollama
```

### Production

```bash
# Optimized for production deployment
LOG_LEVEL=WARN
NODE_ENV=production
DB_POOL_SIZE=20
CACHE_TTL=300
EMBEDDING_MODEL=ollama
```

## Security Best Practices

1. **Never commit `.env.*` files** (except `.env.example`)
2. **Use strong passwords** for database credentials
3. **Rotate credentials regularly** in production
4. **Use environment-specific databases** (separate dev/test/prod)
5. **Restrict database user permissions** to minimum required
6. **Use SSL/TLS** for database connections in production
7. **Store production secrets** in secure secret management systems (AWS Secrets Manager, HashiCorp Vault, etc.)

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check credentials are correct
- Verify database exists: `psql -U postgres -l`
- Check firewall/network settings

**Problem**: Connection pool exhausted

- Increase `DB_POOL_SIZE`
- Check for connection leaks in application code
- Monitor active connections: `SELECT count(*) FROM pg_stat_activity;`

### Embedding Issues

**Problem**: Ollama connection failed

- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check `OLLAMA_HOST` is correct
- Ensure model is pulled: `ollama pull nomic-embed-text`

**Problem**: Dimension mismatch

- Verify `EMBEDDING_DIMENSION` matches your model
- Check model documentation for correct dimension size

### Performance Issues

**Problem**: Slow query performance

- Increase `CACHE_TTL` to cache results longer
- Verify database indexes are created
- Check `DB_POOL_SIZE` is adequate
- Monitor query execution times

**Problem**: Timeout errors

- Increase `MAX_PROCESSING_TIME`
- Optimize complex operations
- Check database query performance

## See Also

- [Development Guide](./DEVELOPMENT.md) - Setup and development workflow
- [Testing Guide](./TESTING.md) - Testing configuration and practices
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
