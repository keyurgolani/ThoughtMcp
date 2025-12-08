# Environment Configuration Guide

This document describes all environment variables used by ThoughtMCP and their purposes.

## Quick Start

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update the database credentials and other settings as needed

3. Start the development environment (see [development.md](./development.md))

## Environment Files

ThoughtMCP uses a unified environment variable configuration system where `.env` files are the **single source of truth** for all configuration values.

| File                      | Purpose                                                | Committed |
| ------------------------- | ------------------------------------------------------ | --------- |
| `.env.example`            | Template with all variables and documentation          | Yes       |
| `.env`                    | Local configuration (copy from .env.example)           | No        |
| `.env.development`        | Development-specific overrides                         | No        |
| `.env.test`               | Test environment overrides                             | No        |
| `.env.production`         | Production configuration (see .env.production.example) | No        |
| `.env.production.example` | Production template with security guidance             | Yes       |

Docker Compose files reference these variables via `${VAR_NAME:-default}` syntax, ensuring both Docker Compose and local development use the same configuration values.

## Complete Environment Variable Reference

### Development Database (docker-compose.dev.yml)

| Variable       | Type   | Default          | Required | Description                              |
| -------------- | ------ | ---------------- | -------- | ---------------------------------------- |
| `DB_HOST`      | String | `localhost`      | Yes\*    | PostgreSQL server hostname or IP address |
| `DB_PORT`      | Number | `5432`           | Yes\*    | PostgreSQL server port                   |
| `DB_NAME`      | String | `thoughtmcp_dev` | Yes\*    | Database name to connect to              |
| `DB_USER`      | String | `thoughtmcp_dev` | Yes\*    | Database user for authentication         |
| `DB_PASSWORD`  | String | `dev_password`   | Yes\*    | Database password for authentication     |
| `DATABASE_URL` | String | Constructed      | Yes      | Full PostgreSQL connection string        |
| `DB_POOL_SIZE` | Number | `20`             | No       | Maximum database connections in pool     |

\*Required if `DATABASE_URL` is not provided.

**DATABASE_URL Format:**

```
postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
```

**Pool Size Recommendations:**

- Development: 5-10
- Production: 20-50
- Test: 5

### Development Ollama (docker-compose.dev.yml)

| Variable              | Type   | Default                  | Required | Description                         |
| --------------------- | ------ | ------------------------ | -------- | ----------------------------------- |
| `OLLAMA_HOST`         | URL    | `http://localhost:11434` | Yes      | Ollama API host URL                 |
| `OLLAMA_PORT`         | Number | `11434`                  | No       | Ollama port for Docker port mapping |
| `EMBEDDING_MODEL`     | String | `nomic-embed-text`       | Yes      | Embedding model name                |
| `EMBEDDING_DIMENSION` | Number | `768`                    | Yes      | Vector dimension (must match model) |

**Supported Embedding Models:**

| Model               | Dimension | Notes                                  |
| ------------------- | --------- | -------------------------------------- |
| `nomic-embed-text`  | 768       | Recommended for development, zero cost |
| `mxbai-embed-large` | 1024      | Higher quality, larger vectors         |

### Test Configuration (docker-compose.test.yml)

| Variable                | Type   | Default                  | Required | Description                                   |
| ----------------------- | ------ | ------------------------ | -------- | --------------------------------------------- |
| `TEST_DB_HOST`          | String | `localhost`              | No       | Test database host                            |
| `TEST_DB_PORT`          | Number | `5433`                   | No       | Test database port (avoids conflict with dev) |
| `TEST_DB_NAME`          | String | `thoughtmcp_test`        | No       | Test database name                            |
| `TEST_DB_USER`          | String | `thoughtmcp_test`        | No       | Test database user                            |
| `TEST_DB_PASSWORD`      | String | `test_password`          | No       | Test database password                        |
| `TEST_OLLAMA_HOST`      | URL    | `http://localhost:11435` | No       | Test Ollama host URL                          |
| `TEST_OLLAMA_PORT`      | Number | `11435`                  | No       | Test Ollama port (avoids conflict with dev)   |
| `TEST_CONTAINER_PREFIX` | String | `thoughtmcp-test`        | No       | Prefix for test container names               |

**Note:** Test ports are offset from development ports to allow running both environments simultaneously.

### Container Management (TestContainerManager)

