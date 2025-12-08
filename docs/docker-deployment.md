# Docker Deployment Guide

This guide covers deploying ThoughtMCP using Docker Compose for development, testing, and production environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Compose Files](#docker-compose-files)
- [Environment Configuration](#environment-configuration)
- [MCP Client Configuration](#mcp-client-configuration)
- [Deployment Commands](#deployment-commands)
- [Troubleshooting](#troubleshooting)

---

## Overview

ThoughtMCP uses a **unified Docker Compose approach** where Docker Compose files are the single source of truth for all container configuration. This ensures consistency whether containers are started manually or automatically by the test framework.

### Key Principles

1. **Single Source of Truth**: All container configuration lives in Docker Compose files
2. **Environment Variables via .env**: All configuration comes from `.env` files, referenced by Docker Compose
3. **Consistent Experience**: Same Docker Compose files are used for manual and automated container management
4. **Separate Environments**: Different compose files for development, testing, and production

### Docker Compose Files

| File                      | Purpose                 | When to Use                          |
| ------------------------- | ----------------------- | ------------------------------------ |
| `docker-compose.dev.yml`  | Development environment | Local development with `npm run dev` |
| `docker-compose.test.yml` | Test containers         | Automated tests or manual test runs  |
| `docker-compose.prod.yml` | Production deployment   | Deploying the full MCP server stack  |

---

## Prerequisites

### Required Software

- **Docker**: 20.10 or higher
- **Docker Compose**: V2 (included with Docker Desktop)
- **Node.js**: 18.0.0 or higher (for building the MCP server)

### Verify Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10.0 or higher

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.x.x

# Check Docker is running
docker info
# Should show Docker system information
```

---

## Quick Start

### Development Environment

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start development containers
docker compose -f docker-compose.dev.yml up -d

# 3. Wait for containers to be healthy
docker compose -f docker-compose.dev.yml ps

# 4. Pull the embedding model (first time only)
docker exec thoughtmcp-ollama-dev ollama pull nomic-embed-text

# 5. Run the MCP server locally
npm run dev
```

### Test Environment

```bash
# Option 1: Automatic (recommended)
# Tests automatically start/stop containers via TestContainerManager
npm test

# Option 2: Manual
# Start test containers manually
docker compose -f docker-compose.test.yml up -d --wait

# Run tests with containers already running
AUTO_START_CONTAINERS=false npm test

# Stop test containers
docker compose -f docker-compose.test.yml down
```

### Production Environment

```bash
# 1. Copy production environment template
cp .env.production.example .env.production

# 2. Edit production configuration
nano .env.production

# 3. Build the MCP server
npm run build

# 4. Start production stack
docker compose -f docker-compose.prod.yml up -d

# 5. View logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Docker Compose Files

### docker-compose.dev.yml (Development)

Development environment with persistent data volumes.

**Services:**

- `postgres`: PostgreSQL 16 with pgvector extension
- `ollama`: Ollama for local embedding generation
- `pgadmin`: (Optional) pgAdmin web interface for database management

**Features:**

- Named volumes for data persistence between restarts
- Health checks for all services
- Automatic restart on failure
- Optional pgAdmin with `--profile tools`

**Usage:**

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Start with pgAdmin
docker compose -f docker-compose.dev.yml --profile tools up -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services (keep data)
docker compose -f docker-compose.dev.yml down

# Stop services and remove data
docker compose -f docker-compose.dev.yml down -v
```

### docker-compose.test.yml (Testing)

Test environment with isolated containers and no persistent data.

**Services:**

- `postgres-test`: PostgreSQL for testing (port 5433 by default)
- `ollama-test`: Ollama for test embeddings (port 11435 by default)

**Features:**

- No persistent volumes (fresh state each run)
- Separate ports to avoid conflicts with development
- Faster health check intervals
- Container name prefix for easy identification

**Usage:**

```bash
# Start test containers
docker compose -f docker-compose.test.yml up -d --wait

# Check status
docker compose -f docker-compose.test.yml ps

# View logs
docker compose -f docker-compose.test.yml logs -f

# Stop and remove containers
docker compose -f docker-compose.test.yml down
```

### docker-compose.prod.yml (Production)

Production deployment with the full MCP server stack.

**Services:**

- `postgres`: PostgreSQL with persistent storage
- `ollama`: Ollama with model caching
- `thoughtmcp`: ThoughtMCP MCP server (runs in standby mode by default)

**Features:**

- Automatic dependency ordering (postgres → ollama → thoughtmcp)
- Health check conditions for service startup
- Persistent volumes for data and models
- Production-optimized configuration
- **MCP Standby Mode**: Container stays alive, MCP clients connect via `docker exec`

**MCP Standby Mode (Default):**

By default, the thoughtmcp container runs in `MCP_STANDBY_MODE=true`. This means:

- The container stays alive without starting the MCP server process
- MCP clients connect via `docker exec -i thoughtmcp-server node dist/index.js`
- Each client connection spawns a dedicated MCP server process inside the container
- All environment variables are pre-configured inside the container
- No need to manage environment variables in your MCP client config

**Prerequisites:**

1. Configure `.env.production`

**Usage:**

```bash
# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f thoughtmcp

# Stop services
docker compose -f docker-compose.prod.yml down

# Stop and remove all data
docker compose -f docker-compose.prod.yml down -v
```

---

## Environment Configuration

### The .env File System

ThoughtMCP uses `.env` files as the single source of truth for configuration. Docker Compose files reference these variables using `${VAR_NAME:-default}` syntax.

**File Hierarchy:**

- `.env.example` - Template with all variables documented
- `.env` - Your local configuration (not committed)
- `.env.production` - Production configuration (not committed)

### Setting Up Your Environment

```bash
# Copy the template
cp .env.example .env

# Edit configuration
nano .env
```

### Key Environment Variables

#### Database Configuration (Development)

```bash
# Development database (docker-compose.dev.yml)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thoughtmcp_dev
DB_USER=thoughtmcp_dev
DB_PASSWORD=dev_password
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
```

#### Database Configuration (Testing)

```bash
# Test database (docker-compose.test.yml)
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=thoughtmcp_test
TEST_DB_USER=thoughtmcp_test
TEST_DB_PASSWORD=test_password
TEST_CONTAINER_PREFIX=thoughtmcp-test
```

#### Ollama Configuration

```bash
# Development Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_PORT=11434

# Test Ollama
TEST_OLLAMA_HOST=http://localhost:11435
TEST_OLLAMA_PORT=11435

# Embedding model
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSION=768
```

#### Container Management

```bash
# TestContainerManager behavior
AUTO_START_CONTAINERS=true      # Auto-start containers for tests
CONTAINER_STARTUP_TIMEOUT=60    # Health check timeout (seconds)
KEEP_CONTAINERS_RUNNING=false   # Keep containers after tests
PRESERVE_TEST_DATA=false        # Preserve test data volumes
```

### Production Configuration

For production, copy and configure `.env.production.example`:

```bash
cp .env.production.example .env.production
nano .env.production
```

**Important production settings:**

```bash
# Strong passwords
POSTGRES_USER=thoughtmcp
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=thoughtmcp

# Production logging
LOG_LEVEL=WARN
LOG_FORMAT=json
NODE_ENV=production
```

---

## MCP Client Configuration

### Overview

To use ThoughtMCP with an MCP client (like Kiro IDE), you need to configure the client to connect to the MCP server. There are two connection methods:

1. **Docker Exec (Recommended for Production)**: Connect directly to the running Docker container
2. **Local Node Process (Development)**: Run the MCP server locally, connecting to Docker services

### Configuration File

Create or edit your MCP client configuration file. For Kiro IDE, this is typically at `.kiro/settings/mcp.json` in your workspace or `~/.kiro/settings/mcp.json` globally.

### Option 1: Docker Exec (Recommended for Production)

This method connects directly to the running Docker container. The container runs in standby mode, waiting for MCP client connections.

**Prerequisites:**

```bash
docker compose -f docker-compose.prod.yml up -d
```

**Configuration:**

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "docker",
      "args": ["exec", "-i", "thoughtmcp-server", "node", "dist/index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": [
        "store_memory",
        "retrieve_memories",
        "search_memories",
        "update_memory",
        "delete_memory",
        "think",
        "think_parallel",
        "analyze_systematically",
        "decompose_problem",
        "assess_confidence",
        "detect_bias",
        "detect_emotion",
        "analyze_reasoning"
      ]
    }
  }
}
```

**Benefits:**

- No environment variables needed in MCP config (all pre-configured in container)
- Uses the same environment as the Docker stack (internal network for postgres/ollama)
- Simpler configuration
- Production-ready setup

### Option 2: Local Node Process (Development)

This method runs the MCP server locally while connecting to Docker services (postgres, ollama) via localhost.

**Prerequisites:**

```bash
docker compose -f docker-compose.dev.yml up -d
npm run build
```

**Configuration:**

```json
{
  "mcpServers": {
    "thoughtmcp": {
      "command": "node",
      "args": ["/absolute/path/to/ThoughtMcp/dist/index.js"],
      "env": {
        "NODE_ENV": "development",
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "thoughtmcp_dev",
        "DB_USER": "thoughtmcp_dev",
        "DB_PASSWORD": "dev_password",
        "OLLAMA_HOST": "http://localhost:11434",
        "EMBEDDING_MODEL": "nomic-embed-text",
        "EMBEDDING_DIMENSION": "768",
        "LOG_LEVEL": "INFO",
        "BUILD_TIMESTAMP": "2025-12-07T00:00:00Z"
      },
      "disabled": false,
      "autoApprove": [
        "store_memory",
        "retrieve_memories",
        "search_memories",
        "think",
        "assess_confidence"
      ]
    }
  }
}
```

**Notes:**

1. **Use Absolute Paths**: Always use absolute paths for the `args` array
2. **Match .env Values**: Environment variables must match your `.env` file
3. **Start Containers First**: Docker containers must be running before the MCP server starts
4. **Update BUILD_TIMESTAMP**: Change this value to trigger MCP server restart after rebuilding

### Verifying Configuration

**For Docker Exec method:**

1. Start Docker containers:

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

2. Verify container is running in standby mode:

   ```bash
   docker logs thoughtmcp-server 2>&1 | grep "MCP_STANDBY_MODE"
   # Should show: Running in MCP_STANDBY_MODE - container ready for MCP client connections
   ```

3. In your MCP client, verify the tools are available

**For Local Node Process method:**

1. Start Docker containers:

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

2. Build the MCP server:

   ```bash
   npm run build
   ```

3. In your MCP client, verify the tools are available

**Available Tools:**

- `store_memory` - Store memories with five-sector embeddings
- `retrieve_memories` - Retrieve memories with composite scoring
- `search_memories` - Full-text and vector search
- `update_memory` - Update existing memories
- `delete_memory` - Delete memories (soft or hard)
- `think` - Single-mode reasoning
- `think_parallel` - Parallel reasoning streams
- `analyze_systematically` - Framework-based analysis
- `decompose_problem` - Problem decomposition
- `assess_confidence` - Confidence assessment
- `detect_bias` - Bias detection
- `detect_emotion` - Emotion detection
- `analyze_reasoning` - Comprehensive reasoning analysis

---

## Deployment Commands

### npm Scripts

ThoughtMCP provides npm scripts for common Docker operations:

```bash
# Development
npm run docker:up:dev      # Start development containers
npm run docker:down        # Stop all containers
npm run dev:docker         # Start containers + run dev server

# Testing
npm run docker:up:test     # Start test containers
npm test                   # Run tests (auto-starts containers)

# Production
npm run docker:up:prod     # Start production stack

# Utilities
npm run docker:logs:dev    # View development logs
npm run docker:logs:test   # View test logs
npm run docker:down:volumes # Stop and remove all data
```

### Direct Docker Compose Commands

```bash
# Development
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml logs -f

# Testing
docker compose -f docker-compose.test.yml up -d --wait
docker compose -f docker-compose.test.yml down

# Production
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml down -v
```

### Container Management

```bash
# List running containers
docker compose -f docker-compose.dev.yml ps

# Check container health
docker inspect --format='{{.State.Health.Status}}' thoughtmcp-postgres-dev

# Execute command in container
docker exec -it thoughtmcp-postgres-dev psql -U thoughtmcp_dev -d thoughtmcp_dev

# Pull embedding model
docker exec thoughtmcp-ollama-dev ollama pull nomic-embed-text

# View container logs
docker logs -f thoughtmcp-postgres-dev
```

---

## Troubleshooting

### Docker Not Running

**Symptom:** `Cannot connect to the Docker daemon`

**Solution:**

```bash
# macOS/Windows: Start Docker Desktop

# Linux: Start Docker service
sudo systemctl start docker

# Verify Docker is running
docker info
```

### Port Already in Use

**Symptom:** `Bind for 0.0.0.0:5432 failed: port is already allocated`

**Solution:**

```bash
# Find what's using the port
lsof -i :5432

# Option 1: Stop the conflicting service
# Option 2: Change the port in .env
DB_PORT=5433
```

### Container Health Check Failing

**Symptom:** Container stays in "starting" or "unhealthy" state

**Solution:**

```bash
# Check container logs
docker logs thoughtmcp-postgres-dev

# Check health check status
docker inspect --format='{{json .State.Health}}' thoughtmcp-postgres-dev

# Common fixes:
# - Increase health check timeout in .env
# - Check if initialization scripts have errors
# - Verify environment variables are correct
```

### Database Connection Failed

**Symptom:** `ECONNREFUSED` or `Connection refused`

**Solution:**

```bash
# Verify container is running
docker compose -f docker-compose.dev.yml ps

# Check container is healthy
docker inspect --format='{{.State.Health.Status}}' thoughtmcp-postgres-dev

# Test connection manually
docker exec -it thoughtmcp-postgres-dev pg_isready -U thoughtmcp_dev

# Check environment variables match
echo $DB_HOST $DB_PORT $DB_USER
```

### Ollama Model Not Found

**Symptom:** `model 'nomic-embed-text' not found`

**Solution:**

```bash
# Pull the model
docker exec thoughtmcp-ollama-dev ollama pull nomic-embed-text

# Verify model is available
docker exec thoughtmcp-ollama-dev ollama list

# Check Ollama is responding
curl http://localhost:11434/api/tags
```

### Test Containers Not Starting

**Symptom:** Tests fail with container startup errors

**Solution:**

```bash
# Check if dev containers are using the ports
docker ps

# Stop dev containers if running
docker compose -f docker-compose.dev.yml down

# Or use different ports for tests
TEST_DB_PORT=5434 TEST_OLLAMA_PORT=11436 npm test

# Check TestContainerManager logs
AUTO_START_CONTAINERS=true npm test 2>&1 | head -50
```

### MCP Server Not Connecting

**Symptom:** MCP tools not available in client

**Solution:**

1. Verify containers are running:

   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```

2. Verify MCP server is built:

   ```bash
   ls -la dist/index.js
   npm run build  # If missing
   ```

3. Check MCP configuration:
   - Use absolute paths
   - Verify environment variables match .env
   - Update BUILD_TIMESTAMP to trigger restart

4. Check MCP server logs in your client's MCP Server view

### Slow Container Startup

**Symptom:** Containers take too long to become healthy

**Solution:**

```bash
# Increase timeout
CONTAINER_STARTUP_TIMEOUT=120 npm test

# Pre-pull images
docker pull pgvector/pgvector:pg16
docker pull ollama/ollama:latest

# Pre-pull embedding model
docker compose -f docker-compose.dev.yml up -d
docker exec thoughtmcp-ollama-dev ollama pull nomic-embed-text
```

### Data Persistence Issues

**Symptom:** Data lost after container restart

**Solution:**

```bash
# Development: Uses named volumes (data persists)
docker compose -f docker-compose.dev.yml up -d

# Testing: No volumes (intentional - fresh state)
# If you need to preserve test data:
PRESERVE_TEST_DATA=true npm test

# Check volumes
docker volume ls | grep thoughtmcp
```

### Permission Denied

**Symptom:** `permission denied` when running Docker commands

**Solution:**

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# Log out and back in, or run:
newgrp docker

# Verify
docker ps
```

---

## See Also

- [Environment Configuration](./environment.md) - Complete environment variable reference
- [Testing Guide](./testing.md) - Testing with Docker containers
- [Deployment Guide](./deployment.md) - Production deployment without Docker
- [Troubleshooting Guide](./troubleshooting.md) - General troubleshooting

---

**Last Updated**: December 2025
**Version**: 0.5.0
