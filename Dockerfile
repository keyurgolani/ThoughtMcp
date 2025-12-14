# ThoughtMCP MCP Server Dockerfile
# Multi-stage build for optimized production image
#
# Requirements: 11.1, 11.4
#
# Build:
#   docker build -t thoughtmcp .
#
# Run (standalone):
#   docker run -it --rm thoughtmcp
#
# Run (with docker-compose):
#   docker compose -f docker-compose.prod.yml up -d
#
# The image uses a multi-stage build:
#   1. Builder stage: Installs all dependencies and builds the application
#   2. Runtime stage: Contains only production dependencies and built artifacts

# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies for native modules (pg requires these)
RUN apk add --no-cache python3 make g++

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and build configuration
COPY tsconfig.json ./
COPY scripts/ ./scripts/
COPY src/ ./src/

# Build the application
# This runs: tsc --emitDeclarationOnly && node scripts/build.mjs
RUN npm run build:quick

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM node:20-alpine AS runtime

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S thoughtmcp && \
    adduser -S thoughtmcp -u 1001 -G thoughtmcp

# Install runtime dependencies only (curl for health checks)
RUN apk add --no-cache curl

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Copy database initialization scripts (needed for migrations)
COPY scripts/db/ ./scripts/db/

# Copy entrypoint script
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

# Set ownership to non-root user
RUN chown -R thoughtmcp:thoughtmcp /app

# Switch to non-root user
USER thoughtmcp

# Set environment defaults
ENV NODE_ENV=production \
    LOG_LEVEL=WARN \
    LOG_FORMAT=json \
    OLLAMA_WAIT_TIMEOUT=120 \
    SKIP_MODEL_PULL=false

# Health check (MCP servers use stdio, so we check if process is running)
# The actual health is determined by the MCP client connection
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pgrep -f "node dist/index.js" || exit 1

# MCP servers communicate via stdio
# The entrypoint script waits for Ollama and pulls the embedding model
ENTRYPOINT ["./docker/entrypoint.sh"]
CMD []