| Variable                    | Type    | Default       | Required | Description                                     |
| --------------------------- | ------- | ------------- | -------- | ----------------------------------------------- |
| `AUTO_START_CONTAINERS`     | Boolean | `true`        | No       | Automatically start containers when tests begin |
| `CONTAINER_STARTUP_TIMEOUT` | Number  | `60`          | No       | Timeout in seconds for container health checks  |
| `KEEP_CONTAINERS_RUNNING`   | Boolean | `false`       | No       | Keep containers running after tests complete    |
| `PRESERVE_TEST_DATA`        | Boolean | `false`       | No       | Preserve test data volumes for debugging        |
| `CI`                        | Boolean | Auto-detected | No       | CI environment flag for optimized settings      |

**Usage Scenarios:**

| Scenario            | AUTO_START_CONTAINERS | KEEP_CONTAINERS_RUNNING | PRESERVE_TEST_DATA |
| ------------------- | --------------------- | ----------------------- | ------------------ |
| Normal test run     | `true`                | `false`                 | `false`            |
| Rapid iteration     | `true`                | `true`                  | `false`            |
| Debug test failures | `true`                | `true`                  | `true`             |
| Manual containers   | `false`               | N/A                     | N/A                |
| CI/CD pipeline      | `true`                | `false`                 | `false`            |

### Application Settings

| Variable     | Type | Default       | Required | Description                                              |
| ------------ | ---- | ------------- | -------- | -------------------------------------------------------- |
| `NODE_ENV`   | Enum | `development` | No       | Environment mode: `development`, `production`, `test`    |
| `LOG_LEVEL`  | Enum | `DEBUG`       | No       | Logging verbosity: `DEBUG`, `INFO`, `WARN`, `ERROR`      |
| `LOG_FORMAT` | Enum | `text`        | No       | Log format: `text` (human-readable), `json` (structured) |

**Recommended Settings by Environment:**

| Environment | NODE_ENV      | LOG_LEVEL | LOG_FORMAT |
| ----------- | ------------- | --------- | ---------- |
| Development | `development` | `DEBUG`   | `text`     |
| Test        | `test`        | `ERROR`   | `text`     |
| Production  | `production`  | `WARN`    | `json`     |

### Performance Configuration

| Variable              | Type    | Default | Required | Description                             |
| --------------------- | ------- | ------- | -------- | --------------------------------------- |
| `CACHE_TTL`           | Number  | `300`   | No       | Query cache TTL in seconds (5 minutes)  |
| `MAX_PROCESSING_TIME` | Number  | `30000` | No       | Maximum processing time in milliseconds |
| `ENABLE_CACHE`        | Boolean | `true`  | No       | Enable query result caching             |
| `ENABLE_MONITORING`   | Boolean | `true`  | No       | Enable performance monitoring           |

### Feature Flags

| Variable                   | Type    | Default | Required | Description                        |
| -------------------------- | ------- | ------- | -------- | ---------------------------------- |
| `ENABLE_BIAS_DETECTION`    | Boolean | `true`  | No       | Enable bias detection in reasoning |
| `ENABLE_EMOTION_DETECTION` | Boolean | `true`  | No       | Enable emotion detection in input  |
| `ENABLE_METACOGNITION`     | Boolean | `true`  | No       | Enable metacognitive monitoring    |

### pgAdmin (Optional Development Tool)

| Variable           | Type   | Default                  | Required | Description                |
| ------------------ | ------ | ------------------------ | -------- | -------------------------- |
| `PGADMIN_EMAIL`    | String | `admin@thoughtmcp.local` | No       | pgAdmin login email        |
| `PGADMIN_PASSWORD` | String | `admin`                  | No       | pgAdmin login password     |
| `PGADMIN_PORT`     | Number | `5050`                   | No       | pgAdmin web interface port |

**Start pgAdmin:**

```bash
docker compose -f docker-compose.dev.yml --profile tools up -d
```

Access at: http://localhost:5050

### Production Database (docker-compose.prod.yml)

| Variable            | Type   | Default      | Required | Description                                     |
| ------------------- | ------ | ------------ | -------- | ----------------------------------------------- |
| `POSTGRES_USER`     | String | `thoughtmcp` | Yes      | PostgreSQL user for production                  |
| `POSTGRES_PASSWORD` | String | None         | Yes      | PostgreSQL password (generate strong password!) |
| `POSTGRES_DB`       | String | `thoughtmcp` | Yes      | PostgreSQL database name                        |
| `POSTGRES_PORT`     | Number | `5432`       | No       | PostgreSQL external port                        |

