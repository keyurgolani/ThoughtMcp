# Thought MCP Server Dockerfile
# Multi-stage build for optimized production image
#
# Requirements: 0.4, 11.1, 11.4
#
# NOTE: This is a convenience Dockerfile at the root level.
# For monorepo builds, use: docker build -f packages/server/Dockerfile -t thought-server .
#
# Build:
#   docker build -t thought-server .
#
# Run (standalone):
#   docker run -it --rm thought-server
#
# Run (with docker-compose):
#   docker compose -f docker/docker-compose.prod.yml up -d
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

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy root workspace files first for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy server package files
COPY packages/server/package.json ./packages/server/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy server source code and build configuration
COPY packages/server/tsconfig.json ./packages/server/
COPY packages/server/scripts/ ./packages/server/scripts/
COPY packages/server/src/ ./packages/server/src/

# Build the application from packages/server
WORKDIR /app/packages/server
RUN pnpm build:quick

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM node:20-alpine AS runtime

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S thought && \
    adduser -S thought -u 1001 -G thought

# Install runtime dependencies only (curl for health checks)
RUN apk add --no-cache curl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy root workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy server package files
COPY packages/server/package.json ./packages/server/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# Copy database initialization scripts (needed for migrations)
COPY packages/server/scripts/db/ ./packages/server/scripts/db/

# Copy entrypoint script
COPY packages/server/docker/entrypoint.sh ./docker/entrypoint.sh
RUN chmod +x ./docker/entrypoint.sh

# Set ownership to non-root user
RUN chown -R thought:thought /app

# Switch to non-root user
USER thought

# Set working directory to server package
WORKDIR /app/packages/server

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
ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD []
