# UI Dockerfile - Multi-stage build for Thought UI
#
# Requirements: 0.4
#
# Development: docker build --target dev -f packages/ui/Dockerfile -t thought-ui:dev .
# Production:  docker build -f packages/ui/Dockerfile -t thought-ui .
#
# Usage with docker-compose:
#   Dev:  docker compose -f docker/docker-compose.dev.yml --profile ui up -d
#   Prod: docker compose -f docker/docker-compose.prod.yml --profile ui up -d

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy root workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy UI package files
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================================================
# Stage 2: Development
# ============================================================================
FROM node:20-alpine AS dev

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

# Copy source files
COPY packages/ui/ ./packages/ui/

WORKDIR /app/packages/ui

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server with host binding for Docker
CMD ["pnpm", "dev", "--", "--host", "0.0.0.0"]

# ============================================================================
# Stage 3: Build
# ============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

# Copy root tsconfig (required by packages/ui/tsconfig.json extends)
COPY tsconfig.base.json ./

# Copy source files
COPY packages/ui/ ./packages/ui/

# Build argument for API URL
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/packages/ui

# Build the application
RUN pnpm build

# ============================================================================
# Stage 4: Production
# ============================================================================
FROM nginx:alpine AS production

# Copy custom nginx config
COPY packages/ui/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/packages/ui/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