**Security Warning:** Always change default passwords before deploying to production. Generate strong passwords:

```bash
openssl rand -base64 32
```

### Production Security Configuration

| Variable                | Type    | Default | Required | Description                              |
| ----------------------- | ------- | ------- | -------- | ---------------------------------------- |
| `DB_SSL_ENABLED`        | Boolean | `true`  | No       | Enable SSL/TLS for database connections  |
| `DB_SSL_CA`             | String  | None    | No       | Path to CA certificate for database SSL  |
| `ENABLE_RATE_LIMITING`  | Boolean | `true`  | No       | Enable rate limiting to prevent abuse    |
| `RATE_LIMIT_RPM`        | Number  | `100`   | No       | Rate limit: requests per minute per user |
| `DB_CONNECTION_TIMEOUT` | Number  | `5000`  | No       | Connection timeout in milliseconds       |
| `DB_IDLE_TIMEOUT`       | Number  | `30000` | No       | Idle connection timeout in milliseconds  |
| `OLLAMA_TIMEOUT`        | Number  | `30000` | No       | Ollama request timeout in milliseconds   |

### Production Monitoring

| Variable              | Type    | Default      | Required | Description                          |
| --------------------- | ------- | ------------ | -------- | ------------------------------------ |
| `ENABLE_HEALTH_CHECK` | Boolean | `true`       | No       | Enable health check endpoint         |
| `HEALTH_CHECK_PORT`   | Number  | `8080`       | No       | Health check port                    |
| `ENABLE_METRICS`      | Boolean | `true`       | No       | Enable metrics collection            |
| `METRICS_FORMAT`      | Enum    | `prometheus` | No       | Metrics format: `prometheus`, `json` |

### Production Resource Limits

| Variable             | Type   | Default | Required | Description                            |
| -------------------- | ------ | ------- | -------- | -------------------------------------- |
| `MAX_MEMORY_MB`      | Number | `512`   | No       | Maximum memory per operation in MB     |
| `MAX_CONCURRENT_OPS` | Number | `10`    | No       | Maximum concurrent operations          |
| `MAX_BATCH_SIZE`     | Number | `1000`  | No       | Maximum batch size for bulk operations |

### Temporal Decay Configuration

| Variable           | Type    | Default     | Required | Description                          |
| ------------------ | ------- | ----------- | -------- | ------------------------------------ |
| `ENABLE_DECAY`     | Boolean | `true`      | No       | Enable automatic memory decay        |
| `DECAY_SCHEDULE`   | Cron    | `0 2 * * *` | No       | Decay scheduler cron (daily at 2 AM) |
| `DECAY_BATCH_SIZE` | Number  | `1000`      | No       | Decay batch size                     |

### Backup Configuration (Optional)

| Variable                | Type    | Default     | Required | Description                     |
| ----------------------- | ------- | ----------- | -------- | ------------------------------- |
| `ENABLE_AUTO_BACKUP`    | Boolean | `false`     | No       | Enable automatic backups        |
| `BACKUP_SCHEDULE`       | Cron    | `0 3 * * *` | No       | Backup schedule (daily at 3 AM) |
| `BACKUP_RETENTION_DAYS` | Number  | `30`        | No       | Backup retention in days        |
| `BACKUP_PATH`           | String  | None        | No       | Backup storage path             |

## Environment-Specific Configurations

### Development

```bash
# .env (copy from .env.example)
NODE_ENV=development
LOG_LEVEL=DEBUG
LOG_FORMAT=text
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thoughtmcp_dev
DB_USER=thoughtmcp_dev
DB_PASSWORD=dev_password
DB_POOL_SIZE=10
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768
CACHE_TTL=60
```

### Test

```bash
# Test environment (used by TestContainerManager)
NODE_ENV=test
LOG_LEVEL=ERROR
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=thoughtmcp_test
TEST_DB_USER=thoughtmcp_test
TEST_DB_PASSWORD=test_password
TEST_OLLAMA_HOST=http://localhost:11435
TEST_OLLAMA_PORT=11435
AUTO_START_CONTAINERS=true
KEEP_CONTAINERS_RUNNING=false
```

### Production

```bash
# .env.production (copy from .env.production.example)
NODE_ENV=production
LOG_LEVEL=WARN
LOG_FORMAT=json
POSTGRES_USER=thoughtmcp
POSTGRES_PASSWORD=your_secure_production_password
POSTGRES_DB=thoughtmcp
DB_POOL_SIZE=20
DB_SSL_ENABLED=true
ENABLE_RATE_LIMITING=true
RATE_LIMIT_RPM=100
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768
```

## Docker Compose Integration

Docker Compose files use environment variable substitution to read values from `.env` files:

```yaml
# Example from docker-compose.dev.yml
services:
  postgres:
    environment:
      POSTGRES_USER: ${DB_USER:-thoughtmcp_dev}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev_password}
      POSTGRES_DB: ${DB_NAME:-thoughtmcp_dev}
    ports:
      - "${DB_PORT:-5432}:5432"
```

**How it works:**

1. Docker Compose reads `.env` file in the same directory
2. Variables are substituted using `${VAR_NAME:-default}` syntax
3. If variable is not set, the default value after `:-` is used
4. Both Docker Compose and application code use the same values

**Specifying environment file:**

```bash
# Use default .env
docker compose -f docker-compose.dev.yml up -d

# Use specific environment file
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## Security Best Practices

1. **Never commit `.env.*` files** (except `.env.example` and `.env.production.example`)
2. **Use strong passwords** - Generate with `openssl rand -base64 32`
3. **Rotate credentials regularly** in production
4. **Use environment-specific databases** - Separate dev/test/prod
5. **Restrict database user permissions** to minimum required
6. **Enable SSL/TLS** for database connections in production (`DB_SSL_ENABLED=true`)
7. **Store production secrets** in secure secret management systems:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager
8. **Enable rate limiting** in production (`ENABLE_RATE_LIMITING=true`)
9. **Use JSON logging** in production for log aggregation (`LOG_FORMAT=json`)
10. **Don't expose database ports** externally in production

## Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL

```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Check credentials
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME

# Verify database exists
psql -U postgres -l
```

**Problem**: Connection pool exhausted

- Increase `DB_POOL_SIZE`
- Check for connection leaks
- Monitor: `SELECT count(*) FROM pg_stat_activity;`

### Container Issues

**Problem**: Test containers won't start

```bash
# Check if ports are in use
lsof -i :5433
lsof -i :11435

# Check Docker status
docker ps -a | grep thoughtmcp

# View container logs
docker compose -f docker-compose.test.yml logs
```

**Problem**: Containers start but tests fail

- Verify `TEST_DB_PORT` and `TEST_OLLAMA_PORT` match running containers
- Check `AUTO_START_CONTAINERS` is `true`
- Increase `CONTAINER_STARTUP_TIMEOUT` if containers are slow to start

### Embedding Issues

**Problem**: Ollama connection failed

```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Check model is available
ollama list

# Pull model if missing
ollama pull nomic-embed-text
```

**Problem**: Dimension mismatch

- Verify `EMBEDDING_DIMENSION` matches your model
- `nomic-embed-text`: 768
- `mxbai-embed-large`: 1024

### Performance Issues

**Problem**: Slow query performance

- Increase `CACHE_TTL` to cache results longer
- Verify database indexes are created
- Check `DB_POOL_SIZE` is adequate
- Enable monitoring: `ENABLE_MONITORING=true`

**Problem**: Timeout errors

- Increase `MAX_PROCESSING_TIME`
- Increase `OLLAMA_TIMEOUT` for embedding operations
- Check database query performance

## Configuration Validation

Before deploying, validate your configuration:

```bash
# Run configuration validator
npm run validate:config
```

This checks:

- All required variables are set
- Values are valid and within expected ranges
- Database connection works
- Embedding service is accessible
- Production security settings are enabled

## See Also

- [Development Guide](./development.md) - Setup and development workflow
- [Testing Guide](./testing.md) - Testing configuration and practices
- [Docker Deployment Guide](./docker-deployment.md) - Docker Compose usage
- [Deployment Guide](./deployment.md) - Production deployment instructions
- [Troubleshooting Guide](./troubleshooting.md) - Common issues and solutions

---

**Last Updated**: December 2025
**Version**: 0.6.0
